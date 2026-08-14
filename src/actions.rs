use std::collections::HashMap;

use macroquad::{
    input::{is_key_down, is_key_pressed, is_key_released, is_mouse_button_down,
            is_mouse_button_pressed, is_mouse_button_released, KeyCode, MouseButton},
};

use crate::object::Side;

// ---------------------------------------------------------------------------
// ActionMap — mapowanie nazwanych akcji na klawisze i/lub przyciski myszy
// ---------------------------------------------------------------------------

/// Wiąże czytelne nazwy akcji z listą klawiszy i/lub przycisków myszy.
/// Jedna akcja może być wyzwalana przez wiele klawiszy (OR).
///
/// # Przykład
/// ```ignore
/// ctx.actions.bind_key("jump", KeyCode::Space);
/// ctx.actions.bind_key("jump", KeyCode::W);
/// ctx.actions.bind_mouse("attack", Side::Left);
///
/// if ctx.actions.is_pressed("jump") { }
/// ```
#[derive(Clone, Default)]
pub struct ActionMap {
    keys: HashMap<String, Vec<KeyCode>>,
    mouse: HashMap<String, Vec<MouseButton>>,
}

impl ActionMap {
    pub fn new() -> Self {
        Self::default()
    }

    /// Wiąże klawisz z akcją (można wywołać wielokrotnie — OR).
    pub fn bind_key(&mut self, action: &str, key: KeyCode) {
        self.keys
            .entry(action.to_string())
            .or_default()
            .push(key);
    }

    /// Wiąże przycisk myszy z akcją (można wywołać wielokrotnie — OR).
    pub fn bind_mouse(&mut self, action: &str, btn: Side) {
        self.mouse
            .entry(action.to_string())
            .or_default()
            .push(btn.to_macroquad());
    }

    /// Usuwa wszystkie klucze (klawisze + mysz) dla danej akcji.
    pub fn unbind(&mut self, action: &str) {
        self.keys.remove(action);
        self.mouse.remove(action);
    }

    /// Czy którykolwiek klawisz/przycisk tej akcji jest przytrzymany.
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

    /// Czy którykolwiek klawisz/przycisk tej akcji właśnie wciśnięty (jednorazowe).
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

    /// Czy którykolwiek klawisz/przycisk tej akcji właśnie puszczony.
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
