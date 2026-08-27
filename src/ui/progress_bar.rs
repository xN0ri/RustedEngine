//! Visual UI progress bar component supporting optional data binding via [`Context::state`](crate::engine::Context::state).

use macroquad::{
    color::{Color, GREEN, RED, WHITE},
    math::Vec2,
    shapes::draw_rectangle,
    text::{draw_text, measure_text},
};

use crate::{
    engine::Context,
    world::Object,
};

use super::core::{Margin, Padding, get_draw_offset};

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
    /// Creates a new [`ProgressBar`] at `(0, 0)` with default dimensions `(200.0, 20.0)` and given initial progress `[0.0, 1.0]`.
    pub fn progress(progress: f32) -> Self {
        Self::new(Vec2::ZERO, Vec2::new(200.0, 20.0), progress)
    }

    /// Creates an empty [`ProgressBar`] at `(0, 0)` with default dimensions `(200.0, 20.0)`.
    pub fn empty() -> Self {
        Self::progress(0.0)
    }

    /// Creates a new [`ProgressBar`] with default height 20.0.
    pub fn simple(position: Vec2, width: f32, progress: f32) -> Self {
        Self::new(position, Vec2::new(width, 20.0), progress)
    }

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

    /// Builder pattern: Sets explicit progress bar position `(x, y)`.
    pub fn with_position(mut self, position: Vec2) -> Self {
        self.position = position;
        self
    }

    /// Builder pattern: Sets explicit progress bar position `(x, y)` (alias for [`with_position`](ProgressBar::with_position)).
    pub fn with_pos(mut self, pos: Vec2) -> Self {
        self.position = pos;
        self
    }

    /// Builder pattern: Sets explicit progress bar size `(width, height)`.
    pub fn with_size(mut self, size: Vec2) -> Self {
        self.size = size;
        self
    }

    /// Builder pattern: Sets both position and size from a [`macroquad::math::Rect`].
    pub fn with_rect(mut self, rect: macroquad::math::Rect) -> Self {
        self.position = macroquad::math::vec2(rect.x, rect.y);
        self.size = macroquad::math::vec2(rect.w, rect.h);
        self
    }

    /// Builder pattern: Sets current progress value `[0.0, 1.0]`.
    pub fn with_progress(mut self, progress: f32) -> Self {
        let p = progress.clamp(0.0, 1.0);
        self.progress = p;
        self.target_progress = p;
        self
    }

    /// Builder pattern: Centers progress bar on screen.
    pub fn center_on_screen(mut self) -> Self {
        let sw = super::core::safe_screen_width();
        let sh = super::core::safe_screen_height();
        self.position = macroquad::math::vec2((sw - self.size.x) * 0.5, (sh - self.size.y) * 0.5);
        self
    }

    /// Builder pattern: Aligns progress bar on screen using a [`UIAnchor`](super::core::UIAnchor) preset and padding.
    pub fn align_to_screen(mut self, anchor: super::core::UIAnchor, padding: impl Into<Padding>) -> Self {
        self.position = anchor.compute_position(self.size, padding);
        self
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

    fn set_size(&mut self, size: macroquad::math::Vec2) {
        self.size = size;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }
}

impl Default for ProgressBar {
    fn default() -> Self {
        Self::empty()
    }
}
