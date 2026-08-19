//! Interactive UI button component.

use macroquad::{
    color::{Color, GRAY, LIGHTGRAY, WHITE},
    input::{MouseButton, is_mouse_button_pressed},
    math::{Rect, Vec2},
    shapes::draw_rectangle,
    text::{Font, TextParams, draw_text, draw_text_ex, measure_text},
};

use crate::{
    engine::Context,
    object::Clickable,
    world::Object,
};

use super::core::{Margin, Padding, get_draw_offset};

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

    fn get_text(&self) -> Option<String> {
        Some(self.label.clone())
    }

    fn set_text(&mut self, text: &str) {
        self.label = text.to_string();
    }

    fn as_any(&self) -> Option<&dyn std::any::Any> {
        Some(self)
    }

    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        Some(self)
    }
}
