//! # 🦀 RustyEngine
//!
//! A lightweight, modular 2D game engine framework in Rust built on top of [Macroquad](https://macroquad.rs/).
//! Designed to eliminate repetitive boilerplate while maintaining performance, safety, and flexible control.
//!
//! ## Core Architecture
//!
//! - **World & UI Layering**: Separate rendering targets for 2D world camera entities vs screen-space UI elements.
//! - **Generic Entity Behaviors**: Wrap any entity (`Sprite`, `Text`, `ParticleEmitter`, `ProgressBar`, `Panel`) in [`Behavior`](object::Behavior) to attach custom data and per-frame update closures.
//! - **Declarative World Initialization**: Use [`world!`] and [`world_objects!`] macros to instantiate entity layers concisely.
//! - **State Store & Save Files**: Built-in [`StateStore`](state::StateStore) with JSON serialization support via Serde.
//! - **Action Mapping**: Bind hardware inputs (keys and mouse buttons) to high-level named actions with [`ActionMap`](actions::ActionMap).
//! - **Post-Processing Shaders**: Custom material GLSL post-processing pipeline ([`PostProcess`](postprocess::PostProcess)) with nearest-neighbor pixel art filtering.
//! - **Generic Resources**: Type-keyed global resource store ([`Resources`](resources::Resources)) available on every [`Context`](engine::Context) via `ctx.resources`.
//! - **Content Pipeline**: Generic JSON data loading ([`load_content`](content::load_content), [`load_content_dir`](content::load_content_dir)) for any `Deserialize` type.
//! - **Trigger System**: Condition→action rule engine operating on [`Resources`](resources::Resources) ([`TriggerSystem`](trigger::TriggerSystem)).
//! - **Panel System**: Generic layered, interactive UI panel manager ([`PanelManager`](panel_manager::PanelManager)).

pub mod actions;
pub mod animated_texture;
pub mod asset_manager;
pub mod audio;
pub mod camera;
pub mod content;
pub mod draggable;
pub mod engine;
pub mod input;
pub mod object;
pub mod panel_manager;
pub mod particles;
pub mod postprocess;
pub mod prelude;
pub mod resources;
pub mod scene;
pub mod sequence;
pub mod state;
pub mod time;
pub mod trigger;
pub mod ui;
pub mod window;
pub mod world;

pub use animated_texture::AnimatedSprite;
pub use content::{load_content, load_content_dir, ContentError};
pub use panel_manager::{PanelId, PanelManager};
pub use resources::Resources;
pub use trigger::{Trigger, TriggerSystem};

#[cfg(test)]
mod tests {
    use super::prelude::*;
    use macroquad::input::KeyCode;
    use macroquad::math::vec2;
    use macroquad::color::WHITE;

    #[test]
    fn test_state_store_and_serde() {
        let mut store = StateStore::new();
        store.set_bool("door_open", true);
        store.set_int("gold", 100);
        store.increment("gold", 50);
        store.set_text("player_name", "Hero");

        assert_eq!(store.get_bool("door_open"), true);
        assert_eq!(store.get_int("gold"), 150);
        assert_eq!(store.get_text("player_name"), "Hero");

        // Save & Load JSON
        let temp_path = std::env::temp_dir().join("rusty_engine_test_state.json");
        let path_str = temp_path.to_str().unwrap();

        store.save_to_file(path_str).unwrap();
        let loaded = StateStore::load_from_file(path_str).unwrap();

        assert_eq!(loaded.get_bool("door_open"), true);
        assert_eq!(loaded.get_int("gold"), 150);
        assert_eq!(loaded.get_text("player_name"), "Hero");

        let _ = std::fs::remove_file(temp_path);
    }

    #[test]
    fn test_action_map() {
        let mut actions = ActionMap::new();
        actions.bind_key("jump", KeyCode::Space);
        actions.bind_mouse("attack", Side::Left);

        actions.unbind("jump");
        assert_eq!(actions.is_down("jump"), false);
    }

    #[test]
    fn test_text_typewriter() {
        let mut text = Text::new("Hello", vec2(0.0, 0.0), 20.0, WHITE)
            .with_typewriter(10.0);

        assert_eq!(text.is_finished(), false);
        text.skip();
        assert_eq!(text.content, "Hello");
        assert_eq!(text.is_finished(), true);
    }

    #[test]
    fn test_ui_bring_to_front_and_count() {
        let p1 = UiPanel::new(vec2(0.0, 0.0), vec2(100.0, 100.0)).with_tag("panel1");
        let p2 = UiPanel::new(vec2(10.0, 10.0), vec2(100.0, 100.0)).with_tag("panel2");

        let ui = UI::new(vec![Box::new(p1), Box::new(p2)]);
        let world = World::new_with_ui(vec![], vec![Box::new(ui)]);

        assert_eq!(world.count_ui_by_tag("UI"), 1);
    }

    #[test]
    fn test_object_set_text() {
        let mut text = Text::new("Old text", vec2(0.0, 0.0), 20.0, WHITE);
        text.set_text("New text");
        assert_eq!(text.content, "New text");
    }

