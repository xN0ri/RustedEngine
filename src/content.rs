//! Generic content loading pipeline.
//!
//! Provides [`load_content`] and [`load_content_dir`] for deserializing any
//! `T: DeserializeOwned` from JSON files on disk. The engine has zero knowledge
//! of what the data represents — that is entirely up to the game.

use serde::de::DeserializeOwned;
use std::{fmt, fs, io, path::Path};

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/// Errors that can occur when loading content from disk.
#[derive(Debug)]
pub enum ContentError {
    /// An IO error (e.g. file not found, permission denied).
    Io { path: String, source: io::Error },
    /// JSON deserialization failed.
    Parse {
        path: String,
        source: serde_json::Error,
    },
    /// The given path is not a directory (for [`load_content_dir`]).
    NotADirectory(String),
}

impl fmt::Display for ContentError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ContentError::Io { path, source } => {
                write!(f, "IO error reading '{}': {}", path, source)
            }
            ContentError::Parse { path, source } => {
                write!(f, "JSON parse error in '{}': {}", path, source)
            }
            ContentError::NotADirectory(path) => {
                write!(f, "'{}' is not a directory", path)
            }
        }
    }
}

impl std::error::Error for ContentError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            ContentError::Io { source, .. } => Some(source),
            ContentError::Parse { source, .. } => Some(source),
            ContentError::NotADirectory(_) => None,
        }
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Deserializes a value of type `T` from a JSON file at `path`.
///
/// Works for any type that implements [`serde::de::DeserializeOwned`].
/// The engine imposes no constraints on what `T` contains — level configs,
/// dialogue tables, balance sheets, etc. are all valid targets.
///
/// # Errors
/// Returns [`ContentError::Io`] if the file cannot be read, or
/// [`ContentError::Parse`] if the JSON is malformed / incompatible with `T`.
///
/// # Example
/// ```rust,ignore
/// let level: LevelConfig = load_content("assets/level_01.json")?;
/// ```
pub fn load_content<T: DeserializeOwned>(path: &str) -> Result<T, ContentError> {
    let raw = fs::read_to_string(path).map_err(|e| ContentError::Io {
        path: path.to_owned(),
        source: e,
    })?;
    serde_json::from_str(&raw).map_err(|e| ContentError::Parse {
        path: path.to_owned(),
        source: e,
    })
}

/// Deserializes every `*.json` file in `dir` into a `Vec<T>`.
///
/// Files are processed in directory-entry order (OS-defined). Any file that
/// fails to deserialize returns an error immediately (fail-fast behaviour).
///
/// # Errors
/// - [`ContentError::NotADirectory`] if `dir` does not point to a directory.
/// - [`ContentError::Io`] / [`ContentError::Parse`] forwarded from individual files.
pub fn load_content_dir<T: DeserializeOwned>(dir: &str) -> Result<Vec<T>, ContentError> {
    let dir_path = Path::new(dir);
    if !dir_path.is_dir() {
        return Err(ContentError::NotADirectory(dir.to_owned()));
    }

    let entries = fs::read_dir(dir_path).map_err(|e| ContentError::Io {
        path: dir.to_owned(),
        source: e,
    })?;

    let mut results = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| ContentError::Io {
            path: dir.to_owned(),
            source: e,
        })?;
        let file_path = entry.path();
        if file_path.extension().and_then(|s| s.to_str()) == Some("json") {
            let path_str = file_path.to_string_lossy().into_owned();
            let item: T = load_content(&path_str)?;
            results.push(item);
        }
    }
    Ok(results)
}

// ---------------------------------------------------------------------------
// Unit tests (pure Rust, no macroquad)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Deserialize;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[derive(Debug, Deserialize, PartialEq)]
    struct Dummy {
        id: String,
        value: i32,
    }

    #[test]
    fn load_valid_json() {
        let mut f = NamedTempFile::new().unwrap();
        writeln!(f, r#"{{"id":"test","value":42}}"#).unwrap();
        let path = f.path().to_string_lossy().into_owned();
        let d: Dummy = load_content(&path).unwrap();
        assert_eq!(
            d,
            Dummy {
                id: "test".into(),
                value: 42
            }
        );
    }

    #[test]
    fn load_missing_file_returns_io_error() {
        let result = load_content::<Dummy>("/nonexistent/path/data.json");
        assert!(matches!(result, Err(ContentError::Io { .. })));
    }

    #[test]
    fn load_bad_json_returns_parse_error() {
        let mut f = NamedTempFile::new().unwrap();
        writeln!(f, "not json at all").unwrap();
        let path = f.path().to_string_lossy().into_owned();
        let result = load_content::<Dummy>(&path);
        assert!(matches!(result, Err(ContentError::Parse { .. })));
    }

    #[test]
    fn not_a_dir_error() {
        let result = load_content_dir::<Dummy>("/nonexistent/dir");
        assert!(matches!(result, Err(ContentError::NotADirectory(_))));
    }
}
