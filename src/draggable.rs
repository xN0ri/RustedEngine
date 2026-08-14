use macroquad::{
    input::mouse_position,
    math::{vec2, Vec2},
};

use crate::engine::Context;

// ---------------------------------------------------------------------------
// DragState — pomocnicza struktura do trzymania stanu przeciągania
// ---------------------------------------------------------------------------

/// Przechowuj jako pole w obiektach implementujących `Draggable`.
///
/// ```ignore
/// struct MyWindow {
///     position: Vec2,
///     drag: DragState,
/// }
/// ```
#[derive(Clone, Debug, Default)]
pub struct DragState {
    /// Czy obiekt jest aktualnie przeciągany.
    pub is_dragging: bool,
    /// Offset między pozycją myszy a anchor obiektu w chwili chwycenia.
    pub offset: Vec2,
}

impl DragState {
    pub fn new() -> Self {
        Self {
            is_dragging: false,
            offset: vec2(0.0, 0.0),
        }
    }
}

// ---------------------------------------------------------------------------
// Draggable trait — analogiczny do Clickable
// ---------------------------------------------------------------------------

/// Trait ogólnego przeciągania myszą (drag & drop).
///
/// Implementuj `drag_anchor_mut()`, `drag_state()` oraz `drag_state_mut()`.
/// Domyślne metody obsługują pełny cykl: start → update → end.
///
/// # Uwaga: przestrzenie współrzędnych
///
/// Metody **bez** sufiksu `_ctx` (`start_drag`, `update_drag`) operują
/// w **przestrzeni ekranu** (surowe piksele myszy). Są odpowiednie dla
/// elementów UI (`Panel`).
///
/// Dla obiektów w przestrzeni świata (np. `Sprite` z aktywną kamerą 2D)
/// **używaj wariantów `_ctx`** (`start_drag_ctx`, `update_drag_ctx`), które
/// przeliczają pozycję myszy przez `ctx.camera.screen_to_world()`.
///
/// # Wzorzec użycia w `update` closurze GameObject:
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
    /// Mutowalny dostęp do pozycji obiektu (punkt chwytania).
    fn drag_anchor_mut(&mut self) -> &mut Vec2;

    /// Dostęp tylko do odczytu stanu przeciągania.
    fn drag_state(&self) -> &DragState;

    /// Mutowalny dostęp do stanu przeciągania.
    fn drag_state_mut(&mut self) -> &mut DragState;

    /// Czy kursor jest nad obszarem "chwytania" tego obiektu.
    /// Domyślnie: zawsze true — nadpisz jeśli chcesz ograniczyć obszar.
    fn is_drag_hovered(&self) -> bool {
        true
    }

    /// Rozpoczyna przeciąganie (**przestrzeń ekranu**).
    ///
    /// ⚠️ Dla obiektów w przestrzeni świata użyj [`start_drag_ctx`].
    fn start_drag(&mut self) {
        let (mx, my) = mouse_position();
        let anchor = *self.drag_anchor_mut();
        let offset = vec2(mx, my) - anchor;
        let state = self.drag_state_mut();
        state.is_dragging = true;
        state.offset = offset;
    }

    /// Rozpoczyna przeciąganie (**przestrzeń świata**, z uwzględnieniem kamery).
    fn start_drag_ctx(&mut self, ctx: &Context) {
        let m_world = ctx.camera.screen_to_world(ctx.input.mouse_position());
        let anchor = *self.drag_anchor_mut();
        let offset = m_world - anchor;
        let state = self.drag_state_mut();
        state.is_dragging = true;
        state.offset = offset;
    }

    /// Aktualizuje pozycję obiektu (**przestrzeń ekranu**). Wywoływać co klatkę.
    ///
    /// ⚠️ Dla obiektów w przestrzeni świata użyj [`update_drag_ctx`].
    fn update_drag(&mut self) {
        if !self.drag_state().is_dragging {
            return;
        }
        let (mx, my) = mouse_position();
        let offset = self.drag_state().offset;
        *self.drag_anchor_mut() = vec2(mx, my) - offset;
    }

    /// Aktualizuje pozycję obiektu (**przestrzeń świata**, z uwzględnieniem kamery).
    fn update_drag_ctx(&mut self, ctx: &Context) {
        if !self.drag_state().is_dragging {
            return;
        }
        let m_world = ctx.camera.screen_to_world(ctx.input.mouse_position());
        let offset = self.drag_state().offset;
        *self.drag_anchor_mut() = m_world - offset;
    }

    /// Kończy przeciąganie.
    fn end_drag(&mut self) {
        self.drag_state_mut().is_dragging = false;
    }

    /// Czy obiekt jest aktualnie przeciągany.
    fn is_dragging(&self) -> bool {
        self.drag_state().is_dragging
    }
}
