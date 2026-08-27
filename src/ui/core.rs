//! Core UI utilities, coordinate resolution, clipping scissors, scale management, and box-model primitives.

use std::cell::RefCell;
use macroquad::{
    color::Color,
    math::{Rect, Vec2, vec2},
    texture::{DrawTextureParams, Texture2D, draw_texture_ex},
};

thread_local! {
    static SCISSOR_STACK: RefCell<Vec<Rect>> = const { RefCell::new(Vec::new()) };
}

fn intersect_rects(r1: Rect, r2: Rect) -> Rect {
    let x1 = r1.x.max(r2.x);
    let y1 = r1.y.max(r2.y);
    let x2 = (r1.x + r1.w).min(r2.x + r2.w);
    let y2 = (r1.y + r1.h).min(r2.y + r2.h);
    let w = (x2 - x1).max(0.0);
    let h = (y2 - y1).max(0.0);
    Rect { x: x1, y: y1, w, h }
}

fn apply_gl_scissor(clip: Option<Rect>) {
    let gl = unsafe { macroquad::window::get_internal_gl() };
    let dpi = macroquad::window::screen_dpi_scale();
    if let Some(rect) = clip {
        let x = (rect.x * dpi) as i32;
        let y = (rect.y * dpi) as i32;
        let w = (rect.w.max(0.0) * dpi) as i32;
        let h = (rect.h.max(0.0) * dpi) as i32;
        gl.quad_gl.scissor(Some((x, y, w, h)));
    } else {
        gl.quad_gl.scissor(None);
    }
}

/// RAII guard for pushing and automatically popping an OpenGL scissor clipping rectangle.
/// Pops the scissor state when dropped, ensuring safety even in the event of early return or panic.
pub struct ScissorGuard;

impl ScissorGuard {
    /// Pushes `rect` clipped to current parent scissor rectangle and applies GL scissor.
    pub fn new(rect: Rect) -> Self {
        SCISSOR_STACK.with(|stack| {
            let mut stack = stack.borrow_mut();
            let parent = stack.last().copied();
            let clip = if let Some(p) = parent {
                intersect_rects(p, rect)
            } else {
                rect
            };
            stack.push(clip);
            apply_gl_scissor(Some(clip));
        });
        Self
    }
}

impl Drop for ScissorGuard {
    fn drop(&mut self) {
        SCISSOR_STACK.with(|stack| {
            let mut stack = stack.borrow_mut();
            stack.pop();
            let parent = stack.last().copied();
            apply_gl_scissor(parent);
        });
    }
}

thread_local! {
    static DRAW_OFFSET_STACK: RefCell<Vec<Vec2>> = const { RefCell::new(Vec::new()) };
}

pub fn push_draw_offset(offset: Vec2) {
    DRAW_OFFSET_STACK.with(|stack| {
        let mut stack = stack.borrow_mut();
        let current = stack.last().copied().unwrap_or(Vec2::ZERO);
        stack.push(current + offset);
    });
}

pub fn pop_draw_offset() {
    DRAW_OFFSET_STACK.with(|stack| {
        stack.borrow_mut().pop();
    });
}

pub fn get_draw_offset() -> Vec2 {
    DRAW_OFFSET_STACK.with(|stack| stack.borrow().last().copied().unwrap_or(Vec2::ZERO))
}

thread_local! {
    static UI_SCALE: std::cell::Cell<(f32, Vec2)> = const { std::cell::Cell::new((1.0, Vec2::ZERO)) };
}

/// Sets the current UI text scale factor and screen-space offset (letterbox origin),
/// used by [`Text`](super::Text) and [`TextLog`](super::TextLog) to rasterize fonts at native screen pixel density
/// even when a virtual resolution pipeline is active. Called once per frame by
/// [`crate::engine::Engine::run`]; defaults to `(1.0, Vec2::ZERO)` (no-op) when no
/// virtual resolution is configured.
pub fn set_ui_scale(scale: f32, offset: Vec2) {
    UI_SCALE.with(|s| s.set((scale, offset)));
}

