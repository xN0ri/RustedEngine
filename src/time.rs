use macroquad::time::{get_fps, get_frame_time, get_time};

pub struct Time {}

impl Time {
    pub fn new() -> Self {
        Self {}
    }

    pub fn deltatime(&self) -> f32 {
        get_frame_time()
    }

    pub fn fps(&self) -> i32 {
        get_fps()
    }

    pub fn elapsed_time(&self) -> f64 {
        get_time()
    }
}

impl Default for Time {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Clone, Debug)]
pub struct Timer {
    pub duration: f32,
    time_left: f32,
    pub repeating: bool,
}

impl Timer {
    pub fn new(duration: f32, repeating: bool) -> Self {
        Self {
            duration,
            time_left: duration,
            repeating,
        }
    }

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

    pub fn is_ready(&self) -> bool {
        self.time_left <= 0.0
    }

    pub fn reset(&mut self) {
        self.time_left = self.duration;
    }

    pub fn progress(&self) -> f32 {
        if self.duration <= 0.0 {
            1.0
        } else {
            (1.0 - (self.time_left / self.duration)).clamp(0.0, 1.0)
        }
    }
}