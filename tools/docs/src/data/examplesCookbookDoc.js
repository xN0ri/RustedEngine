export const examplesCookbookDoc = {
  id: "examples-cookbook",
  title: "10. 🎮 Complete Game Examples & Architecture Recipes",
  icon: "Gamepad2",
  badge: "Real-World Projects",
  description: "Pełnowymiarowe, szczegółowo omówione przykłady kompletnych architektur gier w RustedEngine — od Top-Down Survivora, przez system questów i dialogów NPC, po zaawansowany interfejs okienkowy.",
  sections: [
    {
      id: "top-down-survivor",
      title: "Przykład 1: Top-Down Arena Survivor (Kompletna Mini-Gra)",
      content: `Ten przykład przedstawia kompletną, modularną architekturę gry typu **Arena Survivor / Vampire Survivors** zrealizowaną w 100% z wykorzystaniem wzorców RustedEngine.

### Architektura Projektu:
1. **Encje (\`Behavior<Sprite, Data>\`)**:
   - \`Player\`: Sterowanie WASD, obrót w stronę kursora myszy (\`look_at\`), strzelanie pociskami z timerem cooldownu.
   - \`Bullet\`: Porusza się z prędkością wektorową, niszczy się po upływie czasu życia lub trafieniu.
   - \`Enemy\`: Podąża w stronę gracza, zadaje obrażenia przy kontakcie kolizyjnym.
2. **Magistrala Zdarzeń (\`EventBus\`)**:
   - \`EnemyKilled { score: u32, position: Vec2 }\`: Emitowane w chwili śmierci wroga.
   - \`PlayerDied { reason: &'static str }\`: Emitowane w chwili zgonu gracza.
3. **Kontrolery Logiki (\`Logic\`)**:
   - \`WaveSpawner\`: Spawnuje wrogów w pierścieniu wokół gracza poza ekranem za pomocą \`random_in_annulus\`.
   - \`GameRulesController\`: Odbiera zdarzenia śmierci gracza, przełącza scenę na \`GameOver\` i aktualizuje najlepszy wynik.
4. **Warstwa Interfejsu (\`UI\`)**:
   - Pasek zdrowia \`ProgressBar\` powiązany z danymi gracza.
   - Licznik punktów \`Text\` aktualizowany co klatkę.
   - Pływające napisy obrażeń (\`DamagePopup\`) spawnowane odroczono w przestrzeni UI (\`ctx.spawn_ui\`).`,
      callouts: [
        {
          type: "protip",
          title: "Kluczowy Wzorzec Architektoniczny",
          text: "Zwróć uwagę, że pociski i wrogowie nie usuwają się 'w locie' mutując tablice w trakcie iteracji. Wywołują obj.destroy(), a silnik sam bezpiecznie czyści pamięć na koniec klatki (Auto-Cleanup)."
        }
      ],
      codeExamples: [
        {
          title: "Kompletny Kod Gry: Arena Survivor",
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

            // Spawnowanie pływającego tekstu z punktami
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
    },
    {
      id: "rpg-quest-dialogue",
      title: "Przykład 2: System Dialogów NPC & Zadań Questowych (RPG Sequence)",
      content: `W grach fabularnych i RPG kluczowe jest oddzielenie skomplikowanych drzew dialogowych od logiki renderowania. Ten przykład pokazuje, jak połączyć **\`Sequence\`**, **\`StateStore\`** oraz **\`SaveSystem\`** w pełnoprawny system interakcji z NPC.

### Elementy Rozwiązania:
1. **Detekcja Interakcji**: Postać gracza podchodzi do NPC i naciska klawisz \`E\`.
2. **Sekwencja Dialogowa (\`Sequence\`)**:
   - Wyświetla tekst kwestii dialogowej w oknie dialogowym.
   - Oczekuje na naciśnięcie spacji/myszy przez gracza (\`Step::wait_for_input\`).
   - Sprawdza flagi questa w \`ctx.state\` za pomocą \`Step::branch_to\`.
   - Modyfikuje świat gry przez **\`Step::run\`** (np. przekazanie przedmiotu, odtworzenie dźwięku nagrody).
3. **Trwały Zapis Postępu**: Zapisanie stanu questa do pliku zapisu z sumą CRC32.`,
      codeExamples: [
        {
          title: "Kompletny Kod: Interaktywny NPC z Drzewem Dialogowym i Zadaniami",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

struct NpcData {
    pub dialog_opened: bool,
}

/// Tworzy postać Mędrca oferującego zadanie
fn create_quest_npc(pos: Vec2) -> impl Object {
    Sprite::solid(pos, vec2(32.0, 32.0), GREEN)
        .with_data(NpcData { dialog_opened: false })
        .with_tag("quest_npc")
        .update(|npc, ctx| {
            let player_pos = ctx.state.get_vec2("player_pos").unwrap_or_default();
            let dist = npc.center().dist_to(player_pos);

            // Wykrycie obecności gracza w promieniu 40px
            if dist <= 40.0 && ctx.input.is_key_pressed(KeyCode::E) && !npc.data.dialog_opened {
                npc.data.dialog_opened = true;

                // Budowanie rozgałęzionej sekwencji dialogowej
                let quest_seq = Sequence::new(vec![
                    Step::set_visible("dialog_box", true),
                    Step::show_text("npc_name", "Mędrzec Alden:"),
                    Step::show_text("dialog_text", "Witaj, podróżniku! Czy przyniosłeś Kryształ Żywiołów?"),
                    Step::wait_for_input(),
                    
                    // Rozgałęzienie: czy gracz posiada już kryształ?
                    Step::branch_to("has_crystal", "quest_completed", "quest_in_progress"),

                    // ŚCIEŻKA 1: Quest ukończony
                    Step::label("quest_completed"),
                    Step::show_text("dialog_text", "Niesamowite! Ocaliłeś naszą wioskę. Przyjmij tę nagrodę!"),
                    Step::play_sound("quest_reward_fanfare"),
                    Step::run(|ctx, world| {
                        ctx.state.increment("gold", 500);
                        ctx.state.set_bool("quest_sage_done", true);
                        world.remove_by_tag("barrier_gate");
                    }),
                    Step::wait_for_input(),
                    Step::jump_to("dialog_end"),

                    // ŚCIEŻKA 2: Quest w toku
                    Step::label("quest_in_progress"),
                    Step::show_text("dialog_text", "Kryształ spoczywa w Jaskini Cieni na północy. Bądź ostrożny!"),
                    Step::wait_for_input(),

                    // KONIEC DIALOGU
                    Step::label("dialog_end"),
                    Step::set_visible("dialog_box", false),
                    Step::run(|ctx, _| {
                        // Zapisanie stanu gry po rozmowie
                        let meta = SaveSlotMeta {
                            slot_id: 1,
                            title: "Rozmowa z Mędrcem".into(),
                            playtime_seconds: ctx.time.total_time(),
                            timestamp: 0,
                        };
                        let _ = ctx.save_system.save_slot(1, &ctx.state, meta);
                    }),
                    Step::end(),
                ]);

                ctx.spawn_logic(Logic::run(|_| {}));
            }
        })
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "window-manager-tactical-ui",
      title: "Przykład 3: Zaawansowany Desktop UI & Menedżer Okien (PanelManager)",
      content: `W zaawansowanych strategiach, grach RPG czy edytorach poziomów niezbędny jest elastyczny system okien z obsługą przesuwania myszą, zmiany rozmiaru, warstw Z-order oraz zagnieżdżonych layoutów.

### Możliwości Pokazane w Przykładzie:
- Tworzenie okienek przez \`PanelManager\`.
- Dynamiczne dodawanie widgetów do wnętrza okna za pomocą layoutu \`Column\` i \`Row\`.
- Zmiana zawartości paneli w czasie rzeczywistym.`,
      codeExamples: [
        {
          title: "Kompletny Kod: Interaktywny Ekwipunek i Okno Statystyk",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

#[macroquad::main("UI Manager Demo")]
async fn main() {
    let mut panel_mgr = PanelManager::new();

    // 1. Tworzenie przesuwnego okna Ekwipunku
    let inv_window = panel_mgr.create_window(
        vec2(50.0, 50.0),
        vec2(300.0, 400.0),
        "Ekwipunek Bohatera"
    );

    // 2. Dodanie siatki slotów i przycisku użycia
    panel_mgr.add_content(inv_window, column![
        Text::new("Przedmioty w plecaku:", vec2(0.0, 0.0), 14.0, WHITE),
        Gap::new(10.0),
        Grid::new(vec![
            Button::new("Miecz +5", vec2(0.0, 0.0), vec2(120.0, 36.0)),
            Button::new("Tarcza", vec2(0.0, 0.0), vec2(120.0, 36.0)),
            Button::new("Mikstura HP", vec2(0.0, 0.0), vec2(120.0, 36.0)),
            Button::new("Eliksir Many", vec2(0.0, 0.0), vec2(120.0, 36.0)),
        ], 2, vec2(8.0, 8.0)),
        Gap::new(15.0),
        Button::new("Użyj wybranego", vec2(0.0, 0.0), vec2(260.0, 40.0))
            .on_click(|ctx| {
                println!("Użyto przedmiotu!");
                ctx.play_sound("item_use");
            }),
    ]);

    // 3. Rejestracja PanelManager jako bytu w scenie
    let scene = Scene::new("Main", world! {
        ui: [panel_mgr],
    });

    let mut engine = Engine::new(scene);
    engine.run().await;
}`,
          collapsible: false
        }
      ]
    }
  ]
};
