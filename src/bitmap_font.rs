//! Module for baking TrueType / OpenType pixel fonts into binary alpha-thresholded,
//! GPU-cached texture atlases with `FilterMode::Nearest` and continuous resolution scaling.
//!
//! Provides zero-blur, pixel-perfect rendering for pixel-art games where fonts must match
//! retro pixel grids exactly.

use macroquad::prelude::*;
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::atomic::{AtomicUsize, Ordering};

static NEXT_FONT_ID: AtomicUsize = AtomicUsize::new(1);

/// Registers or retrieves a stable, unique numeric ID for a named font path or asset key.
pub fn register_font_id(path_or_name: &str) -> usize {
    thread_local! {
        static REGISTRY: RefCell<HashMap<String, usize>> = RefCell::new(HashMap::new());
    }
    REGISTRY.with(|reg| {
        let mut map = reg.borrow_mut();
        *map.entry(path_or_name.to_string())
            .or_insert_with(|| NEXT_FONT_ID.fetch_add(1, Ordering::Relaxed))
    })
}

/// Metrics and atlas texture coordinates for a single character glyph.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GlyphInfo {
    /// Bounding rectangle of the glyph inside the font texture atlas.
    pub rect: Rect,
    /// Horizontal advance width to the next character in pixels.
    pub advance: f32,
    /// Rendering offset relative to horizontal position and font baseline.
    pub offset: Vec2,
    /// Native pixel width of the glyph bitmap.
    pub w: f32,
    /// Native pixel height of the glyph bitmap.
    pub h: f32,
}

/// A pixel-perfect bitmap font atlas generated from a TTF font at its native grid resolution.
///
/// Rendered with `FilterMode::Nearest` and scaling relative to native size to ensure
/// 100% crisp pixel edges without subpixel anti-aliasing blur.
pub struct BitmapFont {
    /// GPU texture atlas containing all glyph bitmaps.
    pub texture: Texture2D,
    /// Map of character to glyph metrics and atlas rectangle.
    pub glyphs: HashMap<char, GlyphInfo>,
    /// Configured native grid size in pixels (e.g. 8, 12, 16, 24).
    pub native_size: u32,
    /// Unique identifier for the underlying TTF source font.
    pub font_id: usize,
}

