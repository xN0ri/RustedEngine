//! Auto-scrolling text log UI component for terminal-style output, dialogue logs, and consoles.

use macroquad::{
    color::{Color, WHITE},
    math::{Rect, Vec2, vec2},
    text::{Font, TextParams, draw_text, draw_text_ex, measure_text},
};

use crate::{
    engine::Context,
    object::Behavior,
    world::Object,
};

use super::{
    core::{Padding, ScissorGuard, UIAnchor, get_draw_offset, get_ui_scale, safe_screen_height, safe_screen_width},
    text::parse_rich_text,
};

/// Scroll animation mode for [`TextLog`].
#[derive(Clone, Debug)]
pub enum ScrollMode {
    /// Scroll jumps instantly to the bottom when a new line is added.
    Instant,
    /// Scroll lerps toward the target bottom position each frame at the given speed factor.
    Smooth(f32),
}

/// Single colored line entry stored inside a [`TextLog`].
#[derive(Clone, Debug)]
pub struct TextLogLine {
    pub text: String,
    pub color: Color,
}

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

impl TextLog {
    /// Creates a new [`TextLog`] at `(0, 0)` with default dimensions `(300.0, 150.0)`, font size 16.0, and WHITE color.
    pub fn simple() -> Self {
        Self::new(Vec2::ZERO, Vec2::new(300.0, 150.0), 16.0, WHITE)
    }

    /// Creates an empty [`TextLog`] at `(0, 0)` (alias for [`simple`](TextLog::simple)).
    pub fn empty() -> Self {
        Self::simple()
    }

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

    /// Builder pattern: Sets explicit text log position `(x, y)`.
    pub fn with_position(mut self, position: Vec2) -> Self {
        self.position = position;
        self
    }

    /// Builder pattern: Sets explicit text log position `(x, y)` (alias for [`with_position`](TextLog::with_position)).
    pub fn with_pos(mut self, pos: Vec2) -> Self {
        self.position = pos;
        self
    }

    /// Builder pattern: Sets explicit text log size `(width, height)`.
    pub fn with_size(mut self, size: Vec2) -> Self {
        self.size = size;
        self
    }

    /// Builder pattern: Sets both position and size from a [`Rect`].
    pub fn with_rect(mut self, rect: Rect) -> Self {
        self.position = vec2(rect.x, rect.y);
        self.size = vec2(rect.w, rect.h);
        self
    }

    /// Builder pattern: Sets font size.
    pub fn with_font_size(mut self, font_size: f32) -> Self {
        self.font_size = font_size;
        self.line_spacing = font_size * 1.2;
        self
    }

    /// Builder pattern: Sets default text color.
    pub fn with_color(mut self, color: Color) -> Self {
        self.color = color;
        self
    }

    /// Builder pattern: Attaches a pre-baked [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas for 100% crisp pixel font rendering.
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

    fn set_size(&mut self, size: macroquad::math::Vec2) {
        self.size = size;
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

    fn get_text(&self) -> Option<String> {
        Some(self.lines.iter().map(|l| l.text.as_str()).collect::<Vec<_>>().join("\n"))
    }

    fn as_any(&self) -> Option<&dyn std::any::Any> {
        Some(self)
    }

    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        Some(self)
    }
}

impl Default for TextLog {
    fn default() -> Self {
        Self::empty()
    }
}

/// Type alias for a text log component combined with game data and update closure.
pub type TextLogObject<Data> = Behavior<TextLog, Data>;
