# 🦀 RustyEngine

**RustyEngine** is a clean, modular 2D game engine framework built on top of [Macroquad](https://macroquad.rs/). Designed to remove boilerplate while keeping Rust's performance and safety, it provides everything you need to build desktop games, UI-heavy narrative exploration games, or fast-paced 2D action titles.

---

## ✨ Key Features

- 🌌 **Layered World & UI Architecture**: Separate rendering layers for world space (transformed by camera) and screen space (UI overlays).
- 🎥 **Smooth 2D Camera**: Frame-cached camera system with smooth target lerp tracking, trilling screen shake, and `begin_to_target` shader support.
- 📦 **Generic Behavior System**: `Behavior<Inner, Data>` allows attaching custom state and per-frame update closures to *any* entity (`Sprite`, `Text`, `ParticleEmitter`, `ProgressBar`, `Panel`, etc.).
- 🪄 **Declarative `world!` Macros**: Concise syntax for instantiating world layers without repetitive `Box::new()` calls.
- 👆 **Interactive Traits (`Clickable` & `Draggable`)**: Easy hover, click, hold, and drag-and-drop mechanics supporting both screen-space and camera-transformed world space coordinates.
- 🖼️ **UI Toolkit & Z-Ordering**: Built-in `Text` (with typewriter reveal effect), `Button`, `ProgressBar` (with `StateStore` binding), and `Panel` containers with z-order focus switching.
- 💾 **State Store & JSON Saves**: Centralized `StateStore` (`Bool`, `Int`, `Float`, `Text`) with `serde` JSON save/load out of the box.
- 🎮 **Action Mapping**: High-level `ActionMap` binding multiple key combinations (`KeyCode`) and mouse buttons (`Side`) to named action strings.
- 📜 **Narrative Sequence Runner**: Scripted step runner (`ShowText`, `WaitForInput`, `SetFlag`, `Wait`, `Branch`, `Jump`).
- 🎨 **Pixel-Art Post-Processing**: Shader pipeline using `SceneRenderTarget` and `PostProcess` with `FilterMode::Nearest` crisp pixel preservation and lazy GPU buffer allocation.
- 🔊 **Audio & Ambient Pool**: Centralized sound management with sound triggers, crossfading, and periodic `AmbientPool` random sound emission.
- 🖱️ **Custom Hardware Cursor**: Custom sprite mouse cursors with customizable hotspot offsets.

---

## ⚡ Quick Start

Add `RustyEngine` and `macroquad` to your `Cargo.toml`:

```toml
[dependencies]
macroquad = "0.4.16"
RustyEngine = { path = "../RustyEngine" } # or git dependency
