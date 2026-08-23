//! 2D Geometric primitives, intersection tests, and continuous collision queries.

use macroquad::{
    color::Color,
    math::{Rect, Vec2, vec2},
    shapes::{draw_circle, draw_circle_lines, draw_line},
};

use crate::math::Vec2Ext;

// ---------------------------------------------------------------------------
// Circle
// ---------------------------------------------------------------------------

/// 2D Circle defined by center position and radius.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Circle {
    pub center: Vec2,
    pub radius: f32,
}

impl Circle {
    /// Creates a new [`Circle`] with given center and radius.
    pub const fn new(center: Vec2, radius: f32) -> Self {
        Self { center, radius }
    }

    /// Returns `true` if the point `p` is inside or on the boundary of the circle.
    pub fn contains(&self, p: Vec2) -> bool {
        self.center.distance_squared(p) <= self.radius * self.radius
    }

    /// Returns `true` if this circle overlaps or touches another circle.
    pub fn intersects_circle(&self, other: Circle) -> bool {
        let r_sum = self.radius + other.radius;
        self.center.distance_squared(other.center) <= r_sum * r_sum
    }

    /// Returns `true` if this circle overlaps with an axis-aligned bounding box ([`Rect`]).
    pub fn intersects_rect(&self, rect: Rect) -> bool {
        let closest_x = self.center.x.clamp(rect.x, rect.x + rect.w);
        let closest_y = self.center.y.clamp(rect.y, rect.y + rect.h);
        let closest_point = vec2(closest_x, closest_y);
        self.contains(closest_point)
    }

    /// Returns the minimal axis-aligned bounding box ([`Rect`]) enclosing this circle.
    pub fn bounding_box(&self) -> Rect {
        Rect::new(
            self.center.x - self.radius,
            self.center.y - self.radius,
            self.radius * 2.0,
            self.radius * 2.0,
        )
    }

    /// Renders a solid filled circle.
    pub fn draw(&self, color: Color) {
        draw_circle(self.center.x, self.center.y, self.radius, color);
    }

    /// Renders a hollow circle outline with specified line thickness.
    pub fn draw_lines(&self, thickness: f32, color: Color) {
        draw_circle_lines(self.center.x, self.center.y, self.radius, thickness, color);
    }
}

// ---------------------------------------------------------------------------
// Segment
// ---------------------------------------------------------------------------

/// 2D Line segment between points `a` and `b`.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Segment {
    pub a: Vec2,
    pub b: Vec2,
}

impl Segment {
    /// Creates a new [`Segment`] from endpoint `a` to endpoint `b`.
    pub const fn new(a: Vec2, b: Vec2) -> Self {
        Self { a, b }
    }

    /// Returns the Euclidean length of the segment.
    pub fn length(&self) -> f32 {
        self.a.distance(self.b)
    }

    /// Returns the squared Euclidean length of the segment.
    pub fn length_squared(&self) -> f32 {
        self.a.distance_squared(self.b)
    }

    /// Returns the normalized direction vector pointing from `a` toward `b`.
    pub fn direction(&self) -> Vec2 {
        self.a.dir_to(self.b)
    }

    /// Returns the closest point on this line segment to the arbitrary point `p`.
    pub fn closest_point(&self, p: Vec2) -> Vec2 {
        let ab = self.b - self.a;
        let ab_len_sq = ab.length_squared();
        if ab_len_sq <= f32::EPSILON {
            return self.a;
        }
        let t = ((p - self.a).dot(ab) / ab_len_sq).clamp(0.0, 1.0);
        self.a + ab * t
    }

    /// Returns the shortest Euclidean distance between this segment and point `p`.
    pub fn distance_to_point(&self, p: Vec2) -> f32 {
        self.closest_point(p).distance(p)
    }

    /// Returns `true` if this line segment intersects or touches the given [`Circle`].
    pub fn intersects_circle(&self, c: Circle) -> bool {
        self.distance_to_point(c.center) <= c.radius
    }

    /// Returns `true` if this line segment intersects an axis-aligned bounding box ([`Rect`]).
    pub fn intersects_rect(&self, rect: Rect) -> bool {
        // If either endpoint is inside the rect, it intersects
        if rect.contains(self.a) || rect.contains(self.b) {
            return true;
        }

        // Check against the 4 edges of the rectangle
        let top_left = vec2(rect.x, rect.y);
        let top_right = vec2(rect.x + rect.w, rect.y);
        let bottom_left = vec2(rect.x, rect.y + rect.h);
        let bottom_right = vec2(rect.x + rect.w, rect.y + rect.h);

        self.intersects_segment(Segment::new(top_left, top_right))
            .is_some()
            || self
                .intersects_segment(Segment::new(top_right, bottom_right))
                .is_some()
            || self
                .intersects_segment(Segment::new(bottom_right, bottom_left))
                .is_some()
            || self
                .intersects_segment(Segment::new(bottom_left, top_left))
                .is_some()
    }

