# 🦀 RustedEngine

[![Rust](https://img.shields.io/badge/rust-2024%20edition-orange.svg)](https://www.rust-lang.org/)
[![Macroquad](https://img.shields.io/badge/built%20with-Macroquad-blue.svg)](https://macroquad.rs/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A lightweight, code-first **2D game framework for Rust**, built on top of [Macroquad](https://macroquad.rs/).

Designed for developers who want to build 2D games rapidly without writing hundreds of lines of engine boilerplate, without fighting complex ECS setups, and without dealing with `Rc<RefCell<...>>` borrow checker headaches.

---

## ✨ Why RustedEngine?

* 🎯 **Code-First & Minimal Boilerplate**: Create entities with custom state, input handling, and update loops in just a few lines.
* 🧩 **Ergonomic `Behavior<Inner, Data>`**: Attach custom structs to any sprite, shape, or particle emitter. Thanks to blanket `Deref`, you access inner fields directly (`player.position` instead of `player.inner.position`).
* 🧠 **Headless `Logic` Controllers**: Separate game rules, score tracking, and cutscenes from visual entities.
* 📡 **Type-Safe Event Bus**: Decouple communication between entities and systems with clean, zero-cost event channels.
* 🎥 **Virtual Resolution & Letterboxing**: Design your game in a fixed pixel resolution (e.g. `320x180` or `640x360`), and RustedEngine handles letterboxing and mouse coordinate remapping automatically.
* 🖥️ **Rich UI Layout System**: Flutter-like declarative containers (`Column`, `Row`, `Grid`, `Padding`), buttons, sliders, progress bars, and draggable window panels.

---

## ⚡ Quickstart

Add `macroquad` and `rusted_engine` to your `Cargo.toml`. Here is a complete, working game scene:

```rust
use rusted_engine::prelude::*;
use macroquad::prelude::*;

// 1. Events for cross-system communication
#[derive(Clone, Debug)]
struct PlayerDied { reason: &'static str }

// 2. Private state for our entity
struct PlayerData {
    speed: f32,
    hp: i32,
}

#[macroquad::main("My First Game")]
async fn main() {
    // 3. Entity: Visual sprite combined with PlayerData (or direct .on_update)
    let player = Sprite::solid(vec2(100.0, 100.0), vec2(32.0, 32.0), BLUE)
        .with_data(PlayerData { speed: 220.0, hp: 100 })
        .on_update(|player, ctx| {
            // Smooth 2D WASD movement
            player.position += ctx.input.wasd() * player.data.speed * ctx.dt();
            player.look_at(ctx.mouse_world());

            // Press K to test damage
            if ctx.input.is_key_pressed(KeyCode::K) {
                player.data.hp -= 50;
                ctx.play_varied("hurt", 0.1, 0.05); // Sound with pitch variation

                if player.data.hp <= 0 {
                    player.destroy();
                    ctx.emit(PlayerDied { reason: "Took lethal damage" });
                }
            }
        });

    // 4. Controller: Headless Logic entity handling game rules
    let game_controller = Logic::run(|ctx| {
        for death in ctx.poll::<PlayerDied>() {
            println!("Game Over: {}", death.reason);
            ctx.switch_scene("GameOver");
        }
    });

    // 5. Scene & Engine Setup
    let game_scene = Scene::new("Game", world! {
        objects: [player],
        logic:   [game_controller],
    });

    let mut engine = Engine::new(vec![
        game_scene,
        Scene::new_empty("GameOver"),
    ])
    .with_background_color(DARKGRAY)
    .with_virtual_resolution(640, 360);

    engine.run().await;
}
```

---

## 🧭 Core Mental Model

```
Engine
└── SceneManager
    └── Scene
        └── World
            ├── objects[]   — World-space visual entities (Behavior<Sprite, Data>, Shapes)
            ├── ui[]        — Screen-space UI (Buttons, Text, ProgressBars, Panels)
            └── logic[]     — Headless controllers & rule systems (Logic<Data>)
```

* **`Behavior<Inner, Data>`**: An entity with visuals (`Inner`) and private state (`Data`).
* **`Logic<Data>`**: A controller without visuals that listens to events, controls game flow, or spawns enemies.
* **`Context` (`ctx`)**: The single access point passed to update closures — gives you delta time, input, audio, camera, events, and scene switching.
* **`ctx.resources`**: A typed singleton store for global game state (e.g. `GameState`, `Inventory`).

---

## 📦 What's Included?

* 🎮 **Entity & Scene Management**: Deferred spawning (`ctx.spawn`), auto-reaping of destroyed objects, `on_enter` / `on_exit` scene hooks.
* 🎥 **2D Camera Suite**: Smooth lerp tracking, look-ahead leading, screen shake, and frustum culling.
* 📐 **2D Geometry & Collision**: Circle, segment, and capsule primitives with fast intersection tests and radius queries.
* 🧮 **Game Math & Physics**: Extension math (`Vec2Ext`), critically-damped spring smoothing (`smooth_damp`), and 12-curve animation tweens (`Tween`, `TweenVec2`).
* 🖥️ **UI & Window Manager**: Flexbox-style layouts, BBCode rich text, typewriter effects, input fields, and draggable/resizable window panels (`PanelManager`).
* 🎲 **RNG & Procedural Tools**: Seeded PCG32 generator, spatial geometric sampling, fair shuffle bags, and fractal Perlin noise.
* 🎞️ **Scripted Sequences**: Multi-step narrative pipeline for cutscenes, tutorials, and branching dialogues.
* 🔊 **Audio & Assets**: Pitch/volume randomized sound playback, throttled SFX, ambient sound pools, and bitmap font baking.
* 💾 **State & Persistence**: Global key-value state store with JSON export and multi-slot save files with CRC32 integrity check.

---

## 📖 Documentation

Comprehensive interactive documentation, tutorials, and component recipes are included in the repository under `/tools/docs`.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
