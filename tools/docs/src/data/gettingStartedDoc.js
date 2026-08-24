export const gettingStartedDoc = {
  id: "getting-started",
  title: "1. 🚀 Architecture & Core Engine",
  icon: "Zap",
  badge: "Core System",
  description:
    "Drobiazgowa analiza cyklu życia silnika RustedEngine, pętli głównej, dwustopniowego pipeline'u renderowania oraz uniwersalnego kontekstu Context.",
  sections: [
    {
      id: "architecture-overview",
      title: "Architektura Silnika & Podział Warstw",
      content: `**RustedEngine** (\`rusted_engine\` v1.0) to lekki, nowoczesny i wysoce ergonomiczny 2D silnik gry w języku Rust oparty o framework **Macroquad**.
Silnik powstał w celu wyeliminowania żmudnego boilerplate'u w Rust i dostarczenia czystego, modularnego modelu mentalnego dla gier 2D.`,
      subsections: [
        {
          id: "engine-pillars",
          title: "Filary Projektowe & Filozofia",
          content: `### 4 Główne Zasady Architektoniczne:
1. **Zero niepotrzebnego boilerplate'u**: Gotowe makra deklaratywne (\`world!\`, \`world_objects!\`, \`column!\`, \`row!\`), zintegrowane menedżery stanu, zapisu, zdarzeń i zasobów.
2. **Dualny Pipeline Renderowania (Pixel-Perfect + Crisp Fonts)**:
   - Świat i elementy graficzne są renderowane do bufora wirtualnego (\`vw × vh\`) z filtrowaniem \`Nearest\` i automatycznym letterboxingiem.
   - Warstwa tekstowa z flagą \`is_text_layer() == true\` jest renderowana bezpośrednio na fizycznym buforze ekranu, gwarantując idealną ostrość czcionek bez rozmycia.
3. **Izolacja Warstw Wykonawczych (World vs UI vs Logic)**:
   - \`objects\`: Byty w przestrzeni świata 2D podlegające transformacji kamery (pozycja, zoom, obrót, shake).
   - \`ui_objects\`: Elementy interfejsu w przestrzeni ekranu (Screen Space).
   - \`logic\`: Niewidzialne kontrolery logiki aktualizowane co klatkę bez narzutu na GPU (działają jako faza dispatchu po obiektach).
4. **Uniwersalny System Zachowań (\`Behavior<Inner, Data>\`)**:
   - Brak sztywnych hierarchii klas. Dowolny obiekt rysowalny można owinąć w \`Behavior\`, uzyskując własny stan \`Data\` oraz domknięcie \`update\` z pełnym dostępem przez blanket cechę \`Deref\` i \`DerefMut\`.`,
        },
        {
          id: "execution-layers",
          title: "Trójwarstwowa Architektura Wykonawcza",
          content: `Każdy świat gry (\`World\`) dzieli byty na trzy niezależne warstwy:

| Warstwa | Kontener | Wywołanie update | Renderowanie | Typowe Zastosowanie |
|---|---|---|---|---|
| **World** | \`self.objects\` | \`obj.update(ctx)\` | Przez \`Camera2D\` | Duszki, prostokąty, tilemapy, cząsteczki, pociski |
| **UI** | \`self.ui_objects\` | \`obj.update(ctx)\` | W Screen Space | Panele, przyciski, paski HP, etykiety, okna |
| **Logic** | \`self.logic\` | \`obj.update(ctx)\` | Brak (niewidzialne) | Kontrolery reguł, dispatcher zdarzeń, spawner fal |`,
          callouts: [
            {
              type: "protip",
              title: "Pro Tip: Logic jako faza dispatchu zdarzeń",
              text: "Warstwa `logic` wykonuje się zawsze PO `objects` i `ui_objects`. Dzięki temu kontrolery w `Logic` mają gwarancję odebrania 100% zdarzeń wyemitowanych przez encje w danej klatce!",
            },
          ],
          codeExamples: [
            {
              title: "Przykład: Dodawanie Kontrolera Zasad Gry jako Logic",
              code: `use rusted_engine::prelude::*;

#[derive(Clone, Debug)]
pub struct PlayerDied { pub reason: &'static str }

let game_controller = Logic::run(|ctx| {
    for death in ctx.poll::<PlayerDied>() {
        println!("Game Over: {}", death.reason);
        ctx.switch_scene("GameOver");
    }
});

world.add_logic(game_controller);`,
              collapsible: true,
              defaultCollapsed: false,
            },
          ],
        },
      ],
    },
    {
      id: "engine-lifecycle",
      title: "Cykl Życia Klatki (Frame Execution Order)",
      content: `Pętla silnika uruchamiana przez \`Engine::run().await\` wykonuje bezwzględnie uporządkowaną, deterministyczną sekwencję kroków w każdej klatce:`,
      subsections: [
        {
          id: "lifecycle-flow",
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
   - Rysowanie obiektów świata w przestrzeni kamery (z opcjonalnym shaderem \`PostProcess\`).
   - Rysowanie warstwy UI i nakładki tekstowej w rozdzielczości natywnej.
10. **Rysowanie Kursora & Synchronizacja**: Narysowanie \`CustomCursor\` i wywołanie \`next_frame().await\`.`,
        },
        {
          id: "engine-configuration",
          title: "Konfiguracja Silnika & Fluent Builders",
          content: `Instancję silnika konfiguruje się za pomocą czytelnego wzorca budowniczego (*Builder Pattern*):`,
          codeExamples: [
            {
              title: "Główny Przykład: Podstawowa Inicjalizacja Gry",
              code: `use rusted_engine::prelude::*;

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
              collapsible: false,
            },
          ],
        },
      ],
    },
    {
      id: "context-struct",
      title: "Kontekst Silnika Context - Centralna Magistrala",
      content: `Struktura **\`Context\`** (\`ctx\`) to pojedynczy punkt dostępu do wszystkich podsystemów silnika, przekazywany mutowalnie (\`&mut Context\`) do zamknięć aktualizacji.`,
      subsections: [
        {
          id: "context-fields",
          title: "Struktura Pól w Context",
          content: `Wszystkie podsystemy dostępne bezpośrednio przez pola \`ctx\`:

| Pole | Typ | Rola w Silniku |
|---|---|---|
| \`ctx.time\` | \`Time\` | Skalowany czas klatki (\`deltatime()\`), zegar fizyczny (\`raw_deltatime()\`), pauza, skala czasu. |
| \`ctx.input\` | \`Input\` | Stan klawiszy (WASD, strzałki, osie \`axis_2d\`), mysz i remapowany kursor. |
| \`ctx.assets\` | \`Assets\` | Centralny magazyn tekstur, dźwięków, czcionek TTF i atlasów \`BitmapFont\`. |
| \`ctx.audio\` | \`Audio\` | Efekty SFX, throttling, losowa wariacja głośności i tonu oraz muzyka w tle. |
| \`ctx.camera\` | \`Camera\` | Kontroler kamery 2D, śledzenie z wyprzedzeniem (\`look_ahead\`), shake i culling. |
| \`ctx.state\` | \`StateStore\` | Przechowalnia flag i zmiennych liczbowych z serializacją JSON (do zapisów gry). |
| \`ctx.resources\` | \`Resources\` | Typowany kontener zasobów uniwersalnych na żywy stan rozgrywki (\`GameState\`). |
| \`ctx.triggers\` | \`TriggerSystem\` | Silnik reguł Warunek → Akcja operujący bezpośrednio na \`Context\`. |
| \`ctx.events\` | \`EventBus\` | Typowana magistrala zdarzeń pub/sub oraz sygnałów tekstowych. |
| \`ctx.actions\` | \`ActionMap\` | Mapowanie nazwanych akcji wejścia z łańcuchowym konstruktorem (\`with_key\`, \`with_mouse\`). |
| \`ctx.save_system\` | \`SaveSystem\` | Sloty zapisu gry z weryfikacją sumy kontrolnej CRC32. |`,
        },
        {
          id: "context-shortcuts",
          title: "Ergonomiczne Metody Skrótowe w Context",
          content: `Dla maksymalnej wygody \`Context\` udostępnia bezpośrednie metody narzędziowe:

- **Spawnowanie**: \`ctx.spawn(obj)\`, \`ctx.spawn_ui(obj)\`, \`ctx.spawn_logic(obj)\`, \`ctx.spawn_logic_fn(|ctx| ...)\`.
- **Mysz w Świecie**: \`ctx.mouse_world() -> Vec2\` (pozycja kursora natychmiast w świecie gry przez macierz kamery).
- **Przyciski Myszy**: \`ctx.mouse_pressed(Side::Left)\`, \`ctx.mouse_down(Side::Right)\`, \`ctx.mouse_released(Side::Middle)\`.
- **Czas**: \`ctx.dt()\`, \`ctx.raw_dt()\`, \`ctx.pause()\`, \`ctx.unpause()\`, \`ctx.toggle_pause()\`, \`ctx.elapsed()\`, \`ctx.fps()\`, \`ctx.set_time_scale(scale)\`.
- **Zdarzenia & Sygnały**: \`ctx.emit(event)\`, \`ctx.poll::<E>()\`, \`ctx.has_event::<E>()\`, \`ctx.emit_signal("name")\`, \`ctx.poll_signal("name")\`, \`ctx.has_signal("name")\`.
- **Stan Gry**: \`ctx.get_int(key)\`, \`ctx.set_int(key, val)\`, \`ctx.increment(key, delta) -> i64\`, \`ctx.flag(key)\`, \`ctx.set_flag(key, bool)\`.
- **Dźwięk**: \`ctx.play_sound(name)\`, \`ctx.play_sound_varied(name, pitch_v, vol_v)\`, \`ctx.play_sound_throttled(name, interval)\`.
- **Sceny**: \`ctx.switch_scene("Name")\` (odroczone do granicy klatki).`,
          codeExamples: [
            {
              title: "Podstawowy Przykład: Skróty Context w Pętli Gry",
              code: `// Emisja zdarzenia, zliczanie punktów, dźwięk z wariacją i pauza:
ctx.emit(EnemyKilled { score: 100 });
let new_score = ctx.increment("score", 100);
ctx.play_sound_varied("hit_punch", 0.1, 0.15);

if ctx.input.is_key_pressed(KeyCode::P) {
    ctx.toggle_pause();
}`,
              collapsible: false,
            },
          ],
        },
      ],
    },
    {
      id: "api-reference",
      title: "API Reference: Engine & Context",
      content: `Zestawienie najważniejszych metod i konstruktorów rdzenia silnika:`,
      apiTable: {
        headers: ["Metoda / Konstruktor", "Parametry", "Zwraca", "Opis"],
        rows: [
          [
            "Engine::new(scene)",
            "Scene",
            "Engine",
            "Tworzy nową instancję silnika z początkową sceną.",
          ],
          [
            "Engine::conf(title, w, h)",
            "&str, i32, i32",
            "Conf",
            "Generuje konfigurację okna Macroquad z zadanym tytułem i wymiarami.",
          ],
          [
            ".with_virtual_resolution(w, h)",
            "f32, f32",
            "Self",
            "Włącza dwufazowy pipeline wirtualnej rozdzielczości z letterboxingiem.",
          ],
          [
            ".with_integer_scaling(bool)",
            "bool",
            "Self",
            "Wymusza skalowanie wirtualnego bufora wyłącznie o wielokrotności całkowite (1x, 2x, 3x).",
          ],
          [
            ".with_letterbox_color(color)",
            "Color",
            "Self",
            "Ustawia kolor pasków letterboxa/pillarboxa.",
          ],
          [
            "ctx.spawn(object)",
            "O: Object + 'static",
            "()",
            "Bezpiecznie kolejkuje dodanie bytu do warstwy świata na koniec klatki.",
          ],
          [
            "ctx.mouse_world()",
            "&self",
            "Vec2",
            "Zwraca aktualną pozycję kursora przeliczoną do przestrzeni świata 2D przez aktywną kamerę.",
          ],
          [
            "ctx.emit(event)",
            "E: 'static + Send + Sync",
            "()",
            "Emituje typowane zdarzenie na magistralę EventBus.",
          ],
          [
            "ctx.increment(key, delta)",
            "&mut self, &str, i64",
            "i64",
            "Zwiększa zmienną liczbową w StateStore o delta i zwraca nową wartość.",
          ],
          [
            "ctx.toggle_pause()",
            "&mut self",
            "()",
            "Przełącza stan pauzy gry.",
          ],
          [
            "ctx.emit_signal(name)",
            "&mut self, impl Into<String>",
            "()",
            "Emituje prosty sygnał tekstowy bez ładunku.",
          ],
        ],
      },
    },
  ],
};
