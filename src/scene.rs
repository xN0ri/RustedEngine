use crate::world::World;

pub struct Scene {
    name: String,
    world: World,
}

impl Scene {
    pub fn new(name: &str, world: World) -> Self {
        Self {
            world,
            name: name.to_string(),
        }
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn get_world(&mut self) -> &mut World {
        &mut self.world
    }
}

pub struct SceneManager {
    current_scene: usize,
    scenes: Vec<Scene>,
    pending_scene: Option<usize>,
}

impl SceneManager {
    pub fn new(scenes: Vec<Scene>) -> Self {
        Self {
            current_scene: 0,
            scenes,
            pending_scene: None,
        }
    }

    pub fn load_scene(&mut self, id: usize) {
        if id < self.scenes.len() {
            self.pending_scene = Some(id);
        }
    }

    pub fn switch_to(&mut self, name: &str) -> bool {
        if let Some(pos) = self.scenes.iter().position(|s| s.name() == name) {
            self.pending_scene = Some(pos);
            true
        } else {
            false
        }
    }

    pub fn update_pending(&mut self) {
        if let Some(next) = self.pending_scene.take() {
            if next < self.scenes.len() {
                self.current_scene = next;
            }
        }
    }

    pub fn current_scene_index(&self) -> usize {
        self.current_scene
    }

    pub fn get_current_scene(&mut self) -> &mut Scene {
        self.scenes.get_mut(self.current_scene).expect("Invalid scene index")
    }
}