use macroquad::time::{get_fps, get_frame_time, get_time};

/// Delta time and frame rate query provider.
pub struct Time {}

impl Time {
    /// Creates a new [`Time`] instance.
    pub fn new() -> Self {
        Self {}
    }

    /// Returns the frame delta time in seconds.
    pub fn deltatime(&self) -> f32 {
        get_frame_time()
    }

    /// Returns the current frames-per-second (FPS) counter.
    pub fn fps(&self) -> i32 {
        get_fps()
    }

    /// Returns total elapsed application time in seconds since start.
    pub fn elapsed_time(&self) -> f64 {
        get_time()
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
}

impl Timer {
    /// Creates a new [`Timer`] with specified duration in seconds and repeat settings.
    pub fn new(duration: f32, repeating: bool) -> Self {
        Self {
            duration,
            time_left: duration,
            repeating,
        }
    }

    /// Updates the timer countdown by `dt` delta seconds.
    pub fn update(&mut self, dt: f32) {
        if self.time_left > 0.0 {
            self.time_left -= dt;
            if self.time_left <= 0.0 {
                if self.repeating {
                    self.time_left += self.duration;
                } else {
                    self.time_left = 0.0;
                }
            }
        }
    }

    /// Returns `true` if the timer countdown has expired.
    pub fn is_ready(&self) -> bool {
        self.time_left <= 0.0
    }

    /// Resets the timer back to its initial duration.
    pub fn reset(&mut self) {
        self.time_left = self.duration;
    }

    /// Returns the normalized progress ratio (`0.0` .. `1.0`).
    pub fn progress(&self) -> f32 {
        if self.duration <= 0.0 {
            1.0
        } else {
            (1.0 - (self.time_left / self.duration)).clamp(0.0, 1.0)
        }
    }
}