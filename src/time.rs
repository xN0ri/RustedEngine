use macroquad::time::{get_fps, get_frame_time, get_time};

/// Delta time and frame rate query provider supporting time scaling and pause state.
#[derive(Clone, Debug)]
pub struct Time {
    time_scale: f32,
    paused: bool,
}

impl Time {
    /// Creates a new [`Time`] instance with default `time_scale = 1.0` and `paused = false`.
    pub fn new() -> Self {
        Self {
            time_scale: 1.0,
            paused: false,
        }
    }

    /// Returns the scaled frame delta time in seconds. Returns `0.0` when paused.
    pub fn deltatime(&self) -> f32 {
        if self.paused {
            0.0
        } else {
            self.raw_deltatime() * self.time_scale
        }
    }

    /// Returns the scaled frame delta time in seconds (alias for [`deltatime`](Time::deltatime)).
    pub fn delta_time(&self) -> f32 {
        self.deltatime()
    }

    /// Returns the unscaled frame delta time in seconds, unaffected by [`set_time_scale`](Time::set_time_scale) or pause state.
    ///
    /// Ideal for UI animations, debug metrics, and background loaders.
    pub fn raw_deltatime(&self) -> f32 {
        if cfg!(test) { 0.016 } else { get_frame_time() }
    }

    /// Returns the unscaled frame delta time in seconds (alias for [`raw_deltatime`](Time::raw_deltatime)).
    pub fn raw_delta_time(&self) -> f32 {
        self.raw_deltatime()
    }

    /// Returns the current simulation time scale multiplier (default `1.0`).
    pub fn time_scale(&self) -> f32 {
        self.time_scale
    }

    /// Sets the simulation time scale multiplier. Values are clamped to `>= 0.0`.
    /// Set `< 1.0` for slow-motion effects, or `> 1.0` for fast-forward.
    pub fn set_time_scale(&mut self, scale: f32) {
        self.time_scale = scale.max(0.0);
    }

    /// Returns whether game simulation updates are currently paused.
    pub fn is_paused(&self) -> bool {
        self.paused
    }

    /// Sets the pause state. When `true`, [`deltatime`](Time::deltatime) returns `0.0`.
    pub fn set_paused(&mut self, paused: bool) {
        self.paused = paused;
    }

    /// Toggles the pause state between `true` and `false`.
    pub fn toggle_pause(&mut self) {
        self.paused = !self.paused;
    }

    /// Returns the current frames-per-second (FPS) counter.
    pub fn fps(&self) -> i32 {
        if cfg!(test) { 60 } else { get_fps() }
    }

    /// Returns total elapsed application time in seconds since start.
    pub fn elapsed_time(&self) -> f64 {
        if cfg!(test) { 0.0 } else { get_time() }
    }
}

impl Default for Time {
    fn default() -> Self {
        Self::new()
    }
}

/// One-shot or repeating countdown timer struct.
#[derive(Clone, Debug)]
pub struct Timer {
    /// Duration of the timer in seconds.
    pub duration: f32,
    time_left: f32,
    /// Indicates whether the timer automatically restarts upon completion.
    pub repeating: bool,
    just_triggered: bool,
}

impl Timer {
    /// Creates a new [`Timer`] with specified duration in seconds and repeat settings.
    pub fn new(duration: f32, repeating: bool) -> Self {
        Self {
            duration,
            time_left: duration,
            repeating,
            just_triggered: false,
        }
    }

    /// Creates a non-repeating one-shot [`Timer`].
    pub fn once(duration: f32) -> Self {
        Self::new(duration, false)
    }

    /// Creates an automatically repeating [`Timer`].
    pub fn repeating(duration: f32) -> Self {
        Self::new(duration, true)
    }

    /// Updates the timer countdown by `dt` delta seconds.
    pub fn update(&mut self, dt: f32) {
        self.just_triggered = false;
        if self.time_left > 0.0 {
            self.time_left -= dt;
            if self.time_left <= 0.0 {
                self.just_triggered = true;
                if self.repeating {
                    self.time_left += self.duration;
                } else {
                    self.time_left = 0.0;
                }
            }
        }
    }

    /// Advances the timer countdown by `dt` seconds and returns `true` if the timer finished on this frame pass.
    ///
    /// Shorthand for calling `timer.update(dt)` followed by checking `timer.just_finished()`.
    pub fn tick(&mut self, dt: f32) -> bool {
        self.update(dt);
        self.just_triggered
    }

    /// Advances the timer countdown by `dt` seconds and executes `f` if the timer finished on this frame pass.
    /// Returns `true` if the callback was executed.
    pub fn tick_and_fire<F: FnOnce()>(&mut self, dt: f32, f: F) -> bool {
        let triggered = self.tick(dt);
        if triggered {
            f();
        }
        triggered
    }

    /// Returns `true` if the timer countdown has expired.
    pub fn is_ready(&self) -> bool {
        self.time_left <= 0.0
    }

    /// Returns `true` during the single frame pass when the timer countdown completed.
    pub fn just_finished(&self) -> bool {
        self.just_triggered
    }

    /// Resets the timer back to its initial duration.
    pub fn reset(&mut self) {
        self.time_left = self.duration;
        self.just_triggered = false;
    }

    /// Returns the normalized progress ratio (`0.0` .. `1.0`).
    pub fn progress(&self) -> f32 {
        if self.duration <= 0.0 {
            1.0
        } else {
            (1.0 - (self.time_left / self.duration)).clamp(0.0, 1.0)
        }
    }

    /// Returns the remaining time in seconds until the timer triggers.
    /// Returns `0.0` once the timer is ready.
    pub fn time_remaining(&self) -> f32 {
        self.time_left.max(0.0)
    }

    /// Changes the timer's duration and resets it to the new duration.
    /// Useful for difficulty scaling or dynamic timing adjustments at runtime.
    pub fn set_duration(&mut self, new_duration: f32) {
        self.duration = new_duration;
        self.time_left = new_duration;
        self.just_triggered = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_time_scaling_and_pausing() {
        let mut t = Time::new();
        assert_eq!(t.time_scale(), 1.0);
        assert!(!t.is_paused());
        assert_eq!(t.deltatime(), 0.016);
        assert_eq!(t.raw_deltatime(), 0.016);

        t.set_time_scale(0.5);
        assert_eq!(t.deltatime(), 0.008);
        assert_eq!(t.raw_deltatime(), 0.016);

        t.set_paused(true);
        assert_eq!(t.deltatime(), 0.0);
        assert_eq!(t.raw_deltatime(), 0.016);

        t.toggle_pause();
        assert!(!t.is_paused());
        assert_eq!(t.deltatime(), 0.008);
    }
}
