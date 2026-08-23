use macroquad::{
    camera::{Camera2D, set_camera, set_default_camera},
    math::{Rect, Vec2, vec2},
    rand::gen_range,
    window::{screen_height, screen_width},
};

/// 2D Camera controller supporting screen shake, lerp target tracking, and cached matrices.
///
/// The underlying [`Camera2D`] matrix is cached once per frame in [`Camera::update`]
/// to guarantee that rendering coordinates and input math ([`Camera::screen_to_world`])
/// remain completely consistent across all entity updates.
pub struct Camera {
    /// World space position the camera is focused on.
    pub target: Vec2,
    /// Zoom level multiplier (1.0 = normal).
    pub zoom: f32,
    /// Camera rotation angle in radians.
    pub rotation: f32,
    /// Optional world bounds constraint for camera target positioning.
    pub bounds: Option<Rect>,
    shake_intensity: f32,
    shake_duration: f32,
    shake_timer: f32,
    /// Cached camera matrix computed during update for frame consistency.
    cached: Camera2D,
    /// Optional virtual resolution override for zoom calculation.
    /// When `Some(vw, vh)`, camera zoom is based on virtual dimensions instead of real screen.
    /// Set automatically by [`Engine`](crate::engine::Engine) when `with_virtual_resolution` is active.
    pub(crate) virtual_size: Option<Vec2>,
}

impl Camera {
    /// Creates a new 2D [`Camera`] initialized at `(0, 0)` with zoom `1.0`.
    pub fn new() -> Self {
        let cached = Self::build_camera2d(vec2(0.0, 0.0), 1.0, 0.0, vec2(0.0, 0.0));
        Self {
            target: vec2(0.0, 0.0),
            zoom: 1.0,
            rotation: 0.0,
            bounds: None,
            shake_intensity: 0.0,
            shake_duration: 0.0,
            shake_timer: 0.0,
            cached,
            virtual_size: None,
        }
    }

    /// Builder pattern: Sets world bounds clamping for camera target.
    pub fn with_bounds(mut self, bounds: Rect) -> Self {
        self.bounds = Some(bounds);
        self
    }

    /// Sets or clears world bounds constraint.
    pub fn set_bounds(&mut self, bounds: Option<Rect>) {
        self.bounds = bounds;
    }

    /// Builds a Macroquad [`Camera2D`] instance from target, zoom, rotation, and shake offset.
    pub fn build_camera2d(target: Vec2, zoom: f32, rotation: f32, shake_offset: Vec2) -> Camera2D {
        let (sw, sh) = if cfg!(test) {
            (800.0, 600.0)
        } else {
            (screen_width(), screen_height())
        };
        let zoom_vec = vec2((2.0 / sw) * zoom, (2.0 / sh) * zoom);
        Camera2D {
            target: target + shake_offset,
            zoom: zoom_vec,
            rotation,
            offset: vec2(0.0, 0.0),
            render_target: None,
            viewport: None,
        }
    }

    /// Returns a native Macroquad [`Camera2D`] instance based on current cached camera properties.
    pub fn to_macroquad(&self) -> Camera2D {
        Camera2D {
            target: self.cached.target,
            zoom: self.cached.zoom,
            rotation: self.cached.rotation,
            offset: self.cached.offset,
            render_target: self.cached.render_target.clone(),
            viewport: self.cached.viewport,
        }
    }

    /// Smoothly interpolates (lerps) the camera target toward `target_pos`.
    pub fn follow(&mut self, target_pos: Vec2, lerp_speed: f32, dt: f32) {
        let factor = (lerp_speed * dt).clamp(0.0, 1.0);
        self.target = self.target.lerp(target_pos, factor);
    }

    /// Smoothly leads the camera ahead of `target_pos` in `direction` by `distance` units.
    pub fn look_ahead(&mut self, target_pos: Vec2, direction: Vec2, distance: f32, lerp_speed: f32, dt: f32) {
        let diff = if direction.length_squared() > 0.0 {
            direction.normalize() * distance
        } else {
            Vec2::ZERO
        };
        self.follow(target_pos + diff, lerp_speed, dt);
    }

    /// Returns the world-space bounding rectangle ([`Rect`]) currently visible on screen.
    pub fn visible_world_rect(&self) -> Rect {
        let (sw, sh) = if cfg!(test) {
            (800.0, 600.0)
        } else {
            (screen_width(), screen_height())
        };
        let top_left = self.screen_to_world(vec2(0.0, 0.0));
        let bottom_right = self.screen_to_world(vec2(sw, sh));
        let min_x = top_left.x.min(bottom_right.x);
        let min_y = top_left.y.min(bottom_right.y);
        let max_x = top_left.x.max(bottom_right.x);
        let max_y = top_left.y.max(bottom_right.y);
        Rect::new(min_x, min_y, max_x - min_x, max_y - min_y)
    }

