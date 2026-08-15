//! Example: Panel System — generic layered UI panels with optional drag.
//!
//! Two concrete panel implementations (game-side):
//! - `DraggablePanel`: is_draggable() → true, can be moved by the user.
//! - `StaticPanel`:    is_draggable() → false (default), stays in place + is_resizable() → true.
//!
//! The `PanelManager` is an `Object` added to the `World` UI layer.

use RustedEngine::prelude::*;
use macroquad::prelude::*;

// ---------------------------------------------------------------------------
// Concrete panel A: draggable, colored rectangle with a label
// ---------------------------------------------------------------------------

struct DraggablePanel {
    label: String,
    color: Color,
}

impl Panel for DraggablePanel {
    fn update(&mut self, _dt: f32) {}

    fn draw(&self, rect: Rect) {
        draw_rectangle(rect.x, rect.y, rect.w, rect.h, self.color);
        draw_rectangle_lines(rect.x, rect.y, rect.w, rect.h, 2.0, WHITE);
        draw_text(&self.label, rect.x + 12.0, rect.y + 30.0, 20.0, WHITE);
        draw_text(
            "★ Drag me around",
            rect.x + 12.0,
            rect.y + 60.0,
            15.0,
            Color::new(1.0, 1.0, 1.0, 0.7),
        );
    }

    fn is_draggable(&self) -> bool {
        true // opt-in, not forced by the engine
    }
}

// ---------------------------------------------------------------------------
// Concrete panel B: static (default is_draggable = false), resizable
// ---------------------------------------------------------------------------

struct StaticPanel {
    label: String,
}

impl Panel for StaticPanel {
    fn update(&mut self, _dt: f32) {}

    fn draw(&self, rect: Rect) {
        draw_rectangle(
            rect.x,
            rect.y,
            rect.w,
            rect.h,
            Color::new(0.1, 0.2, 0.45, 0.95),
        );
        draw_rectangle_lines(rect.x, rect.y, rect.w, rect.h, 2.0, SKYBLUE);
        draw_text(&self.label, rect.x + 12.0, rect.y + 30.0, 20.0, WHITE);
        draw_text(
            "Static position",
            rect.x + 12.0,
            rect.y + 55.0,
            14.0,
            Color::new(0.7, 0.9, 1.0, 0.7),
        );
        draw_text(
            "Drag bottom-right corner to resize ↘",
            rect.x + 12.0,
            rect.y + 80.0,
            13.0,
            YELLOW,
        );
        // Resize handle visual hint (bottom-right corner)
        draw_rectangle(
            rect.x + rect.w - 14.0,
            rect.y + rect.h - 14.0,
            14.0,
            14.0,
            SKYBLUE,
        );
    }

    fn is_resizable(&self) -> bool {
        true
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

#[macroquad::main("RustedEngine - Panel System Demo")]
async fn main() {
    let label = Text::new("Panel System Demo", vec2(20.0, 40.0), 28.0, WHITE);
    let hint = Text::new(
        "Panel A (Red): Draggable | Panel B (Blue): Resizable (bottom-right handle)",
        vec2(20.0, 560.0),
        15.0,
        LIGHTGRAY,
    );

    // Create PanelManager as a UI Object
    let mut panel_mgr = PanelManager::new();

    panel_mgr.add(
        DraggablePanel {
            label: "Panel A (Draggable)".to_string(),
            color: Color::new(0.55, 0.15, 0.1, 0.95),
        },
        Rect::new(60.0, 90.0, 240.0, 160.0),
    );

    panel_mgr.add(
        StaticPanel {
            label: "Panel B (Static & Resizable)".to_string(),
        },
        Rect::new(340.0, 90.0, 280.0, 180.0),
    );

    let mut scene = Scene::new_empty("Panel Demo");
    scene.add_ui(label);
    scene.add_ui(hint);
    scene.add_ui(panel_mgr);

    let mut engine =
        Engine::new(vec![scene]).with_background_color(Color::new(0.08, 0.08, 0.12, 1.0));

    engine.run().await;
}
