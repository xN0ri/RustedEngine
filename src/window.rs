use macroquad::{math::Vec2, window::Conf};

/// Window configuration builder helper.
pub struct Window {
    pub size: Vec2,
    pub name: String,
    pub resizable: bool,
}

impl Window {
    /// Creates a Macroquad [`Conf`] object for configuring main window properties.
    pub fn conf(size: Vec2, name: &str, resizable: bool) -> Conf {
        Conf {
            window_title: name.to_string(),
            window_width: size.x as i32,
            window_height: size.y as i32,
            window_resizable: resizable,
            ..Default::default()
        }
    }

    /// Creates a new [`Window`] configuration helper struct.
    pub fn new(size: Vec2, name: &str, resizable: bool) -> Self {
        Self {
            size,
            name: name.to_string(),
            resizable,
        }
    }
}
