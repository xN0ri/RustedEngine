//! Unit tests for UI system.

#[cfg(test)]
mod tests {
    use macroquad::{color::WHITE, math::{Vec2, vec2}};
    use crate::world::Object;
    use super::super::*;

    #[test]
    fn test_ui_scale_get_set_reset() {
        assert_eq!(get_ui_scale(), (1.0, Vec2::ZERO));
        set_ui_scale(2.0, vec2(10.0, 20.0));
        assert_eq!(get_ui_scale(), (2.0, vec2(10.0, 20.0)));
        set_ui_scale(1.0, Vec2::ZERO);
        assert_eq!(get_ui_scale(), (1.0, Vec2::ZERO));
    }

    #[test]
    fn test_is_text_layer() {
        let text = Text::new("Hello", Vec2::ZERO, 16.0, WHITE);
        assert!(text.is_text_layer());

        let text_log = TextLog::new(Vec2::ZERO, vec2(100.0, 100.0), 16.0, WHITE);
        assert!(text_log.is_text_layer());

        let behavior_text = crate::object::Behavior::new(text, ());
        assert!(behavior_text.is_text_layer());

        let panel = Panel::new(Vec2::ZERO, vec2(100.0, 100.0));
        assert!(!panel.is_text_layer());
    }

    #[test]
    fn test_resolved_geometry_floor_to_one_scale() {
        // Reproduce floor-to-1.0 letterbox case: scale == 1.0, ui_offset != Vec2::ZERO (e.g. ox = 37.5)
        set_ui_scale(1.0, vec2(37.5, 12.0));

        let log = TextLog::new(vec2(10.0, 20.0), vec2(200.0, 100.0), 12.0, WHITE);
        let (pos, font_size, _line_spacing, _scroll_offset, size) = log.resolved_geometry();
        assert_eq!(pos, vec2(47.5, 32.0)); // 10 + 37.5, 20 + 12.0
        assert_eq!(font_size, 12.0);
        assert_eq!(size, vec2(200.0, 100.0));

        let text = Text::new("Test", vec2(10.0, 20.0), 12.0, WHITE);
        let (t_pos, t_font_size, _t_spacing, _t_max_w, _t_size) = text.resolved_geometry();
        assert_eq!(t_pos, vec2(47.5, 32.0));
        assert_eq!(t_font_size, 12.0);

        set_ui_scale(1.0, Vec2::ZERO);
    }

    #[test]
    fn test_resolved_geometry_legacy_mode() {
        set_ui_scale(1.0, Vec2::ZERO);

        let log = TextLog::new(vec2(10.0, 20.0), vec2(200.0, 100.0), 12.0, WHITE);
        let (pos, font_size, _spacing, _scroll, size) = log.resolved_geometry();
        assert_eq!(pos, vec2(10.0, 20.0));
        assert_eq!(font_size, 12.0);
        assert_eq!(size, vec2(200.0, 100.0));

        let text = Text::new("Test", vec2(10.0, 20.0), 12.0, WHITE);
        let (t_pos, t_font_size, _t_spacing, _t_max_w, _t_size) = text.resolved_geometry();
        assert_eq!(t_pos, vec2(10.0, 20.0));
        assert_eq!(t_font_size, 12.0);
    }

    #[test]
    fn test_text_log_real_screen_rect_hit_testing() {
        set_ui_scale(2.0, vec2(50.0, 100.0));

        let log = TextLog::new(vec2(10.0, 20.0), vec2(100.0, 50.0), 12.0, WHITE);
        let real_rect = log.real_screen_rect();
        // Expected: x = 10*2 + 50 = 70, y = 20*2 + 100 = 140, w = 100*2 = 200, h = 50*2 = 100
        assert_eq!(real_rect.x, 70.0);
        assert_eq!(real_rect.y, 140.0);
        assert_eq!(real_rect.w, 200.0);
        assert_eq!(real_rect.h, 100.0);

        assert!(real_rect.contains(vec2(100.0, 150.0)));
        assert!(!real_rect.contains(vec2(10.0, 10.0)));

        set_ui_scale(1.0, Vec2::ZERO);
    }

