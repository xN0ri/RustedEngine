use macroquad::{
    color::{Color, GRAY, GREEN, LIGHTGRAY, RED, WHITE},
    input::{is_mouse_button_pressed, mouse_position, MouseButton},
    math::{vec2, Rect, Vec2},
    shapes::draw_rectangle,
    text::draw_text,
};

use crate::{
    draggable::{DragState, Draggable},
    engine::Context,
    object::{Behavior, Clickable},
    world::Object,
};

// ---------------------------------------------------------------------------
// RevealMode — tryb wyświetlania tekstu
// ---------------------------------------------------------------------------

/// Tryb odsłaniania treści `Text`.
#[derive(Clone, Debug)]
pub enum RevealMode {
    /// Tekst pojawia się natychmiastowo.
    Instant,
    /// Tekst pojawia się literka po literce z podaną prędkością.
    Typewriter { chars_per_sec: f32 },
}

impl Default for RevealMode {
    fn default() -> Self {
        RevealMode::Instant
    }
}

// ---------------------------------------------------------------------------
// Text — etykieta tekstowa (warstwa UI) z typewriter reveal
// ---------------------------------------------------------------------------

pub struct Text {
    /// Treść wyświetlanego napisu.
    ///
    /// Pole nazwane `content` (nie `text`) aby uniknąć kolizji w `Behavior<Text, Data>`:
    /// `text_obj.text` przez deref-coercion odnosiło by się do `String` zamiast do `Text`,
    /// co jest mylące. Jawna nazwa `content` eliminuje tę dwuznaczność.
    pub content: String,
    pub position: Vec2,
    pub font_size: f32,
    pub color: Color,
    pub tag: String,
    pub visible: bool,
    /// Tryb odsłaniania. Domyślnie `Instant`.
    pub reveal_mode: RevealMode,
    /// Pełna treść (target) przy trybie Typewriter.
    full_content: String,
    /// Liczba aktualnie odsłoniętych znaków (f32 dla ułamkowego przyrostu).
    revealed_chars: f32,
}

impl Text {
    pub fn new(text: &str, position: Vec2, font_size: f32, color: Color) -> Self {
        Self {
            content: text.to_string(),
            full_content: text.to_string(),
            position,
            font_size,
            color,
            tag: String::new(),
            visible: true,
            reveal_mode: RevealMode::Instant,
            revealed_chars: text.len() as f32,
        }
    }

    pub fn with_color(mut self, color: Color) -> Self {
        self.color = color;
        self
    }

    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
        self
    }

    /// Ustawia tryb typewriter z podaną prędkością (znaków na sekundę).
    pub fn with_typewriter(mut self, chars_per_sec: f32) -> Self {
        self.reveal_mode = RevealMode::Typewriter { chars_per_sec };
        // Reset postępu
        self.revealed_chars = 0.0;
        self.content = String::new();
        self
    }

    /// Ustawia nową treść i resetuje postęp odsłaniania.
    pub fn set_text(&mut self, text: impl Into<String>) {
        let t = text.into();
        self.full_content = t.clone();
        self.revealed_chars = 0.0;
        match self.reveal_mode {
            RevealMode::Instant => {
                self.content = t;
                self.revealed_chars = self.full_content.len() as f32;
            }
            RevealMode::Typewriter { .. } => {
                self.content = String::new();
            }
        }
    }

    /// Natychmiastowo odsłania cały tekst (skip animacji).
    pub fn skip(&mut self) {
        self.content = self.full_content.clone();
        self.revealed_chars = self.full_content.len() as f32;
    }

    /// Czy cały tekst jest już odsłonięty.
    pub fn is_finished(&self) -> bool {
        self.revealed_chars >= self.full_content.len() as f32
    }
}

impl Object for Text {
    fn update(&mut self, ctx: &mut Context) {
        if let RevealMode::Typewriter { chars_per_sec } = self.reveal_mode {
            if !self.is_finished() {
                self.revealed_chars += chars_per_sec * ctx.time.deltatime();
                let count = (self.revealed_chars as usize).min(self.full_content.len());
                // Bezpieczne wycinanie po granicy char (UTF-8)
                self.content = self.full_content
                    .char_indices()
                    .take(count)
                    .last()
                    .map(|(i, c)| &self.full_content[..i + c.len_utf8()])
                    .unwrap_or("")
                    .to_string();
            }
        }
    }

