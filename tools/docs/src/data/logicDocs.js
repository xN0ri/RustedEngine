// ============================================================================
// 3. LOGIKA, ZDARZENIA & WEJŚCIE
// ============================================================================

export const eventBusDoc = {
  id: "event-bus",
  title: "11. ⚡ Magistrala Zdarzeń (EventBus)",
  description: "Typowana magistrala zdarzeń pub/sub z buforowaniem w fazie klatki oraz bezparametrowe sygnały tekstowe.",
  sections: [
    {
      id: "event-bus-main",
      title: "Typowane Zdarzenia & Sygnały",
      content: `\`EventBus\` (\`ctx.events\` / metody na \`ctx\`) umożliwia odprzężenie logiki pomiędzy obiektami:

- **Typowane Zdarzenia**: \`ctx.emit(MyEvent { ... })\`, \`ctx.poll::<MyEvent>()\` (drain).
- **Sygnały Tekstowe**: \`ctx.emit_signal("gate_opened")\`, \`ctx.poll_signal("gate_opened")\`, \`ctx.has_signal("gate_opened")\`.`,
      codeExamples: [
        {
          title: "Emisja Zdarzenia z Potwora i Odbiór w Kontrolerze Logiki",
          code: `#[derive(Clone, Debug)]
pub struct MonsterKilled {
    pub monster_name: String,
    pub xp_reward: u32,
}

// 1. Potwór emituje zdarzenie w chwili śmierci:
ctx.emit(MonsterKilled {
    monster_name: "Smok Jaskiniowy".into(),
    xp_reward: 500,
});

// 2. Kontroler punktów odbiera zdarzenia:
for kill in ctx.poll::<MonsterKilled>() {
    ctx.increment("player_xp", kill.xp_reward as i64);
    ctx.play_sound("level_up_sfx");
}`,
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
- **Mysz 2D**: \`ctx.mouse_world()\` (pozycja kursora w przestrzeni 2D świata gry).
- **\`ActionMap\`**: Łączenie nazwanych akcji z wieloma klawiszami i przyciskami myszy.`,
      codeExamples: [
        {
          title: "Łańcuchowe Tworzenie ActionMap i Odczyt Akcji",
          code: `let mut actions = ActionMap::new()
    .with_key("jump", KeyCode::Space)
    .with_key("jump", KeyCode::W)
    .with_mouse("shoot", Side::Left)
    .with_key("pause", KeyCode::Escape);

if actions.is_pressed("jump", &ctx.input) {
    player.data.velocity.y = -350.0;
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
      content: `\`Trigger\` ewaluuje warunek logiczny i automatycznie wykonuje akcję w fazie klatki:

- **\`Trigger::new(cond, action)\`**: Jednorazowy wyzwalacz (*One-Shot*).
- **\`Trigger::repeating(cond, action)\`**: Wykonywany w każdej klatce, w której warunek jest prawdziwy.
- **\`Trigger::when_flag_true(flag, action)\`**: Reaguje na flagę w \`StateStore\`.`,
      codeExamples: [
        {
          title: "Wyzwalacz Końca Gry po Utracie Zdrowia",
          code: `let game_over_trigger = Trigger::new(
    |ctx| ctx.get_int("player_hp").unwrap_or(100) <= 0,
    |ctx| {
        ctx.play_sound("game_over_fanfare");
        ctx.switch_scene("GameOver");
    },
);

scene.add_trigger(game_over_trigger);`,
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
      content: `\`Sequence\` pozwala budować liniowe i nieliniowe animacje fabularne bez pisania skomplikowanych timerów:

- \`Step::show_text("dialog", "tekst")\` — wyświetla kwestię dialogową.
- \`Step::wait(seconds)\` — pauza czasowa.
- \`Step::wait_for_input()\` — czeka na kliknięcie gracza.
- \`Step::branch_to("flaga", "etykieta_true", "etykieta_false")\` — rozgałęzienie.
- **\`Step::run(|ctx, world| { ... })\`** — wykonuje dowolny kod w świecie gry!`,
      codeExamples: [
        {
          title: "Prosta Cutscenka z Dialogiem i Nagrodą w Złocie",
          code: `let cutscene = Sequence::new(vec![
    Step::show_text("dialog_box", "Witaj, podróżniku! Weź tę nagrodę."),
    Step::wait_for_input(),
    Step::play_sound("gold_fanfare"),
    Step::run(|ctx, _| {
        ctx.increment("gold", 100);
    }),
    Step::set_visible("dialog_box", false),
    Step::end(),
]);`,
          collapsible: false
        }
      ]
    }
  ]
};

export const tweensTimersDoc = {
  id: "tweens-timers",
  title: "15. ⏳ Animacje Tween & Skalowanie Czasu",
  description: "Interpolacje wartości liczbowych i wektorowych (Tween, TweenVec2) oraz skalowanie czasu (Slow-Mo / Pause).",
  sections: [
    {
      id: "tweens-main",
      title: "Płynne Animacje Parametryczne & Slow-Motion",
      content: `- **\`Tween<f32>\`**: Płynna zmiana wartości zmiennoprzecinkowej w zadanym czasie.
- **\`TweenVec2\`**: Płynna animacja wektora 2D (np. przesunięcie panelu UI lub duszka).
- **\`ctx.set_time_scale(scale)\`**: Spowolnienie lub przyspieszenie upływu czasu (np. efekt Hitstop, Slow-Motion).
- **\`ctx.pause()\` / \`ctx.unpause()\` / \`ctx.toggle_pause()\`**: Wstrzymanie logiki gry.`,
      codeExamples: [
        {
          title: "Efekt Spowolnienia Czasu i Animacja Pozycji",
          code: `// 1. Spowolnienie czasu do 10% przy wybuchu:
ctx.set_time_scale(0.1);

// 2. Animacja wektora 2D w czasie 0.5s:
let mut move_tween = TweenVec2::new(vec2(0.0, 0.0), vec2(200.0, 100.0), 0.5);
move_tween.update(ctx.dt());
hero.position = move_tween.value();`,
          collapsible: false
        }
      ]
    }
  ]
};

export const mathGeometryDoc = {
  id: "math-geometry",
  title: "16. 📐 Geometria, Kolizje & Tłumienie (Math)",
  description: "Prymitywy geometryczne (Circle, Segment, Capsule), matematyka wektorowa i tłumienie sprężynowe smooth_damp.",
  sections: [
    {
      id: "math-main",
      title: "Prymitywy Kolizyjne & Płynne Tłumienie",
      content: `- **Prymitywy Geometryczne**: \`Circle\`, \`Segment\`, \`Capsule\`, \`Aabb\`.
- **Tłumienie Sprężynowe (\`smooth_damp_vec2\`)**: Eliminacja drgań kamery i płynne podążanie za celem bez szarpnięć.
- **Testy Przecięć**: \`capsule.intersects_circle(circle)\`, \`segment.closest_point(point)\`.`,
      codeExamples: [
        {
          title: "Tłumienie Sprężynowe Kamery i Kolizja Kapsuły",
          code: `// Płynne tłumienie kamery za graczem:
let smooth_pos = smooth_damp_vec2(
    ctx.camera.target,
    player_pos,
    &mut cam_velocity,
    0.15,
    1200.0,
    ctx.dt()
);
ctx.camera.target = smooth_pos;

// Sprawdzenie kolizji kapsuły z okręgiem:
let capsule = Capsule::new(vec2(10.0, 10.0), vec2(10.0, 50.0), 8.0);
let hit = capsule.intersects_circle(Circle::new(enemy_pos, 12.0));`,
          collapsible: false
        }
      ]
    }
  ]
};

export const rngProceduralDoc = {
  id: "rng-procedural",
  title: "17. 🎲 Liczby Losowe, Szum & Tabele Łupów (RNG)",
  description: "Deterministyczny generator PCG32, szum Perlina, tabele dropów z wagami (WeightedList) i talie bez powtórzeń (ShuffleBag).",
  sections: [
    {
      id: "rng-main",
      title: "Determinizm, Szum i Balansowane Losowania",
      content: `Silnik dostarcza pełen zestaw narzędzi do proceduralnej generacji i kontrolowanej losowości:

1. **\`Rng\` (PCG32)**: Deterministyczny generator liczb pseudolosowych z seedem.
2. **\`PerlinNoise\`**: Ciągły szum do generowania terenu i map wysokości.
3. **\`WeightedList<T>\`**: Ważona tabela dropu przedmiotów z szansami procentowymi.
4. **\`ShuffleBag<T>\`**: Worek losujący bez powtórzeń (jak talia kart w Tetrisie).
5. **\`random_in_annulus(min_r, max_r)\`**: Losowanie pozycji w pierścieniu wokół gracza.`,
      codeExamples: [
        {
          title: "Tabela Dropu i Worek Spawnera Wrogów",
          code: `// 1. Tabela dropu ze skarbów (WeightedList):
let mut loot_table = WeightedList::new();
loot_table.add("Złoto (x50)", 60.0);
loot_table.add("Mikstura Zdrowia", 30.0);
loot_table.add("Mityczny Miecz", 10.0);

let loot = loot_table.sample();
println!("Wylosowano nagrodę: {}", loot);

// 2. Worek losujący wrogów bez powtórzeń (ShuffleBag):
let mut enemy_bag = ShuffleBag::new(vec![
    "Goblin",
    "Ork",
    "Szaman",
    "Troll",
]);

for _ in 0..4 {
    println!("Spawn: {}", enemy_bag.next());
}`,
          collapsible: false
        }
      ]
    }
  ]
};
