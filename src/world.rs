use macroquad::math::Rect;

use crate::engine::Context;

/// Base trait implemented by all game world entities and UI components.
pub trait Object: 'static {
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

    /// Returns whether this entity is visible for rendering. Defaults to `true`.
    fn is_visible(&self) -> bool {
        true
    }

    /// Sets whether this entity is visible for rendering.
    fn set_visible(&mut self, _visible: bool) {}

    /// Returns whether this entity is active for logic updates and input interaction. Defaults to `true`.
    fn is_active(&self) -> bool {
        true
    }

    /// Sets whether this entity is active for logic updates and input interaction.
    fn set_active(&mut self, _active: bool) {}

    /// Returns the screen-space bounding rectangle for hit-testing, or `None` if the entity
    /// has no interactive bounds (e.g. text-only labels, decorative shapes).
    ///
    /// Used by [`UI::raise_clicked`](crate::ui::UI::raise_clicked) to find the topmost clicked element.
    fn bounds(&self) -> Option<Rect> {
        None
    }

    /// Returns the total content height of this entity, or `None` if unspecified.
    ///
    /// Used by [`Panel::fit_content_height`](crate::ui::Panel::fit_content_height) to calculate scroll boundaries.
    fn content_height(&self) -> Option<f32> {
        None
    }

    /// Downcasting helper returning an immutable `&dyn Any` reference, or `None` by default.
    fn as_any(&self) -> Option<&dyn std::any::Any> {
        None
    }

    /// Downcasting helper returning a mutable `&mut dyn Any` reference, or `None` by default.
    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        None
    }
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
        Self {
            objects,
            ui_objects,
        }
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

    /// Returns a mutable reference to the first UI-space object matching concrete type `T`, or `None`.
    pub fn find_ui_typed_mut<T: 'static>(&mut self) -> Option<&mut T> {
        for obj in self.ui_objects.iter_mut() {
            if let Some(concrete) = obj.as_any_mut().and_then(|any| any.downcast_mut::<T>()) {
                return Some(concrete);
            }
        }
        None
    }

    /// Returns a mutable reference to the first world-space object matching concrete type `T`, or `None`.
    pub fn find_typed_mut<T: 'static>(&mut self) -> Option<&mut T> {
        for obj in self.objects.iter_mut() {
            if let Some(concrete) = obj.as_any_mut().and_then(|any| any.downcast_mut::<T>()) {
                return Some(concrete);
            }
        }
        None
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
