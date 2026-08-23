use macroquad::{
    color::Color,
    math::{Vec2, vec2},
    rand::gen_range,
    shapes::draw_circle,
};

use crate::{engine::Context, world::Object};

/// Individual particle data struct.
#[derive(Clone)]
pub struct Particle {
    pub position: Vec2,
    pub velocity: Vec2,
    pub color: Color,
    pub size: f32,
    pub lifetime: f32,
    pub max_lifetime: f32,
}

/// 2D Particle emitter system managing particle spawning, physics integration, and rendering.
pub struct ParticleEmitter {
    particles: Vec<Particle>,
    /// Global gravity vector applied to particles.
    pub gravity: Vec2,
    emit_accumulator: f32,
    /// When true, automatically marks the emitter as destroyed once all spawned particles expire.
    pub auto_destroy: bool,
    had_particles: bool,
}

impl ParticleEmitter {
    /// Creates a new empty [`ParticleEmitter`].
    pub fn new() -> Self {
        Self {
            particles: Vec::new(),
            gravity: vec2(0.0, 0.0),
            emit_accumulator: 0.0,
            auto_destroy: false,
            had_particles: false,
        }
    }

    /// Builder pattern: Sets gravity for emitted particles.
    pub fn with_gravity(mut self, gravity: Vec2) -> Self {
        self.gravity = gravity;
        self
    }

    /// Builder pattern: Enables auto-destruction once all emitted particles have finished.
    pub fn with_auto_destroy(mut self) -> Self {
        self.auto_destroy = true;
        self
    }

    /// Sets whether this emitter automatically self-destructs when empty.
    pub fn set_auto_destroy(&mut self, auto_destroy: bool) {
        self.auto_destroy = auto_destroy;
    }

    /// Fluent constructor: wraps this particle emitter in a [`Behavior`](crate::object::Behavior) with custom game `data`.
    pub fn with_data<Data>(self, data: Data) -> crate::object::Behavior<Self, Data> {
        crate::object::Behavior::new(self, data)
    }

    /// Emits a radial burst of particles at `pos`.
    pub fn emit_burst(
        &mut self,
        pos: Vec2,
        count: usize,
        color: Color,
        speed_range: (f32, f32),
        size: f32,
        lifetime: f32,
    ) {
        if count > 0 {
            self.had_particles = true;
        }
        for _ in 0..count {
            let angle = gen_range(0.0, std::f32::consts::TAU);
            let speed = gen_range(speed_range.0, speed_range.1);
            let velocity = vec2(angle.cos() * speed, angle.sin() * speed);

            self.particles.push(Particle {
                position: pos,
                velocity,
                color,
                size,
                lifetime,
                max_lifetime: lifetime,
            });
        }
    }

    /// Continuously emits particles at `pos` at a rate of `rate_per_sec` particles per second.
    pub fn emit_continuous(
        &mut self,
        pos: Vec2,
        rate_per_sec: f32,
        dt: f32,
        color: Color,
        speed_range: (f32, f32),
        size: f32,
        lifetime: f32,
    ) {
        if rate_per_sec <= 0.0 {
            return;
        }
        self.emit_accumulator += rate_per_sec * dt;
        let spawn_count = self.emit_accumulator.floor() as usize;
        if spawn_count > 0 {
            self.emit_accumulator -= spawn_count as f32;
            self.emit_burst(pos, spawn_count, color, speed_range, size, lifetime);
        }
    }

    /// Returns the number of currently active particles.
    pub fn active_particles_count(&self) -> usize {
        self.particles.len()
    }
}

impl Object for ParticleEmitter {
    fn update(&mut self, ctx: &mut Context) {
        let dt = ctx.time.deltatime();

        for p in self.particles.iter_mut() {
            p.velocity += self.gravity * dt;
            p.position += p.velocity * dt;
            p.lifetime -= dt;
        }

        self.particles.retain(|p| p.lifetime > 0.0);
    }

    fn draw(&self) {
        for p in self.particles.iter() {
            let ratio = (p.lifetime / p.max_lifetime).clamp(0.0, 1.0);
            let current_size = p.size * ratio;

            let mut c = p.color;
            c.a *= ratio; // Fade out alpha

            draw_circle(p.position.x, p.position.y, current_size, c);
        }
    }

    fn is_destroyed(&self) -> bool {
        self.auto_destroy && self.had_particles && self.particles.is_empty()
    }
}

impl Default for ParticleEmitter {
    fn default() -> Self {
        Self::new()
    }
}
