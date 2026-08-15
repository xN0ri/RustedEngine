use RustedEngine::prelude::*;
use macroquad::prelude::*;

struct PlayerData {
    hp: f32,
    max_hp: f32,
}

#[macroquad::main("RustyEngine - Full Game Demo")]
async fn main() {
    let player_sprite = Sprite::solid(vec2(0.0, 0.0), vec2(50.0, 50.0), RED);

    let player = GameObject::new(
        player_sprite,
        PlayerData {
            hp: 100.0,
            max_hp: 100.0,
        },
    )
    .with_tag("player")
    .update(|obj, ctx| {
        let speed = 250.0 * ctx.time.deltatime();

        if ctx.input.is_key_down(KeyCode::D) {
            obj.position.x += speed;
        }
        if ctx.input.is_key_down(KeyCode::A) {
            obj.position.x -= speed;
        }
        if ctx.input.is_key_down(KeyCode::W) {
            obj.position.y -= speed;
        }
        if ctx.input.is_key_down(KeyCode::S) {
            obj.position.y += speed;
        }

        ctx.camera.follow(obj.position, 5.0, ctx.time.deltatime());

        if obj.click_ctx(ctx, Side::Left) {
            obj.data.hp = (obj.data.hp - 15.0).max(0.0);
            let hp_ratio = (obj.data.hp / obj.data.max_hp) as f64;
            ctx.state.set_float("player_hp_ratio", hp_ratio);
            obj.color = BLUE;
            ctx.camera.shake(15.0, 0.3);
            println!(
                "Kliknięto w gracza w świecie 2D! HP: {} (ratio: {:.2})",
                obj.data.hp, hp_ratio
            );
        } else if obj.is_hovered_ctx(ctx) {
            obj.color = YELLOW;
        } else {
            obj.color = RED;
        }
    });

    let particle_emitter = Behavior::new(ParticleEmitter::new(), ())
        .with_tag("emitter")
        .update(|obj, ctx| {
            if ctx.input.is_key_pressed(KeyCode::Space) {
                let m_pos = ctx.camera.screen_to_world(ctx.input.mouse_position());
                obj.inner_mut()
                    .emit_burst(m_pos, 30, GOLD, (60.0, 250.0), 7.0, 0.8);
                ctx.camera.shake(6.0, 0.15);
            }
        });

    let ui_title = Text::new(
        "RustyEngine 2D Framework Demo",
        vec2(20.0, 35.0),
        26.0,
        GOLD,
    )
    .with_tag("ui_title");

    let ui_info = Text::new(
        "WASD: Ruch | Kliknij LPM na graczu (Shake & HP) | Spacja: Iskry w miejscu myszki",
        vec2(20.0, 65.0),
        18.0,
        WHITE,
    )
    .with_tag("ui_info");

    let hp_bar = ProgressBar::new(vec2(20.0, 90.0), vec2(200.0, 20.0), 1.0)
        .with_tag("hp_bar")
        .with_state_binding("player_hp_ratio");

    let world = world! {
        objects: [player, particle_emitter],
        ui: [ui_title, ui_info, hp_bar],
    };

    let game_scene = Scene::new("Game", world);

    let mut engine = Engine::new(vec![game_scene]);
    engine.background_color = DARKGRAY;
    engine.run().await;
}
