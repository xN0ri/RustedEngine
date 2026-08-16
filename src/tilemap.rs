//! 2D Tilemap component supporting ASCII layout loading, grid rendering, and AABB solid tile collisions.
//!
//! Implements [`Object`](crate::world::Object).
//!
//! # Example
//! ```ignore
//! let mut map = Tilemap::new(tile_sheet, vec2(16.0, 16.0), 32, 18)
//!     .with_solid_tiles(vec![1, 2]);
//! map.load_from_ascii("
//! ##########
//! #........#
//! #........#
//! ##########
//! ", |c| match c { '#' => Some(1), '.' => Some(0), _ => None });
//! world.add(map);
//! ```
use macroquad::{
    color::{WHITE, Color},
    math::{Rect, Vec2, vec2},
    texture::{DrawTextureParams, Texture2D, draw_texture_ex},
};
use std::collections::HashSet;

use crate::{engine::Context, world::Object};

/// 2D Tilemap grid component.
pub struct Tilemap {
    pub position: Vec2,
    pub tile_size: Vec2,
    pub cols: usize,
    pub rows: usize,
    pub tiles: Vec<u32>,
    pub solid_tile_ids: HashSet<u32>,
    pub texture: Texture2D,
    pub tint: Color,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Tilemap {
    /// Creates a new [`Tilemap`] with specified tile texture sheet, single tile dimensions `(tile_w, tile_h)`, and grid size `(cols, rows)`.
    pub fn new(texture: Texture2D, tile_size: Vec2, cols: usize, rows: usize) -> Self {
        let count = cols * rows;
        Self {
            position: Vec2::ZERO,
            tile_size,
            cols,
            rows,
            tiles: vec![0; count],
            solid_tile_ids: HashSet::new(),
            texture,
            tint: WHITE,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Sets tilemap position.
    pub fn with_position(mut self, pos: Vec2) -> Self {
        self.position = pos;
        self
    }

    /// Builder pattern: Sets entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Sets set of solid tile IDs used for collision checks.
    pub fn with_solid_tiles(mut self, solid_ids: impl IntoIterator<Item = u32>) -> Self {
        self.solid_tile_ids = solid_ids.into_iter().collect();
        self
    }

    /// Sets solid status for a tile ID.
    pub fn set_tile_solid(&mut self, tile_id: u32, solid: bool) {
        if solid {
            self.solid_tile_ids.insert(tile_id);
        } else {
            self.solid_tile_ids.remove(&tile_id);
        }
    }

    /// Returns tile ID at grid coordinate `(col, row)`, or `None` if out of bounds.
    pub fn get_tile(&self, col: usize, row: usize) -> Option<u32> {
        if col < self.cols && row < self.rows {
            Some(self.tiles[row * self.cols + col])
        } else {
            None
        }
    }

    /// Sets tile ID at grid coordinate `(col, row)`.
    pub fn set_tile(&mut self, col: usize, row: usize, tile_id: u32) -> bool {
        if col < self.cols && row < self.rows {
            self.tiles[row * self.cols + col] = tile_id;
            true
        } else {
            false
        }
    }

    /// Parses and fills tilemap grid from an ASCII multiline string using a mapping closure `(char) -> Option<u32>`.
    pub fn load_from_ascii<F>(&mut self, ascii_map: &str, char_to_tile: F)
    where
        F: Fn(char) -> Option<u32>,
    {
        for (r, line) in ascii_map.lines().filter(|l| !l.trim().is_empty()).enumerate() {
            if r >= self.rows {
                break;
            }
            for (c, ch) in line.chars().enumerate() {
                if c >= self.cols {
                    break;
                }
                if let Some(tile_id) = char_to_tile(ch) {
                    self.set_tile(c, r, tile_id);
                }
            }
        }
    }

    /// Returns `true` if tile at `(col, row)` is marked as solid.
    pub fn is_tile_solid(&self, col: usize, row: usize) -> bool {
        self.get_tile(col, row)
            .map(|id| self.solid_tile_ids.contains(&id))
            .unwrap_or(false)
    }

    /// Returns `true` if `rect` in world space collides with any solid tile in this tilemap.
    pub fn collides_rect(&self, rect: Rect) -> bool {
        let local_x = rect.x - self.position.x;
        let local_y = rect.y - self.position.y;

        let start_col = (local_x / self.tile_size.x).floor().max(0.0) as usize;
        let end_col = ((local_x + rect.w) / self.tile_size.x).ceil().max(0.0) as usize;

        let start_row = (local_y / self.tile_size.y).floor().max(0.0) as usize;
        let end_row = ((local_y + rect.h) / self.tile_size.y).ceil().max(0.0) as usize;

        let end_c = end_col.min(self.cols);
        let end_r = end_row.min(self.rows);

        for r in start_row..end_r {
            for c in start_col..end_c {
                if self.is_tile_solid(c, r) {
                    let tile_rect = Rect {
                        x: self.position.x + (c as f32) * self.tile_size.x,
                        y: self.position.y + (r as f32) * self.tile_size.y,
                        w: self.tile_size.x,
                        h: self.tile_size.y,
                    };
                    if tile_rect.overlaps(&rect) {
                        return true;
                    }
                }
            }
        }
        false
    }
}

impl Object for Tilemap {
    fn update(&mut self, _ctx: &mut Context) {}

    fn draw(&self) {
        if !self.visible {
            return;
        }

        let sheet_cols = (self.texture.width() / self.tile_size.x).max(1.0) as usize;

        for r in 0..self.rows {
            for c in 0..self.cols {
                let tile_id = self.tiles[r * self.cols + c];
                if tile_id == 0 {
                    continue;
                }

                let src_col = (tile_id as usize) % sheet_cols;
                let src_row = (tile_id as usize) / sheet_cols;

                let src_rect = Rect {
                    x: (src_col as f32) * self.tile_size.x,
                    y: (src_row as f32) * self.tile_size.y,
                    w: self.tile_size.x,
                    h: self.tile_size.y,
                };

                let dest_pos = self.position + vec2((c as f32) * self.tile_size.x, (r as f32) * self.tile_size.y);

                draw_texture_ex(
                    &self.texture,
                    dest_pos.x,
                    dest_pos.y,
                    self.tint,
                    DrawTextureParams {
                        source: Some(src_rect),
                        dest_size: Some(self.tile_size),
                        ..Default::default()
                    },
                );
            }
        }
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn is_visible(&self) -> bool {
        self.visible
    }

    fn set_visible(&mut self, visible: bool) {
        self.visible = visible;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tilemap_ascii_and_collision() {
        let mut map = Tilemap {
            position: Vec2::ZERO,
            tile_size: vec2(16.0, 16.0),
            cols: 4,
            rows: 4,
            tiles: vec![0; 16],
            solid_tile_ids: [1].into_iter().collect(),
            texture: unsafe { std::mem::zeroed() },
            tint: WHITE,
            tag: String::new(),
            visible: true,
            active: true,
        };

        let ascii = "
1111
1001
1001
1111
";
        map.load_from_ascii(ascii, |c| match c {
            '1' => Some(1),
            '0' => Some(0),
            _ => None,
        });

        assert!(map.is_tile_solid(0, 0));
        assert!(!map.is_tile_solid(1, 1));

        // Test collision query inside empty area (1,1) -> (16..32, 16..32)
        assert!(!map.collides_rect(Rect::new(18.0, 18.0, 10.0, 10.0)));

        // Test collision query hitting top wall (0,0)
        assert!(map.collides_rect(Rect::new(5.0, 5.0, 10.0, 10.0)));
    }
}