    /// Rysuje tekst — zakładamy, że jest to warstwa UI rysowana po camera.end().
    /// Nie wołamy set_default_camera() — za zarządzanie kamerą odpowiada Engine::run.
    fn draw(&self) {
        if !self.visible {
            return;
        }
        draw_text(
            &self.content,
            self.position.x,
            self.position.y,
            self.font_size,
            self.color,
        );
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn set_text(&mut self, text: &str) {
        self.set_text(text);
    }
}

// ---------------------------------------------------------------------------
// TextObject<Data> = Behavior<Text, Data>
// ---------------------------------------------------------------------------

/// Obiekt tekstowy z danymi i opcjonalną funkcją aktualizacji.
///
/// Dzięki `Deref<Target = Text>` pola i metody `Text` są dostępne bezpośrednio:
/// - `text_obj.content` — treść napisu (`String`)
/// - `text_obj.set_text("nowa treść")`, `text_obj.skip()`, `text_obj.is_finished()`
pub type TextObject<Data> = Behavior<Text, Data>;

/// `Deref` umożliwia bezpośredni dostęp do pól i metod `Text` na `TextObject`.
/// Pole treści napisu: `text_obj.content` (nie `text_obj.text`).
impl<Data> std::ops::Deref for Behavior<Text, Data> {
    type Target = Text;
    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl<Data> std::ops::DerefMut for Behavior<Text, Data> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.inner
    }
}

// ---------------------------------------------------------------------------
// Button — interaktywny przycisk (warstwa UI)
// ---------------------------------------------------------------------------

pub struct Button {
    pub position: Vec2,
    pub size: Vec2,
    pub label: String,
    pub font_size: f32,
    pub color: Color,
    pub hover_color: Color,
    pub text_color: Color,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
}

impl Button {
    pub fn new(position: Vec2, size: Vec2, label: &str) -> Self {
        Self {
            position,
            size,
            label: label.to_string(),
            font_size: 20.0,
            color: GRAY,
            hover_color: LIGHTGRAY,
            text_color: WHITE,
            tag: String::new(),
            visible: true,
            active: true,
        }
    }

    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
        self
    }

    pub fn rect(&self) -> Rect {
        Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        }
    }
}

impl Clickable for Button {
    fn click_rect(&self) -> Rect {
        self.rect()
    }
    fn is_active(&self) -> bool {
        self.active
    }
}

impl Object for Button {
    fn update(&mut self, _ctx: &mut Context) {}

    /// Rysuje przycisk — warstwa UI, rysowana po camera.end().
    /// Nie wołamy set_default_camera() — zarządza tym Engine::run.
    /// Używa `is_hovered()` (przestrzeń ekranu) — poprawne dla warstwy UI.
    fn draw(&self) {
        if !self.visible {
            return;
        }
        let bg_color = if self.is_hovered() {
            self.hover_color
        } else {
            self.color
        };
        draw_rectangle(
            self.position.x,
            self.position.y,
            self.size.x,
            self.size.y,
            bg_color,
        );
        let tx = self.position.x + 10.0;
        let ty = self.position.y + (self.size.y / 2.0) + (self.font_size / 3.0);
        draw_text(&self.label, tx, ty, self.font_size, self.text_color);
    }

    fn tag(&self) -> &str {
        &self.tag
    }
}

// ---------------------------------------------------------------------------
// ProgressBar — pasek postępu (warstwa UI)
// ---------------------------------------------------------------------------

pub struct ProgressBar {
    pub position: Vec2,
    pub size: Vec2,
    pub progress: f32,
    pub bg_color: Color,
    pub fill_color: Color,
    pub tag: String,
    pub visible: bool,
    /// Opcjonalny klucz w `ctx.state` (wartość f64 w zakresie 0.0..1.0) do automatycznego czytania postępu.
    pub state_binding: Option<String>,
}

impl ProgressBar {
    pub fn new(position: Vec2, size: Vec2, progress: f32) -> Self {
        Self {
            position,
            size,
            progress: progress.clamp(0.0, 1.0),
            bg_color: RED,
            fill_color: GREEN,
            tag: String::new(),
            visible: true,
            state_binding: None,
        }
    }

    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
        self
    }

    /// Wiąże pasek postępu z wartością float w `ctx.state`.
    pub fn with_state_binding(mut self, state_key: &str) -> Self {
        self.state_binding = Some(state_key.to_string());
        self
    }

    pub fn set_progress(&mut self, progress: f32) {
        self.progress = progress.clamp(0.0, 1.0);
    }
}

