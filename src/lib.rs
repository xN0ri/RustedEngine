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
pub mod bitmap_font;
pub mod camera;
pub mod colors;
pub mod content;
pub mod draggable;
pub mod engine;
pub mod events;
pub mod geometry;
pub mod input;
pub mod math;
pub mod object;
pub mod panel_manager;
pub mod particles;
pub mod postprocess;
pub mod prelude;
pub mod resources;
pub mod rng;
pub mod save_system;
pub mod scene;
pub mod sequence;
pub mod state;
pub mod tilemap;
pub mod time;
pub mod trigger;
pub mod tween;
pub mod ui;
pub mod window;
pub mod world;

pub use animated_texture::AnimatedSprite;
pub use bitmap_font::{BitmapFont, GlyphInfo, register_font_id};
pub use content::{ContentError, load_content, load_content_dir};
pub use events::EventBus;
pub use geometry::{Capsule, Circle, Segment};
pub use math::{Vec2Ext, smooth_damp, smooth_damp_vec2};
pub use panel_manager::{PanelId, PanelManager};
pub use resources::Resources;
pub use rng::{
    Noise, Rng, ShuffleBag, WeightedList, random_angle, random_bool, random_choose,
    random_choose_mut, random_color, random_in_annulus, random_in_circle, random_in_rect,
    random_in_sector, random_in_triangle, random_normal, random_on_circle,
    random_on_rect_perimeter, random_on_segment, random_range, random_range_i32,
    random_range_usize, random_sample, random_shuffle, random_sign, random_spread,
};
pub use save_system::{SaveError, SaveSlotMeta, SaveSystem};
pub use scene::{SceneChanged, SceneManager};
pub use sequence::{SequenceBuilder, Step};
pub use tilemap::Tilemap;
pub use trigger::{Trigger, TriggerSystem};
pub use tween::{Easing, Tween};
pub use ui::{
    Button, Checkbox, Grid, HBox, Image, LayoutAlign, LayoutJustify, Margin, Padding,
    Panel as UiPanel, ProgressBar, RevealMode, RichText, RichTextObject, ScrollMode, Slider, Text, TextAlign, TextField,
    TextLog, TextLogLine, TextSpan, Tooltip, UIAnchor, VBox, UI, margin, padding, parse_color, parse_rich_text, rich_text,
};

#[cfg(test)]
mod tests {
    use super::prelude::*;
    use macroquad::color::{RED, WHITE};
    use macroquad::input::KeyCode;
    use macroquad::math::vec2;

    #[test]
    fn test_state_store_and_serde() {
        let mut store = StateStore::new();
        store.set_bool("door_open", true);
        store.set_int("gold", 100);
        store.increment("gold", 50);
        store.set_text("player_name", "Hero");

        assert!(store.get_bool("door_open"));
        assert_eq!(store.get_int("gold"), 150);
        assert_eq!(store.get_text("player_name"), "Hero");

        // Save & Load JSON
        let temp_path = std::env::temp_dir().join("rusty_engine_test_state.json");
        let path_str = temp_path.to_str().unwrap();

        store.save_to_file(path_str).unwrap();
        let loaded = StateStore::load_from_file(path_str).unwrap();

        assert!(loaded.get_bool("door_open"));
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
        assert!(!actions.is_down("jump"));
    }

