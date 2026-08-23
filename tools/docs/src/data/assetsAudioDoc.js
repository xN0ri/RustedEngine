export const assetsAudioDoc = {
  id: "assets-audio",
  title: "7. 🎨 Asset Management, Audio & Bitmap Fonts",
  icon: "Image",
  badge: "Assets & Font Atlas",
  description: "Zarządca zasobów Assets, odtwarzanie dźwięków z losową wariacją i throttlerem (Audio/AmbientPool) oraz wypiekanie natywnych fontów pikselowych BitmapFont.",
  sections: [
    {
      id: "asset-manager",
      title: "Centralny Zarządca Zasobów Assets",
      content: `Struktura **\`Assets\`** (\`ctx.assets\`) stanowi pojedyncze źródło prawdy dla wszystkich załadowanych tekstur, dźwięków, czcionek i atlasów w silniku.`,
      subsections: [
        {
          id: "asset-normalization",
          title: "Normalizacja Ścieżek & Filtrowanie Pikselowe",
          content: `- **Normalizacja Ścieżek**: Metody ładujące (np. \`load_texture\`) automatycznie oczyszczają wiodące ukośniki (\`/assets/img.png\` $\to$ \`assets/img.png\`), eliminując błędy ładowania między systemami Windows/Linux/macOS/Wasm.
- **Filtrowanie Pikselowe**: \`load_texture_nearest\` automatycznie ustawia tryb filtrowania \`FilterMode::Nearest\` dla zachowania ostrych krawędzi w pixel-arcie.`
        },
        {
          id: "texture-and-sequences",
          title: "Ładowanie Sekwencji Klatek (load_frame_sequence)",
          content: `Pobiera sekwencje animacji na podstawie closure \`path_fn(i)\`, unikając problemów z dopełnianiem zerami (zero-padding):`,
          codeExamples: [
            {
              title: "Główny Przykład: Ładowanie Sekwencji Klatek i Tekstur",
              code: `// 1. Ładowanie tekstury z filtrowaniem Nearest
ctx.assets.load_texture_nearest("hero", "assets/sprites/hero.png").await?;

// 2. Ładowanie 30 klatek animacji z closure:
ctx.assets.load_frame_sequence(
    "intro_video",
    |i| format!("assets/video/rec_{:03}.png", i),
    30
).await?;`,
              collapsible: false
            },
            {
              title: "Rozszerzony Przykład: Masowe Ładowanie Wszystkich Dźwięków Gry",
              code: `let sound_names = ["slash", "dash", "hit_punch", "coin_pickup", "explosion", "game_over"];
for name in sound_names {
    ctx.assets.load_sound(name, &format!("assets/audio/{}.wav", name)).await?;
}`,
              collapsible: true,
              defaultCollapsed: true
            }
          ]
        }
      ]
    },
    {
      id: "bitmap-font",
      title: "Pikselowe Atlasy Czcionek BitmapFont (Zero-Blur Font Baking)",
      content: `Standardowe skalowanie czcionek TrueType (TTF) w grach pikselowych prowadzi do niepożądanego rozmycia krawędzi (anti-aliasing).`,
      subsections: [
        {
          id: "font-baking",
          title: "Wypiekanie Atlasu GPU & Progowanie Alfy",
          content: `Moduł **\`BitmapFont\`** rasteryzuje czcionkę TTF do binarnego atlasu tekstury GPU o natywnym rozmiarze siatki (\`native_size\`) z progowaniem alfy ($\ge 128 \to 255$, $< 128 \to 0$) oraz 1-pikselowym odstępem (padding) między glifami.`
        },
        {
          id: "native-size-detection",
          title: "Diagnostyka Natywnego Rozmiaru (detect_native_size)",
          content: `Silnik oferuje funkcję diagnostyczną \`BitmapFont::detect_native_size\`, która bada listę rozdzielczości kandydatów i wybiera ten o **najmniejszej liczbie rozmytych pikseli**!`,
          codeExamples: [
            {
              title: "Wypiekanie i Rysowanie BitmapFont",
              code: `// 1. Ładowanie i automatyczne wypiekanie atlasu o rozmiarze natywnym 8px
let font = ctx.assets.load_bitmap_font("pixel_ui", "assets/fonts/retro.ttf", 8).await?;

// 2. Rysowanie tekstu z zachowaniem idealnej ostrości pikseli dla skali 2.0x (16px)
font.draw("WYPISANY TEKST", 10.0, 10.0, 2.0, WHITE);`,
              collapsible: false
            }
          ]
        }
      ]
    },
    {
      id: "audio-system",
      title: "System Audio, Wariacje Dźwiękowe & Throttling",
      content: `Struktura **\`Audio\`** (\`ctx.audio\`) zarządza odtwarzaniem SFX, kanałami głośności oraz zaawansowanymi technikami audio.`,
      subsections: [
        {
          id: "audio-playback-and-crossfade",
          title: "Odtwarzanie, Kanały Głośności & Crossfade",
          content: `- **\`play(assets, name)\`**: Odtwarza dźwięk z uwzględnieniem \`sfx_volume\` i \`master_volume\`.
- **\`crossfade(assets, from, to, duration)\`**: Płynnie wygasza poprzednią ścieżkę muzyczną i rozgłaśnia nową.
- **Konstruktory głośności**: \`with_master_volume(0.8)\`, \`with_sfx_volume(0.9)\`, \`with_bgm_volume(0.6)\`.`
        },
        {
          id: "audio-variation-throttling",
          title: "Wariacje Dźwiękowe & Ear-Rape Prevention (Throttling)",
          content: `- **\`play_varied(assets, name, pitch_v, vol_v)\`**: Odtwarza dźwięk z losowym odchyleniem głośności i tonu, zapobiegając monotonii przy częstych powtórzeniach (kroki, strzały, dash).
- **\`play_throttled(assets, name, min_interval_secs)\`**: Ogranicza częstotliwość odpalania tego samego SFX (np. przy zniszczeniu 50 wrogów jednocześnie).`,
          codeExamples: [
            {
              title: "Główny Przykład: Dźwięki z Wariacją i Throttlingiem",
              code: `// Dźwięk dashu z wariacją:
ctx.play_sound_varied("dash_whoosh", 0.1, 0.15);

// Dźwięk podnoszenia monety throttlowany do max 1 na 0.08s:
ctx.play_sound_throttled("coin_pickup", 0.08);`,
              collapsible: false
            },
            {
              title: "Rozszerzony Przykład: Konfiguracja Puli Dźwięków Otoczenia (AmbientPool)",
              code: `let mut dungeon_ambient = AmbientPool::new(
    vec!["wind_gust", "drop_water", "distant_groan"],
    4.0,  // min 4 sekundy
    12.0  // max 12 sekund
);

// W klatce logiki gry:
dungeon_ambient.update(ctx.dt(), &ctx.assets);`,
              collapsible: true,
              defaultCollapsed: true
            }
          ]
        },
        {
          id: "ambient-pool",
          title: "Losowa Pula Dźwięków Otoczenia (AmbientPool)",
          content: `Generuje losowe dźwięki otoczenia (wiatr, skrzypienie, odległe dzwony) w konfigurowalnych odstępach czasu \`[min_interval, max_interval]\`.`
        }
      ]
    },
    {
      id: "assets-api-reference",
      title: "API Reference: Assets & Audio",
      apiTable: {
        headers: ["Metoda / Funkcja", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["ctx.assets.load_texture(name, path)", "&str, &str", "Result<Texture2D, Error>", "Wczytuje teksturę z normalizacją ścieżki."],
          ["ctx.assets.load_texture_nearest(name, path)", "&str, &str", "Result<Texture2D, Error>", "Wczytuje teksturę z filtrowaniem pikselowym Nearest."],
          ["ctx.assets.load_bitmap_font(name, path, size)", "&str, &str, u16", "Result<BitmapFont, Error>", "Wypieka binarny atlas GPU dla podanego rozmiaru natywnego."],
          ["ctx.play_sound_varied(name, pitch_v, vol_v)", "&str, f32, f32", "()", "Odtwarza dźwięk z losowym odchyleniem tonu i głośności."],
          ["ctx.play_sound_throttled(name, interval)", "&str, f32", "()", "Odtwarza dźwięk z ograniczeniem częstotliwości (throttling)."]
        ]
      }
    }
  ]
};
