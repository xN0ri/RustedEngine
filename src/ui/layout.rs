//! Declarative and automatic layout containers: [`VBox`], [`HBox`], [`Grid`], [`Container`], [`Column`], [`Row`], [`Gap`], and layout macros.

use macroquad::{
    color::{Color, WHITE},
    math::{Rect, Vec2, vec2},
    shapes::draw_rectangle,
    texture::{DrawTextureParams, Texture2D, draw_texture_ex},
};

use crate::{
    engine::Context,
    object::Clickable,
    world::Object,
};

use super::core::{Margin, Padding, UIAnchor, draw_nine_slice, get_draw_offset, safe_screen_height, safe_screen_width};

/// Alignment along the cross axis of a layout container.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum LayoutAlign {
    #[default]
    Start,
    Center,
    End,
    Stretch,
}

/// Distribution along the main axis of a layout container.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum LayoutJustify {
    #[default]
    Start,
    Center,
    End,
    SpaceBetween,
}

/// Container that automatically positions child entities in a vertical column.
pub struct VBox {
    pub position: Vec2,
    pub size: Vec2,
    pub spacing: f32,
    pub align: LayoutAlign,
    pub justify: LayoutJustify,
    pub padding: Padding,
    pub margin: Margin,
    pub children: Vec<Box<dyn Object>>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    pub fill_parent: bool,
}

impl VBox {
    /// Creates an empty [`VBox`] at `(0, 0)` with 0.0 vertical spacing.
    pub fn empty() -> Self {
        Self::new(Vec2::ZERO, 0.0)
    }

    /// Creates a new [`VBox`] at `position` with vertical `spacing` between children.
    pub fn new(position: Vec2, spacing: f32) -> Self {
        Self {
            position,
            size: Vec2::ZERO,
            spacing,
            align: LayoutAlign::Start,
            justify: LayoutJustify::Start,
            padding: Padding::default(),
            margin: Margin::default(),
            children: Vec::new(),
            tag: String::new(),
            visible: true,
            active: true,
            fill_parent: false,
        }
    }

    /// Builder pattern: Sets explicit position `(x, y)`.
    pub fn with_position(mut self, position: Vec2) -> Self {
        self.position = position;
        self.relayout();
        self
    }

    /// Builder pattern: Sets explicit position `(x, y)` (alias for [`with_position`](VBox::with_position)).
    pub fn with_pos(self, pos: Vec2) -> Self {
        self.with_position(pos)
    }

    /// Builder pattern: Sets explicit size `(width, height)`.
    pub fn with_size(mut self, size: Vec2) -> Self {
        self.size = size;
        self.relayout();
        self
    }

    /// Builder pattern: Sets vertical spacing between children.
    pub fn with_spacing(mut self, spacing: f32) -> Self {
        self.spacing = spacing;
        self.relayout();
        self
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    pub fn fill_parent(mut self) -> Self {
        self.fill_parent = true;
        self
    }

    /// Builder pattern: Adds a child component to the layout column.
    pub fn with_child<O: Object + 'static>(mut self, child: O) -> Self {
        self.children.push(Box::new(child));
        self.relayout();
        self
    }

    /// Builder pattern: Sets cross-axis alignment.
    pub fn with_align(mut self, align: LayoutAlign) -> Self {
        self.align = align;
        self.relayout();
        self
    }

    /// Builder pattern: Sets internal padding.
    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self.relayout();
        self
    }

    /// Builder pattern: Sets external margin.
    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self.relayout();
        self
    }

    /// Recalculates child positions and container size.
    pub fn relayout(&mut self) {
        let mut cur_y = self.position.y + self.padding.top;
        let mut max_w: f32 = 0.0;

        for child in self.children.iter_mut() {
            let bounds = child.bounds().unwrap_or(Rect::new(0.0, 0.0, 100.0, 20.0));
            let cur_x = match self.align {
                LayoutAlign::Start | LayoutAlign::Stretch => self.position.x + self.padding.left,
                LayoutAlign::Center => self.position.x + self.padding.left + (self.size.x - bounds.w) * 0.5,
                LayoutAlign::End => self.position.x + self.padding.left + (self.size.x - bounds.w),
            };
            child.set_position(vec2(cur_x, cur_y));
            cur_y += bounds.h + self.spacing;
            max_w = max_w.max(bounds.w);
        }

        let total_h = (cur_y - self.position.y - self.spacing + self.padding.bottom).max(0.0);
        self.size = vec2(max_w + self.padding.left + self.padding.right, total_h);
    }
}

impl Object for VBox {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
        }
        for child in self.children.iter_mut() {
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        for child in self.children.iter() {
            child.draw();
        }
    }

    fn set_position(&mut self, pos: Vec2) {
        self.position = pos;
        self.relayout();
    }
    fn set_size(&mut self, size: Vec2) {
        self.size = size;
        self.relayout();
    }
    fn is_fill_parent(&self) -> bool { self.fill_parent }
    fn set_fill_parent(&mut self, fill: bool) { self.fill_parent = fill; }
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

impl Default for VBox {
    fn default() -> Self {
        Self::empty()
    }
}

/// Container that automatically positions child entities in a horizontal row.
pub struct HBox {
    pub position: Vec2,
    pub size: Vec2,
    pub spacing: f32,
    pub align: LayoutAlign,
    pub padding: Padding,
    pub margin: Margin,
    pub children: Vec<Box<dyn Object>>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    pub fill_parent: bool,
}

impl HBox {
    /// Creates an empty [`HBox`] at `(0, 0)` with 0.0 horizontal spacing.
    pub fn empty() -> Self {
        Self::new(Vec2::ZERO, 0.0)
    }

    /// Creates a new [`HBox`] at `position` with horizontal `spacing` between children.
    pub fn new(position: Vec2, spacing: f32) -> Self {
        Self {
            position,
            size: Vec2::ZERO,
            spacing,
            align: LayoutAlign::Start,
            padding: Padding::default(),
            margin: Margin::default(),
            children: Vec::new(),
            tag: String::new(),
            visible: true,
            active: true,
            fill_parent: false,
        }
    }

    /// Builder pattern: Sets explicit position `(x, y)`.
    pub fn with_position(mut self, position: Vec2) -> Self {
        self.position = position;
        self.relayout();
        self
    }

    /// Builder pattern: Sets explicit position `(x, y)` (alias for [`with_position`](HBox::with_position)).
    pub fn with_pos(self, pos: Vec2) -> Self {
        self.with_position(pos)
    }

    /// Builder pattern: Sets explicit size `(width, height)`.
    pub fn with_size(mut self, size: Vec2) -> Self {
        self.size = size;
        self.relayout();
        self
    }

    /// Builder pattern: Sets horizontal spacing between children.
    pub fn with_spacing(mut self, spacing: f32) -> Self {
        self.spacing = spacing;
        self.relayout();
        self
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    pub fn fill_parent(mut self) -> Self {
        self.fill_parent = true;
        self
    }

    /// Builder pattern: Adds a child component to the layout row.
    pub fn with_child<O: Object + 'static>(mut self, child: O) -> Self {
        self.children.push(Box::new(child));
        self.relayout();
        self
    }

