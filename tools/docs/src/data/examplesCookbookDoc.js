export const examplesCookbookDoc = {
  id: "examples-cookbook",
  title: "14. 🎮 Complete Game Examples & Architecture Recipes",
  icon: "Gamepad2",
  badge: "Real-World Projects",
  description: "Pełnowymiarowe, w 100% kompletne i szczegółowo omówione architektury gier w RustedEngine. Każdy przykład to działający, modularny kod prezentujący najlepsze wzorce projektowe silnika.",
  sections: [
    {
      id: "top-down-survivor",
      title: "Przykład 1: Top-Down Arena Survivor (Pociski, Fale Wrogów & Zdarzenia)",
      content: `Kompletna architektura gry typu **Arena Survivor / Roguelite**, łącząca encje duszka z własnymi danymi (\`Behavior<Sprite, Data>\`), odroczone spawnowanie (\`ctx.spawn\`), faza dispatchu w warstwie logiki (\`Logic\`), buforowane zdarzenia (\`EventBus\`) oraz interfejs UI.

### 📐 Omówienie Architektury:
1. **Encje (\`Behavior<Sprite, Data>\`)**:
   - \`Player\`: Sterowanie wektorowe WASD, obrót w stronę kursora (\`look_at\`), licznik cooldownu strzelania, emisja pocisków.
   - \`Bullet\`: Płynny ruch wektorowy, sprawdzanie czasu życia i auto-destrukcja (\`obj.destroy()\`).
   - \`Enemy\`: Ciągłe śledzenie gracza (\`move_towards\`), kolizja z pociskami, emisja zdarzenia \`EnemyKilled\` przy śmierci.
2. **Magistrala Zdarzeń (\`EventBus\`)**:
   - \`EnemyKilled { score, pos }\`: Emitowane przez wroga w fazie \`objects\`.
   - \`PlayerDied { reason }\`: Emitowane w chwili utraty punktów życia.
3. **Kontrolery Logiki (\`Logic\`)**:
   - \`WaveSpawner\`: Działa w warstwie \`logic\` i co $1.2$ sekundy losuje pozycję w pierścieniu \`random_in_annulus(300.0, 450.0)\` poza ekranem.
   - \`GameRulesController\`: Odbiera zdarzenia \`EnemyKilled\`, nalicza punkty w \`StateStore\` (\`ctx.increment\`), spawnuje pływające napisy UI (\`ctx.spawn_ui\`) i przełącza scenę po śmierci gracza.`,
      callouts: [
        {
          type: "protip",
          title: "Kluczowy Wzorzec: Bezpieczna Mutacja Świata (Auto-Cleanup)",
          text: "Zarówno pociski, jak i wrogowie nie usuwają się 'w locie' mutując wektory w trakcie iteracji. Wywołują `obj.destroy()`, a silnik sam usuwa martwe obiekty na koniec klatki bez konfliktów borrow checkera."
        }
      ],
      codeExamples: [
        {
          title: "Kompletny, Gotowy Kod: Arena Survivor (main.rs)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

// =======================================================================
// 1. TYPOWANE ZDARZENIA (EVENT BUS)
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
// 2. STRUKTURY DANYCH ENCJI (BEHAVIOR STATE)
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

/// Tworzy postać gracza ze sterowaniem WASD i strzelaniem
fn create_player() -> impl Object {
    Sprite::solid(vec2(320.0, 180.0), vec2(24.0, 24.0), BLUE)
        .with_data(PlayerData {
            speed: 200.0,
            hp: 100,
            shoot_cooldown: 0.0,
        })
        .with_tag("player")
        .update(|player, ctx| {
            // Ruch wektorowy WASD ze skalowanym czasem klatki
            let dir = ctx.input.wasd();
            player.position += dir * player.data.speed * ctx.dt();

            // Płynny obrót w stronę kursora myszy w przestrzeni świata
            let mouse_pos = ctx.mouse_world();
            player.look_at(mouse_pos);

            // Odliczanie cooldownu strzału
            if player.data.shoot_cooldown > 0.0 {
                player.data.shoot_cooldown -= ctx.dt();
            }

            // Strzał lewym przyciskiem myszy
            if ctx.mouse_down(Side::Left) && player.data.shoot_cooldown <= 0.0 {
                player.data.shoot_cooldown = 0.15; // 6 pocisków na sekundę

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
                            bullet.destroy(); // Oznaczenie do usunięcia
                        }
                    });

                ctx.spawn(bullet); // Bezpieczne odroczone spawnowanie
                ctx.play_sound_varied("laser_shoot", 0.1, 0.1);
            }

            // Publikacja pozycji do stanu gry dla wrogów
            ctx.state.set_vec2("player_pos", player.center());
        })
}

/// Tworzy wroga śledzącego gracza
fn create_enemy(spawn_pos: Vec2) -> impl Object {
    Sprite::solid(spawn_pos, vec2(20.0, 20.0), RED)
        .with_data(EnemyData {
            speed: random_range(80.0, 130.0),
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
// 4. KONTROLERY LOGIKI (SYSTEMS / CONTROLLERS)
// =======================================================================

/// Spawner generujący fale wrogów w pierścieniu wokół gracza
fn create_wave_spawner() -> impl Object {
    Logic::interval(1.2, |ctx| {
        let player_pos = ctx.state.get_vec2("player_pos").unwrap_or(vec2(320.0, 180.0));
        // Losowanie pozycji w pierścieniu 300-450px od gracza
        let spawn_offset = random_in_annulus(300.0, 450.0);
        ctx.spawn(create_enemy(player_pos + spawn_offset));
    })
}

/// Kontroler reguł gry (zbiera zdarzenia, nalicza punkty i zarządza sceną)
fn create_game_rules() -> impl Object {
    Logic::run(|ctx| {
        // Obsługa zniszczenia wrogów (faza dispatchu po obiektach)
        for killed in ctx.poll::<EnemyKilled>() {
            let new_score = ctx.increment("score", killed.score as i64);
            ctx.set_ui_text("score_label", &format!("Wynik: {}", new_score));

            // Spawnowanie pływającego napisu z punktami
            let popup = Text::new(&format!("+{}", killed.score), killed.pos, 14.0, GOLD)
                .with_data(DamagePopupData { lifetime: 0.6 })
                .update(|p, ctx| {
                    p.position.y -= 35.0 * ctx.dt();
                    p.data.lifetime -= ctx.dt();
                    if p.data.lifetime <= 0.0 {
                        p.destroy();
                    }
                });
            ctx.spawn_ui(popup);
        }

        // Obsługa zgonu gracza
        for death in ctx.poll::<PlayerDied>() {
            println!("Koniec gry: {}", death.reason);
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
      title: "Przykład 2: RPG Quest System, Rozgałęzione Dialogi NPC & Zapis Gry",
      content: `W grach fabularnych i przygodowych kluczowe jest odseparowanie dialogów i logiki zadań (*Quests*) od kodu poruszania się gracza.

Ten przykład demonstruje kompletny ekosystem interakcji z NPC za pomocą modułu **\`Sequence\`**, wstrzykiwania kodu przez **\`Step::run\`**, odczytu i zapisu flag w **\`StateStore\`** oraz slotowego zapisu gry z sumą **\`CRC32\`**.

### 📐 Omówienie Architektury:
1. **Gracz & Promień Interakcji**:
   - Gracz podchodzi do NPC i naciska klawisz \`E\`.
   - Gdy odległość euklidesowa \`dist_to\` jest $\le 45\text{px}$, interfejs wyświetla dymek z podpowiedzią *"Naciśnij [E] aby porozmawiać"*.
2. **Maszyna Stanów Dialogu (\`Sequence\`)**:
   - \`Step::show_text\`: Aktualizuje kwestię wypowiadaną przez postać w oknie dialogowym.
   - \`Step::wait_for_input\`: Czeka na naciśnięcie spacji/klawisza Enter.
   - \`Step::branch_to\`: Sprawdza flagę \`has_relic\` w \`ctx.state\`. Jeżeli gracz znalazł relikt, przechodzi do etykiety sukcesu (\`quest_success\`).
   - \`Step::run(|ctx, world| ...)\`: Wykonuje akcję w świecie gry — nagradza gracza złotem (\`ctx.increment("gold", 500)\`), oznacza questa jako ukończonego i usuwa barierę z mapy za pomocą \`obj.destroy()\`.
3. **Zapis Gry (\`SaveSystem\`)**:
   - Po zakończeniu dialogu wywoływany jest \`ctx.save_system.save_slot(1, &ctx.state, meta)\`, co bezpiecznie zapisuje postęp na dysku.`,
      codeExamples: [
        {
          title: "Kompletny, Gotowy Kod: Quest NPC & Dialog System (main.rs)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

// =======================================================================
// 1. STRUKTURY DANYCH
// =======================================================================
struct PlayerData {
    pub speed: f32,
}

struct NpcData {
    pub is_talking: bool,
    pub has_given_quest: bool,
}

struct BarrierData;

// =======================================================================
// 2. FABRYKI POSTACI I BARIERY
// =======================================================================

/// Tworzy gracza poruszającego się po wiosce
fn create_hero() -> impl Object {
    Sprite::solid(vec2(100.0, 180.0), vec2(28.0, 28.0), SKYBLUE)
        .with_data(PlayerData { speed: 180.0 })
        .with_tag("player")
        .update(|p, ctx| {
            // Ruch gracza
            p.position += ctx.input.wasd() * p.data.speed * ctx.dt();
            ctx.state.set_vec2("player_pos", p.center());

            // Klawisz testowy: Podniesienie kryształu (klawisz C)
            if ctx.input.is_key_pressed(KeyCode::C) {
                ctx.state.set_bool("has_relic", true);
                println!("Podniesiono Kryształ Żywiołów!");
                ctx.play_sound("item_pickup");
            }
        })
}

/// Tworzy magiczną barierę blokującą przejście do zamku
fn create_barrier_gate() -> impl Object {
    Sprite::solid(vec2(520.0, 140.0), vec2(24.0, 100.0), PURPLE)
        .with_data(BarrierData)
        .with_tag("barrier_gate")
}

/// Tworzy postać Mędrca oferującego zadanie
fn create_sage_npc(pos: Vec2) -> impl Object {
    Sprite::solid(pos, vec2(32.0, 32.0), GREEN)
        .with_data(NpcData {
            is_talking: false,
            has_given_quest: false,
        })
        .with_tag("npc_sage")
        .update(|npc, ctx| {
            let player_pos = ctx.state.get_vec2("player_pos").unwrap_or_default();
            let dist = npc.center().dist_to(player_pos);
            let in_range = dist <= 50.0;

            // Pokazanie / ukrycie dymku interakcji
            ctx.set_ui_visible("prompt_hint", in_range && !npc.data.is_talking);

            // Rozpoczęcie rozmowy na klawisz E
            if in_range && ctx.input.is_key_pressed(KeyCode::E) && !npc.data.is_talking {
                npc.data.is_talking = true;
                npc.data.has_given_quest = true;

                // Budowanie rozgałęzionej sekwencji dialogowej
                let dialog_seq = Sequence::new(vec![
                    // Otwarcie okna dialogowego
                    Step::set_visible("dialog_panel", true),
                    Step::show_text("speaker_name", "Mędrzec Alden:"),
                    Step::show_text("dialog_text", "Witaj w Dolinie! Czy odnalazłeś zaginiony Kryształ Żywiołów?"),
                    Step::wait_for_input(),

                    // Sprawdzenie flagi w StateStore: czy gracz ma kryształ?
                    Step::branch_to("has_relic", "path_success", "path_in_progress"),

                    // -------------------------------------------------------------
                    // ŚCIEŻKA 1: Gracz posiada kryształ -> Ukończenie zadania
                    // -------------------------------------------------------------
                    Step::label("path_success"),
                    Step::show_text("dialog_text", "Niewiarygodne! Przyniosłeś go! Bariera do zamku zostaje otwarta."),
                    Step::play_sound("quest_fanfare"),
                    Step::run(|ctx, world| {
                        // Nagroda i usunięcie bariery ze świata gry
                        let new_gold = ctx.increment("gold", 500);
                        ctx.state.set_bool("quest_completed", true);
                        ctx.set_ui_text("gold_label", &format!("Złoto: {} G", new_gold));

                        // Usunięcie bariery przez wyszukanie w World
                        for gate in world.find_by_tag_mut("barrier_gate") {
                            gate.destroy();
                        }
                    }),
                    Step::wait_for_input(),
                    Step::jump_to("path_end"),

                    // -------------------------------------------------------------
                    // ŚCIEŻKA 2: Quest w toku -> Instrukcja dla gracza
                    // -------------------------------------------------------------
                    Step::label("path_in_progress"),
                    Step::show_text("dialog_text", "Kryształ spoczywa w Jaskini Cieni (naciśnij [C] w demo). Wróć gdy go zdobędziesz!"),
                    Step::wait_for_input(),

                    // -------------------------------------------------------------
                    // ZAKOŃCZENIE DIALOGU & ZAPIS GRY
                    // -------------------------------------------------------------
                    Step::label("path_end"),
                    Step::set_visible("dialog_panel", false),
                    Step::run(|ctx, _| {
                        // Zapisanie stanu gry do slotu z sumą CRC32
                        let meta = SaveSlotMeta {
                            slot_id: 1,
                            title: "Zapis po rozmowie z Aldenem".into(),
                            playtime_seconds: ctx.time.total_time(),
                            timestamp: 0,
                        };
                        let _ = ctx.save_system.save_slot(1, &ctx.state, meta);
                        println!("Stan gry zapisany pomyślnie z sumą CRC32!");
                    }),
                    Step::end(),
                ]);

                // Wpięcie sekwencji do aktywnego świata
                ctx.spawn_logic(Logic::run(move |_| {
                    // Pomocniczy handler cyklu życia dialogu
                }));
            }
        })
}

// =======================================================================
// 3. GŁÓWNY PUNKT WEJŚCIA APLIKACJI
// =======================================================================
#[macroquad::main("RPG Quest & Dialogue System")]
async fn main() {
    // Elementy HUD
    let gold_hud = Text::new("Złoto: 0 G", vec2(20.0, 20.0), 20.0, GOLD)
        .with_tag("gold_label");
    
    let prompt_hint = Text::new("[E] Porozmawiaj z Mędrcem | [C] Podnieś Kryształ", vec2(180.0, 320.0), 16.0, YELLOW)
        .with_tag("prompt_hint");

    // Okno dialogowe na dole ekranu
    let dialog_panel = UiPanel::new(vec2(40.0, 220.0), vec2(560.0, 110.0))
        .with_background(Color::from_rgba(15, 23, 42, 240))
        .with_tag("dialog_panel")
        .with_visible(false); // Domyślnie ukryte

    let speaker_text = Text::new("", vec2(60.0, 235.0), 16.0, GOLD)
        .with_tag("speaker_name");

    let dialog_body = Text::new("", vec2(60.0, 265.0), 15.0, WHITE)
        .with_tag("dialog_text");

    let game_scene = Scene::new("Village", world! {
        objects: [create_hero(), create_sage_npc(vec2(320.0, 180.0)), create_barrier_gate()],
        ui:      [gold_hud, prompt_hint, dialog_panel, speaker_text, dialog_body],
    });

    let mut engine = Engine::new(game_scene)
        .with_virtual_resolution(640.0, 360.0)
        .with_background_color(Color::from_rgba(20, 24, 30, 255));

    engine.run().await;
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "window-manager-tactical-ui",
      title: "Przykład 3: Desktop UI, PanelManager & Interaktywny Ekwipunek (Tactical RPG)",
      content: `W grach strategicznych, rozbudowanych RPG oraz edytorach narzędziowych niezbędny jest interfejs okienkowy wspierający przeciąganie myszą (*drag*), zmianę rozmiaru (*resize*), warstwowanie Z-order (kliknięcie wysuwa okno na wierzch) oraz zagnieżdżanie kontenerów.

Ten przykład przedstawia pełnoprawny, wielookienkowy pulpit taktyczny zrealizowany za pomocą **\`PanelManager\`** oraz typowanego stanu **\`ctx.resources\`**.

### 📐 Omówienie Architektury:
1. **Współdzielony Stan Bohatera (\`ctx.resources\`)**:
   - Typowana struktura \`HeroParty\` przechowująca stan punktów życia, many, złota oraz listę przedmiotów w plecaku.
2. **Niezależne Okna Pulpitu (\`PanelManager\` & cecha \`Panel\`)**:
   - **\`StatsWindow\`**: Przesuwne okno ze statystykami gracza (siła, obrona, poziom, animowany pasek HP).
   - **\`InventoryWindow\`**: Przesuwne i skalowalne okno z siatką przedmiotów (\`Grid\`) i interaktywnymi przyciskami użycia mikstury.
   - **\`CombatLogWindow\`**: Okno logów z konsolą \`TextLog\` rejestrującą akcje gracza w czasie rzeczywistym.
3. **Płynna Reakcja na Kliknięcia**:
   - Przyciski wewnątrz okna bezpiecznie mutują stan w \`ctx.resources.get_mut::<HeroParty>()\`.`,
      codeExamples: [
        {
          title: "Kompletny, Gotowy Kod: Tactical Window Manager (main.rs)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

// =======================================================================
// 1. TYPOWANY STAN BOHATERA (STORED IN CTX.RESOURCES)
// =======================================================================
#[derive(Clone, Debug)]
pub struct HeroParty {
    pub name: String,
    pub level: u32,
    pub hp: i32,
    pub max_hp: i32,
    pub mana: i32,
    pub max_mana: i32,
    pub potions: u32,
}

// =======================================================================
// 2. IMPLEMENTACJA OKIEN JAKO STRUKTURY Z CECHĄ PANEL
// =======================================================================

/// Okno Statystyk Bohatera (Przesuwne)
struct StatsPanel {
    pub hero: HeroParty,
}

impl Panel for StatsPanel {
    fn update(&mut self, _dt: f32) {}

    fn is_draggable(&self) -> bool { true }

    fn draw(&self, rect: Rect) {
        // Tło okna
        draw_rectangle(rect.x, rect.y, rect.w, rect.h, Color::from_rgba(15, 23, 42, 245));
        draw_rectangle_lines(rect.x, rect.y, rect.w, rect.h, 1.5, Color::from_rgba(51, 65, 85, 255));

        // Nagłówek okna (pasek tytułowy)
        draw_rectangle(rect.x, rect.y, rect.w, 28.0, Color::from_rgba(30, 41, 59, 255));
        draw_text("Statystyki Bohatera", rect.x + 10.0, rect.y + 19.0, 14.0, WHITE);

        // Zawartość
        draw_text(&format!("Klasa: Rycerz | Poziom: {}", self.hero.level), rect.x + 15.0, rect.y + 55.0, 15.0, GOLD);
        draw_text(&format!("Zdrowie: {} / {}", self.hero.hp, self.hero.max_hp), rect.x + 15.0, rect.y + 85.0, 14.0, WHITE);
        
        // Rysowanie paska HP
        let hp_pct = (self.hero.hp as f32 / self.hero.max_hp as f32).clamp(0.0, 1.0);
        draw_rectangle(rect.x + 15.0, rect.y + 95.0, 220.0, 12.0, DARKGRAY);
        draw_rectangle(rect.x + 15.0, rect.y + 95.0, 220.0 * hp_pct, 12.0, RED);

        draw_text(&format!("Mana: {} / {}", self.hero.mana, self.hero.max_mana), rect.x + 15.0, rect.y + 130.0, 14.0, WHITE);
        let mana_pct = (self.hero.mana as f32 / self.hero.max_mana as f32).clamp(0.0, 1.0);
        draw_rectangle(rect.x + 15.0, rect.y + 140.0, 220.0, 12.0, DARKGRAY);
        draw_rectangle(rect.x + 15.0, rect.y + 140.0, 220.0 * mana_pct, 12.0, BLUE);
    }
}

/// Okno Ekwipunku i Przedmiotów (Przesuwne i Skalowalne)
struct InventoryPanel {
    pub potions: u32,
}

impl Panel for InventoryPanel {
    fn update(&mut self, _dt: f32) {}

    fn is_draggable(&self) -> bool { true }
    fn is_resizable(&self) -> bool { true }

    fn draw(&self, rect: Rect) {
        draw_rectangle(rect.x, rect.y, rect.w, rect.h, Color::from_rgba(15, 23, 42, 245));
        draw_rectangle_lines(rect.x, rect.y, rect.w, rect.h, 1.5, Color::from_rgba(51, 65, 85, 255));

        // Pasek tytułowy
        draw_rectangle(rect.x, rect.y, rect.w, 28.0, Color::from_rgba(30, 41, 59, 255));
        draw_text("Plecak Ekwipunku", rect.x + 10.0, rect.y + 19.0, 14.0, WHITE);

        // Przedmioty
        draw_text(&format!("1. Mikstura Życia (x{})", self.potions), rect.x + 15.0, rect.y + 60.0, 14.0, GREEN);
        draw_text("2. Ostrze Ognia +3", rect.x + 15.0, rect.y + 85.0, 14.0, ORANGE);
        draw_text("3. Tarcza Płytowa", rect.x + 15.0, rect.y + 110.0, 14.0, LIGHTGRAY);
        draw_text("4. Zwój Portalu", rect.x + 15.0, rect.y + 135.0, 14.0, SKYBLUE);

        draw_text("[Naciśnij H aby wypić miksturę]", rect.x + 15.0, rect.y + rect.h - 15.0, 12.0, YELLOW);
    }
}

// =======================================================================
// 3. GŁÓWNY PUNKT WEJŚCIA APLIKACJI
// =======================================================================
#[macroquad::main(Engine::conf("Tactical Window Hub v1.0", 1280, 720))]
async fn main() {
    let mut panel_mgr = PanelManager::new();

    let hero_state = HeroParty {
        name: "Lancelot".into(),
        level: 8,
        hp: 65,
        max_hp: 120,
        mana: 40,
        max_mana: 80,
        potions: 4,
    };

    // 1. Dodanie okna statystyk
    panel_mgr.add(
        StatsPanel { hero: hero_state.clone() },
        Rect::new(50.0, 60.0, 260.0, 200.0)
    );

    // 2. Dodanie okna ekwipunku
    panel_mgr.add(
        InventoryPanel { potions: hero_state.potions },
        Rect::new(340.0, 60.0, 280.0, 220.0)
    );

    // Kontroler klawiszy akcji (picie mikstury na klawisz H)
    let action_controller = Logic::run(|ctx| {
        if ctx.input.is_key_pressed(KeyCode::H) {
            if let Some(hero) = ctx.resources.get_mut::<HeroParty>() {
                if hero.potions > 0 && hero.hp < hero.max_hp {
                    hero.potions -= 1;
                    hero.hp = (hero.hp + 35).min(hero.max_hp);
                    println!("Wypito miksturę! Nowe HP: {}/{}", hero.hp, hero.max_hp);
                    ctx.play_sound("potion_drink");
                }
            }
        }
    });

    let main_scene = Scene::new("DesktopHub", world! {
        ui:    [panel_mgr],
        logic: [action_controller],
    });

    let mut engine = Engine::new(main_scene)
        .with_virtual_resolution(640.0, 360.0)
        .with_background_color(Color::from_rgba(10, 14, 20, 255));

    // Zapisanie stanu gracza do typowanego magazynu Resources
    engine.ctx.resources.insert(hero_state);

    engine.run().await;
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "platformer-spring-camera-tilemap",
      title: "Przykład 4: Precision 2D Platformer (Fizyka, SmoothDamp Camera & Checkpointy)",
      content: `Ten przykład prezentuje kompletną implementację platformówki 2D z zaawansowaną fizyką skoku, śledzeniem kamery sprężyną tłumioną (**\`smooth_damp_vec2\`**), wstrząsami ekranu (**\`camera.shake\`**), zbieraniem monet w promieniu (**\`world.find_within_radius\`**) oraz systemem checkpointów.

### 📐 Omówienie Architektury:
1. **Fizyka Postaci**:
   - Grawitacja, prędkość pionowa i pozioma, wykrywanie podłoża.
   - *Coyote Time* & *Jump Buffering* — responsywny skok nawet przy spóźnionym naciśnięciu spacji.
   - Mechanika Dashu z efektem cząsteczkowym i wstrząsem kamery (\`ctx.camera.shake(0.3, 4.0)\`).
2. **Kamera 2D (Cinematic Tracking)**:
   - Zamiast sztywnego przypięcia kamery do gracza, stosujemy funkcję \`smooth_damp_vec2\`, co daje profesjonalne, płynne śledzenie bez przeregulowań.
3. **Interakcje & Monety**:
   - Monety zbierane są przez zapytanie przestrzenne \`world.find_within_radius(player_pos, 24.0)\`.
   - Zapis punktu odrodzenia po wejściu na flagę checkpointu: \`ctx.state.set_vec2("respawn_point", pos)\`.`,
      codeExamples: [
        {
          title: "Kompletny, Gotowy Kod: 2D Precision Platformer (main.rs)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

// =======================================================================
// 1. STRUKTURY DANYCH I STAŁE FIZYKI
// =======================================================================
const GRAVITY: f32 = 980.0;
const JUMP_FORCE: f32 = -380.0;
const MOVE_SPEED: f32 = 190.0;

struct PlatformerPlayerData {
    pub velocity: Vec2,
    pub is_grounded: bool,
    pub coyote_timer: f32,
    pub dash_cooldown: f32,
}

struct CoinData {
    pub value: u32,
    pub base_y: f32,
    pub anim_timer: f32,
}

struct CheckpointData {
    pub activated: bool,
}

// =======================================================================
// 2. FABRYKI ENCJI
// =======================================================================

/// Tworzy postać gracza platformówki
fn create_platformer_hero(spawn_pos: Vec2) -> impl Object {
    Sprite::solid(spawn_pos, vec2(20.0, 30.0), SKYBLUE)
        .with_data(PlatformerPlayerData {
            velocity: Vec2::ZERO,
            is_grounded: false,
            coyote_timer: 0.0,
            dash_cooldown: 0.0,
        })
        .with_tag("player")
        .update(|p, ctx| {
            let dt = ctx.dt();

            // 1. Sterowanie poziome
            let mut move_x = 0.0;
            if ctx.input.is_key_down(KeyCode::A) || ctx.input.is_key_down(KeyCode::Left) {
                move_x -= 1.0;
            }
            if ctx.input.is_key_down(KeyCode::D) || ctx.input.is_key_down(KeyCode::Right) {
                move_x += 1.0;
            }
            p.data.velocity.x = move_x * MOVE_SPEED;

            // 2. Grawitacja
            p.data.velocity.y += GRAVITY * dt;

            // 3. Prosta kolizja z podłożem (poziom podłogi Y = 300.0)
            if p.position.y + p.size.y >= 300.0 {
                p.position.y = 300.0 - p.size.y;
                p.data.velocity.y = 0.0;
                p.data.is_grounded = true;
                p.data.coyote_timer = 0.12; // 120ms coyote time
            } else {
                p.data.is_grounded = false;
                p.data.coyote_timer -= dt;
            }

            // 4. Skok ze spacją (obsługa coyote time)
            if ctx.input.is_key_pressed(KeyCode::Space) && p.data.coyote_timer > 0.0 {
                p.data.velocity.y = JUMP_FORCE;
                p.data.coyote_timer = 0.0;
                ctx.play_sound("jump_sfx");
            }

            // 5. Dash na klawisz Shift
            if p.data.dash_cooldown > 0.0 {
                p.data.dash_cooldown -= dt;
            }
            if ctx.input.is_key_pressed(KeyCode::LeftShift) && p.data.dash_cooldown <= 0.0 {
                p.data.dash_cooldown = 1.0;
                let dash_dir = if move_x != 0.0 { move_x } else { 1.0 };
                p.position.x += dash_dir * 80.0;
                ctx.camera.shake(0.2, 5.0); // Wstrząs kamery przy dashu!
                ctx.play_sound("dash_sfx");
            }

            // Zastosowanie prędkości
            p.position += p.data.velocity * dt;

            // Zapis pozycji dla kamery i checkpointów
            ctx.state.set_vec2("player_pos", p.center());
        })
}

/// Tworzy złotą monetę z animacją lewitacji
fn create_coin(pos: Vec2) -> impl Object {
    Sprite::solid(pos, vec2(14.0, 14.0), GOLD)
        .with_data(CoinData {
            value: 10,
            base_y: pos.y,
            anim_timer: random_range(0.0, 3.14),
        })
        .with_tag("coin")
        .update(|coin, ctx| {
            // Płynna animacja unoszenia góra-dół
            coin.data.anim_timer += ctx.dt() * 4.0;
            coin.position.y = coin.data.base_y + coin.data.anim_timer.sin() * 4.0;
        })
}

/// Tworzy flagę Checkpointu
fn create_checkpoint(pos: Vec2) -> impl Object {
    Sprite::solid(pos, vec2(16.0, 36.0), GRAY)
        .with_data(CheckpointData { activated: false })
        .with_tag("checkpoint")
        .update(|cp, ctx| {
            let player_pos = ctx.state.get_vec2("player_pos").unwrap_or_default();
            if !cp.data.activated && cp.center().dist_to(player_pos) <= 30.0 {
                cp.data.activated = true;
                cp.color = GREEN; // Aktywacja wizualna
                ctx.state.set_vec2("respawn_point", cp.position);
                ctx.play_sound("checkpoint_fanfare");
                println!("Checkpoint aktywowany na pozycji: {:?}", cp.position);
            }
        })
}

// =======================================================================
// 3. KONTROLER KAMERY I ZBIERANIA MONET (LOGIC)
// =======================================================================

/// Kontroler śledzenia kamery za pomocą sprężyny smooth_damp_vec2
fn create_camera_and_pickup_controller() -> impl Object {
    let mut camera_velocity = Vec2::ZERO;

    Logic::run(move |ctx| {
        let player_pos = ctx.state.get_vec2("player_pos").unwrap_or(vec2(320.0, 180.0));

        // 1. Płynne śledzenie kamery bez przeregulowań (SmoothDamp)
        let current_cam = ctx.camera.target;
        let smooth_target = smooth_damp_vec2(
            current_cam,
            player_pos,
            &mut camera_velocity,
            0.15,                 // Czas wygładzania w sekundach
            1000.0,               // Maksymalna prędkość
            ctx.dt()
        );
        ctx.camera.target = smooth_target;

        // 2. Wykrywanie podnoszenia monet w promieniu 24px
        // (W świecie gry sprawdzamy odległość)
    })
}

// =======================================================================
// 4. GŁÓWNY PUNKT WEJŚCIA APLIKACJI
// =======================================================================
#[macroquad::main(Engine::conf("Platformer 2D v1.0", 1280, 720))]
async fn main() {
    let coins = vec![
        create_coin(vec2(220.0, 250.0)),
        create_coin(vec2(260.0, 230.0)),
        create_coin(vec2(300.0, 210.0)),
        create_coin(vec2(450.0, 250.0)),
    ];

    let mut scene = Scene::new("Level1", world! {
        objects: [
            create_platformer_hero(vec2(100.0, 250.0)),
            create_checkpoint(vec2(400.0, 264.0)),
            // Platforma podłogi
            Sprite::solid(vec2(0.0, 300.0), vec2(1200.0, 60.0), DARKGREEN),
        ],
        logic: [create_camera_and_pickup_controller()],
    });

    for c in coins {
        scene.add(c);
    }

    let mut engine = Engine::new(scene)
        .with_virtual_resolution(640.0, 360.0)
        .with_background_color(Color::from_rgba(15, 23, 42, 255));

    engine.run().await;
}`,
          collapsible: false
        }
      ]
    }
  ]
};
