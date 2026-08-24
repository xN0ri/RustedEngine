// ============================================================================
// 3. LOGIKA, ZDARZENIA & WEJŚCIE (ROZSZERZONE O PEŁNE API)
// ============================================================================

export const eventBusDoc = {
  id: "event-bus",
  title: "11. ⚡ Event Bus, Actions, Inputs & Context Ergonomics",
  badge: "Messaging & Inputs",
  description: "Magistrala zdarzeń EventBus, sygnały tekstowe, mapowanie akcji ActionMap, silnik reguł Trigger z pełnym dostępem do Context oraz osie wejść 2D.",
  sections: [
    {
      id: "event-bus-main",
      title: "Magistrala Zdarzeń `EventBus` — Odprzęganie Logiki",
      content: `Komponent **\`EventBus\`** (\`ctx.events\` / metody na \`ctx\`) pozwala na komunikację **pub/sub** pomiędzy różnymi obiektami gry i scenami bez konieczności trzymania bezpośrednich referencji.`,
      subsections: [
        {
          id: "typed-events",
          title: "Typowane Zdarzenia z Ładunkiem (emit<E> / poll<E>)",
          content: `Przesyłają dowolną strukturę Rust (\`E: 'static + Send + Sync\`). Zdarzenia są buforowane w kanale typowanym i pobierane przez \`ctx.poll::<E>()\` (operacja **destrukcyjna — drain**).

Warstwa **\`Logic\`** wykonuje się po obiektach świata, co daje gwarancję odbioru wszystkich zdarzeń wyemitowanych w danej klatce bez względu na kolejność encji.`,
          codeExamples: [
            {
              title: "Emisja i Odbiór Typowanych Zdarzeń",
              code: `#[derive(Clone, Debug)]
pub struct PlayerDied {
    pub killer_name: String,
    pub score: u64,
}

// 1. Emisja zdarzenia z encji
ctx.emit(PlayerDied {
    killer_name: "Goblin King".into(),
    score: 1250,
});

// 2. Odbiór zdarzeń w kontrolerze Logic
for event in ctx.poll::<PlayerDied>() {
    println!("Gracz zginął od {} z punktami {}", event.killer_name, event.score);
    ctx.switch_scene("GameOver");
}`,
              collapsible: false
            },
            {
              title: "Rozbudowany Przykład: Kontroler Punktów z EventBus",
              code: `#[derive(Clone, Debug)]
pub struct MonsterKilled {
    pub monster_name: String,
    pub xp_reward: u32,
}

// Potwór emituje zdarzenie w chwili zgonu:
ctx.emit(MonsterKilled {
    monster_name: "Smok Jaskiniowy".into(),
    xp_reward: 500,
});

// Kontroler punktów i UI w fazie Logic odbiera zdarzenia:
let score_controller = Logic::run(|ctx| {
    for kill in ctx.poll::<MonsterKilled>() {
        let total_xp = ctx.increment("player_xp", kill.xp_reward as i64);
        ctx.play_sound("level_up_sfx");
        ctx.set_ui_text("xp_label", &format!("XP: {}", total_xp));
    }
});`,
              collapsible: true,
              defaultCollapsed: true
            }
          ]
        },
        {
          id: "text-signals",
          title: "Sygnały Tekstowe (emit_signal / poll_signal)",
          content: `Lekkie flagi tekstowe **bez ładunku danych**. Idealne dla prostych impulsów (np. \`"door_opened"\`, \`"wave_cleared"\`, \`"boss_spawned"\`). Bezpośrednie skróty dostępne na \`Context\`:

- \`ctx.emit_signal("open_gate")\` — emituje sygnał.
- \`ctx.poll_signal("open_gate") -> bool\` — zwraca \`true\` i **konsumuje** sygnał.
- \`ctx.has_signal("open_gate") -> bool\` — sprawdza obecność sygnału **bez konsumowania**.

> [!TIP]
> Sygnały są idealne kiedy chcesz wysłać prosty impuls (np. "gracz skoczył") bez definiowania osobnej struktury zdarzenia. Używaj typowanych zdarzeń \`emit<E>\` gdy potrzebujesz przesłać dane (np. punkty, pozycję, nazwę).`
        }
      ]
    },
    {
      id: "action-map-and-inputs",
      title: "Mapowanie Akcji `ActionMap` & Osie Ruchu `Input`",
      content: `Zamiast sprawdzać konkretne kody klawiszy w kodzie obiektów, podepnij je do **nazwanych akcji** za pomocą \`ActionMap\` i wielokierunkowych osi.`,
      subsections: [
        {
          id: "action-map-builder",
          title: "Płynny Konstruktor ActionMap (Fluent Builder)",
          content: `Powiązania klawiszy i przycisków myszy można konfigurować łańcuchowo za pomocą \`.with_key(action, key)\` oraz \`.with_mouse(action, btn)\`:`,
          codeExamples: [
            {
              title: "Łańcuchowa Rejestracja Powiązań Klawiszy",
              code: `let actions = ActionMap::new()
    .with_key("dash", KeyCode::Space)
    .with_key("dash", KeyCode::LeftShift)     // wiele klawiszy dla jednej akcji
    .with_mouse("dash", Side::Right)           // prawy przycisk myszy też dashuje
    .with_key("pause", KeyCode::Escape)
    .with_key("interact", KeyCode::E);

// Sprawdzenie akcji w update() encji:
if ctx.action_pressed("dash") {
    obj.data.velocity = obj.data.dash_dir * DASH_SPEED;
}`,
              collapsible: false
            }
          ]
        },
        {
          id: "movement-axes",
          title: "Wielokierunkowe Osie Ruchu (axis_2d & axis_1d)",
          content: `- **\`ctx.input.axis_2d(left, right, up, down) -> Vec2\`** — tworzy znormalizowany wektor ruchu z 4 klawiszy.
- **\`ctx.input.wasd() -> Vec2\`** oraz **\`ctx.input.arrow_keys() -> Vec2\`** — gotowe skróty dla sterowania ruchem.
- **\`ctx.input.axis_1d(negative, positive) -> f32\`** — zwraca wartość w przedziale \`[-1.0, 1.0]\`.`,
          codeExamples: [
            {
              title: "Sterowanie Ruchem z Wektorem Kierunku",
              code: `// Gotowe skróty WASD i strzałki:
let dir = ctx.input.wasd();           // Vec2 znormalizowany
let dir_arrows = ctx.input.arrow_keys();

// Lub własna oś z dowolnych klawiszy:
let horizontal = ctx.input.axis_1d(KeyCode::A, KeyCode::D);
let vertical   = ctx.input.axis_1d(KeyCode::W, KeyCode::S);

// Ruch z prędkością:
obj.position += dir * SPEED * ctx.dt;`,
              collapsible: false
            }
          ]
        },
        {
          id: "mouse-context-helpers",
          title: "Współrzędne Świata i Przyciski Myszy",
          content: `- \`ctx.mouse_world() -> Vec2\` — zwraca pozycję kursora w **przestrzeni świata** gry przeliczoną przez aktywną kamerę i letterboxing.
- \`ctx.mouse_pressed(Side::Left)\`, \`ctx.mouse_down(Side::Right)\`, \`ctx.mouse_released(Side::Middle)\` — przyciski myszy.`,
          codeExamples: [
            {
              title: "Look-At (Obrót Encji w Stronę Kursora)",
              code: `// Obrót obiektu zawsze w stronę kursora myszy:
let mouse_pos = ctx.mouse_world();
obj.look_at(mouse_pos);

// Strzelanie po kliknięciu LPM:
if ctx.mouse_pressed(Side::Left) {
    let dir = (mouse_pos - obj.position).normalize_or_zero();
    ctx.spawn(Bullet::new(obj.position, dir));
}`,
              collapsible: false
            }
          ]
        }
      ]
    },
    {
      id: "resources-and-triggers",
      title: "Typowane Zasoby `Resources` & Silnik Reguł `TriggerSystem`",
      content: `Architektura zasobów i reguł reaktywnych w RustedEngine:`,
      subsections: [
        {
          id: "resources-typemap",
          title: "Typowany Magazyn Zasobów (Type-Map)",
          content: `\`Resources\` (\`ctx.resources\`) przechowuje globalne, typowane struktury stanu rozgrywki (\`GameState\`, \`Inventory\`, \`Config\`) indeksowane przez typ Rust (\`TypeId\`). **Zapobiega błędom literówek** i zapewnia pełne bezpieczeństwo typów bez używania stringów.

> [!NOTE]
> \`Resources\` to jedyny zalecany sposób na przechowywanie globalnego stanu rozgrywki. Nie używaj zmiennych globalnych \`static mut\` — zamiast tego używaj \`ctx.resources.insert(GameState { ... })\`.`,
          codeExamples: [
            {
              title: "Wstawianie i Odczyt Zasobu Globalnego",
              code: `pub struct GameState {
    pub player_hp: i32,
    pub score: u64,
    pub wave: u32,
}

// Rejestracja zasobu na starcie sceny:
ctx.resources.insert(GameState {
    player_hp: 100,
    score: 0,
    wave: 1,
});

// Mutacja w dowolnym miejscu:
if let Some(state) = ctx.resources.get_mut::<GameState>() {
    state.score += 100;
    state.wave += 1;
}`,
              collapsible: false
            }
          ]
        },
        {
          id: "trigger-rules-engine",
          title: "Silnik Reguł Warunek → Akcja (TriggerSystem)",
          content: `\`TriggerSystem\` (\`ctx.triggers\`) przechowuje reguły \`Trigger\`, które ewaluują warunek **co klatkę** z pełnym dostępem do \`&Context\`. Gdy warunek zostanie spełniony, wywoływana jest akcja \`action(&mut Context)\`.

Triggery są **automatycznie napędzane** przez silnik przed aktualizacją obiektów świata — nie trzeba ich ręcznie wywoływać w pętli.

- **Jednorazowe (\`Trigger::new\`, domyślne)** — odpalają się dokładnie **raz** w pierwszej klatce gdy warunek staje się \`true\`, po czym trwale się wyłączają. Idealne do zmiany scen i odblokowywania osiągnięć.
- **Powtarzalne (\`.repeating()\`)** — odpalają się w **każdej klatce**, w której warunek jest prawdziwy (level-triggered).
- **Konstruktory flag**: \`Trigger::when_flag_true("boss_dead", action)\` oraz \`Trigger::when_flag_false("flag", action)\`.`,
          codeExamples: [
            {
              title: "One-Shot Trigger: Zmiana Sceny po Śmierci Gracza",
              code: `// Jednorazowy trigger przełączający scenę gdy HP spadnie do 0:
ctx.triggers.register(Trigger::new(
    |ctx| ctx.resources.get::<GameState>().is_some_and(|g| g.player_hp <= 0),
    |ctx| {
        ctx.switch_scene("GameOver");
    }
));`,
              collapsible: false
            },
            {
              title: "Repeating Trigger: Alarm Niskiego HP (co klatkę)",
              code: `ctx.triggers.register(
    Trigger::new(
        |ctx| ctx.resources.get::<GameState>().is_some_and(|g| g.player_hp < 20),
        |ctx| {
            // Efekt pulsującego ostrzeżenia co klatkę gdy HP < 20
            ctx.state.set_bool("low_hp_alarm", true);
            ctx.emit_signal("play_heartbeat");
        }
    ).repeating()
);`,
              collapsible: true,
              defaultCollapsed: true
            },
            {
              title: "Trigger na Flagę: Otwarcie Drzwi po Zabiciu Bossa",
              code: `// Rejestracja flagi:
ctx.state.set_bool("boss_dead", false);

// Trigger aktywuje się gdy flaga boss_dead staje się true:
ctx.triggers.register(
    Trigger::when_flag_true("boss_dead", |ctx| {
        ctx.emit_signal("open_boss_door");
        ctx.play_sound("victory_fanfare");
    })
);

// Gdzieś w Boss::update():
if boss.data.hp <= 0 {
    ctx.state.set_bool("boss_dead", true); // → trigger odpali się w tej klatce
}`,
              collapsible: true,
              defaultCollapsed: true
            }
          ]
        }
      ]
    },
    {
      id: "events-api-reference",
      title: "API Reference: Events, Actions & Inputs",
      apiTable: {
        headers: ["Metoda / Funkcja", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["ctx.emit(event)", "E: 'static + Send + Sync", "()", "Emituje typowane zdarzenie na magistralę EventBus."],
          ["ctx.poll::<E>()", "brak", "Vec<E>", "Pobiera i czyści (drain) kolejkę odebranych zdarzeń typu E."],
          ["ctx.has_event::<E>()", "brak", "bool", "Sprawdza, czy w kanale oczekują zdarzenia typu E."],
          ["ctx.emit_signal(name)", "impl Into<String>", "()", "Emituje prosty sygnał tekstowy bez ładunku."],
          ["ctx.poll_signal(name)", "&str", "bool", "Sprawdza i konsumuje sygnał tekstowy."],
          ["ctx.has_signal(name)", "&str", "bool", "Sprawdza obecność sygnału tekstowego bez konsumowania."],
          ["Trigger::new(cond, act)", "Fn(&Context)->bool, FnMut(&mut Context)", "Trigger", "Tworzy jednorazowy (one-shot) trigger reguły gry."],
          ["trigger.repeating()", "self", "Trigger", "Ustawia tryb powtarzalny (odpala w każdej klatce gdy warunek true)."],
          ["Trigger::when_flag_true(name, act)", "&str, FnMut(&mut Context)", "Trigger", "Odpala akcję gdy flaga bool w StateStore staje się true."],
          ["ctx.action_pressed(name)", "&str", "bool", "Sprawdza czy nazwana akcja ActionMap została właśnie wciśnięta."],
          ["ctx.action_down(name)", "&str", "bool", "Sprawdza czy nazwana akcja ActionMap jest aktualnie trzymana."],
          ["ctx.input.wasd()", "&self", "Vec2", "Zwraca znormalizowany wektor ruchu ze sterowania WASD."],
          ["ctx.input.arrow_keys()", "&self", "Vec2", "Zwraca znormalizowany wektor ruchu ze strzałek."],
          ["ctx.input.axis_2d(...)", "left, right, up, down: KeyCode", "Vec2", "Tworzy wektor ruchu z 4 dowolnych klawiszy."],
          ["ctx.input.axis_1d(neg, pos)", "KeyCode, KeyCode", "f32", "Zwraca oś w przedziale [-1.0, 1.0]."],
          ["ctx.mouse_world()", "&self", "Vec2", "Przelicza pozycję kursora do przestrzeni świata 2D."],
          ["ctx.mouse_pressed(side)", "Side", "bool", "Sprawdza czy przycisk myszy został właśnie wciśnięty."],
          ["ctx.mouse_down(side)", "Side", "bool", "Sprawdza czy przycisk myszy jest aktualnie trzymany."]
        ]
      }
    }
  ]
};



