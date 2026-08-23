//! Spatial geometric random number generation helpers, deterministic seeded PRNG,
//! weighted choice collections, fair shuffle bags, and procedural Perlin noise.

use macroquad::{
    color::Color,
    math::{Rect, Vec2, vec2},
    rand::gen_range,
};

// ---------------------------------------------------------------------------
// Deterministic Seeded PRNG (PCG32)
// ---------------------------------------------------------------------------

/// Fast, deterministic, statistically-robust pseudo-random number generator based on PCG32.
///
/// Guarantees identical sequence of random values for the same seed across all platforms.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Rng {
    state: u64,
    inc: u64,
}

impl Rng {
    /// Creates a new [`Rng`] initialized with the given 64-bit `seed`.
    pub fn new(seed: u64) -> Self {
        let mut rng = Self {
            state: 0,
            inc: (seed << 1) | 1,
        };
        rng.next_u32();
        rng.state = rng.state.wrapping_add(seed);
        rng.next_u32();
        rng
    }

    /// Creates a new [`Rng`] seeded from current system time.
    pub fn from_time() -> Self {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64)
            .unwrap_or(0x853c49e6748fea9b);
        Self::new(nanos)
    }

    /// Generates the next raw 32-bit unsigned integer.
    #[inline]
    pub fn next_u32(&mut self) -> u32 {
        let oldstate = self.state;
        self.state = oldstate
            .wrapping_mul(6364136223846793005)
            .wrapping_add(self.inc);
        let xorshifted = (((oldstate >> 18) ^ oldstate) >> 27) as u32;
        let rot = (oldstate >> 59) as u32;
        (xorshifted >> rot) | (xorshifted << ((rot.wrapping_neg()) & 31))
    }

    /// Generates the next raw 64-bit unsigned integer.
    #[inline]
    pub fn next_u64(&mut self) -> u64 {
        ((self.next_u32() as u64) << 32) | (self.next_u32() as u64)
    }

    /// Generates a floating point number in the half-open interval `[0.0, 1.0)`.
    #[inline]
    pub fn next_f32(&mut self) -> f32 {
        (self.next_u32() >> 8) as f32 * (1.0 / (1 << 24) as f32)
    }

    /// Generates a float in the range `[min, max)`.
    pub fn range_f32(&mut self, min: f32, max: f32) -> f32 {
        min + (max - min) * self.next_f32()
    }

    /// Generates an integer in the range `[min, max]`.
    pub fn range_i32(&mut self, min: i32, max: i32) -> i32 {
        if min >= max {
            return min;
        }
        let span = (max as i64 - min as i64 + 1) as u64;
        let val = (self.next_u32() as u64 % span) as i32;
        min + val
    }

    /// Generates a `usize` in the range `[min, max]`.
    pub fn range_usize(&mut self, min: usize, max: usize) -> usize {
        if min >= max {
            return min;
        }
        let span = (max - min + 1) as u64;
        let val = (self.next_u64() % span) as usize;
        min + val
    }

    /// Returns `true` with the given probability `chance` (`0.0` ..= `1.0`).
    pub fn gen_bool(&mut self, chance: f32) -> bool {
        if chance <= 0.0 {
            false
        } else if chance >= 1.0 {
            true
        } else {
            self.next_f32() < chance
        }
    }

    /// Returns either `-1.0` or `1.0` with equal (50%) probability.
    pub fn gen_sign(&mut self) -> f32 {
        if self.next_u32() & 1 == 0 {
            1.0
        } else {
            -1.0
        }
    }

    /// Returns a random angle in radians in `[0.0, 2π)`.
    pub fn gen_angle(&mut self) -> f32 {
        self.next_f32() * std::f32::consts::TAU
    }

    /// Returns a random angle deviation within `±spread_radians` around `base_angle`.
    pub fn gen_spread(&mut self, base_angle: f32, spread_radians: f32) -> f32 {
        base_angle + self.range_f32(-spread_radians, spread_radians)
    }

    /// Returns a normally-distributed (Gaussian) random float with given `mean` and `std_dev` using Box-Muller transform.
    pub fn gen_normal(&mut self, mean: f32, std_dev: f32) -> f32 {
        let u1 = self.next_f32().max(1e-7);
        let u2 = self.next_f32();
        let z0 = (-2.0 * u1.ln()).sqrt() * (std::f32::consts::TAU * u2).cos();
        mean + z0 * std_dev
    }

    /// Generates a random point uniformly distributed inside a circle of given radius.
    pub fn in_circle(&mut self, radius: f32) -> Vec2 {
        let angle = self.gen_angle();
        let r = radius * self.next_f32().sqrt();
        vec2(angle.cos() * r, angle.sin() * r)
    }

    /// Generates a random point on the circumference of a circle with given radius.
    pub fn on_circle(&mut self, radius: f32) -> Vec2 {
        let angle = self.gen_angle();
        vec2(angle.cos() * radius, angle.sin() * radius)
    }

    /// Generates a random point inside an annulus (ring) between `inner_radius` and `outer_radius`.
    pub fn in_annulus(&mut self, inner_radius: f32, outer_radius: f32) -> Vec2 {
        let angle = self.gen_angle();
        let r_in_sq = inner_radius * inner_radius;
        let r_out_sq = outer_radius * outer_radius;
        let r = (r_in_sq + self.next_f32() * (r_out_sq - r_in_sq)).sqrt();
        vec2(angle.cos() * r, angle.sin() * r)
    }

    /// Generates a random point uniformly distributed inside a cone/sector arc.
    pub fn in_sector(&mut self, radius: f32, base_direction: Vec2, angle_span_radians: f32) -> Vec2 {
        let base_angle = base_direction.y.atan2(base_direction.x);
        let half = angle_span_radians * 0.5;
        let angle = base_angle + self.range_f32(-half, half);
        let r = radius * self.next_f32().sqrt();
        vec2(angle.cos() * r, angle.sin() * r)
    }

    /// Generates a random point uniformly distributed inside `rect`.
    pub fn in_rect(&mut self, rect: Rect) -> Vec2 {
        vec2(
            self.range_f32(rect.x, rect.x + rect.w),
            self.range_f32(rect.y, rect.y + rect.h),
        )
    }

    /// Generates a random point on the perimeter edge of `rect`.
    pub fn on_rect_perimeter(&mut self, rect: Rect) -> Vec2 {
        let perimeter = 2.0 * (rect.w + rect.h);
        if perimeter <= 0.0 {
            return vec2(rect.x, rect.y);
        }

        let mut dist = self.range_f32(0.0, perimeter);

        if dist <= rect.w {
            return vec2(rect.x + dist, rect.y);
        }
        dist -= rect.w;

        if dist <= rect.h {
            return vec2(rect.x + rect.w, rect.y + dist);
        }
        dist -= rect.h;

        if dist <= rect.w {
            return vec2(rect.x + rect.w - dist, rect.y + rect.h);
        }
        dist -= rect.w;

        vec2(rect.x, rect.y + rect.h - dist)
    }

    /// Generates a random point along the line segment between `a` and `b`.
    pub fn on_segment(&mut self, a: Vec2, b: Vec2) -> Vec2 {
        let t = self.next_f32();
        a + (b - a) * t
    }

    /// Generates a random point inside triangle `(a, b, c)` using uniform barycentric sampling.
    pub fn in_triangle(&mut self, a: Vec2, b: Vec2, c: Vec2) -> Vec2 {
        let r1 = self.next_f32().sqrt();
        let r2 = self.next_f32();
        let w_a = 1.0 - r1;
        let w_b = r1 * (1.0 - r2);
        let w_c = r1 * r2;
        a * w_a + b * w_b + c * w_c
    }

    /// Randomly picks an element from `slice`. Returns `None` if `slice` is empty.
    pub fn choose<'a, T>(&mut self, slice: &'a [T]) -> Option<&'a T> {
        if slice.is_empty() {
            None
        } else {
            let idx = self.range_usize(0, slice.len() - 1);
            Some(&slice[idx])
        }
    }

    /// Randomly picks a mutable element from `slice`. Returns `None` if `slice` is empty.
    pub fn choose_mut<'a, T>(&mut self, slice: &'a mut [T]) -> Option<&'a mut T> {
        if slice.is_empty() {
            None
        } else {
            let idx = self.range_usize(0, slice.len() - 1);
            Some(&mut slice[idx])
        }
    }

    /// Shuffles elements of `slice` in place using the Fisher-Yates algorithm.
    pub fn shuffle<T>(&mut self, slice: &mut [T]) {
        let len = slice.len();
        if len <= 1 {
            return;
        }
        for i in (1..len).rev() {
            let j = self.range_usize(0, i);
            slice.swap(i, j);
        }
    }

    /// Samples `amount` random elements from `slice` without replacement.
    pub fn sample_multiple<T: Clone>(&mut self, slice: &[T], amount: usize) -> Vec<T> {
        let amount = amount.min(slice.len());
        if amount == 0 {
            return Vec::new();
        }

        let mut indices: Vec<usize> = (0..slice.len()).collect();
        for i in 0..amount {
            let j = self.range_usize(i, indices.len() - 1);
            indices.swap(i, j);
        }

        indices[..amount]
            .iter()
            .map(|&idx| slice[idx].clone())
            .collect()
    }
}

