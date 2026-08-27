// ============================================================================
// 1. RDZEŃ SILNIKA & ARCHITEKTURA
// ============================================================================

export const quickstartDoc = {
  id: "quickstart",
  title: "1. 🚀 Szybki Start & Szablon Gry",
  description: "RustedEngine (rusted_engine v1.0) to lekki, nowoczesny i wysoce ergonomiczny 2D silnik gry w języku Rust oparty o framework Macroquad. Silnik powstał w celu wyeliminowania żmudnego boilerplate'u w Rust i dostarczenia czystego, modularnego modelu mentalnego dla gier 2D.",
  sections: [
    {
      id: "quickstart-philosophy",
      title: "Filary Projektowe & Filozofia",
      content: `### 4 Główne Zasady Architektoniczne:

1. **Zero niepotrzebnego boilerplate'u**: Gotowe makra deklaratywne (\`world!\`, \`world_objects!\`, \`column!\`, \`row!\`), zintegrowane menedżery stanu, zapisu, zdarzeń i zasobów.
2. **Dualny Pipeline Renderowania (Pixel-Perfect + Crisp Fonts)**:
   - Świat i elementy graficzne są renderowane do bufora wirtualnego (\`vw × vh\`) z filtrowaniem \`Nearest\` i automatycznym letterboxingiem.
   - Warstwa tekstowa z flagą \`is_text_layer() == true\` jest renderowana bezpośrednio na fizycznym buforze ekranu, gwarantując idealną ostrość czcionek bez rozmycia.
3. **Izolacja Warstw Wykonawczych (World vs UI vs Logic)**:
   - \`objects\`: Byty w przestrzeni świata 2D podlegające transformacji kamery (pozycja, zoom, obrót, shake).
   - \`ui_objects\`: Elementy interfejsu w przestrzeni ekranu (*Screen Space*).
   - \`logic\`: Niewidzialne kontrolery logiki aktualizowane co klatkę bez narzutu na GPU (działają jako faza dispatchu po obiektach).
4. **Uniwersalny System Zachowań (\`Behavior<Inner, Data>\`)**:
   - Brak sztywnych hierarchii klas. Dowolny obiekt rysowalny można owinąć w \`Behavior\`, uzyskując własny stan \`Data\` oraz domknięcie \`update\` z pełnym dostępem przez blanket cechę \`Deref\` i \`DerefMut\`.`,
    },
    {
      id: "quickstart-builder",
      title: "Konfiguracja Silnika & Fluent Builders",
      content: `Instancję silnika konfiguruje się za pomocą czytelnego wzorca budowniczego (*Builder Pattern*):`,
      codeExamples: [
        {
          title: "src/main.rs (Konfiguracja Budowniczego)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

#[macroquad::main(Engine::conf("Arena Survivor", 1280, 720))]
async fn main() {
    let mut scene = Scene::new_empty("Arena");
    scene.add(Sprite::solid(vec2(0.0, 0.0), vec2(32.0, 32.0), BLUE).with_tag("player"));

    let mut engine = Engine::new(scene)
        .with_background_color(Color::from_rgba(15, 23, 42, 255))
        .with_virtual_resolution(640.0, 360.0) // Stała rozdzielczość wirtualna 16:9
        .with_integer_scaling(true)           // Idealnie ostre piksele (integer scaling)
        .with_letterbox_color(BLACK);

    engine.run().await;
}`,
          language: "rust",
          collapsible: false
        }
      ]
    }
  ]
};

export const lifecycleDoc = {
  id: "lifecycle",
  title: "2. ⏱️ Cykl Życia Klatki (Lifecycle)",
  description: "Pętla silnika uruchamiana przez Engine::run().await wykonuje bezwzględnie uporządkowaną, deterministyczną sekwencję kroków w każdej klatce.",
  sections: [
    {
      id: "lifecycle-order",
      title: "Cykl Życia Klatki (Frame Execution Order)",
      content: `Silnik realizuje deterministyczną pętlę zdarzeń podzieloną na 8 kluczowych etapów:`,
    },
    {
      id: "lifecycle-steps",
      title: "Krok po Kroku w Pętli Klatki",
      content: `1. **Przejścia Scen & on_enter**: Realizacja żądań \`switch_scene\`, wywołanie \`on_exit\` starej sceny i \`on_enter\` nowej sceny, emisja \`SceneChanged\`.
2. **Kamera 2D & Tłumienie Shake**: Przeliczenie macierzy widoku, tłumienie wstrząsów i uaktualnienie \`Camera2D\`.
3. **Silnik Reguł TriggerSystem**: Ewaluacja reguł warunkowych \`Trigger\` co klatkę z dostępem do \`Context\`.
4. **Aktualizacja Bytów Świata (World Objects)**: Iteracja po \`objects\` — poruszanie się, kolizje, emisja zdarzeń przez \`ctx.emit()\`.
5. **Aktualizacja Warstwy UI (UI Objects)**: Iteracja po \`ui_objects\` — interakcje z przyciskami, suwakami, polami tekstowymi.
6. **Aktualizacja Warstwy Logiki (Logic Objects)**: Iteracja po \`logic\` — kontrolery odbierają zdarzenia wyemitowane w krokach 4 i 5.
7. **Aktualizacja Sekwencji (Sequences)**: Przebieg kroków skryptowych cutscenek i dialogów.
8. **Opróżnienie Kolejek Spawnowania & Cleanup**:
   - Przeniesienie bytów z \`ctx.pending_spawn\`, \`pending_spawn_ui\` i \`pending_spawn_logic\` do właściwych warstw.
   - Usunięcie wszystkich bytów zwracających \`is_destroyed() == true\`.
9. **Czyszczenie Ekranu & Render Pass**:
   - Czyszczenie bufora GPU: \`clear_background(color)\`.
   - Rysowanie obiektów świata w przestrzeni kamery (z opcjonalnym shaderem PostProcess).
   - Rysowanie warstwy UI i nakładki tekstowej w rozdzielczości natywnej.
10. **Rysowanie Kursora & Synchronizacja**: Narysowanie \`CustomCursor\` i wywołanie \`next_frame().await\`.`,
      codeExamples: [
        {
          title: "Logic jako Faza Dispatchu Zdarzeń",
          code: `use rusted_engine::prelude::*;

#[derive(Clone, Debug)]
pub struct PlayerDied { pub reason: &'static str }

let game_controller = Logic::run(|ctx| {
    // Logic odpala się po obiektach świata — gwarantowany odbiór zdarzeń wyemitowanych w tej samej klatce!
    for death in ctx.poll::<PlayerDied>() {
        println!("Game Over: {}", death.reason);
        ctx.switch_scene("GameOver");
    }
});

world.add_logic(game_controller);`,
          collapsible: false
        }
      ]
    }
  ]
};

export const contextDoc = {
  id: "context",
  title: "3. 📦 Obiekt Context & Skróty (ctx)",
  description: "Struktura Context (ctx) to pojedynczy punkt dostępu do wszystkich podsystemów silnika, przekazywany mutowalnie (&mut Context) do zamknięć aktualizacji.",
  sections: [
    {
      id: "context-main",
      title: "Kontekst Silnika Context - Centralna Magistrala",
      content: `Wszystkie podsystemy silnika są zintegrowane w jednej instancji \`Context\`, przekazywanej do każdego domknięcia \`.update(|obj, ctx| ...)\`:`,
    },
    {
      id: "context-fields-table",
      title: "Struktura Pól w Context",
      content: `| Pole | Typ | Rola w Silniku |
| :--- | :--- | :--- |
| \`ctx.time\` | \`Time\` | Skalowany czas klatki (\`deltatime()\`), zegar fizyczny (\`raw_deltatime()\`), pauza, skala czasu. |
| \`ctx.input\` | \`Input\` | Stan klawiszy (WASD, strzałki, osie \`axis_2d\`), mysz i remapowany kursor. |
| \`ctx.assets\` | \`Assets\` | Centralny magazyn tekstur, dźwięków, czcionek TTF i atlasów BitmapFont. |
| \`ctx.audio\` | \`Audio\` | Efekty SFX, throttling, losowa wariacja głośności i tonu oraz muzyka w tle. |
| \`ctx.camera\` | \`Camera\` | Kontroler kamery 2D, śledzenie z wyprzedzeniem (\`look_ahead\`), shake i culling. |
| \`ctx.state\` | \`StateStore\` | Przechowalnia flag i zmiennych liczbowych z serializacją JSON (do zapisów gry). |
| \`ctx.resources\` | \`Resources\` | Typowany kontener zasobów uniwersalnych na żywy stan rozgrywki (\`GameState\`). |
| \`ctx.triggers\` | \`TriggerSystem\` | Silnik reguł Warunek → Akcja operujący bezpośrednio na Context. |
| \`ctx.events\` | \`EventBus\` | Typowana magistrala zdarzeń pub/sub oraz sygnałów tekstowych. |
| \`ctx.actions\` | \`ActionMap\` | Mapowanie nazwanych akcji wejścia z łańcuchowym konstruktorem (\`with_key\`, \`with_mouse\`). |
| \`ctx.save_system\` | \`SaveSystem\` | Sloty zapisu gry z weryfikacją sumy kontrolnej CRC32. |`,
    },
    {
      id: "context-shortcuts",
      title: "Ergonomiczne Metody Skrótowe w Context",
      content: `- **Spawnowanie Bytów**: \`ctx.spawn(obj)\`, \`ctx.spawn_ui(obj)\`, \`ctx.spawn_logic(obj)\`, \`ctx.spawn_logic_fn(|ctx| ...)\`.
- **Mysz w Świecie**: \`ctx.mouse_world() -> Vec2\` (pozycja kursora przeliczona do przestrzeni świata 2D przez macierz kamery).
- **Przyciski Myszy**: \`ctx.mouse_pressed(Side::Left)\`, \`ctx.mouse_down(Side::Right)\`, \`ctx.mouse_released(Side::Middle)\`.
- **Klawisze & Akcje**: \`ctx.is_key_pressed(key)\`, \`ctx.is_key_down(key)\`, \`ctx.is_action_pressed(action)\`, \`ctx.is_action_down(action)\`.
- **Czas**: \`ctx.dt()\`, \`ctx.raw_dt()\`, \`ctx.pause()\`, \`ctx.unpause()\`, \`ctx.toggle_pause()\`, \`ctx.elapsed()\`, \`ctx.fps()\`, \`ctx.set_time_scale(scale)\`.
- **Zdarzenia & Sygnały**: \`ctx.emit(event)\`, \`ctx.poll::<E>()\`, \`ctx.has_event::<E>()\`, \`ctx.emit_signal("name")\`, \`ctx.poll_signal("name")\`, \`ctx.has_signal("name")\`.
- **Stan Gry (StateStore)**:
  - Flagi logiczne: \`ctx.flag(key) -> bool\`, \`ctx.set_flag(key, bool)\`.
  - Liczby całkowite: \`ctx.get_int(key) -> i64\`, \`ctx.set_int(key, val)\`, \`ctx.increment(key, delta) -> i64\`.
  - Liczby zmiennoprzecinkowe: \`ctx.get_float(key) -> f64\`, \`ctx.set_float(key, val)\`.
  - Ciągi znaków: \`ctx.get_state_text(key) -> &str\`, \`ctx.set_state_text(key, val)\`.
  - Wektory 2D: \`ctx.get_vec2(key) -> Option<Vec2>\`, \`ctx.get_vec2_or(key, def) -> Vec2\`, \`ctx.set_vec2(key, vec)\`.
- **Dźwięk & Muzyka**:
  - \`ctx.play_sound(name)\`, \`ctx.play_sound_ex(name, params)\`, \`ctx.stop_sound(name)\`.
  - \`ctx.play_sound_varied(name, pitch_v, vol_v)\` (oraz krótki alias \`ctx.play_varied(...)\`).
  - \`ctx.play_sound_throttled(name, interval)\` (oraz krótki alias \`ctx.play_throttled(...)\`).
  - \`ctx.play_bgm(name)\`, \`ctx.stop_bgm()\`, \`ctx.set_sfx_volume(vol)\`, \`ctx.set_bgm_volume(vol)\`.
- **Sceny & Okno**: \`ctx.switch_scene("Name")\` (odroczone do granicy klatki), \`ctx.set_cursor(Option<CustomCursor>)\`, \`ctx.set_fullscreen(bool)\`.`,
      codeExamples: [
        {
          title: "Przykładowe Użycie Metod Skrótowych Context",
          code: `// Emisja zdarzenia, zliczanie punktów, dźwięk z wariacją i pauza:
ctx.emit(EnemyKilled { score: 100 });
let new_score = ctx.increment("score", 100);
ctx.play_varied("hit_punch", 0.1, 0.15); // Dźwięk ze zmiennym tonem

if ctx.is_key_pressed(KeyCode::P) {
    ctx.toggle_pause();
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "context-api-reference",
      title: "API Reference: Engine & Context",
      content: `| Metoda / Konstruktor | Parametry | Zwraca | Opis |
| :--- | :--- | :--- | :--- |
| \`Engine::new(scene)\` | \`Scene\` | \`Engine\` | Tworzy nową instancję silnika z początkową sceną. |
| \`Engine::conf(title, w, h)\` | \`&str, i32, i32\` | \`Conf\` | Generuje konfigurację okna Macroquad z zadanym tytułem i wymiarami. |
| \`.with_virtual_resolution(w, h)\` | \`f32, f32\` | \`Self\` | Włącza dwufazowy pipeline wirtualnej rozdzielczości z letterboxingiem. |
| \`.with_integer_scaling(bool)\` | \`bool\` | \`Self\` | Wymusza skalowanie wirtualnego bufora wyłącznie o wielokrotności całkowite (1x, 2x, 3x). |
| \`.with_letterbox_color(color)\` | \`Color\` | \`Self\` | Ustawia kolor pasków letterboxa/pillarboxa. |
| \`ctx.spawn(object)\` | \`O: Object + 'static\` | \`()\` | Bezpiecznie kolejkuje dodanie bytu do warstwy świata na koniec klatki. |
| \`ctx.mouse_world()\` | \`&self\` | \`Vec2\` | Zwraca aktualną pozycję kursora przeliczoną do przestrzeni świata 2D przez aktywną kamerę. |
| \`ctx.emit(event)\` | \`E: 'static + Send + Sync\` | \`()\` | Emituje typowane zdarzenie na magistralę EventBus. |
| \`ctx.increment(key, delta)\` | \`&mut self, &str, i64\` | \`i64\` | Zwiększa zmienną liczbową w StateStore o delta i zwraca nową wartość. |
| \`ctx.toggle_pause()\` | \`&mut self\` | \`()\` | Przełącza stan pauzy gry. |
| \`ctx.emit_signal(name)\` | \`&mut self, impl Into<String>\` | \`()\` | Emituje prosty sygnał tekstowy bez ładunku. |`,
    }
  ]
};

export const worldLayersDoc = {
  id: "world-layers",
  title: "4. 🌍 Warstwy Świata (Objects, UI & Logic)",
  description: "Zarządzanie kontenerem World, cykl życia bytów (Auto-Cleanup & Deferred Spawning), cecha Object, zapytania typowane i przestrzenne.",
  sections: [
    {
      id: "world-layers-main",
      title: "Trójwarstwowa Architektura Wykonawcza",
      content: `Każdy świat gry (\`World\`) dzieli byty na trzy niezależne warstwy:

| Warstwa | Kontener | Wywołanie update | Renderowanie | Typowe Zastosowanie |
| :--- | :--- | :--- | :--- | :--- |
| **World** | \`self.objects\` | \`obj.update(ctx)\` | Przez Camera2D | Duszki, prostokąty, tilemapy, cząsteczki, pociski |
| **UI** | \`self.ui_objects\` | \`obj.update(ctx)\` | W Screen Space | Panele, przyciski, paski HP, etykiety, okna |
| **Logic** | \`self.logic\` | \`obj.update(ctx)\` | Brak (niewidzialne) | Kontrolery reguł, dispatcher zdarzeń, spawner fal |

> [!TIP]
> **Logic jako faza dispatchu zdarzeń**:
> Warstwa \`logic\` wykonuje się zawsze PO \`objects\` i \`ui_objects\`. Dzięki temu kontrolery w \`Logic\` mają gwarancję odebrania 100% zdarzeń wyemitowanych przez encje w danej klatce!`,
    },
    {
      id: "world-cleanup",
      title: "Odroczone Spawnowanie & Auto-Cleanup",
      content: `Wewnątrz pętli update dowolny obiekt może bezpiecznie kolejkować tworzenie nowych bytów bez konfliktów z pożyczaniem kontenera (*borrow checker*):

- \`ctx.spawn(obj)\`: Dodaje byt do warstwy świata (rozpoczyna update w następnej klatce).
- \`ctx.spawn_ui(obj)\`: Dodaje byt do warstwy UI.
- \`ctx.spawn_logic(obj)\` / \`ctx.spawn_logic_fn(|ctx| ...)\`: Dodaje obiekt/closure do warstwy logiki.

Każdy obiekt implementuje metody \`is_destroyed(&self) -> bool\` oraz \`destroy(&mut self)\`. Na koniec każdej klatki \`World::update\` automatycznie usuwa zniszczone byty ze wszystkich warstw!`,
      codeExamples: [
        {
          title: "Niszczenie i Spawnowanie z Poziomu Context",
          code: `struct BulletData {
    pub velocity: Vec2,
    pub lifetime: f32,
}

let bullet = Sprite::solid(player_pos, vec2(8.0, 8.0), YELLOW)
    .with_data(BulletData { velocity: dir * 400.0, lifetime: 2.0 })
    .with_tag("bullet")
    .update(|obj, ctx| {
        obj.position += obj.data.velocity * ctx.dt();
        obj.data.lifetime -= ctx.dt();

        if obj.data.lifetime <= 0.0 {
            obj.destroy(); // Auto-cleanup na koniec klatki
        }
    });

ctx.spawn(bullet);`,
          collapsible: false
        }
      ]
    },
    {
      id: "world-trait",
      title: "Cecha Object - Kontrakt Deweloperski",
      content: `Każdy element dodawany do kontenera \`World\` musi implementować cechę \`Object\`. Dostarcza ona elastyczny interfejs wywołań zwrotnych i rzutowania w dół:

- \`update(&mut self, ctx: &mut Context)\`: Wywoływane co klatkę w fazie logiki.
- \`draw(&self)\`: Rysowanie obiektu.
- \`is_destroyed(&self) -> bool\` & \`destroy(&mut self)\`: Flaga i metoda niszczenia obiektu dla auto-cleanupu.
- \`tag(&self) -> &str\` / \`has_tag(&str)\`: Odczyt tagu obiektu.
- \`bounds(&self) -> Option<Rect>\`: Zwraca prostokąt kolizji/interakcji dla hit-testingu myszy i zapytań przestrzennych.
- \`is_text_layer(&self) -> bool\`: Rysowanie bezpośrednio w natywnej rozdzielczości ekranu.`,
      codeExamples: [
        {
          title: "Implementacja Własnego Obiektu Object",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

pub struct CustomEnemy {
    pub position: Vec2,
    pub hp: i32,
    pub tag: String,
    pub destroyed: bool,
}

impl Object for CustomEnemy {
    fn update(&mut self, ctx: &mut Context) {
        self.position.x += 50.0 * ctx.dt();
        if self.hp <= 0 {
            self.destroy();
        }
    }

    fn draw(&self) {
        draw_circle(self.position.x, self.position.y, 16.0, RED);
    }

    fn is_destroyed(&self) -> bool { self.destroyed }
    fn destroy(&mut self) { self.destroyed = true; }
    fn tag(&self) -> &str { &self.tag }
    fn bounds(&self) -> Option<Rect> {
        Some(Rect::new(self.position.x - 16.0, self.position.y - 16.0, 32.0, 32.0))
    }
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "world-queries",
      title: "Zapytania Przestrzenne & Typowane w World",
      content: `- **Typowane Zapytania**:
  - \`world.find_typed::<T>() -> Option<&T>\` / \`find_typed_mut::<T>()\`
  - \`world.find_ui_typed::<T>() -> Option<&T>\` / \`find_ui_typed_mut::<T>()\`
  - \`world.find_logic_typed::<T>() -> Option<&T>\` / \`find_logic_typed_mut::<T>()\`
- **Zapytania Przestrzenne**:
  - \`world.find_nearest(pos, tag) -> Option<&dyn Object>\`
  - \`world.find_within_radius(center, radius) -> Vec<&dyn Object>\` (idealne do obrażeń obszarowych AoE).`,
      codeExamples: [
        {
          title: "Zapytanie Typowane i Obrażenia Obszarowe AoE",
          code: `// 1. Bezpieczny odczyt konkretnego typu bez ręcznego downcastingu:
if let Some(player) = world.find_typed::<GameObject<PlayerData>>() {
    println!("Pozycja gracza: {:?}", player.position);
}

// 2. Zadanie obrażeń obszarowych (AoE) wszystkim bytom w promieniu 150px
let nearby = world.find_within_radius(explosion_pos, 150.0);
println!("Trafiono {} obiektów w promieniu wybuchu!", nearby.len());`,
          collapsible: false
        }
      ]
    },
    {
      id: "world-macros",
      title: "Makra Deklaratywne: world! & world_objects!",
      content: `- \`world_objects![obj1, obj2]\`: Konwertuje listę obiektów na \`Vec<Box<dyn Object>>\`.
- \`world! { objects: [...], ui: [...], logic: [...] }\`: Tworzy kompletny \`World\` z poszczególnymi warstwami.`,
      codeExamples: [
        {
          title: "Tworzenie Świata z Makrem world!",
          code: `let player = Sprite::solid(vec2(50.0, 50.0), vec2(32.0, 32.0), BLUE).with_tag("player");
let score_text = Text::new("Punkty: 0", vec2(20.0, 20.0), 20.0, WHITE).with_tag("score");

let my_world = world! {
    objects: [player],
    ui: [score_text],
    logic: [
        Logic::interval(1.0, |ctx| {
            ctx.increment("game_seconds", 1);
        })
    ],
};`,
          collapsible: false
        }
      ]
    }
  ]
};

export const behaviorDoc = {
  id: "behavior",
  title: "5. 🎭 System Zachowań (Behavior, on_update & Deref)",
  description: "Brak sztywnych hierarchii klas. Dowolny obiekt rysowalny można owinąć w Behavior, uzyskując własny stan Data oraz domknięcie on_update z pełnym dostępem przez blanket Deref.",
  sections: [
    {
      id: "behavior-main",
      title: "System Zachowań: Behavior z Blanket Deref & Ergonomia Sprite / Rectangle",
      content: `\`Behavior<Inner, Data>\` implementuje cechę \`Deref<Target = Inner>\` i \`DerefMut\` w sposób w pełni uogólniony (*blanket implementation*).
Oznacza to, że dowolny komponent opakowany w \`Behavior\` udostępnia swoje pola i metody bezpośrednio — bez konieczności pisania \`obj.inner.position\`:

### Dwa Sposoby Rejestracji Logiki:
1. **Bezpośrednie \`.on_update(|obj, ctx| ...)\`**: Działa bezpośrednio na \`Rectangle\` oraz \`Sprite\` bez konieczności definiowania osobnej struktury danych (opakowuje obiekt w \`Behavior<Inner, ()>\`).
2. **Ze strukturą danych \`.with_data(my_data).on_update(|obj, ctx| ...)\`**: Gdy encja posiada własny stan, liczniki, statystyki HP czy wektory pędu.

- **Ergonomia Duszka (\`Sprite\`) i Prostokąta (\`Rectangle\`)**:
  - \`.with_position(pos)\` / \`.with_pos(pos)\`: Ustawia pozycję początkową.
  - \`.with_size(size)\`: Ustawia rozmiar bytu.
  - \`sprite.center() -> Vec2\`: Zwraca środek duszka (\`position + size * 0.5\`).
  - \`sprite.set_center(center: Vec2)\`: Ustawia położenie duszka tak, aby jego środek znalazł się w punkcie docelowym.
  - \`sprite.look_at(target_pos: Vec2)\`: Obraca duszka w kierunku celu.
  - \`sprite.circle() -> Circle\`: Zwraca aproksymację kołową hitboxa dla szybkich testów kolizji.`,
      codeExamples: [
        {
          title: "Sposób 1: Prosty Obiekt z Bezpośrednim on_update",
          code: `// Prosty obiekt bez dodatkowej struktury danych:
let player = Rectangle::simple(vec2(28.0, 28.0), WHITE)
    .with_position(vec2(400.0, 300.0))
    .on_update(|obj, ctx| {
        if ctx.is_key_down(KeyCode::D) {
            obj.position.x += 200.0 * ctx.dt();
        }
    });

ctx.spawn(player);`,
          collapsible: false
        },
        {
          title: "Sposób 2: Przeciwnik z Własną Strukturą Danych (.with_data)",
          code: `struct EnemyData {
    pub hp: i32,
    pub speed: f32,
}

let enemy = Sprite::solid(vec2(100.0, 100.0), vec2(24.0, 24.0), RED)
    .with_data(EnemyData { hp: 30, speed: 120.0 })
    .with_tag("enemy")
    .on_update(|obj, ctx| {
        // Bezpośredni dostęp do pól duszka przez blanket Deref:
        let player_pos = ctx.get_vec2("player_pos").unwrap_or_default();
        obj.look_at(player_pos);
        obj.move_towards(player_pos, obj.data.speed * ctx.dt());

        if obj.data.hp <= 0 {
            obj.destroy(); // automatycznie usunięty na koniec klatki
            ctx.increment("score", 50);
        }
    });

ctx.spawn(enemy);`,
          collapsible: false
        }
      ]
    },
    {
      id: "behavior-logic",
      title: "Dedykowany Moduł Logic & Kontrolery Systemowe (Logic<Data>)",
      content: `Dla kontrolerów systemowych (spawnery fal, timery, zarządcy muzyki, reguły gry) silnik dostarcza dedykowaną strukturę **\`Logic<Data>\`** (alias \`LogicObject<Data>\`):

- **Zero graficznego narzutu**: Brak sztucznego duszka pod spodem, brak niepotrzebnych pól color, texture czy bounds.
- **Bezpośredni Deref do Data**: Pola z Twojej struktury danych są dostępne natychmiast jako \`obj.my_field\` bez pisania \`obj.data.my_field\`!
- **Wbudowane timery i wzorce systemowe**:
  - \`Logic::run(|ctx| ...)\` lub \`ctx.spawn_logic_fn(|ctx| ...)\`: Bezstanowe zamknięcie wywoływane co klatkę.
  - \`Logic::interval(interval_secs, |ctx| ...)\`: Wykonuje kod dokładnie co X sekund.
  - \`Logic::delayed(delay_secs, |ctx| ...)\`: Jednorazowa akcja odroczona w czasie (auto-destrukcja po wykonaniu).
  - \`Logic::until(cond_fn, update_fn)\`: Wykonuje logikę dopóki warunek jest prawdziwy.`,
      codeExamples: [
        {
          title: "Kontroler Gry Odbierający Zdarzenia",
          code: `#[derive(Clone, Debug)]
pub struct PlayerDied { pub reason: &'static str }

let game_controller = Logic::run(|ctx| {
    // Logic odpala się po obiektach świata — gwarantowany odbiór zdarzeń!
    for death in ctx.poll::<PlayerDied>() {
        println!("Koniec gry: {}", death.reason);
        ctx.switch_scene("GameOver");
    }
});

world.add_logic(game_controller);`,
          collapsible: false
        }
      ]
    },
    {
      id: "behavior-scenes",
      title: "Zarządzanie Scenami: Scene & SceneManager",
      content: `Aplikacja może składać się z wielu osobnych scen (np. \`Boot\`, \`MainMenu\`, \`GameLevel1\`, \`GameOver\`):

- **\`Scene\`**: Przechowuje własny \`World\` oraz opcjonalne callbacki \`on_enter(\|ctx\| ...)\` i \`on_exit_hook(\|ctx\| ...)\`.
- **\`SceneManager\`**: Przechowuje listę scen i zarządza płynnym przełączaniem na granicy klatek (*Frame Boundary*). Przełączenie sceny wywołuje zdarzenie \`SceneChanged\` oraz emituje sygnały w EventBus (\`sys:scene_loaded\`, \`sys:enter_scene_<Nazwa>\`).`,
      codeExamples: [
        {
          title: "Konfiguracja Wielu Scen",
          code: `let menu_scene = Scene::new("Menu", world! { ui: [start_btn] });
let game_scene = Scene::new("Game", world! { objects: [player], logic: [spawner] });

let mut engine = Engine::new(vec![menu_scene, game_scene]);
engine.run().await;`,
          collapsible: false
        }
      ]
    }
  ]
};

export const architectureBestPracticesDoc = {
  id: "architecture-best-practices",
  title: "6. 🏗️ Architektura Gry & Dobre Praktyki (Best Practices)",
  badge: "Architecture & Design Patterns",
  description: "Kompleksowy poradnik tworzenia gier w RustedEngine: model mentalny, modułowy podział katalogów, maszyny stanów (FSM), kompozycja komponentów, trwałość między scenami, culling i optymalizacje.",
  sections: [
    {
      id: "architecture-philosophy",
      title: "1. 💡 Model Mentalny Silnika — Jak Myśleć o Grze?",
      content: `Wielu programistów Rust wpada w pułapkę walki z borrow checkerem próbując implementować wskaźniki cykliczne (\`Rc<RefCell<...>>\`) lub zbyt skomplikowane systemy ECS. RustedEngine rozwiązuje ten problem poprzez **prosty, deterministyczny model trójwarstwowy**:

### Trzy Warstwy Odpowiedzialności:
1. **Warstwa Świata (\`objects\`)**: Zawiera byty w przestrzeni świata 2D podlegające kamerze (gracz, wrogowie, pociski, skrzynie, cząsteczki).
2. **Warstwa Interfejsu (\`ui_objects\`)**: Elementy ekranu nadrzędnego w Screen Space (HUD, paski życia, przyciski menu, okna pulpitu).
3. **Warstwa Logiki (\`logic\`)**: Niewidzialne kontrolery reguł gry (spawnery fal, kontroler audio, liczniki, dispatcher zdarzeń po obiektach).

### Dlaczego nie potrzebujesz Rc<RefCell>?
- **Odroczone Spawnowanie & Usuwanie**: Wywołanie \`ctx.spawn(pocisk)\` lub \`obj.destroy()\` nie modyfikuje kolekcji w trakcie iteracji. Zmiany są aplikowane na granicy klatki.
- **Komunikacja przez EventBus i StateStore**: Zamiast trzymać bezpośredni wskaźnik do wroga, gracz emituje zdarzenie \`ctx.emit(PlayerAttacked { ... })\` lub zapisuje \`ctx.set_vec2("player_pos", pos)\`.`,
    },
    {
      id: "architecture-folder-structure",
      title: "2. 📁 Rekomendowana Struktura Katalogów Dużego Projektu",
      content: `W miarę jak gra rośnie, kluczem do czystego kodu jest podział projektu na wyspecjalizowane moduły:

\`\`\`
src/
├── main.rs              # Inicjalizacja Engine, rejestracja Resources, start
├── components/          # Małe, reużywalne struktury danych (Pure Data)
│   ├── health.rs        # Health { current, max }
│   ├── cooldown.rs      # CooldownTimer { timer, duration }
│   └── movement.rs      # Movement { velocity, friction, max_speed }
├── entities/            # Fabryki bytów gry (spawn_*)
│   ├── player.rs        # spawn_player(), PlayerData
│   ├── enemy.rs         # spawn_enemy(), EnemyData, zachowania AI
│   ├── projectile.rs    # spawn_bullet(), BulletData
│   └── pickup.rs        # spawn_coin(), spawn_heart()
├── controllers/         # Niewidzialne kontrolery Logic (reguły gry)
│   ├── wave_spawner.rs  # Logika fal przeciwników i trudności
│   └── audio_ctrl.rs    # Dynamiczna muzyka w zależności od akcji
├── ui/                  # Layouty interfejsu
│   ├── hud.rs           # Paski zdrowia, punkty (col!, row!, ProgressBar)
│   └── pause_menu.rs    # Menu pauzy, ustawienia
└── scenes/              # Fabryki scen (Scene::new)
    ├── menu_scene.rs    # Scena menu głównego
    ├── game_scene.rs    # Główna scena rozgrywki
    └── game_over.rs     # Ekran końcowy
\`\`\``,
      codeExamples: [
        {
          title: "Kompozycja Małych Struktur wewnątrz PlayerData",
          code: `// src/components/health.rs
pub struct Health {
    pub current: i32,
    pub max: i32,
}

impl Health {
    pub fn new(max: i32) -> Self { Self { current: max, max } }
    pub fn take_damage(&mut self, dmg: i32) -> bool {
        self.current = (self.current - dmg).max(0);
        self.current == 0 // Zwraca true jeśli byt zginął
    }
}

// src/components/cooldown.rs
pub struct CooldownTimer {
    pub timer: f32,
    pub duration: f32,
}

impl CooldownTimer {
    pub fn new(duration: f32) -> Self { Self { timer: 0.0, duration } }
    pub fn tick(&mut self, dt: f32) { self.timer = (self.timer - dt).max(0.0); }
    pub fn ready(&self) -> bool { self.timer <= 0.0 }
    pub fn trigger(&mut self) { self.timer = self.duration; }
}

// src/entities/player.rs — Czyste składanie z małych klocków:
pub struct PlayerData {
    pub health: Health,
    pub shoot_cd: CooldownTimer,
    pub dash_cd: CooldownTimer,
    pub facing: Vec2,
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "architecture-fsm",
      title: "3. 🕹️ Wzorzec Maszyny Stanów (Finite State Machine / FSM)",
      content: `Zamiast tworzyć labirynt zmiennych boolowskich (\`is_dashing\`, \`is_attacking\`, \`is_jumping\`, \`is_stunned\`), w Rust najlepszym podejściem jest **Enum z danymi stanu**:

### Zalety Enum FSM w Rust:
- **Niemożliwe stany stają się niemożliwe do wyrażenia**: Nie można jednocześnie robić \`Dash\` i \`Stunned\`.
- **Precyzyjne timery i parametry per stan**: Stan \`Dashing\` przechowuje własny timer i wektor kierunku.
- **Wyczerpujący \`match\`**: Kompilator Rust wymusza obsłużenie wszystkich stanów.`,
      codeExamples: [
        {
          title: "Kompletna Maszyna Stanów Postaci Gracza",
          code: `pub enum PlayerState {
    Normal,
    Dashing { dir: Vec2, timer: f32 },
    Attacking { windup: f32 },
    Stunned { timer: f32 },
}

// Wewnątrz .on_update(|player, ctx| ...):
match player.data.state {
    PlayerState::Normal => {
        let move_dir = ctx.input.wasd();
        player.position += move_dir * SPEED * ctx.dt();

        // Wejście w Dash na Spację:
        if ctx.input.is_key_pressed(KeyCode::Space) && move_dir != Vec2::ZERO {
            player.data.state = PlayerState::Dashing { dir: move_dir, timer: 0.18 };
            ctx.play_varied("dash_whoosh", 0.1, 0.05);
        }
    }

    PlayerState::Dashing { dir, ref mut timer } => {
        *timer -= ctx.dt();
        player.position += dir * (SPEED * 2.8) * ctx.dt(); // Duża prędkość podczas dashu

        if *timer <= 0.0 {
            player.data.state = PlayerState::Normal; // Powrót do normalnego stanu
        }
    }

    PlayerState::Attacking { ref mut windup } => {
        *windup -= ctx.dt();
        if *windup <= 0.0 {
            player.data.state = PlayerState::Normal;
        }
    }

    PlayerState::Stunned { ref mut timer } => {
        *timer -= ctx.dt();
        if *timer <= 0.0 {
            player.data.state = PlayerState::Normal;
        }
    }
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "architecture-scenes-persistence",
      title: "4. 🔄 Przełączanie Scen & Trwałość Danych (Inter-Scene State)",
      content: `W RustedEngine zmiana sceny (\`ctx.switch_scene("GameOver")\`) resetuje byty wewnątrz \`World\`, ale **\`ctx.resources\` oraz \`ctx.state\` pozostają nienaruszone**!

### Jak Przekazywać Wyniki i Ekwipunek Między Scenami:
1. **Trwałe Statystyki w \`ctx.resources\`**: Obiekty takie jak \`PlayerProfile\`, \`Inventory\` czy \`RunStats\` wstawione do \`Resources\` są dostępne w każdej scenie.
2. **Flagi i Wyniki w \`ctx.state\`**: Proste klucze \`ctx.set_int("final_score", score)\` są idealne do odczytania na ekranie GameOver.
3. **Zapis Gry w SaveSystem**: Sloty zapisu gry (\`ctx.save_system.save_slot("slot_1", &data)\`) z sumą kontrolną CRC32 trwale zapisują postęp na dysku.`,
      codeExamples: [
        {
          title: "Przekazanie Danych z Gry do Ekranu Game Over",
          code: `// 1. W scenie gry po śmierci gracza:
if player.data.health.current == 0 {
    ctx.set_int("final_score", player.data.score);
    ctx.set_int("floor_reached", current_floor);
    ctx.switch_scene("GameOver"); // Płynne przejście na koniec klatki
}

// 2. W scenie GameOver (w czytaniu UI):
let score = ctx.get_int_or("final_score", 0);
let floor = ctx.get_int_or("floor_reached", 1);

let game_over_panel = col![
    Text::new("KONIEC GRY", Vec2::ZERO, 28.0, RED),
    Gap::height(12.0),
    Text::new(&format!("Zdobyte Punkty: {}", score), Vec2::ZERO, 18.0, GOLD),
    Text::new(&format!("Dotarłeś do Piętra: {}", floor), Vec2::ZERO, 16.0, WHITE),
    Gap::height(16.0),
    Button::new(Vec2::ZERO, vec2(160.0, 36.0), "ZAGRAJ PONOWNIE")
        .on_click(|ctx| {
            ctx.switch_scene("Game");
        })
]
.align_to_screen(UIAnchor::Center, Padding::all(0.0));`,
          collapsible: false
        }
      ]
    },
    {
      id: "architecture-performance-debugging",
      title: "5. ⚡ Wydajność, Culling & Tryb Debugowania (F3 Overlay)",
      content: `Aby gra działała ze stabilnymi 60 FPS nawet przy setkach przeciwników:

### 3 Złote Zasady Optymalizacji:
1. **Frustum Culling**: Nie wykonuj skomplikowanej logiki AI wrogów będących daleko poza ekranem:
   \`if !ctx.camera.is_on_screen(enemy.position, 80.0) { return; }\`
2. **Tanie Wstępne Testy Kolizji**: Zanim sprawdzisz precyzyjną kapsułę lub odcinek, sprawdź odległość kwadratową:
   \`if pos.distance_squared(other_pos) > (r1 + r2) * (r1 + r2) { continue; }\`
3. **Throttling Dźwięków**: Ciągłe uderzenia i kroki odtwarzaj przez \`ctx.play_sound_throttled("step", 0.25)\`, aby uniknąć przesterowania audio.`,
      codeExamples: [
        {
          title: "Nakładka Debugowa (F3 Debug Overlay)",
          code: `// Kontroler debugowania w warstwie Logic:
let debug_overlay = Logic::run(|ctx| {
    if ctx.input.is_key_pressed(KeyCode::F3) {
        let debug_on = ctx.flag("debug_mode");
        ctx.set_flag("debug_mode", !debug_on);
    }

    if ctx.flag("debug_mode") {
        // Wypisz FPS i liczbę obiektów:
        draw_text(&format!("FPS: {} | TimeScale: {:.2}", ctx.time.fps(), ctx.time.time_scale()), 10.0, 20.0, 16.0, GREEN);

        // Narysuj pozycję myszy w świecie:
        let m_world = ctx.mouse_world();
        draw_text(&format!("Mouse World: ({:.1}, {:.1})", m_world.x, m_world.y), 10.0, 40.0, 14.0, YELLOW);
    }
});

world.add_logic(debug_overlay);`,
          collapsible: false
        }
      ]
    }
  ]
};