/// Returns the current `(scale, offset)` set by [`set_ui_scale`].
pub fn get_ui_scale() -> (f32, Vec2) {
    UI_SCALE.with(|s| s.get())
}

thread_local! {
    /// Virtual resolution override set by `Engine::with_virtual_resolution`.
    /// When `Some((w, h))`, `safe_screen_*` returns virtual dimensions instead of real screen.
    static VIRTUAL_RES: RefCell<Option<(f32, f32)>> = const { RefCell::new(None) };
}

/// Sets the virtual resolution used by `safe_screen_*` helpers this frame.
/// Called by [`Engine`](crate::engine::Engine) when `with_virtual_resolution` is active.
pub(crate) fn set_virtual_resolution(w: f32, h: f32) {
    VIRTUAL_RES.with(|r| *r.borrow_mut() = Some((w, h)));
}

pub fn safe_screen_width() -> f32 {
    if cfg!(test) {
        800.0
    } else {
        VIRTUAL_RES.with(|r| r.borrow().map(|(w, _)| w).unwrap_or_else(macroquad::window::screen_width))
    }
}

pub fn safe_screen_height() -> f32 {
    if cfg!(test) {
        600.0
    } else {
        VIRTUAL_RES.with(|r| r.borrow().map(|(_, h)| h).unwrap_or_else(macroquad::window::screen_height))
    }
}

/// Anchor alignment presets for positioning UI elements relative to screen boundaries (4K, 2K, 1080p, etc.).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum UIAnchor {
    #[default]
    TopLeft,
    TopCenter,
    TopRight,
    CenterLeft,
    Center,
    CenterRight,
    BottomLeft,
    BottomCenter,
    BottomRight,
}

impl UIAnchor {
    /// Computes top-left `Vec2` position for an element of `size` relative to current screen dimensions (`screen_width()` × `screen_height()`).
    /// The result is **rounded to whole virtual pixels** to prevent sub-pixel sampling artifacts when using [`FilterMode::Nearest`] textures.
    pub fn compute_position(&self, size: Vec2, padding: impl Into<Padding>) -> Vec2 {
        let p = padding.into();
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        let pos = match self {
            UIAnchor::TopLeft     => vec2(p.left, p.top),
            UIAnchor::TopCenter   => vec2((sw - size.x) * 0.5 + p.left - p.right, p.top),
            UIAnchor::TopRight    => vec2(sw - size.x - p.right, p.top),
            UIAnchor::CenterLeft  => vec2(p.left, (sh - size.y) * 0.5 + p.top - p.bottom),
            UIAnchor::Center      => vec2((sw - size.x) * 0.5 + p.left - p.right, (sh - size.y) * 0.5 + p.top - p.bottom),
            UIAnchor::CenterRight => vec2(sw - size.x - p.right, (sh - size.y) * 0.5 + p.top - p.bottom),
            UIAnchor::BottomLeft  => vec2(p.left, sh - size.y - p.bottom),
            UIAnchor::BottomCenter=> vec2((sw - size.x) * 0.5 + p.left - p.right, sh - size.y - p.bottom),
            UIAnchor::BottomRight => vec2(sw - size.x - p.right, sh - size.y - p.bottom),
        };
        vec2(pos.x.round(), pos.y.round())
    }

    /// Computes relative offset `Vec2(x, y)` inside `parent_size` for a child of `child_size` with `padding`.
    pub fn compute_offset(self, parent_size: Vec2, child_size: Vec2, padding: impl Into<Padding>) -> Vec2 {
        let p = padding.into();
        let avail_w = (parent_size.x - p.left - p.right).max(0.0);
        let avail_h = (parent_size.y - p.top - p.bottom).max(0.0);

        let (rx, ry) = match self {
            UIAnchor::TopLeft => (0.0, 0.0),
            UIAnchor::TopCenter => ((avail_w - child_size.x) * 0.5, 0.0),
            UIAnchor::TopRight => (avail_w - child_size.x, 0.0),
            UIAnchor::CenterLeft => (0.0, (avail_h - child_size.y) * 0.5),
            UIAnchor::Center => ((avail_w - child_size.x) * 0.5, (avail_h - child_size.y) * 0.5),
            UIAnchor::CenterRight => (avail_w - child_size.x, (avail_h - child_size.y) * 0.5),
            UIAnchor::BottomLeft => (0.0, avail_h - child_size.y),
            UIAnchor::BottomCenter => ((avail_w - child_size.x) * 0.5, avail_h - child_size.y),
            UIAnchor::BottomRight => (avail_w - child_size.x, avail_h - child_size.y),
        };

        vec2(p.left + rx, p.top + ry)
    }
}

