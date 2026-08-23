export const sequenceDoc = {
  id: "sequence",
  title: "6. 🎬 Scripted Sequences, Cutscenes & Tweening",
  icon: "Film",
  badge: "Cutscene & Tween Engine",
  description: "Maszyna stanów sekwencji narrative/dialogowych Sequence, budowniczy SequenceBuilder, krok Step::Run z dostępem do World oraz silnik płynnej interpolacji Tween i TweenVec2.",
  sections: [
    {
      id: "sequence-overview",
      title: "Maszyna Stanów Sekwencji Narrative",
      content: `Komponent **\`Sequence\`** służy do sterowania liniowymi lub rozgałęzionymi scenkami przerywnikowymi (cutscenes), samouczkami oraz dialogami NPC bez pisania skomplikowanych drabinek \`if/else\` w klatkach logiki.`,
      subsections: [
        {
          id: "sequence-steps",
          title: "Katalog Kroków Wykonawczych (Step)",
          content: `Każdy krok sekwencji realizuje atomową akcję lub oczekiwanie:

| Krok | Parametry | Działanie |
|---|---|---|
| \`ShowText\` | \`target_tag, text\` | Ustawia tekst na obiekcie UI o podanym tagu. |
| \`AppendLine\` | \`target_tag, text\` | Dopisuje nową linię do konsoli \`TextLog\`. |
| \`SetVisible\` | \`target_tag, bool\` | Pokazuje lub ukrywa obiekty na scenie. |
| \`WaitForInput\` | brak | Czeka na wciśnięcie Spacji, Entera lub lewego przycisku myszy. |
| \`Wait\` | \`seconds\` | Odczekuje podaną liczbę sekund przed przejściem dalej. |
| \`SetFlag\` | \`key, value\` | Zapisuje flagę w \`ctx.state\`. |
| \`PlaySound\` | \`sound_name\` | Odtwarza dźwięk z zasobów. |
| **\`Run\`** | \`FnMut(&mut Context, &mut World)\` | **Wykonuje dowolne domknięcie z bezpośrednim dostępem do Context i World!** |
| \`Label\` | \`name\` | Statyczny marker etykiety do skoków. |
| \`JumpTo\` | \`label\` | Bezwarunkowy skok do nazwanej etykiety. |
| \`BranchTo\` | \`condition, if_true, if_false\` | Skok warunkowy na podstawie flagi w \`ctx.state\`. |
| \`RepeatUntil\` | \`loop_id, label, times\` | Pętla powtarzająca fragment sekwencji $N$ razy. |
| \`End\` | brak | Natychmiastowe zakończenie sekwencji. |`
        },
        {
          id: "sequence-control-flow",
          title: "Przepływ Sterowania: Pętle, Rozgałęzienia & Step::run",
          content: `Dzięki krokom \`BranchTo\`, \`RepeatUntil\` oraz **\`Step::run\`** sekwencje mogą wstrzykiwać dowolną logikę gry bezpośrednio w trakcie scenki przerywnikowej (np. usuwanie starych wrogów, modyfikowanie świata):`,
          codeExamples: [
            {
              title: "Główny Przykład: Tworzenie Dialogu z Step::run i Pętlą Prób",
              code: `let intro_cutscene = Sequence::new(vec![
    Step::show_text("dialog_box", "Witaj w Podziemiach, Wędrowcze!"),
    Step::wait_for_input(),
    Step::show_text("dialog_box", "System próbuje odszyfrować zamek..."),
    Step::label("retry_hack"),
    Step::append_line("console_log", "Próba łamania szyfru..."),
    Step::wait(0.5),
    Step::repeat_until("hack_loop", "retry_hack", 3),
    Step::set_flag("hack_success", true),
    Step::run(|ctx, world| {
        // Wstrzyknięcie logiki: usunięcie starych bytów i emisja sygnału
        world.remove_by_tag("old_barrier");
        ctx.emit_signal("gate_opened");
    }),
    Step::show_text("dialog_box", "Dostęp przyznany!"),
    Step::play_sound("door_open"),
    Step::end(),
]);

scene.add_sequence(intro_cutscene);`,
              collapsible: false
            }
          ]
        }
      ]
    },
    {
      id: "tween-and-easing",
      title: "Silnik Interpolacji: Tween & TweenVec2 (`tween.rs`)",
      content: `Moduł **\`tween\`** dostarcza precyzyjną, animacyjną interpolację wartości skalarnej (\`Tween\`) oraz pozycji 2D (\`TweenVec2\`) w czasie z bogatą paletą 12 nieliniowych krzywych przejść.`,
      subsections: [
        {
          id: "tween-vec2",
          title: "Interpolacja Pozycji 2D (TweenVec2)",
          content: `Struktura **\`TweenVec2\`** eliminuje konieczność manualnego zarządzania dwoma osobnymi tweenami dla osi X i Y.
Metoda **\`tick(dt) -> Vec2\`** zwraca zinterpolowaną pozycję dla bieżącej klatki:`,
          codeExamples: [
            {
              title: "Przykład: Płynny Ruch Duszka z TweenVec2 i EaseOutCubic",
              code: `use rusted_engine::prelude::*;

// Animacja przesunięcia od (0, 0) do (400, 300) w 1.2 sekundy
let mut move_anim = TweenVec2::new(vec2(0.0, 0.0), vec2(400.0, 300.0), 1.2, Easing::EaseOutCubic);

// W pętli update:
let current_pos = move_anim.tick(ctx.dt());
sprite.position = current_pos;

if move_anim.is_finished() {
    println!("Dojechano do celu!");
}`,
              collapsible: false
            }
          ]
        },
        {
          id: "easing-curves",
          title: "Krzywe Easingu (Wygładzania Ruchu)",
          content: `Dostępne funkcje nieliniowe w enumie \`Easing\`:
- **\`Linear\`**: Stała prędkość liniowa.
- **\`EaseInQuad\` / \`EaseOutQuad\` / \`EaseInOutQuad\`**: Płynne przyspieszanie i hamowanie kwadratowe.
- **\`EaseInCubic\` / \`EaseOutCubic\` / \`EaseInOutCubic\`**: Wyraziste przejścia sześcienne.
- **\`EaseInBounce\` / \`EaseOutBounce\` / \`EaseInOutBounce\`**: Efekt sprężystego odbicia piłeczki.
- **\`EaseInElastic\` / \`EaseOutElastic\`**: Efekt naciąganej gumy / cięciwy łuku.`
        }
      ]
    },
    {
      id: "sequence-api-reference",
      title: "API Reference: Sequence & Tween",
      apiTable: {
        headers: ["Struktura / Metoda", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["Step::run(closure)", "FnMut(&mut Context, &mut World)", "Step", "Krok sekwencji wykonujący dowolne domknięcie z dostępem do World."],
          ["Step::show_text(tag, text)", "impl Into<String>, impl Into<String>", "Step", "Krok zmiany tekstu widgetu."],
          ["Step::wait(seconds)", "f32", "Step", "Krok odczekania w sekundach."],
          ["Step::wait_for_input()", "brak", "Step", "Krok oczekiwania na naciśnięcie klawisza/myszy."],
          ["Step::branch_to(flag, true_lbl, false_lbl)", "impl Into<String>, ...", "Step", "Rozgałęzienie warunkowe sekwencji."],
          ["Tween::new(from, to, dur, ease)", "f32, f32, f32, Easing", "Tween", "Inicjalizuje interpolację wartości skalarnej."],
          ["TweenVec2::new(start, end, dur, ease)", "Vec2, Vec2, f32, Easing", "TweenVec2", "Inicjalizuje interpolację wektora pozycji 2D."],
          ["tween_vec2.tick(dt)", "f32", "Vec2", "Aktualizuje czas i zwraca bieżącą pozycję wektora."]
        ]
      }
    }
  ]
};