    #[test]
    fn test_text_typewriter() {
        let mut text = Text::new("Hello", vec2(0.0, 0.0), 20.0, WHITE).with_typewriter(10.0);

        assert!(!text.is_finished());
        text.skip();
        assert_eq!(text.content, "Hello");
        assert!(text.is_finished());
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
        assert!(!rect.is_visible());
        assert!(!rect.is_active());

        let button = Button::new(vec2(0.0, 0.0), vec2(10.0, 10.0), "Click")
            .hidden()
            .deactivated();
        assert!(!button.is_visible());
        assert!(!button.is_active());

        let text = Text::new("Hi", vec2(0.0, 0.0), 12.0, WHITE)
            .hidden()
            .deactivated();
        assert!(!text.is_visible());
        assert!(!text.is_active());

        let panel = UiPanel::new(vec2(0.0, 0.0), vec2(100.0, 100.0))
            .hidden()
            .deactivated();
        assert!(!panel.is_visible());
        assert!(!panel.is_active());

        let progress = ProgressBar::new(vec2(0.0, 0.0), vec2(100.0, 10.0), 0.5)
            .hidden()
            .deactivated();
        assert!(!progress.is_visible());
        assert!(!progress.is_active());

        let behavior_obj = Behavior::new(
            Rectangle::new(vec2(0.0, 0.0), vec2(10.0, 10.0), 0.0, WHITE),
            (),
        )
        .hidden()
        .deactivated();
        assert!(!behavior_obj.is_visible());
        assert!(!behavior_obj.is_active());

        let ui = UI::new(vec![]).hidden().deactivated();
        assert!(!ui.is_visible());
        assert!(!ui.is_active());
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
        assert!(!tf.decorated);
        assert!(!tf.is_visible());
        assert!(!tf.is_active());

        tf.set_focused(true);
        assert!(tf.is_focused());
    }

    #[test]
    fn test_text_word_wrap() {
        let text = Text::new(
            "Hello world this is a long line",
            vec2(0.0, 0.0),
            16.0,
            WHITE,
        )
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
        assert!(!anim.looping);
        assert!(!anim.is_visible());
        assert!(!anim.is_active());
        assert_eq!(anim.current_frame(), 0);
        assert_eq!(
            anim.bounds(),
            Some(macroquad::math::Rect::new(10.0, 10.0, 32.0, 32.0))
        );
    }

    #[test]
    fn test_panel_scroll_options() {
        let panel = UiPanel::new(vec2(0.0, 0.0), vec2(100.0, 100.0))
            .with_clip_content(true)
            .with_smooth_scroll(false)
            .with_content_height(500.0);

        assert!(panel.clip_content);
        assert!(!panel.smooth_scroll);
        assert_eq!(panel.content_height, Some(500.0));
    }

    struct DummyPanel;
    impl Panel for DummyPanel {
        fn update(&mut self, _dt: f32) {}
        fn draw(&self, _rect: macroquad::math::Rect) {}
    }

    #[test]
    fn test_panel_manager_as_object() {
        let mut panel_mgr = PanelManager::new();
        panel_mgr.add(
            DummyPanel,
            macroquad::math::Rect::new(0.0, 0.0, 100.0, 100.0),
        );
        let mut world = world! {
            objects: [],
            ui: [panel_mgr],
        };

        assert_eq!(world.ui_objects().len(), 1);
        let found = world.find_ui_typed_mut::<PanelManager>();
        assert!(found.is_some());
        assert_eq!(found.unwrap().len(), 1);
    }

    #[test]
    fn test_ergonomic_scene_and_world_api() {
        let mut scene = Scene::new_empty("GameScene");

        struct DummyObj;
        impl Object for DummyObj {
            fn draw(&self) {}
        }

        let obj_a = DummyObj;
        let obj_b = DummyObj;
        let obj_c = DummyObj;

        scene.add(obj_a);
        scene.add_ui(obj_b);
        scene.add_ui(obj_c);

        assert_eq!(scene.name(), "GameScene");
        assert_eq!(scene.world_mut().objects().len(), 1);
        assert_eq!(scene.world_mut().ui_objects().len(), 2);
    }

    #[test]
    fn test_logic_object() {
        struct Counter {
            val: i32,
        }
        let logic = LogicObject::logic(Counter { val: 10 }).update(|obj, _ctx| {
            obj.data.val += 1;
        });

        let mut world = World::new();
        world.add(logic);
        assert_eq!(world.objects().len(), 1);
    }