    /// Builder pattern: Sets internal padding.
    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self.relayout();
        self
    }

    /// Builder pattern: Sets external margin.
    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self.relayout();
        self
    }

    /// Recalculates child positions and container size.
    pub fn relayout(&mut self) {
        let mut cur_x = self.position.x + self.padding.left;
        let mut max_h: f32 = 0.0;

        for child in self.children.iter_mut() {
            let bounds = child.bounds().unwrap_or(Rect::new(0.0, 0.0, 100.0, 20.0));
            let cur_y = match self.align {
                LayoutAlign::Start | LayoutAlign::Stretch => self.position.y + self.padding.top,
                LayoutAlign::Center => self.position.y + self.padding.top + (self.size.y - bounds.h) * 0.5,
                LayoutAlign::End => self.position.y + self.padding.top + (self.size.y - bounds.h),
            };
            child.set_position(vec2(cur_x, cur_y));
            cur_x += bounds.w + self.spacing;
            max_h = max_h.max(bounds.h);
        }

        let total_w = (cur_x - self.position.x - self.spacing + self.padding.right).max(0.0);
        self.size = vec2(total_w, max_h + self.padding.top + self.padding.bottom);
    }
}

impl Default for HBox {
    fn default() -> Self {
        Self::empty()
    }
}

impl Object for HBox {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
        }
        for child in self.children.iter_mut() {
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        for child in self.children.iter() {
            child.draw();
        }
    }

    fn set_position(&mut self, pos: Vec2) {
        self.position = pos;
        self.relayout();
    }
    fn set_size(&mut self, size: Vec2) {
        self.size = size;
        self.relayout();
    }
    fn is_fill_parent(&self) -> bool { self.fill_parent }
    fn set_fill_parent(&mut self, fill: bool) { self.fill_parent = fill; }
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

/// Container that automatically lays out children in an M × N grid, wrapping rows.
pub struct Grid {
    pub position: Vec2,
    pub columns: usize,
    pub cell_size: Vec2,
    pub spacing: Vec2,
    pub padding: Padding,
    pub margin: Margin,
    pub children: Vec<Box<dyn Object>>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Grid {
    /// Creates an empty [`Grid`] at `(0, 0)` with 1 column.
    pub fn empty() -> Self {
        Self::new(Vec2::ZERO, 1, Vec2::ZERO, Vec2::ZERO)
    }

    /// Creates a new [`Grid`] at `position` with fixed `columns` count and `cell_size`.
    pub fn new(position: Vec2, columns: usize, cell_size: Vec2, spacing: Vec2) -> Self {
        Self {
            position,
            columns: columns.max(1),
            cell_size,
            spacing,
            padding: Padding::default(),
            margin: Margin::default(),
            children: Vec::new(),
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Builder pattern: Sets explicit grid position `(x, y)`.
    pub fn with_position(mut self, position: Vec2) -> Self {
        self.position = position;
        self.relayout();
        self
    }

    /// Builder pattern: Sets explicit grid position `(x, y)` (alias for [`with_position`](Grid::with_position)).
    pub fn with_pos(self, pos: Vec2) -> Self {
        self.with_position(pos)
    }

    /// Builder pattern: Sets explicit number of columns.
    pub fn with_columns(mut self, columns: usize) -> Self {
        self.columns = columns.max(1);
        self.relayout();
        self
    }

    /// Builder pattern: Sets cell dimensions `(width, height)`.
    pub fn with_cell_size(mut self, cell_size: Vec2) -> Self {
        self.cell_size = cell_size;
        self.relayout();
        self
    }

    /// Builder pattern: Sets grid spacing between cells.
    pub fn with_spacing(mut self, spacing: Vec2) -> Self {
        self.spacing = spacing;
        self.relayout();
        self
    }

    /// Builder pattern: Sets the entity tag.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Adds a child component to the grid.
    pub fn with_child<O: Object + 'static>(mut self, child: O) -> Self {
        self.children.push(Box::new(child));
        self.relayout();
        self
    }

    /// Builder pattern: Sets internal padding.
    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self.relayout();
        self
    }

    /// Builder pattern: Sets external margin.
    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self.relayout();
        self
    }

    /// Recalculates child positions based on grid column wrapping.
    pub fn relayout(&mut self) {
        for (i, child) in self.children.iter_mut().enumerate() {
            let col = i % self.columns;
            let row = i / self.columns;
            let x = self.position.x + self.padding.left + (col as f32) * (self.cell_size.x + self.spacing.x);
            let y = self.position.y + self.padding.top + (row as f32) * (self.cell_size.y + self.spacing.y);
            child.set_position(vec2(x, y));
        }
    }
}

impl Default for Grid {
    fn default() -> Self {
        Self::empty()
    }
}

impl Object for Grid {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active {
            return;
        }
        for child in self.children.iter_mut() {
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        for child in self.children.iter() {
            child.draw();
        }
    }

    fn set_position(&mut self, pos: Vec2) {
        self.position = pos;
        self.relayout();
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

/// Conversion trait allowing zero-`Box` child passing into containers and components.
pub trait IntoUIObject {
    fn into_ui_box(self) -> Box<dyn Object>;
}

impl<T: Object> IntoUIObject for T {
    fn into_ui_box(self) -> Box<dyn Object> {
        Box::new(self)
    }
}

impl IntoUIObject for Box<dyn Object> {
    fn into_ui_box(self) -> Box<dyn Object> {
        self
    }
}

/// Alignment preset within a parent bounding container.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Align {
    TopLeft,
    TopCenter,
    TopRight,
    CenterLeft,
    Center,
    CenterRight,
    BottomLeft,
    BottomCenter,
    BottomRight,
}

impl Align {
    /// Computes relative offset `Vec2(x, y)` inside `parent_size` for a child of `child_size` with `padding`.
    pub fn compute_offset(self, parent_size: Vec2, child_size: Vec2, padding: Padding) -> Vec2 {
        let avail_w = (parent_size.x - padding.left - padding.right).max(0.0);
        let avail_h = (parent_size.y - padding.top - padding.bottom).max(0.0);

        let (rx, ry) = match self {
            Align::TopLeft => (0.0, 0.0),
            Align::TopCenter => ((avail_w - child_size.x) * 0.5, 0.0),
            Align::TopRight => (avail_w - child_size.x, 0.0),
            Align::CenterLeft => (0.0, (avail_h - child_size.y) * 0.5),
            Align::Center => ((avail_w - child_size.x) * 0.5, (avail_h - child_size.y) * 0.5),
            Align::CenterRight => (avail_w - child_size.x, (avail_h - child_size.y) * 0.5),
            Align::BottomLeft => (0.0, avail_h - child_size.y),
            Align::BottomCenter => ((avail_w - child_size.x) * 0.5, avail_h - child_size.y),
            Align::BottomRight => (avail_w - child_size.x, avail_h - child_size.y),
        };

        vec2(padding.left + rx, padding.top + ry)
    }

