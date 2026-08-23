export const worldObjectsDoc = {
  id: "world-objects",
  title: "2. 🌍 World, Objects, Behaviors & Logic System",
  icon: "Globe",
  badge: "Entity Architecture",
  description: "Zarządzanie kontenerem World, cykl życia bytów (Auto-Cleanup & Deferred Spawning), cecha Object, zapytania typowane i przestrzenne, Behavior z blanket Deref oraz dedykowany system Logic/LogicObject.",
  sections: [
    {
      id: "world-structure",
      title: "Struktura Kontenera World, Layering & Cykl Życia Bytów",
      content: `Kontener **\`World\`** reprezentuje pojedynczą przestrzeń gry i odpowiada za przechowywanie, aktualizację oraz automatyczne oczyszczanie wszystkich bytów.

### Podział na Warstwy Wykonawcze:
1. **\`objects: Vec<Box<dyn Object>>\`**:
   - Obiekty renderowane w przestrzeni świata 2D przez kamerę (\`Sprite\`, \`Rectangle\`, \`Tilemap\`, \`ParticleEmitter\`).
2. **\`ui_objects: Vec<Box<dyn Object>>\`**:
   - Obiekty UI renderowane w przestrzeni ekranu (Screen Space: panele, przyciski, paski postępu, logi).
3. **\`logic: Vec<Box<dyn Object>>\`**:
   - Niewidzialne kontrolery aktualizowane co klatkę bez narzutu GPU (\`Logic\`, \`LogicObject\`, spawnery fal, skrypty zarządcze). Wykonują się **po obiektach świata**, stanowiąc idealną fazę dispatchu zdarzeń.
4. **\`sequences: Vec<Sequence>\`**:
   - Skryptowane sekwencje narrative/dialogowe wykonywane w tle.

### ⚡ Odroczone Spawnowanie (Deferred Spawning):
Wewnątrz pętli \`update\` dowolny obiekt może bezpiecznie kolejkować tworzenie nowych bytów bez konfliktów z pożyczaniem kontenera (borrow checker):
- \`ctx.spawn(obj)\`: Dodaje byt do warstwy świata (rozpoczyna update w następnej klatce).
- \`ctx.spawn_ui(obj)\`: Dodaje byt do warstwy UI.
- \`ctx.spawn_logic(obj)\` / \`ctx.spawn_logic_fn(|ctx| ...)\`: Dodaje obiekt/closure do warstwy logiki.

### 🧹 Automatyczne Czyszczenie (Auto-Cleanup):
Każdy obiekt implementuje metody \`is_destroyed(&self) -> bool\` oraz \`destroy(&mut self)\`. Na koniec każdej klatki \`World::update\` automatycznie usuwa zniszczone byty ze wszystkich warstw!`,
      callouts: [
        {
          type: "protip",
          title: "Pro Tip: Niszczenie i spawnowanie z poziomu Context",
          text: "Wewnątrz callbacka `update(|obj, ctx| ...)` możesz wywołać `obj.destroy();`, aby obiekt został usunięty na koniec klatki, a przez `ctx.spawn(...)` natychmiast zespawnować efekt cząsteczkowy wybuchu!"
        }
      ],
      codeExamples: [
        {
          title: "Główny Przykład: Spawnowanie Pocisku i Samozniszczenie po Czasie",
          code: `struct BulletData {
    pub velocity: Vec2,
    pub lifetime: f32,
}

let bullet = Sprite::solid(player_pos, vec2(8.0, 8.0), YELLOW)
    .with_data(BulletData { velocity: dir * 400.0, lifetime: 2.0 })
    .with_tag("bullet")
    .update(|obj, ctx| {
        obj.position += obj.data.velocity * ctx.dt();
        obj.data.lifetime -= ctx.dt();

        if obj.data.lifetime <= 0.0 {
            obj.destroy(); // Auto-cleanup na koniec klatki
        }
    });

ctx.spawn(bullet);`,
          collapsible: false
        },
        {
          title: "Rozszerzony Przykład: Odroczone Dodawanie Pływających Tekstów Obrażeń (Damage Popups)",
          code: `struct DamageTextData {
    pub lifetime: f32,
    pub float_speed: f32,
}

pub fn spawn_damage_number(ctx: &mut Context, pos: Vec2, amount: i32) {
    let popup = Text::new(&format!("-{}", amount), pos, 18.0, RED)
        .with_data(DamageTextData { lifetime: 0.8, float_speed: 40.0 })
        .update(|obj, ctx| {
            obj.position.y -= obj.data.float_speed * ctx.dt();
            obj.data.lifetime -= ctx.dt();
            if obj.data.lifetime <= 0.0 {
                obj.destroy();
            }
        });
    ctx.spawn_ui(popup);
}`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "object-trait",
      title: "Cecha Object - Kontrakt Deweloperski",
      content: `Każdy element dodawany do kontenera \`World\` musi implementować cechę **\`Object\`**. Cecha ta dostarcza elastyczny interfejs wywołań zwrotnych i rzutowania w dół (downcasting).

### Główne Metody Cechy Object:
- \`update(&mut self, ctx: &mut Context)\`: Wywoływane co klatkę w fazie logiki.
- \`draw(&self)\`: Rysowanie obiektu.
- \`is_destroyed(&self) -> bool\` & \`destroy(&mut self)\`: Flaga i metoda niszczenia obiektu dla auto-cleanupu.
- \`tag(&self) -> &str\` / \`has_tag(&str)\`: Odczyt tagu obiektu.
- \`set_text(&mut self, text: &str)\`: Aktualizacja treści dla obiektów wspierających tekst.
- \`bounds(&self) -> Option<Rect>\`: Zwraca prostokąt kolizji/interakcji dla hit-testingu myszy i zapytań przestrzennych.
- \`is_text_layer(&self) -> bool\`: Rysowanie bezpośrednio w natywnej rozdzielczości ekranu.
- \`as_any(&self)\` / \`as_any_mut(&mut self)\`: Bezpieczne rzutowanie w dół do konkretnego typu.`,
      codeExamples: [
        {
          title: "Implementacja Własnego Obiektu z Cyklem Życia",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

pub struct CustomEnemy {
    pub position: Vec2,
    pub hp: i32,
    pub tag: String,
    pub destroyed: bool,
}

impl Object for CustomEnemy {
    fn update(&mut self, ctx: &mut Context) {
        self.position.x += 50.0 * ctx.dt();
        if self.hp <= 0 {
            self.destroy();
        }
    }

    fn draw(&self) {
        draw_circle(self.position.x, self.position.y, 16.0, RED);
    }

    fn is_destroyed(&self) -> bool {
        self.destroyed
    }

    fn destroy(&mut self) {
        self.destroyed = true;
    }

    fn tag(&self) -> &str {
        &self.tag
    }

    fn bounds(&self) -> Option<Rect> {
        Some(Rect::new(self.position.x - 16.0, self.position.y - 16.0, 32.0, 32.0))
    }
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "spatial-queries",
      title: "Zapytania Przestrzenne & Typowane w World",
      content: `Kontener \`World\` oferuje gotowe metody do szybkiego wyszukiwania obiektów na podstawie typu, tagu oraz położenia:

### Typowane Zapytania:
- **\`world.find_typed::<T>() -> Option<&T>\`** / **\`world.find_typed_mut::<T>() -> Option<&mut T>\`**: Zwraca pierwszy obiekt świata konkretnego typu \`T\`.
- **\`world.find_ui_typed::<T>() -> Option<&T>\`** / **\`world.find_ui_typed_mut::<T>() -> Option<&mut T>\`**: Typowane zapytanie do warstwy UI.
- **\`world.find_logic_typed::<T>() -> Option<&T>\`** / **\`world.find_logic_typed_mut::<T>() -> Option<&mut T>\`**: Typowane zapytanie do warstwy logiki.

### Zapytania Przestrzenne:
- **\`world.find_nearest(pos: Vec2, tag: &str) -> Option<&dyn Object>\`**: Znajduje najbliższy obiekt o danym tagu.
- **\`world.find_within_radius(center: Vec2, radius: f32) -> Vec<&dyn Object>\`**: Zwraca wszystkie obiekty w zadanym promieniu (idealne do obrażeń obszarowych AoE czy przyciągania pickupów).`,
      codeExamples: [
        {
          title: "Wyszukiwanie Najbliższego Wroga i Zapytania Typowane",
          code: `// 1. Bezpieczny odczyt konkretnego typu bez ręcznego downcastingu:
if let Some(player) = world.find_typed::<GameObject<PlayerData>>() {
    println!("Pozycja gracza: {:?}", player.position);
}

// 2. Zadanie obrażeń obszarowych (AoE) wszystkim bytom w promieniu 150px
let nearby = world.find_within_radius(explosion_pos, 150.0);
println!("Trafiono {} obiektów w promieniu wybuchu!", nearby.len());`,
          collapsible: false
        }
      ]
    },
    {
      id: "behavior-and-wrappers",
      title: "System Zachowań: Behavior z Blanket Deref & Ergonomia Sprite",
      content: `Aby uniknąć konieczności tworzenia dedykowanych struktur dla prostych obiektów, RustedEngine oferuje generyczny moduł zachowań **\`Behavior<Inner, Data>\`** oraz konstruktor płynny **\`.with_data(data)\`**.

### 🚀 Blanket Deref & DerefMut:
\`Behavior<Inner, Data>\` implementuje cechę \`Deref<Target = Inner>\` i \`DerefMut\` w sposób w pełni uogólniony (blanket implementation).
Oznacza to, że **dowolny komponent** opakowany w \`Behavior\` udostępnia swoje pola i metody bezpośrednio — bez konieczności pisania \`obj.inner.position\`:
\`\`\`rust
// Bezpośredni dostęp do pól wewnętrznego Sprite:
player.position += dir * speed * ctx.dt();
player.color = BLUE;
player.look_at(target);
\`\`\`

### Ergonomia Duszka (\`Sprite\`):
- \`sprite.center() -> Vec2\`: Zwraca środek duszka (\`position + size * 0.5\`).
- \`sprite.set_center(center: Vec2)\`: Ustawia położenie duszka tak, aby jego środek znalazł się w $center$.
- \`sprite.look_at(target_pos: Vec2)\`: Obraca duszka w kierunku celu.
- \`sprite.circle() -> Circle\`: Zwraca aproksymację kołową hitboxa dla szybkich testów kolizji.`,
      codeExamples: [
        {
          title: "Płynne Tworzenie Przeciwnika z .with_data() i look_at()",
          code: `struct EnemyData {
    pub hp: i32,
    pub speed: f32,
}

let enemy = Sprite::solid(vec2(100.0, 100.0), vec2(24.0, 24.0), RED)
    .with_data(EnemyData { hp: 30, speed: 120.0 })
    .with_tag("enemy")
    .update(|obj, ctx| {
        // Bezpośredni dostęp do pól duszka przez blanket Deref:
        let player_pos = ctx.state.get_vec2("player_pos").unwrap_or_default();
        obj.look_at(player_pos);
        obj.move_towards(player_pos, obj.data.speed * ctx.dt());

        if obj.data.hp <= 0 {
            obj.destroy(); // automatycznie usunięty na koniec klatki
            ctx.increment("score", 50);
        }
    });

ctx.spawn(enemy);`,
          collapsible: false
        }
      ]
    },
    {
      id: "logic-system",
      title: "Dedykowany Moduł Logic & Kontrolery Systemowe (`Logic<Data>`)",
      content: `Dla kontrolerów systemowych (spawnery fal, timery, zarządcy muzyki, reguły gry) silnik dostarcza dedykowaną, zero-cost strukturę **\`Logic<Data>\`** (z aliasem \`LogicObject<Data>\`).

### Dlaczego dedykowana struktura \`Logic<Data>\` jest lepsza?
- **Zero graficznego narzutu**: Brak sztucznego prostokąta/duszka pod spodem, brak niepotrzebnych pól \`color\`, \`texture\` czy \`bounds\`.
- **Bezpośredni \`Deref\` do \`Data\`**: Pola z Twojej struktury danych są dostępne natychmiast jako \`obj.my_field\` bez pisania \`obj.data.my_field\`!
- **Wbudowane timery i wzorce systemowe**:
  - **\`Logic::run(|ctx| ...)\`** lub **\`ctx.spawn_logic_fn(|ctx| ...)\`**: Bezstanowe zamknięcie wywoływane co klatkę.
  - **\`Logic::interval(interval_secs, |ctx| ...)\`**: Wykonuje kod dokładnie co $X$ sekund (np. spawnowanie przeciwników).
  - **\`Logic::delayed(delay_secs, |ctx| ...)\`**: Jednorazowa akcja odroczona w czasie (auto-destrukcja po wykonaniu).
  - **\`Logic::until(cond_fn, update_fn)\`**: Wykonuje logikę dopóki warunek jest prawdziwy.`,
      codeExamples: [
        {
          title: "Główny Przykład: Kontroler Zasad Gry z Logic::run",
          code: `#[derive(Clone, Debug)]
pub struct PlayerDied { pub reason: &'static str }

let game_controller = Logic::run(|ctx| {
    // Logic odpala się po obiektach świata — gwarantowany odbiór zdarzeń!
    for death in ctx.poll::<PlayerDied>() {
        println!("Koniec gry: {}", death.reason);
        ctx.switch_scene("GameOver");
    }
});

world.add_logic(game_controller);`,
          collapsible: false
        },
        {
          title: "Rozszerzony Przykład: Użycie Logic::interval i Logic::delayed",
          code: `// 1. Spawnowanie meteorytu co 2.0 sekundy:
world.add_logic(Logic::interval(2.0, |ctx| {
    let spawn_pos = random_in_rect(Rect::new(0.0, -50.0, 800.0, 10.0));
    ctx.spawn(Sprite::solid(spawn_pos, vec2(16.0, 16.0), ORANGE));
}));

// 2. Odroczone pojawienie się bossa za 5 sekund:
ctx.spawn_logic(Logic::delayed(5.0, |ctx| {
    ctx.spawn(Sprite::solid(vec2(400.0, 200.0), vec2(64.0, 64.0), RED).with_tag("boss"));
    ctx.play_sound("boss_roar");
}));`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "declarative-macros",
      title: "Makra Deklaratywne: world! & world_objects!",
      content: `Do wygodnego konstruowania instancji \`World\` bez pisania żmudnego \`Box::new(...)\` służą makra ekspresowe:

- **\`world_objects![obj1, obj2]\`**: Konwertuje listę obiektów na \`Vec<Box<dyn Object>>\`.
- **\`world! { objects: [...], ui: [...], logic: [...] }\`**: Tworzy kompletny \`World\` z poszczególnymi warstwami.`,
      codeExamples: [
        {
          title: "Deklaratywna Inicjalizacja Świata z Warstwą Logic",
          code: `let player = Sprite::solid(vec2(50.0, 50.0), vec2(32.0, 32.0), BLUE).with_tag("player");
let score_text = Text::new("Punkty: 0", vec2(20.0, 20.0), 20.0, WHITE).with_tag("score");

let my_world = world! {
    objects: [player],
    ui: [score_text],
    logic: [
        Logic::interval(1.0, |ctx| {
            ctx.increment("game_seconds", 1);
        })
    ],
};`,
          collapsible: false
        }
      ]
    },
    {
      id: "scene-management",
      title: "Zarządzanie Scenami: Scene & SceneManager",
      content: `Aplikacja może składać się z wielu osobnych scen (np. \`Boot\`, \`MainMenu\`, \`GameLevel1\`, \`GameOver\`).

- **\`Scene\`**: Przechowuje własny \`World\` oraz opcjonalne callbacki \`on_enter(|ctx| ...)\` i \`on_exit_hook(|ctx| ...)\`.
- **\`SceneManager\`**: Przechowuje listę scen i zarządza płynnym przełączaniem na granicy klatek (*Frame Boundary*). Przełączenie sceny wywołuje zdarzenie \`SceneChanged\` oraz emituje sygnały w \`EventBus\` (\`sys:scene_loaded\`, \`sys:enter_scene_<Nazwa>\`).`,
      apiTable: {
        headers: ["Metoda / Konstruktor", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["world.find_typed::<T>()", "brak", "Option<&T>", "Zwraca pierwszy obiekt świata danego typu."],
          ["world.find_ui_typed::<T>()", "brak", "Option<&T>", "Zwraca pierwszy obiekt UI danego typu."],
          ["world.find_logic_typed::<T>()", "brak", "Option<&T>", "Zwraca pierwszy obiekt warstwy logiki danego typu."],
          ["Logic::new(data)", "Data", "Logic<Data>", "Tworzy dedykowany kontroler logiki z dostępem Deref do pól Data."],
          ["Logic::run(closure)", "FnMut(&mut Context)", "Logic<()>", "Jednolinijkowa bezstanowa logika wywoływana co klatkę."],
          ["Logic::interval(secs, closure)", "f32, FnMut(&mut Context)", "Logic<f32>", "Automatyczny kontroler wywołujący akcję co podany interwał sekund."],
          ["Logic::delayed(secs, closure)", "f32, FnMut(&mut Context)", "Logic<f32>", "Jednorazowa akcja odroczona w czasie z auto-destrukcją."],
          ["ctx.spawn_logic(logic)", "O: Object + 'static", "()", "Odroczone dodanie obiektu do warstwy logiki na koniec klatki."],
          ["ctx.spawn_logic_fn(closure)", "FnMut(&mut Context)", "()", "Błyskawiczne odroczone zespawnowanie closure logiki."]
        ]
      }
    }
  ]
};
