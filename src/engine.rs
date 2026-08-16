use macroquad::{
    color::{Color, LIGHTGRAY, WHITE},
    input::show_mouse,
    math::Vec2,
    texture::Texture2D,
    window::{clear_background, next_frame},
};

use crate::{
    actions::ActionMap, asset_manager::Assets, audio::Audio, camera::Camera, input::Input,
    resources::Resources, scene::SceneManager, state::StateStore, time::Time,
    trigger::TriggerSystem,
};

// ---------------------------------------------------------------------------
// CustomCursor — Hardware / custom sprite cursor data
// ---------------------------------------------------------------------------

/// Custom mouse cursor metadata.
/// When configured on [`Context`], the system mouse cursor is hidden and replaced by this texture.
pub struct CustomCursor {
    /// Texture rendered at the mouse position.
    pub texture: Texture2D,
    /// Hotspot offset relative to the top-left corner of the texture.
    pub hotspot: Vec2,
    /// Rendering dimensions for the cursor.
    pub size: Vec2,
}

impl CustomCursor {
    /// Creates a new [`CustomCursor`] with zero hotspot offset.
    pub fn new(texture: Texture2D, size: Vec2) -> Self {
        Self {
            texture,
            hotspot: Vec2::ZERO,
            size,
        }
    }

    /// Sets the hotspot offset for mouse pointing precision.
    pub fn with_hotspot(mut self, hotspot: Vec2) -> Self {
        self.hotspot = hotspot;
        self
    }
}

// ---------------------------------------------------------------------------
// Context — Global game context provided to update closures
// ---------------------------------------------------------------------------

/// Shared engine context exposed to entity update closures and scene logic.
pub struct Context {
    /// Frame delta time and FPS tracking system.
    pub time: Time,
    /// Keyboard and mouse raw input wrapper.
    pub input: Input,
    /// Asset manager storing textures, audio clips, and fonts.
    pub assets: Assets,
    /// Audio playback subsystem.
    pub audio: Audio,
    /// 2D Camera controller.
    pub camera: Camera,
    /// Central game state flag store (with Serde JSON save/load support).
    pub state: StateStore,
    /// High-level named action binding map.
    pub actions: ActionMap,
    /// Type-keyed generic resource store for arbitrary per-context data.
    pub resources: Resources,
    /// Generic condition→action trigger system operating on `resources`.
    pub triggers: TriggerSystem,
    /// Internal active custom mouse cursor override.
    pub(crate) cursor: Option<CustomCursor>,
    /// Pending scene switch request name.
    pub(crate) pending_scene: Option<String>,
}

impl Context {
    /// Creates a new empty [`Context`].
    pub fn new() -> Self {
        Self {
            time: Time::new(),
            input: Input::new(),
            assets: Assets::new(),
            audio: Audio::new(),
            camera: Camera::new(),
            state: StateStore::new(),
            actions: ActionMap::new(),
            resources: Resources::new(),
            triggers: TriggerSystem::new(),
            cursor: None,
            pending_scene: None,
        }
    }

    /// Requests a scene switch by name to be executed at the start of the next frame.
    pub fn switch_scene(&mut self, scene_name: impl Into<String>) {
        self.pending_scene = Some(scene_name.into());
    }

    /// Returns the delta time in seconds for the current frame. Shorthand for `ctx.time.deltatime()`.
    pub fn dt(&self) -> f32 {
        self.time.deltatime()
    }

    /// Helper: Plays a sound effect by asset key using default settings.
    pub fn play_sound(&self, name: &str) {
        self.audio.play(&self.assets, name);
    }

    /// Helper: Plays a sound effect by asset key with extended parameters.
    pub fn play_sound_ex(&self, name: &str, params: macroquad::audio::PlaySoundParams) {
        self.audio.play_ex(&self.assets, name, params);
    }

    /// Helper: Stops playback of a sound effect by asset key.
    pub fn stop_sound(&self, name: &str) {
        self.audio.stop(&self.assets, name);
    }

    /// Sets or clears the active custom cursor.
    ///
    /// - Passing `Some(cursor)` hides the OS cursor (`show_mouse(false)`) and renders the custom sprite on top.
    /// - Passing `None` restores the standard OS cursor.
    pub fn set_cursor(&mut self, cursor: Option<CustomCursor>) {
        match &cursor {
            Some(_) => show_mouse(false),
            None => show_mouse(true),
        }
        self.cursor = cursor;
    }

    /// Sets window fullscreen mode on or off at runtime.
    pub fn set_fullscreen(&mut self, enable: bool) {
        macroquad::window::set_fullscreen(enable);
    }
}

