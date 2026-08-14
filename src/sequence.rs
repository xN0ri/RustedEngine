use crate::{
    engine::Context,
    state::StateValue,
    world::World,
};

// ---------------------------------------------------------------------------
// Step — pojedynczy krok sekwencji
// ---------------------------------------------------------------------------

/// Jeden krok w sekwencji narracyjnej lub zdarzeniowej.
///
/// Sekwencja jest niezależna od treści — te same `Step` warianty działają
/// w dialogach, tutorialach, cutscenkach itp.
#[derive(Clone, Debug)]
pub enum Step {
    /// Ustawia pole `content` na obiekcie `Text` z podanym tagiem (przez `find_ui_by_tag_mut`).
    /// Jeśli obiekt Text ma włączony typewriter, uruchamia go od nowa.
    ShowText {
        target_tag: String,
        text: String,
    },

    /// Czeka na wciśnięcie dowolnego klawisza/kliknięcia LPM przed przejściem dalej.
    WaitForInput,

    /// Ustawia wartość w `ctx.state`.
    SetFlag {
        key: String,
        value: StateValue,
    },

    /// Czeka podaną liczbę sekund.
    Wait {
        seconds: f32,
    },

    /// Rozgałęzienie warunkowe — sprawdza flagę w StateStore.
    /// `condition` = klucz Bool w `ctx.state`.
    /// Jeśli true: skacze do kroku `if_true`, jeśli false: do `if_false`.
    Branch {
        condition: String,
        if_true: usize,
        if_false: usize,
    },

    /// Natychmiastowe przeskoczenie do podanego indeksu kroku.
    Jump(usize),

    /// Kończy sekwencję.
    End,
}

// ---------------------------------------------------------------------------
// Sequence — runner kroków
// ---------------------------------------------------------------------------

/// Generyczny runner sekwencji kroków.
///
/// Przechowuj jako pole w strukturze danych obiektu (np. `Behavior`) lub
/// bezpośrednio w scenie. Wywołuj `sequence.update(ctx, world)` w każdej klatce.
///
/// # Przykład
/// ```ignore
/// let seq = Sequence::new(vec![
///     Step::ShowText { target_tag: "dialog".into(), text: "Witaj, podróżniku!".into() },
///     Step::WaitForInput,
///     Step::SetFlag { key: "met_npc".into(), value: StateValue::Bool(true) },
///     Step::End,
/// ]);
/// ```
pub struct Sequence {
    steps: Vec<Step>,
    current: usize,
    wait_timer: f32,
    finished: bool,
}

impl Sequence {
    pub fn new(steps: Vec<Step>) -> Self {
        Self {
            steps,
            current: 0,
            wait_timer: 0.0,
            finished: false,
        }
    }

    /// Czy sekwencja dotarła do kroku `End` lub wyszła poza listę kroków.
    pub fn is_finished(&self) -> bool {
        self.finished
    }

    /// Resetuje sekwencję do pierwszego kroku.
    pub fn reset(&mut self) {
        self.current = 0;
        self.wait_timer = 0.0;
        self.finished = false;
    }

    /// Przetwarza bieżący krok. Wywołuj co klatkę.
    ///
    /// `world` jest potrzebny do znalezienia obiektów po tagu (`ShowText`).
    pub fn update(&mut self, ctx: &mut Context, world: &mut World) {
        if self.finished {
            return;
        }
        if self.current >= self.steps.len() {
            self.finished = true;
            return;
        }

        // Klonujemy krok żeby uniknąć borrow-conflict na self
        let step = self.steps[self.current].clone();

        match step {
            Step::ShowText { ref target_tag, ref text } => {
                let mut found = false;
                // Szukamy po tagu w warstwie UI i wywołujemy Object::set_text
                for obj in world.find_ui_by_tag_mut(target_tag) {
                    obj.set_text(text);
                    found = true;
                }
                // Jeśli nie znaleziono w UI, szukamy w obiektach świata
                if !found {
                    for obj in world.find_by_tag_mut(target_tag) {
                        obj.set_text(text);
                    }
                }
                // Opcjonalny zapis w StateStore (jako flaga pomocnicza / fallback)
                ctx.state.set_text(&format!("__seq_text_{}", target_tag), text);
                self.current += 1;
            }

            Step::WaitForInput => {
                let pressed = macroquad::input::is_key_pressed(macroquad::input::KeyCode::Space)
                    || macroquad::input::is_key_pressed(macroquad::input::KeyCode::Enter)
                    || macroquad::input::is_mouse_button_pressed(macroquad::input::MouseButton::Left);
                if pressed {
                    self.current += 1;
                }
            }

            Step::SetFlag { key, value } => {
                ctx.state.set(&key, value);
                self.current += 1;
            }

            Step::Wait { seconds } => {
                self.wait_timer += ctx.time.deltatime();
                if self.wait_timer >= seconds {
                    self.wait_timer = 0.0;
                    self.current += 1;
                }
            }

            Step::Branch { condition, if_true, if_false } => {
                if ctx.state.get_bool(&condition) {
                    self.current = if_true;
                } else {
                    self.current = if_false;
                }
            }

            Step::Jump(target) => {
                self.current = target;
            }

            Step::End => {
                self.finished = true;
            }
        }
    }
}
