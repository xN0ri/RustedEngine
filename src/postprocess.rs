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
// PostProcess — infrastruktura post-processingu przez RenderTarget
// ---------------------------------------------------------------------------

/// Render target do rysowania sceny przed post-processingiem.
///
/// # Ograniczenia macroquad
/// macroquad **posiada** `RenderTarget`, `Material` i `gl_use_material` —
/// są to stabilne API (wersja 0.4+). Shadery pisane w GLSL (330 core).
///
/// # Użycie
/// ```ignore
/// engine.post_process = Some(PostProcess::passthrough());
/// ```
pub struct PostProcess {
    /// Materiał (shader) stosowany do render targetu.
    pub material: macroquad::material::Material,
    /// Uniformy przekazywane do shadera (np. `time`, `strength`).
    pub uniforms: HashMap<String, f32>,
}

impl PostProcess {
    /// Tworzy PostProcess z istniejącym materiałem.
    pub fn new(material: macroquad::material::Material) -> Self {
        Self {
            material,
            uniforms: HashMap::new(),
        }
    }

    /// Ustawia uniform f32 na shaderze.
    pub fn set_uniform(&mut self, name: &str, value: f32) {
        self.uniforms.insert(name.to_string(), value);
    }

    /// Tworzy trywialny passthrough shader — przepuszcza obraz bez zmian.
    /// Użyj jako przykład i punkt startowy własnych efektów.
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

// Trywialny vertex shader (passthrough)
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

// Trywialny fragment shader (passthrough)
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
// SceneRenderTarget — helper do tworzenia i odnawiania render targetu
// ---------------------------------------------------------------------------

/// Zarządza `RenderTarget` dopasowanym do rozmiaru okna.
/// Odnawiaj co klatkę jeśli okno może zmieniać rozmiar.
pub struct SceneRenderTarget {
    pub target: RenderTarget,
    width: u32,
    height: u32,
}

impl SceneRenderTarget {
    /// Tworzy render target o podanym rozmiarze.
    pub fn new(width: u32, height: u32) -> Self {
        let target = render_target(width, height);
        // Filtr nearest żeby zachować ostrość pikseli przy pixel art
        target.texture.set_filter(FilterMode::Nearest);
        Self { target, width, height }
    }

    /// Tworzy render target dopasowany do aktualnego rozmiaru ekranu.
    pub fn fullscreen() -> Self {
        let w = screen_width() as u32;
        let h = screen_height() as u32;
        Self::new(w, h)
    }

    /// Sprawdza, czy zapamiętana rozdzielczość odpowiada bieżącemu rozmiarowi ekranu.
    pub fn matches_screen_size(&self) -> bool {
        let w = screen_width() as u32;
        let h = screen_height() as u32;
        self.width == w && self.height == h
    }

    /// Aktywuje render target jako cel rysowania.
    ///
    /// ⚠️ **Deprecated:** Użyj `ctx.camera.begin_to_target(&rt.target)` aby zachować parametry kamery (zoom, target, shake).
    #[deprecated(note = "Użyj ctx.camera.begin_to_target(&rt.target) aby zachować parametry kamery (zoom, target, shake)")]
    pub fn begin(&self) {
        let cam = Camera2D {
            zoom: vec2(2.0 / self.width as f32, 2.0 / self.height as f32),
            target: vec2(self.width as f32 / 2.0, self.height as f32 / 2.0),
            render_target: Some(self.target.clone()),
            ..Default::default()
        };
        set_camera(&cam);
    }

    /// Kończy render do targetu, wraca do domyślnej kamery.
    pub fn end(&self) {
        set_default_camera();
    }

    /// Rysuje texture z render targetu przez podany PostProcess material na ekranie.
    pub fn draw_with_postprocess(&self, pp: &mut PostProcess) {
        // Ustaw uniformy na materiale
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
                flip_y: true, // render targets są odwrócone w macroquad
                ..Default::default()
            },
        );
        macroquad::material::gl_use_default_material();
    }

    /// Rysuje texture z render targetu bezpośrednio (bez shadera).
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
