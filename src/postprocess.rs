use std::collections::HashMap;
use macroquad::{
    camera::{set_camera, set_default_camera, Camera2D},
    color::WHITE,
    math::vec2,
    miniquad::ShaderSource,
    texture::{
        draw_texture_ex, render_target, DrawTextureParams, FilterMode, RenderTarget,
    },
    window::{screen_height, screen_width},
};

// ---------------------------------------------------------------------------
// PostProcess — Fullscreen shader post-processing pipeline
// ---------------------------------------------------------------------------

/// Post-processing pipeline manager storing a GLSL material shader and custom uniforms.
///
/// # Example
/// ```ignore
/// engine.post_process = Some(PostProcess::passthrough().unwrap());
/// ```
pub struct PostProcess {
    /// Material shader applied to the rendered scene target.
    pub material: macroquad::material::Material,
    /// Uniform parameters passed to the shader (e.g. `time`, `intensity`).
    pub uniforms: HashMap<String, f32>,
}

impl PostProcess {
    /// Creates a new [`PostProcess`] pipeline wrapper with the given [`Material`](macroquad::material::Material).
    pub fn new(material: macroquad::material::Material) -> Self {
        Self {
            material,
            uniforms: HashMap::new(),
        }
    }

    /// Sets an `f32` uniform variable on the post-processing shader.
    pub fn set_uniform(&mut self, name: &str, value: f32) {
        self.uniforms.insert(name.to_string(), value);
    }

    /// Creates a default passthrough GLSL shader pipeline that renders the scene as-is.
    /// Useful as a baseline or starting template for custom visual effects (CRT, Bloom, Vignette, etc.).
    pub fn passthrough() -> Result<Self, macroquad::Error> {
        let mat = macroquad::material::load_material(
            ShaderSource::Glsl {
                vertex: PASSTHROUGH_VERT,
                fragment: PASSTHROUGH_FRAG,
            },
            macroquad::material::MaterialParams {
                uniforms: vec![],
                textures: vec!["Texture".to_string()],
                ..Default::default()
            },
        )?;
        Ok(Self::new(mat))
    }
}

// Passthrough vertex shader (GLSL 330 core)
const PASSTHROUGH_VERT: &str = r#"
#version 330 core
in vec3 position;
in vec2 texcoord;
out vec2 uv;
uniform mat4 Model;
uniform mat4 Projection;
void main() {
    gl_Position = Projection * Model * vec4(position, 1.0);
    uv = texcoord;
}
"#;

// Passthrough fragment shader (GLSL 330 core)
const PASSTHROUGH_FRAG: &str = r#"
#version 330 core
in vec2 uv;
out vec4 FragColor;
uniform sampler2D Texture;
void main() {
    FragColor = texture(Texture, uv);
}
"#;

// ---------------------------------------------------------------------------
// SceneRenderTarget — Render target texture helper
// ---------------------------------------------------------------------------

/// Manages off-screen GPU [`RenderTarget`] textures matching screen resolution.
pub struct SceneRenderTarget {
    /// Underlying Macroquad render target handle.
    pub target: RenderTarget,
    width: u32,
    height: u32,
}

impl SceneRenderTarget {
    /// Creates a new [`SceneRenderTarget`] with specified pixel dimensions.
    pub fn new(width: u32, height: u32) -> Self {
        let target = render_target(width, height);
        // Set nearest filtering to preserve pixel-art crispness
        target.texture.set_filter(FilterMode::Nearest);
        Self { target, width, height }
    }

    /// Creates a [`SceneRenderTarget`] sized to match the current viewport dimensions.
    pub fn fullscreen() -> Self {
        let w = screen_width() as u32;
        let h = screen_height() as u32;
        Self::new(w, h)
    }

    /// Checks if the cached render target dimensions match current window dimensions.
    pub fn matches_screen_size(&self) -> bool {
        let w = screen_width() as u32;
        let h = screen_height() as u32;
        self.width == w && self.height == h
    }

    /// Activates the render target as the current drawing target.
    ///
    /// ⚠️ **Deprecated:** Use `ctx.camera.begin_to_target(&rt.target)` to retain camera settings (zoom, target, shake).
    #[deprecated(note = "Use ctx.camera.begin_to_target(&rt.target) to retain camera properties (zoom, target, shake)")]
    pub fn begin(&self) {
        let cam = Camera2D {
            zoom: vec2(2.0 / self.width as f32, 2.0 / self.height as f32),
            target: vec2(self.width as f32 / 2.0, self.height as f32 / 2.0),
            render_target: Some(self.target.clone()),
            ..Default::default()
        };
        set_camera(&cam);
    }

    /// Concludes rendering to target and restores the default camera.
    pub fn end(&self) {
        set_default_camera();
    }

    /// Renders the target texture to the screen applying the [`PostProcess`] material shader.
    pub fn draw_with_postprocess(&self, pp: &mut PostProcess) {
        for (name, value) in &pp.uniforms {
            pp.material.set_uniform(name, *value);
        }
        macroquad::material::gl_use_material(&pp.material);
        draw_texture_ex(
            &self.target.texture,
            0.0,
            0.0,
            WHITE,
            DrawTextureParams {
                dest_size: Some(vec2(screen_width(), screen_height())),
                flip_y: true, // Macroquad render targets are vertically flipped
                ..Default::default()
            },
        );
        macroquad::material::gl_use_default_material();
    }

    /// Renders the target texture directly to the screen without applying custom shaders.
    pub fn draw_raw(&self) {
        draw_texture_ex(
            &self.target.texture,
            0.0,
            0.0,
            WHITE,
            DrawTextureParams {
                dest_size: Some(vec2(screen_width(), screen_height())),
                flip_y: true,
                ..Default::default()
            },
        );
    }
}
