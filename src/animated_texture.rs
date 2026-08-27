//! Animated texture component ([`AnimatedSprite`]) for frame sequences and retro pseudo-video playback.

use macroquad::{
    color::{Color, WHITE},
    math::{Rect, Vec2},
    texture::{DrawTextureParams, Texture2D, draw_texture_ex},
};

use crate::{engine::Context, object::Clickable, world::Object};

/// 2D Animated sprite component for playing multi-frame texture sequences.
pub struct AnimatedSprite {
    pub position: Vec2,
    pub size: Vec2,
    pub rotation: f32,
    pub color: Color,
    pub frames: Vec<Texture2D>,
    pub fps: f32,
    pub looping: bool,
    current_frame: usize,
    frame_timer: f32,
    pub playing: bool,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl AnimatedSprite {
    /// Creates an empty [`AnimatedSprite`].
    pub fn empty() -> Self {
        Self {
            position: Vec2::ZERO,
            size: Vec2::ZERO,
            rotation: 0.0,
            color: WHITE,
            frames: Vec::new(),
            fps: 12.0,
            looping: true,
            current_frame: 0,
            frame_timer: 0.0,
            playing: true,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Creates an [`AnimatedSprite`] from a list of texture frames with native size based on first frame.
    pub fn from_frames(frames: Vec<Texture2D>) -> Self {
        let size = if let Some(first) = frames.first() {
            macroquad::math::vec2(first.width(), first.height())
        } else {
            Vec2::ZERO
        };
        Self {
            position: Vec2::ZERO,
            size,
            rotation: 0.0,
            color: WHITE,
            frames,
            fps: 12.0,
            looping: true,
            current_frame: 0,
            frame_timer: 0.0,
            playing: true,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Creates a new [`AnimatedSprite`] with the provided texture frames and playback speed (FPS).
    pub fn new(position: Vec2, size: Vec2, frames: Vec<Texture2D>, fps: f32) -> Self {
        Self {
            position,
            size,
            rotation: 0.0,
            color: WHITE,
            frames,
            fps: if fps > 0.0 { fps } else { 12.0 },
            looping: true,
            current_frame: 0,
            frame_timer: 0.0,
            playing: true,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Sets explicit position `(x, y)`.
    pub fn with_position(mut self, position: Vec2) -> Self {
        self.position = position;
        self
    }

    /// Builder pattern: Sets explicit position `(x, y)` (alias for [`with_position`](AnimatedSprite::with_position)).
    pub fn with_pos(self, pos: Vec2) -> Self {
        self.with_position(pos)
    }

    /// Builder pattern: Sets explicit size `(width, height)`.
    pub fn with_size(mut self, size: Vec2) -> Self {
        self.size = size;
        self
    }

    /// Builder pattern: Sets position and size from a [`Rect`].
    pub fn with_rect(mut self, rect: Rect) -> Self {
        self.position = macroquad::math::vec2(rect.x, rect.y);
        self.size = macroquad::math::vec2(rect.w, rect.h);
        self
    }

    /// Builder pattern: Sets playback speed (FPS).
    pub fn with_fps(mut self, fps: f32) -> Self {
        self.fps = if fps > 0.0 { fps } else { 12.0 };
        self
    }

    /// Builder pattern: Sets rotation in radians.
    pub fn with_rotation(mut self, rotation: f32) -> Self {
        self.rotation = rotation;
        self
    }

    /// Builder pattern: Sets tint color.
    pub fn with_color(mut self, color: Color) -> Self {
        self.color = color;
        self
    }

    /// Builder pattern: Sets entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Sets whether the animation loops when reaching the end.
    pub fn with_looping(mut self, looping: bool) -> Self {
        self.looping = looping;
        self
    }

    /// Builder pattern: Sets component to hidden (`visible = false`).
    pub fn hidden(mut self) -> Self {
        self.visible = false;
        self
    }

    /// Builder pattern: Sets component to deactivated (`active = false`).
    pub fn deactivated(mut self) -> Self {
        self.active = false;
        self
    }

    /// Builder pattern: Sets component to deactivated (`active = false`) (alias).
    #[deprecated(since = "0.5.0", note = "Use `deactivated()` instead (typo fix)")]
    pub fn desactivated(self) -> Self {
        self.deactivated()
    }

    /// Builder pattern: Sets visibility.
    pub fn with_visible(mut self, visible: bool) -> Self {
        self.visible = visible;
        self
    }

    /// Builder pattern: Sets active state.
    pub fn with_active(mut self, active: bool) -> Self {
        self.active = active;
        self
    }

    /// Returns `true` if animated sprite is visible.
    pub fn is_visible(&self) -> bool {
        self.visible
    }

    /// Returns `true` if animated sprite is active.
    pub fn is_active(&self) -> bool {
        self.active
    }

    /// Starts or resumes animation playback.
    pub fn play(&mut self) {
        self.playing = true;
    }

    /// Pauses animation playback at the current frame.
    pub fn pause(&mut self) {
        self.playing = false;
    }

    /// Stops animation playback and resets back to frame 0.
    pub fn stop(&mut self) {
        self.playing = false;
        self.current_frame = 0;
        self.frame_timer = 0.0;
    }

    /// Resets animation playback to frame 0 while preserving `playing` state.
    pub fn reset(&mut self) {
        self.current_frame = 0;
        self.frame_timer = 0.0;
    }

    /// Returns `true` if a non-looping animation has reached its final frame and stopped.
    pub fn is_finished(&self) -> bool {
        !self.looping && !self.playing && self.current_frame + 1 >= self.frames.len()
    }

    /// Returns the current zero-based frame index.
    pub fn current_frame(&self) -> usize {
        self.current_frame
    }

    /// Manually sets the current frame index.
    pub fn set_frame(&mut self, index: usize) {
        if !self.frames.is_empty() {
            self.current_frame = index.min(self.frames.len() - 1);
            self.frame_timer = 0.0;
        }
    }

    /// Returns the bounding rectangle.
    pub fn rect(&self) -> Rect {
        Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        }
    }
}

impl Clickable for AnimatedSprite {
    fn click_rect(&self) -> Rect {
        self.rect()
    }
    fn is_active(&self) -> bool {
        self.active
    }
}

impl Object for AnimatedSprite {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active || !self.playing || self.frames.is_empty() {
            return;
        }

        let frame_duration = 1.0 / self.fps.max(0.001);
        self.frame_timer += ctx.time.deltatime();

        while self.frame_timer >= frame_duration {
            self.frame_timer -= frame_duration;
            if self.current_frame + 1 < self.frames.len() {
                self.current_frame += 1;
            } else if self.looping {
                self.current_frame = 0;
            } else {
                self.playing = false;
                self.frame_timer = 0.0;
                break;
            }
        }
    }

    fn draw(&self) {
        if !self.visible || self.frames.is_empty() {
            return;
        }
        let pos = self.position + crate::ui::get_draw_offset();
        let texture = &self.frames[self.current_frame];
        draw_texture_ex(
            texture,
            pos.x,
            pos.y,
            self.color,
            DrawTextureParams {
                dest_size: Some(self.size),
                rotation: self.rotation,
                ..Default::default()
            },
        );
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn set_position(&mut self, pos: Vec2) {
        self.position = pos;
    }

    fn set_size(&mut self, size: Vec2) {
        self.size = size;
    }

    fn bounds(&self) -> Option<Rect> {
        Some(self.rect())
    }
}

impl Default for AnimatedSprite {
    fn default() -> Self {
        Self::empty()
    }
}