    #[test]
    fn test_world_macros() {
        let t1 = Text::new("T1", vec2(0.0, 0.0), 10.0, WHITE);
        let t2 = Text::new("T2", vec2(0.0, 0.0), 10.0, WHITE);
        let p1 = UiPanel::new(vec2(0.0, 0.0), vec2(50.0, 50.0));

        let w_full = world! {
            objects: [t1, t2],
            ui: [p1],
        };

        assert_eq!(w_full.objects().len(), 2);
        assert_eq!(w_full.ui_objects().len(), 1);

        let t3 = Text::new("T3", vec2(0.0, 0.0), 10.0, WHITE);
        let w_no_ui = world! {
            objects: [t3],
        };

        assert_eq!(w_no_ui.objects().len(), 1);
        assert_eq!(w_no_ui.ui_objects().len(), 0);
    }

    #[test]
    fn test_hidden_and_deactivated() {
        let rect = Rectangle::new(vec2(0.0, 0.0), vec2(10.0, 10.0), 0.0, WHITE)
            .hidden()
            .deactivated();
        assert_eq!(rect.is_visible(), false);
        assert_eq!(rect.is_active(), false);

        let button = Button::new(vec2(0.0, 0.0), vec2(10.0, 10.0), "Click")
            .hidden()
            .desactivated();
        assert_eq!(button.is_visible(), false);
        assert_eq!(button.is_active(), false);

        let text = Text::new("Hi", vec2(0.0, 0.0), 12.0, WHITE)
            .hidden()
            .deactivated();
        assert_eq!(text.is_visible(), false);
        assert_eq!(text.is_active(), false);

        let panel = UiPanel::new(vec2(0.0, 0.0), vec2(100.0, 100.0))
            .hidden()
            .desactivated();
        assert_eq!(panel.is_visible(), false);
        assert_eq!(panel.is_active(), false);

        let progress = ProgressBar::new(vec2(0.0, 0.0), vec2(100.0, 10.0), 0.5)
            .hidden()
            .deactivated();
        assert_eq!(progress.is_visible(), false);
        assert_eq!(progress.is_active(), false);

        let behavior_obj = Behavior::new(Rectangle::new(vec2(0.0, 0.0), vec2(10.0, 10.0), 0.0, WHITE), ())
            .hidden()
            .desactivated();
        assert_eq!(behavior_obj.is_visible(), false);
        assert_eq!(behavior_obj.is_active(), false);

        let ui = UI::new(vec![]).hidden().deactivated();
        assert_eq!(ui.is_visible(), false);
        assert_eq!(ui.is_active(), false);
    }

    #[test]
    fn test_text_field() {
        let mut tf = TextField::new(vec2(10.0, 10.0), vec2(200.0, 30.0), "Enter name...")
            .with_text("Player1")
            .with_max_length(10)
            .without_decoration()
            .hidden()
            .deactivated();

        assert_eq!(tf.text, "Player1");
        assert_eq!(tf.placeholder, "Enter name...");
        assert_eq!(tf.decorated, false);
        assert_eq!(tf.is_visible(), false);
        assert_eq!(tf.is_active(), false);

        tf.set_focused(true);
        assert_eq!(tf.is_focused(), true);
    }

    #[test]
    fn test_text_word_wrap() {
        let text = Text::new("Hello world this is a long line", vec2(0.0, 0.0), 16.0, WHITE)
            .with_max_width(100.0);

        // Dummy measure: 10 pixels per char
        let measure = |s: &str| s.len() as f32 * 10.0;

        // "Hello world" (110 > 100) -> "Hello" (50)
        // "world this" (100 <= 100) -> "world this" (100)
        // "is a long" (90 <= 100) -> "is a long" (90)
        // "line" (40 <= 100) -> "line" (40)
        let wrapped = text.wrap_lines_with(&text.content, 100.0, measure);
        assert_eq!(wrapped.len(), 4);
        assert_eq!(wrapped[0], "Hello");
        assert_eq!(wrapped[1], "world this");
        assert_eq!(wrapped[2], "is a long");
        assert_eq!(wrapped[3], "line");

        // Test with explicit newlines
        let multiline_text = Text::new("Line 1\nLine 2 is long", vec2(0.0, 0.0), 16.0, WHITE);
        let wrapped2 = multiline_text.wrap_lines_with(&multiline_text.content, 100.0, measure);
        assert_eq!(wrapped2[0], "Line 1");
        assert_eq!(wrapped2[1], "Line 2 is");
        assert_eq!(wrapped2[2], "long");
    }

    #[test]
    fn test_animated_sprite() {
        let anim = AnimatedSprite::new(vec2(10.0, 10.0), vec2(32.0, 32.0), vec![], 10.0)
            .with_tag("anim_rec")
            .with_looping(false)
            .hidden()
            .deactivated();

        assert_eq!(anim.tag, "anim_rec");
        assert_eq!(anim.looping, false);
        assert_eq!(anim.is_visible(), false);
        assert_eq!(anim.is_active(), false);
        assert_eq!(anim.current_frame(), 0);
        assert_eq!(anim.bounds(), Some(macroquad::math::Rect::new(10.0, 10.0, 32.0, 32.0)));
    }

    #[test]
    fn test_panel_scroll_options() {
        let panel = UiPanel::new(vec2(0.0, 0.0), vec2(100.0, 100.0))
            .with_clip_content(true)
            .with_smooth_scroll(false)
            .with_content_height(500.0);

        assert_eq!(panel.clip_content, true);
        assert_eq!(panel.smooth_scroll, false);
        assert_eq!(panel.content_height, Some(500.0));
    }
}
