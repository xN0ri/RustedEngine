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
    pub fn set_int(&mut self, key: &str, v: i64) {
        self.set(key, StateValue::Int(v));
    }

    /// Stores a floating point entry.
    pub fn set_float(&mut self, key: &str, v: f64) {
        self.set(key, StateValue::Float(v));
    }

    /// Stores a string text entry.
    pub fn set_text(&mut self, key: &str, v: impl Into<String>) {
        self.set(key, StateValue::Text(v.into()));
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

    /// Returns the string text value for `key`, or `""` if not set or mismatched.
    pub fn get_text(&self, key: &str) -> &str {
        match self.values.get(key) {
            Some(StateValue::Text(v)) => v.as_str(),
            _ => "",
        }
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
    pub fn increment(&mut self, key: &str, delta: i64) {
        let current = self.get_int(key);
        self.set_int(key, current + delta);
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
