use std::collections::HashMap;

use macroquad::input::{
    is_key_down, is_key_pressed, is_key_released, is_mouse_button_down,
    is_mouse_button_pressed, is_mouse_button_released, KeyCode, MouseButton,
};

use crate::object::Side;

// ---------------------------------------------------------------------------
// ActionMap — Action binding system for keys and mouse buttons
// ---------------------------------------------------------------------------

/// Maps human-readable action names to lists of keyboard keys and mouse buttons.
/// A single action can be triggered by multiple key bindings (OR logic).
///
/// # Example
/// ```ignore
/// ctx.actions.bind_key("jump", KeyCode::Space);
/// ctx.actions.bind_key("jump", KeyCode::W);
/// ctx.actions.bind_mouse("attack", Side::Left);
///
/// if ctx.actions.is_pressed("jump") {
///     // Handle jump action...
/// }
/// ```
#[derive(Clone, Default)]
pub struct ActionMap {
    keys: HashMap<String, Vec<KeyCode>>,
    mouse: HashMap<String, Vec<MouseButton>>,
}

impl ActionMap {
    /// Creates a new empty [`ActionMap`].
    pub fn new() -> Self {
        Self::default()
    }

    /// Binds a keyboard key to an action name. Multiple keys can be bound to the same action.
    pub fn bind_key(&mut self, action: &str, key: KeyCode) {
        self.keys
            .entry(action.to_string())
            .or_default()
            .push(key);
    }

    /// Binds a mouse button to an action name. Multiple buttons can be bound to the same action.
    pub fn bind_mouse(&mut self, action: &str, btn: Side) {
        self.mouse
            .entry(action.to_string())
            .or_default()
            .push(btn.to_macroquad());
    }

    /// Removes all bindings (keys and mouse buttons) associated with the given action name.
    pub fn unbind(&mut self, action: &str) {
        self.keys.remove(action);
        self.mouse.remove(action);
    }

    /// Returns `true` if any bound key or mouse button for the action is currently held down.
    pub fn is_down(&self, action: &str) -> bool {
        if let Some(keys) = self.keys.get(action) {
            if keys.iter().any(|&k| is_key_down(k)) {
                return true;
            }
        }
        if let Some(btns) = self.mouse.get(action) {
            if btns.iter().any(|&b| is_mouse_button_down(b)) {
                return true;
            }
        }
        false
    }

    /// Returns `true` during the frame any bound key or mouse button for the action was pressed.
    pub fn is_pressed(&self, action: &str) -> bool {
        if let Some(keys) = self.keys.get(action) {
            if keys.iter().any(|&k| is_key_pressed(k)) {
                return true;
            }
        }
        if let Some(btns) = self.mouse.get(action) {
            if btns.iter().any(|&b| is_mouse_button_pressed(b)) {
                return true;
            }
        }
        false
    }

    /// Returns `true` during the frame any bound key or mouse button for the action was released.
    pub fn is_released(&self, action: &str) -> bool {
        if let Some(keys) = self.keys.get(action) {
            if keys.iter().any(|&k| is_key_released(k)) {
                return true;
            }
        }
        if let Some(btns) = self.mouse.get(action) {
            if btns.iter().any(|&b| is_mouse_button_released(b)) {
                return true;
            }
        }
        false
    }
}
