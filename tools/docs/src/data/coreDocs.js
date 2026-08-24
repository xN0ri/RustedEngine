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
      content: `- **Spawnowanie**: \`ctx.spawn(obj)\`, \`ctx.spawn_ui(obj)\`, \`ctx.spawn_logic(obj)\`, \`ctx.spawn_logic_fn(|ctx| ...)\`.
- **Mysz w Świecie**: \`ctx.mouse_world() -> Vec2\` (pozycja kursora natychmiast w świecie gry przez macierz kamery).
- **Przyciski Myszy**: \`ctx.mouse_pressed(Side::Left)\`, \`ctx.mouse_down(Side::Right)\`, \`ctx.mouse_released(Side::Middle)\`.
- **Czas**: \`ctx.dt()\`, \`ctx.raw_dt()\`, \`ctx.pause()\`, \`ctx.unpause()\`, \`ctx.toggle_pause()\`, \`ctx.elapsed()\`, \`ctx.fps()\`, \`ctx.set_time_scale(scale)\`.
- **Zdarzenia & Sygnały**: \`ctx.emit(event)\`, \`ctx.poll::<E>()\`, \`ctx.has_event::<E>()\`, \`ctx.emit_signal("name")\`, \`ctx.poll_signal("name")\`, \`ctx.has_signal("name")\`.
- **Stan Gry**: \`ctx.get_int(key)\`, \`ctx.set_int(key, val)\`, \`ctx.increment(key, delta) -> i64\`, \`ctx.flag(key)\`, \`ctx.set_flag(key, bool)\`.
- **Dźwięk**: \`ctx.play_sound(name)\`, \`ctx.play_sound_varied(name, pitch_v, vol_v)\`, \`ctx.play_sound_throttled(name, interval)\`.
- **Sceny**: \`ctx.switch_scene("Name")\` (odroczone do granicy klatki).`,
      codeExamples: [
        {
          title: "Przykładowe Użycie Metod Skrótowych Context",
          code: `// Emisja zdarzenia, zliczanie punktów, dźwięk z wariacją i pauza:
ctx.emit(EnemyKilled { score: 100 });
let new_score = ctx.increment("score", 100);
ctx.play_sound_varied("hit_punch", 0.1, 0.15);

if ctx.input.is_key_pressed(KeyCode::P) {
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
  title: "5. 🎭 System Zachowań (Behavior & Deref)",
  description: "Brak sztywnych hierarchii klas. Dowolny obiekt rysowalny można owinąć w Behavior, uzyskując własny stan Data oraz domknięcie update z pełnym dostępem przez blanket Deref.",
  sections: [
    {
      id: "behavior-main",
      title: "System Zachowań: Behavior z Blanket Deref & Ergonomia Sprite",
      content: `\`Behavior<Inner, Data>\` implementuje cechę \`Deref<Target = Inner>\` i \`DerefMut\` w sposób w pełni uogólniony (*blanket implementation*).
Oznacza to, że dowolny komponent opakowany w \`Behavior\` udostępnia swoje pola i metody bezpośrednio — bez konieczności pisania \`obj.inner.position\`:

- **Ergonomia Duszka (\`Sprite\`)**:
  - \`sprite.center() -> Vec2\`: Zwraca środek duszka (\`position + size * 0.5\`).
  - \`sprite.set_center(center: Vec2)\`: Ustawia położenie duszka tak, aby jego środek znalazł się w punkcie docelowym.
  - \`sprite.look_at(target_pos: Vec2)\`: Obraca duszka w kierunku celu.
  - \`sprite.circle() -> Circle\`: Zwraca aproksymację kołową hitboxa dla szybkich testów kolizji.`,
      codeExamples: [
        {
          title: "Tworzenie Przeciwnika z Behavior i Deref",
          code: `struct EnemyData {
    pub hp: i32,
    pub speed: f32,
}

let enemy = Sprite::solid(vec2(100.0, 100.0), vec2(24.0, 24.0), RED)
    .with_data(EnemyData { hp: 30, speed: 120.0 })
    .with_tag("enemy")
    .update(|obj, ctx| {
        // Bezpośredni dostęp do pól duszka przez blanket Deref:
        let player_pos = ctx.state.get_vec2("player_pos").unwrap_or_default();
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
