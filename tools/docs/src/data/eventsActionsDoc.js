export const eventsActionsDoc = {
  id: "events-actions",
  title: "5. ⚡ Event Bus, Actions, Inputs & Context Ergonomics",
  icon: "Zap",
  badge: "Messaging & Inputs",
  description: "Magistrala zdarzeń EventBus, sygnały tekstowe, mapowanie akcji ActionMap, silnik reguł Trigger z pełnym dostępem do Context oraz osie wejść 2D.",
  sections: [
    {
      id: "event-bus",
      title: "Magistrala Zdarzeń `EventBus` - Odprzęganie Logiki",
      content: `Komponent **\`EventBus\`** (\`ctx.events\` / metody na \`ctx\`) pozwala na komunikację pub/sub pomiędzy różnymi obiektami gry i scenami bez konieczności trzymania bezpośrednich referencji.`,
      subsections: [
        {
          id: "typed-events",
          title: "Typowane Zdarzenia z Ładunkiem (emit<E> / poll<E>)",
          content: `Przesyłają dowolną strukturę Rust (\`E: 'static + Send + Sync\`). Zdarzenia są buforowane w kanale typowanym i pobierane przez \`ctx.poll::<E>()\` (operacja **destrukcyjna - drain**).

Warstwa **\`Logic\`** wykonuje się po obiektach świata, co daje gwarancję odbioru wszystkich zdarzeń wyemitowanych w danej klatce bez względu na kolejność encji.`,
          codeExamples: [
            {
              title: "Główny Przykład: Emisja i Odbiór Typowanych Zdarzeń",
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
            }
          ]
        },
        {
          id: "text-signals",
          title: "Sygnały Tekstowe (emit_signal / poll_signal)",
          content: `Lekkie flagi tekstowe bez ładunku danych. Idealne dla prostych impulsów (np. \`"door_opened"\`, \`"wave_cleared"\`, \`"boss_spawned"\`).
Bezpośrednie skróty dostępne na \`Context\`:
- \`ctx.emit_signal("open_gate")\`: Emituje sygnał.
- \`ctx.poll_signal("open_gate") -> bool\`: Zwraca \`true\` i konsumuje sygnał.
- \`ctx.has_signal("open_gate") -> bool\`: Sprawdza obecność sygnału bez konsumowania.`
        }
      ]
    },
    {
      id: "action-map-and-inputs",
      title: "Mapowanie Akcji `ActionMap` & Osie Ruchu `Input`",
      content: `Zamiast sprawdzać konkretne kody klawiszy w kodzie obiektów, podepnij je do nazwanych akcji za pomocą \`ActionMap\` i wielokierunkowych osi.`,
      subsections: [
        {
          id: "action-map-builder",
          title: "Płynny Konstruktor ActionMap (Fluent Builder)",
          content: `Powiązania klawiszy i przycisków myszy można konfigurować łańcuchowo za pomocą \`.with_key(action, key)\` oraz \`.with_mouse(action, btn)\`:`,
          codeExamples: [
            {
              title: "Główny Przykład: Łańcuchowa Rejestracja Powiązań",
              code: `let actions = ActionMap::new()
    .with_key("dash", KeyCode::Space)
    .with_key("dash", KeyCode::LeftShift)
    .with_mouse("dash", Side::Right)
    .with_key("pause", KeyCode::Escape);`,
              collapsible: false
            }
          ]
        },
        {
          id: "movement-axes",
          title: "Wielokierunkowe Osie Ruchu (axis_2d & axis_1d)",
          content: `- **\`ctx.input.axis_2d(left, right, up, down) -> Vec2\`**: Tworzy znormalizowany wektor ruchu z 4 klawiszy.
- **\`ctx.input.wasd() -> Vec2\`** oraz **\`ctx.input.arrow_keys() -> Vec2\`**: Gotowe skróty dla sterowania ruchem.
- **\`ctx.input.axis_1d(negative, positive) -> f32\`**: Zwraca wartość w przedziale \`[-1.0, 1.0]\`.`
        },
        {
          id: "mouse-context-helpers",
          title: "Współrzędne Świata i Przyciski Myszy",
          content: `- \`ctx.mouse_world() -> Vec2\`: Zwraca pozycję kursora w świecie gry przeliczoną przez aktywną kamerę i letterboxing.
- \`ctx.mouse_pressed(Side::Left)\`, \`ctx.mouse_down(Side::Right)\`, \`ctx.mouse_released(Side::Middle)\`.`
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
          content: `\`Resources\` (\`ctx.resources\`) przechowuje globalne, typowane struktury stanu rozgrywki (\`GameState\`, \`Inventory\`, \`Config\`) indeksowane przez typ Rust (\`TypeId\`). Zapobiega błędom literówek i zapewnia pełne bezpieczeństwo typów bez używania stringów.`
        },
        {
          id: "trigger-rules-engine",
          title: "Silnik Reguł Warunek → Akcja (TriggerSystem)",
          content: `\`TriggerSystem\` (\`ctx.triggers\`) przechowuje reguły \`Trigger\`, które ewaluują warunek co klatkę z pełnym dostępem do \`&Context\`. Gdy warunek zostanie spełniony, wywoływana jest akcja \`action(&mut Context)\`.
Triggery są **automatycznie napędzane** przez silnik przed aktualizacją obiektów świata — nie trzeba ich ręcznie wywoływać w pętli.

- **Jednorazowe (\`Trigger::new\`, domyślne)**: Odpalają się dokładnie **raz** w pierwszej klatce, w której warunek stał się \`true\`, po czym trwale się wyłączają (idealne do zmiany scen czy odblokowywania osiągnięć).
- **Powtarzalne (\`.repeating()\`)**: Odpalają się w każdej klatce, w której warunek jest prawdziwy (level-triggered).
- **Konstruktory flag**: \`Trigger::when_flag_true("boss_dead", action)\` oraz \`Trigger::when_flag_false("flag", action)\`.`,
          codeExamples: [
            {
              title: "Główny Przykład: One-Shot Trigger Zmiany Sceny po Śmierci",
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
              title: "Rozszerzony Przykład: Powtarzalny Trigger Ostrzeżenia o Niskim HP",
              code: `ctx.triggers.register(
    Trigger::new(
        |ctx| ctx.resources.get::<GameState>().is_some_and(|g| g.player_hp < 20),
        |ctx| {
            // Efekt pulsującego ostrzeżenia co klatkę gdy HP < 20
            ctx.state.set_bool("low_hp_alarm", true);
        }
    ).repeating()
);`,
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
          ["ctx.input.wasd()", "&self", "Vec2", "Zwraca znormalizowany wektor ruchu ze sterowania WASD."],
          ["ctx.mouse_world()", "&self", "Vec2", "Przelicza pozycję kursora do przestrzeni świata 2D."]
        ]
      }
    }
  ]
};
