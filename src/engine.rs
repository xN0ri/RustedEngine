use macroquad::{
    color::{Color, LIGHTGRAY, WHITE},
    input::show_mouse,
    math::Vec2,
    texture::Texture2D,
    window::{clear_background, next_frame},
};

use crate::{
    actions::ActionMap,
    asset_manager::Assets,
    audio::Audio,
    camera::Camera,
    input::Input,
    scene::{Scene, SceneManager},
    state::StateStore,
    time::Time,
};

// ---------------------------------------------------------------------------
// CustomCursor — własny kursor rysowany na wierzchu sceny
// ---------------------------------------------------------------------------

/// Dane własnego kursora myszy.
/// Gdy ustawiony, silnik ukrywa systemowy kursor i rysuje tę teksturę.
pub struct CustomCursor {
    pub texture: Texture2D,
    /// Offset hot-spotu kursora od lewego-górnego rogu tekstury.
    pub hotspot: Vec2,
    pub size: Vec2,
}

impl CustomCursor {
    pub fn new(texture: Texture2D, size: Vec2) -> Self {
        Self {
            texture,
            hotspot: Vec2::ZERO,
            size,
        }
    }

    pub fn with_hotspot(mut self, hotspot: Vec2) -> Self {
        self.hotspot = hotspot;
        self
    }
}

// ---------------------------------------------------------------------------
// Context — globalny kontekst gry dostępny w update closurach
// ---------------------------------------------------------------------------

pub struct Context {
    pub time: Time,
    pub input: Input,
    pub assets: Assets,
    pub audio: Audio,
    pub camera: Camera,
    /// Magazyn flag/stanu gry (save/load, flagi narracyjne itp.).
    pub state: StateStore,
    /// Mapowanie nazwanych akcji na klawisze/przyciski.
    pub actions: ActionMap,
    /// Wewnętrzny: własny kursor do rysowania przez Engine. Użyj `set_cursor`.
    pub(crate) cursor: Option<CustomCursor>,
}

impl Context {
    pub fn new() -> Self {
        Self {
            time: Time::new(),
            input: Input::new(),
            assets: Assets::new(),
            audio: Audio::new(),
            camera: Camera::new(),
            state: StateStore::new(),
            actions: ActionMap::new(),
            cursor: None,
        }
    }

    /// Skrót: odtwarza dźwięk z ctx.assets przez ctx.audio.
    pub fn play_sound(&self, name: &str) {
        self.audio.play(&self.assets, name);
    }

    /// Skrót: odtwarza dźwięk z pętlą/głośnością z ctx.assets.
    pub fn play_sound_ex(&self, name: &str, params: macroquad::audio::PlaySoundParams) {
        self.audio.play_ex(&self.assets, name, params);
    }

    /// Skrót: zatrzymuje dźwięk z ctx.assets.
    pub fn stop_sound(&self, name: &str) {
        self.audio.stop(&self.assets, name);
    }

    /// Ustawia własny kursor myszy.
    ///
    /// Gdy `Some(cursor)` — systemowy kursor jest ukrywany i zastępowany sprite'em.
    /// `None` — przywraca systemowy kursor.
    ///
    /// # Ograniczenie macroquad
    /// macroquad posiada `show_mouse(bool)` ukrywające systemowy kursor.
    /// Własny sprite jest rysowany przez `Engine::run` w każdej klatce na wierzchu.
    pub fn set_cursor(&mut self, cursor: Option<CustomCursor>) {
        match &cursor {
            Some(_) => show_mouse(false),
            None => show_mouse(true),
        }
        self.cursor = cursor;
    }
}

impl Default for Context {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Engine — główna pętla gry
// ---------------------------------------------------------------------------

// Główny punkt gry
pub struct Engine {
    pub ctx: Context,
    pub scene_manager: SceneManager,
    pub background_color: Color,
    /// Opcjonalny post-process. Gdy Some — scena rysowana do render targetu.
    /// Patrz `postprocess::PostProcess`.
    pub post_process: Option<crate::postprocess::PostProcess>,
    /// Pamięć podręczna RenderTargetu sceny. Tworzona leniwie i odnawiana przy zmianie rozmiaru okna.
    pub render_target: Option<crate::postprocess::SceneRenderTarget>,
}

impl Engine {
    pub fn new(scenes: Vec<Scene>) -> Self {
        Self {
            ctx: Context::new(),
            scene_manager: SceneManager::new(scenes),
            background_color: LIGHTGRAY,
            post_process: None,
            render_target: None,
        }
    }

    /// Główna pętla gry.
    ///
    /// Kolejność w każdej klatce:
    /// 1. Przełączanie scen (pending transition)
    /// 2. Aktualizacja kamery (cache Camera2D)
    /// 3. Aktualizacja logiki świata (update)
    /// 4. Czyszczenie tła
    /// 5a. (z post-process) render do RenderTarget → apply shader → draw na ekran
    /// 5b. (bez post-process) Renderowanie obiektów świata z kamerą 2D
    /// 6. Renderowanie warstwy UI w przestrzeni ekranu (bez kamery)
    /// 7. Rysowanie własnego kursora na samym wierzchu (jeśli ustawiony)
    /// 8. Oczekiwanie na kolejną klatkę
    pub async fn run(&mut self) {
        loop {
            // 1. Obsługa przełączania scen
            self.scene_manager.update_pending();

            // 2. Aktualizacja kamery (cache shake offset) — musi być przed renderowaniem
            let dt = self.ctx.time.deltatime();
            self.ctx.camera.update(dt);

            // 3. Logika gry
            let scene = self.scene_manager.get_current_scene();
            scene.get_world().update(&mut self.ctx);

            // 4. Czyszczenie tła
            clear_background(self.background_color);

            // 5. Renderowanie świata (z opcjonalnym post-processingiem)
            if let Some(pp) = &mut self.post_process {
                // 5a. Leniwa alokacja i odnawianie RenderTarget przy zmianie rozmiaru ekranu
                if self.render_target.as_ref().map_or(true, |rt| !rt.matches_screen_size()) {
                    self.render_target = Some(crate::postprocess::SceneRenderTarget::fullscreen());
                }
                let rt = self.render_target.as_ref().unwrap();

                self.ctx.camera.begin_to_target(&rt.target);
                clear_background(self.background_color);
                self.scene_manager.get_current_scene().get_world().draw();
                self.ctx.camera.end();

                // Apply shader
                rt.draw_with_postprocess(pp);
            } else {
                // 5b. Bezpośrednie renderowanie (bez post-processingu)
                self.ctx.camera.begin();
                self.scene_manager.get_current_scene().get_world().draw();
                self.ctx.camera.end();
            }

            // 6. Renderowanie UI w przestrzeni ekranu
            self.scene_manager.get_current_scene().get_world().draw_ui();

            // 7. Własny kursor na wierzchu (rysowany po wszystkim)
            if let Some(cursor) = &self.ctx.cursor {
                let mouse_pos = self.ctx.input.mouse_position();
                let draw_pos = mouse_pos - cursor.hotspot;
                macroquad::texture::draw_texture_ex(
                    &cursor.texture,
                    draw_pos.x,
                    draw_pos.y,
                    WHITE,
                    macroquad::texture::DrawTextureParams {
                        dest_size: Some(cursor.size),
                        ..Default::default()
                    },
                );
            }

            // 8. Czekaj na kolejną klatkę
            next_frame().await;
        }
    }
}