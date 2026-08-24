// ============================================================================
// 4. GRAFIKA, UI & AUDIO
// ============================================================================

export const cameraDoc = {
  id: "camera",
  title: "18. 📹 Kamera 2D, Śledzenie & Shake (Camera)",
  description: "Kontroler kamery 2D, płynne śledzenie, wyprzedzanie ruchu postaci (look-ahead), wstrząsy ekranu oraz culling widoku.",
  sections: [
    {
      id: "camera-main",
      title: "Kontroler Kamery 2D (Camera)",
      content: `Struktura **\`Camera\`** (\`ctx.camera\`) steruje widokiem w przestrzeni świata 2D:

- **\`ctx.camera.target = pos\`**: Bezpośrednie ustawienie punktu skupienia kamery.
- **\`ctx.camera.follow(target, speed, dt)\`**: Płynne podążanie za graczem z wygładzaniem liniowym (\`lerp\`).
- **\`ctx.camera.look_ahead(pos, vel, dist, speed, dt)\`**: Wyprzedzanie kamery w kierunku biegu postaci.
- **\`ctx.camera.shake(duration, intensity)\`**: Dynamiczny wstrząs ekranu przy wybuchach i uderzeniach.
- **\`ctx.camera.is_on_screen(pos, margin)\`**: Sprawdza, czy dany punkt znajduje się w kadrze monitora (*Frustum Culling*).`,
      codeExamples: [
        {
          title: "Kompletny Kontroler Kamery z Wyprzedzaniem i Wstrząsami",
          code: `// 1. Płynne wyprzedzanie ruchu gracza o 75px:
ctx.camera.look_ahead(player.position, player.velocity, 75.0, 4.5, ctx.dt());

// 2. Wstrząs kamery po otrzymaniu obrażeń:
if player.data.took_damage {
    ctx.camera.shake(0.25, 6.0);
    player.data.took_damage = false;
}

// 3. Optymalizacja culling: nie aktualizuj AI wrogów poza ekranem:
if !ctx.camera.is_on_screen(enemy.position, 100.0) {
    return; // Pomiń logikę gdy wróg jest daleko poza kadrem
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const virtualResolutionDoc = {
  id: "virtual-resolution",
  title: "19. 📺 Wirtualna Rozdzielczość Retro & Skalowanie",
  description: "Dwufazowy pipeline renderowania: bufor wirtualny pixel-art, skalowanie ze stałymi proporcjami i natywne fonty.",
  sections: [
    {
      id: "virtual-res-main",
      title: "Dwufazowy Pipeline Renderowania",
      content: `Włączenie **\`Engine::with_virtual_resolution(vw, vh)\`** pozwala renderować grę w stałej rozdzielczości pikselowej (np. \`480 × 270\` lub \`320 × 180\`) z automatycznym dopasowaniem do dowolnego monitora:

1. **Bufor Wirtualny (\`SceneRenderTarget\`)**: Świat gry jest rysowany w rozdzielczości retro z filtrowaniem \`Nearest\`.
2. **Letterboxing**: Obraz jest skalowany na środek okna z zachowaniem proporcji *aspect ratio*.
3. **Natywne Fonty**: Teksty interfejsu mogą być rysowane w pełnej rozdzielczości monitora dla idealnej ostrości.`,
      codeExamples: [
        {
          title: "Konfiguracja Rozdzielczości Wirtualnej i Skalowania Całkowitoliczbowego",
          code: `Engine::new(scenes)
    .with_virtual_resolution(480.0, 270.0) // 16:9 Pixel-Art
    .with_integer_scaling(true)           // Idealnie ostre, jednolite piksele bez zniekształceń
    .with_letterbox_color(DARKGRAY)       // Kolor pasów po bokach okna
    .run()
    .await;`,
          collapsible: false
        }
      ]
    }
  ]
};

export const tilemapsDoc = {
  id: "tilemaps",
  title: "23. 🧱 Siatki Kafelkowe & Rampy 45° (Tilemap)",
  description: "Wczytywanie poziomów z ASCII, kształty kolizji TileCollision (rampy 45°, platformy OneWay, półpłytki) i przyklejanie do zboczy.",
  sections: [
    {
      id: "tilemaps-main",
      title: "Zaawansowane Kształty Kolizji Kafelków",
      content: `\`Tilemap\` obsługuje arkusze kafelków oraz dedykowany enum kształtów kolizyjnych **\`TileCollision\`**:

- **\`TileCollision::Solid\`**: Pełna bryła AABB (\`16×16\`).
- **\`TileCollision::SlopeUpRight\` / \`SlopeUpLeft\`**: 45° rampy wspinające (ruch w prawo/lewo).
- **\`TileCollision::OneWay\`**: Platforma jednokierunkowa (przenikalna od dołu, solidna od góry).
- **\`TileCollision::HalfBottom\`**: Półpłytka (*half-slab*).
- **\`map.get_slope_surface_y(pos) -> Option<f32>\`**: Oblicza dokładną wysokość powierzchni rampy w świecie (do biegania po zboczach bez drgań).
- **\`map.collides_oneway_landing(rect, prev_y) -> Option<f32>\`**: Wykrywa lądowanie stóp postaci na platformie OneWay.

> [!TIP]
> Zobacz kompletny kod fizyki postaci na rampach w dziale: [32. 🏃 Platformówka 2D](#doc:game-platformer)`,
      related: [
        {
          docId: "game-platformer",
          title: "32. 🏃 Platformówka 2D",
          description: "Zobacz pełny kod kontrolera gracza ze wspinaniem się po rampach 45°."
        },
        {
          docId: "camera",
          title: "18. 📹 Kamera 2D, Śledzenie & Shake",
          description: "Dowiedz się jak skonfigurować kamerę śledzącą gracza na tilemapie."
        }
      ],
      codeExamples: [
        {
          title: "Wczytywanie Mapy ASCII i Fizyka Postaci na Rampach",
          code: `let mut map = Tilemap::new(sheet, vec2(16.0, 16.0), 32, 18)
    .with_solid_tiles([1])                               // Pełna ściana '#'
    .with_tile_collision(2, TileCollision::SlopeUpRight) // Rampa wznosząca '/'
    .with_tile_collision(3, TileCollision::SlopeUpLeft)  // Rampa opadająca '\\'
    .with_tile_collision(4, TileCollision::OneWay);      // Platforma jednokierunkowa '='

map.load_from_ascii("
####################
#    ===           #
#         /\\       #
####################
", |c| match c {
    '#' => Some(1),
    '/' => Some(2),
    '\\\\' => Some(3),
    '=' => Some(4),
    _ => None,
});

// W update postaci:
// 1. Sprawdzenie rampy i przyklejenie stóp do powierzchni:
let foot_pos = player.position + vec2(8.0, 16.0);
if let Some(surface_y) = map.get_slope_surface_y(foot_pos) {
    player.position.y = surface_y - 16.0;
    player.data.velocity.y = 0.0;
    player.data.is_grounded = true;
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const particlesDoc = {
  id: "particles",
  title: "21. ✨ System Cząsteczek 2D (ParticleEmitter)",
  badge: "Visual Effects",
  description: "Zaawansowany emiter cząsteczek 2D z integracją grawitacji, stopniowym wygasaniem alfy i rozmiaru, fizyką prędkości, emisją ciągłą i wybuchową oraz auto-destrukcją.",
  sections: [
    {
      id: "particles-overview",
      title: "Architektura i Fizyka Cząsteczek",
      content: `System cząsteczek w RustedEngine opiera się na strukturach **\`ParticleEmitter\`** oraz **\`Particle\`**.

### Fizyka i Cykl Życia Cząsteczki:
Każda pojedyncza cząsteczka w buforze posiada:
- **\`position: Vec2\`** — aktualną pozycję w świecie 2D.
- **\`velocity: Vec2\`** — wektor prędkości (aktualizowany co klatkę o \`gravity * dt\`).
- **\`lifetime / max_lifetime: f32\`** — czas pozostały do wygasznięcia.
- **Wygaszanie promienia (Size Ratio)** — promień cząsteczki rysowany jest jako \`size * (lifetime / max_lifetime)\` — zmniejsza się płynnie do zera.
- **Zzanikanie przezroczystości (Alpha Fade)** — przezroczystość koloru skaluje się z pozostałym czasem: \`color.a *= ratio\`.

### 2 Tryby Emisji:
1. **Emisja Wybuchowa (\`emit_burst\`)** — natychmiastowe wystrzelenie $N$ cząsteczek we wszystkich kierunkach (np. eksplozje, trafienia mieczem, iskry).
2. **Emisja Ciągła (\`emit_continuous\`)** — akumulator emitujący $N$ cząsteczek na sekundę (np. dym z komina, ogień silnika, deszcz, pył).

### Automatyczne Sprzątanie Pamięci (Auto-Destroy):
Flaga **\`with_auto_destroy()\`** instruuje silnik, że emiter ma zostać automatycznie usunięty ze świata gry po wygaszeniu wszystkich wyemitowanych cząsteczek (\`is_destroyed() == true\`). Eliminuje to potrzebę ręcznego usuwania obiektów efektów!`,
      codeExamples: [
        {
          title: "1. Wybuch Iskrzenia po Trafieniu (Radial Burst)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

// Tworzymy jednorazowy emiter iskier opadających z grawitacją:
let mut sparks = ParticleEmitter::new()
    .with_gravity(vec2(0.0, 250.0)) // Grawitacja ciągnie iskry w dół
    .with_auto_destroy();           // Auto-delete po zgaśnięciu iskier

// Wystrzel 30 cząsteczek o prędkości 80..220 px/s, promieniu 3.5px i czasie życia 0.45s:
sparks.emit_burst(hit_position, 30, YELLOW, (80.0, 220.0), 3.5, 0.45);

// Spawnowanie w świecie — emiter usunie się sam po 0.45s:
ctx.spawn(sparks);`,
          collapsible: false
        },
        {
          title: "2. Ciągły Ślad Dymu i Ognia za Rakietą (Continuous Emission)",
          code: `// Emiter ciągły podpięty pod pocisk rakietowy:
pub struct RocketData {
    pub emitter: ParticleEmitter,
}

// W update() rakiety:
let smoke_color = Color::new(0.6, 0.6, 0.6, 0.8);

// Emituj 40 cząsteczek na sekundę z tyłu rakiety:
rocket.data.emitter.emit_continuous(
    rocket.position - rocket.facing * 12.0, // Pozycja wylotu silnika
    40.0,                                   // Rate: 40 cząsteczek/s
    ctx.dt(),
    smoke_color,
    (15.0, 40.0),                           // Wolny dym
    4.0,                                    // Promień 4px
    0.8                                     // Czas trwania 0.8s
);

// Aktualizacja emitera zachodzi automatycznie jeśli dodasz go do świata,
// lub ręcznie wywołując emitter.update(ctx) wewnątrz encji rakiety.`,
          collapsible: false
        },
        {
          title: "3. Magiczny Pył i Efekt Level-Up",
          code: `// Pierścień złotych gwiazdek wznoszących się w górę:
let mut level_up_fx = ParticleEmitter::new()
    .with_gravity(vec2(0.0, -90.0)) // Ujemna grawitacja = cząsteczki lecą w górę!
    .with_auto_destroy();

level_up_fx.emit_burst(player.position, 60, GOLD, (40.0, 120.0), 5.0, 1.2);
ctx.play_sound("level_up_fanfare");
ctx.spawn(level_up_fx);`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "particles-api",
      title: "API Reference: ParticleEmitter",
      apiTable: {
        headers: ["Metoda / Konstruktor", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["ParticleEmitter::new()", "brak", "ParticleEmitter", "Tworzy pusty emiter cząsteczek z zerową grawitacją."],
          [".with_gravity(vec2)", "Vec2", "Self", "Ustawia wektor grawitacji (np. vec2(0.0, 200.0))."],
          [".with_auto_destroy()", "brak", "Self", "Włącza automatyczne niszczenie obiektu gdy brak cząstek."],
          [".set_auto_destroy(bool)", "bool", "()", "Przełącza tryb auto-destroy."],
          [".emit_burst(pos, count, color, speed_range, size, lifetime)", "Vec2, usize, Color, (f32,f32), f32, f32", "()", "Emituje radjalny wybuch N cząsteczek z podanymi parametrami."],
          [".emit_continuous(pos, rate_per_sec, dt, color, ...)", "Vec2, f32, f32, Color, ...", "()", "Emituje ciągły strumień cząsteczek z zadana częstotliwością per sekunda."],
          [".active_particles_count()", "brak", "usize", "Zwraca liczbę aktualnie żywych cząsteczek w emiterze."],
          [".is_destroyed()", "brak", "bool", "Zwraca true gdy auto_destroy=true i wszystkie cząstki wygasły."],
        ]
      }
    }
  ]
};

export const uiWidgetsDoc = {
  id: "ui-widgets",
  title: "25. 🖥️ Katalog Widgetów UI & BBCode",
  badge: "UI System",
  description: "Kompletna architektura interfejsu użytkownika: dualny system współrzędnych, bogaty katalog widgetów, BBCode oraz Desktop Window Manager (PanelManager).",
  sections: [
    {
      id: "ui-architecture",
      title: "Architektura Interfejsu & Dualny System Współrzędnych",
      content: `System UI w RustedEngine został zaprojektowany z myślą o bezproblemowej integracji z grami pikselowymi oraz aplikacjami narzędziowymi (edytory, debuggery).

### ui::Panel vs panel_manager::PanelManager
W silniku istnieją dwa moduły o nazwie Panel, które pełnią zupełnie inne role:

| Cecha | \`ui::Panel\` | \`panel_manager::PanelManager\` |
| :--- | :--- | :--- |
| **Rola** | Statyczny kontener grupujący widgety w layoucie | Menedżer ruchomych okien pulpitu (*Desktop Window Manager*) |
| **Z-order** | Stały (według kolejności w drzewie UI) | Dynamiczny (kliknięcie wynosi okno na wierzch stosu) |
| **Przesuwanie (Drag)** | Statyczny kontener | Pełne wsparcie przesuwania nagłówkiem myszy |
| **Zmiana Rozmiaru** | Stały lub ustalany przez zawartość | Opcjonalny uchwyt zmiany rozmiaru w narożniku |
| **Zastosowanie** | Układanie przycisków i pól wewnątrz pojedynczego panelu | Wielo-okienkowy interfejs narzędziowy lub okna ekwipunku |

> [!TIP]
> **Złota zasada**: Używaj \`ui::Panel\` wewnątrz layoutów flexbox. Używaj \`PanelManager\` (dodawanego do świata przez \`world.add_ui\`) jako nadrzędnego zarządcy okien!`,
    },
    {
      id: "dual-coordinates",
      title: "Dualny System Współrzędnych & Zero-Blur Text Rendering",
      content: `Gdy włączona jest wirtualna rozdzielczość (\`Engine::with_virtual_resolution(vw, vh)\`), obiekty UI dzielą się na dwie grupy:

1. **Przestrzeń Wirtualna (\`is_text_layer() == false\`)**:
   - Dotyczy: \`Panel\`, \`Image\`, \`Button\`, \`ProgressBar\`, \`TextField\`, \`Slider\`, \`Checkbox\`.
   - Renderowane do bufora \`SceneRenderTarget\` (\`vrt.target\`) z filtrowaniem \`Nearest\`.
   - Hit-testing myszy automatycznie przelicza współrzędne ekranu na wirtualne przez \`ctx.input.mouse_position()\`.
2. **Natywna Przestrzeń Ekranu (\`is_text_layer() == true\`)**:
   - Dotyczy: \`Text\`, \`TextLog\`, \`RichText\`.
   - Renderowane bezpośrednio na ramce okna systemu po przeskalowaniu świata. Daje to **100% ostrości czcionek TTF bez pikselowego rozmycia**!`,
    },
    {
      id: "widgets-overview",
      title: "Katalog Widgetów UI",
      content: `Kompletny zestaw gotowych do użycia komponentów interfejsu graficznego:

### Tekst, BBCode RichText & Maszyna do Pisania
1. **Podstawowy \`Text\`**: Wspiera automatyczne zawijanie wierszy (\`with_max_width\`), cienie tekstu, wyrównanie (\`TextAlign::Left, Center, Right\`) oraz animację maszyny do pisania (\`with_typewriter(speed)\`).
2. **BBCode \`RichText\`**: Parser znaczników kolorów w tekście. Wspiera kolory nazwane oraz kody szesnastkowe:
   \`"Zdobyłeś [color=gold]100 złota[/color] i [color=#00FF00]Legendarny Miecz[/color]!"\`.

### Kontrolki Interaktywne (Button, Slider, Checkbox, TextField, ProgressBar)
- **\`Button\`**: Obsługuje stany normal, hover, pressed, disabled, dźwięki kliknięcia oraz 9-slice tła.
- **\`Slider\`**: Suwak wartości float w zadanym zakresie (np. \`0.0..=100.0\`) z opcjonalnym krokiem \`step\`.
- **\`Checkbox\`**: Przełącznik logiczny prawda/fałsz z konfigurowalnym rozmiarem i kolorami zaznaczenia.
- **\`TextField\`**: Pole wprowadzania tekstu z obsługą klawiatury, backspace, kursora, focusu i tekstu zastępczego (*placeholder*).
- **\`ProgressBar\`**: Pasek postępu z płynną animacją lerp wypełnienia oraz trybami odsłaniania (\`RevealMode::LeftToRight, TopToBottom, Radial\`).

### Konsola Zdarzeń TextLog
Komponent \`TextLog\` służy jako czat gry, log walki lub konsola deweloperska. Automatycznie buforuje linie tekstu, usuwa najstarsze po przekroczeniu limitu (\`with_max_lines(100)\`) i obsługuje przewijanie kółkiem myszy (\`with_scrollable(true)\`).`,
      codeExamples: [
        {
          title: "Tekst z Maszyną do Pisania i BBCode",
          code: `let intro_dialog = Text::new(
    "Zdobyłeś [color=gold]500 Punktów[/color]! Uważaj na [color=red]Bossa[/color]!",
    vec2(20.0, 40.0),
    22.0,
    WHITE
)
.with_typewriter(0.04) // prędkość 0.04s na znak
.with_max_width(400.0);`,
          collapsible: false
        }
      ]
    },
    {
      id: "panel-manager",
      title: "Menedżer Okien Pulpitu (PanelManager)",
      content: `Struktura \`PanelManager\` dostarcza pełnoprawny menedżer okien pulpitu (*Desktop Windowing System*):

- **Dynamiczny Stos Z-Order**: Kliknięcie dowolnego miejsca w oknie natychmiast przenosi je na sam wierzch.
- **Pasek Tytułowy & Przeciąganie**: Okna z nagłówkiem można płynnie przeciągać myszą po całym ekranie.
- **Uchwyt Zmiany Rozmiaru**: Przeciąganie prawego dolnego narożnika pozwala na dynamiczną zmianę wymiarów okna.
- **Przyciski Minimalizacji i Zamknięcia**: Wbudowane przyciski sterujące stanem okna.`,
      codeExamples: [
        {
          title: "Tworzenie Okna Ekwipunku w PanelManager",
          code: `use rusted_engine::prelude::*;

let mut pm = PanelManager::new();

// Dodanie ruchomego okna ekwipunku
pm.add_panel(
    Panel::new("Ekwipunek", vec2(100.0, 100.0), vec2(300.0, 400.0))
        .with_draggable(true)
        .with_resizable(true)
        .with_content(column![
            Text::new("Twoje Przedmioty:", vec2(0.0, 0.0), 16.0, WHITE),
            Button::new(vec2(0.0, 0.0), vec2(260.0, 32.0), "Mikstura Zdrowia")
        ])
);

world.add_ui(pm);`,
          collapsible: false
        }
      ]
    },
    {
      id: "ui-api-table",
      title: "API Reference: System UI",
      content: `| Komponent | Kluczowe Metody | Opis |
| :--- | :--- | :--- |
| \`UiPanel\` | \`new, with_padding, with_child, anchor\` | Statyczny kontener grupujący layout flexbox. |
| \`Column / Row\` | \`new, with_alignment, fill_parent\` | Pionowy i poziomy kontener flexbox. |
| \`Button\` | \`new, with_color, with_hover_color, click_ctx\` | Przycisk z obsługą stanów interakcji. |
| \`TextField\` | \`new, with_placeholder, get_text, set_text\` | Pole edycji tekstu z obsługą klawiatury. |
| \`Slider\` | \`new, with_range, value, set_value\` | Pasek suwaka wartości float. |
| \`Checkbox\` | \`new, is_checked, set_checked\` | Przełącznik logiczny boolean. |
| \`ProgressBar\` | \`new, set_progress, with_reveal_mode\` | Animowany pasek postępu / zdrowia. |
| \`PanelManager\` | \`new, add_panel, bring_to_front, get_panel\` | Nadrzędny menedżer ruchomych okien pulpitu. |`,
    }
  ]
};

export const uiLayoutDoc = {
  id: "ui-layout",
  title: "26. 📐 Silnik Layoutu Flexbox (Column, Row, Grid)",
  description: "Deklaratywny silnik layoutu Flexbox inspirowany frameworkiem Flutter, kontenery Column, Row, Grid, marginesy, padding i osie.",
  sections: [
    {
      id: "flexbox-layout",
      title: "Deklaratywny Silnik Layoutu (Flexbox)",
      content: `System layoutu RustedEngine czerpie inspirację z frameworka Flutter, oferując elastyczne układanie elementów w pionie, poziomie i siatkach:

### Główne Kontenery:
- **\`Column\`** (alias \`VBox\`): Układa elementy pionowo (jeden pod drugim).
- **\`Row\`** (alias \`HBox\`): Układa elementy poziomo (obok siebie).
- **\`Grid\`**: Układa elementy w siatce o podanej liczbie kolumn (\`Grid::new(cols)\`).
- **\`Container\`**: Pojedynczy kontener opakowujący z marginesami, paddingiem i wyrównaniem.

### Makra Pomocnicze:
- \`column![widget1, widget2]\`: Błyskawiczny skrót do utworzenia \`Column\`.
- \`row![widget1, widget2]\`: Błyskawiczny skrót do utworzenia \`Row\`.
- \`ui_vec![widget1, widget2]\`: Konwertuje widgety na \`Vec<Box<dyn Object>>\`.`,
      codeExamples: [
        {
          title: "Menu Ustawień w Układzie Flexbox",
          code: `let menu_panel = UiPanel::new(vec2(0.0, 0.0), vec2(320.0, 260.0))
    .anchor(UIAnchor::Center)
    .with_padding(Padding::all(16.0))
    .with_child(column![
        Text::new("USTAWIENIA GRY", vec2(0.0, 0.0), 20.0, GOLD),
        Gap::height(12.0),
        row![
            Text::new("Głośność SFX:", vec2(0.0, 0.0), 16.0, WHITE),
            Slider::new(vec2(0.0, 0.0), vec2(140.0, 20.0), 0.0..=1.0, 0.8)
                .with_tag("slider_sfx")
        ],
        Gap::height(10.0),
        Button::new(vec2(0.0, 0.0), vec2(288.0, 36.0), "ZAPISZ I WYJDŹ")
            .with_tag("btn_save")
    ]);`,
          collapsible: false
        }
      ]
    },
    {
      id: "layout-alignment",
      title: "Wyrównania, Osiowość & Model Pudełkowy",
      content: `- **Wyrównanie Osi Głównej (\`MainAxisAlignment\`)**: \`Start\`, \`Center\`, \`End\`, \`SpaceBetween\`, \`SpaceAround\`, \`SpaceEvenly\`.
- **Wyrównanie Osi Poprzecznej (\`CrossAxisAlignment\`)**: \`Start\`, \`Center\`, \`End\`, \`Stretch\`.
- **Wypełnianie Rodzica (\`fill_parent\`)**: \`widget.set_fill_parent(true)\` powoduje automatyczne rozciągnięcie elementu do pełnej szerokości lub wysokości kontenera nadrzędnego.
- **Model Pudełkowy**:
  - \`Padding::all(val)\` / \`Padding::symmetric(h, v)\`: Wewnętrzny odstęp kontenera.
  - \`Margin::all(val)\` / \`Margin::new(top, right, bottom, left)\`: Zewnętrzny margines widgetu.
  - \`Gap::width(px)\` / \`Gap::height(px)\`: Przezroczysty separator przestrzenny między elementami.`,
    }
  ]
};

export const audioSfxDoc = {
  id: "audio-sfx",
  title: "28. 🎵 Audio, SFX & Zasoby (Sound)",
  description: "Odtwarzanie dźwięków z losową wariacją tonu, ochrona przed przesterowaniem (throttler) oraz muzyka w tle.",
  sections: [
    {
      id: "audio-main",
      title: "Udźwiękowienie Gry",
      content: `- **\`ctx.play_sound("nazwa")\`**: Standardowe odtworzenie dźwięku.
- **\`ctx.play_sound_varied("nazwa", pitch_var, vol_var)\`**: Dodaje losową wariację tonu i głośności (eliminuje monotonię powtarzalnych kroków/strzałów).
- **\`ctx.play_sound_throttled("nazwa", min_interval)\`**: Zabezpiecza przed jednoczesnym odtworzeniem wielu tych samych dźwięków (np. zbieranie 20 monet naraz).`,
      codeExamples: [
        {
          title: "Wariacja Dźwięku i Przestrzenne Tłumienie Odległości",
          code: `// 1. Dźwięk kroków z subtelną wariacją:
ctx.play_sound_varied("step_sfx", 0.08, 0.1);

// 2. Zbieranie monet (dźwięk może zagrać maksymalnie co 40ms):
ctx.play_sound_throttled("coin_pickup", 0.04);

// 3. Przestrzenne tłumienie głośności wybuchu od gracza:
let dist = enemy.position.distance(ctx.camera.target);
if dist < 600.0 {
    let vol = (1.0 - dist / 600.0).clamp(0.1, 1.0);
    ctx.play_sound_with_volume("explosion", vol);
}`,
          collapsible: false
        }
      ]
    }
  ]
};