    /// Computes top-left `Vec2` position for an element of `size` relative to screen dimensions (delegates to [`UIAnchor`]).
    pub fn compute_position(self, size: Vec2, padding: impl Into<Padding>) -> Vec2 {
        UIAnchor::from(self).compute_position(size, padding)
    }
}

impl From<UIAnchor> for Align {
    fn from(anchor: UIAnchor) -> Self {
        match anchor {
            UIAnchor::TopLeft => Align::TopLeft,
            UIAnchor::TopCenter => Align::TopCenter,
            UIAnchor::TopRight => Align::TopRight,
            UIAnchor::CenterLeft => Align::CenterLeft,
            UIAnchor::Center => Align::Center,
            UIAnchor::CenterRight => Align::CenterRight,
            UIAnchor::BottomLeft => Align::BottomLeft,
            UIAnchor::BottomCenter => Align::BottomCenter,
            UIAnchor::BottomRight => Align::BottomRight,
        }
    }
}

impl From<Align> for UIAnchor {
    fn from(align: Align) -> Self {
        match align {
            Align::TopLeft => UIAnchor::TopLeft,
            Align::TopCenter => UIAnchor::TopCenter,
            Align::TopRight => UIAnchor::TopRight,
            Align::CenterLeft => UIAnchor::CenterLeft,
            Align::Center => UIAnchor::Center,
            Align::CenterRight => UIAnchor::CenterRight,
            Align::BottomLeft => UIAnchor::BottomLeft,
            Align::BottomCenter => UIAnchor::BottomCenter,
            Align::BottomRight => UIAnchor::BottomRight,
        }
    }
}

/// Main axis alignment for [`Column`] (vertical) and [`Row`] (horizontal).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum MainAxisAlignment {
    #[default]
    Start,
    Center,
    End,
    SpaceBetween,
    SpaceAround,
    SpaceEvenly,
}

impl From<LayoutJustify> for MainAxisAlignment {
    fn from(j: LayoutJustify) -> Self {
        match j {
            LayoutJustify::Start => MainAxisAlignment::Start,
            LayoutJustify::Center => MainAxisAlignment::Center,
            LayoutJustify::End => MainAxisAlignment::End,
            LayoutJustify::SpaceBetween => MainAxisAlignment::SpaceBetween,
        }
    }
}

impl From<MainAxisAlignment> for LayoutJustify {
    fn from(m: MainAxisAlignment) -> Self {
        match m {
            MainAxisAlignment::Start => LayoutJustify::Start,
            MainAxisAlignment::Center => LayoutJustify::Center,
            MainAxisAlignment::End => LayoutJustify::End,
            MainAxisAlignment::SpaceBetween
            | MainAxisAlignment::SpaceAround
            | MainAxisAlignment::SpaceEvenly => LayoutJustify::SpaceBetween,
        }
    }
}

/// Cross axis alignment for [`Column`] (horizontal) and [`Row`] (vertical).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum CrossAxisAlignment {
    #[default]
    Start,
    Center,
    End,
    Stretch,
}

impl From<LayoutAlign> for CrossAxisAlignment {
    fn from(a: LayoutAlign) -> Self {
        match a {
            LayoutAlign::Start => CrossAxisAlignment::Start,
            LayoutAlign::Center => CrossAxisAlignment::Center,
            LayoutAlign::End => CrossAxisAlignment::End,
            LayoutAlign::Stretch => CrossAxisAlignment::Stretch,
        }
    }
}

impl From<CrossAxisAlignment> for LayoutAlign {
    fn from(a: CrossAxisAlignment) -> Self {
        match a {
            CrossAxisAlignment::Start => LayoutAlign::Start,
            CrossAxisAlignment::Center => LayoutAlign::Center,
            CrossAxisAlignment::End => LayoutAlign::End,
            CrossAxisAlignment::Stretch => LayoutAlign::Stretch,
        }
    }
}

/// Spacing widget for creating fixed gaps between elements inside [`Column`] or [`Row`].
pub struct Gap {
    pub width: f32,
    pub height: f32,
    pub visible: bool,
}

impl Gap {
    /// Creates a uniform gap size `(size × size)`.
    pub fn new(size: f32) -> Self {
        Self { width: size, height: size, visible: true }
    }

    /// Creates a vertical gap of height `h`.
    pub fn height(h: f32) -> Self {
        Self { width: 0.0, height: h, visible: true }
    }

    /// Creates a horizontal gap of width `w`.
    pub fn width(w: f32) -> Self {
        Self { width: w, height: 0.0, visible: true }
    }
}

impl Object for Gap {
    fn update(&mut self, _ctx: &mut Context) {}
    fn draw(&self) {}
    fn bounds(&self) -> Option<Rect> {
        Some(Rect { x: 0.0, y: 0.0, w: self.width, h: self.height })
    }
    fn is_visible(&self) -> bool { self.visible }
    fn set_visible(&mut self, visible: bool) { self.visible = visible; }
}

/// Flexible container widget supporting background color, border, padding, margin, alignment, and child layout.
pub struct Container {
    pub position: Vec2,
    pub size: Vec2,
    pub padding: Padding,
    pub margin: Margin,
    pub bg_color: Option<Color>,
    pub border_color: Option<Color>,
    pub border_width: f32,
    pub alignment: Option<Align>,
    pub child: Option<Box<dyn Object>>,
    pub anchor: Option<(UIAnchor, Padding)>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    pub fill_parent: bool,
}

impl Container {
    /// Creates an empty [`Container`] at `(0, 0)`.
    pub fn empty() -> Self {
        Self::new()
    }

    pub fn new() -> Self {
        Self {
            position: Vec2::ZERO,
            size: Vec2::ZERO,
            padding: Padding::default(),
            margin: Margin::default(),
            bg_color: None,
            border_color: None,
            border_width: 1.0,
            alignment: None,
            child: None,
            anchor: None,
            tag: String::new(),
            visible: true,
            active: true,
            fill_parent: false,
        }
    }

    /// Builder pattern: Sets explicit container position `(x, y)`.
    pub fn with_position(mut self, position: Vec2) -> Self {
        self.position = position;
        self
    }

    /// Builder pattern: Sets explicit container position `(x, y)` (alias for [`with_position`](Container::with_position)).
    pub fn with_pos(mut self, pos: Vec2) -> Self {
        self.position = pos;
        self
    }

    pub fn fill_parent(mut self) -> Self {
        self.fill_parent = true;
        self
    }

    pub fn with_child<O: IntoUIObject>(mut self, child: O) -> Self {
        self.child = Some(child.into_ui_box());
        self
    }

    pub fn with_size(mut self, size: Vec2) -> Self {
        self.size = size;
        self
    }

    /// Builder pattern: Sets both position and size from a [`Rect`].
    pub fn with_rect(mut self, rect: Rect) -> Self {
        self.position = vec2(rect.x, rect.y);
        self.size = vec2(rect.w, rect.h);
        self
    }

    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self
    }

    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self
    }

    pub fn with_background(mut self, color: Color) -> Self {
        self.bg_color = Some(color);
        self
    }

    pub fn with_border(mut self, color: Color, width: f32) -> Self {
        self.border_color = Some(color);
        self.border_width = width;
        self
    }

    pub fn with_alignment(mut self, align: Align) -> Self {
        self.alignment = Some(align);
        self
    }

    pub fn align_to_screen(mut self, anchor: UIAnchor, padding: impl Into<Padding>) -> Self {
        let pad = padding.into();
        self.position = anchor.compute_position(self.size, pad);
        self.anchor = Some((anchor, pad));
        self
    }

    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }
}

impl Default for Container {
    fn default() -> Self {
        Self::new()
    }
}