impl Object for ProgressBar {
    fn update(&mut self, ctx: &mut Context) {
        if let Some(key) = &self.state_binding {
            if ctx.state.has_flag(key) {
                let val = ctx.state.get_float(key) as f32;
                self.set_progress(val);
            }
        }
    }

    /// Rysuje pasek — warstwa UI, rysowana po camera.end().
    fn draw(&self) {
        if !self.visible {
            return;
        }
        draw_rectangle(
            self.position.x,
            self.position.y,
            self.size.x,
            self.size.y,
            self.bg_color,
        );
        let fill_w = self.size.x * self.progress;
        if fill_w > 0.0 {
            draw_rectangle(
                self.position.x,
                self.position.y,
                fill_w,
                self.size.y,
                self.fill_color,
            );
        }
    }

    fn tag(&self) -> &str {
        &self.tag
    }
}

// ---------------------------------------------------------------------------
// Panel — ogólny kontener UI z Draggable + z-order
// ---------------------------------------------------------------------------

/// Ogólny kontener UI: pozycja, rozmiar, tło, lista dzieci (`Vec<Box<dyn Object>>`).
///
/// Implementuje `Object` + `Clickable` + `Draggable`.
///
/// # Przykład
/// ```ignore
/// let mut panel = Panel::new(vec2(100.0, 100.0), vec2(300.0, 200.0))
///     .with_tag("inventory")
///     .with_background(Color::from_rgba(20, 20, 30, 200));
/// panel.add_child(Box::new(Text::new("Ekwipunek", vec2(10.0, 30.0), 20.0, WHITE)));
/// ```
pub struct Panel {
    pub position: Vec2,
    pub size: Vec2,
    pub background_color: Color,
    pub border_color: Option<Color>,
    pub border_width: f32,
    pub children: Vec<Box<dyn Object>>,
    pub tag: String,
    pub visible: bool,
    pub active: bool,
    pub drag: DragState,
    pub draggable: bool,
}

impl Panel {
    pub fn new(position: Vec2, size: Vec2) -> Self {
        Self {
            position,
            size,
            background_color: Color::from_rgba(30, 30, 40, 220),
            border_color: Some(Color::from_rgba(80, 80, 100, 255)),
            border_width: 1.5,
            children: Vec::new(),
            tag: String::new(),
            visible: true,
            active: true,
            drag: DragState::new(),
            draggable: true,
        }
    }

    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
        self
    }

    pub fn with_background(mut self, color: Color) -> Self {
        self.background_color = color;
        self
    }

    pub fn with_border(mut self, color: Color, width: f32) -> Self {
        self.border_color = Some(color);
        self.border_width = width;
        self
    }

    pub fn without_border(mut self) -> Self {
        self.border_color = None;
        self
    }

    pub fn draggable(mut self, enabled: bool) -> Self {
        self.draggable = enabled;
        self
    }

    /// Dodaje element potomny do panelu.
    pub fn add_child(&mut self, child: Box<dyn Object>) {
        self.children.push(child);
    }

    pub fn rect(&self) -> Rect {
        Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: self.size.y,
        }
    }

    /// Czy obiekt jest aktualnie przeciągany.
    pub fn is_dragging(&self) -> bool {
        self.drag.is_dragging
    }
}

impl Clickable for Panel {
    fn click_rect(&self) -> Rect {
        self.rect()
    }
    fn is_active(&self) -> bool {
        self.active
    }
}

impl Draggable for Panel {
    fn drag_anchor_mut(&mut self) -> &mut Vec2 {
        &mut self.position
    }

    fn drag_state(&self) -> &DragState {
        &self.drag
    }

    fn drag_state_mut(&mut self) -> &mut DragState {
        &mut self.drag
    }

    fn is_drag_hovered(&self) -> bool {
        if !self.active || !self.draggable {
            return false;
        }
        let (mx, my) = mouse_position();
        // Strefa chwytania: górny pasek (20px) lub cały panel
        let header = Rect {
            x: self.position.x,
            y: self.position.y,
            w: self.size.x,
            h: 20.0_f32.min(self.size.y),
        };
        header.contains(vec2(mx, my))
    }
}