// ---------------------------------------------------------------------------
// Global Spatial & Geometric Random Functions
// ---------------------------------------------------------------------------

/// Returns a random point uniformly distributed inside a circle of given radius.
pub fn random_in_circle(radius: f32) -> Vec2 {
    let angle = gen_range(0.0, std::f32::consts::TAU);
    let r = radius * gen_range(0.0f32, 1.0f32).sqrt();
    vec2(angle.cos() * r, angle.sin() * r)
}

/// Returns a random direction vector on the circle circumference scaled by `radius`.
pub fn random_on_circle(radius: f32) -> Vec2 {
    let angle = gen_range(0.0, std::f32::consts::TAU);
    vec2(angle.cos() * radius, angle.sin() * radius)
}

/// Returns a random point inside an annulus (ring) between `inner_radius` and `outer_radius`.
///
/// Highly useful for spawning enemies or hazards in a ring around the player.
pub fn random_in_annulus(inner_radius: f32, outer_radius: f32) -> Vec2 {
    let angle = gen_range(0.0, std::f32::consts::TAU);
    let r_in_sq = inner_radius * inner_radius;
    let r_out_sq = outer_radius * outer_radius;
    let r = (r_in_sq + gen_range(0.0f32, 1.0f32) * (r_out_sq - r_in_sq)).sqrt();
    vec2(angle.cos() * r, angle.sin() * r)
}