impl Object for Container {
    fn update(&mut self, ctx: &mut Context) {
        if !self.visible || !self.active { return; }
        if let Some((anchor, pad)) = self.anchor {
            self.position = anchor.compute_position(self.size, pad);
        }
        if let Some(ref mut child) = self.child {
            if child.is_fill_parent() {
                let avail_w = (self.size.x - self.padding.left - self.padding.right).max(0.0);
                let avail_h = (self.size.y - self.padding.top - self.padding.bottom).max(0.0);
                child.set_size(vec2(avail_w, avail_h));
            }
            let child_size = child.bounds().map(|b| vec2(b.w, b.h)).unwrap_or(Vec2::ZERO);
            let align = self.alignment.unwrap_or(Align::TopLeft);
            let offset = align.compute_offset(self.size, child_size, self.padding);
            child.set_position(self.position + offset);
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible { return; }
        let pos = self.position + get_draw_offset();
        if let Some(bg) = self.bg_color {
            draw_rectangle(pos.x, pos.y, self.size.x, self.size.y, bg);
        }
        if let Some(border) = self.border_color {
            let bw = self.border_width;
            draw_rectangle(pos.x, pos.y, self.size.x, bw, border);
            draw_rectangle(pos.x, pos.y + self.size.y - bw, self.size.x, bw, border);
            draw_rectangle(pos.x, pos.y, bw, self.size.y, border);
            draw_rectangle(pos.x + self.size.x - bw, pos.y, bw, self.size.y, border);
        }
        if let Some(ref child) = self.child {
            child.draw();
        }
    }

    fn bounds(&self) -> Option<Rect> {
        Some(Rect { x: self.position.x, y: self.position.y, w: self.size.x, h: self.size.y })
    }

    fn tag(&self) -> &str { &self.tag }
    fn is_visible(&self) -> bool { self.visible }
    fn set_visible(&mut self, visible: bool) { self.visible = visible; }
    fn is_active(&self) -> bool { self.active }
    fn set_active(&mut self, active: bool) { self.active = active; }
    fn set_position(&mut self, pos: Vec2) { self.position = pos; }
    fn set_size(&mut self, size: Vec2) { self.size = size; }
    fn is_fill_parent(&self) -> bool { self.fill_parent }
    fn set_fill_parent(&mut self, fill: bool) { self.fill_parent = fill; }

    fn as_any(&self) -> Option<&dyn std::any::Any> {
        Some(self)
    }

    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        Some(self)
    }

    fn set_text(&mut self, text: &str) {
        if let Some(ref mut child) = self.child {
            child.set_text(text);
        }
    }

    fn get_children(&self) -> Vec<&dyn Object> {
        self.child.as_ref().map(|c| c.as_ref() as &dyn Object).into_iter().collect()
    }

    fn get_children_mut<'a>(&'a mut self) -> Vec<&'a mut (dyn Object + 'static)> {
        self.child.as_mut().map(|c| c.as_mut() as &mut (dyn Object + 'static)).into_iter().collect()
    }
}

impl Clickable for Container {
    fn click_rect(&self) -> Rect {
        Rect { x: self.position.x, y: self.position.y, w: self.size.x, h: self.size.y }
    }
    fn is_active(&self) -> bool { self.active }
}

/// Vertical column container layout widget (Flutter-inspired).
pub struct Column {
    pub position: Vec2,
    pub size: Vec2,
    pub main_axis_alignment: MainAxisAlignment,
    pub cross_axis_alignment: CrossAxisAlignment,
    pub spacing: f32,
    pub padding: Padding,
    pub margin: Margin,
    pub children: Vec<Box<dyn Object>>,
    pub anchor: Option<(UIAnchor, Padding)>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    pub fill_parent: bool,
}

impl Column {
    /// Creates an empty [`Column`] at `(0, 0)`.
    pub fn empty() -> Self {
        Self::new()
    }

    pub fn new() -> Self {
        Self {
            position: Vec2::ZERO,
            size: Vec2::ZERO,
            main_axis_alignment: MainAxisAlignment::Start,
            cross_axis_alignment: CrossAxisAlignment::Start,
            spacing: 0.0,
            padding: Padding::default(),
            margin: Margin::default(),
            children: Vec::new(),
            anchor: None,
            tag: String::new(),
            visible: true,
            active: true,
            fill_parent: false,
        }
    }

    /// Builder pattern: Sets explicit column position `(x, y)`.
    pub fn with_position(mut self, position: Vec2) -> Self {
        self.position = position;
        self
    }

    /// Builder pattern: Sets explicit column position `(x, y)` (alias for [`with_position`](Column::with_position)).
    pub fn with_pos(mut self, pos: Vec2) -> Self {
        self.position = pos;
        self
    }

    /// Builder pattern: Sets explicit column size `(width, height)`.
    pub fn with_size(mut self, size: Vec2) -> Self {
        self.size = size;
        self
    }

    /// Builder pattern: Sets both position and size from a [`Rect`].
    pub fn with_rect(mut self, rect: Rect) -> Self {
        self.position = vec2(rect.x, rect.y);
        self.size = vec2(rect.w, rect.h);
        self
    }

    pub fn fill_parent(mut self) -> Self {
        self.fill_parent = true;
        self
    }

    pub fn with_fill_parent(mut self, fill: bool) -> Self {
        self.fill_parent = fill;
        self
    }

    pub fn child<O: IntoUIObject>(mut self, child: O) -> Self {
        self.children.push(child.into_ui_box());
        self
    }

    pub fn children<I>(mut self, items: I) -> Self
    where
        I: IntoIterator,
        I::Item: IntoUIObject,
    {
        for item in items {
            self.children.push(item.into_ui_box());
        }
        self
    }

    pub fn with_children<I>(self, items: I) -> Self
    where
        I: IntoIterator,
        I::Item: IntoUIObject,
    {
        self.children(items)
    }

    pub fn with_spacing(mut self, spacing: f32) -> Self {
        self.spacing = spacing;
        self
    }

    pub fn with_main_axis_alignment(mut self, align: MainAxisAlignment) -> Self {
        self.main_axis_alignment = align;
        self
    }

    pub fn with_cross_axis_alignment(mut self, align: CrossAxisAlignment) -> Self {
        self.cross_axis_alignment = align;
        self
    }

    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self
    }

    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self
    }

    pub fn align_to_screen(mut self, anchor: UIAnchor, padding: impl Into<Padding>) -> Self {
        let pad = padding.into();
        self.position = anchor.compute_position(self.size, pad);
        self.anchor = Some((anchor, pad));
        self
    }

    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Resizes and positions column to cover full screen (`screen_width()` × `screen_height()`).
    pub fn fullscreen(mut self) -> Self {
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        self.position = Vec2::ZERO;
        self.size = vec2(sw, sh);
        self
    }

    /// Builder pattern: Resizes and positions column to fit screen with uniform padding margin.
    pub fn fit_to_screen_padding(mut self, padding: f32) -> Self {
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        self.position = vec2(padding, padding);
        self.size = vec2((sw - padding * 2.0).max(10.0), (sh - padding * 2.0).max(10.0));
        self
    }

    pub fn layout_children(&mut self) {
        if self.children.is_empty() { return; }

        let mut child_sizes: Vec<Vec2> = Vec::with_capacity(self.children.len());
        let mut total_child_h = 0.0f32;
        let mut max_child_w = 0.0f32;

        for child in &self.children {
            if let Some(b) = child.bounds() {
                child_sizes.push(vec2(b.w, b.h));
                total_child_h += b.h;
                max_child_w = max_child_w.max(b.w);
            } else {
                child_sizes.push(Vec2::ZERO);
            }
        }

        let num_children = self.children.len() as f32;
        let total_spacing = self.spacing * (num_children - 1.0).max(0.0);
        let content_h = total_child_h + total_spacing;
        let content_w = max_child_w;

        if self.size == Vec2::ZERO {
            self.size = vec2(content_w + self.padding.left + self.padding.right, content_h + self.padding.top + self.padding.bottom);
        }

        let avail_h = (self.size.y - self.padding.top - self.padding.bottom).max(0.0);
        let avail_w = (self.size.x - self.padding.left - self.padding.right).max(0.0);

        for (i, child) in self.children.iter_mut().enumerate() {
            if child.is_fill_parent() {
                child.set_size(vec2(avail_w, child_sizes[i].y));
                if let Some(b) = child.bounds() {
                    child_sizes[i] = vec2(b.w, b.h);
                }
            }
        }

        let (start_y, gap_between) = match self.main_axis_alignment {
            MainAxisAlignment::Start => (self.padding.top, self.spacing),
            MainAxisAlignment::Center => (self.padding.top + (avail_h - content_h).max(0.0) * 0.5, self.spacing),
            MainAxisAlignment::End => (self.padding.top + (avail_h - content_h).max(0.0), self.spacing),
            MainAxisAlignment::SpaceBetween => {
                let g = if num_children > 1.0 { (avail_h - total_child_h) / (num_children - 1.0) } else { 0.0 };
                (self.padding.top, g)
            }
            MainAxisAlignment::SpaceAround => {
                let g = if num_children > 0.0 { (avail_h - total_child_h) / num_children } else { 0.0 };
                (self.padding.top + g * 0.5, g)
            }
            MainAxisAlignment::SpaceEvenly => {
                let g = if num_children > 0.0 { (avail_h - total_child_h) / (num_children + 1.0) } else { 0.0 };
                (self.padding.top + g, g)
            }
        };

        let mut current_y = start_y;
        for (i, child) in self.children.iter_mut().enumerate() {
            let sz = child_sizes[i];
            let x_offset = match self.cross_axis_alignment {
                CrossAxisAlignment::Start => self.padding.left,
                CrossAxisAlignment::Center => self.padding.left + (avail_w - sz.x).max(0.0) * 0.5,
                CrossAxisAlignment::End => self.padding.left + (avail_w - sz.x).max(0.0),
                CrossAxisAlignment::Stretch => self.padding.left,
            };

            child.set_position(self.position + vec2(x_offset, current_y));
            current_y += sz.y + gap_between;
        }
    }
}

