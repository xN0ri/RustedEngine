//! UI Image component for rendering textures/pictures in screen-space.

use macroquad::{
    color::{Color, WHITE},
    input::{MouseButton, is_mouse_button_pressed},
    math::{Rect, Vec2, vec2},
    texture::{DrawTextureParams, Texture2D, draw_texture_ex},
};

use crate::{
    engine::Context,
    object::{Behavior, Clickable},
    world::Object,
};

use super::{
    core::{Padding, UIAnchor, draw_nine_slice, get_draw_offset, safe_screen_height, safe_screen_width},
    layout::IntoUIObject,
};

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
    /// Optional click event callback handler.
    pub on_click: Option<Box<dyn FnMut(&mut Context)>>,
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
            on_click: None,
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

    /// Builder pattern: Attaches a click handler callback.
    pub fn on_click<F: FnMut(&mut Context) + 'static>(mut self, callback: F) -> Self {
        self.on_click = Some(Box::new(callback));
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
        if !self.active || !self.visible {
            return;
        }

        let mouse_clicked = is_mouse_button_pressed(MouseButton::Left)
            || ctx.input.is_mouse_button_pressed(macroquad::input::MouseButton::Left);
        if mouse_clicked {
            let is_hovered = self.is_hovered_ui(ctx) || self.is_hovered() || self.is_hovered_ctx(ctx);
            if is_hovered {
                if let Some(ref mut callback) = self.on_click {
                    (callback)(ctx);
                }
            }
        }

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
                child.set_position(self.position);
            } else {
                let child_size = child.bounds().map(|b| vec2(b.w, b.h)).unwrap_or(Vec2::ZERO);
                let offset = (self.size - child_size) * 0.5;
                child.set_position(self.position + offset);
            }
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

    fn set_text(&mut self, text: &str) {
        for child in &mut self.children {
            child.set_text(text);
        }
    }

    fn as_any(&self) -> Option<&dyn std::any::Any> {
        Some(self)
    }

    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        Some(self)
    }

    fn get_children(&self) -> Vec<&dyn Object> {
        self.children.iter().map(|c| c.as_ref()).collect()
    }

    fn get_children_mut<'a>(&'a mut self) -> Vec<&'a mut (dyn Object + 'static)> {
        self.children.iter_mut().map(|c| c.as_mut()).collect()
    }
}

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
