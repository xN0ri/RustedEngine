//! UI Text and RichText components supporting typewriter animation, BBCode tags, bitmap fonts, and alignment.

use macroquad::{
    color::{Color, GRAY, GREEN, LIGHTGRAY, RED, WHITE},
    math::{Rect, Vec2, vec2},
    text::{Font, TextParams, draw_text, draw_text_ex, measure_text},
};

use crate::{
    engine::Context,
    object::{Behavior, Clickable},
    world::Object,
};

use super::core::{Margin, Padding, UIAnchor, get_draw_offset, get_ui_scale, safe_screen_height, safe_screen_width};

/// Text reveal animation mode for [`Text`].
#[derive(Clone, Debug, Default)]
pub enum RevealMode {
    /// Text appears instantly in full.
    #[default]
    Instant,
    /// Text appears character-by-character at the specified speed.
    Typewriter { chars_per_sec: f32 },
}

/// Text horizontal alignment modes.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum TextAlign {
    #[default]
    Left,
    Center,
    Right,
}

/// UI Text component supporting typewriter reveal animation.
///
/// # Field Naming Notice
/// The string content field is named `content` (instead of `text`) to avoid ambiguity
/// when accessing fields on [`Behavior<Text, Data>`](TextObject) via `Deref`.
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
    /// Whether this text expands to fill its parent container width.
    pub fill_parent: bool,
    /// Explicit bounds dimensions when embedded in a container or with `fill_parent`.
    pub size: Vec2,
}

