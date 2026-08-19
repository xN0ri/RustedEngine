use crate::engine::Context;
use crate::world::{Object, World};

/// Event emitted automatically whenever active scene switches.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SceneChanged {
    pub from: String,
    pub to: String,
}

/// Discrete game scene containing a [`World`] layer instance.
pub struct Scene {
    name: String,
    world: World,
    on_enter: Option<Box<dyn FnMut(&mut Context) + 'static>>,
}

impl Scene {
    /// Creates a new [`Scene`] with the given name and [`World`].
    pub fn new(name: impl Into<String>, world: World) -> Self {
        Self {
            world,
            name: name.into(),
            on_enter: None,
        }
    }

    /// Creates a new empty [`Scene`] with an unpopulated [`World`].
    pub fn new_empty(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            world: World::new(),
            on_enter: None,
        }
    }

    /// Attaches an `on_enter` callback triggered when this scene becomes active.
    pub fn on_enter<F: FnMut(&mut Context) + 'static>(mut self, callback: F) -> Self {
        self.on_enter = Some(Box::new(callback));
        self
    }

    /// Internal: Triggers the `on_enter` callback if set.
    pub fn trigger_on_enter(&mut self, ctx: &mut Context) {
        if let Some(ref mut cb) = self.on_enter {
            (cb)(ctx);
        }
    }

    /// Adds a new entity to the scene's world-space layer.
    pub fn add<O: Object + 'static>(&mut self, object: O) {
        self.world.add(object);
    }

    /// Adds a new UI entity to the scene's screen-space UI layer.
    pub fn add_ui<O: Object + 'static>(&mut self, object: O) {
        self.world.add_ui(object);
    }

    /// Adds a scripted [`Sequence`](crate::sequence::Sequence) to the scene.
    pub fn add_sequence(&mut self, sequence: crate::sequence::Sequence) {
        self.world.add_sequence(sequence);
    }

    /// Returns the scene identifier name.
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Returns a mutable reference to the scene's [`World`].
    pub fn get_world(&mut self) -> &mut World {
        &mut self.world
    }
}

/// Controller managing scene navigation and pending scene switches.
#[derive(Default)]
pub struct SceneManager {
    current_scene: usize,
    scenes: Vec<Scene>,
    pending_scene: Option<usize>,
}

impl SceneManager {
    /// Creates a new empty [`SceneManager`].
    pub fn new_empty() -> Self {
        Self::default()
    }

    /// Creates a new [`SceneManager`] initialized with a list of scenes.
    pub fn new(scenes: Vec<Scene>) -> Self {
        Self {
            current_scene: 0,
            scenes,
            pending_scene: None,
        }
    }

    /// Registers a new [`Scene`] with the manager.
    pub fn add(&mut self, scene: Scene) {
        self.scenes.push(scene);
    }

    /// Schedules a scene switch by numeric index.
    pub fn load_scene(&mut self, id: usize) {
        if id < self.scenes.len() {
            self.pending_scene = Some(id);
        }
    }

    /// Schedules a scene switch by scene name. Returns `true` if the scene was found.
    pub fn switch_to(&mut self, name: &str) -> bool {
        if let Some(pos) = self.scenes.iter().position(|s| s.name() == name) {
            self.pending_scene = Some(pos);
            true
        } else {
            false
        }
    }

    /// Alias for [`switch_to`](SceneManager::switch_to). Schedules scene switch by name.
    pub fn set_current(&mut self, name: &str) -> bool {
        self.switch_to(name)
    }

    /// Internal: Applies queued scene transitions at frame boundaries.
    pub fn update_pending(&mut self, ctx: &mut Context) {
        if let Some(next) = self
            .pending_scene
            .take()
            .filter(|&id| id < self.scenes.len())
        {
            let prev_name = self
                .scenes
                .get(self.current_scene)
                .map(|s| s.name().to_string())
                .unwrap_or_default();

            self.current_scene = next;
            let new_name = self.scenes[self.current_scene].name().to_string();

            // Emit automatic scene events and signals
            ctx.events.emit(SceneChanged {
                from: prev_name,
                to: new_name.clone(),
            });
            ctx.events.emit_signal("sys:scene_loaded");
            ctx.events.emit_signal(format!("sys:enter_scene_{}", new_name));

            // Run on_enter callback if present
            self.scenes[self.current_scene].trigger_on_enter(ctx);
        }
    }

    /// Returns the current active scene index.
    pub fn current_scene_index(&self) -> usize {
        self.current_scene
    }

    /// Returns a mutable reference to the active [`Scene`].
    pub fn get_current_scene(&mut self) -> &mut Scene {
        self.scenes
            .get_mut(self.current_scene)
            .expect("Invalid scene index")
    }

    /// Returns a slice of registered scenes.
    pub fn scenes(&self) -> &[Scene] {
        &self.scenes
    }
}

impl From<Scene> for SceneManager {
    fn from(scene: Scene) -> Self {
        Self::new(vec![scene])
    }
}

impl From<Vec<Scene>> for SceneManager {
    fn from(scenes: Vec<Scene>) -> Self {
        Self::new(scenes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scene_on_enter_and_events() {
        let mut ctx = Context::new();
        let mut mgr = SceneManager::new(vec![
            Scene::new_empty("Menu"),
            Scene::new_empty("Game").on_enter(|ctx| {
                ctx.state.set_bool("game_entered", true);
            }),
        ]);

        mgr.switch_to("Game");
        mgr.update_pending(&mut ctx);

        assert_eq!(mgr.current_scene_index(), 1);
        assert!(ctx.state.get_bool("game_entered"));

        let events = ctx.events.poll::<SceneChanged>();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].from, "Menu");
        assert_eq!(events[0].to, "Game");

        assert!(ctx.events.poll_signal("sys:scene_loaded"));
        assert!(ctx.events.poll_signal("sys:enter_scene_Game"));
    }
}
