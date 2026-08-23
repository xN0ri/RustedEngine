use macroquad::{
    camera::{Camera2D, set_camera, set_default_camera},
    color::{Color, LIGHTGRAY, WHITE},
    input::show_mouse,
    math::{Vec2, vec2},
    texture::Texture2D,
    window::{clear_background, next_frame, screen_height, screen_width},
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
    /// Type-safe event bus for decoupled event emission and subscription.
    pub events: crate::events::EventBus,
    /// Slot-based save system with anti-tamper checksum validation.
    pub save_system: crate::save_system::SaveSystem,
    /// Pending deferred spawn queue for world-space objects.
    pub(crate) pending_spawn: Vec<Box<dyn crate::world::Object>>,
    /// Pending deferred spawn queue for screen-space UI objects.
    pub(crate) pending_spawn_ui: Vec<Box<dyn crate::world::Object>>,
    /// Pending deferred spawn queue for logic-layer objects.
    pub(crate) pending_spawn_logic: Vec<Box<dyn crate::world::Object>>,
    /// Internal active custom mouse cursor override.
    pub(crate) cursor: Option<CustomCursor>,
    /// Pending scene switch request name.
    pub(crate) pending_scene: Option<String>,
    /// Pointer to active scene world instance during update pass.
    pub(crate) world_ptr: Option<*mut crate::world::World>,
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
            events: crate::events::EventBus::new(),
            save_system: crate::save_system::SaveSystem::default(),
            pending_spawn: Vec::new(),
            pending_spawn_ui: Vec::new(),
            pending_spawn_logic: Vec::new(),
            cursor: None,
            pending_scene: None,
            world_ptr: None,
        }
    }

    /// Returns current text content string of any UI component matching `tag` in the active world.
    pub fn get_ui_text(&self, tag: &str) -> Option<String> {
        if let Some(ptr) = self.world_ptr {
            unsafe { (*ptr).get_ui_text(tag) }
        } else {
            None
        }
    }

    /// Sets text content on all UI components matching `tag` in the active world.
    pub fn set_ui_text(&mut self, tag: &str, text: impl Into<String>) {
        if let Some(ptr) = self.world_ptr {
            unsafe {
                (*ptr).set_ui_text(tag, text);
            }
        }
    }

    /// Finds and downcasts the first UI object matching `tag` to immutable reference type `T` in active world.
    pub fn get_ui<T: crate::world::Object + 'static>(&self, tag: &str) -> Option<&T> {
        if let Some(ptr) = self.world_ptr {
            unsafe { (*ptr).get_ui::<T>(tag) }
        } else {
            None
        }
    }

    /// Finds and downcasts the first UI object matching `tag` to mutable reference type `T` in active world.
    pub fn get_ui_mut<T: crate::world::Object + 'static>(&mut self, tag: &str) -> Option<&mut T> {
        if let Some(ptr) = self.world_ptr {
            unsafe { (*ptr).get_ui_mut::<T>(tag) }
        } else {
            None
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

    /// Helper: Plays a background music track continuously by asset key.
    pub fn play_bgm(&mut self, name: &str) {
        let mut audio = self.audio.clone();
        audio.play_bgm(&self.assets, name);
        self.audio = audio;
    }

    /// Helper: Stops the currently playing background music track.
    pub fn stop_bgm(&mut self) {
        let mut audio = self.audio.clone();
        audio.stop_bgm(&self.assets);
        self.audio = audio;
    }

    /// Sets global sound effects volume multiplier (0.0 to 1.0).
    pub fn set_sfx_volume(&mut self, volume: f32) {
        self.audio.sfx_volume = volume.clamp(0.0, 1.0);
    }

    /// Sets global background music volume multiplier (0.0 to 1.0).
    pub fn set_bgm_volume(&mut self, volume: f32) {
        self.audio.bgm_volume = volume.clamp(0.0, 1.0);
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

    /// Returns `true` if keyboard key is pressed this frame. Shorthand for `ctx.input.is_key_pressed(key)`.
    pub fn is_key_pressed(&self, key: macroquad::input::KeyCode) -> bool {
        self.input.is_key_pressed(key)
    }

    /// Returns `true` if keyboard key is held down. Shorthand for `ctx.input.is_key_down(key)`.
    pub fn is_key_down(&self, key: macroquad::input::KeyCode) -> bool {
        self.input.is_key_down(key)
    }

    /// Returns `true` if named action was pressed this frame. Shorthand for `ctx.actions.is_pressed(action)`.
    pub fn is_action_pressed(&self, action: &str) -> bool {
        self.actions.is_pressed(action)
    }

    /// Returns `true` if named action is held down. Shorthand for `ctx.actions.is_down(action)`.
    pub fn is_action_down(&self, action: &str) -> bool {
        self.actions.is_down(action)
    }

    /// Returns boolean flag value from state store. Shorthand for `ctx.state.get_bool(key)`.
    pub fn flag(&self, key: &str) -> bool {
        self.state.get_bool(key)
    }

    /// Sets boolean flag value in state store. Shorthand for `ctx.state.set_bool(key, v)`.
    pub fn set_flag(&mut self, key: &str, v: bool) {
        self.state.set_bool(key, v);
    }

    /// Returns 2D vector value from state store. Shorthand for `ctx.state.get_vec2(key)`.
    pub fn get_vec2(&self, key: &str) -> Option<Vec2> {
        self.state.get_vec2(key)
    }

    /// Returns 2D vector value from state store, or `default` if not set. Shorthand for `ctx.state.get_vec2_or(key, default)`.
    pub fn get_vec2_or(&self, key: &str, default: Vec2) -> Vec2 {
        self.state.get_vec2_or(key, default)
    }

    /// Sets 2D vector value in state store. Shorthand for `ctx.state.set_vec2(key, v)`.
    pub fn set_vec2(&mut self, key: &str, v: impl Into<Vec2>) {
        self.state.set_vec2(key, v);
    }

    /// Queues an entity to be spawned into the world-space layer at the end of the current update pass.
    pub fn spawn<O: crate::world::Object + 'static>(&mut self, obj: O) {
        self.pending_spawn.push(Box::new(obj));
    }

    /// Queues a UI component to be spawned into the screen-space UI layer at the end of the current update pass.
    pub fn spawn_ui<O: crate::world::Object + 'static>(&mut self, obj: O) {
        self.pending_spawn_ui.push(Box::new(obj));
    }

    /// Queues an object to be spawned into the logic layer at the end of the current update pass.
    pub fn spawn_logic<O: crate::world::Object + 'static>(&mut self, obj: O) {
        self.pending_spawn_logic.push(Box::new(obj));
    }

    /// Queues a stateless logic closure directly into the logic layer at the end of the current update pass.
    pub fn spawn_logic_fn<F>(&mut self, func: F)
    where
        F: FnMut(&mut Context) + 'static,
    {
        self.spawn_logic(crate::object::Logic::run(func));
    }

    /// Returns the mouse cursor position converted into world-space coordinates via the active camera.
    pub fn mouse_world(&self) -> Vec2 {
        self.camera.screen_to_world(self.input.mouse_position())
    }

    /// Returns `true` if the specified mouse button was pressed during the current frame pass.
    pub fn mouse_pressed(&self, btn: crate::object::Side) -> bool {
        self.input.is_mouse_button_pressed(btn.to_macroquad())
    }

    /// Returns `true` while the specified mouse button is held down.
    pub fn mouse_down(&self, btn: crate::object::Side) -> bool {
        self.input.is_mouse_button_down(btn.to_macroquad())
    }

    /// Returns `true` if the specified mouse button was released during the current frame pass.
    pub fn mouse_released(&self, btn: crate::object::Side) -> bool {
        self.input.is_mouse_button_released(btn.to_macroquad())
    }

    /// Returns unscaled frame delta time in seconds (ignoring time scale and pause state).
    pub fn raw_dt(&self) -> f32 {
        self.time.raw_deltatime()
    }

    /// Emits a new event onto the event bus channel for type `E`.
    pub fn emit<E: 'static + Send + Sync>(&mut self, event: E) {
        self.events.emit(event);
    }

    /// Drains and returns all pending events of type `E`.
    pub fn poll<E: 'static>(&mut self) -> Vec<E> {
        self.events.poll::<E>()
    }

    /// Returns `true` if there are pending events of type `E`.
    pub fn has_event<E: 'static>(&self) -> bool {
        self.events.has_events::<E>()
    }

    /// Returns an integer value from the state store. Shorthand for `ctx.state.get_int(key)`.
    pub fn get_int(&self, key: &str) -> i64 {
        self.state.get_int(key)
    }

    /// Sets an integer value in the state store. Shorthand for `ctx.state.set_int(key, val)`.
    pub fn set_int(&mut self, key: &str, val: i64) {
        self.state.set_int(key, val);
    }

    /// Increments an integer value in the state store by `delta` and returns the updated value.
    pub fn increment(&mut self, key: &str, delta: i64) -> i64 {
        self.state.increment(key, delta)
    }

    /// Helper: Plays a sound effect with randomized volume variation.
    pub fn play_sound_varied(&self, name: &str, pitch_variance: f32, volume_variance: f32) {
        self.audio.play_varied(&self.assets, name, pitch_variance, volume_variance);
    }

    /// Helper: Plays a sound effect with rate limiting / throttling.
    pub fn play_sound_throttled(&mut self, name: &str, min_interval_secs: f32) {
        self.audio.play_throttled(&self.assets, name, min_interval_secs);
    }

    // --- Time shortcuts ---

    /// Total elapsed application time in seconds since start. Shorthand for `ctx.time.elapsed_time()`.
    pub fn elapsed(&self) -> f64 {
        self.time.elapsed_time()
    }

    /// Current frames-per-second counter. Shorthand for `ctx.time.fps()`.
    pub fn fps(&self) -> i32 {
        self.time.fps()
    }

    /// Returns `true` if simulation time is currently paused. Shorthand for `ctx.time.is_paused()`.
    pub fn is_paused(&self) -> bool {
        self.time.is_paused()
    }

    /// Pauses game simulation (sets `deltatime()` to `0.0`). Shorthand for `ctx.time.set_paused(true)`.
    pub fn pause(&mut self) {
        self.time.set_paused(true);
    }

    /// Resumes game simulation. Shorthand for `ctx.time.set_paused(false)`.
    pub fn unpause(&mut self) {
        self.time.set_paused(false);
    }

    /// Toggles the pause state between paused and unpaused. Shorthand for `ctx.time.toggle_pause()`.
    pub fn toggle_pause(&mut self) {
        self.time.toggle_pause();
    }

    /// Sets the time scale multiplier (`< 1.0` = slow-motion, `> 1.0` = fast-forward). Shorthand for `ctx.time.set_time_scale(scale)`.
    pub fn set_time_scale(&mut self, scale: f32) {
        self.time.set_time_scale(scale);
    }

    // --- Signal shortcuts ---

    /// Emits a named string signal without carrying any data. Shorthand for `ctx.events.emit_signal(name)`.
    pub fn emit_signal(&mut self, signal_name: impl Into<String>) {
        self.events.emit_signal(signal_name);
    }

    /// Returns `true` if `signal_name` was emitted and consumes it. Shorthand for `ctx.events.poll_signal(name)`.
    pub fn poll_signal(&mut self, signal_name: &str) -> bool {
        self.events.poll_signal(signal_name)
    }

    /// Returns `true` if `signal_name` is currently pending without consuming it. Shorthand for `ctx.events.has_signal(name)`.
    pub fn has_signal(&self, signal_name: &str) -> bool {
        self.events.has_signal(signal_name)
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
    /// Screen letterbox/pillarbox border clear color. Defaults to `BLACK`.
    pub letterbox_color: Color,
    /// Optional post-processing pipeline material.
    pub post_process: Option<crate::postprocess::PostProcess>,
    /// Internal scene render target cache (lazily allocated and resized on window resize events).
    pub render_target: Option<crate::postprocess::SceneRenderTarget>,
    /// Optional virtual (design) resolution `(width, height)` in pixels.
    /// When set, all rendering is composited through a fixed-size render target and
    /// letterboxed / pillarboxed to the real window. Mouse coordinates are automatically
    /// remapped to virtual space. See [`Engine::with_virtual_resolution`].
    pub virtual_resolution: Option<(f32, f32)>,
    /// Whether integer scaling (`.floor()`) is enforced for virtual resolution. Defaults to `true`.
    pub integer_scaling: bool,
    /// Internal fixed-size render target for the virtual resolution pipeline.
    virtual_render_target: Option<crate::postprocess::SceneRenderTarget>,
    /// Optional key binding to toggle the debug overlay. Defaults to `Some(KeyCode::F3)`.
    /// Set to `None` to disable key toggling.
    pub debug_key: Option<macroquad::input::KeyCode>,
    /// Whether the built-in debug overlay (FPS, frame time, entity counts) is rendered. Toggleable via `debug_key` (default `F3`).
    pub debug_overlay: bool,
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
            letterbox_color: macroquad::color::BLACK,
            post_process: None,
            render_target: None,
            virtual_resolution: None,
            integer_scaling: true,
            virtual_render_target: None,
            debug_key: Some(macroquad::input::KeyCode::F3),
            debug_overlay: false,
        }
    }

    /// Builder pattern: Enables or disables the built-in debug overlay (FPS, entity counts, camera pos).
    /// Can also be toggled at runtime using the key specified by [`Engine::with_debug_key`].
    pub fn with_debug_overlay(mut self, enabled: bool) -> Self {
        self.debug_overlay = enabled;
        self
    }

    /// Builder pattern: Sets the keyboard key used to toggle the debug overlay at runtime, or `None` to disable the keyboard shortcut.
    pub fn with_debug_key(mut self, key: Option<macroquad::input::KeyCode>) -> Self {
        self.debug_key = key;
        self
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

    /// Builder pattern: Sets the letterbox and pillarbox margin border clear color (defaults to `BLACK`).
    pub fn with_letterbox_color(mut self, color: Color) -> Self {
        self.letterbox_color = color;
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

    /// Builder pattern: Note — window resizability **cannot** be changed at runtime via this method.
    /// Configure it at startup using [`Engine::conf`] or [`Engine::conf_custom`] instead.
    ///
    /// This method is kept as a no-op stub to avoid breaking API churn.
    #[deprecated(
        since = "0.5.0",
        note = "Window resizability cannot be changed at runtime via with_resizable. Configure it at startup using Engine::conf or Engine::conf_custom instead."
    )]
    pub fn with_resizable(self, _enable: bool) -> Self {
        self
    }

    /// Builder pattern: Enables the virtual resolution + letterboxing pipeline.
    ///
    /// When set, the entire game (world + UI) renders into a fixed `width × height` render target,
    /// which is then scaled to fit the real window while preserving aspect ratio (letterbox/pillarbox).
    /// Mouse coordinates are automatically remapped to virtual space.
    ///
    /// If the physical window is smaller than the virtual resolution, integer scaling defaults to `1.0`
    /// (guaranteed by `.max(1.0)`), centering the viewport; content extending outside the window bounds
    /// will extend beyond the visible screen area.
    ///
    /// Calling this method does **not** affect any existing API — it is fully opt-in.
    ///
    /// # Example
    /// ```ignore
    /// Engine::new(scenes)
    ///     .with_virtual_resolution(1280.0, 720.0)
    ///     .run()
    ///     .await;
    /// ```
    pub fn with_virtual_resolution(mut self, width: f32, height: f32) -> Self {
        self.virtual_resolution = Some((width, height));
        self
    }

    /// Builder pattern: Enables or disables pixel-perfect integer scaling (`.floor()`) for virtual resolution.
    ///
    /// - `true` (default): Enforces integer scaling (1×, 2×, 3×...) to keep pixel-art pixels uniform.
    /// - `false`: Uses smooth fractional scaling (e.g. 5.333×) so the virtual resolution fills the screen
    ///   edge-to-edge without letterbox margins on screens with matching aspect ratio (e.g. 480×270 on QHD 2560×1440).
    pub fn with_integer_scaling(mut self, enabled: bool) -> Self {
        self.integer_scaling = enabled;
        self
    }

    /// Computes letterbox/pillarbox viewport parameters `(scale, offset_x, offset_y)`.
    ///
    /// Uses integer down-scaling (`.floor()`) when `integer_scaling` is enabled,
    /// or smooth fractional scaling when disabled (`integer_scaling == false`).
    fn letterbox_params(&self, vw: f32, vh: f32) -> (f32, f32, f32) {
        let sw = screen_width();
        let sh = screen_height();
        let raw_scale = (sw / vw).min(sh / vh);
        let scale = if self.integer_scaling {
            raw_scale.floor().max(1.0)
        } else {
            raw_scale.max(0.001)
        };
        let ox = (sw - vw * scale) / 2.0;
        let oy = (sh - vh * scale) / 2.0;
        (scale, ox, oy)
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
            // Reset UI scale to default (1.0, Vec2::ZERO) at start of frame
            crate::ui::set_ui_scale(1.0, Vec2::ZERO);

            // 1. Process pending scene switch requests
            if let Some(scene_name) = self.ctx.pending_scene.take() {
                self.scene_manager.switch_to(&scene_name);
            }
            self.scene_manager.update_pending(&mut self.ctx);

            // --- Virtual resolution setup (opt-in, no-op when None) ---
            if let Some((vw, vh)) = self.virtual_resolution {
                // Activate virtual resolution for safe_screen_* in UI
                crate::ui::set_virtual_resolution(vw, vh);
                // Camera zoom uses virtual dimensions
                self.ctx.camera.virtual_size = Some(vec2(vw, vh));
                // Remap mouse to virtual coordinates
                let (scale, ox, oy) = self.letterbox_params(vw, vh);
                self.ctx.input.viewport = (scale, ox, oy);
            }

            // 2. Update camera matrices (cache shake offsets)
            let dt = self.ctx.time.deltatime();
            self.ctx.camera.update(dt);

            // 3. Update active world logic
            let scene = self.scene_manager.get_current_scene();
            scene.world_mut().update(&mut self.ctx);

            // 4. Clear screen background
            clear_background(self.background_color);

            if let Some((vw, vh)) = self.virtual_resolution {
                // ======================================================
                // VIRTUAL RESOLUTION PIPELINE
                // ======================================================

                // Ensure VRT has the correct fixed size
                let vrt_needs_create = self.virtual_render_target
                    .as_ref()
                    .map(|rt| rt.width != vw as u32 || rt.height != vh as u32)
                    .unwrap_or(true);
                if vrt_needs_create {
                    self.virtual_render_target =
                        Some(crate::postprocess::SceneRenderTarget::new(vw as u32, vh as u32));
                }
                let vrt = self.virtual_render_target.as_ref().unwrap();

                // 5v. Render WORLD to VRT
                self.ctx.camera.begin_to_target(&vrt.target);
                clear_background(self.background_color);
                self.scene_manager.get_current_scene().world_mut().draw();
                self.ctx.camera.end();

                // 6v. Render NON-TEXT UI to VRT using a flat virtual-coordinate camera.
                let ui_to_vrt = Camera2D {
                    zoom: vec2(2.0 / vw, -2.0 / vh),
                    target: vec2(vw / 2.0, vh / 2.0),
                    render_target: Some(vrt.target.clone()),
                    ..Default::default()
                };
                set_camera(&ui_to_vrt);
                self.scene_manager.get_current_scene().world_mut().draw_ui_non_text();
                set_default_camera();

                // 7v. Composite VRT (world + non-text UI) to real screen with letterbox
                let (scale, ox, oy) = self.letterbox_params(vw, vh);
                clear_background(self.letterbox_color);
                macroquad::texture::draw_texture_ex(
                    &vrt.target.texture,
                    ox,
                    oy,
                    WHITE,
                    macroquad::texture::DrawTextureParams {
                        dest_size: Some(vec2(vw * scale, vh * scale)),
                        flip_y: true,
                        ..Default::default()
                    },
                );

                // 8v. Render TEXT UI directly to native screen resolution to prevent blurry upscaling.
                crate::ui::set_ui_scale(scale, vec2(ox, oy));
                self.scene_manager.get_current_scene().world_mut().draw_ui_text_only();
                crate::ui::set_ui_scale(1.0, Vec2::ZERO);
            } else {
                // ======================================================
                // ORIGINAL PIPELINE (unchanged when no virtual resolution)
                // ======================================================

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
                    self.scene_manager.get_current_scene().world_mut().draw();
                    self.ctx.camera.end();

                    // Apply fullscreen shader material
                    rt.draw_with_postprocess(pp);
                } else {
                    // 5b. Direct world rendering pass
                    self.ctx.camera.begin();
                    self.scene_manager.get_current_scene().world_mut().draw();
                    self.ctx.camera.end();
                }

                // 6. Render UI layer in Screen Space (Top-Left origin at 0.0, 0.0)
                self.scene_manager.get_current_scene().world_mut().draw_ui();
            }

            // 7. Render custom cursor overlay
            if let Some(cursor) = &self.ctx.cursor {
                let mouse_pos = self.ctx.input.raw_mouse_position();
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

            // 7.5 Render built-in debug overlay (toggleable via configured debug_key)
            if let Some(key) = self.debug_key {
                if self.ctx.input.is_key_pressed(key) {
                    self.debug_overlay = !self.debug_overlay;
                }
            }
            if self.debug_overlay {
                let fps = self.ctx.time.fps();
                let dt_ms = self.ctx.time.deltatime() * 1000.0;
                let active_scene = self.scene_manager.get_current_scene().name().to_string();
                let world_count = self.scene_manager.get_current_scene().world().objects().len();
                let ui_count = self.scene_manager.get_current_scene().world().ui_objects().len();
                let logic_count = self.scene_manager.get_current_scene().world().logic_objects().len();
                let mouse = self.ctx.input.mouse_position();

                macroquad::shapes::draw_rectangle(10.0, 10.0, 260.0, 110.0, Color::new(0.0, 0.0, 0.0, 0.75));
                macroquad::shapes::draw_rectangle_lines(10.0, 10.0, 260.0, 110.0, 1.0, Color::new(0.3, 0.8, 1.0, 0.8));

                let info = format!(
                    "DEBUG OVERLAY (F3)\nFPS: {} ({:.1} ms)\nScene: {}\nEntities: W:{} UI:{} L:{}\nMouse: ({:.0}, {:.0})",
                    fps, dt_ms, active_scene, world_count, ui_count, logic_count, mouse.x, mouse.y
                );
                let mut y = 25.0;
                for line in info.lines() {
                    macroquad::text::draw_text(line, 18.0, y, 14.0, WHITE);
                    y += 16.0;
                }
            }

            // 8. Wait for next frame
            next_frame().await;
        }
    }
}
