//! Example: Trigger System — condition→action rules with full Context access.
//!
//! Demonstrates a one-shot and a repeating trigger.
//! Uses a generic `Counter` resource — the engine knows nothing about it.

use rusted_engine::prelude::*;
use macroquad::prelude::*;

// Generic test resource — lives in the game, not the engine
struct Counter {
    value: i32,
    resets: u32,
}

#[macroquad::main("RustedEngine - Trigger System Demo")]
async fn main() {
    // -----------------------------------------------------------------------
    // Behavior: increments Counter every frame
    // -----------------------------------------------------------------------
    let ticker = Behavior::new(
        Rectangle::new(vec2(0.0, 0.0), vec2(0.0, 0.0), 0.0, BLACK),
        (),
    )
    .with_tag("ticker")
    .update(|_obj, ctx| {
        // Increment counter stored in resources
        if let Some(c) = ctx.resources.get_mut::<Counter>() {
            c.value += 1;
        }
        // Trigger system is driven automatically by World::update — no manual call needed.
    });

    // -----------------------------------------------------------------------
    // TextObject: shows live Counter state from resources
    // -----------------------------------------------------------------------
    let counter_display = TextObject::new(
        Text::new("Counter: 0 | Resets: 0", vec2(20.0, 80.0), 20.0, YELLOW),
        (),
    )
    .with_tag("counter_display")
    .update(|obj, ctx| {
        if let Some(c) = ctx.resources.get::<Counter>() {
            obj.set_text(format!("Counter: {}  |  Resets: {}", c.value, c.resets).as_str());
        }
    });

    let label = Text::new("Trigger System Demo", vec2(20.0, 40.0), 26.0, WHITE);
    let hint = Text::new(
        "REPEATING trigger: resets Counter to 0 when it exceeds 120",
        vec2(20.0, 115.0),
        16.0,
        LIGHTGRAY,
    );
    let hint2 = Text::new(
        "ONE-SHOT trigger: prints to console once when Resets reaches 3",
        vec2(20.0, 138.0),
        16.0,
        LIGHTGRAY,
    );

    let world = world! {
        objects: [ticker],
        ui: [label, counter_display, hint, hint2],
    };

    let scene = Scene::new("Trigger Demo", world);
    let mut engine = Engine::new(vec![scene]);

    // -----------------------------------------------------------------------
    // Insert resource
    // -----------------------------------------------------------------------
    engine.ctx.resources.insert(Counter {
        value: 0,
        resets: 0,
    });

    // -----------------------------------------------------------------------
    // Register triggers — closures now receive &mut Context directly
    // -----------------------------------------------------------------------

    // REPEATING: reset counter every time it exceeds 120
    engine.ctx.triggers.register(
        Trigger::new(
            |ctx| ctx.resources.get::<Counter>().is_some_and(|c| c.value > 120),
            |ctx| {
                if let Some(c) = ctx.resources.get_mut::<Counter>() {
                    c.value = 0;
                    c.resets += 1;
                }
            },
        )
        .repeating(),
    );

    // ONE-SHOT: print to console once when resets reaches 3
    engine.ctx.triggers.register(Trigger::new(
        |ctx| ctx.resources.get::<Counter>().is_some_and(|c| c.resets >= 3),
        |_ctx| {
            println!("[one-shot trigger] Counter has been reset 3 times!");
        },
    ));

    engine.run().await;
}
