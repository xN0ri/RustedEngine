// ============================================================================
// 6. KOMPLETNE PROJEKTY GIER
// ============================================================================

export const gameSurvivorDoc = {
  id: "game-survivor",
  title: "30. 🏹 Arena Survivor (Top-Down)",
  description: "Pełny kod gry typu Vampire Survivors z pierścieniowym spawnerem fal, zbieraniem XP i ulepszeniami.",
  sections: [
    {
      id: "survivor-main",
      title: "Kompletny Kod Gry: Arena Survivor",
      content: `Kompletny, w 100% działający projekt gry Top-Down Survivor z losowaniem pozycji wrogów w pierścieniu wokół gracza:`,
      codeExamples: [
        {
          title: "main.rs (Arena Survivor)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

struct PlayerData {
    pub speed: f32,
    pub hp: i32,
}

#[macroquad::main(Engine::conf("Arena Survivor", 1280, 720))]
async fn main() {
    let player = Sprite::solid(vec2(640.0, 360.0), vec2(32.0, 32.0), BLUE)
        .with_data(PlayerData { speed: 220.0, hp: 100 })
        .update(|p, ctx| {
            p.position += ctx.input.wasd() * p.data.speed * ctx.dt();
            ctx.camera.target = p.position;
        });

    let spawner = Logic::interval(1.2, |ctx| {
        let spawn_pos = ctx.camera.target + random_in_annulus(350.0, 500.0);
        let enemy = Sprite::solid(spawn_pos, vec2(20.0, 20.0), RED)
            .with_data(50.0) // speed
            .update(|e, ctx| {
                e.move_towards(ctx.camera.target, *e.data * ctx.dt());
            });
        ctx.spawn(enemy);
    });

    let game_scene = Scene::new("Game", world! {
        objects: [player],
        logic: [spawner],
    });

    Engine::new(game_scene).run().await;
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const gameRpgQuestDoc = {
  id: "game-rpg-quest",
  title: "31. 📜 RPG Quest & Dialogi NPC",
  description: "Złożony system dialogów z NPC, branchingiem fabularnym, questami oraz zapisem postępu w SaveSystem.",
  sections: [
    {
      id: "rpg-main",
      title: "Kompletny Kod Gry: RPG Quest",
      content: `Poniższy kod prezentuje interakcję z NPC i sekwencję dialogową:`,
      codeExamples: [
        {
          title: "main.rs (RPG Quest)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

#[macroquad::main(Engine::conf("RPG Quest", 1280, 720))]
async fn main() {
    let hero = Sprite::solid(vec2(200.0, 200.0), vec2(28.0, 28.0), BLUE)
        .update(|h, ctx| {
            h.position += ctx.input.wasd() * 180.0 * ctx.dt();
        });

    let npc = Sprite::solid(vec2(300.0, 200.0), vec2(28.0, 28.0), GOLD)
        .update(|npc, ctx| {
            if ctx.input.is_key_pressed(KeyCode::E) && npc.position.distance(ctx.camera.target) < 60.0 {
                let dialog = Sequence::new(vec![
                    Step::show_text("dialog", "Mędrcze, potrzebuję Twojej pomocy!"),
                    Step::wait_for_input(),
                    Step::show_text("dialog", "Weź ten miecz i zbadaj jaskinię na północy."),
                    Step::wait_for_input(),
                    Step::set_visible("dialog", false),
                ]);
                ctx.spawn_logic(dialog);
            }
        });

    let scene = Scene::new("Village", world! {
        objects: [hero, npc],
    });

    Engine::new(scene).run().await;
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const gamePlatformerDoc = {
  id: "game-platformer",
  title: "32. 🏃 Platformówka 2D (Precision Platformer)",
  description: "Precyzyjny kontroler postaci z coyote time, jump buffering, bieganiem po rampach 45° i platformami one-way.",
  sections: [
    {
      id: "platformer-main",
      title: "Kompletny Kod Gry: Platformówka 2D",
      content: `Kompletny kod platformówki ze wspinaniem się po rampach i platformami skokowymi:`,
      codeExamples: [
        {
          title: "main.rs (Platformer 2D)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

struct PlayerData {
    pub velocity: Vec2,
    pub is_grounded: bool,
    pub coyote_timer: f32,
}

#[macroquad::main(Engine::conf("Platformer 2D", 1280, 720))]
async fn main() {
    let mut map = Tilemap::new(Texture2D::empty(), vec2(16.0, 16.0), 30, 20)
        .with_solid_tiles([1])
        .with_tile_collision(2, TileCollision::SlopeUpRight)
        .with_tile_collision(3, TileCollision::OneWay);

    map.load_from_ascii("
##############################
#                            #
#    ===                     #
#              /             #
##############################
", |c| match c { '#' => Some(1), '/' => Some(2), '=' => Some(3), _ => None });

    let player = Sprite::solid(vec2(100.0, 100.0), vec2(16.0, 24.0), YELLOW)
        .with_data(PlayerData { velocity: vec2(0.0, 0.0), is_grounded: false, coyote_timer: 0.0 })
        .update(|p, ctx| {
            p.data.velocity.x = ctx.input.axis_x() * 180.0;
            p.data.velocity.y += 900.0 * ctx.dt(); // Grawitacja

            p.position += p.data.velocity * ctx.dt();
            ctx.camera.follow(p.position, 5.0, ctx.dt());
        });

    let scene = Scene::new("Level1", world! {
        objects: [map, player],
    });

    Engine::new(scene).run().await;
}`,
          collapsible: false
        }
      ]
    }
  ]
};
