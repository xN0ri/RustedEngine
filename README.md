# RustedEngine 🦀🎮

[![Rust](https://img.shields.io/badge/rust-2021%20edition-orange.svg)](https://www.rust-lang.org/)
[![Macroquad](https://img.shields.io/badge/built%20with-Macroquad-blue.svg)](https://macroquad.rs/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**RustedEngine** is a lightweight, ergonomic 2D game engine framework for **Rust**, built on top of [Macroquad](https://macroquad.rs/).

Designed with simplicity, performance, and API elegance in mind, RustedEngine eliminates boilerplate while offering a clean, intuitive mental model for rapid 2D game development.

---

## Key Features

* 🚀 **Zero-Boilerplate Ergonomics**: Intuitive generic entity insertion without manual boxing (`scene.add(player)`).
* 👾 **Behavior & Data Binding**: Easily bind visual graphic components (`Sprite`, `Rectangle`, `Text`) with custom state structs via `Behavior<Inner, Data>`. Transparent field access via `Deref` / `DerefMut`.
* 🖥️ **Integrated UI & Windowing Subsystem**:
  * Rich component library: `Text` (word-wrapping, typewriter effect), `Button`, `ProgressBar`, `TextField`, and scrollable `Panel`.
  * `PanelManager`: Full desktop-style window manager supporting focus order, Z-layering, dragging, and resizing out of the box.
* 🎥 **2D Camera Suite**:
  * Smooth lerp target tracking (`camera.follow`), screen shake (`camera.shake`), and seamless screen-to-world coordinate transformations.
* ⚡ **High-Ergonomics Input Helpers**:
  * 2D movement vectors in a single line: `ctx.input.wasd()` and `ctx.input.arrow_keys()`.
  * Frame delta-time shorthand: `ctx.dt()`.
  * World-space entity hit-testing & click handlers: `player.click(ctx, Side::Left)`.
* 💾 **State & Resource Management**:
  * `StateStore`: Central flag & numeric state store with Serde JSON save/load support.
  * `Resources`: Type-safe generic data container (Type-Map pattern).
  * `ActionMap`: High-level rebindable input action mapping.
  * `TriggerSystem`: Event-driven condition/action trigger execution.
* 🎨 **Graphics, FX & Content Pipeline**:
  * `AnimatedSprite` & `Sequence`: Frame-based texture animation pipelines.
  * `ParticleEmitter`: Configurable particle system.
  * `PostProcess`: Fullscreen shader post-processing pipeline.
  * **Content Pipeline**: Automated data loading from structured JSON files (`load_content`).

---

## Quickstart

Build a functional game scene in just a few lines of code:

```rust
use RustedEngine::prelude::*;
use macroquad::prelude::*;

// 1. Define custom entity state
struct PlayerData {
    speed: f32,
    hp: i32,
}

#[macroquad::main("RustedEngine Quickstart")]
async fn main() {
    // 2. Construct a GameObject combining a graphic Sprite and PlayerData
    let player = GameObject::new(
        Sprite::solid(vec2(0.0, 0.0), vec2(50.0, 50.0), BLUE).with_tag("player"),
        PlayerData { speed: 250.0, hp: 100 },
    )
    .update(|player, ctx| {
        // One-line WASD movement vector
        let direction = ctx.input.wasd();
        player.position += direction * player.data.speed * ctx.dt();

        // World-space 2D mouse interaction
        if player.click(ctx, Side::Left) {
            player.data.hp -= 10;
            println!("Player HP: {}", player.data.hp);
        }

        // Hover & state visuals
        if player.clicked(ctx, Side::Left) {
            player.color = RED;
        } else if player.is_hovered(ctx) {
            player.color = YELLOW;
        } else {
            player.color = BLUE;
        }
    });

    // 3. Populate Scene & UI
    let mut scene = Scene::new_empty("MainGame");
    scene.add(player);
    scene.add_ui(Text::new("RustedEngine Demo", vec2(20.0, 35.0), 28.0, WHITE));
    scene.add_ui(Text::new("WASD - Move | LMB - Interact", vec2(20.0, 65.0), 18.0, LIGHTGRAY));

    // 4. Initialize & Run Engine
    let mut engine = Engine::new(scene).with_background_color(DARKGRAY);
    engine.run().await;
}
```

---

## Engine Architecture

RustedEngine follows a clean, single-directional data flow model:

```text
Engine ──► SceneManager ──► Scene ──► World ──┬──► objects (2D World Space)
                                              └──► ui_objects (Screen Space)
```

| Component | Description |
|-----------|-------------|
| **`Engine`** | Core loop orchestrator managing asynchronous execution, delta time, background clearing, and rendering passes. |
| **`Context` (`ctx`)** | Unified game context exposed to update closures, granting access to input, audio, assets, state, camera, and triggers. |
| **`World`** | Container storing world-space entities (camera-transformed) and UI components (screen-space). |
| **`Behavior<Inner, Data>`** | Generic entity wrapper implementing `Deref` / `DerefMut` for direct graphic mutation alongside custom `Data` fields. |

---

## Bundled Examples

Explore the `examples/` directory for ready-to-run code demonstrations:

```bash
# Basic movement, entity interaction, and UI rendering
cargo run --example test

# Desktop window manager with dragging & z-order focus
cargo run --example panel_demo

# Scrollable UI containers and text wrapping
cargo run --example scroll_demo

# Type-safe global resource storage (Type-Map pattern)
cargo run --example resources_demo

# Data-driven JSON content pipeline
cargo run --example content_pipeline_demo

# Event-driven triggers and repeating conditions
cargo run --example trigger_demo
```

---

## License

This project is licensed under the [MIT License](LICENSE).
