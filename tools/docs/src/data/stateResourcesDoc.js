export const stateResourcesDoc = {
  id: "state-resources",
  title: "3. 💾 Zarządzanie Stanem & Zasobami",
  icon: "Database",
  badge: "State & Resources",
  description: "Architektura zarządzania stanem w RustedEngine: prywatne dane encji (obj.data), globalne zasoby typowane (ctx.resources) oraz dynamiczny magazyn stanu gry (ctx.state).",
  sections: [
    {
      id: "entity-local-data",
      title: "1. Prywatne Dane Encji (`Behavior<Inner, Data>` & `obj.data`)",
      content: `Każdy obiekt w RustedEngine może posiadać własną, silnie typowaną strukturę danych powiązaną z instancją duszka lub widgetu UI.

### 📐 Dlaczego prywatny stan?
Dzięki hermetyzacji dwa różne wrogowie typu \`Goblin\` mają własne, odizolowane liczniki punktów życia i prędkości. Nie zanieczyszczasz globalnego stanu gry tysiącami zmiennych typu \`enemy_14_hp\`.`,
      codeExamples: [
        {
          title: "Tworzenie Obiektu z Własnymi Danymi i Blanket Deref",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

struct PlayerData {
    pub speed: f32,
    pub hp: i32,
    pub dash_cooldown: f32,
}

fn create_hero() -> impl Object {
    Sprite::solid(vec2(100.0, 100.0), vec2(24.0, 24.0), BLUE)
        .with_data(PlayerData {
            speed: 200.0,
            hp: 100,
            dash_cooldown: 0.0,
        })
        .update(|hero, ctx| {
            // Bezpośredni dostęp do pozycji duszka (przez Deref):
            hero.position += ctx.input.wasd() * hero.data.speed * ctx.dt();

            // Bezpośredni dostęp do pól danych (hero.data):
            if hero.data.dash_cooldown > 0.0 {
                hero.data.dash_cooldown -= ctx.dt();
            }
        })
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "typed-resources-system",
      title: "2. Globalne Zasoby Typowane (`ctx.resources` / `Resources`)",
      content: `**\`Resources\`** (\`ctx.resources\`) to ultra-szybki, typowany magazyn pojedynczych instancji struktur (*Type-Map / Singleton Store*).

### 📐 Kluczowe Cechy:
- **Zero narzutu na haszowanie stringów**: Wyszukiwanie opiera się na unikalnym \`TypeId\` typu w Rust.
- **Bezpieczeństwo w czasie kompilacji**: Odczytujesz dokładnie ten typ, który włożyłeś.
- **Dostęp z każdego miejsca**: Dowolny kontroler logiki, callback przycisku w UI czy sekwencja ma dostęp do \`ctx.resources\`.`,
      codeExamples: [
        {
          title: "Zarządzanie Ekwipunkiem i Ustawieniami w Resources",
          code: `pub struct Inventory {
    pub gold: u32,
    pub items: Vec<String>,
}

// 1. Rejestracja zasobu na starcie gry:
engine.ctx.resources.insert(Inventory {
    gold: 150,
    items: vec!["Drewniany Miecz".into(), "Mikstura HP".into()],
});

// 2. Odczyt i modyfikacja w dowolnym obiekcie:
if let Some(inv) = ctx.resources.get_mut::<Inventory>() {
    inv.gold += 50;
    inv.items.push("Klucz do Lochu".into());
    println!("Złoto w plecaku: {}", inv.gold);
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "dynamic-state-store",
      title: "3. Dynamiczny Magazyn Stanu Gry (`ctx.state` / `StateStore`)",
      content: `**\`StateStore\`** (\`ctx.state\`) to centralny magazyn typu Key-Value zoptymalizowany pod:
- Flagi postępu fabularnego (*Quest Flags*).
- Liczniki punktów, pokonanych wrogów i statystyk.
- Koordynaty checkpointów (\`Vec2\`).
- Bezpośrednią serializację do formatu JSON.

### 📐 Ergonomiczne Metody na \`Context\`:
- **\`ctx.get_int("score")\`** / **\`ctx.set_int("score", 100)\`**
- **\`ctx.increment("score", 25) -> i64\`** *(Zwraca nową wartość w jednej linijce!)*
- **\`ctx.flag("boss_dead")\`** / **\`ctx.set_flag("boss_dead", true)\`**
- **\`ctx.state.set_vec2("checkpoint", pos)\`**`,
      codeExamples: [
        {
          title: "Flagi, Liczniki i Serializacja Struktur w StateStore",
          code: `// 1. Zliczanie punktów (increment zwraca nową wartość)
let score = ctx.increment("score", 100);
ctx.set_ui_text("score_text", &format!("Wynik: {}", score));

// 2. Flagi logiczne
ctx.set_flag("gate_unlocked", true);
if ctx.flag("gate_unlocked") {
    println!("Brama stoi otworem!");
}`,
          collapsible: false
        }
      ]
    }
  ]
};
