// ============================================================================
// NOWE DOKUMENTY GRAFIKI & UI: SHADERY, ANIMATED SPRITE, BITMAP FONT, PANEL MANAGER
// ============================================================================

export const postprocessDoc = {
  id: "postprocess",
  title: "20. 🎨 Shadery GLSL & Post-Processing (PostProcess)",
  badge: "Advanced Graphics",
  description: "Fullscreen shader pipeline, bufory SceneRenderTarget, efekty CRT, Bloom, Vignette, Chromatic Aberration i własne uniformy f32.",
  sections: [
    {
      id: "postprocess-overview",
      title: "Pipeline Post-Processingu w Silniku",
      content: `RustedEngine pozwala na nakładanie pełnoekranowych efektów graficznych (post-processing) pisanych w **GLSL 330 core** przy użyciu struktur **\`PostProcess\`** oraz **\`SceneRenderTarget\`**.

### Jak Działa Pipeline:
1. **Renderowanie Świata**: Cały świat 2D i obiekty gry są renderowane do off-screen bufora \`SceneRenderTarget\` z filtrowaniem \`Nearest\`.
2. **Aplikacja Shaderu**: Na bufor nakładany jest materiał GLSL z parametrami (uniforms).
3. **Prezentacja na Ekranie**: Wynikowy obraz jest rysowany na ekran z uwzględnieniem wirtualnej rozdzielczości i letterboxingu (\`flip_y: true\` automatycznie obsługiwany przez silnik).

### Wbudowany Passthrough:
Metoda \`PostProcess::passthrough()\` wczytuje domyślny shader czysty (bez efektów) — idealny jako szablon do pisania własnych shaderów.`,
      codeExamples: [
        {
          title: "Inicjalizacja Post-Processingu w Engine",
          code: `use rusted_engine::prelude::*;

#[macroquad::main(Engine::conf("Retro Game with CRT", 1280, 720))]
async fn main() {
    // 1. Wczytanie shadera GLSL z pliku (lub szablonu passthrough):
    let mut pp = PostProcess::passthrough().expect("Błąd wczytania shadera");

    // 2. Ustawienie uniformów (zmiennych przekazywanych do GLSL):
    pp.set_uniform("u_scanline_intensity", 0.35);
    pp.set_uniform("u_vignette_darkness", 0.5);

    // 3. Podpięcie do silnika:
    let mut engine = Engine::new(scenes)
        .with_virtual_resolution(480.0, 270.0);
    engine.post_process = Some(pp);

    engine.run().await;
}`,
          collapsible: false
        },
        {
          title: "Przykładowy Fragment Shader GLSL (Efekt CRT Scanlines & Vignette)",
          code: `// assets/shaders/crt.frag (GLSL 330 core)
#version 330 core
in vec2 uv;
out vec4 FragColor;

uniform sampler2D Texture;
uniform float u_time;
uniform float u_scanline_intensity;

void main() {
    vec4 col = texture(Texture, uv);

    // Efekt linii skanowania CRT (Scanlines):
    float scanline = sin(uv.y * 540.0 + u_time * 5.0) * 0.5 + 0.5;
    col.rgb -= scanline * u_scanline_intensity;

    // Winieta (przyciemnienie rogów):
    float dist = distance(uv, vec2(0.5));
    col.rgb *= smoothstep(0.8, 0.2, dist * 1.2);

    FragColor = col;
}`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "postprocess-api",
      title: "API Reference: PostProcess & RenderTarget",
      apiTable: {
        headers: ["Struktura / Metoda", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["PostProcess::new(material)", "Material", "PostProcess", "Tworzy pipeline z podanego materiału GLSL."],
          ["PostProcess::passthrough()", "brak", "Result<PostProcess, Error>", "Tworzy domyślny, passthrough pipeline."],
          ["pp.set_uniform(name, val)", "&str, f32", "()", "Ustawia uniform typu float dla shadera GLSL."],
          ["SceneRenderTarget::new(w, h)", "u32, u32", "SceneRenderTarget", "Tworzy off-screen bufor GPU z filtrowaniem Nearest."],
          ["SceneRenderTarget::fullscreen()", "brak", "SceneRenderTarget", "Tworzy bufor dopasowany do wymiarów okna."],
          ["rt.draw_with_postprocess(&mut pp)", "&mut PostProcess", "()", "Rysuje bufor na ekran aplikując shader GLSL."],
          ["rt.draw_raw()", "brak", "()", "Rysuje bufor na ekran w postaci surowej."],
        ]
      }
    }
  ]
};

export const animatedSpriteDoc = {
  id: "animated-sprite",
  title: "21. 🎞️ Animacje Sprite Sheet & AnimatedSprite",
  badge: "2D Graphics",
  description: "Odtwarzacz sekwencji klatek AnimatedSprite, metody budownicze (with_position, with_fps), pętle zapętlania (looping), pauzowanie i auto-cleanup.",
  sections: [
    {
      id: "animated-sprite-overview",
      title: "Komponent AnimatedSprite",
      content: `Struktura **\`AnimatedSprite\`** reprezentuje 2D obiekt gry odtwarzający ciąg tekstur (klatek) z określoną prędkością FPS.

### Konstruktory i Metody Budownicze:
- **\`AnimatedSprite::new(pos, size, frames, fps)\`**: Pełny konstruktor z parametrami.
- **\`AnimatedSprite::empty()\`**: Pusty duszek z domyślnymi parametrami (\`impl Default\`).
- **\`AnimatedSprite::from_frames(frames)\`**: Tworzy duszka z listy tekstur.
- **\`.with_position(pos)\`** / **\`.with_pos(pos)\`**: Ustawia pozycję w świecie.
- **\`.with_size(size)\`**: Ustawia wymiary wyświetlania.
- **\`.with_fps(fps)\`**: Ustawia prędkość odtwarzania w klatkach na sekundę.
- **\`.with_looping(bool)\`**: Czy animacja zapętla się po ostatniej klatce.

### Sterowanie w Pętli Gry:
- **\`playing\`** — flaga odtwarzania (\`.play()\`, \`.pause()\`, \`.stop()\`, \`.reset()\`).
- **\`current_frame()\` / \`.set_frame(idx)\`** — bezpośredni odczyt i zmiana aktualnej klatki.
- **\`is_finished()\`** — \`true\` gdy niezapętlona animacja dotarła do końca i zatrzymała się.

> [!TIP]
> \`AnimatedSprite\` implementuje zarowno \`Object\` (w tym \`set_position\`, \`set_size\`) jak i \`Clickable\`. Możesz go dodać bezpośrednio do \`objects: [...]\` w \`world!\` lub zespawnować przez \`ctx.spawn(anim)\`.`,
      codeExamples: [
        {
          title: "Tworzenie AnimatedSprite przez Fluent Builder",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

// 1. Wczytanie klatek:
let walk_frames = vec![
    load_texture("assets/hero_1.png").await.unwrap(),
    load_texture("assets/hero_2.png").await.unwrap(),
];

// 2. Utworzenie przez konstruktor łańcuchowy:
let mut hero = AnimatedSprite::from_frames(walk_frames)
    .with_position(vec2(100.0, 150.0))
    .with_size(vec2(32.0, 32.0))
    .with_fps(12.0)
    .with_looping(true)
    .with_tag("player_hero");

// 3. Kontrola w pętli gry:
if ctx.input.wasd().length() > 0.0 {
    hero.play();
} else {
    hero.pause();
}`,
          collapsible: false
        },
        {
          title: "Jednorazowa Animacja Wybuchu (Explosion Effect)",
          code: `// Jednorazowa animacja wybuchu (looping = false):
let explosion = AnimatedSprite::from_frames(explosion_frames)
    .with_position(enemy_pos)
    .with_size(vec2(48.0, 48.0))
    .with_fps(18.0)
    .with_looping(false); // Zatańczy raz i się zatrzyma

// W update encji:
if explosion.is_finished() {
    explosion.destroy(); // Auto-cleanup po zakończeniu animacji!
}`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "animated-sprite-api",
      title: "API Reference: AnimatedSprite",
      apiTable: {
        headers: ["Metoda", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["AnimatedSprite::new(pos, size, frames, fps)", "Vec2, Vec2, Vec<Texture2D>, f32", "AnimatedSprite", "Tworzy obiekt animowanego duszka."],
          ["AnimatedSprite::from_frames(frames)", "Vec<Texture2D>", "AnimatedSprite", "Tworzy duszka z listą klatek (pozycja 0,0, 12 FPS)."],
          ["AnimatedSprite::empty()", "brak", "AnimatedSprite", "Tworzy pustego duszka z domyślnymi parametrami."],
          [".with_position(pos) / .with_pos(pos)", "Vec2", "Self", "Ustawia pozycję początkową."],
          [".with_size(size)", "Vec2", "Self", "Ustawia rozmiar renderowania."],
          [".with_fps(fps)", "f32", "Self", "Ustawia prędkość animacji w klatkach na sekundę."],
          [".with_looping(bool)", "bool", "Self", "Ustawia czy animacja zapętla się po ostatniej klatce."],
          [".with_rotation(rad)", "f32", "Self", "Ustawia obrót duszka w radianach."],
          [".with_color(color)", "Color", "Self", "Ustawia zabarwienie tint kolorem."],
          [".play()", "brak", "()", "Startuje lub wznawia odtwarzanie animacji."],
          [".pause()", "brak", "()", "Wstrzymuje odtwarzanie na obecnej klatce."],
          [".stop()", "brak", "()", "Zatrzymuje animację i resetuje do klatki 0."],
          [".reset()", "brak", "()", "Resetuje do klatki 0 zachowując stan playing."],
          [".is_finished()", "brak", "bool", "true gdy niezapętlona animacja dobiegła końca."],
          [".current_frame()", "brak", "usize", "Zwraca indeks aktualnie wyświetlanej klatki."],
          [".set_frame(index)", "usize", "()", "Ręcznie ustawia klatkę o danym indeksie."],
        ]
      }
    }
  ]
};

export const bitmapFontDoc = {
  id: "bitmap-font",
  title: "22. 🔤 Wyraziste Fonty Retro (BitmapFont)",
  badge: "Pixel Perfection",
  description: "Brak rozmyć i idealne dopasowanie do siatki pikseli dzięki BitmapFont generowanemu z TrueType z progiem alfa i Nearest filtering.",
  sections: [
    {
      id: "bitmap-font-overview",
      title: "Idealnie Ostre Fonty w Silniku 2D",
      content: `Standardowe czcionki wektorowe TTF bywają rozmyte po przeskalowaniu do rozdzielczości retro. **\`BitmapFont\`** rozwiązuje ten problem poprzez wygenerowanie zduplikowanego atlasu GPU z filtrowaniem \`FilterMode::Nearest\` oraz binarnym progiem przezroczystości (Alpha Threshold $\ge 128 \to 255$).

### Zalety BitmapFont:
- **Zero rozmyć (Zero-blur)** — litery są ostre i dopasowane do pikseli świata retro.
- **Pełne wsparcie dla polskich znaków** — domyślny zestaw znaków \`BitmapFont::default_charset()\` zawiera diakrytyki (\`ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\`).
- **Optymalizacja GPU** — wszystkie glify znajdują się w jednym atlasie teksturowym.`,
      codeExamples: [
        {
          title: "Generowanie i Użycie BitmapFont w Silniku",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

// 1. Rejestracja unikalnego ID dla fontu:
let font_id = register_font_id("pixel_font.ttf");

// 2. Wczytanie natywnego TTF i konwersja na ostra czcionkę bitmapową 16px:
let ttf_font = load_ttf_font("assets/fonts/PressStart2P.ttf").await.unwrap();

let bitmap_font = BitmapFont::from_ttf(
    &ttf_font,
    font_id,
    16, // Natywna wielkość pikselowa
    BitmapFont::default_charset() // ASCII + polskie litery
);

// 3. Użycie w widgecie UI Text z wyrazistością:
let text_widget = Text::new("PUNKTY: 1250 — ŻYCIA: 3", vec2(10.0, 10.0), 16.0, WHITE)
    .with_bitmap_font(bitmap_font);`,
          collapsible: false
        }
      ]
    },
    {
      id: "bitmap-font-api",
      title: "API Reference: BitmapFont",
      apiTable: {
        headers: ["Funkcja / Metoda", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["BitmapFont::from_ttf(font, id, size, charset)", "&Font, usize, u32, &str", "BitmapFont", "Biecze czcionkę TTF do wyrazistego atlasu bitmapowego z filtrem Nearest."],
          ["BitmapFont::default_charset()", "brak", "&'static str", "Zwraca zestaw znaków ASCII (32..127) + polskie diakrytyki."],
          ["register_font_id(path_or_name)", "&str", "usize", "Generuje unikalny identyfikator numeryczny fontu w rejestrze."],
          ["text.with_bitmap_font(font)", "BitmapFont", "Text", "Podpina bitmap font do widgetu Text dla ostrego renderowania."],
        ]
      }
    }
  ]
};

export const panelManagerDoc = {
  id: "panel-manager",
  title: "28. 🪟 Pulpit OS, Okna & Drag-and-Drop (PanelManager)",
  badge: "Advanced GUI",
  description: "Menedżer ruchomych i skalowalnych okien pulpitu PanelManager, z-ordering (przenoszenie na wierzch), przeciąganie myszą i resize.",
  sections: [
    {
      id: "panel-manager-overview",
      title: "Menedżer Okien Pulpitu (PanelManager)",
      content: `**\`PanelManager\`** zarządza niezależnymi, ruchomymi i skalowalnymi oknami pulpitu (np. okna ekwipunku, drzewka umiejętności, konsole terminalowe).

### Czym różni się `PanelManager` od `ui::Panel`?
- **`ui::Panel`** — statyczny kontener grupujący layout (flexbox) wewnątrz okna.
- **`PanelManager`** — nadrzędny menedżer okien wyższej warstwy (`World::add_ui`), zarządzający kolejnością z-order (wyciąganie na wierzch po kliknięciu), przeciąganiem nagłówka okna i zmianą rozmiaru.

### Trait `Panel` (oraz aliasy `WindowPanel` / `DesktopWindow`):
Aby uniknąć kolizji nazw z `ui::Panel`, trait okna pulpitu posiada oficjalne aliasy **`WindowPanel`** oraz **`DesktopWindow`**:
- `fn update(&mut self, dt: f32)`
- `fn draw(&self, rect: Rect)`
- `fn on_close(&mut self)` — opcjonalne sprzątanie po zamknięciu.
- `fn is_draggable(&self) -> bool { true }` — włącza przeciąganie myszą.
- `fn is_resizable(&self) -> bool { true }` — włącza skalowanie krawędzi.`,
      codeExamples: [
        {
          title: "Implementacja Własnego Okna Ekwipunku (Panel)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

pub struct InventoryWindow {
    pub title: String,
}

impl Panel for InventoryWindow {
    fn update(&mut self, _dt: f32) {
        // Logika wewnątrz okna...
    }

    fn draw(&self, rect: Rect) {
        // Rysowanie obramowania okna i zawartości w podanym rect:
        draw_rectangle(rect.x, rect.y, rect.w, rect.h, DARKGRAY);
        draw_rectangle_lines(rect.x, rect.y, rect.w, rect.h, 2.0, GOLD);
        draw_text(&self.title, rect.x + 10.0, rect.y + 20.0, 16.0, WHITE);
    }

    fn is_draggable(&self) -> bool { true }  // Zezwól na przeciąganie!
    fn is_resizable(&self) -> bool { true }  // Zezwól na zmianę rozmiaru!
}

// Rejestracja w PanelManager:
let mut pm = PanelManager::new();
let window_id = pm.add(
    InventoryWindow { title: "PLECAK BOHATERA".into() },
    Rect::new(100.0, 80.0, 320.0, 240.0) // Pozycja i rozmiar startowy
);

// Wyciągnij okno na wierzch:
pm.bring_to_front(window_id);`,
          collapsible: false
        }
      ]
    },
    {
      id: "panel-manager-api",
      title: "API Reference: PanelManager & Panel",
      apiTable: {
        headers: ["Metoda / Funkcja", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["PanelManager::new()", "brak", "PanelManager", "Tworzy nowy menedżer okien pulpitu."],
          ["pm.add(panel, rect)", "impl Panel, Rect", "PanelId", "Rejestruje okno w menedżerze i zwraca unikalne PanelId."],
          ["pm.bring_to_front(id)", "PanelId", "()", "Przenosi okno na sam wierzch warstwy Z-index."],
          ["pm.remove(id)", "PanelId", "Option<Box<dyn Panel>>", "Zamyka i usuwa okno wywołując on_close()."],
          ["pm.get_rect(id)", "PanelId", "Option<Rect>", "Zwraca aktualną pozycję i rozmiar okna."],
          ["panel.is_draggable()", "brak", "bool", "Domyślnie false. Nadpisz na true aby umożliwić przeciąganie."],
          ["panel.is_resizable()", "brak", "bool", "Domyślnie false. Nadpisz na true aby umożliwić zmianę rozmiaru."],
        ]
      }
    }
  ]
};
