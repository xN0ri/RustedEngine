// ============================================================================
// 4. GRAFIKA, UI & AUDIO
// ============================================================================

export const cameraDoc = {
  id: "camera",
  title: "18. 📹 Kamera 2D, Śledzenie & Shake (Camera)",
  description: "Kontroler kamery 2D, metody budownicze (with_target, with_zoom), płynne śledzenie, wyprzedzanie ruchu postaci (look-ahead), wstrząsy ekranu oraz culling widoku.",
  sections: [
    {
      id: "camera-main",
      title: "Kontroler Kamery 2D (Camera)",
      content: `Struktura **\`Camera\`** (\`ctx.camera\`) steruje widokiem w przestrzeni świata 2D:

### Metody Łańcuchowe (Fluent Builder):
- **\`Camera::new().with_target(pos)\`** / **\`.with_pos(pos)\`**: Ustawia punkt skupienia kamery.
- **\`.with_zoom(scale)\`**: Ustawia powiększenie widoku (np. \`2.0\` dla widoku zbliżonego).
- **\`.with_rotation(rad)\`**: Ustawia kąt obrotu kamery w radianach.

### Dynamiczne Sterowanie w Pętli Gry:
- **\`ctx.camera.follow(target, speed, dt)\`**: Płynne podążanie za graczem z wygładzaniem liniowym (\`lerp\`).
- **\`ctx.camera.look_ahead(pos, vel, dist, speed, dt)\`**: Wyprzedzanie kamery w kierunku biegu postaci.
- **\`ctx.camera.shake(duration, intensity)\`**: Dynamiczny wstrząs ekranu przy wybuchach i uderzeniach.
- **\`ctx.camera.is_on_screen(pos, margin)\`**: Sprawdza, czy dany punkt znajduje się w kadrze monitora (*Frustum Culling*).`,
      codeExamples: [
        {
          title: "Kompletny Kontroler Kamery z Wyprzedzaniem i Wstrząsami",
          code: `// 1. Inicjalizacja kamery z powiększeniem:
let mut cam = Camera::new()
    .with_target(player.position)
    .with_zoom(1.5);

// 2. Płynne wyprzedzanie ruchu gracza o 75px:
ctx.camera.look_ahead(player.position, player.velocity, 75.0, 4.5, ctx.dt());

// 3. Wstrząs kamery po wybuchu bomby / uderzeniu:
if player.data.took_damage {
    ctx.camera.shake(0.25, 6.0); // 6px siły przez 0.25s
    player.data.took_damage = false;
}

// 4. Optymalizacja culling: nie aktualizuj AI wrogów poza ekranem:
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
  badge: "UI Subsystem",
  description: "Kompletna architektura interfejsu użytkownika: dualny system współrzędnych, Button, TextField, Slider, Checkbox, ProgressBar, Text, BBCode RichText oraz TextLog.",
  sections: [
    {
      id: "ui-architecture",
      title: "Architektura Interfejsu & Dualny System Współrzędnych",
      content: `System UI w RustedEngine został zaprojektowany z myślą o bezproblemowej integracji z grami pikselowymi oraz aplikacjami narzędziowymi (edytory, edytory poziomów, debuggery).

### ui::Panel vs panel_manager::PanelManager
W silniku istnieją dwa moduły o nazwie **Panel**, które pełnią zupełnie inne role w architekturze aplikacji:

| Cecha | \`ui::Panel\` | \`panel_manager::PanelManager\` |
| :--- | :--- | :--- |
| **Rola** | Statyczny kontener grupujący widgety w layoucie | Menedżer ruchomych okien pulpitu (*Desktop Window Manager*) |
| **Z-order** | Stały (według kolejności w drzewie UI) | Dynamiczny (kliknięcie wynosi okno na wierzch stosu) |
| **Przesuwanie (Drag)** | Statyczny kontener | ✅ Pełne wsparcie przesuwania nagłówkiem myszy |
| **Zmiana Rozmiaru** | Stały lub ustalany przez zawartość | ✅ Opcjonalny uchwyt zmiany rozmiaru w narożniku |
| **Zastosowanie** | Układanie przycisków i pól wewnątrz pojedynczego panelu | Wielo-okienkowy interfejs narzędziowy lub okna ekwipunku |

> [!TIP]
> **Złota zasada**: Używaj \`ui::Panel\` wewnątrz layoutów flexbox do grupowania elementów. Używaj \`PanelManager\` (dodawanego do świata przez \`world.add_ui\`) jako nadrzędnego zarządcy okien pulpitowych!`,
    },
    {
      id: "dual-coordinates",
      title: "Dualny System Współrzędnych & Zero-Blur Text Rendering",
      content: `Gdy włączona jest wirtualna rozdzielczość (\`Engine::with_virtual_resolution(vw, vh)\`), obiekty UI dzielą się automatycznie na dwie grupy renderowania:

1. **Przestrzeń Wirtualna (\`is_text_layer() == false\`)**:
   - Dotyczy: \`Panel\`, \`Image\`, \`Button\`, \`ProgressBar\`, \`TextField\`, \`Slider\`, \`Checkbox\`.
   - Renderowane do bufora \`SceneRenderTarget\` (\`vrt.target\`) z filtrowaniem \`Nearest\`.
   - Hit-testing myszy automatycznie przelicza współrzędne ekranu na wirtualne przez \`ctx.input.mouse_position()\`.
2. **Natywna Przestrzeń Ekranu (\`is_text_layer() == true\`)**:
   - Dotyczy: \`Text\`, \`TextLog\`, \`RichText\`.
   - Renderowane bezpośrednio na ramce okna systemu po przeskalowaniu świata. Daje to **100% ostrości czcionek TTF bez pikselowego rozmycia**!`,
      callouts: [
        {
          type: "protip",
          title: "Dlaczego napis nie jest rozmyty?",
          text: "Tradycyjne silniki 2D skalują całą bitmapę bufora gry, co powoduje brzydkie rozmycie napisów. RustedEngine automatycznie rysuje warstwę tekstową po przeskalowaniu bufora w natywnej rozdzielczości Twojego monitora!"
        }
      ]
    },
    {
      id: "widgets-text-bbcode",
      title: "Tekst, BBCode RichText & Maszyna do Pisania",
      content: `### 1. Podstawowy \`Text\`:
Wspiera automatyczne zawijanie wierszy (\`with_max_width\`), cienie tekstu (\`with_shadow\`), wyrównanie (\`TextAlign::Left, Center, Right\`) oraz animację maszyny do pisania (\`with_typewriter(speed)\`).

### 2. BBCode \`RichText\`:
Parser znaczników kolorów w tekście. Wspiera kolory nazwane oraz kody szesnastkowe:
- \`"Zdobyłeś [color=gold]100 złota[/color] i [color=#00FF00]Legendarny Miecz[/color]!"\`
- Parsowanie odbywa się natywnie w czasie rzeczywistym bez narzutu alokacji pamięci.`,
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
      id: "widgets-interactive",
      title: "Kontrolki Interaktywne (Button, TextField, Slider, Checkbox, ProgressBar)",
      content: `Kompletny zestaw interaktywnych kontrolek z automatyczną obsługą wejścia myszy i klawiatury:

- **\`Button\`**: Obsługuje stany normal, hover, pressed, disabled, dźwięki kliknięcia oraz 9-slice tła (\`Button::new(pos, size, label)\`). Podepnij reakcję callbackiem \`.click_ctx(|ctx| ...)\`.
- **\`TextField\`**: Pole edycji tekstu z obsługą klawiatury, backspace, kursora tekstu, stanu focusu oraz tekstu zastępczego (*placeholder*). Odczytaj wartość za pomocą \`.get_text()\`.
- **\`Slider\`**: Suwak wartości float w zadanym zakresie (\`0.0..=1.0\` lub \`0.0..=100.0\`) z opcjonalnym krokiem \`step\`. Idealny do menu głośności i jasności.
- **\`Checkbox\`**: Przełącznik logiczny boolean (prawda/fałsz) z customizowalnym rozmiarem i kolorami zaznaczenia.
- **\`ProgressBar\`**: Animowany pasek postępu/zdrowia z płynnym lerpowaniem wartości oraz trybami odsłaniania (\`RevealMode::LeftToRight, TopToBottom, Radial\`).`,
      codeExamples: [
        {
          title: "Interaktywny Formularz Postaci z Kontrolkami UI",
          code: `use rusted_engine::prelude::*;

// 1. Pole nazwy gracza:
let mut name_field = TextField::new(vec2(20.0, 20.0), vec2(220.0, 36.0), "Wpisz imię bohatera...")
    .with_tag("input_player_name");

// 2. Suwak głośności:
let mut volume_slider = Slider::new(vec2(20.0, 70.0), vec2(220.0, 24.0), 0.0..=1.0, 0.8)
    .with_step(0.05);

// 3. Checkbox trybu pełnoekranowego:
let mut fullscreen_box = Checkbox::new(vec2(20.0, 110.0), vec2(20.0, 20.0), "Pełny Ekran", true);

// 4. Pasek zdrowia:
let mut health_bar = ProgressBar::new(vec2(20.0, 150.0), vec2(220.0, 22.0), RED)
    .with_background_color(DARKGRAY)
    .with_reveal_mode(RevealMode::LeftToRight);
health_bar.set_progress(0.75); // 75% HP

// 5. Przycisk zatwierdzenia:
let submit_btn = Button::new(vec2(20.0, 190.0), vec2(220.0, 40.0), "ZAPISZ POSTAĆ")
    .click_ctx(|ctx| {
        ctx.play_sound("ui_confirm");
        println!("Zapisano ustawienia postaci!");
    });`,
          collapsible: false
        }
      ]
    },
    {
      id: "widgets-panel-textlog",
      title: "Konsola Zdarzeń TextLog & Kontener ui::Panel",
      content: `### Konsola Zdarzeń \`TextLog\`:
Komponent **\`TextLog\`** służy jako czat gry, log walki lub konsola deweloperska. Automatycznie buforuje dodawane linie tekstu, usuwa najstarsze po przekroczeniu limitu (\`with_max_lines(100)\`) i obsługuje przewijanie kółkiem myszy (\`with_scrollable(true)\`).

### Statyczny Kontener \`ui::Panel\`:
Struktura **\`ui::Panel\`** grupuje widgety potomne. Obsługuje:
- Tło jednolite lub teksturę 9-Slice (\`with_nine_slice\`).
- Obcinanie elementów poza krawędziami panelu za pomocą przycinania nożycowego GPU (*Scissor Test*).
- Gładkie przewijanie zawartości (\`smooth_scroll\`, \`scroll_offset\`, \`target_scroll_offset\`).`,
      codeExamples: [
        {
          title: "Dziennik Walki z Automatycznym Buforowaniem w TextLog",
          code: `let mut combat_log = TextLog::new(vec2(10.0, 300.0), vec2(360.0, 120.0))
    .with_max_lines(50)
    .with_background(Color::from_rgba(15, 15, 20, 220))
    .with_scrollable(true);

combat_log.add_line("[color=gold]Gracz zadaje 45 obrażeń KOBOLDOWI![/color]");
combat_log.add_line("[color=red]Kobold kontratakuje za 12 HP![/color]");`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "ui-api-table",
      title: "API Reference: System UI",
      apiTable: {
        headers: ["Komponent", "Kluczowe Metody", "Opis"],
        rows: [
          ["UiPanel", "new, with_padding, with_child, anchor", "Statyczny kontener grupujący layout flexbox."],
          ["Button", "new, with_color, with_hover_color, click_ctx", "Przycisk z obsługą stanów interakcji i 9-slice."],
          ["TextField", "new, with_placeholder, get_text, set_text", "Pole edycji tekstu z obsługą klawiatury i kursora."],
          ["Slider", "new, with_range, value, set_value, with_step", "Pasek suwaka wartości float z krokami."],
          ["Checkbox", "new, is_checked, set_checked", "Przełącznik logiczny boolean."],
          ["ProgressBar", "new, set_progress, with_reveal_mode", "Animowany pasek postępu / zdrowia."],
          ["TextLog", "new, add_line, with_max_lines, with_scrollable", "Konsola dziennika zdarzeń i czatu ze scrollem."],
          ["Text / RichText", "new, with_typewriter, with_max_width", "Etykieta tekstowa ze wsparciem parsera BBCode."]
        ]
      }
    }
  ]
};

export const uiImageDoc = {
  id: "ui-image",
  title: "26. 🖼️ Obrazki UI, 9-Slice & Kontenery (Image)",
  badge: "UI Component",
  description: "Komponent Image do wyrysowywania tekstur w przestrzeni UI, 9-Slice border rendering, kotwiczenie do ekranu, obsługa kliknięć i zagnieżdżanie wtyczek.",
  sections: [
    {
      id: "image-overview",
      title: "Podstawy i Tworzenie Komponentu Image",
      content: `Struktura **\`Image\`** (\`rusted_engine::ui::Image\`) reprezentuje element graficzny wyrysowywany w przestrzeni ekranu UI.

### Tworzenie Obrazka:
- **\`Image::new(texture)\`**: Tworzy obraz z domyślnym rozmiarem natywnym tekstury (\`texture.width() × texture.height()\`) w punkcie \`(0, 0)\`.
- **\`Image::new_with_size(position, size, texture)\`**: Tworzy obraz z jawnie podaną pozycją i rozmiarem.
- **\`Image::from_assets(assets, "name")\`**: Wczytuje teksturę bezpośrednio z menedżera zasobów po nazwie.
- **\`Image::from_assets_size(assets, "name", pos, size)\`**: Wczytuje teksturę z podaną pozycją i rozmiarem.

> [!TIP]
> \`Image\` automatycznie integruje się z dualnym systemem współrzędnych i buforem wirtualnej rozdzielczości.`,
      codeExamples: [
        {
          title: "Wczytywanie i Wyświetlanie Obrazka w UI",
          code: `use rusted_engine::prelude::*;

// 1. Wczytanie z menedżera zasobów:
if let Some(logo) = Image::from_assets_size(&ctx.assets, "game_logo", vec2(20.0, 20.0), vec2(128.0, 128.0)) {
    // Obrazek z gotowym rozmiarem
    world.add_ui(logo);
}

// 2. Płynne budowanie z method chaining:
let avatar = Image::new(player_tex)
    .with_position(vec2(10.0, 10.0))
    .with_size(vec2(64.0, 64.0))
    .with_tint(WHITE);`,
          collapsible: false
        }
      ]
    },
    {
      id: "image-nine-slice",
      title: "Zaawansowany 9-Slice Border Rendering (Ramki bez Zniekształceń)",
      content: `Standardowe rozciąganie tekstury (\`dest_size\`) powoduje zniekształcenie i rozmycie ozdobnych krawędzi oraz zaokrąglonych narożników ramek UI.

Technika **9-Slice** dzieli teksturę źródłową na 9 rozłącznych obszarów:
1. **4 Narożniki (Corners)**: Rysowane w stałej skali pikselowej (nigdy nie są rozciągane).
2. **4 Krawędzie (Edges)**: Rozciągane tylko w jednym wymiarze (poziomo lub pionowo).
3. **Środek (Center)**: Rozciągany dwuwymiarowo wewnątrz wnętrza ramki.

### Jak Włączyć 9-Slice w Image:
Metoda **\`with_nine_slice(left, top, right, bottom)\`** definiuje marginesy narożników w pikselach tekstury:

\`\`\`rust
let window_frame = Image::new(frame_texture)
    .with_size(vec2(400.0, 300.0))
    .with_nine_slice(12.0, 12.0, 12.0, 12.0); // 12px marginesu na narożniki
\`\`\``,
      callouts: [
        {
          type: "important",
          title: "Dlaczego 9-Slice jest kluczowy w UI gier?",
          text: "Dzięki 9-Slice ta sama mała tekstura ramki (np. 32x32px) może służyć do rysowania małych przycisków, jak i wielkich okien dialogowych (800x600px), zachowując idealnie ostre pikselowe brzegi!"
        }
      ],
      codeExamples: [
        {
          title: "Stylowa Ramka Ekwipunku z 9-Slice i Tintem",
          code: `let hud_panel = Image::new(metal_border_tex)
    .with_position(vec2(50.0, 50.0))
    .with_size(vec2(320.0, 240.0))
    .with_nine_slice(16.0, 16.0, 16.0, 16.0) // Zapobiega rozmyciu metalowych okuć w narożnikach
    .with_tint(Color::from_rgba(230, 230, 255, 240));`,
          collapsible: false
        }
      ]
    },
    {
      id: "image-anchoring-responsive",
      title: "Responsywność & Kotwiczenie do Ekranu (UIAnchor)",
      content: `Komponent \`Image\` oferuje rozbudowany zestaw funkcji responsywnych, reagujących na zmianę rozdzielczości ekranu (1080p, 2K, 4K):

- **\`align_to_screen(anchor, padding)\`**: Przypina obrazek do określonego narożnika/krawędzi okna (\`UIAnchor::TopRight\`, \`Center\`, \`BottomLeft\` itp.).
- **\`center_on_screen()\`**: Automatycznie wyśrodkowuje obrazek na środku ekranu monitora.
- **\`fullscreen()\`**: Rozciąga obrazek na pełny ekran (\`0..screen_width\`, \`0..screen_height\`) z automatycznym śledzeniem rozmiaru.
- **\`fit_to_screen_padding(pad)\`**: Rozciąga obrazek na pełen ekran zachowując jednolity margines zewnętrzny.
- **\`with_auto_screen_size(true)\`**: Włącza ciągłe przeliczanie wymiarów co klatkę przy zmianie wielkości okna gry.`,
      codeExamples: [
        {
          title: "Kotwiczenie Ramki Minimapy i Pełnoekranowego Tła",
          code: `// 1. Tło pauzy rozciągnięte na cały ekran z przyciemnieniem:
let pause_overlay = Image::new(dark_noise_tex)
    .fullscreen()
    .with_tint(Color::from_rgba(0, 0, 0, 180));

// 2. Ramka minimapy zakotwiczona w prawym górnym rogu z 16px paddingu:
let minimap_frame = Image::new(minimap_border_tex)
    .with_size(vec2(140.0, 140.0))
    .align_to_screen(UIAnchor::TopRight, Padding::all(16.0));`,
          collapsible: false
        }
      ]
    },
    {
      id: "image-nesting-interactivity",
      title: "Interaktywność, Tintowanie & Zagnieżdżanie (child)",
      content: `### Obrazek jako Kontener Zagnieżdżający (\`child\`):
Obrazki mogą służyć jako graficzne podkłady dla innych widgetów. Wywołanie \`.child(widget)\` dodaje element potomny (np. napis \`Text\` lub ikonę), który jest automatycznie pozycjonowany i aktualizowany wewnątrz obszaru obrazka.

### Obsługa Kliknięć Myszy (\`on_click\`):
Struktura \`Image\` implementuje trait **\`Clickable\`**. Możesz podpiąć reakcję na kliknięcie lewym przyciskiem myszy poprzez callback:

\`\`\`rust
let clickable_banner = Image::new(banner_tex)
    .on_click(|ctx| {
        ctx.play_sound("click_sfx");
        println!("Kliknięto baner promocyjny!");
    });
\`\`\`

### Inne Metody Budownicze:
- **\`with_tint(color)\`**: Nakłada kolorystyczny filtr tintujący na teksturę.
- **\`fill_parent()\`**: Powoduje rozciągnięcie rozmiaru obrazka do granic nadrzędnego kontenera layoutu (\`Container\`, \`Column\`, \`Row\`).`,
      codeExamples: [
        {
          title: "Slot Ekwipunku z Obrazkiem Tła, Napisem Ilości i Kliknięciem",
          code: `let item_slot = Image::new(slot_bg_tex)
    .with_size(vec2(54.0, 54.0))
    .with_nine_slice(6.0, 6.0, 6.0, 6.0)
    .child(
        Text::new("x99", vec2(30.0, 36.0), 12.0, GOLD)
    )
    .on_click(|ctx| {
        println!("Użyto przedmiotu ze slotu!");
    });`,
          collapsible: false
        }
      ]
    },
    {
      id: "image-api",
      title: "API Reference: Image Component",
      apiTable: {
        headers: ["Metoda / Funkcja", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["Image::new(texture)", "Texture2D", "Image", "Tworzy komponent Image z natywnym rozmiarem tekstury."],
          ["Image::new_with_size(pos, size, tex)", "Vec2, Vec2, Texture2D", "Image", "Tworzy komponent Image z określoną pozycją i rozmiarem."],
          ["Image::from_assets(assets, name)", "&Assets, &str", "Option<Image>", "Wczytuje teksturę z menedżera zasobów po nazwie."],
          [".with_nine_slice(l, t, r, b)", "f32, f32, f32, f32", "Self", "Włącza 9-slice rendering z podanymi marginesami narożników."],
          [".align_to_screen(anchor, pad)", "UIAnchor, impl Into<Padding>", "Self", "Kotwiczy obrazek na ekranie według podanego wzorca."],
          [".fullscreen()", "brak", "Self", "Rozciąga obrazek na pełną rozdzielczość ekranu."],
          [".fit_to_screen_padding(pad)", "f32", "Self", "Dopasowuje obrazek do ekranu z zachowaniem jednolitego marginesu."],
          [".center_on_screen()", "brak", "Self", "Wyśrodkowuje obrazek na środku ekranu."],
          [".with_tint(color)", "Color", "Self", "Ustawia kolorowy filtr tintujący dla tekstury."],
          [".child(widget)", "impl IntoUIObject", "Self", "Dodaje zagnieżdżony widget potomny wewnątrz kontenera obrazka."],
          [".on_click(callback)", "FnMut(&mut Context)", "Self", "Podpina funkcję callback wywoływaną po kliknięciu myszą."],
          [".fill_parent()", "brak", "Self", "Rozciąga rozmiar do granic kontenera nadrzędnego."]
        ]
      }
    }
  ]
};

export const uiLayoutDoc = {
  id: "ui-layout",
  title: "27. 📐 Silnik Layoutu Flexbox (Column, Row, Grid, Container)",
  badge: "Layout Engine",
  description: "Deklaratywny silnik layoutu Flexbox inspirowany frameworkiem Flutter, kontenery Column, Row, Grid, Container, Gap, marginesy, padding i osie Main/CrossAxis.",
  sections: [
    {
      id: "flexbox-layout",
      title: "Deklaratywny Silnik Layoutu (Flexbox)",
      content: `System layoutu RustedEngine czerpie inspirację z frameworka **Flutter**, oferując deklaratywne układanie elementów interfejsu bez ręcznego przeliczania pikselowych pikselowych pozycji \`(x, y)\`.

### Główne Kontenery Layoutowe:
- **\`Column\`** (alias \`VBox\`): Układa elementy pionowo (jeden pod drugim) z ustalanym odstępem \`spacing\`.
- **\`Row\`** (alias \`HBox\`): Układa elementy poziomo (obok siebie).
- **\`Grid\`**: Układa elementy w siatce $M \\times N$ o określonej liczbie kolumn z automatycznym zawijaniem wierszy.
- **\`Container\`**: Pojedynczy kontener opakowujący widget z tłem, obramowaniem, marginesami, paddingiem i wyrównaniem.

### Zero-Boilerplate z Traitem \`IntoUIObject\`:
Dzięki traitowi \`IntoUIObject\` nie musisz ręcznie pisać \`Box::new(widget)\`. Każdy widget UI automatycznie konwertuje się do kontenerów layoutu!`,
      codeExamples: [
        {
          title: "Szybkie Menu w Układzie Flexbox",
          code: `let menu_panel = Container::new()
    .with_size(vec2(320.0, 260.0))
    .align_to_screen(UIAnchor::Center, Padding::all(0.0))
    .with_background(Color::from_rgba(20, 20, 30, 230))
    .with_border(GOLD, 2.0)
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
      id: "layout-containers",
      title: "Katalog Kontenerów Layoutowych (Div, Column, Row, Grid, Container)",
      content: `### 1. HTML-like Block Container \`Div\` & Makro \`div!\`
Struktura **\`Div\`** reprezentuje bloki układowe wzorowane na elementach \`<div>\` z HTML/CSS. Jest to najbardziej uniwersalny kontener w silniku:
- **Kierunek ułożenia (\`DivDirection\`)**: \`Vertical\` (pionowo jak \`Column\`), \`Horizontal\` (poziomo jak \`Row\`), lub \`Stack\` (warstwy w tym samym punkcie).
- **Stylizacja HTML/CSS**: Tło jednolite (\`with_bg\`), tekstura tła, krawędzie 9-Slice (\`with_nine_slice\`), obramowanie (\`with_border\`), \`padding\` wewnętrzny i \`margin\` zewnętrzny.
- **Interaktywność**: Zintegrowany callback kliknięcia myszą (\`.on_click(|ctx| ...)\`).

### 2. \`Column\` (Pionowy Stos) & \`Row\` (Poziomy Rząd)
Układają elementy kolejno wzdłuż osi. Posiadają wbudowane automatyczne wyliczanie całkowitej szerokości i wysokości kontenera (\`relayout()\`).

### 3. \`Grid\` (Siatka Wielokolumnowa)
Struktura **\`Grid\`** służy do układania kafelków (np. sloty ekwipunku, sklep z czarami, wybór poziomów):
- \`Grid::new(position, columns, cell_size, spacing)\`
- Elementy są automatycznie zawijane do nowej linii po zapełnieniu \`columns\` kolumn.

### 4. Dekoracyjny \`Container\`
Opakowuje dowolny widget i nadaje mu tło, obramowanie, padding wewnętrzny i margin zewnętrzny.`,
      codeExamples: [
        {
          title: "Deklaratywna Karta UI z użyciem Makra div!",
          code: `let card = div![
    Text::new("NAGŁÓWEK KARTY", Vec2::ZERO, 20.0, GOLD),
    Gap::height(8.0),
    Text::new("Opis zawartości wewnątrz kontenera DIV.", Vec2::ZERO, 14.0, WHITE),
    Gap::height(16.0),
    div![
        Button::new(Vec2::ZERO, vec2(100.0, 32.0), "ZAPISZ"),
        Gap::width(10.0),
        Button::new(Vec2::ZERO, vec2(100.0, 32.0), "ANULUJ"),
    ]
    .with_direction(DivDirection::Horizontal)
]
.with_background(Color::from_rgba(20, 20, 30, 240))
.with_border(GOLD, 1.5)
.with_padding(Padding::all(16.0))
.align_to_screen(UIAnchor::Center, Padding::all(0.0));`,
          collapsible: false
        }
      ]
    },
    {
      id: "layout-alignment-axes",
      title: "Osiowość, Wyrównania & Wzajemna Kompatybilność Enumów",
      content: `Kontenery \`Div\`, \`Column\`, \`Row\` i \`Container\` pozwalają na dokładne sterowanie rozmieszczeniem elementów wzdłuż osi, a wszystkie enumy wyrównania są w pełni kompatybilne wstecz i implementują \`From\` / \`Into\`:

### Wyrównanie Osi Głównej (\`MainAxisAlignment\` / \`LayoutJustify\`):
- **\`Start\`**: Elementy układane od początku osi.
- **\`Center\`**: Elementy wyśrodkowane wzdłuż osi.
- **\`End\`**: Elementy wyrównane do końca osi.
- **\`SpaceBetween\`**: Równomierne odstępy między elementami (skrajne przy krawędziach).
- **\`SpaceAround\`**: Równomierne odstępy wokół każdego elementu.
- **\`SpaceEvenly\`**: Jednakowe odstępy pomiędzy wszystkimi elementami i krawędziami.

### Wyrównanie Osi Poprzecznej (\`CrossAxisAlignment\` / \`LayoutAlign\`):
- **\`Start\`**, **\`Center\`**, **\`End\`**, **\`Stretch\`** (rozciąga elementy do szerokości/wysokości kontenera).

### Wyrównanie Ekranowe & Wewnętrzne (\`UIAnchor\` <-> \`Align\`):
Oba enumy posiadają 9 wariantów (\`TopLeft\`, \`Center\`, \`BottomRight\` etc.) i mogą być używane zamiennie (\`From\`):
- \`anchor.compute_position(size, padding)\` / \`align.compute_position(...)\`: Oblicza pozycję bezwzględną na ekranie.
- \`anchor.compute_offset(parent_size, child_size, padding)\`: Oblicza relatywne przesunięcie wewnątrz kontenera rodzica.

### Rozciąganie przez \`fill_parent\`:
Wywołanie \`widget.set_fill_parent(true)\` (lub konstruktora \`.fill_parent()\`) instruuje kontener nadrzędny, aby rozciągnął podany widget do 100% dostępnej szerokości/wysokości rodzica.`,
    },
    {
      id: "box-model-gaps",
      title: "Model Pudełkowy: Padding, Margin & Gap",
      content: `- **\`Padding\`**: Wewnętrzny odstęp kontenera od jego zawartości.
  - \`Padding::all(16.0)\`
  - \`Padding::symmetric(horizontal, vertical)\`
  - \`Padding::new(top, right, bottom, left)\`
- **\`Margin\`**: Zewnętrzny margines odsuwający kontener od sąsiadujących widgetów.
  - \`Margin::all(8.0)\`
  - \`Margin::new(top, right, bottom, left)\`
- **\`Gap\`**: Niewidzialny separator przestrzenny wstawiany wewnątrz \`Div\`, \`Column\` lub \`Row\`.
  - \`Gap::height(12.0)\` — pionowy odstęp.
  - \`Gap::width(8.0)\` — poziomy odstęp.
  - \`Gap::new(10.0)\` — uniwersalny odstęp kwadratowy.`,
    },
    {
      id: "layout-macros",
      title: "Makra Deklaratywne col!, row!, div! & ui_vec!",
      content: `Silnik dostarcza makra ułatwiające budowanie głębokich drzew UI bez pisania dziesiątek linii boilerplate'u:

- **\`col![w1, w2, w3]\`** (oraz \`column!\` / \`vbox!\`): Tworzy pionowy kontener kolumny \`Column\` z przekazanymi widgetami.
- **\`row![w1, w2, w3]\`** (oraz \`hbox!\`): Tworzy poziomy kontener rzędu \`Row\` z przekazanymi widgetami.
- **\`div![w1, w2, w3]\`**: Tworzy elastyczny blok układowy \`Div\` ze wsparciem tła, ramek, paddingu i zdarzeń.
- **\`ui_vec![w1, w2, w3]\`**: Tworzy wektor \`Vec<Box<dyn Object>>\` z przekazanych widgetów.`,
      codeExamples: [
        {
          title: "Stylowy Layout z Użyciem col! i row!",
          code: `let hud = col![
    row![
        Text::new("❤️ ❤️ ❤️", Vec2::ZERO, 20.0, RED),
        Gap::width(16.0),
        ProgressBar::progress(0.8).with_size(vec2(80.0, 16.0)),
    ],
    Gap::height(8.0),
    row![
        Text::new("💰 15", Vec2::ZERO, 16.0, GOLD),
        Gap::width(12.0),
        Text::new("💣 02", Vec2::ZERO, 16.0, WHITE),
    ],
]
.with_padding(Padding::all(16.0))
.align_to_screen(UIAnchor::TopLeft, Padding::all(16.0));`,
          collapsible: false
        }
      ]
    },
    {
      id: "layout-api",
      title: "API Reference: Layout Engine",
      apiTable: {
        headers: ["Struktura / Makro", "Metody / Parametry", "Zwraca", "Opis"],
        rows: [
          ["col![...]", "widgety...", "Column", "Główne makro do inicjalizacji pionowej kolumny Column."],
          ["row![...]", "widgety...", "Row", "Główne makro do inicjalizacji poziomego rzędu Row."],
          ["div![...]", "widgety...", "Div", "Makro do inicjalizacji kontenera blokowego Div."],
          ["Column (VBox)", "new, with_child, with_align, with_padding", "Column", "Pionowy kontener flexbox."],
          ["Row (HBox)", "new, with_child, with_align, with_padding", "Row", "Poziomy kontener flexbox."],
          ["Grid", "new(pos, cols, cell_size, spacing)", "Grid", "Siatka M x N z automatycznym zawijaniem wierszy."],
          ["Container", "new, with_background, with_border, with_child", "Container", "Dekoracyjny wrapper pojedynczego widgetu z ramką i tłem."],
          ["Gap", "height(h), width(w), new(s)", "Gap", "Separator przestrzenny między elementami layoutu."],
          ["vbox![...] / column![...]", "widgety...", "Column", "Makro do szybkiej inicjalizacji pionowej Column/VBox."],
          ["hbox![...] / row![...]", "widgety...", "Row", "Makro do szybkiej inicjalizacji poziomej Row/HBox."]
        ]
      }
    }
  ]
};

export const audioSfxDoc = {
  id: "audio-sfx",
  title: "29. 🎵 Audio, SFX & Zasoby (Sound)",
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

