use macroquad::{
    audio::{play_sound, play_sound_once, stop_sound, PlaySoundParams},
    rand::gen_range,
};

use crate::asset_manager::Assets;

// ---------------------------------------------------------------------------
// Audio — odtwarzanie dźwięków z Assets
// ---------------------------------------------------------------------------

/// System audio operujący na zasobach zarządzanych przez `Assets`.
///
/// # Ograniczenie macroquad dotyczące crossfade
/// macroquad **nie posiada** runtime API do płynnej zmiany głośności
/// już odtwarzającego się dźwięku. `PlaySoundParams` ustawia głośność
/// tylko w momencie wywołania `play_sound`. W związku z tym `crossfade`
/// realizowany jest przez natychmiastowe zatrzymanie starego dźwięku
/// i uruchomienie nowego z pełną głośnością. Jeśli potrzebujesz prawdziwego
/// crossfade z liniowym fade-out/fade-in, potrzebna jest własna warstwa
/// lub konfiguracja natywnego backendu (miniaudio przez FFI).
///
/// `CrossfadeState` istnieje jako stub do przyszłej integracji.
#[derive(Clone, Default)]
pub struct Audio;

impl Audio {
    pub fn new() -> Self {
        Self
    }

    /// Odtwarza dźwięk raz (play_sound_once).
    pub fn play(&self, assets: &Assets, name: &str) {
        if let Some(sound) = assets.get_sound(name) {
            play_sound_once(sound);
        }
    }

    /// Odtwarza dźwięk z parametrami (pętla, głośność itd.).
    pub fn play_ex(&self, assets: &Assets, name: &str, params: PlaySoundParams) {
        if let Some(sound) = assets.get_sound(name) {
            play_sound(sound, params);
        }
    }

    /// Zatrzymuje odtwarzanie dźwięku.
    pub fn stop(&self, assets: &Assets, name: &str) {
        if let Some(sound) = assets.get_sound(name) {
            stop_sound(sound);
        }
    }

    /// Crossfade z dźwięku `from` do `to`.
    ///
    /// **OGRANICZENIE macroquad:** brak runtime volume control na odtwarzanym dźwięku,
    /// więc zmiana realizowana jest jako natychmiastowe zatrzymanie `from` i start `to`.
    /// Parametr `_duration` jest przyjmowany dla kompatybilności API i zachowany do ew. rozbudowy.
    pub fn crossfade(&self, assets: &Assets, from: &str, to: &str, _duration: f32) {
        self.stop(assets, from);
        self.play_ex(assets, to, PlaySoundParams { looped: true, volume: 1.0 });
    }
}

// ---------------------------------------------------------------------------
// AmbientPool — losowe odtwarzanie ambientu w podanym interwale
// ---------------------------------------------------------------------------

/// Pula dźwięków ambientowych odtwarzanych losowo w podanym przedziale czasu.
///
/// # Przykład
/// ```ignore
/// let mut pool = AmbientPool::new(vec!["wind1", "creak", "distant_bell"], 5.0, 15.0);
/// // W każdej klatce:
/// pool.update(ctx.time.deltatime(), &ctx.assets);
/// ```
pub struct AmbientPool {
    /// Nazwy dźwięków z Assets.
    sound_names: Vec<String>,
    /// Minimalny interwał między odtwarzaniami (sekundy).
    pub min_interval: f32,
    /// Maksymalny interwał między odtwarzaniami (sekundy).
    pub max_interval: f32,
    /// Licznik do następnego odtworzenia.
    timer: f32,
    /// Czy pula jest aktywna.
    pub active: bool,
}

impl AmbientPool {
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

    /// Aktualizuje timer i odtwarza losowy dźwięk gdy czas minie.
    /// Wywołuj co klatkę.
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

    /// Dodaje dźwięk do puli.
    pub fn add(&mut self, name: &str) {
        self.sound_names.push(name.to_string());
    }
}
