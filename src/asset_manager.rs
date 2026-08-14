use std::collections::HashMap;
use macroquad::{
    audio::{load_sound, Sound},
    text::{load_ttf_font, Font},
    texture::{load_texture, Texture2D},
};

/// Central asset manager storing loaded textures, sounds, and fonts.
/// Serves as the single source of truth for game resources.
#[derive(Clone, Default)]
pub struct Assets {
    textures: HashMap<String, Texture2D>,
    sounds: HashMap<String, Sound>,
    fonts: HashMap<String, Font>,
}

impl Assets {
    /// Creates a new empty [`Assets`] manager.
    pub fn new() -> Self {
        Self {
            textures: HashMap::new(),
            sounds: HashMap::new(),
            fonts: HashMap::new(),
        }
    }

    /// Asynchronously loads a texture from the given file path and stores it under `name`.
    pub async fn load_texture(&mut self, name: &str, path: &str) -> Result<Texture2D, macroquad::Error> {
        let texture = load_texture(path).await?;
        self.textures.insert(name.to_string(), texture.clone());
        Ok(texture)
    }

    /// Manually inserts a pre-created [`Texture2D`] under `name`.
    pub fn insert_texture(&mut self, name: &str, texture: Texture2D) {
        self.textures.insert(name.to_string(), texture);
    }

    /// Retrieves a reference to a stored texture by name.
    pub fn get_texture(&self, name: &str) -> Option<&Texture2D> {
        self.textures.get(name)
    }

    /// Asynchronously loads a sound effect from the given file path and stores it under `name`.
    pub async fn load_sound(&mut self, name: &str, path: &str) -> Result<Sound, macroquad::Error> {
        let sound = load_sound(path).await?;
        self.sounds.insert(name.to_string(), sound.clone());
        Ok(sound)
    }

    /// Manually inserts a pre-loaded [`Sound`] handle under `name`.
    pub fn insert_sound(&mut self, name: &str, sound: Sound) {
        self.sounds.insert(name.to_string(), sound);
    }

    /// Retrieves a reference to a stored sound by name.
    pub fn get_sound(&self, name: &str) -> Option<&Sound> {
        self.sounds.get(name)
    }

    /// Asynchronously loads a TTF font from the given file path and stores it under `name`.
    pub async fn load_font(&mut self, name: &str, path: &str) -> Result<Font, macroquad::Error> {
        let font = load_ttf_font(path).await?;
        self.fonts.insert(name.to_string(), font.clone());
        Ok(font)
    }

    /// Retrieves a reference to a stored font by name.
    pub fn get_font(&self, name: &str) -> Option<&Font> {
        self.fonts.get(name)
    }
}