/// Returns a random point uniformly distributed inside a cone/sector arc facing `base_direction`.
pub fn random_in_sector(radius: f32, base_direction: Vec2, angle_span_radians: f32) -> Vec2 {
    let base_angle = base_direction.y.atan2(base_direction.x);
    let half = angle_span_radians * 0.5;
    let angle = base_angle + gen_range(-half, half);
    let r = radius * gen_range(0.0f32, 1.0f32).sqrt();
    vec2(angle.cos() * r, angle.sin() * r)
}

/// Returns a random point uniformly distributed inside the given rectangle.
pub fn random_in_rect(rect: Rect) -> Vec2 {
    vec2(
        gen_range(rect.x, rect.x + rect.w),
        gen_range(rect.y, rect.y + rect.h),
    )
}

/// Returns a random point on the perimeter edge of the given rectangle.
///
/// Useful for spawning entities right outside the camera view.
pub fn random_on_rect_perimeter(rect: Rect) -> Vec2 {
    let perimeter = 2.0 * (rect.w + rect.h);
    if perimeter <= 0.0 {
        return vec2(rect.x, rect.y);
    }

    let mut dist = gen_range(0.0, perimeter);

    // Top edge
    if dist <= rect.w {
        return vec2(rect.x + dist, rect.y);
    }
    dist -= rect.w;

    // Right edge
    if dist <= rect.h {
        return vec2(rect.x + rect.w, rect.y + dist);
    }
    dist -= rect.h;

    // Bottom edge
    if dist <= rect.w {
        return vec2(rect.x + rect.w - dist, rect.y + rect.h);
    }
    dist -= rect.w;

    // Left edge
    vec2(rect.x, rect.y + rect.h - dist)
}

