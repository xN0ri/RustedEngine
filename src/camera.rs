use macroquad::{
    camera::{set_camera, set_default_camera, Camera2D},
    math::{vec2, Vec2},
    rand::gen_range,
    window::{screen_height, screen_width},
};

/// Kamera 2D z obsługą shake i płynnego śledzenia celu.
/// Camera2D jest cache'owana raz na klatkę w `update()` aby
/// shake offset był spójny między renderingiem i screen_to_world.
pub struct Camera {
    pub target: Vec2,
    pub zoom: f32,
    pub rotation: f32,
    shake_intensity: f32,
    shake_duration: f32,
    shake_timer: f32,
    /// Cache obliczony raz w `update()` — używany wszędzie w tej klatce.
    cached: Camera2D,
}

impl Camera {
    pub fn new() -> Self {
        let cached = Self::build_camera2d(vec2(0.0, 0.0), 1.0, 0.0, vec2(0.0, 0.0));
        Self {
            target: vec2(0.0, 0.0),
            zoom: 1.0,
            rotation: 0.0,
            shake_intensity: 0.0,
            shake_duration: 0.0,
            shake_timer: 0.0,
            cached,
        }
    }

    fn build_camera2d(target: Vec2, zoom: f32, rotation: f32, shake_offset: Vec2) -> Camera2D {
        let sw = screen_width();
        let sh = screen_height();
        let zoom_vec = vec2((2.0 / sw) * zoom, (2.0 / sh) * zoom);
        Camera2D {
            target: target + shake_offset,
            zoom: zoom_vec,
            rotation,
            offset: vec2(0.0, 0.0),
            render_target: None,
            viewport: None,
        }
    }

    /// Płynne śledzenie celu z interpolacją liniową.
    pub fn follow(&mut self, target_pos: Vec2, lerp_speed: f32, dt: f32) {
        let factor = (lerp_speed * dt).clamp(0.0, 1.0);
        self.target = self.target.lerp(target_pos, factor);
    }

    /// Efekt trzęsienia ekranu.
    pub fn shake(&mut self, intensity: f32, duration: f32) {
        self.shake_intensity = intensity;
        self.shake_duration = duration;
        self.shake_timer = duration;
    }

    /// Aktualizuje stan kamery i **oblicza cache Camera2D raz na klatkę**.
    /// Musi być wołane przed `begin()` / `screen_to_world()` w danej klatce.
    pub fn update(&mut self, dt: f32) {
        if self.shake_timer > 0.0 {
            self.shake_timer -= dt;
            if self.shake_timer <= 0.0 {
                self.shake_timer = 0.0;
            }
        }

        let shake_offset = if self.shake_timer > 0.0 && self.shake_duration > 0.0 {
            let factor = self.shake_timer / self.shake_duration;
            let intensity = self.shake_intensity * factor;
            vec2(
                gen_range(-intensity, intensity),
                gen_range(-intensity, intensity),
            )
        } else {
            vec2(0.0, 0.0)
        };

        self.cached = Self::build_camera2d(self.target, self.zoom, self.rotation, shake_offset);
    }

    /// Aktywuje kamerę świata (rysowanie obiektów gry).
    pub fn begin(&self) {
        set_camera(&self.cached);
    }

    /// Aktywuje kamerę świata z przekierowaniem renderowania do podanego RenderTarget (np. dla post-processingu).
    /// Przenosi wszystkie właściwości z aktualnego cache (target, zoom, rotation, shake).
    pub fn begin_to_target(&self, target: &macroquad::texture::RenderTarget) {
        let cam = Camera2D {
            target: self.cached.target,
            zoom: self.cached.zoom,
            rotation: self.cached.rotation,
            offset: self.cached.offset,
            render_target: Some(target.clone()),
            viewport: self.cached.viewport,
        };
        set_camera(&cam);
    }

    /// Wraca do domyślnej kamery ekranu (rysowanie UI).
    pub fn end(&self) {
        set_default_camera();
    }

    /// Przelicza pozycję z przestrzeni ekranu na przestrzeń świata (spójna z bieżącą klatką).
    pub fn screen_to_world(&self, screen_pos: Vec2) -> Vec2 {
        self.cached.screen_to_world(screen_pos)
    }

    /// Przelicza pozycję z przestrzeni świata na przestrzeń ekranu.
    pub fn world_to_screen(&self, world_pos: Vec2) -> Vec2 {
        self.cached.world_to_screen(world_pos)
    }
}

impl Default for Camera {
    fn default() -> Self {
        Self::new()
    }
}
