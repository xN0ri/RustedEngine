// ============================================================================
// 2. STAN, DANE & ZAPIS
// ============================================================================

export const entityDataDoc = {
  id: "entity-data",
  title: "6. 🔒 Prywatny Stan Encji (obj.data)",
  description: "Lokalny stan przypisany do pojedynczej instancji obiektu — hermetyzacja danych potworów, pocisków i gracza.",
  sections: [
    {
      id: "entity-data-main",
      title: "Hermetyzacja Stanu w Obiektach",
      content: `Prywatne dane (\`obj.data\`) to struktura danych przypisana do konkretnej instancji obiektu.

### ✅ Kiedy używać:
- Liczniki punktów życia i prędkości konkretnego potwora (\`hp\`, \`speed\`).
- Timery cooldownów i wektory kierunkowe pocisku (\`velocity\`, \`lifetime\`).
- Flagi stanu postaci (*is_jumping, is_dashing*).

### ❌ Czego unikać:
Nie zanieczyszczaj globalnego stanu gry zmiennymi typu \`ctx.state["goblin_12_hp"]\`. Każdy potwór powinien posiadać własną strukturę \`GoblinData\`.`,
      codeExamples: [
        {
          title: "Struktura Danych Pocisku",
          code: `struct BulletData {
    pub velocity: Vec2,
    pub lifetime: f32,
    pub damage: i32,
}

let bullet = Sprite::solid(start_pos, vec2(6.0, 6.0), YELLOW)
    .with_data(BulletData {
        velocity: shoot_dir * 500.0,
        lifetime: 1.5,
        damage: 25,
    })
    .update(|b, ctx| {
        b.position += b.data.velocity * ctx.dt();
        b.data.lifetime -= ctx.dt();
        if b.data.lifetime <= 0.0 {
            b.destroy();
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
  description: "Silnie typowany magazyn pojedynczych instancji (Type-Map) oparty o TypeId bez narzutu na stringi.",
  sections: [
    {
      id: "resources-main",
      title: "Magazyn Singletonów Type-Map",
      content: `\`Resources\` (\`ctx.resources\`) przechowuje dokładnie jedną instancję danego typu Rust w pamięci gry:

### 🚀 Główne Cechy:
- **100% Bezpieczeństwo typów**: Kluczem jest \`TypeId\` w czasie kompilacji — brak błędów literówek w stringach.
- **Zero narzutu**: Błyskawiczny dostęp bez haszowania ciągów znaków.
- **Dostęp globalny**: Dostępny w każdym obiekcie, UI, kontrolerze logiki i wyzwalaczu.`,
      codeExamples: [
        {
          title: "Rejestracja i Odczyt Ekwipunku w Resources",
          code: `pub struct Inventory {
    pub gold: u32,
    pub items: Vec<String>,
}

// 1. Rejestracja zasobu na starcie gry:
engine.ctx.resources.insert(Inventory {
    gold: 150,
    items: vec!["Mikstura HP".into(), "Klucz do Lochu".into()],
});

// 2. Bezpieczny odczyt i mutacja w dowolnym obiekcie:
if let Some(inv) = ctx.resources.get_mut::<Inventory>() {
    inv.gold += 50;
    println!("Złoto w plecaku: {}", inv.gold);
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
  description: "Dynamiczny magazyn Key-Value do flag fabularnych, liczników, koordynatów i automatycznej serializacji do JSON.",
  sections: [
    {
      id: "state-store-main",
      title: "Operacje na Zmiennych i Flagi",
      content: `\`StateStore\` (\`ctx.state\`) to magazyn zmiennych stworzony pod kątem zapisu stanu gry i wyzwalaczy fabularnych:

- **Liczby całkowite**: \`ctx.set_int("score", 100)\`, \`ctx.get_int("score")\`.
- **Inkrementacja**: \`ctx.increment("score", 25) -> i64\` (zwraca nową wartość w jednej operacji!).
- **Flagi logiczne**: \`ctx.set_flag("boss_defeated", true)\`, \`ctx.flag("boss_defeated")\`.
- **Wektory**: \`ctx.state.set_vec2("checkpoint", pos)\`, \`ctx.state.get_vec2("checkpoint")\`.
- **Struktury Serde**: \`ctx.state.set_struct("eq", &data)\`, \`ctx.state.get_struct::<Eq>("eq")\`.`,
      codeExamples: [
        {
          title: "Inkrementacja Punktów i Flagi Fabularne",
          code: `// Zwiększenie wyniku o 100 i natychmiastowe zaktualizowanie UI:
let score = ctx.increment("score", 100);
ctx.set_ui_text("score_label", &format!("Wynik: {}", score));

// Flaga odblokowania przejścia:
ctx.set_flag("dungeon_gate_open", true);

if ctx.flag("dungeon_gate_open") {
    println!("Brama do lochów jest otwarta!");
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const contentPipelineDoc = {
  id: "content-pipeline",
  title: "9. 📥 Datasety JSON (Content Pipeline)",
  description: "Wczytywanie i automatyczna deserializacja zewnętrznych plików oraz katalogów JSON bezpośrednio do struktur Rust.",
  sections: [
    {
      id: "content-main",
      title: "Oddzielenie Danych Gry od Kodu Źródłowego",
      content: `Moduł \`content\` pozwala trzymać statystyki wrogów, przedmiotów i broni w czytelnych plikach JSON:

- **\`load_content<T>("sciezka.json") -> Result<T, ContentError>\`**: Wczytuje pojedynczy plik JSON.
- **\`load_content_dir<T>("katalog/") -> Result<Vec<T>, ContentError>\`**: Wczytuje wszystkie pliki JSON z folderu.`,
      codeExamples: [
        {
          title: "Wczytywanie Bazy Potworów z Pliku JSON",
          code: `use serde::Deserialize;
use rusted_engine::prelude::*;

#[derive(Clone, Debug, Deserialize)]
pub struct MonsterConfig {
    pub name: String,
    pub hp: i32,
    pub speed: f32,
    pub attack: i32,
}

// Wczytanie pliku assets/data/goblin.json:
let goblin: MonsterConfig = load_content("assets/data/goblin.json")
    .expect("Błąd wczytywania potwora");

println!("Potwór: {} (HP: {}, DMG: {})", goblin.name, goblin.hp, goblin.attack);`,
          collapsible: false
        }
      ]
    }
  ]
};

export const saveSystemDoc = {
  id: "save-system",
  title: "10. 🛡️ Zapis Gry & Suma CRC32 (SaveSystem)",
  description: "Trwały zapis slotów na dysku z metadanymi oraz weryfikacją sumy kontrolnej CRC32 przeciw uszkodzeniom i modyfikacjom.",
  sections: [
    {
      id: "save-system-main",
      title: "Bezpieczny Zapis i Wczytywanie Slotów",
      content: `\`SaveSystem\` (\`ctx.save_system\`) zarządza plikami zapisu gry (np. \`saves/save_slot_1.json\`).

### 🛡️ Ochrona Integralności CRC32:
Podczas zapisu liczona jest 32-bitowa suma kontrolna z bufora stanu. Przy wczytywaniu następuje weryfikacja. Ręczna modyfikacja pliku przez gracza zostanie zasygnalizowana błędem **\`SaveError::ChecksumMismatch\`**!`,
      codeExamples: [
        {
          title: "Zapis i Wczytanie Slotu ze Sprawdzeniem CRC32",
          code: `use rusted_engine::prelude::*;

// 1. Zapis do slotu 1 z metadanymi:
let meta = SaveSlotMeta {
    slot_id: 1,
    title: "Rozdział 2 - Mroczny Las".into(),
    playtime_seconds: ctx.time.total_time(),
    timestamp: 0,
};
ctx.save_system.save_slot(1, &ctx.state, meta).unwrap();

// 2. Bezpieczne wczytanie:
match ctx.save_system.load_slot(1) {
    Ok((loaded_state, loaded_meta)) => {
        ctx.state = loaded_state;
        println!("Wczytano zapis: '{}' (Czas: {:.0}s)", loaded_meta.title, loaded_meta.playtime_seconds);
    }
    Err(SaveError::ChecksumMismatch) => {
        eprintln!("BŁĄD: Plik zapisu został zmodyfikowany lub uszkodzony!");
    }
    Err(e) => eprintln!("Błąd odczytu: {:?}", e),
}`,
          collapsible: false
        }
      ]
    }
  ]
};