/// Returns a random point along the line segment between `a` and `b`.
pub fn random_on_segment(a: Vec2, b: Vec2) -> Vec2 {
    let t = gen_range(0.0f32, 1.0f32);
    a + (b - a) * t
}

/// Returns a random point inside triangle `(a, b, c)` using uniform barycentric sampling.
pub fn random_in_triangle(a: Vec2, b: Vec2, c: Vec2) -> Vec2 {
    let r1 = gen_range(0.0f32, 1.0f32).sqrt();
    let r2 = gen_range(0.0f32, 1.0f32);
    let w_a = 1.0 - r1;
    let w_b = r1 * (1.0 - r2);
    let w_c = r1 * r2;
    a * w_a + b * w_b + c * w_c
}

/// Returns a random float in the range `[min, max)`.
pub fn random_range(min: f32, max: f32) -> f32 {
    gen_range(min, max)
}

/// Returns a random integer in the range `[min, max]`.
pub fn random_range_i32(min: i32, max: i32) -> i32 {
    gen_range(min, max + 1)
}

/// Returns a random `usize` in the range `[min, max]`.
pub fn random_range_usize(min: usize, max: usize) -> usize {
    gen_range(min, max + 1)
}

/// Returns `true` with the given probability `chance` (`0.0` ..= `1.0`).
pub fn random_bool(chance: f32) -> bool {
    if chance <= 0.0 {
        false
    } else if chance >= 1.0 {
        true
    } else {
        gen_range(0.0f32, 1.0f32) < chance
    }
}

/// Returns either `-1.0` or `1.0` with equal (50%) probability.
pub fn random_sign() -> f32 {
    if gen_range(0, 2) == 0 { 1.0 } else { -1.0 }
}

/// Returns a random angle in radians in `[0.0, 2π)`.
pub fn random_angle() -> f32 {
    gen_range(0.0, std::f32::consts::TAU)
}

/// Returns a random angle deviation within `±spread_radians` around `base_angle`.
pub fn random_spread(base_angle: f32, spread_radians: f32) -> f32 {
    base_angle + gen_range(-spread_radians, spread_radians)
}

/// Returns a normally-distributed (Gaussian) random float with given `mean` and `std_dev`.
pub fn random_normal(mean: f32, std_dev: f32) -> f32 {
    let u1 = gen_range(0.0f32, 1.0f32).max(1e-7);
    let u2 = gen_range(0.0f32, 1.0f32);
    let z0 = (-2.0 * u1.ln()).sqrt() * (std::f32::consts::TAU * u2).cos();
    mean + z0 * std_dev
}

/// Generates a random fully-opaque [`Color`].
pub fn random_color() -> Color {
    Color::new(
        gen_range(0.0, 1.0),
        gen_range(0.0, 1.0),
        gen_range(0.0, 1.0),
        1.0,
    )
}

/// Randomly picks an element from `slice`. Returns `None` if `slice` is empty.
pub fn random_choose<T>(slice: &[T]) -> Option<&T> {
    if slice.is_empty() {
        None
    } else {
        Some(&slice[gen_range(0, slice.len())])
    }
}

/// Randomly picks a mutable element from `slice`. Returns `None` if `slice` is empty.
pub fn random_choose_mut<T>(slice: &mut [T]) -> Option<&mut T> {
    if slice.is_empty() {
        None
    } else {
        let idx = gen_range(0, slice.len());
        Some(&mut slice[idx])
    }
}

/// Shuffles elements of `slice` in place using the Fisher-Yates algorithm.
pub fn random_shuffle<T>(slice: &mut [T]) {
    let len = slice.len();
    if len <= 1 {
        return;
    }
    for i in (1..len).rev() {
        let j = gen_range(0, i + 1);
        slice.swap(i, j);
    }
}

