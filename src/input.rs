use macroquad::{
    input::{
        KeyCode, MouseButton, is_key_down, is_key_pressed, is_key_released, is_mouse_button_down,
        is_mouse_button_pressed, is_mouse_button_released, mouse_position,
    },
    math::{Vec2, vec2},
};

/// Hardware input wrapper exposing keyboard and mouse query methods.
pub struct Input {}

impl Input {
    /// Creates a new [`Input`] query instance.
    pub fn new() -> Self {
        Self {}
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

    /// Returns the current raw screen mouse position in pixels.
    pub fn mouse_position(&self) -> Vec2 {
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
}

impl Default for Input {
    fn default() -> Self {
        Self::new()
    }
}
