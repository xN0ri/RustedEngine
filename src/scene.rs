use crate::world::{Object, World};

/// Discrete game scene containing a [`World`] layer instance.
pub struct Scene {
    name: String,
    world: World,
}

impl Scene {
    /// Creates a new [`Scene`] with the given name and [`World`].
    pub fn new(name: impl Into<String>, world: World) -> Self {
        Self {
            world,
            name: name.into(),
        }
    }

    /// Creates a new empty [`Scene`] with an unpopulated [`World`].
    pub fn new_empty(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            world: World::new(),
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
    pub fn update_pending(&mut self) {
        if let Some(next) = self
            .pending_scene
            .take()
            .filter(|&id| id < self.scenes.len())
        {
            self.current_scene = next;
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
