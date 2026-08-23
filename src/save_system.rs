//! Secure slot-based save game system with CRC32 anti-tamper checksum validation.
//!
//! # Example
//! ```ignore
//! // Save slot 1
//! ctx.save_system.save_slot(1, "Level 2 - Forest", &ctx.state)?;
//!
//! // Load slot 1
//! let loaded_state = ctx.save_system.load_slot(1)?;
//! ```
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use crate::state::StateStore;

/// Errors produced during save file operations or checksum validation.
#[derive(Debug)]
pub enum SaveError {
    IoError(std::io::Error),
    JsonError(serde_json::Error),
    /// File checksum does not match computed state checksum (tampering or corruption).
    ChecksumMismatch { expected: u32, found: u32 },
    /// Save slot file does not exist.
    SlotNotFound(u32),
}

impl From<std::io::Error> for SaveError {
    fn from(err: std::io::Error) -> Self {
        SaveError::IoError(err)
    }
}

impl From<serde_json::Error> for SaveError {
    fn from(err: serde_json::Error) -> Self {
        SaveError::JsonError(err)
    }
}

impl std::fmt::Display for SaveError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SaveError::IoError(e) => write!(f, "Save system I/O error: {}", e),
            SaveError::JsonError(e) => write!(f, "Save system JSON error: {}", e),
            SaveError::ChecksumMismatch { expected, found } => write!(
                f,
                "Save checksum mismatch: expected {:#010X}, found {:#010X} (file tampered or corrupted)",
                expected, found
            ),
            SaveError::SlotNotFound(slot_id) => write!(f, "Save slot {} not found", slot_id),
        }
    }
}

impl std::error::Error for SaveError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            SaveError::IoError(e) => Some(e),
            SaveError::JsonError(e) => Some(e),
            _ => None,
        }
    }
}

/// Metadata stored alongside save slot state data.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SaveSlotMeta {
    pub slot_id: u32,
    pub label: String,
    pub timestamp_epoch_secs: u64,
    pub checksum: u32,
}

/// Full wrapper payload saved to disk.
#[derive(Clone, Debug, Serialize, Deserialize)]
struct SavePayload {
    meta: SaveSlotMeta,
    state: StateStore,
}

/// Computes a lightweight CRC32 checksum over bytes.
pub fn compute_crc32(bytes: &[u8]) -> u32 {
    let mut crc: u32 = 0xFFFF_FFFF;
    for &byte in bytes {
        crc ^= u32::from(byte);
        for _ in 0..8 {
            let mask = (crc & 1).wrapping_neg();
            crc = (crc >> 1) ^ (0xED88_8320 & mask);
        }
    }
    !crc
}

/// Computes a deterministic CRC32 checksum over `StateStore` contents.
pub fn compute_state_checksum(state: &StateStore) -> u32 {
    let mut keys: Vec<&String> = state.values().keys().collect();
    keys.sort();
    let mut bytes = Vec::new();
    for k in keys {
        bytes.extend_from_slice(k.as_bytes());
        if let Some(val) = state.values().get(k) {
            let val_str = format!("{:?}", val);
            bytes.extend_from_slice(val_str.as_bytes());
        }
    }
    compute_crc32(&bytes)
}

/// Slot-based save game manager.
pub struct SaveSystem {
    save_dir: PathBuf,
}

impl SaveSystem {
    /// Creates a new [`SaveSystem`] targeting the specified save directory.
    pub fn new(save_dir: impl AsRef<Path>) -> Self {
        Self {
            save_dir: save_dir.as_ref().to_path_buf(),
        }
    }

    /// Creates a [`SaveSystem`] targeting default directory `"saves"`.
    pub fn default_dir() -> Self {
        Self::new("saves")
    }