impl BitmapFont {
    /// Returns the standard default character set containing ASCII printable characters (32..127)
    /// plus Polish diacritics (`ąćęłńóśźżĄĆĘŁŃÓŚŹŻ`).
    pub fn default_charset() -> &'static str {
        " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ąćęłńóśźżĄĆĘŁŃÓŚŹŻ"
    }

    /// Generates a baked [`BitmapFont`] texture atlas from a [`macroquad::text::Font`]
    /// rasterized at `native_size` with binary alpha thresholding ($\ge 128 \to 255$, $< 128 \to 0$)
    /// and 1px glyph padding to prevent texture bleeding across adjacent glyphs.
    pub fn from_ttf(font: &Font, font_id: usize, native_size: u32, charset: &str) -> Self {
        let native_size = native_size.max(1);

        // Deduplicate characters from charset
        let chars: Vec<char> = charset.chars().collect();
        let mut unique_chars: Vec<char> = Vec::new();
        for c in chars {
            if !unique_chars.contains(&c) {
                unique_chars.push(c);
            }
        }
        if unique_chars.is_empty() {
            unique_chars.push('?');
        }

        let cell_w = native_size * 2 + 4;
        let cell_h = native_size * 2 + 4;
        let cols = 16u32;
        let rows = ((unique_chars.len() as u32) + cols - 1) / cols;
        let atlas_w = cols * cell_w;
        let atlas_h = rows * cell_h;

        let mut atlas_img = Image::gen_image_color(atlas_w as u16, atlas_h as u16, Color::from_rgba(0, 0, 0, 0));
        let mut glyphs = HashMap::new();

        let rt_size = (native_size * 3).max(32);
        let rt = render_target(rt_size, rt_size);
        rt.texture.set_filter(FilterMode::Nearest);

        let render_cam = Camera2D {
            zoom: vec2(2.0 / rt_size as f32, -2.0 / rt_size as f32),
            target: vec2(rt_size as f32 / 2.0, rt_size as f32 / 2.0),
            render_target: Some(rt.clone()),
            ..Default::default()
        };

        let baseline_y = (native_size as f32 * 0.75).round();

        for (idx, &ch) in unique_chars.iter().enumerate() {
            let col = (idx as u32) % cols;
            let row = (idx as u32) / cols;
            let cell_origin_x = col * cell_w + 1;
            let cell_origin_y = row * cell_h + 1;

            let c_str = ch.to_string();
            let dims = measure_text(&c_str, Some(font), native_size as u16, 1.0);

            // Render glyph onto offscreen render target
            set_camera(&render_cam);
            clear_background(Color::from_rgba(0, 0, 0, 0));
            draw_text_ex(
                &c_str,
                4.0,
                baseline_y,
                TextParams {
                    font: Some(font),
                    font_size: native_size as u16,
                    color: WHITE,
                    ..Default::default()
                },
            );
            set_default_camera();

            unsafe {
                macroquad::window::get_internal_gl().flush();
            }

            let glyph_img = rt.texture.get_texture_data();

            // Scan bounding box of rendered non-transparent pixels (Y-inverted from OpenGL texture data)
            let mut min_x = rt_size;
            let mut max_x = 0;
            let mut min_y = rt_size;
            let mut max_y = 0;
            let mut has_pixels = false;

            for y in 0..rt_size {
                let src_y = rt_size - 1 - y;
                for x in 0..rt_size {
                    let pix = glyph_img.get_pixel(x, src_y);
                    if pix.a >= 0.2 || pix.r >= 0.2 {
                        min_x = min_x.min(x);
                        max_x = max_x.max(x);
                        min_y = min_y.min(y);
                        max_y = max_y.max(y);
                        has_pixels = true;
                    }
                }
            }

            let (crop_x, crop_y, glyph_w, glyph_h, offset_x, offset_y) = if has_pixels {
                let w = (max_x - min_x + 1).max(1);
                let h = (max_y - min_y + 1).max(1);
                let off_x = min_x as f32 - 4.0;
                let off_y = min_y as f32 - (baseline_y - native_size as f32 * 0.7);
                (min_x, min_y, w, h, off_x, off_y)
            } else {
                let w = (dims.width.ceil() as u32).max(1);
                let h = native_size;
                (0, 0, w, h, 0.0, 0.0)
            };

            // Copy cropped glyph into atlas image with binary alpha thresholding
            for y in 0..glyph_h {
                let src_y = rt_size - 1 - (crop_y + y);
                for x in 0..glyph_w {
                    let src_pixel = glyph_img.get_pixel(crop_x + x, src_y);
                    let final_color = if src_pixel.a >= 0.35 || src_pixel.r >= 0.35 {
                        Color::from_rgba(255, 255, 255, 255)
                    } else {
                        Color::from_rgba(0, 0, 0, 0)
                    };
                    atlas_img.set_pixel(cell_origin_x + x, cell_origin_y + y, final_color);
                }
            }

            let advance = if dims.width > 0.0 { dims.width } else { native_size as f32 * 0.6 };

            glyphs.insert(
                ch,
                GlyphInfo {
                    rect: Rect::new(cell_origin_x as f32, cell_origin_y as f32, glyph_w as f32, glyph_h as f32),
                    advance,
                    offset: vec2(offset_x, offset_y),
                    w: glyph_w as f32,
                    h: glyph_h as f32,
                },
            );
        }

        let texture = Texture2D::from_image(&atlas_img);
        texture.set_filter(FilterMode::Nearest);

        Self {
            texture,
            glyphs,
            native_size,
            font_id,
        }
    }

    /// Thread-local cached lookup or creation of a [`BitmapFont`] atlas keyed by `(font_id, native_size)`.
    pub fn get_or_create(font: &Font, font_id: usize, native_size: u32, charset: &str) -> Rc<Self> {
        thread_local! {
            static CACHE: RefCell<HashMap<(usize, u32), Rc<BitmapFont>>> = RefCell::new(HashMap::new());
        }

        let key = (font_id, native_size);

        CACHE.with(|cache| {
            let mut map = cache.borrow_mut();
            if let Some(bm) = map.get(&key) {
                Rc::clone(bm)
            } else {
                let bm = Rc::new(Self::from_ttf(font, font_id, native_size, charset));
                map.insert(key, Rc::clone(&bm));
                bm
            }
        })
    }

    /// Diagnostic helper function to detect the true native pixel grid size of a pixel-art TTF font.
    pub fn detect_native_size(font: &Font, candidates: &[u32]) -> u32 {
        let sample = "Ag0";
        let mut best_size = candidates.first().copied().unwrap_or(8);
        let mut lowest_blur_count = usize::MAX;

        let rt = render_target(64, 64);
        let render_cam = Camera2D {
            zoom: vec2(2.0 / 64.0, -2.0 / 64.0),
            target: vec2(32.0, 32.0),
            render_target: Some(rt.clone()),
            ..Default::default()
        };

        for &cand in candidates {
            set_camera(&render_cam);
            clear_background(Color::from_rgba(0, 0, 0, 0));
            draw_text_ex(
                sample,
                0.0,
                cand as f32 * 0.75,
                TextParams {
                    font: Some(font),
                    font_size: cand as u16,
                    color: WHITE,
                    ..Default::default()
                },
            );
            set_default_camera();

            unsafe {
                macroquad::window::get_internal_gl().flush();
            }

            let img = rt.texture.get_texture_data();
            let mut blur_pixels = 0;
            for y in 0..cand.min(64) {
                for x in 0..64 {
                    let a = img.get_pixel(x, y).a;
                    if a > 0.05 && a < 0.95 {
                        blur_pixels += 1;
                    }
                }
            }

            if blur_pixels < lowest_blur_count {
                lowest_blur_count = blur_pixels;
                best_size = cand;
            }
        }

        best_size
    }

    /// Calculates the text bounds width and height scaled to target `scale` factor.
    pub fn measure(&self, text: &str, scale: f32) -> Vec2 {
        let mut total_w = 0.0f32;
        let mut max_h = self.native_size as f32;

        for ch in text.chars() {
            let glyph = self.glyphs.get(&ch).or_else(|| self.glyphs.get(&'?'));
            if let Some(g) = glyph {
                total_w += g.advance * scale;
                max_h = max_h.max(g.h);
            } else {
                total_w += (self.native_size as f32 * 0.6) * scale;
            }
        }

        vec2(total_w, max_h * scale)
    }

    /// Renders `text` at `(x, y)` scaled by `scale: f32` to fit ANY target font size
    /// with 100% nearest-neighbor pixel precision and position rounding.
    pub fn draw(&self, text: &str, x: f32, y: f32, scale: f32, color: Color) {
        let mut cur_x = x.round();
        let cur_y = y.round();

        for ch in text.chars() {
            let glyph = self.glyphs.get(&ch).or_else(|| self.glyphs.get(&'?'));
            if let Some(g) = glyph {
                let draw_x = cur_x + g.offset.x * scale;
                let draw_y = cur_y + g.offset.y * scale;
                draw_texture_ex(
                    &self.texture,
                    draw_x.round(),
                    draw_y.round(),
                    color,
                    DrawTextureParams {
                        source: Some(g.rect),
                        dest_size: Some(vec2(g.rect.w * scale, g.rect.h * scale)),
                        ..Default::default()
                    },
                );
                cur_x += (g.advance * scale).round();
            } else {
                cur_x += (self.native_size as f32 * 0.6 * scale).round();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_glyph_info_creation() {
        let info = GlyphInfo {
            rect: Rect::new(1.0, 1.0, 8.0, 8.0),
            advance: 8.0,
            offset: Vec2::ZERO,
            w: 8.0,
            h: 8.0,
        };
        assert_eq!(info.w, 8.0);
        assert_eq!(info.advance, 8.0);
    }

    #[test]
    fn test_font_registry_id_assignment() {
        let id1 = register_font_id("fonts/pixel_ui.ttf");
        let id2 = register_font_id("fonts/pixel_dialog.ttf");
        let id1_again = register_font_id("fonts/pixel_ui.ttf");

        assert_eq!(id1, id1_again);
        assert_ne!(id1, id2);
    }
}
