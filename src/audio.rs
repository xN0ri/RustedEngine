use macroquad::{
    audio::{play_sound, play_sound_once, stop_sound, PlaySoundParams},
    rand::gen_range,
};

use crate::asset_manager::Assets;

// ---------------------------------------------------------------------------
// Audio — Sound playback system
// ---------------------------------------------------------------------------

/// Sound management and playback system operating on resources loaded in [`Assets`].
///
/// # Macroquad Crossfade Limitations
/// Macroquad currently does not expose a runtime volume adjustment API for active audio channels.
/// `PlaySoundParams` configures volume only at trigger time. As a result, `crossfade` switches
/// tracks immediately (stopping `from` and starting `to`).
#[derive(Clone, Default)]
pub struct Audio;

impl Audio {
    /// Creates a new [`Audio`] manager instance.
    pub fn new() -> Self {
        Self
    }

    /// Plays a sound effect once (`play_sound_once`) by name.
    pub fn play(&self, assets: &Assets, name: &str) {
        if let Some(sound) = assets.get_sound(name) {
            play_sound_once(sound);
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
    ///
    /// # Remarks
    /// Due to Macroquad API bounds, this performs an immediate track transition.
    /// The `_duration` parameter is accepted for future engine expansions.
    pub fn crossfade(&self, assets: &Assets, from: &str, to: &str, _duration: f32) {
        self.stop(assets, from);
        self.play_ex(assets, to, PlaySoundParams { looped: true, volume: 1.0 });
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
