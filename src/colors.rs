//! Curated modern color palette constants for UI and game graphics.

use macroquad::color::Color;

/// Modern Slate dark theme palette.
pub const SLATE_900: Color = Color::new(0.06, 0.09, 0.16, 1.0);
pub const SLATE_800: Color = Color::new(0.12, 0.16, 0.23, 1.0);
pub const SLATE_700: Color = Color::new(0.20, 0.25, 0.33, 1.0);
pub const SLATE_600: Color = Color::new(0.28, 0.34, 0.43, 1.0);
pub const SLATE_100: Color = Color::new(0.95, 0.96, 0.98, 1.0);

/// Accent colors.
pub const EMERALD_500: Color = Color::new(0.06, 0.78, 0.54, 1.0);
pub const EMERALD_400: Color = Color::new(0.20, 0.83, 0.60, 1.0);
pub const INDIGO_600: Color = Color::new(0.31, 0.27, 0.90, 1.0);
pub const INDIGO_500: Color = Color::new(0.39, 0.36, 0.95, 1.0);
pub const AMBER_400: Color = Color::new(0.98, 0.75, 0.14, 1.0);
pub const ROSE_500: Color = Color::new(0.96, 0.26, 0.42, 1.0);
pub const VIOLET_500: Color = Color::new(0.55, 0.36, 0.96, 1.0);
pub const CYAN_500: Color = Color::new(0.02, 0.71, 0.83, 1.0);

/// Transparent background helper.
pub const TRANSPARENT: Color = Color::new(0.0, 0.0, 0.0, 0.0);
