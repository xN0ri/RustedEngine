//! Screen-space UI components: [`Text`], [`Button`], [`ProgressBar`], [`Panel`], [`TextField`], [`UI`].
//!
//! # Architecture: `ui::Panel` vs `panel_manager::PanelManager`
//!
//! These two types serve **different purposes** and must not be mixed up:
//!
//! | | `ui::Panel` | `panel_manager::PanelManager` |
//! |---|---|---|
//! | **Role** | Static grouping container | Desktop window manager |
//! | **Z-order** | Fixed (render order in parent list) | Managed, click-to-focus |
//! | **Dragging** | **Deprecated** — do not use | ✅ Full drag support via `is_draggable()` |
//! | **Nesting** | Children rendered inside panel | Panels are top-level, not nested |
//! | **Use case** | Group buttons/text inside one window pane | Moveable OS-style desktop windows |
//!
//! **Rule of thumb**: Use `ui::Panel` to lay out the interior of a window.
//! Use `panel_manager::PanelManager` (added to `World` via `world.add_ui`) to manage the windows themselves.
//!
//! # Architecture: Dual Coordinate Systems & Hit-Testing Rules
//!
//! RustedEngine supports two distinct UI coordinate systems when virtual resolution is active:
//!
//! 1. **Virtual Space (`0..vw, 0..vh`) — Non-Text Widgets (`is_text_layer() == false`)**:
//!    - Used by [`Panel`], [`Image`], [`Button`], [`ProgressBar`], [`TextField`].
//!    - Rendered into the Virtual Render Target (`SceneRenderTarget`, `vrt.target`) using a virtual Camera2D (`0..vw, 0..vh`).
//!    - Mouse hit-testing MUST use `ctx.input.mouse_position()`, which converts physical screen coordinates into virtual space `(x - ox) / scale`.
//!
//! 2. **Native Screen Space — Text Layer Widgets (`is_text_layer() == true`)**:
//!    - Used by [`Text`] and [`TextLog`].
//!    - Rendered directly to the physical window framebuffer after VRT blitting to ensure TTF fonts are rasterized at native screen pixel density.
//!    - Resolved geometry uses [`get_ui_scale()`]: `pos = position * scale + get_draw_offset() * scale + ui_offset`, `size = size * scale`, `font_size = font_size * scale`.
//!    - Mouse hit-testing MUST use raw OS screen coordinates (`macroquad::input::mouse_position()`) compared against `real_screen_rect()` (`position * scale + ui_offset`, `size * scale`).

pub mod button;
pub mod core;
pub mod image;

#[macro_use]
pub mod layout;

pub mod panel;
pub mod progress_bar;
pub mod text;
pub mod text_field;
pub mod text_log;
pub mod widgets;

#[cfg(test)]
mod tests;

pub use button::*;
pub use core::*;
pub use image::*;
pub use layout::*;
pub use panel::*;
pub use progress_bar::*;
pub use text::*;
pub use text_field::*;
pub use text_log::*;
pub use widgets::*;
