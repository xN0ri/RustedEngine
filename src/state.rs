use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// StateValue — Value variant stored in StateStore
// ---------------------------------------------------------------------------

/// Variant enum representing data types stored in [`StateStore`].
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum StateValue {
    Bool(bool),
    Int(i64),
    Float(f64),
    Text(String),
    Vec2(f32, f32),
}

impl From<bool> for StateValue {
    fn from(v: bool) -> Self {
        StateValue::Bool(v)
    }
}

impl From<i32> for StateValue {
    fn from(v: i32) -> Self {
        StateValue::Int(v as i64)
    }
}

impl From<i64> for StateValue {
    fn from(v: i64) -> Self {
        StateValue::Int(v)
    }
}

impl From<f32> for StateValue {
    fn from(v: f32) -> Self {
        StateValue::Float(v as f64)
    }
}

impl From<f64> for StateValue {
    fn from(v: f64) -> Self {
        StateValue::Float(v)
    }
}

impl From<String> for StateValue {
    fn from(v: String) -> Self {
        StateValue::Text(v)
    }
}

impl From<&str> for StateValue {
    fn from(v: &str) -> Self {
        StateValue::Text(v.to_string())
    }
}

impl From<macroquad::math::Vec2> for StateValue {
    fn from(v: macroquad::math::Vec2) -> Self {
        StateValue::Vec2(v.x, v.y)
    }
}

impl From<(f32, f32)> for StateValue {
    fn from(v: (f32, f32)) -> Self {
        StateValue::Vec2(v.0, v.1)
    }
}

// ---------------------------------------------------------------------------
// StateStore — Global game state and flag storage
// ---------------------------------------------------------------------------

/// Key-value flag and game state storage component.
/// Stores arbitrary data keyed by strings, accessible via [`Context::state`](crate::engine::Context::state).
///
/// Supports Serde JSON serialization for save/load files out of the box.
///
/// # Example
/// ```ignore
/// ctx.state.set_bool("door_open", true);
/// ctx.state.set_int("collected_items", 0);
///
/// if ctx.state.get_bool("door_open") {
///     // Handle opened door...
/// }
/// ctx.state.increment("collected_items", 1);
/// ```
#[derive(Clone, Default, Debug, Serialize, Deserialize)]
pub struct StateStore {
    values: HashMap<String, StateValue>,
}

impl StateStore {
    /// Creates a new empty [`StateStore`].
    pub fn new() -> Self {
        Self::default()
    }

    /// Returns a read-only reference to the underlying values map.
    pub fn values(&self) -> &HashMap<String, StateValue> {
        &self.values
    }

    // ----- Setters -----

    /// Sets an explicit [`StateValue`] entry for `key`.
    pub fn set(&mut self, key: &str, value: StateValue) {
        self.values.insert(key.to_string(), value);
    }

    /// Stores a boolean flag entry.
    pub fn set_bool(&mut self, key: &str, v: bool) {
        self.set(key, StateValue::Bool(v));
    }

    /// Stores an integer entry.
    pub fn set_int(&mut self, key: &str, v: impl Into<i64>) {
        self.set(key, StateValue::Int(v.into()));
    }

    /// Stores a floating point entry.
    pub fn set_float(&mut self, key: &str, v: impl Into<f64>) {
        self.set(key, StateValue::Float(v.into()));
    }

    /// Stores a 2D vector coordinate entry.
    pub fn set_vec2(&mut self, key: &str, v: impl Into<macroquad::math::Vec2>) {
        let v = v.into();
        self.set(key, StateValue::Vec2(v.x, v.y));
    }

    /// Stores a string text entry.
    pub fn set_text(&mut self, key: &str, v: impl Into<String>) {
        self.set(key, StateValue::Text(v.into()));
    }

    /// Serializes any Serde [`Serialize`](serde::Serialize) struct to JSON and stores it under `key`.
    pub fn set_struct<T: serde::Serialize>(&mut self, key: &str, value: &T) -> Result<(), serde_json::Error> {
        let json_str = serde_json::to_string(value)?;
        self.set(key, StateValue::Text(json_str));
        Ok(())
    }

    // ----- Getters -----

    /// Retrieves an optional reference to a [`StateValue`] entry by key.
    pub fn get(&self, key: &str) -> Option<&StateValue> {
        self.values.get(key)
    }

    /// Returns the boolean flag value for `key`, or `false` if not set or mismatched.
    pub fn get_bool(&self, key: &str) -> bool {
        match self.values.get(key) {
            Some(StateValue::Bool(v)) => *v,
            _ => false,
        }
    }

    /// Returns the boolean flag value for `key`, or `default` if not set.
    pub fn get_bool_or(&self, key: &str, default: bool) -> bool {
        match self.values.get(key) {
            Some(StateValue::Bool(v)) => *v,
            _ => default,
        }
    }