/// Layout padding container for UI element margins and anchor offsets (left, top, right, bottom).
#[derive(Clone, Copy, Debug, PartialEq, Default)]
pub struct Padding {
    pub left: f32,
    pub top: f32,
    pub right: f32,
    pub bottom: f32,
}

impl Padding {
    /// Zero padding on all sides (`0.0`).
    pub fn zero() -> Self {
        Self::default()
    }

    /// Creates [`Padding`] from any value convertible into `Padding` (`f32`, `(f32, f32)`, `(f32, f32, f32, f32)`).
    pub fn new(val: impl Into<Padding>) -> Self {
        val.into()
    }

    /// Uniform padding on all 4 sides (`val`).
    pub fn all(val: f32) -> Self {
        Self {
            left: val,
            top: val,
            right: val,
            bottom: val,
        }
    }

    /// Symmetric padding: `horizontal` (left/right) and `vertical` (top/bottom).
    pub fn symmetric(horizontal: f32, vertical: f32) -> Self {
        Self {
            left: horizontal,
            top: vertical,
            right: horizontal,
            bottom: vertical,
        }
    }

    /// Explicit padding for specific sides (`left`, `top`, `right`, `bottom`).
    pub fn only(left: f32, top: f32, right: f32, bottom: f32) -> Self {
        Self {
            left,
            top,
            right,
            bottom,
        }
    }

    pub fn only_top(val: f32) -> Self { Self { top: val, ..Default::default() } }
    pub fn only_bottom(val: f32) -> Self { Self { bottom: val, ..Default::default() } }
    pub fn only_left(val: f32) -> Self { Self { left: val, ..Default::default() } }
    pub fn only_right(val: f32) -> Self { Self { right: val, ..Default::default() } }
}

impl From<Margin> for Padding {
    fn from(m: Margin) -> Self {
        Padding { left: m.left, top: m.top, right: m.right, bottom: m.bottom }
    }
}

impl From<Padding> for Margin {
    fn from(p: Padding) -> Self {
        Margin { left: p.left, top: p.top, right: p.right, bottom: p.bottom }
    }
}

impl From<f32> for Padding {
    fn from(val: f32) -> Self {
        Padding::all(val)
    }
}

impl From<Vec2> for Padding {
    fn from(v: Vec2) -> Self {
        Padding::symmetric(v.x, v.y)
    }
}

impl From<(f32, f32)> for Padding {
    fn from((h, v): (f32, f32)) -> Self {
        Padding::symmetric(h, v)
    }
}

impl From<(f32, f32, f32, f32)> for Padding {
    fn from((l, t, r, b): (f32, f32, f32, f32)) -> Self {
        Padding::only(l, t, r, b)
    }
}

/// Ergonomic constructor function for [`Padding`].
pub fn padding(val: impl Into<Padding>) -> Padding {
    val.into()
}

/// Legacy alias for [`padding`].
#[deprecated(since = "0.5.0", note = "Use `padding()` or `Padding::new()` instead")]
pub fn padd(val: impl Into<Padding>) -> Padding {
    val.into()
}

/// External margin spacing box model helper for UI components and layouts.
#[derive(Clone, Copy, Debug, PartialEq, Default)]
pub struct Margin {
    pub left: f32,
    pub top: f32,
    pub right: f32,
    pub bottom: f32,
}

