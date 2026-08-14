use crate::world::World;

/// Discrete game scene containing a [`World`] layer instance.
pub struct Scene {
    name: String,
    world: World,
}

impl Scene {
    /// Creates a new [`Scene`] with the given name and [`World`].
    pub fn new(name: &str, world: World) -> Self {
        Self {
            world,
            name: name.to_string(),
        }
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
pub struct SceneManager {
    current_scene: usize,
    scenes: Vec<Scene>,
    pending_scene: Option<usize>,
}

impl SceneManager {
    /// Creates a new [`SceneManager`] initialized with a list of scenes.
    pub fn new(scenes: Vec<Scene>) -> Self {
        Self {
            current_scene: 0,
            scenes,
            pending_scene: None,
        }
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

    /// Internal: Applies queued scene transitions at frame boundaries.
    pub fn update_pending(&mut self) {
        if let Some(next) = self.pending_scene.take() {
            if next < self.scenes.len() {
                self.current_scene = next;
            }
        }
    }

    /// Returns the current active scene index.
    pub fn current_scene_index(&self) -> usize {
        self.current_scene
    }

    /// Returns a mutable reference to the active [`Scene`].
    pub fn get_current_scene(&mut self) -> &mut Scene {
        self.scenes.get_mut(self.current_scene).expect("Invalid scene index")
    }
}