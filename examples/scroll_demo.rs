//! Example: Scrollable & Clipped UI Panel with Word-Wrapped Text.
//!
//! Demonstrates:
//! - `ui::Panel` with `clip_content = true` and `scroll_offset` via mouse wheel.
//! - `Text` with automatic word-wrapping via `with_max_width(...)`.
//! - Scissor clipping keeping text inside panel boundaries during scroll.

use rusted_engine::prelude::*;
use macroquad::prelude::*;

#[macroquad::main("RustedEngine - Scroll & Word-Wrap Demo")]
async fn main() {
    // 1. Long text content simulating a document / chat log / system log in Last Online
    let long_log = "\
[SYSTEM LOG - NOVA OS v4.12]
----------------------------------------
10:04:12 - Boot sequence initiated...
10:04:15 - User logged in: admin_user
10:05:01 - WARNING: Unregistered connection attempt from IP 192.168.1.104
10:05:22 - Access granted to restricted folder /sys/logs/archive/
10:06:40 - File opened: classified_document_99.txt
10:07:11 - Encrypted message received from unknown sender:
'The truth is hidden inside the old backup archives. Do not trust the system operator.'
10:08:00 - Memory diagnostic completed: 0 errors found.
10:09:15 - Terminal session closed unexpectedly.
10:10:00 - End of session log.
----------------------------------------
Use mouse wheel over this panel to scroll up and down!";

    // 2. Create scrollable ui::Panel container with word-wrapped text via one-line factory
    let scroll_panel =
        UiPanel::scrollable_text(vec2(100.0, 80.0), vec2(360.0, 240.0), long_log, 16.0, BLACK)
            .with_background(Color::from_rgba(15, 20, 35, 240))
            .with_border(BLACK, 2.0);

    let title = Text::new("Scroll & Word-Wrap Demo", vec2(20.0, 40.0), 26.0, WHITE);
    let hint = Text::new(
        "Hover mouse over the blue box and use MOUSE WHEEL to scroll",
        vec2(20.0, 560.0),
        15.0,
        YELLOW,
    );

    let world = world! {
        objects: [],
        ui: [title, hint, scroll_panel],
    };

    let scene = Scene::new("Scroll Demo", world);
    let mut engine = Engine::new(vec![scene]);
    engine.background_color = Color::new(0.06, 0.06, 0.10, 1.0);

    engine.run().await;
}
