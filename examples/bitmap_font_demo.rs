use macroquad::prelude::*;
use rusted_engine::prelude::*;

#[macroquad::main("BitmapFont Demo")]
async fn main() {
    let mut engine = Engine::new(vec![]);

    // 1. Insert default font and bake BitmapFont atlas directly in engine.ctx.assets (zero boilerplate!)
    engine.ctx.assets.insert_font("pixel_font", Font::default());
    engine.ctx.assets.bake_bitmap_font("pixel_font", 16);

    let sample = "Rusted Engine BitmapFont - 0123456789";

    // 2. Use directly via .with_font_from_assets(&engine.ctx.assets, "pixel_font")
    let text_x1 = Text::new(format!("Size 16.0px (1x): {}", sample), vec2(20.0, 20.0), 16.0, WHITE)
        .with_font_from_assets(&engine.ctx.assets, "pixel_font");

    let text_12 = Text::new(format!("Size 12.0px (0.75x): {}", sample), vec2(20.0, 50.0), 12.0, YELLOW)
        .with_font_from_assets(&engine.ctx.assets, "pixel_font");

    let text_20 = Text::new(format!("Size 20.0px (1.25x): {}", sample), vec2(20.0, 80.0), 20.0, GREEN)
        .with_font_from_assets(&engine.ctx.assets, "pixel_font");

    let text_28 = Text::new(format!("Size 28.0px (1.75x): {}", sample), vec2(20.0, 120.0), 28.0, ORANGE)
        .with_font_from_assets(&engine.ctx.assets, "pixel_font");

    let text_32 = Text::new(format!("Size 32.0px (2.00x): {}", sample), vec2(20.0, 170.0), 32.0, RED)
        .with_font_from_assets(&engine.ctx.assets, "pixel_font");

    let world = world! {
        ui: [text_x1, text_12, text_20, text_28, text_32],
        objects: []
    };

    engine.scene_manager.add(Scene::new("Demo", world));
    engine.scene_manager.switch_to("Demo");
    engine.run().await;
}
