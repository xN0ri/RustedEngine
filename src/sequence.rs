use std::collections::HashMap;

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

    /// No-op marker step defining a named jump target for `JumpTo`/`BranchTo`/`RepeatUntil`.
    Label(String),

    /// Unconditional jump to a named label (resolved once at Sequence construction).
    JumpTo(String),

    /// Conditional branch to named labels based on a boolean key in [`Context::state`](crate::engine::Context::state).
    BranchTo {
        condition: String,
        if_true: String,
        if_false: String,
    },

    /// Jumps back to `label` until visited `times` times total (tracked per `loop_id`),
    /// then falls through to the next step. Use for "retry N times" style narrative loops.
    RepeatUntil {
        loop_id: String,
        label: String,
        times: u32,
    },

    /// Plays a sound effect loaded in [`Context::assets`](crate::engine::Context::assets) by name.
    PlaySound { sound_name: String },

    /// Unconditionally jumps execution to the specified step index.
    Jump(usize),

    /// Concludes the sequence execution.
    End,
}

impl Step {
    /// Creates a [`Step::ShowText`] instruction.
    pub fn show_text(target_tag: impl Into<String>, text: impl Into<String>) -> Self {
        Step::ShowText {
            target_tag: target_tag.into(),
            text: text.into(),
        }
    }

    /// Creates a [`Step::SetVisible`] instruction.
    pub fn set_visible(target_tag: impl Into<String>, visible: bool) -> Self {
        Step::SetVisible {
            target_tag: target_tag.into(),
            visible,
        }
    }

    /// Creates a [`Step::WaitForInput`] instruction.
    pub fn wait_for_input() -> Self {
        Step::WaitForInput
    }

    /// Creates a [`Step::SetFlag`] instruction.
    pub fn set_flag(key: impl Into<String>, value: impl Into<StateValue>) -> Self {
        Step::SetFlag {
            key: key.into(),
            value: value.into(),
        }
    }

    /// Creates a [`Step::Wait`] instruction.
    pub fn wait(seconds: f32) -> Self {
        Step::Wait { seconds }
    }

    /// Creates a [`Step::Branch`] instruction.
    pub fn branch(condition: impl Into<String>, if_true: usize, if_false: usize) -> Self {
        Step::Branch {
            condition: condition.into(),
            if_true,
            if_false,
        }
    }

    /// Creates a [`Step::Label`] marker step.
    pub fn label(name: impl Into<String>) -> Self {
        Step::Label(name.into())
    }

    /// Creates a [`Step::JumpTo`] instruction targeting a named label.
    pub fn jump_to(label: impl Into<String>) -> Self {
        Step::JumpTo(label.into())
    }

    /// Creates a [`Step::BranchTo`] instruction targeting named labels.
    pub fn branch_to(
        condition: impl Into<String>,
        if_true: impl Into<String>,
        if_false: impl Into<String>,
    ) -> Self {
        Step::BranchTo {
            condition: condition.into(),
            if_true: if_true.into(),
            if_false: if_false.into(),
        }
    }

    /// Creates a [`Step::RepeatUntil`] loop instruction.
    pub fn repeat_until(loop_id: impl Into<String>, label: impl Into<String>, times: u32) -> Self {
        Step::RepeatUntil {
            loop_id: loop_id.into(),
            label: label.into(),
            times,
        }
    }

    /// Creates a [`Step::PlaySound`] instruction.
    pub fn play_sound(sound_name: impl Into<String>) -> Self {
        Step::PlaySound {
            sound_name: sound_name.into(),
        }
    }

    /// Creates a [`Step::Jump`] instruction targeting a numeric index.
    pub fn jump(target: usize) -> Self {
        Step::Jump(target)
    }

    /// Creates a [`Step::End`] instruction.
    pub fn end() -> Self {
        Step::End
    }
}

// ---------------------------------------------------------------------------
// Sequence — Scripted step runner engine
// ---------------------------------------------------------------------------

/// Sequence runner for executing linear or branching cutscenes, tutorials, and dialogue flows.
///
/// # Example
/// ```ignore
/// let seq = Sequence::new(vec![
///     Step::show_text("dialog", "Welcome, Traveler!"),
///     Step::wait_for_input(),
///     Step::set_flag("met_npc", true),
///     Step::label("retry"),
///     Step::show_text("terminal", "Próba odszyfrowania..."),
///     Step::wait(0.8),
///     Step::repeat_until("decrypt_attempts", "retry", 5),
///     Step::end(),
/// ]);
/// ```
pub struct Sequence {
    steps: Vec<Step>,
    current: usize,
    wait_timer: f32,
    finished: bool,
    labels: HashMap<String, usize>,
    loop_counts: HashMap<String, u32>,
}

