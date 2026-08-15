//! Generic layered, interactive UI panel manager.
//!
//! Provides [`Panel`] (trait), [`PanelManager`], and [`PanelId`].
//! The engine makes zero assumptions about what a panel represents in the game —
//! it could be a dialogue window, a HUD slot, a debug overlay, etc.
//! Concrete panel types are defined entirely by the game.
//!
//! # Mechanics provided by the engine
//! - **Z-order / focus**: clicking brings a panel to the front.
//! - **Hit-testing**: which panel is under the cursor.
//! - **Optional drag**: `Panel::is_draggable()` (default `false`).
//! - **Optional resize**: `Panel::is_resizable()` (default `false`).

use macroquad::{
    input::{is_mouse_button_down, is_mouse_button_pressed, mouse_position, MouseButton},
    math::{Rect, Vec2},
};

// ---------------------------------------------------------------------------
// Panel trait
// ---------------------------------------------------------------------------

/// Core trait for any UI panel managed by [`PanelManager`].
///
/// Implementors supply the game-specific update and draw logic.
/// The engine only calls these methods — it never inspects the data inside.
///
/// `Panel::update` intentionally does **not** take `&mut Context` — this avoids
/// borrow conflicts when the panel manager itself lives on `Context`.
/// If a panel needs engine context (input, resources, etc.), the game should
/// pass that data into the panel's own fields before calling `update`.
pub trait Panel {
    /// Called once per frame before drawing. `dt` is the frame delta time in seconds.
    fn update(&mut self, dt: f32);

    /// Called once per frame to render the panel inside `rect`.
    fn draw(&self, rect: Rect);

    /// Called when the panel is removed from the manager.
    fn on_close(&mut self) {}

    /// Returns `true` if the player may drag this panel with the mouse.
    /// Defaults to `false`.
    fn is_draggable(&self) -> bool {
        false
    }

    /// Returns `true` if the player may resize this panel by dragging its edge.
    /// Defaults to `false`.
    fn is_resizable(&self) -> bool {
        false
    }
}

// ---------------------------------------------------------------------------
// PanelId
// ---------------------------------------------------------------------------

/// Unique identifier for a panel registered with [`PanelManager`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct PanelId(u64);

// ---------------------------------------------------------------------------
// PanelEntry (internal)
// ---------------------------------------------------------------------------

struct PanelEntry {
    id: PanelId,
    panel: Box<dyn Panel>,
    rect: Rect,
    /// Current z-layer (higher = rendered on top). Updated on focus.
    z: u32,
    /// Whether the panel is visible.
    visible: bool,
    /// Whether a drag is currently in progress.
    dragging: bool,
    /// Mouse offset relative to panel origin when drag started.
    drag_offset: Vec2,
    /// Whether a resize is currently in progress.
    resizing: bool,
    /// Mouse position when resize started.
    resize_start: Vec2,
    /// Panel size when resize started.
    resize_start_size: Vec2,
}

impl PanelEntry {
    fn new(id: PanelId, panel: Box<dyn Panel>, rect: Rect, z: u32) -> Self {
        Self {
            id,
            panel,
            rect,
            z,
            visible: true,
            dragging: false,
            drag_offset: Vec2::ZERO,
            resizing: false,
            resize_start: Vec2::ZERO,
            resize_start_size: Vec2::ZERO,
        }
    }

    /// Returns `true` if `point` is inside this panel's rect.
    fn hit_test(&self, point: Vec2) -> bool {
        self.visible && self.rect.contains(point)
    }

    /// Returns `true` if `point` is in the resize handle (bottom-right corner, 12×12 px).
    fn resize_handle_hit(&self, point: Vec2) -> bool {
        self.panel.is_resizable()
            && self.visible
            && point.x >= self.rect.x + self.rect.w - 12.0
            && point.y >= self.rect.y + self.rect.h - 12.0
            && self.rect.contains(point)
    }
}

// ---------------------------------------------------------------------------
// PanelManager
// ---------------------------------------------------------------------------

/// Manages a collection of generic [`Panel`]s with z-ordering, focus, drag, and resize.
///
/// Added to [`Context`](crate::engine::Context) as `ctx.panels`.
///
/// # Usage pattern
/// ```rust,ignore
/// // In a Behavior update closure:
/// let dt = ctx.time.deltatime();
/// ctx.panels.update(dt);
/// ctx.panels.draw();
/// ```
#[derive(Default)]
pub struct PanelManager {
    panels: Vec<PanelEntry>,
    next_id: u64,
    next_z: u32,
}

impl PanelManager {
    /// Creates a new empty [`PanelManager`].
    pub fn new() -> Self {
        Self::default()
    }

    // -----------------------------------------------------------------------
    // Panel lifecycle
    // -----------------------------------------------------------------------

    /// Adds a panel with the given rect and returns its [`PanelId`].
    pub fn add(&mut self, panel: impl Panel + 'static, rect: Rect) -> PanelId {
        let id = PanelId(self.next_id);
        self.next_id += 1;
        self.next_z += 1;
        self.panels.push(PanelEntry::new(id, Box::new(panel), rect, self.next_z));
        id
    }

