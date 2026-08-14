use macroquad::{
    input::mouse_position,
    math::{vec2, Vec2},
};

use crate::engine::Context;

// ---------------------------------------------------------------------------
// DragState — Dragging state tracker struct
// ---------------------------------------------------------------------------

/// Helper struct for holding mouse dragging state. Include as a field inside structs implementing [`Draggable`].
///
/// # Example
/// ```ignore
/// struct MyWindow {
///     position: Vec2,
///     drag: DragState,
/// }
/// ```
#[derive(Clone, Debug, Default)]
pub struct DragState {
    /// Indicates whether the entity is currently being dragged.
    pub is_dragging: bool,
    /// Offset between the mouse grab point and the entity anchor position.
    pub offset: Vec2,
}

impl DragState {
    /// Creates a new un-grabbed [`DragState`].
    pub fn new() -> Self {
        Self {
            is_dragging: false,
            offset: vec2(0.0, 0.0),
        }
    }
}

// ---------------------------------------------------------------------------
// Draggable trait — Mouse drag-and-drop interaction trait
// ---------------------------------------------------------------------------

/// Trait providing drag-and-drop interaction mechanics for entities.
///
/// Implement [`Draggable::drag_anchor_mut`], [`Draggable::drag_state`], and [`Draggable::drag_state_mut`].
/// Default methods manage the full dragging lifecycle: `start_drag` -> `update_drag` -> `end_drag`.
///
/// # Coordinate Spaces
///
/// - Methods **without** the `_ctx` suffix ([`start_drag`](Draggable::start_drag), [`update_drag`](Draggable::update_drag)) operate in **screen space** (raw pixel mouse coordinates). Use these for UI components ([`Panel`](crate::ui::Panel)).
/// - For world-space entities (such as [`Sprite`](crate::object::Sprite) rendered through a 2D camera), **use the `_ctx` variants** ([`start_drag_ctx`](Draggable::start_drag_ctx), [`update_drag_ctx`](Draggable::update_drag_ctx)), which convert mouse position via `ctx.camera.screen_to_world()`.
///
/// # Example
/// ```ignore
/// if ctx.input.is_mouse_button_pressed(MouseButton::Left) && obj.is_drag_hovered() {
///     obj.start_drag_ctx(ctx);
/// }
/// obj.update_drag_ctx(ctx);
/// if ctx.input.is_mouse_button_released(MouseButton::Left) {
///     obj.end_drag();
/// }
/// ```
pub trait Draggable {
    /// Returns a mutable reference to the entity's position anchor point.
    fn drag_anchor_mut(&mut self) -> &mut Vec2;

    /// Returns a read-only reference to the entity's [`DragState`].
    fn drag_state(&self) -> &DragState;

    /// Returns a mutable reference to the entity's [`DragState`].
    fn drag_state_mut(&mut self) -> &mut DragState;

    /// Checks whether the mouse cursor is currently over the draggable grab handle area.
    /// Defaults to `true`. Override to restrict grab regions (e.g., window titlebar).
    fn is_drag_hovered(&self) -> bool {
        true
    }

    /// Begins dragging (**screen space**).
    ///
    /// ⚠️ For world-space entities rendered with a 2D camera, use [`start_drag_ctx`](Draggable::start_drag_ctx).
    fn start_drag(&mut self) {
        let (mx, my) = mouse_position();
        let anchor = *self.drag_anchor_mut();
        let offset = vec2(mx, my) - anchor;
        let state = self.drag_state_mut();
        state.is_dragging = true;
        state.offset = offset;
    }

    /// Begins dragging (**world space** using camera matrix transformation).
    fn start_drag_ctx(&mut self, ctx: &Context) {
        let m_world = ctx.camera.screen_to_world(ctx.input.mouse_position());
        let anchor = *self.drag_anchor_mut();
        let offset = m_world - anchor;
        let state = self.drag_state_mut();
        state.is_dragging = true;
        state.offset = offset;
    }

    /// Updates the entity's position according to mouse movement (**screen space**). Call each frame.
    ///
    /// ⚠️ For world-space entities rendered with a 2D camera, use [`update_drag_ctx`](Draggable::update_drag_ctx).
    fn update_drag(&mut self) {
        if !self.drag_state().is_dragging {
            return;
        }
        let (mx, my) = mouse_position();
        let offset = self.drag_state().offset;
        *self.drag_anchor_mut() = vec2(mx, my) - offset;
    }

    /// Updates the entity's position according to mouse movement (**world space** using camera matrix transformation).
    fn update_drag_ctx(&mut self, ctx: &Context) {
        if !self.drag_state().is_dragging {
            return;
        }
        let m_world = ctx.camera.screen_to_world(ctx.input.mouse_position());
        let offset = self.drag_state().offset;
        *self.drag_anchor_mut() = m_world - offset;
    }

    /// Concludes the dragging operation.
    fn end_drag(&mut self) {
        self.drag_state_mut().is_dragging = false;
    }

    /// Returns `true` if the entity is currently being dragged.
    fn is_dragging(&self) -> bool {
        self.drag_state().is_dragging
    }
}
