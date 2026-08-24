// ============================================================================
// 3. LOGIKA, ZDARZENIA & WEJŚCIE (ROZSZERZONE O PEŁNE API)
// ============================================================================

export const eventBusDoc = {
  id: "event-bus",
  title: "11. ⚡ Magistrala Zdarzeń (EventBus)",
  description: "Typowana magistrala zdarzeń pub/sub z buforowaniem w fazie klatki oraz bezparametrowe sygnały tekstowe.",
  sections: [
    {
      id: "event-bus-main",
      title: "Typowane Zdarzenia & Sygnały",
      content: `\`EventBus\` (\`ctx.events\` / metody na \`ctx\`) umożliwia odprzężenie logiki pomiędzy obiektami gry, interfejsem użytkownika i kontrolerami:

- **Typowane Zdarzenia**: \`ctx.emit(MyEvent { ... })\`, \`ctx.poll::<MyEvent>()\` (operacja destrukcyjna - drain).
- **Sygnały Tekstowe**: \`ctx.emit_signal("gate_opened")\`, \`ctx.poll_signal("gate_opened")\`, \`ctx.has_signal("gate_opened")\`.`,
      codeExamples: [
        {
          title: "Emisja Zdarzenia z Potwora i Odbiór w Kontrolerze Logiki",
          code: `#[derive(Clone, Debug)]
pub struct MonsterKilled {
    pub monster_name: String,
    pub xp_reward: u32,
}

// 1. Potwór emituje zdarzenie w chwili zgonu:
ctx.emit(MonsterKilled {
    monster_name: "Smok Jaskiniowy".into(),
    xp_reward: 500,
});

// 2. Kontroler punktów i UI w fazie Logic odbiera zdarzenia:
let score_controller = Logic::run(|ctx| {
    for kill in ctx.poll::<MonsterKilled>() {
        let total_xp = ctx.increment("player_xp", kill.xp_reward as i64);
        ctx.play_sound("level_up_sfx");
        ctx.set_ui_text("xp_label", &format!("XP: {}", total_xp));
    }
});`,
          collapsible: false
        }
      ]
    }
  ]
};