/// Samples `amount` random elements from `slice` without replacement.
pub fn random_sample<T: Clone>(slice: &[T], amount: usize) -> Vec<T> {
    let amount = amount.min(slice.len());
    if amount == 0 {
        return Vec::new();
    }

    let mut indices: Vec<usize> = (0..slice.len()).collect();
    for i in 0..amount {
        let j = gen_range(i, indices.len());
        indices.swap(i, j);
    }

    indices[..amount]
        .iter()
        .map(|&idx| slice[idx].clone())
        .collect()
}

// ---------------------------------------------------------------------------
// WeightedList
// ---------------------------------------------------------------------------

/// Generic weighted choice collection supporting weighted random sampling with and without replacement.
#[derive(Clone, Debug, Default)]
pub struct WeightedList<T> {
    items: Vec<(T, f32)>,
    total_weight: f32,
}

impl<T> WeightedList<T> {
    /// Creates a new empty [`WeightedList`].
    pub fn new() -> Self {
        Self {
            items: Vec::new(),
            total_weight: 0.0,
        }
    }

    /// Adds an item with specified selection weight.
    pub fn add(&mut self, item: T, weight: f32) {
        if weight > 0.0 {
            self.total_weight += weight;
            self.items.push((item, weight));
        }
    }

    /// Builder pattern: Adds an item with specified selection weight.
    pub fn with(mut self, item: T, weight: f32) -> Self {
        self.add(item, weight);
        self
    }

    /// Selects an item randomly based on relative weights. Returns `None` if the list is empty.
    pub fn choose(&self) -> Option<&T> {
        if self.items.is_empty() || self.total_weight <= 0.0 {
            return None;
        }

        let roll = gen_range(0.0, self.total_weight);
        let mut accumulated = 0.0;

        for (item, weight) in &self.items {
            accumulated += weight;
            if roll <= accumulated {
                return Some(item);
            }
        }

        self.items.last().map(|(item, _)| item)
    }

    /// Selects a mutable reference to an item randomly based on relative weights.
    pub fn choose_mut(&mut self) -> Option<&mut T> {
        if self.items.is_empty() || self.total_weight <= 0.0 {
            return None;
        }

        let roll = gen_range(0.0, self.total_weight);
        let mut accumulated = 0.0;
        let mut chosen_idx = self.items.len() - 1;

        for (idx, (_, weight)) in self.items.iter().enumerate() {
            accumulated += *weight;
            if roll <= accumulated {
                chosen_idx = idx;
                break;
            }
        }

        self.items.get_mut(chosen_idx).map(|(item, _)| item)
    }

    /// Draws and removes an item randomly based on relative weights.
    pub fn choose_and_remove(&mut self) -> Option<T> {
        if self.items.is_empty() || self.total_weight <= 0.0 {
            return None;
        }

        let roll = gen_range(0.0, self.total_weight);
        let mut accumulated = 0.0;
        let mut chosen_idx = self.items.len() - 1;

        for (idx, (_, weight)) in self.items.iter().enumerate() {
            accumulated += *weight;
            if roll <= accumulated {
                chosen_idx = idx;
                break;
            }
        }

        let (item, weight) = self.items.remove(chosen_idx);
        self.total_weight -= weight;
        Some(item)
    }

    /// Samples `amount` distinct items according to their relative weights without replacement.
    ///
    /// Ideal for game card drafts (e.g. presenting 3 distinct upgrade choices without duplicates).
    pub fn sample_without_replacement(&self, amount: usize) -> Vec<T>
    where
        T: Clone,
    {
        let mut temp = self.clone();
        let mut results = Vec::with_capacity(amount.min(self.len()));
        for _ in 0..amount {
            if let Some(item) = temp.choose_and_remove() {
                results.push(item);
            } else {
                break;
            }
        }
        results
    }

    /// Returns the sum of all item weights.
    pub fn total_weight(&self) -> f32 {
        self.total_weight
    }

    /// Returns the slice of stored `(item, weight)` tuples.
    pub fn items(&self) -> &[(T, f32)] {
        &self.items
    }

    /// Returns the number of items stored in the list.
    pub fn len(&self) -> usize {
        self.items.len()
    }

    /// Returns `true` if the weighted list contains no items.
    pub fn is_empty(&self) -> bool {
        self.items.is_empty()
    }