fn build_label_map(steps: &[Step]) -> HashMap<String, usize> {
    steps
        .iter()
        .enumerate()
        .filter_map(|(i, s)| match s {
            Step::Label(name) => Some((name.clone(), i)),
            _ => None,
        })
        .collect()
}

impl Sequence {
    /// Creates a new [`Sequence`] with the provided step list.
    pub fn new(steps: Vec<Step>) -> Self {
        let labels = build_label_map(&steps);
        Self {
            steps,
            current: 0,
            wait_timer: 0.0,
            finished: false,
            labels,
            loop_counts: HashMap::new(),
        }
    }

    /// Creates a new [`SequenceBuilder`] for constructing sequences with named labels and fluent methods.
    pub fn builder() -> SequenceBuilder {
        SequenceBuilder::new()
    }

    /// Returns `true` if the sequence has reached an [`Step::End`] instruction or exceeded step bounds.
    pub fn is_finished(&self) -> bool {
        self.finished
    }

    /// Resets the sequence execution pointer back to the first step and clears loop counters.
    pub fn reset(&mut self) {
        self.current = 0;
        self.wait_timer = 0.0;
        self.finished = false;
        self.loop_counts.clear();
    }

    /// Resolves a label to a step index. Returns `steps.len()` (natural end)
    /// if the label doesn't exist, logging a warning in debug builds.
    fn resolve_label(&self, name: &str) -> usize {
        match self.labels.get(name) {
            Some(&idx) => idx,
            None => {
                #[cfg(debug_assertions)]
                eprintln!("[Sequence] warning: unknown label '{name}', ending sequence");
                self.steps.len()
            }
        }
    }

