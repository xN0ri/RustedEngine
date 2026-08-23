//! 2D game mathematics extension traits and smoothing utilities.

use macroquad::math::{Vec2, vec2};

/// Extension trait adding 2D game vector mathematics helpers to [`Vec2`].
pub trait Vec2Ext {
    /// Returns the normalized 2D direction vector pointing from `self` toward `target`.
    fn dir_to(self, target: Vec2) -> Vec2;

    /// Returns the Euclidean distance between `self` and `target`.
    fn dist_to(self, target: Vec2) -> f32;

    /// Returns the angle in radians pointing from `self` toward `target`.
    fn angle_to(self, target: Vec2) -> f32;

    /// Returns `self` rotated by `angle_radians`.
    fn rotated(self, angle_radians: f32) -> Vec2;

    /// Clamps vector magnitude to `max` without altering its direction.
    fn clamp_len(self, max: f32) -> Vec2;

    /// Moves `self` toward `target` by at most `max_delta` units.
    fn move_towards(self, target: Vec2, max_delta: f32) -> Vec2;

    /// Returns the 90-degree counter-clockwise perpendicular normal vector `(-y, x)`.
    fn perpendicular(self) -> Vec2;

    /// Projects `self` onto `target`.
    fn project_onto(self, target: Vec2) -> Vec2;

    /// Reflects `self` off a surface with the given `normal` vector.
    fn reflect(self, normal: Vec2) -> Vec2;

    /// Returns the angle in radians between `self` and `target`.
    fn angle_between(self, target: Vec2) -> f32;
}

impl Vec2Ext for Vec2 {
    fn dir_to(self, target: Vec2) -> Vec2 {
        let diff = target - self;
        if diff.length_squared() > 0.0 {
            diff.normalize()
        } else {
            Vec2::ZERO
        }
    }

    fn dist_to(self, target: Vec2) -> f32 {
        self.distance(target)
    }

    fn angle_to(self, target: Vec2) -> f32 {
        let diff = target - self;
        diff.y.atan2(diff.x)
    }

    fn rotated(self, angle_radians: f32) -> Vec2 {
        let cos = angle_radians.cos();
        let sin = angle_radians.sin();
        Vec2::new(self.x * cos - self.y * sin, self.x * sin + self.y * cos)
    }

    fn clamp_len(self, max: f32) -> Vec2 {
        let len_sq = self.length_squared();
        if len_sq > max * max && len_sq > 0.0 {
            self * (max / len_sq.sqrt())
        } else {
            self
        }
    }

    fn move_towards(self, target: Vec2, max_delta: f32) -> Vec2 {
        let diff = target - self;
        let dist = diff.length();
        if dist <= max_delta || dist <= f32::EPSILON {
            target
        } else {
            self + diff / dist * max_delta
        }
    }

    fn perpendicular(self) -> Vec2 {
        vec2(-self.y, self.x)
    }

    fn project_onto(self, target: Vec2) -> Vec2 {
        let target_len_sq = target.length_squared();
        if target_len_sq <= f32::EPSILON {
            Vec2::ZERO
        } else {
            target * (self.dot(target) / target_len_sq)
        }
    }

    fn reflect(self, normal: Vec2) -> Vec2 {
        self - normal * (2.0 * self.dot(normal))
    }

    fn angle_between(self, target: Vec2) -> f32 {
        let dot = self.dot(target);
        let len_prod = self.length() * target.length();
        if len_prod <= f32::EPSILON {
            0.0
        } else {
            (dot / len_prod).clamp(-1.0, 1.0).acos()
        }
    }
}

// ---------------------------------------------------------------------------
// Smooth Damping (Spring physics smoothing)
// ---------------------------------------------------------------------------

/// Smoothly interpolates `current` toward `target` using a critically-damped spring (similar to Unity's `SmoothDamp`).
///
/// Updates `current_velocity` in place and guarantees smooth convergence with zero overshoot.
pub fn smooth_damp(
    current: f32,
    target: f32,
    current_velocity: &mut f32,
    smooth_time: f32,
    max_speed: f32,
    dt: f32,
) -> f32 {
    let smooth_time = smooth_time.max(0.0001);
    let omega = 2.0 / smooth_time;

    let x = omega * dt;
    let exp = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x);

    let mut change = current - target;
    let original_to = target;

    // Clamp maximum speed
    let max_change = max_speed * smooth_time;
    change = change.clamp(-max_change, max_change);
    let target = current - change;

    let temp = (*current_velocity + omega * change) * dt;
    *current_velocity = (*current_velocity - omega * temp) * exp;
    let mut output = target + (change + temp) * exp;

    // Prevent overshooting target
    if (original_to - current > 0.0) == (output > original_to) {
        output = original_to;
        *current_velocity = (output - original_to) / dt;
    }

    output
}

/// 2D Vector smooth damping using a critically-damped spring.
pub fn smooth_damp_vec2(
    current: Vec2,
    target: Vec2,
    current_velocity: &mut Vec2,
    smooth_time: f32,
    max_speed: f32,
    dt: f32,
) -> Vec2 {
    let mut vx = current_velocity.x;
    let mut vy = current_velocity.y;

    let x = smooth_damp(current.x, target.x, &mut vx, smooth_time, max_speed, dt);
    let y = smooth_damp(current.y, target.y, &mut vy, smooth_time, max_speed, dt);

    current_velocity.x = vx;
    current_velocity.y = vy;

    vec2(x, y)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vec2_ext_methods() {
        let v = vec2(3.0, 4.0); // length = 5.0
        assert_eq!(v.clamp_len(3.0).length(), 3.0);
        assert_eq!(v.clamp_len(10.0), v);

        let p1 = vec2(0.0, 0.0);
        let p2 = vec2(10.0, 0.0);
        assert_eq!(p1.move_towards(p2, 3.0), vec2(3.0, 0.0));
        assert_eq!(p1.move_towards(p2, 15.0), vec2(10.0, 0.0));

        let right = vec2(1.0, 0.0);
        assert_eq!(right.perpendicular(), vec2(0.0, 1.0));

        let diag = vec2(3.0, 3.0);
        assert_eq!(diag.project_onto(right), vec2(3.0, 0.0));

        let down_right = vec2(1.0, -1.0);
        let normal_up = vec2(0.0, 1.0);
        assert_eq!(down_right.reflect(normal_up), vec2(1.0, 1.0));
    }

    #[test]
    fn test_smooth_damp_convergence() {
        let mut val = 0.0;
        let target = 100.0;
        let mut vel = 0.0;

        for _ in 0..60 {
            val = smooth_damp(val, target, &mut vel, 0.1, 1000.0, 0.016);
        }

        assert!((val - target).abs() < 1.0);
    }
}
