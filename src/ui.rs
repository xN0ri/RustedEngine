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

/// Clears the virtual resolution override, restoring `safe_screen_*` to real screen dimensions.
#[allow(dead_code)]
pub(crate) fn clear_virtual_resolution() {
    VIRTUAL_RES.with(|r| *r.borrow_mut() = None);
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

    /// Explicit padding for specific sides (Flutter-style `Padding::only(...)`).
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

impl UIAnchor {
    /// Computes top-left `Vec2` position for an element of `size` relative to current screen dimensions (`screen_width()` × `screen_height()`).
    pub fn compute_position(&self, size: Vec2, padding: impl Into<Padding>) -> Vec2 {
        let p = padding.into();
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        match self {
            UIAnchor::TopLeft => vec2(p.left, p.top),
            UIAnchor::TopCenter => vec2((sw - size.x) * 0.5 + p.left - p.right, p.top),
            UIAnchor::TopRight => vec2(sw - size.x - p.right, p.top),
            UIAnchor::CenterLeft => vec2(p.left, (sh - size.y) * 0.5 + p.top - p.bottom),
            UIAnchor::Center => vec2((sw - size.x) * 0.5 + p.left - p.right, (sh - size.y) * 0.5 + p.top - p.bottom),
            UIAnchor::CenterRight => vec2(sw - size.x - p.right, (sh - size.y) * 0.5 + p.top - p.bottom),
            UIAnchor::BottomLeft => vec2(p.left, sh - size.y - p.bottom),
            UIAnchor::BottomCenter => vec2((sw - size.x) * 0.5 + p.left - p.right, sh - size.y - p.bottom),
            UIAnchor::BottomRight => vec2(sw - size.x - p.right, sh - size.y - p.bottom),
        }
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
        }
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

    /// Builder pattern: Sets a custom TTF font loaded in the asset manager by name.
    pub fn with_font_from_assets(
        mut self,
        assets: &crate::asset_manager::Assets,
        name: &str,
    ) -> Self {
        if let Some(font) = assets.get_font(name) {
            self.font = Some(font.clone());
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

        if let Some(max_w) = max_width {
            let font_ref = self.font.as_ref();
            let lines = self.wrap_lines_with(&self.content, max_w, |s| {
                measure_text(s, font_ref, font_size as u16, 1.0).width
            });

            for (i, line) in lines.iter().enumerate() {
                let y = pos.y + (i as f32) * line_spacing;
                if let Some(ref font) = self.font {
                    draw_text_ex(
                        line,
                        pos.x,
                        y,
                        TextParams {
                            font: Some(font),
                            font_size: font_size as u16,
                            color: self.color,
                            ..Default::default()
                        },
                    );
                } else {
                    draw_text(line, pos.x, y, font_size, self.color);
                }
            }
        } else {
            if let Some(ref font) = self.font {
                draw_text_ex(
                    &self.content,
                    pos.x,
                    pos.y,
                    TextParams {
                        font: Some(font),
                        font_size: font_size as u16,
                        color: self.color,
                        ..Default::default()
                    },
                );
            } else {
                draw_text(&self.content, pos.x, pos.y, font_size, self.color);
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

impl<Data> std::ops::DerefMut for Behavior<Text, Data> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.inner
    }
}

// ---------------------------------------------------------------------------
// Button — Interactive UI button
// ---------------------------------------------------------------------------

/// Interactive UI button component.
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
        }
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
    fn update(&mut self, _ctx: &mut Context) {}

    fn draw(&self) {
        if !self.visible {
            return;
        }
        let pos = self.position + get_draw_offset();
        let bg_color = if self.is_hovered() {
            self.hover_color
        } else {
            self.color
        };
        draw_rectangle(pos.x, pos.y, self.size.x, self.size.y, bg_color);
        let tx = pos.x + 10.0;
        let ty = pos.y + (self.size.y / 2.0) + (self.font_size / 3.0);
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
}

impl ProgressBar {
    /// Creates a new [`ProgressBar`].
    pub fn new(position: Vec2, size: Vec2, progress: f32) -> Self {
        Self {
            position,
            size,
            progress: progress.clamp(0.0, 1.0),
            bg_color: RED,
            fill_color: GREEN,
            tag: String::new(),
            visible: true,
            active: true,
            state_binding: None,
        }
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
        self.progress = progress.clamp(0.0, 1.0);
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
        }
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
    fn update(&mut self, _ctx: &mut Context) {
        if let Some((anchor, pad)) = self.anchor {
            self.position = anchor.compute_position(self.size, pad);
        } else if self.auto_screen_size {
            let sw = safe_screen_width();
            let sh = safe_screen_height();
            self.position = vec2(self.screen_padding, self.screen_padding);
            self.size = vec2((sw - self.screen_padding * 2.0).max(10.0), (sh - self.screen_padding * 2.0).max(10.0));
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        let pos = self.position + get_draw_offset();
        draw_texture_ex(
            &self.texture,
            pos.x,
            pos.y,
            self.tint,
            DrawTextureParams {
                dest_size: Some(self.size),
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
        }
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
        if let Some(ref tex) = self.background_texture {
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
            let current_clip = SCISSOR_STACK.with(|stack| {
                let mut stack = stack.borrow_mut();
                let new_clip = if let Some(&parent_clip) = stack.last() {
                    intersect_rects(parent_clip, my_rect)
                } else {
                    my_rect
                };
                stack.push(new_clip);
                new_clip
            });

            apply_gl_scissor(Some(current_clip));

            render_children();

            let prev_clip = SCISSOR_STACK.with(|stack| {
                let mut stack = stack.borrow_mut();
                stack.pop();
                stack.last().copied()
            });

            apply_gl_scissor(prev_clip);
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
    lines: Vec<String>,
    scroll_offset: f32,
    target_scroll: f32,
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
            scroll_mode: ScrollMode::Instant,
            auto_screen_size: false,
            screen_padding: 0.0,
            lines: Vec::new(),
            scroll_offset: 0.0,
            target_scroll: 0.0,
        }
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

    /// Builder pattern: Sets a custom TTF font loaded from the asset manager by name.
    pub fn with_font_from_assets(
        mut self,
        assets: &crate::asset_manager::Assets,
        name: &str,
    ) -> Self {
        if let Some(font) = assets.get_font(name) {
            self.font = Some(font.clone());
        }
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
        let content = text.into();
        for line in content.split('\n') {
            self.lines.push(line.to_string());
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
    pub fn lines(&self) -> &[String] {
        &self.lines
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
            self.size = vec2((sw - self.screen_padding * 2.0).max(10.0), (sh - self.screen_padding * 2.0).max(10.0));
        }

        // Mouse wheel scrolling when cursor is inside log viewport in real screen pixels
        let (mx, my) = macroquad::input::mouse_position();
        if self.real_screen_rect().contains(vec2(mx, my)) {
            let (_wheel_x, wheel_y) = macroquad::input::mouse_wheel();
            if wheel_y != 0.0 {
                self.target_scroll -= wheel_y * 35.0;
            }
        }
        let max_scroll = self.target_scroll_bottom();
        self.target_scroll = self.target_scroll.clamp(0.0, max_scroll);

        match self.scroll_mode {
            ScrollMode::Smooth(speed) => {
                let dt = ctx.time.deltatime();
                let lerp_factor = (speed * dt).min(1.0);
                self.scroll_offset += (self.target_scroll - self.scroll_offset) * lerp_factor;
            }
            ScrollMode::Instant => {
                self.scroll_offset = self.target_scroll;
            }
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
            for (i, line) in self.lines.iter().enumerate() {
                let draw_x = pos.x;
                let draw_y = pos.y + (i as f32) * line_spacing + font_size * 0.75 - scroll_offset;
                if let Some(ref font) = self.font {
                    draw_text_ex(
                        line,
                        draw_x,
                        draw_y,
                        TextParams {
                            font: Some(font),
                            font_size: font_size as u16,
                            color: self.color,
                            ..Default::default()
                        },
                    );
                } else {
                    draw_text(line, draw_x, draw_y, font_size, self.color);
                }
            }
        };

        if self.clip_content {
            let current_clip = SCISSOR_STACK.with(|stack| {
                let mut stack = stack.borrow_mut();
                let new_clip = if let Some(&parent_clip) = stack.last() {
                    intersect_rects(parent_clip, my_rect)
                } else {
                    my_rect
                };
                stack.push(new_clip);
                new_clip
            });

            apply_gl_scissor(Some(current_clip));
            render_lines();

            let prev_clip = SCISSOR_STACK.with(|stack| {
                let mut stack = stack.borrow_mut();
                stack.pop();
                stack.last().copied()
            });
            apply_gl_scissor(prev_clip);
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
        for line in new_lines {
            self.lines.push(line.to_string());
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

/// Interactive UI text input field supporting focus management, character typing,
/// placeholder text, blinking cursor, custom fonts, and optional decorations.
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
    cursor_timer: f32,
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
        }
    }

    /// Builder pattern: Sets initial text.
    pub fn with_text(mut self, text: &str) -> Self {
        self.text = text.to_string();
        self
    }

    /// Builder pattern: Sets a custom TTF font.
    pub fn with_font(mut self, font: Font) -> Self {
        self.font = Some(font);
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
        Rect {
            x: self.position.x,
            y: self.position.y,
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

        if is_mouse_button_pressed(MouseButton::Left) {
            self.focused = self.is_hovered_ctx(ctx);
            if self.focused {
                self.cursor_timer = 0.0;
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

            if is_key_pressed(KeyCode::Backspace) {
                self.text.pop();
            }
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }

        let pos = self.position + get_draw_offset();

        if self.decorated {
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

        let tx = if self.decorated { pos.x + 8.0 } else { pos.x };
        let ty = pos.y + (self.size.y / 2.0) + (self.font_size / 3.0);

        if let Some(ref font) = self.font {
            draw_text_ex(
                text_to_draw,
                tx,
                ty,
                TextParams {
                    font: Some(font),
                    font_size: self.font_size as u16,
                    color: color_to_draw,
                    ..Default::default()
                },
            );
        } else {
            draw_text(text_to_draw, tx, ty, self.font_size, color_to_draw);
        }

        if self.focused && (self.cursor_timer % 0.8) < 0.4 {
            let text_dim = measure_text(
                if self.text.is_empty() { "" } else { &self.text },
                self.font.as_ref(),
                self.font_size as u16,
                1.0,
            );
            let cursor_x = tx + text_dim.width + 2.0;
            let cursor_top = pos.y + 4.0;
            let cursor_height = (self.size.y - 8.0).max(self.font_size);
            draw_rectangle(cursor_x, cursor_top, 2.0, cursor_height, self.text_color);
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
}