impl Text {
    /// Creates a new [`Text`] component with default size 20.0 and WHITE color.
    pub fn label(text: impl Into<String>, position: Vec2) -> Self {
        Self::new(text, position, 20.0, WHITE)
    }

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
            fill_parent: false,
            size: Vec2::ZERO,
        }
    }

    /// Builder pattern: Enables expanding width to fill parent container bounds.
    pub fn fill_parent(mut self) -> Self {
        self.fill_parent = true;
        self
    }

    /// Builder pattern: Attaches a pre-baked [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas for 100% crisp pixel font rendering.
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
        if lines.len() <= 1 {
            (font_size * 0.75).round().max(1.0)
        } else {
            lines.len() as f32 * self.effective_line_spacing()
        }
    }

    /// Returns `true` if the text reveal animation has finished displaying all characters.
    pub fn is_finished(&self) -> bool {
        self.revealed_chars >= self.full_content.len() as f32
    }

    /// Returns resolved screen-space geometry `(pos, font_size, line_spacing, max_width, size)`
    /// accounting for current UI scale factor, draw offset, and letterbox viewport origin.
    pub(crate) fn resolved_geometry(&self) -> (Vec2, f32, f32, Option<f32>, Vec2) {
        let (scale, ui_offset) = get_ui_scale();
        let pos = self.position * scale + get_draw_offset() * scale + ui_offset;
        let font_size = self.font_size * scale;
        let line_spacing = if self.line_spacing > 0.0 {
            self.line_spacing * scale
        } else {
            font_size * 1.2
        };
        let max_width = self.max_width.map(|w| w * scale);
        let size = self.size * scale;
        (pos, font_size, line_spacing, max_width, size)
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
        let (pos, font_size, line_spacing, max_width, size) = self.resolved_geometry();
        let (scale, _) = get_ui_scale();

        let pad_l = self.padding.left * scale;
        let pad_r = self.padding.right * scale;
        let pad_t = self.padding.top * scale;
        let pad_b = self.padding.bottom * scale;

        let mar_l = self.margin.left * scale;
        let mar_r = self.margin.right * scale;
        let mar_t = self.margin.top * scale;
        let mar_b = self.margin.bottom * scale;

        if let Some(ref bm) = self.bitmap_font {
            let scale_f = font_size / bm.native_size as f32;

            let draw_single_line = |line: &str, raw_x: f32, top_y: f32| {
                let dims = bm.measure(line, scale_f);
                let base_x = raw_x + mar_l;
                let start_y = top_y + mar_t;

                let final_x = match self.alignment {
                    TextAlign::Left => base_x + pad_l,
                    TextAlign::Center => {
                        if size.x > 0.0 {
                            let usable_w = (size.x - mar_l - mar_r).max(0.0);
                            base_x + pad_l + (usable_w - pad_l - pad_r - dims.x) * 0.5
                        } else {
                            base_x + pad_l - dims.x * 0.5
                        }
                    }
                    TextAlign::Right => {
                        if size.x > 0.0 {
                            let usable_w = (size.x - mar_l - mar_r).max(0.0);
                            base_x + usable_w - pad_r - dims.x
                        } else {
                            base_x - pad_r - mar_r - dims.x
                        }
                    }
                };
                let align_offset_y = if size.y > 0.0 {
                    let usable_h = (size.y - mar_t - mar_b).max(0.0);
                    pad_t + (usable_h - pad_t - pad_b - dims.y) * 0.5
                } else {
                    pad_t
                };
                let final_y = start_y + align_offset_y;
                if let Some((shadow_color, shadow_offset)) = self.shadow {
                    bm.draw(
                        line,
                        final_x + shadow_offset.x * scale,
                        final_y + shadow_offset.y * scale,
                        scale_f,
                        shadow_color,
                    );
                }
                bm.draw(line, final_x, final_y, scale_f, self.color);
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

        let draw_single_line = |line: &str, raw_x: f32, top_y: f32| {
            let dims = measure_text(line, self.font.as_ref(), font_size.round() as u16, 1.0);
            let cap_h = font_size * 0.7;
            let base_x = raw_x + mar_l;
            let start_y = top_y + mar_t;

            let final_x = match self.alignment {
                TextAlign::Left => base_x + pad_l,
                TextAlign::Center => {
                    if size.x > 0.0 {
                        let usable_w = (size.x - mar_l - mar_r).max(0.0);
                        base_x + pad_l + (usable_w - pad_l - pad_r - dims.width) * 0.5
                    } else {
                        base_x + pad_l - dims.width * 0.5
                    }
                }
                TextAlign::Right => {
                    if size.x > 0.0 {
                        let usable_w = (size.x - mar_l - mar_r).max(0.0);
                        base_x + usable_w - pad_r - dims.width
                    } else {
                        base_x - pad_r - mar_r - dims.width
                    }
                }
            };

            let align_offset_y = if size.y > 0.0 {
                let usable_h = (size.y - mar_t - mar_b).max(0.0);
                (usable_h - pad_t - pad_b - cap_h) * 0.5
            } else {
                0.0
            };
            let base_y = start_y + pad_t + align_offset_y + cap_h;

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
        let (pos, font_size, _line_spacing, max_width, _size) = self.resolved_geometry();
        let raw_h = self.wrapped_height();
        let raw_w = if let Some(mw) = max_width {
            mw
        } else if let Some(ref bm) = self.bitmap_font {
            let scale_f = font_size / bm.native_size as f32;
            bm.measure(&self.content, scale_f).x
        } else {
            measure_text(&self.content, self.font.as_ref(), font_size as u16, 1.0).width
        };
        let x = pos.x + self.margin.left;
        let y = pos.y + self.margin.top;
        let w = (raw_w - self.margin.left - self.margin.right).max(1.0);
        let h = (raw_h + self.margin.top + self.margin.bottom).max(1.0);
        Some(Rect { x, y, w, h })
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

    fn set_size(&mut self, size: macroquad::math::Vec2) {
        self.size = size;
        if size.x > 0.0 && self.max_width.is_none() {
            self.max_width = Some(size.x);
        }
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

    fn content_height(&self) -> Option<f32> {
        Some(self.position.y + self.wrapped_height())
    }

    fn get_text(&self) -> Option<String> {
        Some(self.content.clone())
    }

    fn as_any(&self) -> Option<&dyn std::any::Any> {
        Some(self)
    }

    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        Some(self)
    }
}

/// Type alias for a text component combined with game data and update closure.
pub type TextObject<Data> = Behavior<Text, Data>;

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

    /// Builder pattern: Attaches a pre-baked [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas for 100% crisp pixel font rendering.
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

    fn get_text(&self) -> Option<String> {
        Some(self.content.clone())
    }

    fn as_any(&self) -> Option<&dyn std::any::Any> {
        Some(self)
    }

    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        Some(self)
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
