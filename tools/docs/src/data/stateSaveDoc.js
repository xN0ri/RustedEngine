export const stateSaveDoc = {
  id: "state-save",
  title: "4. 💾 Game Data, Variables, Datasets & Persistence",
  icon: "Database",
  badge: "Data Architecture",
  description: "Kompletny przewodnik po architekturze danych w RustedEngine — prywatny stan encji (obj.data), globalne zasoby typowane (ctx.resources), dynamiczny stan gry (ctx.state), datasety JSON (Content Pipeline), tabele łupów (WeightedList, ShuffleBag) oraz bezpieczny system zapisu z CRC32.",
  sections: [
    {
      id: "data-architecture-overview",
      title: "Architektura Danych w RustedEngine: Kiedy używać czego?",
      content: `Jednym z najważniejszych pytań każdego twórcy gier jest: **„Gdzie i jak powinienem przechowywać dane?”**.

W RustedEngine dane są podzielone na **5 wyspecjalizowanych, klarownych warstw**, co eliminuje chaos architektoniczny i zapewnia maksymalną wydajność:

| Mechanizm | Gdzie żyje? | Do czego służy? | Bezpieczeństwo typów | Trwałość / Zapis |
|---|---|---|---|---|
| **\`obj.data\`** | Wewnątrz encji (\`Behavior\`) | Prywatny stan instancji (prędkość, timer skoku, cooldown, lokalne HP wroga) | 🔒 Statyczne (Rust struct) | ❌ Żyje tylko z encją |
| **\`ctx.resources\`** | Globalnie w \`Context\` | Współdzielone struktury gry (Ekwipunek, Drużyna, Ustawienia, Bazy danych) | 🔒 Statyczne (\`TypeId\`) | 🟡 Przez Serde lub Save |
| **\`ctx.state\`** | Globalnie w \`Context\` | Flagi fabularne, liczniki, punkty, odblokowane poziomy, pozycje checkpointów | 🟢 Dynamiczne (Key-Value) | ✅ Automatyczna (\`to_json\`) |
| **\`Content Pipeline\`** | Pliki JSON na dysku | Statyczne datasety gry (Baza broni, statystyki potworów, konfiguracja fal) | 🔒 Statyczne po wczytaniu | 📥 Pliki źródłowe na dysku |
| **\`ctx.save_system\`** | Pliki slotów na dysku | Trwałe zapisy rozgrywki z metadanymi i sumą kontrolną CRC32 | 🛡️ Integralność CRC32 | 💾 Trwały zapis na dysku |`,
      callouts: [
        {
          type: "protip",
          title: "Złota Zasada Podziału Danych",
          text: "Dane potrzebne tylko jednemu obiektowi trzymaj w `obj.data`. Złożone systemy współdzielone (np. Inventory) trzymaj w `ctx.resources`. Flagi questów i liczniki punktów trzymaj w `ctx.state`. Zewnętrzne konfiguracje trzymaj w plikach JSON i ładuj przez `load_content`."
        }
      ]
    },
    {
      id: "entity-local-data",
      title: "1. Prywatne Dane Encji (`Behavior<Inner, Data>` & `obj.data`)",
      content: `Każdy obiekt w RustedEngine może posiadać własną, silnie typowaną strukturę danych powiązaną z instancją duszka lub widgetu UI.

### 📐 Dlaczego prywatny stan?
Dzięki hermetyzacji dwa różne wrogowie typu \`Goblin\` mają własne, odizolowane liczniki punktów życia i prędkości. Nie zanieczyszczasz globalnego stanu gry tysiącami zmiennych typu \`enemy_14_hp\`.`,
      codeExamples: [
        {
          title: "Przykład: Tworzenie Obiektu z Własnymi Danymi i Blanket Deref",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

// 1. Definicja prywatnej struktury danych
struct PlayerData {
    pub speed: f32,
    pub hp: i32,
    pub dash_cooldown: f32,
    pub is_invulnerable: bool,
}

// 2. Tworzenie obiektu Behavior z danymi
fn create_hero() -> impl Object {
    Sprite::solid(vec2(100.0, 100.0), vec2(24.0, 24.0), BLUE)
        .with_data(PlayerData {
            speed: 200.0,
            hp: 100,
            dash_cooldown: 0.0,
            is_invulnerable: false,
        })
        .update(|hero, ctx| {
            // Bezpośredni dostęp do pozycji duszka (przez Deref):
            hero.position += ctx.input.wasd() * hero.data.speed * ctx.dt();

            // Bezpośredni dostęp do pól danych (hero.data):
            if hero.data.dash_cooldown > 0.0 {
                hero.data.dash_cooldown -= ctx.dt();
            }

            if ctx.input.is_key_pressed(KeyCode::Space) && hero.data.dash_cooldown <= 0.0 {
                hero.data.dash_cooldown = 1.2;
                hero.position += ctx.input.wasd() * 60.0;
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
          title: "Przykład: Zarządzanie Ekwipunkiem i Ustawieniami w Resources",
          code: `use rusted_engine::prelude::*;

// 1. Złożone struktury współdzielone
pub struct Inventory {
    pub gold: u32,
    pub items: Vec<String>,
}

pub struct AudioSettings {
    pub master_volume: f32,
    pub sfx_muted: bool,
}

// 2. Rejestracja zasobów na starcie silnika
let mut engine = Engine::new(scene);
engine.ctx.resources.insert(Inventory {
    gold: 150,
    items: vec!["Drewniany Miecz".into(), "Mikstura HP".into()],
});
engine.ctx.resources.insert(AudioSettings {
    master_volume: 0.8,
    sfx_muted: false,
});

// 3. Odczyt i modyfikacja w dowolnym update:
if let Some(inv) = ctx.resources.get_mut::<Inventory>() {
    inv.gold += 50;
    inv.items.push("Klucz do Lochu".into());
    println!("Złoto w plecaku: {}", inv.gold);
}

// Sprawdzenie obecności zasobu:
if ctx.resources.contains::<Inventory>() {
    // ...
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
Dla wygody najważniejsze metody stanu są dostępne bezpośrednio na \`ctx\`:
- **\`ctx.get_int("score")\`** / **\`ctx.set_int("score", 100)\`**
- **\`ctx.increment("score", 25) -> i64\`** *(Zwraca nową wartość w jednej operacji!)*
- **\`ctx.flag("boss_dead")\`** / **\`ctx.set_flag("boss_dead", true)\`**
- **\`ctx.state.get_vec2("checkpoint")\`** / **\`ctx.state.set_vec2("checkpoint", pos)\`**
- **\`ctx.state.set_struct("party", &data)\`** / **\`ctx.state.get_struct::<Party>("party")\`**`,
      codeExamples: [
        {
          title: "Przykład: Flagi, Liczniki i Serializacja Struktur w StateStore",
          code: `// 1. Zliczanie punktów (increment zwraca nową wartość)
let score = ctx.increment("score", 100);
ctx.set_ui_text("score_text", &format!("Wynik: {}", score));

// 2. Flagi logiczne
ctx.set_flag("gate_unlocked", true);
if ctx.flag("gate_unlocked") {
    println!("Brama stoi otworem!");
}

// 3. Pozycje wektorowe
ctx.state.set_vec2("respawn_pos", vec2(120.0, 340.0));
let spawn = ctx.state.get_vec2("respawn_pos").unwrap_or_default();

// 4. Dowolne struktury Serde
#[derive(serde::Serialize, serde::Deserialize)]
struct QuestLog {
    active_quest: String,
    completed_steps: u32,
}

ctx.state.set_struct("quests", &QuestLog {
    active_quest: "Zgładź Smoka".into(),
    completed_steps: 2,
}).unwrap();

if let Some(log) = ctx.state.get_struct::<QuestLog>("quests") {
    println!("Misja: {}", log.active_quest);
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "content-pipeline-datasets",
      title: "4. Zewnętrzne Datasety Gry (Content Pipeline & JSON Loading)",
      content: `Profesjonalne gry oddzielają dane gry (statystyki potworów, właściwości broni, teksty dialogowe) od kodu źródłowego.

Moduł **\`content\`** udostępnia metody:
- **\`load_content<T>("sciezka.json") -> Result<T, ContentError>\`**: Wczytuje pojedynczy plik JSON i automatycznie mapuje go na strukturę Rust z \`serde::Deserialize\`.
- **\`load_content_dir<T>("sciezka/katalog") -> Result<Vec<T>, ContentError>\`**: Wczytuje wszystkie pliki JSON z danego katalogu (np. całą bazę czarów lub przedmiotów).`,
      codeExamples: [
        {
          title: "Przykład: Wczytywanie Bazy Potworów z Pliku JSON",
          code: `use rusted_engine::prelude::*;
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
pub struct MonsterDataset {
    pub id: String,
    pub name: String,
    pub hp: i32,
    pub speed: f32,
    pub attack_damage: i32,
    pub loot_table: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct GameDatabase {
    pub monsters: Vec<MonsterDataset>,
}

// Wczytanie całej bazy potworów z pliku assets/data/monsters.json:
let db: MonsterDataset = load_content("assets/data/goblin.json")
    .expect("Nie udało się załadować konfiguracji goblina");

println!("Załadowano potwora: {} (HP: {}, DMG: {})", db.name, db.hp, db.attack_damage);

// Wczytanie wszystkich plików z folderu assets/data/items/:
let all_items: Vec<MonsterDataset> = load_content_dir("assets/data/monsters/")
    .expect("Błąd ładowania katalogu potworów");`,
          collapsible: false
        }
      ]
    },
    {
      id: "loot-tables-and-random-datasets",
      title: "5. Tabele Łupów i Losowe Zestawy Danych (WeightedList & ShuffleBag)",
      content: `W grach losowość nie może być chaotyczna — wymaga określonych prawdopodobieństw (*Drop Tables*) lub gwarancji braku nudnych powtórzeń (*Fair Shuffle Deck*).

### 🎲 Dostępne Struktury Danych:
1. **\`WeightedList<T>\`**: Ważona lista do tabel dropu i szans na przedmioty (np. 70% Common, 25% Rare, 5% Legendary).
2. **\`ShuffleBag<T>\`**: Worek losujący w stylu Tetrisa / talii kart — gwarantuje, że każdy element wypadnie dokładnie raz przed ponownym przetasowaniem.`,
      codeExamples: [
        {
          title: "Przykład: Tabela Dropu Przedmiotów i Tasowany Spawner Wrogów",
          code: `use rusted_engine::prelude::*;

// 1. Tabela dropu ze skarbów (Drop Table z wagami procentowymi)
let mut drop_table = WeightedList::new();
drop_table.add("Złota Moneta (x10)", 60.0);
drop_table.add("Mikstura Zdrowia",   28.0);
drop_table.add("Rzadki Sztylet",     10.0);
drop_table.add("Mityczna Korona",     2.0);

let loot = drop_table.sample();
println!("Wylosowano łup z potwora: {}", loot);

// 2. Tasowany spawner wrogów (ShuffleBag)
let mut enemy_deck = ShuffleBag::new(vec![
    "Goblin Wojownik",
    "Goblin Łucznik",
    "Szaman",
    "Troll Jaskiniowy",
]);

// Każde wywołanie .next() zwraca element bez powtórzeń aż do wyczerpania talii:
for _ in 0..4 {
    println!("Zrespiono z talii: {}", enemy_deck.next());
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "save-system-and-crc32",
      title: "6. Trwały Zapis Gry z Sumą Kontrolną CRC32 (`SaveSystem`)",
      content: `Komponent **\`SaveSystem\`** (\`ctx.save_system\`) zarządza zapisem i odczytem slotów gry na dysku twardym.

### 🛡️ Ochrona Integralności CRC32:
Podczas zapisu silnik oblicza 32-bitową sumę kontrolną z bufora stanu. Przy wczytywaniu następuje automatyczna weryfikacja. Jeśli gracz zmodyfikował plik w Notatniku lub plik uległ uszkodzeniu, silnik natychmiast zgłosi błąd **\`SaveError::ChecksumMismatch\`**!`,
      codeExamples: [
        {
          title: "Przykład: Zapisywanie, Wczytywanie i Sprawdzanie Slotów",
          code: `use rusted_engine::prelude::*;

// 1. Zapis do slotu 1 z metadanymi
let meta = SaveSlotMeta {
    slot_id: 1,
    title: "Rozdział 2 - Mroczny Las".into(),
    playtime_seconds: ctx.time.total_time(),
    timestamp: 0,
};

ctx.save_system.save_slot(1, &ctx.state, meta)
    .expect("Błąd podczas zapisywania gry");

// 2. Bezpieczne wczytanie ze sprawdzeniem integralności CRC32
match ctx.save_system.load_slot(1) {
    Ok((loaded_state, loaded_meta)) => {
        ctx.state = loaded_state;
        println!("Wczytano zapis: '{}' (Czas gry: {:.0}s)", loaded_meta.title, loaded_meta.playtime_seconds);
    }
    Err(SaveError::ChecksumMismatch) => {
        eprintln!("BŁĄD: Plik zapisu został uszkodzony lub zmodyfikowany!");
    }
    Err(SaveError::SlotNotFound(id)) => {
        eprintln!("Brak zapisu w slocie {}", id);
    }
    Err(e) => eprintln!("Inny błąd odczytu: {:?}", e),
}

// 3. Wylistowanie wszystkich dostępnych slotów:
let slots = ctx.save_system.list_slots().unwrap_or_default();
for slot in slots {
    println!("Slot #{}: {} ({:.1} min)", slot.slot_id, slot.title, slot.playtime_seconds / 60.0);
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "state-api-reference",
      title: "API Reference: Data, State & Save Methods",
      apiTable: {
        headers: ["Metoda / Funkcja", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["ctx.get_int(key)", "&str", "Option<i64>", "Odczytuje liczbę całkowitą ze StateStore."],
          ["ctx.set_int(key, val)", "&str, i64", "()", "Zapisuje liczbę całkowitą w StateStore."],
          ["ctx.increment(key, delta)", "&str, i64", "i64", "Zwiększa liczbę i zwraca zaktualizowaną wartość."],
          ["ctx.flag(key)", "&str", "bool", "Zwraca true jeśli flaga logiczna istnieje i jest ustawiona."],
          ["ctx.set_flag(key, bool)", "&str, bool", "()", "Ustawia wartość flagi logicznej w StateStore."],
          ["ctx.resources.insert(val)", "T: 'static", "()", "Wstawia singleton typu T do zasobów gry."],
          ["ctx.resources.get::<T>()", "brak", "Option<&T>", "Pobiera niemutowalną referencję do zasobu T."],
          ["ctx.resources.get_mut::<T>()", "brak", "Option<&mut T>", "Pobiera mutowalną referencję do zasobu T."],
          ["load_content::<T>(path)", "&str / Path", "Result<T, ContentError>", "Wczytuje i deserializuje plik JSON z dysku."],
          ["load_content_dir::<T>(dir)", "&str / Path", "Result<Vec<T>, ContentError>", "Wczytuje wszystkie pliki JSON z katalogu."],
          ["ctx.save_system.save_slot(id, state, meta)", "u32, &StateStore, SaveSlotMeta", "Result<(), SaveError>", "Zapisuje stan do pliku z sumą CRC32."],
          ["ctx.save_system.load_slot(id)", "u32", "Result<(StateStore, SaveSlotMeta), SaveError>", "Wczytuje stan i weryfikuje sumę CRC32."]
        ]
      }
    }
  ]
};
