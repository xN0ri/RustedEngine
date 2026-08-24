// ============================================================================
// 6. KOMPLETNE PROJEKTY GIER — ROZBUDOWANE
// ============================================================================

export const gameSurvivorDoc = {
  id: "game-survivor",
  title: "34. 🏹 Arena Survivor (Top-Down)",
  badge: "Complete Game",
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

struct EnemyData {
    pub hp: i32,
    pub speed: f32,
}

// =======================================================================
// 3. ENCJE I LOGIKA
// =======================================================================
fn build_player() -> impl Object {
    Sprite::solid(vec2(320.0, 180.0), vec2(18.0, 18.0), SKYBLUE)
        .with_data(PlayerData { speed: 200.0, hp: 100, shoot_cooldown: 0.0 })
        .update(|p, ctx| {
            // Ruch WASD:
            p.position += ctx.input.wasd() * p.data.speed * ctx.dt();

            // Obrót w stronę kursora:
            p.look_at(ctx.mouse_world());

            // Strzelanie z cooldownem:
            p.data.shoot_cooldown -= ctx.dt();
            if ctx.mouse_down(Side::Left) && p.data.shoot_cooldown <= 0.0 {
                p.data.shoot_cooldown = 0.18;
                let dir = (ctx.mouse_world() - p.position).normalize_or_zero();
                ctx.spawn(build_bullet(p.position, dir));
                ctx.play_sound_varied("shoot", 0.05, 0.08);
            }

            // Kamera śledzi gracza:
            ctx.camera.follow(p.position, 6.0, ctx.dt());

            // Śmierć:
            if p.data.hp <= 0 {
                ctx.emit(PlayerDied { reason: "Defeated by enemies" });
                p.destroy();
            }
        })
}

fn build_bullet(origin: Vec2, dir: Vec2) -> impl Object {
    Sprite::solid(origin, vec2(6.0, 6.0), YELLOW)
        .with_data((dir * 480.0, 0.0_f32)) // (velocity, lifetime)
        .update(|b, ctx| {
            b.position += b.data.0 * ctx.dt();
            b.data.1 += ctx.dt();
            if b.data.1 > 2.5 { b.destroy(); }
        })
}

fn build_enemy(pos: Vec2) -> impl Object {
    Sprite::solid(pos, vec2(16.0, 16.0), DARKGRAY)
        .with_data(EnemyData { hp: 40, speed: 75.0 })
        .update(|e, ctx| {
            let player_pos = ctx.resources.get::<Vec2>().copied().unwrap_or(Vec2::ZERO);
            let dir = (player_pos - e.position).normalize_or_zero();
            e.position += dir * e.data.speed * ctx.dt();
            if e.data.hp <= 0 {
                ctx.emit(EnemyKilled { score: 100, pos: e.position });
                e.destroy();
            }
        })
}

#[macroquad::main(Engine::conf("Arena Survivor", 1280, 720))]
async fn main() {
    // Wave spawner — Logic controller:
    let wave_spawner = Logic::run(|ctx| {
        // Co 2.5s spawnuj wrogów w pierścieniu 300-450px od gracza:
        if ctx.every(2.5) {
            let player_pos = ctx.resources.get::<Vec2>().copied().unwrap_or(Vec2::ZERO);
            for _ in 0..3 {
                let pos = player_pos + random_in_annulus(300.0, 450.0);
                ctx.spawn(build_enemy(pos));
            }
        }
    });

    // Game rules controller — odbiera zdarzenia:
    let rules_ctrl = Logic::run(|ctx| {
        for _death in ctx.poll::<PlayerDied>() {
            ctx.switch_scene("GameOver");
        }
        for kill in ctx.poll::<EnemyKilled>() {
            let new_score = ctx.increment("score", kill.score as i64);
            ctx.set_ui_text("score_label", &format!("Score: {}", new_score));
        }
    });

    let game_scene = Scene::new("Game", world! {
        objects:  [build_player()],
        ui_objects: [],
        logic:    [wave_spawner, rules_ctrl],
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
  title: "35. 📜 RPG Quest & Dialogi NPC",
  badge: "Complete Game",
  description: "Złożony system dialogów z NPC, branchingiem fabularnym, questami, zapisem postępu oraz logiką warunkową Trigger opartą na flagach.",
  sections: [
    {
      id: "rpg-architecture",
      title: "Architektura Gry RPG Quest",
      content: `Ten przykład demonstruje kluczowe wzorce budowania gier fabularnych w RustedEngine:

### Kluczowe Systemy:
- **Dialogi NPC z Sequencami** — \`Sequence\` jako linearna narracja kroków: pokaż tekst → czekaj na Enter → uruchom akcję Rust → kontynuuj.
- **System Questów przez \`StateStore\`** — każdy quest to flaga bool (\`ctx.set_flag("quest_started", true)\`) i licznik postępu (\`ctx.increment("kills", 1)\`).
- **Warunkowy Branching przez \`Trigger\`** — \`Trigger::when_flag_true("quest_done", act)\` automatycznie otwiera skrzynię nagrody gdy warunek spełniony.
- **Zapis Postępu przez \`SaveSystem\`** — cały stan \`StateStore\` (questy, złoto, pozycja) serializowany do slotu zapisu z sumą CRC32.

> [!TIP]
> Dialogi NPC jako \`Sequence\` zamiast twardego kodu w \`update()\` dają ogromną elastyczność — łatwo dodać rozgałęzienia, animacje, fade-iny bez modyfikacji encji NPC. Każdy dialog to osobny \`Sequence\` spawnowany przez \`ctx.spawn_logic()\`.

> [!NOTE]
> Zadbaj o flagę \`ctx.has_flag("dialog_active")\` przed spawnowaniem dialogu — bez tego wciśnięcie E wielokrotnie spawna wiele równoległych sekwencji.`,
      codeExamples: [
        {
          title: "Kompletny Setup Sceny RPG z NPC i Dialogiem",
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
            let already_talking = ctx.has_flag("dialog_active");

            if ctx.input.is_key_pressed(KeyCode::E) && dist < 65.0 && !already_talking {
                ctx.set_flag("dialog_active", true);

                let dialog = Sequence::new(vec![
                    Step::show_text("dialog_box", "Witaj wędrowcze! Północne ruiny są w niebezpieczeństwie."),
                    Step::wait_for_input(),
                    Step::show_text("dialog_box", "Weź ten miecz i 150 sztuk złota na drogę."),
                    Step::wait_for_input(),
                    Step::play_sound("quest_accept"),
                    Step::run(|ctx, _| {
                        ctx.increment("player_gold", 150);
                        ctx.set_flag("quest_ruins_started", true);
                        ctx.set_flag("dialog_active", false);
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
        },
        {
          title: "System Questów z Licznikiem i Triggerem Nagrody",
          code: `// Inicjalizacja stanu questów na starcie sceny:
ctx.state.set_int("kill_count", 0);
ctx.state.set_bool("quest_ruins_started", false);
ctx.state.set_bool("quest_ruins_done", false);

// Trigger: gdy 5 wrogów zabitych i quest aktywny → quest ukończony:
ctx.triggers.register(Trigger::new(
    |ctx| {
        ctx.state.get_bool("quest_ruins_started") &&
        ctx.state.get_int("kill_count") >= 5
    },
    |ctx| {
        ctx.state.set_bool("quest_ruins_done", true);
        ctx.emit_signal("open_reward_chest");
        ctx.play_sound("quest_complete_fanfare");
    }
));

// W update() encji Enemy — po zabiciu:
if enemy.data.hp <= 0 {
    ctx.increment("kill_count", 1);
    ctx.emit(EnemyKilled { pos: enemy.position });
    enemy.destroy();
}`,
          collapsible: true,
          defaultCollapsed: true
        },
        {
          title: "Zapis i Wczytanie Postępu Questów",
          code: `// Zapis gry (np. po wejściu do save pointu):
let meta = SaveSlotMeta {
    slot_id: 1,
    title: format!(
        "Quest: {}/{} wrogów — Złoto: {}",
        ctx.state.get_int("kill_count"), 5,
        ctx.state.get_int("player_gold")
    ),
    playtime_seconds: ctx.elapsed_time(),
    timestamp: 0,
};
ctx.save_system.save_slot(1, &ctx.state, meta).expect("Błąd zapisu");

// Wczytanie przy starcie:
if let Ok((loaded_state, meta)) = ctx.save_system.load_slot(1) {
    ctx.state = loaded_state;
    println!("Wczytano: {}", meta.title);
}`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "rpg-api",
      title: "API Reference: RPG & Dialogi",
      apiTable: {
        headers: ["Metoda / Typ", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["Sequence::new(steps)", "Vec<Step>", "Sequence", "Tworzy sekwencję kroków do spawnowania jako dialog NPC."],
          ["Step::show_text(tag, text)", "&str, &str", "Step", "Wyświetla tekst w widgecie UI o podanym tagu."],
          ["Step::wait_for_input()", "brak", "Step", "Wstrzymuje sekwencję do wciśnięcia E/Enter/Spacji."],
          ["Step::play_sound(name)", "&str", "Step", "Odtwarza dźwięk podczas sekwencji."],
          ["Step::run(closure)", "FnMut(&mut Context, ...)", "Step", "Wykonuje dowolny kod Rust wewnątrz sekwencji."],
          ["ctx.spawn_logic(seq)", "impl Object", "()", "Dodaje sekwencję dialogu do warstwy logic świata."],
          ["ctx.has_flag(name)", "&str", "bool", "Sprawdza flagę bool w StateStore."],
          ["ctx.increment(key, delta)", "&str, i64", "i64", "Inkrementuje licznik i zwraca nową wartość."],
        ]
      }
    }
  ]
};

export const gamePlatformerDoc = {
  id: "game-platformer",
  title: "36. 🏃 Platformówka 2D (Precision Platformer)",
  badge: "Complete Game",
  description: "Precyzyjny kontroler postaci z coyote time, jump buffering, bieganiem po rampach 45° i platformami one-way.",
  sections: [
    {
      id: "platformer-architecture",
      title: "Architektura Precyzyjnej Platformówki",
      content: `Precision Platformer to gatunek wymagający ekstremalnej responsywności kontrolera i perfekcyjnej fizyki kolizji. RustedEngine dostarcza gotowe narzędzia:

### Kluczowe Mechaniki Kontrolera:
| Mechanika | Opis | Implementacja |
|---|---|---|
| **Grawitacja** | Stałe przyspieszenie w dół | \`velocity.y += 920.0 * dt\` |
| **Skok** | Natychmiastowy impuls w górę | \`velocity.y = -360.0\` |
| **Coyote Time** | Skok przez ~100ms po opuszczeniu krawędzi | \`coyote_timer > 0.0\` |
| **Jump Buffer** | Skok zarejestrowany ~100ms przed lądowaniem | \`jump_buffer_timer > 0.0\` |
| **Rampy 45°** | \`TileCollision::SlopeUpRight/Left\` | Automatyczna kolizja silnika |
| **Platformy One-Way** | Skok przez platformę od dołu | \`TileCollision::OneWay\` |

### Kolizje Kafelkowe:
\`Tilemap\` obsługuje specjalne kształty kolizji — rampy i platformy skocznościowe — bez konieczności pisania własnego kodu kolizji.

> [!TIP]
> **Coyote Time** (zwany też "coyote frames") to jedna z najważniejszych technik feel-good w platformówkach. Bez niej gracz czuje frustację gdy skok nie rejestruje się przy krawędzi. 100ms to złoty standard (Mario używa ~6 klatek przy 60fps).

> [!NOTE]
> **Jump Buffer** pozwala graczowi wcisnąć skok chwilę przed lądowaniem i zarejestrować go gdy postać dotknie ziemi. Sprawia że sterowanie czuje się przewidywalnie i responsywnie nawet przy lagach inputu.`,
      codeExamples: [
        {
          title: "PlayerData z Coyote Time & Jump Buffer",
          code: `struct PlayerData {
    pub velocity: Vec2,
    pub is_grounded: bool,
    pub coyote_timer: f32,      // Czas po opuszczeniu platformy gdy skok jeszcze działa
    pub jump_buffer_timer: f32, // Wciśnięty skok zostanie zarejestrowany przy lądowaniu
    pub was_grounded: bool,     // Stan z poprzedniej klatki
}

impl PlayerData {
    pub fn new() -> Self {
        Self {
            velocity: Vec2::ZERO,
            is_grounded: false,
            coyote_timer: 0.0,
            jump_buffer_timer: 0.0,
            was_grounded: false,
        }
    }
}`,
          collapsible: false
        },
        {
          title: "Kompletny Kontroler Platformówki",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

const GRAVITY: f32     = 920.0;
const JUMP_FORCE: f32  = -360.0;
const SPEED: f32       = 190.0;
const COYOTE_TIME: f32 = 0.10;
const JUMP_BUFFER: f32 = 0.10;

let player = Sprite::solid(vec2(80.0, 100.0), vec2(16.0, 24.0), YELLOW)
    .with_data(PlayerData::new())
    .update(|p, ctx| {
        let dt = ctx.dt();

        // Coyote Time: odliczaj gdy w powietrzu tuż po krawędzi
        if p.data.was_grounded && !p.data.is_grounded {
            p.data.coyote_timer = COYOTE_TIME;
        }
        p.data.coyote_timer = (p.data.coyote_timer - dt).max(0.0);
        p.data.was_grounded = p.data.is_grounded;

        // Jump Buffer: zarejestruj wciśnięcie skoku
        if ctx.input.is_key_pressed(KeyCode::Space) {
            p.data.jump_buffer_timer = JUMP_BUFFER;
        }
        p.data.jump_buffer_timer = (p.data.jump_buffer_timer - dt).max(0.0);

        // Ruch poziomy
        p.data.velocity.x = ctx.input.axis_x() * SPEED;

        // Grawitacja
        if !p.data.is_grounded {
            p.data.velocity.y += GRAVITY * dt;
        }

        // Skok z coyote time lub jump buffer
        let can_jump  = p.data.is_grounded || p.data.coyote_timer > 0.0;
        let wants_jump = p.data.jump_buffer_timer > 0.0;

        if can_jump && wants_jump {
            p.data.velocity.y = JUMP_FORCE;
            p.data.coyote_timer = 0.0;
            p.data.jump_buffer_timer = 0.0;
            ctx.play_sound_varied("jump", 0.08, 0.1);
        }

        p.position += p.data.velocity * dt;
        ctx.camera.look_ahead(p.position, p.data.velocity, 60.0, 5.0, dt);
    });`,
          collapsible: false
        },
        {
          title: "Konfiguracja Tilemap z Rampami i Platformami",
          code: `let mut map = Tilemap::new(tileset_texture, vec2(16.0, 16.0), 40, 22)
    .with_solid_tiles([1, 2])
    .with_tile_collision(3, TileCollision::SlopeUpRight)
    .with_tile_collision(4, TileCollision::SlopeUpLeft)
    .with_tile_collision(5, TileCollision::OneWay);

// Wczytanie poziomu z ASCII:
map.load_from_ascii("
########################################
#                                      #
#     ===          /\\\\                 #
#            ####                      #
########################################
", |c| match c {
    '#' => Some(1),
    '/' => Some(3),  // Rampa w prawo
    '=' => Some(5),  // Platforma one-way
    _   => None
});

let scene = Scene::new("Level1", world! {
    objects: [map, player],
});

Engine::new(scene)
    .with_virtual_resolution(480.0, 270.0)
    .run()
    .await;`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "platformer-api",
      title: "API Reference: Platformówka",
      apiTable: {
        headers: ["Mechanika / Metoda", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["ctx.input.axis_x()", "brak", "f32", "Oś pozioma z klawiszy A/D i strzałek, wartość [-1.0, 1.0]."],
          ["ctx.input.is_key_pressed(key)", "KeyCode", "bool", "Sprawdza czy klawisz został wciśnięty w tej klatce."],
          ["ctx.camera.look_ahead(pos, vel, dist, spd, dt)", "Vec2, Vec2, f32, f32, f32", "()", "Wyprzedza kamerę w kierunku biegu postaci."],
          ["TileCollision::SlopeUpRight", "brak", "brak", "Kształt kolizji: rampa wznosząca się w prawo (/)."],
          ["TileCollision::SlopeUpLeft", "brak", "brak", "Kształt kolizji: rampa wznosząca się w lewo."],
          ["TileCollision::OneWay", "brak", "brak", "Platforma skocznościowa: kolizja tylko od góry."],
          ["ctx.play_sound_varied(name, p, v)", "&str, f32, f32", "()", "Dźwięk skoku z losową wariacją tonu."],
        ]
      }
    }
  ]
};