impl Default for Column {
    fn default() -> Self {
        Self::new()
    }
}

impl Object for Column {
    fn update(&mut self, ctx: &mut Context) {
        if !self.visible || !self.active { return; }
        self.layout_children();
        if let Some((anchor, pad)) = self.anchor {
            self.position = anchor.compute_position(self.size, pad);
            self.layout_children();
        }
        for child in &mut self.children {
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible { return; }
        for child in &self.children {
            child.draw();
        }
    }

    fn bounds(&self) -> Option<Rect> {
        Some(Rect { x: self.position.x, y: self.position.y, w: self.size.x, h: self.size.y })
    }

    fn set_position(&mut self, pos: Vec2) { self.position = pos; }
    fn set_size(&mut self, size: Vec2) { self.size = size; }
    fn is_fill_parent(&self) -> bool { self.fill_parent }
    fn set_fill_parent(&mut self, fill: bool) { self.fill_parent = fill; }
    fn is_visible(&self) -> bool { self.visible }
    fn set_visible(&mut self, visible: bool) { self.visible = visible; }
    fn is_active(&self) -> bool { self.active }
    fn set_active(&mut self, active: bool) { self.active = active; }
    fn tag(&self) -> &str { &self.tag }

    fn as_any(&self) -> Option<&dyn std::any::Any> {
        Some(self)
    }

    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        Some(self)
    }

    fn set_text(&mut self, text: &str) {
        for child in &mut self.children {
            child.set_text(text);
        }
    }

    fn get_children(&self) -> Vec<&dyn Object> {
        self.children.iter().map(|c| c.as_ref()).collect()
    }

    fn get_children_mut<'a>(&'a mut self) -> Vec<&'a mut (dyn Object + 'static)> {
        self.children.iter_mut().map(|c| c.as_mut()).collect()
    }
}

impl Clickable for Column {
    fn click_rect(&self) -> Rect {
        Rect { x: self.position.x, y: self.position.y, w: self.size.x, h: self.size.y }
    }
    fn is_active(&self) -> bool { self.active }
}

/// Horizontal row container layout widget (Flutter-inspired).
pub struct Row {
    pub position: Vec2,
    pub size: Vec2,
    pub main_axis_alignment: MainAxisAlignment,
    pub cross_axis_alignment: CrossAxisAlignment,
    pub spacing: f32,
    pub padding: Padding,
    pub margin: Margin,
    pub children: Vec<Box<dyn Object>>,
    pub anchor: Option<(UIAnchor, Padding)>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    pub fill_parent: bool,
}

impl Row {
    /// Creates an empty [`Row`] at `(0, 0)`.
    pub fn empty() -> Self {
        Self::new()
    }

    pub fn new() -> Self {
        Self {
            position: Vec2::ZERO,
            size: Vec2::ZERO,
            main_axis_alignment: MainAxisAlignment::Start,
            cross_axis_alignment: CrossAxisAlignment::Start,
            spacing: 0.0,
            padding: Padding::default(),
            margin: Margin::default(),
            children: Vec::new(),
            anchor: None,
            tag: String::new(),
            visible: true,
            active: true,
            fill_parent: false,
        }
    }

    /// Builder pattern: Sets explicit row position `(x, y)`.
    pub fn with_position(mut self, position: Vec2) -> Self {
        self.position = position;
        self
    }

    /// Builder pattern: Sets explicit row position `(x, y)` (alias for [`with_position`](Row::with_position)).
    pub fn with_pos(mut self, pos: Vec2) -> Self {
        self.position = pos;
        self
    }

    /// Builder pattern: Sets explicit row size `(width, height)`.
    pub fn with_size(mut self, size: Vec2) -> Self {
        self.size = size;
        self
    }

    /// Builder pattern: Sets both position and size from a [`Rect`].
    pub fn with_rect(mut self, rect: Rect) -> Self {
        self.position = vec2(rect.x, rect.y);
        self.size = vec2(rect.w, rect.h);
        self
    }

    pub fn fill_parent(mut self) -> Self {
        self.fill_parent = true;
        self
    }

    pub fn with_fill_parent(mut self, fill: bool) -> Self {
        self.fill_parent = fill;
        self
    }

    pub fn child<O: IntoUIObject>(mut self, child: O) -> Self {
        self.children.push(child.into_ui_box());
        self
    }

    pub fn children<I>(mut self, items: I) -> Self
    where
        I: IntoIterator,
        I::Item: IntoUIObject,
    {
        for item in items {
            self.children.push(item.into_ui_box());
        }
        self
    }

    pub fn with_children<I>(self, items: I) -> Self
    where
        I: IntoIterator,
        I::Item: IntoUIObject,
    {
        self.children(items)
    }

    pub fn with_spacing(mut self, spacing: f32) -> Self {
        self.spacing = spacing;
        self
    }

