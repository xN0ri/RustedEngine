//! Interactive UI text input field component.

use macroquad::{
    color::{Color, GRAY, WHITE},
    input::{KeyCode, MouseButton, is_key_pressed, is_mouse_button_pressed},
    math::{Rect, Vec2},
    shapes::draw_rectangle,
    text::{Font, TextParams, draw_text, draw_text_ex, measure_text},
};

use crate::{
    engine::Context,
    object::{Behavior, Clickable},
    world::Object,
};

use super::core::{Margin, Padding, ScissorGuard, get_draw_offset, get_ui_scale};

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
    pub backspace_timer: f32,
    pub backspace_repeat_timer: f32,
    pub on_submit: Option<Box<dyn FnMut(&str, &mut Context)>>,
    pub on_change: Option<Box<dyn FnMut(&str, &mut Context)>>,
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
            backspace_timer: 0.0,
            backspace_repeat_timer: 0.0,
            on_submit: None,
            on_change: None,
            padding: Padding::default(),
            margin: Margin::default(),
            fill_parent: false,
            alignment: TextAlignment::Left,
            text_offset: Vec2::ZERO,
            bitmap_font: None,
        }
    }

    /// Builder pattern: Attaches a pre-baked [`BitmapFont`](crate::bitmap_font::BitmapFont) atlas for 100% crisp pixel font rendering.
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

    /// Builder pattern: Attaches an `on_change` callback executed whenever the typed text changes.
    pub fn on_change<F: FnMut(&str, &mut Context) + 'static>(mut self, callback: F) -> Self {
        self.on_change = Some(Box::new(callback));
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
            let old_text = self.text.clone();

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

            let bs_down = macroquad::input::is_key_down(KeyCode::Backspace)
                || ctx.input.is_key_down(macroquad::input::KeyCode::Backspace);
            let bs_pressed = is_key_pressed(KeyCode::Backspace)
                || ctx.input.is_key_pressed(macroquad::input::KeyCode::Backspace);

            if bs_pressed {
                self.text.pop();
                self.backspace_timer = 0.0;
                self.backspace_repeat_timer = 0.0;
            } else if bs_down {
                self.backspace_timer += ctx.time.deltatime();
                if self.backspace_timer >= 0.35 {
                    self.backspace_repeat_timer += ctx.time.deltatime();
                    while self.backspace_repeat_timer >= 0.04 {
                        self.backspace_repeat_timer -= 0.04;
                        self.text.pop();
                    }
                }
            } else {
                self.backspace_timer = 0.0;
                self.backspace_repeat_timer = 0.0;
            }

            if self.text != old_text {
                if let Some(ref mut callback) = self.on_change {
                    let txt = self.text.clone();
                    (callback)(&txt, ctx);
                }
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

        let clip_rect = Rect {
            x: pos.x * scale + ui_offset.x,
            y: pos.y * scale + ui_offset.y,
            w: self.size.x * scale,
            h: self.size.y * scale,
        };
        let _guard = ScissorGuard::new(clip_rect);

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
        let avail_w = (self.size.x - pad_left - pad_right).max(10.0);

        if let Some(ref bm) = self.bitmap_font {
            let scale_f = (self.font_size * scale) / bm.native_size as f32;
            let bm_dim = bm.measure(if text_to_draw.is_empty() { "A" } else { text_to_draw }, scale_f);
            let typed_dim = bm.measure(&self.text, scale_f);
            let typed_unscaled_w = typed_dim.x / scale;

            let mut scroll_x = 0.0f32;
            if typed_unscaled_w > avail_w - 4.0 {
                scroll_x = typed_unscaled_w - (avail_w - 4.0);
            }

            let start_x = match self.alignment {
                TextAlignment::Left => pos.x + pad_left,
                TextAlignment::Center => pos.x + (self.size.x - bm_dim.x / scale) * 0.5,
                TextAlignment::Right => pos.x + self.size.x - pad_right - (bm_dim.x / scale),
            };
            let unscaled_tx = start_x + self.text_offset.x - scroll_x;
            let unscaled_ty = pos.y + (self.size.y - bm_dim.y / scale) * 0.5 + self.text_offset.y;

            let final_tx = (unscaled_tx * scale + ui_offset.x).round();
            let final_ty = (unscaled_ty * scale + ui_offset.y).round();

            bm.draw(text_to_draw, final_tx, final_ty, scale_f, color_to_draw);

            if self.focused && (self.cursor_timer % 1.0) < 0.5 {
                let final_cx = final_tx + typed_dim.x + 1.0;
                let cur_h = (self.font_size * scale * 0.72).round().max(2.0);
                let final_cy = (final_ty + (bm_dim.y - cur_h) * 0.5).round();
                let final_cw = (1.0 * scale).round().max(1.0);
                let cursor_color = Color::new(self.text_color.r, self.text_color.g, self.text_color.b, 0.85);
                draw_rectangle(final_cx, final_cy, final_cw, cur_h, cursor_color);
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

        let typed_dim = measure_text(
            &self.text,
            self.font.as_ref(),
            scaled_font_size,
            1.0,
        );
        let typed_unscaled_w = typed_dim.width / scale;

        let mut scroll_x = 0.0f32;
        if typed_unscaled_w > avail_w - 4.0 {
            scroll_x = typed_unscaled_w - (avail_w - 4.0);
        }

        let unscaled_text_w = text_dim.width / scale;
        let start_x = match self.alignment {
            TextAlignment::Left => pos.x + pad_left,
            TextAlignment::Center => pos.x + (self.size.x - unscaled_text_w) * 0.5,
            TextAlignment::Right => pos.x + self.size.x - pad_right - unscaled_text_w,
        };

        let unscaled_text_h = if text_dim.height > 0.0 { text_dim.height / scale } else { self.font_size };
        let unscaled_offset_y = if text_dim.offset_y > 0.0 { text_dim.offset_y / scale } else { self.font_size * 0.70 };

        let unscaled_tx = start_x + self.text_offset.x - scroll_x;
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
            let unscaled_cursor_x = unscaled_tx + (typed_dim.width / scale) + 1.0;
            let cur_h = (self.font_size * scale * 0.72).round().max(2.0);
            let final_cx = (unscaled_cursor_x * scale + ui_offset.x).round();
            let text_top_y = final_ty - unscaled_offset_y * scale;
            let final_cy = (text_top_y + (unscaled_text_h * scale - cur_h) * 0.5).round();
            let final_cw = (1.0 * scale).round().max(1.0);

            let cursor_color = Color::new(self.text_color.r, self.text_color.g, self.text_color.b, 0.85);
            draw_rectangle(final_cx, final_cy, final_cw, cur_h, cursor_color);
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

    fn get_text(&self) -> Option<String> {
        Some(self.text.clone())
    }

    fn set_text(&mut self, text: &str) {
        self.text = text.to_string();
    }

    fn as_any(&self) -> Option<&dyn std::any::Any> {
        Some(self)
    }

    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        Some(self)
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