    /// Creates a [`SaveSystem`] targeting the OS platform standard data directory for `app_name`.
    ///
    /// - **Windows**: `%APPDATA%/<app_name>/saves`
    /// - **macOS**: `~/Library/Application Support/<app_name>/saves`
    /// - **Linux**: `$XDG_DATA_HOME/<app_name>/saves` or `~/.local/share/<app_name>/saves`
    /// - **Fallback**: `"saves"` relative to current working directory.
    pub fn platform_default(app_name: &str) -> Self {
        #[cfg(target_os = "windows")]
        {
            if let Ok(appdata) = std::env::var("APPDATA") {
                return Self::new(PathBuf::from(appdata).join(app_name).join("saves"));
            }
            if let Ok(userprofile) = std::env::var("USERPROFILE") {
                return Self::new(
                    PathBuf::from(userprofile)
                        .join("AppData")
                        .join("Roaming")
                        .join(app_name)
                        .join("saves"),
                );
            }
        }

        #[cfg(target_os = "macos")]
        {
            if let Ok(home) = std::env::var("HOME") {
                return Self::new(
                    PathBuf::from(home)
                        .join("Library")
                        .join("Application Support")
                        .join(app_name)
                        .join("saves"),
                );
            }
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        {
            if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
                return Self::new(PathBuf::from(xdg).join(app_name).join("saves"));
            }
            if let Ok(home) = std::env::var("HOME") {
                return Self::new(
                    PathBuf::from(home)
                        .join(".local")
                        .join("share")
                        .join(app_name)
                        .join("saves"),
                );
            }
        }

        Self::default_dir()
    }

    fn slot_path(&self, slot_id: u32) -> PathBuf {
        self.save_dir.join(format!("save_slot_{}.json", slot_id))
    }

    /// Saves `state` to `slot_id` with `label` and a computed CRC32 checksum.
    pub fn save_slot(
        &self,
        slot_id: u32,
        label: impl Into<String>,
        state: &StateStore,
    ) -> Result<SaveSlotMeta, SaveError> {
        if !self.save_dir.exists() {
            fs::create_dir_all(&self.save_dir)?;
        }

        let checksum = compute_state_checksum(state);

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let meta = SaveSlotMeta {
            slot_id,
            label: label.into(),
            timestamp_epoch_secs: now,
            checksum,
        };

        let payload = SavePayload {
            meta: meta.clone(),
            state: state.clone(),
        };

        let json = serde_json::to_string_pretty(&payload)?;
        fs::write(self.slot_path(slot_id), json)?;

        Ok(meta)
    }

    /// Loads and verifies `StateStore` from `slot_id`.
    /// Returns [`SaveError::ChecksumMismatch`] if the save file was tampered with or corrupted.
    pub fn load_slot(&self, slot_id: u32) -> Result<StateStore, SaveError> {
        let path = self.slot_path(slot_id);
        if !path.exists() {
            return Err(SaveError::SlotNotFound(slot_id));
        }

        let json = fs::read_to_string(path)?;
        let payload: SavePayload = serde_json::from_str(&json)?;

        let computed_checksum = compute_state_checksum(&payload.state);

        if computed_checksum != payload.meta.checksum {
            return Err(SaveError::ChecksumMismatch {
                expected: payload.meta.checksum,
                found: computed_checksum,
            });
        }

        Ok(payload.state)
    }

    /// Returns metadata for all valid existing save slots in `save_dir`.
    pub fn list_slots(&self) -> Vec<SaveSlotMeta> {
        let mut metas = Vec::new();
        if let Ok(entries) = fs::read_dir(&self.save_dir) {
            for entry in entries.flatten() {
                if let Ok(json) = fs::read_to_string(entry.path())
                    && let Ok(payload) = serde_json::from_str::<SavePayload>(&json)
                {
                    metas.push(payload.meta);
                }
            }
        }
        metas.sort_by_key(|m| m.slot_id);
        metas
    }

    /// Deletes a save slot file if it exists. Returns `true` if file was present.
    pub fn delete_slot(&self, slot_id: u32) -> bool {
        let path = self.slot_path(slot_id);
        if path.exists() {
            fs::remove_file(path).is_ok()
        } else {
            false
        }
    }
}

impl Default for SaveSystem {
    fn default() -> Self {
        Self::default_dir()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_save_system_crc32() {
        let temp_dir = std::env::temp_dir().join("rusty_engine_save_test");
        let save_sys = SaveSystem::new(&temp_dir);

        let mut store = StateStore::new();
        store.set_int("coins", 500);
        store.set_text("location", "Dungeon_01");

        let meta = save_sys.save_slot(1, "Test Save", &store).unwrap();
        assert_eq!(meta.slot_id, 1);
        assert_eq!(meta.label, "Test Save");

        let loaded_store = save_sys.load_slot(1).unwrap();
        assert_eq!(loaded_store.get_int("coins"), 500);
        assert_eq!(loaded_store.get_text("location"), "Dungeon_01");

        save_sys.delete_slot(1);
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