    /// Returns `true` if the world-space point `pos` is visible on screen with an optional padding `margin`.
    pub fn is_on_screen(&self, pos: Vec2, margin: f32) -> bool {
        let r = self.visible_world_rect();
        pos.x >= r.x - margin
            && pos.x <= r.x + r.w + margin
            && pos.y >= r.y - margin
            && pos.y <= r.y + r.h + margin
    }

    /// Returns `true` if the world-space bounding box `rect` overlaps with the visible screen area.
    pub fn is_rect_on_screen(&self, rect: Rect, margin: f32) -> bool {
        let r = self.visible_world_rect();
        let expanded = Rect::new(r.x - margin, r.y - margin, r.w + margin * 2.0, r.h + margin * 2.0);
        expanded.overlaps(&rect)
    }

    /// Triggers a screen shake effect with the specified intensity and duration in seconds.
    pub fn shake(&mut self, intensity: f32, duration: f32) {
        self.shake_intensity = intensity;
        self.shake_duration = duration;
        self.shake_timer = duration;
    }

    /// Updates camera timers, processes shake offsets, and caches the [`Camera2D`] matrix.
    /// Must be called once per frame prior to calling [`Camera::begin`] or coordinate transforms.
    pub fn update(&mut self, dt: f32) {
        if let Some(b) = self.bounds {
            self.target.x = self.target.x.clamp(b.x, b.x + b.w);
            self.target.y = self.target.y.clamp(b.y, b.y + b.h);
        }

        if self.shake_timer > 0.0 {
            self.shake_timer -= dt;
            if self.shake_timer <= 0.0 {
                self.shake_timer = 0.0;
            }
        }

        let shake_offset = if self.shake_timer > 0.0 && self.shake_duration > 0.0 {
            let factor = self.shake_timer / self.shake_duration;
            let intensity = self.shake_intensity * factor;
            vec2(
                gen_range(-intensity, intensity),
                gen_range(-intensity, intensity),
            )
        } else {
            vec2(0.0, 0.0)
        };

        self.cached = Self::build_camera2d(self.target, self.zoom, self.rotation, shake_offset);

        // When virtual resolution is active, override zoom to be based on virtual dimensions.
        // This ensures 1 world unit = 1 virtual pixel regardless of real screen resolution.
        if let Some(vs) = self.virtual_size {
            self.cached.zoom = vec2((2.0 / vs.x) * self.zoom, (2.0 / vs.y) * self.zoom);
        }
    }

    /// Activates world-space camera rendering mode (for world entities).
    pub fn begin(&self) {
        set_camera(&self.cached);
    }

    /// Activates world-space camera rendering mode redirecting output to a target [`RenderTarget`](macroquad::texture::RenderTarget).
    /// Preserves all current camera properties (target, zoom, rotation, shake).
    pub fn begin_to_target(&self, target: &macroquad::texture::RenderTarget) {
        let cam = Camera2D {
            target: self.cached.target,
            zoom: self.cached.zoom,
            rotation: self.cached.rotation,
            offset: self.cached.offset,
            render_target: Some(target.clone()),
            viewport: self.cached.viewport,
        };
        set_camera(&cam);
    }

    /// Deactivates world camera mode, returning to default screen-space rendering (for UI).
    pub fn end(&self) {
        set_default_camera();
    }

    /// Converts screen-space pixel coordinates into camera-relative world coordinates.
    pub fn screen_to_world(&self, screen_pos: Vec2) -> Vec2 {
        if cfg!(test) {
            let (sw, sh) = (800.0, 600.0);
            let p = screen_pos - vec2(sw * 0.5, sh * 0.5);
            let unzoomed = vec2(p.x / self.zoom, p.y / self.zoom);
            let rotated = crate::math::Vec2Ext::rotated(unzoomed, self.rotation);
            self.target + rotated
        } else {
            self.cached.screen_to_world(screen_pos)
        }
    }

    /// Converts world-space coordinates into screen-space pixel coordinates.
    pub fn world_to_screen(&self, world_pos: Vec2) -> Vec2 {
        if cfg!(test) {
            let (sw, sh) = (800.0, 600.0);
            let diff = world_pos - self.target;
            let unrotated = crate::math::Vec2Ext::rotated(diff, -self.rotation);
            let zoomed = vec2(unrotated.x * self.zoom, unrotated.y * self.zoom);
            zoomed + vec2(sw * 0.5, sh * 0.5)
        } else {
            self.cached.world_to_screen(world_pos)
        }
    }
}

impl Default for Camera {
    fn default() -> Self {
        Self::new()
    }
}