    /// Clears all entries from the weighted list.
    pub fn clear(&mut self) {
        self.items.clear();
        self.total_weight = 0.0;
    }
}

// ---------------------------------------------------------------------------
// ShuffleBag (Fair Random Bag / Deck)
// ---------------------------------------------------------------------------

/// Fair randomizer collection (like a Tetris randomizer or card deck).
///
/// Ensures every element appears evenly before any item repeats.
#[derive(Clone, Debug)]
pub struct ShuffleBag<T> {
    template: Vec<T>,
    bag: Vec<T>,
    auto_refill: bool,
}

impl<T: Clone> ShuffleBag<T> {
    /// Creates a new [`ShuffleBag`] containing the provided `items`.
    pub fn new(items: Vec<T>) -> Self {
        let mut bag = items.clone();
        random_shuffle(&mut bag);
        Self {
            template: items,
            bag,
            auto_refill: true,
        }
    }

    /// Sets whether the bag automatically refills and reshuffles when empty. Defaults to `true`.
    pub fn with_auto_refill(mut self, auto_refill: bool) -> Self {
        self.auto_refill = auto_refill;
        self
    }

    /// Draws the next item from the bag.
    ///
    /// If empty and `auto_refill` is enabled, repopulates and reshuffles from the master template.
    pub fn draw(&mut self) -> Option<T> {
        if self.bag.is_empty() {
            if self.auto_refill && !self.template.is_empty() {
                self.bag = self.template.clone();
                random_shuffle(&mut self.bag);
            } else {
                return None;
            }
        }
        self.bag.pop()
    }

    /// Adds an item to the template and current bag.
    pub fn add(&mut self, item: T) {
        self.template.push(item.clone());
        self.bag.push(item);
        random_shuffle(&mut self.bag);
    }

    /// Returns the number of items remaining before the current bag is exhausted.
    pub fn remaining(&self) -> usize {
        self.bag.len()
    }

    /// Resets the bag to the initial full shuffled state.
    pub fn reset(&mut self) {
        self.bag = self.template.clone();
        random_shuffle(&mut self.bag);
    }
}

// ---------------------------------------------------------------------------
// 1D & 2D Perlin / Gradient Noise
// ---------------------------------------------------------------------------

/// Smooth gradient / Perlin noise generator for procedural terrain, organic animations, and camera shake.
#[derive(Clone, Debug)]
pub struct Noise {
    perm: [u8; 512],
}

impl Noise {
    /// Creates a new [`Noise`] instance seeded with `seed`.
    pub fn new(seed: u64) -> Self {
        let mut rng = Rng::new(seed);
        let mut p: [u8; 256] = [0; 256];
        for i in 0..256 {
            p[i] = i as u8;
        }
        rng.shuffle(&mut p);

        let mut perm = [0u8; 512];
        for i in 0..512 {
            perm[i] = p[i & 255];
        }
        Self { perm }
    }

    /// Samples 1D Perlin noise at `x`. Returns a value in `[-1.0, 1.0]`.
    pub fn get_1d(&self, x: f32) -> f32 {
        self.get_2d(x, 0.5)
    }

    /// Samples 2D Perlin noise at `(x, y)`. Returns a value in `[-1.0, 1.0]`.
    pub fn get_2d(&self, x: f32, y: f32) -> f32 {
        let xi = x.floor() as i32 & 255;
        let yi = y.floor() as i32 & 255;
        let xf = x - x.floor();
        let yf = y - y.floor();

        let u = fade(xf);
        let v = fade(yf);

        let aa = self.perm[self.perm[xi as usize] as usize + yi as usize] as usize;
        let ab = self.perm[self.perm[xi as usize] as usize + yi as usize + 1] as usize;
        let ba = self.perm[self.perm[xi as usize + 1] as usize + yi as usize] as usize;
        let bb = self.perm[self.perm[xi as usize + 1] as usize + yi as usize + 1] as usize;

        let x1 = lerp(grad2d(self.perm[aa], xf, yf), grad2d(self.perm[ba], xf - 1.0, yf), u);
        let x2 = lerp(grad2d(self.perm[ab], xf, yf - 1.0), grad2d(self.perm[bb], xf - 1.0, yf - 1.0), u);

        lerp(x1, x2, v)
    }