    pub fn with_main_axis_alignment(mut self, align: MainAxisAlignment) -> Self {
        self.main_axis_alignment = align;
        self
    }

    pub fn with_cross_axis_alignment(mut self, align: CrossAxisAlignment) -> Self {
        self.cross_axis_alignment = align;
        self
    }

    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self
    }

    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self
    }

    pub fn align_to_screen(mut self, anchor: UIAnchor, padding: impl Into<Padding>) -> Self {
        let pad = padding.into();
        self.position = anchor.compute_position(self.size, pad);
        self.anchor = Some((anchor, pad));
        self
    }

    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    pub fn layout_children(&mut self) {
        if self.children.is_empty() { return; }

        let mut child_sizes: Vec<Vec2> = Vec::with_capacity(self.children.len());
        let mut total_child_w = 0.0f32;
        let mut max_child_h = 0.0f32;

        for child in &self.children {
            if let Some(b) = child.bounds() {
                child_sizes.push(vec2(b.w, b.h));
                total_child_w += b.w;
                max_child_h = max_child_h.max(b.h);
            } else {
                child_sizes.push(Vec2::ZERO);
            }
        }

        let num_children = self.children.len() as f32;
        let total_spacing = self.spacing * (num_children - 1.0).max(0.0);
        let content_w = total_child_w + total_spacing;
        let content_h = max_child_h;

        if self.size == Vec2::ZERO {
            self.size = vec2(content_w + self.padding.left + self.padding.right, content_h + self.padding.top + self.padding.bottom);
        }

        let avail_w = (self.size.x - self.padding.left - self.padding.right).max(0.0);
        let avail_h = (self.size.y - self.padding.top - self.padding.bottom).max(0.0);

        let (start_x, gap_between) = match self.main_axis_alignment {
            MainAxisAlignment::Start => (self.padding.left, self.spacing),
            MainAxisAlignment::Center => (self.padding.left + (avail_w - content_w).max(0.0) * 0.5, self.spacing),
            MainAxisAlignment::End => (self.padding.left + (avail_w - content_w).max(0.0), self.spacing),
            MainAxisAlignment::SpaceBetween => {
                let g = if num_children > 1.0 { (avail_w - total_child_w) / (num_children - 1.0) } else { 0.0 };
                (self.padding.left, g)
            }
            MainAxisAlignment::SpaceAround => {
                let g = if num_children > 0.0 { (avail_w - total_child_w) / num_children } else { 0.0 };
                (self.padding.left + g * 0.5, g)
            }
            MainAxisAlignment::SpaceEvenly => {
                let g = if num_children > 0.0 { (avail_w - total_child_w) / (num_children + 1.0) } else { 0.0 };
                (self.padding.left + g, g)
            }
        };

        let mut current_x = start_x;
        for (i, child) in self.children.iter_mut().enumerate() {
            let sz = child_sizes[i];
            let y_offset = match self.cross_axis_alignment {
                CrossAxisAlignment::Start => self.padding.top,
                CrossAxisAlignment::Center => self.padding.top + (avail_h - sz.y).max(0.0) * 0.5,
                CrossAxisAlignment::End => self.padding.top + (avail_h - sz.y).max(0.0),
                CrossAxisAlignment::Stretch => self.padding.top,
            };

            child.set_position(self.position + vec2(current_x, y_offset));
            current_x += sz.x + gap_between;
        }
    }
}

impl Default for Row {
    fn default() -> Self {
        Self::new()
    }
}

impl Object for Row {
    fn update(&mut self, ctx: &mut Context) {
        if !self.visible || !self.active { return; }
        if let Some((anchor, pad)) = self.anchor {
            self.position = anchor.compute_position(self.size, pad);
        }
        self.layout_children();
        for child in &mut self.children {
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible { return; }
        for child in &self.children {
            child.draw();
        }
    }

    fn bounds(&self) -> Option<Rect> {
        Some(Rect { x: self.position.x, y: self.position.y, w: self.size.x, h: self.size.y })
    }

    fn tag(&self) -> &str { &self.tag }
    fn is_visible(&self) -> bool { self.visible }
    fn set_visible(&mut self, visible: bool) { self.visible = visible; }
    fn is_active(&self) -> bool { self.active }
    fn set_position(&mut self, pos: Vec2) { self.position = pos; }
    fn set_size(&mut self, size: Vec2) { self.size = size; }
    fn is_fill_parent(&self) -> bool { self.fill_parent }
    fn set_fill_parent(&mut self, fill: bool) { self.fill_parent = fill; }

    fn as_any(&self) -> Option<&dyn std::any::Any> {
        Some(self)
    }

    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        Some(self)
    }

    fn set_text(&mut self, text: &str) {
        for child in &mut self.children {
            child.set_text(text);
        }
    }

    fn get_children(&self) -> Vec<&dyn Object> {
        self.children.iter().map(|c| c.as_ref()).collect()
    }

    fn get_children_mut<'a>(&'a mut self) -> Vec<&'a mut (dyn Object + 'static)> {
        self.children.iter_mut().map(|c| c.as_mut()).collect()
    }
}

impl Clickable for Row {
    fn click_rect(&self) -> Rect {
        Rect { x: self.position.x, y: self.position.y, w: self.size.x, h: self.size.y }
    }
    fn is_active(&self) -> bool { self.active }
}

/// Helper macro for vector of UI objects without writing `Box::new(...)`.
#[macro_export]
macro_rules! ui_vec {
    ($($elem:expr),* $(,)?) => {
        vec![$(Box::new($elem) as Box<dyn $crate::world::Object>),*]
    };
}

/// Declarative Flutter-like [`Column`] layout macro.
#[macro_export]
macro_rules! col {
    ($($child:expr),* $(,)?) => {
        $crate::ui::Column::new().with_children($crate::ui_vec![$($child),*])
    };
}

/// Declarative Flutter-like [`Column`] layout macro (alias for [`col!`]).
#[macro_export]
macro_rules! column {
    ($($child:expr),* $(,)?) => {
        $crate::col![$($child),*]
    };
}

/// Declarative Flutter-like [`VBox`] layout macro (alias for [`col!`]).
#[macro_export]
macro_rules! vbox {
    ($($child:expr),* $(,)?) => {
        $crate::col![$($child),*]
    };
}

/// Declarative Flutter-like [`Row`] layout macro.
#[macro_export]
macro_rules! row {
    ($($child:expr),* $(,)?) => {
        $crate::ui::Row::new().with_children($crate::ui_vec![$($child),*])
    };
}

/// Declarative Flutter-like [`HBox`] layout macro (alias for [`row!`]).
#[macro_export]
macro_rules! hbox {
    ($($child:expr),* $(,)?) => {
        $crate::ui::Row::new().with_children($crate::ui_vec![$($child),*])
    };
}

/// Layout direction for HTML-like [`Div`] block container.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum DivDirection {
    #[default]
    Vertical,
    Horizontal,
    Stack,
}

