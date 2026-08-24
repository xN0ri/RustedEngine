//! 2D Tilemap component supporting ASCII layout loading, grid rendering, and advanced tile collision shapes (Slopes, Slabs, One-Way Platforms, Custom Rects).
//!
//! Implements [`Object`](crate::world::Object).
//!
//! # Example
//! ```ignore
//! let mut map = Tilemap::new(tile_sheet, vec2(16.0, 16.0), 32, 18)
//!     .with_solid_tiles(vec![1, 2])
//!     .with_tile_collision(3, TileCollision::SlopeUpRight)
//!     .with_tile_collision(4, TileCollision::OneWay);
//!
//! map.load_from_ascii("
//! ##########
//! #........#
//! #.../\...#
//! ##########
//! ", |c| match c { '#' => Some(1), '/' => Some(3), '\\' => Some(4), _ => None });
//! world.add(map);
//! ```
use macroquad::{
    color::{WHITE, Color},
    math::{Rect, Vec2, vec2},
    texture::{DrawTextureParams, Texture2D, draw_texture_ex},
};
use std::collections::{HashMap, HashSet};

use crate::{engine::Context, world::Object};

/// Collision shape definitions for individual tile types in a [`Tilemap`].
#[derive(Clone, Debug, PartialEq)]
pub enum TileCollision {
    /// No collision (pass-through visual tile, e.g. background decorations).
    None,
    /// Full solid AABB covering the entire tile rectangle `[0..tile_w, 0..tile_h]`.
    Solid,
    /// One-way jump-through platform (solid only on the top edge when moving downward).
    OneWay,
    /// Half slab occupying the bottom half of the tile `[y: h/2 .. h]`.
    HalfBottom,
    /// Half slab occupying the top half of the tile `[y: 0 .. h/2]`.
    HalfTop,
    /// 45° slope climbing up to the right (triangle with solid bottom-right).
    /// Height increases linearly from left (0) to right (height).
    SlopeUpRight,
    /// 45° slope climbing up to the left (triangle with solid bottom-left).
    /// Height increases linearly from right (0) to left (height).
    SlopeUpLeft,
    /// 45° ceiling slope (inverted triangle, solid top-right).
    SlopeCeilingRight,
    /// 45° ceiling slope (inverted triangle, solid top-left).
    SlopeCeilingLeft,
    /// Custom sub-rectangle in local tile coordinates (offset + size, e.g. spikes, fences, platforms).
    CustomRect(Rect),
}

/// 2D Tilemap grid component with support for advanced per-tile collision shapes.
pub struct Tilemap {
    pub position: Vec2,
    pub tile_size: Vec2,
    pub cols: usize,
    pub rows: usize,
    pub tiles: Vec<u32>,
    pub solid_tile_ids: HashSet<u32>,
    pub collision_shapes: HashMap<u32, TileCollision>,
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
            collision_shapes: HashMap::new(),
            texture,
            tint: WHITE,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Sets tilemap position in world coordinates.
    pub fn with_position(mut self, pos: Vec2) -> Self {
        self.position = pos;
        self
    }

    /// Builder pattern: Sets entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Sets set of full-solid tile IDs (AABB).
    pub fn with_solid_tiles(mut self, solid_ids: impl IntoIterator<Item = u32>) -> Self {
        for id in solid_ids {
            self.set_tile_collision(id, TileCollision::Solid);
        }
        self
    }

    /// Builder pattern: Sets a specific collision shape for a tile ID (e.g. `SlopeUpRight`, `OneWay`, `HalfBottom`).
    pub fn with_tile_collision(mut self, tile_id: u32, shape: TileCollision) -> Self {
        self.set_tile_collision(tile_id, shape);
        self
    }

    /// Builder pattern: Sets multiple collision shapes at once.
    pub fn with_tile_collisions(mut self, collisions: impl IntoIterator<Item = (u32, TileCollision)>) -> Self {
        for (id, shape) in collisions {
            self.set_tile_collision(id, shape);
        }
        self
    }

    /// Sets or updates the collision shape for a tile ID.
    pub fn set_tile_collision(&mut self, tile_id: u32, shape: TileCollision) {
        match shape {
            TileCollision::None => {
                self.solid_tile_ids.remove(&tile_id);
                self.collision_shapes.remove(&tile_id);
            }
            TileCollision::Solid => {
                self.solid_tile_ids.insert(tile_id);
                self.collision_shapes.insert(tile_id, TileCollision::Solid);
            }
            other => {
                self.solid_tile_ids.insert(tile_id);
                self.collision_shapes.insert(tile_id, other);
            }
        }
    }