impl Margin {
    /// Zero margin on all sides.
    pub fn zero() -> Self {
        Self::default()
    }

    /// Creates [`Margin`] from any value convertible into `Margin` (`f32`, `(f32, f32)`, `(f32, f32, f32, f32)`).
    pub fn new(val: impl Into<Margin>) -> Self {
        val.into()
    }

    /// Creates uniform margin for all 4 sides (`top`, `bottom`, `left`, `right`).
    pub fn all(val: f32) -> Self {
        Self { left: val, top: val, right: val, bottom: val }
    }

    /// Creates symmetric horizontal and vertical margin.
    pub fn symmetric(horizontal: f32, vertical: f32) -> Self {
        Self { left: horizontal, top: vertical, right: horizontal, bottom: vertical }
    }

    /// Creates explicit margin for each side (`left`, `top`, `right`, `bottom`).
    pub fn only(left: f32, top: f32, right: f32, bottom: f32) -> Self {
        Self { left, top, right, bottom }
    }

    pub fn only_top(val: f32) -> Self { Self { top: val, ..Default::default() } }
    pub fn only_bottom(val: f32) -> Self { Self { bottom: val, ..Default::default() } }
    pub fn only_left(val: f32) -> Self { Self { left: val, ..Default::default() } }
    pub fn only_right(val: f32) -> Self { Self { right: val, ..Default::default() } }
}

/// Ergonomic constructor function for [`Margin`].
pub fn margin(val: impl Into<Margin>) -> Margin {
    val.into()
}

impl From<f32> for Margin {
    fn from(val: f32) -> Self { Margin::all(val) }
}
impl From<(f32, f32)> for Margin {
    fn from((h, v): (f32, f32)) -> Self { Margin::symmetric(h, v) }
}
impl From<(f32, f32, f32, f32)> for Margin {
    fn from((l, t, r, b): (f32, f32, f32, f32)) -> Self { Margin::only(l, t, r, b) }
}

/// Renders a 9-patch texture unscaled at corners (1:1 scale) while stretching edges and center to fit `size`.
pub fn draw_nine_slice(
    texture: &Texture2D,
    pos: Vec2,
    size: Vec2,
    margins: (f32, f32, f32, f32),
    tint: Color,
) {
    let (l, r, t, b) = margins;
    let tw = texture.width();
    let th = texture.height();

    let src_l = l.min(tw * 0.5);
    let src_r = r.min(tw * 0.5);
    let src_t = t.min(th * 0.5);
    let src_b = b.min(th * 0.5);

    let src_mid_w = (tw - src_l - src_r).max(0.0);
    let src_mid_h = (th - src_t - src_b).max(0.0);

    let dest_mid_w = (size.x - src_l - src_r).max(0.0);
    let dest_mid_h = (size.y - src_t - src_b).max(0.0);

    let src_xs = [0.0, src_l, tw - src_r];
    let src_ys = [0.0, src_t, th - src_b];
    let src_ws = [src_l, src_mid_w, src_r];
    let src_hs = [src_t, src_mid_h, src_b];

    let dest_xs = [pos.x, pos.x + src_l, pos.x + size.x - src_r];
    let dest_ys = [pos.y, pos.y + src_t, pos.y + size.y - src_b];
    let dest_ws = [src_l, dest_mid_w, src_r];
    let dest_hs = [src_t, dest_mid_h, src_b];

    for row in 0..3 {
        for col in 0..3 {
            if src_ws[col] <= 0.0 || src_hs[row] <= 0.0 || dest_ws[col] <= 0.0 || dest_hs[row] <= 0.0 {
                continue;
            }
            let src = Rect::new(src_xs[col], src_ys[row], src_ws[col], src_hs[row]);
            let dest = vec2(dest_ws[col], dest_hs[row]);
            draw_texture_ex(
                texture,
                dest_xs[col],
                dest_ys[row],
                tint,
                DrawTextureParams {
                    source: Some(src),
                    dest_size: Some(dest),
                    ..Default::default()
                },
            );
        }
    }
}
