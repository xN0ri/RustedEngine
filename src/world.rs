use macroquad::math::{Rect, Vec2, vec2};

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

    /// Appends a line of text to entities supporting append-based logging (e.g. [`TextLog`](crate::ui::TextLog)). No-op by default.
    fn append_line(&mut self, _text: &str) {}

    /// Sets the screen-space position of this entity. No-op by default.
    fn set_position(&mut self, _pos: macroquad::math::Vec2) {}

    /// Sets the screen-space size of this entity. No-op by default.
    fn set_size(&mut self, _size: macroquad::math::Vec2) {}

    /// Returns whether this entity expands to fill its parent container. Defaults to `false`.
    fn is_fill_parent(&self) -> bool {
        false
    }

    /// Sets whether this entity expands to fill its parent container.
    fn set_fill_parent(&mut self, _fill: bool) {}

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

    /// Returns whether this entity has been destroyed and should be reaped from the world at the end of the frame update pass. Defaults to `false`.
    fn is_destroyed(&self) -> bool {
        false
    }

    /// Marks this entity as destroyed for automatic cleanup at the end of the frame update pass.
    fn destroy(&mut self) {}

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

    /// Returns `true` if this object should bypass the virtual-resolution render target
    /// and be drawn directly at native screen resolution (used by text elements to avoid
    /// blurry upscaled font rasterization). Default: `false`.
    fn is_text_layer(&self) -> bool {
        false
    }

    /// Renders non-text visual components (backgrounds, borders, textures).
    /// Default implementation calls [`draw`](Object::draw) if [`is_text_layer`](Object::is_text_layer) is false.
    fn draw_non_text(&self) {
        if !self.is_text_layer() {
            self.draw();
        }
    }

    /// Renders text visual components at native screen resolution.
    /// Default implementation calls [`draw`](Object::draw) if [`is_text_layer`](Object::is_text_layer) is true.
    fn draw_text_only(&self) {
        if self.is_text_layer() {
            self.draw();
        }
    }

    /// Returns current text content string of this object if applicable, or `None` by default.
    fn get_text(&self) -> Option<String> {
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

    /// Returns references to nested child objects for recursive UI layout queries.
    fn get_children(&self) -> Vec<&dyn Object> {
        Vec::new()
    }

    /// Returns mutable references to nested child objects for recursive UI layout queries.
    fn get_children_mut<'a>(&'a mut self) -> Vec<&'a mut (dyn Object + 'static)> {
        Vec::new()
    }

    /// Returns a reference to the first child object matching `tag` (searches recursively).
    fn find_child(&self, tag: &str) -> Option<&dyn Object> {
        for child in self.get_children() {
            if child.has_tag(tag) {
                return Some(child);
            }
            if let Some(found) = child.find_child(tag) {
                return Some(found);
            }
        }
        None
    }

    /// Returns a mutable reference to the first child object matching `tag` (searches recursively).
    fn find_child_mut<'a>(&'a mut self, tag: &str) -> Option<&'a mut (dyn Object + 'static)> {
        for child in self.get_children_mut() {
            if child.has_tag(tag) {
                return Some(child);
            }
            if let Some(found) = child.find_child_mut(tag) {
                return Some(found);
            }
        }
        None
    }

    /// Finds and downcasts the first child object matching `tag` to immutable reference type `T`.
    fn get_child<T: Object + 'static>(&self, tag: &str) -> Option<&T>
    where
        Self: Sized,
    {
        self.find_child(tag)?.as_any()?.downcast_ref::<T>()
    }

    /// Finds and downcasts the first child object matching `tag` to mutable reference type `T`.
    fn get_child_mut<'a, T: Object + 'static>(&'a mut self, tag: &str) -> Option<&'a mut T>
    where
        Self: Sized,
    {
        self.find_child_mut(tag)?.as_any_mut()?.downcast_mut::<T>()
    }

    /// Finds and downcasts the first child object matching concrete type `T`.
    fn find_child_typed<T: Object + 'static>(&self) -> Option<&T>
    where
        Self: Sized,
    {
        find_child_typed_rec::<T>(self)
    }

    /// Finds and downcasts the first child object matching concrete type `T` (mutable).
    fn find_child_typed_mut<'a, T: Object + 'static>(&'a mut self) -> Option<&'a mut T>
    where
        Self: Sized,
    {
        find_child_typed_rec_mut::<T>(self)
    }

    /// Sets text content on a child entity matching `tag`. Returns `true` if found.
    fn set_child_text(&mut self, tag: &str, text: &str) -> bool {
        if let Some(child) = self.find_child_mut(tag) {
            child.set_text(text);
            true
        } else {
            false
        }
    }
}

/// Game world container holding separate entity rendering and logic layers:
///
/// - `objects` — Rendered in world space inside camera view bounds.
/// - `ui_objects` — Rendered in screen space outside camera view bounds.
/// - `logic` — Updated every frame but never rendered (invisible system controllers).
#[derive(Default)]
pub struct World {
    objects: Vec<Box<dyn Object>>,
    ui_objects: Vec<Box<dyn Object>>,
    logic: Vec<Box<dyn Object>>,
    sequences: Vec<crate::sequence::Sequence>,
}

fn collect_by_tag<'a>(obj: &'a (dyn Object + 'static), tag: &str, results: &mut Vec<&'a (dyn Object + 'static)>) {
    if obj.has_tag(tag) {
        results.push(obj);
    }
    for child in obj.get_children() {
        collect_by_tag(child, tag, results);
    }
}

fn collect_by_tag_mut<'a>(obj: &'a mut (dyn Object + 'static), tag: &str, results: &mut Vec<&'a mut (dyn Object + 'static)>) {
    if obj.has_tag(tag) {
        // Parent matches tag: return mutable reference to parent.
        // We MUST NOT recurse into children here because returning simultaneous
        // `&mut Parent` and `&mut Child` would create aliased mutable references (UB).
        results.push(obj);
    } else {
        // Parent does not match tag: recurse into children to find matching descendants.
        for child in obj.get_children_mut() {
            collect_by_tag_mut(child, tag, results);
        }
    }
}

fn find_child_typed_rec<'a, T: Object + 'static>(obj: &'a (dyn Object + 'static)) -> Option<&'a T> {
    for child in obj.get_children() {
        if let Some(val) = child.as_any().and_then(|a| a.downcast_ref::<T>()) {
            return Some(val);
        }
        if let Some(found) = find_child_typed_rec::<T>(child) {
            return Some(found);
        }
    }
    None
}

fn find_child_typed_rec_mut<'a, T: Object + 'static>(obj: &'a mut (dyn Object + 'static)) -> Option<&'a mut T> {
    for child in obj.get_children_mut() {
        let is_t = child.as_any_mut().map_or(false, |a| a.is::<T>());
        if is_t {
            return child.as_any_mut()?.downcast_mut::<T>();
        }
        if let Some(found) = find_child_typed_rec_mut::<T>(child) {
            return Some(found);
        }
    }
    None
}