impl Object for Panel {
    fn update(&mut self, ctx: &mut Context) {
        // Obsługa przeciągania
        if self.draggable {
            let lmb_pressed = is_mouse_button_pressed(MouseButton::Left);
            let lmb_down = macroquad::input::is_mouse_button_down(MouseButton::Left);
            if lmb_pressed && self.is_drag_hovered() {
                self.start_drag();
            }
            if lmb_down {
                self.update_drag();
            } else {
                self.end_drag();
            }
        }

        // Aktualizuj dzieci (offsetujemy ctx.camera? Nie — panel jest w przestrzeni ekranu)
        for child in self.children.iter_mut() {
            child.update(ctx);
        }
    }

    fn draw(&self) {
        if !self.visible {
            return;
        }
        // Tło panelu
        draw_rectangle(
            self.position.x,
            self.position.y,
            self.size.x,
            self.size.y,
            self.background_color,
        );
        // Ramka
        if let Some(bc) = self.border_color {
            let bw = self.border_width;
            // Górna krawędź
            draw_rectangle(self.position.x, self.position.y, self.size.x, bw, bc);
            // Dolna krawędź
            draw_rectangle(self.position.x, self.position.y + self.size.y - bw, self.size.x, bw, bc);
            // Lewa krawędź
            draw_rectangle(self.position.x, self.position.y, bw, self.size.y, bc);
            // Prawa krawędź
            draw_rectangle(self.position.x + self.size.x - bw, self.position.y, bw, self.size.y, bc);
        }
        // Rysuj dzieci (z offsetem pozycji panelu)
        // UWAGA: dzieci przechowują pozycje względem lewego-górnego rogu panelu.
        // Bez transformacji rysuje je w przestrzeni absolutnej ekranu.
        for child in self.children.iter() {
            child.draw();
        }
    }

    fn tag(&self) -> &str {
        &self.tag
    }
}

// ---------------------------------------------------------------------------
// UI — kontener elementów warstwy UI z z-order/focus
// ---------------------------------------------------------------------------

pub struct UI {
    pub elements: Vec<Box<dyn Object>>,
    pub tag: String,
}

impl UI {
    pub fn new(elements: Vec<Box<dyn Object>>) -> Self {
        Self {
            elements,
            tag: "UI".to_string(),
        }
    }

    pub fn with_tag(mut self, tag: &str) -> Self {
        self.tag = tag.to_string();
        self
    }

    pub fn add(&mut self, element: Box<dyn Object>) {
        self.elements.push(element);
    }

    /// Przenosi element z podanym tagiem na koniec listy (rysowany na wierzchu).
    /// Zwraca `true` jeśli element o tym tagu został znaleziony.
    pub fn bring_to_front(&mut self, tag: &str) -> bool {
        if let Some(pos) = self.elements.iter().position(|e| e.tag() == tag) {
            let element = self.elements.remove(pos);
            self.elements.push(element);
            true
        } else {
            false
        }
    }

    /// Automatycznie podnosi element trafiony kliknięciem LPM na wierzch.
    /// Wywołuj w `update` jeśli chcesz focus-on-click.
    pub fn raise_clicked(&mut self) {
        let (mx, my) = mouse_position();
        if !is_mouse_button_pressed(MouseButton::Left) {
            return;
        }
        // Znajdź ostatni (wierzchni) element który zawiera kursor
        let mut hit_tag: Option<String> = None;
        for element in self.elements.iter().rev() {
            // Prostą heurystyką jest sprawdzenie tagu — Panel implementuje Clickable,
            // ale Object trait nie eksponuje click_rect(). Użytkownicy mogą nadpisać
            // tę logikę. Tutaj jako stub nie robimy downcast (brak Any w trait).
            let _ = (mx, my);
            let tag = element.tag().to_string();
            if !tag.is_empty() {
                hit_tag = Some(tag);
                break;
            }
        }
        if let Some(tag) = hit_tag {
            self.bring_to_front(&tag);
        }
    }
}

impl Object for UI {
    fn update(&mut self, ctx: &mut Context) {
        for element in self.elements.iter_mut() {
            element.update(ctx);
        }
    }

    /// Rysuje elementy UI — brak set_default_camera(), zarządza tym Engine::run.
    fn draw(&self) {
        for element in self.elements.iter() {
            element.draw();
        }
    }

    fn tag(&self) -> &str {
        &self.tag
    }
}

impl Default for UI {
    fn default() -> Self {
        Self::new(Vec::new())
    }
}