    /// Returns the integer value for `key`, or `0` if not set or mismatched.
    pub fn get_int(&self, key: &str) -> i64 {
        match self.values.get(key) {
            Some(StateValue::Int(v)) => *v,
            _ => 0,
        }
    }

    /// Returns the integer value for `key`, or `default` if not set.
    pub fn get_int_or(&self, key: &str, default: i64) -> i64 {
        match self.values.get(key) {
            Some(StateValue::Int(v)) => *v,
            _ => default,
        }
    }

    /// Returns the float value for `key`, or `0.0` if not set or mismatched.
    pub fn get_float(&self, key: &str) -> f64 {
        match self.values.get(key) {
            Some(StateValue::Float(v)) => *v,
            _ => 0.0,
        }
    }

    /// Returns the float value for `key`, or `default` if not set.
    pub fn get_float_or(&self, key: &str, default: f64) -> f64 {
        match self.values.get(key) {
            Some(StateValue::Float(v)) => *v,
            _ => default,
        }
    }

    /// Returns the 2D vector coordinate value for `key`, or `None` if not set or mismatched.
    pub fn get_vec2(&self, key: &str) -> Option<macroquad::math::Vec2> {
        match self.values.get(key) {
            Some(StateValue::Vec2(x, y)) => Some(macroquad::math::vec2(*x, *y)),
            _ => None,
        }
    }

    /// Returns the 2D vector coordinate value for `key`, or `default` if not set.
    pub fn get_vec2_or(&self, key: &str, default: macroquad::math::Vec2) -> macroquad::math::Vec2 {
        self.get_vec2(key).unwrap_or(default)
    }

    /// Returns the string text value for `key`, or `""` if not set or mismatched.
    pub fn get_text(&self, key: &str) -> &str {
        match self.values.get(key) {
            Some(StateValue::Text(v)) => v.as_str(),
            _ => "",
        }
    }

    /// Returns the string text value for `key`, or `default` if not set.
    pub fn get_text_or<'a>(&'a self, key: &str, default: &'a str) -> &'a str {
        match self.values.get(key) {
            Some(StateValue::Text(v)) => v.as_str(),
            _ => default,
        }
    }

    /// Deserializes a Serde [`DeserializeOwned`](serde::de::DeserializeOwned) struct from JSON stored under `key`.
    pub fn get_struct<T: serde::de::DeserializeOwned>(&self, key: &str) -> Option<T> {
        let text = self.get_text(key);
        if text.is_empty() {
            return None;
        }
        serde_json::from_str(text).ok()
    }

    // ----- Convenience Operations -----

    /// Returns `true` if `key` exists in the store regardless of type.
    pub fn has_flag(&self, key: &str) -> bool {
        self.values.contains_key(key)
    }

    /// Removes an entry by key.
    pub fn remove(&mut self, key: &str) {
        self.values.remove(key);
    }

    /// Increments an integer entry by `delta` (defaults from `0` if non-existent).
    /// Returns the updated value.
    pub fn increment(&mut self, key: &str, delta: impl Into<i64>) -> i64 {
        let updated = self.get_int(key) + delta.into();
        self.set_int(key, updated);
        updated
    }

    /// Toggles a boolean flag value.
    pub fn toggle(&mut self, key: &str) {
        let current = self.get_bool(key);
        self.set_bool(key, !current);
    }

    // ----- Serialization -----

    /// Serializes and saves the state store to a JSON file at `path`.
    pub fn save_to_file(&self, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let json = serde_json::to_string_pretty(self)?;
        std::fs::write(path, json)?;
        Ok(())
    }

    /// Deserializes and loads a state store from a JSON file at `path`.
    pub fn load_from_file(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let json = std::fs::read_to_string(path)?;
        let store = serde_json::from_str(&json)?;
        Ok(store)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug, PartialEq, Serialize, Deserialize)]
    struct UserCredentials {
        username: String,
        password_hash: String,
    }

    #[test]
    fn test_state_struct_serialization() {
        let mut state = StateStore::new();
        let creds = UserCredentials {
            username: "admin".to_string(),
            password_hash: "hash123".to_string(),
        };

        state.set_struct("user", &creds).unwrap();
        let loaded: Option<UserCredentials> = state.get_struct("user");
        assert_eq!(loaded, Some(creds));
    }

    #[test]
    fn test_state_vec2_operations() {
        let mut state = StateStore::new();
        state.set_vec2("player_pos", macroquad::math::vec2(150.0, 250.0));

        assert_eq!(state.get_vec2("player_pos"), Some(macroquad::math::vec2(150.0, 250.0)));
        assert_eq!(state.get_vec2_or("missing_pos", macroquad::math::vec2(10.0, 10.0)), macroquad::math::vec2(10.0, 10.0));
    }
}
