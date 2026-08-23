use std::collections::HashMap;

use macroquad::input::{
    KeyCode, MouseButton, is_key_down, is_key_pressed, is_key_released, is_mouse_button_down,
    is_mouse_button_pressed, is_mouse_button_released,
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
        self.keys.entry(action.to_string()).or_default().push(key);
    }

    /// Builder pattern: Binds a keyboard key to an action name.
    pub fn with_key(mut self, action: &str, key: KeyCode) -> Self {
        self.bind_key(action, key);
        self
    }

    /// Binds a mouse button to an action name. Multiple buttons can be bound to the same action.
    pub fn bind_mouse(&mut self, action: &str, btn: Side) {
        self.mouse
            .entry(action.to_string())
            .or_default()
            .push(btn.to_macroquad());
    }

    /// Builder pattern: Binds a mouse button to an action name.
    pub fn with_mouse(mut self, action: &str, btn: Side) -> Self {
        self.bind_mouse(action, btn);
        self
    }

    /// Removes all bindings (keys and mouse buttons) associated with the given action name.
    pub fn unbind(&mut self, action: &str) {
        self.keys.remove(action);
        self.mouse.remove(action);
    }

    /// Returns `true` if any bound key or mouse button for the action is currently held down.
    pub fn is_down(&self, action: &str) -> bool {
        let key_down = self
            .keys
            .get(action)
            .is_some_and(|keys| keys.iter().any(|&k| is_key_down(k)));
        let mouse_down = self
            .mouse
            .get(action)
            .is_some_and(|btns| btns.iter().any(|&b| is_mouse_button_down(b)));
        key_down || mouse_down
    }

    /// Returns `true` during the frame any bound key or mouse button for the action was pressed.
    pub fn is_pressed(&self, action: &str) -> bool {
        let key_pressed = self
            .keys
            .get(action)
            .is_some_and(|keys| keys.iter().any(|&k| is_key_pressed(k)));
        let mouse_pressed = self
            .mouse
            .get(action)
            .is_some_and(|btns| btns.iter().any(|&b| is_mouse_button_pressed(b)));
        key_pressed || mouse_pressed
    }

    /// Returns `true` during the frame any bound key or mouse button for the action was released.
    pub fn is_released(&self, action: &str) -> bool {
        let key_released = self
            .keys
            .get(action)
            .is_some_and(|keys| keys.iter().any(|&k| is_key_released(k)));
        let mouse_released = self
            .mouse
            .get(action)
            .is_some_and(|btns| btns.iter().any(|&b| is_mouse_button_released(b)));
        key_released || mouse_released
    }

    /// Returns `true` if any bindings (keys or mouse buttons) exist for `action`.
    pub fn has_action(&self, action: &str) -> bool {
        self.keys.contains_key(action) || self.mouse.contains_key(action)
    }

    /// Returns a sorted list of all registered action names.
    pub fn action_names(&self) -> Vec<&str> {
        let mut names: std::collections::HashSet<&str> = std::collections::HashSet::new();
        for k in self.keys.keys() {
            names.insert(k.as_str());
        }
        for k in self.mouse.keys() {
            names.insert(k.as_str());
        }
        let mut list: Vec<&str> = names.into_iter().collect();
        list.sort();
        list
    }

    /// Returns the slice of keyboard keys bound to `action`.
    pub fn keys_for(&self, action: &str) -> &[KeyCode] {
        self.keys.get(action).map(|v| v.as_slice()).unwrap_or(&[])
    }

    /// Returns the slice of mouse buttons bound to `action`.
    pub fn mouse_for(&self, action: &str) -> &[MouseButton] {
        self.mouse.get(action).map(|v| v.as_slice()).unwrap_or(&[])
    }

    /// Clears all key and mouse action bindings.
    pub fn clear(&mut self) {
        self.keys.clear();
        self.mouse.clear();
    }
}