    /// Removes the panel with the given id, calling [`Panel::on_close`] first.
    /// Returns `true` if a panel was found and removed.
    pub fn remove(&mut self, id: PanelId) -> bool {
        if let Some(pos) = self.panels.iter().position(|e| e.id == id) {
            self.panels[pos].panel.on_close();
            self.panels.remove(pos);
            return true;
        }
        false
    }

    /// Shows or hides a panel without removing it.
    pub fn set_visible(&mut self, id: PanelId, visible: bool) {
        if let Some(e) = self.panels.iter_mut().find(|e| e.id == id) {
            e.visible = visible;
        }
    }

    /// Returns the current rect for a panel (its position and size).
    pub fn get_rect(&self, id: PanelId) -> Option<Rect> {
        self.panels.iter().find(|e| e.id == id).map(|e| e.rect)
    }

    /// Programmatically moves/resizes a panel.
    pub fn set_rect(&mut self, id: PanelId, rect: Rect) {
        if let Some(e) = self.panels.iter_mut().find(|e| e.id == id) {
            e.rect = rect;
        }
    }

    // -----------------------------------------------------------------------
    // Per-frame update (input, drag, resize, focus, panel logic)
    // -----------------------------------------------------------------------

    /// Processes input (drag/resize/focus) and calls `Panel::update` on all visible panels.
    ///
    /// Call this once per frame, e.g. inside a `Behavior` update closure:
    /// ```rust,ignore
    /// ctx.panels.update(ctx.time.deltatime());
    /// ```
    pub fn update(&mut self, dt: f32) {
        let mouse = Vec2::from(mouse_position());
        let lmb_pressed = is_mouse_button_pressed(MouseButton::Left);
        let lmb_down = is_mouse_button_down(MouseButton::Left);

        // Sort entries by z descending so topmost panel gets first priority
        self.panels.sort_by_key(|b| std::cmp::Reverse(b.z));

        // --- Focus / drag / resize initiation ---
        if lmb_pressed {
            // Find topmost panel that the click landed on
            let clicked_idx = self.panels.iter().position(|e| e.hit_test(mouse));

            if let Some(idx) = clicked_idx {
                // Bring to front
                let new_z = self.next_z + 1;
                self.next_z = new_z;
                self.panels[idx].z = new_z;

                let entry = &mut self.panels[idx];

                if entry.resize_handle_hit(mouse) {
                    entry.resizing = true;
                    entry.resize_start = mouse;
                    entry.resize_start_size = Vec2::new(entry.rect.w, entry.rect.h);
                } else if entry.panel.is_draggable() {
                    entry.dragging = true;
                    entry.drag_offset = mouse - Vec2::new(entry.rect.x, entry.rect.y);
                }
            }
        }

        // --- Drag / resize continuation ---
        if lmb_down {
            for entry in &mut self.panels {
                if entry.dragging {
                    let new_pos = mouse - entry.drag_offset;
                    entry.rect.x = new_pos.x;
                    entry.rect.y = new_pos.y;
                }
                if entry.resizing {
                    let delta = mouse - entry.resize_start;
                    entry.rect.w = (entry.resize_start_size.x + delta.x).max(60.0);
                    entry.rect.h = (entry.resize_start_size.y + delta.y).max(40.0);
                }
            }
        } else {
            // Mouse released — end drag/resize
            for entry in &mut self.panels {
                entry.dragging = false;
                entry.resizing = false;
            }
        }

        // --- Per-panel update (game logic) ---
        for entry in &mut self.panels {
            if entry.visible {
                entry.panel.update(dt);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Per-frame draw (sorted by z ascending = back to front)
    // -----------------------------------------------------------------------

    /// Draws all visible panels, back to front (lower z first).
    pub fn draw(&self) {
        let mut sorted: Vec<&PanelEntry> = self.panels.iter().filter(|e| e.visible).collect();
        sorted.sort_by_key(|e| e.z);
        for entry in sorted {
            entry.panel.draw(entry.rect);
        }
    }

    // -----------------------------------------------------------------------
    // Hit-testing (for external use, e.g. game code)
    // -----------------------------------------------------------------------

    /// Returns the id of the topmost visible panel under `point`, or `None`.
    pub fn panel_at(&self, point: Vec2) -> Option<PanelId> {
        let mut best: Option<(u32, PanelId)> = None;
        for entry in &self.panels {
            if entry.hit_test(point) && best.is_none_or(|(z, _)| entry.z > z) {
                best = Some((entry.z, entry.id));
            }
        }
        best.map(|(_, id)| id)
    }

    /// Returns the number of registered panels.
    pub fn len(&self) -> usize {
        self.panels.len()
    }

    /// Returns `true` if no panels are registered.
    pub fn is_empty(&self) -> bool {
        self.panels.is_empty()
    }
}
