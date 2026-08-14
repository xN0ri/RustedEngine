use macroquad::{
    color::{Color, WHITE},
    input::{is_mouse_button_down, is_mouse_button_pressed, mouse_position, MouseButton},
    math::{vec2, Rect, Vec2},
    shapes::draw_rectangle,
    texture::{draw_texture_ex, DrawTextureParams, Texture2D},
};

use crate::{engine::Context, world::Object};

// ---------------------------------------------------------------------------
// Side — strona przycisku myszy
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Side {
    Left,
    Middle,
    Right,
}

impl Side {
    pub fn to_macroquad(self) -> MouseButton {
        match self {
            Side::Left => MouseButton::Left,
            Side::Middle => MouseButton::Middle,
            Side::Right => MouseButton::Right,
        }
    }
}

// ---------------------------------------------------------------------------
// Trait Clickable — wspólna logika klikalności dla Sprite i Button
// ---------------------------------------------------------------------------

/// Trait eliminujący duplikację logiki hover/click między `Sprite` i `Button`.
/// Implementuj `click_rect()` i `is_active()` — reszta metod jest domyślna.
///
/// # Uwaga: przestrzenie współrzędnych
///
/// Metody **bez** sufiksu `_ctx` (`is_hovered`, `click`, `clicked`) operują
/// w **przestrzeni ekranu** (surowe piksele myszy, bez transformacji kamery).
///
/// - Dla elementów UI (`Button`, `ProgressBar`) umieszczonych na warstwie UI
///   (rysowanych po `camera.end()`) jest to poprawne zachowanie.
///
/// - Dla `Sprite` umieszczonego w przestrzeni świata (warstwa `objects`,
///   rysowana z kamerą 2D) **użyj wariantów `_ctx`** (`is_hovered_ctx`,
///   `click_ctx`, `clicked_ctx`), które przeliczają pozycję myszy przez
///   `ctx.camera.screen_to_world()`.
///
///   Użycie metod bez `_ctx` na Sprite-ach w przestrzeni świata da błędne
///   wyniki (hit-test w złej przestrzeni) bez żadnego błędu kompilacji.
pub trait Clickable {
    fn click_rect(&self) -> Rect;
    fn is_active(&self) -> bool;

    /// Czy kursor myszy jest nad obiektem (**przestrzeń ekranu**).
    ///
    /// ⚠️ Dla `Sprite` w przestrzeni świata użyj [`is_hovered_ctx`].
    fn is_hovered(&self) -> bool {
        if !self.is_active() {
            return false;
        }
        let (mx, my) = mouse_position();
        self.click_rect().contains(vec2(mx, my))
    }

    /// Czy kursor jest nad obiektem (**przestrzeń świata** z uwzględnieniem kamery).
    ///
    /// Używaj tej metody dla obiektów rysowanych z kamerą 2D (`Sprite`).
    fn is_hovered_ctx(&self, ctx: &Context) -> bool {
        if !self.is_active() {
            return false;
        }
        let m_world = ctx.camera.screen_to_world(ctx.input.mouse_position());
        self.click_rect().contains(m_world)
    }

    /// Jednorazowe kliknięcie — tylko klatka wciśnięcia (**przestrzeń ekranu**).
    ///
    /// ⚠️ Dla `Sprite` w przestrzeni świata użyj [`click_ctx`].
    fn click(&self, btn: Side) -> bool {
        self.is_hovered() && is_mouse_button_pressed(btn.to_macroquad())
    }

    /// Jednorazowe kliknięcie (**przestrzeń świata**, z uwzględnieniem kamery).
    fn click_ctx(&self, ctx: &Context, btn: Side) -> bool {
        self.is_hovered_ctx(ctx) && ctx.input.is_mouse_button_pressed(btn.to_macroquad())
    }

    /// Przytrzymanie przycisku (true przez wszystkie klatki wciśnięcia, **przestrzeń ekranu**).
    ///
    /// ⚠️ Dla `Sprite` w przestrzeni świata użyj [`clicked_ctx`].
    fn clicked(&self, btn: Side) -> bool {
        self.is_hovered()
            && (is_mouse_button_down(btn.to_macroquad())
                || is_mouse_button_pressed(btn.to_macroquad()))
    }