export const inputActionsDoc = {
  id: "input-actions",
  title: "12. 🎮 Wejście & Mapowanie Akcji (ActionMap)",
  description: "Odczyt klawiatury, myszy w przestrzeni świata oraz konfigurowalny ActionMap z łańcuchowym konstruktorem.",
  sections: [
    {
      id: "input-actions-main",
      title: "Obsługa Klawiszy, Myszy i ActionMap",
      content: `- **Wektory ruchu**: \`ctx.input.wasd() -> Vec2\`, \`ctx.input.axis_x()\`.
- **Klawisze**: \`ctx.input.is_key_pressed(KeyCode::Space)\`, \`is_key_down\`.
- **Mysz 2D**: \`ctx.mouse_world()\` (pozycja kursora w przestrzeni 2D świata gry z uwzględnieniem kamery).
- **\`ActionMap\`**: Łączenie nazwanych akcji z wieloma klawiszami i przyciskami myszy (np. skok na Spacji oraz na W).`,
      codeExamples: [
        {
          title: "Łańcuchowe Tworzenie ActionMap i Odczyt Akcji",
          code: `let mut actions = ActionMap::new()
    .with_key("jump", KeyCode::Space)
    .with_key("jump", KeyCode::W)
    .with_key("jump", KeyCode::Up)
    .with_mouse("shoot", Side::Left)
    .with_key("dash", KeyCode::LeftShift)
    .with_key("pause", KeyCode::Escape);

// W update gracza:
if actions.is_pressed("jump", &ctx.input) && player.data.is_grounded {
    player.data.velocity.y = -380.0;
    ctx.play_sound_varied("jump", 0.08, 0.1);
}

if actions.is_down("shoot", &ctx.input) {
    // Ciągły ogień
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const triggersDoc = {
  id: "triggers",
  title: "13. 🎯 Silnik Reguł & Wyzwalacze (Trigger)",
  description: "Deklaratywny silnik reguł Warunek → Akcja (One-Shot i Repeating) operujący bezpośrednio na Context.",
  sections: [
    {
      id: "triggers-main",
      title: "Automatyczne Wyzwalacze Reguł",
      content: `\`Trigger\` automatycznie sprawdza warunek i wykonuje akcję w fazie klatki:

- **\`Trigger::new(cond, action)\`**: Jednorazowy wyzwalacz (*One-Shot*).
- **\`Trigger::repeating(cond, action)\`**: Wykonywany w każdej klatce, w której warunek jest spełniony.
- **\`Trigger::when_flag_true(flag, action)\`**: Reaguje natychmiast na flagę w \`StateStore\`.`,
      codeExamples: [
        {
          title: "Wyzwalacze Fabularne i Warunek Końca Gry",
          code: `// 1. Wyzwalacz zgonu gracza:
let game_over_trigger = Trigger::new(
    |ctx| ctx.get_int("player_hp").unwrap_or(100) <= 0,
    |ctx| {
        ctx.play_sound("game_over_fanfare");
        ctx.switch_scene("GameOver");
    },
);

// 2. Wyzwalacz odblokowania bramy po zebraniu 3 kluczy:
let gate_trigger = Trigger::new(
    |ctx| ctx.get_int("keys_collected").unwrap_or(0) >= 3,
    |ctx| {
        ctx.set_flag("dungeon_unlocked", true);
        ctx.play_sound("gate_open");
        ctx.camera.shake(0.3, 4.0);
    },
);

scene.add_trigger(game_over_trigger);
scene.add_trigger(gate_trigger);`,
          collapsible: false
        }
      ]
    }
  ]
};

export const sequencesDoc = {
  id: "sequences",
  title: "14. 🎬 Sekwencje & Cutscenki (Sequence)",
  description: "Krokowa maszyna stanów do dialogów, cutscenek, rozgałęzień fabularnych i wstrzykiwania kodu przez Step::run.",
  sections: [
    {
      id: "sequences-main",
      title: "Budowanie Cutscenek z Kroków Step",
      content: `\`Sequence\` pozwala budować nieliniowe animacje fabularne i dialogi bez konieczności tworzenia ręcznych timerów:

- \`Step::show_text("dialog", "tekst")\` — wyświetla kwestię dialogową.
- \`Step::wait(seconds)\` — pauza czasowa.
- \`Step::wait_for_input()\` — czeka na kliknięcie gracza.
- \`Step::branch_to("flaga", "etykieta_true", "etykieta_false")\` — rozgałęzienie dialogu.
- **\`Step::run(|ctx, world| { ... })\`** — wykonuje dowolny kod i mutuje stan w trakcie cutscenki!`,
      codeExamples: [
        {
          title: "Cutscenka z Dialogiem, Wstrzykiwaniem Logiki i Dźwiękiem",
          code: `let cutscene = Sequence::new(vec![
    Step::show_text("dialog_box", "Mędrcze: Czekałem na Ciebie, bohaterze!"),
    Step::wait_for_input(),
    Step::show_text("dialog_box", "Mędrcze: Weź to złoto i ruszaj do ruin."),
    Step::wait_for_input(),
    Step::play_sound("gold_fanfare"),
    Step::run(|ctx, _| {
        let gold = ctx.increment("player_gold", 200);
        ctx.set_ui_text("gold_counter", &format!("Złoto: {}", gold));
    }),
    Step::set_visible("dialog_box", false),
    Step::end(),
]);

ctx.spawn_logic(cutscene);`,
          collapsible: false
        }
      ]
    }
  ]
};

export const tweensTimersDoc = {
  id: "tweens-timers",
  title: "15. ⏳ Animacje Tween, Timery & Skalowanie Czasu",
  description: "Struktury pomiaru czasu (Timer, Cooldown, Stopwatch), interpolacje wartości i wektorów (TweenVec2) oraz Slow-Motion.",
  sections: [
    {
      id: "timers-system",
      title: "Timery, Cooldowny & Stoper (Time System)",
      content: `Moduł \`time\` dostarcza dedykowane narzędzia eliminujące konieczność ręcznego liczenia sekund:

- **\`Timer::repeating(interval)\`**: Cykliczny timer wyzwalany co określony czas (zwraca \`true\` w \`.tick(dt)\`).
- **\`Timer::once(duration)\`**: Jednorazowy timer opóźnienia.
- **\`Cooldown::new(duration)\`**: Licznik odnawiania umiejętności (\`.is_ready()\`, \`.trigger()\`).
- **\`Stopwatch::new()\`**: Stoper mierzący czas i międzyczasy (np. liczniki speedrunu).`,
      codeExamples: [
        {
          title: "Użycie Cooldownu i Timera w Grze",
          code: `use rusted_engine::prelude::*;

pub struct DashSkill {
    pub cooldown: Cooldown,
}

// 1. Inicjalizacja cooldownu (np. 1.5 sekundy):
let mut dash = DashSkill {
    cooldown: Cooldown::new(1.5),
};

// 2. W update gracza:
dash.cooldown.tick(ctx.dt());

if ctx.input.is_key_pressed(KeyCode::LeftShift) {
    if dash.cooldown.is_ready() {
        dash.cooldown.trigger();
        player.position += player.facing * 120.0;
        ctx.play_sound("dash_sfx");
    } else {
        println!("Umiejętność odnawia się! Pozostało: {:.1}s", dash.cooldown.remaining());
    }
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "tweens-main",
      title: "Animacje Parametryczne Tween & Krzywe Easing",
      content: `- **\`Tween<f32>\`**: Płynna zmiana wartości liczbowej z obsługą krzywych easing (\`EaseOutBounce\`, \`EaseOutElastic\`, \`EaseInOutCubic\`).
- **\`TweenVec2\`**: Płynna animacja pozycji 2D panelu UI lub duszka.
- **\`TweenColor\`**: Płynne przejścia kolorów (np. pulsowanie paska HP).
- **\`ctx.set_time_scale(scale)\`**: Spowolnienie czasu do ułamka (np. efekt Hitstop, Slow-Mo).`,
      codeExamples: [
        {
          title: "Animacja Pozycji z Krzywą EaseOutBack i Slow-Mo",
          code: `// 1. Spowolnienie czasu do 10% podczas wybuchu:
ctx.set_time_scale(0.1);

// 2. Płynne wysunięcie okna menu w 0.4s:
let mut slide_tween = TweenVec2::new(vec2(-300.0, 100.0), vec2(40.0, 100.0), 0.4)
    .with_easing(Easing::EaseOutBack);

slide_tween.update(ctx.unscaled_dt()); // unscaled_dt gwarantuje płynność nawet w pauzie!
panel.position = slide_tween.value();`,
          collapsible: false
        }
      ]
    }
  ]
};

export const mathGeometryDoc = {
  id: "math-geometry",
  title: "16. 📐 Geometria, Kolizje & Tłumienie (Math)",
  description: "Prymitywy geometryczne (Circle, Segment, Capsule, Ray2D), raycasting, tłumienie sprężynowe smooth_damp i interpolacje kątowe.",
  sections: [
    {
      id: "math-primitives",
      title: "Prymitywy Kolizyjne & Raycasting 2D",
      content: `Moduł \`geometry\` dostarcza precyzyjne kształty 2D i testy przecięć:

- **\`Circle::new(center, radius)\`**: Okrąg kolizyjny.
- **\`Segment::new(a, b)\`**: Odcinek w przestrzeni 2D (\`.closest_point(p)\`, \`.distance_to_point(p)\`).
- **\`Capsule::new(a, b, radius)\`**: Kapsuła kolizyjna (idealna do mieczy, laserów i korpusów postaci).
- **\`Ray2D::new(origin, dir)\`**: Promień raycastu z testem przecięcia z prostokątami AABB i okręgami.`,
      codeExamples: [
        {
          title: "Raycast Ściany i Kolizja Kapsuły",
          code: `use rusted_engine::prelude::*;

// 1. Raycast w linii wzroku gracza (zasięg 300px):
let ray = Ray2D::new(player.position, player.facing);
if let Some(hit) = ray.cast_against_rect(wall_rect, 300.0) {
    println!("Ściana trafiona w odległości {:.1}px w punkcie {:?}", hit.distance, hit.point);
}

// 2. Sprawdzenie przecięcia kapsuły ataku miecza z wrogiem:
let sword_capsule = Capsule::new(player.position, player.position + player.facing * 45.0, 14.0);
let enemy_circle = Circle::new(enemy.position, 16.0);

if sword_capsule.intersects_circle(enemy_circle) {
    println!("Cięcie mieczem trafiło wroga!");
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "math-smoothing",
      title: "Płynne Tłumienie Sprężynowe & Interpolacje Kątowe",
      content: `- **\`smooth_damp_vec2\`**: Matematycznie stabilne tłumienie sprężynowe (jak w Unity \`SmoothDamp\`) eliminujące szarpanie kamery.
- **\`lerp_angle(a, b, t)\`**: Płynna interpolacja kątowa z poprawnym przejściem przez granicę 0 / 2π radianów.
- **\`remap(val, in_min, in_max, out_min, out_max)\`**: Przelicza wartość z jednego przedziału liczbowego na inny.
- **\`approach(current, target, max_delta)\`**: Przesuwa wartość w stronę celu z maksymalnym limitem kroku.`,
      codeExamples: [
        {
          title: "Tłumienie Kamery i Płynny Obrót Wieżyczki",
          code: `// 1. Płynne podążanie kamery za celem:
let smooth_pos = smooth_damp_vec2(
    ctx.camera.target,
    player.position,
    &mut cam_velocity,
    0.15,
    1200.0,
    ctx.dt()
);
ctx.camera.target = smooth_pos;

// 2. Płynne celowanie wieżyczki w stronę myszy:
let target_dir = ctx.mouse_world() - turret.position;
let target_angle = target_dir.y.atan2(target_dir.x);
turret.rotation = lerp_angle(turret.rotation, target_angle, 8.0 * ctx.dt());`,
          collapsible: false
        }
      ]
    }
  ]
};

export const rngProceduralDoc = {
  id: "rng-procedural",
  title: "17. 🎲 Liczby Losowe, Szum & Tabele Łupów (RNG)",
  description: "Deterministyczny generator PCG32, przestrzenne losowania 2D, szum Perlina FBM, ważone tabele dropu (WeightedList) i talie bez powtórzeń (ShuffleBag).",
  sections: [
    {
      id: "rng-prng",
      title: "Deterministyczny Generator PCG32 (Rng)",
      content: `\`Rng\` to szybki, statystycznie doskonały i w 100% deterministyczny generator liczb pseudolosowych oparty o algorytm **PCG32**:

- **\`Rng::new(seed)\`**: Tworzy generator zadanym seedem (gwarantuje identyczną sekwencję losowań na każdym komputerze).
- **\`Rng::from_time()\`**: Generator z seedem pobranym z aktualnego czasu systemowego.
- **\`rng.range_f32(min, max)\`** / **\`rng.range_i32(min, max)\`**: Losowanie liczb zmienno- i całkowitoliczbowych.
- **\`rng.gen_bool(chance)\`**: Losuje \`true\` z podanym prawdopodobieństwem (np. \`0.25\` dla 25% szansy).
- **\`rng.choose(&slice)\`** / **\`rng.shuffle(&mut slice)\`**: Wybór losowego elementu i tasowanie tablicy.`,
      codeExamples: [
        {
          title: "Deterministyczne Generowanie Świata z Seedem",
          code: `use rusted_engine::prelude::*;

// Ten sam seed zawsze wygeneruje dokładnie ten sam układ poziomów:
let mut rng = Rng::new(1337420);

for room_idx in 0..5 {
    let width = rng.range_i32(8, 16);
    let height = rng.range_i32(6, 12);
    let has_chest = rng.gen_bool(0.35); // 35% szansy na skrzynię
    println!("Pokój {}: wymiary {}x{}, skrzynia: {}", room_idx, width, height, has_chest);
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "rng-spatial",
      title: "Przestrzenne Losowania 2D & Kolory",
      content: `Silnik zawiera zestaw gotowych funkcji do losowania geometrycznego w przestrzeni 2D:

- **\`random_in_circle(radius) -> Vec2\`**: Losuje punkt o jednolitym rozkładzie wewnątrz koła.
- **\`random_in_annulus(min_r, max_r) -> Vec2\`**: Losuje punkt w pierścieniu (np. spawn wrogów poza ekranem).
- **\`random_in_rect(rect) -> Vec2\`**: Losuje punkt wewnątrz zadanego prostokąta.
- **\`random_dir_2d() -> Vec2\`**: Losuje znormalizowany wektor jednostkowy w losowym kierunku 360°.
- **\`random_color_hsl(h_range, s_range, l_range) -> Color\`**: Losuje harmonijny kolor w przestrzeni HSL.`,
      codeExamples: [
        {
          title: "Losowanie Wrogów w Pierścieniu i Iskry Cząstek",
          code: `// 1. Spawner wrogów losujący pozycję w bezpiecznej odległości od gracza:
let spawn_offset = random_in_annulus(380.0, 550.0);
let enemy_pos = player.position + spawn_offset;

// 2. Rozrzut cząsteczek we wszystkich kierunkach:
for _ in 0..15 {
    let dir = random_dir_2d();
    let speed = random_range(80.0, 220.0);
    let spark_color = random_color_hsl((0.08, 0.14), (0.8, 1.0), (0.5, 0.7)); // Odcienie pomarańczu/złota
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "rng-loot",
      title: "Ważone Tabele Dropu (WeightedList) & Talie (ShuffleBag)",
      content: `1. **\`WeightedList<T>\`**: Pozwala przypisać wagi procentowe do przedmiotów (np. 70% Zwykły, 25% Rzadki, 5% Legendarny).
2. **\`ShuffleBag<T>\`**: Eliminuje frustrujące serie pecha lub szczęścia (jak algorytm 7-bag w Tetrisie). Po wyczerpaniu talia automatycznie się przetasowuje.`,
      codeExamples: [
        {
          title: "Tabela Dropu i Spawner Potworów z ShuffleBag",
          code: `// 1. Ważona tabela dropu ze skrzyń:
let mut loot_table = WeightedList::new();
loot_table.add("Złote Monety (x100)", 65.0);
loot_table.add("Mikstura Odnowy", 25.0);
loot_table.add("Mityczny Topór", 10.0);

let reward = loot_table.sample();
println!("Nagroda: {}", reward);

// 2. Uczciwy spawner wrogów (gwarantuje pojawienie się każdego typu):
let mut bag = ShuffleBag::new(vec![
    "Goblin Wojownik",
    "Goblin Łucznik",
    "Ork Szaman",
    "Kamienny Golem",
]);

for round in 1..=4 {
    println!("Runda {}: Przeciwnik: {}", round, bag.next());
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "rng-perlin",
      title: "Szum Perlina & Fraktalna Generacja Terenu (FBM)",
      content: `\`PerlinNoise\` generuje ciągły, gładki szum wielowymiarowy:

- **\`noise.get2d(x, y)\`**: Zwraca wartość szumu w przedziale \`[-1.0, 1.0]\`.
- **\`noise.fbm2d(x, y, octaves, persistence, lacunarity)\`**: Fraktalny szum wielooktawowy (*Fractal Brownian Motion*) idealny do generowania wysp, biomów i jaskiń.`,
      codeExamples: [
        {
          title: "Generowanie Mapy Wysokości Terenu za Pomocą FBM",
          code: `let noise = PerlinNoise::new(98765);

for y in 0..20 {
    for x in 0..40 {
        // Obliczenie wysokości terenu z 4 oktawami szumu:
        let elevation = noise.fbm2d(x as f32 * 0.08, y as f32 * 0.08, 4, 0.5, 2.0);

        let tile_char = if elevation < -0.2 {
            '~' // Woda
        } else if elevation < 0.3 {
            '.' // Trawa
        } else {
            '^' // Góry
        };
        print!("{}", tile_char);
    }
    println!();
}`,
          collapsible: false
        }
      ]
    }
  ]
};