    /// Sets full-solid AABB status for a tile ID.
    pub fn set_tile_solid(&mut self, tile_id: u32, solid: bool) {
        if solid {
            self.set_tile_collision(tile_id, TileCollision::Solid);
        } else {
            self.set_tile_collision(tile_id, TileCollision::None);
        }
    }

    /// Returns the collision shape assigned to `tile_id`.
    pub fn get_tile_collision(&self, tile_id: u32) -> TileCollision {
        if let Some(shape) = self.collision_shapes.get(&tile_id) {
            shape.clone()
        } else if self.solid_tile_ids.contains(&tile_id) {
            TileCollision::Solid
        } else {
            TileCollision::None
        }
    }

    /// Returns the collision shape of the tile at grid coordinate `(col, row)`.
    pub fn get_tile_collision_at(&self, col: usize, row: usize) -> TileCollision {
        self.get_tile(col, row)
            .map(|id| self.get_tile_collision(id))
            .unwrap_or(TileCollision::None)
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

    /// Returns `true` if tile at `(col, row)` has any non-None collision shape.
    pub fn is_tile_solid(&self, col: usize, row: usize) -> bool {
        self.get_tile_collision_at(col, row) != TileCollision::None
    }

    /// Returns `true` if tile at `(col, row)` is a one-way platform.
    pub fn is_tile_oneway(&self, col: usize, row: usize) -> bool {
        self.get_tile_collision_at(col, row) == TileCollision::OneWay
    }

    /// Returns tile ID at `world_pos` in world coordinates, or `None` if out of bounds.
    pub fn tile_at_world_pos(&self, world_pos: Vec2) -> Option<u32> {
        let local = world_pos - self.position;
        if local.x < 0.0 || local.y < 0.0 {
            return None;
        }
        let col = (local.x / self.tile_size.x) as usize;
        let row = (local.y / self.tile_size.y) as usize;
        self.get_tile(col, row)
    }

    /// Checks if a single point `world_pos` in world coordinates collides with any solid geometry in the tilemap
    /// (including 45° slopes, half-slabs, and custom sub-boxes).
    pub fn collides_point(&self, world_pos: Vec2) -> bool {
        let local = world_pos - self.position;
        if local.x < 0.0 || local.y < 0.0 {
            return false;
        }

        let col = (local.x / self.tile_size.x) as usize;
        let row = (local.y / self.tile_size.y) as usize;

        if col >= self.cols || row >= self.rows {
            return false;
        }

        let lx = local.x - (col as f32) * self.tile_size.x;
        let ly = local.y - (row as f32) * self.tile_size.y;

        match self.get_tile_collision_at(col, row) {
            TileCollision::None | TileCollision::OneWay => false,
            TileCollision::Solid => true,
            TileCollision::HalfBottom => ly >= self.tile_size.y * 0.5,
            TileCollision::HalfTop => ly <= self.tile_size.y * 0.5,
            TileCollision::SlopeUpRight => {
                let slope_top_y = self.tile_size.y * (1.0 - (lx / self.tile_size.x).clamp(0.0, 1.0));
                ly >= slope_top_y
            }
            TileCollision::SlopeUpLeft => {
                let slope_top_y = self.tile_size.y * ((lx / self.tile_size.x).clamp(0.0, 1.0));
                ly >= slope_top_y
            }
            TileCollision::SlopeCeilingRight => {
                let slope_bot_y = self.tile_size.y * ((lx / self.tile_size.x).clamp(0.0, 1.0));
                ly <= slope_bot_y
            }
            TileCollision::SlopeCeilingLeft => {
                let slope_bot_y = self.tile_size.y * (1.0 - (lx / self.tile_size.x).clamp(0.0, 1.0));
                ly <= slope_bot_y
            }
            TileCollision::CustomRect(r) => {
                lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h
            }
        }
    }

    /// If the tile at `world_pos` is a slope (`SlopeUpRight` or `SlopeUpLeft`), calculates and returns
    /// the exact world Y position of the ground surface at that X coordinate.
    ///
    /// Useful for platformer characters running smoothly along 45° ramps without jittering.
    pub fn get_slope_surface_y(&self, world_pos: Vec2) -> Option<f32> {
        let local = world_pos - self.position;
        if local.x < 0.0 || local.y < 0.0 {
            return None;
        }

        let col = (local.x / self.tile_size.x) as usize;
        let row = (local.y / self.tile_size.y) as usize;

        if col >= self.cols || row >= self.rows {
            return None;
        }

        let tile_origin_y = self.position.y + (row as f32) * self.tile_size.y;
        let lx = (local.x - (col as f32) * self.tile_size.x).clamp(0.0, self.tile_size.x);

        match self.get_tile_collision_at(col, row) {
            TileCollision::SlopeUpRight => {
                let local_surface_y = self.tile_size.y * (1.0 - lx / self.tile_size.x);
                Some(tile_origin_y + local_surface_y)
            }
            TileCollision::SlopeUpLeft => {
                let local_surface_y = self.tile_size.y * (lx / self.tile_size.x);
                Some(tile_origin_y + local_surface_y)
            }
            _ => None,
        }
    }

    /// Returns `true` if `rect` in world space collides with any solid tile shape
    /// (including AABBs, slabs, custom rects, and 45° slopes).
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
                let shape = self.get_tile_collision_at(c, r);
                if shape == TileCollision::None || shape == TileCollision::OneWay {
                    continue;
                }

                let tile_x = self.position.x + (c as f32) * self.tile_size.x;
                let tile_y = self.position.y + (r as f32) * self.tile_size.y;
                let tile_bounds = Rect::new(tile_x, tile_y, self.tile_size.x, self.tile_size.y);

                if !tile_bounds.overlaps(&rect) {
                    continue;
                }

                match shape {
                    TileCollision::Solid => return true,
                    TileCollision::HalfBottom => {
                        let sub_rect = Rect::new(tile_x, tile_y + self.tile_size.y * 0.5, self.tile_size.x, self.tile_size.y * 0.5);
                        if sub_rect.overlaps(&rect) {
                            return true;
                        }
                    }
                    TileCollision::HalfTop => {
                        let sub_rect = Rect::new(tile_x, tile_y, self.tile_size.x, self.tile_size.y * 0.5);
                        if sub_rect.overlaps(&rect) {
                            return true;
                        }
                    }
                    TileCollision::CustomRect(sub) => {
                        let sub_rect = Rect::new(tile_x + sub.x, tile_y + sub.y, sub.w, sub.h);
                        if sub_rect.overlaps(&rect) {
                            return true;
                        }
                    }
                    TileCollision::SlopeUpRight => {
                        // Test bottom-right point of rect against slope
                        let rel_x = (rect.x + rect.w - tile_x).clamp(0.0, self.tile_size.x);
                        let surface_y = tile_y + self.tile_size.y * (1.0 - rel_x / self.tile_size.x);
                        if rect.y + rect.h >= surface_y && rect.y < tile_y + self.tile_size.y {
                            return true;
                        }
                    }
                    TileCollision::SlopeUpLeft => {
                        // Test bottom-left point of rect against slope
                        let rel_x = (rect.x - tile_x).clamp(0.0, self.tile_size.x);
                        let surface_y = tile_y + self.tile_size.y * (rel_x / self.tile_size.x);
                        if rect.y + rect.h >= surface_y && rect.y < tile_y + self.tile_size.y {
                            return true;
                        }
                    }
                    TileCollision::SlopeCeilingRight => {
                        let rel_x = (rect.x - tile_x).clamp(0.0, self.tile_size.x);
                        let surface_y = tile_y + self.tile_size.y * (rel_x / self.tile_size.x);
                        if rect.y <= surface_y && rect.y + rect.h > tile_y {
                            return true;
                        }
                    }
                    TileCollision::SlopeCeilingLeft => {
                        let rel_x = (rect.x + rect.w - tile_x).clamp(0.0, self.tile_size.x);
                        let surface_y = tile_y + self.tile_size.y * (1.0 - rel_x / self.tile_size.x);
                        if rect.y <= surface_y && rect.y + rect.h > tile_y {
                            return true;
                        }
                    }
                    TileCollision::None | TileCollision::OneWay => {}
                }
            }
        }
        false
    }

    /// Checks if a moving entity falling from `prev_y` to `rect.y` lands on top of a [`TileCollision::OneWay`] platform.
    ///
    /// Returns `Some(snapped_y)` with the exact ground position to place the character upon, or `None` if no landing occurred.
    pub fn collides_oneway_landing(&self, rect: Rect, prev_y: f32) -> Option<f32> {
        let prev_bottom = prev_y + rect.h;
        let curr_bottom = rect.y + rect.h;

        // One-way platforms only trigger when falling downward
        if curr_bottom < prev_bottom {
            return None;
        }

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
                if self.get_tile_collision_at(c, r) == TileCollision::OneWay {
                    let tile_top_y = self.position.y + (r as f32) * self.tile_size.y;
                    
                    // Check if the entity's feet crossed the top edge of the tile from above
                    if prev_bottom <= tile_top_y + 4.0 && curr_bottom >= tile_top_y {
                        return Some(tile_top_y - rect.h);
                    }
                }
            }
        }
        None
    }

    /// Returns a list of all tile grid positions `(col, row, tile_id)` that overlap with `rect` in world space.
    pub fn colliding_tiles(&self, rect: Rect) -> Vec<(usize, usize, u32)> {
        let local_x = rect.x - self.position.x;
        let local_y = rect.y - self.position.y;

        let start_col = (local_x / self.tile_size.x).floor().max(0.0) as usize;
        let end_col = ((local_x + rect.w) / self.tile_size.x).ceil().max(0.0) as usize;

        let start_row = (local_y / self.tile_size.y).floor().max(0.0) as usize;
        let end_row = ((local_y + rect.h) / self.tile_size.y).ceil().max(0.0) as usize;

        let end_c = end_col.min(self.cols);
        let end_r = end_row.min(self.rows);

        let mut results = Vec::new();
        for r in start_row..end_r {
            for c in start_col..end_c {
                if let Some(tile_id) = self.get_tile(c, r) {
                    let tile_rect = Rect {
                        x: self.position.x + (c as f32) * self.tile_size.x,
                        y: self.position.y + (r as f32) * self.tile_size.y,
                        w: self.tile_size.x,
                        h: self.tile_size.y,
                    };
                    if tile_rect.overlaps(&rect) {
                        results.push((c, r, tile_id));
                    }
                }
            }
        }
        results
    }

    /// Returns a list of solid tile grid positions `(col, row, tile_id, TileCollision)` that overlap with `rect` in world space.
    pub fn solid_colliding_tiles(&self, rect: Rect) -> Vec<(usize, usize, u32, TileCollision)> {
        self.colliding_tiles(rect)
            .into_iter()
            .filter_map(|(c, r, id)| {
                let shape = self.get_tile_collision(id);
                if shape != TileCollision::None {
                    Some((c, r, id, shape))
                } else {
                    None
                }
            })
            .collect()
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
    fn test_tilemap_ascii_and_collision_shapes() {
        let mut map = Tilemap {
            position: Vec2::ZERO,
            tile_size: vec2(16.0, 16.0),
            cols: 4,
            rows: 4,
            tiles: vec![0; 16],
            solid_tile_ids: HashSet::new(),
            collision_shapes: HashMap::new(),
            texture: unsafe { std::mem::zeroed() },
            tint: WHITE,
            tag: String::new(),
            visible: true,
            active: true,
        };

        map.set_tile_collision(1, TileCollision::Solid);
        map.set_tile_collision(2, TileCollision::SlopeUpRight);
        map.set_tile_collision(3, TileCollision::HalfBottom);
        map.set_tile_collision(4, TileCollision::OneWay);

        let ascii = "
1111
1201
1341
1111
";
        map.load_from_ascii(ascii, |c| match c {
            '1' => Some(1),
            '2' => Some(2),
            '3' => Some(3),
            '4' => Some(4),
            '0' => Some(0),
            _ => None,
        });

        // 1. Solid AABB test
        assert!(map.is_tile_solid(0, 0));
        assert!(map.collides_point(vec2(8.0, 8.0)));

        // 2. SlopeUpRight test at (1, 1) -> x in [16..32], y in [16..32]
        // At x = 24.0 (halfway), slope height starts at y = 24.0
        assert_eq!(map.get_slope_surface_y(vec2(24.0, 20.0)), Some(24.0));
        assert!(!map.collides_point(vec2(24.0, 20.0))); // Above slope
        assert!(map.collides_point(vec2(24.0, 28.0)));  // Inside slope solid body

        // 3. HalfBottom test at (1, 2) -> x in [16..32], y in [32..48]
        assert!(!map.collides_point(vec2(20.0, 35.0))); // Top half of half-slab
        assert!(map.collides_point(vec2(20.0, 44.0)));  // Bottom half of half-slab

        // 4. One-Way Landing test at (2, 2) -> y = 32.0
        let landing = map.collides_oneway_landing(Rect::new(34.0, 32.0, 10.0, 10.0), 20.0);
        assert_eq!(landing, Some(22.0)); // 32.0 - 10.0 height = 22.0
    }
}
