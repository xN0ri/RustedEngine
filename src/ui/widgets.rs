//! Interactive widgets: [`Slider`], [`Checkbox`], and [`Tooltip`].

use macroquad::{
    color::{Color, GRAY, GREEN, WHITE},
    input::{MouseButton, is_mouse_button_pressed},
    math::{Rect, Vec2},
    shapes::draw_rectangle,
    text::{draw_text, measure_text},
};

use crate::{
    engine::Context,
    object::Clickable,
    world::Object,
};

use super::core::get_draw_offset;

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
