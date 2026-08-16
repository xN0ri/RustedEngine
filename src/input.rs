use macroquad::{
    input::{
        KeyCode, MouseButton, is_key_down, is_key_pressed, is_key_released, is_mouse_button_down,
        is_mouse_button_pressed, is_mouse_button_released, mouse_position,
    },
    math::{Vec2, vec2},
};

/// Hardware input wrapper exposing keyboard and mouse query methods.
pub struct Input {
    /// Letterbox viewport transform: `(scale, offset_x, offset_y)`.
    /// Set by [`Engine`](crate::engine::Engine) each frame when `with_virtual_resolution` is active.
    /// Default `(1.0, 0.0, 0.0)` = passthrough (no remapping).
    pub(crate) viewport: (f32, f32, f32),
}

impl Input {
    /// Creates a new [`Input`] query instance.
    pub fn new() -> Self {
        Self {
            viewport: (1.0, 0.0, 0.0),
        }
    }

    /// Returns `true` if the specified keyboard key is currently held down.
    pub fn is_key_down(&self, key: KeyCode) -> bool {
        is_key_down(key)
    }

    /// Returns `true` during the frame the specified keyboard key was pressed.
    pub fn is_key_pressed(&self, key: KeyCode) -> bool {
        is_key_pressed(key)
    }

    /// Returns `true` during the frame the specified keyboard key was released.
    pub fn is_key_up(&self, key: KeyCode) -> bool {
        is_key_released(key)
    }

    /// Returns the mouse position mapped to virtual coordinates (when virtual resolution is active),
    /// or raw screen pixels otherwise. Use [`Input::raw_mouse_position`] for unremapped OS position.
    pub fn mouse_position(&self) -> Vec2 {
        let (x, y) = mouse_position();
        let (scale, ox, oy) = self.viewport;
        vec2((x - ox) / scale, (y - oy) / scale)
    }

    /// Returns the raw OS mouse position in real screen pixels, unaffected by letterbox scaling.
    pub fn raw_mouse_position(&self) -> Vec2 {
        let (x, y) = mouse_position();
        vec2(x, y)
    }

    /// Returns `true` if the specified mouse button is currently held down.
    pub fn is_mouse_button_down(&self, button: MouseButton) -> bool {
        is_mouse_button_down(button)
    }

    /// Returns `true` during the frame the specified mouse button was pressed.
    pub fn is_mouse_button_pressed(&self, button: MouseButton) -> bool {
        is_mouse_button_pressed(button)
    }

    /// Returns `true` during the frame the specified mouse button was released.
    pub fn is_mouse_button_released(&self, button: MouseButton) -> bool {
        is_mouse_button_released(button)
    }

    /// Returns a normalized 2D movement direction vector derived from WASD keyboard keys.
    pub fn wasd(&self) -> Vec2 {
        let mut dir = Vec2::ZERO;
        if is_key_down(KeyCode::W) {
            dir.y -= 1.0;
        }
        if is_key_down(KeyCode::S) {
            dir.y += 1.0;
        }
        if is_key_down(KeyCode::A) {
            dir.x -= 1.0;
        }
        if is_key_down(KeyCode::D) {
            dir.x += 1.0;
        }
        if dir.length_squared() > 0.0 {
            dir.normalize()
        } else {
            Vec2::ZERO
        }
    }

    /// Returns a normalized 2D movement direction vector derived from arrow keyboard keys.
    pub fn arrow_keys(&self) -> Vec2 {
        let mut dir = Vec2::ZERO;
        if is_key_down(KeyCode::Up) {
            dir.y -= 1.0;
        }
        if is_key_down(KeyCode::Down) {
            dir.y += 1.0;
        }
        if is_key_down(KeyCode::Left) {
            dir.x -= 1.0;
        }
        if is_key_down(KeyCode::Right) {
            dir.x += 1.0;
        }
        if dir.length_squared() > 0.0 {
            dir.normalize()
        } else {
            Vec2::ZERO
        }
    }
}

impl Default for Input {
    fn default() -> Self {
        Self::new()
    }
}
