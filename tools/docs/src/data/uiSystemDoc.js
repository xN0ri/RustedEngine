export const uiSystemDoc = {
  id: "ui-system",
  title: "8. 🖥️ Screen-Space UI & Layout System",
  icon: "Layout",
  badge: "UI Subsystem",
  description: "Kompletna architektura interfejsu użytkownika: dualny system współrzędnych, silnik layoutu Flexbox (Column, Row, Grid), bogaty katalog widgetów oraz Desktop Window Manager (PanelManager).",
  sections: [
    {
      id: "architecture-panel-vs-manager",
      title: "Architektura Interfejsu & Dualny System Współrzędnych",
      content: `System UI w RustedEngine został zaprojektowany z myślą o bezproblemowej integracji z grami pikselowymi oraz aplikacjami narzędziowymi (edytory, debuggery).`,
      subsections: [
        {
          id: "panel-comparison",
          title: "ui::Panel vs panel_manager::PanelManager",
          content: `W silniku istnieją dwa moduły o nazwie **Panel**, które pełnią zupełnie inne role:

| Cecha | \`ui::Panel\` | \`panel_manager::PanelManager\` |
|---|---|---|
| **Rola** | Statyczny kontener grupujący widgety w layoucie | Menedżer ruchomych okien pulpitu (Desktop Window Manager) |
| **Z-order** | Stały (według kolejności w drzewie UI) | Dynamiczny (kliknięcie wynosi okno na wierzch stosu) |
| **Przesuwanie (Drag)** | Statyczny kontener | ✅ Pełne wsparcie przesuwania nagłówkiem myszy |
| **Zmiana Rozmiaru** | Stały lub ustalany przez zawartość | ✅ Opcjonalny uchwyt zmiany rozmiaru w narożniku |
| **Zastosowanie** | Układanie przycisków i pól wewnątrz pojedynczego panelu | Wielo-okienkowy interfejs narzędziowy lub okna ekwipunku |

**Złota zasada**: Używaj \`ui::Panel\` wewnątrz layoutów flexbox. Używaj \`PanelManager\` (dodawanego do świata przez \`world.add_ui\`) jako nadrzędnego zarządcy okien!`
        },
        {
          id: "dual-coordinate-system",
          title: "Dualny System Współrzędnych & Zero-Blur Text Rendering",
          content: `Gdy włączona jest wirtualna rozdzielczość (\`Engine::with_virtual_resolution(vw, vh)\`), obiekty UI dzielą się na dwie grupy:

### 1. Przestrzeń Wirtualna (\`is_text_layer() == false\`)
- Dotyczy: \`Panel\`, \`Image\`, \`Button\`, \`ProgressBar\`, \`TextField\`, \`Slider\`, \`Checkbox\`.
- Renderowane do bufora \`SceneRenderTarget\` (\`vrt.target\`) z filtrowaniem \`Nearest\`.
- Hit-testing myszy automatycznie przelicza współrzędne ekranu na wirtualne przez \`ctx.input.mouse_position()\`.

### 2. Natywna Przestrzeń Ekranu (\`is_text_layer() == true\`)
- Dotyczy: \`Text\`, \`TextLog\`, \`RichText\`.
- Renderowane bezpośrednio na ramce okna systemu po przeskalowaniu świata. Daje to **100% ostrości czcionek TTF** bez pikselowego rozmycia!`,
          callouts: [
            {
              type: "protip",
              title: "Dlaczego napisy są idealnie ostre?",
              text: "Tradycyjne silniki skalują cały bufer pikselowy, powodując rozmycie fontów. RustedEngine automatycznie wyodrębnia warstwę tekstową i rysuje ją w natywnej rozdzielczości Twojego monitora!"
            }
          ]
        }
      ]
    },
    {
      id: "flexbox-layout",
      title: "Deklaratywny Silnik Layoutu (Flexbox)",
      content: `System layoutu RustedEngine czerpie inspirację z frameworka Flutter, oferując elastyczne układanie elementów w pionie, poziomie i siatkach.`,
      subsections: [
        {
          id: "containers-hierarchy",
          title: "Kontenery: Column, Row, Grid & Container",
          content: `### Główne Kontenery:
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
              title: "Główny Przykład: Budowanie Menu za Pomocą Makr Layoutu",
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
            },
            {
              title: "Rozszerzony Przykład: Siatka Ekwipunku 4x4 (Grid Layout)",
              code: `let mut grid = Grid::new(4).with_spacing(6.0);

for i in 0..16 {
    grid.add_child(
        Button::new(vec2(0.0, 0.0), vec2(48.0, 48.0), &format!("#{}", i))
            .with_tag(&format!("slot_{}", i))
    );
}

let inventory_container = Container::new(grid)
    .with_padding(Padding::all(10.0))
    .with_background(Color::from_rgba(20, 20, 30, 240));`,
              collapsible: true,
              defaultCollapsed: true
            }
          ]
        },
        {
          id: "alignment-rules",
          title: "Wyrównania, Osiowość & Wypełnianie Rodzica (fill_parent)",
          content: `Kontenery \`Column\` i \`Row\` obsługują precyzyjne sterowanie osiami:
- **\`MainAxisAlignment\`**: \`Start\`, \`Center\`, \`End\`, \`SpaceBetween\`, \`SpaceAround\`, \`SpaceEvenly\`.
- **\`CrossAxisAlignment\`**: \`Start\`, \`Center\`, \`End\`, \`Stretch\`.
- **\`fill_parent\`**: Ustawienie \`widget.set_fill_parent(true)\` powoduje automatyczne rozciągnięcie elementu do pełnej szerokości lub wysokości kontenera nadrzędnego.`
        },
        {
          id: "box-model",
          title: "Model Pudełkowy: Padding, Margin & Gap",
          content: `- **\`Padding::all(val)\`** / **\`Padding::symmetric(h, v)\`**: Wewnętrzny odstęp kontenera.
- **\`Margin::all(val)\`** / **\`Margin::new(top, right, bottom, left)\`**: Zewnętrzny margines widgetu.
- **\`Gap::width(px)\`** / **\`Gap::height(px)\`**: Przezroczysty separator przestrzenny między elementami.`
        }
      ]
    },
    {
      id: "widgets-overview",
      title: "Katalog Widgetów UI",
      content: `Kompletny zestaw gotowych do użycia komponentów interfejsu graficznego:`,
      subsections: [
        {
          id: "text-and-richtext",
          title: "Tekst, BBCode RichText & Maszyna do Pisania",
          content: `### 1. Podstawowy \`Text\`:
Wspiera automatyczne zawijanie wierszy (\`with_max_width\`), cienie tekstu, wyrównanie (\`TextAlign::Left\`, \`Center\`, \`Right\`) oraz animację maszyny do pisania (\`with_typewriter(speed)\`).

### 2. BBCode \`RichText\`:
Parser znaczników kolorów w tekście. Wspiera kolory nazwane oraz kody szesnastkowe:
- \`"Zdobyłeś [color=gold]100 złota[/color] i [color=#00FF00]Legendarny Miecz[/color]!"\`
- Parsowanie odbywa się natywnie w czasie rzeczywistym bez narzutu na alokacje stringów.`,
          codeExamples: [
            {
              title: "Przykład: RichText z BBCode i Typewriter",
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
          id: "interactive-controls",
          title: "Kontrolki Interaktywne (Button, Slider, Checkbox, TextField, ProgressBar)",
          content: `### Dostępne Kontrolki:
1. **\`Button\`**: Obsługuje stany normal, hover, pressed, disabled, dźwięki kliknięcia oraz 9-slice tła.
2. **\`Slider\`**: Suwak wartości float w zadanym zakresie (np. \`0.0..=100.0\`) z opcjonalnym krokiem \`step\`.
3. **\`Checkbox\`**: Przełącznik logiczny prawda/fałsz z konfigurowalnym rozmiarem i kolorami zaznaczenia.
4. **\`TextField\`**: Pole wprowadzania tekstu z obsługą klawiatury, backspace, kursora, focusu i tekstu zastępczego (placeholder).
5. **\`ProgressBar\`**: Pasek postępu z płynną animacją lerp wypełnienia oraz trybami odsłaniania (\`RevealMode::LeftToRight\`, \`TopToBottom\`, \`Radial\`).`,
          codeExamples: [
            {
              title: "Rozszerzony Przykład: Obsługa TextField i Paska Życia ProgressBar",
              code: `// Pole tekstowe do wprowadzania imienia
let name_input = TextField::new(vec2(50.0, 50.0), vec2(200.0, 32.0), "Wpisz imię gracza...")
    .with_tag("player_name_input");

// Płynny pasek zdrowia
let hp_bar = ProgressBar::new(vec2(50.0, 100.0), vec2(200.0, 20.0), RED)
    .with_background_color(DARKGRAY)
    .with_reveal_mode(RevealMode::LeftToRight);

// W klatce update:
hp_bar.set_progress(current_hp as f32 / max_hp as f32);`,
              collapsible: true,
              defaultCollapsed: true
            }
          ]
        },
        {
          id: "console-log",
          title: "Konsola Zdarzeń TextLog",
          content: `Komponent **\`TextLog\`** służy jako czat gry, log walki lub konsola deweloperska.
Automatycznie buforuje linie tekstu, usuwa najstarsze po przekroczeniu limitu (\`with_max_lines(100)\`) i obsługuje przewijanie kółkiem myszy (\`with_scrollable(true)\`).`
        }
      ]
    },
    {
      id: "panel-manager-desktop",
      title: "Menedżer Okien Pulpitu (PanelManager)",
      content: `Struktura **\`PanelManager\`** dostarcza pełnoprawny menedżer okien pulpitu (Desktop Windowing System).`,
      subsections: [
        {
          id: "window-features",
          title: "Funkcje Okien PanelManager",
          content: `- **Dynamiczny Stos Z-Order**: Kliknięcie dowolnego miejsca w oknie natychmiast przenosi je na sam wierzch.
- **Pasek Tytułowy & Przeciąganie**: Okna z nagłówkiem można płynnie przeciągać myszą po całym ekranie.
- **Uchwyt Zmiany Rozmiaru**: Przeciąganie prawego dolnego narożnika pozwala na dynamiczną zmianę wymiarów okna.
- **Przyciski Minimalizacji i Zamknięcia**: Wbudowane przyciski sterujące stanem okna.`,
          codeExamples: [
            {
              title: "Konfiguracja Menedżera Okien PanelManager",
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
        }
      ]
    },
    {
      id: "ui-api-reference",
      title: "API Reference: System UI",
      apiTable: {
        headers: ["Komponent", "Kluczowe Metody", "Opis"],
        rows: [
          ["UiPanel", "new, with_padding, with_child, anchor", "Statyczny kontener grupujący layout flexbox."],
          ["Column / Row", "new, with_alignment, fill_parent", "Pionowy i poziomy kontener flexbox."],
          ["Button", "new, with_color, with_hover_color, click_ctx", "Przycisk z obsługą stanów interakcji."],
          ["TextField", "new, with_placeholder, get_text, set_text", "Pole edycji tekstu z obsługą klawiatury."],
          ["Slider", "new, with_range, value, set_value", "Pasek suwaka wartości float."],
          ["Checkbox", "new, is_checked, set_checked", "Przełącznik logiczny boolean."],
          ["ProgressBar", "new, set_progress, with_reveal_mode", "Animowany pasek postępu / zdrowia."],
          ["PanelManager", "new, add_panel, bring_to_front, get_panel", "Nadrzędny menedżer ruchomych okien pulpitu."]
        ]
      }
    }
  ]
};
