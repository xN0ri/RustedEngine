# RustedEngine 🦀🎮

[![Rust](https://img.shields.io/badge/rust-2024%20edition-orange.svg)](https://www.rust-lang.org/)
[![Macroquad](https://img.shields.io/badge/built%20with-Macroquad-blue.svg)](https://macroquad.rs/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**RustedEngine** is a lightweight, ergonomic, and universal 2D game engine framework for **Rust**, built on top of [Macroquad](https://macroquad.rs/).

Designed with simplicity, high performance, and API elegance in mind, RustedEngine eliminates boilerplate while offering a clean, intuitive mental model for rapid 2D game development.

---

## Key Features

* 🚀 **Zero-Boilerplate Ergonomics & Lifecycle**:
  * Deferred spawning (`ctx.spawn`, `ctx.spawn_ui`, `ctx.spawn_logic`) to safely spawn entities during update passes.
  * Automatic frame cleanup of destroyed entities (`object.destroy()`, `object.is_destroyed()`).
  * **Blanket `Deref/DerefMut`** on `Behavior<Inner, Data>` — direct field access on any wrapped component, no boilerplate.

* 👾 **Behavior & Data Binding**:
  * Bind any graphic component (`Sprite`, `Rectangle`, `AnimatedSprite`, `Tilemap`, `ParticleEmitter`) with a custom state struct via `.with_data(data)`.
  * Pure scripted controller logic via `Logic<Data>` (no graphic overhead).
  * Spatial sprite helpers: `sprite.center()`, `sprite.set_center()`, `sprite.look_at()`, `sprite.circle()`.

* 🎬 **Scene & World Management**:
  * Multi-scene management via `SceneManager`: `ctx.switch_scene("name")`.
  * `on_enter` / `on_exit` lifecycle hooks per scene.
  * Three distinct entity layers: **world-space** objects, **screen-space** UI objects, and **logic** controllers.
  * `scene!` and `world!` declarative construction macros.

* ⚡ **Trigger System**:
  * Condition→action rules with full `&mut Context` access: `Trigger::new(|ctx| ..., |ctx| ...)`.
  * One-shot and repeating modes. Convenience builders: `Trigger::when_flag_true("key", action)`.
  * Automatically driven every frame — no manual update call needed.

* 📐 **2D Geometry & Spatial Collision**:
  * Standalone primitives: `Circle`, `Segment`, `Capsule`.
  * High-performance intersection tests: segment-circle, circle-circle, circle-rect, capsule-circle, segment-segment, ray sweeps.
  * World proximity queries: `world.find_nearest()`, `world.find_within_radius()`.

* 🧮 **Vector Math & Spring Smoothing**:
  * `Vec2Ext`: `clamp_len()`, `move_towards()`, `perpendicular()`, `project_onto()`, `reflect()`, `angle_between()`, `rotated()`.
  * Zero-overshoot critically-damped spring smoothing: `smooth_damp()` & `smooth_damp_vec2()`.

* 🎬 **Animation & Tweening**:
  * `Tween`: scalar animation with 12 easing curves (`EaseOutCubic`, `EaseInBounce`, etc.).
  * `TweenVec2`: 2D position/size tween in a single struct — `tween.tick(dt) -> Vec2`.
  * `AnimatedSprite`: frame-based sprite animation with named clips.

* 🎲 **Comprehensive RNG & Procedural Noise**:
  * Deterministic seeded PRNG (`Rng::new(seed)`, PCG32).
  * Spatial sampling: `random_in_circle()`, `random_in_annulus()`, `random_in_sector()`, `random_in_triangle()`, `random_on_rect_perimeter()`.
  * Statistical: Gaussian `random_normal()`, fair `ShuffleBag`, `WeightedList`.
  * Multi-octave Perlin / fBm gradient `Noise`.

* ⏱️ **Time Control**:
  * `ctx.dt()` — scaled delta. `ctx.raw_dt()` — unscaled physical delta.
  * `ctx.pause()`, `ctx.unpause()`, `ctx.toggle_pause()`, `ctx.set_time_scale(s)`.
  * `ctx.elapsed()`, `ctx.fps()`.
  * `Timer::once(s)`, `Timer::repeating(s)` — `.tick(dt)`, `.time_remaining()`, `.set_duration(s)`.

* 🖥️ **Integrated UI Subsystem**:
  * Rich widget library: `Text` (word-wrap, typewriter, BBCode color), `Button`, `ProgressBar`, `TextField`, `Slider`, `Checkbox`, `TextLog`, scrollable `Panel`.
  * Flutter-like layout tree: `Column`, `Row`, `Container`, `VBox`, `HBox`, `Grid` with auto-alignment, margin, padding.
  * `PanelManager`: full desktop-style window manager with focus, Z-layering, drag, and resize.

* 🎥 **2D Camera Suite**:
  * Lerp tracking (`camera.follow`), motion leading (`camera.look_ahead`), screen shake (`camera.shake`).
  * View frustum culling: `camera.is_on_screen()`, `camera.is_rect_on_screen()`.
  * Virtual resolution pipeline with letterboxing — `ctx.mouse_world()` always remapped correctly.

* 🔔 **Type-Safe Event Bus & Signals**:
  * Typed event channels: `ctx.emit(MyEvent { .. })`, `ctx.poll::<MyEvent>()`.
  * Named string signals: `ctx.emit_signal("boss_dead")`, `ctx.poll_signal("boss_dead")`, `ctx.has_signal("boss_dead")`.

* 💾 **State Store & Persistence**:
  * `ctx.state` — key-value store (`bool`, `int`, `float`, `text`, `Vec2`) with Serde JSON serialization.
  * `ctx.state.increment("score", 10)` returns the updated value.
  * `SaveSystem`: multi-slot save files with CRC32 integrity checking.

* 🎞️ **Scripted Sequences**:
  * `Sequence` / `SequenceBuilder` for cutscenes, tutorials, dialogue flows.
  * Steps: `ShowText`, `Wait`, `WaitForInput`, `Branch`, `BranchTo`, `RepeatUntil`, `PlaySound`, `AppendLine`, `Label`, `JumpTo`.
  * `Step::run(|ctx, world| { ... })` — arbitrary logic injection at any point in a sequence.

* 🔊 **Audio**:
  * `ctx.play_sound()`, `ctx.play_sound_varied()` (pitch/volume randomization), `ctx.play_sound_throttled()`.
  * `AmbientPool`: seamless looping ambient layers.
  * `BitmapFont`: zero-blur pixel font baking from TrueType.

* 🌐 **Resources**:
  * Type-erased heterogeneous resource store: `ctx.resources.insert(MyData)`, `ctx.resources.get::<MyData>()`.

---

## Quickstart

```rust
use rusted_engine::prelude::*;
use macroquad::prelude::*;

struct PlayerData {
    speed: f32,
    hp: i32,
}

#[macroquad::main("My Game")]
async fn main() {
    let player = Sprite::solid(vec2(0.0, 0.0), vec2(32.0, 32.0), BLUE)
        .with_data(PlayerData { speed: 250.0, hp: 100 })
        .with_tag("player")
        .update(|player, ctx| {
            // Normalized WASD movement
            let dir = ctx.input.wasd();
            player.position += dir * player.data.speed * ctx.dt();

            // Face cursor
            player.look_at(ctx.mouse_world());

            // Dash on Space
            if ctx.is_action_pressed("dash") {
                player.position += player.center().dir_to(ctx.mouse_world()) * 120.0;
                ctx.play_sound_varied("dash", 0.1, 0.1);
            }

            // Die when hp reaches zero → scene switch via trigger
        });

    // Trigger: switch to GameOver when hp <= 0
    let mut engine = Engine::new(vec![
        Scene::new("Game", world! { objects: [player] }),
        Scene::new_empty("GameOver"),
    ]);

    engine.ctx.triggers.register(Trigger::new(
        |ctx| ctx.state.get_int("hp") <= 0,
        |ctx| { ctx.switch_scene("GameOver"); },
    ));

    engine.run().await;
}
```

---

## Architecture Overview

```
Engine
├── Context         — dt, camera, input, audio, events, state, resources, triggers
└── SceneManager
    └── Scene
        └── World
            ├── objects[]      — world-space entities (Behavior<Sprite, Data>, etc.)
            ├── ui_objects[]   — screen-space UI (Text, Button, Panel, ...)
            └── logic[]        — headless controllers (Logic<Data>)
```

Every entity implements the `Object` trait. `Behavior<Inner, Data>` provides ergonomic wrapping with transparent `Deref` to `Inner`, custom `Data`, and an `update` closure called every frame.

---

## License

This project is licensed under the [MIT License](LICENSE).
