use macroquad::{
    color::{Color, WHITE},
    input::{MouseButton, is_mouse_button_down, is_mouse_button_pressed, mouse_position},
    math::{Rect, Vec2, vec2},
    shapes::draw_rectangle,
    texture::{DrawTextureParams, Texture2D, draw_texture_ex},
};

use crate::{engine::Context, world::Object};

// ---------------------------------------------------------------------------
// Side — Mouse button side enum
// ---------------------------------------------------------------------------

/// Enum representing mouse button sides (Left, Middle, Right).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Side {
    Left,
    Middle,
    Right,
}

impl Side {
    /// Converts [`Side`] into Macroquad's native [`MouseButton`].
    pub fn to_macroquad(self) -> MouseButton {
        match self {
            Side::Left => MouseButton::Left,
            Side::Middle => MouseButton::Middle,
            Side::Right => MouseButton::Right,
        }
    }
}

// ---------------------------------------------------------------------------
// Trait Clickable — Shared hover/click interaction logic
// ---------------------------------------------------------------------------

/// Trait providing shared mouse interaction (hover, click, hold) mechanics for entities.
///
/// Implement [`Clickable::click_rect`] and [`Clickable::is_active`] — default methods handle all input logic.
///
/// # Coordinate Spaces
///
/// Methods **without** the `_ctx` suffix ([`is_hovered`](Clickable::is_hovered), [`click`](Clickable::click), [`clicked`](Clickable::clicked))
/// operate in **screen space** (raw pixel mouse coordinates).
///
/// - For UI elements ([`Button`](crate::ui::Button), [`ProgressBar`](crate::ui::ProgressBar)) rendered on the UI layer, these are appropriate.
/// - For entities rendered in 2D world space ([`Sprite`]), **use the `_ctx` variants** ([`is_hovered_ctx`](Clickable::is_hovered_ctx), [`click_ctx`](Clickable::click_ctx), [`clicked_ctx`](Clickable::clicked_ctx)), which convert mouse coordinates via `ctx.camera.screen_to_world()`.
pub trait Clickable {
    /// Returns the bounding rectangle used for hit-testing mouse interactions.
    fn click_rect(&self) -> Rect;

    /// Returns whether this entity is currently active for click interactions.
    fn is_active(&self) -> bool;

    /// Returns `true` if the mouse cursor is over the entity (**screen space**).
    ///
    /// ⚠️ For world-space entities rendered with a 2D camera, use [`is_hovered_ctx`](Clickable::is_hovered_ctx).
    fn is_hovered(&self) -> bool {
        if !self.is_active() {
            return false;
        }
        let (mx, my) = mouse_position();
        self.click_rect().contains(vec2(mx, my))
    }

    /// Returns `true` if the mouse cursor is over the entity (**world space** using camera matrix transformation).
    fn is_hovered_ctx(&self, ctx: &Context) -> bool {
        if !self.is_active() {
            return false;
        }
        let m_world = ctx.camera.screen_to_world(ctx.input.mouse_position());
        self.click_rect().contains(m_world)
    }

    /// Returns `true` if the mouse cursor is over the UI entity (**UI canvas space**, accounting for virtual resolution mouse remapping).
    fn is_hovered_ui(&self, ctx: &Context) -> bool {
        if !self.is_active() {
            return false;
        }
        self.click_rect().contains(ctx.input.mouse_position())
    }

    /// Returns `true` during the single frame the specified mouse button was pressed over the entity (**screen space**).
    ///
    /// ⚠️ For world-space entities rendered with a 2D camera, use [`click_ctx`](Clickable::click_ctx).
    fn click(&self, btn: Side) -> bool {
        self.is_hovered() && is_mouse_button_pressed(btn.to_macroquad())
    }

    /// Returns `true` during the single frame the specified mouse button was pressed over the entity (**world space** using camera matrix transformation).
    fn click_ctx(&self, ctx: &Context, btn: Side) -> bool {
        self.is_hovered_ctx(ctx) && ctx.input.is_mouse_button_pressed(btn.to_macroquad())
    }

    /// Returns `true` while the specified mouse button is held down over the entity (**screen space**).
    ///
    /// ⚠️ For world-space entities rendered with a 2D camera, use [`clicked_ctx`](Clickable::clicked_ctx).
    fn clicked(&self, btn: Side) -> bool {
        self.is_hovered()
            && (is_mouse_button_down(btn.to_macroquad())
                || is_mouse_button_pressed(btn.to_macroquad()))
    }

