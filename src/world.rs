use crate::engine::Context;

pub trait Object {
    fn update(&mut self, _ctx: &mut Context) {}
    fn draw(&self);
    fn tag(&self) -> &str {
        ""
    }
    fn has_tag(&self, tag: &str) -> bool {
        self.tag() == tag
    }
    /// Ustawia treść tekstu dla obiektów go wspierających (np. `Text`, `TextObject`).
    /// Domyślnie pusta implementacja (no-op).
    fn set_text(&mut self, _text: &str) {}
}

/// Świat gry: przechowuje dwie warstwy obiektów.
///
/// - `objects` — rysowane w przestrzeni świata (wewnątrz camera.begin/end)
/// - `ui_objects` — rysowane w przestrzeni ekranu (po camera.end, bez transformacji kamery)
pub struct World {
    objects: Vec<Box<dyn Object>>,
    ui_objects: Vec<Box<dyn Object>>,
}

impl World {
    /// Tworzy świat z obiektami w przestrzeni świata.
    pub fn new(objects: Vec<Box<dyn Object>>) -> Self {
        Self {
            objects,
            ui_objects: Vec::new(),
        }
    }

    /// Tworzy świat z obiektami świata i obiektami UI jednocześnie.
    pub fn new_with_ui(objects: Vec<Box<dyn Object>>, ui_objects: Vec<Box<dyn Object>>) -> Self {
        Self { objects, ui_objects }
    }

    /// Dodaje obiekt do przestrzeni świata w czasie działania gry.
    pub fn add(&mut self, object: Box<dyn Object>) {
        self.objects.push(object);
    }

    /// Dodaje obiekt do warstwy UI (przestrzeń ekranu).
    pub fn add_ui(&mut self, object: Box<dyn Object>) {
        self.ui_objects.push(object);
    }

    pub fn objects(&self) -> &[Box<dyn Object>] {
        &self.objects
    }

    pub fn objects_mut(&mut self) -> &mut [Box<dyn Object>] {
        &mut self.objects
    }

    pub fn ui_objects(&self) -> &[Box<dyn Object>] {
        &self.ui_objects
    }

    pub fn ui_objects_mut(&mut self) -> &mut [Box<dyn Object>] {
        &mut self.ui_objects
    }

    /// Szuka obiektów (warstwa świata) po tagu — tylko do odczytu.
    pub fn find_by_tag(&self, tag: &str) -> Vec<&dyn Object> {
        self.objects
            .iter()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_ref())
            .collect()
    }

    /// Szuka obiektów (warstwa świata) po tagu — mutowalnie.
    pub fn find_by_tag_mut<'a>(&'a mut self, tag: &str) -> Vec<&'a mut (dyn Object + 'static)> {
        self.objects
            .iter_mut()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_mut())
            .collect()
    }

    /// Szuka obiektów UI po tagu — tylko do odczytu.
    pub fn find_ui_by_tag(&self, tag: &str) -> Vec<&dyn Object> {
        self.ui_objects
            .iter()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_ref())
            .collect()
    }

    /// Szuka obiektów UI po tagu — mutowalnie.
    pub fn find_ui_by_tag_mut<'a>(&'a mut self, tag: &str) -> Vec<&'a mut (dyn Object + 'static)> {
        self.ui_objects
            .iter_mut()
            .filter(|o| o.has_tag(tag))
            .map(|o| o.as_mut())
            .collect()
    }

    /// Liczy obiekty w warstwie świata pasujące do tagu.
    pub fn count_by_tag(&self, tag: &str) -> usize {
        self.objects.iter().filter(|o| o.has_tag(tag)).count()
    }

    /// Liczy obiekty w warstwie UI pasujące do tagu.
    pub fn count_ui_by_tag(&self, tag: &str) -> usize {
        self.ui_objects.iter().filter(|o| o.has_tag(tag)).count()
    }

    /// Aktualizuje logikę wszystkich obiektów (świat + UI).
    pub fn update(&mut self, ctx: &mut Context) {
        for obj in self.objects.iter_mut() {
            obj.update(ctx);
        }
        for obj in self.ui_objects.iter_mut() {
            obj.update(ctx);
        }
    }

    /// Rysuje obiekty w przestrzeni świata (wywoływane wewnątrz camera.begin/end).
    pub fn draw(&self) {
        for obj in self.objects.iter() {
            obj.draw();
        }
    }

    /// Rysuje obiekty UI w przestrzeni ekranu (wywoływane po camera.end).
    pub fn draw_ui(&self) {
        for obj in self.ui_objects.iter() {
            obj.draw();
        }
    }
}

impl Default for World {
    fn default() -> Self {
        Self::new(Vec::new())
    }
}

// ---------------------------------------------------------------------------
// Makra pomocnicze do budowania świata
// ---------------------------------------------------------------------------

/// Buduje `Vec<Box<dyn Object>>` z listy obiektów bez potrzeby ręcznego `Box::new()`.
///
/// # Przykład
/// ```ignore
/// let objs = world_objects![player, enemy, bullet];
/// ```
#[macro_export]
macro_rules! world_objects {
    ($($obj:expr),* $(,)?) => {
        vec![$(Box::new($obj) as Box<dyn $crate::world::Object>),*]
    };
}

/// Deklaratywny konstruktor `World` tworzący warstwę obiektów świata oraz opcjonalnie warstwę UI.
///
/// # Przykład
/// ```ignore
/// let w = world! {
///     objects: [player, enemy],
///     ui: [hp_bar, score_text],
/// };
///
/// let w_no_ui = world! {
///     objects: [player, enemy],
/// };
/// ```
#[macro_export]
macro_rules! world {
    (objects: [$($obj:expr),* $(,)?] $(,)? ui: [$($ui:expr),* $(,)?] $(,)?) => {
        $crate::world::World::new_with_ui(
            $crate::world_objects![$($obj),*],
            $crate::world_objects![$($ui),*],
        )
    };
    (ui: [$($ui:expr),* $(,)?] $(,)? objects: [$($obj:expr),* $(,)?] $(,)?) => {
        $crate::world::World::new_with_ui(
            $crate::world_objects![$($obj),*],
            $crate::world_objects![$($ui),*],
        )
    };
    (objects: [$($obj:expr),* $(,)?] $(,)?) => {
        $crate::world::World::new($crate::world_objects![$($obj),*])
    };
}