    /// Przytrzymanie (**przestrzeń świata**, z uwzględnieniem kamery).
    fn clicked_ctx(&self, ctx: &Context, btn: Side) -> bool {
        self.is_hovered_ctx(ctx)
            && (ctx.input.is_mouse_button_down(btn.to_macroquad())
                || ctx.input.is_mouse_button_pressed(btn.to_macroquad()))
    }
}

// ---------------------------------------------------------------------------
// Sprite
// ---------------------------------------------------------------------------

pub struct Sprite {
    pub position: Vec2,
    pub size: Vec2,
    pub rotation: f32,
    pub color: Color,
    pub texture: Texture2D,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Sprite {
    pub fn new(position: Vec2, size: Vec2, rotation: f32, texture: Texture2D) -> Self {
        Self {
            position,
            size,
            rotation,
            color: WHITE,
            texture,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    /// Tworzy jednokolorowy sprajt bez potrzeby ręcznego tworzenia tekstury 1x1.
    pub fn solid(position: Vec2, size: Vec2, color: Color) -> Self {
        let texture = Texture2D::from_rgba8(1, 1, &[255, 255, 255, 255]);
        Self::new(position, size, 0.0, texture).with_color(color)
    }

    pub fn with_color(mut self, color: Color) -> Self {
        self.color = color;
        self
    }

    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
        self
    }

    pub fn set_texture(&mut self, texture: Texture2D) {
        self.texture = texture;
    }

    pub fn rect(&self) -> Rect {
        Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        }
    }

    pub fn collides(&self, obj: &Sprite) -> bool {
        self.rect().overlaps(&obj.rect())
    }

    pub fn pos(&self) -> Vec2 {
        self.position
    }

    pub fn setpos(&mut self, pos: Vec2) {
        self.position = pos;
    }
}

impl Clickable for Sprite {
    fn click_rect(&self) -> Rect {
        self.rect()
    }
    fn is_active(&self) -> bool {
        self.active
    }
}

impl Object for Sprite {
    fn update(&mut self, _ctx: &mut Context) {}

    fn draw(&self) {
        if !self.visible {
            return;
        }
        draw_texture_ex(
            &self.texture,
            self.position.x,
            self.position.y,
            self.color,
            DrawTextureParams {
                dest_size: Some(self.size),
                rotation: self.rotation,
                ..Default::default()
            },
        );
    }

