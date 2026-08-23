export const mathGeometryRngDoc = {
  id: "math-geometry-rng",
  title: "9. 📐 Math, Geometry, Time & RNG",
  icon: "Compass",
  badge: "Math & Spatial Systems",
  description: "Prymitywy geometryczne (Circle, Segment, Capsule), matematyka wektorowa, wygładzanie sprężynowe smooth_damp, animacje Tween/TweenVec2, timery oraz deterministyczny generator PCG32 i szum Perlina.",
  sections: [
    {
      id: "geometry-primitives",
      title: "Prymitywy Geometryczne i Kolizje Przestrzenne (`geometry.rs`)",
      content: `Moduł **\`geometry\`** dostarcza wydajne, uniwersalne prymitywy geometryczne 2D z gotowymi testami przecięć i metodami rysowania debugowego.`,
      subsections: [
        {
          id: "circle-primitive",
          title: "Koło Geometryczne (Circle)",
          content: `- **\`Circle::new(center: Vec2, radius: f32)\`**: Tworzy instancję koła.
- **\`contains(point: Vec2) -> bool\`**: Sprawdza zawieranie punktu wewnątrz koła.
- **\`intersects_circle(other) -> bool\`**: Test przecięcia dwóch kół.
- **\`intersects_rect(rect) -> bool\`**: Test przecięcia koła z prostokątem \`Rect\`.
- **\`bounding_box() -> Rect\`**: Zwraca obwiednię AABB.
- **\`draw(color)\`** / **\`draw_lines(thickness, color)\`**: Rysowanie debugowe.`
        },
        {
          id: "segment-primitive",
          title: "Odcinek (Segment) & Testy Dashu / Trajektorii",
          content: `- **\`Segment::new(a: Vec2, b: Vec2)\`**: Tworzy odcinek skierowany.
- **\`closest_point(p) -> Vec2\`**: Znajduje punkt na odcinku leżący najbliżej $p$.
- **\`distance_to_point(p) -> f32\`**: Najmniejsza odległość euklidesowa od punktu $p$.
- **\`intersects_circle(circle) -> bool\`**: Test przecięcia promienia dashu lub pocisku z kołem przeciwnika.
- **\`intersects_rect(rect) -> bool\`** & **\`intersects_segment(other) -> bool\`**.`,
          codeExamples: [
            {
              title: "Główny Przykład: Wykrywanie Przecięcia Dashu przez Przeciwnika",
              code: `use rusted_engine::prelude::*;

// Odcinek przebyty w trakcie pojedynczej klatki dashu:
let dash_segment = Segment::new(player.prev_pos, player.position);
let enemy_circle = Circle::new(enemy.center(), 16.0);

if dash_segment.intersects_circle(enemy_circle) {
    enemy.destroy();
    ctx.increment("score", 100);
    ctx.play_sound_varied("slash", 0.1, 0.1);
}`,
              collapsible: false
            }
          ]
        },
        {
          id: "capsule-primitive",
          title: "Kapsuła 2D (Capsule)",
          content: `Kapsuła 2D reprezentuje odcinek z zamiecionym promieniem (\`a: Vec2, b: Vec2, radius: f32\`).
Idealna do ciągłego sprawdzania kolizji szybkich obiektów, ciał postaci oraz szerokich cięć miecza/dashu.`
        }
      ]
    },
    {
      id: "vector-math-smoothing",
      title: "Rozszerzenia Wektorowe & Tłumienie Sprężynowe (`math.rs`)",
      content: `Cecha **\`Vec2Ext\`** rozszerza standardowy \`Vec2\` o kluczowe operacje matematyczne dla gier 2D.`,
      subsections: [
        {
          id: "vec2ext-helpers",
          title: "Metody Cechy Vec2Ext",
          content: `- **\`v.clamp_len(max)\`**: Ogranicza długość wektora do \`max\` bez zmiany kierunku.
- **\`v.move_towards(target, max_delta)\`**: Przesuwa punkt w stronę celu o maksymalnie \`max_delta\` jednostek.
- **\`v.perpendicular()\`**: Zwraca wektor prostopadły normalny \`(-y, x)\` obrócony o 90° w lewo.
- **\`v.project_onto(target)\`**: Rzutowanie wektora na podany kierunek.
- **\`v.reflect(normal)\`**: Odbicie wektora od powierzchni o zadanej normalnej.
- **\`v.angle_between(target)\`**: Kąt w radianach pomiędzy dwoma wektorami.
- **\`v.rotated(angle)\`**, **\`v.dir_to(target)\`**, **\`v.dist_to(target)\`**.`
        },
        {
          id: "spring-physics-smooth-damp",
          title: "Fizyka Tłumienia Sprężynowego (smooth_damp & smooth_damp_vec2)",
          content: `Krytycznie tłumiona sprężyna (odpowiednik *SmoothDamp* z silnika Unity) — gwarantuje idealnie płynne podążanie za celem **bez przeregulowań (zero overshoot)**.`,
          codeExamples: [
            {
              title: "Główny Przykład: Płynne Śledzenie Kursora z smooth_damp_vec2",
              code: `// W klatce update:
player.position = smooth_damp_vec2(
    player.position,
    ctx.mouse_world(),
    &mut player_velocity,
    0.12,                 // smooth_time w sekundach
    1500.0,               // max_speed
    ctx.dt()
);`,
              collapsible: false
            }
          ]
        }
      ]
    },
    {
      id: "time-scaling",
      title: "Skalowanie Czasu, Pauza & Timery (`time.rs`)",
      content: `Struktura **\`Time\`** (\`ctx.time\`) oraz bezpośrednie metody na \`Context\` zarządzają przepływem czasu w symulacji gry.`,
      subsections: [
        {
          id: "time-scale-and-pause",
          title: "Kontrola Tempa Gry, Skróty Context & Pauza",
          content: `- **\`ctx.dt()\`**: Skalowany czas klatki (zwraca \`0.0\`, gdy gra jest zapauzowana).
- **\`ctx.raw_dt()\`**: Nieskalowany fizyczny zegar sprzętowy.
- **\`ctx.pause()\`**, **\`ctx.unpause()\`**, **\`ctx.toggle_pause()\`**: Błyskawiczna pauza bez zatrzymywania renderera.
- **\`ctx.is_paused() -> bool\`**: Sprawdzenie stanu pauzy.
- **\`ctx.set_time_scale(scale)\`**: Mnożnik tempa gry (np. \`0.2\` dla bullet-time, \`2.0\` dla przyspieszenia).
- **\`ctx.elapsed() -> f64\`**, **\`ctx.fps() -> i32\`**: Licznik klatek i czas działania aplikacji.`,
          codeExamples: [
            {
              title: "Przykład: Bullet-Time przy Naciśnięciu Spacji",
              code: `if ctx.actions.is_down("focus") {
    ctx.set_time_scale(0.25); // 4x zwolnienie tempa gry
} else {
    ctx.set_time_scale(1.0);
}`,
              collapsible: false
            }
          ]
        },
        {
          id: "timer-utility",
          title: "Struktura Timer",
          content: `- **\`Timer::once(duration_secs)\`**: Tworzy jednorazowy zegar odliczający podaną liczbę sekund.
- **\`Timer::repeating(duration_secs)\`**: Tworzy automatycznie powtarzający się zegar.
- **\`timer.tick(dt) -> bool\`**: Zmniejsza licznik i zwraca \`true\` dokładnie w klatce ukończenia.
- **\`timer.time_remaining() -> f32\`**: Zwraca pozostały czas w sekundach.
- **\`timer.set_duration(new_dur)\`**: Zmienia czas trwania i resetuje zegar (idealne do skalowania poziomu trudności).
- **\`timer.progress() -> f32\`**: Zwraca postęp w zakresie \`0.0..=1.0\` (idealne do pasków ładowania).`
        }
      ]
    },
    {
      id: "rng-systems",
      title: "System Losowości, Deterministyczny PRNG & Szum Perlina (`rng.rs`)",
      content: `Kompletny zestaw narzędzi losowości dla symulacji i gier proceduralnych:`,
      subsections: [
        {
          id: "seeded-prng",
          title: "Deterministyczny Generator Rng (PCG32)",
          content: `- **\`Rng::new(seed: u64)\`** / **\`Rng::from_time()\`**: Gwarantuje identyczną sekwencję wyników na wszystkich systemach.
- Metody: \`next_f32()\`, \`range_f32(min, max)\`, \`range_i32(min, max)\`, \`gen_bool(chance)\`, \`gen_sign()\` (losowy znak \`-1.0\` lub \`1.0\`), \`gen_angle()\`, \`gen_spread(base, spread)\`, \`gen_normal(mean, std_dev)\`.`
        },
        {
          id: "spatial-distributions",
          title: "Próbkowanie Przestrzenne (Spatial Sampling)",
          content: `- **\`random_in_annulus(inner_r, outer_r)\`**: Jednorodne losowanie w pierścieniu (spawnowanie fal wrogów wokół gracza poza ekranem).
- **\`random_in_sector(radius, dir, angle_span)\`**: Losowanie w wycinku koła (stożek strzału, rozrzut broni).
- **\`random_in_circle(radius)\`**, **\`random_on_circle(radius)\`**, **\`random_in_rect(rect)\`**, **\`random_on_rect_perimeter(rect)\`**, **\`random_on_segment(a, b)\`**, **\`random_in_triangle(a, b, c)\`**.`
        },
        {
          id: "weighted-and-shuffle-collections",
          title: "Kolekcje Losowe: WeightedList & ShuffleBag",
          content: `- **\`WeightedList<T>\`**: Losowanie z wagami. Metoda **\`sample_without_replacement(amount)\`** pozwala wylosować $N$ unikalnych elementów z puli bez powtórzeń (np. 3 różne karty ulepszeń).
- **\`ShuffleBag<T>\`**: "Sprawiedliwy" worek losowości (fair randomizer w stylu Tetrisa) — gwarantuje, że każdy element pojawi się dokładnie raz przed powtórzeniem puli.`,
          codeExamples: [
            {
              title: "Główny Przykład: Spawnowanie Fal w Pierścieniu i Wybór Kart Ulepszeń",
              code: `use rusted_engine::prelude::*;

// 1. Spawnowanie wroga w pierścieniu o promieniu 350-500px od gracza
let spawn_pos = player_pos + random_in_annulus(350.0, 500.0);
ctx.spawn(Sprite::solid(spawn_pos, vec2(24.0, 24.0), RED));

// 2. Losowanie 3 unikalnych kart ulepszeń bez powtórzeń:
let mut upgrade_pool = WeightedList::new()
    .with("DashDistancePlus", 50.0)
    .with("CooldownReduction", 35.0)
    .with("ExtraDashCharge", 15.0)
    .with("MoveSpeedPlus", 60.0);

let choices = upgrade_pool.sample_without_replacement(3);
// choices zawiera dokładnie 3 różne karty!`,
              collapsible: false
            }
          ]
        },
        {
          id: "procedural-noise",
          title: "Generator Szumu Noise (Perlin & Fractal fBm)",
          content: `Ciągły, deterministyczny szum gradientowy \`get_1d(x)\`, \`get_2d(x, y)\` oraz wielooktawowy szum fraktalny \`fractal_2d(x, y, octaves, persistence, lacunarity)\` (niezastąpiony dla proceduralnego terenu, organicznego dryfu cząsteczek czy płynnego shake'a kamery).`
        }
      ]
    },
    {
      id: "math-api-reference",
      title: "API Reference: Math, Geometry, Time & RNG",
      apiTable: {
        headers: ["Funkcja / Metoda", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["Circle::new(center, radius)", "Vec2, f32", "Circle", "Tworzy koło geometryczne."],
          ["Segment::new(a, b)", "Vec2, Vec2", "Segment", "Tworzy odcinek 2D."],
          ["Capsule::new(a, b, radius)", "Vec2, Vec2, f32", "Capsule", "Tworzy kapsułę 2D."],
          ["smooth_damp_vec2(cur, tgt, vel, time, max, dt)", "Vec2, Vec2, &mut Vec2, f32, f32, f32", "Vec2", "Krytycznie tłumione wygładzanie wektora bez przeregulowań."],
          ["ctx.pause()", "&mut self", "()", "Zatrzymuje czas gry (deltatime staje się 0.0)."],
          ["ctx.toggle_pause()", "&mut self", "()", "Przełącza stan pauzy gry."],
          ["ctx.set_time_scale(scale)", "&mut self, f32", "()", "Ustawia mnożnik tempa gry."],
          ["Timer::once(secs)", "f32", "Timer", "Tworzy jednorazowy timer."],
          ["Timer::repeating(secs)", "f32", "Timer", "Tworzy timer powtarzalny."],
          ["timer.time_remaining()", "&self", "f32", "Zwraca pozostały czas do końca odliczania."],
          ["Rng::new(seed)", "u64", "Rng", "Inicjalizuje deterministyczny generator PCG32."],
          ["random_in_annulus(inner, outer)", "f32, f32", "Vec2", "Losuje punkt w pierścieniu o zadanych promieniach."],
          ["WeightedList::sample_without_replacement(n)", "&self, usize", "Vec<T>", "Losuje N unikalnych elementów bez powtórzeń."]
        ]
      }
    }
  ]
};
