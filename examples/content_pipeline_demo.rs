//! Example: Content Pipeline — loading arbitrary typed data from JSON files.
//!
//! Demonstrates `load_content` (single file) and `load_content_dir` (whole directory)
//! using a simple `ExampleData { id, value }` struct.
//! The engine knows nothing about `ExampleData` — the type lives here, in the game.

use RustedEngine::prelude::*;
use RustedEngine::{load_content, load_content_dir};
use macroquad::prelude::*;
use serde::Deserialize;

// ---------------------------------------------------------------------------
// Game-specific data type — the engine never touches this
// ---------------------------------------------------------------------------

/// A minimal example data record loaded from JSON.
#[derive(Debug, Deserialize)]
struct ExampleData {
    id: String,
    value: i32,
}

#[macroquad::main("RustedEngine - Content Pipeline Demo")]
async fn main() {
    // -----------------------------------------------------------------------
    // 1. Load a single item from a known path
    // -----------------------------------------------------------------------
    let single: ExampleData =
        load_content("examples/content/item_01.json").expect("item_01.json not found");

    println!("[single] id={}, value={}", single.id, single.value);

    // -----------------------------------------------------------------------
    // 2. Load the whole directory — Vec<ExampleData>, engine-agnostic
    // -----------------------------------------------------------------------
    let all: Vec<ExampleData> =
        load_content_dir("examples/content").expect("content/ directory not found");

    println!("[dir] loaded {} items:", all.len());
    for item in &all {
        println!("  id={}, value={}", item.id, item.value);
    }

    // -----------------------------------------------------------------------
    // 3. Display results on-screen
    // -----------------------------------------------------------------------
    let single_text = format!(
        "Single load — id: \"{}\"  value: {}",
        single.id, single.value
    );
    let dir_text = format!("Dir load — {} items total", all.len());
    let items_text: String = all
        .iter()
        .map(|d| format!("  {} = {}", d.id, d.value))
        .collect::<Vec<_>>()
        .join("\n");

    let label_title = Text::new("Content Pipeline Demo", vec2(20.0, 40.0), 26.0, WHITE);
    let label_single = Text::new(&single_text, vec2(20.0, 80.0), 18.0, YELLOW);
    let label_dir = Text::new(&dir_text, vec2(20.0, 110.0), 18.0, SKYBLUE);
    let label_items = Text::new(&items_text, vec2(20.0, 135.0), 16.0, LIGHTGRAY);
    let hint = Text::new(
        "Data loaded from examples/content/*.json — no recompile needed on change",
        vec2(20.0, 220.0),
        14.0,
        DARKGRAY,
    );

    let world = world! {
        objects: [],
        ui: [label_title, label_single, label_dir, label_items, hint],
    };

    let scene = Scene::new("Content Pipeline", world);
    let mut engine = Engine::new(vec![scene]);
    engine.background_color = BLACK;
    engine.run().await;
}
