// ============================================================================
// 1. RDZEŃ SILNIKA & ARCHITEKTURA
// ============================================================================

export const quickstartDoc = {
  id: "quickstart",
  title: "1. 🚀 Szybki Start & Szablon Gry",
  description: "Minimalny szablon projektu, pętla główna, okno gry oraz konfiguracja w Cargo.toml.",
  sections: [
    {
      id: "quickstart-setup",
      title: "Konfiguracja Projektu (Cargo.toml)",
      content: `RustedEngine to lekki i ergonomiczny framework 2D dla języka Rust, oparty o bibliotekę **Macroquad**. Aby rozpocząć, utwórz nowy projekt \`cargo new moja_gra\` i dodaj poniższe zależności do pliku \`Cargo.toml\`:`,
      codeExamples: [
        {
          title: "Cargo.toml",
          code: `[package]
name = "moja_gra"
version = "0.1.0"
edition = "2024"

[dependencies]
rusted_engine = "1.0.0"
macroquad = "0.4"`,
          language: "toml",
          collapsible: false
        }
      ]
    },
    {
      id: "quickstart-code",
      title: "Kod Uruchomieniowy (main.rs)",
      content: `Każda gra w RustedEngine składa się z konfiguracji silnika \`Engine::conf\`, sceny \`Scene\` oraz obiektów w \`world!\`:`,
      codeExamples: [
        {
          title: "main.rs",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

#[macroquad::main(Engine::conf("Moja Gra", 1280, 720))]
async fn main() {
    let hero = Sprite::solid(vec2(100.0, 100.0), vec2(32.0, 32.0), BLUE)
        .update(|hero, ctx| {
            hero.position += ctx.input.wasd() * 250.0 * ctx.dt();
        });

    let main_scene = Scene::new("Game", world! {
        objects: [hero],
    });

    let mut engine = Engine::new(main_scene);
    engine.run().await;
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const lifecycleDoc = {
  id: "lifecycle",
  title: "2. ⏱️ Cykl Życia Klatki (Lifecycle)",
  description: "Dokładna, deterministyczna kolejność wykonywania 8 faz w pojedynczej klatce silnika gry.",
  sections: [
    {
      id: "lifecycle-order",
      title: "Kolejność Wykonywania Faz w Klatce",
      content: `W każdej klatce RustedEngine wykonuje następujące etapy w ściśle zdefiniowanej kolejności:

1. **Input & Camera**: Odczyt myszy/klawiatury, remapowanie współrzędnych i przeliczenie macierzy kamery.
2. **Triggers**: Ewaluacja reguł w \`TriggerSystem\` na starcie klatki.
3. **World Objects (\`objects\`)**: Aktualizacja bytów w świecie (gracz, przeciwnicy, pociski). Encje mogą emitować zdarzenia.
4. **UI Objects (\`ui_objects\`)**: Aktualizacja elementów interfejsu w przestrzeni ekranu.
5. **Logic Controllers (\`logic\`)**: **Kluczowa faza**: kontrolery logiki odbierają 100% zdarzeń wyemitowanych w krokach 3 i 4 w tej samej klatce bez opóźnienia.
6. **Sequences**: Aktualizacja maszyn stanów cutscenek i animacji tween.
7. **Deferred Operations**: Spawnowanie obiektów z kolejki \`ctx.spawn\` oraz usunięcie obiektów z \`obj.destroy()\`.
8. **Render Pass**: Rysowanie świata do bufora VRT, kompozycja letterboxu i rysowanie tekstów natywnych.`,
      codeExamples: [
        {
          title: "Dlaczego kolejność ma znaczenie?",
          code: `// Gracz w fazie 'objects' emituje zdarzenie zgonu:
ctx.emit(PlayerDied { score: 1200 });

// Kontroler w fazie 'logic' odbiera to zdarzenie JESZCZE W TEJ SAMEJ KLATCE:
for death in ctx.poll::<PlayerDied>() {
    ctx.switch_scene("GameOver");
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const contextDoc = {
  id: "context",
  title: "3. 📦 Obiekt Context & Skróty (ctx)",
  description: "Centralny obiekt przekazywany do każdego update'u, dający błyskawiczny dostęp do wszystkich podsystemów.",
  sections: [
    {
      id: "context-methods",
      title: "Metody i Pola Obiektu Context",
      content: `\`Context\` (\`&mut ctx\`) to Twoje główne narzędzie w kodzie obiektów:

- **Delta Time & Czas**: \`ctx.dt()\`, \`ctx.set_time_scale(0.5)\`, \`ctx.pause()\`, \`ctx.toggle_pause()\`.
- **Spawnowanie**: \`ctx.spawn(obj)\`, \`ctx.spawn_ui(widget)\`, \`ctx.spawn_logic_fn(|ctx| ...)\`.
- **Mysz & Kursor**: \`ctx.mouse_world()\` (pozycja w świecie 2D), \`ctx.mouse_pressed(Side::Left)\`.
- **Stan Gry**: \`ctx.increment("score", 10)\`, \`ctx.get_int("score")\`, \`ctx.flag("gate_open")\`.
- **Zdarzenia**: \`ctx.emit(Event)\`, \`ctx.poll::<Event>()\`, \`ctx.emit_signal("boom")\`.
- **Dźwięk**: \`ctx.play_sound("coin")\`, \`ctx.play_sound_varied("step", 0.08, 0.1)\`.
- **Kamera**: \`ctx.camera.shake(0.2, 5.0)\`, \`ctx.camera.follow(target, 4.0, ctx.dt())\`.`,
      codeExamples: [
        {
          title: "Wygodne Użycie Metod Context",
          code: `// Jedna linijka: odczyt myszy, dźwięk z wariacją i inkrementacja punktów
if ctx.mouse_pressed(Side::Left) {
    let score = ctx.increment("score", 50);
    ctx.play_sound_varied("click_sfx", 0.08, 0.1);
    ctx.set_ui_text("score_label", &format!("Punkty: {}", score));
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const worldLayersDoc = {
  id: "world-layers",
  title: "4. 🌍 Warstwy Świata (Objects, UI & Logic)",
  description: "Trójwarstwowa architektura świata gry World: separacja obiektów 2D, interfejsu ekranowego i kontrolerów logiki.",
  sections: [
    {
      id: "three-layers",
      title: "Podział na 3 Warstwy Świata",
      content: `Każdy świat gry (\`World\`) w RustedEngine dzieli byty na trzy niezależne warstwy:

| Warstwa | Kolekcja | Transformacja Kamery | Zastosowanie |
|---|---|---|---|
| **\`objects\`** | \`world.add(obj)\` | ✅ Tak (pozycja, zoom, obrót, shake) | Duszki, postacie, potwory, tilemapy, cząsteczki, pociski |
| **\`ui_objects\`** | \`world.add_ui(widget)\` | ❌ Nie (przestrzeń ekranu / Screen Space) | Panele, przyciski, paski HP, dialogi, minimapy |
| **\`logic\`** | \`world.add_logic(ctrl)\` | ❌ Brak renderowania (faza dyspozytorska) | Spawner fal, kontroler zasad gry, dispatcher zdarzeń |`,
      codeExamples: [
        {
          title: "Definiowanie Warstw w Makrze world!",
          code: `let world = world! {
    objects: [
        player,
        map,
    ],
    ui: [
        health_bar,
        score_text,
    ],
    logic: [
        enemy_spawner,
        game_rules_controller,
    ],
};`,
          collapsible: false
        }
      ]
    }
  ]
};

export const behaviorsDoc = {
  id: "behaviors",
  title: "5. 🎭 System Zachowań (Behavior & Deref)",
  description: "Generyczny wrapper Behavior<Inner, Data> łączący obiekt rysowalny z prywatnymi danymi i dostępem przez Deref.",
  sections: [
    {
      id: "behavior-wrapper",
      title: "Struktura Behavior i Blanket Deref",
      content: `\`Behavior<Inner, Data>\` to uniwersalny wrapper pozwalający podpiąć do dowolnego duszka lub widgetu własną strukturę danych i domknięcie logiczne:

### 💡 Automatyczny Blanket Deref / DerefMut:
Dzięki implementacji cech \`Deref\` i \`DerefMut\` masz bezpośredni dostęp do pól obiektu wewnętrznego (\`hero.position\`, \`hero.color\`) oraz do prywatnych danych (\`hero.data.hp\`)!`,
      codeExamples: [
        {
          title: "Tworzenie Obiektu z Własnymi Danymi i Update Closure",
          code: `struct GoblinData {
    pub hp: i32,
    pub patrol_speed: f32,
}

let goblin = Sprite::solid(vec2(200.0, 150.0), vec2(24.0, 24.0), GREEN)
    .with_data(GoblinData { hp: 40, patrol_speed: 60.0 })
    .update(|goblin, ctx| {
        // Dostęp do Sprite przez Deref:
        goblin.position.x += goblin.data.patrol_speed * ctx.dt();

        // Dostęp do prywatnych danych:
        if goblin.data.hp <= 0 {
            goblin.destroy();
        }
    });`,
          collapsible: false
        }
      ]
    }
  ]
};
