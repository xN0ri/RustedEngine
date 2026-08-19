# actions.rs

```rust
use std::collections::HashMap;

use macroquad::input::{
    KeyCode, MouseButton, is_key_down, is_key_pressed, is_key_released, is_mouse_button_down,
    is_mouse_button_pressed, is_mouse_button_released,
};

use crate::object::Side;

// ---------------------------------------------------------------------------
// ActionMap — Action binding system for keys and mouse buttons
// ---------------------------------------------------------------------------

/// Maps human-readable action names to lists of keyboard keys and mouse buttons.
/// A single action can be triggered by multiple key bindings (OR logic).
///
/// # Example
/// ```ignore
/// ctx.actions.bind_key("jump", KeyCode::Space);
/// ctx.actions.bind_key("jump", KeyCode::W);
/// ctx.actions.bind_mouse("attack", Side::Left);
///
/// if ctx.actions.is_pressed("jump") {
///     // Handle jump action...
/// }
/// ```
#[derive(Clone, Default)]
pub struct ActionMap {
    keys: HashMap<String, Vec<KeyCode>>,
    mouse: HashMap<String, Vec<MouseButton>>,
}

impl ActionMap {
    /// Creates a new empty [`ActionMap`].
    pub fn new() -> Self {
        Self::default()
    }

    /// Binds a keyboard key to an action name. Multiple keys can be bound to the same action.
    pub fn bind_key(&mut self, action: &str, key: KeyCode) {
        self.keys.entry(action.to_string()).or_default().push(key);
    }

    /// Binds a mouse button to an action name. Multiple buttons can be bound to the same action.
    pub fn bind_mouse(&mut self, action: &str, btn: Side) {
        self.mouse
            .entry(action.to_string())
            .or_default()
            .push(btn.to_macroquad());
    }

    /// Removes all bindings (keys and mouse buttons) associated with the given action name.
    pub fn unbind(&mut self, action: &str) {
        self.keys.remove(action);
        self.mouse.remove(action);
    }

    /// Returns `true` if any bound key or mouse button for the action is currently held down.
    pub fn is_down(&self, action: &str) -> bool {
        let key_down = self
            .keys
            .get(action)
            .is_some_and(|keys| keys.iter().any(|&k| is_key_down(k)));
        let mouse_down = self
            .mouse
            .get(action)
            .is_some_and(|btns| btns.iter().any(|&b| is_mouse_button_down(b)));
        key_down || mouse_down
    }

    /// Returns `true` during the frame any bound key or mouse button for the action was pressed.
    pub fn is_pressed(&self, action: &str) -> bool {
        let key_pressed = self
            .keys
            .get(action)
            .is_some_and(|keys| keys.iter().any(|&k| is_key_pressed(k)));
        let mouse_pressed = self
            .mouse
            .get(action)
            .is_some_and(|btns| btns.iter().any(|&b| is_mouse_button_pressed(b)));
        key_pressed || mouse_pressed
    }

    /// Returns `true` during the frame any bound key or mouse button for the action was released.
    pub fn is_released(&self, action: &str) -> bool {
        let key_released = self
            .keys
            .get(action)
            .is_some_and(|keys| keys.iter().any(|&k| is_key_released(k)));
        let mouse_released = self
            .mouse
            .get(action)
            .is_some_and(|btns| btns.iter().any(|&b| is_mouse_button_released(b)));
        key_released || mouse_released
    }
}
```

---

# animated_texture.rs

```rust
//! Animated texture component ([`AnimatedSprite`]) for frame sequences and retro pseudo-video playback.

use macroquad::{
    color::{Color, WHITE},
    math::{Rect, Vec2},
    texture::{DrawTextureParams, Texture2D, draw_texture_ex},
};

use crate::{engine::Context, object::Clickable, world::Object};

/// 2D Animated sprite component for playing multi-frame texture sequences.
pub struct AnimatedSprite {
    pub position: Vec2,
    pub size: Vec2,
    pub rotation: f32,
    pub color: Color,
    pub frames: Vec<Texture2D>,
    pub fps: f32,
    pub looping: bool,
    current_frame: usize,
    frame_timer: f32,
    pub playing: bool,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl AnimatedSprite {
    /// Creates a new [`AnimatedSprite`] with the provided texture frames and playback speed (FPS).
    pub fn new(position: Vec2, size: Vec2, frames: Vec<Texture2D>, fps: f32) -> Self {
        Self {
            position,
            size,
            rotation: 0.0,
            color: WHITE,
            frames,
            fps: if fps > 0.0 { fps } else { 12.0 },
            looping: true,
            current_frame: 0,
            frame_timer: 0.0,
            playing: true,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Sets rotation in radians.
    pub fn with_rotation(mut self, rotation: f32) -> Self {
        self.rotation = rotation;
        self
    }

    /// Builder pattern: Sets tint color.
    pub fn with_color(mut self, color: Color) -> Self {
        self.color = color;
        self
    }

    /// Builder pattern: Sets entity tag.
    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
        self
    }

    /// Builder pattern: Sets whether the animation loops when reaching the end.
    pub fn with_looping(mut self, looping: bool) -> Self {
        self.looping = looping;
        self
    }

    /// Builder pattern: Sets component to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets component to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets component to deactivated (`active = false`) (alias).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead (typo fix)")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Builder pattern: Sets visibility.
    pub fn with_visible(mut self, visible: bool) -> Self {
        self.visible = visible;
        self
    }

    /// Builder pattern: Sets active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Returns `true` if animated sprite is visible.
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Returns `true` if animated sprite is active.
    pub fn is_active(&self) -> bool {
        self.active
    }

    /// Starts or resumes animation playback.
    pub fn play(&mut self) {
        self.playing = true;
    }

    /// Pauses animation playback at the current frame.
    pub fn pause(&mut self) {
        self.playing = false;
    }

    /// Stops animation playback and resets back to frame 0.
    pub fn stop(&mut self) {
        self.playing = false;
        self.current_frame = 0;
        self.frame_timer = 0.0;
    }

    /// Resets animation playback to frame 0 while preserving `playing` state.
    pub fn reset(&mut self) {
        self.current_frame = 0;
        self.frame_timer = 0.0;
    }

    /// Returns `true` if a non-looping animation has reached its final frame and stopped.
    pub fn is_finished(&self) -> bool {
        !self.looping && !self.playing && self.current_frame + 1 >= self.frames.len()
    }

    /// Returns the current zero-based frame index.
    pub fn current_frame(&self) -> usize {
        self.current_frame
    }

    /// Manually sets the current frame index.
    pub fn set_frame(&mut self, index: usize) {
        if !self.frames.is_empty() {
            self.current_frame = index.min(self.frames.len() - 1);
            self.frame_timer = 0.0;
        }
    }

    /// Returns the bounding rectangle.
    pub fn rect(&self) -> Rect {
        Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        }
    }
}

impl Clickable for AnimatedSprite {
    fn click_rect(&self) -> Rect {
        self.rect()
    }
    fn is_active(&self) -> bool {
        self.active
    }
}

impl Object for AnimatedSprite {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active || !self.playing || self.frames.is_empty() {
            return;
        }

        let frame_duration = 1.0 / self.fps.max(0.001);
        self.frame_timer += ctx.time.deltatime();

        while self.frame_timer >= frame_duration {
            self.frame_timer -= frame_duration;
            if self.current_frame + 1 < self.frames.len() {
                self.current_frame += 1;
            } else if self.looping {
                self.current_frame = 0;
            } else {
                self.playing = false;
                self.frame_timer = 0.0;
                break;
            }
        }
    }

    fn draw(&self) {
        if !self.visible || self.frames.is_empty() {
            return;
        }
        let pos = self.position + crate::ui::get_draw_offset();
        let texture = &self.frames[self.current_frame];
        draw_texture_ex(
            texture,
            pos.x,
            pos.y,
            self.color,
            DrawTextureParams {
                dest_size: Some(self.size),
                rotation: self.rotation,
                ..Default::default()
            },
        );
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn bounds(&self) -> Option<Rect> {
        Some(self.rect())
    }
}
```

---

# asset_manager.rs

```rust
use macroquad::{
    audio::{Sound, load_sound},
    text::{Font, load_ttf_font},
    texture::{Texture2D, load_texture},
};
use std::collections::HashMap;

/// Central asset manager storing loaded textures, sounds, and fonts.
/// Serves as the single source of truth for game resources.
#[derive(Clone, Default)]
pub struct Assets {
    textures: HashMap<String, Texture2D>,
    sequences: HashMap<String, Vec<Texture2D>>,
    sounds: HashMap<String, Sound>,
    fonts: HashMap<String, Font>,
    bitmap_fonts: HashMap<String, std::rc::Rc<crate::bitmap_font::BitmapFont>>,
}

impl Assets {
    /// Creates a new empty [`Assets`] manager.
    pub fn new() -> Self {
        Self {
            textures: HashMap::new(),
            sequences: HashMap::new(),
            sounds: HashMap::new(),
            fonts: HashMap::new(),
            bitmap_fonts: HashMap::new(),
        }
    }

    /// Asynchronously loads a texture from the given file path and stores it under `name`.
    /// Automatically normalizes leading slashes (e.g. `"/assets/img.png"` -> `"assets/img.png"`).
    pub async fn load_texture(
        &mut self,
        name: &str,
        path: &str,
    ) -> Result<Texture2D, macroquad::Error> {
        let clean_path = path.trim_start_matches('/').trim_start_matches('\\');
        let texture = match load_texture(clean_path).await {
            Ok(t) => t,
            Err(e1) => match load_texture(path).await {
                Ok(t) => t,
                Err(e2) => {
                    eprintln!(
                        "[RustedEngine Assets] Failed to load texture '{}' from path '{}' (clean: '{}'): {:?} / {:?}",
                        name, path, clean_path, e1, e2
                    );
                    return Err(e2);
                }
            },
        };
        self.textures.insert(name.to_string(), texture.clone());
        Ok(texture)
    }

    /// Asynchronously loads a pixel-art texture with [`FilterMode::Nearest`](macroquad::texture::FilterMode::Nearest) filtering enabled.
    pub async fn load_texture_nearest(
        &mut self,
        name: &str,
        path: &str,
    ) -> Result<Texture2D, macroquad::Error> {
        let texture = self.load_texture(name, path).await?;
        texture.set_filter(macroquad::texture::FilterMode::Nearest);
        Ok(texture)
    }

    /// Manually inserts a pre-created [`Texture2D`] under `name`.
    pub fn insert_texture(&mut self, name: &str, texture: Texture2D) {
        self.textures.insert(name.to_string(), texture);
    }

    /// Retrieves a reference to a stored texture by name.
    pub fn get_texture(&self, name: &str) -> Option<&Texture2D> {
        self.textures.get(name)
    }

    /// Asynchronously loads a sequence of animation frame textures generated by calling `path_fn(0..count)` and stores them under `name`.
    ///
    /// Using a closure rather than a string format pattern eliminates zero-padding issues (e.g. `rec_001.png`).
    ///
    /// # Example
    /// ```rust,ignore
    /// assets.load_frame_sequence("video", |i| format!("assets/rec_{:03}.png", i), 30).await?;
    /// ```
    pub async fn load_frame_sequence(
        &mut self,
        name: &str,
        path_fn: impl Fn(usize) -> String,
        count: usize,
    ) -> Result<Vec<Texture2D>, macroquad::Error> {
        let mut frames = Vec::with_capacity(count);
        for i in 0..count {
            let p = path_fn(i);
            let clean_p = p.trim_start_matches('/').trim_start_matches('\\');
            let texture = match load_texture(clean_p).await {
                Ok(t) => t,
                Err(_) => load_texture(&p).await?,
            };
            frames.push(texture);
        }
        self.sequences.insert(name.to_string(), frames.clone());
        Ok(frames)
    }

    /// Manually inserts a pre-loaded texture frame sequence under `name`.
    pub fn insert_sequence(&mut self, name: &str, sequence: Vec<Texture2D>) {
        self.sequences.insert(name.to_string(), sequence);
    }

    /// Retrieves a reference to a stored frame sequence by name.
    pub fn get_sequence(&self, name: &str) -> Option<&[Texture2D]> {
        self.sequences.get(name).map(|v| v.as_slice())
    }

    /// Asynchronously loads a sound effect from the given file path and stores it under `name`.
    pub async fn load_sound(&mut self, name: &str, path: &str) -> Result<Sound, macroquad::Error> {
        let clean_path = path.trim_start_matches('/').trim_start_matches('\\');
        let sound = match load_sound(clean_path).await {
            Ok(s) => s,
            Err(_e1) => match load_sound(path).await {
                Ok(s) => s,
                Err(e2) => {
                    eprintln!(
                        "[RustedEngine Assets] Failed to load sound '{}' from path '{}': {:?}",
                        name, path, e2
                    );
                    return Err(e2);
                }
            },
        };
        self.sounds.insert(name.to_string(), sound.clone());
        Ok(sound)
    }

    /// Manually inserts a pre-loaded [`Sound`] handle under `name`.
    pub fn insert_sound(&mut self, name: &str, sound: Sound) {
        self.sounds.insert(name.to_string(), sound);
    }

    /// Retrieves a reference to a stored sound by name.
    pub fn get_sound(&self, name: &str) -> Option<&Sound> {
        self.sounds.get(name)
    }

    /// Asynchronously loads a TTF font from the given file path and stores it under `name`.
    ///
    /// # Known Limitation
    /// Macroquad's [`Font`] type does not expose a public API to configure glyph atlas texture filtering
    /// (e.g. [`FilterMode::Nearest`](macroquad::texture::FilterMode::Nearest)). Text rendered inside a virtual resolution target ([`Engine::with_virtual_resolution`](crate::engine::Engine::with_virtual_resolution))
    /// inherits the nearest-neighbor filtering of the underlying [`SceneRenderTarget`](crate::postprocess::SceneRenderTarget) texture when composited to screen.
    pub async fn load_font(&mut self, name: &str, path: &str) -> Result<Font, macroquad::Error> {
        let clean_path = path.trim_start_matches('/').trim_start_matches('\\');
        let font = match load_ttf_font(clean_path).await {
            Ok(f) => f,
            Err(_e1) => match load_ttf_font(path).await {
                Ok(f) => f,
                Err(e2) => {
                    eprintln!(
                        "[RustedEngine Assets] Failed to load font '{}' from path '{}': {:?}",
                        name, path, e2
                    );
                    return Err(e2);
                }
            },
        };
        self.fonts.insert(name.to_string(), font.clone());
        Ok(font)
    }

    /// Manually inserts a pre-loaded [`Font`] handle under `name`.
    pub fn insert_font(&mut self, name: &str, font: Font) {
        self.fonts.insert(name.to_string(), font);
    }

    /// Retrieves a reference to a stored font by name.
    pub fn get_font(&self, name: &str) -> Option<&Font> {
        self.fonts.get(name)
    }

    /// Asynchronously loads a TTF font from `path`, bakes it into a pixel-perfect [`BitmapFont`](crate::bitmap_font::BitmapFont)
    /// texture atlas at `native_size`, and stores it under `name` in assets.
    pub async fn load_bitmap_font(
        &mut self,
        name: &str,
        path: &str,
        native_size: u32,
    ) -> Result<std::rc::Rc<crate::bitmap_font::BitmapFont>, macroquad::Error> {
        let _font = self.load_font(name, path).await?;
        let bm = self.bake_bitmap_font(name, native_size).unwrap();
        Ok(bm)
    }

    /// Bakes an already loaded TTF font (`name`) in assets into a [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas at `native_size`.
    pub fn bake_bitmap_font(
        &mut self,
        name: &str,
        native_size: u32,
    ) -> Option<std::rc::Rc<crate::bitmap_font::BitmapFont>> {
        let font = self.fonts.get(name)?;
        let font_id = crate::bitmap_font::register_font_id(name);
        let bm = crate::bitmap_font::BitmapFont::get_or_create(
            font,
            font_id,
            native_size,
            crate::bitmap_font::BitmapFont::default_charset(),
        );
        self.bitmap_fonts.insert(name.to_string(), std::rc::Rc::clone(&bm));
        Some(bm)
    }

    /// Retrieves a reference to a stored [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas by name.
    pub fn get_bitmap_font(&self, name: &str) -> Option<std::rc::Rc<crate::bitmap_font::BitmapFont>> {
        self.bitmap_fonts.get(name).cloned()
    }

    /// Unloads and removes a stored texture by name. Returns `true` if texture was present.
    pub fn unload_texture(&mut self, name: &str) -> bool {
        self.textures.remove(name).is_some()
    }

    /// Unloads and removes a stored texture frame sequence by name. Returns `true` if present.
    pub fn unload_sequence(&mut self, name: &str) -> bool {
        self.sequences.remove(name).is_some()
    }

    /// Unloads and removes a stored sound effect by name. Returns `true` if present.
    pub fn unload_sound(&mut self, name: &str) -> bool {
        self.sounds.remove(name).is_some()
    }

    /// Unloads and removes a stored font by name. Returns `true` if present.
    pub fn unload_font(&mut self, name: &str) -> bool {
        self.fonts.remove(name).is_some()
    }

    /// Unloads and removes a stored bitmap font by name. Returns `true` if present.
    pub fn unload_bitmap_font(&mut self, name: &str) -> bool {
        self.bitmap_fonts.remove(name).is_some()
    }

    /// Clears and unloads all stored textures, frame sequences, sounds, fonts, and bitmap fonts.
    pub fn clear_all(&mut self) {
        self.textures.clear();
        self.sequences.clear();
        self.sounds.clear();
        self.fonts.clear();
        self.bitmap_fonts.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_asset_unloading() {
        let mut assets = Assets::new();
        assert_eq!(assets.get_texture("hero"), None);
        assert!(!assets.unload_texture("hero"));
        assert!(!assets.unload_sound("boom"));
        assert!(!assets.unload_font("main"));
        assets.clear_all();
    }
}
```

---

# audio.rs

```rust
use macroquad::{
    audio::{PlaySoundParams, play_sound, play_sound_once, stop_sound},
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
        self.play_ex(
            assets,
            to,
            PlaySoundParams {
                looped: true,
                volume: 1.0,
            },
        );
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
```

---

# bitmap_font.rs

```rust
//! Module for baking TrueType / OpenType pixel fonts into binary alpha-thresholded,
//! GPU-cached texture atlases with `FilterMode::Nearest` and continuous resolution scaling.
//!
//! Provides zero-blur, pixel-perfect rendering for pixel-art games where fonts must match
//! retro pixel grids exactly.

use macroquad::prelude::*;
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::atomic::{AtomicUsize, Ordering};

static NEXT_FONT_ID: AtomicUsize = AtomicUsize::new(1);

/// Registers or retrieves a stable, unique numeric ID for a named font path or asset key.
pub fn register_font_id(path_or_name: &str) -> usize {
    thread_local! {
        static REGISTRY: RefCell<HashMap<String, usize>> = RefCell::new(HashMap::new());
    }
    REGISTRY.with(|reg| {
        let mut map = reg.borrow_mut();
        *map.entry(path_or_name.to_string())
            .or_insert_with(|| NEXT_FONT_ID.fetch_add(1, Ordering::Relaxed))
    })
}

/// Metrics and atlas texture coordinates for a single character glyph.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GlyphInfo {
    /// Bounding rectangle of the glyph inside the font texture atlas.
    pub rect: Rect,
    /// Horizontal advance width to the next character in pixels.
    pub advance: f32,
    /// Rendering offset relative to horizontal position and font baseline.
    pub offset: Vec2,
    /// Native pixel width of the glyph bitmap.
    pub w: f32,
    /// Native pixel height of the glyph bitmap.
    pub h: f32,
}

/// A pixel-perfect bitmap font atlas generated from a TTF font at its native grid resolution.
///
/// Rendered with `FilterMode::Nearest` and scaling relative to native size to ensure
/// 100% crisp pixel edges without subpixel anti-aliasing blur.
pub struct BitmapFont {
    /// GPU texture atlas containing all glyph bitmaps.
    pub texture: Texture2D,
    /// Map of character to glyph metrics and atlas rectangle.
    pub glyphs: HashMap<char, GlyphInfo>,
    /// Configured native grid size in pixels (e.g. 8, 12, 16, 24).
    pub native_size: u32,
    /// Unique identifier for the underlying TTF source font.
    pub font_id: usize,
}

impl BitmapFont {
    /// Returns the standard default character set containing ASCII printable characters (32..127)
    /// plus Polish diacritics (`ąćęłńóśźżĄĆĘŁŃÓŚŹŻ`).
    pub fn default_charset() -> &'static str {
        " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ąćęłńóśźżĄĆĘŁŃÓŚŹŻ"
    }

    /// Generates a baked [`BitmapFont`] texture atlas from a [`macroquad::text::Font`]
    /// rasterized at `native_size` with binary alpha thresholding ($\ge 128 \to 255$, $< 128 \to 0$)
    /// and 1px glyph padding to prevent texture bleeding across adjacent glyphs.
    pub fn from_ttf(font: &Font, font_id: usize, native_size: u32, charset: &str) -> Self {
        let native_size = native_size.max(1);

        // Deduplicate characters from charset
        let chars: Vec<char> = charset.chars().collect();
        let mut unique_chars: Vec<char> = Vec::new();
        for c in chars {
            if !unique_chars.contains(&c) {
                unique_chars.push(c);
            }
        }
        if unique_chars.is_empty() {
            unique_chars.push('?');
        }

        let cell_w = native_size * 2 + 4;
        let cell_h = native_size * 2 + 4;
        let cols = 16u32;
        let rows = ((unique_chars.len() as u32) + cols - 1) / cols;
        let atlas_w = cols * cell_w;
        let atlas_h = rows * cell_h;

        let mut atlas_img = Image::gen_image_color(atlas_w as u16, atlas_h as u16, Color::from_rgba(0, 0, 0, 0));
        let mut glyphs = HashMap::new();

        let rt_size = (native_size * 3).max(32);
        let rt = render_target(rt_size, rt_size);
        rt.texture.set_filter(FilterMode::Nearest);

        let render_cam = Camera2D {
            zoom: vec2(2.0 / rt_size as f32, -2.0 / rt_size as f32),
            target: vec2(rt_size as f32 / 2.0, rt_size as f32 / 2.0),
            render_target: Some(rt.clone()),
            ..Default::default()
        };

        let baseline_y = (native_size as f32 * 0.75).round();

        for (idx, &ch) in unique_chars.iter().enumerate() {
            let col = (idx as u32) % cols;
            let row = (idx as u32) / cols;
            let cell_origin_x = col * cell_w + 1;
            let cell_origin_y = row * cell_h + 1;

            let c_str = ch.to_string();
            let dims = measure_text(&c_str, Some(font), native_size as u16, 1.0);

            // Render glyph onto offscreen render target
            set_camera(&render_cam);
            clear_background(Color::from_rgba(0, 0, 0, 0));
            draw_text_ex(
                &c_str,
                4.0,
                baseline_y,
                TextParams {
                    font: Some(font),
                    font_size: native_size as u16,
                    color: WHITE,
                    ..Default::default()
                },
            );
            set_default_camera();

            unsafe {
                macroquad::window::get_internal_gl().flush();
            }

            let glyph_img = rt.texture.get_texture_data();

            // Scan bounding box of rendered non-transparent pixels (Y-inverted from OpenGL texture data)
            let mut min_x = rt_size;
            let mut max_x = 0;
            let mut min_y = rt_size;
            let mut max_y = 0;
            let mut has_pixels = false;

            for y in 0..rt_size {
                let src_y = rt_size - 1 - y;
                for x in 0..rt_size {
                    let pix = glyph_img.get_pixel(x, src_y);
                    if pix.a >= 0.2 || pix.r >= 0.2 {
                        min_x = min_x.min(x);
                        max_x = max_x.max(x);
                        min_y = min_y.min(y);
                        max_y = max_y.max(y);
                        has_pixels = true;
                    }
                }
            }

            let (crop_x, crop_y, glyph_w, glyph_h, offset_x, offset_y) = if has_pixels {
                let w = (max_x - min_x + 1).max(1);
                let h = (max_y - min_y + 1).max(1);
                let off_x = min_x as f32 - 4.0;
                let off_y = min_y as f32 - (baseline_y - native_size as f32 * 0.7);
                (min_x, min_y, w, h, off_x, off_y)
            } else {
                let w = (dims.width.ceil() as u32).max(1);
                let h = native_size;
                (0, 0, w, h, 0.0, 0.0)
            };

            // Copy cropped glyph into atlas image with binary alpha thresholding
            for y in 0..glyph_h {
                let src_y = rt_size - 1 - (crop_y + y);
                for x in 0..glyph_w {
                    let src_pixel = glyph_img.get_pixel(crop_x + x, src_y);
                    let final_color = if src_pixel.a >= 0.35 || src_pixel.r >= 0.35 {
                        Color::from_rgba(255, 255, 255, 255)
                    } else {
                        Color::from_rgba(0, 0, 0, 0)
                    };
                    atlas_img.set_pixel(cell_origin_x + x, cell_origin_y + y, final_color);
                }
            }

            let advance = if dims.width > 0.0 { dims.width } else { native_size as f32 * 0.6 };

            glyphs.insert(
                ch,
                GlyphInfo {
                    rect: Rect::new(cell_origin_x as f32, cell_origin_y as f32, glyph_w as f32, glyph_h as f32),
                    advance,
                    offset: vec2(offset_x, offset_y),
                    w: glyph_w as f32,
                    h: glyph_h as f32,
                },
            );
        }

        let texture = Texture2D::from_image(&atlas_img);
        texture.set_filter(FilterMode::Nearest);

        Self {
            texture,
            glyphs,
            native_size,
            font_id,
        }
    }

    /// Thread-local cached lookup or creation of a [`BitmapFont`] atlas keyed by `(font_id, native_size)`.
    pub fn get_or_create(font: &Font, font_id: usize, native_size: u32, charset: &str) -> Rc<Self> {
        thread_local! {
            static CACHE: RefCell<HashMap<(usize, u32), Rc<BitmapFont>>> = RefCell::new(HashMap::new());
        }

        let key = (font_id, native_size);

        CACHE.with(|cache| {
            let mut map = cache.borrow_mut();
            if let Some(bm) = map.get(&key) {
                Rc::clone(bm)
            } else {
                let bm = Rc::new(Self::from_ttf(font, font_id, native_size, charset));
                map.insert(key, Rc::clone(&bm));
                bm
            }
        })
    }

    /// Diagnostic helper function to detect the true native pixel grid size of a pixel-art TTF font.
    pub fn detect_native_size(font: &Font, candidates: &[u32]) -> u32 {
        let sample = "Ag0";
        let mut best_size = candidates.first().copied().unwrap_or(8);
        let mut lowest_blur_count = usize::MAX;

        let rt = render_target(64, 64);
        let render_cam = Camera2D {
            zoom: vec2(2.0 / 64.0, -2.0 / 64.0),
            target: vec2(32.0, 32.0),
            render_target: Some(rt.clone()),
            ..Default::default()
        };

        for &cand in candidates {
            set_camera(&render_cam);
            clear_background(Color::from_rgba(0, 0, 0, 0));
            draw_text_ex(
                sample,
                0.0,
                cand as f32 * 0.75,
                TextParams {
                    font: Some(font),
                    font_size: cand as u16,
                    color: WHITE,
                    ..Default::default()
                },
            );
            set_default_camera();

            unsafe {
                macroquad::window::get_internal_gl().flush();
            }

            let img = rt.texture.get_texture_data();
            let mut blur_pixels = 0;
            for y in 0..cand.min(64) {
                for x in 0..64 {
                    let a = img.get_pixel(x, y).a;
                    if a > 0.05 && a < 0.95 {
                        blur_pixels += 1;
                    }
                }
            }

            if blur_pixels < lowest_blur_count {
                lowest_blur_count = blur_pixels;
                best_size = cand;
            }
        }

        best_size
    }

    /// Calculates the text bounds width and height scaled to target `scale` factor.
    pub fn measure(&self, text: &str, scale: f32) -> Vec2 {
        let mut total_w = 0.0f32;
        let mut max_h = self.native_size as f32;

        for ch in text.chars() {
            let glyph = self.glyphs.get(&ch).or_else(|| self.glyphs.get(&'?'));
            if let Some(g) = glyph {
                total_w += g.advance * scale;
                max_h = max_h.max(g.h);
            } else {
                total_w += (self.native_size as f32 * 0.6) * scale;
            }
        }

        vec2(total_w, max_h * scale)
    }

    /// Renders `text` at `(x, y)` scaled by `scale: f32` to fit ANY target font size
    /// with 100% nearest-neighbor pixel precision and position rounding.
    pub fn draw(&self, text: &str, x: f32, y: f32, scale: f32, color: Color) {
        let mut cur_x = x.round();
        let cur_y = y.round();

        for ch in text.chars() {
            let glyph = self.glyphs.get(&ch).or_else(|| self.glyphs.get(&'?'));
            if let Some(g) = glyph {
                let draw_x = cur_x + g.offset.x * scale;
                let draw_y = cur_y + g.offset.y * scale;
                draw_texture_ex(
                    &self.texture,
                    draw_x.round(),
                    draw_y.round(),
                    color,
                    DrawTextureParams {
                        source: Some(g.rect),
                        dest_size: Some(vec2(g.rect.w * scale, g.rect.h * scale)),
                        ..Default::default()
                    },
                );
                cur_x += (g.advance * scale).round();
            } else {
                cur_x += (self.native_size as f32 * 0.6 * scale).round();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_glyph_info_creation() {
        let info = GlyphInfo {
            rect: Rect::new(1.0, 1.0, 8.0, 8.0),
            advance: 8.0,
            offset: Vec2::ZERO,
            w: 8.0,
            h: 8.0,
        };
        assert_eq!(info.w, 8.0);
        assert_eq!(info.advance, 8.0);
    }

    #[test]
    fn test_font_registry_id_assignment() {
        let id1 = register_font_id("fonts/pixel_ui.ttf");
        let id2 = register_font_id("fonts/pixel_dialog.ttf");
        let id1_again = register_font_id("fonts/pixel_ui.ttf");

        assert_eq!(id1, id1_again);
        assert_ne!(id1, id2);
    }
}
```

---

# camera.rs

```rust
use macroquad::{
    camera::{Camera2D, set_camera, set_default_camera},
    math::{Vec2, vec2},
    rand::gen_range,
    window::{screen_height, screen_width},
};

/// 2D Camera controller supporting screen shake, lerp target tracking, and cached matrices.
///
/// The underlying [`Camera2D`] matrix is cached once per frame in [`Camera::update`]
/// to guarantee that rendering coordinates and input math ([`Camera::screen_to_world`])
/// remain completely consistent across all entity updates.
pub struct Camera {
    /// World space position the camera is focused on.
    pub target: Vec2,
    /// Zoom level multiplier (1.0 = normal).
    pub zoom: f32,
    /// Camera rotation angle in radians.
    pub rotation: f32,
    shake_intensity: f32,
    shake_duration: f32,
    shake_timer: f32,
    /// Cached camera matrix computed during update for frame consistency.
    cached: Camera2D,
    /// Optional virtual resolution override for zoom calculation.
    /// When `Some(vw, vh)`, camera zoom is based on virtual dimensions instead of real screen.
    /// Set automatically by [`Engine`](crate::engine::Engine) when `with_virtual_resolution` is active.
    pub(crate) virtual_size: Option<Vec2>,
}

impl Camera {
    /// Creates a new 2D [`Camera`] initialized at `(0, 0)` with zoom `1.0`.
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
            virtual_size: None,
        }
    }

    /// Builds a Macroquad [`Camera2D`] instance from target, zoom, rotation, and shake offset.
    pub fn build_camera2d(target: Vec2, zoom: f32, rotation: f32, shake_offset: Vec2) -> Camera2D {
        let (sw, sh) = if cfg!(test) {
            (800.0, 600.0)
        } else {
            (screen_width(), screen_height())
        };
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

    /// Returns a native Macroquad [`Camera2D`] instance based on current cached camera properties.
    pub fn to_macroquad(&self) -> Camera2D {
        Camera2D {
            target: self.cached.target,
            zoom: self.cached.zoom,
            rotation: self.cached.rotation,
            offset: self.cached.offset,
            render_target: self.cached.render_target.clone(),
            viewport: self.cached.viewport,
        }
    }

    /// Smoothly interpolates (lerps) the camera target toward `target_pos`.
    pub fn follow(&mut self, target_pos: Vec2, lerp_speed: f32, dt: f32) {
        let factor = (lerp_speed * dt).clamp(0.0, 1.0);
        self.target = self.target.lerp(target_pos, factor);
    }

    /// Triggers a screen shake effect with the specified intensity and duration in seconds.
    pub fn shake(&mut self, intensity: f32, duration: f32) {
        self.shake_intensity = intensity;
        self.shake_duration = duration;
        self.shake_timer = duration;
    }

    /// Updates camera timers, processes shake offsets, and caches the [`Camera2D`] matrix.
    /// Must be called once per frame prior to calling [`Camera::begin`] or coordinate transforms.
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

        // When virtual resolution is active, override zoom to be based on virtual dimensions.
        // This ensures 1 world unit = 1 virtual pixel regardless of real screen resolution.
        if let Some(vs) = self.virtual_size {
            self.cached.zoom = vec2((2.0 / vs.x) * self.zoom, (2.0 / vs.y) * self.zoom);
        }
    }

    /// Activates world-space camera rendering mode (for world entities).
    pub fn begin(&self) {
        set_camera(&self.cached);
    }

    /// Activates world-space camera rendering mode redirecting output to a target [`RenderTarget`](macroquad::texture::RenderTarget).
    /// Preserves all current camera properties (target, zoom, rotation, shake).
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

    /// Deactivates world camera mode, returning to default screen-space rendering (for UI).
    pub fn end(&self) {
        set_default_camera();
    }

    /// Converts screen-space pixel coordinates into camera-relative world coordinates.
    pub fn screen_to_world(&self, screen_pos: Vec2) -> Vec2 {
        self.cached.screen_to_world(screen_pos)
    }

    /// Converts world-space coordinates into screen-space pixel coordinates.
    pub fn world_to_screen(&self, world_pos: Vec2) -> Vec2 {
        self.cached.world_to_screen(world_pos)
    }
}

impl Default for Camera {
    fn default() -> Self {
        Self::new()
    }
}
```

---

# content.rs

```rust
//! Generic content loading pipeline.
//!
//! Provides [`load_content`] and [`load_content_dir`] for deserializing any
//! `T: DeserializeOwned` from JSON files on disk. The engine has zero knowledge
//! of what the data represents — that is entirely up to the game.

use serde::de::DeserializeOwned;
use std::{fmt, fs, io, path::Path};

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/// Errors that can occur when loading content from disk.
#[derive(Debug)]
pub enum ContentError {
    /// An IO error (e.g. file not found, permission denied).
    Io { path: String, source: io::Error },
    /// JSON deserialization failed.
    Parse {
        path: String,
        source: serde_json::Error,
    },
    /// The given path is not a directory (for [`load_content_dir`]).
    NotADirectory(String),
}

impl fmt::Display for ContentError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ContentError::Io { path, source } => {
                write!(f, "IO error reading '{}': {}", path, source)
            }
            ContentError::Parse { path, source } => {
                write!(f, "JSON parse error in '{}': {}", path, source)
            }
            ContentError::NotADirectory(path) => {
                write!(f, "'{}' is not a directory", path)
            }
        }
    }
}

impl std::error::Error for ContentError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            ContentError::Io { source, .. } => Some(source),
            ContentError::Parse { source, .. } => Some(source),
            ContentError::NotADirectory(_) => None,
        }
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Deserializes a value of type `T` from a JSON file at `path`.
///
/// Works for any type that implements [`serde::de::DeserializeOwned`].
/// The engine imposes no constraints on what `T` contains — level configs,
/// dialogue tables, balance sheets, etc. are all valid targets.
///
/// # Errors
/// Returns [`ContentError::Io`] if the file cannot be read, or
/// [`ContentError::Parse`] if the JSON is malformed / incompatible with `T`.
///
/// # Example
/// ```rust,ignore
/// let level: LevelConfig = load_content("assets/level_01.json")?;
/// ```
pub fn load_content<T: DeserializeOwned>(path: &str) -> Result<T, ContentError> {
    let raw = fs::read_to_string(path).map_err(|e| ContentError::Io {
        path: path.to_owned(),
        source: e,
    })?;
    serde_json::from_str(&raw).map_err(|e| ContentError::Parse {
        path: path.to_owned(),
        source: e,
    })
}

/// Deserializes every `*.json` file in `dir` into a `Vec<T>`.
///
/// Files are processed in directory-entry order (OS-defined). Any file that
/// fails to deserialize returns an error immediately (fail-fast behaviour).
///
/// # Errors
/// - [`ContentError::NotADirectory`] if `dir` does not point to a directory.
/// - [`ContentError::Io`] / [`ContentError::Parse`] forwarded from individual files.
pub fn load_content_dir<T: DeserializeOwned>(dir: &str) -> Result<Vec<T>, ContentError> {
    let dir_path = Path::new(dir);
    if !dir_path.is_dir() {
        return Err(ContentError::NotADirectory(dir.to_owned()));
    }

    let entries = fs::read_dir(dir_path).map_err(|e| ContentError::Io {
        path: dir.to_owned(),
        source: e,
    })?;

    let mut results = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| ContentError::Io {
            path: dir.to_owned(),
            source: e,
        })?;
        let file_path = entry.path();
        if file_path.extension().and_then(|s| s.to_str()) == Some("json") {
            let path_str = file_path.to_string_lossy().into_owned();
            let item: T = load_content(&path_str)?;
            results.push(item);
        }
    }
    Ok(results)
}

// ---------------------------------------------------------------------------
// Unit tests (pure Rust, no macroquad)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Deserialize;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[derive(Debug, Deserialize, PartialEq)]
    struct Dummy {
        id: String,
        value: i32,
    }

    #[test]
    fn load_valid_json() {
        let mut f = NamedTempFile::new().unwrap();
        writeln!(f, r#"{{"id":"test","value":42}}"#).unwrap();
        let path = f.path().to_string_lossy().into_owned();
        let d: Dummy = load_content(&path).unwrap();
        assert_eq!(
            d,
            Dummy {
                id: "test".into(),
                value: 42
            }
        );
    }

    #[test]
    fn load_missing_file_returns_io_error() {
        let result = load_content::<Dummy>("/nonexistent/path/data.json");
        assert!(matches!(result, Err(ContentError::Io { .. })));
    }

    #[test]
    fn load_bad_json_returns_parse_error() {
        let mut f = NamedTempFile::new().unwrap();
        writeln!(f, "not json at all").unwrap();
        let path = f.path().to_string_lossy().into_owned();
        let result = load_content::<Dummy>(&path);
        assert!(matches!(result, Err(ContentError::Parse { .. })));
    }

    #[test]
    fn not_a_dir_error() {
        let result = load_content_dir::<Dummy>("/nonexistent/dir");
        assert!(matches!(result, Err(ContentError::NotADirectory(_))));
    }
}
```

---

# draggable.rs

```rust
use macroquad::{
    input::mouse_position,
    math::{Vec2, vec2},
};

use crate::engine::Context;

// ---------------------------------------------------------------------------
// DragState — Dragging state tracker struct
// ---------------------------------------------------------------------------

/// Helper struct for holding mouse dragging state. Include as a field inside structs implementing [`Draggable`].
///
/// # Example
/// ```ignore
/// struct MyWindow {
///     position: Vec2,
///     drag: DragState,
/// }
/// ```
#[derive(Clone, Debug, Default)]
pub struct DragState {
    /// Indicates whether the entity is currently being dragged.
    pub is_dragging: bool,
    /// Offset between the mouse grab point and the entity anchor position.
    pub offset: Vec2,
}

impl DragState {
    /// Creates a new un-grabbed [`DragState`].
    pub fn new() -> Self {
        Self {
            is_dragging: false,
            offset: vec2(0.0, 0.0),
        }
    }
}

// ---------------------------------------------------------------------------
// Draggable trait — Mouse drag-and-drop interaction trait
// ---------------------------------------------------------------------------

/// Trait providing drag-and-drop interaction mechanics for entities.
///
/// Implement [`Draggable::drag_anchor_mut`], [`Draggable::drag_state`], and [`Draggable::drag_state_mut`].
/// Default methods manage the full dragging lifecycle: `start_drag` -> `update_drag` -> `end_drag`.
///
/// # Coordinate Spaces
///
/// - Methods **without** the `_ctx` suffix ([`start_drag`](Draggable::start_drag), [`update_drag`](Draggable::update_drag)) operate in **screen space** (raw pixel mouse coordinates). Use these for UI components ([`Panel`](crate::ui::Panel)).
/// - For world-space entities (such as [`Sprite`](crate::object::Sprite) rendered through a 2D camera), **use the `_ctx` variants** ([`start_drag_ctx`](Draggable::start_drag_ctx), [`update_drag_ctx`](Draggable::update_drag_ctx)), which convert mouse position via `ctx.camera.screen_to_world()`.
///
/// # Example
/// ```ignore
/// if ctx.input.is_mouse_button_pressed(MouseButton::Left) && obj.is_drag_hovered() {
///     obj.start_drag_ctx(ctx);
/// }
/// obj.update_drag_ctx(ctx);
/// if ctx.input.is_mouse_button_released(MouseButton::Left) {
///     obj.end_drag();
/// }
/// ```
pub trait Draggable {
    /// Returns a mutable reference to the entity's position anchor point.
    fn drag_anchor_mut(&mut self) -> &mut Vec2;

    /// Returns a read-only reference to the entity's [`DragState`].
    fn drag_state(&self) -> &DragState;

    /// Returns a mutable reference to the entity's [`DragState`].
    fn drag_state_mut(&mut self) -> &mut DragState;

    /// Checks whether the mouse cursor is currently over the draggable grab handle area.
    /// Defaults to `true`. Override to restrict grab regions (e.g., window titlebar).
    fn is_drag_hovered(&self) -> bool {
        true
    }

    /// Begins dragging (**screen space**).
    ///
    /// ⚠️ For world-space entities rendered with a 2D camera, use [`start_drag_ctx`](Draggable::start_drag_ctx).
    fn start_drag(&mut self) {
        let (mx, my) = mouse_position();
        let anchor = *self.drag_anchor_mut();
        let offset = vec2(mx, my) - anchor;
        let state = self.drag_state_mut();
        state.is_dragging = true;
        state.offset = offset;
    }

    /// Begins dragging (**world space** using camera matrix transformation).
    fn start_drag_ctx(&mut self, ctx: &Context) {
        let m_world = ctx.camera.screen_to_world(ctx.input.mouse_position());
        let anchor = *self.drag_anchor_mut();
        let offset = m_world - anchor;
        let state = self.drag_state_mut();
        state.is_dragging = true;
        state.offset = offset;
    }

    /// Updates the entity's position according to mouse movement (**screen space**). Call each frame.
    ///
    /// ⚠️ For world-space entities rendered with a 2D camera, use [`update_drag_ctx`](Draggable::update_drag_ctx).
    fn update_drag(&mut self) {
        if !self.drag_state().is_dragging {
            return;
        }
        let (mx, my) = mouse_position();
        let offset = self.drag_state().offset;
        *self.drag_anchor_mut() = vec2(mx, my) - offset;
    }

    /// Updates the entity's position according to mouse movement (**world space** using camera matrix transformation).
    fn update_drag_ctx(&mut self, ctx: &Context) {
        if !self.drag_state().is_dragging {
            return;
        }
        let m_world = ctx.camera.screen_to_world(ctx.input.mouse_position());
        let offset = self.drag_state().offset;
        *self.drag_anchor_mut() = m_world - offset;
    }

    /// Concludes the dragging operation.
    fn end_drag(&mut self) {
        self.drag_state_mut().is_dragging = false;
    }

    /// Returns `true` if the entity is currently being dragged.
    fn is_dragging(&self) -> bool {
        self.drag_state().is_dragging
    }
}
```

---

# engine.rs

```rust
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
            events: crate::events::EventBus::new(),
            save_system: crate::save_system::SaveSystem::default(),
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
    /// Optional virtual (design) resolution `(width, height)` in pixels.
    /// When set, all rendering is composited through a fixed-size render target and
    /// letterboxed / pillarboxed to the real window. Mouse coordinates are automatically
    /// remapped to virtual space. See [`Engine::with_virtual_resolution`].
    pub virtual_resolution: Option<(f32, f32)>,
    /// Whether integer scaling (`.floor()`) is enforced for virtual resolution. Defaults to `true`.
    pub integer_scaling: bool,
    /// Internal fixed-size render target for the virtual resolution pipeline.
    virtual_render_target: Option<crate::postprocess::SceneRenderTarget>,
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
            virtual_resolution: None,
            integer_scaling: true,
            virtual_render_target: None,
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

    /// Builder pattern: Note — window resizability **cannot** be changed at runtime via this method.
    /// Configure it at startup using [`Engine::conf`] or [`Engine::conf_custom`] instead.
    ///
    /// This method is kept as a no-op stub to avoid breaking API churn.
    #[doc(hidden)]
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
            self.scene_manager.update_pending();

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
            scene.get_world().update(&mut self.ctx);

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
                self.scene_manager.get_current_scene().get_world().draw();
                self.ctx.camera.end();

                // 6v. Render NON-TEXT UI to VRT using a flat virtual-coordinate camera.
                let ui_to_vrt = Camera2D {
                    zoom: vec2(2.0 / vw, -2.0 / vh),
                    target: vec2(vw / 2.0, vh / 2.0),
                    render_target: Some(vrt.target.clone()),
                    ..Default::default()
                };
                set_camera(&ui_to_vrt);
                self.scene_manager.get_current_scene().get_world().draw_ui_non_text();
                set_default_camera();

                // 7v. Composite VRT (world + non-text UI) to real screen with letterbox
                let (scale, ox, oy) = self.letterbox_params(vw, vh);
                clear_background(macroquad::color::BLACK);
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
                self.scene_manager.get_current_scene().get_world().draw_ui_text_only();
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

            // 8. Wait for next frame
            next_frame().await;
        }
    }
}
```

---

# events.rs

```rust
//! Type-safe Event Bus system for decoupled entity and scene communication.
//!
//! # Example
//! ```ignore
//! #[derive(Clone, Debug)]
//! pub struct ItemCollected { pub points: i64 }
//!
//! // Emit event
//! ctx.events.emit(ItemCollected { points: 100 });
//!
//! // Poll events
//! for event in ctx.events.poll::<ItemCollected>() {
//!     println!("Got {} points!", event.points);
//! }
//! ```
use std::any::{Any, TypeId};
use std::collections::HashMap;

/// Type-safe event channel store.
#[derive(Default)]
pub struct EventBus {
    channels: HashMap<TypeId, Vec<Box<dyn Any>>>,
}

impl EventBus {
    /// Creates a new empty [`EventBus`].
    pub fn new() -> Self {
        Self {
            channels: HashMap::new(),
        }
    }

    /// Emits a new event onto its corresponding type channel.
    pub fn emit<E: 'static + Send + Sync>(&mut self, event: E) {
        let type_id = TypeId::of::<E>();
        self.channels
            .entry(type_id)
            .or_default()
            .push(Box::new(event));
    }

    /// Returns `true` if there are pending events of type `E`.
    pub fn has_events<E: 'static>(&self) -> bool {
        let type_id = TypeId::of::<E>();
        self.channels
            .get(&type_id)
            .map(|v| !v.is_empty())
            .unwrap_or(false)
    }

    /// Drains and returns all pending events of type `E`.
    pub fn poll<E: 'static>(&mut self) -> Vec<E> {
        let type_id = TypeId::of::<E>();
        if let Some(vec) = self.channels.get_mut(&type_id) {
            vec.drain(..)
                .filter_map(|boxed| boxed.downcast::<E>().ok().map(|b| *b))
                .collect()
        } else {
            Vec::new()
        }
    }

    /// Drains pending events of type `E` and executes `handler` for each event.
    pub fn subscribe<E: 'static, F: FnMut(E)>(&mut self, mut handler: F) {
        for event in self.poll::<E>() {
            handler(event);
        }
    }

    /// Clears all pending events across all event channels.
    pub fn clear(&mut self) {
        self.channels.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Clone, Debug, PartialEq, Eq)]
    struct DamageEvent {
        amount: u32,
    }

    #[test]
    fn test_event_bus() {
        let mut bus = EventBus::new();
        assert!(!bus.has_events::<DamageEvent>());

        bus.emit(DamageEvent { amount: 25 });
        bus.emit(DamageEvent { amount: 50 });
        assert!(bus.has_events::<DamageEvent>());

        let events = bus.poll::<DamageEvent>();
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].amount, 25);
        assert_eq!(events[1].amount, 50);

        assert!(!bus.has_events::<DamageEvent>());
    }
}
```

---

# input.rs

```rust
use macroquad::{
    input::{
        KeyCode, MouseButton, is_key_down, is_key_pressed, is_key_released, is_mouse_button_down,
        is_mouse_button_pressed, is_mouse_button_released, mouse_position,
    },
    math::{Vec2, vec2},
};

/// Hardware input wrapper exposing keyboard and mouse query methods.
pub struct Input {
    /// Letterbox viewport transform: `(scale, offset_x, offset_y)`.
    /// Set by [`Engine`](crate::engine::Engine) each frame when `with_virtual_resolution` is active.
    /// Default `(1.0, 0.0, 0.0)` = passthrough (no remapping).
    pub(crate) viewport: (f32, f32, f32),
}

impl Input {
    /// Creates a new [`Input`] query instance.
    pub fn new() -> Self {
        Self {
            viewport: (1.0, 0.0, 0.0),
        }
    }

    /// Returns `true` if the specified keyboard key is currently held down.
    pub fn is_key_down(&self, key: KeyCode) -> bool {
        is_key_down(key)
    }

    /// Returns `true` during the frame the specified keyboard key was pressed.
    pub fn is_key_pressed(&self, key: KeyCode) -> bool {
        is_key_pressed(key)
    }

    /// Returns `true` during the frame the specified keyboard key was released.
    pub fn is_key_up(&self, key: KeyCode) -> bool {
        is_key_released(key)
    }

    /// Returns the mouse position mapped to virtual coordinates (when virtual resolution is active),
    /// or raw screen pixels otherwise. Use [`Input::raw_mouse_position`] for unremapped OS position.
    pub fn mouse_position(&self) -> Vec2 {
        let (x, y) = mouse_position();
        let (scale, ox, oy) = self.viewport;
        vec2((x - ox) / scale, (y - oy) / scale)
    }

    /// Returns the raw OS mouse position in real screen pixels, unaffected by letterbox scaling.
    pub fn raw_mouse_position(&self) -> Vec2 {
        let (x, y) = mouse_position();
        vec2(x, y)
    }

    /// Returns `true` if the specified mouse button is currently held down.
    pub fn is_mouse_button_down(&self, button: MouseButton) -> bool {
        is_mouse_button_down(button)
    }

    /// Returns `true` during the frame the specified mouse button was pressed.
    pub fn is_mouse_button_pressed(&self, button: MouseButton) -> bool {
        is_mouse_button_pressed(button)
    }

    /// Returns `true` during the frame the specified mouse button was released.
    pub fn is_mouse_button_released(&self, button: MouseButton) -> bool {
        is_mouse_button_released(button)
    }

    /// Returns a normalized 2D movement direction vector derived from WASD keyboard keys.
    pub fn wasd(&self) -> Vec2 {
        let mut dir = Vec2::ZERO;
        if is_key_down(KeyCode::W) {
            dir.y -= 1.0;
        }
        if is_key_down(KeyCode::S) {
            dir.y += 1.0;
        }
        if is_key_down(KeyCode::A) {
            dir.x -= 1.0;
        }
        if is_key_down(KeyCode::D) {
            dir.x += 1.0;
        }
        if dir.length_squared() > 0.0 {
            dir.normalize()
        } else {
            Vec2::ZERO
        }
    }

    /// Returns a normalized 2D movement direction vector derived from arrow keyboard keys.
    pub fn arrow_keys(&self) -> Vec2 {
        let mut dir = Vec2::ZERO;
        if is_key_down(KeyCode::Up) {
            dir.y -= 1.0;
        }
        if is_key_down(KeyCode::Down) {
            dir.y += 1.0;
        }
        if is_key_down(KeyCode::Left) {
            dir.x -= 1.0;
        }
        if is_key_down(KeyCode::Right) {
            dir.x += 1.0;
        }
        if dir.length_squared() > 0.0 {
            dir.normalize()
        } else {
            Vec2::ZERO
        }
    }
}

impl Default for Input {
    fn default() -> Self {
        Self::new()
    }
}
```

---

# lib.rs

```rust
//! # 🦀 RustyEngine
//!
//! A lightweight, modular 2D game engine framework in Rust built on top of [Macroquad](https://macroquad.rs/).
//! Designed to eliminate repetitive boilerplate while maintaining performance, safety, and flexible control.
//!
//! ## Core Architecture
//!
//! - **World & UI Layering**: Separate rendering targets for 2D world camera entities vs screen-space UI elements.
//! - **Generic Entity Behaviors**: Wrap any entity (`Sprite`, `Text`, `ParticleEmitter`, `ProgressBar`, `Panel`) in [`Behavior`](object::Behavior) to attach custom data and per-frame update closures.
//! - **Declarative World Initialization**: Use [`world!`] and [`world_objects!`] macros to instantiate entity layers concisely.
//! - **State Store & Save Files**: Built-in [`StateStore`](state::StateStore) with JSON serialization support via Serde.
//! - **Action Mapping**: Bind hardware inputs (keys and mouse buttons) to high-level named actions with [`ActionMap`](actions::ActionMap).
//! - **Post-Processing Shaders**: Custom material GLSL post-processing pipeline ([`PostProcess`](postprocess::PostProcess)) with nearest-neighbor pixel art filtering.
//! - **Generic Resources**: Type-keyed global resource store ([`Resources`](resources::Resources)) available on every [`Context`](engine::Context) via `ctx.resources`.
//! - **Content Pipeline**: Generic JSON data loading ([`load_content`](content::load_content), [`load_content_dir`](content::load_content_dir)) for any `Deserialize` type.
//! - **Trigger System**: Condition→action rule engine operating on [`Resources`](resources::Resources) ([`TriggerSystem`](trigger::TriggerSystem)).
//! - **Panel System**: Generic layered, interactive UI panel manager ([`PanelManager`](panel_manager::PanelManager)).

pub mod actions;
pub mod animated_texture;
pub mod asset_manager;
pub mod audio;
pub mod bitmap_font;
pub mod camera;
pub mod content;
pub mod draggable;
pub mod engine;
pub mod events;
pub mod input;
pub mod object;
pub mod panel_manager;
pub mod particles;
pub mod postprocess;
pub mod prelude;
pub mod resources;
pub mod save_system;
pub mod scene;
pub mod sequence;
pub mod state;
pub mod tilemap;
pub mod time;
pub mod trigger;
pub mod ui;
pub mod window;
pub mod world;

pub use animated_texture::AnimatedSprite;
pub use bitmap_font::{BitmapFont, GlyphInfo, register_font_id};
pub use content::{ContentError, load_content, load_content_dir};
pub use events::EventBus;
pub use panel_manager::{PanelId, PanelManager};
pub use resources::Resources;
pub use save_system::{SaveError, SaveSlotMeta, SaveSystem};
pub use tilemap::Tilemap;
pub use trigger::{Trigger, TriggerSystem};
pub use ui::{
    Button, Checkbox, Grid, HBox, Image, LayoutAlign, LayoutJustify, Margin, Padding,
    Panel as UiPanel, ProgressBar, RevealMode, RichText, RichTextObject, ScrollMode, Slider, Text, TextAlign, TextField,
    TextLog, TextLogLine, TextSpan, Tooltip, UIAnchor, VBox, UI, margin, padding, parse_color, parse_rich_text, rich_text,
};

#[cfg(test)]
mod tests {
    use super::prelude::*;
    use macroquad::color::WHITE;
    use macroquad::input::KeyCode;
    use macroquad::math::vec2;

    #[test]
    fn test_state_store_and_serde() {
        let mut store = StateStore::new();
        store.set_bool("door_open", true);
        store.set_int("gold", 100);
        store.increment("gold", 50);
        store.set_text("player_name", "Hero");

        assert!(store.get_bool("door_open"));
        assert_eq!(store.get_int("gold"), 150);
        assert_eq!(store.get_text("player_name"), "Hero");

        // Save & Load JSON
        let temp_path = std::env::temp_dir().join("rusty_engine_test_state.json");
        let path_str = temp_path.to_str().unwrap();

        store.save_to_file(path_str).unwrap();
        let loaded = StateStore::load_from_file(path_str).unwrap();

        assert!(loaded.get_bool("door_open"));
        assert_eq!(loaded.get_int("gold"), 150);
        assert_eq!(loaded.get_text("player_name"), "Hero");

        let _ = std::fs::remove_file(temp_path);
    }

    #[test]
    fn test_action_map() {
        let mut actions = ActionMap::new();
        actions.bind_key("jump", KeyCode::Space);
        actions.bind_mouse("attack", Side::Left);

        actions.unbind("jump");
        assert!(!actions.is_down("jump"));
    }

    #[test]
    fn test_text_typewriter() {
        let mut text = Text::new("Hello", vec2(0.0, 0.0), 20.0, WHITE).with_typewriter(10.0);

        assert!(!text.is_finished());
        text.skip();
        assert_eq!(text.content, "Hello");
        assert!(text.is_finished());
    }

    #[test]
    fn test_ui_bring_to_front_and_count() {
        let p1 = UiPanel::new(vec2(0.0, 0.0), vec2(100.0, 100.0)).with_tag("panel1");
        let p2 = UiPanel::new(vec2(10.0, 10.0), vec2(100.0, 100.0)).with_tag("panel2");

        let ui = UI::new(vec![Box::new(p1), Box::new(p2)]);
        let world = World::new_with_ui(vec![], vec![Box::new(ui)]);

        assert_eq!(world.count_ui_by_tag("UI"), 1);
    }

    #[test]
    fn test_object_set_text() {
        let mut text = Text::new("Old text", vec2(0.0, 0.0), 20.0, WHITE);
        text.set_text("New text");
        assert_eq!(text.content, "New text");
    }

    #[test]
    fn test_world_macros() {
        let t1 = Text::new("T1", vec2(0.0, 0.0), 10.0, WHITE);
        let t2 = Text::new("T2", vec2(0.0, 0.0), 10.0, WHITE);
        let p1 = UiPanel::new(vec2(0.0, 0.0), vec2(50.0, 50.0));

        let w_full = world! {
            objects: [t1, t2],
            ui: [p1],
        };

        assert_eq!(w_full.objects().len(), 2);
        assert_eq!(w_full.ui_objects().len(), 1);

        let t3 = Text::new("T3", vec2(0.0, 0.0), 10.0, WHITE);
        let w_no_ui = world! {
            objects: [t3],
        };

        assert_eq!(w_no_ui.objects().len(), 1);
        assert_eq!(w_no_ui.ui_objects().len(), 0);
    }

    #[test]
    fn test_hidden_and_deactivated() {
        let rect = Rectangle::new(vec2(0.0, 0.0), vec2(10.0, 10.0), 0.0, WHITE)
            .hidden()
            .deactivated();
        assert!(!rect.is_visible());
        assert!(!rect.is_active());

        let button = Button::new(vec2(0.0, 0.0), vec2(10.0, 10.0), "Click")
            .hidden()
            .deactivated();
        assert!(!button.is_visible());
        assert!(!button.is_active());

        let text = Text::new("Hi", vec2(0.0, 0.0), 12.0, WHITE)
            .hidden()
            .deactivated();
        assert!(!text.is_visible());
        assert!(!text.is_active());

        let panel = UiPanel::new(vec2(0.0, 0.0), vec2(100.0, 100.0))
            .hidden()
            .deactivated();
        assert!(!panel.is_visible());
        assert!(!panel.is_active());

        let progress = ProgressBar::new(vec2(0.0, 0.0), vec2(100.0, 10.0), 0.5)
            .hidden()
            .deactivated();
        assert!(!progress.is_visible());
        assert!(!progress.is_active());

        let behavior_obj = Behavior::new(
            Rectangle::new(vec2(0.0, 0.0), vec2(10.0, 10.0), 0.0, WHITE),
            (),
        )
        .hidden()
        .deactivated();
        assert!(!behavior_obj.is_visible());
        assert!(!behavior_obj.is_active());

        let ui = UI::new(vec![]).hidden().deactivated();
        assert!(!ui.is_visible());
        assert!(!ui.is_active());
    }

    #[test]
    fn test_text_field() {
        let mut tf = TextField::new(vec2(10.0, 10.0), vec2(200.0, 30.0), "Enter name...")
            .with_text("Player1")
            .with_max_length(10)
            .without_decoration()
            .hidden()
            .deactivated();

        assert_eq!(tf.text, "Player1");
        assert_eq!(tf.placeholder, "Enter name...");
        assert!(!tf.decorated);
        assert!(!tf.is_visible());
        assert!(!tf.is_active());

        tf.set_focused(true);
        assert!(tf.is_focused());
    }

    #[test]
    fn test_text_word_wrap() {
        let text = Text::new(
            "Hello world this is a long line",
            vec2(0.0, 0.0),
            16.0,
            WHITE,
        )
        .with_max_width(100.0);

        // Dummy measure: 10 pixels per char
        let measure = |s: &str| s.len() as f32 * 10.0;

        // "Hello world" (110 > 100) -> "Hello" (50)
        // "world this" (100 <= 100) -> "world this" (100)
        // "is a long" (90 <= 100) -> "is a long" (90)
        // "line" (40 <= 100) -> "line" (40)
        let wrapped = text.wrap_lines_with(&text.content, 100.0, measure);
        assert_eq!(wrapped.len(), 4);
        assert_eq!(wrapped[0], "Hello");
        assert_eq!(wrapped[1], "world this");
        assert_eq!(wrapped[2], "is a long");
        assert_eq!(wrapped[3], "line");

        // Test with explicit newlines
        let multiline_text = Text::new("Line 1\nLine 2 is long", vec2(0.0, 0.0), 16.0, WHITE);
        let wrapped2 = multiline_text.wrap_lines_with(&multiline_text.content, 100.0, measure);
        assert_eq!(wrapped2[0], "Line 1");
        assert_eq!(wrapped2[1], "Line 2 is");
        assert_eq!(wrapped2[2], "long");
    }

    #[test]
    fn test_animated_sprite() {
        let anim = AnimatedSprite::new(vec2(10.0, 10.0), vec2(32.0, 32.0), vec![], 10.0)
            .with_tag("anim_rec")
            .with_looping(false)
            .hidden()
            .deactivated();

        assert_eq!(anim.tag, "anim_rec");
        assert!(!anim.looping);
        assert!(!anim.is_visible());
        assert!(!anim.is_active());
        assert_eq!(anim.current_frame(), 0);
        assert_eq!(
            anim.bounds(),
            Some(macroquad::math::Rect::new(10.0, 10.0, 32.0, 32.0))
        );
    }

    #[test]
    fn test_panel_scroll_options() {
        let panel = UiPanel::new(vec2(0.0, 0.0), vec2(100.0, 100.0))
            .with_clip_content(true)
            .with_smooth_scroll(false)
            .with_content_height(500.0);

        assert!(panel.clip_content);
        assert!(!panel.smooth_scroll);
        assert_eq!(panel.content_height, Some(500.0));
    }

    struct DummyPanel;
    impl Panel for DummyPanel {
        fn update(&mut self, _dt: f32) {}
        fn draw(&self, _rect: macroquad::math::Rect) {}
    }

    #[test]
    fn test_panel_manager_as_object() {
        let mut panel_mgr = PanelManager::new();
        panel_mgr.add(
            DummyPanel,
            macroquad::math::Rect::new(0.0, 0.0, 100.0, 100.0),
        );
        let mut world = world! {
            objects: [],
            ui: [panel_mgr],
        };

        assert_eq!(world.ui_objects().len(), 1);
        let found = world.find_ui_typed_mut::<PanelManager>();
        assert!(found.is_some());
        assert_eq!(found.unwrap().len(), 1);
    }

    #[test]
    fn test_ergonomic_scene_and_world_api() {
        let mut scene = Scene::new_empty("GameScene");

        struct DummyObj;
        impl Object for DummyObj {
            fn draw(&self) {}
        }

        let obj_a = DummyObj;
        let obj_b = DummyObj;
        let obj_c = DummyObj;

        scene.add(obj_a);
        scene.add_ui(obj_b);
        scene.add_ui(obj_c);

        assert_eq!(scene.name(), "GameScene");
        assert_eq!(scene.get_world().objects().len(), 1);
        assert_eq!(scene.get_world().ui_objects().len(), 2);
    }

    #[test]
    fn test_logic_object() {
        struct Counter {
            val: i32,
        }
        let logic = LogicObject::logic(Counter { val: 10 }).update(|obj, _ctx| {
            obj.data.val += 1;
        });

        let mut world = World::new();
        world.add(logic);
        assert_eq!(world.objects().len(), 1);
    }

    #[test]
    fn test_scene_add_sequence() {
        let mut scene = Scene::new_empty("Boot");

        let seq = Sequence::new(vec![
            Step::SetFlag {
                key: "seq_done".into(),
                value: StateValue::Bool(true),
            },
            Step::End,
        ]);
        scene.add_sequence(seq);

        let mut ctx = Context::new();
        scene.get_world().update(&mut ctx);

        assert!(ctx.state.get_bool("seq_done"));
    }

    #[test]
    fn test_logic_layer_isolation() {
        let mut world = World::new();

        let logic_obj = LogicObject::logic(()).update(|_obj, ctx| {
            ctx.state.set_bool("logic_updated", true);
        });

        world.add_logic(logic_obj);

        assert_eq!(world.objects().len(), 0);
        assert_eq!(world.ui_objects().len(), 0);
        assert_eq!(world.logic_objects().len(), 1);

        let mut ctx = Context::new();
        world.update(&mut ctx);

        assert!(ctx.state.get_bool("logic_updated"));
    }

    #[test]
    fn test_text_log_max_lines() {
        use macroquad::color::WHITE;
        use macroquad::math::vec2;

        let mut log = crate::ui::TextLog::new(vec2(0.0, 0.0), vec2(200.0, 100.0), 16.0, WHITE)
            .with_max_lines(3);

        log.push_line("Line 1");
        log.push_line("Line 2");
        log.push_line("Line 3");
        assert_eq!(log.lines(), vec!["Line 1", "Line 2", "Line 3"]);

        // Push 4th line -> should evict Line 1
        log.push_line("Line 4");
        assert_eq!(log.lines(), vec!["Line 2", "Line 3", "Line 4"]);

        // Push multi-line string with newlines
        log.push_line("Line 5\nLine 6");
        assert_eq!(log.lines(), vec!["Line 4", "Line 5", "Line 6"]);

        // set_text replaces last line
        log.set_text("Line 6 (updated)");
        assert_eq!(log.lines(), vec!["Line 4", "Line 5", "Line 6 (updated)"]);

        // with_max_lines trims existing buffer if lowered
        let trimmed_log = log.with_max_lines(2);
        assert_eq!(trimmed_log.lines(), &["Line 5", "Line 6 (updated)"]);
    }

    #[test]
    fn test_ui_screen_alignment() {
        use crate::ui::{Padding, Panel, TextLog, UIAnchor};
        use macroquad::color::WHITE;
        use macroquad::math::vec2;

        let log = TextLog::new(vec2(0.0, 0.0), vec2(100.0, 100.0), 16.0, WHITE)
            .fit_to_screen_padding(20.0);

        assert!(log.auto_screen_size);
        assert_eq!(log.screen_padding, 20.0);

        let panel = Panel::new(vec2(0.0, 0.0), vec2(200.0, 200.0))
            .fullscreen();

        assert!(panel.auto_screen_size);

        // Vec2 still works (From<Vec2> impl)
        let anchor_pos = UIAnchor::TopRight.compute_position(vec2(100.0, 50.0), vec2(10.0, 10.0));
        assert!(anchor_pos.x >= 0.0);
        assert_eq!(anchor_pos.y, 10.0);

        // Padding::only — different sides
        let p = Padding::only(5.0, 10.0, 15.0, 20.0);
        assert_eq!(p.left, 5.0);
        assert_eq!(p.top, 10.0);
        assert_eq!(p.right, 15.0);
        assert_eq!(p.bottom, 20.0);

        // Padding::all — uniform
        let p_all = Padding::all(8.0);
        assert_eq!(p_all.left, 8.0);
        assert_eq!(p_all.right, 8.0);

        // Padding::symmetric
        let p_sym = Padding::symmetric(4.0, 12.0);
        assert_eq!(p_sym.left, 4.0);
        assert_eq!(p_sym.right, 4.0);
        assert_eq!(p_sym.top, 12.0);
        assert_eq!(p_sym.bottom, 12.0);

        // f32 -> Padding
        let p_f32: Padding = 6.0_f32.into();
        assert_eq!(p_f32.left, 6.0);

        // (f32, f32) tuple -> Padding
        let p_tuple: Padding = (3.0_f32, 7.0_f32).into();
        assert_eq!(p_tuple.left, 3.0);
        assert_eq!(p_tuple.top, 7.0);

        // (f32, f32, f32, f32) tuple -> Padding
        let p_tuple4: Padding = (1.0_f32, 2.0_f32, 3.0_f32, 4.0_f32).into();
        assert_eq!(p_tuple4.left, 1.0);
        assert_eq!(p_tuple4.bottom, 4.0);

        // UIAnchor::BottomRight with Padding::only
        let br = UIAnchor::BottomRight.compute_position(
            vec2(100.0, 50.0),
            Padding::only(0.0, 0.0, 20.0, 10.0),
        );
        // screen 800x600 (safe_screen), so: x = 800 - 100 - 20 = 680, y = 600 - 50 - 10 = 540
        assert_eq!(br.x, 680.0);
        assert_eq!(br.y, 540.0);
    }

    #[test]
    fn test_rich_text_bbcode_parsing() {
        use macroquad::color::{Color, WHITE, RED};

        // Test parse_color
        assert_eq!(parse_color("gold"), Some(Color::from_rgba(255, 215, 0, 255)));
        assert_eq!(parse_color("#FF0000"), Some(Color::from_rgba(255, 0, 0, 255)));
        assert_eq!(parse_color("invalid_color"), None);

        // Test parse_rich_text with [color=gold]
        let input = "Zdobyłeś [color=gold]100 złota[/color] i [color=#00FF00]Miecz[/color]!";
        let spans = parse_rich_text(input, WHITE);

        assert_eq!(spans.len(), 5);
        assert_eq!(spans[0].text, "Zdobyłeś ");
        assert_eq!(spans[0].color, WHITE);

        assert_eq!(spans[1].text, "100 złota");
        assert_eq!(spans[1].color, Color::from_rgba(255, 215, 0, 255));

        assert_eq!(spans[2].text, " i ");
        assert_eq!(spans[2].color, WHITE);

        assert_eq!(spans[3].text, "Miecz");
        assert_eq!(spans[3].color, Color::from_rgba(0, 255, 0, 255));

        assert_eq!(spans[4].text, "!");
        assert_eq!(spans[4].color, WHITE);

        // Test nested or fallback colors
        let input_nested = "[color=red]Red [color=blue]Blue[/color] Red[/color] White";
        let spans_nested = parse_rich_text(input_nested, WHITE);
        assert_eq!(spans_nested.len(), 4);
        assert_eq!(spans_nested[0].text, "Red ");
        assert_eq!(spans_nested[0].color, RED);
        assert_eq!(spans_nested[1].text, "Blue");
        assert_eq!(spans_nested[1].color, Color::from_rgba(0, 122, 255, 255));
        assert_eq!(spans_nested[2].text, " Red");
        assert_eq!(spans_nested[2].color, RED);
        assert_eq!(spans_nested[3].text, " White");
        assert_eq!(spans_nested[3].color, WHITE);
    }
}
```

---

# object.rs

```rust
use macroquad::{
    color::{Color, WHITE},
    input::{MouseButton, is_mouse_button_down, is_mouse_button_pressed, mouse_position},
    math::{Rect, Vec2, vec2},
    shapes::draw_rectangle,
    texture::{DrawTextureParams, Texture2D, draw_texture_ex},
};

use crate::{engine::Context, world::Object};

// ---------------------------------------------------------------------------
// Side — Mouse button side enum
// ---------------------------------------------------------------------------

/// Enum representing mouse button sides (Left, Middle, Right).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Side {
    Left,
    Middle,
    Right,
}

impl Side {
    /// Converts [`Side`] into Macroquad's native [`MouseButton`].
    pub fn to_macroquad(self) -> MouseButton {
        match self {
            Side::Left => MouseButton::Left,
            Side::Middle => MouseButton::Middle,
            Side::Right => MouseButton::Right,
        }
    }
}

// ---------------------------------------------------------------------------
// Trait Clickable — Shared hover/click interaction logic
// ---------------------------------------------------------------------------

/// Trait providing shared mouse interaction (hover, click, hold) mechanics for entities.
///
/// Implement [`Clickable::click_rect`] and [`Clickable::is_active`] — default methods handle all input logic.
///
/// # Coordinate Spaces
///
/// Methods **without** the `_ctx` suffix ([`is_hovered`](Clickable::is_hovered), [`click`](Clickable::click), [`clicked`](Clickable::clicked))
/// operate in **screen space** (raw pixel mouse coordinates).
///
/// - For UI elements ([`Button`](crate::ui::Button), [`ProgressBar`](crate::ui::ProgressBar)) rendered on the UI layer, these are appropriate.
/// - For entities rendered in 2D world space ([`Sprite`]), **use the `_ctx` variants** ([`is_hovered_ctx`](Clickable::is_hovered_ctx), [`click_ctx`](Clickable::click_ctx), [`clicked_ctx`](Clickable::clicked_ctx)), which convert mouse coordinates via `ctx.camera.screen_to_world()`.
pub trait Clickable {
    /// Returns the bounding rectangle used for hit-testing mouse interactions.
    fn click_rect(&self) -> Rect;

    /// Returns whether this entity is currently active for click interactions.
    fn is_active(&self) -> bool;

    /// Returns `true` if the mouse cursor is over the entity (**screen space**).
    ///
    /// ⚠️ For world-space entities rendered with a 2D camera, use [`is_hovered_ctx`](Clickable::is_hovered_ctx).
    fn is_hovered(&self) -> bool {
        if !self.is_active() {
            return false;
        }
        let (mx, my) = mouse_position();
        self.click_rect().contains(vec2(mx, my))
    }

    /// Returns `true` if the mouse cursor is over the entity (**world space** using camera matrix transformation).
    fn is_hovered_ctx(&self, ctx: &Context) -> bool {
        if !self.is_active() {
            return false;
        }
        let m_world = ctx.camera.screen_to_world(ctx.input.mouse_position());
        self.click_rect().contains(m_world)
    }

    /// Returns `true` if the mouse cursor is over the UI entity (**UI canvas space**, accounting for virtual resolution mouse remapping).
    fn is_hovered_ui(&self, ctx: &Context) -> bool {
        if !self.is_active() {
            return false;
        }
        self.click_rect().contains(ctx.input.mouse_position())
    }

    /// Returns `true` during the single frame the specified mouse button was pressed over the entity (**screen space**).
    ///
    /// ⚠️ For world-space entities rendered with a 2D camera, use [`click_ctx`](Clickable::click_ctx).
    fn click(&self, btn: Side) -> bool {
        self.is_hovered() && is_mouse_button_pressed(btn.to_macroquad())
    }

    /// Returns `true` during the single frame the specified mouse button was pressed over the entity (**world space** using camera matrix transformation).
    fn click_ctx(&self, ctx: &Context, btn: Side) -> bool {
        self.is_hovered_ctx(ctx) && ctx.input.is_mouse_button_pressed(btn.to_macroquad())
    }

    /// Returns `true` while the specified mouse button is held down over the entity (**screen space**).
    ///
    /// ⚠️ For world-space entities rendered with a 2D camera, use [`click_ctx`](Clickable::click_ctx) for pressed detection.
    fn clicked(&self, btn: Side) -> bool {
        self.is_hovered()
            && (is_mouse_button_down(btn.to_macroquad())
                || is_mouse_button_pressed(btn.to_macroquad()))
    }

    /// Returns `true` while the specified mouse button is held down over the entity (**world space** using camera matrix transformation).
    /// Returns `true` during the single frame the left mouse button was pressed over the entity.
    fn is_clicked(&self) -> bool {
        self.click(Side::Left)
    }

    /// Returns `true` during the single frame the left mouse button was pressed over the entity (using context input).
    fn is_clicked_ctx(&self, ctx: &Context) -> bool {
        self.click_ctx(ctx, Side::Left)
    }
}

// ---------------------------------------------------------------------------
// Sprite
// ---------------------------------------------------------------------------

/// 2D Textured sprite component supporting position, size, rotation, color tinting, and tag filtering.
pub struct Sprite {
    pub position: Vec2,
    pub size: Vec2,
    pub rotation: f32,
    pub color: Color,
    pub texture: Texture2D,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Sprite {
    /// Creates a new [`Sprite`] with default white tint.
    pub fn new(position: Vec2, size: Vec2, rotation: f32, texture: Texture2D) -> Self {
        Self {
            position,
            size,
            rotation,
            color: WHITE,
            texture,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Creates a solid colored 2D rectangle sprite without requiring a texture file.
    pub fn solid(position: Vec2, size: Vec2, color: Color) -> Self {
        let texture = Texture2D::from_rgba8(1, 1, &[255, 255, 255, 255]);
        Self::new(position, size, 0.0, texture).with_color(color)
    }

    /// Builder pattern: Sets the color tint of the sprite.
    pub fn with_color(mut self, color: Color) -> Self {
        self.color = color;
        self
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Sets the sprite to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets the sprite to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets the sprite to deactivated (`active = false`) (alias for [`deactivated`](Sprite::deactivated)).
    #[deprecated(since = "0.1.0", note = "Use deactivated instead")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Builder pattern: Sets sprite visibility.
    pub fn with_visible(mut self, visible: bool) -> Self {
        self.visible = visible;
        self
    }

    /// Builder pattern: Sets sprite active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Returns `true` if the sprite is visible.
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Returns `true` if the sprite is active.
    pub fn is_active(&self) -> bool {
        self.active
    }

    /// Updates the sprite texture.
    pub fn set_texture(&mut self, texture: Texture2D) {
        self.texture = texture;
    }

    /// Updates the sprite texture directly from the asset manager by asset key.
    /// Returns `true` if the asset was found and updated successfully.
    pub fn set_texture_by_name(&mut self, ctx: &Context, name: &str) -> bool {
        if let Some(tex) = ctx.assets.get_texture(name) {
            self.texture = tex.clone();
            true
        } else {
            false
        }
    }

    /// Returns the bounding rectangle of the sprite.
    pub fn rect(&self) -> Rect {
        Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        }
    }

    /// Returns `true` if this sprite's bounding box overlaps with another sprite's bounding box.
    pub fn collides(&self, obj: &Sprite) -> bool {
        self.rect().overlaps(&obj.rect())
    }

    /// Returns the position vector.
    pub fn pos(&self) -> Vec2 {
        self.position
    }

    /// Sets the position vector.
    pub fn set_position(&mut self, pos: Vec2) {
        self.position = pos;
    }

    /// Sets the position vector.
    #[deprecated(since = "0.5.0", note = "Use `set_position()` instead")]
    pub fn setpos(&mut self, pos: Vec2) {
        self.position = pos;
    }
}

impl Clickable for Sprite {
    fn click_rect(&self) -> Rect {
        self.rect()
    }
    fn is_active(&self) -> bool {
        self.active
    }
}

impl Object for Sprite {
    fn update(&mut self, _ctx: &mut Context) {}

    fn draw(&self) {
        if !self.visible {
            return;
        }
        let pos = self.position + crate::ui::get_draw_offset();
        draw_texture_ex(
            &self.texture,
            pos.x,
            pos.y,
            self.color,
            DrawTextureParams {
                dest_size: Some(self.size),
                rotation: self.rotation,
                ..Default::default()
            },
        );
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn bounds(&self) -> Option<macroquad::math::Rect> {
        Some(self.rect())
    }
}

// ---------------------------------------------------------------------------
// Rectangle
// ---------------------------------------------------------------------------

/// 2D Colored rectangle entity.
pub struct Rectangle {
    pub position: Vec2,
    pub size: Vec2,
    pub rotation: f32,
    pub color: Color,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Rectangle {
    /// Creates a new [`Rectangle`].
    pub fn new(position: Vec2, size: Vec2, rotation: f32, color: Color) -> Self {
        Self {
            position,
            size,
            rotation,
            color,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Sets rectangle to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets rectangle to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets rectangle to deactivated (`active = false`) (alias for [`deactivated`](Rectangle::deactivated)).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead (typo fix)")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Builder pattern: Sets rectangle visibility.
    pub fn with_visible(mut self, visible: bool) -> Self {
        self.visible = visible;
        self
    }

    /// Builder pattern: Sets rectangle active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Returns `true` if the rectangle is visible.
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Returns `true` if the rectangle is active.
    pub fn is_active(&self) -> bool {
        self.active
    }
}

impl Object for Rectangle {
    fn update(&mut self, _ctx: &mut Context) {}

    fn draw(&self) {
        if !self.visible {
            return;
        }
        let pos = self.position + crate::ui::get_draw_offset();
        draw_rectangle(pos.x, pos.y, self.size.x, self.size.y, self.color);
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn bounds(&self) -> Option<macroquad::math::Rect> {
        Some(macroquad::math::Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        })
    }
}

// ---------------------------------------------------------------------------
// Behavior<Inner, Data> — Generic component wrapper with custom update closure
// ---------------------------------------------------------------------------

/// Generic wrapper combining an inner graphic object (`Inner`), custom state data (`Data`),
/// and an optional per-frame update callback closure.
///
/// Works with any type `Inner` implementing [`Object`].
///
/// # Field Access via Deref
/// `Behavior<Sprite, Data>` implements `Deref<Target = Sprite>` and `DerefMut`,
/// enabling direct field access on `Sprite`:
///
/// ```ignore
/// obj.position.x += 1.0;
/// obj.color = RED;
/// obj.click_ctx(ctx, Side::Left);
/// ```
/// Type alias for per-frame update closure stored inside a [`Behavior`].
pub type BehaviorUpdateFn<Inner, Data> = Box<dyn FnMut(&mut Behavior<Inner, Data>, &mut Context)>;

pub struct Behavior<Inner, Data> {
    pub inner: Inner,
    pub data: Data,
    pub tag: String,
    func: Option<BehaviorUpdateFn<Inner, Data>>,
}

impl<Inner, Data> Behavior<Inner, Data> {
    /// Creates a new [`Behavior`] wrapping `inner` graphic entity and custom `data`.
    pub fn new(inner: Inner, data: Data) -> Self {
        Self {
            inner,
            data,
            tag: String::new(),
            func: None,
        }
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Registers a closure to be executed on each frame update pass.
    pub fn update<F>(mut self, func: F) -> Self
    where
        F: FnMut(&mut Behavior<Inner, Data>, &mut Context) + 'static,
    {
        self.func = Some(Box::new(func));
        self
    }

    /// Internal: Runs the update callback closure for this frame.
    pub fn run_update(&mut self, ctx: &mut Context) {
        if let Some(mut func) = self.func.take() {
            func(self, ctx);
            self.func = Some(func);
        }
    }

    /// Returns a reference to the inner entity object.
    pub fn inner(&self) -> &Inner {
        &self.inner
    }

    /// Returns a mutable reference to the inner entity object.
    pub fn inner_mut(&mut self) -> &mut Inner {
        &mut self.inner
    }

    /// Builder pattern: Sets the inner entity to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self
    where
        Inner: Object,
    {
        self.inner.set_visible(false);
        self
    }

    /// Builder pattern: Sets the inner entity to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self
    where
        Inner: Object,
    {
        self.inner.set_active(false);
        self
    }

    /// Builder pattern: Sets the inner entity to deactivated (`active = false`) (alias for [`deactivated`](Behavior::deactivated)).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead (typo fix)")]
    pub fn desactivated(self) -> Self
    where
        Inner: Object,
    {
        self.deactivated()
    }

    /// Builder pattern: Sets visibility of the inner entity.
    pub fn with_visible(mut self, visible: bool) -> Self
    where
        Inner: Object,
    {
        self.inner.set_visible(visible);
        self
    }

    /// Builder pattern: Sets active state of the inner entity.
    pub fn with_active(mut self, active: bool) -> Self
    where
        Inner: Object,
    {
        self.inner.set_active(active);
        self
    }

    /// Returns `true` if the inner entity is visible.
    pub fn is_visible(&self) -> bool
    where
        Inner: Object,
    {
        self.inner.is_visible()
    }

    /// Returns `true` if the inner entity is active.
    pub fn is_active(&self) -> bool
    where
        Inner: Object,
    {
        self.inner.is_active()
    }

    /// Returns `true` if the mouse cursor is over the inner entity in world space.
    ///
    /// Shorthand for `self.inner.is_hovered_ctx(ctx)`.
    pub fn is_hovered(&self, ctx: &Context) -> bool
    where
        Inner: Clickable,
    {
        self.inner.is_hovered_ctx(ctx)
    }

    /// Returns `true` during the frame the mouse button was pressed over the inner entity in world space.
    ///
    /// Shorthand for `self.inner.click_ctx(ctx, btn)`.
    pub fn click(&self, ctx: &Context, btn: Side) -> bool
    where
        Inner: Clickable,
    {
        self.inner.click_ctx(ctx, btn)
    }

    /// Returns `true` while the mouse button is held down over the inner entity in world space.
    ///
    /// Shorthand for `self.inner.click_ctx(ctx, btn)`.
    pub fn clicked(&self, ctx: &Context, btn: Side) -> bool
    where
        Inner: Clickable,
    {
        self.inner.click_ctx(ctx, btn)
    }
}

// ---------------------------------------------------------------------------
// GameObject<Data> = Behavior<Sprite, Data>
// LogicObject<Data> = Behavior<Rectangle, Data>
// ---------------------------------------------------------------------------

/// Type alias for a sprite object combined with game data and per-frame update closure.
pub type GameObject<Data> = Behavior<Sprite, Data>;

/// Type alias for an invisible logic-only behavior object designed for system updates and `ctx` access.
pub type LogicObject<Data> = Behavior<Rectangle, Data>;

impl<Data> Behavior<Rectangle, Data> {
    /// Creates an invisible logic-only [`Behavior`] object for system controllers with full `ctx` access.
    pub fn logic(data: Data) -> Self {
        let mut rect = Rectangle::new(Vec2::ZERO, Vec2::ZERO, 0.0, Color::new(0.0, 0.0, 0.0, 0.0));
        rect.visible = false;
        Self::new(rect, data)
    }
}

impl<Inner: Object + 'static, Data: 'static> Object for Behavior<Inner, Data> {
    fn update(&mut self, ctx: &mut Context) {
        self.inner.update(ctx);
        self.run_update(ctx);
    }

    fn draw(&self) {
        self.inner.draw();
    }

    fn tag(&self) -> &str {
        if !self.tag.is_empty() {
            &self.tag
        } else {
            self.inner.tag()
        }
    }

    fn set_text(&mut self, text: &str) {
        self.inner.set_text(text);
    }

    fn append_line(&mut self, text: &str) {
        self.inner.append_line(text);
    }

    fn set_position(&mut self, pos: macroquad::math::Vec2) {
        self.inner.set_position(pos);
    }

    fn is_visible(&self) -> bool {
        self.inner.is_visible()
    }

    fn set_visible(&mut self, visible: bool) {
        self.inner.set_visible(visible);
    }

    fn is_active(&self) -> bool {
        self.inner.is_active()
    }

    fn set_active(&mut self, active: bool) {
        self.inner.set_active(active);
    }

    fn is_text_layer(&self) -> bool {
        self.inner.is_text_layer()
    }
}

impl<Data> std::ops::Deref for Behavior<Sprite, Data> {
    type Target = Sprite;
    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl<Data> std::ops::DerefMut for Behavior<Sprite, Data> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.inner
    }
}
```

---

# panel_manager.rs

```rust
//! Generic layered, interactive **desktop window manager** for RustedEngine.
//!
//! # Responsibilities
//!
//! [`PanelManager`] is the **sole** system for top-level, independently moveable/resizable
//! UI windows (e.g. OS desktop windows in Last Online). It manages:
//!
//! - **Z-order / focus** — click brings a window to the front.
//! - **Hit-testing** — which panel is under the cursor.
//! - **Optional drag** — per-panel opt-in via [`Panel::is_draggable()`].
//! - **Optional resize** — per-panel opt-in via [`Panel::is_resizable()`].
//!
//! # vs `ui::Panel`
//!
//! Do **not** confuse this with [`ui::Panel`](crate::ui::Panel), which is a *static*
//! grouping container for children *inside* a window. Use `ui::Panel` for the interior
//! layout of a window pane; use this module's [`PanelManager`] (added to `World` via `world.add_ui`) to manage
//! the windows themselves as first-class desktop objects.
//!
//! # Example
//! ```rust,ignore
//! let mut panel_manager = PanelManager::new();
//! panel_manager.add(MyWindow::new(), Rect::new(100.0, 80.0, 400.0, 300.0));
//! world.add_ui(Box::new(panel_manager));
//! ```

use macroquad::{
    input::{MouseButton, is_mouse_button_down, is_mouse_button_pressed, mouse_position},
    math::{Rect, Vec2},
};

use crate::{engine::Context, world::Object};

// ---------------------------------------------------------------------------
// Panel trait
// ---------------------------------------------------------------------------

/// Core trait for any UI panel managed by [`PanelManager`].
///
/// Implementors supply the game-specific update and draw logic.
/// The engine only calls these methods — it never inspects the data inside.
///
/// `Panel::update` intentionally does **not** take `&mut Context` — this avoids
/// borrow conflicts when the panel manager itself lives on `Context`.
/// If a panel needs engine context (input, resources, etc.), the game should
/// pass that data into the panel's own fields before calling `update`.
pub trait Panel {
    /// Called once per frame before drawing. `dt` is the frame delta time in seconds.
    fn update(&mut self, dt: f32);

    /// Called once per frame to render the panel inside `rect`.
    fn draw(&self, rect: Rect);

    /// Called when the panel is removed from the manager.
    fn on_close(&mut self) {}

    /// Returns `true` if the player may drag this panel with the mouse.
    /// Defaults to `false`.
    fn is_draggable(&self) -> bool {
        false
    }

    /// Returns `true` if the player may resize this panel by dragging its edge.
    /// Defaults to `false`.
    fn is_resizable(&self) -> bool {
        false
    }
}

// ---------------------------------------------------------------------------
// PanelId
// ---------------------------------------------------------------------------

/// Unique identifier for a panel registered with [`PanelManager`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct PanelId(u64);

// ---------------------------------------------------------------------------
// PanelEntry (internal)
// ---------------------------------------------------------------------------

struct PanelEntry {
    id: PanelId,
    panel: Box<dyn Panel>,
    rect: Rect,
    /// Current z-layer (higher = rendered on top). Updated on focus.
    z: u32,
    /// Whether the panel is visible.
    visible: bool,
    /// Whether a drag is currently in progress.
    dragging: bool,
    /// Mouse offset relative to panel origin when drag started.
    drag_offset: Vec2,
    /// Whether a resize is currently in progress.
    resizing: bool,
    /// Mouse position when resize started.
    resize_start: Vec2,
    /// Panel size when resize started.
    resize_start_size: Vec2,
}

impl PanelEntry {
    fn new(id: PanelId, panel: Box<dyn Panel>, rect: Rect, z: u32) -> Self {
        Self {
            id,
            panel,
            rect,
            z,
            visible: true,
            dragging: false,
            drag_offset: Vec2::ZERO,
            resizing: false,
            resize_start: Vec2::ZERO,
            resize_start_size: Vec2::ZERO,
        }
    }

    /// Returns `true` if `point` is inside this panel's rect.
    fn hit_test(&self, point: Vec2) -> bool {
        self.visible && self.rect.contains(point)
    }

    /// Returns `true` if `point` is in the resize handle (bottom-right corner, 12×12 px).
    fn resize_handle_hit(&self, point: Vec2) -> bool {
        self.panel.is_resizable()
            && self.visible
            && point.x >= self.rect.x + self.rect.w - 12.0
            && point.y >= self.rect.y + self.rect.h - 12.0
            && self.rect.contains(point)
    }
}

// ---------------------------------------------------------------------------
// PanelManager
// ---------------------------------------------------------------------------

/// Manages a collection of generic [`Panel`]s with z-ordering, focus, drag, and resize.
/// Implements [`Object`] so it can be added to [`World::add_ui`](crate::world::World::add_ui).
///
/// # Usage pattern
/// ```rust,ignore
/// let mut panel_manager = PanelManager::new();
/// panel_manager.add(MyWindow::new(), rect);
/// world.add_ui(Box::new(panel_manager));
/// ```
pub struct PanelManager {
    panels: Vec<PanelEntry>,
    next_id: u64,
    next_z: u32,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Default for PanelManager {
    fn default() -> Self {
        Self {
            panels: Vec::new(),
            next_id: 0,
            next_z: 0,
            tag: "PanelManager".to_string(),
            visible: true,
            active: true,
        }
    }
}

impl PanelManager {
    /// Creates a new empty [`PanelManager`].
    pub fn new() -> Self {
        Self::default()
    }

    // -----------------------------------------------------------------------
    // Panel lifecycle
    // -----------------------------------------------------------------------

    /// Adds a panel with the given rect and returns its [`PanelId`].
    pub fn add(&mut self, panel: impl Panel + 'static, rect: Rect) -> PanelId {
        let id = PanelId(self.next_id);
        self.next_id += 1;
        self.next_z += 1;
        self.panels
            .push(PanelEntry::new(id, Box::new(panel), rect, self.next_z));
        id
    }

    /// Removes the panel with the given id, calling [`Panel::on_close`] first.
    /// Returns `true` if a panel was found and removed.
    pub fn remove(&mut self, id: PanelId) -> bool {
        if let Some(pos) = self.panels.iter().position(|e| e.id == id) {
            self.panels[pos].panel.on_close();
            self.panels.remove(pos);
            return true;
        }
        false
    }

    /// Shows or hides a panel without removing it.
    pub fn set_visible(&mut self, id: PanelId, visible: bool) {
        if let Some(e) = self.panels.iter_mut().find(|e| e.id == id) {
            e.visible = visible;
        }
    }

    /// Returns the current rect for a panel (its position and size).
    pub fn get_rect(&self, id: PanelId) -> Option<Rect> {
        self.panels.iter().find(|e| e.id == id).map(|e| e.rect)
    }

    /// Programmatically moves/resizes a panel.
    pub fn set_rect(&mut self, id: PanelId, rect: Rect) {
        if let Some(e) = self.panels.iter_mut().find(|e| e.id == id) {
            e.rect = rect;
        }
    }

    // -----------------------------------------------------------------------
    // Per-frame update (input, drag, resize, focus, panel logic)
    // -----------------------------------------------------------------------

    /// Processes input (drag/resize/focus) and calls `Panel::update` on all visible panels.
    /// Called automatically when `PanelManager` is added as an [`Object`](crate::world::Object) to `World`.
    pub fn update(&mut self, dt: f32) {
        let mouse = Vec2::from(mouse_position());
        let lmb_pressed = is_mouse_button_pressed(MouseButton::Left);
        let lmb_down = is_mouse_button_down(MouseButton::Left);

        // Sort entries by z descending so topmost panel gets first priority
        self.panels.sort_by_key(|b| std::cmp::Reverse(b.z));

        // --- Focus / drag / resize initiation ---
        if lmb_pressed {
            // Find topmost panel that the click landed on
            let clicked_idx = self.panels.iter().position(|e| e.hit_test(mouse));

            if let Some(idx) = clicked_idx {
                // Bring to front
                let new_z = self.next_z + 1;
                self.next_z = new_z;
                self.panels[idx].z = new_z;

                let entry = &mut self.panels[idx];

                if entry.resize_handle_hit(mouse) {
                    entry.resizing = true;
                    entry.resize_start = mouse;
                    entry.resize_start_size = Vec2::new(entry.rect.w, entry.rect.h);
                } else if entry.panel.is_draggable() {
                    entry.dragging = true;
                    entry.drag_offset = mouse - Vec2::new(entry.rect.x, entry.rect.y);
                }
            }
        }

        // --- Drag / resize continuation ---
        if lmb_down {
            for entry in &mut self.panels {
                if entry.dragging {
                    let new_pos = mouse - entry.drag_offset;
                    entry.rect.x = new_pos.x;
                    entry.rect.y = new_pos.y;
                }
                if entry.resizing {
                    let delta = mouse - entry.resize_start;
                    entry.rect.w = (entry.resize_start_size.x + delta.x).max(60.0);
                    entry.rect.h = (entry.resize_start_size.y + delta.y).max(40.0);
                }
            }
        } else {
            // Mouse released — end drag/resize
            for entry in &mut self.panels {
                entry.dragging = false;
                entry.resizing = false;
            }
        }

        // --- Per-panel update (game logic) ---
        for entry in &mut self.panels {
            if entry.visible {
                entry.panel.update(dt);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Per-frame draw (sorted by z ascending = back to front)
    // -----------------------------------------------------------------------

    /// Draws all visible panels, back to front (lower z first).
    pub fn draw(&self) {
        let mut sorted: Vec<&PanelEntry> = self.panels.iter().filter(|e| e.visible).collect();
        sorted.sort_by_key(|e| e.z);
        for entry in sorted {
            entry.panel.draw(entry.rect);
        }
    }

    // -----------------------------------------------------------------------
    // Hit-testing (for external use, e.g. game code)
    // -----------------------------------------------------------------------

    /// Returns the id of the topmost visible panel under `point`, or `None`.
    pub fn panel_at(&self, point: Vec2) -> Option<PanelId> {
        let mut best: Option<(u32, PanelId)> = None;
        for entry in &self.panels {
            if entry.hit_test(point) && best.is_none_or(|(z, _)| entry.z > z) {
                best = Some((entry.z, entry.id));
            }
        }
        best.map(|(_, id)| id)
    }

    /// Returns the number of registered panels.
    pub fn len(&self) -> usize {
        self.panels.len()
    }

    /// Returns `true` if no panels are registered.
    pub fn is_empty(&self) -> bool {
        self.panels.is_empty()
    }

    /// Builder pattern: Sets the tag for this PanelManager.
    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
        self
    }
}

impl Object for PanelManager {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
        }
        let dt = ctx.time.deltatime();
        self.update(dt);
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        self.draw();
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn as_any(&self) -> Option<&dyn std::any::Any> {
        Some(self)
    }

    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        Some(self)
    }
}
```

---

# particles.rs

```rust
use macroquad::{
    color::Color,
    math::{Vec2, vec2},
    rand::gen_range,
    shapes::draw_circle,
};

use crate::{engine::Context, world::Object};

/// Individual particle data struct.
#[derive(Clone)]
pub struct Particle {
    pub position: Vec2,
    pub velocity: Vec2,
    pub color: Color,
    pub size: f32,
    pub lifetime: f32,
    pub max_lifetime: f32,
}

/// 2D Particle emitter system managing particle spawning, physics integration, and rendering.
pub struct ParticleEmitter {
    particles: Vec<Particle>,
    /// Global gravity vector applied to particles.
    pub gravity: Vec2,
}

impl ParticleEmitter {
    /// Creates a new empty [`ParticleEmitter`].
    pub fn new() -> Self {
        Self {
            particles: Vec::new(),
            gravity: vec2(0.0, 0.0),
        }
    }

    /// Builder pattern: Sets gravity for emitted particles.
    pub fn with_gravity(mut self, gravity: Vec2) -> Self {
        self.gravity = gravity;
        self
    }

    /// Emits a radial burst of particles at `pos`.
    pub fn emit_burst(
        &mut self,
        pos: Vec2,
        count: usize,
        color: Color,
        speed_range: (f32, f32),
        size: f32,
        lifetime: f32,
    ) {
        for _ in 0..count {
            let angle = gen_range(0.0, std::f32::consts::TAU);
            let speed = gen_range(speed_range.0, speed_range.1);
            let velocity = vec2(angle.cos() * speed, angle.sin() * speed);

            self.particles.push(Particle {
                position: pos,
                velocity,
                color,
                size,
                lifetime,
                max_lifetime: lifetime,
            });
        }
    }

    /// Returns the number of currently active particles.
    pub fn active_particles_count(&self) -> usize {
        self.particles.len()
    }
}

impl Object for ParticleEmitter {
    fn update(&mut self, ctx: &mut Context) {
        let dt = ctx.time.deltatime();

        for p in self.particles.iter_mut() {
            p.velocity += self.gravity * dt;
            p.position += p.velocity * dt;
            p.lifetime -= dt;
        }

        self.particles.retain(|p| p.lifetime > 0.0);
    }

    fn draw(&self) {
        for p in self.particles.iter() {
            let ratio = (p.lifetime / p.max_lifetime).clamp(0.0, 1.0);
            let current_size = p.size * ratio;

            let mut c = p.color;
            c.a *= ratio; // Fade out alpha

            draw_circle(p.position.x, p.position.y, current_size, c);
        }
    }
}

impl Default for ParticleEmitter {
    fn default() -> Self {
        Self::new()
    }
}
```

---

# postprocess.rs

```rust
use macroquad::{
    camera::{Camera2D, set_camera, set_default_camera},
    color::WHITE,
    math::vec2,
    miniquad::ShaderSource,
    texture::{DrawTextureParams, FilterMode, RenderTarget, draw_texture_ex, render_target},
    window::{screen_height, screen_width},
};
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// PostProcess — Fullscreen shader post-processing pipeline
// ---------------------------------------------------------------------------

/// Post-processing pipeline manager storing a GLSL material shader and custom uniforms.
///
/// # Example
/// ```ignore
/// engine.post_process = Some(PostProcess::passthrough().unwrap());
/// ```
pub struct PostProcess {
    /// Material shader applied to the rendered scene target.
    pub material: macroquad::material::Material,
    /// Uniform parameters passed to the shader (e.g. `time`, `intensity`).
    pub uniforms: HashMap<String, f32>,
}

impl PostProcess {
    /// Creates a new [`PostProcess`] pipeline wrapper with the given [`Material`](macroquad::material::Material).
    pub fn new(material: macroquad::material::Material) -> Self {
        Self {
            material,
            uniforms: HashMap::new(),
        }
    }

    /// Sets an `f32` uniform variable on the post-processing shader.
    pub fn set_uniform(&mut self, name: &str, value: f32) {
        self.uniforms.insert(name.to_string(), value);
    }

    /// Creates a default passthrough GLSL shader pipeline that renders the scene as-is.
    /// Useful as a baseline or starting template for custom visual effects (CRT, Bloom, Vignette, etc.).
    pub fn passthrough() -> Result<Self, macroquad::Error> {
        let mat = macroquad::material::load_material(
            ShaderSource::Glsl {
                vertex: PASSTHROUGH_VERT,
                fragment: PASSTHROUGH_FRAG,
            },
            macroquad::material::MaterialParams {
                uniforms: vec![],
                textures: vec!["Texture".to_string()],
                ..Default::default()
            },
        )?;
        Ok(Self::new(mat))
    }
}

// Passthrough vertex shader (GLSL 330 core)
const PASSTHROUGH_VERT: &str = r#"
#version 330 core
in vec3 position;
in vec2 texcoord;
out vec2 uv;
uniform mat4 Model;
uniform mat4 Projection;
void main() {
    gl_Position = Projection * Model * vec4(position, 1.0);
    uv = texcoord;
}
"#;

// Passthrough fragment shader (GLSL 330 core)
const PASSTHROUGH_FRAG: &str = r#"
#version 330 core
in vec2 uv;
out vec4 FragColor;
uniform sampler2D Texture;
void main() {
    FragColor = texture(Texture, uv);
}
"#;

// ---------------------------------------------------------------------------
// SceneRenderTarget — Render target texture helper
// ---------------------------------------------------------------------------

/// Manages off-screen GPU [`RenderTarget`] textures matching screen resolution.
pub struct SceneRenderTarget {
    /// Underlying Macroquad render target handle.
    pub target: RenderTarget,
    pub(crate) width: u32,
    pub(crate) height: u32,
}

impl SceneRenderTarget {
    /// Creates a new [`SceneRenderTarget`] with specified pixel dimensions.
    pub fn new(width: u32, height: u32) -> Self {
        let target = render_target(width, height);
        // Set nearest filtering to preserve pixel-art crispness
        target.texture.set_filter(FilterMode::Nearest);
        Self {
            target,
            width,
            height,
        }
    }

    /// Creates a [`SceneRenderTarget`] sized to match the current viewport dimensions.
    pub fn fullscreen() -> Self {
        let w = screen_width() as u32;
        let h = screen_height() as u32;
        Self::new(w, h)
    }

    /// Checks if the cached render target dimensions match current window dimensions.
    pub fn matches_screen_size(&self) -> bool {
        let w = screen_width() as u32;
        let h = screen_height() as u32;
        self.width == w && self.height == h
    }

    /// Activates the render target as the current drawing target.
    ///
    /// ⚠️ **Deprecated:** Use `ctx.camera.begin_to_target(&rt.target)` to retain camera settings (zoom, target, shake).
    #[deprecated(
        note = "Use ctx.camera.begin_to_target(&rt.target) to retain camera properties (zoom, target, shake)"
    )]
    pub fn begin(&self) {
        let cam = Camera2D {
            zoom: vec2(2.0 / self.width as f32, 2.0 / self.height as f32),
            target: vec2(self.width as f32 / 2.0, self.height as f32 / 2.0),
            render_target: Some(self.target.clone()),
            ..Default::default()
        };
        set_camera(&cam);
    }

    /// Concludes rendering to target and restores the default camera.
    ///
    /// ⚠️ **Deprecated:** Use `ctx.camera.end()` to restore the default camera state.
    #[deprecated(
        note = "Use ctx.camera.end() to restore camera state after begin_to_target()"
    )]
    pub fn end(&self) {
        set_default_camera();
    }

    /// Renders the target texture to the screen applying the [`PostProcess`] material shader.
    pub fn draw_with_postprocess(&self, pp: &mut PostProcess) {
        for (name, value) in &pp.uniforms {
            pp.material.set_uniform(name, *value);
        }
        macroquad::material::gl_use_material(&pp.material);
        draw_texture_ex(
            &self.target.texture,
            0.0,
            0.0,
            WHITE,
            DrawTextureParams {
                dest_size: Some(vec2(screen_width(), screen_height())),
                flip_y: true, // Macroquad render targets are vertically flipped
                ..Default::default()
            },
        );
        macroquad::material::gl_use_default_material();
    }

    /// Renders the target texture directly to the screen without applying custom shaders.
    pub fn draw_raw(&self) {
        draw_texture_ex(
            &self.target.texture,
            0.0,
            0.0,
            WHITE,
            DrawTextureParams {
                dest_size: Some(vec2(screen_width(), screen_height())),
                flip_y: true,
                ..Default::default()
            },
        );
    }
}
```

---

# prelude.rs

```rust
//! Prelude re-exporting common structs, traits, enums, and macros for easy importing via `use RustyEngine::prelude::*;`.

pub use crate::{
    column, row, ui_vec,
    actions::ActionMap,
    animated_texture::AnimatedSprite,
    asset_manager::Assets,
    audio::{AmbientPool, Audio},
    bitmap_font::{BitmapFont, GlyphInfo, register_font_id},
    camera::Camera,
    content::{ContentError, load_content, load_content_dir},
    draggable::{DragState, Draggable},
    engine::{Context, CustomCursor, Engine},
    events::EventBus,
    input::Input,
    object::{Behavior, Clickable, GameObject, LogicObject, Rectangle, Side, Sprite},
    panel_manager::{Panel, PanelId, PanelManager},
    particles::{Particle, ParticleEmitter},
    postprocess::{PostProcess, SceneRenderTarget},
    resources::Resources,
    save_system::{SaveError, SaveSlotMeta, SaveSystem},
    scene::{Scene, SceneManager},
    sequence::{Sequence, Step},
    state::{StateStore, StateValue},
    tilemap::Tilemap,
    time::{Time, Timer},
    trigger::{Trigger, TriggerSystem},
    ui::{
        Align, Button, Checkbox, Column, Container, CrossAxisAlignment, Gap, Grid, HBox, Image, ImageObject,
        IntoUIObject, LayoutAlign, LayoutJustify, MainAxisAlignment, Margin, Padding, Panel as UiPanel,
        ProgressBar, RevealMode, RichText, RichTextObject, Row, ScrollMode, Slider, Text, TextAlign, TextAlignment, TextField,
        TextFieldObject, TextLog, TextLogObject, TextObject, UIAnchor, VBox,
        UI, draw_nine_slice, margin, padding, parse_color, parse_rich_text, rich_text, Tooltip,
    },
    window::Window,
    world,
    world::{Object, World},
    world_objects,
};
```

---

# resources.rs

```rust
//! Generic type-keyed resource container for arbitrary per-context data storage.
//!
//! Stores any number of distinct types (`T: 'static`) indexed by [`TypeId`].
//! Engine-agnostic — zero knowledge of specific game types.

use std::any::{Any, TypeId};
use std::collections::HashMap;

/// Generic type-keyed resource store.
///
/// Stores one value per type. Types are disambiguated by [`TypeId`],
/// so any `T: 'static` can be inserted, retrieved, or removed independently.
///
/// # Example
/// ```rust,ignore
/// let mut resources = Resources::new();
/// resources.insert(42_i32);
/// resources.insert("hello world");
///
/// assert_eq!(resources.get::<i32>(), Some(&42));
/// assert_eq!(resources.get::<&str>(), Some(&"hello world"));
/// ```
#[derive(Default)]
pub struct Resources {
    map: HashMap<TypeId, Box<dyn Any>>,
}

impl Resources {
    /// Creates a new empty [`Resources`] store.
    pub fn new() -> Self {
        Self {
            map: HashMap::new(),
        }
    }

    /// Inserts a value of type `T`, replacing any previously stored value of the same type.
    pub fn insert<T: Any>(&mut self, value: T) {
        self.map.insert(TypeId::of::<T>(), Box::new(value));
    }

    /// Returns a shared reference to the stored value of type `T`, or `None` if not present.
    pub fn get<T: Any>(&self) -> Option<&T> {
        self.map
            .get(&TypeId::of::<T>())
            .and_then(|boxed| boxed.downcast_ref::<T>())
    }

    /// Returns a mutable reference to the stored value of type `T`, or `None` if not present.
    pub fn get_mut<T: Any>(&mut self) -> Option<&mut T> {
        self.map
            .get_mut(&TypeId::of::<T>())
            .and_then(|boxed| boxed.downcast_mut::<T>())
    }

    /// Removes and returns the stored value of type `T`, or `None` if not present.
    pub fn remove<T: Any>(&mut self) -> Option<T> {
        self.map
            .remove(&TypeId::of::<T>())
            .and_then(|boxed| boxed.downcast::<T>().ok())
            .map(|boxed| *boxed)
    }

    /// Returns `true` if a value of type `T` is currently stored.
    pub fn contains<T: Any>(&self) -> bool {
        self.map.contains_key(&TypeId::of::<T>())
    }
}

#[cfg(test)]
mod tests {
    use super::Resources;

    #[test]
    fn insert_and_get() {
        let mut r = Resources::new();
        r.insert(42_i32);
        assert_eq!(r.get::<i32>(), Some(&42));
    }

    #[test]
    fn get_returns_none_for_missing_type() {
        let r = Resources::new();
        assert_eq!(r.get::<f32>(), None);
    }

    #[test]
    fn insert_overwrites_previous_value() {
        let mut r = Resources::new();
        r.insert(1_u32);
        r.insert(99_u32);
        assert_eq!(r.get::<u32>(), Some(&99));
    }

    #[test]
    fn get_mut_allows_mutation() {
        let mut r = Resources::new();
        r.insert(0_i32);
        *r.get_mut::<i32>().unwrap() += 5;
        assert_eq!(r.get::<i32>(), Some(&5));
    }

    #[test]
    fn remove_returns_value_and_clears() {
        let mut r = Resources::new();
        r.insert(7_i32);
        assert_eq!(r.remove::<i32>(), Some(7));
        assert!(!r.contains::<i32>());
    }

    #[test]
    fn contains_reflects_presence() {
        let mut r = Resources::new();
        assert!(!r.contains::<u8>());
        r.insert(0_u8);
        assert!(r.contains::<u8>());
    }

    #[test]
    fn distinct_types_are_independent() {
        let mut r = Resources::new();
        r.insert(42_i32);
        r.insert(123.456_f64);
        assert_eq!(r.get::<i32>(), Some(&42));
        assert_eq!(r.get::<f64>(), Some(&123.456));
    }
}
```

---

# save_system.rs

```rust
//! Secure slot-based save game system with CRC32 anti-tamper checksum validation.
//!
//! # Example
//! ```ignore
//! // Save slot 1
//! ctx.save_system.save_slot(1, "Level 2 - Forest", &ctx.state)?;
//!
//! // Load slot 1
//! let loaded_state = ctx.save_system.load_slot(1)?;
//! ```
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use crate::state::StateStore;

/// Errors produced during save file operations or checksum validation.
#[derive(Debug)]
pub enum SaveError {
    IoError(std::io::Error),
    JsonError(serde_json::Error),
    /// File checksum does not match computed state checksum (tampering or corruption).
    ChecksumMismatch { expected: u32, found: u32 },
    /// Save slot file does not exist.
    SlotNotFound(u32),
}

impl From<std::io::Error> for SaveError {
    fn from(err: std::io::Error) -> Self {
        SaveError::IoError(err)
    }
}

impl From<serde_json::Error> for SaveError {
    fn from(err: serde_json::Error) -> Self {
        SaveError::JsonError(err)
    }
}

/// Metadata stored alongside save slot state data.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SaveSlotMeta {
    pub slot_id: u32,
    pub label: String,
    pub timestamp_epoch_secs: u64,
    pub checksum: u32,
}

/// Full wrapper payload saved to disk.
#[derive(Clone, Debug, Serialize, Deserialize)]
struct SavePayload {
    meta: SaveSlotMeta,
    state: StateStore,
}

/// Computes a lightweight CRC32 checksum over bytes.
pub fn compute_crc32(bytes: &[u8]) -> u32 {
    let mut crc: u32 = 0xFFFF_FFFF;
    for &byte in bytes {
        crc ^= u32::from(byte);
        for _ in 0..8 {
            let mask = (crc & 1).wrapping_neg();
            crc = (crc >> 1) ^ (0xED88_8320 & mask);
        }
    }
    !crc
}

/// Computes a deterministic CRC32 checksum over `StateStore` contents.
pub fn compute_state_checksum(state: &StateStore) -> u32 {
    let mut keys: Vec<&String> = state.values().keys().collect();
    keys.sort();
    let mut bytes = Vec::new();
    for k in keys {
        bytes.extend_from_slice(k.as_bytes());
        if let Some(val) = state.values().get(k) {
            let val_str = format!("{:?}", val);
            bytes.extend_from_slice(val_str.as_bytes());
        }
    }
    compute_crc32(&bytes)
}

/// Slot-based save game manager.
pub struct SaveSystem {
    save_dir: PathBuf,
}

impl SaveSystem {
    /// Creates a new [`SaveSystem`] targeting the specified save directory.
    pub fn new(save_dir: impl AsRef<Path>) -> Self {
        Self {
            save_dir: save_dir.as_ref().to_path_buf(),
        }
    }

    /// Creates a [`SaveSystem`] targeting default directory `"saves"`.
    pub fn default_dir() -> Self {
        Self::new("saves")
    }

    fn slot_path(&self, slot_id: u32) -> PathBuf {
        self.save_dir.join(format!("save_slot_{}.json", slot_id))
    }

    /// Saves `state` to `slot_id` with `label` and a computed CRC32 checksum.
    pub fn save_slot(
        &self,
        slot_id: u32,
        label: impl Into<String>,
        state: &StateStore,
    ) -> Result<SaveSlotMeta, SaveError> {
        if !self.save_dir.exists() {
            fs::create_dir_all(&self.save_dir)?;
        }

        let checksum = compute_state_checksum(state);

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let meta = SaveSlotMeta {
            slot_id,
            label: label.into(),
            timestamp_epoch_secs: now,
            checksum,
        };

        let payload = SavePayload {
            meta: meta.clone(),
            state: state.clone(),
        };

        let json = serde_json::to_string_pretty(&payload)?;
        fs::write(self.slot_path(slot_id), json)?;

        Ok(meta)
    }

    /// Loads and verifies `StateStore` from `slot_id`.
    /// Returns [`SaveError::ChecksumMismatch`] if the save file was tampered with or corrupted.
    pub fn load_slot(&self, slot_id: u32) -> Result<StateStore, SaveError> {
        let path = self.slot_path(slot_id);
        if !path.exists() {
            return Err(SaveError::SlotNotFound(slot_id));
        }

        let json = fs::read_to_string(path)?;
        let payload: SavePayload = serde_json::from_str(&json)?;

        let computed_checksum = compute_state_checksum(&payload.state);

        if computed_checksum != payload.meta.checksum {
            return Err(SaveError::ChecksumMismatch {
                expected: payload.meta.checksum,
                found: computed_checksum,
            });
        }

        Ok(payload.state)
    }

    /// Returns metadata for all valid existing save slots in `save_dir`.
    pub fn list_slots(&self) -> Vec<SaveSlotMeta> {
        let mut metas = Vec::new();
        if let Ok(entries) = fs::read_dir(&self.save_dir) {
            for entry in entries.flatten() {
                if let Ok(json) = fs::read_to_string(entry.path())
                    && let Ok(payload) = serde_json::from_str::<SavePayload>(&json)
                {
                    metas.push(payload.meta);
                }
            }
        }
        metas.sort_by_key(|m| m.slot_id);
        metas
    }

    /// Deletes a save slot file if it exists. Returns `true` if file was present.
    pub fn delete_slot(&self, slot_id: u32) -> bool {
        let path = self.slot_path(slot_id);
        if path.exists() {
            fs::remove_file(path).is_ok()
        } else {
            false
        }
    }
}

impl Default for SaveSystem {
    fn default() -> Self {
        Self::default_dir()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_save_system_crc32() {
        let temp_dir = std::env::temp_dir().join("rusty_engine_save_test");
        let save_sys = SaveSystem::new(&temp_dir);

        let mut store = StateStore::new();
        store.set_int("coins", 500);
        store.set_text("location", "Dungeon_01");

        let meta = save_sys.save_slot(1, "Test Save", &store).unwrap();
        assert_eq!(meta.slot_id, 1);
        assert_eq!(meta.label, "Test Save");

        let loaded_store = save_sys.load_slot(1).unwrap();
        assert_eq!(loaded_store.get_int("coins"), 500);
        assert_eq!(loaded_store.get_text("location"), "Dungeon_01");

        save_sys.delete_slot(1);
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
```

---

# scene.rs

```rust
use crate::world::{Object, World};

/// Discrete game scene containing a [`World`] layer instance.
pub struct Scene {
    name: String,
    world: World,
}

impl Scene {
    /// Creates a new [`Scene`] with the given name and [`World`].
    pub fn new(name: impl Into<String>, world: World) -> Self {
        Self {
            world,
            name: name.into(),
        }
    }

    /// Creates a new empty [`Scene`] with an unpopulated [`World`].
    pub fn new_empty(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            world: World::new(),
        }
    }

    /// Adds a new entity to the scene's world-space layer.
    pub fn add<O: Object + 'static>(&mut self, object: O) {
        self.world.add(object);
    }

    /// Adds a new UI entity to the scene's screen-space UI layer.
    pub fn add_ui<O: Object + 'static>(&mut self, object: O) {
        self.world.add_ui(object);
    }

    /// Adds a scripted [`Sequence`](crate::sequence::Sequence) to the scene.
    pub fn add_sequence(&mut self, sequence: crate::sequence::Sequence) {
        self.world.add_sequence(sequence);
    }

    /// Returns the scene identifier name.
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Returns a mutable reference to the scene's [`World`].
    pub fn get_world(&mut self) -> &mut World {
        &mut self.world
    }
}

/// Controller managing scene navigation and pending scene switches.
#[derive(Default)]
pub struct SceneManager {
    current_scene: usize,
    scenes: Vec<Scene>,
    pending_scene: Option<usize>,
}

impl SceneManager {
    /// Creates a new empty [`SceneManager`].
    pub fn new_empty() -> Self {
        Self::default()
    }

    /// Creates a new [`SceneManager`] initialized with a list of scenes.
    pub fn new(scenes: Vec<Scene>) -> Self {
        Self {
            current_scene: 0,
            scenes,
            pending_scene: None,
        }
    }

    /// Registers a new [`Scene`] with the manager.
    pub fn add(&mut self, scene: Scene) {
        self.scenes.push(scene);
    }

    /// Schedules a scene switch by numeric index.
    pub fn load_scene(&mut self, id: usize) {
        if id < self.scenes.len() {
            self.pending_scene = Some(id);
        }
    }

    /// Schedules a scene switch by scene name. Returns `true` if the scene was found.
    pub fn switch_to(&mut self, name: &str) -> bool {
        if let Some(pos) = self.scenes.iter().position(|s| s.name() == name) {
            self.pending_scene = Some(pos);
            true
        } else {
            false
        }
    }

    /// Alias for [`switch_to`](SceneManager::switch_to). Schedules scene switch by name.
    pub fn set_current(&mut self, name: &str) -> bool {
        self.switch_to(name)
    }

    /// Internal: Applies queued scene transitions at frame boundaries.
    pub fn update_pending(&mut self) {
        if let Some(next) = self
            .pending_scene
            .take()
            .filter(|&id| id < self.scenes.len())
        {
            self.current_scene = next;
        }
    }

    /// Returns the current active scene index.
    pub fn current_scene_index(&self) -> usize {
        self.current_scene
    }

    /// Returns a mutable reference to the active [`Scene`].
    pub fn get_current_scene(&mut self) -> &mut Scene {
        self.scenes
            .get_mut(self.current_scene)
            .expect("Invalid scene index")
    }

    /// Returns a slice of registered scenes.
    pub fn scenes(&self) -> &[Scene] {
        &self.scenes
    }
}

impl From<Scene> for SceneManager {
    fn from(scene: Scene) -> Self {
        Self::new(vec![scene])
    }
}

impl From<Vec<Scene>> for SceneManager {
    fn from(scenes: Vec<Scene>) -> Self {
        Self::new(scenes)
    }
}
```

---

# sequence.rs

```rust
use std::collections::HashMap;

use crate::{engine::Context, state::StateValue, world::World};

// ---------------------------------------------------------------------------
// Step — Scripted sequence step enum
// ---------------------------------------------------------------------------

/// Individual instruction step in a scripted narrative sequence or cutscene.
#[derive(Clone, Debug)]
pub enum Step {
    /// Sets text content on entities with matching `target_tag` via [`Object::set_text`](crate::world::Object::set_text).
    /// If the target text component has typewriter mode enabled, restarts the reveal animation.
    ShowText { target_tag: String, text: String },

    /// Toggles entity visibility by `target_tag` via [`Object::set_visible`](crate::world::Object::set_visible).
    SetVisible { target_tag: String, visible: bool },

    /// Awaits user input (Space, Enter, or Left Mouse Click) before advancing to the next step.
    WaitForInput,

    /// Sets a key-value flag entry inside [`Context::state`](crate::engine::Context::state).
    SetFlag { key: String, value: StateValue },

    /// Delays execution for the specified duration in seconds.
    Wait { seconds: f32 },

    /// Conditional branch based on a boolean key in [`Context::state`](crate::engine::Context::state).
    /// Jumps to index `if_true` when `true`, or `if_false` when `false`.
    Branch {
        condition: String,
        if_true: usize,
        if_false: usize,
    },

    /// No-op marker step defining a named jump target for `JumpTo`/`BranchTo`/`RepeatUntil`.
    Label(String),

    /// Unconditional jump to a named label (resolved once at Sequence construction).
    JumpTo(String),

    /// Conditional branch to named labels based on a boolean key in [`Context::state`](crate::engine::Context::state).
    BranchTo {
        condition: String,
        if_true: String,
        if_false: String,
    },

    /// Jumps back to `label` until visited `times` times total (tracked per `loop_id`),
    /// then falls through to the next step. Use for "retry N times" style narrative loops.
    RepeatUntil {
        loop_id: String,
        label: String,
        times: u32,
    },

    /// Plays a sound effect loaded in [`Context::assets`](crate::engine::Context::assets) by name.
    PlaySound { sound_name: String },

    /// Unconditionally jumps execution to the specified step index.
    Jump(usize),

    /// Appends a line to a [`TextLog`](crate::ui::TextLog) entity matching `target_tag`
    /// via [`Object::append_line`](crate::world::Object::append_line).
    /// Searches the UI layer first, then falls back to the world layer.
    AppendLine { target_tag: String, text: String },

    /// Concludes the sequence execution.
    End,
}

impl Step {
    /// Creates a [`Step::ShowText`] instruction.
    pub fn show_text(target_tag: impl Into<String>, text: impl Into<String>) -> Self {
        Step::ShowText {
            target_tag: target_tag.into(),
            text: text.into(),
        }
    }

    /// Creates a [`Step::SetVisible`] instruction.
    pub fn set_visible(target_tag: impl Into<String>, visible: bool) -> Self {
        Step::SetVisible {
            target_tag: target_tag.into(),
            visible,
        }
    }

    /// Creates a [`Step::WaitForInput`] instruction.
    pub fn wait_for_input() -> Self {
        Step::WaitForInput
    }

    /// Creates a [`Step::SetFlag`] instruction.
    pub fn set_flag(key: impl Into<String>, value: impl Into<StateValue>) -> Self {
        Step::SetFlag {
            key: key.into(),
            value: value.into(),
        }
    }

    /// Creates a [`Step::Wait`] instruction.
    pub fn wait(seconds: f32) -> Self {
        Step::Wait { seconds }
    }

    /// Creates a [`Step::Branch`] instruction.
    pub fn branch(condition: impl Into<String>, if_true: usize, if_false: usize) -> Self {
        Step::Branch {
            condition: condition.into(),
            if_true,
            if_false,
        }
    }

    /// Creates a [`Step::Label`] marker step.
    pub fn label(name: impl Into<String>) -> Self {
        Step::Label(name.into())
    }

    /// Creates a [`Step::JumpTo`] instruction targeting a named label.
    pub fn jump_to(label: impl Into<String>) -> Self {
        Step::JumpTo(label.into())
    }

    /// Creates a [`Step::BranchTo`] instruction targeting named labels.
    pub fn branch_to(
        condition: impl Into<String>,
        if_true: impl Into<String>,
        if_false: impl Into<String>,
    ) -> Self {
        Step::BranchTo {
            condition: condition.into(),
            if_true: if_true.into(),
            if_false: if_false.into(),
        }
    }

    /// Creates a [`Step::RepeatUntil`] loop instruction.
    pub fn repeat_until(loop_id: impl Into<String>, label: impl Into<String>, times: u32) -> Self {
        Step::RepeatUntil {
            loop_id: loop_id.into(),
            label: label.into(),
            times,
        }
    }

    /// Creates a [`Step::PlaySound`] instruction.
    pub fn play_sound(sound_name: impl Into<String>) -> Self {
        Step::PlaySound {
            sound_name: sound_name.into(),
        }
    }

    /// Creates a [`Step::Jump`] instruction targeting a numeric index.
    pub fn jump(target: usize) -> Self {
        Step::Jump(target)
    }

    /// Creates a [`Step::AppendLine`] instruction.
    pub fn append_line(target_tag: impl Into<String>, text: impl Into<String>) -> Self {
        Step::AppendLine {
            target_tag: target_tag.into(),
            text: text.into(),
        }
    }

    /// Creates a [`Step::End`] instruction.
    pub fn end() -> Self {
        Step::End
    }
}

// ---------------------------------------------------------------------------
// Sequence — Scripted step runner engine
// ---------------------------------------------------------------------------

/// Sequence runner for executing linear or branching cutscenes, tutorials, and dialogue flows.
///
/// # Example
/// ```ignore
/// let seq = Sequence::new(vec![
///     Step::show_text("dialog", "Welcome, Traveler!"),
///     Step::wait_for_input(),
///     Step::set_flag("met_npc", true),
///     Step::label("retry"),
///     Step::show_text("terminal", "Próba odszyfrowania..."),
///     Step::wait(0.8),
///     Step::repeat_until("decrypt_attempts", "retry", 5),
///     Step::end(),
/// ]);
/// ```
pub struct Sequence {
    steps: Vec<Step>,
    current: usize,
    wait_timer: f32,
    finished: bool,
    labels: HashMap<String, usize>,
    loop_counts: HashMap<String, u32>,
}

fn build_label_map(steps: &[Step]) -> HashMap<String, usize> {
    steps
        .iter()
        .enumerate()
        .filter_map(|(i, s)| match s {
            Step::Label(name) => Some((name.clone(), i)),
            _ => None,
        })
        .collect()
}

impl Sequence {
    /// Creates a new [`Sequence`] with the provided step list.
    pub fn new(steps: Vec<Step>) -> Self {
        let labels = build_label_map(&steps);
        Self {
            steps,
            current: 0,
            wait_timer: 0.0,
            finished: false,
            labels,
            loop_counts: HashMap::new(),
        }
    }

    /// Creates a new [`SequenceBuilder`] for constructing sequences with named labels and fluent methods.
    pub fn builder() -> SequenceBuilder {
        SequenceBuilder::new()
    }

    /// Returns `true` if the sequence has reached an [`Step::End`] instruction or exceeded step bounds.
    pub fn is_finished(&self) -> bool {
        self.finished
    }

    /// Resets the sequence execution pointer back to the first step and clears loop counters.
    pub fn reset(&mut self) {
        self.current = 0;
        self.wait_timer = 0.0;
        self.finished = false;
        self.loop_counts.clear();
    }

    /// Resolves a label to a step index. Returns `steps.len()` (natural end)
    /// if the label doesn't exist, logging a warning in debug builds.
    fn resolve_label(&self, name: &str) -> usize {
        match self.labels.get(name) {
            Some(&idx) => idx,
            None => {
                #[cfg(debug_assertions)]
                eprintln!("[Sequence] warning: unknown label '{name}', ending sequence");
                self.steps.len()
            }
        }
    }

    #[cfg(test)]
    pub(crate) fn loop_count(&self, loop_id: &str) -> u32 {
        self.loop_counts.get(loop_id).copied().unwrap_or(0)
    }

    /// Advances and executes the current step in the sequence. Call each frame update pass.
    pub fn update(&mut self, ctx: &mut Context, world: &mut World) {
        if self.finished {
            return;
        }
        if self.current >= self.steps.len() {
            self.finished = true;
            return;
        }

        let step = self.steps[self.current].clone();

        match step {
            Step::ShowText {
                ref target_tag,
                ref text,
            } => {
                let mut found = false;
                // Search UI layer entities by tag and call set_text
                for obj in world.find_ui_by_tag_mut(target_tag) {
                    obj.set_text(text);
                    found = true;
                }
                // Fallback to world layer entities
                if !found {
                    for obj in world.find_by_tag_mut(target_tag) {
                        obj.set_text(text);
                    }
                }
                // Also record the last shown text in StateStore under the key
                // `__seq_text_<target_tag>`. This allows game code to read what
                // was last displayed without holding a direct reference to the entity.
                ctx.state
                    .set_text(&format!("__seq_text_{}", target_tag), text);
                self.current += 1;
            }

            Step::SetVisible {
                ref target_tag,
                visible,
            } => {
                let mut found = false;
                for obj in world.find_ui_by_tag_mut(target_tag) {
                    obj.set_visible(visible);
                    found = true;
                }
                if !found {
                    for obj in world.find_by_tag_mut(target_tag) {
                        obj.set_visible(visible);
                    }
                }
                self.current += 1;
            }

            Step::WaitForInput => {
                let pressed = if cfg!(test) {
                    true
                } else {
                    ctx.input.is_key_pressed(macroquad::input::KeyCode::Space)
                        || ctx.input.is_key_pressed(macroquad::input::KeyCode::Enter)
                        || ctx
                            .input
                            .is_mouse_button_pressed(macroquad::input::MouseButton::Left)
                };
                if pressed {
                    self.current += 1;
                }
            }

            Step::SetFlag { key, value } => {
                ctx.state.set(&key, value);
                self.current += 1;
            }

            Step::Wait { seconds } => {
                self.wait_timer += ctx.time.deltatime();
                if self.wait_timer >= seconds {
                    self.wait_timer = 0.0;
                    self.current += 1;
                }
            }

            Step::Branch {
                condition,
                if_true,
                if_false,
            } => {
                if ctx.state.get_bool(&condition) {
                    self.current = if_true;
                } else {
                    self.current = if_false;
                }
            }

            Step::Label(_) => {
                self.current += 1;
            }

            Step::JumpTo(ref label) => {
                self.current = self.resolve_label(label);
            }

            Step::BranchTo {
                ref condition,
                ref if_true,
                ref if_false,
            } => {
                let target = if ctx.state.get_bool(condition) {
                    if_true
                } else {
                    if_false
                };
                self.current = self.resolve_label(target);
            }

            Step::RepeatUntil {
                ref loop_id,
                ref label,
                times,
            } => {
                let count = self.loop_counts.entry(loop_id.clone()).or_insert(0);
                *count += 1;
                if *count < times {
                    self.current = self.resolve_label(label);
                } else {
                    self.loop_counts.remove(loop_id);
                    self.current += 1;
                }
            }

            Step::PlaySound { ref sound_name } => {
                ctx.play_sound(sound_name);
                self.current += 1;
            }

            Step::Jump(target) => {
                self.current = target;
            }

            Step::AppendLine {
                ref target_tag,
                ref text,
            } => {
                let mut found = false;
                for obj in world.find_ui_by_tag_mut(target_tag) {
                    obj.append_line(text);
                    found = true;
                }
                if !found {
                    for obj in world.find_by_tag_mut(target_tag) {
                        obj.append_line(text);
                    }
                }
                self.current += 1;
            }

            Step::End => {
                self.finished = true;
            }
        }
    }
}

// ---------------------------------------------------------------------------
// SequenceBuilder — Fluent builder pattern for constructing sequences
// ---------------------------------------------------------------------------

/// Fluent builder for constructing [`Sequence`] steps with named labels and zero manual index math.
#[derive(Default)]
pub struct SequenceBuilder {
    steps: Vec<Step>,
}

impl SequenceBuilder {
    /// Creates a new [`SequenceBuilder`].
    pub fn new() -> Self {
        Self::default()
    }

    /// Appends a [`Step::ShowText`] instruction.
    pub fn show_text(mut self, target_tag: impl Into<String>, text: impl Into<String>) -> Self {
        self.steps.push(Step::show_text(target_tag, text));
        self
    }

    /// Appends a [`Step::SetVisible`] instruction.
    pub fn set_visible(mut self, target_tag: impl Into<String>, visible: bool) -> Self {
        self.steps.push(Step::set_visible(target_tag, visible));
        self
    }

    /// Appends a [`Step::Wait`] instruction.
    pub fn wait(mut self, seconds: f32) -> Self {
        self.steps.push(Step::wait(seconds));
        self
    }

    /// Appends a [`Step::WaitForInput`] instruction.
    pub fn wait_input(mut self) -> Self {
        self.steps.push(Step::wait_for_input());
        self
    }

    /// Appends a [`Step::SetFlag`] instruction.
    pub fn set_flag(mut self, key: impl Into<String>, value: impl Into<StateValue>) -> Self {
        self.steps.push(Step::set_flag(key, value));
        self
    }

    /// Appends a [`Step::PlaySound`] instruction.
    pub fn play_sound(mut self, sound_name: impl Into<String>) -> Self {
        self.steps.push(Step::play_sound(sound_name));
        self
    }

    /// Registers a named label at the current step position.
    pub fn label(mut self, name: impl Into<String>) -> Self {
        self.steps.push(Step::label(name));
        self
    }

    /// Appends a jump instruction pointing to a named label.
    pub fn jump_to_label(mut self, name: impl Into<String>) -> Self {
        self.steps.push(Step::jump_to(name));
        self
    }

    /// Appends a [`Step::BranchTo`] instruction.
    pub fn branch_to(
        mut self,
        condition: impl Into<String>,
        if_true: impl Into<String>,
        if_false: impl Into<String>,
    ) -> Self {
        self.steps
            .push(Step::branch_to(condition, if_true, if_false));
        self
    }

    /// Appends a [`Step::RepeatUntil`] instruction.
    pub fn repeat_until(
        mut self,
        loop_id: impl Into<String>,
        label: impl Into<String>,
        times: u32,
    ) -> Self {
        self.steps.push(Step::repeat_until(loop_id, label, times));
        self
    }

    /// Appends an unconditional jump instruction pointing to a numeric step index.
    pub fn jump(mut self, step_index: usize) -> Self {
        self.steps.push(Step::jump(step_index));
        self
    }

    /// Appends a [`Step::AppendLine`] instruction targeting a [`TextLog`](crate::ui::TextLog) entity by tag.
    pub fn append_line(mut self, target_tag: impl Into<String>, text: impl Into<String>) -> Self {
        self.steps.push(Step::append_line(target_tag, text));
        self
    }

    /// Appends a [`Step::End`] instruction.
    pub fn end(mut self) -> Self {
        self.steps.push(Step::end());
        self
    }

    /// Builds and returns the final [`Sequence`].
    pub fn build(self) -> Sequence {
        Sequence::new(self.steps)
    }
}

// ---------------------------------------------------------------------------
// Unit Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn label_resolves_to_correct_index() {
        let seq = Sequence::new(vec![
            Step::wait(1.0),
            Step::label("start"),
            Step::set_visible("line", true),
            Step::label("finish"),
            Step::end(),
        ]);

        assert_eq!(seq.resolve_label("start"), 1);
        assert_eq!(seq.resolve_label("finish"), 3);
    }

    #[test]
    fn jump_to_unknown_label_ends_sequence() {
        let seq = Sequence::new(vec![Step::jump_to("nonexistent"), Step::end()]);
        assert_eq!(seq.resolve_label("nonexistent"), 2);
    }

    #[test]
    fn repeat_until_loops_exact_number_of_times() {
        let seq = Sequence::new(vec![
            Step::label("retry"),
            Step::set_flag("run", true),
            Step::repeat_until("decrypt", "retry", 3),
            Step::end(),
        ]);

        let mut ctx = Context::new();
        let mut world = World::new();

        let mut seq_runner = seq;

        // Iteration 1: Step 0 (Label), Step 1 (SetFlag), Step 2 (RepeatUntil -> jumps to 0, count=1)
        seq_runner.update(&mut ctx, &mut world); // Label -> current 1
        seq_runner.update(&mut ctx, &mut world); // SetFlag -> current 2
        seq_runner.update(&mut ctx, &mut world); // RepeatUntil -> count 1 < 3, jumps to 0
        assert_eq!(seq_runner.loop_count("decrypt"), 1);

        // Iteration 2
        seq_runner.update(&mut ctx, &mut world); // Label -> current 1
        seq_runner.update(&mut ctx, &mut world); // SetFlag -> current 2
        seq_runner.update(&mut ctx, &mut world); // RepeatUntil -> count 2 < 3, jumps to 0
        assert_eq!(seq_runner.loop_count("decrypt"), 2);

        // Iteration 3
        seq_runner.update(&mut ctx, &mut world); // Label -> current 1
        seq_runner.update(&mut ctx, &mut world); // SetFlag -> current 2
        seq_runner.update(&mut ctx, &mut world); // RepeatUntil -> count 3 == 3, falls through to current 3 (End)
        assert_eq!(seq_runner.loop_count("decrypt"), 0); // Removed after completion
        assert_eq!(seq_runner.current, 3);
    }

    #[test]
    fn reset_clears_loop_counts() {
        let mut seq = Sequence::new(vec![
            Step::label("loop"),
            Step::repeat_until("my_loop", "loop", 5),
            Step::end(),
        ]);

        let mut ctx = Context::new();
        let mut world = World::new();

        seq.update(&mut ctx, &mut world); // Label
        seq.update(&mut ctx, &mut world); // RepeatUntil -> count 1
        assert_eq!(seq.loop_count("my_loop"), 1);

        seq.reset();
        assert_eq!(seq.loop_count("my_loop"), 0);
        assert_eq!(seq.current, 0);
        assert!(!seq.is_finished());
    }
}
```

---

# state.rs

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// StateValue — Value variant stored in StateStore
// ---------------------------------------------------------------------------

/// Variant enum representing data types stored in [`StateStore`].
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum StateValue {
    Bool(bool),
    Int(i64),
    Float(f64),
    Text(String),
}

impl From<bool> for StateValue {
    fn from(v: bool) -> Self {
        StateValue::Bool(v)
    }
}

impl From<i32> for StateValue {
    fn from(v: i32) -> Self {
        StateValue::Int(v as i64)
    }
}

impl From<i64> for StateValue {
    fn from(v: i64) -> Self {
        StateValue::Int(v)
    }
}

impl From<f32> for StateValue {
    fn from(v: f32) -> Self {
        StateValue::Float(v as f64)
    }
}

impl From<f64> for StateValue {
    fn from(v: f64) -> Self {
        StateValue::Float(v)
    }
}

impl From<String> for StateValue {
    fn from(v: String) -> Self {
        StateValue::Text(v)
    }
}

impl From<&str> for StateValue {
    fn from(v: &str) -> Self {
        StateValue::Text(v.to_string())
    }
}

// ---------------------------------------------------------------------------
// StateStore — Global game state and flag storage
// ---------------------------------------------------------------------------

/// Key-value flag and game state storage component.
/// Stores arbitrary data keyed by strings, accessible via [`Context::state`](crate::engine::Context::state).
///
/// Supports Serde JSON serialization for save/load files out of the box.
///
/// # Example
/// ```ignore
/// ctx.state.set_bool("door_open", true);
/// ctx.state.set_int("collected_items", 0);
///
/// if ctx.state.get_bool("door_open") {
///     // Handle opened door...
/// }
/// ctx.state.increment("collected_items", 1);
/// ```
#[derive(Clone, Default, Debug, Serialize, Deserialize)]
pub struct StateStore {
    values: HashMap<String, StateValue>,
}

impl StateStore {
    /// Creates a new empty [`StateStore`].
    pub fn new() -> Self {
        Self::default()
    }

    /// Returns a read-only reference to the underlying values map.
    pub fn values(&self) -> &HashMap<String, StateValue> {
        &self.values
    }

    // ----- Setters -----

    /// Sets an explicit [`StateValue`] entry for `key`.
    pub fn set(&mut self, key: &str, value: StateValue) {
        self.values.insert(key.to_string(), value);
    }

    /// Stores a boolean flag entry.
    pub fn set_bool(&mut self, key: &str, v: bool) {
        self.set(key, StateValue::Bool(v));
    }

    /// Stores an integer entry.
    pub fn set_int(&mut self, key: &str, v: i64) {
        self.set(key, StateValue::Int(v));
    }

    /// Stores a floating point entry.
    pub fn set_float(&mut self, key: &str, v: f64) {
        self.set(key, StateValue::Float(v));
    }

    /// Stores a string text entry.
    pub fn set_text(&mut self, key: &str, v: impl Into<String>) {
        self.set(key, StateValue::Text(v.into()));
    }

    // ----- Getters -----

    /// Retrieves an optional reference to a [`StateValue`] entry by key.
    pub fn get(&self, key: &str) -> Option<&StateValue> {
        self.values.get(key)
    }

    /// Returns the boolean flag value for `key`, or `false` if not set or mismatched.
    pub fn get_bool(&self, key: &str) -> bool {
        match self.values.get(key) {
            Some(StateValue::Bool(v)) => *v,
            _ => false,
        }
    }

    /// Returns the boolean flag value for `key`, or `default` if not set.
    pub fn get_bool_or(&self, key: &str, default: bool) -> bool {
        match self.values.get(key) {
            Some(StateValue::Bool(v)) => *v,
            _ => default,
        }
    }

    /// Returns the integer value for `key`, or `0` if not set or mismatched.
    pub fn get_int(&self, key: &str) -> i64 {
        match self.values.get(key) {
            Some(StateValue::Int(v)) => *v,
            _ => 0,
        }
    }

    /// Returns the integer value for `key`, or `default` if not set.
    pub fn get_int_or(&self, key: &str, default: i64) -> i64 {
        match self.values.get(key) {
            Some(StateValue::Int(v)) => *v,
            _ => default,
        }
    }

    /// Returns the float value for `key`, or `0.0` if not set or mismatched.
    pub fn get_float(&self, key: &str) -> f64 {
        match self.values.get(key) {
            Some(StateValue::Float(v)) => *v,
            _ => 0.0,
        }
    }

    /// Returns the float value for `key`, or `default` if not set.
    pub fn get_float_or(&self, key: &str, default: f64) -> f64 {
        match self.values.get(key) {
            Some(StateValue::Float(v)) => *v,
            _ => default,
        }
    }

    /// Returns the string text value for `key`, or `""` if not set or mismatched.
    pub fn get_text(&self, key: &str) -> &str {
        match self.values.get(key) {
            Some(StateValue::Text(v)) => v.as_str(),
            _ => "",
        }
    }

    /// Returns the string text value for `key`, or `default` if not set.
    pub fn get_text_or<'a>(&'a self, key: &str, default: &'a str) -> &'a str {
        match self.values.get(key) {
            Some(StateValue::Text(v)) => v.as_str(),
            _ => default,
        }
    }

    // ----- Convenience Operations -----

    /// Returns `true` if `key` exists in the store regardless of type.
    pub fn has_flag(&self, key: &str) -> bool {
        self.values.contains_key(key)
    }

    /// Removes an entry by key.
    pub fn remove(&mut self, key: &str) {
        self.values.remove(key);
    }

    /// Increments an integer entry by `delta` (defaults from `0` if non-existent).
    pub fn increment(&mut self, key: &str, delta: i64) {
        let current = self.get_int(key);
        self.set_int(key, current + delta);
    }

    /// Toggles a boolean flag value.
    pub fn toggle(&mut self, key: &str) {
        let current = self.get_bool(key);
        self.set_bool(key, !current);
    }

    // ----- Serialization -----

    /// Serializes and saves the state store to a JSON file at `path`.
    pub fn save_to_file(&self, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let json = serde_json::to_string_pretty(self)?;
        std::fs::write(path, json)?;
        Ok(())
    }

    /// Deserializes and loads a state store from a JSON file at `path`.
    pub fn load_from_file(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let json = std::fs::read_to_string(path)?;
        let store = serde_json::from_str(&json)?;
        Ok(store)
    }
}
```

---

# tilemap.rs

```rust
//! 2D Tilemap component supporting ASCII layout loading, grid rendering, and AABB solid tile collisions.
//!
//! Implements [`Object`](crate::world::Object).
//!
//! # Example
//! ```ignore
//! let mut map = Tilemap::new(tile_sheet, vec2(16.0, 16.0), 32, 18)
//!     .with_solid_tiles(vec![1, 2]);
//! map.load_from_ascii("
//! ##########
//! #........#
//! #........#
//! ##########
//! ", |c| match c { '#' => Some(1), '.' => Some(0), _ => None });
//! world.add(map);
//! ```
use macroquad::{
    color::{WHITE, Color},
    math::{Rect, Vec2, vec2},
    texture::{DrawTextureParams, Texture2D, draw_texture_ex},
};
use std::collections::HashSet;

use crate::{engine::Context, world::Object};

/// 2D Tilemap grid component.
pub struct Tilemap {
    pub position: Vec2,
    pub tile_size: Vec2,
    pub cols: usize,
    pub rows: usize,
    pub tiles: Vec<u32>,
    pub solid_tile_ids: HashSet<u32>,
    pub texture: Texture2D,
    pub tint: Color,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Tilemap {
    /// Creates a new [`Tilemap`] with specified tile texture sheet, single tile dimensions `(tile_w, tile_h)`, and grid size `(cols, rows)`.
    pub fn new(texture: Texture2D, tile_size: Vec2, cols: usize, rows: usize) -> Self {
        let count = cols * rows;
        Self {
            position: Vec2::ZERO,
            tile_size,
            cols,
            rows,
            tiles: vec![0; count],
            solid_tile_ids: HashSet::new(),
            texture,
            tint: WHITE,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Sets tilemap position.
    pub fn with_position(mut self, pos: Vec2) -> Self {
        self.position = pos;
        self
    }

    /// Builder pattern: Sets entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Sets set of solid tile IDs used for collision checks.
    pub fn with_solid_tiles(mut self, solid_ids: impl IntoIterator<Item = u32>) -> Self {
        self.solid_tile_ids = solid_ids.into_iter().collect();
        self
    }

    /// Sets solid status for a tile ID.
    pub fn set_tile_solid(&mut self, tile_id: u32, solid: bool) {
        if solid {
            self.solid_tile_ids.insert(tile_id);
        } else {
            self.solid_tile_ids.remove(&tile_id);
        }
    }

    /// Returns tile ID at grid coordinate `(col, row)`, or `None` if out of bounds.
    pub fn get_tile(&self, col: usize, row: usize) -> Option<u32> {
        if col < self.cols && row < self.rows {
            Some(self.tiles[row * self.cols + col])
        } else {
            None
        }
    }

    /// Sets tile ID at grid coordinate `(col, row)`.
    pub fn set_tile(&mut self, col: usize, row: usize, tile_id: u32) -> bool {
        if col < self.cols && row < self.rows {
            self.tiles[row * self.cols + col] = tile_id;
            true
        } else {
            false
        }
    }

    /// Parses and fills tilemap grid from an ASCII multiline string using a mapping closure `(char) -> Option<u32>`.
    pub fn load_from_ascii<F>(&mut self, ascii_map: &str, char_to_tile: F)
    where
        F: Fn(char) -> Option<u32>,
    {
        for (r, line) in ascii_map.lines().filter(|l| !l.trim().is_empty()).enumerate() {
            if r >= self.rows {
                break;
            }
            for (c, ch) in line.chars().enumerate() {
                if c >= self.cols {
                    break;
                }
                if let Some(tile_id) = char_to_tile(ch) {
                    self.set_tile(c, r, tile_id);
                }
            }
        }
    }

    /// Returns `true` if tile at `(col, row)` is marked as solid.
    pub fn is_tile_solid(&self, col: usize, row: usize) -> bool {
        self.get_tile(col, row)
            .map(|id| self.solid_tile_ids.contains(&id))
            .unwrap_or(false)
    }

    /// Returns `true` if `rect` in world space collides with any solid tile in this tilemap.
    pub fn collides_rect(&self, rect: Rect) -> bool {
        let local_x = rect.x - self.position.x;
        let local_y = rect.y - self.position.y;

        let start_col = (local_x / self.tile_size.x).floor().max(0.0) as usize;
        let end_col = ((local_x + rect.w) / self.tile_size.x).ceil().max(0.0) as usize;

        let start_row = (local_y / self.tile_size.y).floor().max(0.0) as usize;
        let end_row = ((local_y + rect.h) / self.tile_size.y).ceil().max(0.0) as usize;

        let end_c = end_col.min(self.cols);
        let end_r = end_row.min(self.rows);

        for r in start_row..end_r {
            for c in start_col..end_c {
                if self.is_tile_solid(c, r) {
                    let tile_rect = Rect {
                        x: self.position.x + (c as f32) * self.tile_size.x,
                        y: self.position.y + (r as f32) * self.tile_size.y,
                        w: self.tile_size.x,
                        h: self.tile_size.y,
                    };
                    if tile_rect.overlaps(&rect) {
                        return true;
                    }
                }
            }
        }
        false
    }
}

impl Object for Tilemap {
    fn update(&mut self, _ctx: &mut Context) {}

    fn draw(&self) {
        if !self.visible {
            return;
        }

        let sheet_cols = (self.texture.width() / self.tile_size.x).max(1.0) as usize;

        for r in 0..self.rows {
            for c in 0..self.cols {
                let tile_id = self.tiles[r * self.cols + c];
                if tile_id == 0 {
                    continue;
                }

                let src_col = (tile_id as usize) % sheet_cols;
                let src_row = (tile_id as usize) / sheet_cols;

                let src_rect = Rect {
                    x: (src_col as f32) * self.tile_size.x,
                    y: (src_row as f32) * self.tile_size.y,
                    w: self.tile_size.x,
                    h: self.tile_size.y,
                };

                let dest_pos = self.position + vec2((c as f32) * self.tile_size.x, (r as f32) * self.tile_size.y);

                draw_texture_ex(
                    &self.texture,
                    dest_pos.x,
                    dest_pos.y,
                    self.tint,
                    DrawTextureParams {
                        source: Some(src_rect),
                        dest_size: Some(self.tile_size),
                        ..Default::default()
                    },
                );
            }
        }
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tilemap_ascii_and_collision() {
        let mut map = Tilemap {
            position: Vec2::ZERO,
            tile_size: vec2(16.0, 16.0),
            cols: 4,
            rows: 4,
            tiles: vec![0; 16],
            solid_tile_ids: [1].into_iter().collect(),
            texture: unsafe { std::mem::zeroed() },
            tint: WHITE,
            tag: String::new(),
            visible: true,
            active: true,
        };

        let ascii = "
1111
1001
1001
1111
";
        map.load_from_ascii(ascii, |c| match c {
            '1' => Some(1),
            '0' => Some(0),
            _ => None,
        });

        assert!(map.is_tile_solid(0, 0));
        assert!(!map.is_tile_solid(1, 1));

        // Test collision query inside empty area (1,1) -> (16..32, 16..32)
        assert!(!map.collides_rect(Rect::new(18.0, 18.0, 10.0, 10.0)));

        // Test collision query hitting top wall (0,0)
        assert!(map.collides_rect(Rect::new(5.0, 5.0, 10.0, 10.0)));
    }
}
```

---

# time.rs

```rust
use macroquad::time::{get_fps, get_frame_time, get_time};

/// Delta time and frame rate query provider.
pub struct Time {}

impl Time {
    /// Creates a new [`Time`] instance.
    pub fn new() -> Self {
        Self {}
    }

    /// Returns the frame delta time in seconds.
    pub fn deltatime(&self) -> f32 {
        if cfg!(test) { 0.016 } else { get_frame_time() }
    }

    /// Returns the current frames-per-second (FPS) counter.
    pub fn fps(&self) -> i32 {
        if cfg!(test) { 60 } else { get_fps() }
    }

    /// Returns total elapsed application time in seconds since start.
    pub fn elapsed_time(&self) -> f64 {
        if cfg!(test) { 0.0 } else { get_time() }
    }
}

impl Default for Time {
    fn default() -> Self {
        Self::new()
    }
}

/// One-shot or repeating countdown timer struct.
#[derive(Clone, Debug)]
pub struct Timer {
    /// Duration of the timer in seconds.
    pub duration: f32,
    time_left: f32,
    /// Indicates whether the timer automatically restarts upon completion.
    pub repeating: bool,
}

impl Timer {
    /// Creates a new [`Timer`] with specified duration in seconds and repeat settings.
    pub fn new(duration: f32, repeating: bool) -> Self {
        Self {
            duration,
            time_left: duration,
            repeating,
        }
    }

    /// Updates the timer countdown by `dt` delta seconds.
    pub fn update(&mut self, dt: f32) {
        if self.time_left > 0.0 {
            self.time_left -= dt;
            if self.time_left <= 0.0 {
                if self.repeating {
                    self.time_left += self.duration;
                } else {
                    self.time_left = 0.0;
                }
            }
        }
    }

    /// Returns `true` if the timer countdown has expired.
    pub fn is_ready(&self) -> bool {
        self.time_left <= 0.0
    }

    /// Resets the timer back to its initial duration.
    pub fn reset(&mut self) {
        self.time_left = self.duration;
    }

    /// Returns the normalized progress ratio (`0.0` .. `1.0`).
    pub fn progress(&self) -> f32 {
        if self.duration <= 0.0 {
            1.0
        } else {
            (1.0 - (self.time_left / self.duration)).clamp(0.0, 1.0)
        }
    }
}
```

---

# trigger.rs

```rust
//! Generic condition→action trigger system.
//!
//! [`TriggerSystem`] manages a list of [`Trigger`]s, each of which fires exactly
//! once when its condition — a closure operating on [`Resources`] — becomes true.
//! The engine has zero knowledge of what conditions or actions mean in a game.

use crate::resources::Resources;

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

/// A one-shot condition→action rule that operates on [`Resources`].
///
/// - `condition` is evaluated every frame against the current resource store.
/// - `action` runs exactly once the first time `condition` returns `true`.
/// - Set `one_shot = false` to make the trigger re-arm after firing.
pub struct Trigger {
    /// Closure that decides whether the trigger should fire.
    pub condition: Box<dyn Fn(&Resources) -> bool>,
    /// Closure that executes when the condition is met.
    pub action: Box<dyn FnMut(&mut Resources)>,
    /// Whether the trigger has already fired (one-shot by default).
    pub fired: bool,
    /// If `true` (default), the trigger fires at most once.
    /// Set to `false` to re-arm the trigger after it fires.
    pub one_shot: bool,
}

impl Trigger {
    /// Creates a new one-shot trigger.
    pub fn new(
        condition: impl Fn(&Resources) -> bool + 'static,
        action: impl FnMut(&mut Resources) + 'static,
    ) -> Self {
        Self {
            condition: Box::new(condition),
            action: Box::new(action),
            fired: false,
            one_shot: true,
        }
    }

    /// Makes this trigger re-arm after firing (fires every frame the condition holds).
    pub fn repeating(mut self) -> Self {
        self.one_shot = false;
        self
    }
}

// ---------------------------------------------------------------------------
// TriggerSystem
// ---------------------------------------------------------------------------

/// Manages a collection of [`Trigger`]s, evaluating and executing them each frame.
///
/// Registered triggers are checked in insertion order.
/// One-shot triggers are permanently disabled after firing.
/// Repeating triggers run every frame their condition is satisfied.
///
/// Integrate by calling `ctx.triggers.update(&mut ctx.resources)` in an update closure.
/// The field is already present on [`Context`](crate::engine::Context) as `ctx.triggers`.
#[derive(Default)]
pub struct TriggerSystem {
    triggers: Vec<Trigger>,
}

impl TriggerSystem {
    /// Creates a new empty [`TriggerSystem`].
    pub fn new() -> Self {
        Self::default()
    }

    /// Registers a new trigger.
    pub fn register(&mut self, trigger: Trigger) {
        self.triggers.push(trigger);
    }

    /// Evaluates all active triggers against `resources` and fires matching ones.
    ///
    /// Should be called once per frame, typically at the start of the update step.
    pub fn update(&mut self, resources: &mut Resources) {
        for trigger in &mut self.triggers {
            if trigger.one_shot && trigger.fired {
                continue;
            }
            if (trigger.condition)(resources) {
                (trigger.action)(resources);
                trigger.fired = true;
            } else if !trigger.one_shot {
                // Repeating trigger resets its "fired" latch when condition is false
                trigger.fired = false;
            }
        }
    }

    /// Removes all fired one-shot triggers from the list (optional GC step).
    pub fn prune_fired(&mut self) {
        self.triggers.retain(|t| !(t.one_shot && t.fired));
    }

    /// Returns the number of currently registered triggers (including fired ones).
    pub fn len(&self) -> usize {
        self.triggers.len()
    }

    /// Returns `true` if no triggers are registered.
    pub fn is_empty(&self) -> bool {
        self.triggers.is_empty()
    }
}

// ---------------------------------------------------------------------------
// Unit tests (pure Rust, no macroquad)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn one_shot_fires_once() {
        let mut ts = TriggerSystem::new();
        let mut res = Resources::new();
        res.insert(0_i32);

        ts.register(Trigger::new(
            |r| *r.get::<i32>().unwrap() >= 5,
            |r| *r.get_mut::<i32>().unwrap() = 0,
        ));

        *res.get_mut::<i32>().unwrap() = 10;
        ts.update(&mut res);
        assert_eq!(*res.get::<i32>().unwrap(), 0); // action ran

        *res.get_mut::<i32>().unwrap() = 10;
        ts.update(&mut res);
        assert_eq!(*res.get::<i32>().unwrap(), 10); // did NOT fire again
    }

    #[test]
    fn repeating_fires_every_frame_while_condition_holds() {
        let mut ts = TriggerSystem::new();
        let mut res = Resources::new();
        res.insert(0_u32);

        ts.register(Trigger::new(|_| true, |r| *r.get_mut::<u32>().unwrap() += 1).repeating());

        ts.update(&mut res);
        ts.update(&mut res);
        ts.update(&mut res);
        assert_eq!(*res.get::<u32>().unwrap(), 3);
    }

    #[test]
    fn prune_fired_removes_done_triggers() {
        let mut ts = TriggerSystem::new();
        let mut res = Resources::new();
        res.insert(10_i32);

        ts.register(Trigger::new(|r| *r.get::<i32>().unwrap() > 5, |_| {}));
        assert_eq!(ts.len(), 1);
        ts.update(&mut res);
        ts.prune_fired();
        assert_eq!(ts.len(), 0);
    }
}
```

---

# ui.rs

```rust
//! Screen-space UI components: [`Text`], [`Button`], [`ProgressBar`], [`Panel`], [`TextField`], [`UI`].
//!
//! # Architecture: `ui::Panel` vs `panel_manager::PanelManager`
//!
//! These two types serve **different purposes** and must not be mixed up:
//!
//! | | `ui::Panel` | `panel_manager::PanelManager` |
//! |---|---|---|
//! | **Role** | Static grouping container | Desktop window manager |
//! | **Z-order** | Fixed (render order in parent list) | Managed, click-to-focus |
//! | **Dragging** | **Deprecated** — do not use | ✅ Full drag support via `is_draggable()` |
//! | **Nesting** | Children rendered inside panel | Panels are top-level, not nested |
//! | **Use case** | Group buttons/text inside one window pane | Moveable OS-style desktop windows |
//!
//! **Rule of thumb**: Use `ui::Panel` to lay out the interior of a window.
//! Use `panel_manager::PanelManager` (added to `World` via `world.add_ui`) to manage the windows themselves.
//!
//! # Architecture: Dual Coordinate Systems & Hit-Testing Rules
//!
//! RustedEngine supports two distinct UI coordinate systems when virtual resolution is active:
//!
//! 1. **Virtual Space (`0..vw, 0..vh`) — Non-Text Widgets (`is_text_layer() == false`)**:
//!    - Used by [`Panel`], [`Image`], [`Button`], [`ProgressBar`], [`TextField`].
//!    - Rendered into the Virtual Render Target (`SceneRenderTarget`, `vrt.target`) using a virtual Camera2D (`0..vw, 0..vh`).
//!    - Mouse hit-testing MUST use `ctx.input.mouse_position()`, which converts physical screen coordinates into virtual space `(x - ox) / scale`.
//!
//! 2. **Native Screen Space — Text Layer Widgets (`is_text_layer() == true`)**:
//!    - Used by [`Text`] and [`TextLog`].
//!    - Rendered directly to the physical window framebuffer after VRT blitting to ensure TTF fonts are rasterized at native screen pixel density.
//!    - Resolved geometry uses [`get_ui_scale()`]: `pos = position * scale + get_draw_offset() * scale + ui_offset`, `size = size * scale`, `font_size = font_size * scale`.
//!    - Mouse hit-testing MUST use raw OS screen coordinates (`macroquad::input::mouse_position()`) compared against `real_screen_rect()` (`position * scale + ui_offset`, `size * scale`).
use std::cell::RefCell;
use macroquad::{
    color::{Color, GRAY, GREEN, LIGHTGRAY, RED, WHITE},
    input::{KeyCode, MouseButton, is_key_pressed, is_mouse_button_pressed, mouse_position},
    math::{Rect, Vec2, vec2},
    shapes::draw_rectangle,
    text::{Font, TextParams, draw_text, draw_text_ex, measure_text},
    texture::{DrawTextureParams, Texture2D, draw_texture_ex},
};

use crate::{
    draggable::{DragState, Draggable},
    engine::Context,
    object::{Behavior, Clickable},
    world::Object,
};



thread_local! {
    static SCISSOR_STACK: RefCell<Vec<Rect>> = const { RefCell::new(Vec::new()) };
}

fn intersect_rects(r1: Rect, r2: Rect) -> Rect {
    let x1 = r1.x.max(r2.x);
    let y1 = r1.y.max(r2.y);
    let x2 = (r1.x + r1.w).min(r2.x + r2.w);
    let y2 = (r1.y + r1.h).min(r2.y + r2.h);
    let w = (x2 - x1).max(0.0);
    let h = (y2 - y1).max(0.0);
    Rect { x: x1, y: y1, w, h }
}

fn apply_gl_scissor(clip: Option<Rect>) {
    let gl = unsafe { macroquad::window::get_internal_gl() };
    let dpi = macroquad::window::screen_dpi_scale();
    if let Some(rect) = clip {
        let x = (rect.x * dpi) as i32;
        let y = (rect.y * dpi) as i32;
        let w = (rect.w.max(0.0) * dpi) as i32;
        let h = (rect.h.max(0.0) * dpi) as i32;
        gl.quad_gl.scissor(Some((x, y, w, h)));
    } else {
        gl.quad_gl.scissor(None);
    }
}

/// RAII guard for pushing and automatically popping an OpenGL scissor clipping rectangle.
/// Pops the scissor state when dropped, ensuring safety even in the event of early return or panic.
pub struct ScissorGuard;

impl ScissorGuard {
    /// Pushes `rect` clipped to current parent scissor rectangle and applies GL scissor.
    pub fn new(rect: Rect) -> Self {
        SCISSOR_STACK.with(|stack| {
            let mut stack = stack.borrow_mut();
            let parent = stack.last().copied();
            let clip = if let Some(p) = parent {
                intersect_rects(p, rect)
            } else {
                rect
            };
            stack.push(clip);
            apply_gl_scissor(Some(clip));
        });
        Self
    }
}

impl Drop for ScissorGuard {
    fn drop(&mut self) {
        SCISSOR_STACK.with(|stack| {
            let mut stack = stack.borrow_mut();
            stack.pop();
            let parent = stack.last().copied();
            apply_gl_scissor(parent);
        });
    }
}

thread_local! {
    static DRAW_OFFSET_STACK: RefCell<Vec<Vec2>> = const { RefCell::new(Vec::new()) };
}

pub fn push_draw_offset(offset: Vec2) {
    DRAW_OFFSET_STACK.with(|stack| {
        let mut stack = stack.borrow_mut();
        let current = stack.last().copied().unwrap_or(Vec2::ZERO);
        stack.push(current + offset);
    });
}

pub fn pop_draw_offset() {
    DRAW_OFFSET_STACK.with(|stack| {
        stack.borrow_mut().pop();
    });
}

pub fn get_draw_offset() -> Vec2 {
    DRAW_OFFSET_STACK.with(|stack| stack.borrow().last().copied().unwrap_or(Vec2::ZERO))
}

thread_local! {
    static UI_SCALE: std::cell::Cell<(f32, Vec2)> = const { std::cell::Cell::new((1.0, Vec2::ZERO)) };
}

/// Sets the current UI text scale factor and screen-space offset (letterbox origin),
/// used by [`Text`] and [`TextLog`] to rasterize fonts at native screen pixel density
/// even when a virtual resolution pipeline is active. Called once per frame by
/// [`crate::engine::Engine::run`]; defaults to `(1.0, Vec2::ZERO)` (no-op) when no
/// virtual resolution is configured.
pub fn set_ui_scale(scale: f32, offset: Vec2) {
    UI_SCALE.with(|s| s.set((scale, offset)));
}

/// Returns the current `(scale, offset)` set by [`set_ui_scale`].
pub fn get_ui_scale() -> (f32, Vec2) {
    UI_SCALE.with(|s| s.get())
}

// ---------------------------------------------------------------------------
// RevealMode — Text reveal animation mode
// ---------------------------------------------------------------------------

/// Text reveal animation mode for [`Text`].
#[derive(Clone, Debug, Default)]
pub enum RevealMode {
    /// Text appears instantly in full.
    #[default]
    Instant,
    /// Text appears character-by-character at the specified speed.
    Typewriter { chars_per_sec: f32 },
}

// ---------------------------------------------------------------------------
// UIAnchor — Anchor positions for aligning UI elements to screen bounds
// ---------------------------------------------------------------------------

/// Anchor alignment presets for positioning UI elements relative to screen boundaries (4K, 2K, 1080p, etc.).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum UIAnchor {
    #[default]
    TopLeft,
    TopCenter,
    TopRight,
    CenterLeft,
    Center,
    CenterRight,
    BottomLeft,
    BottomCenter,
    BottomRight,
}

thread_local! {
    /// Virtual resolution override set by `Engine::with_virtual_resolution`.
    /// When `Some((w, h))`, `safe_screen_*` returns virtual dimensions instead of real screen.
    static VIRTUAL_RES: RefCell<Option<(f32, f32)>> = const { RefCell::new(None) };
}

/// Sets the virtual resolution used by `safe_screen_*` helpers this frame.
/// Called by [`Engine`](crate::engine::Engine) when `with_virtual_resolution` is active.
pub(crate) fn set_virtual_resolution(w: f32, h: f32) {
    VIRTUAL_RES.with(|r| *r.borrow_mut() = Some((w, h)));
}


pub fn safe_screen_width() -> f32 {
    if cfg!(test) {
        800.0
    } else {
        VIRTUAL_RES.with(|r| r.borrow().map(|(w, _)| w).unwrap_or_else(macroquad::window::screen_width))
    }
}

pub fn safe_screen_height() -> f32 {
    if cfg!(test) {
        600.0
    } else {
        VIRTUAL_RES.with(|r| r.borrow().map(|(_, h)| h).unwrap_or_else(macroquad::window::screen_height))
    }
}

// ---------------------------------------------------------------------------
// Padding — Layout padding helper (Flutter / CSS style)
// ---------------------------------------------------------------------------

/// Layout padding container for UI element margins and anchor offsets (left, top, right, bottom).
#[derive(Clone, Copy, Debug, PartialEq, Default)]
pub struct Padding {
    pub left: f32,
    pub top: f32,
    pub right: f32,
    pub bottom: f32,
}

impl Padding {
    /// Creates [`Padding`] from any value convertible into `Padding` (`f32`, `(f32, f32)`, `(f32, f32, f32, f32)`).
    ///
    /// - `Padding::new(8.0)` — uniform on all 4 sides
    /// - `Padding::new((8.0, 16.0))` — symmetric (horizontal, vertical)
    /// - `Padding::new((l, t, r, b))` — explicit for each side
    pub fn new(val: impl Into<Padding>) -> Self {
        val.into()
    }

    /// Zero padding on all sides (`0.0`).
    pub fn zero() -> Self {
        Self::default()
    }

    /// Uniform padding on all 4 sides (`val`).
    pub fn all(val: f32) -> Self {
        Self {
            left: val,
            top: val,
            right: val,
            bottom: val,
        }
    }

    /// Symmetric padding: `horizontal` (left/right) and `vertical` (top/bottom).
    pub fn symmetric(horizontal: f32, vertical: f32) -> Self {
        Self {
            left: horizontal,
            top: vertical,
            right: horizontal,
            bottom: vertical,
        }
    }

    /// Explicit padding for specific sides (`left`, `top`, `right`, `bottom`).
    pub fn only(left: f32, top: f32, right: f32, bottom: f32) -> Self {
        Self {
            left,
            top,
            right,
            bottom,
        }
    }
}

impl From<f32> for Padding {
    fn from(val: f32) -> Self {
        Padding::all(val)
    }
}

impl From<Vec2> for Padding {
    fn from(v: Vec2) -> Self {
        Padding::symmetric(v.x, v.y)
    }
}

impl From<(f32, f32)> for Padding {
    fn from((h, v): (f32, f32)) -> Self {
        Padding::symmetric(h, v)
    }
}

impl From<(f32, f32, f32, f32)> for Padding {
    fn from((l, t, r, b): (f32, f32, f32, f32)) -> Self {
        Padding::only(l, t, r, b)
    }
}

/// Ergonomic constructor function for [`Padding`]. Accepts any layout specification:
///
/// | Value | Result |
/// |-------|--------|
/// | `padding(8.0)` | Uniform on all 4 sides |
/// | `padding((8.0, 16.0))` | Symmetric (horizontal, vertical) |
/// | `padding((l, t, r, b))` | Explicit for each side (left, top, right, bottom) |
///
/// # Example
/// ```rust,ignore
/// button.with_padding(padding(8.0));
/// panel.with_padding(padding((12.0, 24.0)));
/// label.with_padding(padding((4.0, 8.0, 4.0, 0.0)));
/// ```
pub fn padding(val: impl Into<Padding>) -> Padding {
    val.into()
}

/// Legacy alias for [`padding`].
#[deprecated(since = "0.5.0", note = "Use `padding()` or `Padding::new()` instead")]
pub fn padd(val: impl Into<Padding>) -> Padding {
    val.into()
}

/// External margin spacing box model helper for UI components and layouts.
#[derive(Clone, Copy, Debug, PartialEq, Default)]
pub struct Margin {
    pub left: f32,
    pub top: f32,
    pub right: f32,
    pub bottom: f32,
}

impl Margin {
    /// Creates [`Margin`] from any value convertible into `Margin` (`f32`, `(f32, f32)`, `(f32, f32, f32, f32)`).
    pub fn new(val: impl Into<Margin>) -> Self {
        val.into()
    }

    /// Creates uniform margin for all 4 sides (`top`, `bottom`, `left`, `right`).
    pub fn all(val: f32) -> Self {
        Self { left: val, top: val, right: val, bottom: val }
    }

    /// Creates symmetric horizontal and vertical margin.
    pub fn symmetric(horizontal: f32, vertical: f32) -> Self {
        Self { left: horizontal, top: vertical, right: horizontal, bottom: vertical }
    }

    /// Creates explicit margin for each side (`left`, `top`, `right`, `bottom`).
    pub fn only(left: f32, top: f32, right: f32, bottom: f32) -> Self {
        Self { left, top, right, bottom }
    }

    pub fn only_top(val: f32) -> Self { Self { top: val, ..Default::default() } }
    pub fn only_bottom(val: f32) -> Self { Self { bottom: val, ..Default::default() } }
    pub fn only_left(val: f32) -> Self { Self { left: val, ..Default::default() } }
    pub fn only_right(val: f32) -> Self { Self { right: val, ..Default::default() } }
}

/// Ergonomic constructor function for [`Margin`].
pub fn margin(val: impl Into<Margin>) -> Margin {
    val.into()
}

impl From<f32> for Margin {
    fn from(val: f32) -> Self { Margin::all(val) }
}
impl From<(f32, f32)> for Margin {
    fn from((h, v): (f32, f32)) -> Self { Margin::symmetric(h, v) }
}
impl From<(f32, f32, f32, f32)> for Margin {
    fn from((l, t, r, b): (f32, f32, f32, f32)) -> Self { Margin::only(l, t, r, b) }
}

/// Text horizontal alignment modes.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum TextAlign {
    #[default]
    Left,
    Center,
    Right,
}

/// Alignment along the cross axis of a layout container.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum LayoutAlign {
    #[default]
    Start,
    Center,
    End,
    Stretch,
}

/// Distribution along the main axis of a layout container.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum LayoutJustify {
    #[default]
    Start,
    Center,
    End,
    SpaceBetween,
}

/// Renders a 9-patch texture unscaled at corners (1:1 scale) while stretching edges and center to fit `size`.
pub fn draw_nine_slice(
    texture: &Texture2D,
    pos: Vec2,
    size: Vec2,
    margins: (f32, f32, f32, f32), // (left, right, top, bottom)
    tint: Color,
) {
    let (l, r, t, b) = margins;
    let tw = texture.width();
    let th = texture.height();

    let src_l = l.min(tw * 0.5);
    let src_r = r.min(tw * 0.5);
    let src_t = t.min(th * 0.5);
    let src_b = b.min(th * 0.5);

    let src_mid_w = (tw - src_l - src_r).max(0.0);
    let src_mid_h = (th - src_t - src_b).max(0.0);

    let dest_mid_w = (size.x - src_l - src_r).max(0.0);
    let dest_mid_h = (size.y - src_t - src_b).max(0.0);

    let src_xs = [0.0, src_l, tw - src_r];
    let src_ys = [0.0, src_t, th - src_b];
    let src_ws = [src_l, src_mid_w, src_r];
    let src_hs = [src_t, src_mid_h, src_b];

    let dest_xs = [pos.x, pos.x + src_l, pos.x + size.x - src_r];
    let dest_ys = [pos.y, pos.y + src_t, pos.y + size.y - src_b];
    let dest_ws = [src_l, dest_mid_w, src_r];
    let dest_hs = [src_t, dest_mid_h, src_b];

    for row in 0..3 {
        for col in 0..3 {
            if src_ws[col] <= 0.0 || src_hs[row] <= 0.0 || dest_ws[col] <= 0.0 || dest_hs[row] <= 0.0 {
                continue;
            }
            let src = Rect::new(src_xs[col], src_ys[row], src_ws[col], src_hs[row]);
            let dest = vec2(dest_ws[col], dest_hs[row]);
            draw_texture_ex(
                texture,
                dest_xs[col],
                dest_ys[row],
                tint,
                DrawTextureParams {
                    source: Some(src),
                    dest_size: Some(dest),
                    ..Default::default()
                },
            );
        }
    }
}

impl UIAnchor {
    /// Computes top-left `Vec2` position for an element of `size` relative to current screen dimensions (`screen_width()` × `screen_height()`).
    /// The result is **rounded to whole virtual pixels** to prevent sub-pixel sampling artifacts when using [`FilterMode::Nearest`] textures.
    pub fn compute_position(&self, size: Vec2, padding: impl Into<Padding>) -> Vec2 {
        let p = padding.into();
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        let pos = match self {
            UIAnchor::TopLeft     => vec2(p.left, p.top),
            UIAnchor::TopCenter   => vec2((sw - size.x) * 0.5 + p.left - p.right, p.top),
            UIAnchor::TopRight    => vec2(sw - size.x - p.right, p.top),
            UIAnchor::CenterLeft  => vec2(p.left, (sh - size.y) * 0.5 + p.top - p.bottom),
            UIAnchor::Center      => vec2((sw - size.x) * 0.5 + p.left - p.right, (sh - size.y) * 0.5 + p.top - p.bottom),
            UIAnchor::CenterRight => vec2(sw - size.x - p.right, (sh - size.y) * 0.5 + p.top - p.bottom),
            UIAnchor::BottomLeft  => vec2(p.left, sh - size.y - p.bottom),
            UIAnchor::BottomCenter=> vec2((sw - size.x) * 0.5 + p.left - p.right, sh - size.y - p.bottom),
            UIAnchor::BottomRight => vec2(sw - size.x - p.right, sh - size.y - p.bottom),
        };
        vec2(pos.x.round(), pos.y.round())
    }
}

// ---------------------------------------------------------------------------
// Text — UI Text component with typewriter reveal effect
// ---------------------------------------------------------------------------

/// UI Text component supporting typewriter reveal animation.
///
/// # Field Naming Notice
/// The string content field is named `content` (instead of `text`) to avoid ambiguity
/// when accessing fields on [`Behavior<Text, Data>`](crate::ui::TextObject) via `Deref`.
pub struct Text {
    /// Text string content displayed by the component.
    pub content: String,
    pub position: Vec2,
    pub font_size: f32,
    pub font: Option<Font>,
    pub color: Color,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    /// Active reveal animation mode. Defaults to [`RevealMode::Instant`].
    pub reveal_mode: RevealMode,
    /// Maximum width for word-wrapping. `None` = single-line (legacy behaviour).
    pub max_width: Option<f32>,
    /// Vertical gap between lines when word-wrapping. Defaults to `1.2 * font_size` when 0.0.
    pub line_spacing: f32,
    /// Full target string when in Typewriter mode.
    full_content: String,
    /// Counter tracking revealed characters.
    revealed_chars: f32,
    /// Text horizontal alignment. Defaults to [`TextAlign::Left`].
    pub alignment: TextAlign,
    /// Drop shadow `(color, offset_vec2)`.
    pub shadow: Option<(Color, Vec2)>,
    /// Text outline `(color, thickness)`.
    pub outline: Option<(Color, f32)>,
    pub padding: Padding,
    pub margin: Margin,
    /// Optional pre-baked pixel-art bitmap font.
    pub bitmap_font: Option<std::rc::Rc<crate::bitmap_font::BitmapFont>>,
}

impl Text {
    /// Creates a new [`Text`] component with instant reveal mode.
    pub fn new(text: impl Into<String>, position: Vec2, font_size: f32, color: Color) -> Self {
        let content = text.into();
        let len = content.len() as f32;
        Self {
            content: content.clone(),
            full_content: content,
            position,
            font_size,
            font: None,
            color,
            tag: String::new(),
            visible: true,
            active: true,
            reveal_mode: RevealMode::Instant,
            max_width: None,
            line_spacing: 0.0,
            revealed_chars: len,
            alignment: TextAlign::Left,
            shadow: None,
            outline: None,
            padding: Padding::default(),
            margin: Margin::default(),
            bitmap_font: None,
        }
    }

    /// Builder pattern: Attaches a pre-baked [`BitmapFont`] atlas for 100% crisp pixel font rendering.
    pub fn with_bitmap_font(mut self, bitmap_font: std::rc::Rc<crate::bitmap_font::BitmapFont>) -> Self {
        self.bitmap_font = Some(bitmap_font);
        self
    }

    /// Builder pattern: Sets horizontal text alignment.
    pub fn align(mut self, alignment: TextAlign) -> Self {
        self.alignment = alignment;
        self
    }

    /// Builder pattern: Enables text drop shadow with color and pixel offset.
    pub fn with_shadow(mut self, color: Color, offset: Vec2) -> Self {
        self.shadow = Some((color, offset));
        self
    }

    /// Builder pattern: Enables text outline stroke.
    pub fn with_outline(mut self, color: Color, width: f32) -> Self {
        self.outline = Some((color, width));
        self
    }

    /// Builder pattern: Sets internal padding.
    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self
    }

    /// Builder pattern: Sets external margin.
    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self
    }

    /// Builder pattern: Sets the text color.
    pub fn with_color(mut self, color: Color) -> Self {
        self.color = color;
        self
    }

    /// Builder pattern: Sets a custom TTF font.
    pub fn with_font(mut self, font: Font) -> Self {
        self.font = Some(font);
        self
    }

    /// Builder pattern: Sets a font loaded in asset manager by name (automatically selects [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas if loaded, otherwise falls back to TTF [`Font`]).
    pub fn with_font_from_assets(
        mut self,
        assets: &crate::asset_manager::Assets,
        name: &str,
    ) -> Self {
        if let Some(bm) = assets.get_bitmap_font(name) {
            self.bitmap_font = Some(bm);
        } else if let Some(font) = assets.get_font(name) {
            self.font = Some(font.clone());
        }
        self
    }

    /// Builder pattern: Attaches a pre-baked [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas loaded in asset manager by name.
    pub fn with_bitmap_font_from_assets(
        mut self,
        assets: &crate::asset_manager::Assets,
        name: &str,
    ) -> Self {
        if let Some(bm) = assets.get_bitmap_font(name) {
            self.bitmap_font = Some(bm);
        }
        self
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Centers text on screen.
    pub fn center_on_screen(mut self) -> Self {
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        let font_ref = self.font.as_ref();
        let font_size = self.font_size;
        let dim = measure_text(&self.content, font_ref, font_size as u16, 1.0);
        self.position = vec2((sw - dim.width) * 0.5, (sh - dim.height) * 0.5);
        self
    }

    /// Builder pattern: Aligns text on screen using a [`UIAnchor`] preset and padding.
    pub fn align_to_screen(mut self, anchor: UIAnchor, padding: impl Into<Padding>) -> Self {
        let font_ref = self.font.as_ref();
        let font_size = self.font_size;
        let dim = measure_text(&self.content, font_ref, font_size as u16, 1.0);
        let size = vec2(dim.width, dim.height);
        self.position = anchor.compute_position(size, padding);
        self
    }

    /// Builder pattern: Sets text component to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets text component to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets text component to deactivated (`active = false`) (alias for [`deactivated`](Text::deactivated)).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead (typo fix)")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Builder pattern: Sets text visibility.
    pub fn with_visible(mut self, visible: bool) -> Self {
        self.visible = visible;
        self
    }

    /// Builder pattern: Sets text active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Returns `true` if text component is visible.
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Returns `true` if text component is active.
    pub fn is_active(&self) -> bool {
        self.active
    }

    /// Builder pattern: Configures typewriter reveal mode with specified characters per second speed.
    pub fn with_typewriter(mut self, chars_per_sec: f32) -> Self {
        self.reveal_mode = RevealMode::Typewriter { chars_per_sec };
        self.revealed_chars = 0.0;
        self.content = String::new();
        self
    }

    /// Updates the target text content and resets the reveal animation state.
    pub fn set_text(&mut self, text: impl Into<String>) {
        let t = text.into();
        self.full_content = t.clone();
        self.revealed_chars = 0.0;
        match self.reveal_mode {
            RevealMode::Instant => {
                self.content = t;
                self.revealed_chars = self.full_content.len() as f32;
            }
            RevealMode::Typewriter { .. } => {
                self.content = String::new();
            }
        }
    }

    /// Immediately completes the typewriter animation, revealing all text instantly.
    pub fn skip(&mut self) {
        self.content = self.full_content.clone();
        self.revealed_chars = self.full_content.len() as f32;
    }

    /// Builder pattern: Sets maximum width for automatic word-wrapping.
    pub fn with_max_width(mut self, width: f32) -> Self {
        self.max_width = Some(width);
        self
    }

    /// Builder pattern: Sets vertical line spacing when word-wrapping.
    pub fn with_line_spacing(mut self, spacing: f32) -> Self {
        self.line_spacing = spacing;
        self
    }

    /// Wraps `text` into lines based on `max_width` using a provided string measurement closure `measure`.
    ///
    /// Preserves existing `\n` characters as forced line breaks.
    /// This function accepts a generic measurement closure so that it can be tested without GPU context.
    pub fn wrap_lines_with<F>(&self, text: &str, max_width: f32, measure: F) -> Vec<String>
    where
        F: Fn(&str) -> f32,
    {
        let mut lines = Vec::new();
        for paragraph in text.split('\n') {
            if paragraph.is_empty() {
                lines.push(String::new());
                continue;
            }
            let words: Vec<&str> = paragraph.split_whitespace().collect();
            if words.is_empty() {
                lines.push(String::new());
                continue;
            }
            let mut current_line = String::new();
            for word in words {
                if current_line.is_empty() {
                    current_line.push_str(word);
                } else {
                    let test_line = format!("{} {}", current_line, word);
                    if measure(&test_line) <= max_width {
                        current_line = test_line;
                    } else {
                        lines.push(current_line);
                        current_line = word.to_string();
                    }
                }
            }
            if !current_line.is_empty() {
                lines.push(current_line);
            }
        }
        lines
    }

    /// Returns effective vertical line spacing when word-wrapping.
    pub fn effective_line_spacing(&self) -> f32 {
        if self.line_spacing > 0.0 {
            self.line_spacing
        } else {
            self.font_size * 1.2
        }
    }

    /// Wraps text using `self.max_width` (or `f32::MAX` if unset) and provided measurement closure.
    pub fn wrap_lines<F>(&self, measure: F) -> Vec<String>
    where
        F: Fn(&str) -> f32,
    {
        let max_w = self.max_width.unwrap_or(f32::MAX);
        self.wrap_lines_with(&self.content, max_w, measure)
    }

    /// Calculates total rendered text height after word-wrapping using macroquad's `measure_text`.
    pub fn wrapped_height(&self) -> f32 {
        let font_ref = self.font.as_ref();
        let font_size = self.font_size;
        let lines = self.wrap_lines(|s| measure_text(s, font_ref, font_size as u16, 1.0).width);
        lines.len() as f32 * self.effective_line_spacing()
    }

    /// Returns `true` if the text reveal animation has finished displaying all characters.
    pub fn is_finished(&self) -> bool {
        self.revealed_chars >= self.full_content.len() as f32
    }

    /// Returns resolved screen-space geometry `(pos, font_size, line_spacing, max_width)`
    /// accounting for current UI scale factor, draw offset, and letterbox viewport origin.
    pub(crate) fn resolved_geometry(&self) -> (Vec2, f32, f32, Option<f32>) {
        let (scale, ui_offset) = get_ui_scale();
        let pos = self.position * scale + get_draw_offset() * scale + ui_offset;
        let font_size = self.font_size * scale;
        let line_spacing = if self.line_spacing > 0.0 {
            self.line_spacing * scale
        } else {
            font_size * 1.2
        };
        let max_width = self.max_width.map(|w| w * scale);
        (pos, font_size, line_spacing, max_width)
    }
}

impl Object for Text {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
        }
        if let RevealMode::Typewriter { chars_per_sec } = self.reveal_mode
            && !self.is_finished()
        {
            self.revealed_chars += chars_per_sec * ctx.time.deltatime();
            let count = (self.revealed_chars as usize).min(self.full_content.len());
            self.content = self
                .full_content
                .char_indices()
                .take(count)
                .last()
                .map(|(i, c)| &self.full_content[..i + c.len_utf8()])
                .unwrap_or("")
                .to_string();
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        let (pos, font_size, line_spacing, max_width) = self.resolved_geometry();

        if let Some(ref bm) = self.bitmap_font {
            let scale_f = font_size / bm.native_size as f32;

            let draw_single_line = |line: &str, base_x: f32, top_y: f32| {
                let dims = bm.measure(line, scale_f);
                let align_offset_x = match self.alignment {
                    TextAlign::Left => 0.0,
                    TextAlign::Center => -dims.x * 0.5,
                    TextAlign::Right => -dims.x,
                };
                let final_x = base_x + align_offset_x;
                if let Some((shadow_color, shadow_offset)) = self.shadow {
                    let (scale, _) = get_ui_scale();
                    bm.draw(
                        line,
                        final_x + shadow_offset.x * scale,
                        top_y + shadow_offset.y * scale,
                        scale_f,
                        shadow_color,
                    );
                }
                bm.draw(line, final_x, top_y, scale_f, self.color);
            };

            if let Some(max_w) = max_width {
                let lines = self.wrap_lines_with(&self.content, max_w, |s| {
                    bm.measure(s, scale_f).x
                });
                for (i, line) in lines.iter().enumerate() {
                    let y = pos.y + (i as f32) * line_spacing;
                    draw_single_line(line, pos.x, y);
                }
            } else {
                draw_single_line(&self.content, pos.x, pos.y);
            }
            return;
        }

        let render_line = |str_val: &str, x: f32, y: f32, color: Color| {
            let rx = x.round();
            let ry = y.round();
            let fs = font_size.round();
            if let Some(ref font) = self.font {
                draw_text_ex(
                    str_val,
                    rx,
                    ry,
                    TextParams {
                        font: Some(font),
                        font_size: fs as u16,
                        color,
                        ..Default::default()
                    },
                );
            } else {
                draw_text(str_val, rx, ry, fs, color);
            }
        };

        let draw_single_line = |line: &str, base_x: f32, top_y: f32| {
            let dims = measure_text(line, self.font.as_ref(), font_size.round() as u16, 1.0);
            let base_y = top_y + font_size * 0.75;
            let width = dims.width;
            let align_offset_x = match self.alignment {
                TextAlign::Left => 0.0,
                TextAlign::Center => -width * 0.5,
                TextAlign::Right => -width,
            };
            let final_x = base_x + align_offset_x;

            if let Some((outline_color, stroke)) = self.outline {
                let s = stroke * (font_size / self.font_size);
                for dx in [-s, 0.0, s] {
                    for dy in [-s, 0.0, s] {
                        if dx != 0.0 || dy != 0.0 {
                            render_line(line, final_x + dx, base_y + dy, outline_color);
                        }
                    }
                }
            }

            if let Some((shadow_color, shadow_offset)) = self.shadow {
                let (scale, _) = get_ui_scale();
                render_line(
                    line,
                    final_x + shadow_offset.x * scale,
                    base_y + shadow_offset.y * scale,
                    shadow_color,
                );
            }

            render_line(line, final_x, base_y, self.color);
        };

        if let Some(max_w) = max_width {
            let font_ref = self.font.as_ref();
            let lines = self.wrap_lines_with(&self.content, max_w, |s| {
                measure_text(s, font_ref, font_size as u16, 1.0).width
            });

            for (i, line) in lines.iter().enumerate() {
                let y = pos.y + (i as f32) * line_spacing;
                draw_single_line(line, pos.x, y);
            }
        } else {
            draw_single_line(&self.content, pos.x, pos.y);
        }
    }

    fn bounds(&self) -> Option<Rect> {
        let (pos, font_size, _line_spacing, max_width) = self.resolved_geometry();
        let h = self.wrapped_height();
        let w = if let Some(mw) = max_width {
            mw
        } else if let Some(ref bm) = self.bitmap_font {
            let scale_f = font_size / bm.native_size as f32;
            bm.measure(&self.content, scale_f).x
        } else {
            measure_text(&self.content, self.font.as_ref(), font_size as u16, 1.0).width
        };
        Some(Rect {
            x: pos.x,
            y: pos.y,
            w,
            h,
        })
    }

    fn is_text_layer(&self) -> bool {
        true
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn set_text(&mut self, text: &str) {
        self.set_text(text);
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn set_position(&mut self, pos: macroquad::math::Vec2) {
        self.position = pos;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn content_height(&self) -> Option<f32> {
        Some(self.position.y + self.wrapped_height())
    }
}

// ---------------------------------------------------------------------------
// TextObject<Data> = Behavior<Text, Data>
// ---------------------------------------------------------------------------

/// Type alias for a text component combined with game data and update closure.
pub type TextObject<Data> = Behavior<Text, Data>;

impl<Data> std::ops::Deref for Behavior<Text, Data> {
    type Target = Text;
    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

// ---------------------------------------------------------------------------
// RichText — BBCode-formatted UI Text with color tags ([color=gold], [color=#HEX], [/color])
// ---------------------------------------------------------------------------

/// A parsed span of text with an associated color.
#[derive(Clone, Debug, PartialEq)]
pub struct TextSpan {
    pub text: String,
    pub color: Color,
}

/// Parses a color string (named color like `gold`, `red`, `blue`, or hex like `#FF5500`).
pub fn parse_color(name_or_hex: &str) -> Option<Color> {
    let s = name_or_hex.trim().to_lowercase();
    if s.starts_with('#') {
        let hex = s.trim_start_matches('#');
        if hex.len() == 6 {
            let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
            let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
            let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
            Some(Color::from_rgba(r, g, b, 255))
        } else if hex.len() == 8 {
            let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
            let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
            let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
            let a = u8::from_str_radix(&hex[6..8], 16).ok()?;
            Some(Color::from_rgba(r, g, b, a))
        } else {
            None
        }
    } else {
        match s.as_str() {
            "gold" => Some(Color::from_rgba(255, 215, 0, 255)),
            "red" => Some(RED),
            "green" => Some(GREEN),
            "blue" => Some(Color::from_rgba(0, 122, 255, 255)),
            "white" => Some(WHITE),
            "black" => Some(Color::from_rgba(0, 0, 0, 255)),
            "yellow" => Some(Color::from_rgba(255, 255, 0, 255)),
            "cyan" => Some(Color::from_rgba(0, 255, 255, 255)),
            "magenta" => Some(Color::from_rgba(255, 0, 255, 255)),
            "gray" | "grey" => Some(GRAY),
            "lightgray" | "lightgrey" => Some(LIGHTGRAY),
            "orange" => Some(Color::from_rgba(255, 165, 0, 255)),
            "purple" => Some(Color::from_rgba(128, 0, 128, 255)),
            "pink" => Some(Color::from_rgba(255, 192, 203, 255)),
            "brown" => Some(Color::from_rgba(165, 42, 42, 255)),
            _ => None,
        }
    }
}

/// Parses a BBCode string containing `[color=...]` and `[/color]` tags into a sequence of [`TextSpan`]s.
pub fn parse_rich_text(content: &str, default_color: Color) -> Vec<TextSpan> {
    let mut spans = Vec::new();
    let mut color_stack = vec![default_color];
    let mut current_text = String::new();

    let mut rest = content;

    while !rest.is_empty() {
        if let Some(tag_start) = rest.find('[') {
            if tag_start > 0 {
                current_text.push_str(&rest[..tag_start]);
            }

            let after_bracket = &rest[tag_start..];
            if let Some(tag_end) = after_bracket.find(']') {
                let tag_content = &after_bracket[1..tag_end];
                let full_tag_len = tag_end + 1;

                let tag_lower = tag_content.to_lowercase();
                if tag_lower == "/color" {
                    if !current_text.is_empty() {
                        let active_color = *color_stack.last().unwrap_or(&default_color);
                        spans.push(TextSpan {
                            text: current_text.clone(),
                            color: active_color,
                        });
                        current_text.clear();
                    }
                    if color_stack.len() > 1 {
                        color_stack.pop();
                    }
                    rest = &after_bracket[full_tag_len..];
                    continue;
                } else if tag_lower.starts_with("color=") {
                    let color_spec = &tag_content[6..];
                    if let Some(c) = parse_color(color_spec) {
                        if !current_text.is_empty() {
                            let active_color = *color_stack.last().unwrap_or(&default_color);
                            spans.push(TextSpan {
                                text: current_text.clone(),
                                color: active_color,
                            });
                            current_text.clear();
                        }
                        color_stack.push(c);
                        rest = &after_bracket[full_tag_len..];
                        continue;
                    }
                }
            }

            current_text.push('[');
            rest = &rest[tag_start + 1..];
        } else {
            current_text.push_str(rest);
            break;
        }
    }

    if !current_text.is_empty() {
        let active_color = *color_stack.last().unwrap_or(&default_color);
        spans.push(TextSpan {
            text: current_text,
            color: active_color,
        });
    }

    spans
}

/// Helper function to create a [`RichText`] component.
pub fn rich_text(content: impl Into<String>, position: Vec2, font_size: f32) -> RichText {
    RichText::new(content, position, font_size)
}

/// UI RichText component supporting BBCode color tags (`[color=gold]...[/color]`).
pub struct RichText {
    pub content: String,
    pub position: Vec2,
    pub font_size: f32,
    pub font: Option<Font>,
    pub default_color: Color,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    pub max_width: Option<f32>,
    pub line_spacing: f32,
    pub align: TextAlign,
    /// Optional pre-baked pixel-art bitmap font.
    pub bitmap_font: Option<std::rc::Rc<crate::bitmap_font::BitmapFont>>,
}

impl RichText {
    /// Creates a new [`RichText`] component with BBCode markup support.
    pub fn new(content: impl Into<String>, position: Vec2, font_size: f32) -> Self {
        Self {
            content: content.into(),
            position,
            font_size,
            font: None,
            default_color: WHITE,
            tag: String::new(),
            visible: true,
            active: true,
            max_width: None,
            line_spacing: 0.0,
            align: TextAlign::Left,
            bitmap_font: None,
        }
    }

    /// Builder pattern: Attaches a pre-baked [`BitmapFont`] atlas for 100% crisp pixel font rendering.
    pub fn with_bitmap_font(mut self, bitmap_font: std::rc::Rc<crate::bitmap_font::BitmapFont>) -> Self {
        self.bitmap_font = Some(bitmap_font);
        self
    }

    /// Builder pattern: Sets base default color.
    pub fn with_color(mut self, color: Color) -> Self {
        self.default_color = color;
        self
    }

    /// Builder pattern: Sets custom font.
    pub fn with_font(mut self, font: Font) -> Self {
        self.font = Some(font);
        self
    }

    /// Builder pattern: Sets a font loaded in asset manager by name (automatically selects [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas if loaded, otherwise falls back to TTF [`Font`]).
    pub fn with_font_from_assets(
        mut self,
        assets: &crate::asset_manager::Assets,
        name: &str,
    ) -> Self {
        if let Some(bm) = assets.get_bitmap_font(name) {
            self.bitmap_font = Some(bm);
        } else if let Some(font) = assets.get_font(name) {
            self.font = Some(font.clone());
        }
        self
    }

    /// Builder pattern: Attaches a pre-baked [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas loaded in asset manager by name.
    pub fn with_bitmap_font_from_assets(
        mut self,
        assets: &crate::asset_manager::Assets,
        name: &str,
    ) -> Self {
        if let Some(bm) = assets.get_bitmap_font(name) {
            self.bitmap_font = Some(bm);
        }
        self
    }

    /// Builder pattern: Sets tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Sets maximum width for word wrapping.
    pub fn with_max_width(mut self, width: f32) -> Self {
        self.max_width = Some(width);
        self
    }

    /// Builder pattern: Sets vertical line spacing.
    pub fn with_line_spacing(mut self, spacing: f32) -> Self {
        self.line_spacing = spacing;
        self
    }

    /// Builder pattern: Sets text alignment.
    pub fn with_align(mut self, align: TextAlign) -> Self {
        self.align = align;
        self
    }

    /// Builder pattern: Sets hidden.
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets deactivated.
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets deactivated (alias).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Sets content text.
    pub fn set_text(&mut self, text: &str) {
        self.content = text.to_string();
    }

    /// Parses text spans for this component using current `content` and `default_color`.
    pub fn parse_spans(&self) -> Vec<TextSpan> {
        parse_rich_text(&self.content, self.default_color)
    }

    /// Returns resolved screen geometry `(pos, font_size, line_spacing, max_width)`.
    pub(crate) fn resolved_geometry(&self) -> (Vec2, f32, f32, Option<f32>) {
        let (scale, ui_offset) = get_ui_scale();
        let pos = self.position * scale + get_draw_offset() * scale + ui_offset;
        let font_size = self.font_size * scale;
        let line_spacing = if self.line_spacing > 0.0 {
            self.line_spacing * scale
        } else {
            font_size * 1.2
        };
        let max_width = self.max_width.map(|w| w * scale);
        (pos, font_size, line_spacing, max_width)
    }

    /// Helper to wrap lines with measurement closure.
    pub fn wrap_lines_with<F>(&self, text: &str, max_width: f32, measure: F) -> Vec<String>
    where
        F: Fn(&str) -> f32,
    {
        let mut lines = Vec::new();
        for paragraph in text.split('\n') {
            if paragraph.is_empty() {
                lines.push(String::new());
                continue;
            }
            let words: Vec<&str> = paragraph.split_whitespace().collect();
            if words.is_empty() {
                lines.push(String::new());
                continue;
            }
            let mut current_line = String::new();
            for word in words {
                if current_line.is_empty() {
                    current_line.push_str(word);
                } else {
                    let test_line = format!("{} {}", current_line, word);
                    if measure(&test_line) <= max_width {
                        current_line = test_line;
                    } else {
                        lines.push(current_line);
                        current_line = word.to_string();
                    }
                }
            }
            if !current_line.is_empty() {
                lines.push(current_line);
            }
        }
        lines
    }
}

impl Object for RichText {
    fn update(&mut self, _ctx: &mut Context) {}

    fn draw(&self) {
        if !self.visible {
            return;
        }

        let (pos, font_size, line_spacing, max_width) = self.resolved_geometry();
        let font_ref = self.font.as_ref();
        let spans = self.parse_spans();

        struct RichWord {
            text: String,
            color: Color,
            width: f32,
        }

        let space_w = if let Some(ref bm) = self.bitmap_font {
            let scale_f = font_size / bm.native_size as f32;
            bm.measure(" ", scale_f).x
        } else {
            measure_text(" ", font_ref, font_size as u16, 1.0).width
        };

        let mut words = Vec::new();
        for span in &spans {
            let paragraph_parts: Vec<&str> = span.text.split('\n').collect();
            for (p_idx, p_str) in paragraph_parts.iter().enumerate() {
                if p_idx > 0 {
                    words.push(RichWord {
                        text: "\n".to_string(),
                        color: span.color,
                        width: 0.0,
                    });
                }
                for w in p_str.split_whitespace() {
                    let w_width = if let Some(ref bm) = self.bitmap_font {
                        let scale_f = font_size / bm.native_size as f32;
                        bm.measure(w, scale_f).x
                    } else {
                        measure_text(w, font_ref, font_size as u16, 1.0).width
                    };
                    words.push(RichWord {
                        text: w.to_string(),
                        color: span.color,
                        width: w_width,
                    });
                }
            }
        }

        struct LineWord {
            text: String,
            color: Color,
            x_offset: f32,
        }

        struct FormattedLine {
            words: Vec<LineWord>,
            total_width: f32,
        }

        let mut lines: Vec<FormattedLine> = Vec::new();
        let mut current_line = FormattedLine {
            words: Vec::new(),
            total_width: 0.0,
        };

        let max_w = max_width.unwrap_or(f32::MAX);

        for word in words {
            if word.text == "\n" {
                lines.push(current_line);
                current_line = FormattedLine {
                    words: Vec::new(),
                    total_width: 0.0,
                };
                continue;
            }

            let word_w = word.width;
            let space_needed = if current_line.words.is_empty() {
                0.0
            } else {
                space_w
            };

            if !current_line.words.is_empty() && current_line.total_width + space_needed + word_w > max_w {
                lines.push(current_line);
                current_line = FormattedLine {
                    words: Vec::new(),
                    total_width: 0.0,
                };
            }

            let x_pos = if current_line.words.is_empty() {
                0.0
            } else {
                current_line.total_width + space_w
            };

            current_line.words.push(LineWord {
                text: word.text,
                color: word.color,
                x_offset: x_pos,
            });
            current_line.total_width = x_pos + word_w;
        }

        lines.push(current_line);

        for (line_idx, line) in lines.iter().enumerate() {
            let y = pos.y + (line_idx as f32) * line_spacing;

            let align_offset_x = match self.align {
                TextAlign::Left => 0.0,
                TextAlign::Center => -line.total_width * 0.5,
                TextAlign::Right => -line.total_width,
            };

            let base_x = pos.x + align_offset_x;

            for word in &line.words {
                let word_x = base_x + word.x_offset;
                if let Some(ref bm) = self.bitmap_font {
                    let scale_f = font_size / bm.native_size as f32;
                    bm.draw(&word.text, word_x, y, scale_f, word.color);
                } else {
                    let text_params = TextParams {
                        font: font_ref,
                        font_size: font_size as u16,
                        color: word.color,
                        ..Default::default()
                    };
                    draw_text_ex(&word.text, word_x, y, text_params);
                }
            }
        }
    }

    fn is_text_layer(&self) -> bool {
        true
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn set_text(&mut self, text: &str) {
        self.set_text(text);
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn set_position(&mut self, pos: Vec2) {
        self.position = pos;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }
}

impl Clickable for RichText {
    fn click_rect(&self) -> Rect {
        let (pos, font_size, line_spacing, max_width) = self.resolved_geometry();
        let font_ref = self.font.as_ref();
        let spans = self.parse_spans();
        let full_plain_text: String = spans.into_iter().map(|s| s.text).collect();

        let lines = self.wrap_lines_with(&full_plain_text, max_width.unwrap_or(f32::MAX), |s| {
            measure_text(s, font_ref, font_size as u16, 1.0).width
        });

        let mut max_w: f32 = 0.0;
        for line in &lines {
            let w = measure_text(line, font_ref, font_size as u16, 1.0).width;
            if w > max_w {
                max_w = w;
            }
        }

        let total_h = (lines.len().max(1) as f32) * line_spacing;

        let align_offset_x = match self.align {
            TextAlign::Left => 0.0,
            TextAlign::Center => -max_w * 0.5,
            TextAlign::Right => -max_w,
        };

        Rect {
            x: pos.x + align_offset_x,
            y: pos.y - font_size * 0.8,
            w: max_w,
            h: total_h,
        }
    }

    fn is_active(&self) -> bool {
        self.active
    }
}

/// Type alias for a rich text component combined with game data and update closure.
pub type RichTextObject<Data> = Behavior<RichText, Data>;

impl<Data> std::ops::Deref for Behavior<RichText, Data> {
    type Target = RichText;
    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl<Data> std::ops::DerefMut for Behavior<Text, Data> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.inner
    }
}

// ---------------------------------------------------------------------------
// Button — Interactive UI button
// ---------------------------------------------------------------------------

/// Interactive UI button component.
#[allow(clippy::type_complexity)]
pub struct Button {
    pub position: Vec2,
    pub size: Vec2,
    pub label: String,
    pub font_size: f32,
    pub font: Option<Font>,
    pub color: Color,
    pub hover_color: Color,
    pub text_color: Color,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    pub on_click: Option<Box<dyn FnMut(&mut Context)>>,
    pub hover_sound: Option<String>,
    pub click_sound: Option<String>,
    pub hover_scale: f32,
    pub padding: Padding,
    pub margin: Margin,
    was_hovered: bool,
    /// Optional pre-baked pixel-art bitmap font.
    pub bitmap_font: Option<std::rc::Rc<crate::bitmap_font::BitmapFont>>,
}

impl Button {
    /// Creates a new UI [`Button`].
    pub fn new(position: Vec2, size: Vec2, label: impl Into<String>) -> Self {
        Self {
            position,
            size,
            label: label.into(),
            font_size: 20.0,
            font: None,
            color: GRAY,
            hover_color: LIGHTGRAY,
            text_color: WHITE,
            tag: String::new(),
            visible: true,
            active: true,
            on_click: None,
            hover_sound: None,
            click_sound: None,
            hover_scale: 1.0,
            padding: Padding::default(),
            margin: Margin::default(),
            was_hovered: false,
            bitmap_font: None,
        }
    }

    /// Builder pattern: Attaches a pre-baked [`BitmapFont`] atlas for 100% crisp pixel font rendering.
    pub fn with_bitmap_font(mut self, bitmap_font: std::rc::Rc<crate::bitmap_font::BitmapFont>) -> Self {
        self.bitmap_font = Some(bitmap_font);
        self
    }

    /// Builder pattern: Sets a font loaded in asset manager by name (automatically selects [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas if loaded, otherwise falls back to TTF [`Font`]).
    pub fn with_font_from_assets(
        mut self,
        assets: &crate::asset_manager::Assets,
        name: &str,
    ) -> Self {
        if let Some(bm) = assets.get_bitmap_font(name) {
            self.bitmap_font = Some(bm);
        } else if let Some(font) = assets.get_font(name) {
            self.font = Some(font.clone());
        }
        self
    }

    /// Builder pattern: Attaches a pre-baked [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas loaded in asset manager by name.
    pub fn with_bitmap_font_from_assets(
        mut self,
        assets: &crate::asset_manager::Assets,
        name: &str,
    ) -> Self {
        if let Some(bm) = assets.get_bitmap_font(name) {
            self.bitmap_font = Some(bm);
        }
        self
    }

    /// Builder pattern: Attaches an `on_click` callback closure executed when button is pressed.
    pub fn on_click<F: FnMut(&mut Context) + 'static>(mut self, callback: F) -> Self {
        self.on_click = Some(Box::new(callback));
        self
    }

    /// Builder pattern: Attaches sound effect names played from `ctx.audio` on hover and click.
    pub fn with_sounds(mut self, hover_sfx: impl Into<String>, click_sfx: impl Into<String>) -> Self {
        self.hover_sound = Some(hover_sfx.into());
        self.click_sound = Some(click_sfx.into());
        self
    }

    /// Builder pattern: Sets hover scale multiplier (e.g. `1.05` for 5% zoom on hover).
    pub fn with_hover_scale(mut self, scale: f32) -> Self {
        self.hover_scale = scale;
        self
    }

    /// Builder pattern: Sets internal padding.
    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self
    }

    /// Builder pattern: Sets external margin.
    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Sets a custom TTF font for button label.
    pub fn with_font(mut self, font: Font) -> Self {
        self.font = Some(font);
        self
    }

    /// Builder pattern: Sets button component to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets button component to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets button component to deactivated (`active = false`) (alias for [`deactivated`](Button::deactivated)).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead (typo fix)")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Builder pattern: Sets button visibility.
    pub fn with_visible(mut self, visible: bool) -> Self {
        self.visible = visible;
        self
    }

    /// Builder pattern: Sets button active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Returns `true` if button is visible.
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Returns `true` if button is active.
    pub fn is_active(&self) -> bool {
        self.active
    }

    /// Returns the bounding rectangle of the button.
    pub fn rect(&self) -> Rect {
        Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        }
    }
}

impl Clickable for Button {
    fn click_rect(&self) -> Rect {
        self.rect()
    }
    fn is_active(&self) -> bool {
        self.active
    }
}

impl Object for Button {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active || !self.visible {
            return;
        }

        let is_currently_hovered = self.is_hovered_ui(ctx) || self.is_hovered_ctx(ctx);
        if is_currently_hovered && !self.was_hovered && let Some(ref sound) = self.hover_sound {
            ctx.audio.play(&ctx.assets, sound);
        }
        self.was_hovered = is_currently_hovered;

        let mouse_clicked = is_mouse_button_pressed(MouseButton::Left)
            || ctx.input.is_mouse_button_pressed(macroquad::input::MouseButton::Left);
        if is_currently_hovered && mouse_clicked {
            if let Some(ref sound) = self.click_sound {
                ctx.audio.play(&ctx.assets, sound);
            }
            if let Some(ref mut callback) = self.on_click {
                (callback)(ctx);
            }
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        let pos = self.position + get_draw_offset();
        let hovered = self.is_hovered();
        let bg_color = if hovered {
            self.hover_color
        } else {
            self.color
        };

        let current_size = if hovered && self.hover_scale != 1.0 {
            self.size * self.hover_scale
        } else {
            self.size
        };

        let draw_pos = if hovered && self.hover_scale != 1.0 {
            pos - (current_size - self.size) * 0.5
        } else {
            pos
        };

        draw_rectangle(draw_pos.x, draw_pos.y, current_size.x, current_size.y, bg_color);

        if let Some(ref bm) = self.bitmap_font {
            let scale_f = self.font_size / bm.native_size as f32;
            let text_dims = bm.measure(&self.label, scale_f);
            let tx = draw_pos.x + (current_size.x - text_dims.x) * 0.5;
            let ty = draw_pos.y + (current_size.y - text_dims.y) * 0.5;
            bm.draw(&self.label, tx, ty, scale_f, self.text_color);
        } else {
            let text_dims = measure_text(&self.label, self.font.as_ref(), self.font_size as u16, 1.0);
            let tx = draw_pos.x + (current_size.x - text_dims.width) * 0.5;
            let ty = draw_pos.y + (current_size.y + text_dims.height) * 0.5 - 2.0;

            if let Some(ref font) = self.font {
                draw_text_ex(
                    &self.label,
                    tx,
                    ty,
                    TextParams {
                        font: Some(font),
                        font_size: self.font_size as u16,
                        color: self.text_color,
                        ..Default::default()
                    },
                );
            } else {
                draw_text(&self.label, tx, ty, self.font_size, self.text_color);
            }
        }
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn set_position(&mut self, pos: macroquad::math::Vec2) {
        self.position = pos;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn bounds(&self) -> Option<Rect> {
        Some(self.rect())
    }
}

// ---------------------------------------------------------------------------
// ProgressBar — Progress bar UI component
// ---------------------------------------------------------------------------

/// Visual UI progress bar component supporting optional data binding via [`Context::state`](crate::engine::Context::state).
pub struct ProgressBar {
    pub position: Vec2,
    pub size: Vec2,
    pub progress: f32,
    pub bg_color: Color,
    pub fill_color: Color,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    /// Optional key entry in [`Context::state`](crate::engine::Context::state) (`f64` between 0.0 and 1.0) for automatic progress updates.
    pub state_binding: Option<String>,
    pub target_progress: f32,
    pub smooth_lerp_speed: f32,
    pub label: Option<String>,
    pub show_percentage: bool,
    pub padding: Padding,
    pub margin: Margin,
}

impl ProgressBar {
    /// Creates a new [`ProgressBar`].
    pub fn new(position: Vec2, size: Vec2, progress: f32) -> Self {
        let p = progress.clamp(0.0, 1.0);
        Self {
            position,
            size,
            progress: p,
            bg_color: RED,
            fill_color: GREEN,
            tag: String::new(),
            visible: true,
            active: true,
            state_binding: None,
            target_progress: p,
            smooth_lerp_speed: 0.0,
            label: None,
            show_percentage: false,
            padding: Padding::default(),
            margin: Margin::default(),
        }
    }

    /// Builder pattern: Enables smooth lerp transition when progress value changes.
    pub fn with_smooth_lerp(mut self, speed: f32) -> Self {
        self.smooth_lerp_speed = speed;
        self
    }

    /// Builder pattern: Sets text label displayed on top of progress bar.
    pub fn with_label(mut self, label: impl Into<String>) -> Self {
        self.label = Some(label.into());
        self
    }

    /// Builder pattern: Displays percentage value text on top of progress bar.
    pub fn with_percentage_text(mut self) -> Self {
        self.show_percentage = true;
        self
    }

    /// Builder pattern: Sets internal padding.
    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self
    }

    /// Builder pattern: Sets external margin.
    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self
    }

    /// Builder pattern: Sets background and fill colors.
    pub fn with_colors(mut self, bg_color: Color, fill_color: Color) -> Self {
        self.bg_color = bg_color;
        self.fill_color = fill_color;
        self
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
        self
    }

    /// Builder pattern: Sets progress bar to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets progress bar to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets progress bar to deactivated (`active = false`) (alias for [`deactivated`](ProgressBar::deactivated)).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead (typo fix)")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Builder pattern: Sets progress bar visibility.
    pub fn with_visible(mut self, visible: bool) -> Self {
        self.visible = visible;
        self
    }

    /// Builder pattern: Sets progress bar active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Returns `true` if progress bar is visible.
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Returns `true` if progress bar is active.
    pub fn is_active(&self) -> bool {
        self.active
    }

    /// Binds progress ratio to a float entry in [`Context::state`](crate::engine::Context::state).
    pub fn with_state_binding(mut self, state_key: &str) -> Self {
        self.state_binding = Some(state_key.to_string());
        self
    }

    /// Sets progress ratio (`0.0` .. `1.0`).
    pub fn set_progress(&mut self, progress: f32) {
        let p = progress.clamp(0.0, 1.0);
        if self.smooth_lerp_speed > 0.0 {
            self.target_progress = p;
        } else {
            self.progress = p;
            self.target_progress = p;
        }
    }
}

impl Object for ProgressBar {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
        }
        if let Some(key) = &self.state_binding
            && ctx.state.has_flag(key)
        {
            let val = ctx.state.get_float(key) as f32;
            self.set_progress(val);
        }

        if self.smooth_lerp_speed > 0.0 {
            let dt = ctx.time.deltatime();
            self.progress += (self.target_progress - self.progress) * (self.smooth_lerp_speed * dt).min(1.0);
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        let pos = self.position + get_draw_offset();
        draw_rectangle(pos.x, pos.y, self.size.x, self.size.y, self.bg_color);
        let fill_w = self.size.x * self.progress;
        if fill_w > 0.0 {
            draw_rectangle(pos.x, pos.y, fill_w, self.size.y, self.fill_color);
        }

        let display_text = if let Some(ref l) = self.label {
            Some(l.clone())
        } else if self.show_percentage {
            Some(format!("{:.0}%", self.progress * 100.0))
        } else {
            None
        };

        if let Some(text_str) = display_text {
            let font_sz = (self.size.y * 0.7).max(10.0);
            let dims = measure_text(&text_str, None, font_sz as u16, 1.0);
            let tx = pos.x + (self.size.x - dims.width) * 0.5;
            let ty = pos.y + (self.size.y + dims.offset_y) * 0.5;
            draw_text(&text_str, tx, ty, font_sz, WHITE);
        }
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn set_position(&mut self, pos: macroquad::math::Vec2) {
        self.position = pos;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }
}

// ---------------------------------------------------------------------------
// Image — UI Image component for rendering textures/pictures in screen-space
// ---------------------------------------------------------------------------

/// UI Image component for displaying static or loaded textures in screen-space.
///
/// Implements [`Object`] + [`Clickable`].
///
/// # Example
/// ```ignore
/// let logo = Image::from_assets(assets, "logo", vec2(20.0, 20.0), vec2(128.0, 128.0))
///     .unwrap()
///     .align_to_screen(UIAnchor::TopRight, vec2(20.0, 20.0));
/// ```
pub struct Image {
    pub position: Vec2,
    pub size: Vec2,
    pub texture: Texture2D,
    pub tint: Color,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    /// Whether the image automatically resizes to match screen width & height each frame.
    pub auto_screen_size: bool,
    /// Margin padding applied when `auto_screen_size` is enabled.
    pub screen_padding: f32,
    /// Optional screen anchor alignment preset and padding for dynamic re-alignment.
    pub anchor: Option<(UIAnchor, Padding)>,
    /// Child UI components rendered inside this image container.
    pub children: Vec<Box<dyn Object>>,
    /// Optional 9-slice corner margins (left, top, right, bottom) for stretch-resistant border rendering.
    pub nine_slice_margins: Option<(f32, f32, f32, f32)>,
    /// Whether this image expands to fill its parent container.
    pub fill_parent: bool,
}

impl Image {
    /// Creates a new UI [`Image`] at `(0, 0)` with size defaulting to native texture dimensions (`tex.width()` × `tex.height()`).
    pub fn new(texture: Texture2D) -> Self {
        let size = vec2(texture.width(), texture.height());
        Self::new_with_size(Vec2::ZERO, size, texture)
    }

    /// Creates a new UI [`Image`] with explicit position and size.
    pub fn new_with_size(position: Vec2, size: Vec2, texture: Texture2D) -> Self {
        Self {
            position,
            size,
            texture,
            tint: WHITE,
            tag: String::new(),
            visible: true,
            active: true,
            auto_screen_size: false,
            screen_padding: 0.0,
            anchor: None,
            children: Vec::new(),
            fill_parent: false,
            nine_slice_margins: None,
        }
    }

    /// Builder pattern: Configures 9-slice rendering with corner margins `(left, top, right, bottom)` to preserve rounded corners.
    pub fn with_nine_slice(mut self, left: f32, top: f32, right: f32, bottom: f32) -> Self {
        self.nine_slice_margins = Some((left, top, right, bottom));
        self
    }

    /// Builder pattern: Enables expanding size to fill parent container bounds.
    pub fn fill_parent(mut self) -> Self {
        self.fill_parent = true;
        self
    }

    /// Builder pattern: Adds a child UI widget positioned relative to this image (centered by default).
    pub fn child<O: IntoUIObject>(mut self, child: O) -> Self {
        self.children.push(child.into_ui_box());
        self
    }

    /// Factory: Loads texture from asset manager by name. Defaults to native texture size at `(0, 0)`.
    pub fn from_assets(
        assets: &crate::asset_manager::Assets,
        name: &str,
    ) -> Option<Self> {
        assets
            .get_texture(name)
            .map(|tex| Self::new(tex.clone()))
    }

    /// Factory: Loads texture from asset manager by name with explicit position and size.
    pub fn from_assets_size(
        assets: &crate::asset_manager::Assets,
        name: &str,
        position: Vec2,
        size: Vec2,
    ) -> Option<Self> {
        assets
            .get_texture(name)
            .map(|tex| Self::new_with_size(position, size, tex.clone()))
    }

    /// Builder pattern: Sets explicit image position `(x, y)`.
    pub fn with_position(mut self, position: Vec2) -> Self {
        self.position = position;
        self
    }

    /// Builder pattern: Sets explicit image size `(width, height)`.
    pub fn with_size(mut self, size: Vec2) -> Self {
        self.size = size;
        self
    }

    /// Builder pattern: Resizes and positions image to cover the full screen (`screen_width()` × `screen_height()`).
    pub fn fullscreen(mut self) -> Self {
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        self.position = Vec2::ZERO;
        self.size = vec2(sw, sh);
        self.auto_screen_size = true;
        self.screen_padding = 0.0;
        self
    }

    /// Builder pattern: Positions and resizes image to fit screen with uniform padding margin (works for 4K, 2K, 1080p).
    pub fn fit_to_screen_padding(mut self, padding: f32) -> Self {
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        self.position = vec2(padding, padding);
        self.size = vec2((sw - padding * 2.0).max(10.0), (sh - padding * 2.0).max(10.0));
        self.auto_screen_size = true;
        self.screen_padding = padding;
        self
    }

    /// Builder pattern: Enables or disables automatic per-frame screen dimension tracking.
    pub fn with_auto_screen_size(mut self, enabled: bool) -> Self {
        self.auto_screen_size = enabled;
        self
    }

    /// Builder pattern: Sets the tint color applied when rendering the texture.
    pub fn with_tint(mut self, tint: Color) -> Self {
        self.tint = tint;
        self
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Centers image on screen.
    pub fn center_on_screen(mut self) -> Self {
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        self.position = vec2((sw - self.size.x) * 0.5, (sh - self.size.y) * 0.5);
        self
    }

    /// Builder pattern: Aligns image position on screen using a [`UIAnchor`] preset and padding.
    pub fn align_to_screen(mut self, anchor: UIAnchor, padding: impl Into<Padding>) -> Self {
        let pad = padding.into();
        self.position = anchor.compute_position(self.size, pad);
        self.anchor = Some((anchor, pad));
        self
    }

    /// Builder pattern: Sets image component to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets image component to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets image component to deactivated (`active = false`) (alias for [`deactivated`](Image::deactivated)).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead (typo fix)")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Builder pattern: Sets visibility.
    pub fn with_visible(mut self, visible: bool) -> Self {
        self.visible = visible;
        self
    }

    /// Builder pattern: Sets active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Returns `true` if image is visible.
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Returns `true` if image is active.
    pub fn is_active(&self) -> bool {
        self.active
    }
}

impl Clickable for Image {
    fn click_rect(&self) -> Rect {
        Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        }
    }
    fn is_active(&self) -> bool {
        self.active
    }
}

impl Object for Image {
    fn update(&mut self, ctx: &mut Context) {
        if let Some((anchor, pad)) = self.anchor {
            self.position = anchor.compute_position(self.size, pad);
        } else if self.auto_screen_size {
            let sw = safe_screen_width();
            let sh = safe_screen_height();
            self.position = vec2(self.screen_padding, self.screen_padding);
            self.size = vec2((sw - self.screen_padding * 2.0).max(10.0), (sh - self.screen_padding * 2.0).max(10.0));
        }
        for child in &mut self.children {
            if child.is_fill_parent() {
                child.set_size(self.size);
            }
            let child_size = child.bounds().map(|b| vec2(b.w, b.h)).unwrap_or(Vec2::ZERO);
            let offset = (self.size - child_size) * 0.5;
            child.set_position(self.position + offset);
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        let pos = (self.position + get_draw_offset()).round();
        if let Some(margins) = self.nine_slice_margins {
            draw_nine_slice(&self.texture, pos, self.size, margins, self.tint);
        } else {
            draw_texture_ex(
                &self.texture,
                pos.x,
                pos.y,
                self.tint,
                DrawTextureParams {
                    source: Some(Rect::new(0.0, 0.0, self.texture.width(), self.texture.height())),
                    dest_size: Some(self.size),
                    ..Default::default()
                },
            );
        }
        for child in &self.children {
            child.draw();
        }
    }

    fn set_position(&mut self, pos: Vec2) {
        self.position = pos;
    }

    fn set_size(&mut self, size: Vec2) {
        self.size = size;
    }

    fn is_fill_parent(&self) -> bool {
        self.fill_parent
    }

    fn set_fill_parent(&mut self, fill: bool) {
        self.fill_parent = fill;
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn bounds(&self) -> Option<Rect> {
        Some(Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        })
    }
}

// ---------------------------------------------------------------------------
// ImageObject<Data> = Behavior<Image, Data>
// ---------------------------------------------------------------------------

/// Type alias for an image component combined with game data and update closure.
pub type ImageObject<Data> = Behavior<Image, Data>;

impl<Data> std::ops::Deref for Behavior<Image, Data> {
    type Target = Image;
    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl<Data> std::ops::DerefMut for Behavior<Image, Data> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.inner
    }
}

// ---------------------------------------------------------------------------
// Panel — General UI container with Draggable + z-order support
// ---------------------------------------------------------------------------

/// General UI container holding position, size, background styling, and child components (`Vec<Box<dyn Object>>`).
/// Implements [`Object`] + [`Clickable`] + [`Draggable`].
///
/// # Example
/// ```ignore
/// let mut panel = Panel::new(vec2(100.0, 100.0), vec2(300.0, 200.0))
///     .with_tag("inventory")
///     .with_background(Color::from_rgba(20, 20, 30, 200));
/// panel.add_child(Box::new(Text::new("Inventory", vec2(10.0, 30.0), 20.0, WHITE)));
/// ```
pub struct Panel {
    pub position: Vec2,
    pub size: Vec2,
    pub background_color: Color,
    pub background_texture: Option<Texture2D>,
    pub texture_tint: Color,
    pub border_color: Option<Color>,
    pub border_width: f32,
    pub children: Vec<Box<dyn Object>>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    pub drag: DragState,
    /// Vertical scroll offset subtracted from child rendering positions via 2D camera translation.
    ///
    /// ⚠️ **Known Limitation**: Scrolling is visual via 2D camera offset. Interactive controls (e.g. [`Button`])
    /// inside a scrolled panel with non-zero `scroll_offset` will have unshifted hit-testing bounds.
    /// Recommended primarily for display content (text logs, document viewers, file lists).
    pub scroll_offset: Vec2,
    /// Target scroll offset for smooth frame-by-frame interpolation.
    pub target_scroll_offset: Vec2,
    /// Whether to enable smooth frame-by-frame lerp scrolling. Defaults to `true`.
    pub smooth_scroll: bool,
    /// Whether to clip children rendering to panel bounds via scissor test. Defaults to `true`.
    pub clip_content: bool,
    /// Optional total content height for clamping scroll offset. `None` = unlimited scroll.
    pub content_height: Option<f32>,
    /// Whether the panel automatically resizes to match screen dimensions each frame.
    pub auto_screen_size: bool,
    /// Margin padding applied when `auto_screen_size` is enabled.
    pub screen_padding: f32,
    /// Whether the panel can be dragged by the user.
    ///
    /// # Deprecated
    /// Use [`panel_manager::PanelManager`](crate::panel_manager::PanelManager) for draggable
    /// desktop windows instead. `ui::Panel` is intended as a **static grouping container**
    /// for children inside a window, not as an independently moveable window itself.
    #[deprecated(
        since = "0.1.0",
        note = "Use panel_manager::PanelManager for draggable desktop windows. ui::Panel is a static grouping container."
    )]
    pub draggable: bool,
    pub nine_slice_margins: Option<(f32, f32, f32, f32)>,
    pub padding: Padding,
    pub margin: Margin,
}

#[allow(deprecated)]
impl Panel {
    /// Creates a new [`Panel`] with default styling and dragging enabled.
    pub fn new(position: Vec2, size: Vec2) -> Self {
        Self {
            position,
            size,
            background_color: Color::from_rgba(30, 30, 40, 220),
            background_texture: None,
            texture_tint: WHITE,
            border_color: Some(Color::from_rgba(80, 80, 100, 255)),
            border_width: 1.5,
            children: Vec::new(),
            tag: String::new(),
            visible: true,
            active: true,
            drag: DragState::new(),
            scroll_offset: Vec2::ZERO,
            target_scroll_offset: Vec2::ZERO,
            smooth_scroll: true,
            clip_content: true,
            content_height: None,
            auto_screen_size: false,
            screen_padding: 0.0,
            draggable: true,
            nine_slice_margins: None,
            padding: Padding::default(),
            margin: Margin::default(),
        }
    }

    /// Builder pattern: Enables 9-patch Nine-Slice texture rendering for frame background.
    pub fn with_nine_slice(mut self, texture: Texture2D, margins: (f32, f32, f32, f32)) -> Self {
        self.background_texture = Some(texture);
        self.nine_slice_margins = Some(margins);
        self
    }

    /// Builder pattern: Sets internal padding.
    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self
    }

    /// Builder pattern: Sets external margin.
    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self
    }

    /// Fluent builder: Adds a new [`Text`] component to panel children.
    pub fn add_text(mut self, text: impl Into<String>, pos: Vec2, font_size: f32, color: Color) -> Self {
        self.children.push(Box::new(Text::new(text, pos, font_size, color)));
        self
    }

    /// Fluent builder: Adds a new [`Button`] component to panel children.
    pub fn add_button(mut self, pos: Vec2, size: Vec2, label: impl Into<String>) -> Self {
        self.children.push(Box::new(Button::new(pos, size, label)));
        self
    }

    /// Fluent builder: Adds a new [`Image`] component to panel children.
    pub fn add_image(mut self, pos: Vec2, size: Vec2, texture: Texture2D) -> Self {
        self.children.push(Box::new(Image::new(texture).with_position(pos).with_size(size)));
        self
    }

    /// Builder pattern: Resizes and positions panel to cover the full screen (`screen_width()` × `screen_height()`).
    pub fn fullscreen(mut self) -> Self {
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        self.position = Vec2::ZERO;
        self.size = vec2(sw, sh);
        self.auto_screen_size = true;
        self.screen_padding = 0.0;
        self
    }

    /// Builder pattern: Positions and resizes panel to fit screen with uniform padding margin (works for 4K, 2K, 1080p).
    pub fn fit_to_screen_padding(mut self, padding: f32) -> Self {
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        self.position = vec2(padding, padding);
        self.size = vec2((sw - padding * 2.0).max(10.0), (sh - padding * 2.0).max(10.0));
        self.auto_screen_size = true;
        self.screen_padding = padding;
        self
    }

    /// Builder pattern: Centers panel on screen.
    pub fn center_on_screen(mut self) -> Self {
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        self.position = vec2((sw - self.size.x) * 0.5, (sh - self.size.y) * 0.5);
        self
    }

    /// Builder pattern: Aligns panel position on screen using a [`UIAnchor`] preset and padding.
    pub fn align_to_screen(mut self, anchor: UIAnchor, padding: impl Into<Padding>) -> Self {
        self.position = anchor.compute_position(self.size, padding);
        self
    }

    /// Builder pattern: Enables or disables automatic per-frame screen dimension tracking.
    pub fn with_auto_screen_size(mut self, enabled: bool) -> Self {
        self.auto_screen_size = enabled;
        self
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
        self
    }

    /// Builder pattern: Sets panel to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets panel to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets panel to deactivated (`active = false`) (alias for [`deactivated`](Panel::deactivated)).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead (typo fix)")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Builder pattern: Sets panel visibility.
    pub fn with_visible(mut self, visible: bool) -> Self {
        self.visible = visible;
        self
    }

    /// Builder pattern: Sets panel active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Returns `true` if panel is visible.
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Returns `true` if panel is active.
    pub fn is_active(&self) -> bool {
        self.active
    }

    /// Builder pattern: Sets panel background color.
    pub fn with_background(mut self, color: Color) -> Self {
        self.background_color = color;
        self
    }

    /// Builder pattern: Sets a custom background texture skin for the panel.
    pub fn with_texture(mut self, texture: Texture2D) -> Self {
        self.background_texture = Some(texture);
        self
    }

    /// Builder pattern: Sets tint color applied when rendering the background texture.
    pub fn with_texture_tint(mut self, tint: Color) -> Self {
        self.texture_tint = tint;
        self
    }

    /// Builder pattern: Sets panel border color and width.
    pub fn with_border(mut self, color: Color, width: f32) -> Self {
        self.border_color = Some(color);
        self.border_width = width;
        self
    }

    /// Builder pattern: Disables panel border.
    pub fn without_border(mut self) -> Self {
        self.border_color = None;
        self
    }

    /// Builder pattern: Enables or disables panel dragging mechanics.
    pub fn draggable(mut self, enabled: bool) -> Self {
        self.draggable = enabled;
        self
    }

    /// Adds a child entity object to the panel container.
    pub fn add_child(&mut self, child: Box<dyn Object>) {
        self.children.push(child);
    }

    /// Returns the bounding rectangle of the panel.
    pub fn rect(&self) -> Rect {
        Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        }
    }

    /// Builder pattern: Sets whether children are clipped to panel boundaries.
    pub fn with_clip_content(mut self, clip: bool) -> Self {
        self.clip_content = clip;
        self
    }

    /// Builder pattern: Sets initial scroll offset.
    pub fn with_scroll_offset(mut self, offset: Vec2) -> Self {
        self.scroll_offset = offset;
        self.target_scroll_offset = offset;
        self
    }

    /// Builder pattern: Sets total content height for scroll clamping.
    pub fn with_content_height(mut self, height: f32) -> Self {
        self.content_height = Some(height);
        self
    }

    /// Builder pattern: Enables or disables smooth frame-by-frame lerp scrolling.
    pub fn with_smooth_scroll(mut self, enabled: bool) -> Self {
        self.smooth_scroll = enabled;
        self
    }

    /// Builder pattern: Adds a child entity object to the panel container.
    pub fn with_child(mut self, child: Box<dyn Object>) -> Self {
        self.add_child(child);
        self
    }

    /// Automatically calculates and sets `content_height` based on maximum bottom Y bound of all children.
    pub fn auto_fit_content_height(&mut self) {
        let mut max_h: f32 = 0.0;
        for child in self.children.iter() {
            if let Some(ch) = child.content_height() {
                max_h = max_h.max(ch);
            } else if let Some(b) = child.bounds() {
                max_h = max_h.max(b.y + b.h);
            }
        }
        if max_h > 0.0 {
            self.content_height = Some(max_h + 15.0);
        }
    }

    /// Builder pattern: Automatically calculates and sets `content_height` based on children.
    pub fn fit_content_height(mut self) -> Self {
        self.auto_fit_content_height();
        self
    }

    /// Factory: Creates a pre-configured scrollable UI panel containing word-wrapped text.
    ///
    /// Automatically calculates padding (15px), max width, and total content height.
    ///
    /// # Example
    /// ```rust,ignore
    /// let panel = Panel::scrollable_text(vec2(100.0, 80.0), vec2(360.0, 240.0), long_text, 16.0, WHITE);
    /// ```
    pub fn scrollable_text(
        position: Vec2,
        size: Vec2,
        text: &str,
        font_size: f32,
        text_color: Color,
    ) -> Self {
        let padding = 15.0;
        let text_w = (size.x - padding * 2.0).max(10.0);
        let text_element =
            Text::new(text, vec2(padding, padding), font_size, text_color).with_max_width(text_w);
        let total_h = text_element.wrapped_height() + padding * 2.0;

        Self::new(position, size)
            .with_clip_content(true)
            .with_content_height(total_h)
            .with_child(Box::new(text_element))
    }

    /// Returns `true` if the panel is currently being dragged by the mouse.
    pub fn is_dragging(&self) -> bool {
        self.drag.is_dragging
    }
}

impl Clickable for Panel {
    fn click_rect(&self) -> Rect {
        self.rect()
    }
    fn is_active(&self) -> bool {
        self.active
    }
}

#[allow(deprecated)]
impl Draggable for Panel {
    fn drag_anchor_mut(&mut self) -> &mut Vec2 {
        &mut self.position
    }

    fn drag_state(&self) -> &DragState {
        &self.drag
    }

    fn drag_state_mut(&mut self) -> &mut DragState {
        &mut self.drag
    }

    fn is_drag_hovered(&self) -> bool {
        if !self.active || !self.draggable {
            return false;
        }
        let (mx, my) = mouse_position();
        let header = Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: 20.0_f32.min(self.size.y),
        };
        header.contains(vec2(mx, my))
    }
}

#[allow(deprecated)]
impl Object for Panel {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
        }
        if self.auto_screen_size {
            let sw = safe_screen_width();
            let sh = safe_screen_height();
            self.position = vec2(self.screen_padding, self.screen_padding);
            self.size = vec2((sw - self.screen_padding * 2.0).max(10.0), (sh - self.screen_padding * 2.0).max(10.0));
        }
        if self.draggable {
            let lmb_pressed = is_mouse_button_pressed(MouseButton::Left);
            let lmb_down = macroquad::input::is_mouse_button_down(MouseButton::Left);
            if lmb_pressed && self.is_drag_hovered() {
                self.start_drag();
            }
            if lmb_down {
                self.update_drag();
            } else {
                self.end_drag();
            }
        }

        // Mouse wheel scrolling when cursor is over panel
        let (mx, my) = mouse_position();
        if self.rect().contains(vec2(mx, my)) {
            let (_wheel_x, wheel_y) = macroquad::input::mouse_wheel();
            if wheel_y != 0.0 {
                self.target_scroll_offset.y -= wheel_y * 35.0;
                let max_scroll = self
                    .content_height
                    .map_or(f32::MAX, |h| (h - self.size.y).max(0.0));
                self.target_scroll_offset.y = self.target_scroll_offset.y.clamp(0.0, max_scroll);
            }
        }

        // Frame-by-frame scroll offset update (smooth lerp or instant)
        if self.smooth_scroll {
            let dt = ctx.time.deltatime();
            let lerp_factor = (16.0 * dt).min(1.0);
            self.scroll_offset.y +=
                (self.target_scroll_offset.y - self.scroll_offset.y) * lerp_factor;
            self.scroll_offset.x +=
                (self.target_scroll_offset.x - self.scroll_offset.x) * lerp_factor;
        } else {
            self.scroll_offset = self.target_scroll_offset;
        }

        for child in self.children.iter_mut() {
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        let pos = self.position + get_draw_offset();
        if let (Some(tex), Some(margins)) = (&self.background_texture, self.nine_slice_margins) {
            draw_nine_slice(tex, pos, self.size, margins, self.texture_tint);
        } else if let Some(ref tex) = self.background_texture {
            draw_texture_ex(
                tex,
                pos.x,
                pos.y,
                self.texture_tint,
                DrawTextureParams {
                    dest_size: Some(self.size),
                    ..Default::default()
                },
            );
        } else {
            draw_rectangle(
                pos.x,
                pos.y,
                self.size.x,
                self.size.y,
                self.background_color,
            );
        }
        if let Some(bc) = self.border_color {
            let bw = self.border_width;
            draw_rectangle(pos.x, pos.y, self.size.x, bw, bc);
            draw_rectangle(pos.x, pos.y + self.size.y - bw, self.size.x, bw, bc);
            draw_rectangle(pos.x, pos.y, bw, self.size.y, bc);
            draw_rectangle(pos.x + self.size.x - bw, pos.y, bw, self.size.y, bc);
        }

        let my_rect = Rect {
            x: pos.x,
            y: pos.y,
            w: self.size.x,
            h: self.size.y,
        };

        let render_children = || {
            push_draw_offset(self.position - self.scroll_offset);
            for child in self.children.iter() {
                child.draw();
            }
            pop_draw_offset();
        };

        if self.clip_content {
            let _guard = ScissorGuard::new(my_rect);
            render_children();
        } else {
            render_children();
        }
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn set_position(&mut self, pos: macroquad::math::Vec2) {
        self.position = pos;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn bounds(&self) -> Option<Rect> {
        Some(self.rect())
    }

    fn content_height(&self) -> Option<f32> {
        if self.content_height.is_some() {
            return self.content_height;
        }
        let mut max_h: f32 = 0.0;
        for child in self.children.iter() {
            if let Some(ch) = child.content_height() {
                max_h = max_h.max(ch);
            } else if let Some(b) = child.bounds() {
                max_h = max_h.max(b.y + b.h);
            }
        }
        if max_h > 0.0 { Some(max_h) } else { None }
    }
}

// ---------------------------------------------------------------------------
// ScrollMode — TextLog scroll animation mode
// ---------------------------------------------------------------------------

/// Scroll animation mode for [`TextLog`].
#[derive(Clone, Debug)]
pub enum ScrollMode {
    /// Scroll jumps instantly to the bottom when a new line is added.
    Instant,
    /// Scroll lerps toward the target bottom position each frame at the given speed factor.
    Smooth(f32),
}

// ---------------------------------------------------------------------------
// TextLog — Auto-scrolling text log / terminal / console component
// ---------------------------------------------------------------------------

/// Auto-scrolling text log UI component for terminal-style output, dialogue logs, and consoles.
///
/// Lines are stored in an internal buffer and rendered top-to-bottom inside a clipped viewport.
/// New lines are appended via [`push_line`](TextLog::push_line) or [`Step::AppendLine`](crate::sequence::Step::AppendLine).
/// [`set_text`](TextLog::set_text) on a [`TextLog`] replaces the **last** line, enabling in-place
/// animation (e.g. `"Setting up."` → `"Setting up.."` → `"Setting up..."`) without growing the buffer.
///
/// # Example
/// ```ignore
/// let mut log = TextLog::new(vec2(20.0, 40.0), vec2(400.0, 200.0), 18.0, WHITE)
///     .with_tag("boot_log")
///     .with_scroll_mode(ScrollMode::Smooth(12.0))
///     .with_max_lines(50);
/// ```
pub struct TextLog {
    /// Top-left position of the log viewport.
    pub position: Vec2,
    /// Size (width × height) of the log viewport.
    pub size: Vec2,
    /// Font size in pixels.
    pub font_size: f32,
    /// Optional TTF font; uses macroquad default when `None`.
    pub font: Option<Font>,
    /// Text color.
    pub color: Color,
    /// Vertical gap between lines. Defaults to `font_size * 1.2`.
    pub line_spacing: f32,
    /// Entity tag used for scene queries and [`Step`](crate::sequence::Step) targeting.
    pub tag: String,
    /// Whether the component is rendered.
    pub visible: bool,
    /// Whether the component receives update ticks.
    pub active: bool,
    /// Maximum number of lines retained. Oldest lines are evicted from the front. `None` = unlimited.
    pub max_lines: Option<usize>,
    /// Whether to clip rendered lines to the viewport bounds using the scissor test.
    pub clip_content: bool,
    /// Scroll animation mode.
    pub scroll_mode: ScrollMode,
    /// Whether the log automatically resizes to match screen width & height each frame.
    pub auto_screen_size: bool,
    /// Margin padding applied when `auto_screen_size` is enabled.
    pub screen_padding: f32,
    lines: Vec<TextLogLine>,
    scroll_offset: f32,
    target_scroll: f32,
    /// Optional pre-baked pixel-art bitmap font.
    pub bitmap_font: Option<std::rc::Rc<crate::bitmap_font::BitmapFont>>,
}

/// Single colored line entry stored inside a [`TextLog`].
#[derive(Clone, Debug)]
pub struct TextLogLine {
    pub text: String,
    pub color: Color,
}

impl TextLog {
    /// Creates a new [`TextLog`] with sensible defaults.
    pub fn new(position: Vec2, size: Vec2, font_size: f32, color: Color) -> Self {
        Self {
            position,
            size,
            font_size,
            font: None,
            color,
            line_spacing: font_size * 1.2,
            tag: String::new(),
            visible: true,
            active: true,
            max_lines: None,
            clip_content: true,
            scroll_mode: ScrollMode::Smooth(12.0),
            auto_screen_size: false,
            screen_padding: 0.0,
            lines: Vec::new(),
            scroll_offset: 0.0,
            target_scroll: 0.0,
            bitmap_font: None,
        }
    }

    /// Builder pattern: Attaches a pre-baked [`BitmapFont`] atlas for 100% crisp pixel font rendering.
    pub fn with_bitmap_font(mut self, bitmap_font: std::rc::Rc<crate::bitmap_font::BitmapFont>) -> Self {
        self.bitmap_font = Some(bitmap_font);
        self
    }

    /// Builder pattern: Sets a font loaded in asset manager by name (automatically selects [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas if loaded, otherwise falls back to TTF [`Font`]).
    pub fn with_font_from_assets(
        mut self,
        assets: &crate::asset_manager::Assets,
        name: &str,
    ) -> Self {
        if let Some(bm) = assets.get_bitmap_font(name) {
            self.bitmap_font = Some(bm);
        } else if let Some(font) = assets.get_font(name) {
            self.font = Some(font.clone());
        }
        self
    }

    /// Builder pattern: Attaches a pre-baked [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas loaded in asset manager by name.
    pub fn with_bitmap_font_from_assets(
        mut self,
        assets: &crate::asset_manager::Assets,
        name: &str,
    ) -> Self {
        if let Some(bm) = assets.get_bitmap_font(name) {
            self.bitmap_font = Some(bm);
        }
        self
    }

    /// Builder pattern: Resizes and positions log to cover the full screen (`screen_width()` × `screen_height()`).
    pub fn fullscreen(mut self) -> Self {
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        self.position = Vec2::ZERO;
        self.size = vec2(sw, sh);
        self.auto_screen_size = true;
        self.screen_padding = 0.0;
        self.recalculate_scroll();
        self
    }

    /// Builder pattern: Positions and resizes log to fit the screen with uniform padding margin (works for 4K, 2K, 1080p).
    pub fn fit_to_screen_padding(mut self, padding: f32) -> Self {
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        self.position = vec2(padding, padding);
        self.size = vec2((sw - padding * 2.0).max(10.0), (sh - padding * 2.0).max(10.0));
        self.auto_screen_size = true;
        self.screen_padding = padding;
        self.recalculate_scroll();
        self
    }

    /// Builder pattern: Aligns log position on screen using a [`UIAnchor`] preset and padding.
    pub fn align_to_screen(mut self, anchor: UIAnchor, padding: impl Into<Padding>) -> Self {
        self.position = anchor.compute_position(self.size, padding);
        self
    }

    /// Builder pattern: Enables or disables automatic per-frame screen dimension tracking.
    pub fn with_auto_screen_size(mut self, enabled: bool) -> Self {
        self.auto_screen_size = enabled;
        self
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Sets a custom TTF font.
    pub fn with_font(mut self, font: Font) -> Self {
        self.font = Some(font);
        self
    }

    /// Builder pattern: Sets the text color.
    pub fn with_color(mut self, color: Color) -> Self {
        self.color = color;
        self
    }

    /// Builder pattern: Sets the maximum number of lines retained in the buffer.
    pub fn with_max_lines(mut self, max: usize) -> Self {
        self.max_lines = Some(max);
        self.enforce_max_lines();
        self.recalculate_scroll();
        self
    }

    /// Builder pattern: Sets the scroll animation mode.
    pub fn with_scroll_mode(mut self, mode: ScrollMode) -> Self {
        self.scroll_mode = mode;
        self
    }

    /// Builder pattern: Sets whether content is clipped to the viewport via scissor test.
    pub fn with_clip_content(mut self, clip: bool) -> Self {
        self.clip_content = clip;
        self
    }

    /// Builder pattern: Sets vertical line spacing in pixels.
    pub fn with_line_spacing(mut self, spacing: f32) -> Self {
        self.line_spacing = spacing;
        self
    }

    /// Builder pattern: Sets the component to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets the component to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets the component to deactivated (`active = false`) (alias for [`deactivated`](TextLog::deactivated)).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead (typo fix)")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Builder pattern: Sets component visibility.
    pub fn with_visible(mut self, visible: bool) -> Self {
        self.visible = visible;
        self
    }

    /// Builder pattern: Sets component active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Appends a new line to the log buffer, evicting the oldest line if `max_lines` is exceeded.
    /// Automatically splits input containing `\n` into separate lines.
    pub fn push_line(&mut self, text: impl Into<String>) {
        let col = self.color;
        self.append_colored_line(text, col);
    }

    /// Appends a new line with an explicit `color` to the log buffer.
    pub fn append_colored_line(&mut self, text: impl Into<String>, color: Color) {
        let content = text.into();
        for line in content.split('\n') {
            self.lines.push(TextLogLine {
                text: line.to_string(),
                color,
            });
        }
        self.enforce_max_lines();
        self.recalculate_scroll();
    }

    /// Truncates the line buffer to `max_lines` by removing oldest lines from the front.
    fn enforce_max_lines(&mut self) {
        if let Some(max) = self.max_lines {
            while self.lines.len() > max {
                self.lines.remove(0);
            }
        }
    }

    /// Clears all lines from the log buffer and resets scroll to zero.
    pub fn clear(&mut self) {
        self.lines.clear();
        self.scroll_offset = 0.0;
        self.target_scroll = 0.0;
    }

    /// Returns a read-only slice of the current line buffer.
    pub fn lines(&self) -> Vec<String> {
        self.lines.iter().map(|l| l.text.clone()).collect()
    }

    /// Returns total rendered content height of all lines.
    fn content_h(&self) -> f32 {
        self.lines.len() as f32 * self.line_spacing
    }

    /// Returns the target scroll offset pinned to the bottom of content.
    fn target_scroll_bottom(&self) -> f32 {
        (self.content_h() - self.size.y).max(0.0)
    }

    /// Recalculates and updates the target scroll offset after content changes.
    fn recalculate_scroll(&mut self) {
        self.target_scroll = self.target_scroll_bottom();
        if matches!(self.scroll_mode, ScrollMode::Instant) {
            self.scroll_offset = self.target_scroll;
        }
    }

    /// Returns resolved screen-space geometry `(pos, font_size, line_spacing, scroll_offset, size)`
    /// accounting for current UI scale factor, draw offset, and letterbox viewport origin.
    pub(crate) fn resolved_geometry(&self) -> (Vec2, f32, f32, f32, Vec2) {
        let (scale, ui_offset) = get_ui_scale();
        let pos = self.position * scale + get_draw_offset() * scale + ui_offset;
        let font_size = self.font_size * scale;
        let line_spacing = self.line_spacing * scale;
        let scroll_offset = self.scroll_offset * scale;
        let size = self.size * scale;
        (pos, font_size, line_spacing, scroll_offset, size)
    }

    /// Returns the bounding rectangle of the log viewport in real screen pixels.
    pub(crate) fn real_screen_rect(&self) -> Rect {
        let (scale, ui_offset) = get_ui_scale();
        Rect {
            x: self.position.x * scale + ui_offset.x,
            y: self.position.y * scale + ui_offset.y,
            w: self.size.x * scale,
            h: self.size.y * scale,
        }
    }
}

impl Object for TextLog {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
        }
        if self.auto_screen_size {
            let sw = safe_screen_width();
            let sh = safe_screen_height();
            self.position = vec2(self.screen_padding, self.screen_padding);
            self.size = vec2(
                (sw - self.screen_padding * 2.0).max(10.0),
                (sh - self.screen_padding * 2.0).max(10.0),
            );
            self.recalculate_scroll();
        }

        // Handle mouse wheel scrolling inside TextLog rect
        let mouse_pos = macroquad::input::mouse_position();
        if self.real_screen_rect().contains(vec2(mouse_pos.0, mouse_pos.1)) {
            let (_wheel_x, wheel_y) = macroquad::input::mouse_wheel();
            if wheel_y != 0.0 {
                self.target_scroll = (self.target_scroll - wheel_y * 35.0)
                    .clamp(0.0, self.target_scroll_bottom());
            }
        }

        if let ScrollMode::Smooth(speed) = self.scroll_mode {
            let dt = ctx.time.deltatime();
            self.scroll_offset += (self.target_scroll - self.scroll_offset) * (speed * dt).min(1.0);
        } else {
            self.scroll_offset = self.target_scroll;
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        let (pos, font_size, line_spacing, scroll_offset, size) = self.resolved_geometry();

        let my_rect = Rect {
            x: pos.x,
            y: pos.y,
            w: size.x,
            h: size.y,
        };

        let render_lines = || {
            for (i, entry) in self.lines.iter().enumerate() {
                let draw_x = pos.x;
                let draw_y = pos.y + (i as f32) * line_spacing + font_size * 0.75 - scroll_offset;

                let spans = parse_rich_text(&entry.text, entry.color);
                let mut x_offset = 0.0;

                for span in spans {
                    let word_x = draw_x + x_offset;
                    if let Some(ref bm) = self.bitmap_font {
                        let scale_f = font_size / bm.native_size as f32;
                        bm.draw(&span.text, word_x, draw_y, scale_f, span.color);
                        x_offset += bm.measure(&span.text, scale_f).x;
                    } else {
                        if let Some(ref font) = self.font {
                            draw_text_ex(
                                &span.text,
                                word_x,
                                draw_y,
                                TextParams {
                                    font: Some(font),
                                    font_size: font_size as u16,
                                    color: span.color,
                                    ..Default::default()
                                },
                            );
                        } else {
                            draw_text(&span.text, word_x, draw_y, font_size, span.color);
                        }
                        x_offset += measure_text(&span.text, self.font.as_ref(), font_size as u16, 1.0).width;
                    }
                }
            }
        };

        if self.clip_content {
            let _guard = ScissorGuard::new(my_rect);
            render_lines();
        } else {
            render_lines();
        }
    }

    fn is_text_layer(&self) -> bool {
        true
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn set_text(&mut self, text: &str) {
        let new_lines: Vec<&str> = text.split('\n').collect();
        if new_lines.is_empty() {
            return;
        }
        if !self.lines.is_empty() {
            self.lines.pop();
        }
        let col = self.color;
        for line in new_lines {
            self.lines.push(TextLogLine {
                text: line.to_string(),
                color: col,
            });
        }
        self.enforce_max_lines();
        self.recalculate_scroll();
    }

    fn append_line(&mut self, text: &str) {
        self.push_line(text);
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn set_position(&mut self, pos: macroquad::math::Vec2) {
        self.position = pos;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn bounds(&self) -> Option<Rect> {
        Some(Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        })
    }

    fn content_height(&self) -> Option<f32> {
        Some(self.content_h())
    }
}

// ---------------------------------------------------------------------------
// TextLogObject<Data> = Behavior<TextLog, Data>
// ---------------------------------------------------------------------------

/// Type alias for a text log component combined with game data and update closure.
pub type TextLogObject<Data> = Behavior<TextLog, Data>;

impl<Data> std::ops::Deref for Behavior<TextLog, Data> {
    type Target = TextLog;
    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl<Data> std::ops::DerefMut for Behavior<TextLog, Data> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.inner
    }
}

// ---------------------------------------------------------------------------
// UI — Container manager for UI layer elements with z-order focus
// ---------------------------------------------------------------------------

/// UI layer container holding UI objects with z-order focus management.
pub struct UI {
    pub elements: Vec<Box<dyn Object>>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl UI {
    /// Creates a new [`UI`] container initialized with elements.
    pub fn new(elements: Vec<Box<dyn Object>>) -> Self {
        Self {
            elements,
            tag: "UI".to_string(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Sets the tag for the UI container.
    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
        self
    }

    /// Builder pattern: Sets UI container to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets UI container to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets UI container to deactivated (`active = false`) (alias for [`deactivated`](UI::deactivated)).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead (typo fix)")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Builder pattern: Sets UI container visibility.
    pub fn with_visible(mut self, visible: bool) -> Self {
        self.visible = visible;
        self
    }

    /// Builder pattern: Sets UI container active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Returns `true` if UI container is visible.
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Returns `true` if UI container is active.
    pub fn is_active(&self) -> bool {
        self.active
    }

    /// Adds a new element object to the UI container.
    pub fn add(&mut self, element: Box<dyn Object>) {
        self.elements.push(element);
    }

    /// Brings an element with matching tag to the top of the draw stack (front focus).
    pub fn bring_to_front(&mut self, tag: &str) -> bool {
        if let Some(pos) = self.elements.iter().position(|e| e.tag() == tag) {
            let element = self.elements.remove(pos);
            self.elements.push(element);
            true
        } else {
            false
        }
    }

    /// Automatically moves the clicked element to the front of the UI stack.
    ///
    /// Uses `Object::bounds()` to hit-test each element against the current mouse position,
    /// iterating from top (end of list) to bottom and raising the topmost element that was
    /// actually clicked.
    pub fn raise_clicked(&mut self) {
        let (mx, my) = mouse_position();
        if !is_mouse_button_pressed(MouseButton::Left) {
            return;
        }
        let mouse = vec2(mx, my);
        let mut hit_tag: Option<String> = None;
        // Iterate from top of stack (last drawn = highest z) to bottom
        for element in self.elements.iter().rev() {
            let tag = element.tag().to_string();
            if tag.is_empty() {
                continue;
            }
            if element.bounds().is_some_and(|rect| rect.contains(mouse)) {
                hit_tag = Some(tag);
                break;
            }
        }
        if let Some(tag) = hit_tag {
            self.bring_to_front(&tag);
        }
    }
}

impl Object for UI {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
        }
        for element in self.elements.iter_mut() {
            element.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        for element in self.elements.iter() {
            element.draw();
        }
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }
}

impl Default for UI {
    fn default() -> Self {
        Self::new(Vec::new())
    }
}

// ---------------------------------------------------------------------------
// TextField — Interactive UI text input field
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum TextAlignment {
    #[default]
    Left,
    Center,
    Right,
}

/// Interactive UI text input field supporting focus management, character typing,
/// placeholder text, blinking cursor, custom fonts, and optional decorations.
#[allow(clippy::type_complexity)]
pub struct TextField {
    pub position: Vec2,
    pub size: Vec2,
    pub text: String,
    pub placeholder: String,
    pub font_size: f32,
    pub font: Option<Font>,
    pub bg_color: Color,
    pub focus_border_color: Color,
    pub border_color: Option<Color>,
    pub border_width: f32,
    pub text_color: Color,
    pub placeholder_color: Color,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    pub focused: bool,
    pub decorated: bool,
    pub max_length: Option<usize>,
    pub cursor_timer: f32,
    pub on_submit: Option<Box<dyn FnMut(&str, &mut Context)>>,
    pub padding: Padding,
    pub margin: Margin,
    pub fill_parent: bool,
    pub alignment: TextAlignment,
    pub text_offset: Vec2,
    /// Optional pre-baked pixel-art bitmap font.
    pub bitmap_font: Option<std::rc::Rc<crate::bitmap_font::BitmapFont>>,
}

impl TextField {
    /// Creates a new UI [`TextField`] with default styling and decorations enabled.
    pub fn new(position: Vec2, size: Vec2, placeholder: &str) -> Self {
        Self {
            position,
            size,
            text: String::new(),
            placeholder: placeholder.to_string(),
            font_size: 20.0,
            font: None,
            bg_color: Color::from_rgba(20, 20, 30, 240),
            focus_border_color: Color::from_rgba(100, 180, 255, 255),
            border_color: Some(Color::from_rgba(80, 80, 100, 255)),
            border_width: 1.5,
            text_color: WHITE,
            placeholder_color: GRAY,
            tag: String::new(),
            visible: true,
            active: true,
            focused: false,
            decorated: true,
            max_length: None,
            cursor_timer: 0.0,
            on_submit: None,
            padding: Padding::default(),
            margin: Margin::default(),
            fill_parent: false,
            alignment: TextAlignment::Left,
            text_offset: Vec2::ZERO,
            bitmap_font: None,
        }
    }

    /// Builder pattern: Attaches a pre-baked [`BitmapFont`] atlas for 100% crisp pixel font rendering.
    pub fn with_bitmap_font(mut self, bitmap_font: std::rc::Rc<crate::bitmap_font::BitmapFont>) -> Self {
        self.bitmap_font = Some(bitmap_font);
        self
    }

    /// Builder pattern: Enables expanding size to fill parent container bounds.
    pub fn fill_parent(mut self) -> Self {
        self.fill_parent = true;
        self
    }

    /// Builder pattern: Attaches an `on_submit` callback executed when Enter key is pressed while focused.
    pub fn on_submit<F: FnMut(&str, &mut Context) + 'static>(mut self, callback: F) -> Self {
        self.on_submit = Some(Box::new(callback));
        self
    }

    /// Builder pattern: Sets internal padding.
    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self
    }

    /// Builder pattern: Sets external margin.
    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self
    }

    /// Builder pattern: Sets text alignment (Left, Center, Right).
    pub fn with_text_alignment(mut self, alignment: TextAlignment) -> Self {
        self.alignment = alignment;
        self
    }

    /// Builder pattern: Sets manual pixel text offset (dx, dy).
    pub fn with_text_offset(mut self, offset: Vec2) -> Self {
        self.text_offset = offset;
        self
    }

    /// Builder pattern: Sets initial text.
    pub fn with_text(mut self, text: &str) -> Self {
        self.text = text.to_string();
        self
    }

    /// Builder pattern: Enables focus state by default.
    pub fn focused(mut self) -> Self {
        self.focused = true;
        self.cursor_timer = 0.0;
        self
    }

    /// Builder pattern: Sets focus state.
    pub fn with_focused(mut self, focused: bool) -> Self {
        self.focused = focused;
        if focused {
            self.cursor_timer = 0.0;
        }
        self
    }

    /// Builder pattern: Sets a custom TTF font.
    pub fn with_font(mut self, font: Font) -> Self {
        self.font = Some(font);
        self
    }

    /// Builder pattern: Sets a font loaded in asset manager by name (automatically selects [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas if loaded, otherwise falls back to TTF [`Font`]).
    pub fn with_font_from_assets(
        mut self,
        assets: &crate::asset_manager::Assets,
        name: &str,
    ) -> Self {
        if let Some(bm) = assets.get_bitmap_font(name) {
            self.bitmap_font = Some(bm);
        } else if let Some(font) = assets.get_font(name) {
            self.font = Some(font.clone());
        }
        self
    }

    /// Builder pattern: Attaches a pre-baked [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas loaded in asset manager by name.
    pub fn with_bitmap_font_from_assets(
        mut self,
        assets: &crate::asset_manager::Assets,
        name: &str,
    ) -> Self {
        if let Some(bm) = assets.get_bitmap_font(name) {
            self.bitmap_font = Some(bm);
        }
        self
    }

    /// Builder pattern: Sets font size.
    pub fn with_font_size(mut self, size: f32) -> Self {
        self.font_size = size;
        self
    }

    /// Builder pattern: Sets text color.
    pub fn with_color(mut self, color: Color) -> Self {
        self.text_color = color;
        self
    }

    /// Builder pattern: Sets placeholder text color.
    pub fn with_placeholder_color(mut self, color: Color) -> Self {
        self.placeholder_color = color;
        self
    }

    /// Builder pattern: Sets background color.
    pub fn with_background(mut self, color: Color) -> Self {
        self.bg_color = color;
        self
    }

    /// Builder pattern: Sets border color and width.
    pub fn with_border(mut self, color: Color, width: f32) -> Self {
        self.border_color = Some(color);
        self.border_width = width;
        self
    }

    /// Builder pattern: Disables border rendering.
    pub fn without_border(mut self) -> Self {
        self.border_color = None;
        self
    }

    /// Builder pattern: Enables or disables visual decorations (background box and border).
    pub fn with_decoration(mut self, enabled: bool) -> Self {
        self.decorated = enabled;
        self
    }

    /// Builder pattern: Disables visual decorations (renders as plain text without background or border).
    pub fn without_decoration(mut self) -> Self {
        self.decorated = false;
        self
    }

    /// Builder pattern: Sets maximum character length.
    pub fn with_max_length(mut self, max_len: usize) -> Self {
        self.max_length = Some(max_len);
        self
    }

    /// Builder pattern: Sets entity tag.
    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
        self
    }

    /// Builder pattern: Sets text field to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets text field to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets text field to deactivated (`active = false`) (alias for [`deactivated`](TextField::deactivated)).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead (typo fix)")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Builder pattern: Sets text field visibility.
    pub fn with_visible(mut self, visible: bool) -> Self {
        self.visible = visible;
        self
    }

    /// Builder pattern: Sets text field active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Returns `true` if text field is visible.
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Returns `true` if text field is active.
    pub fn is_active(&self) -> bool {
        self.active
    }

    /// Returns `true` if the text field currently has focus.
    pub fn is_focused(&self) -> bool {
        self.focused
    }

    /// Explicitly sets focus state.
    pub fn set_focused(&mut self, focused: bool) {
        self.focused = focused;
        if focused {
            self.cursor_timer = 0.0;
        }
    }

    /// Returns bounding rectangle of the text field.
    pub fn rect(&self) -> Rect {
        let pos = self.position + get_draw_offset();
        Rect {
            x: pos.x,
            y: pos.y,
            w: self.size.x,
            h: self.size.y,
        }
    }
}

impl Clickable for TextField {
    fn click_rect(&self) -> Rect {
        self.rect()
    }
    fn is_active(&self) -> bool {
        self.active
    }
}

impl Object for TextField {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
        }

        let mouse_clicked = is_mouse_button_pressed(MouseButton::Left)
            || ctx.input.is_mouse_button_pressed(macroquad::input::MouseButton::Left);

        if mouse_clicked {
            let is_hovered = self.is_hovered_ui(ctx) || self.is_hovered() || self.is_hovered_ctx(ctx);
            if is_hovered {
                self.focused = true;
                self.cursor_timer = 0.0;
            } else {
                self.focused = false;
            }
        }

        if self.focused {
            self.cursor_timer += ctx.time.deltatime();

            while let Some(c) = macroquad::input::get_char_pressed() {
                if !c.is_control() {
                    if let Some(max_len) = self.max_length {
                        if self.text.len() < max_len {
                            self.text.push(c);
                        }
                    } else {
                        self.text.push(c);
                    }
                }
            }

            let backspace = is_key_pressed(KeyCode::Backspace)
                || ctx.input.is_key_pressed(macroquad::input::KeyCode::Backspace);
            if backspace {
                self.text.pop();
            }

            let enter = is_key_pressed(KeyCode::Enter)
                || ctx.input.is_key_pressed(macroquad::input::KeyCode::Enter);
            if enter && let Some(ref mut callback) = self.on_submit {
                let txt = self.text.clone();
                (callback)(&txt, ctx);
            }
        }
    }

    fn draw_non_text(&self) {
        if !self.visible || !self.decorated {
            return;
        }
        let pos = self.position + get_draw_offset();
        draw_rectangle(pos.x, pos.y, self.size.x, self.size.y, self.bg_color);

        let bc = if self.focused {
            Some(self.focus_border_color)
        } else {
            self.border_color
        };

        if let Some(border_color) = bc {
            let bw = self.border_width;
            draw_rectangle(pos.x, pos.y, self.size.x, bw, border_color);
            draw_rectangle(
                pos.x,
                pos.y + self.size.y - bw,
                self.size.x,
                bw,
                border_color,
            );
            draw_rectangle(pos.x, pos.y, bw, self.size.y, border_color);
            draw_rectangle(
                pos.x + self.size.x - bw,
                pos.y,
                bw,
                self.size.y,
                border_color,
            );
        }
    }

    fn draw_text_only(&self) {
        if !self.visible {
            return;
        }
        let (scale, ui_offset) = get_ui_scale();
        let pos = self.position + get_draw_offset();

        let text_to_draw = if self.text.is_empty() {
            &self.placeholder
        } else {
            &self.text
        };
        let color_to_draw = if self.text.is_empty() {
            self.placeholder_color
        } else {
            self.text_color
        };

        let base_left = if self.decorated { 8.0 } else { 0.0 };
        let pad_left = self.padding.left.max(base_left);
        let pad_right = self.padding.right.max(base_left);

        if let Some(ref bm) = self.bitmap_font {
            let scale_f = (self.font_size * scale) / bm.native_size as f32;
            let bm_dim = bm.measure(if text_to_draw.is_empty() { "A" } else { text_to_draw }, scale_f);
            let start_x = match self.alignment {
                TextAlignment::Left => pos.x + pad_left,
                TextAlignment::Center => pos.x + (self.size.x - bm_dim.x / scale) * 0.5,
                TextAlignment::Right => pos.x + self.size.x - pad_right - (bm_dim.x / scale),
            };
            let unscaled_tx = start_x + self.text_offset.x;
            let unscaled_ty = pos.y + (self.size.y - bm_dim.y / scale) * 0.5 + self.text_offset.y;

            let final_tx = (unscaled_tx * scale + ui_offset.x).round();
            let final_ty = (unscaled_ty * scale + ui_offset.y).round();

            bm.draw(text_to_draw, final_tx, final_ty, scale_f, color_to_draw);

            if self.focused && (self.cursor_timer % 1.0) < 0.5 {
                let typed_dim = bm.measure(if self.text.is_empty() { "" } else { &self.text }, scale_f);
                let final_cx = final_tx + typed_dim.x + 1.0;
                let final_cy = final_ty;
                let final_cw = scale_f.max(1.0);
                let final_ch = (bm.native_size as f32 * scale_f).round();
                let cursor_color = Color::new(self.text_color.r, self.text_color.g, self.text_color.b, 0.85);
                draw_rectangle(final_cx, final_cy, final_cw, final_ch, cursor_color);
            }
            return;
        }

        let scaled_font_size = ((self.font_size * scale).round() as u16).max(1);
        let text_dim = measure_text(
            if text_to_draw.is_empty() { "A" } else { text_to_draw },
            self.font.as_ref(),
            scaled_font_size,
            1.0,
        );

        let unscaled_text_w = text_dim.width / scale;
        let start_x = match self.alignment {
            TextAlignment::Left => pos.x + pad_left,
            TextAlignment::Center => pos.x + (self.size.x - unscaled_text_w) * 0.5,
            TextAlignment::Right => pos.x + self.size.x - pad_right - unscaled_text_w,
        };

        let unscaled_text_h = if text_dim.height > 0.0 { text_dim.height / scale } else { self.font_size };
        let unscaled_offset_y = if text_dim.offset_y > 0.0 { text_dim.offset_y / scale } else { self.font_size * 0.70 };

        let unscaled_tx = start_x + self.text_offset.x;
        let unscaled_ty = pos.y + (self.size.y - unscaled_text_h) * 0.5 + unscaled_offset_y + self.text_offset.y;

        let final_tx = (unscaled_tx * scale + ui_offset.x).round();
        let final_ty = (unscaled_ty * scale + ui_offset.y).round();

        if let Some(ref font) = self.font {
            draw_text_ex(
                text_to_draw,
                final_tx,
                final_ty,
                TextParams {
                    font: Some(font),
                    font_size: scaled_font_size,
                    color: color_to_draw,
                    ..Default::default()
                },
            );
        } else {
            draw_text(text_to_draw, final_tx, final_ty, scaled_font_size as f32, color_to_draw);
        }

        if self.focused && (self.cursor_timer % 1.0) < 0.5 {
            let typed_dim = measure_text(
                if self.text.is_empty() { "" } else { &self.text },
                self.font.as_ref(),
                scaled_font_size,
                1.0,
            );
            let unscaled_cursor_x = unscaled_tx + (typed_dim.width / scale) + 1.0;
            let unscaled_cursor_top = unscaled_ty - unscaled_offset_y + 1.0;
            let unscaled_cursor_height = unscaled_text_h * 0.85;

            let final_cx = (unscaled_cursor_x * scale + ui_offset.x).round();
            let final_cy = (unscaled_cursor_top * scale + ui_offset.y).round();
            let final_cw = scale.max(1.0).round();
            let final_ch = (unscaled_cursor_height * scale).round();

            let cursor_color = Color::new(self.text_color.r, self.text_color.g, self.text_color.b, 0.85);
            draw_rectangle(final_cx, final_cy, final_cw, final_ch, cursor_color);
        }
    }

    fn draw(&self) {
        self.draw_non_text();
        self.draw_text_only();
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn set_position(&mut self, pos: macroquad::math::Vec2) {
        self.position = pos;
    }

    fn set_size(&mut self, size: macroquad::math::Vec2) {
        self.size = size;
    }

    fn is_fill_parent(&self) -> bool {
        self.fill_parent
    }

    fn set_fill_parent(&mut self, fill: bool) {
        self.fill_parent = fill;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn bounds(&self) -> Option<Rect> {
        Some(self.rect())
    }
}

/// Type alias for a text field combined with game data and update closure.
pub type TextFieldObject<Data> = Behavior<TextField, Data>;

impl<Data> std::ops::Deref for Behavior<TextField, Data> {
    type Target = TextField;
    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl<Data> std::ops::DerefMut for Behavior<TextField, Data> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.inner
    }
}

// ---------------------------------------------------------------------------
// VBox — Vertical Column Layout Container
// ---------------------------------------------------------------------------

/// Container that automatically positions child entities in a vertical column.
pub struct VBox {
    pub position: Vec2,
    pub size: Vec2,
    pub spacing: f32,
    pub align: LayoutAlign,
    pub justify: LayoutJustify,
    pub padding: Padding,
    pub margin: Margin,
    pub children: Vec<Box<dyn Object>>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl VBox {
    /// Creates a new [`VBox`] at `position` with vertical `spacing` between children.
    pub fn new(position: Vec2, spacing: f32) -> Self {
        Self {
            position,
            size: Vec2::ZERO,
            spacing,
            align: LayoutAlign::Start,
            justify: LayoutJustify::Start,
            padding: Padding::default(),
            margin: Margin::default(),
            children: Vec::new(),
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Adds a child component to the layout column.
    pub fn with_child<O: Object + 'static>(mut self, child: O) -> Self {
        self.children.push(Box::new(child));
        self.relayout();
        self
    }

    /// Builder pattern: Sets cross-axis alignment.
    pub fn with_align(mut self, align: LayoutAlign) -> Self {
        self.align = align;
        self.relayout();
        self
    }

    /// Builder pattern: Sets internal padding.
    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self.relayout();
        self
    }

    /// Builder pattern: Sets external margin.
    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self.relayout();
        self
    }

    /// Recalculates child positions and container size.
    pub fn relayout(&mut self) {
        let mut cur_y = self.position.y + self.padding.top;
        let mut max_w: f32 = 0.0;

        for child in self.children.iter_mut() {
            let bounds = child.bounds().unwrap_or(Rect::new(0.0, 0.0, 100.0, 20.0));
            let cur_x = match self.align {
                LayoutAlign::Start | LayoutAlign::Stretch => self.position.x + self.padding.left,
                LayoutAlign::Center => self.position.x + self.padding.left + (self.size.x - bounds.w) * 0.5,
                LayoutAlign::End => self.position.x + self.padding.left + (self.size.x - bounds.w),
            };
            child.set_position(vec2(cur_x, cur_y));
            cur_y += bounds.h + self.spacing;
            max_w = max_w.max(bounds.w);
        }

        let total_h = (cur_y - self.position.y - self.spacing + self.padding.bottom).max(0.0);
        self.size = vec2(max_w + self.padding.left + self.padding.right, total_h);
    }
}

impl Object for VBox {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
        }
        for child in self.children.iter_mut() {
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        for child in self.children.iter() {
            child.draw();
        }
    }

    fn tag(&self) -> &str {
        &self.tag
    }
    fn is_visible(&self) -> bool {
        self.visible
    }
    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }
}

// ---------------------------------------------------------------------------
// HBox — Horizontal Row Layout Container
// ---------------------------------------------------------------------------

/// Container that automatically positions child entities in a horizontal row.
pub struct HBox {
    pub position: Vec2,
    pub size: Vec2,
    pub spacing: f32,
    pub align: LayoutAlign,
    pub padding: Padding,
    pub margin: Margin,
    pub children: Vec<Box<dyn Object>>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl HBox {
    /// Creates a new [`HBox`] at `position` with horizontal `spacing` between children.
    pub fn new(position: Vec2, spacing: f32) -> Self {
        Self {
            position,
            size: Vec2::ZERO,
            spacing,
            align: LayoutAlign::Start,
            padding: Padding::default(),
            margin: Margin::default(),
            children: Vec::new(),
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Adds a child component to the layout row.
    pub fn with_child<O: Object + 'static>(mut self, child: O) -> Self {
        self.children.push(Box::new(child));
        self.relayout();
        self
    }

    /// Builder pattern: Sets internal padding.
    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self.relayout();
        self
    }

    /// Builder pattern: Sets external margin.
    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self.relayout();
        self
    }

    /// Recalculates child positions and container size.
    pub fn relayout(&mut self) {
        let mut cur_x = self.position.x + self.padding.left;
        let mut max_h: f32 = 0.0;

        for child in self.children.iter_mut() {
            let bounds = child.bounds().unwrap_or(Rect::new(0.0, 0.0, 100.0, 20.0));
            let cur_y = match self.align {
                LayoutAlign::Start | LayoutAlign::Stretch => self.position.y + self.padding.top,
                LayoutAlign::Center => self.position.y + self.padding.top + (self.size.y - bounds.h) * 0.5,
                LayoutAlign::End => self.position.y + self.padding.top + (self.size.y - bounds.h),
            };
            child.set_position(vec2(cur_x, cur_y));
            cur_x += bounds.w + self.spacing;
            max_h = max_h.max(bounds.h);
        }

        let total_w = (cur_x - self.position.x - self.spacing + self.padding.right).max(0.0);
        self.size = vec2(total_w, max_h + self.padding.top + self.padding.bottom);
    }
}

impl Object for HBox {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
        }
        for child in self.children.iter_mut() {
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        for child in self.children.iter() {
            child.draw();
        }
    }

    fn tag(&self) -> &str {
        &self.tag
    }
    fn is_visible(&self) -> bool {
        self.visible
    }
    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }
}

// ---------------------------------------------------------------------------
// Grid — 2D Auto-Wrapping Grid Layout Container
// ---------------------------------------------------------------------------

/// Container that automatically lays out children in an M × N grid, wrapping rows.
pub struct Grid {
    pub position: Vec2,
    pub columns: usize,
    pub cell_size: Vec2,
    pub spacing: Vec2,
    pub padding: Padding,
    pub margin: Margin,
    pub children: Vec<Box<dyn Object>>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Grid {
    /// Creates a new [`Grid`] at `position` with fixed `columns` count and `cell_size`.
    pub fn new(position: Vec2, columns: usize, cell_size: Vec2, spacing: Vec2) -> Self {
        Self {
            position,
            columns: columns.max(1),
            cell_size,
            spacing,
            padding: Padding::default(),
            margin: Margin::default(),
            children: Vec::new(),
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Adds a child component to the grid.
    pub fn with_child<O: Object + 'static>(mut self, child: O) -> Self {
        self.children.push(Box::new(child));
        self.relayout();
        self
    }

    /// Builder pattern: Sets internal padding.
    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self.relayout();
        self
    }

    /// Builder pattern: Sets external margin.
    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self.relayout();
        self
    }

    /// Recalculates child positions based on grid column wrapping.
    pub fn relayout(&mut self) {
        for (i, child) in self.children.iter_mut().enumerate() {
            let col = i % self.columns;
            let row = i / self.columns;
            let x = self.position.x + self.padding.left + (col as f32) * (self.cell_size.x + self.spacing.x);
            let y = self.position.y + self.padding.top + (row as f32) * (self.cell_size.y + self.spacing.y);
            child.set_position(vec2(x, y));
        }
    }
}

impl Object for Grid {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
        }
        for child in self.children.iter_mut() {
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        for child in self.children.iter() {
            child.draw();
        }
    }

    fn tag(&self) -> &str {
        &self.tag
    }
    fn is_visible(&self) -> bool {
        self.visible
    }
    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }
}

// ---------------------------------------------------------------------------
// Slider — Interactive range slider widget
// ---------------------------------------------------------------------------

/// Interactive numeric range slider for settings menus (audio volume, sensitivity).
#[allow(clippy::type_complexity)]
pub struct Slider {
    pub position: Vec2,
    pub size: Vec2,
    pub min_val: f32,
    pub max_val: f32,
    pub value: f32,
    pub track_color: Color,
    pub fill_color: Color,
    pub knob_color: Color,
    pub is_dragging: bool,
    pub on_change: Option<Box<dyn FnMut(f32, &mut Context)>>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Slider {
    /// Creates a new [`Slider`] bounded in range `[min, max]` initialized at `value`.
    pub fn new(position: Vec2, size: Vec2, min_val: f32, max_val: f32, value: f32) -> Self {
        Self {
            position,
            size,
            min_val,
            max_val,
            value: value.clamp(min_val, max_val),
            track_color: GRAY,
            fill_color: GREEN,
            knob_color: WHITE,
            is_dragging: false,
            on_change: None,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Attaches an `on_change` callback closure.
    pub fn on_change<F: FnMut(f32, &mut Context) + 'static>(mut self, callback: F) -> Self {
        self.on_change = Some(Box::new(callback));
        self
    }

    /// Returns current ratio between 0.0 and 1.0.
    pub fn ratio(&self) -> f32 {
        if self.max_val > self.min_val {
            (self.value - self.min_val) / (self.max_val - self.min_val)
        } else {
            0.0
        }
    }

    /// Sets slider value clamped to `[min, max]`.
    pub fn set_value(&mut self, val: f32) {
        self.value = val.clamp(self.min_val, self.max_val);
    }
}

impl Clickable for Slider {
    fn click_rect(&self) -> Rect {
        Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        }
    }
    fn is_active(&self) -> bool {
        self.active
    }
}

impl Object for Slider {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active || !self.visible {
            return;
        }

        if is_mouse_button_pressed(MouseButton::Left) && self.is_hovered_ctx(ctx) {
            self.is_dragging = true;
        }

        if !macroquad::input::is_mouse_button_down(MouseButton::Left) {
            self.is_dragging = false;
        }

        if self.is_dragging {
            let mpos = ctx.input.mouse_position();
            let ratio = ((mpos.x - self.position.x) / self.size.x).clamp(0.0, 1.0);
            let new_val = self.min_val + ratio * (self.max_val - self.min_val);
            if (new_val - self.value).abs() > 0.0001 {
                self.value = new_val;
                if let Some(ref mut cb) = self.on_change {
                    (cb)(self.value, ctx);
                }
            }
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        let pos = self.position + get_draw_offset();
        let track_h = self.size.y * 0.4;
        let track_y = pos.y + (self.size.y - track_h) * 0.5;

        // Draw track
        draw_rectangle(pos.x, track_y, self.size.x, track_h, self.track_color);

        // Draw fill
        let fill_w = self.size.x * self.ratio();
        if fill_w > 0.0 {
            draw_rectangle(pos.x, track_y, fill_w, track_h, self.fill_color);
        }

        // Draw knob
        let knob_x = pos.x + fill_w - self.size.y * 0.25;
        draw_rectangle(knob_x, pos.y, self.size.y * 0.5, self.size.y, self.knob_color);
    }

    fn tag(&self) -> &str {
        &self.tag
    }
    fn is_visible(&self) -> bool {
        self.visible
    }
    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }
}

// ---------------------------------------------------------------------------
// Checkbox — Interactive toggle box widget
// ---------------------------------------------------------------------------

/// Interactive checkbox widget with label for boolean settings.
#[allow(clippy::type_complexity)]
pub struct Checkbox {
    pub position: Vec2,
    pub size: Vec2,
    pub label: String,
    pub checked: bool,
    pub box_color: Color,
    pub check_color: Color,
    pub text_color: Color,
    pub on_toggle: Option<Box<dyn FnMut(bool, &mut Context)>>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Checkbox {
    /// Creates a new [`Checkbox`] with `label` and initial `checked` state.
    pub fn new(position: Vec2, size: Vec2, label: impl Into<String>, checked: bool) -> Self {
        Self {
            position,
            size,
            label: label.into(),
            checked,
            box_color: GRAY,
            check_color: GREEN,
            text_color: WHITE,
            on_toggle: None,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Attaches an `on_toggle` callback.
    pub fn on_toggle<F: FnMut(bool, &mut Context) + 'static>(mut self, callback: F) -> Self {
        self.on_toggle = Some(Box::new(callback));
        self
    }
}

impl Clickable for Checkbox {
    fn click_rect(&self) -> Rect {
        Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x + 10.0 + self.label.len() as f32 * 10.0,
            h: self.size.y,
        }
    }
    fn is_active(&self) -> bool {
        self.active
    }
}

impl Object for Checkbox {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active || !self.visible {
            return;
        }

        if self.is_clicked_ctx(ctx) {
            self.checked = !self.checked;
            if let Some(ref mut cb) = self.on_toggle {
                (cb)(self.checked, ctx);
            }
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        let pos = self.position + get_draw_offset();
        draw_rectangle(pos.x, pos.y, self.size.x, self.size.y, self.box_color);

        if self.checked {
            let pad = self.size.x * 0.2;
            draw_rectangle(
                pos.x + pad,
                pos.y + pad,
                self.size.x - pad * 2.0,
                self.size.y - pad * 2.0,
                self.check_color,
            );
        }

        if !self.label.is_empty() {
            let tx = pos.x + self.size.x + 8.0;
            let ty = pos.y + self.size.y * 0.8;
            draw_text(&self.label, tx, ty, self.size.y * 0.8, self.text_color);
        }
    }

    fn tag(&self) -> &str {
        &self.tag
    }
    fn is_visible(&self) -> bool {
        self.visible
    }
    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }
}

// ---------------------------------------------------------------------------
// Tooltip — Hover popup information card
// ---------------------------------------------------------------------------

/// Hover information card popup displaying contextual info text over target components.
pub struct Tooltip {
    pub position: Vec2,
    pub text: String,
    pub font_size: f32,
    pub bg_color: Color,
    pub text_color: Color,
    pub visible: bool,
}

impl Tooltip {
    /// Creates a new [`Tooltip`] displaying `text` at cursor offset `position`.
    pub fn new(text: impl Into<String>, position: Vec2) -> Self {
        Self {
            position,
            text: text.into(),
            font_size: 14.0,
            bg_color: Color::from_rgba(10, 10, 15, 230),
            text_color: WHITE,
            visible: true,
        }
    }
}

impl Object for Tooltip {
    fn draw(&self) {
        if !self.visible || self.text.is_empty() {
            return;
        }
        let dims = measure_text(&self.text, None, self.font_size as u16, 1.0);
        let pad = 6.0;
        let pos = self.position + get_draw_offset();
        let w = dims.width + pad * 2.0;
        let h = dims.height + pad * 2.0;

        draw_rectangle(pos.x, pos.y, w, h, self.bg_color);
        draw_text(
            &self.text,
            pos.x + pad,
            pos.y + pad + dims.offset_y,
            self.font_size,
            self.text_color,
        );
    }
}

// ---------------------------------------------------------------------------
// Flutter-like Declarative Layout System (Column, Row, Container, Gap, Align)
// ---------------------------------------------------------------------------

/// Conversion trait allowing zero-`Box` child passing into containers and components.
pub trait IntoUIObject {
    fn into_ui_box(self) -> Box<dyn Object>;
}

impl<T: Object> IntoUIObject for T {
    fn into_ui_box(self) -> Box<dyn Object> {
        Box::new(self)
    }
}

impl IntoUIObject for Box<dyn Object> {
    fn into_ui_box(self) -> Box<dyn Object> {
        self
    }
}

/// Alignment preset within a parent bounding container.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Align {
    TopLeft,
    TopCenter,
    TopRight,
    CenterLeft,
    Center,
    CenterRight,
    BottomLeft,
    BottomCenter,
    BottomRight,
}

impl Align {
    /// Computes relative offset `Vec2(x, y)` inside `parent_size` for a child of `child_size` with `padding`.
    pub fn compute_offset(self, parent_size: Vec2, child_size: Vec2, padding: Padding) -> Vec2 {
        let avail_w = (parent_size.x - padding.left - padding.right).max(0.0);
        let avail_h = (parent_size.y - padding.top - padding.bottom).max(0.0);

        let (rx, ry) = match self {
            Align::TopLeft => (0.0, 0.0),
            Align::TopCenter => ((avail_w - child_size.x) * 0.5, 0.0),
            Align::TopRight => (avail_w - child_size.x, 0.0),
            Align::CenterLeft => (0.0, (avail_h - child_size.y) * 0.5),
            Align::Center => ((avail_w - child_size.x) * 0.5, (avail_h - child_size.y) * 0.5),
            Align::CenterRight => (avail_w - child_size.x, (avail_h - child_size.y) * 0.5),
            Align::BottomLeft => (0.0, avail_h - child_size.y),
            Align::BottomCenter => ((avail_w - child_size.x) * 0.5, avail_h - child_size.y),
            Align::BottomRight => (avail_w - child_size.x, avail_h - child_size.y),
        };

        vec2(padding.left + rx, padding.top + ry)
    }
}

/// Main axis alignment for [`Column`] (vertical) and [`Row`] (horizontal).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum MainAxisAlignment {
    #[default]
    Start,
    Center,
    End,
    SpaceBetween,
    SpaceAround,
    SpaceEvenly,
}

/// Cross axis alignment for [`Column`] (horizontal) and [`Row`] (vertical).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum CrossAxisAlignment {
    #[default]
    Start,
    Center,
    End,
    Stretch,
}

/// Spacing widget for creating fixed gaps between elements inside [`Column`] or [`Row`].
pub struct Gap {
    pub width: f32,
    pub height: f32,
    pub visible: bool,
}

impl Gap {
    /// Creates a uniform gap size `(size × size)`.
    pub fn new(size: f32) -> Self {
        Self { width: size, height: size, visible: true }
    }

    /// Creates a vertical gap of height `h`.
    pub fn height(h: f32) -> Self {
        Self { width: 0.0, height: h, visible: true }
    }

    /// Creates a horizontal gap of width `w`.
    pub fn width(w: f32) -> Self {
        Self { width: w, height: 0.0, visible: true }
    }
}

impl Object for Gap {
    fn update(&mut self, _ctx: &mut Context) {}
    fn draw(&self) {}
    fn bounds(&self) -> Option<Rect> {
        Some(Rect { x: 0.0, y: 0.0, w: self.width, h: self.height })
    }
    fn is_visible(&self) -> bool { self.visible }
    fn set_visible(&mut self, visible: bool) { self.visible = visible; }
}

/// Flexible container widget supporting background color, border, padding, margin, alignment, and child layout.
pub struct Container {
    pub position: Vec2,
    pub size: Vec2,
    pub padding: Padding,
    pub margin: Margin,
    pub bg_color: Option<Color>,
    pub border_color: Option<Color>,
    pub border_width: f32,
    pub alignment: Option<Align>,
    pub child: Option<Box<dyn Object>>,
    pub anchor: Option<(UIAnchor, Padding)>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    pub fill_parent: bool,
}

impl Container {
    pub fn new() -> Self {
        Self {
            position: Vec2::ZERO,
            size: Vec2::ZERO,
            padding: Padding::default(),
            margin: Margin::default(),
            bg_color: None,
            border_color: None,
            border_width: 1.0,
            alignment: None,
            child: None,
            anchor: None,
            tag: String::new(),
            visible: true,
            active: true,
            fill_parent: false,
        }
    }

    pub fn fill_parent(mut self) -> Self {
        self.fill_parent = true;
        self
    }

    pub fn with_child<O: IntoUIObject>(mut self, child: O) -> Self {
        self.child = Some(child.into_ui_box());
        self
    }

    pub fn with_size(mut self, size: Vec2) -> Self {
        self.size = size;
        self
    }

    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self
    }

    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self
    }

    pub fn with_background(mut self, color: Color) -> Self {
        self.bg_color = Some(color);
        self
    }

    pub fn with_border(mut self, color: Color, width: f32) -> Self {
        self.border_color = Some(color);
        self.border_width = width;
        self
    }

    pub fn with_alignment(mut self, align: Align) -> Self {
        self.alignment = Some(align);
        self
    }

    pub fn align_to_screen(mut self, anchor: UIAnchor, padding: impl Into<Padding>) -> Self {
        let pad = padding.into();
        self.position = anchor.compute_position(self.size, pad);
        self.anchor = Some((anchor, pad));
        self
    }

    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }
}

impl Object for Container {
    fn update(&mut self, ctx: &mut Context) {
        if !self.visible || !self.active { return; }
        if let Some((anchor, pad)) = self.anchor {
            self.position = anchor.compute_position(self.size, pad);
        }
        if let Some(ref mut child) = self.child {
            if child.is_fill_parent() {
                let avail_w = (self.size.x - self.padding.left - self.padding.right).max(0.0);
                let avail_h = (self.size.y - self.padding.top - self.padding.bottom).max(0.0);
                child.set_size(vec2(avail_w, avail_h));
            }
            let child_size = child.bounds().map(|b| vec2(b.w, b.h)).unwrap_or(Vec2::ZERO);
            let align = self.alignment.unwrap_or(Align::TopLeft);
            let offset = align.compute_offset(self.size, child_size, self.padding);
            child.set_position(self.position + offset);
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible { return; }
        let pos = self.position + get_draw_offset();
        if let Some(bg) = self.bg_color {
            draw_rectangle(pos.x, pos.y, self.size.x, self.size.y, bg);
        }
        if let Some(border) = self.border_color {
            let bw = self.border_width;
            draw_rectangle(pos.x, pos.y, self.size.x, bw, border);
            draw_rectangle(pos.x, pos.y + self.size.y - bw, self.size.x, bw, border);
            draw_rectangle(pos.x, pos.y, bw, self.size.y, border);
            draw_rectangle(pos.x + self.size.x - bw, pos.y, bw, self.size.y, border);
        }
        if let Some(ref child) = self.child {
            child.draw();
        }
    }

    fn bounds(&self) -> Option<Rect> {
        Some(Rect { x: self.position.x, y: self.position.y, w: self.size.x, h: self.size.y })
    }

    fn tag(&self) -> &str { &self.tag }
    fn is_visible(&self) -> bool { self.visible }
    fn set_visible(&mut self, visible: bool) { self.visible = visible; }
    fn is_active(&self) -> bool { self.active }
    fn set_active(&mut self, active: bool) { self.active = active; }
    fn set_position(&mut self, pos: Vec2) { self.position = pos; }
    fn set_size(&mut self, size: Vec2) { self.size = size; }
    fn is_fill_parent(&self) -> bool { self.fill_parent }
    fn set_fill_parent(&mut self, fill: bool) { self.fill_parent = fill; }
}

impl Clickable for Container {
    fn click_rect(&self) -> Rect {
        Rect { x: self.position.x, y: self.position.y, w: self.size.x, h: self.size.y }
    }
    fn is_active(&self) -> bool { self.active }
}

/// Vertical column container layout widget (Flutter-inspired).
pub struct Column {
    pub position: Vec2,
    pub size: Vec2,
    pub main_axis_alignment: MainAxisAlignment,
    pub cross_axis_alignment: CrossAxisAlignment,
    pub spacing: f32,
    pub padding: Padding,
    pub margin: Margin,
    pub children: Vec<Box<dyn Object>>,
    pub anchor: Option<(UIAnchor, Padding)>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Column {
    pub fn new() -> Self {
        Self {
            position: Vec2::ZERO,
            size: Vec2::ZERO,
            main_axis_alignment: MainAxisAlignment::Start,
            cross_axis_alignment: CrossAxisAlignment::Start,
            spacing: 0.0,
            padding: Padding::default(),
            margin: Margin::default(),
            children: Vec::new(),
            anchor: None,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    pub fn child<O: IntoUIObject>(mut self, child: O) -> Self {
        self.children.push(child.into_ui_box());
        self
    }

    pub fn children<I>(mut self, items: I) -> Self
    where
        I: IntoIterator,
        I::Item: IntoUIObject,
    {
        for item in items {
            self.children.push(item.into_ui_box());
        }
        self
    }

    pub fn with_children<I>(self, items: I) -> Self
    where
        I: IntoIterator,
        I::Item: IntoUIObject,
    {
        self.children(items)
    }

    pub fn with_spacing(mut self, spacing: f32) -> Self {
        self.spacing = spacing;
        self
    }

    pub fn with_main_axis_alignment(mut self, align: MainAxisAlignment) -> Self {
        self.main_axis_alignment = align;
        self
    }

    pub fn with_cross_axis_alignment(mut self, align: CrossAxisAlignment) -> Self {
        self.cross_axis_alignment = align;
        self
    }

    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self
    }

    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self
    }

    pub fn align_to_screen(mut self, anchor: UIAnchor, padding: impl Into<Padding>) -> Self {
        let pad = padding.into();
        self.position = anchor.compute_position(self.size, pad);
        self.anchor = Some((anchor, pad));
        self
    }

    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    fn layout_children(&mut self) {
        if self.children.is_empty() { return; }

        let mut child_sizes: Vec<Vec2> = Vec::with_capacity(self.children.len());
        let mut total_child_h = 0.0f32;
        let mut max_child_w = 0.0f32;

        for child in &self.children {
            if let Some(b) = child.bounds() {
                child_sizes.push(vec2(b.w, b.h));
                total_child_h += b.h;
                max_child_w = max_child_w.max(b.w);
            } else {
                child_sizes.push(Vec2::ZERO);
            }
        }

        let num_children = self.children.len() as f32;
        let total_spacing = self.spacing * (num_children - 1.0).max(0.0);
        let content_h = total_child_h + total_spacing;
        let content_w = max_child_w;

        if self.size == Vec2::ZERO {
            self.size = vec2(content_w + self.padding.left + self.padding.right, content_h + self.padding.top + self.padding.bottom);
        }

        let avail_h = (self.size.y - self.padding.top - self.padding.bottom).max(0.0);
        let avail_w = (self.size.x - self.padding.left - self.padding.right).max(0.0);

        let (start_y, gap_between) = match self.main_axis_alignment {
            MainAxisAlignment::Start => (self.padding.top, self.spacing),
            MainAxisAlignment::Center => (self.padding.top + (avail_h - content_h).max(0.0) * 0.5, self.spacing),
            MainAxisAlignment::End => (self.padding.top + (avail_h - content_h).max(0.0), self.spacing),
            MainAxisAlignment::SpaceBetween => {
                let g = if num_children > 1.0 { (avail_h - total_child_h) / (num_children - 1.0) } else { 0.0 };
                (self.padding.top, g)
            }
            MainAxisAlignment::SpaceAround => {
                let g = if num_children > 0.0 { (avail_h - total_child_h) / num_children } else { 0.0 };
                (self.padding.top + g * 0.5, g)
            }
            MainAxisAlignment::SpaceEvenly => {
                let g = if num_children > 0.0 { (avail_h - total_child_h) / (num_children + 1.0) } else { 0.0 };
                (self.padding.top + g, g)
            }
        };

        let mut current_y = start_y;
        for (i, child) in self.children.iter_mut().enumerate() {
            let sz = child_sizes[i];
            let x_offset = match self.cross_axis_alignment {
                CrossAxisAlignment::Start => self.padding.left,
                CrossAxisAlignment::Center => self.padding.left + (avail_w - sz.x).max(0.0) * 0.5,
                CrossAxisAlignment::End => self.padding.left + (avail_w - sz.x).max(0.0),
                CrossAxisAlignment::Stretch => self.padding.left,
            };

            child.set_position(self.position + vec2(x_offset, current_y));
            current_y += sz.y + gap_between;
        }
    }
}

impl Object for Column {
    fn update(&mut self, ctx: &mut Context) {
        if !self.visible || !self.active { return; }
        self.layout_children();
        if let Some((anchor, pad)) = self.anchor {
            self.position = anchor.compute_position(self.size, pad);
            self.layout_children();
        }
        for child in &mut self.children {
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible { return; }
        for child in &self.children {
            child.draw();
        }
    }

    fn bounds(&self) -> Option<Rect> {
        Some(Rect { x: self.position.x, y: self.position.y, w: self.size.x, h: self.size.y })
    }

    fn set_position(&mut self, pos: Vec2) { self.position = pos; }
    fn set_size(&mut self, size: Vec2) { self.size = size; }
    fn is_visible(&self) -> bool { self.visible }
    fn set_visible(&mut self, visible: bool) { self.visible = visible; }
    fn is_active(&self) -> bool { self.active }
    fn set_active(&mut self, active: bool) { self.active = active; }
    fn tag(&self) -> &str { &self.tag }
}

impl Clickable for Column {
    fn click_rect(&self) -> Rect {
        Rect { x: self.position.x, y: self.position.y, w: self.size.x, h: self.size.y }
    }
    fn is_active(&self) -> bool { self.active }
}

/// Horizontal row container layout widget (Flutter-inspired).
pub struct Row {
    pub position: Vec2,
    pub size: Vec2,
    pub main_axis_alignment: MainAxisAlignment,
    pub cross_axis_alignment: CrossAxisAlignment,
    pub spacing: f32,
    pub padding: Padding,
    pub margin: Margin,
    pub children: Vec<Box<dyn Object>>,
    pub anchor: Option<(UIAnchor, Padding)>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Row {
    pub fn new() -> Self {
        Self {
            position: Vec2::ZERO,
            size: Vec2::ZERO,
            main_axis_alignment: MainAxisAlignment::Start,
            cross_axis_alignment: CrossAxisAlignment::Start,
            spacing: 0.0,
            padding: Padding::default(),
            margin: Margin::default(),
            children: Vec::new(),
            anchor: None,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    pub fn child<O: IntoUIObject>(mut self, child: O) -> Self {
        self.children.push(child.into_ui_box());
        self
    }

    pub fn children<I>(mut self, items: I) -> Self
    where
        I: IntoIterator,
        I::Item: IntoUIObject,
    {
        for item in items {
            self.children.push(item.into_ui_box());
        }
        self
    }

    pub fn with_children<I>(self, items: I) -> Self
    where
        I: IntoIterator,
        I::Item: IntoUIObject,
    {
        self.children(items)
    }

    pub fn with_spacing(mut self, spacing: f32) -> Self {
        self.spacing = spacing;
        self
    }

    pub fn with_main_axis_alignment(mut self, align: MainAxisAlignment) -> Self {
        self.main_axis_alignment = align;
        self
    }

    pub fn with_cross_axis_alignment(mut self, align: CrossAxisAlignment) -> Self {
        self.cross_axis_alignment = align;
        self
    }

    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self
    }

    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self
    }

    pub fn align_to_screen(mut self, anchor: UIAnchor, padding: impl Into<Padding>) -> Self {
        let pad = padding.into();
        self.position = anchor.compute_position(self.size, pad);
        self.anchor = Some((anchor, pad));
        self
    }

    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    fn layout_children(&mut self) {
        if self.children.is_empty() { return; }

        let mut child_sizes: Vec<Vec2> = Vec::with_capacity(self.children.len());
        let mut total_child_w = 0.0f32;
        let mut max_child_h = 0.0f32;

        for child in &self.children {
            if let Some(b) = child.bounds() {
                child_sizes.push(vec2(b.w, b.h));
                total_child_w += b.w;
                max_child_h = max_child_h.max(b.h);
            } else {
                child_sizes.push(Vec2::ZERO);
            }
        }

        let num_children = self.children.len() as f32;
        let total_spacing = self.spacing * (num_children - 1.0).max(0.0);
        let content_w = total_child_w + total_spacing;
        let content_h = max_child_h;

        if self.size == Vec2::ZERO {
            self.size = vec2(content_w + self.padding.left + self.padding.right, content_h + self.padding.top + self.padding.bottom);
        }

        let avail_w = (self.size.x - self.padding.left - self.padding.right).max(0.0);
        let avail_h = (self.size.y - self.padding.top - self.padding.bottom).max(0.0);

        let (start_x, gap_between) = match self.main_axis_alignment {
            MainAxisAlignment::Start => (self.padding.left, self.spacing),
            MainAxisAlignment::Center => (self.padding.left + (avail_w - content_w).max(0.0) * 0.5, self.spacing),
            MainAxisAlignment::End => (self.padding.left + (avail_w - content_w).max(0.0), self.spacing),
            MainAxisAlignment::SpaceBetween => {
                let g = if num_children > 1.0 { (avail_w - total_child_w) / (num_children - 1.0) } else { 0.0 };
                (self.padding.left, g)
            }
            MainAxisAlignment::SpaceAround => {
                let g = if num_children > 0.0 { (avail_w - total_child_w) / num_children } else { 0.0 };
                (self.padding.left + g * 0.5, g)
            }
            MainAxisAlignment::SpaceEvenly => {
                let g = if num_children > 0.0 { (avail_w - total_child_w) / (num_children + 1.0) } else { 0.0 };
                (self.padding.left + g, g)
            }
        };

        let mut current_x = start_x;
        for (i, child) in self.children.iter_mut().enumerate() {
            let sz = child_sizes[i];
            let y_offset = match self.cross_axis_alignment {
                CrossAxisAlignment::Start => self.padding.top,
                CrossAxisAlignment::Center => self.padding.top + (avail_h - sz.y).max(0.0) * 0.5,
                CrossAxisAlignment::End => self.padding.top + (avail_h - sz.y).max(0.0),
                CrossAxisAlignment::Stretch => self.padding.top,
            };

            child.set_position(self.position + vec2(current_x, y_offset));
            current_x += sz.x + gap_between;
        }
    }
}

impl Object for Row {
    fn update(&mut self, ctx: &mut Context) {
        if !self.visible || !self.active { return; }
        if let Some((anchor, pad)) = self.anchor {
            self.position = anchor.compute_position(self.size, pad);
        }
        self.layout_children();
        for child in &mut self.children {
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible { return; }
        for child in &self.children {
            child.draw();
        }
    }

    fn bounds(&self) -> Option<Rect> {
        Some(Rect { x: self.position.x, y: self.position.y, w: self.size.x, h: self.size.y })
    }

    fn tag(&self) -> &str { &self.tag }
    fn is_visible(&self) -> bool { self.visible }
    fn set_visible(&mut self, visible: bool) { self.visible = visible; }
    fn is_active(&self) -> bool { self.active }
    fn set_active(&mut self, active: bool) { self.active = active; }
    fn set_position(&mut self, pos: Vec2) { self.position = pos; }
}

impl Clickable for Row {
    fn click_rect(&self) -> Rect {
        Rect { x: self.position.x, y: self.position.y, w: self.size.x, h: self.size.y }
    }
    fn is_active(&self) -> bool { self.active }
}

/// Helper macro for vector of UI objects without writing `Box::new(...)`.
#[macro_export]
macro_rules! ui_vec {
    ($($elem:expr),* $(,)?) => {
        vec![$(Box::new($elem) as Box<dyn $crate::world::Object>),*]
    };
}

/// Declarative Flutter-like [`Column`] layout macro.
#[macro_export]
macro_rules! column {
    ($($child:expr),* $(,)?) => {
        $crate::ui::Column::new().with_children($crate::ui_vec![$($child),*])
    };
}

/// Declarative Flutter-like [`Row`] layout macro.
#[macro_export]
macro_rules! row {
    ($($child:expr),* $(,)?) => {
        $crate::ui::Row::new().with_children($crate::ui_vec![$($child),*])
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::world::Object;

    #[test]
    fn test_ui_scale_get_set_reset() {
        assert_eq!(get_ui_scale(), (1.0, Vec2::ZERO));
        set_ui_scale(2.0, vec2(10.0, 20.0));
        assert_eq!(get_ui_scale(), (2.0, vec2(10.0, 20.0)));
        set_ui_scale(1.0, Vec2::ZERO);
        assert_eq!(get_ui_scale(), (1.0, Vec2::ZERO));
    }

    #[test]
    fn test_is_text_layer() {
        let text = Text::new("Hello", Vec2::ZERO, 16.0, WHITE);
        assert!(text.is_text_layer());

        let text_log = TextLog::new(Vec2::ZERO, vec2(100.0, 100.0), 16.0, WHITE);
        assert!(text_log.is_text_layer());

        let behavior_text = crate::object::Behavior::new(text, ());
        assert!(behavior_text.is_text_layer());

        let panel = Panel::new(Vec2::ZERO, vec2(100.0, 100.0));
        assert!(!panel.is_text_layer());
    }

    #[test]
    fn test_resolved_geometry_floor_to_one_scale() {
        // Reproduce floor-to-1.0 letterbox case: scale == 1.0, ui_offset != Vec2::ZERO (e.g. ox = 37.5)
        set_ui_scale(1.0, vec2(37.5, 12.0));

        let log = TextLog::new(vec2(10.0, 20.0), vec2(200.0, 100.0), 12.0, WHITE);
        let (pos, font_size, _line_spacing, _scroll_offset, size) = log.resolved_geometry();
        assert_eq!(pos, vec2(47.5, 32.0)); // 10 + 37.5, 20 + 12.0
        assert_eq!(font_size, 12.0);
        assert_eq!(size, vec2(200.0, 100.0));

        let text = Text::new("Test", vec2(10.0, 20.0), 12.0, WHITE);
        let (t_pos, t_font_size, _t_spacing, _t_max_w) = text.resolved_geometry();
        assert_eq!(t_pos, vec2(47.5, 32.0));
        assert_eq!(t_font_size, 12.0);

        set_ui_scale(1.0, Vec2::ZERO);
    }

    #[test]
    fn test_resolved_geometry_legacy_mode() {
        set_ui_scale(1.0, Vec2::ZERO);

        let log = TextLog::new(vec2(10.0, 20.0), vec2(200.0, 100.0), 12.0, WHITE);
        let (pos, font_size, _spacing, _scroll, size) = log.resolved_geometry();
        assert_eq!(pos, vec2(10.0, 20.0));
        assert_eq!(font_size, 12.0);
        assert_eq!(size, vec2(200.0, 100.0));

        let text = Text::new("Test", vec2(10.0, 20.0), 12.0, WHITE);
        let (t_pos, t_font_size, _t_spacing, _t_max_w) = text.resolved_geometry();
        assert_eq!(t_pos, vec2(10.0, 20.0));
        assert_eq!(t_font_size, 12.0);
    }

    #[test]
    fn test_text_log_real_screen_rect_hit_testing() {
        set_ui_scale(2.0, vec2(50.0, 100.0));

        let log = TextLog::new(vec2(10.0, 20.0), vec2(100.0, 50.0), 12.0, WHITE);
        let real_rect = log.real_screen_rect();
        // Expected: x = 10*2 + 50 = 70, y = 20*2 + 100 = 140, w = 100*2 = 200, h = 50*2 = 100
        assert_eq!(real_rect.x, 70.0);
        assert_eq!(real_rect.y, 140.0);
        assert_eq!(real_rect.w, 200.0);
        assert_eq!(real_rect.h, 100.0);

        assert!(real_rect.contains(vec2(100.0, 150.0)));
        assert!(!real_rect.contains(vec2(10.0, 10.0)));

        set_ui_scale(1.0, Vec2::ZERO);
    }

    #[test]
    fn test_box_model_helpers() {
        let p = Padding::symmetric(16.0, 8.0);
        assert_eq!(p.left, 16.0);
        assert_eq!(p.top, 8.0);

        let m = Margin::only_top(20.0);
        assert_eq!(m.top, 20.0);
        assert_eq!(m.left, 0.0);
    }

    #[test]
    fn test_vbox_hbox_grid_layouts() {
        let vbox = VBox::new(vec2(10.0, 10.0), 5.0)
            .with_child(Button::new(Vec2::ZERO, vec2(100.0, 30.0), "Btn 1"))
            .with_child(Button::new(Vec2::ZERO, vec2(100.0, 30.0), "Btn 2"));

        assert_eq!(vbox.children[0].bounds().unwrap().y, 10.0);
        assert_eq!(vbox.children[1].bounds().unwrap().y, 45.0); // 10 + 30 + 5

        let hbox = HBox::new(vec2(10.0, 10.0), 10.0)
            .with_child(Button::new(Vec2::ZERO, vec2(50.0, 30.0), "B1"))
            .with_child(Button::new(Vec2::ZERO, vec2(50.0, 30.0), "B2"));

        assert_eq!(hbox.children[0].bounds().unwrap().x, 10.0);
        assert_eq!(hbox.children[1].bounds().unwrap().x, 70.0); // 10 + 50 + 10

        let grid = Grid::new(vec2(0.0, 0.0), 2, vec2(50.0, 50.0), vec2(10.0, 10.0))
            .with_child(Button::new(Vec2::ZERO, vec2(50.0, 50.0), "1"))
            .with_child(Button::new(Vec2::ZERO, vec2(50.0, 50.0), "2"))
            .with_child(Button::new(Vec2::ZERO, vec2(50.0, 50.0), "3"));

        assert_eq!(grid.children[0].bounds().unwrap().x, 0.0);
        assert_eq!(grid.children[1].bounds().unwrap().x, 60.0);
        assert_eq!(grid.children[2].bounds().unwrap().y, 60.0); // row 1
    }

    #[test]
    fn test_slider_and_checkbox_widgets() {
        let mut slider = Slider::new(Vec2::ZERO, vec2(100.0, 20.0), 0.0, 100.0, 50.0);
        assert_eq!(slider.ratio(), 0.5);

        slider.set_value(75.0);
        assert_eq!(slider.ratio(), 0.75);

        let mut cb = Checkbox::new(Vec2::ZERO, vec2(20.0, 20.0), "Option", false);
        assert!(!cb.checked);
        cb.checked = true;
        assert!(cb.checked);
    }

    #[test]
    fn test_flutter_like_layout_system() {
        let mut col = column![
            Button::new(Vec2::ZERO, vec2(100.0, 30.0), "Btn 1"),
            Gap::height(10.0),
            row![
                Button::new(Vec2::ZERO, vec2(40.0, 20.0), "R1"),
                Gap::width(5.0),
                Button::new(Vec2::ZERO, vec2(40.0, 20.0), "R2"),
            ],
        ]
        .with_spacing(5.0)
        .with_main_axis_alignment(MainAxisAlignment::Start)
        .with_cross_axis_alignment(CrossAxisAlignment::Center);

        col.layout_children();

        assert_eq!(col.children.len(), 3);
        assert_eq!(col.children[0].bounds().unwrap().y, 0.0);
        assert_eq!(col.children[1].bounds().unwrap().h, 10.0);
        assert_eq!(col.children[2].bounds().unwrap().y, 50.0);

        let mut container = Container::new()
            .with_size(vec2(200.0, 100.0))
            .with_padding(Padding::all(10.0))
            .with_alignment(Align::Center)
            .with_child(Button::new(Vec2::ZERO, vec2(50.0, 20.0), "Inner"));

        if let Some(ref mut child) = container.child {
            let child_size = child.bounds().map(|b| vec2(b.w, b.h)).unwrap_or(Vec2::ZERO);
            let offset = container.alignment.unwrap().compute_offset(container.size, child_size, container.padding);
            child.set_position(container.position + offset);
        }

        assert_eq!(container.child.as_ref().unwrap().bounds().unwrap().x, 75.0);
        assert_eq!(container.child.as_ref().unwrap().bounds().unwrap().y, 40.0);
    }

    #[test]
    fn test_fill_parent_layout() {
        let mut container = Container::new()
            .with_size(vec2(300.0, 200.0))
            .with_padding(Padding::all(10.0))
            .with_child(TextField::new(Vec2::ZERO, vec2(50.0, 20.0), "Test").fill_parent());

        if let Some(ref mut child) = container.child {
            if child.is_fill_parent() {
                let avail_w = (container.size.x - container.padding.left - container.padding.right).max(0.0);
                let avail_h = (container.size.y - container.padding.top - container.padding.bottom).max(0.0);
                child.set_size(vec2(avail_w, avail_h));
            }
        }

        let child_bounds = container.child.as_ref().unwrap().bounds().unwrap();
        assert_eq!(child_bounds.w, 280.0);
        assert_eq!(child_bounds.h, 180.0);
    }
}
```

---

# window.rs

```rust
use macroquad::{math::Vec2, window::Conf};

/// Window configuration builder helper.
pub struct Window {
    pub size: Vec2,
    pub name: String,
    pub resizable: bool,
}

impl Window {
    /// Creates a Macroquad [`Conf`] object for configuring main window properties.
    pub fn conf(size: Vec2, name: &str, resizable: bool) -> Conf {
        Conf {
            window_title: name.to_string(),
            window_width: size.x as i32,
            window_height: size.y as i32,
            window_resizable: resizable,
            ..Default::default()
        }
    }

    /// Creates a new [`Window`] configuration helper struct.
    pub fn new(size: Vec2, name: &str, resizable: bool) -> Self {
        Self {
            size,
            name: name.to_string(),
            resizable,
        }
    }
}
```

---

# world.rs

```rust
use macroquad::math::Rect;

use crate::engine::Context;

/// Base trait implemented by all game world entities and UI components.
pub trait Object: 'static {
    /// Executes entity logic updates for the current frame.
    fn update(&mut self, _ctx: &mut Context) {}

    /// Renders the entity.
    fn draw(&self);

    /// Returns the entity tag string used for filter queries. Defaults to `""`.
    fn tag(&self) -> &str {
        ""
    }

    /// Returns `true` if the entity tag matches `tag`.
    fn has_tag(&self, tag: &str) -> bool {
        self.tag() == tag
    }

    /// Updates text content on entities supporting text rendering (e.g. [`Text`](crate::ui::Text), [`TextObject`](crate::ui::TextObject)).
    /// Default implementation is a no-op.
    fn set_text(&mut self, _text: &str) {}

    /// Appends a line of text to entities supporting append-based logging (e.g. [`TextLog`](crate::ui::TextLog)). No-op by default.
    fn append_line(&mut self, _text: &str) {}

    /// Sets the screen-space position of this entity. No-op by default.
    fn set_position(&mut self, _pos: macroquad::math::Vec2) {}

    /// Sets the screen-space size of this entity. No-op by default.
    fn set_size(&mut self, _size: macroquad::math::Vec2) {}

    /// Returns whether this entity expands to fill its parent container. Defaults to `false`.
    fn is_fill_parent(&self) -> bool {
        false
    }

    /// Sets whether this entity expands to fill its parent container.
    fn set_fill_parent(&mut self, _fill: bool) {}

    /// Returns whether this entity is visible for rendering. Defaults to `true`.
    fn is_visible(&self) -> bool {
        true
    }

    /// Sets whether this entity is visible for rendering.
    fn set_visible(&mut self, _visible: bool) {}

    /// Returns whether this entity is active for logic updates and input interaction. Defaults to `true`.
    fn is_active(&self) -> bool {
        true
    }

    /// Sets whether this entity is active for logic updates and input interaction.
    fn set_active(&mut self, _active: bool) {}

    /// Returns the screen-space bounding rectangle for hit-testing, or `None` if the entity
    /// has no interactive bounds (e.g. text-only labels, decorative shapes).
    ///
    /// Used by [`UI::raise_clicked`](crate::ui::UI::raise_clicked) to find the topmost clicked element.
    fn bounds(&self) -> Option<Rect> {
        None
    }

    /// Returns the total content height of this entity, or `None` if unspecified.
    ///
    /// Used by [`Panel::fit_content_height`](crate::ui::Panel::fit_content_height) to calculate scroll boundaries.
    fn content_height(&self) -> Option<f32> {
        None
    }

    /// Returns `true` if this object should bypass the virtual-resolution render target
    /// and be drawn directly at native screen resolution (used by text elements to avoid
    /// blurry upscaled font rasterization). Default: `false`.
    fn is_text_layer(&self) -> bool {
        false
    }

    /// Renders non-text visual components (backgrounds, borders, textures).
    /// Default implementation calls [`draw`](Object::draw) if [`is_text_layer`](Object::is_text_layer) is false.
    fn draw_non_text(&self) {
        if !self.is_text_layer() {
            self.draw();
        }
    }

    /// Renders text visual components at native screen resolution.
    /// Default implementation calls [`draw`](Object::draw) if [`is_text_layer`](Object::is_text_layer) is true.
    fn draw_text_only(&self) {
        if self.is_text_layer() {
            self.draw();
        }
    }

    /// Downcasting helper returning an immutable `&dyn Any` reference, or `None` by default.
    fn as_any(&self) -> Option<&dyn std::any::Any> {
        None
    }

    /// Downcasting helper returning a mutable `&mut dyn Any` reference, or `None` by default.
    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        None
    }
}

/// Game world container holding separate entity rendering and logic layers:
///
/// - `objects` — Rendered in world space inside camera view bounds.
/// - `ui_objects` — Rendered in screen space outside camera view bounds.
/// - `logic` — Updated every frame but never rendered (invisible system controllers).
#[derive(Default)]
pub struct World {
    objects: Vec<Box<dyn Object>>,
    ui_objects: Vec<Box<dyn Object>>,
    logic: Vec<Box<dyn Object>>,
    sequences: Vec<crate::sequence::Sequence>,
}

impl World {
    /// Creates a new empty [`World`].
    pub fn new() -> Self {
        Self {
            objects: Vec::new(),
            ui_objects: Vec::new(),
            logic: Vec::new(),
            sequences: Vec::new(),
        }
    }

    /// Creates a new [`World`] with world-space entities.
    pub fn new_with_objects(objects: Vec<Box<dyn Object>>) -> Self {
        Self {
            objects,
            ui_objects: Vec::new(),
            logic: Vec::new(),
            sequences: Vec::new(),
        }
    }

    /// Creates a new [`World`] with both world-space entities and screen-space UI components.
    pub fn new_with_ui(objects: Vec<Box<dyn Object>>, ui_objects: Vec<Box<dyn Object>>) -> Self {
        Self {
            objects,
            ui_objects,
            logic: Vec::new(),
            sequences: Vec::new(),
        }
    }

    /// Adds a new object implementing [`Object`] to the world-space layer at runtime.
    pub fn add<O: Object + 'static>(&mut self, object: O) {
        self.objects.push(Box::new(object));
    }

    /// Adds a pre-boxed object to the world-space layer (low-level escape hatch).
    pub fn add_boxed(&mut self, object: Box<dyn Object>) {
        self.objects.push(object);
    }

    /// Adds a new object implementing [`Object`] to the screen-space UI layer at runtime.
    pub fn add_ui<O: Object + 'static>(&mut self, object: O) {
        self.ui_objects.push(Box::new(object));
    }

    /// Adds a pre-boxed object to the screen-space UI layer (low-level escape hatch).
    pub fn add_ui_boxed(&mut self, object: Box<dyn Object>) {
        self.ui_objects.push(object);
    }

    /// Adds a new object to the logic-only layer at runtime. Logic objects are
    /// updated every frame but never rendered — use for invisible system
    /// controllers (scene switching, global timers, cross-cutting checks) via
    /// [`LogicObject`](crate::object::LogicObject).
    pub fn add_logic<O: Object + 'static>(&mut self, object: O) {
        self.logic.push(Box::new(object));
    }

    /// Adds a pre-boxed object to the logic-only layer (low-level escape hatch).
    pub fn add_logic_boxed(&mut self, object: Box<dyn Object>) {
        self.logic.push(object);
    }

    /// Returns a slice of world-space objects.
    pub fn objects(&self) -> &[Box<dyn Object>] {
        &self.objects
    }

    /// Returns a mutable slice of world-space objects.
    pub fn objects_mut(&mut self) -> &mut [Box<dyn Object>] {
        &mut self.objects
    }

    /// Returns a slice of screen-space UI objects.
    pub fn ui_objects(&self) -> &[Box<dyn Object>] {
        &self.ui_objects
    }

    /// Returns a mutable slice of screen-space UI objects.
    pub fn ui_objects_mut(&mut self) -> &mut [Box<dyn Object>] {
        &mut self.ui_objects
    }

    /// Returns a slice of logic-layer objects.
    pub fn logic_objects(&self) -> &[Box<dyn Object>] {
        &self.logic
    }

    /// Returns a mutable slice of logic-layer objects.
    pub fn logic_objects_mut(&mut self) -> &mut [Box<dyn Object>] {
        &mut self.logic
    }

    /// Queries world-space objects by tag (read-only).
    pub fn find_by_tag(&self, tag: &str) -> Vec<&dyn Object> {
        self.objects
            .iter()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_ref())
            .collect()
    }

    /// Queries world-space objects by tag (mutable).
    pub fn find_by_tag_mut<'a>(&'a mut self, tag: &str) -> Vec<&'a mut (dyn Object + 'static)> {
        self.objects
            .iter_mut()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_mut())
            .collect()
    }

    /// Queries screen-space UI objects by tag (read-only).
    pub fn find_ui_by_tag(&self, tag: &str) -> Vec<&dyn Object> {
        self.ui_objects
            .iter()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_ref())
            .collect()
    }

    /// Queries screen-space UI objects by tag (mutable).
    pub fn find_ui_by_tag_mut<'a>(&'a mut self, tag: &str) -> Vec<&'a mut (dyn Object + 'static)> {
        self.ui_objects
            .iter_mut()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_mut())
            .collect()
    }

    /// Queries logic-layer objects by tag (read-only).
    pub fn find_logic_by_tag(&self, tag: &str) -> Vec<&dyn Object> {
        self.logic
            .iter()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_ref())
            .collect()
    }

    /// Queries logic-layer objects by tag (mutable).
    pub fn find_logic_by_tag_mut<'a>(
        &'a mut self,
        tag: &str,
    ) -> Vec<&'a mut (dyn Object + 'static)> {
        self.logic
            .iter_mut()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_mut())
            .collect()
    }

    /// Returns a mutable reference to the first UI-space object matching concrete type `T`, or `None`.
    pub fn find_ui_typed_mut<T: 'static>(&mut self) -> Option<&mut T> {
        for obj in self.ui_objects.iter_mut() {
            if let Some(concrete) = obj.as_any_mut().and_then(|any| any.downcast_mut::<T>()) {
                return Some(concrete);
            }
        }
        None
    }

    /// Returns a mutable reference to the first world-space object matching concrete type `T`, or `None`.
    pub fn find_typed_mut<T: 'static>(&mut self) -> Option<&mut T> {
        for obj in self.objects.iter_mut() {
            if let Some(concrete) = obj.as_any_mut().and_then(|any| any.downcast_mut::<T>()) {
                return Some(concrete);
            }
        }
        None
    }

    /// Returns a mutable reference to the first logic-layer object matching concrete type `T`, or `None`.
    pub fn find_logic_typed_mut<T: 'static>(&mut self) -> Option<&mut T> {
        for obj in self.logic.iter_mut() {
            if let Some(concrete) = obj.as_any_mut().and_then(|any| any.downcast_mut::<T>()) {
                return Some(concrete);
            }
        }
        None
    }

    /// Counts world-space objects matching `tag`.
    pub fn count_by_tag(&self, tag: &str) -> usize {
        self.objects.iter().filter(|o| o.has_tag(tag)).count()
    }

    /// Counts UI-space objects matching `tag`.
    pub fn count_ui_by_tag(&self, tag: &str) -> usize {
        self.ui_objects.iter().filter(|o| o.has_tag(tag)).count()
    }

    /// Counts logic-layer objects matching `tag`.
    pub fn count_logic_by_tag(&self, tag: &str) -> usize {
        self.logic.iter().filter(|o| o.has_tag(tag)).count()
    }

    /// Adds a scripted [`Sequence`](crate::sequence::Sequence) to be updated automatically on frame logic passes.
    pub fn add_sequence(&mut self, sequence: crate::sequence::Sequence) {
        self.sequences.push(sequence);
    }

    /// Updates all world, UI objects, logic objects, and scripted sequences.
    pub fn update(&mut self, ctx: &mut Context) {
        for obj in self.objects.iter_mut() {
            obj.update(ctx);
        }
        for obj in self.ui_objects.iter_mut() {
            obj.update(ctx);
        }
        for obj in self.logic.iter_mut() {
            obj.update(ctx);
        }
        if !self.sequences.is_empty() {
            let mut seqs = std::mem::take(&mut self.sequences);
            for seq in &mut seqs {
                seq.update(ctx, self);
            }
            seqs.retain(|seq| !seq.is_finished());
            self.sequences.extend(seqs);
        }
    }

    /// Renders world-space objects inside camera view bounds.
    pub fn draw(&self) {
        for obj in self.objects.iter() {
            obj.draw();
        }
    }

    /// Renders screen-space UI objects outside camera view bounds.
    pub fn draw_ui(&self) {
        for obj in self.ui_objects.iter() {
            obj.draw();
        }
    }

    /// Renders non-text screen-space UI objects (`is_text_layer() == false`).
    /// Used when virtual resolution pipeline is active to render non-text UI into VRT.
    pub fn draw_ui_non_text(&self) {
        for obj in self.ui_objects.iter() {
            obj.draw_non_text();
        }
    }

    /// Renders text screen-space UI objects (`is_text_layer() == true`).
    /// Used when virtual resolution pipeline is active to render text directly at native screen resolution.
    pub fn draw_ui_text_only(&self) {
        for obj in self.ui_objects.iter() {
            obj.draw_text_only();
        }
    }
}

// ---------------------------------------------------------------------------
// World creation macros
// ---------------------------------------------------------------------------

/// Constructs a `Vec<Box<dyn Object>>` from expressions without requiring manual `Box::new()` boilerplate.
///
/// # Example
/// ```ignore
/// let objs = world_objects![player, enemy, bullet];
/// ```
#[macro_export]
macro_rules! world_objects {
    ($($obj:expr),* $(,)?) => {
        vec![$(Box::new($obj) as Box<dyn $crate::world::Object>),*]
    };
}

/// Declarative `World` constructor macro building world-space, UI-space, and optional logic-space entity layers.
///
/// # Example
/// ```ignore
/// let w = world! {
///     objects: [player, enemy],
///     ui: [hp_bar, score_text],
///     logic: [scene_switcher],
/// };
/// ```
#[macro_export]
macro_rules! world {
    (objects: [$($obj:expr),* $(,)?] $(,)? ui: [$($ui:expr),* $(,)?] $(,)? logic: [$($lg:expr),* $(,)?] $(,)?) => {{
        let mut w = $crate::world::World::new_with_ui(
            $crate::world_objects![$($obj),*],
            $crate::world_objects![$($ui),*],
        );
        $(w.add_logic($lg);)*
        w
    }};
    (objects: [$($obj:expr),* $(,)?] $(,)? ui: [$($ui:expr),* $(,)?] $(,)?) => {
        $crate::world::World::new_with_ui(
            $crate::world_objects![$($obj),*],
            $crate::world_objects![$($ui),*],
        )
    };
    (ui: [$($ui:expr),* $(,)?] $(,)? objects: [$($obj:expr),* $(,)?] $(,)?) => {
        $crate::world::World::new_with_ui(
            $crate::world_objects![$($obj),*],
            $crate::world_objects![$($ui),*],
        )
    };
    (objects: [$($obj:expr),* $(,)?] $(,)?) => {
        $crate::world::World::new_with_objects($crate::world_objects![$($obj),*])
    };
}
```
