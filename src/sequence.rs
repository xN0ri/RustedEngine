use std::collections::HashMap;

use crate::{engine::Context, state::StateValue, world::World};

// ---------------------------------------------------------------------------
// Step — Scripted sequence step enum
// ---------------------------------------------------------------------------

/// Individual instruction step in a scripted narrative sequence or cutscene.
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

    /// Appends a line to a [`TextLog`](crate::ui::TextLog) entity matching `target_tag`
    /// via [`Object::append_line`](crate::world::Object::append_line).
    /// Searches the UI layer first, then falls back to the world layer.
    AppendLine { target_tag: String, text: String },

    /// Executes an arbitrary closure with access to [`Context`] and [`World`].
    /// Advances to the next step immediately (non-blocking).
    ///
    /// # Example
    /// ```ignore
    /// Step::run(|ctx, world| {
    ///     ctx.state.set_bool("checkpoint_reached", true);
    ///     world.remove_by_tag("old_enemies");
    /// })
    /// ```
    Run(Box<dyn FnMut(&mut Context, &mut World) + 'static>),

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

    /// Creates a [`Step::AppendLine`] instruction.
    pub fn append_line(target_tag: impl Into<String>, text: impl Into<String>) -> Self {
        Step::AppendLine {
            target_tag: target_tag.into(),
            text: text.into(),
        }
    }

    /// Creates a [`Step::Run`] instruction executing an arbitrary closure.
    pub fn run<F: FnMut(&mut Context, &mut World) + 'static>(func: F) -> Self {
        Step::Run(Box::new(func))
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
    /// Internal cache of the last text shown per target tag via [`Step::ShowText`].
    /// Does **not** write to [`StateStore`](crate::state::StateStore) — use this
    /// to read back what was last displayed without coupling to game save state.
    last_shown_texts: HashMap<String, String>,
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
            last_shown_texts: HashMap::new(),
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
        self.last_shown_texts.clear();
    }

    /// Returns the last text shown via [`Step::ShowText`] for the given `target_tag`,
    /// or `None` if that tag has never been targeted.
    ///
    /// This is the replacement for the old `ctx.state.get_text("__seq_text_<tag>")` pattern.
    pub fn last_shown_text(&self, target_tag: &str) -> Option<&str> {
        self.last_shown_texts.get(target_tag).map(|s| s.as_str())
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

    /// Appends a new [`Step`] to the sequence at runtime and updates label mappings.
    pub fn push_step(&mut self, step: Step) {
        if let Step::Label(ref name) = step {
            self.labels.insert(name.clone(), self.steps.len());
        }
        self.steps.push(step);
    }

    /// Returns the total number of steps in the sequence.
    pub fn steps_len(&self) -> usize {
        self.steps.len()
    }

    /// Advances and executes steps in the sequence. Instant (non-blocking) steps are executed continuously
    /// within the same frame pass until a blocking step (e.g. `Wait`, `WaitForInput`, or `End`) is encountered.
    pub fn update(&mut self, ctx: &mut Context, world: &mut World) {
        if self.finished {
            return;
        }

        let mut max_steps_per_frame = 1000;
        while !self.finished && self.current < self.steps.len() && max_steps_per_frame > 0 {
            max_steps_per_frame -= 1;

            // Match on a reference to avoid cloning the whole Step (which contains Strings).
            // Individual arms clone only the specific fields they need.
            match &self.steps[self.current] {
                Step::ShowText { target_tag, text } => {
                    let target_tag = target_tag.clone();
                    let text = text.clone();
                    let mut found = false;
                    // Search UI layer entities by tag and call set_text
                    for obj in world.find_ui_by_tag_mut(&target_tag) {
                        obj.set_text(&text);
                        found = true;
                    }
                    // Fallback to world layer entities
                    if !found {
                        for obj in world.find_by_tag_mut(&target_tag) {
                            obj.set_text(&text);
                        }
                    }
                    // Store in sequence-internal cache (not in StateStore).
                    self.last_shown_texts.insert(target_tag, text);
                    self.current += 1;
                }

                Step::SetVisible { target_tag, visible } => {
                    let target_tag = target_tag.clone();
                    let visible = *visible;
                    let mut found = false;
                    for obj in world.find_ui_by_tag_mut(&target_tag) {
                        obj.set_visible(visible);
                        found = true;
                    }
                    if !found {
                        for obj in world.find_by_tag_mut(&target_tag) {
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
                    } else {
                        break;
                    }
                }

                Step::SetFlag { key, value } => {
                    let key = key.clone();
                    let value = value.clone();
                    ctx.state.set(&key, value);
                    self.current += 1;
                }

                Step::Wait { seconds } => {
                    let seconds = *seconds;
                    self.wait_timer += ctx.time.deltatime();
                    if self.wait_timer >= seconds {
                        self.wait_timer = 0.0;
                        self.current += 1;
                    } else {
                        break;
                    }
                }

                Step::Branch { condition, if_true, if_false } => {
                    let go = ctx.state.get_bool(condition);
                    let if_true = *if_true;
                    let if_false = *if_false;
                    self.current = if go { if_true } else { if_false };
                }

                Step::Label(_) => {
                    self.current += 1;
                }

                Step::JumpTo(label) => {
                    let label = label.clone();
                    self.current = self.resolve_label(&label);
                }

                Step::BranchTo { condition, if_true, if_false } => {
                    let go = ctx.state.get_bool(condition);
                    let target = if go { if_true.clone() } else { if_false.clone() };
                    self.current = self.resolve_label(&target);
                }

                Step::RepeatUntil { loop_id, label, times } => {
                    let loop_id = loop_id.clone();
                    let label = label.clone();
                    let times = *times;
                    let count = self.loop_counts.entry(loop_id.clone()).or_insert(0);
                    *count += 1;
                    if *count < times {
                        self.current = self.resolve_label(&label);
                    } else {
                        self.loop_counts.remove(&loop_id);
                        self.current += 1;
                    }
                }

                Step::PlaySound { sound_name } => {
                    let sound_name = sound_name.clone();
                    ctx.play_sound(&sound_name);
                    self.current += 1;
                }

                Step::Jump(target) => {
                    let target = *target;
                    self.current = target;
                }

                Step::AppendLine { target_tag, text } => {
                    let target_tag = target_tag.clone();
                    let text = text.clone();
                    let mut found = false;
                    for obj in world.find_ui_by_tag_mut(&target_tag) {
                        obj.append_line(&text);
                        found = true;
                    }
                    if !found {
                        for obj in world.find_by_tag_mut(&target_tag) {
                            obj.append_line(&text);
                        }
                    }
                    self.current += 1;
                }

                Step::Run(_) => {
                    // Temporarily swap out the step to call the closure without borrow conflicts.
                    let mut placeholder = Step::End;
                    std::mem::swap(&mut self.steps[self.current], &mut placeholder);
                    if let Step::Run(ref mut func) = placeholder {
                        func(ctx, world);
                    }
                    std::mem::swap(&mut self.steps[self.current], &mut placeholder);
                    self.current += 1;
                }

                Step::End => {
                    self.finished = true;
                    break;
                }
            }
        }

        if self.current >= self.steps.len() {
            self.finished = true;
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

    /// Appends a [`Step::AppendLine`] instruction targeting a [`TextLog`](crate::ui::TextLog) entity by tag.
    pub fn append_line(mut self, target_tag: impl Into<String>, text: impl Into<String>) -> Self {
        self.steps.push(Step::append_line(target_tag, text));
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

        // Since steps are instant, update() executes all 3 loop iterations until Step::End in one frame!
        seq_runner.update(&mut ctx, &mut world);
        assert_eq!(seq_runner.loop_count("decrypt"), 0); // Removed after completion
        assert!(seq_runner.is_finished());
    }

    #[test]
    fn reset_clears_loop_counts() {
        let mut seq = Sequence::new(vec![
            Step::label("loop"),
            Step::wait(1.0),
            Step::repeat_until("my_loop", "loop", 5),
            Step::end(),
        ]);

        let mut ctx = Context::new();
        let mut world = World::new();

        seq.update(&mut ctx, &mut world); // Label -> Wait (pauses)
        assert_eq!(seq.current, 1);

        seq.reset();
        assert_eq!(seq.loop_count("my_loop"), 0);
        assert_eq!(seq.current, 0);
        assert!(!seq.is_finished());
    }
}
