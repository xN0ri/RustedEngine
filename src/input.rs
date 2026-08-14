use macroquad::{
    input::{
        is_key_down, is_key_pressed, is_key_released, is_mouse_button_down,
        is_mouse_button_pressed, is_mouse_button_released, mouse_position, KeyCode, MouseButton,
    },
    math::{vec2, Vec2},
};

pub struct Input {}

impl Input {
    pub fn new() -> Self {
        Self {}
    }

    pub fn is_key_down(&self, key: KeyCode) -> bool {
        is_key_down(key)
    }

    pub fn is_key_pressed(&self, key: KeyCode) -> bool {
        is_key_pressed(key)
    }

    pub fn is_key_up(&self, key: KeyCode) -> bool {
        is_key_released(key)
    }

    pub fn mouse_position(&self) -> Vec2 {
        let (x, y) = mouse_position();
        vec2(x, y)
    }

    pub fn is_mouse_button_down(&self, button: MouseButton) -> bool {
        is_mouse_button_down(button)
    }

    pub fn is_mouse_button_pressed(&self, button: MouseButton) -> bool {
        is_mouse_button_pressed(button)
    }

    pub fn is_mouse_button_released(&self, button: MouseButton) -> bool {
        is_mouse_button_released(button)
    }
}

impl Default for Input {
    fn default() -> Self {
        Self::new()
    }
}