    fn tag(&self) -> &str {
        &self.tag
    }
}

// ---------------------------------------------------------------------------
// Rectangle
// ---------------------------------------------------------------------------

pub struct Rectangle {
    pub position: Vec2,
    pub size: Vec2,
    pub rotation: f32,
    pub color: Color,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Rectangle {
    pub fn new(position: Vec2, size: Vec2, rotation: f32, color: Color) -> Self {
        Self {
            position,
            size,
            rotation,
            color,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
        self
    }
}

impl Object for Rectangle {
    fn update(&mut self, _ctx: &mut Context) {}

    fn draw(&self) {
        if !self.visible {
            return;
        }
        draw_rectangle(
            self.position.x,
            self.position.y,
            self.size.x,
            self.size.y,
            self.color,
        );
    }

    fn tag(&self) -> &str {
        &self.tag
    }
}

// ---------------------------------------------------------------------------
// Behavior<Inner, Data> — wspólny szkielet dla GameObject/TextObject
// ---------------------------------------------------------------------------

/// Generyczna struktura łącząca wewnętrzny obiekt graficzny (`Inner`),
/// dane gry (`Data`) i opcjonalną funkcję aktualizacji.
///
/// Eliminuje duplikację między `GameObject<Data>` i `TextObject<Data>`.
///
/// # Dostęp do wewnętrznego obiektu
///
/// `Behavior<Sprite, Data>` implementuje `Deref<Target = Sprite>` i
/// `DerefMut`, co umożliwia bezpośredni dostęp do pól i metod `Sprite`
/// przez deref-coercion:
///
/// ```ignore
/// obj.position.x += 1.0;   // zamiast obj.inner.position.x += 1.0
/// obj.color = RED;           // zamiast obj.inner.color = RED
/// obj.click_ctx(ctx, Side::Left); // Clickable przez deref
/// ```
///
/// **Nie istnieje pole `.sprite` ani `.text` na `Behavior`.** Jeśli
/// potrzebujesz jawnej referencji do wewnętrznego obiektu, użyj
/// `obj.inner` (dostęp do pola) lub metod `obj.inner()` / `obj.inner_mut()`.
///
/// Analogicznie `Behavior<Text, Data>` implementuje `Deref<Target = Text>`,
/// lecz uwaga: `Text` ma pole `content: String` (nie `text: String`), więc
/// `text_obj.content` to treść napisu. Nie ma kolizji z nazwą typu.
pub struct Behavior<Inner, Data> {
    pub inner: Inner,
    pub data: Data,
    pub tag: String,
    func: Option<Box<dyn FnMut(&mut Behavior<Inner, Data>, &mut Context)>>,
}

impl<Inner, Data> Behavior<Inner, Data> {
    pub fn new(inner: Inner, data: Data) -> Self {
        Self {
            inner,
            data,
            tag: String::new(),
            func: None,
        }
    }

    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
        self
    }

    /// Ustawia funkcję aktualizacji wywoływaną w każdej klatce.
    pub fn update<F>(mut self, func: F) -> Self
    where
        F: FnMut(&mut Behavior<Inner, Data>, &mut Context) + 'static,
    {
        self.func = Some(Box::new(func));
        self
    }

    pub fn run_update(&mut self, ctx: &mut Context) {
        if let Some(mut func) = self.func.take() {
            func(self, ctx);
            self.func = Some(func);
        }
    }

    /// Zwraca referencję do wewnętrznego obiektu graficznego.
    /// Alternatywnie użyj deref-coercion: pola i metody `Inner` są dostępne
    /// bezpośrednio na `Behavior` gdy zaimplementowane jest `Deref`.
    pub fn inner(&self) -> &Inner {
        &self.inner
    }

    /// Zwraca mutowalną referencję do wewnętrznego obiektu graficznego.
    pub fn inner_mut(&mut self) -> &mut Inner {
        &mut self.inner
    }
}

// ---------------------------------------------------------------------------
// GameObject<Data> = Behavior<Sprite, Data>
// ---------------------------------------------------------------------------

/// Obiekt gry ze sprajtem i dowolnymi danymi.
///
/// `pub type GameObject<Data> = Behavior<Sprite, Data>;`
///
/// Dzięki `Deref<Target = Sprite>` pola i metody `Sprite` są dostępne
/// bezpośrednio na `GameObject` bez żadnego prefiksu:
/// - `obj.position`, `obj.color`, `obj.size`, `obj.rotation`
/// - `obj.click_ctx(ctx, Side::Left)`, `obj.is_hovered_ctx(ctx)`
/// - `obj.set_texture(...)`, `obj.collides(&other)`
///
/// Dane gracza: `obj.data.hp`, `obj.data.speed` itd.
pub type GameObject<Data> = Behavior<Sprite, Data>;

impl<Inner: Object + 'static, Data: 'static> Object for Behavior<Inner, Data> {
    fn update(&mut self, ctx: &mut Context) {
        self.inner.update(ctx);
        self.run_update(ctx);
    }

    fn draw(&self) {
        self.inner.draw();
    }

    fn tag(&self) -> &str {
        if !self.tag.is_empty() {
            &self.tag
        } else {
            self.inner.tag()
        }
    }

    fn set_text(&mut self, text: &str) {
        self.inner.set_text(text);
    }
}

/// `Deref` umożliwia bezpośredni dostęp do pól i metod `Sprite` na `GameObject`.
/// Nie istnieje pole `.sprite` — używaj deref-coercion lub `obj.inner`.
impl<Data> std::ops::Deref for Behavior<Sprite, Data> {
    type Target = Sprite;
    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl<Data> std::ops::DerefMut for Behavior<Sprite, Data> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.inner
    }
}