export const inputActionsDoc = {
  id: "input-actions",
  title: "12. 🎮 Wejście & Mapowanie Akcji (ActionMap)",
  badge: "Input System",
  description: "Odczyt klawiatury, myszy w przestrzeni świata, kółko scroll, wpisywany znak oraz konfigurowalny ActionMap z łańcuchowym konstruktorem i unbind.",
  sections: [
    {
      id: "input-raw",
      title: "Surowy Odczyt Klawiatury i Myszy (Input)",
      content: `Struktura **\`Input\`** (\`ctx.input\`) dostępna w każdym \`update()\` eksponuje pełny odczyt stanu urządzeń wejścia.

### Klawiatura — 3 stany klawisza:
- **\`ctx.input.is_key_pressed(key)\`** — \`true\` **tylko w jednej klatce** gdy klawisz został właśnie wciśnięty.
- **\`ctx.input.is_key_down(key)\`** — \`true\` przez **wszystkie klatki** gdy klawisz jest trzymany.
- **\`ctx.input.is_key_up(key)\`** — \`true\` **tylko w jednej klatce** gdy klawisz został właśnie puszczony.

### Mysz:
- **\`ctx.input.mouse_position() -> Vec2\`** — pozycja myszy w wirtualnych współrzędnych (z letterboxingiem).
- **\`ctx.input.raw_mouse_position() -> Vec2\`** — surowa pozycja w pikselach OS (bez remapowania).
- **\`ctx.input.is_mouse_button_down(btn)\`**, **\`is_mouse_button_pressed\`**, **\`is_mouse_button_released\`**.
- **\`ctx.input.mouse_scroll() -> Vec2\`** — przesunięcie kółka myszy \`(x, y)\` w tej klatce.

### Znaki tekstowe:
- **\`ctx.input.pressed_char() -> Option<char>\`** — znak wpisany w tej klatce (do obsługi pól tekstowych).`,
      codeExamples: [
        {
          title: "Odczyt Klawiszy, Myszy i Scrolla",
          code: `// Skok tylko przy wciśnięciu (nie trzymaniu):
if ctx.input.is_key_pressed(KeyCode::Space) && player.data.is_grounded {
    player.data.velocity.y = -360.0;
}

// Ciągły ogień gdy trzymany LPM:
if ctx.input.is_mouse_button_down(MouseButton::Left) {
    player.data.fire_timer -= ctx.dt();
    if player.data.fire_timer <= 0.0 { /* strzał */ }
}

// Kółko myszy do przełączania broni:
let scroll = ctx.input.mouse_scroll();
if scroll.y > 0.5 { player.data.next_weapon(); }
if scroll.y < -0.5 { player.data.prev_weapon(); }

// Obsługa pola tekstowego:
if let Some(c) = ctx.input.pressed_char() {
    player.data.name_input.push(c);
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "input-axes",
      title: "Osie Ruchu (axis_2d, axis_1d, wasd, arrow_keys)",
      content: `Metody osiowe zwracają **znormalizowany wektor** lub wartość float — silnik automatycznie normalizuje wektor diagonalny (\`45°\`) do długości \`1.0\`, eliminując szybszy ruch po skosie.

- **\`ctx.input.wasd() -> Vec2\`** — skrót: A/D = oś X, W/S = oś Y (znormalizowany).
- **\`ctx.input.arrow_keys() -> Vec2\`** — to samo ze strzałkami klawiatury.
- **\`ctx.input.axis_2d(left, right, up, down) -> Vec2\`** — własne 4 klawisze.
- **\`ctx.input.axis_1d(negative, positive) -> f32\`** — oś jednowymiarowa \`[-1.0, 1.0]\`.`,
      codeExamples: [
        {
          title: "Ruch 8-kierunkowy i Własne Osie",
          code: `// Standardowy ruch WASD (znormalizowany, identyczny w 4 i 8 kierunkach):
let dir = ctx.input.wasd();
player.position += dir * SPEED * ctx.dt();

// Lub własna oś z dowolnych klawiszy:
let dir = ctx.input.axis_2d(KeyCode::A, KeyCode::D, KeyCode::W, KeyCode::S);

// Oś 1D — np. regulacja głośności:
let vol_delta = ctx.input.axis_1d(KeyCode::Minus, KeyCode::Equal);
volume = (volume + vol_delta * ctx.dt()).clamp(0.0, 1.0);`,
          collapsible: false
        }
      ]
    },
    {
      id: "action-map-full",
      title: "Mapowanie Akcji ActionMap — Pełne API",
      content: `**\`ActionMap\`** separuje konkretne kody klawiszy od logiki gry. Zamiast sprawdzać \`KeyCode::Space\` w 15 miejscach w kodzie, sprawdzasz \`actions.is_pressed("jump")\` — a binding można zmienić w jednym miejscu.

### Metody Mutujące (rejestracja):
- **\`.with_key(action, KeyCode) -> Self\`** — builder pattern, możliwość łańcuchowania.
- **\`.with_mouse(action, Side) -> Self\`** — dodaje przycisk myszy do akcji.
- **\`.bind_key(&mut self, action, KeyCode)\`** — wersja mutowalna.
- **\`.bind_mouse(&mut self, action, Side)\`** — wersja mutowalna.
- **\`.unbind(action)\`** — usuwa **wszystkie** powiązania (klawisze i myszę) z akcją.
- **\`.clear()\`** — usuwa wszystkie powiązania.

### Metody Odczytu:
- **\`.is_down(action) -> bool\`** — czy **jakakolwiek** klawiatura/mysz dla tej akcji jest trzymana.
- **\`.is_pressed(action) -> bool\`** — wciśnięte **w tej klatce** (OR logika: dowolny binding).
- **\`.is_released(action) -> bool\`** — puszczone **w tej klatce**.
- **\`.has_action(action) -> bool\`** — czy akcja ma jakiekolwiek powiązania.
- **\`.action_names() -> Vec<&str>\`** — posortowana lista wszystkich akcji.
- **\`.keys_for(action) -> &[KeyCode]\`** — lista klawiszy powiązanych z akcją.
- **\`.mouse_for(action) -> &[MouseButton]\`** — lista przycisków myszy.

> [!TIP]
> **OR logika**: Każda akcja może mieć wiele bindingów i wystarczy wcisnąć **jeden** z nich. Idealnie do obsługi zarówno klawiatury jak i kontrolera — \`.with_key("jump", Space).with_key("jump", W).with_mouse("jump", Side::Middle)\`.`,
      codeExamples: [
        {
          title: "Pełna Konfiguracja ActionMap z Rebindingiem",
          code: `// Definicja powiązań (np. na starcie gry lub po wczytaniu ustawień):
let mut actions = ActionMap::new()
    .with_key("jump",     KeyCode::Space)
    .with_key("jump",     KeyCode::W)         // Alt binding
    .with_key("dash",     KeyCode::LeftShift)
    .with_mouse("dash",   Side::Right)         // Prawy przycisk = też dash
    .with_key("interact", KeyCode::E)
    .with_mouse("shoot",  Side::Left)
    .with_key("pause",    KeyCode::Escape);

// Rebinding w runtime (np. po zmianie w ustawieniach):
actions.unbind("jump");                        // Usuń stare bindingi
actions.bind_key("jump", KeyCode::Up);         // Nowe przypisanie

// Odczyt w update():
if actions.is_pressed("jump") { /* ... */ }
if actions.is_down("shoot")   { /* ciągły ogień */ }
if actions.is_released("dash") { /* koniec dashu */ }

// Debug: wypisz wszystkie akcje:
for name in actions.action_names() {
    let keys = actions.keys_for(name);
    println!("Akcja '{}': {:?}", name, keys);
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "input-api",
      title: "API Reference: Input & ActionMap",
      apiTable: {
        headers: ["Metoda", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["ctx.input.is_key_pressed(key)", "KeyCode", "bool", "true tylko w klatce wciśnięcia."],
          ["ctx.input.is_key_down(key)", "KeyCode", "bool", "true przez wszystkie klatki trzymania."],
          ["ctx.input.is_key_up(key)", "KeyCode", "bool", "true tylko w klatce puszczenia."],
          ["ctx.input.wasd()", "brak", "Vec2", "Znormalizowany wektor ruchu WASD."],
          ["ctx.input.arrow_keys()", "brak", "Vec2", "Znormalizowany wektor ruchu strzałkami."],
          ["ctx.input.axis_2d(l,r,u,d)", "KeyCode×4", "Vec2", "Znormalizowany wektor z 4 klawiszy."],
          ["ctx.input.axis_1d(neg, pos)", "KeyCode×2", "f32", "Oś [-1.0, 1.0] z 2 klawiszy."],
          ["ctx.input.mouse_position()", "brak", "Vec2", "Pozycja myszy w wirtualnych wsp. (z letterboxem)."],
          ["ctx.input.raw_mouse_position()", "brak", "Vec2", "Surowa pozycja w pikselach OS."],
          ["ctx.input.mouse_scroll()", "brak", "Vec2", "Przesunięcie kółka myszy (x, y)."],
          ["ctx.input.pressed_char()", "brak", "Option<char>", "Wpisany znak w tej klatce (do pól tekstowych)."],
          ["actions.is_pressed(action)", "&str", "bool", "true w klatce wciśnięcia dowolnego bindingu."],
          ["actions.is_down(action)", "&str", "bool", "true gdy dowolny binding jest trzymany."],
          ["actions.is_released(action)", "&str", "bool", "true w klatce puszczenia dowolnego bindingu."],
          ["actions.unbind(action)", "&str", "()", "Usuwa wszystkie klawisze i mysz z akcji."],
          ["actions.action_names()", "brak", "Vec<&str>", "Posortowana lista wszystkich zarejestrowanych akcji."],
        ]
      }
    }
  ]
};

export const triggersDoc = {
  id: "triggers",
  title: "13. 🎯 Silnik Reguł & Wyzwalacze (Trigger)",
  badge: "Reactive Logic",
  description: "Deklaratywny silnik reguł Warunek → Akcja (TriggerSystem). One-Shot, Repeating i konstruktory flag — napędzane automatycznie przez World::update.",
  sections: [
    {
      id: "trigger-how-it-works",
      title: "Jak Działa TriggerSystem",
      content: `**\`TriggerSystem\`** (\`ctx.triggers\`) to lista reguł \`Trigger\`, z których każda ma:
- **\`condition: Fn(&Context) -> bool\`** — ewaluowana **co klatkę** z dostępem do całego \`Context\`.
- **\`action: FnMut(&mut Context)\`** — wykonywana gdy warunek staje się \`true\`.
- **\`one_shot: bool\`** — domyślnie \`true\` (odpala się tylko raz i trwale wyłącza).

### Gwarancja Kolejności Wykonania:
\`TriggerSystem::update_with_context\` jest wywoływany **przed** aktualizacją obiektów świata w \`World::update\`. Triggery sprawdzane są w kolejności ich rejestracji.

### Mechanizm One-Shot:
Gdy trigger one-shot odpali (\`fired = true\`), jest **trwale pomijany** w kolejnych klatkach nawet jeśli warunek nadal jest \`true\`. Usuń go przez \`ctx.triggers.prune_fired()\`.

### Mechanizm Repeating:
Trigger repeating resetuje \`fired = false\` gdy warunek wraca do \`false\` — to znaczy że odpali **ponownie** za każdym razem gdy warunek przejdzie z \`false → true\`.

> [!NOTE]
> \`ctx.triggers.prune_fired()\` usuwa z listy wszystkie spalone one-shot triggery. Wywołuj co pewien czas jeśli rejestrujesz wiele triggerów dynamicznie (np. per-quest) i chcesz uniknąć narastania listy.`,
      codeExamples: [
        {
          title: "One-Shot: Zmiana Sceny gdy HP ≤ 0",
          code: `// Jednorazowy trigger — odpala się dokładnie RAZ gdy HP ≤ 0:
ctx.triggers.register(Trigger::new(
    |ctx| ctx.state.get_int("player_hp") <= 0,
    |ctx| {
        ctx.play_sound("game_over_fanfare");
        ctx.switch_scene("GameOver");
    }
));

// Sprawdzenie ile triggerów jest aktywnych:
println!("Triggery: {}", ctx.triggers.len());

// Opcjonalne GC — usuń już spalone one-shoty:
ctx.triggers.prune_fired();`,
          collapsible: false
        },
        {
          title: "Repeating: Pulsujący Alarm Niskiego HP (co klatkę)",
          code: `// Repeating — odpala w każdej klatce gdy warunek TRUE:
ctx.triggers.register(
    Trigger::new(
        |ctx| ctx.state.get_int("player_hp") < 20,
        |ctx| {
            ctx.state.set_bool("low_hp_alarm", true);
            ctx.emit_signal("play_heartbeat");
        }
    ).repeating() // <- kluczowe: bez tego trigger byłby one-shot
);

// Trigger repeating automatycznie resetuje się gdy HP >= 20:
// klatka 1: HP=15 → condition=true  → action ODPALA
// klatka 2: HP=15 → condition=true  → action ODPALA ponownie
// klatka 3: HP=25 → condition=false → fired=false (reset)
// klatka 4: HP=15 → condition=true  → action ODPALA ponownie`,
          collapsible: false
        },
        {
          title: "when_flag_true i when_flag_false — Konstruktory Flagowe",
          code: `// when_flag_true: odpali gdy flaga w StateStore stanie się true
// (to one-shot wrapper — odpali się RAZ po ustawieniu flagi)
ctx.triggers.register(
    Trigger::when_flag_true("boss_dead", |ctx| {
        ctx.state.set_bool("credits_shown", true);
        ctx.emit_signal("open_treasure_room");
        ctx.play_sound("victory_fanfare");
    })
);

// when_flag_false: odpali gdy flaga jest FALSE (np. na start gry)
ctx.triggers.register(
    Trigger::when_flag_false("tutorial_done", |ctx| {
        ctx.emit_signal("show_tutorial_panel");
    })
);

// Gdzieś w Boss::update():
if boss.data.hp <= 0 {
    ctx.state.set_bool("boss_dead", true); // → trigger odpali się w tej klatce
    boss.destroy();
}`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "trigger-api",
      title: "API Reference: TriggerSystem",
      apiTable: {
        headers: ["Metoda / Konstruktor", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["Trigger::new(cond, action)", "Fn(&Context)->bool, FnMut(&mut Context)", "Trigger", "One-shot trigger: odpala się dokładnie raz gdy warunek = true."],
          [".repeating()", "self", "Trigger", "Konwertuje trigger na repeating (odpala co klatkę gdy true)."],
          ["Trigger::when_flag_true(key, action)", "impl Into<String>, FnMut", "Trigger", "One-shot reagujący gdy flaga bool w StateStore = true."],
          ["Trigger::when_flag_false(key, action)", "impl Into<String>, FnMut", "Trigger", "One-shot reagujący gdy flaga bool w StateStore = false."],
          ["ctx.triggers.register(trigger)", "Trigger", "()", "Dodaje trigger do systemu. Sprawdzany od następnej klatki."],
          ["ctx.triggers.len()", "brak", "usize", "Liczba zarejestrowanych triggerów (łącznie ze spalonymi)."],
          ["ctx.triggers.is_empty()", "brak", "bool", "true gdy brak jakichkolwiek triggerów."],
          ["ctx.triggers.prune_fired()", "brak", "()", "Usuwa z listy wszystkie spalone one-shot triggery (GC)."],
        ]
      }
    }
  ]
};

export const sequencesDoc = {
  id: "sequences",
  title: "14. 🎬 Sekwencje & Cutscenki (Sequence)",
  badge: "Narrative System",
  description: "Krokowa maszyna stanów do dialogów, cutscenek, rozgałęzień fabularnych, pętli (repeat_until), etykiet (label/jump_to) i wstrzykiwania kodu przez Step::run.",
  sections: [
    {
      id: "sequence-steps",
      title: "Kompletna Lista Kroków Step",
      content: `**\`Sequence\`** to krokowa maszyna stanów wykonywana jako obiekt Logic w świecie gry. Krok \`Step\` to instrukcja do wykonania — silnik przechodzi do następnego kroku automatycznie.

### Wszystkie dostępne kroki:
| Krok | Opis |
|---|---|
| \`Step::show_text(tag, text)\` | Ustawia tekst widgetu o podanym tagu. Jeśli widget ma tryb typewriter — restartuje animację. |
| \`Step::set_visible(tag, bool)\` | Przełącza widoczność encji z danym tagiem. |
| \`Step::wait_for_input()\` | Wstrzymuje sekwencję do wciśnięcia **Space, Enter lub LPM**. |
| \`Step::wait(seconds)\` | Pauza czasowa — odlicza sekundy, potem idzie dalej. |
| \`Step::set_flag(key, value)\` | Ustawia wartość w \`StateStore\` (bool, int, float, string). |
| \`Step::play_sound(name)\` | Odtwarza dźwięk z \`ctx.assets\`. |
| \`Step::append_line(tag, text)\` | Dodaje linię do \`TextLog\` widgetu (UI lub World). |
| \`Step::run(\|ctx, world\| {...})\` | Wykonuje dowolny kod Rust — non-blocking, natychmiast idzie dalej. |
| \`Step::label(name)\` | Definiuje punkt skoku (no-op, tylko marker). |
| \`Step::jump_to(label)\` | Bezwarunkowy skok do etykiety. |
| \`Step::branch_to(flag, true_lbl, false_lbl)\` | Warunkowy skok wg flagi bool w StateStore. |
| \`Step::branch(flag, if_true_idx, if_false_idx)\` | Warunkowy skok wg indeksu kroku (numeryczny). |
| \`Step::repeat_until(loop_id, label, times)\` | Skacze do etykiety N razy, potem idzie dalej. |
| \`Step::end()\` | Kończy sekwencję — obiekt niszczy się automatycznie. |

> [!TIP]
> \`Step::run(|ctx, world| {...})\` daje **pełny dostęp do świata gry** — możesz spawnować encje, niszczyć obiekty po tagu, mutować StateStore i emitować zdarzenia w środku cutscenki.

> [!NOTE]
> Sekwencja jest spawnowana jako obiekt Logic przez \`ctx.spawn_logic(seq)\`. Silnik sam ją napędza — nie ma potrzeby ręcznego wywoływania \`update()\` sekwencji.`,
      codeExamples: [
        {
          title: "Liniowy Dialog NPC z Nagrodą",
          code: `let cutscene = Sequence::new(vec![
    Step::show_text("dialog_box", "Witaj wędrowcze! Mam zadanie."),
    Step::wait_for_input(),
    Step::show_text("dialog_box", "Zabij 5 goblinów i wróć po nagrodę."),
    Step::wait_for_input(),
    Step::play_sound("quest_accept"),
    Step::run(|ctx, _world| {
        ctx.state.set_bool("quest_goblins", true);
        ctx.state.set_int("goblin_kill_count", 0);
        ctx.state.set_bool("dialog_active", false);
    }),
    Step::set_visible("dialog_box", false),
    Step::end(),
]);

ctx.spawn_logic(cutscene);`,
          collapsible: false
        },
        {
          title: "Rozgałęzienie Dialogu (branch_to) z Etykietami",
          code: `// Quest zakończony inaczej zależnie od flagi:
let ending_seq = Sequence::new(vec![
    Step::label("start"),
    Step::branch_to("quest_goblins_done", "good_ending", "bad_ending"),

    Step::label("good_ending"),
    Step::show_text("dialog", "Brawo! Oto twoja nagroda: 500 złota!"),
    Step::wait_for_input(),
    Step::run(|ctx, _| { ctx.state.increment("gold", 500); }),
    Step::jump_to("end"),

    Step::label("bad_ending"),
    Step::show_text("dialog", "Wróć gdy skończysz zadanie..."),
    Step::wait_for_input(),

    Step::label("end"),
    Step::set_visible("dialog", false),
    Step::end(),
]);`,
          collapsible: false
        },
        {
          title: "Pętla repeat_until — Animacja Hakerska",
          code: `// Wyświetl "Łamanie szyfru..." 4 razy z przerwą, potem sukces:
let hack_seq = Sequence::new(vec![
    Step::label("retry"),
    Step::show_text("terminal", "Próba odszyfrowania..."),
    Step::wait(0.6),
    Step::append_line("terminal", "[FAIL] Błąd protokołu."),
    Step::wait(0.3),
    Step::repeat_until("hack_loop", "retry", 4), // 4 iteracje pętli

    // Po 4 próbach:
    Step::show_text("terminal", "[SUCCESS] Dostęp przyznany."),
    Step::play_sound("hack_success"),
    Step::run(|ctx, _| { ctx.state.set_bool("door_unlocked", true); }),
    Step::end(),
]);`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "sequence-api",
      title: "API Reference: Sequence & Step",
      apiTable: {
        headers: ["Krok / Metoda", "Parametry", "Blokujący?", "Opis"],
        rows: [
          ["Step::show_text(tag, text)", "&str, &str", "Nie", "Ustawia tekst widgetu. Jeśli typewriter — restartuje animację."],
          ["Step::set_visible(tag, bool)", "&str, bool", "Nie", "Pokazuje/ukrywa encję z tagiem."],
          ["Step::wait_for_input()", "brak", "TAK", "Czeka na Space, Enter lub LPM."],
          ["Step::wait(seconds)", "f32", "TAK", "Pauza czasowa w sekundach."],
          ["Step::set_flag(key, value)", "&str, impl Into<StateValue>", "Nie", "Ustawia wartość w StateStore."],
          ["Step::play_sound(name)", "&str", "Nie", "Odtwarza dźwięk z assets."],
          ["Step::append_line(tag, text)", "&str, &str", "Nie", "Dodaje linię do widgetu TextLog."],
          ["Step::run(|ctx, world| {...})", "FnMut(&mut Context, &mut World)", "Nie", "Wykonuje dowolny kod Rust natychmiast."],
          ["Step::label(name)", "&str", "Nie", "Definiuje punkt docelowy dla jump_to/branch_to."],
          ["Step::jump_to(label)", "&str", "Nie", "Bezwarunkowy skok do etykiety."],
          ["Step::branch_to(flag, t, f)", "&str, &str, &str", "Nie", "Skok do t jeśli flaga bool=true, do f gdy false."],
          ["Step::repeat_until(id, label, n)", "&str, &str, u32", "Nie", "Skacze do label N razy, potem kontynuuje."],
          ["Step::end()", "brak", "Nie", "Kończy sekwencję i niszczy obiekt."],
          ["ctx.spawn_logic(seq)", "Sequence", "Nie", "Spawnuje sekwencję jako obiekt Logic świata."],
        ]
      }
    }
  ]
};

export const tweensTimersDoc = {
  id: "tweens-timers",
  title: "15. ⏳ Animacje Tween, Timery & Skalowanie Czasu",
  badge: "Time & Animation",
  description: "Struktury pomiaru czasu (Timer z tick/tick_and_fire), interpolacje wartości (Tween) i wektorów 2D (TweenVec2), 12 krzywych Easing oraz skalowanie czasu (Hitstop, Slow-Mo).",
  sections: [
    {
      id: "timers-system",
      title: "Timer — Odliczanie Czasu z tick() i tick_and_fire()",
      content: `Struktura **\`Timer\`** to dedykowany licznik czasu z pełnym API obsługi:

### Konstruktory:
- **\`Timer::once(duration)\`** — jednorazowy timer, zatrzymuje się po upływie czasu.
- **\`Timer::repeating(duration)\`** — cykliczny timer, automatycznie restartuje się po wyzwoleniu.
- **\`Timer::new(duration, repeating)\`** — wariant z jawnym parametrem.

### Metody Odczytu i Aktualizacji:
- **\`.tick(dt) -> bool\`** — odlicza \`dt\` sekund, zwraca \`true\` **tylko w klatce wyzwolenia**.
- **\`.tick_and_fire(dt, callback)\`** — jak \`tick\`, ale automatycznie wywołuje callback przy wyzwoleniu.
- **\`.update(dt)\`** — odlicza bez zwracania wartości (używaj \`.just_finished()\` osobno).
- **\`.just_finished() -> bool\`** — \`true\` tylko w klatce wyzwolenia.
- **\`.is_ready() -> bool\`** — \`true\` gdy odliczanie dobiegło końca.
- **\`.progress() -> f32\`** — postęp w przedziale \`[0.0, 1.0]\` (do pasków UI).
- **\`.time_remaining() -> f32\`** — czas pozostały do wyzwolenia.
- **\`.reset()\`** — resetuje do pełnej wartości \`duration\`.
- **\`.set_duration(new_dur)\`** — zmienia czas trwania i resetuje.

> [!TIP]
> \`timer.tick_and_fire(ctx.dt(), || { ctx.play_sound("beep"); })\` to najczytelniejszy sposób użycia timera — bez \`if\`, bez zagnieżdżania.`,
      codeExamples: [
        {
          title: "Timer Repeating — Spawner Fal Wrogów",
          code: `pub struct WaveSpawner {
    pub spawn_timer: Timer,
    pub wave_index: u32,
}

// Inicjalizacja: spawn co 3.5 sekundy:
let mut spawner = WaveSpawner {
    spawn_timer: Timer::repeating(3.5),
    wave_index: 0,
};

// W update() kontrolera Logic:
if spawner.spawn_timer.tick(ctx.dt()) {
    // Ta gałąź wykonuje się dokładnie raz na 3.5 sekundy
    spawner.wave_index += 1;
    let count = 3 + spawner.wave_index * 2;
    for _ in 0..count {
        let pos = ctx.camera.target + random_in_annulus(300.0, 480.0);
        ctx.spawn(build_enemy(pos));
    }
    ctx.play_sound("wave_start");
}`,
          collapsible: false
        },
        {
          title: "Timer Once z tick_and_fire — Opóźnione Zdarzenie",
          code: `// Jednorazowe opóźnienie 2 sekund po śmierci gracza:
pub struct DeathDelay { timer: Timer }

let mut delay = DeathDelay { timer: Timer::once(2.0) };

// W update():
delay.timer.tick_and_fire(ctx.dt(), || {
    ctx.switch_scene("GameOver"); // Wykona się dokładnie raz po 2s
});

// Pasek postępu odrodzenia (np. ProgressBar UI):
let progress = delay.timer.progress(); // 0.0 → 1.0
ctx.set_ui_progress("respawn_bar", progress);

// Czas pozostały:
let remaining = delay.timer.time_remaining();
ctx.set_ui_text("respawn_label", &format!("Odrodzenie za {:.1}s", remaining));`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "tweens-main",
      title: "Tween & TweenVec2 — Interpolacje z Krzywymi Easing",
      content: `**\`Tween\`** interpoluje wartość \`f32\` od \`start\` do \`end\` w czasie \`duration\` sekund z wybraną krzywą \`Easing\`.
**\`TweenVec2\`** to para dwóch \`Tween\` (jeden na oś X i Y) do animowania pozycji 2D.

### Dostępne krzywe Easing (12):
\`Linear\`, \`EaseInQuad\`, \`EaseOutQuad\`, \`EaseInOutQuad\`,
\`EaseInCubic\`, \`EaseOutCubic\`, \`EaseInOutCubic\`,
\`EaseInQuart\`, \`EaseOutQuart\`, \`EaseInOutQuart\`,
\`EaseInBounce\`, **\`EaseOutBounce\`**

### Metody Tween:
- **\`.tick(dt) -> f32\`** — odlicza i zwraca aktualną wartość.
- **\`.value() -> f32\`** — zwraca aktualną wartość bez odliczania.
- **\`.progress() -> f32\`** — postęp \`[0.0, 1.0]\`.
- **\`.reset()\`** — resetuje do startu.
- **\`.reverse()\`** — zamienia start/end i resetuje (animacja w tył).

> [!TIP]
> \`Easing::evaluate(t)\` działa też samodzielnie — podaj dowolne \`t\` z \`[0.0, 1.0]\` i otrzymaj wygładzoną wartość.`,
      codeExamples: [
        {
          title: "TweenVec2 — Animacja Wysunięcia Panelu UI",
          code: `// Płynne wysunięcie panelu z lewej strony ekranu:
let mut slide_tween = TweenVec2::new(
    vec2(-320.0, 100.0), // start: poza ekranem
    vec2(20.0,  100.0),  // end: docelowa pozycja
    0.4,                 // czas animacji: 0.4 sekundy
    Easing::EaseOutCubic,
);

// W update() panelu (co klatkę):
if !slide_tween.is_finished() {
    // Używaj raw_deltatime() jeśli chcesz płynność niezależnie od pauzy/time_scale:
    panel.position = slide_tween.tick(ctx.time.raw_deltatime());
}

// Po dotarciu do celu — animacja w tył (chowanie panelu):
if input_close_panel {
    slide_tween.reverse(); // Odwróć kierunek i animuj z powrotem
}`,
          collapsible: false
        },
        {
          title: "Tween f32 — Pulsujący Alpha Ostrzeżenia HP",
          code: `// Pulsujący kolor paska HP między czerwonym a ciemnym:
let mut alpha_tween = Tween::new(0.3, 1.0, 0.5, Easing::EaseInOutQuad);

// W update() widgetu:
let alpha = alpha_tween.tick(ctx.dt());
if alpha_tween.finished {
    alpha_tween.reverse(); // Ping-pong: w tył i w przód
}
hp_bar.color = Color::new(1.0, 0.2, 0.2, alpha);`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "time-scale",
      title: "Skalowanie Czasu & Pauza (Time)",
      content: `Struktura **\`ctx.time\`** zarządza globalną skalą czasu gry:

- **\`ctx.time.set_time_scale(scale)\`** — ustawia mnożnik czasu (\`1.0\` = normalny, \`0.1\` = slow-mo, \`0.0\` = zamrożenie).
- **\`ctx.time.time_scale() -> f32\`** — odczytuje aktualną skalę czasu.
- **\`ctx.time.set_paused(bool)\`** — pausuje grę (\`ctx.dt()\` zwraca \`0.0\` gdy paused).
- **\`ctx.time.toggle_pause()\`** — przełącza pauzę.
- **\`ctx.time.is_paused() -> bool\`** — sprawdza stan pauzy.
- **\`ctx.time.deltatime() -> f32\`** — **skalowany** dt (uwzględnia time_scale i pauzę).
- **\`ctx.time.raw_deltatime() -> f32\`** — **nieskalowany** dt (idealny do animacji UI niezależnych od gry).
- **\`ctx.time.fps() -> i32\`** — aktualny licznik FPS.
- **\`ctx.time.elapsed_time() -> f64\`** — całkowity czas od startu aplikacji.

> [!NOTE]
> Do animacji UI (paneli, tweenów menu) zawsze używaj \`ctx.time.raw_deltatime()\` — dzięki temu menu działa płynnie nawet gdy gra jest na pauzie lub w slow-mo.`,
      codeExamples: [
        {
          title: "Hitstop i Slow-Motion z Automatycznym Przywróceniem",
          code: `pub struct SlowMotionTimer {
    pub timer: Timer,
    pub target_scale: f32,
}

// Hitstop na 80ms (0.08s) przy potężnym uderzeniu:
fn trigger_hitstop(ctx: &mut Context) {
    ctx.time.set_time_scale(0.05); // Prawie zatrzymanie
    ctx.camera.shake(0.2, 8.0);
    // Przywróć normalny czas po 80ms:
    // (np. przez osobny Timer w Data encji)
}

// W update() encji trzymającej timer:
if player.data.hitstop_timer.tick(ctx.time.raw_deltatime()) {
    ctx.time.set_time_scale(1.0); // Przywróć
}

// Pauza przy Escape:
if ctx.input.is_key_pressed(KeyCode::Escape) {
    ctx.time.toggle_pause();
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "tweens-timers-api",
      title: "API Reference: Timer, Tween, Time",
      apiTable: {
        headers: ["Metoda", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["Timer::once(dur)", "f32", "Timer", "Jednorazowy timer."],
          ["Timer::repeating(dur)", "f32", "Timer", "Cykliczny timer (restartuje się automatycznie)."],
          [".tick(dt)", "f32", "bool", "Odlicza dt, zwraca true w klatce wyzwolenia."],
          [".tick_and_fire(dt, fn)", "f32, FnOnce()", "bool", "Odlicza i wywołuje callback przy wyzwoleniu."],
          [".just_finished()", "brak", "bool", "true tylko w klatce wyzwolenia."],
          [".progress()", "brak", "f32", "Postęp [0.0, 1.0] — do pasków UI."],
          [".time_remaining()", "brak", "f32", "Sekundy do wyzwolenia."],
          [".set_duration(dur)", "f32", "()", "Zmienia czas trwania i resetuje."],
          ["Tween::new(s, e, dur, easing)", "f32, f32, f32, Easing", "Tween", "Interpoluje f32 od s do e w czasie dur."],
          [".tick(dt) -> f32", "f32", "f32", "Odlicza i zwraca aktualną wartość."],
          [".reverse()", "brak", "()", "Zamienia start/end i resetuje (ping-pong)."],
          ["TweenVec2::new(s, e, dur, easing)", "Vec2, Vec2, f32, Easing", "TweenVec2", "Interpoluje Vec2 od s do e."],
          [".is_finished()", "brak", "bool", "true gdy obie osie dotarły do końca."],
          ["Easing::evaluate(t)", "f32", "f32", "Wygładza t ∈ [0,1] wg wybranej krzywej."],
          ["ctx.time.set_time_scale(scale)", "f32", "()", "Ustawia mnożnik czasu gry."],
          ["ctx.time.raw_deltatime()", "brak", "f32", "Nieskalowany dt — do animacji UI."],
          ["ctx.time.toggle_pause()", "brak", "()", "Przełącza pauzę gry."],
        ]
      }
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
  badge: "Procedural Generation",
  description: "Deterministyczny generator PCG32 (Rng), przestrzenne próbkowanie geometryczne 2D, szum Perlina (Noise / fBm), ważone tabele łupów (WeightedList) i sprawiedliwy worek losowy (ShuffleBag).",
  sections: [
    {
      id: "rng-prng",
      title: "Deterministyczny Generator PCG32 (Rng)",
      content: `Struktura **\`Rng\`** to szybki, statystycznie doskonały i w 100% deterministyczny generator liczb pseudolosowych oparty o algorytm **PCG32**.

### Dlaczego warto używać \`Rng\` z ziarnem (seed):
Gwarantuje identyczną sekwencję losowań na każdym komputerze — niezbędne dla **proceduralnej generacji światów (dungeon seed)**, powtórek gier (replays) oraz testów jednostkowych.

### Metody Rng:
- **\`Rng::new(seed: u64)\`** — inicjalizacja zadanym ziarnem.
- **\`Rng::from_time()\`** — ziarno pobrane z nanosekund czasu systemowego.
- **\`rng.next_u32()\` / \`rng.next_f32()\`** — surowe liczby (f32 w przedziale \`[0.0, 1.0)\`).
- **\`rng.range_f32(min, max)\`** / **\`rng.range_i32(min, max)\`** / **\`rng.range_usize(min, max)\`**.
- **\`rng.gen_bool(chance)\`** — zwraca \`true\` z podanym prawdopodobieństwem \`0.0..=1.0\`.
- **\`rng.gen_sign()\`** — losuje \`-1.0\` lub \`1.0\` (50% szansy).
- **\`rng.gen_angle()\`** — losuje kąt w radianach \`[0, 2π)\`.
- **\`rng.gen_spread(base_angle, spread_radians)\`** — stożek rozrzutu wokół kąta bazowego.
- **\`rng.gen_normal(mean, std_dev)\`** — **Rozkład Gaussa** (Box-Muller transform) — idealny do naturalnych wariacji (np. wzrost postaci, czas reakcji AI).`,
      codeExamples: [
        {
          title: "Deterministyczny Generator Świata i Rozkład Gaussa",
          code: `use rusted_engine::prelude::*;

// 1. Identyczna generacja pod podanym seedem 1337420:
let mut rng = Rng::new(1337420);

for room_idx in 0..5 {
    let width  = rng.range_i32(8, 16);
    let height = rng.range_i32(6, 12);
    let is_treasure = rng.gen_bool(0.35); // 35% szansy na skarbiec
    let sign = rng.gen_sign();           // -1.0 lub 1.0

    // Rozkład Gaussa — wzrost potwora (średnia 180cm, odchylenie 15cm):
    let height_cm = rng.gen_normal(180.0, 15.0);
}

// 2. Wybór i tasowanie w Rng:
let mut items = vec!["Miecz", "Tarcza", "Eliksir", "Runa"];
rng.shuffle(&mut items);
let chosen = rng.choose(&items);`,
          collapsible: false
        }
      ]
    },
    {
      id: "rng-spatial",
      title: "Przestrzenne Próbkowanie Geometryczne 2D",
      content: `Silnik zawiera bogaty pakiet darmowych funkcji (oraz metod na \`Rng\`) do losowania pozycji w przestrzeni 2D:

| Funkcja | Opis | Zastosowanie |
|---|---|---|
| \`random_in_circle(r)\` | Punkt wewnątrz koła o promieniu r | Wybuchy cząstek, plamy krwi |
| \`random_on_circle(r)\` | Punkt na obwodzie okręgu | Falowa linia uderzeniowa |
| **\`random_in_annulus(r1, r2)\`** | Punkt w pierścieniu między r1 a r2 | **Spawner wrogów poza ekranem!** |
| **\`random_in_sector(r, dir, span)\`** | Punkt w stożku / wycinku koła | Rozrzut śrutu ze strzelby |
| \`random_in_rect(rect)\` | Punkt wewnątrz prostokąta | Strefa spawnu przedmiotów |
| **\`random_on_rect_perimeter(rect)\`** | Punkt na krawędzi prostokąta | **Spawnowanie na brzegach ekranu** |
| \`random_on_segment(a, b)\` | Punkt na odcinku AB | Efekt wyładowań elektrycznych |
| \`random_in_triangle(a, b, c)\` | Punkt wewnątrz trójkąta | Próbkowanie siatek navmesh |

> [!TIP]
> Wszystkie powższe funkcje posiadają swoje deterministyczne odpowiedniki na strukturze \`Rng\` (np. \`rng.in_annulus(200.0, 400.0)\`).`,
      codeExamples: [
        {
          title: "Próbkowanie w Pierścieniu, Stożku i na Krawędzi Ekranu",
          code: `// 1. Spawner wrogów w pierścieniu (350..500px od gracza):
let spawn_pos = player.position + random_in_annulus(350.0, 500.0);
ctx.spawn(build_enemy(spawn_pos));

// 2. Stożek rozrzutu iskier miotacza ognia (kąt 45° = 0.78 rad w kierunku biegu):
let flame_dir = player.facing;
let spark_offset = random_in_sector(120.0, flame_dir, 0.78);
particle_emitter.emit_burst(player.position + spark_offset, 5, RED, (50.0, 100.0), 3.0, 0.4);

// 3. Spawnowanie niebezpieczeństw dokładnie na brzegu ekranu kamery:
let screen_rect = ctx.camera.screen_rect();
let spawn_edge = random_on_rect_perimeter(screen_rect);`,
          collapsible: false
        }
      ]
    },
    {
      id: "rng-loot",
      title: "Ważone Tabele Łupów (WeightedList) & Talie (ShuffleBag)",
      content: `### 1. Ważona Tabela Łupów (\`WeightedList<T>\`)
Przechowuje pary \`(przedmiot, waga)\`. Im większa waga, tym większa szansa na wlosowanie przedmiotu.
- **\`.choose() -> Option<&T>\`** — losowanie ze zwracaniem.
- **\`.choose_and_remove() -> Option<T>\`** — losowanie z usunięciem z listy.
- **\`.sample_without_replacement(amount) -> Vec<T>\`** — **losowanie $N$ unikalnych elementów bez powtórzeń**! (idealne do draftu 3 kart/upgrade'ów w roguelike).

### 2. Sprawiedliwy Worek Losowy (\`ShuffleBag<T>\`)
Gwarantuje, że każdy element z listy pojawi się **dokładnie raz** zanim jakikolwiek element się powtórzy (jak system 7-bag w Tetrisie). Eliminując pechowe serie!
- **\`.draw() -> Option<T>\`** — wyciąga kolejny element z woreczka.
- **\`auto_refill = true\`** (domyślnie) — po opróżnieniu woreczek automatycznie się uzupełnia z szablonu i przetasowuje.`,
      codeExamples: [
        {
          title: "Draft 3 Unikalnych Umiejętności (Roguelike Upgrade System)",
          code: `// Ważona lista ulepszeń po zdobyciu poziomu:
let mut upgrades = WeightedList::new();
upgrades.add("Święty Miecz (+20 DMG)",     10.0); // Rzadki (waga 10)
upgrades.add("Buty Szybkości (+15% SPD)", 35.0); // Zwykły (waga 35)
upgrades.add("Pancerz Stali (+50 HP)",     40.0); // Zwykły (waga 40)
upgrades.add("Pierścień Wampira (Lifesteal)", 5.0); // Bardzo rzadki (waga 5)

// Wylosuj 3 RÓŻNE karty bez powtórzeń do wyboru dla gracza:
let draft_choices: Vec<&str> = upgrades.sample_without_replacement(3);

println!("Wybierz ulepszenie:");
for (idx, card) in draft_choices.iter().enumerate() {
    println!("{}. {}", idx + 1, card);
}`,
          collapsible: false
        },
        {
          title: "Sprawiedliwy Kolejnik Wrogów z ShuffleBag",
          code: `// Worek z 4 typami wrogów:
let mut enemy_bag = ShuffleBag::new(vec![
    "Orc_Berserker",
    "Goblin_Archer",
    "Skeleton_Mage",
    "Slime_Green",
]);

// Każe rozegrać fali — każdy z 4 wrogów pojawi się dokładnie raz przed powtórką:
for wave in 1..=4 {
    let enemy_type = enemy_bag.draw().unwrap();
    println!("Fala {}: Spawn {}", wave, enemy_type);
}
// Po fali 4 woreczek automatycznie przetasowuje się na nowo!`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "rng-perlin",
      title: "Szum Perlina & Szum Fraktalny (Noise / fBm)",
      content: `Struktura **\`Noise\`** dostarcza ciągły, gładki szum gradientowy Perlina:

- **\`Noise::new(seed: u64)\`** — inicjalizacja zadanym ziarnem.
- **\`noise.get_1d(x) -> f32\`** — próbkowanie 1D (zwraca wartość w przedziale \`[-1.0, 1.0]\`).
- **\`noise.get_2d(x, y) -> f32\`** — próbkowanie 2D.
- **\`noise.fractal_2d(x, y, octaves, persistence, lacunarity) -> f32\`** — multi-oktawowy szum fraktalny (**fBm** — *Fractal Brownian Motion*) idealny do mapa wysokości terenu, biomów i organicznych wstrząsów kamery.`,
      codeExamples: [
        {
          title: "Generowanie Terenu i Wysokości z Szumem Fraktalnym (fBm)",
          code: `let noise = Noise::new(42);

// Generowanie mapy kafelków 40x20 z szumem fraktalnym:
for y in 0..20 {
    for x in 0..40 {
        // Sample fBm noise: 4 oktawy, persistence 0.5, lacunarity 2.0
        let elevation = noise.fractal_2d(
            x as f32 * 0.07,
            y as f32 * 0.07,
            4,   // 4 oktawy detalizacji
            0.5, // persistence
            2.0  // lacunarity
        );

        let tile = if elevation < -0.15 {
            "Woda"
        } else if elevation < 0.25 {
            "Trawa"
        } else {
            "Góry"
        };
    }
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "rng-api",
      title: "API Reference: RNG & Procedural",
      apiTable: {
        headers: ["Struktura / Funkcja", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["Rng::new(seed)", "u64", "Rng", "Deterministyczny PRNG z podanym ziarnem."],
          ["Rng::from_time()", "brak", "Rng", "PRNG z ziarnem z czasu systemowego."],
          ["rng.range_f32(min, max)", "f32, f32", "f32", "Losuje float w [min, max)."],
          ["rng.gen_bool(chance)", "f32", "bool", "true z prawdopodobieństwem chance."],
          ["rng.gen_normal(mean, std)", "f32, f32", "f32", "Rozkład Gaussa (średnia, odchylenie std)."],
          ["random_in_annulus(r1, r2)", "f32, f32", "Vec2", "Punkt w pierścieniu — spawner wrogów."],
          ["random_in_sector(r, dir, span)", "f32, Vec2, f32", "Vec2", "Punkt w stożku/wycinku — rozrzut strzału."],
          ["random_on_rect_perimeter(rect)", "Rect", "Vec2", "Punkt na krawędzi prostokąta (poza ekranem)."],
          ["WeightedList::new()", "brak", "WeightedList<T>", "Tworzy ważoną tabelę wyboru łupów."],
          [".sample_without_replacement(n)", "usize", "Vec<T>", "Losuje N unikalnych elementów bez powtórzeń."],
          ["ShuffleBag::new(items)", "Vec<T>", "ShuffleBag<T>", "Sprawiedliwa talia bez powtórzeń (Tetris 7-bag)."],
          ["Noise::new(seed)", "u64", "Noise", "Generator szumu Perlina."],
          ["noise.fractal_2d(x,y,oct,p,l)", "f32,f32,usize,f32,f32", "f32", "Szum fraktalny fBm dla terenu i biomów."],
        ]
      }
    }
  ]
};
