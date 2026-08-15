use RustedEngine::prelude::*;
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
        // Ruch WASD (dzięki Deref możemy używać obj.position bezpośrednio!)
        if ctx.input.is_key_down(KeyCode::D) {
            obj.position.x += 200.0 * ctx.time.deltatime();
        }
        if ctx.input.is_key_down(KeyCode::A) {
            obj.position.x -= 200.0 * ctx.time.deltatime();
        }
        if ctx.input.is_key_down(KeyCode::W) {
            obj.position.y -= 200.0 * ctx.time.deltatime();
        }
        if ctx.input.is_key_down(KeyCode::S) {
            obj.position.y += 200.0 * ctx.time.deltatime();
        }

        // Jednorazowe kliknięcie (zmniejsza HP o 1):
        if obj.click(Side::Left) {
            obj.data.hp -= 1;
            println!("Kliknięto w obiekt! Nowe HP: {}", obj.data.hp);
        }

        // Stan wizualny (kolory):
        if obj.clicked(Side::Left) {
            obj.color = BLUE;
        } else if obj.is_hovered() {
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

    // 3. Budujemy świat używając makra world!
    let world = world! {
        objects: [player],

        ui: [ui_info],
    };
    let main_scene = Scene::new("Main", world);

    let mut engine = Engine::new(vec![main_scene]);
    engine.background_color = DARKGRAY;
    engine.run().await;
}