    #[test]
    fn test_box_model_helpers() {
        let p = Padding::symmetric(16.0, 8.0);
        assert_eq!(p.left, 16.0);
        assert_eq!(p.top, 8.0);

        let p_left = Padding::only_left(5.0);
        assert_eq!(p_left.left, 5.0);
        assert_eq!(p_left.top, 0.0);

        let p_top = Padding::only_top(10.0);
        assert_eq!(p_top.top, 10.0);

        let m = Margin::only_top(20.0);
        assert_eq!(m.top, 20.0);
        assert_eq!(m.left, 0.0);

        let m_from_p: Margin = p_left.into();
        assert_eq!(m_from_p.left, 5.0);
    }

    #[test]
    fn test_child_queries_and_set_child_text() {
        let panel = Panel::new(Vec2::ZERO, vec2(100.0, 50.0))
            .with_child(Box::new(Text::new("Clock 00:00", Vec2::ZERO, 16.0, WHITE).with_tag("clock_text")))
            .with_child(Box::new(Text::new("Status OK", Vec2::ZERO, 14.0, WHITE).with_tag("status_text")));

        let mut behavior = crate::object::Behavior::new(panel, ());

        assert!(behavior.find_child("clock_text").is_some());
        assert!(behavior.find_child("status_text").is_some());
        assert!(behavior.find_child("missing_tag").is_none());

        assert!(behavior.set_child_text("clock_text", "12:34"));
        assert_eq!(behavior.get_child::<Text>("clock_text").unwrap().content, "12:34");

        if let Some(txt) = behavior.get_child_mut::<Text>("status_text") {
            txt.set_text("Status Error");
        }
        assert_eq!(behavior.get_child::<Text>("status_text").unwrap().content, "Status Error");

        if let Some(txt) = behavior.find_child_typed_mut::<Text>() {
            assert_eq!(txt.content, "12:34");
        }
    }

    #[test]
    fn test_row_fill_parent_main_axis_end() {
        let mut row = Row::new()
            .with_main_axis_alignment(MainAxisAlignment::End)
            .fill_parent()
            .child(crate::object::Rectangle::new(Vec2::ZERO, vec2(30.0, 10.0), 0.0, WHITE))
            .child(Gap::width(10.0))
            .child(crate::object::Rectangle::new(Vec2::ZERO, vec2(40.0, 10.0), 0.0, WHITE));

        row.set_size(vec2(200.0, 30.0));
        row.layout_children();

        let rect_bounds = row.children[2].bounds().unwrap();
        assert_eq!(rect_bounds.x, 160.0);
    }

    #[test]
    fn test_vbox_hbox_grid_layouts() {
        let vbox = VBox::new(vec2(10.0, 10.0), 5.0)
            .with_child(Button::new(Vec2::ZERO, vec2(100.0, 30.0), "Btn 1"))
            .with_child(Button::new(Vec2::ZERO, vec2(100.0, 30.0), "Btn 2"));

        assert_eq!(vbox.children[0].bounds().unwrap().y, 10.0);
        assert_eq!(vbox.children[1].bounds().unwrap().y, 45.0); // 10 + 30 + 5

        let hbox = HBox::new(vec2(10.0, 10.0), 10.0)
            .with_child(Button::new(Vec2::ZERO, vec2(50.0, 30.0), "B1"))
            .with_child(Button::new(Vec2::ZERO, vec2(50.0, 30.0), "B2"));

        assert_eq!(hbox.children[0].bounds().unwrap().x, 10.0);
        assert_eq!(hbox.children[1].bounds().unwrap().x, 70.0); // 10 + 50 + 10

        let grid = Grid::new(vec2(0.0, 0.0), 2, vec2(50.0, 50.0), vec2(10.0, 10.0))
            .with_child(Button::new(Vec2::ZERO, vec2(50.0, 50.0), "1"))
            .with_child(Button::new(Vec2::ZERO, vec2(50.0, 50.0), "2"))
            .with_child(Button::new(Vec2::ZERO, vec2(50.0, 50.0), "3"));

        assert_eq!(grid.children[0].bounds().unwrap().x, 0.0);
        assert_eq!(grid.children[1].bounds().unwrap().x, 60.0);
        assert_eq!(grid.children[2].bounds().unwrap().y, 60.0); // row 1
    }