/// General-purpose HTML-like `<div>` block container.
///
/// Supports background color/texture, 9-slice borders, border strokes, internal padding,
/// external margin, flex layout (vertical/horizontal/stack), child auto-relayout,
/// responsive screen anchoring (`align_to_screen`), and click handlers (`on_click`).
///
/// Implements [`Object`] + [`Clickable`].
///
/// # Example
/// ```ignore
/// let card = div![
///     Text::new("Witaj w grze!", Vec2::ZERO, 20.0, WHITE),
///     Gap::height(10.0),
///     Button::new(Vec2::ZERO, vec2(120.0, 32.0), "Zagraj")
/// ]
/// .with_background(Color::from_rgba(20, 20, 30, 240))
/// .with_border(GOLD, 1.5)
/// .with_padding(Padding::all(16.0));
/// ```
pub struct Div {
    pub position: Vec2,
    pub size: Vec2,
    pub padding: Padding,
    pub margin: Margin,
    pub background_color: Option<Color>,
    pub background_texture: Option<Texture2D>,
    pub texture_tint: Color,
    pub nine_slice_margins: Option<(f32, f32, f32, f32)>,
    pub border_color: Option<Color>,
    pub border_width: f32,
    pub children: Vec<Box<dyn Object>>,
    pub direction: DivDirection,
    pub spacing: f32,
    pub align: LayoutAlign,
    pub justify: LayoutJustify,
    pub anchor: Option<(UIAnchor, Padding)>,
    pub fill_parent: bool,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    pub on_click: Option<Box<dyn FnMut(&mut Context)>>,
}

impl Div {
    /// Creates a new empty [`Div`] with vertical direction.
    pub fn new() -> Self {
        Self {
            position: Vec2::ZERO,
            size: Vec2::ZERO,
            padding: Padding::default(),
            margin: Margin::default(),
            background_color: None,
            background_texture: None,
            texture_tint: WHITE,
            nine_slice_margins: None,
            border_color: None,
            border_width: 1.0,
            children: Vec::new(),
            direction: DivDirection::Vertical,
            spacing: 0.0,
            align: LayoutAlign::Start,
            justify: LayoutJustify::Start,
            anchor: None,
            fill_parent: false,
            tag: String::new(),
            visible: true,
            active: true,
            on_click: None,
        }
    }

    /// Creates a vertical layout [`Div`] (alias for `display: flex; flex-direction: column`).
    pub fn column() -> Self {
        Self::new().with_direction(DivDirection::Vertical)
    }

    /// Creates a horizontal layout [`Div`] (alias for `display: flex; flex-direction: row`).
    pub fn row() -> Self {
        Self::new().with_direction(DivDirection::Horizontal)
    }

    /// Creates a stack layout [`Div`] (overlapping layered children).
    pub fn stack() -> Self {
        Self::new().with_direction(DivDirection::Stack)
    }

    /// Builder pattern: Adds a child component.
    pub fn with_child<O: IntoUIObject>(mut self, child: O) -> Self {
        self.children.push(child.into_ui_box());
        self.relayout();
        self
    }

    /// Builder pattern: Sets all children components.
    pub fn with_children(mut self, children: Vec<Box<dyn Object>>) -> Self {
        self.children = children;
        self.relayout();
        self
    }

    /// Builder pattern: Sets explicit position `(x, y)`.
    pub fn with_position(mut self, position: Vec2) -> Self {
        self.position = position;
        self.relayout();
        self
    }

    /// Builder pattern: Sets explicit position `(x, y)` (alias for [`with_position`](Div::with_position)).
    pub fn with_pos(self, pos: Vec2) -> Self {
        self.with_position(pos)
    }

    /// Builder pattern: Sets explicit container size `(width, height)`.
    pub fn with_size(mut self, size: Vec2) -> Self {
        self.size = size;
        self.relayout();
        self
    }

    /// Builder pattern: Sets both position and size from a [`Rect`].
    pub fn with_rect(mut self, rect: Rect) -> Self {
        self.position = vec2(rect.x, rect.y);
        self.size = vec2(rect.w, rect.h);
        self.relayout();
        self
    }

    /// Builder pattern: Sets internal padding.
    pub fn with_padding(mut self, padding: impl Into<Padding>) -> Self {
        self.padding = padding.into();
        self.relayout();
        self
    }

    /// Builder pattern: Sets external margin.
    pub fn with_margin(mut self, margin: impl Into<Margin>) -> Self {
        self.margin = margin.into();
        self.relayout();
        self
    }

    /// Builder pattern: Sets solid background color.
    pub fn with_background(mut self, color: Color) -> Self {
        self.background_color = Some(color);
        self
    }

    /// Builder pattern: Alias for [`with_background`](Div::with_background).
    pub fn with_bg(self, color: Color) -> Self {
        self.with_background(color)
    }

    /// Builder pattern: Sets background texture.
    pub fn with_background_texture(mut self, texture: Texture2D) -> Self {
        self.background_texture = Some(texture);
        self
    }

    /// Builder pattern: Enables 9-slice rendering for background frame texture.
    pub fn with_nine_slice(mut self, texture: Texture2D, margins: (f32, f32, f32, f32)) -> Self {
        self.background_texture = Some(texture);
        self.nine_slice_margins = Some(margins);
        self
    }

    /// Builder pattern: Sets border color and stroke width.
    pub fn with_border(mut self, color: Color, width: f32) -> Self {
        self.border_color = Some(color);
        self.border_width = width;
        self
    }

    /// Builder pattern: Sets layout direction (`Vertical`, `Horizontal`, `Stack`).
    pub fn with_direction(mut self, dir: DivDirection) -> Self {
        self.direction = dir;
        self.relayout();
        self
    }

    /// Builder pattern: Sets spacing gap between children.
    pub fn with_spacing(mut self, spacing: f32) -> Self {
        self.spacing = spacing;
        self.relayout();
        self
    }

    /// Builder pattern: Sets cross-axis alignment.
    pub fn with_align(mut self, align: LayoutAlign) -> Self {
        self.align = align;
        self.relayout();
        self
    }

    /// Builder pattern: Sets main-axis justification.
    pub fn with_justify(mut self, justify: LayoutJustify) -> Self {
        self.justify = justify;
        self.relayout();
        self
    }

    /// Builder pattern: Anchors div position on screen using a [`UIAnchor`] preset and padding.
    pub fn align_to_screen(mut self, anchor: UIAnchor, padding: impl Into<Padding>) -> Self {
        let pad = padding.into();
        self.position = anchor.compute_position(self.size, pad);
        self.anchor = Some((anchor, pad));
        self
    }

    /// Builder pattern: Enables expanding size to fill parent container bounds.
    pub fn fill_parent(mut self) -> Self {
        self.fill_parent = true;
        self
    }

