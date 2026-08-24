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
- **\`ctx.camera.is_on_screen(pos, margin)\`**: Sprawdza, czy punkt znajduje się w kadrze kamery (Frustum Culling).`,
      codeExamples: [
        {
          title: "Wyprzedzanie Ruchu Gracza i Wstrząs Kamery",
          code: `// 1. Kamera wyprzedza gracza o 80px w stronę ruchu:
ctx.camera.look_ahead(player.position, player.velocity, 80.0, 4.0, ctx.dt());

// 2. Wstrząs kamery po otrzymaniu obrażeń:
if player.data.took_damage {
    ctx.camera.shake(0.2, 6.0);
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
2. **Letterboxing**: Obraz jest skalowany na środek okna z zachowaniem proporcji aspect ratio.
3. **Natywne Fonty**: Teksty interfejsu mogą być rysowane w pełnej rozdzielczości monitora dla idealnej ostrości.`,
      codeExamples: [
        {
          title: "Konfiguracja Rozdzielczości Wirtualnej i Skalowania Całkowitoliczbowego",
          code: `Engine::new(scenes)
    .with_virtual_resolution(480.0, 270.0) // 16:9 Pixel-Art
    .with_integer_scaling(true)           // Idealnie ostre, jednolite piksele
    .with_letterbox_color(DARKGRAY)       // Kolor pasów po bokach
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
  title: "20. 🧱 Siatki Kafelkowe & Rampy 45° (Tilemap)",
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
- **\`map.collides_oneway_landing(rect, prev_y) -> Option<f32>\`**: Wykrywa lądowanie stóp postaci na platformie OneWay.`,
      codeExamples: [
        {
          title: "Wczytywanie Mapy ASCII z Rampami i Platformami",
          code: `let mut map = Tilemap::new(sheet, vec2(16.0, 16.0), 32, 18)
    .with_solid_tiles([1])                               // Pełna ściana '#'
    .with_tile_collision(2, TileCollision::SlopeUpRight) // Rampa '/'
    .with_tile_collision(3, TileCollision::SlopeUpLeft)  // Rampa '\\'
    .with_tile_collision(4, TileCollision::OneWay);      // Platforma '='

map.load_from_ascii("
####################
#    ==            #
#         /\\       #
####################
", |c| match c {
    '#' => Some(1),
    '/' => Some(2),
    '\\\\' => Some(3),
    '=' => Some(4),
    _ => None,
});

// W update postaci: przyklejenie stóp do powierzchni rampy:
if let Some(ground_y) = map.get_slope_surface_y(player.position + vec2(8.0, 16.0)) {
    player.position.y = ground_y - 16.0;
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const particlesDoc = {
  id: "particles",
  title: "21. ✨ Emiter Cząsteczek & VFX (Particles)",
  description: "Fizyczny system cząsteczek 2D z grawitacją, wybuchami burst, ciągłym śladem i auto-usuwaniem ze świata.",
  sections: [
    {
      id: "particles-main",
      title: "Wybuchy, Ślady i Automatyczne Sprzątanie Pamięci",
      content: `\`ParticleEmitter\` generuje efekty cząsteczkowe ze wsparciem grawitacji i cyklu życia:

- **\`with_auto_destroy()\`**: Po wygaśnięciu wszystkich cząsteczek emiter sam usuwa się ze świata gry!
- **\`emit_burst(pos, count, color, speed_range, size, lifetime)\`**: Jednorazowy wybuch cząstek.
- **\`with_gravity(vec2)\`**: Grawitacja działająca na cząsteczki.`,
      codeExamples: [
        {
          title: "Wybuch Iskrzenia z Auto-Destroy",
          code: `let mut burst = ParticleEmitter::new()
    .with_gravity(vec2(0.0, 160.0))
    .with_auto_destroy();

// Wyemitowanie 30 pomarańczowych iskier z punktu trafienia:
burst.emit_burst(hit_pos, 30, ORANGE, (80.0, 220.0), 3.5, 0.45);

ctx.spawn(burst);`,
          collapsible: false
        }
      ]
    }
  ]
};

export const uiWidgetsDoc = {
  id: "ui-widgets",
  title: "22. 🖥️ Katalog Widgetów UI & BBCode",
  description: "Biblioteka gotowych elementów interfejsu: Button, ProgressBar, RichText z tagami BBCode, Slider i Panel.",
  sections: [
    {
      id: "ui-widgets-main",
      title: "Komponenty Interfejsu Użytkownika",
      content: `- **\`Button\`**: Przycisk z obsługą najechania myszą i callbacku \`.on_click(|ctx| ...)\`.
- **\`ProgressBar\`**: Pasek postępu/zdrowia z płynnym wypełnieniem i kolorem.
- **\`RichText\`**: Tekst z obsługą formatowania BBCode (np. \`[color=gold]Złoto[/color]\`, \`[color=red]Krew[/color]\`).
- **\`Slider\`**: Suwak do regulacji głośności lub czułości.
- **\`TextField\`**: Pole do wprowadzania tekstu przez gracza.`,
      codeExamples: [
        {
          title: "Przycisk z Callbackiem i Pasek Zdrowia",
          code: `// 1. Przycisk interaktywny:
let btn = Button::new("Zagraj Ponownie", vec2(100.0, 200.0), vec2(180.0, 40.0))
    .on_click(|ctx| ctx.switch_scene("Game"));

// 2. Pasek zdrowia gracza:
let hp_bar = ProgressBar::new(vec2(20.0, 20.0), vec2(200.0, 16.0))
    .with_value(0.75)
    .with_color(RED);`,
          collapsible: false
        }
      ]
    }
  ]
};

export const uiLayoutDoc = {
  id: "ui-layout",
  title: "23. 📐 Silnik Layoutu Flexbox (Column, Row, Grid)",
  description: "Automatyczne pozycjonowanie widgetów w kolumnach, wierszach i siatkach za pomocą makr deklaratywnych.",
  sections: [
    {
      id: "ui-layout-main",
      title: "Deklaratywne Układy Kolumnowe i Wierszowe",
      content: `Zamiast ręcznie liczyć współrzędne każdego przycisku, użyj silnika layoutu:

- **\`column![]\`**: Układa widgety pionowo jeden pod drugim.
- **\`row![]\`**: Układa widgety poziomo obok siebie.
- **\`Gap::new(pixels)\`**: Dyskretny odstęp pomiędzy elementami w układzie.
- **\`Grid::new(cols, rows)\`**: Siatka komórek (np. sloty ekwipunku).`,
      codeExamples: [
        {
          title: "Menu Główne z Makrem column!",
          code: `let main_menu = column![
    Text::new("Moja Wspaniała Gra", vec2(0.0, 0.0), 22.0, GOLD),
    Gap::new(20.0),
    Button::new("Nowa Gra", vec2(0.0, 0.0), vec2(200.0, 38.0))
        .on_click(|ctx| ctx.switch_scene("Game")),
    Gap::new(10.0),
    Button::new("Opcje", vec2(0.0, 0.0), vec2(200.0, 38.0)),
    Gap::new(10.0),
    Button::new("Wyjście", vec2(0.0, 0.0), vec2(200.0, 38.0)),
];`,
          collapsible: false
        }
      ]
    }
  ]
};

export const audioSfxDoc = {
  id: "audio-sfx",
  title: "24. 🎵 Audio, SFX & Zasoby (Sound)",
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
          title: "Wariacja Dźwięku i Ochrona Throttlera",
          code: `// Kroki postaci z subtelną wariacją:
ctx.play_sound_varied("step_sfx", 0.08, 0.1);

// Zbieranie monet (dźwięk może zagrać maksymalnie co 40ms):
ctx.play_sound_throttled("coin_pickup", 0.04);`,
          collapsible: false
        }
      ]
    }
  ]
};