    #[test]
    fn test_scene_add_sequence() {
        let mut scene = Scene::new_empty("Boot");

        let seq = Sequence::new(vec![
            Step::SetFlag {
                key: "seq_done".into(),
                value: StateValue::Bool(true),
            },
            Step::End,
        ]);
        scene.add_sequence(seq);

        let mut ctx = Context::new();
        scene.world_mut().update(&mut ctx);

        assert!(ctx.state.get_bool("seq_done"));
    }

    #[test]
    fn test_logic_layer_isolation() {
        let mut world = World::new();

        let logic_obj = LogicObject::logic(()).update(|_obj, ctx| {
            ctx.state.set_bool("logic_updated", true);
        });

        world.add_logic(logic_obj);

        assert_eq!(world.objects().len(), 0);
        assert_eq!(world.ui_objects().len(), 0);
        assert_eq!(world.logic_objects().len(), 1);

        let mut ctx = Context::new();
        world.update(&mut ctx);

        assert!(ctx.state.get_bool("logic_updated"));
    }

    #[test]
    fn test_text_log_max_lines() {
        use macroquad::color::WHITE;
        use macroquad::math::vec2;

        let mut log = crate::ui::TextLog::new(vec2(0.0, 0.0), vec2(200.0, 100.0), 16.0, WHITE)
            .with_max_lines(3);

        log.push_line("Line 1");
        log.push_line("Line 2");
        log.push_line("Line 3");
        assert_eq!(log.lines(), vec!["Line 1", "Line 2", "Line 3"]);

        // Push 4th line -> should evict Line 1
        log.push_line("Line 4");
        assert_eq!(log.lines(), vec!["Line 2", "Line 3", "Line 4"]);

        // Push multi-line string with newlines
        log.push_line("Line 5\nLine 6");
        assert_eq!(log.lines(), vec!["Line 4", "Line 5", "Line 6"]);

        // set_text replaces last line
        log.set_text("Line 6 (updated)");
        assert_eq!(log.lines(), vec!["Line 4", "Line 5", "Line 6 (updated)"]);

        // with_max_lines trims existing buffer if lowered
        let trimmed_log = log.with_max_lines(2);
        assert_eq!(trimmed_log.lines(), &["Line 5", "Line 6 (updated)"]);
    }

    #[test]
    fn test_ui_screen_alignment() {
        use crate::ui::{Padding, Panel, TextLog, UIAnchor};
        use macroquad::color::WHITE;
        use macroquad::math::vec2;

        let log = TextLog::new(vec2(0.0, 0.0), vec2(100.0, 100.0), 16.0, WHITE)
            .fit_to_screen_padding(20.0);

        assert!(log.auto_screen_size);
        assert_eq!(log.screen_padding, 20.0);

        let panel = Panel::new(vec2(0.0, 0.0), vec2(200.0, 200.0))
            .fullscreen();

        assert!(panel.auto_screen_size);

        // Vec2 still works (From<Vec2> impl)
        let anchor_pos = UIAnchor::TopRight.compute_position(vec2(100.0, 50.0), vec2(10.0, 10.0));
        assert!(anchor_pos.x >= 0.0);
        assert_eq!(anchor_pos.y, 10.0);

        // Padding::only — different sides
        let p = Padding::only(5.0, 10.0, 15.0, 20.0);
        assert_eq!(p.left, 5.0);
        assert_eq!(p.top, 10.0);
        assert_eq!(p.right, 15.0);
        assert_eq!(p.bottom, 20.0);

        // Padding::all — uniform
        let p_all = Padding::all(8.0);
        assert_eq!(p_all.left, 8.0);
        assert_eq!(p_all.right, 8.0);

        // Padding::symmetric
        let p_sym = Padding::symmetric(4.0, 12.0);
        assert_eq!(p_sym.left, 4.0);
        assert_eq!(p_sym.right, 4.0);
        assert_eq!(p_sym.top, 12.0);
        assert_eq!(p_sym.bottom, 12.0);

        // f32 -> Padding
        let p_f32: Padding = 6.0_f32.into();
        assert_eq!(p_f32.left, 6.0);

        // (f32, f32) tuple -> Padding
        let p_tuple: Padding = (3.0_f32, 7.0_f32).into();
        assert_eq!(p_tuple.left, 3.0);
        assert_eq!(p_tuple.top, 7.0);

        // (f32, f32, f32, f32) tuple -> Padding
        let p_tuple4: Padding = (1.0_f32, 2.0_f32, 3.0_f32, 4.0_f32).into();
        assert_eq!(p_tuple4.left, 1.0);
        assert_eq!(p_tuple4.bottom, 4.0);

        // UIAnchor::BottomRight with Padding::only
        let br = UIAnchor::BottomRight.compute_position(
            vec2(100.0, 50.0),
            Padding::only(0.0, 0.0, 20.0, 10.0),
        );
        // screen 800x600 (safe_screen), so: x = 800 - 100 - 20 = 680, y = 600 - 50 - 10 = 540
        assert_eq!(br.x, 680.0);
        assert_eq!(br.y, 540.0);
    }