    /// Builder pattern: Sets entity tag string.
    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tag = tag.into();
        self
    }

    /// Builder pattern: Attaches a click handler callback.
    pub fn on_click<F: FnMut(&mut Context) + 'static>(mut self, callback: F) -> Self {
        self.on_click = Some(Box::new(callback));
        self
    }

    /// Builder pattern: Resizes and positions div container to cover full screen (`screen_width()` × `screen_height()`).
    pub fn fullscreen(mut self) -> Self {
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        self.position = Vec2::ZERO;
        self.size = vec2(sw, sh);
        self.relayout();
        self
    }

    /// Builder pattern: Resizes and positions div container to fit screen with uniform padding margin.
    pub fn fit_to_screen_padding(mut self, padding: f32) -> Self {
        let sw = safe_screen_width();
        let sh = safe_screen_height();
        self.position = vec2(padding, padding);
        self.size = vec2((sw - padding * 2.0).max(10.0), (sh - padding * 2.0).max(10.0));
        self.relayout();
        self
    }

    /// Recalculates child positions and container size based on direction.
    pub fn relayout(&mut self) {
        match self.direction {
            DivDirection::Vertical => {
                let mut cur_y = self.position.y + self.padding.top;
                let mut max_w: f32 = 0.0;
                let avail_w = (self.size.x - self.padding.left - self.padding.right).max(0.0);

                for child in self.children.iter_mut() {
                    if child.is_fill_parent() && avail_w > 0.0 {
                        child.set_size(vec2(avail_w, child.bounds().map(|b| b.h).unwrap_or(20.0)));
                    }
                    let bounds = child.bounds().unwrap_or(Rect::new(0.0, 0.0, 100.0, 20.0));
                    let cur_x = match self.align {
                        LayoutAlign::Start | LayoutAlign::Stretch => self.position.x + self.padding.left,
                        LayoutAlign::Center => self.position.x + self.padding.left + (avail_w - bounds.w).max(0.0) * 0.5,
                        LayoutAlign::End => self.position.x + self.padding.left + (avail_w - bounds.w).max(0.0),
                    };
                    child.set_position(vec2(cur_x, cur_y));
                    cur_y += bounds.h + self.spacing;
                    max_w = max_w.max(bounds.w);
                }

                if self.size.x == 0.0 {
                    self.size.x = max_w + self.padding.left + self.padding.right;
                }
                if self.size.y == 0.0 {
                    let total_h = (cur_y - self.position.y - self.spacing + self.padding.bottom).max(0.0);
                    self.size.y = total_h;
                }
            }
            DivDirection::Horizontal => {
                let mut cur_x = self.position.x + self.padding.left;
                let mut max_h: f32 = 0.0;
                let avail_h = (self.size.y - self.padding.top - self.padding.bottom).max(0.0);

                for child in self.children.iter_mut() {
                    if child.is_fill_parent() && avail_h > 0.0 {
                        child.set_size(vec2(child.bounds().map(|b| b.w).unwrap_or(100.0), avail_h));
                    }
                    let bounds = child.bounds().unwrap_or(Rect::new(0.0, 0.0, 100.0, 20.0));
                    let cur_y = match self.align {
                        LayoutAlign::Start | LayoutAlign::Stretch => self.position.y + self.padding.top,
                        LayoutAlign::Center => self.position.y + self.padding.top + (avail_h - bounds.h).max(0.0) * 0.5,
                        LayoutAlign::End => self.position.y + self.padding.top + (avail_h - bounds.h).max(0.0),
                    };
                    child.set_position(vec2(cur_x, cur_y));
                    cur_x += bounds.w + self.spacing;
                    max_h = max_h.max(bounds.h);
                }

                if self.size.x == 0.0 {
                    let total_w = (cur_x - self.position.x - self.spacing + self.padding.right).max(0.0);
                    self.size.x = total_w;
                }
                if self.size.y == 0.0 {
                    self.size.y = max_h + self.padding.top + self.padding.bottom;
                }
            }
            DivDirection::Stack => {
                let mut max_w: f32 = 0.0;
                let mut max_h: f32 = 0.0;
                let base_x = self.position.x + self.padding.left;
                let base_y = self.position.y + self.padding.top;

                for child in self.children.iter_mut() {
                    let bounds = child.bounds().unwrap_or(Rect::new(0.0, 0.0, 100.0, 20.0));
                    child.set_position(vec2(base_x, base_y));
                    max_w = max_w.max(bounds.w);
                    max_h = max_h.max(bounds.h);
                }

                if self.size.x == 0.0 {
                    self.size.x = max_w + self.padding.left + self.padding.right;
                }
                if self.size.y == 0.0 {
                    self.size.y = max_h + self.padding.top + self.padding.bottom;
                }
            }
        }
    }
}

impl Default for Div {
    fn default() -> Self {
        Self::new()
    }
}

impl Object for Div {
    fn update(&mut self, ctx: &mut Context) {
        if !self.active || !self.visible {
            return;
        }

        let mouse_clicked = macroquad::input::is_mouse_button_pressed(macroquad::input::MouseButton::Left)
            || ctx.input.is_mouse_button_pressed(macroquad::input::MouseButton::Left);
        if mouse_clicked {
            let is_hovered = self.is_hovered_ui(ctx) || self.is_hovered() || self.is_hovered_ctx(ctx);
            if is_hovered {
                if let Some(ref mut callback) = self.on_click {
                    (callback)(ctx);
                }
            }
        }

        if let Some((anchor, pad)) = self.anchor {
            self.position = anchor.compute_position(self.size, pad);
        }

        self.relayout();

        for child in &mut self.children {
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }

        let pos = (self.position + get_draw_offset()).round();

        // 1. Render Background
        if let Some(ref texture) = self.background_texture {
            if let Some(margins) = self.nine_slice_margins {
                draw_nine_slice(texture, pos, self.size, margins, self.texture_tint);
            } else {
                draw_texture_ex(
                    texture,
                    pos.x,
                    pos.y,
                    self.texture_tint,
                    DrawTextureParams {
                        dest_size: Some(self.size),
                        ..Default::default()
                    },
                );
            }
        } else if let Some(bg_color) = self.background_color {
            draw_rectangle(pos.x, pos.y, self.size.x, self.size.y, bg_color);
        }

        // 2. Render Border Stroke
        if let Some(border_color) = self.border_color {
            macroquad::shapes::draw_rectangle_lines(
                pos.x,
                pos.y,
                self.size.x,
                self.size.y,
                self.border_width,
                border_color,
            );
        }

        // 3. Render Children
        for child in &self.children {
            child.draw();
        }
    }

    fn set_position(&mut self, pos: Vec2) {
        self.position = pos;
        self.relayout();
    }

    fn set_size(&mut self, size: Vec2) {
        self.size = size;
        self.relayout();
    }

    fn bounds(&self) -> Option<Rect> {
        Some(Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        })
    }

    fn is_fill_parent(&self) -> bool {
        self.fill_parent
    }

    fn set_fill_parent(&mut self, fill: bool) {
        self.fill_parent = fill;
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

    fn is_active(&self) -> bool {
        self.active
    }

    fn set_active(&mut self, active: bool) {
        self.active = active;
    }

    fn set_text(&mut self, text: &str) {
        for child in &mut self.children {
            child.set_text(text);
        }
    }

    fn as_any(&self) -> Option<&dyn std::any::Any> {
        Some(self)
    }

    fn as_any_mut(&mut self) -> Option<&mut dyn std::any::Any> {
        Some(self)
    }

    fn get_children(&self) -> Vec<&dyn Object> {
        self.children.iter().map(|c| c.as_ref()).collect()
    }

    fn get_children_mut<'a>(&'a mut self) -> Vec<&'a mut (dyn Object + 'static)> {
        self.children.iter_mut().map(|c| c.as_mut()).collect()
    }
}

impl Clickable for Div {
    fn click_rect(&self) -> Rect {
        Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        }
    }
    fn is_active(&self) -> bool {
        self.active
    }
}

/// HTML-like declarative [`Div`] block container macro.
#[macro_export]
macro_rules! div {
    ($($child:expr),* $(,)?) => {
        $crate::ui::Div::new().with_children($crate::ui_vec![$($child),*])
    };
}
