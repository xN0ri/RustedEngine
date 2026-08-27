//! Animation tweening and easing utility.

/// Popular easing curve functions for smooth UI and object animations.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum Easing {
    #[default]
    Linear,
    EaseInQuad,
    EaseOutQuad,
    EaseInOutQuad,
    EaseInCubic,
    EaseOutCubic,
    EaseInOutCubic,
    EaseInQuart,
    EaseOutQuart,
    EaseInOutQuart,
    EaseInBounce,
    EaseOutBounce,
}

impl Easing {
    /// Evaluates the easing curve for normalized time `t` (0.0 ..= 1.0).
    pub fn evaluate(self, t: f32) -> f32 {
        let t = t.clamp(0.0, 1.0);
        match self {
            Easing::Linear => t,
            Easing::EaseInQuad => t * t,
            Easing::EaseOutQuad => t * (2.0 - t),
            Easing::EaseInOutQuad => {
                if t < 0.5 {
                    2.0 * t * t
                } else {
                    -1.0 + (4.0 - 2.0 * t) * t
                }
            }
            Easing::EaseInCubic => t * t * t,
            Easing::EaseOutCubic => {
                let p = t - 1.0;
                p * p * p + 1.0
            }
            Easing::EaseInOutCubic => {
                if t < 0.5 {
                    4.0 * t * t * t
                } else {
                    let p = 2.0 * t - 2.0;
                    0.5 * p * p * p + 1.0
                }
            }
            Easing::EaseInQuart => t * t * t * t,
            Easing::EaseOutQuart => {
                let p = t - 1.0;
                1.0 - p * p * p * p
            }
            Easing::EaseInOutQuart => {
                if t < 0.5 {
                    8.0 * t * t * t * t
                } else {
                    let p = t - 1.0;
                    1.0 - 8.0 * p * p * p * p
                }
            }
            Easing::EaseInBounce => 1.0 - Easing::EaseOutBounce.evaluate(1.0 - t),
            Easing::EaseOutBounce => {
                let n1 = 7.5625;
                let d1 = 2.75;
                if t < 1.0 / d1 {
                    n1 * t * t
                } else if t < 2.0 / d1 {
                    let t_sub = t - 1.5 / d1;
                    n1 * t_sub * t_sub + 0.75
                } else if t < 2.5 / d1 {
                    let t_sub = t - 2.25 / d1;
                    n1 * t_sub * t_sub + 0.9375
                } else {
                    let t_sub = t - 2.625 / d1;
                    n1 * t_sub * t_sub + 0.984375
                }
            }
        }
    }
}

/// Generic scalar animation tween controller interpolating from `start` to `end`.
#[derive(Clone, Debug)]
pub struct Tween {
    pub start: f32,
    pub end: f32,
    pub duration: f32,
    pub elapsed: f32,
    pub easing: Easing,
    pub finished: bool,
}

impl Tween {
    /// Creates a new [`Tween`] interpolating from `start` to `end` over `duration` seconds.
    pub fn new(start: f32, end: f32, duration: f32, easing: Easing) -> Self {
        Self {
            start,
            end,
            duration,
            elapsed: 0.0,
            easing,
            finished: duration <= 0.0,
        }
    }

    /// Advances the tween countdown by `dt` seconds and returns current value.
    pub fn tick(&mut self, dt: f32) -> f32 {
        if self.finished {
            return self.end;
        }
        self.elapsed += dt;
        if self.elapsed >= self.duration {
            self.elapsed = self.duration;
            self.finished = true;
        }
        self.value()
    }

    /// Returns the current interpolated value.
    pub fn value(&self) -> f32 {
        if self.duration <= 0.0 {
            return self.end;
        }
        let t = (self.elapsed / self.duration).clamp(0.0, 1.0);
        let eased = self.easing.evaluate(t);
        self.start + (self.end - self.start) * eased
    }

    /// Returns normalized progress (`0.0` ..= `1.0`).
    pub fn progress(&self) -> f32 {
        if self.duration <= 0.0 {
            1.0
        } else {
            (self.elapsed / self.duration).clamp(0.0, 1.0)
        }
    }

    /// Returns `true` if the tween animation has finished.
    pub fn is_finished(&self) -> bool {
        self.finished
    }

    /// Resets the tween execution back to the beginning.
    pub fn reset(&mut self) {
        self.elapsed = 0.0;
        self.finished = self.duration <= 0.0;
    }

    /// Swaps start and end values and resets the timer.
    pub fn reverse(&mut self) {
        std::mem::swap(&mut self.start, &mut self.end);
        self.reset();
    }
}

// ---------------------------------------------------------------------------
// TweenVec2 — 2D Vector tween
// ---------------------------------------------------------------------------

/// 2D Vector tween controller interpolating a [`Vec2`](macroquad::math::Vec2) from `start` to `end`.
///
/// Internally uses two [`Tween`]s (one per axis) with the same duration and easing.
///
/// # Example
/// ```ignore
/// let mut t = TweenVec2::new(vec2(0.0, 0.0), vec2(100.0, 200.0), 1.0, Easing::EaseOutCubic);
/// // Each frame:
/// let pos = t.tick(ctx.dt());
/// sprite.position = pos;
/// ```
#[derive(Clone, Debug)]
pub struct TweenVec2 {
    pub x: Tween,
    pub y: Tween,
}

impl TweenVec2 {
    /// Creates a new [`TweenVec2`] interpolating from `start` to `end` over `duration` seconds.
    pub fn new(
        start: macroquad::math::Vec2,
        end: macroquad::math::Vec2,
        duration: f32,
        easing: Easing,
    ) -> Self {
        Self {
            x: Tween::new(start.x, end.x, duration, easing),
            y: Tween::new(start.y, end.y, duration, easing),
        }
    }

    /// Advances the tween by `dt` seconds and returns the current interpolated [`Vec2`](macroquad::math::Vec2).
    pub fn tick(&mut self, dt: f32) -> macroquad::math::Vec2 {
        macroquad::math::vec2(self.x.tick(dt), self.y.tick(dt))
    }

    /// Returns the current interpolated [`Vec2`](macroquad::math::Vec2) without advancing.
    pub fn value(&self) -> macroquad::math::Vec2 {
        macroquad::math::vec2(self.x.value(), self.y.value())
    }

    /// Returns normalized progress (`0.0` ..= `1.0`).
    pub fn progress(&self) -> f32 {
        self.x.progress()
    }

    /// Returns `true` if both axis tweens have finished.
    pub fn is_finished(&self) -> bool {
        self.x.finished && self.y.finished
    }

    /// Resets both axis tweens back to the beginning.
    pub fn reset(&mut self) {
        self.x.reset();
        self.y.reset();
    }

    /// Swaps start/end values and resets the timer (reverses direction).
    pub fn reverse(&mut self) {
        self.x.reverse();
        self.y.reverse();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tween_linear() {
        let mut tw = Tween::new(0.0, 100.0, 2.0, Easing::Linear);
        assert_eq!(tw.value(), 0.0);
        assert!(!tw.finished);

        let v = tw.tick(1.0);
        assert_eq!(v, 50.0);
        assert!(!tw.finished);

        let v2 = tw.tick(1.0);
        assert_eq!(v2, 100.0);
        assert!(tw.finished);
    }
}
