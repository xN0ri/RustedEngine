//! Generic condition→action trigger system.
//!
//! [`TriggerSystem`] manages a list of [`Trigger`]s, each of which fires exactly
//! once when its condition — a closure operating on [`Resources`] — becomes true.
//! The engine has zero knowledge of what conditions or actions mean in a game.

use crate::resources::Resources;

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

/// A one-shot condition→action rule that operates on [`Resources`].
///
/// - `condition` is evaluated every frame against the current resource store.
/// - `action` runs exactly once the first time `condition` returns `true`.
/// - Set `one_shot = false` to make the trigger re-arm after firing.
pub struct Trigger {
    /// Closure that decides whether the trigger should fire.
    pub condition: Box<dyn Fn(&Resources) -> bool>,
    /// Closure that executes when the condition is met.
    pub action: Box<dyn FnMut(&mut Resources)>,
    /// Whether the trigger has already fired (one-shot by default).
    pub fired: bool,
    /// If `true` (default), the trigger fires at most once.
    /// Set to `false` to re-arm the trigger after it fires.
    pub one_shot: bool,
}

impl Trigger {
    /// Creates a new one-shot trigger.
    pub fn new(
        condition: impl Fn(&Resources) -> bool + 'static,
        action: impl FnMut(&mut Resources) + 'static,
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
/// Integrate by calling `ctx.triggers.update(&mut ctx.resources)` in an update closure.
/// The field is already present on [`Context`](crate::engine::Context) as `ctx.triggers`.
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

    /// Evaluates all active triggers against `resources` and fires matching ones.
    ///
    /// Should be called once per frame, typically at the start of the update step.
    pub fn update(&mut self, resources: &mut Resources) {
        for trigger in &mut self.triggers {
            if trigger.one_shot && trigger.fired {
                continue;
            }
            if (trigger.condition)(resources) {
                (trigger.action)(resources);
                trigger.fired = true;
            } else if !trigger.one_shot {
                // Repeating trigger resets its "fired" latch when condition is false
                trigger.fired = false;
            }
        }
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
        let mut res = Resources::new();
        res.insert(0_i32);

        ts.register(Trigger::new(
            |r| *r.get::<i32>().unwrap() >= 5,
            |r| *r.get_mut::<i32>().unwrap() = 0,
        ));

        *res.get_mut::<i32>().unwrap() = 10;
        ts.update(&mut res);
        assert_eq!(*res.get::<i32>().unwrap(), 0); // action ran

        *res.get_mut::<i32>().unwrap() = 10;
        ts.update(&mut res);
        assert_eq!(*res.get::<i32>().unwrap(), 10); // did NOT fire again
    }

    #[test]
    fn repeating_fires_every_frame_while_condition_holds() {
        let mut ts = TriggerSystem::new();
        let mut res = Resources::new();
        res.insert(0_u32);

        ts.register(Trigger::new(|_| true, |r| *r.get_mut::<u32>().unwrap() += 1).repeating());

        ts.update(&mut res);
        ts.update(&mut res);
        ts.update(&mut res);
        assert_eq!(*res.get::<u32>().unwrap(), 3);
    }

    #[test]
    fn prune_fired_removes_done_triggers() {
        let mut ts = TriggerSystem::new();
        let mut res = Resources::new();
        res.insert(10_i32);

        ts.register(Trigger::new(|r| *r.get::<i32>().unwrap() > 5, |_| {}));
        assert_eq!(ts.len(), 1);
        ts.update(&mut res);
        ts.prune_fired();
        assert_eq!(ts.len(), 0);
    }
}
