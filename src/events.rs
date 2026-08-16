//! Type-safe Event Bus system for decoupled entity and scene communication.
//!
//! # Example
//! ```ignore
//! #[derive(Clone, Debug)]
//! pub struct ItemCollected { pub points: i64 }
//!
//! // Emit event
//! ctx.events.emit(ItemCollected { points: 100 });
//!
//! // Poll events
//! for event in ctx.events.poll::<ItemCollected>() {
//!     println!("Got {} points!", event.points);
//! }
//! ```
use std::any::{Any, TypeId};
use std::collections::HashMap;

/// Type-safe event channel store.
#[derive(Default)]
pub struct EventBus {
    channels: HashMap<TypeId, Vec<Box<dyn Any>>>,
}

impl EventBus {
    /// Creates a new empty [`EventBus`].
    pub fn new() -> Self {
        Self {
            channels: HashMap::new(),
        }
    }

    /// Emits a new event onto its corresponding type channel.
    pub fn emit<E: 'static + Send + Sync>(&mut self, event: E) {
        let type_id = TypeId::of::<E>();
        self.channels
            .entry(type_id)
            .or_default()
            .push(Box::new(event));
    }

    /// Returns `true` if there are pending events of type `E`.
    pub fn has_events<E: 'static>(&self) -> bool {
        let type_id = TypeId::of::<E>();
        self.channels
            .get(&type_id)
            .map(|v| !v.is_empty())
            .unwrap_or(false)
    }

    /// Drains and returns all pending events of type `E`.
    pub fn poll<E: 'static>(&mut self) -> Vec<E> {
        let type_id = TypeId::of::<E>();
        if let Some(vec) = self.channels.get_mut(&type_id) {
            vec.drain(..)
                .filter_map(|boxed| boxed.downcast::<E>().ok().map(|b| *b))
                .collect()
        } else {
            Vec::new()
        }
    }

    /// Drains pending events of type `E` and executes `handler` for each event.
    pub fn subscribe<E: 'static, F: FnMut(E)>(&mut self, mut handler: F) {
        for event in self.poll::<E>() {
            handler(event);
        }
    }

    /// Clears all pending events across all event channels.
    pub fn clear(&mut self) {
        self.channels.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Clone, Debug, PartialEq, Eq)]
    struct DamageEvent {
        amount: u32,
    }

    #[test]
    fn test_event_bus() {
        let mut bus = EventBus::new();
        assert!(!bus.has_events::<DamageEvent>());

        bus.emit(DamageEvent { amount: 25 });
        bus.emit(DamageEvent { amount: 50 });
        assert!(bus.has_events::<DamageEvent>());

        let events = bus.poll::<DamageEvent>();
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].amount, 25);
        assert_eq!(events[1].amount, 50);

        assert!(!bus.has_events::<DamageEvent>());
    }
}