    /// Returns the intersection point if this segment intersects `other`, or `None`.
    pub fn intersects_segment(&self, other: Segment) -> Option<Vec2> {
        let p = self.a;
        let r = self.b - self.a;
        let q = other.a;
        let s = other.b - other.a;

        let r_cross_s = r.x * s.y - r.y * s.x;
        let q_minus_p = q - p;
        let q_minus_p_cross_r = q_minus_p.x * r.y - q_minus_p.y * r.x;

        if r_cross_s.abs() <= f32::EPSILON {
            // Lines are collinear or parallel
            return None;
        }

        let t = (q_minus_p.x * s.y - q_minus_p.y * s.x) / r_cross_s;
        let u = q_minus_p_cross_r / r_cross_s;

        if (0.0..=1.0).contains(&t) && (0.0..=1.0).contains(&u) {
            Some(p + r * t)
        } else {
            None
        }
    }

    /// Renders the line segment with specified thickness and color.
    pub fn draw(&self, thickness: f32, color: Color) {
        draw_line(self.a.x, self.a.y, self.b.x, self.b.y, thickness, color);
    }
}

// ---------------------------------------------------------------------------
// Capsule
// ---------------------------------------------------------------------------

/// 2D Capsule (line segment with a radius / swept circle).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Capsule {
    pub a: Vec2,
    pub b: Vec2,
    pub radius: f32,
}

impl Capsule {
    /// Creates a new [`Capsule`] from segment endpoints `a`, `b` and cylinder `radius`.
    pub const fn new(a: Vec2, b: Vec2, radius: f32) -> Self {
        Self { a, b, radius }
    }

    /// Returns the core centerline segment of the capsule.
    pub const fn segment(&self) -> Segment {
        Segment::new(self.a, self.b)
    }

    /// Returns `true` if point `p` is inside or on the boundary of the capsule.
    pub fn contains(&self, p: Vec2) -> bool {
        self.segment().distance_to_point(p) <= self.radius
    }

    /// Returns `true` if this capsule intersects the given [`Circle`].
    pub fn intersects_circle(&self, c: Circle) -> bool {
        self.segment().distance_to_point(c.center) <= (self.radius + c.radius)
    }

    /// Renders a solid capsule (two endpoint circles and connecting thick line).
    pub fn draw(&self, color: Color) {
        draw_circle(self.a.x, self.a.y, self.radius, color);
        draw_circle(self.b.x, self.b.y, self.radius, color);
        draw_line(self.a.x, self.a.y, self.b.x, self.b.y, self.radius * 2.0, color);
    }

    /// Renders the wireframe outline of the capsule.
    pub fn draw_lines(&self, thickness: f32, color: Color) {
        draw_circle_lines(self.a.x, self.a.y, self.radius, thickness, color);
        draw_circle_lines(self.b.x, self.b.y, self.radius, thickness, color);
        let normal = (self.b - self.a).perpendicular().normalize() * self.radius;
        draw_line(self.a.x + normal.x, self.a.y + normal.y, self.b.x + normal.x, self.b.y + normal.y, thickness, color);
        draw_line(self.a.x - normal.x, self.a.y - normal.y, self.b.x - normal.x, self.b.y - normal.y, thickness, color);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_circle_containment_and_intersections() {
        let c1 = Circle::new(vec2(0.0, 0.0), 10.0);
        assert!(c1.contains(vec2(0.0, 0.0)));
        assert!(c1.contains(vec2(10.0, 0.0)));
        assert!(!c1.contains(vec2(10.1, 0.0)));

        let c2 = Circle::new(vec2(15.0, 0.0), 10.0);
        assert!(c1.intersects_circle(c2));

        let c3 = Circle::new(vec2(25.0, 0.0), 10.0);
        assert!(!c1.intersects_circle(c3));

        let rect = Rect::new(8.0, -5.0, 10.0, 10.0);
        assert!(c1.intersects_rect(rect));

        let far_rect = Rect::new(20.0, 20.0, 10.0, 10.0);
        assert!(!c1.intersects_rect(far_rect));
    }

    #[test]
    fn test_segment_closest_point_and_intersections() {
        let seg = Segment::new(vec2(0.0, 0.0), vec2(10.0, 0.0));
        assert_eq!(seg.closest_point(vec2(5.0, 5.0)), vec2(5.0, 0.0));
        assert_eq!(seg.closest_point(vec2(-5.0, 5.0)), vec2(0.0, 0.0));
        assert_eq!(seg.closest_point(vec2(15.0, 5.0)), vec2(10.0, 0.0));

        assert_eq!(seg.distance_to_point(vec2(5.0, 5.0)), 5.0);

        let c = Circle::new(vec2(5.0, 3.0), 5.0);
        assert!(seg.intersects_circle(c));

        let far_c = Circle::new(vec2(5.0, 10.0), 2.0);
        assert!(!seg.intersects_circle(far_c));

        let seg2 = Segment::new(vec2(5.0, -5.0), vec2(5.0, 5.0));
        let hit = seg.intersects_segment(seg2);
        assert_eq!(hit, Some(vec2(5.0, 0.0)));

        let seg3 = Segment::new(vec2(20.0, -5.0), vec2(20.0, 5.0));
        assert_eq!(seg.intersects_segment(seg3), None);
    }

    #[test]
    fn test_capsule_intersection() {
        let cap = Capsule::new(vec2(0.0, 0.0), vec2(10.0, 0.0), 2.0);
        assert!(cap.contains(vec2(5.0, 1.5)));
        assert!(!cap.contains(vec2(5.0, 3.0)));

        let target_circle = Circle::new(vec2(5.0, 4.0), 3.0);
        assert!(cap.intersects_circle(target_circle));
    }
}
