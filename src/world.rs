use crate::engine::Context;

/// Base trait implemented by all game world entities and UI components.
pub trait Object {
    /// Executes entity logic updates for the current frame.
    fn update(&mut self, _ctx: &mut Context) {}

    /// Renders the entity.
    fn draw(&self);

    /// Returns the entity tag string used for filter queries. Defaults to `""`.
    fn tag(&self) -> &str {
        ""
    }

    /// Returns `true` if the entity tag matches `tag`.
    fn has_tag(&self, tag: &str) -> bool {
        self.tag() == tag
    }

    /// Updates text content on entities supporting text rendering (e.g. [`Text`](crate::ui::Text), [`TextObject`](crate::ui::TextObject)).
    /// Default implementation is a no-op.
    fn set_text(&mut self, _text: &str) {}
}

/// Game world container holding separate entity rendering layers:
///
/// - `objects` — Rendered in world space inside camera view bounds.
/// - `ui_objects` — Rendered in screen space outside camera view bounds.
pub struct World {
    objects: Vec<Box<dyn Object>>,
    ui_objects: Vec<Box<dyn Object>>,
}

impl World {
    /// Creates a new [`World`] with world-space entities.
    pub fn new(objects: Vec<Box<dyn Object>>) -> Self {
        Self {
            objects,
            ui_objects: Vec::new(),
        }
    }

    /// Creates a new [`World`] with both world-space entities and screen-space UI components.
    pub fn new_with_ui(objects: Vec<Box<dyn Object>>, ui_objects: Vec<Box<dyn Object>>) -> Self {
        Self { objects, ui_objects }
    }

    /// Adds a new object to the world-space layer at runtime.
    pub fn add(&mut self, object: Box<dyn Object>) {
        self.objects.push(object);
    }

    /// Adds a new object to the screen-space UI layer at runtime.
    pub fn add_ui(&mut self, object: Box<dyn Object>) {
        self.ui_objects.push(object);
    }

    /// Returns a slice of world-space objects.
    pub fn objects(&self) -> &[Box<dyn Object>] {
        &self.objects
    }

    /// Returns a mutable slice of world-space objects.
    pub fn objects_mut(&mut self) -> &mut [Box<dyn Object>] {
        &mut self.objects
    }

    /// Returns a slice of screen-space UI objects.
    pub fn ui_objects(&self) -> &[Box<dyn Object>] {
        &self.ui_objects
    }

    /// Returns a mutable slice of screen-space UI objects.
    pub fn ui_objects_mut(&mut self) -> &mut [Box<dyn Object>] {
        &mut self.ui_objects
    }

    /// Queries world-space objects by tag (read-only).
    pub fn find_by_tag(&self, tag: &str) -> Vec<&dyn Object> {
        self.objects
            .iter()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_ref())
            .collect()
    }

    /// Queries world-space objects by tag (mutable).
    pub fn find_by_tag_mut<'a>(&'a mut self, tag: &str) -> Vec<&'a mut (dyn Object + 'static)> {
        self.objects
            .iter_mut()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_mut())
            .collect()
    }

    /// Queries screen-space UI objects by tag (read-only).
    pub fn find_ui_by_tag(&self, tag: &str) -> Vec<&dyn Object> {
        self.ui_objects
            .iter()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_ref())
            .collect()
    }

    /// Queries screen-space UI objects by tag (mutable).
    pub fn find_ui_by_tag_mut<'a>(&'a mut self, tag: &str) -> Vec<&'a mut (dyn Object + 'static)> {
        self.ui_objects
            .iter_mut()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_mut())
            .collect()
    }

    /// Counts world-space objects matching `tag`.
    pub fn count_by_tag(&self, tag: &str) -> usize {
        self.objects.iter().filter(|o| o.has_tag(tag)).count()
    }

    /// Counts UI-space objects matching `tag`.
    pub fn count_ui_by_tag(&self, tag: &str) -> usize {
        self.ui_objects.iter().filter(|o| o.has_tag(tag)).count()
    }

    /// Updates all world and UI objects.
    pub fn update(&mut self, ctx: &mut Context) {
        for obj in self.objects.iter_mut() {
            obj.update(ctx);
        }
        for obj in self.ui_objects.iter_mut() {
            obj.update(ctx);
        }
    }

    /// Renders world-space objects inside camera view bounds.
    pub fn draw(&self) {
        for obj in self.objects.iter() {
            obj.draw();
        }
    }

    /// Renders screen-space UI objects outside camera view bounds.
    pub fn draw_ui(&self) {
        for obj in self.ui_objects.iter() {
            obj.draw();
        }
    }
}

impl Default for World {
    fn default() -> Self {
        Self::new(Vec::new())
    }
}

// ---------------------------------------------------------------------------
// World creation macros
// ---------------------------------------------------------------------------

/// Constructs a `Vec<Box<dyn Object>>` from expressions without requiring manual `Box::new()` boilerplate.
///
/// # Example
/// ```ignore
/// let objs = world_objects![player, enemy, bullet];
/// ```
#[macro_export]
macro_rules! world_objects {
    ($($obj:expr),* $(,)?) => {
        vec![$(Box::new($obj) as Box<dyn $crate::world::Object>),*]
    };
}

/// Declarative `World` constructor macro building world-space and optional UI-space entity layers.
///
/// # Example
/// ```ignore
/// let w = world! {
///     objects: [player, enemy],
///     ui: [hp_bar, score_text],
/// };
///
/// let w_no_ui = world! {
///     objects: [player, enemy],
/// };
/// ```
#[macro_export]
macro_rules! world {
    (objects: [$($obj:expr),* $(,)?] $(,)? ui: [$($ui:expr),* $(,)?] $(,)?) => {
        $crate::world::World::new_with_ui(
            $crate::world_objects![$($obj),*],
            $crate::world_objects![$($ui),*],
        )
    };
    (ui: [$($ui:expr),* $(,)?] $(,)? objects: [$($obj:expr),* $(,)?] $(,)?) => {
        $crate::world::World::new_with_ui(
            $crate::world_objects![$($obj),*],
            $crate::world_objects![$($ui),*],
        )
    };
    (objects: [$($obj:expr),* $(,)?] $(,)?) => {
        $crate::world::World::new($crate::world_objects![$($obj),*])
    };
}