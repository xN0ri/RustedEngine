// ============================================================================
// 2. STAN, DANE & ZAPIS
// ============================================================================

export const entityDataDoc = {
  id: "entity-data",
  title: "6. 🔒 Prywatny Stan Encji (obj.data)",
  description: "Każda encja oparta o Behavior przechowuje swoje silnie typowane dane, dostępne przez obj.data lub blanket Deref.",
  sections: [
    {
      id: "entity-data-main",
      title: "Silnie Typowany Prywatny Stan",
      content: `W RustedEngine encje nie są sztywnymi klasami ani czystym ECS. Używają struktury \`Behavior<Inner, Data>\` (lub \`GameObject<Data>\`), w której każde pole \`Data\` jest w 100% bezpieczne dla pamięci i prywatne dla danej encji:`,
      codeExamples: [
        {
          title: "Definiowanie Prywatnego Stanu Encji",
          code: `struct PlayerData {
    pub hp: i32,
    pub speed: f32,
    pub is_invulnerable: bool,
}

let player = Sprite::solid(vec2(100.0, 100.0), vec2(32.0, 32.0), BLUE)
    .with_data(PlayerData {
        hp: 100,
        speed: 220.0,
        is_invulnerable: false,
    })
    .update(|p, ctx| {
        // Dostęp do pól Data:
        if p.data.hp <= 0 {
            p.destroy();
        }
    });`,
          collapsible: false
        }
      ]
    }
  ]
};

