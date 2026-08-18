use rusted_engine::prelude::*;
use macroquad::prelude::*;

struct PlayerData {
    hp: i32,
}

#[macroquad::main("Moja Gra")]
async fn main() {
    let texture = Texture2D::from_rgba8(1, 1, &[255, 255, 255, 255]);

    // 1. Tworzymy gracza (GameObject to teraz Behavior<Sprite, PlayerData>)
    let player_sprite =
        Sprite::new(vec2(100.0, 100.0), vec2(50.0, 50.0), 0.0, texture).with_color(RED);

    let player = GameObject::new(player_sprite, PlayerData { hp: 100 }).update(|obj, ctx| {
        // Ruch WASD
        let dir = ctx.input.wasd();
        obj.position += dir * 200.0 * ctx.dt();

        // Jednorazowe kliknięcie (zmniejsza HP o 1):
        if obj.click(ctx, Side::Left) {
            obj.data.hp -= 1;
            println!("Kliknięto w obiekt! Nowe HP: {}", obj.data.hp);
        }

        // Stan wizualny (kolory):
        if obj.clicked(ctx, Side::Left) {
            obj.color = BLUE;
        } else if obj.is_hovered(ctx) {
            obj.color = YELLOW;
        } else {
            obj.color = RED;
        }
    });

    // 2. Instrukcja UI
    let ui_info = Text::new(
        "Najedz myszka (YELLOW), kliknij LPM (BLUE) lub steruj WASD",
        vec2(20.0, 40.0),
        22.0,
        WHITE,
    );

    // 3. Budujemy scenę używając czystego, ergonomicznego API
    let mut main_scene = Scene::new_empty("Main");
    main_scene.add(player);
    main_scene.add_ui(ui_info);

    let mut engine = Engine::new(main_scene).with_background_color(DARKGRAY);
    engine.run().await;
}
