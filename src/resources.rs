//! Generic type-keyed resource container for arbitrary per-context data storage.
//!
//! Stores any number of distinct types (`T: 'static`) indexed by [`TypeId`].
//! Engine-agnostic — zero knowledge of specific game types.

use std::any::{Any, TypeId};
use std::collections::HashMap;

/// Generic type-keyed resource store.
///
/// Stores one value per type. Types are disambiguated by [`TypeId`],
/// so any `T: 'static` can be inserted, retrieved, or removed independently.
///
/// # Example
/// ```rust,ignore
/// let mut resources = Resources::new();
/// resources.insert(42_i32);
/// resources.insert("hello world");
///
/// assert_eq!(resources.get::<i32>(), Some(&42));
/// assert_eq!(resources.get::<&str>(), Some(&"hello world"));
/// ```
#[derive(Default)]
pub struct Resources {
    map: HashMap<TypeId, Box<dyn Any>>,
}

impl Resources {
    /// Creates a new empty [`Resources`] store.
    pub fn new() -> Self {
        Self {
            map: HashMap::new(),
        }
    }

    /// Inserts a value of type `T`, replacing any previously stored value of the same type.
    pub fn insert<T: Any>(&mut self, value: T) {
        self.map.insert(TypeId::of::<T>(), Box::new(value));
    }

    /// Returns a shared reference to the stored value of type `T`, or `None` if not present.
    pub fn get<T: Any>(&self) -> Option<&T> {
        self.map
            .get(&TypeId::of::<T>())
            .and_then(|boxed| boxed.downcast_ref::<T>())
    }

    /// Returns a mutable reference to the stored value of type `T`, or `None` if not present.
    pub fn get_mut<T: Any>(&mut self) -> Option<&mut T> {
        self.map
            .get_mut(&TypeId::of::<T>())
            .and_then(|boxed| boxed.downcast_mut::<T>())
    }

    /// Removes and returns the stored value of type `T`, or `None` if not present.
    pub fn remove<T: Any>(&mut self) -> Option<T> {
        self.map
            .remove(&TypeId::of::<T>())
            .and_then(|boxed| boxed.downcast::<T>().ok())
            .map(|boxed| *boxed)
    }

    /// Returns `true` if a value of type `T` is currently stored.
    pub fn contains<T: Any>(&self) -> bool {
        self.map.contains_key(&TypeId::of::<T>())
    }
}

#[cfg(test)]
mod tests {
    use super::Resources;

    #[test]
    fn insert_and_get() {
        let mut r = Resources::new();
        r.insert(42_i32);
        assert_eq!(r.get::<i32>(), Some(&42));
    }

    #[test]
    fn get_returns_none_for_missing_type() {
        let r = Resources::new();
        assert_eq!(r.get::<f32>(), None);
    }

    #[test]
    fn insert_overwrites_previous_value() {
        let mut r = Resources::new();
        r.insert(1_u32);
        r.insert(99_u32);
        assert_eq!(r.get::<u32>(), Some(&99));
    }

    #[test]
    fn get_mut_allows_mutation() {
        let mut r = Resources::new();
        r.insert(0_i32);
        *r.get_mut::<i32>().unwrap() += 5;
        assert_eq!(r.get::<i32>(), Some(&5));
    }

    #[test]
    fn remove_returns_value_and_clears() {
        let mut r = Resources::new();
        r.insert(7_i32);
        assert_eq!(r.remove::<i32>(), Some(7));
        assert!(!r.contains::<i32>());
    }

    #[test]
    fn contains_reflects_presence() {
        let mut r = Resources::new();
        assert!(!r.contains::<u8>());
        r.insert(0_u8);
        assert!(r.contains::<u8>());
    }

    #[test]
    fn distinct_types_are_independent() {
        let mut r = Resources::new();
        r.insert(42_i32);
        r.insert(123.456_f64);
        assert_eq!(r.get::<i32>(), Some(&42));
        assert_eq!(r.get::<f64>(), Some(&123.456));
    }
}
