// ============================================================================
// 6. KOMPLETNE PROJEKTY GIER
// ============================================================================

export const gameSurvivorDoc = {
  id: "game-survivor",
  title: "30. 🏹 Arena Survivor (Top-Down)",
  description: "Kompletna, modularna architektura gry typu Vampire Survivors zrealizowana w 100% z wykorzystaniem wzorców RustedEngine.",
  sections: [
    {
      id: "survivor-architecture",
      title: "Architektura Projektu",
      content: `Ten przykład przedstawia kompletną, modularną architekturę gry typu **Arena Survivor / Vampire Survivors** zrealizowaną w 100% z wykorzystaniem wzorców RustedEngine:

### 🧩 Podział Odpowiedzialności w Silniku:

- **Encje (\`Behavior<Sprite, Data>\`)**:
  - \`Player\`: Sterowanie WASD, obrót w stronę kursora myszy (\`look_at\`), strzelanie pociskami z timerem cooldownu.
  - \`Bullet\`: Porusza się z prędkością wektorową, niszczy się po upływie czasu życia lub trafieniu.
  - \`Enemy\`: Podąża w stronę gracza, zadaje obrażenia przy kontakcie kolizyjnym.
- **Magistrala Zdarzeń (\`EventBus\` / \`ctx.events\`)**:
  - \`EnemyKilled { score: u32, pos: Vec2 }\`: Emitowane w chwili śmierci wroga.
  - \`PlayerDied { reason: &'static str }\`: Emitowane w chwili zgonu gracza.
- **Kontrolery Logiki (\`Logic\` / Warstwa Dyspozytorska)**:
  - \`WaveSpawner\`: Spawnuje wrogów w pierścieniu wokół gracza poza ekranem za pomocą \`random_in_annulus\`.
  - \`GameRulesController\`: Odbiera zdarzenia śmierci gracza, przełącza scenę na \`GameOver\` i aktualizuje najlepszy wynik.
- **Warstwa Interfejsu (\`UI\` / Screen Space)**:
  - Pasek zdrowia \`ProgressBar\` powiązany z danymi gracza.
  - Licznik punktów \`Text\` z tagiem aktualizowany co klatkę.
  - Pływające napisy obrażeń (\`DamagePopup\`) spawnowane odroczono w przestrzeni UI (\`ctx.spawn_ui\`).

> [!TIP]
> **Kluczowy Wzorzec Architektoniczny**:
> Zwróć uwagę, że pociski i wrogowie nie usuwają się "w locie" mutując tablice w trakcie iteracji. Wywołują \`obj.destroy()\`, a silnik sam bezpiecznie czyści pamięć na koniec klatki (*Auto-Cleanup*).`,
      codeExamples: [
        {
          title: "src/main.rs (Kompletna Gra Arena Survivor)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

// =======================================================================
// 1. TYPOWANE ZDARZENIA
// =======================================================================
#[derive(Clone, Debug)]
pub struct EnemyKilled {
    pub score: u32,
    pub pos: Vec2,
}

#[derive(Clone, Debug)]
pub struct PlayerDied {
    pub reason: &'static str,
}

// =======================================================================
// 2. STRUKTURY DANYCH ENCJI
// =======================================================================
struct PlayerData {
    pub speed: f32,
    pub hp: i32,
    pub shoot_cooldown: f32,
}

struct BulletData {
    pub velocity: Vec2,
    pub lifetime: f32,
}

struct EnemyData {
    pub speed: f32,
    pub hp: i32,
}

struct DamagePopupData {
    pub lifetime: f32,
}

// =======================================================================
// 3. FABRYKI ENCJI
// =======================================================================

/// Tworzy postać gracza z logiką sterowania i strzelania
fn create_player() -> impl Object {
    Sprite::solid(vec2(320.0, 180.0), vec2(24.0, 24.0), BLUE)
        .with_data(PlayerData {
            speed: 200.0,
            hp: 100,
            shoot_cooldown: 0.0,
        })
        .with_tag("player")
        .update(|player, ctx| {
            // Ruch wektorowy WASD
            let dir = ctx.input.wasd();
            player.position += dir * player.data.speed * ctx.dt();

            // Płynny obrót w stronę kursora myszy
            let mouse_pos = ctx.mouse_world();
            player.look_at(mouse_pos);

            // Cooldown strzelania
            if player.data.shoot_cooldown > 0.0 {
                player.data.shoot_cooldown -= ctx.dt();
            }

            // Strzał na lewy przycisk myszy
            if ctx.mouse_down(Side::Left) && player.data.shoot_cooldown <= 0.0 {
                player.data.shoot_cooldown = 0.15; // 6 strzałów/sekundę

                let bullet_dir = player.center().dir_to(mouse_pos);
                let bullet = Sprite::solid(player.center() - vec2(4.0, 4.0), vec2(8.0, 8.0), YELLOW)
                    .with_data(BulletData {
                        velocity: bullet_dir * 450.0,
                        lifetime: 1.5,
                    })
                    .with_tag("bullet")
                    .update(|bullet, ctx| {
                        bullet.position += bullet.data.velocity * ctx.dt();
                        bullet.data.lifetime -= ctx.dt();

                        if bullet.data.lifetime <= 0.0 {
                            bullet.destroy();
                        }
                    });

                ctx.spawn(bullet);
                ctx.play_sound_varied("laser_shoot", 0.1, 0.1);
            }

            // Zapis pozycji do stanu gry (by wrogowie wiedzieli gdzie iść)
            ctx.state.set_vec2("player_pos", player.center());
        })
}

/// Tworzy przeciwnika śledzącego gracza
fn create_enemy(spawn_pos: Vec2) -> impl Object {
    Sprite::solid(spawn_pos, vec2(20.0, 20.0), RED)
        .with_data(EnemyData {
            speed: random_range(90.0, 130.0),
            hp: 30,
        })
        .with_tag("enemy")
        .update(|enemy, ctx| {
            let player_pos = ctx.state.get_vec2("player_pos").unwrap_or(vec2(320.0, 180.0));
            enemy.look_at(player_pos);
            enemy.move_towards(player_pos, enemy.data.speed * ctx.dt());

            // Kolizja wroga z pociskami
            if enemy.data.hp <= 0 {
                enemy.destroy();
                ctx.emit(EnemyKilled {
                    score: 100,
                    pos: enemy.center(),
                });
            }
        })
}

// =======================================================================
// 4. KONTROLERY LOGIKI (SYSTEMS)
// =======================================================================

/// Spawner fal generujący wrogów w pierścieniu wokół gracza
fn create_wave_spawner() -> impl Object {
    Logic::interval(1.2, |ctx| {
        let player_pos = ctx.state.get_vec2("player_pos").unwrap_or(vec2(320.0, 180.0));
        // Losowanie pozycji w pierścieniu 300-450px od gracza
        let spawn_offset = random_in_annulus(300.0, 450.0);
        ctx.spawn(create_enemy(player_pos + spawn_offset));
    })
}

/// Kontroler reguł gry (zbiera zdarzenia i nalicza punkty)
fn create_game_rules() -> impl Object {
    Logic::run(|ctx| {
        // Obsługa zniszczenia wrogów
        for killed in ctx.poll::<EnemyKilled>() {
            let new_score = ctx.increment("score", killed.score as i64);
            ctx.set_ui_text("score_label", &format!("Wynik: {}", new_score));

            // Spawnowanie pływającego tekstu z punktami w przestrzeni UI
            let popup = Text::new(&format!("+{}", killed.score), killed.pos, 14.0, GOLD)
                .with_data(DamagePopupData { lifetime: 0.6 })
                .update(|p, ctx| {
                    p.position.y -= 30.0 * ctx.dt();
                    p.data.lifetime -= ctx.dt();
                    if p.data.lifetime <= 0.0 {
                        p.destroy();
                    }
                });
            ctx.spawn_ui(popup);
        }

        // Obsługa zgonu gracza
        for death in ctx.poll::<PlayerDied>() {
            println!("Gracz zginął: {}", death.reason);
            ctx.switch_scene("GameOver");
        }
    })
}

// =======================================================================
// 5. GŁÓWNY PUNKT WEJŚCIA APLIKACJI
// =======================================================================
#[macroquad::main(Engine::conf("Arena Survivor v1.0", 1280, 720))]
async fn main() {
    let hud_score = Text::new("Wynik: 0", vec2(20.0, 20.0), 22.0, WHITE)
        .with_tag("score_label");

    let game_scene = Scene::new("Game", world! {
        objects: [create_player()],
        ui:      [hud_score],
        logic:   [create_wave_spawner(), create_game_rules()],
    });

    let mut engine = Engine::new(vec![
        game_scene,
        Scene::new_empty("GameOver"),
    ])
    .with_virtual_resolution(640.0, 360.0)
    .with_letterbox_color(BLACK);

    engine.run().await;
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
      content: `Poniższy kod prezentuje interakcję z NPC, sekwencję dialogową i przyznanie nagrody:`,
      codeExamples: [
        {
          title: "src/main.rs (RPG Quest)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

#[macroquad::main(Engine::conf("RPG Quest", 1280, 720))]
async fn main() {
    let hero = Sprite::solid(vec2(200.0, 200.0), vec2(28.0, 28.0), SKYBLUE)
        .update(|h, ctx| {
            h.position += ctx.input.wasd() * 190.0 * ctx.dt();
            ctx.camera.follow(h.position, 4.5, ctx.dt());
        });

    let npc = Sprite::solid(vec2(320.0, 200.0), vec2(28.0, 28.0), GOLD)
        .update(|npc, ctx| {
            let dist = npc.position.distance(ctx.camera.target);
            if ctx.input.is_key_pressed(KeyCode::E) && dist < 65.0 {
                let dialog = Sequence::new(vec![
                    Step::show_text("dialog_box", "Mędrcze: Witaj wędrowcze! Północne ruiny są w niebezpieczeństwie."),
                    Step::wait_for_input(),
                    Step::show_text("dialog_box", "Mędrcze: Weź ten miecz i 150 sztuk złota na drogę."),
                    Step::wait_for_input(),
                    Step::play_sound("quest_accept"),
                    Step::run(|ctx, _| {
                        ctx.increment("player_gold", 150);
                        ctx.set_flag("quest_ruins_started", true);
                    }),
                    Step::set_visible("dialog_box", false),
                    Step::end(),
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
      content: `Kompletny kod platformówki ze wspinaniem się po rampach, platformami skokowymi i fizyką grawitacji:`,
      codeExamples: [
        {
          title: "src/main.rs (Platformer 2D)",
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
#              /\\            #
##############################
", |c| match c { '#' => Some(1), '/' => Some(2), '=' => Some(3), _ => None });

    let player = Sprite::solid(vec2(80.0, 100.0), vec2(16.0, 24.0), YELLOW)
        .with_data(PlayerData { velocity: vec2(0.0, 0.0), is_grounded: false, coyote_timer: 0.0 })
        .update(|p, ctx| {
            // Ruch w osi X
            p.data.velocity.x = ctx.input.axis_x() * 190.0;

            // Grawitacja
            p.data.velocity.y += 920.0 * ctx.dt();

            // Skok
            if ctx.input.is_key_pressed(KeyCode::Space) && p.data.is_grounded {
                p.data.velocity.y = -360.0;
                p.data.is_grounded = false;
                ctx.play_sound_varied("jump", 0.08, 0.1);
            }

            p.position += p.data.velocity * ctx.dt();
            ctx.camera.follow(p.position, 5.5, ctx.dt());
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