impl World {
    /// Creates a new empty [`World`].
    pub fn new() -> Self {
        Self {
            objects: Vec::new(),
            ui_objects: Vec::new(),
            logic: Vec::new(),
            sequences: Vec::new(),
        }
    }

    /// Creates a new [`World`] with world-space entities.
    pub fn new_with_objects(objects: Vec<Box<dyn Object>>) -> Self {
        Self {
            objects,
            ui_objects: Vec::new(),
            logic: Vec::new(),
            sequences: Vec::new(),
        }
    }

    /// Creates a new [`World`] with both world-space entities and screen-space UI components.
    pub fn new_with_ui(objects: Vec<Box<dyn Object>>, ui_objects: Vec<Box<dyn Object>>) -> Self {
        Self {
            objects,
            ui_objects,
            logic: Vec::new(),
            sequences: Vec::new(),
        }
    }

    /// Adds a new object implementing [`Object`] to the world-space layer at runtime.
    pub fn add<O: Object + 'static>(&mut self, object: O) {
        self.objects.push(Box::new(object));
    }

    /// Adds a pre-boxed object to the world-space layer (low-level escape hatch).
    pub fn add_boxed(&mut self, object: Box<dyn Object>) {
        self.objects.push(object);
    }

    /// Adds a new object implementing [`Object`] to the screen-space UI layer at runtime.
    pub fn add_ui<O: Object + 'static>(&mut self, object: O) {
        self.ui_objects.push(Box::new(object));
    }

    /// Adds a pre-boxed object to the screen-space UI layer (low-level escape hatch).
    pub fn add_ui_boxed(&mut self, object: Box<dyn Object>) {
        self.ui_objects.push(object);
    }

    /// Adds a new object to the logic-only layer at runtime. Logic objects are
    /// updated every frame but never rendered — use for invisible system
    /// controllers (scene switching, global timers, cross-cutting checks) via
    /// [`Logic`](crate::object::Logic) / [`LogicObject`](crate::object::LogicObject).
    pub fn add_logic<O: Object + 'static>(&mut self, object: O) {
        self.logic.push(Box::new(object));
    }

    /// Adds a stateless logic closure directly to the logic-only layer.
    pub fn add_logic_fn<F>(&mut self, func: F)
    where
        F: FnMut(&mut Context) + 'static,
    {
        self.add_logic(crate::object::Logic::run(func));
    }

    /// Adds a pre-boxed object to the logic-only layer (low-level escape hatch).
    pub fn add_logic_boxed(&mut self, object: Box<dyn Object>) {
        self.logic.push(object);
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

    /// Returns a slice of logic-layer objects.
    pub fn logic_objects(&self) -> &[Box<dyn Object>] {
        &self.logic
    }

    /// Returns a mutable slice of logic-layer objects.
    pub fn logic_objects_mut(&mut self) -> &mut [Box<dyn Object>] {
        &mut self.logic
    }

    /// Queries world-space objects by tag (read-only).
    pub fn find_by_tag(&self, tag: &str) -> Vec<&dyn Object> {
        let mut results = Vec::new();
        for o in &self.objects {
            collect_by_tag(o.as_ref(), tag, &mut results);
        }
        results
    }

    /// Queries world-space objects by tag (mutable).
    pub fn find_by_tag_mut<'a>(&'a mut self, tag: &str) -> Vec<&'a mut (dyn Object + 'static)> {
        let mut results = Vec::new();
        for o in &mut self.objects {
            collect_by_tag_mut(o.as_mut(), tag, &mut results);
        }
        results
    }

    /// Queries screen-space UI objects by tag (read-only), including nested layout children.
    pub fn find_ui_by_tag(&self, tag: &str) -> Vec<&dyn Object> {
        let mut results = Vec::new();
        for o in &self.ui_objects {
            collect_by_tag(o.as_ref(), tag, &mut results);
        }
        results
    }

    /// Queries screen-space UI objects by tag (mutable), including nested layout children.
    pub fn find_ui_by_tag_mut<'a>(&'a mut self, tag: &str) -> Vec<&'a mut (dyn Object + 'static)> {
        let mut results = Vec::new();
        for o in &mut self.ui_objects {
            collect_by_tag_mut(o.as_mut(), tag, &mut results);
        }
        results
    }

    /// Returns current text content string of any UI component matching `tag`.
    pub fn get_ui_text(&self, tag: &str) -> Option<String> {
        self.find_ui_by_tag(tag).into_iter().find_map(|o| o.get_text())
    }

    /// Sets text content on all UI components matching `tag`.
    pub fn set_ui_text(&mut self, tag: &str, text: impl Into<String>) {
        let t = text.into();
        for o in self.find_ui_by_tag_mut(tag) {
            o.set_text(&t);
        }
    }

    /// Finds and downcasts the first UI object matching `tag` to immutable reference type `T`.
    pub fn get_ui<T: Object + 'static>(&self, tag: &str) -> Option<&T> {
        self.find_ui_by_tag(tag)
            .into_iter()
            .find_map(|o| o.as_any()?.downcast_ref::<T>())
    }

    /// Finds and downcasts the first UI object matching `tag` to mutable reference type `T`.
    pub fn get_ui_mut<'a, T: Object + 'static>(&'a mut self, tag: &str) -> Option<&'a mut T> {
        self.find_ui_by_tag_mut(tag)
            .into_iter()
            .find_map(|o| o.as_any_mut()?.downcast_mut::<T>())
    }

    /// Queries logic-layer objects by tag (read-only).
    pub fn find_logic_by_tag(&self, tag: &str) -> Vec<&dyn Object> {
        self.logic
            .iter()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_ref())
            .collect()
    }

    /// Queries logic-layer objects by tag (mutable).
    pub fn find_logic_by_tag_mut<'a>(
        &'a mut self,
        tag: &str,
    ) -> Vec<&'a mut (dyn Object + 'static)> {
        self.logic
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

    /// Returns an immutable reference to the first UI-space object matching concrete type `T`, or `None`.
    pub fn find_ui_typed<T: 'static>(&self) -> Option<&T> {
        for obj in self.ui_objects.iter() {
            if let Some(concrete) = obj.as_any().and_then(|any| any.downcast_ref::<T>()) {
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

    /// Returns an immutable reference to the first world-space object matching concrete type `T`, or `None`.
    pub fn find_typed<T: 'static>(&self) -> Option<&T> {
        for obj in self.objects.iter() {
            if let Some(concrete) = obj.as_any().and_then(|any| any.downcast_ref::<T>()) {
                return Some(concrete);
            }
        }
        None
    }

    /// Returns a mutable reference to the first logic-layer object matching concrete type `T`, or `None`.
    pub fn find_logic_typed_mut<T: 'static>(&mut self) -> Option<&mut T> {
        for obj in self.logic.iter_mut() {
            if let Some(concrete) = obj.as_any_mut().and_then(|any| any.downcast_mut::<T>()) {
                return Some(concrete);
            }
        }
        None
    }

    /// Returns an immutable reference to the first logic-layer object matching concrete type `T`, or `None`.
    pub fn find_logic_typed<T: 'static>(&self) -> Option<&T> {
        for obj in self.logic.iter() {
            if let Some(concrete) = obj.as_any().and_then(|any| any.downcast_ref::<T>()) {
                return Some(concrete);
            }
        }
        None
    }

    /// Returns a mutable reference to the **first** world-space object matching `tag` without
    /// allocating a `Vec`. Prefer this over [`find_by_tag_mut`](World::find_by_tag_mut) in
    /// hot update paths where only a single result is needed.
    pub fn find_first_by_tag_mut(&mut self, tag: &str) -> Option<&mut dyn Object> {
        for o in self.objects.iter_mut() {
            if o.has_tag(tag) {
                return Some(o.as_mut());
            }
            // check children
            fn find_in_children<'a>(obj: &'a mut (dyn Object + 'static), tag: &str) -> Option<&'a mut (dyn Object + 'static)> {
                for child in obj.get_children_mut() {
                    if child.has_tag(tag) {
                        return Some(child);
                    }
                    if let Some(found) = find_in_children(child, tag) {
                        return Some(found);
                    }
                }
                None
            }
            if let Some(found) = find_in_children(o.as_mut(), tag) {
                return Some(found);
            }
        }
        None
    }

    /// Returns a mutable reference to the **first** UI-space object matching `tag` without
    /// allocating a `Vec`. Prefer this over [`find_ui_by_tag_mut`](World::find_ui_by_tag_mut) in
    /// hot update paths where only a single result is needed.
    pub fn find_first_ui_by_tag_mut(&mut self, tag: &str) -> Option<&mut dyn Object> {
        for o in self.ui_objects.iter_mut() {
            if o.has_tag(tag) {
                return Some(o.as_mut());
            }
            fn find_in_children<'a>(obj: &'a mut (dyn Object + 'static), tag: &str) -> Option<&'a mut (dyn Object + 'static)> {
                for child in obj.get_children_mut() {
                    if child.has_tag(tag) {
                        return Some(child);
                    }
                    if let Some(found) = find_in_children(child, tag) {
                        return Some(found);
                    }
                }
                None
            }
            if let Some(found) = (find_in_children)(o.as_mut(), tag) {
                return Some(found);
            }
        }
        None
    }

    /// Returns an immutable reference to the **first** world-space object matching `tag`.
    pub fn find_first_by_tag(&self, tag: &str) -> Option<&dyn Object> {
        fn find_rec<'a>(obj: &'a (dyn Object + 'static), tag: &str) -> Option<&'a (dyn Object + 'static)> {
            if obj.has_tag(tag) {
                return Some(obj);
            }
            for child in obj.get_children() {
                if let Some(found) = find_rec(child, tag) {
                    return Some(found);
                }
            }
            None
        }
        for o in &self.objects {
            if let Some(found) = find_rec(o.as_ref(), tag) {
                return Some(found);
            }
        }
        None
    }

    /// Returns an immutable reference to the **first** UI-space object matching `tag`.
    pub fn find_first_ui_by_tag(&self, tag: &str) -> Option<&dyn Object> {
        fn find_rec<'a>(obj: &'a (dyn Object + 'static), tag: &str) -> Option<&'a (dyn Object + 'static)> {
            if obj.has_tag(tag) {
                return Some(obj);
            }
            for child in obj.get_children() {
                if let Some(found) = find_rec(child, tag) {
                    return Some(found);
                }
            }
            None
        }
        for o in &self.ui_objects {
            if let Some(found) = find_rec(o.as_ref(), tag) {
                return Some(found);
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

    /// Counts logic-layer objects matching `tag`.
    pub fn count_logic_by_tag(&self, tag: &str) -> usize {
        self.logic.iter().filter(|o| o.has_tag(tag)).count()
    }

    /// Removes all top-level world-space objects matching `tag`.
    pub fn remove_by_tag(&mut self, tag: &str) {
        self.objects.retain(|o| !o.has_tag(tag));
    }

    /// Removes all top-level screen-space UI objects matching `tag`.
    pub fn remove_ui_by_tag(&mut self, tag: &str) {
        self.ui_objects.retain(|o| !o.has_tag(tag));
    }

    /// Removes all top-level logic objects matching `tag`.
    pub fn remove_logic_by_tag(&mut self, tag: &str) {
        self.logic.retain(|o| !o.has_tag(tag));
    }

    /// Retains only world-space objects that satisfy the predicate `f`.
    pub fn retain_objects<F: FnMut(&dyn Object) -> bool>(&mut self, mut f: F) {
        self.objects.retain(|o| f(o.as_ref()));
    }

    /// Retains only screen-space UI objects that satisfy the predicate `f`.
    pub fn retain_ui<F: FnMut(&dyn Object) -> bool>(&mut self, mut f: F) {
        self.ui_objects.retain(|o| f(o.as_ref()));
    }

    /// Retains only logic objects that satisfy the predicate `f`.
    pub fn retain_logic<F: FnMut(&dyn Object) -> bool>(&mut self, mut f: F) {
        self.logic.retain(|o| f(o.as_ref()));
    }

    /// Clears all world-space objects.
    pub fn clear_objects(&mut self) {
        self.objects.clear();
    }

    /// Clears all screen-space UI objects.
    pub fn clear_ui(&mut self) {
        self.ui_objects.clear();
    }

    /// Clears all logic objects.
    pub fn clear_logic(&mut self) {
        self.logic.clear();
    }

    /// Clears all objects across world, UI, logic layers, and scripted sequences.
    pub fn clear_all(&mut self) {
        self.objects.clear();
        self.ui_objects.clear();
        self.logic.clear();
        self.sequences.clear();
    }

    /// Adds a scripted [`Sequence`](crate::sequence::Sequence) to be updated automatically on frame logic passes.
    pub fn add_sequence(&mut self, sequence: crate::sequence::Sequence) {
        self.sequences.push(sequence);
    }

    /// Finds the nearest object matching `tag` to `pos` based on bounding box centers.
    pub fn find_nearest(&self, pos: Vec2, tag: &str) -> Option<&dyn Object> {
        self.find_by_tag(tag)
            .into_iter()
            .filter_map(|obj| {
                let center = obj.bounds().map(|b| vec2(b.x + b.w * 0.5, b.y + b.h * 0.5))?;
                Some((obj, center.distance_squared(pos)))
            })
            .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(obj, _)| obj)
    }

    /// Finds the nearest mutable object matching `tag` to `pos` based on bounding box centers.
    pub fn find_nearest_mut<'a>(
        &'a mut self,
        pos: Vec2,
        tag: &str,
    ) -> Option<&'a mut (dyn Object + 'static)> {
        let matching = self.find_by_tag_mut(tag);
        matching
            .into_iter()
            .filter_map(|obj| {
                let center = obj.bounds().map(|b| vec2(b.x + b.w * 0.5, b.y + b.h * 0.5))?;
                Some((obj, center.distance_squared(pos)))
            })
            .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(obj, _)| obj)
    }

    /// Finds all world-space objects whose bounding box is within `radius` of `center`.
    pub fn find_within_radius(&self, center: Vec2, radius: f32) -> Vec<&dyn Object> {
        let r_sq = radius * radius;
        self.objects
            .iter()
            .filter_map(|obj| {
                let obj_center = obj.bounds().map(|b| vec2(b.x + b.w * 0.5, b.y + b.h * 0.5))?;
                if obj_center.distance_squared(center) <= r_sq {
                    Some(obj.as_ref())
                } else {
                    None
                }
            })
            .collect()
    }

    /// Updates all world, UI objects, logic objects, and scripted sequences.
    /// Also automatically drains deferred spawn queues from `ctx`, reaps destroyed entities,
    /// and drives [`TriggerSystem`](crate::trigger::TriggerSystem) each frame.
    pub fn update(&mut self, ctx: &mut Context) {
        // Auto-drive trigger system — runs before entity updates so actions
        // take effect in the same frame the condition becomes true.
        let mut triggers = std::mem::take(&mut ctx.triggers);
        crate::trigger::TriggerSystem::update_with_context(triggers.triggers_mut(), ctx);
        ctx.triggers = triggers;

        let old_ptr = ctx.world_ptr;
        ctx.world_ptr = Some(self as *mut World);

        for obj in self.objects.iter_mut() {
            obj.update(ctx);
        }
        for obj in self.ui_objects.iter_mut() {
            obj.update(ctx);
        }
        for obj in self.logic.iter_mut() {
            obj.update(ctx);
        }
        if !self.sequences.is_empty() {
            let mut seqs = std::mem::take(&mut self.sequences);
            for seq in &mut seqs {
                seq.update(ctx, self);
            }
            seqs.retain(|seq| !seq.is_finished());
            self.sequences.extend(seqs);
        }

        // Drain deferred spawn queues populated during entity updates
        let pending_obj = std::mem::take(&mut ctx.pending_spawn);
        for obj in pending_obj {
            self.objects.push(obj);
        }
        let pending_ui = std::mem::take(&mut ctx.pending_spawn_ui);
        for obj in pending_ui {
            self.ui_objects.push(obj);
        }
        let pending_lg = std::mem::take(&mut ctx.pending_spawn_logic);
        for obj in pending_lg {
            self.logic.push(obj);
        }

        // Automatically reap destroyed objects across all layers
        self.objects.retain(|o| !o.is_destroyed());
        self.ui_objects.retain(|o| !o.is_destroyed());
        self.logic.retain(|o| !o.is_destroyed());

        ctx.world_ptr = old_ptr;
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

    /// Renders non-text screen-space UI objects (`is_text_layer() == false`).
    /// Used when virtual resolution pipeline is active to render non-text UI into VRT.
    pub fn draw_ui_non_text(&self) {
        for obj in self.ui_objects.iter() {
            obj.draw_non_text();
        }
    }

    /// Renders text screen-space UI objects (`is_text_layer() == true`).
    /// Used when virtual resolution pipeline is active to render text directly at native screen resolution.
    pub fn draw_ui_text_only(&self) {
        for obj in self.ui_objects.iter() {
            obj.draw_text_only();
        }
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

/// Declarative `World` constructor macro building world-space, UI-space, and optional logic-space entity layers.
///
/// # Example
/// ```ignore
/// let w = world! {
///     objects: [player, enemy],
///     ui: [hp_bar, score_text],
///     logic: [scene_switcher],
/// };
/// ```
#[macro_export]
macro_rules! world {
    (objects: [$($obj:expr),* $(,)?] $(,)? ui: [$($ui:expr),* $(,)?] $(,)? logic: [$($lg:expr),* $(,)?] $(,)?) => {{
        let mut w = $crate::world::World::new_with_ui(
            $crate::world_objects![$($obj),*],
            $crate::world_objects![$($ui),*],
        );
        $(w.add_logic($lg);)*
        w
    }};
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
        $crate::world::World::new_with_objects($crate::world_objects![$($obj),*])
    };
    // Logic-only world (no renderable objects, no UI)
    (logic: [$($lg:expr),* $(,)?] $(,)?) => {{
        let mut w = $crate::world::World::new();
        $(w.add_logic($lg);)*
        w
    }};
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ui::*;
    use macroquad::prelude::*;

    #[test]
    fn test_easy_ui_queries() {
        let mut world = World::new();

        let login_ui = crate::column![
            Text::new("Welcome!", Vec2::ZERO, 16.0, WHITE).with_tag("welcome_label"),
            Container::new().with_child(
                TextField::new(Vec2::ZERO, Vec2::ZERO, "Username").with_tag("user_input").with_text("szymon")
            )
        ];

        world.add_ui(login_ui);

        assert_eq!(world.get_ui_text("user_input"), Some("szymon".to_string()));
        assert_eq!(world.get_ui_text("welcome_label"), Some("Welcome!".to_string()));

        if let Some(tf) = world.get_ui_mut::<TextField>("user_input") {
            tf.text = "admin".to_string();
        }
        assert_eq!(world.get_ui_text("user_input"), Some("admin".to_string()));

        world.set_ui_text("welcome_label", "Hello!");
        assert_eq!(world.get_ui_text("welcome_label"), Some("Hello!".to_string()));
    }
}
