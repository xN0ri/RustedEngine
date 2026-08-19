//! General UI container (`Panel`) with child layout/scrolling support, and top-level `UI` container manager.

use macroquad::{
    color::{Color, WHITE},
    input::{MouseButton, is_mouse_button_pressed, mouse_position},
    math::{Rect, Vec2, vec2},
    shapes::draw_rectangle,
    texture::{DrawTextureParams, Texture2D, draw_texture_ex},
};

use crate::{
    draggable::{DragState, Draggable},
    engine::Context,
    object::Clickable,
    world::Object,
};

use super::{
    button::Button,
    core::{
        Margin, Padding, ScissorGuard, UIAnchor, draw_nine_slice, get_draw_offset, pop_draw_offset,
        push_draw_offset, safe_screen_height, safe_screen_width,
    },
    image::Image,
    text::Text,
};

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

    fn as_any(&self) -> Option<&dyn std::any::Any> {
        Some(self)
    }

    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        Some(self)
    }

    fn set_text(&mut self, text: &str) {
        for child in &mut self.children {
            child.set_text(text);
        }
    }

    fn get_children(&self) -> Vec<&dyn Object> {
        self.children.iter().map(|c| c.as_ref()).collect()
    }

    fn get_children_mut<'a>(&'a mut self) -> Vec<&'a mut (dyn Object + 'static)> {
        self.children.iter_mut().map(|c| c.as_mut()).collect()
    }
}

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