export const resourcesDoc = {
  id: "resources",
  title: "7. 🗄️ Współdzielone Zasoby (ctx.resources)",
  description: "Typowany kontener zasobów uniwersalnych (TypeId) na żywy stan rozgrywki dostępny globalnie w Context.",
  sections: [
    {
      id: "resources-main",
      title: "Współdzielone Zasoby Globalne",
      content: `\`ctx.resources\` (\`Resources\`) to uniwersalna tablica asocjacyjna oparta o \`TypeId\`. Służy do przechowywania dowolnych struktur Rust współdzielonych przez wiele systemów w danej sesji:`,
      codeExamples: [
        {
          title: "Wstawianie i Odczyt Zasobów Globalnych",
          code: `pub struct GameEconomy {
    pub base_tax: f32,
    pub merchant_discount: f32,
}

// 1. Wstawienie zasobu:
ctx.resources.insert(GameEconomy {
    base_tax: 0.15,
    merchant_discount: 0.05,
});

// 2. Odczyt lub mutacja w dowolnym obiekcie:
if let Some(economy) = ctx.resources.get::<GameEconomy>() {
    println!("Podatek bazowy: {:.0}%", economy.base_tax * 100.0);
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const stateStoreDoc = {
  id: "state-store",
  title: "8. 💾 Zmienne & Flagi Stanu (ctx.state)",
  description: "Centralny magazyn stanu StateStore (ctx.state), operacje na typach prymitywnych, bezpieczne gettery z Option/Default, inkrementacja oraz serializacja struktur Serde.",
  sections: [
    {
      id: "state-store-main",
      title: "Magazyn Stanu Gry (StateStore)",
      content: `\`StateStore\` (\`ctx.state\`) stanowi centralne repozytorium zmiennych, flag i struktur stanu rozgrywki dostępne w całym cyklu życia gry, serializowane do zapisu stanu rozgrywki (*savegame*).

### Obsługa Typów Prymitywnych & Bezpieczne Gettery
Magazyn operuje na silnie typowanych kluczach i dostarcza potrójny zestaw metod dla każdego typu: bezpośrednie, z wartością domyślną (\`_or\`) oraz bezpieczne opcjonalne (\`_opt\`):

- **\`Bool(bool)\`**:
  - \`get_bool_opt(key) -> Option<bool>\`, \`get_bool(key) -> bool\` (domyślnie \`false\`), \`get_bool_or(key, def) -> bool\`, \`set_bool(key, val)\`, \`toggle(key)\`.
- **\`Int(i64)\`**:
  - \`get_int_opt(key) -> Option<i64>\`, \`get_int(key) -> i64\` (domyślnie \`0\`), \`get_int_or(key, def) -> i64\`, \`set_int(key, val)\`.
  - \`increment(key, delta) -> i64\` — **zwiększa i zwraca zaktualizowaną wartość w jednej linijce!**
- **\`Float(f64)\`**:
  - \`get_float_opt(key) -> Option<f64>\`, \`get_float(key) -> f64\` (domyślnie \`0.0\`), \`get_float_or(key, def) -> f64\`, \`set_float(key, val)\`.
- **\`Text(String)\`**:
  - \`get_text_opt(key) -> Option<&str>\`, \`get_text(key) -> &str\` (domyślnie \`""\`), \`get_text_or(key, def) -> &str\`, \`set_text(key, val)\`.
- **\`Vec2(f32, f32)\`**:
  - \`get_vec2(key) -> Option<Vec2>\`, \`get_vec2_or(key, def) -> Vec2\`, \`set_vec2(key, vec)\`.`,
      codeExamples: [
        {
          title: "Inkrementacja, Opcje i Wartości Domyślne w StateStore",
          code: `ctx.state.set_int("score", 0);

// 1. increment zwraca zaktualizowaną wartość w jednej linijce:
let new_score = ctx.state.increment("score", 50); // new_score == 50
println!("Nowy wynik: {}", new_score);

// 2. Bezpieczny odczyt z wartością domyślną (_or) i Option (_opt):
let player_name = ctx.state.get_text_or("player_name", "Bezimienny");
if let Some(target_vec) = ctx.state.get_vec2("checkpoint_pos") {
    println!("Checkpoint na pozycji: {:?}", target_vec);
}

ctx.state.set_bool("tutorial_completed", true);`,
          collapsible: false
        }
      ]
    },
    {
      id: "state-serde",
      title: "Serializacja Struktur Serde (set_struct / get_struct)",
      content: `Dowolną strukturę implementującą \`serde::Serialize\` i \`DeserializeOwned\` można bezpośrednio zapisać i odczytać z magazynu:`,
      codeExamples: [
        {
          title: "Zapis i Odczyt Struktur w StateStore",
          code: `use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, PartialEq, Debug)]
struct PlayerEquipment {
    weapon_id: String,
    durability: u32,
    inventory: Vec<String>,
}

let eq = PlayerEquipment {
    weapon_id: "sword_excalibur".into(),
    durability: 100,
    inventory: vec!["potion_hp".into(), "key_gold".into()],
};

// 1. Zapis struktury do formatu JSON w StateStore
ctx.state.set_struct("equipment", &eq).unwrap();

// 2. Bezpieczny odczyt
if let Some(loaded_eq) = ctx.state.get_struct::<PlayerEquipment>("equipment") {
    println!("Broń gracza: {}, stan: {}%", loaded_eq.weapon_id, loaded_eq.durability);
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const datasetsPipelineDoc = {
  id: "datasets-pipeline",
  title: "9. 📥 Datasety JSON (Content Pipeline)",
  description: "Content Pipeline — automatyczne, generyczne ładowanie plików JSON z dysku i deserializacja do struktur Rust bez ręcznego parsowania.",
  sections: [
    {
      id: "pipeline-main",
      title: "Content Pipeline — Generyczne Ładowanie JSON",
      content: `Funkcje \`load_content<T>\` oraz \`load_content_dir<T>\` umożliwiają automatyczne wczytywanie plików JSON z dysku i deserializację do struktur Rust bez manualnego parsowania:`,
      codeExamples: [
        {
          title: "Ładowanie Konfiguracji Potwora z JSON",
          code: `#[derive(serde::Deserialize, Debug)]
pub struct MonsterConfig {
    pub name: String,
    pub base_hp: i32,
    pub attack_power: f32,
}

// Bezpośrednie załadowanie pliku do typu MonsterConfig:
let config: MonsterConfig = load_content("assets/data/monsters/goblin.json")
    .expect("Nie znaleziono konfiguracji potwora");

println!("Potwór: {}, HP: {}", config.name, config.base_hp);`,
          collapsible: false
        }
      ]
    }
  ]
};

export const saveSystemDoc = {
  id: "save-system",
  title: "10. 🛡️ Zapis Gry & Suma CRC32 (SaveSystem)",
  description: "Slotowy system zapisów gry (ctx.save_system), metadane SaveSlotMeta oraz ochrona przed modyfikacją pliku sumą kontrolną CRC32.",
  sections: [
    {
      id: "save-system-main",
      title: "Slotowy System Zapisów & Ochrona CRC32",
      content: `Komponent \`SaveSystem\` (\`ctx.save_system\`) zarządza trwałym zapisem na dysku twardym z zabezpieczeniem integralności danych:

### 1. Struktura Slotów i Metadanych (\`SaveSlotMeta\`)
Każdy zapis to niezależny plik dyskowy (np. \`saves/save_slot_1.json\`). Metadane zawierają identyfikator slotu, etykietę użytkownika, timestamp zapisu oraz sumę kontrolną.

### 2. Zabezpieczenie Anti-Tamper z Sumą Kontrolną CRC32
Podczas zapisu silnik liczy sumę CRC32 z bufora stanu. Przy wczytywaniu następuje weryfikacja. Wszelkie ręczne modyfikacje pliku JSON zostaną wykryte i zasygnalizowane błędem \`SaveError::ChecksumMismatch\`!`,
      codeExamples: [
        {
          title: "Zapis i Bezpieczne Wczytanie z CRC32",
          code: `use rusted_engine::prelude::*;

// 1. Zapis do slotu 1
let meta = SaveSlotMeta {
    slot_id: 1,
    title: "Poziom 3 - Komnata Bossa".into(),
    playtime_seconds: 1450.0,
    timestamp: 0,
};
ctx.save_system.save_slot(1, &ctx.state, meta).expect("Błąd zapisu");

// 2. Bezpieczne wczytanie ze sprawdzeniem CRC32
match ctx.save_system.load_slot(1) {
    Ok((loaded_state, meta)) => {
        ctx.state = loaded_state;
        println!("Wczytano zapis: {}", meta.title);
    }
    Err(SaveError::ChecksumMismatch) => {
        eprintln!("Plik zapisu został zmodyfikowany lub uszkodzony!");
    }
    Err(e) => eprintln!("Inny błąd: {:?}", e),
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "save-api-table",
      title: "API Reference: State & Save",
      content: `| Metoda / Funkcja | Parametry | Zwraca | Opis |
| :--- | :--- | :--- | :--- |
| \`ctx.state.increment(key, delta)\` | \`&str, impl Into<i64>\` | \`i64\` | Zwiększa wartość całkowitą o delta i zwraca nowy wynik. |
| \`ctx.state.set_struct(key, &struct)\` | \`&str, &T\` | \`Result<(), ...>\` | Serializuje strukturę Rust do formatu JSON w StateStore. |
| \`ctx.state.get_struct::<T>(key)\` | \`&str\` | \`Option<T>\` | Deserializuje strukturę Rust z formatu JSON. |
| \`ctx.save_system.save_slot(slot, state, meta)\` | \`u32, &StateStore, SaveSlotMeta\` | \`Result<(), SaveError>\` | Zapisuje stan gry do pliku z sumą CRC32. |
| \`ctx.save_system.load_slot(slot)\` | \`u32\` | \`Result<(StateStore, SaveSlotMeta), SaveError>\` | Wczytuje stan gry z weryfikacją sumy kontrolnej CRC32. |
| \`load_content::<T>(path)\` | \`impl AsRef<Path>\` | \`Result<T, ContentError>\` | Wczytuje i deserializuje plik JSON do typu T. |`,
    }
  ]
};
