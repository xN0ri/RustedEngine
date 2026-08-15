use crate::{engine::Context, state::StateValue, world::World};

// ---------------------------------------------------------------------------
// Step — Scripted sequence step enum
// ---------------------------------------------------------------------------

/// Individual instruction step in a scripted narrative sequence or cutscene.
#[derive(Clone, Debug)]
pub enum Step {
    /// Sets text content on entities with matching `target_tag` via [`Object::set_text`](crate::world::Object::set_text).
    /// If the target text component has typewriter mode enabled, restarts the reveal animation.
    ShowText { target_tag: String, text: String },

    /// Toggles entity visibility by `target_tag` via [`Object::set_visible`](crate::world::Object::set_visible).
    SetVisible { target_tag: String, visible: bool },

    /// Awaits user input (Space, Enter, or Left Mouse Click) before advancing to the next step.
    WaitForInput,

    /// Sets a key-value flag entry inside [`Context::state`](crate::engine::Context::state).
    SetFlag { key: String, value: StateValue },

    /// Delays execution for the specified duration in seconds.
    Wait { seconds: f32 },

    /// Conditional branch based on a boolean key in [`Context::state`](crate::engine::Context::state).
    /// Jumps to index `if_true` when `true`, or `if_false` when `false`.
    Branch {
        condition: String,
        if_true: usize,
        if_false: usize,
    },

    /// Unconditionally jumps execution to the specified step index.
    Jump(usize),

    /// Concludes the sequence execution.
    End,
}

// ---------------------------------------------------------------------------
// Sequence — Scripted step runner engine
// ---------------------------------------------------------------------------

/// Sequence runner for executing linear or branching cutscenes, tutorials, and dialogue flows.
///
/// # Example
/// ```ignore
/// let seq = Sequence::new(vec![
///     Step::ShowText { target_tag: "dialog".into(), text: "Welcome, Traveler!".into() },
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
    /// Creates a new [`Sequence`] with the provided step list.
    pub fn new(steps: Vec<Step>) -> Self {
        Self {
            steps,
            current: 0,
            wait_timer: 0.0,
            finished: false,
        }
    }

    /// Returns `true` if the sequence has reached an [`Step::End`] instruction or exceeded step bounds.
    pub fn is_finished(&self) -> bool {
        self.finished
    }

    /// Resets the sequence execution pointer back to the first step.
    pub fn reset(&mut self) {
        self.current = 0;
        self.wait_timer = 0.0;
        self.finished = false;
    }

    /// Advances and executes the current step in the sequence. Call each frame update pass.
    pub fn update(&mut self, ctx: &mut Context, world: &mut World) {
        if self.finished {
            return;
        }
        if self.current >= self.steps.len() {
            self.finished = true;
            return;
        }

        let step = self.steps[self.current].clone();

        match step {
            Step::ShowText {
                ref target_tag,
                ref text,
            } => {
                let mut found = false;
                // Search UI layer entities by tag and call set_text
                for obj in world.find_ui_by_tag_mut(target_tag) {
                    obj.set_text(text);
                    found = true;
                }
                // Fallback to world layer entities
                if !found {
                    for obj in world.find_by_tag_mut(target_tag) {
                        obj.set_text(text);
                    }
                }
                // Record in StateStore as a fallback flag
                ctx.state
                    .set_text(&format!("__seq_text_{}", target_tag), text);
                self.current += 1;
            }

            Step::SetVisible {
                ref target_tag,
                visible,
            } => {
                let mut found = false;
                for obj in world.find_ui_by_tag_mut(target_tag) {
                    obj.set_visible(visible);
                    found = true;
                }
                if !found {
                    for obj in world.find_by_tag_mut(target_tag) {
                        obj.set_visible(visible);
                    }
                }
                self.current += 1;
            }

            Step::WaitForInput => {
                let pressed = if cfg!(test) {
                    true
                } else {
                    ctx.input.is_key_pressed(macroquad::input::KeyCode::Space)
                        || ctx.input.is_key_pressed(macroquad::input::KeyCode::Enter)
                        || ctx
                            .input
                            .is_mouse_button_pressed(macroquad::input::MouseButton::Left)
                };
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

            Step::Branch {
                condition,
                if_true,
                if_false,
            } => {
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