    #[cfg(test)]
    pub(crate) fn loop_count(&self, loop_id: &str) -> u32 {
        self.loop_counts.get(loop_id).copied().unwrap_or(0)
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

            Step::Label(_) => {
                self.current += 1;
            }

            Step::JumpTo(ref label) => {
                self.current = self.resolve_label(label);
            }

            Step::BranchTo {
                ref condition,
                ref if_true,
                ref if_false,
            } => {
                let target = if ctx.state.get_bool(condition) {
                    if_true
                } else {
                    if_false
                };
                self.current = self.resolve_label(target);
            }

            Step::RepeatUntil {
                ref loop_id,
                ref label,
                times,
            } => {
                let count = self.loop_counts.entry(loop_id.clone()).or_insert(0);
                *count += 1;
                if *count < times {
                    self.current = self.resolve_label(label);
                } else {
                    self.loop_counts.remove(loop_id);
                    self.current += 1;
                }
            }

            Step::PlaySound { ref sound_name } => {
                ctx.play_sound(sound_name);
                self.current += 1;
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

// ---------------------------------------------------------------------------
// SequenceBuilder — Fluent builder pattern for constructing sequences
// ---------------------------------------------------------------------------

/// Fluent builder for constructing [`Sequence`] steps with named labels and zero manual index math.
#[derive(Default)]
pub struct SequenceBuilder {
    steps: Vec<Step>,
}

impl SequenceBuilder {
    /// Creates a new [`SequenceBuilder`].
    pub fn new() -> Self {
        Self::default()
    }

    /// Appends a [`Step::ShowText`] instruction.
    pub fn show_text(mut self, target_tag: impl Into<String>, text: impl Into<String>) -> Self {
        self.steps.push(Step::show_text(target_tag, text));
        self
    }

    /// Appends a [`Step::SetVisible`] instruction.
    pub fn set_visible(mut self, target_tag: impl Into<String>, visible: bool) -> Self {
        self.steps.push(Step::set_visible(target_tag, visible));
        self
    }

    /// Appends a [`Step::Wait`] instruction.
    pub fn wait(mut self, seconds: f32) -> Self {
        self.steps.push(Step::wait(seconds));
        self
    }

    /// Appends a [`Step::WaitForInput`] instruction.
    pub fn wait_input(mut self) -> Self {
        self.steps.push(Step::wait_for_input());
        self
    }

    /// Appends a [`Step::SetFlag`] instruction.
    pub fn set_flag(mut self, key: impl Into<String>, value: impl Into<StateValue>) -> Self {
        self.steps.push(Step::set_flag(key, value));
        self
    }

    /// Appends a [`Step::PlaySound`] instruction.
    pub fn play_sound(mut self, sound_name: impl Into<String>) -> Self {
        self.steps.push(Step::play_sound(sound_name));
        self
    }

    /// Registers a named label at the current step position.
    pub fn label(mut self, name: impl Into<String>) -> Self {
        self.steps.push(Step::label(name));
        self
    }

    /// Appends a jump instruction pointing to a named label.
    pub fn jump_to_label(mut self, name: impl Into<String>) -> Self {
        self.steps.push(Step::jump_to(name));
        self
    }

    /// Appends a [`Step::BranchTo`] instruction.
    pub fn branch_to(
        mut self,
        condition: impl Into<String>,
        if_true: impl Into<String>,
        if_false: impl Into<String>,
    ) -> Self {
        self.steps
            .push(Step::branch_to(condition, if_true, if_false));
        self
    }

    /// Appends a [`Step::RepeatUntil`] instruction.
    pub fn repeat_until(
        mut self,
        loop_id: impl Into<String>,
        label: impl Into<String>,
        times: u32,
    ) -> Self {
        self.steps.push(Step::repeat_until(loop_id, label, times));
        self
    }

    /// Appends an unconditional jump instruction pointing to a numeric step index.
    pub fn jump(mut self, step_index: usize) -> Self {
        self.steps.push(Step::jump(step_index));
        self
    }

    /// Appends a [`Step::End`] instruction.
    pub fn end(mut self) -> Self {
        self.steps.push(Step::end());
        self
    }

    /// Builds and returns the final [`Sequence`].
    pub fn build(self) -> Sequence {
        Sequence::new(self.steps)
    }
}

// ---------------------------------------------------------------------------
// Unit Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn label_resolves_to_correct_index() {
        let seq = Sequence::new(vec![
            Step::wait(1.0),
            Step::label("start"),
            Step::set_visible("line", true),
            Step::label("finish"),
            Step::end(),
        ]);

        assert_eq!(seq.resolve_label("start"), 1);
        assert_eq!(seq.resolve_label("finish"), 3);
    }

    #[test]
    fn jump_to_unknown_label_ends_sequence() {
        let seq = Sequence::new(vec![Step::jump_to("nonexistent"), Step::end()]);
        assert_eq!(seq.resolve_label("nonexistent"), 2);
    }

    #[test]
    fn repeat_until_loops_exact_number_of_times() {
        let seq = Sequence::new(vec![
            Step::label("retry"),
            Step::set_flag("run", true),
            Step::repeat_until("decrypt", "retry", 3),
            Step::end(),
        ]);

        let mut ctx = Context::new();
        let mut world = World::new();

        let mut seq_runner = seq;

        // Iteration 1: Step 0 (Label), Step 1 (SetFlag), Step 2 (RepeatUntil -> jumps to 0, count=1)
        seq_runner.update(&mut ctx, &mut world); // Label -> current 1
        seq_runner.update(&mut ctx, &mut world); // SetFlag -> current 2
        seq_runner.update(&mut ctx, &mut world); // RepeatUntil -> count 1 < 3, jumps to 0
        assert_eq!(seq_runner.loop_count("decrypt"), 1);

        // Iteration 2
        seq_runner.update(&mut ctx, &mut world); // Label -> current 1
        seq_runner.update(&mut ctx, &mut world); // SetFlag -> current 2
        seq_runner.update(&mut ctx, &mut world); // RepeatUntil -> count 2 < 3, jumps to 0
        assert_eq!(seq_runner.loop_count("decrypt"), 2);

        // Iteration 3
        seq_runner.update(&mut ctx, &mut world); // Label -> current 1
        seq_runner.update(&mut ctx, &mut world); // SetFlag -> current 2
        seq_runner.update(&mut ctx, &mut world); // RepeatUntil -> count 3 == 3, falls through to current 3 (End)
        assert_eq!(seq_runner.loop_count("decrypt"), 0); // Removed after completion
        assert_eq!(seq_runner.current, 3);
    }

    #[test]
    fn reset_clears_loop_counts() {
        let mut seq = Sequence::new(vec![
            Step::label("loop"),
            Step::repeat_until("my_loop", "loop", 5),
            Step::end(),
        ]);

        let mut ctx = Context::new();
        let mut world = World::new();

        seq.update(&mut ctx, &mut world); // Label
        seq.update(&mut ctx, &mut world); // RepeatUntil -> count 1
        assert_eq!(seq.loop_count("my_loop"), 1);

        seq.reset();
        assert_eq!(seq.loop_count("my_loop"), 0);
        assert_eq!(seq.current, 0);
        assert!(!seq.is_finished());
    }
}
