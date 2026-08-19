//! Declarative and automatic layout containers: [`VBox`], [`HBox`], [`Grid`], [`Container`], [`Column`], [`Row`], [`Gap`], and layout macros.

use macroquad::{
    color::Color,
    math::{Rect, Vec2, vec2},
    shapes::draw_rectangle,
};

use crate::{
    engine::Context,
    object::Clickable,
    world::Object,
};

use super::core::{Margin, Padding, UIAnchor, get_draw_offset};

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

/// Cross axis alignment for [`Column`] (horizontal) and [`Row`] (vertical).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum CrossAxisAlignment {
    #[default]
    Start,
    Center,
    End,
    Stretch,
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
macro_rules! column {
    ($($child:expr),* $(,)?) => {
        $crate::ui::Column::new().with_children($crate::ui_vec![$($child),*])
    };
}

/// Declarative Flutter-like [`Row`] layout macro.
#[macro_export]
macro_rules! row {
    ($($child:expr),* $(,)?) => {
        $crate::ui::Row::new().with_children($crate::ui_vec![$($child),*])
    };
}