    /// Multi-octave fractal Brownian motion (fBm) noise at `(x, y)`.
    pub fn fractal_2d(&self, mut x: f32, mut y: f32, octaves: usize, persistence: f32, lacunarity: f32) -> f32 {
        let mut total = 0.0;
        let mut frequency = 1.0;
        let mut amplitude = 1.0;
        let mut max_val = 0.0;

        for _ in 0..octaves {
            total += self.get_2d(x * frequency, y * frequency) * amplitude;
            max_val += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
            x += 12.34;
            y += 56.78;
        }

        if max_val > 0.0 {
            total / max_val
        } else {
            0.0
        }
    }
}

#[inline]
fn fade(t: f32) -> f32 {
    t * t * t * (t * (t * 6.0 - 15.0) + 10.0)
}

#[inline]
fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + t * (b - a)
}

#[inline]
fn grad2d(hash: u8, x: f32, y: f32) -> f32 {
    let h = hash & 7;
    let u = if h < 4 { x } else { y };
    let v = if h < 4 { y } else { x };
    (if (h & 1) != 0 { -u } else { u }) + (if (h & 2) != 0 { -2.0 * v } else { 2.0 * v }) * 0.5
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rng_seeded_determinism() {
        let mut rng1 = Rng::new(12345);
        let mut rng2 = Rng::new(12345);

        for _ in 0..100 {
            assert_eq!(rng1.next_u32(), rng2.next_u32());
            assert_eq!(rng1.range_f32(10.0, 50.0), rng2.range_f32(10.0, 50.0));
        }
    }

    #[test]
    fn test_rng_distributions() {
        let mut rng = Rng::new(999);

        // Annulus
        for _ in 0..100 {
            let p = rng.in_annulus(5.0, 10.0);
            let len = p.length();
            assert!(len >= 4.999 && len <= 10.001);
        }

        // Sector
        let p_sec = rng.in_sector(10.0, vec2(1.0, 0.0), std::f32::consts::FRAC_PI_2);
        assert!(p_sec.length() <= 10.001);

        // Gaussian normal
        let mut sum = 0.0;
        let n = 1000;
        for _ in 0..n {
            sum += rng.gen_normal(50.0, 5.0);
        }
        let mean = sum / n as f32;
        assert!((mean - 50.0).abs() < 1.0);
    }

    #[test]
    fn test_shuffle_bag() {
        let mut bag = ShuffleBag::new(vec!["A", "B", "C"]);
        assert_eq!(bag.remaining(), 3);

        let mut drawn = Vec::new();
        for _ in 0..3 {
            drawn.push(bag.draw().unwrap());
        }
        assert_eq!(drawn.len(), 3);
        assert!(drawn.contains(&"A"));
        assert!(drawn.contains(&"B"));
        assert!(drawn.contains(&"C"));

        // Auto-refill should draw again seamlessly
        let next = bag.draw();
        assert!(next.is_some());
    }

    #[test]
    fn test_weighted_list_sample_without_replacement() {
        let mut list = WeightedList::new();
        list.add("Common", 70.0);
        list.add("Rare", 25.0);
        list.add("Epic", 5.0);

        let samples = list.sample_without_replacement(3);
        assert_eq!(samples.len(), 3);
        // All 3 elements must be unique!
        assert!(samples.contains(&"Common"));
        assert!(samples.contains(&"Rare"));
        assert!(samples.contains(&"Epic"));
    }

    #[test]
    fn test_noise_generator() {
        let noise = Noise::new(42);
        let val1 = noise.get_2d(1.5, 2.5);
        let val2 = noise.get_2d(1.5, 2.5);
        assert_eq!(val1, val2);
        assert!(val1 >= -1.0 && val1 <= 1.0);

        let fractal = noise.fractal_2d(5.0, 5.0, 4, 0.5, 2.0);
        assert!(fractal >= -1.0 && fractal <= 1.0);
    }
}
