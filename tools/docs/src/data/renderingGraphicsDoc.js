export const renderingGraphicsDoc = {
  id: "rendering-graphics",
  title: "8. 🖼️ Rendering Pipelines, Camera & Effects",
  icon: "Camera",
  badge: "Graphics Engine",
  description: "Pipeline skalowania wirtualnej rozdzielczości (Virtual Resolution), postprocessing shaderowy PostProcess, zaawansowany kontroler kamery 2D, culling widoku, tilemapy oraz cząsteczki z auto-destroy.",
  sections: [
    {
      id: "virtual-resolution-pipeline",
      title: "Pipeline Wirtualnej Rozdzielczości (Virtual Resolution & Scaling)",
      content: `Gdy gra jest projektowana w stałej rozdzielczości pikselowej (np. \`640 × 360\` lub \`320 × 180\`), włączenie opcji **\`Engine::with_virtual_resolution(vw, vh)\`** przełącza silnik w dwufazowy kompozytowy pipeline renderowania:`,
      subsections: [
        {
          id: "two-phase-rendering",
          title: "Fazy Renderowania i Bufor VRT",
          content: `1. **Bufor Wirtualny (\`SceneRenderTarget\`)**: Świat gry oraz nie-tekstowe widgety UI są rysowane do bufora o wymiarach \`vw × vh\` z filtrowaniem \`FilterMode::Nearest\`.
2. **Kompozycja z Letterboxingiem**: Bufor wirtualny jest skalowany na środek prawdziwego okna.
3. **Natywny Layer Tekstowy**: Teksty i logi są rysowane na fizycznej rozdzielczości ekranu dla idealnej ostrości.`
        },
        {
          id: "letterboxing-and-mouse",
          title: "Skalowanie Integer vs Smooth & Remapowanie Myszy",
          content: `- **Skalowanie Całkowitoliczbowe (\`with_integer_scaling(true)\`)**: Wymusza wielokrotności całkowite (1x, 2x, 3x) dla gwarancji identycznego rozmiaru pikseli retro.
- **Skalowanie Płynne (\`with_integer_scaling(false)\`)**: Wypełnia ekran krawędź-do-krawędzi (np. ułamkowe 5.33x dla ekrany QHD).
- **Remapowanie Myszy**: Współrzędne myszy w \`ctx.input.mouse_position()\` są przeliczane według wzoru: $x_{virt} = \frac{x_{raw} - ox}{scale}$.`,
          codeExamples: [
            {
              title: "Włączenie Wirtualnej Rozdzielczości i Koloru Ramek Letterbox",
              code: `Engine::new(scenes)
    .with_virtual_resolution(480.0, 270.0) // 16:9 pixel-art resolution
    .with_integer_scaling(true)           // Perfect uniform pixels
    .with_letterbox_color(DARKGRAY)       // Konfigurowalny kolor ramki letterboxu
    .run()
    .await;`,
              collapsible: false
            }
          ]
        }
      ]
    },
    {
      id: "camera-system",
      title: "Kontroler Kamery 2D `Camera` & Culling Widoku",
      content: `Struktura **\`Camera\`** (\`ctx.camera\`) zarządza widokiem 2D, śledzeniem obiektów, wstrząsami oraz zapytaniami o widoczność na ekranie (Frustum/View Culling).`,
      subsections: [
        {
          id: "camera-tracking-and-shake",
          title: "Płynne Śledzenie, Wyprzedzanie Ruchu & Shake",
          content: `- **Śledzenie z Wygładzaniem (\`follow\`)**: Płynnie podąża za celem przy użyciu interpolacji liniowej (\`lerp\`).
- **Wyprzedzanie Ruchu (\`look_ahead\`)**: Płynnie przesuwa cel kamery w stronę kierunku poruszania się postaci o zadaną odległość.
- **Efekt Wstrząsu (\`shake\`)**: Generuje losowe przesunięcia o podanej intensywności i czasie trwania.`,
          codeExamples: [
            {
              title: "Główny Przykład: Płynne Wyprzedzanie Ruchu Gracza",
              code: `// Wyprzedzanie kamery o 80px w kierunku ruchu postaci
ctx.camera.look_ahead(player.position, player.velocity, 80.0, 4.0, ctx.dt());

if ctx.events.poll_signal("explosion") {
    ctx.camera.shake(12.0, 0.4);
}`,
              collapsible: false
            },
            {
              title: "Rozszerzony Przykład: Ograniczenie Kamery do Granic Mapy (Camera Bounds Clamping)",
              code: `let half_w = ctx.camera.visible_world_rect().w * 0.5;
let half_h = ctx.camera.visible_world_rect().h * 0.5;

// Ograniczenie pozycji kamery wewnątrz obszaru mapy 0..2000 x 0..2000
ctx.camera.target.x = ctx.camera.target.x.clamp(half_w, 2000.0 - half_w);
ctx.camera.target.y = ctx.camera.target.y.clamp(half_h, 2000.0 - half_h);`,
              collapsible: true,
              defaultCollapsed: true
            }
          ]
        },
        {
          id: "camera-view-culling",
          title: "Zapytania o Widoczność na Ekranie (View Frustum Culling)",
          content: `- **\`visible_world_rect() -> Rect\`**: Zwraca prostokąt świata aktualnie widoczny na ekranie.
- **\`is_on_screen(pos, margin) -> bool\`**: Sprawdza, czy punkt w świecie mieści się na ekranie (z opcjonalnym marginesem).
- **\`is_rect_on_screen(rect, margin) -> bool\`**: Sprawdza, czy obwiednia obiektu nachodzi na widoczny obszar ekranu.
- **\`screen_to_world(pos)\`** / **\`world_to_screen(pos)\`**: Przeliczanie współrzędnych.`
        }
      ]
    },
    {
      id: "postprocessing-shaders",
      title: "Postprocessing Shaderowy `PostProcess`",
      content: `RustedEngine pozwala na podpięcie materiału shaderowego GLSL (\`PostProcess\`) pod renderowanie świata (\`engine.post_process = Some(...)\`).`,
      subsections: [
        {
          id: "glsl-pipeline",
          title: "Materiały GLSL & Zmienne Uniform",
          content: `Możesz użyć wbudowanej metody szablonowej \`PostProcess::passthrough()\`, aby stworzyć własny efekt (CRT scanlines, Vignette, Bloom, Sepia) i aktualizować zmienne uniformy przez \`set_uniform("u_time", time)\`.`,
          codeExamples: [
            {
              title: "Ustawienie Shadera Postprocessingu",
              code: `let mut pp = PostProcess::passthrough().unwrap();
pp.set_uniform("intensity", 0.8);
engine.post_process = Some(pp);`,
              collapsible: false
            }
          ]
        }
      ]
    },
    {
      id: "tilemap-and-particles",
      title: "Tilemapy (`Tilemap`) & System Cząsteczek (`ParticleEmitter`) z Auto-Destroy",
      content: `Narzędzia do tworzenia poziomów kafelkowych i dynamicznych efektów cząsteczkowych:`,
      subsections: [
        {
          id: "tilemap-ascii",
          title: "Siatka Kafelkowa & Zaawansowane Kształty Kolizji (`TileCollision`)",
          content: `- **\`Tilemap\`**: Obsługuje siatki kafelkowe z arkuszy tekstur, wczytywanie map wprost z ciągów ASCII (\`load_from_ascii\`) oraz precyzyjne kształty kolizji per kafelki.
- **Kształty Kolizji (\`TileCollision\`)**:
  - \`TileCollision::Solid\`: Pełna bryła AABB (\`16×16\`).
  - \`TileCollision::OneWay\`: Jednokierunkowa platforma (przenikalna od dołu, solidna od góry przy lądowaniu).
  - \`TileCollision::SlopeUpRight\` / \`SlopeUpLeft\`: 45-stopniowe rampy i pochyłości (wspinanie w prawo/lewo).
  - \`TileCollision::HalfBottom\` / \`HalfTop\`: Półpłytki (*half-slabs* o połowie wysokości).
  - \`TileCollision::CustomRect(Rect)\`: Własny podobszar kolizji w przestrzeni kafelka (np. kolce, płotki).
- **Zapytania Kolizyjne**:
  - \`collides_point(pos) -> bool\`: Precyzyjny test punktu (wspiera rampy i półpłytki).
  - \`get_slope_surface_y(pos) -> Option<f32>\`: Oblicza dokładną wysokość powierzchni rampy w świecie (do płynnego biegania po zboczach).
  - \`collides_oneway_landing(rect, prev_y) -> Option<f32>\`: Wykrywa lądowanie stóp postaci na platformie jednokierunkowej.`,
          codeExamples: [
            {
              title: "Przykład: Mapa ASCII z Rampami i Platformami Jednokierunkowymi",
              code: `let mut map = Tilemap::new(tile_texture, vec2(16.0, 16.0), 32, 18)
    .with_solid_tiles([1]) // Pełna bryła AABB '#'
    .with_tile_collision(2, TileCollision::SlopeUpRight) // Rampa wznosząca '/'
    .with_tile_collision(3, TileCollision::SlopeUpLeft)  // Rampa opadająca '\\'
    .with_tile_collision(4, TileCollision::OneWay)       // Platforma skokowa '='
    .with_tile_collision(5, TileCollision::HalfBottom);  // Półpłytka '_'

map.load_from_ascii("
####################
#                  #
#    ==            #
#         /\\       #
#   __   /  \\      #
####################
", |c| match c {
    '#' => Some(1),
    '/' => Some(2),
    '\\\\' => Some(3),
    '=' => Some(4),
    '_' => Some(5),
    _ => None,
});

// W update postaci: jeśli postać stoi na rampie, przyklejamy stopy do powierzchni:
if let Some(ground_y) = map.get_slope_surface_y(player.position + vec2(8.0, 16.0)) {
    player.position.y = ground_y - 16.0;
}`,
              collapsible: false
            }
          ]
        },
        {
          id: "particle-emitter-auto-destroy",
          title: "Cząsteczki, Grawitacja & Auto-Destroy",
          content: `- **\`ParticleEmitter\`**: Emiter cząsteczek 2D wspomagający wybuchy (\`emit_burst\`), ciągłą emisję (\`emit_continuous\`), grawitację, zanikanie alfy i zmniejszanie rozmiaru.
- **Auto-Destroy (\`with_auto_destroy()\`)**: Emiter jednorazowy po wygaśnięciu wszystkich wyemitowanych cząstek automatycznie oznacza się jako zniszczony (\`is_destroyed() == true\`) i zostaje usunięty ze świata!`,
          codeExamples: [
            {
              title: "Główny Przykład: Wybuch Cząsteczek z Auto-Destroy i Spawn w Context",
              code: `let mut explosion = ParticleEmitter::new()
    .with_gravity(vec2(0.0, 150.0))
    .with_auto_destroy(); // samoczynnie usunięty po wygaśnięciu cząstek

explosion.emit_burst(hit_pos, 40, ORANGE, (80.0, 220.0), 5.0, 0.5);
ctx.spawn(explosion);`,
              collapsible: false
            },
            {
              title: "Rozszerzony Przykład: Ciągły Ślad Cząstek za Gracze (Dust Trail Emitter)",
              code: `// Ciągły emiter dymu pod stopami postaci podczas ruchu
let mut trail = ParticleEmitter::new().with_gravity(vec2(0.0, -20.0));

if player.velocity.length_squared() > 10.0 {
    trail.emit_burst(player.position + vec2(16.0, 30.0), 2, GRAY, (10.0, 30.0), 2.5, 0.25);
}`,
              collapsible: true,
              defaultCollapsed: true
            }
          ]
        }
      ]
    },
    {
      id: "rendering-api-reference",
      title: "API Reference: Rendering, Camera & FX",
      apiTable: {
        headers: ["Metoda / Funkcja", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["ctx.camera.follow(target, speed, dt)", "Vec2, f32, f32", "()", "Płynnie śledzi pozycję celu."],
          ["ctx.camera.look_ahead(pos, vel, dist, speed, dt)", "Vec2, Vec2, f32, f32, f32", "()", "Płynnie wyprzedza kamerę w stronę ruchu."],
          ["ctx.camera.shake(intensity, duration)", "f32, f32", "()", "Wyzwala efekt wstrząsu ekranu."],
          ["ctx.camera.visible_world_rect()", "&self", "Rect", "Zwraca obszar świata widoczny aktualnie na ekranie."],
          ["ctx.camera.is_on_screen(pos, margin)", "Vec2, f32", "bool", "Sprawdza, czy punkt w świecie mieści się w kadrze kamery."],
          ["ParticleEmitter::new().with_auto_destroy()", "brak", "Self", "Włącza automatyczne usunięcie emitera po wygaśnięciu cząstek."]
        ]
      }
    }
  ]
};