impl Default for Context {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Engine — Main game engine loop controller
// ---------------------------------------------------------------------------

/// Core engine orchestrator managing main loop execution, scene transitions, and rendering passes.
pub struct Engine {
    /// Shared engine context.
    pub ctx: Context,
    /// Active scene manager controller.
    pub scene_manager: SceneManager,
    /// Screen background clear color.
    pub background_color: Color,
    /// Optional post-processing pipeline material.
    pub post_process: Option<crate::postprocess::PostProcess>,
    /// Internal scene render target cache (lazily allocated and resized on window resize events).
    pub render_target: Option<crate::postprocess::SceneRenderTarget>,
}

impl Engine {
    /// Creates a new [`Engine`] initialized with scenes.
    ///
    /// Accepts a single [`Scene`], a `Vec<Scene>`, or a [`SceneManager`] directly.
    pub fn new(scenes: impl Into<SceneManager>) -> Self {
        Self {
            ctx: Context::new(),
            scene_manager: scenes.into(),
            background_color: LIGHTGRAY,
            post_process: None,
            render_target: None,
        }
    }

    /// Creates a Macroquad [`macroquad::window::Conf`] with specified title, width, height, and resizable window enabled.
    pub fn conf(title: &str, width: i32, height: i32) -> macroquad::window::Conf {
        macroquad::window::Conf {
            window_title: title.to_string(),
            window_width: width,
            window_height: height,
            window_resizable: true,
            ..Default::default()
        }
    }

    /// Creates a fullscreen Macroquad [`macroquad::window::Conf`] configuration.
    pub fn conf_fullscreen(title: &str) -> macroquad::window::Conf {
        macroquad::window::Conf {
            window_title: title.to_string(),
            fullscreen: true,
            ..Default::default()
        }
    }

    /// Creates a fully customizable Macroquad [`macroquad::window::Conf`] configuration.
    pub fn conf_custom(
        title: &str,
        width: i32,
        height: i32,
        resizable: bool,
        fullscreen: bool,
    ) -> macroquad::window::Conf {
        macroquad::window::Conf {
            window_title: title.to_string(),
            window_width: width,
            window_height: height,
            window_resizable: resizable,
            fullscreen,
            ..Default::default()
        }
    }

    /// Builder pattern: Sets the screen background clear color.
    pub fn with_background_color(mut self, color: Color) -> Self {
        self.background_color = color;
        self
    }

    /// Builder pattern: Requests a new window screen size.
    pub fn with_window_size(self, width: f32, height: f32) -> Self {
        macroquad::window::request_new_screen_size(width, height);
        self
    }

    /// Builder pattern: Toggles window fullscreen mode.
    pub fn with_fullscreen(self, enable: bool) -> Self {
        macroquad::window::set_fullscreen(enable);
        self
    }

    /// Builder pattern: Sets whether the window should be resizable.
    pub fn with_resizable(self, _enable: bool) -> Self {
        self
    }

    /// Runs the main asynchronous game loop.
    ///
    /// # Execution Order Each Frame
    /// 1. Process pending scene transitions.
    /// 2. Update camera controller and cache matrices.
    /// 3. Execute world and UI entity logic updates.
    /// 4. Clear screen background.
    /// 5. Render world objects (either through post-processing target or directly to world camera).
    /// 6. Render screen-space UI layer.
    /// 7. Render custom cursor overlay (if configured).
    /// 8. Await next frame.
    pub async fn run(&mut self) {
        loop {
            // 1. Process pending scene switch requests
            if let Some(scene_name) = self.ctx.pending_scene.take() {
                self.scene_manager.switch_to(&scene_name);
            }
            self.scene_manager.update_pending();

            // 2. Update camera matrices (cache shake offsets)
            let dt = self.ctx.time.deltatime();
            self.ctx.camera.update(dt);

            // 3. Update active world logic
            let scene = self.scene_manager.get_current_scene();
            scene.get_world().update(&mut self.ctx);

            // 4. Clear screen background
            clear_background(self.background_color);

            // 5. Render world space entities (with optional post-processing pass)
            if let Some(pp) = &mut self.post_process {
                // 5a. Lazy allocation/resize of render target
                if self
                    .render_target
                    .as_ref()
                    .is_none_or(|rt| !rt.matches_screen_size())
                {
                    self.render_target = Some(crate::postprocess::SceneRenderTarget::fullscreen());
                }
                let rt = self.render_target.as_ref().unwrap();

                self.ctx.camera.begin_to_target(&rt.target);
                clear_background(self.background_color);
                self.scene_manager.get_current_scene().get_world().draw();
                self.ctx.camera.end();

                // Apply fullscreen shader material
                rt.draw_with_postprocess(pp);
            } else {
                // 5b. Direct world rendering pass
                self.ctx.camera.begin();
                self.scene_manager.get_current_scene().get_world().draw();
                self.ctx.camera.end();
            }

            // 6. Render UI layer in Screen Space (Top-Left origin at 0.0, 0.0)
            self.scene_manager.get_current_scene().get_world().draw_ui();

            // 7. Render custom cursor overlay
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

            // 8. Wait for next frame
            next_frame().await;
        }
    }
}