    #[test]
    fn test_rich_text_bbcode_parsing() {
        use macroquad::color::{Color, WHITE, RED};

        // Test parse_color
        assert_eq!(parse_color("gold"), Some(Color::from_rgba(255, 215, 0, 255)));
        assert_eq!(parse_color("#FF0000"), Some(Color::from_rgba(255, 0, 0, 255)));
        assert_eq!(parse_color("invalid_color"), None);

        // Test parse_rich_text with [color=gold]
        let input = "Zdobyłeś [color=gold]100 złota[/color] i [color=#00FF00]Miecz[/color]!";
        let spans = parse_rich_text(input, WHITE);

        assert_eq!(spans.len(), 5);
        assert_eq!(spans[0].text, "Zdobyłeś ");
        assert_eq!(spans[0].color, WHITE);

        assert_eq!(spans[1].text, "100 złota");
        assert_eq!(spans[1].color, Color::from_rgba(255, 215, 0, 255));

        assert_eq!(spans[2].text, " i ");
        assert_eq!(spans[2].color, WHITE);

        assert_eq!(spans[3].text, "Miecz");
        assert_eq!(spans[3].color, Color::from_rgba(0, 255, 0, 255));

        assert_eq!(spans[4].text, "!");
        assert_eq!(spans[4].color, WHITE);

        // Test nested or fallback colors
        let input_nested = "[color=red]Red [color=blue]Blue[/color] Red[/color] White";
        let spans_nested = parse_rich_text(input_nested, WHITE);
        assert_eq!(spans_nested.len(), 4);
        assert_eq!(spans_nested[0].text, "Red ");
        assert_eq!(spans_nested[0].color, RED);
        assert_eq!(spans_nested[1].text, "Blue");
        assert_eq!(spans_nested[1].color, Color::from_rgba(0, 122, 255, 255));
        assert_eq!(spans_nested[2].text, " Red");
        assert_eq!(spans_nested[2].color, RED);
        assert_eq!(spans_nested[3].text, " White");
        assert_eq!(spans_nested[3].color, WHITE);
    }

    #[test]
    fn test_deferred_spawn_and_destruction() {
        let mut world = World::new();
        let mut ctx = Context::new();

        // Spawn a sprite and a logic object via Context
        ctx.spawn(Sprite::solid(vec2(10.0, 10.0), vec2(32.0, 32.0), RED).with_tag("player"));
        let mut logic_obj = LogicObject::logic(100).with_tag("spawner");
        logic_obj.destroy(); // Mark logic object for immediate destruction
        ctx.spawn_logic(logic_obj);

        assert_eq!(world.objects().len(), 0);
        assert_eq!(world.logic_objects().len(), 0);

        world.update(&mut ctx);

        // Player sprite was spawned and kept
        assert_eq!(world.objects().len(), 1);
        assert_eq!(world.count_by_tag("player"), 1);

        // Logic object was spawned then immediately reaped because it was marked destroyed
        assert_eq!(world.logic_objects().len(), 0);
    }

