use rusted_engine::prelude::*;
use macroquad::prelude::*;

struct PlayerData {
    speed: f32,
    hp: i32,
}

struct EnemyData {
    speed: f32,
}

#[macroquad::main("RustedEngine Demo")]
async fn main() {
    // PLAYER

    let player = GameObject::new(
        Sprite::solid(vec2(0.0, 0.0), vec2(50.0, 50.0), BLUE).with_tag("player"),
        PlayerData {
            speed: 250.0,
            hp: 100,
        },
    )
    .update(|player, ctx| {
        let direction = ctx.input.wasd();
        let speed = player.data.speed;

        player.position += direction * speed * ctx.dt();

        if player.click(ctx, Side::Left) {
            player.data.hp -= 1;
            println!("Player HP: {}", player.data.hp);
        }

        if player.clicked(ctx, Side::Left) {
            player.color = RED;
        } else if player.is_hovered(ctx) {
            player.color = YELLOW;
        } else {
            player.color = BLUE;
        }
    });

    // ENEMY

    let enemy = GameObject::new(
        Sprite::solid(vec2(150.0, 0.0), vec2(45.0, 45.0), RED).with_tag("enemy"),
        EnemyData { speed: 80.0 },
    )
    .update(|enemy, ctx| {
        let speed = enemy.data.speed;
        if enemy.position.x > 0.0 {
            enemy.position.x -= speed * ctx.dt();
        }
    });

    // SCENE

    let mut scene = Scene::new_empty("Game");
    scene.add(player);
    scene.add(enemy);

    scene.add_ui(Text::new(
        "RustedEngine Demo",
        vec2(20.0, 35.0),
        28.0,
        WHITE,
    ));
    scene.add_ui(Text::new(
        "WASD - ruch | LPM - klik gracza",
        vec2(20.0, 65.0),
        20.0,
        WHITE,
    ));

    // ENGINE

    let mut engine = Engine::new(scene).with_background_color(DARKGRAY);
    engine.run().await;
}
