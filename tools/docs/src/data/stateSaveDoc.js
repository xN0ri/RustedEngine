export const stateSaveDoc = {
  id: "state-save",
  title: "4. 🗄️ State Store, Save System & Content Pipeline",
  icon: "Database",
  badge: "State & Persistence",
  description: "Centralny magazyn stanu StateStore, serializacja struktur Rust, bezpieczny system zapisu z sumami CRC32 oraz pipeline ładowania danych JSON (Content Pipeline).",
  sections: [
    {
      id: "state-store",
      title: "Magazyn Stanu Gry (StateStore)",
      content: `**\`StateStore\`** (\`ctx.state\`) stanowi centralne repozytorium zmiennych, flag i struktur stanu rozgrywki dostępne w całym cyklu życia gry, serializowane do zapisu stanu rozgrywki (*savegame*).`,
      subsections: [
        {
          id: "primitives-and-keys",
          title: "Obsługa Typów Prymitywnych & Inkrementacja",
          content: `Magazyn operuje na silnie typowanych kluczach:
- **\`Bool(bool)\`**: Flagi logiczne (\`set_bool\`, \`get_bool\`, \`toggle\`).
- **\`Int(i64)\`**: Liczniki całkowite (\`set_int\`, \`get_int\`, **\`increment -> i64\`** — zwraca zaktualizowaną wartość!).
- **\`Float(f64)\`**: Wartości zmiennoprzecinkowe (\`set_float\`, \`get_float\`).
- **\`Text(String)\`**: Ciągi znakowe (\`set_string\`, \`get_string\`).
- **\`Vec2(f32, f32)\`**: Wektory 2D (\`set_vec2\`, \`get_vec2\`).`,
          codeExamples: [
            {
              title: "Podstawowy Przykład: Zapis i Inkrementacja Zmiennych",
              code: `ctx.state.set_int("score", 0);

// increment zwraca zaktualizowaną wartość w jednej linijce:
let new_score = ctx.state.increment("score", 50); // new_score == 50
println!("Nowy wynik: {}", new_score);

ctx.state.set_bool("tutorial_completed", true);
ctx.state.set_vec2("checkpoint_pos", vec2(450.0, 320.0));`,
              collapsible: false
            }
          ]
        },
        {
          id: "serde-structures",
          title: "Serializacja Struktur Serde (set_struct / get_struct)",
          content: `Dowolną strukturę implementującą \`serde::Serialize\` i \`DeserializeOwned\` można bezpośrednio zapisać i odczytać z magazynu:`,
          codeExamples: [
            {
              title: "Główny Przykład: Serializacja Złożonego Ekwipunku w StateStore",
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
            },
            {
              title: "Rozszerzony Przykład: Zapis Drzewa Osiągnięć i Statystyk Gracza",
              code: `#[derive(Serialize, Deserialize, Default)]
struct PlayerStats {
    pub kills: u32,
    pub total_dashes: u32,
    pub unlocked_achievements: Vec<String>,
}

let mut stats = ctx.state.get_struct::<PlayerStats>("stats").unwrap_or_default();
stats.kills += 1;
stats.total_dashes += 1;
ctx.state.set_struct("stats", &stats).unwrap();`,
              collapsible: true,
              defaultCollapsed: true
            }
          ]
        }
      ]
    },
    {
      id: "save-system-crc32",
      title: "Slotowy System Zapisów & Ochrona CRC32",
      content: `Komponent **\`SaveSystem\`** (\`ctx.save_system\`) zarządza trwałym zapisem na dysku twardym z zabezpieczeniem integralności danych.`,
      subsections: [
        {
          id: "slot-architecture",
          title: "Struktura Slotów i Metadanych (SaveSlotMeta)",
          content: `Każdy zapis to niezależny plik dyskowy (np. \`saves/save_slot_1.json\`). Metadane zawierają identyfikator slotu, etykietę użytkownika, timestamp zapisu oraz sumę kontrolną.`
        },
        {
          id: "anti-tamper-crc32",
          title: "Zabezpieczenie Anti-Tamper z Sumą Kontrolną CRC32",
          content: `Podczas zapisu silnik liczy sumę CRC32 z bufora stanu. Przy wczytywaniu następuje weryfikacja. Wszelkie ręczne modyfikacje pliku JSON zostaną wykryte i zasygnalizowane błędem \`SaveError::ChecksumMismatch\`!`,
          codeExamples: [
            {
              title: "Główny Przykład: Zapis i Wczytanie Slotu z Sumą CRC32",
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
        }
      ]
    },
    {
      id: "content-pipeline",
      title: "Content Pipeline — Generyczne Ładowanie JSON",
      content: `Funkcje **\`load_content<T>\`** oraz **\`load_content_dir<T>\`** umożliwiają automatyczne wczytywanie plików JSON z dysku i deserializację do struktur Rust bez manualnego parsowania.`,
      codeExamples: [
        {
          title: "Przykład: Ładowanie Statystyk Przeciwników z Pliku JSON",
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
    },
    {
      id: "state-api-reference",
      title: "API Reference: State & Save",
      apiTable: {
        headers: ["Metoda / Funkcja", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["ctx.state.increment(key, delta)", "&str, impl Into<i64>", "i64", "Zwiększa wartość całkowitą o delta i zwraca nowy wynik."],
          ["ctx.state.set_struct(key, &struct)", "&str, &T", "Result<(), ...>", "Serializuje strukturę Rust do formatu JSON w StateStore."],
          ["ctx.state.get_struct::<T>(key)", "&str", "Option<T>", "Deserializuje strukturę Rust z formatu JSON."],
          ["ctx.save_system.save_slot(slot, state, meta)", "u32, &StateStore, SaveSlotMeta", "Result<(), SaveError>", "Zapisuje stan gry do pliku z sumą CRC32."],
          ["ctx.save_system.load_slot(slot)", "u32", "Result<(StateStore, SaveSlotMeta), SaveError>", "Wczytuje stan gry z weryfikacją sumy kontrolnej CRC32."],
          ["load_content::<T>(path)", "impl AsRef<Path>", "Result<T, ContentError>", "Wczytuje i deserializuje plik JSON do typu T."]
        ]
      }
    }
  ]
};