    #[test]
    fn test_slider_and_checkbox_widgets() {
        let mut slider = Slider::new(Vec2::ZERO, vec2(100.0, 20.0), 0.0, 100.0, 50.0);
        assert_eq!(slider.ratio(), 0.5);

        slider.set_value(75.0);
        assert_eq!(slider.ratio(), 0.75);

        let mut cb = Checkbox::new(Vec2::ZERO, vec2(20.0, 20.0), "Option", false);
        assert!(!cb.checked);
        cb.checked = true;
        assert!(cb.checked);
    }

    #[test]
    fn test_flutter_like_layout_system() {
        let mut col = column![
            Button::new(Vec2::ZERO, vec2(100.0, 30.0), "Btn 1"),
            Gap::height(10.0),
            row![
                Button::new(Vec2::ZERO, vec2(40.0, 20.0), "R1"),
                Gap::width(5.0),
                Button::new(Vec2::ZERO, vec2(40.0, 20.0), "R2"),
            ],
        ]
        .with_spacing(5.0)
        .with_main_axis_alignment(MainAxisAlignment::Start)
        .with_cross_axis_alignment(CrossAxisAlignment::Center);

        col.layout_children();

        assert_eq!(col.children.len(), 3);
        assert_eq!(col.children[0].bounds().unwrap().y, 0.0);
        assert_eq!(col.children[1].bounds().unwrap().h, 10.0);
        assert_eq!(col.children[2].bounds().unwrap().y, 50.0);

        let mut container = Container::new()
            .with_size(vec2(200.0, 100.0))
            .with_padding(Padding::all(10.0))
            .with_alignment(Align::Center)
            .with_child(Button::new(Vec2::ZERO, vec2(50.0, 20.0), "Inner"));

        if let Some(ref mut child) = container.child {
            let child_size = child.bounds().map(|b| vec2(b.w, b.h)).unwrap_or(Vec2::ZERO);
            let offset = container.alignment.unwrap().compute_offset(container.size, child_size, container.padding);
            child.set_position(container.position + offset);
        }

        assert_eq!(container.child.as_ref().unwrap().bounds().unwrap().x, 75.0);
        assert_eq!(container.child.as_ref().unwrap().bounds().unwrap().y, 40.0);
    }

    #[test]
    fn test_fill_parent_layout() {
        let mut container = Container::new()
            .with_size(vec2(300.0, 200.0))
            .with_padding(Padding::all(10.0))
            .with_child(TextField::new(Vec2::ZERO, vec2(50.0, 20.0), "Test").fill_parent());

        if let Some(ref mut child) = container.child {
            if child.is_fill_parent() {
                let avail_w = (container.size.x - container.padding.left - container.padding.right).max(0.0);
                let avail_h = (container.size.y - container.padding.top - container.padding.bottom).max(0.0);
                child.set_size(vec2(avail_w, avail_h));
            }
        }

        let child_bounds = container.child.as_ref().unwrap().bounds().unwrap();
        assert_eq!(child_bounds.w, 280.0);
        assert_eq!(child_bounds.h, 180.0);
    }

    #[test]
    fn test_text_field_scrolling_and_backspace() {
        let mut tf = TextField::new(Vec2::ZERO, vec2(100.0, 30.0), "Enter text...");
        assert_eq!(tf.text, "");
        assert_eq!(tf.backspace_timer, 0.0);
        assert_eq!(tf.backspace_repeat_timer, 0.0);

        tf.text = "Hello World".to_string();
        assert_eq!(tf.text, "Hello World");

        tf.text.pop();
        assert_eq!(tf.text, "Hello Worl");
    }
}
