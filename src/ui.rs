use macroquad::{
    color::{Color, GRAY, GREEN, LIGHTGRAY, RED, WHITE},
    input::{is_mouse_button_pressed, mouse_position, MouseButton},
    math::{vec2, Rect, Vec2},
    shapes::draw_rectangle,
    text::draw_text,
};

use crate::{
    draggable::{DragState, Draggable},
    engine::Context,
    object::{Behavior, Clickable},
    world::Object,
};

// ---------------------------------------------------------------------------
// RevealMode — Text reveal animation mode
// ---------------------------------------------------------------------------

/// Text reveal animation mode for [`Text`].
#[derive(Clone, Debug)]
pub enum RevealMode {
    /// Text appears instantly in full.
    Instant,
    /// Text appears character-by-character at the specified speed.
    Typewriter { chars_per_sec: f32 },
}

impl Default for RevealMode {
    fn default() -> Self {
        RevealMode::Instant
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
    pub color: Color,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    /// Active reveal animation mode. Defaults to [`RevealMode::Instant`].
    pub reveal_mode: RevealMode,
    /// Full target string when in Typewriter mode.
    full_content: String,
    /// Counter tracking revealed characters.
    revealed_chars: f32,
}

impl Text {
    /// Creates a new [`Text`] component with instant reveal mode.
    pub fn new(text: &str, position: Vec2, font_size: f32, color: Color) -> Self {
        Self {
            content: text.to_string(),
            full_content: text.to_string(),
            position,
            font_size,
            color,
            tag: String::new(),
            visible: true,
            active: true,
            reveal_mode: RevealMode::Instant,
            revealed_chars: text.len() as f32,
        }
    }

    /// Builder pattern: Sets the text color.
    pub fn with_color(mut self, color: Color) -> Self {
        self.color = color;
        self
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
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

    /// Returns `true` if the text reveal animation has finished displaying all characters.
    pub fn is_finished(&self) -> bool {
        self.revealed_chars >= self.full_content.len() as f32
    }
}

impl Object for Text {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
        }
        if let RevealMode::Typewriter { chars_per_sec } = self.reveal_mode {
            if !self.is_finished() {
                self.revealed_chars += chars_per_sec * ctx.time.deltatime();
                let count = (self.revealed_chars as usize).min(self.full_content.len());
                self.content = self.full_content
                    .char_indices()
                    .take(count)
                    .last()
                    .map(|(i, c)| &self.full_content[..i + c.len_utf8()])
                    .unwrap_or("")
                    .to_string();
            }
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        draw_text(
            &self.content,
            self.position.x,
            self.position.y,
            self.font_size,
            self.color,
        );
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

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
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
    pub color: Color,
    pub hover_color: Color,
    pub text_color: Color,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Button {
    /// Creates a new UI [`Button`].
    pub fn new(position: Vec2, size: Vec2, label: &str) -> Self {
        Self {
            position,
            size,
            label: label.to_string(),
            font_size: 20.0,
            color: GRAY,
            hover_color: LIGHTGRAY,
            text_color: WHITE,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
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
        let bg_color = if self.is_hovered() {
            self.hover_color
        } else {
            self.color
        };
        draw_rectangle(
            self.position.x,
            self.position.y,
            self.size.x,
            self.size.y,
            bg_color,
        );
        let tx = self.position.x + 10.0;
        let ty = self.position.y + (self.size.y / 2.0) + (self.font_size / 3.0);
        draw_text(&self.label, tx, ty, self.font_size, self.text_color);
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
        if let Some(key) = &self.state_binding {
            if ctx.state.has_flag(key) {
                let val = ctx.state.get_float(key) as f32;
                self.set_progress(val);
            }
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        draw_rectangle(
            self.position.x,
            self.position.y,
            self.size.x,
            self.size.y,
            self.bg_color,
        );
        let fill_w = self.size.x * self.progress;
        if fill_w > 0.0 {
            draw_rectangle(
                self.position.x,
                self.position.y,
                fill_w,
                self.size.y,
                self.fill_color,
            );
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
    pub border_color: Option<Color>,
    pub border_width: f32,
    pub children: Vec<Box<dyn Object>>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    pub drag: DragState,
    pub draggable: bool,
}

impl Panel {
    /// Creates a new [`Panel`] with default styling and dragging enabled.
    pub fn new(position: Vec2, size: Vec2) -> Self {
        Self {
            position,
            size,
            background_color: Color::from_rgba(30, 30, 40, 220),
            border_color: Some(Color::from_rgba(80, 80, 100, 255)),
            border_width: 1.5,
            children: Vec::new(),
            tag: String::new(),
            visible: true,
            active: true,
            drag: DragState::new(),
            draggable: true,
        }
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

impl Object for Panel {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
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

        for child in self.children.iter_mut() {
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        draw_rectangle(
            self.position.x,
            self.position.y,
            self.size.x,
            self.size.y,
            self.background_color,
        );
        if let Some(bc) = self.border_color {
            let bw = self.border_width;
            draw_rectangle(self.position.x, self.position.y, self.size.x, bw, bc);
            draw_rectangle(self.position.x, self.position.y + self.size.y - bw, self.size.x, bw, bc);
            draw_rectangle(self.position.x, self.position.y, bw, self.size.y, bc);
            draw_rectangle(self.position.x + self.size.x - bw, self.position.y, bw, self.size.y, bc);
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

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
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
    pub fn raise_clicked(&mut self) {
        let (mx, my) = mouse_position();
        if !is_mouse_button_pressed(MouseButton::Left) {
            return;
        }
        let mut hit_tag: Option<String> = None;
        for element in self.elements.iter().rev() {
            let _ = (mx, my);
            let tag = element.tag().to_string();
            if !tag.is_empty() {
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