    /// Returns `true` while the specified mouse button is held down over the entity (**world space** using camera matrix transformation).
    fn clicked_ctx(&self, ctx: &Context, btn: Side) -> bool {
        self.is_hovered_ctx(ctx)
            && (ctx.input.is_mouse_button_down(btn.to_macroquad())
                || ctx.input.is_mouse_button_pressed(btn.to_macroquad()))
    }

    /// Returns `true` during the single frame the left mouse button was pressed over the entity.
    fn is_clicked(&self) -> bool {
        self.click(Side::Left)
    }

    /// Returns `true` during the single frame the left mouse button was pressed over the entity (using context input).
    fn is_clicked_ctx(&self, ctx: &Context) -> bool {
        self.click_ctx(ctx, Side::Left)
    }
}

// ---------------------------------------------------------------------------
// Sprite
// ---------------------------------------------------------------------------

/// 2D Textured sprite component supporting position, size, rotation, color tinting, and tag filtering.
pub struct Sprite {
    pub position: Vec2,
    pub size: Vec2,
    pub rotation: f32,
    pub color: Color,
    pub texture: Texture2D,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Sprite {
    /// Creates a new [`Sprite`] with default white tint.
    pub fn new(position: Vec2, size: Vec2, rotation: f32, texture: Texture2D) -> Self {
        Self {
            position,
            size,
            rotation,
            color: WHITE,
            texture,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Creates a solid colored 2D rectangle sprite without requiring a texture file.
    pub fn solid(position: Vec2, size: Vec2, color: Color) -> Self {
        let texture = if cfg!(test) {
            Texture2D::from_miniquad_texture(macroquad::miniquad::TextureId::from_raw_id(
                macroquad::miniquad::RawId::OpenGl(0),
            ))
        } else {
            Texture2D::from_rgba8(1, 1, &[255, 255, 255, 255])
        };
        Self::new(position, size, 0.0, texture).with_color(color)
    }

    /// Builder pattern: Sets the color tint of the sprite.
    pub fn with_color(mut self, color: Color) -> Self {
        self.color = color;
        self
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Sets the sprite to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets the sprite to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets the sprite to deactivated (`active = false`) (alias for [`deactivated`](Sprite::deactivated)).
    #[deprecated(since = "0.1.0", note = "Use deactivated instead")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Builder pattern: Sets sprite visibility.
    pub fn with_visible(mut self, visible: bool) -> Self {
        self.visible = visible;
        self
    }

    /// Builder pattern: Sets sprite active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Returns `true` if the sprite is visible.
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Returns `true` if the sprite is active.
    pub fn is_active(&self) -> bool {
        self.active
    }

    /// Updates the sprite texture.
    pub fn set_texture(&mut self, texture: Texture2D) {
        self.texture = texture;
    }

    /// Updates the sprite texture directly from the asset manager by asset key.
    /// Returns `true` if the asset was found and updated successfully.
    pub fn set_texture_by_name(&mut self, ctx: &Context, name: &str) -> bool {
        if let Some(tex) = ctx.assets.get_texture(name) {
            self.texture = tex.clone();
            true
        } else {
            false
        }
    }

    /// Returns the bounding rectangle of the sprite.
    pub fn rect(&self) -> Rect {
        Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        }
    }

    /// Returns `true` if this sprite's bounding box overlaps with another sprite's bounding box.
    pub fn collides(&self, obj: &Sprite) -> bool {
        self.rect().overlaps(&obj.rect())
    }

    /// Returns the position vector.
    pub fn pos(&self) -> Vec2 {
        self.position
    }

    /// Sets the position vector.
    pub fn set_position(&mut self, pos: Vec2) {
        self.position = pos;
    }

    /// Moves the sprite using WASD keyboard input scaled by `speed` and delta time.
    pub fn move_wasd(&mut self, ctx: &Context, speed: f32) {
        self.position += ctx.input.wasd() * speed * ctx.time.deltatime();
    }

    /// Moves the sprite using arrow key input scaled by `speed` and delta time.
    pub fn move_arrow_keys(&mut self, ctx: &Context, speed: f32) {
        self.position += ctx.input.arrow_keys() * speed * ctx.time.deltatime();
    }

    /// Translates the sprite position by `velocity * dt`.
    pub fn move_by(&mut self, velocity: Vec2, dt: f32) {
        self.position += velocity * dt;
    }

    /// Returns the center position of the sprite (`position + size * 0.5`).
    pub fn center(&self) -> Vec2 {
        self.position + self.size * 0.5
    }

    /// Sets the center position of the sprite (`position = center - size * 0.5`).
    pub fn set_center(&mut self, center: Vec2) {
        self.position = center - self.size * 0.5;
    }

    /// Rotates the sprite to face toward `target_pos`.
    pub fn look_at(&mut self, target_pos: Vec2) {
        let diff = target_pos - self.center();
        self.rotation = diff.y.atan2(diff.x);
    }

    /// Returns a [`Circle`](crate::geometry::Circle) bounding approximation centered on the sprite.
    pub fn circle(&self) -> crate::geometry::Circle {
        crate::geometry::Circle::new(self.center(), self.size.x.min(self.size.y) * 0.5)
    }

    /// Fluent constructor: wraps this sprite in a [`Behavior`](crate::object::Behavior) with custom game `data`.
    pub fn with_data<Data>(self, data: Data) -> Behavior<Self, Data> {
        Behavior::new(self, data)
    }

    /// Sets the position vector.
    #[deprecated(since = "0.5.0", note = "Use `set_position()` instead")]
    pub fn setpos(&mut self, pos: Vec2) {
        self.position = pos;
    }
}

impl Clickable for Sprite {
    fn click_rect(&self) -> Rect {
        self.rect()
    }
    fn is_active(&self) -> bool {
        self.active
    }
}

impl Object for Sprite {
    fn update(&mut self, _ctx: &mut Context) {}

    fn draw(&self) {
        if !self.visible {
            return;
        }
        let pos = self.position + crate::ui::get_draw_offset();
        draw_texture_ex(
            &self.texture,
            pos.x,
            pos.y,
            self.color,
            DrawTextureParams {
                dest_size: Some(self.size),
                rotation: self.rotation,
                ..Default::default()
            },
        );
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn bounds(&self) -> Option<macroquad::math::Rect> {
        Some(self.rect())
    }
}

// ---------------------------------------------------------------------------
// Rectangle
// ---------------------------------------------------------------------------

/// 2D Colored rectangle entity.
pub struct Rectangle {
    pub position: Vec2,
    pub size: Vec2,
    pub rotation: f32,
    pub color: Color,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Rectangle {
    /// Creates a new [`Rectangle`].
    pub fn new(position: Vec2, size: Vec2, rotation: f32, color: Color) -> Self {
        Self {
            position,
            size,
            rotation,
            color,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Sets rectangle to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets rectangle to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets rectangle to deactivated (`active = false`) (alias for [`deactivated`](Rectangle::deactivated)).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead (typo fix)")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Builder pattern: Sets rectangle visibility.
    pub fn with_visible(mut self, visible: bool) -> Self {
        self.visible = visible;
        self
    }

    /// Builder pattern: Sets rectangle active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Returns `true` if the rectangle is visible.
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Returns `true` if the rectangle is active.
    pub fn is_active(&self) -> bool {
        self.active
    }

    /// Fluent constructor: wraps this rectangle in a [`Behavior`](crate::object::Behavior) with custom game `data`.
    pub fn with_data<Data>(self, data: Data) -> Behavior<Self, Data> {
        Behavior::new(self, data)
    }
}

impl Object for Rectangle {
    fn update(&mut self, _ctx: &mut Context) {}

    fn draw(&self) {
        if !self.visible {
            return;
        }
        let pos = self.position + crate::ui::get_draw_offset();
        draw_rectangle(pos.x, pos.y, self.size.x, self.size.y, self.color);
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn set_position(&mut self, pos: macroquad::math::Vec2) {
        self.position = pos;
    }

    fn set_size(&mut self, size: macroquad::math::Vec2) {
        self.size = size;
    }

    fn bounds(&self) -> Option<macroquad::math::Rect> {
        Some(macroquad::math::Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        })
    }
}

// ---------------------------------------------------------------------------
// Behavior<Inner, Data> — Generic component wrapper with custom update closure
// ---------------------------------------------------------------------------

/// Generic wrapper combining an inner graphic object (`Inner`), custom state data (`Data`),
/// and an optional per-frame update callback closure.
///
/// Works with any type `Inner` implementing [`Object`].
///
/// # Field Access via Deref
/// `Behavior<Sprite, Data>` implements `Deref<Target = Sprite>` and `DerefMut`,
/// enabling direct field access on `Sprite`:
///
/// ```ignore
/// obj.position.x += 1.0;
/// obj.color = RED;
/// obj.click_ctx(ctx, Side::Left);
/// ```
/// Type alias for per-frame update closure stored inside a [`Behavior`].
pub type BehaviorUpdateFn<Inner, Data> = Box<dyn FnMut(&mut Behavior<Inner, Data>, &mut Context)>;

pub struct Behavior<Inner, Data> {
    pub inner: Inner,
    pub data: Data,
    pub tag: String,
    pub destroyed: bool,
    func: Option<BehaviorUpdateFn<Inner, Data>>,
}

impl<Inner, Data> Behavior<Inner, Data> {
    /// Creates a new [`Behavior`] wrapping `inner` graphic entity and custom `data`.
    pub fn new(inner: Inner, data: Data) -> Self {
        Self {
            inner,
            data,
            tag: String::new(),
            destroyed: false,
            func: None,
        }
    }

    /// Marks this entity as destroyed for automatic cleanup at the end of the update pass.
    pub fn destroy(&mut self) {
        self.destroyed = true;
    }

    /// Returns whether this entity has been marked for destruction.
    pub fn is_destroyed(&self) -> bool {
        self.destroyed
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Registers a closure to be executed on each frame update pass.
    pub fn update<F>(mut self, func: F) -> Self
    where
        F: FnMut(&mut Behavior<Inner, Data>, &mut Context) + 'static,
    {
        self.func = Some(Box::new(func));
        self
    }

    /// Internal: Runs the update callback closure for this frame.
    pub fn run_update(&mut self, ctx: &mut Context) {
        if let Some(mut func) = self.func.take() {
            func(self, ctx);
            self.func = Some(func);
        }
    }

    /// Returns a reference to the inner entity object.
    pub fn inner(&self) -> &Inner {
        &self.inner
    }

    /// Returns a mutable reference to the inner entity object.
    pub fn inner_mut(&mut self) -> &mut Inner {
        &mut self.inner
    }

    /// Builder pattern: Sets the inner entity to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self
    where
        Inner: Object,
    {
        self.inner.set_visible(false);
        self
    }

    /// Builder pattern: Sets the inner entity to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self
    where
        Inner: Object,
    {
        self.inner.set_active(false);
        self
    }

    /// Builder pattern: Sets the inner entity to deactivated (`active = false`) (alias for [`deactivated`](Behavior::deactivated)).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead (typo fix)")]
    pub fn desactivated(self) -> Self
    where
        Inner: Object,
    {
        self.deactivated()
    }

    /// Builder pattern: Sets visibility of the inner entity.
    pub fn with_visible(mut self, visible: bool) -> Self
    where
        Inner: Object,
    {
        self.inner.set_visible(visible);
        self
    }

    /// Builder pattern: Sets active state of the inner entity.
    pub fn with_active(mut self, active: bool) -> Self
    where
        Inner: Object,
    {
        self.inner.set_active(active);
        self
    }

    /// Returns `true` if the inner entity is visible.
    pub fn is_visible(&self) -> bool
    where
        Inner: Object,
    {
        self.inner.is_visible()
    }

    /// Returns `true` if the inner entity is active.
    pub fn is_active(&self) -> bool
    where
        Inner: Object,
    {
        self.inner.is_active()
    }

    /// Returns `true` if the mouse cursor is over the inner entity in world space.
    ///
    /// Shorthand for `self.inner.is_hovered_ctx(ctx)`.
    pub fn is_hovered(&self, ctx: &Context) -> bool
    where
        Inner: Clickable,
    {
        self.inner.is_hovered_ctx(ctx)
    }

    /// Returns `true` during the frame the mouse button was pressed over the inner entity in world space.
    ///
    /// Shorthand for `self.inner.click_ctx(ctx, btn)`.
    pub fn click(&self, ctx: &Context, btn: Side) -> bool
    where
        Inner: Clickable,
    {
        self.inner.click_ctx(ctx, btn)
    }

    /// Returns `true` while the mouse button is held down over the inner entity in world space.
    ///
    /// Shorthand for `self.inner.clicked_ctx(ctx, btn)`.
    pub fn clicked(&self, ctx: &Context, btn: Side) -> bool
    where
        Inner: Clickable,
    {
        self.inner.clicked_ctx(ctx, btn)
    }
}

// ---------------------------------------------------------------------------
// GameObject<Data> = Behavior<Sprite, Data>
// ---------------------------------------------------------------------------

/// Type alias for a sprite object combined with game data and per-frame update closure.
pub type GameObject<Data> = Behavior<Sprite, Data>;

// ---------------------------------------------------------------------------
// Logic<Data> — Dedicated zero-cost logic controller entity
// ---------------------------------------------------------------------------

/// Type alias for per-frame update closure stored inside a [`Logic`].
pub type LogicUpdateFn<Data> = Box<dyn FnMut(&mut Logic<Data>, &mut Context)>;

/// Dedicated zero-cost logical entity wrapper combining custom state data (`Data`)
/// and an optional per-frame update callback closure.
///
/// Unlike [`Behavior<Sprite, Data>`], [`Logic`] has zero graphical overhead:
/// it is never rendered, has no dummy bounding box, and provides transparent
/// direct access to `Data` via [`std::ops::Deref`] and [`std::ops::DerefMut`].
pub struct Logic<Data> {
    pub data: Data,
    pub tag: String,
    pub active: bool,
    pub destroyed: bool,
    func: Option<LogicUpdateFn<Data>>,
}

impl<Data> Logic<Data> {
    /// Creates a new [`Logic`] controller wrapping custom `data`.
    pub fn new(data: Data) -> Self {
        Self {
            data,
            tag: String::new(),
            active: true,
            destroyed: false,
            func: None,
        }
    }

    /// Creates an invisible logic-only controller (alias for [`Logic::new`]).
    pub fn logic(data: Data) -> Self {
        Self::new(data)
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Sets the entity to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Marks this logic entity as destroyed for automatic cleanup at the end of the update pass.
    pub fn destroy(&mut self) {
        self.destroyed = true;
    }

    /// Returns whether this logic entity has been marked for destruction.
    pub fn is_destroyed(&self) -> bool {
        self.destroyed
    }

    /// Registers a closure to be executed on each frame update pass.
    pub fn update<F>(mut self, func: F) -> Self
    where
        F: FnMut(&mut Logic<Data>, &mut Context) + 'static,
    {
        self.func = Some(Box::new(func));
        self
    }

    /// Internal: Runs the update callback closure for this frame.
    pub fn run_update(&mut self, ctx: &mut Context) {
        if let Some(mut func) = self.func.take() {
            func(self, ctx);
            self.func = Some(func);
        }
    }
}

impl<Data> std::ops::Deref for Logic<Data> {
    type Target = Data;

    fn deref(&self) -> &Self::Target {
        &self.data
    }
}

impl<Data> std::ops::DerefMut for Logic<Data> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.data
    }
}

impl Logic<()> {
    /// Creates a stateless logic controller from a simple `FnMut(&mut Context)` closure.
    pub fn run<F>(mut func: F) -> Self
    where
        F: FnMut(&mut Context) + 'static,
    {
        Self::new(()).update(move |_obj, ctx| {
            func(ctx);
        })
    }
}

impl Logic<f32> {
    /// Creates a recurring timer logic controller that calls `func` every `interval_secs` seconds.
    pub fn interval<F>(interval_secs: f32, mut func: F) -> Self
    where
        F: FnMut(&mut Context) + 'static,
    {
        let interval = interval_secs.max(0.0001);
        Self::new(0.0).update(move |obj, ctx| {
            obj.data += ctx.dt();
            while obj.data >= interval {
                obj.data -= interval;
                func(ctx);
            }
        })
    }

    /// Creates a delayed one-shot logic action that executes `func` once after `delay_secs` seconds,
    /// and then automatically destroys itself.
    pub fn delayed<F>(delay_secs: f32, mut func: F) -> Self
    where
        F: FnMut(&mut Context) + 'static,
    {
        Self::new(delay_secs).update(move |obj, ctx| {
            obj.data -= ctx.dt();
            if obj.data <= 0.0 {
                func(ctx);
                obj.destroy();
            }
        })
    }
}

/// Helper struct for condition-driven logic execution.
pub struct UntilState<C, F> {
    pub cond: C,
    pub func: F,
}

impl<C, F> Logic<UntilState<C, F>>
where
    C: FnMut(&mut Context) -> bool + 'static,
    F: FnMut(&mut Context) + 'static,
{
    /// Creates a logic controller that executes `func` each frame as long as `condition` returns `true`.
    /// When `condition` returns `false`, it automatically calls `destroy()`.
    pub fn until(condition: C, func: F) -> Self {
        Self::new(UntilState {
            cond: condition,
            func,
        })
        .update(|obj, ctx| {
            if (obj.data.cond)(ctx) {
                (obj.data.func)(ctx);
            } else {
                obj.destroy();
            }
        })
    }
}

impl<Data: 'static> Object for Logic<Data> {
    fn update(&mut self, ctx: &mut Context) {
        if self.active && !self.destroyed {
            self.run_update(ctx);
        }
    }

    fn draw(&self) {}

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        false
    }

    fn set_visible(&mut self, _visible: bool) {}

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn is_destroyed(&self) -> bool {
        self.destroyed
    }

    fn destroy(&mut self) {
        self.destroyed = true;
    }

    fn bounds(&self) -> Option<macroquad::math::Rect> {
        None
    }

    fn as_any(&self) -> Option<&dyn std::any::Any> {
        Some(self)
    }

    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        Some(self)
    }
}

/// Type alias for backward compatibility: [`LogicObject<Data>`] is an alias for [`Logic<Data>`].
pub type LogicObject<Data> = Logic<Data>;

impl<Inner: Object + 'static, Data: 'static> Object for Behavior<Inner, Data> {
    fn update(&mut self, ctx: &mut Context) {
        self.inner.update(ctx);
        self.run_update(ctx);
    }

    fn draw(&self) {
        self.inner.draw();
    }

    fn tag(&self) -> &str {
        if !self.tag.is_empty() {
            &self.tag
        } else {
            self.inner.tag()
        }
    }

    fn set_text(&mut self, text: &str) {
        self.inner.set_text(text);
    }

    fn append_line(&mut self, text: &str) {
        self.inner.append_line(text);
    }

    fn set_position(&mut self, pos: macroquad::math::Vec2) {
        self.inner.set_position(pos);
    }

    fn is_visible(&self) -> bool {
        self.inner.is_visible()
    }

    fn set_visible(&mut self, visible: bool) {
        self.inner.set_visible(visible);
    }

    fn is_active(&self) -> bool {
        self.inner.is_active()
    }

    fn set_active(&mut self, active: bool) {
        self.inner.set_active(active);
    }

    fn is_destroyed(&self) -> bool {
        self.destroyed || self.inner.is_destroyed()
    }

    fn destroy(&mut self) {
        self.destroyed = true;
        self.inner.destroy();
    }

    fn is_text_layer(&self) -> bool {
        self.inner.is_text_layer()
    }

    fn get_text(&self) -> Option<String> {
        self.inner.get_text()
    }

    fn as_any(&self) -> Option<&dyn std::any::Any> {
        Some(self)
    }

    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        Some(self)
    }

    fn get_children(&self) -> Vec<&dyn Object> {
        self.inner.get_children()
    }

    fn get_children_mut<'a>(&'a mut self) -> Vec<&'a mut (dyn Object + 'static)> {
        self.inner.get_children_mut()
    }
}

// ---------------------------------------------------------------------------
// Blanket Deref / DerefMut for Behavior<Inner, Data>
// ---------------------------------------------------------------------------

/// Blanket implementation enabling transparent field access on any `Inner` type
/// wrapped by [`Behavior`]. Replaces the previous 7 concrete impls with a single
/// generic rule — every current and future `Inner` automatically gets
/// `obj.field` shorthand instead of `obj.inner.field`.
impl<Inner, Data> std::ops::Deref for Behavior<Inner, Data> {
    type Target = Inner;
    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl<Inner, Data> std::ops::DerefMut for Behavior<Inner, Data> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.inner
    }
}

impl crate::animated_texture::AnimatedSprite {
    /// Fluent constructor: wraps this animated sprite in a [`Behavior`](crate::object::Behavior) with custom game `data`.
    pub fn with_data<Data>(self, data: Data) -> Behavior<Self, Data> {
        Behavior::new(self, data)
    }
}
