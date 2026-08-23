use std::collections::HashMap;

use macroquad::{
    audio::{PlaySoundParams, play_sound, play_sound_once, stop_sound},
    rand::gen_range,
    time::get_time,
};

use crate::asset_manager::Assets;

// ---------------------------------------------------------------------------
// Audio — Sound playback system
// ---------------------------------------------------------------------------

/// Sound management and playback system operating on resources loaded in [`Assets`].
#[derive(Clone)]
pub struct Audio {
    pub master_volume: f32,
    pub sfx_volume: f32,
    pub bgm_volume: f32,
    pub current_bgm: Option<String>,
    last_played: HashMap<String, f64>,
}

impl Audio {
    /// Creates a new [`Audio`] manager instance.
    pub fn new() -> Self {
        Self {
            master_volume: 1.0,
            sfx_volume: 1.0,
            bgm_volume: 1.0,
            current_bgm: None,
            last_played: HashMap::new(),
        }
    }

    /// Builder pattern: Sets master volume multiplier (0.0 to 1.0).
    pub fn with_master_volume(mut self, volume: f32) -> Self {
        self.master_volume = volume.clamp(0.0, 1.0);
        self
    }

    /// Builder pattern: Sets sound effects volume multiplier (0.0 to 1.0).
    pub fn with_sfx_volume(mut self, volume: f32) -> Self {
        self.sfx_volume = volume.clamp(0.0, 1.0);
        self
    }

    /// Builder pattern: Sets background music volume multiplier (0.0 to 1.0).
    pub fn with_bgm_volume(mut self, volume: f32) -> Self {
        self.bgm_volume = volume.clamp(0.0, 1.0);
        self
    }

    /// Plays a sound effect once (`play_sound`) by name scaled by `sfx_volume * master_volume`.
    pub fn play(&self, assets: &Assets, name: &str) {
        if let Some(sound) = assets.get_sound(name) {
            play_sound(
                sound,
                PlaySoundParams {
                    looped: false,
                    volume: self.sfx_volume * self.master_volume,
                },
            );
        }
    }

    /// Plays a sound effect with subtle random volume variation.
    pub fn play_varied(&self, assets: &Assets, name: &str, _pitch_variance: f32, volume_variance: f32) {
        if let Some(sound) = assets.get_sound(name) {
            let var = if volume_variance > 0.0 {
                gen_range(-volume_variance, volume_variance)
            } else {
                0.0
            };
            let volume = (self.sfx_volume * self.master_volume * (1.0 + var)).clamp(0.0, 1.0);
            play_sound(
                sound,
                PlaySoundParams {
                    looped: false,
                    volume,
                },
            );
        }
    }

    /// Plays a sound effect with rate limiting / throttling (debounces duplicate triggers within `min_interval_secs`).
    pub fn play_throttled(&mut self, assets: &Assets, name: &str, min_interval_secs: f32) {
        let now = if cfg!(test) { 0.0 } else { get_time() };
        if let Some(&prev) = self.last_played.get(name) {
            if (now - prev) < min_interval_secs as f64 {
                return;
            }
        }
        self.last_played.insert(name.to_string(), now);
        self.play(assets, name);
    }

    /// Plays a background music track continuously, stopping any previously playing BGM track.
    pub fn play_bgm(&mut self, assets: &Assets, name: &str) {
        if let Some(ref current) = self.current_bgm.clone() {
            self.stop(assets, current);
        }
        self.current_bgm = Some(name.to_string());
        if let Some(sound) = assets.get_sound(name) {
            play_sound(
                sound,
                PlaySoundParams {
                    looped: true,
                    volume: self.bgm_volume * self.master_volume,
                },
            );
        }
    }

    /// Stops playback of the currently active BGM track.
    pub fn stop_bgm(&mut self, assets: &Assets) {
        if let Some(current) = self.current_bgm.take() {
            self.stop(assets, &current);
        }
    }

    /// Plays a sound effect with explicit extended parameters (looping, volume, etc.).
    pub fn play_ex(&self, assets: &Assets, name: &str, params: PlaySoundParams) {
        if let Some(sound) = assets.get_sound(name) {
            play_sound(sound, params);
        }
    }

    /// Stops playback of the specified sound effect.
    pub fn stop(&self, assets: &Assets, name: &str) {
        if let Some(sound) = assets.get_sound(name) {
            stop_sound(sound);
        }
    }

    /// Switches audio playback from `from` track to `to` track.
    pub fn crossfade(&self, assets: &Assets, from: &str, to: &str, _duration: f32) {
        self.stop(assets, from);
        self.play_ex(
            assets,
            to,
            PlaySoundParams {
                looped: true,
                volume: self.bgm_volume * self.master_volume,
            },
        );
    }
}

impl Default for Audio {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// AmbientPool — Random ambient sound generator
// ---------------------------------------------------------------------------

/// Pool of ambient sounds played at random time intervals.
///
/// # Example
/// ```ignore
/// let mut pool = AmbientPool::new(vec!["wind1", "creak", "distant_bell"], 5.0, 15.0);
/// // Call each frame in update loop:
/// pool.update(ctx.time.deltatime(), &ctx.assets);
/// ```
pub struct AmbientPool {
    /// Sound asset names stored in [`Assets`].
    sound_names: Vec<String>,
    /// Minimum interval between playback triggers (in seconds).
    pub min_interval: f32,
    /// Maximum interval between playback triggers (in seconds).
    pub max_interval: f32,
    /// Timer countdown until next sound trigger.
    timer: f32,
    /// Whether the ambient pool is currently active.
    pub active: bool,
}

impl AmbientPool {
    /// Creates a new [`AmbientPool`] with the specified asset names and interval bounds.
    pub fn new(names: Vec<&str>, min_interval: f32, max_interval: f32) -> Self {
        let timer = gen_range(min_interval, max_interval);
        Self {
            sound_names: names.iter().map(|s| s.to_string()).collect(),
            min_interval,
            max_interval,
            timer,
            active: true,
        }
    }

    /// Updates the timer countdown and plays a randomly selected sound when ready.
    pub fn update(&mut self, dt: f32, assets: &Assets) {
        if !self.active || self.sound_names.is_empty() {
            return;
        }
        self.timer -= dt;
        if self.timer <= 0.0 {
            let idx = gen_range(0usize, self.sound_names.len());
            if let Some(sound) = assets.get_sound(&self.sound_names[idx]) {
                play_sound_once(sound);
            }
            self.timer = gen_range(self.min_interval, self.max_interval);
        }
    }

    /// Adds a new sound asset name to the ambient pool.
    pub fn add(&mut self, name: &str) {
        self.sound_names.push(name.to_string());
    }
}