    #[test]
    fn test_sprite_spatial_and_with_data() {
        struct EnemyData {
            hp: i32,
        }

        let mut enemy = Sprite::solid(vec2(0.0, 0.0), vec2(20.0, 20.0), RED)
            .with_data(EnemyData { hp: 50 })
            .update(|obj, _ctx| {
                obj.data.hp -= 10;
                if obj.data.hp <= 0 {
                    obj.destroy();
                }
            });

        assert_eq!(enemy.center(), vec2(10.0, 10.0));
        enemy.set_center(vec2(50.0, 50.0));
        assert_eq!(enemy.position, vec2(40.0, 40.0));

        let circle = enemy.circle();
        assert_eq!(circle.center, vec2(50.0, 50.0));
        assert_eq!(circle.radius, 10.0);

        enemy.look_at(vec2(50.0, 60.0)); // Facing straight down (y+)
        assert!((enemy.rotation - std::f32::consts::FRAC_PI_2).abs() < 0.001);

        let mut ctx = Context::new();
        assert!(!enemy.is_destroyed());
        enemy.run_update(&mut ctx); // hp: 40
        assert!(!enemy.is_destroyed());
        enemy.run_update(&mut ctx); // hp: 30
        enemy.run_update(&mut ctx); // hp: 20
        enemy.run_update(&mut ctx); // hp: 10
        enemy.run_update(&mut ctx); // hp: 0 -> destroyed
        assert!(enemy.is_destroyed());
    }

    #[test]
    fn test_camera_visible_rect_and_culling() {
        let mut cam = Camera::new();
        cam.update(0.016);

        let r = cam.visible_world_rect();
        assert_eq!(r.x, -400.0);
        assert_eq!(r.y, -300.0);
        assert_eq!(r.w, 800.0);
        assert_eq!(r.h, 600.0);

        assert!(cam.is_on_screen(vec2(0.0, 0.0), 0.0));
        assert!(cam.is_on_screen(vec2(350.0, 250.0), 0.0));
        assert!(!cam.is_on_screen(vec2(500.0, 500.0), 0.0));
        assert!(cam.is_on_screen(vec2(500.0, 500.0), 200.0));
    }

    #[test]
    fn test_world_find_nearest_and_within_radius() {
        let mut world = World::new();
        world.add(Sprite::solid(vec2(0.0, 0.0), vec2(10.0, 10.0), RED).with_tag("enemy")); // center (5, 5)
        world.add(Sprite::solid(vec2(100.0, 100.0), vec2(10.0, 10.0), RED).with_tag("enemy")); // center (105, 105)

        let nearest = world.find_nearest(vec2(10.0, 10.0), "enemy");
        assert!(nearest.is_some());
        assert_eq!(nearest.unwrap().bounds().unwrap().x, 0.0);

        let in_radius = world.find_within_radius(vec2(0.0, 0.0), 20.0);
        assert_eq!(in_radius.len(), 1);

        let in_wide_radius = world.find_within_radius(vec2(0.0, 0.0), 200.0);
        assert_eq!(in_wide_radius.len(), 2);
    }

    #[test]
    fn test_action_map_fluent_builder() {
        let actions = ActionMap::new()
            .with_key("dash", KeyCode::Space)
            .with_mouse("dash", Side::Right);

        assert!(actions.has_action("dash"));
        assert_eq!(actions.keys_for("dash"), &[KeyCode::Space]);
    }

    #[test]
    fn test_logic_run_and_direct_deref() {
        struct WaveStats {
            pub wave: u32,
            pub score: i32,
        }

        let mut logic = Logic::new(WaveStats { wave: 1, score: 0 })
            .with_tag("wave_logic")
            .update(|obj, ctx| {
                obj.wave += 1; // Direct DerefMut access to WaveStats!
                obj.score += 50;
                ctx.state.set_int("wave_count", obj.wave as i64);
            });

        let mut ctx = Context::new();
        logic.run_update(&mut ctx);

        assert_eq!(logic.wave, 2);
        assert_eq!(logic.score, 50);
        assert_eq!(ctx.state.get_int("wave_count"), 2);
    }

