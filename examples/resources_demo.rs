//! Example demonstrating the generic `Resources` system.
//!
//! Shows how to insert arbitrary typed resources into `ctx.resources`
//! before running the engine, and read/mutate them inside entity update closures.

use RustedEngine::prelude::*;
use macroquad::prelude::*;

// ---------------------------------------------------------------------------
// Game-specific resource types — these live in the GAME, not the engine
// ---------------------------------------------------------------------------

/// Simple frame counter resource.
struct Counter {
    value: i32,
}

/// Player statistics resource.
struct PlayerStats {
    score: u32,
    level: u32,
}

#[macroquad::main("RustedEngine - Resources Demo")]
async fn main() {
    // -----------------------------------------------------------------------
    // Invisible ticker — increments the Counter resource each frame
    // -----------------------------------------------------------------------
    let ticker = Behavior::new(
        Rectangle::new(vec2(0.0, 0.0), vec2(0.0, 0.0), 0.0, BLACK),
        (),
    )
    .with_tag("ticker")
    .update(|_obj, ctx| {
        if let Some(c) = ctx.resources.get_mut::<Counter>() {
            c.value += 1;
        }
    });

    // -----------------------------------------------------------------------
    // UI text elements that read resources each frame
    // -----------------------------------------------------------------------
    let label = Text::new("Resources Demo", vec2(20.0, 40.0), 24.0, WHITE).with_tag("label");

    // TextObject with an update closure — reads Counter from resources each frame
    let counter_display =
        TextObject::new(Text::new("Counter: 0", vec2(20.0, 80.0), 20.0, YELLOW), ())
            .with_tag("counter_display")
            .update(|obj, ctx| {
                if let Some(c) = ctx.resources.get::<Counter>() {
                    obj.set_text(format!("Counter: {}", c.value).as_str());
                }
            });

    // TextObject showing PlayerStats — updated each frame
    let stats_display = TextObject::new(
        Text::new("Score: 0  Level: 0", vec2(20.0, 110.0), 20.0, SKYBLUE),
        (),
    )
    .with_tag("stats_display")
    .update(|obj, ctx| {
        if let Some(stats) = ctx.resources.get::<PlayerStats>() {
            obj.set_text(format!("Score: {}  Level: {}", stats.score, stats.level).as_str());
        }
    });

    // TextObject showing instructions
    let hint = Text::new(
        "Press SPACE to add 100 score | Press R to reset counter",
        vec2(20.0, 150.0),
        16.0,
        LIGHTGRAY,
    );

    // Another behavior that handles input and mutates resources
    let input_handler = Behavior::new(
        Rectangle::new(vec2(0.0, 0.0), vec2(0.0, 0.0), 0.0, BLACK),
        (),
    )
    .with_tag("input_handler")
    .update(|_obj, ctx| {
        if ctx.input.is_key_pressed(KeyCode::Space) {
            if let Some(stats) = ctx.resources.get_mut::<PlayerStats>() {
                stats.score += 100;
            }
        }
        if ctx.input.is_key_pressed(KeyCode::R) {
            if let Some(c) = ctx.resources.get_mut::<Counter>() {
                c.value = 0;
            }
        }
    });

    let world = world! {
        objects: [ticker, input_handler],
        ui: [label, counter_display, stats_display, hint],
    };

    let scene = Scene::new("Resources Demo", world);
    let mut engine = Engine::new(vec![scene]);

    // -----------------------------------------------------------------------
    // Insert resources into ctx BEFORE running — engine never touches these.
    // -----------------------------------------------------------------------
    engine.ctx.resources.insert(Counter { value: 0 });
    engine.ctx.resources.insert(PlayerStats {
        score: 1000,
        level: 3,
    });

    engine.background_color = DARKGRAY;
    engine.run().await;
}
