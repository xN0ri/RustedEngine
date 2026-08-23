//! Generic condition→action trigger system.
//!
//! [`TriggerSystem`] manages a list of [`Trigger`]s, each of which fires
//! when its condition — a closure with access to the full [`Context`] — becomes true.
//! The engine has zero knowledge of what conditions or actions mean in a game.

use crate::engine::Context;

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

/// A one-shot condition→action rule with full access to [`Context`].
///
/// - `condition` is evaluated every frame against [`Context`].
/// - `action` runs exactly once the first time `condition` returns `true`.
/// - Set `one_shot = false` (via [`.repeating()`](Trigger::repeating)) to re-arm after firing.
///
/// # Example
/// ```ignore
/// ctx.triggers.register(
///     Trigger::new(
///         |ctx| ctx.state.get_bool("player_died"),
///         |ctx| { ctx.switch_scene("GameOver"); },
///     )
/// );
/// ```
pub struct Trigger {
    /// Closure that decides whether the trigger should fire.
    pub condition: Box<dyn Fn(&Context) -> bool>,
    /// Closure that executes when the condition is met.
    pub action: Box<dyn FnMut(&mut Context)>,
    /// Whether the trigger has already fired (one-shot by default).
    pub fired: bool,
    /// If `true` (default), the trigger fires at most once.
    /// Set to `false` (via [`.repeating()`](Trigger::repeating)) to re-arm the trigger after firing.
    pub one_shot: bool,
}

impl Trigger {
    /// Creates a new one-shot [`Trigger`] with full access to [`Context`].
    pub fn new(
        condition: impl Fn(&Context) -> bool + 'static,
        action: impl FnMut(&mut Context) + 'static,
    ) -> Self {
        Self {
            condition: Box::new(condition),
            action: Box::new(action),
            fired: false,
            one_shot: true,
        }
    }

    /// Makes this trigger re-arm after firing (fires every frame the condition holds).
    pub fn repeating(mut self) -> Self {
        self.one_shot = false;
        self
    }

    /// Creates a one-shot trigger that fires when a named boolean flag in [`Context::state`](crate::engine::Context::state) becomes `true`.
    pub fn when_flag_true(
        key: impl Into<String>,
        action: impl FnMut(&mut Context) + 'static,
    ) -> Self {
        let flag_key = key.into();
        Self::new(
            move |ctx| ctx.state.get_bool(&flag_key),
            action,
        )
    }

    /// Creates a one-shot trigger that fires when a named boolean flag in [`Context::state`](crate::engine::Context::state) becomes `false`.
    pub fn when_flag_false(
        key: impl Into<String>,
        action: impl FnMut(&mut Context) + 'static,
    ) -> Self {
        let flag_key = key.into();
        Self::new(
            move |ctx| !ctx.state.get_bool(&flag_key),
            action,
        )
    }
}

// ---------------------------------------------------------------------------
// TriggerSystem
// ---------------------------------------------------------------------------

/// Manages a collection of [`Trigger`]s, evaluating and executing them each frame.
///
/// Registered triggers are checked in insertion order.
/// One-shot triggers are permanently disabled after firing.
/// Repeating triggers run every frame their condition is satisfied.
///
/// The field is already present on [`Context`](crate::engine::Context) as `ctx.triggers`.
/// The system is automatically driven by [`World::update`](crate::world::World::update) — no manual call needed.
#[derive(Default)]
pub struct TriggerSystem {
    triggers: Vec<Trigger>,
}

impl TriggerSystem {
    /// Creates a new empty [`TriggerSystem`].
    pub fn new() -> Self {
        Self::default()
    }

    /// Registers a new trigger.
    pub fn register(&mut self, trigger: Trigger) {
        self.triggers.push(trigger);
    }

    /// Evaluates all active triggers against `ctx` and fires matching ones.
    ///
    /// Called automatically once per frame by [`World::update`](crate::world::World::update).
    pub fn update_with_context(triggers: &mut Vec<Trigger>, ctx: &mut Context) {
        for trigger in triggers.iter_mut() {
            if trigger.one_shot && trigger.fired {
                continue;
            }
            if (trigger.condition)(ctx) {
                (trigger.action)(ctx);
                trigger.fired = true;
            } else if !trigger.one_shot {
                // Repeating trigger resets its "fired" latch when condition is false
                trigger.fired = false;
            }
        }
    }

    /// Returns the internal trigger list for direct update (used by `World::update`).
    pub(crate) fn triggers_mut(&mut self) -> &mut Vec<Trigger> {
        &mut self.triggers
    }

    /// Removes all fired one-shot triggers from the list (optional GC step).
    pub fn prune_fired(&mut self) {
        self.triggers.retain(|t| !(t.one_shot && t.fired));
    }

    /// Returns the number of currently registered triggers (including fired ones).
    pub fn len(&self) -> usize {
        self.triggers.len()
    }

    /// Returns `true` if no triggers are registered.
    pub fn is_empty(&self) -> bool {
        self.triggers.is_empty()
    }
}

// ---------------------------------------------------------------------------
// Unit tests (pure Rust, no macroquad)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn one_shot_fires_once() {
        let mut ts = TriggerSystem::new();
        let mut ctx = Context::new();
        ctx.state.set_int("counter", 10);

        ts.register(Trigger::new(
            |ctx| ctx.state.get_int("counter") >= 5,
            |ctx| ctx.state.set_int("counter", 0),
        ));

        TriggerSystem::update_with_context(ts.triggers_mut(), &mut ctx);
        assert_eq!(ctx.state.get_int("counter"), 0); // action ran

        ctx.state.set_int("counter", 10);
        TriggerSystem::update_with_context(ts.triggers_mut(), &mut ctx);
        assert_eq!(ctx.state.get_int("counter"), 10); // did NOT fire again (one-shot)
    }

    #[test]
    fn repeating_fires_every_frame_while_condition_holds() {
        let mut ts = TriggerSystem::new();
        let mut ctx = Context::new();
        ctx.state.set_int("count", 0);

        ts.register(Trigger::new(|_| true, |ctx| { ctx.state.increment("count", 1); }).repeating());

        TriggerSystem::update_with_context(ts.triggers_mut(), &mut ctx);
        TriggerSystem::update_with_context(ts.triggers_mut(), &mut ctx);
        TriggerSystem::update_with_context(ts.triggers_mut(), &mut ctx);
        assert_eq!(ctx.state.get_int("count"), 3);
    }

    #[test]
    fn prune_fired_removes_done_triggers() {
        let mut ts = TriggerSystem::new();
        let mut ctx = Context::new();
        ctx.state.set_int("val", 10);

        ts.register(Trigger::new(
            |ctx| ctx.state.get_int("val") > 5,
            |_| {},
        ));
        assert_eq!(ts.len(), 1);
        TriggerSystem::update_with_context(ts.triggers_mut(), &mut ctx);
        ts.prune_fired();
        assert_eq!(ts.len(), 0);
    }

    #[test]
    fn when_flag_true_fires_on_flag() {
        let mut ts = TriggerSystem::new();
        let mut ctx = Context::new();

        ts.register(Trigger::when_flag_true("boss_dead", |ctx| {
            ctx.state.set_bool("credits_shown", true);
        }));

        TriggerSystem::update_with_context(ts.triggers_mut(), &mut ctx);
        assert!(!ctx.state.get_bool("credits_shown")); // flag not set yet

        ctx.state.set_bool("boss_dead", true);
        TriggerSystem::update_with_context(ts.triggers_mut(), &mut ctx);
        assert!(ctx.state.get_bool("credits_shown")); // fired!
    }
}