    #[test]
    fn test_logic_interval_and_delayed() {
        let mut interval_logic = Logic::interval(1.0, |ctx| {
            ctx.state.increment("ticks", 1);
        });

        let mut delayed_logic = Logic::delayed(2.0, |ctx| {
            ctx.state.set_bool("delayed_done", true);
        });

        let mut ctx = Context::new();
        // 0.5s elapsed (dt = 0.016 * 31.25 = 0.5)
        ctx.time.set_time_scale(31.25);
        interval_logic.run_update(&mut ctx);
        delayed_logic.run_update(&mut ctx);

        assert_eq!(ctx.state.get_int("ticks"), 0);
        assert!(!ctx.state.get_bool("delayed_done"));
        assert!(!delayed_logic.is_destroyed());

        // 0.6s elapsed (dt = 0.016 * 37.5 = 0.6, total 1.1s)
        ctx.time.set_time_scale(37.5);
        interval_logic.run_update(&mut ctx);
        delayed_logic.run_update(&mut ctx);

        assert_eq!(ctx.state.get_int("ticks"), 1);
        assert!(!ctx.state.get_bool("delayed_done"));

        // 1.0s elapsed (dt = 0.016 * 62.5 = 1.0, total 2.1s)
        ctx.time.set_time_scale(62.5);
        interval_logic.run_update(&mut ctx);
        delayed_logic.run_update(&mut ctx);

        assert_eq!(ctx.state.get_int("ticks"), 2);
        assert!(ctx.state.get_bool("delayed_done"));
        assert!(delayed_logic.is_destroyed());
    }

    #[test]
    fn test_logic_until() {
        let mut until_logic = Logic::until(
            |ctx| ctx.state.get_bool("active_flag"),
            |ctx| {
                ctx.state.increment("counter", 1);
            },
        );

        let mut ctx = Context::new();
        ctx.state.set_bool("active_flag", true);

        until_logic.run_update(&mut ctx);
        assert_eq!(ctx.state.get_int("counter"), 1);
        assert!(!until_logic.is_destroyed());

        ctx.state.set_bool("active_flag", false);
        until_logic.run_update(&mut ctx);
        assert!(until_logic.is_destroyed());
    }

    #[test]
    fn test_world_add_logic_fn_and_context_spawn_logic_fn() {
        let mut world = World::new();
        world.add_logic_fn(|ctx| {
            ctx.state.increment("fn_runs", 1);
        });

        let mut ctx = Context::new();
        world.update(&mut ctx);
        assert_eq!(ctx.state.get_int("fn_runs"), 1);

        // Test deferred spawn_logic_fn from within an entity update pass
        world.add_logic_fn(|ctx| {
            ctx.spawn_logic_fn(|ctx| {
                ctx.state.set_bool("spawned_logic_fired", true);
            });
        });

        world.update(&mut ctx);
        // During this frame, spawn_logic_fn was queued and drained at the end
        assert!(!ctx.state.get_bool("spawned_logic_fired"));

        // Next frame, the spawned logic runs
        world.update(&mut ctx);
        assert!(ctx.state.get_bool("spawned_logic_fired"));
    }

    #[test]
    fn test_context_vec2_operations() {
        let mut ctx = Context::new();
        ctx.set_vec2("checkpoint", vec2(320.0, 180.0));

        assert_eq!(ctx.get_vec2("checkpoint"), Some(vec2(320.0, 180.0)));
        assert_eq!(ctx.get_vec2_or("missing", vec2(0.0, 0.0)), vec2(0.0, 0.0));
    }

    #[test]
    fn test_engine_letterbox_color() {
        let engine = Engine::new(Scene::new_empty("Main"))
            .with_letterbox_color(macroquad::color::DARKGRAY);

        assert_eq!(engine.letterbox_color, macroquad::color::DARKGRAY);
    }
}
