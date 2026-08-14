use macroquad::{
    color::Color,
    math::{vec2, Vec2},
    rand::gen_range,
    shapes::draw_circle,
};

use crate::{engine::Context, world::Object};

#[derive(Clone)]
pub struct Particle {
    pub position: Vec2,
    pub velocity: Vec2,
    pub color: Color,
    pub size: f32,
    pub lifetime: f32,
    pub max_lifetime: f32,
}

pub struct ParticleEmitter {
    particles: Vec<Particle>,
    pub gravity: Vec2,
}

impl ParticleEmitter {
    pub fn new() -> Self {
        Self {
            particles: Vec::new(),
            gravity: vec2(0.0, 0.0),
        }
    }

    pub fn with_gravity(mut self, gravity: Vec2) -> Self {
        self.gravity = gravity;
        self
    }

    pub fn emit_burst(&mut self, pos: Vec2, count: usize, color: Color, speed_range: (f32, f32), size: f32, lifetime: f32) {
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
}

impl Default for ParticleEmitter {
    fn default() -> Self {
        Self::new()
    }
}
