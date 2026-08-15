# RustedEngine 🦀🎮

[![Rust](https://img.shields.io/badge/rust-2021%20edition-orange.svg)](https://www.rust-lang.org/)
[![Macroquad](https://img.shields.io/badge/built%20with-Macroquad-blue.svg)](https://macroquad.rs/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**RustedEngine** to lekki, niezwykle wyrazisty i ergonomiczny 2D silnik gier napisany w języku **Rust**, zbudowany na bazie biblioteki [Macroquad](https://macroquad.rs/).

Silnik został zaprojektowany z myślą o prostocie, modularności i zerowym nakładzie niepotrzebnej abstrakcji. Łączy moc idiomatycznego Rusta z przejrzystym modelem mentalnym i natychmiastowym tworzeniem gier bez boilerplate'u.

---

## ✨ Główne Cechy Silnika

* 🚀 **Zero-Boilerplate API**: Tworzenie obiektów, scen i interfejsów bez ręcznego `Box::new(...)` — po prostu `scene.add(player)`.
* 👾 **GameObject & Behavior Pattern**: Łatwe łączenie surowych komponentów graficznych (`Sprite`, `Rectangle`, `Text`) z własnymi strukturami danych (`Behavior<Inner, Data>`).
* 🖥️ **Wbudowany System UI & Windowing**:
  * Gotowe komponenty: `Text` (zawijanie słów, maszyna do pisania), `Button`, `ProgressBar`, `TextField`, `Panel`.
  * `PanelManager` — pulpitowy menedżer okien z obsługą skupienia (focus), zmianą Z-Order, przeciąganiem i skalowaniem.
* 🎥 **Kamera 2D & Efekty**:
  * Płynne podążanie za celami (`camera.follow`), efekt trzęsienia ziemi (`camera.shake`), automatyczne przeliczenia współrzędnych ekranu na świat (`screen_to_world`).
* ⚡ **Ultra-Ergonomiczne Sterowanie**:
  * Kierunki ruchu 2D w 1 linijce: `ctx.input.wasd()` oraz `ctx.input.arrow_keys()`.
  * Błyskawiczny dostęp do czasu klatki: `ctx.dt()`.
  * Bezpośrednie kliknięcia w przestrzeni 2D: `player.click(ctx, Side::Left)`.
* 💾 **Zarządzanie Stanem i Zasobami**:
  * `StateStore`: Magazyn flag i wartości z szybkim zapisem/odczytem JSON.
  * `Resources`: Bezpieczny typologicznie kontener danych (Type-Map).
  * `ActionMap`: Mapowanie nazwanych akcji do klawiatury i myszy.
  * `TriggerSystem`: System reakcji na zdarzenia i warunki w grze.
* 🎨 **Grafika, Animacje & Shadery**:
  * `AnimatedSprite` & `Sequence`: Poklatkowe animacje tekstur.
  * `ParticleEmitter`: System cząsteczek.
  * `PostProcess`: Pełnoekranowe shadery i nakładki graficzne.
  * **Content Pipeline**: Automatyczne wczytywanie danych gier z plików JSON (`load_content`).

---

## ⚡ Szybki Start (Quickstart)

Dodaj `RustedEngine` do swojego projektu i stwórz pierwszą grę w kilkadziesiąt linijek:

```rust
use RustedEngine::prelude::*;
use macroquad::prelude::*;

// 1. Własna struktura danych gracza
struct PlayerData {
    speed: f32,
    hp: i32,
}

#[macroquad::main("My RustedEngine Game")]
async fn main() {
    // 2. Tworzenie obiektu gracza
    let player = GameObject::new(
        Sprite::solid(vec2(0.0, 0.0), vec2(50.0, 50.0), BLUE).with_tag("player"),
        PlayerData { speed: 250.0, hp: 100 },
    )
    .update(|player, ctx| {
        // Ruch WASD w jednej linijce
        let direction = ctx.input.wasd();
        player.position += direction * player.data.speed * ctx.dt();

        // Obsługa kliknięć w przestrzeni świata 2D
        if player.click(ctx, Side::Left) {
            player.data.hp -= 10;
            println!("HP Gracza: {}", player.data.hp);
        }

        // Reakcja na najechanie kursorom
        if player.clicked(ctx, Side::Left) {
            player.color = RED;
        } else if player.is_hovered(ctx) {
            player.color = YELLOW;
        } else {
            player.color = BLUE;
        }
    });

    // 3. Budowanie Sceny i UI
    let mut scene = Scene::new_empty("MainGame");
    scene.add(player);
    scene.add_ui(Text::new("RustedEngine Demo", vec2(20.0, 35.0), 28.0, WHITE));
    scene.add_ui(Text::new("WASD - ruch | LPM - interakcja", vec2(20.0, 65.0), 18.0, LIGHTGRAY));

    // 4. Inicjalizacja i uruchomienie Silnika
    let mut engine = Engine::new(scene).with_background_color(DARKGRAY);
    engine.run().await;
}
```

---

## 🧠 Model Mentalny Silnika

RustedEngine operuje na prostym, liniowym przepływie danych:

```text
Engine ──► SceneManager ──► Scene ──► World ──┬──► objects (World Space 2D)
                                              └──► ui_objects (Screen Space)
```

1. **`Engine`**: Zarządza główną pętlą `async`, czasem klatki oraz czyszczeniem ekranu.
2. **`Context` (`ctx`)**: Udostępnia obiektom wejście, dźwięki, zasoby, stan oraz kamerę.
3. **`World`**: Przechowuje warstwę obiektów renderowanych w przestrzeni kamery (`objects`) oraz warstwę UI pracującą w pikselach ekranu (`ui_objects`).
4. **`Behavior<Inner, Data>`**: Daje pełny dostęp przez `Deref` do komponentu graficznego (`player.position`, `player.color`) oraz danych logicznych (`player.data`).

---

## 📁 Przykłady w Repozytorium

W katalogu `examples/` znajdziesz gotowe przykłady demonstracyjne:

* **`test.rs`** / **`demo.rs`** — Podstawy poruszania się, klikalnych obiektów i tekstu.
* **`panel_demo.rs`** — System pulpitowych okien UI z przeciąganiem (`PanelManager`).
* **`scroll_demo.rs`** — Przewijany interfejs i panel tekstu (`Panel`).
* **`resources_demo.rs`** — Rejestracja i mutowanie unikalnych typów danych w `Resources`.
* **`content_pipeline_demo.rs`** — Ładowanie plików danych JSON z dysku.
* **`trigger_demo.rs`** — Użycie jednorazowych i cyklicznych wyzwalaczy zdarzeń.

Uruchomienie dowolnego przykładu:
```bash
cargo run --example test
cargo run --example panel_demo
```

---

## 📄 Licencja

Projekt udostępniany jest na licencji **MIT**. Szczegóły w pliku `LICENSE`.
