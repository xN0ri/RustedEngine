export const dataSaveDoc = {
  id: "data-save",
  title: "4. 🗃️ Datasety JSON & System Zapisów",
  icon: "FileJson",
  badge: "Persistence & Data",
  description: "Pipeline wczytywania zewnętrznych konfiguracji JSON (Content Pipeline), tabele łupów (WeightedList, ShuffleBag) oraz bezpieczny system zapisu ze sumą kontrolną CRC32.",
  sections: [
    {
      id: "content-pipeline-datasets",
      title: "1. Zewnętrzne Datasety Gry (Content Pipeline)",
      content: `Profesjonalne gry oddzielają dane gry (statystyki potworów, właściwości broni, teksty dialogowe) od kodu źródłowego.

Moduł **\`content\`** udostępnia metody:
- **\`load_content<T>("sciezka.json") -> Result<T, ContentError>\`**: Wczytuje pojedynczy plik JSON i automatycznie mapuje go na strukturę Rust z \`serde::Deserialize\`.
- **\`load_content_dir<T>("sciezka/katalog") -> Result<Vec<T>, ContentError>\`**: Wczytuje wszystkie pliki JSON z danego katalogu.`,
      codeExamples: [
        {
          title: "Wczytywanie Bazy Potworów z Pliku JSON",
          code: `use rusted_engine::prelude::*;
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
pub struct MonsterConfig {
    pub name: String,
    pub hp: i32,
    pub speed: f32,
    pub attack_damage: i32,
}

let goblin: MonsterConfig = load_content("assets/data/goblin.json")
    .expect("Nie udało się załadować konfiguracji goblina");

println!("Potwór: {} (HP: {}, DMG: {})", goblin.name, goblin.hp, goblin.attack_damage);`,
          collapsible: false
        }
      ]
    },
    {
      id: "loot-tables-and-random-datasets",
      title: "2. Tabele Łupów & Losowania (WeightedList & ShuffleBag)",
      content: `W grach losowość nie może być chaotyczna — wymaga określonych prawdopodobieństw (*Drop Tables*) lub gwarancji braku nudnych powtórzeń (*Fair Shuffle Deck*):

1. **\`WeightedList<T>\`**: Ważona lista do tabel dropu i szans na przedmioty (np. 60% Złoto, 30% Mikstura, 10% Broń).
2. **\`ShuffleBag<T>\`**: Worek losujący w stylu talii kart — każdy element wypadnie dokładnie raz przed ponownym przetasowaniem.`,
      codeExamples: [
        {
          title: "Tabela Dropu Przedmiotów i Tasowany Spawner Wrogów",
          code: `// 1. Tabela dropu ze skarbów (Drop Table z wagami procentowymi)
let mut drop_table = WeightedList::new();
drop_table.add("Złota Moneta (x10)", 60.0);
drop_table.add("Mikstura Zdrowia",   30.0);
drop_table.add("Rzadki Sztylet",     10.0);

let loot = drop_table.sample();
println!("Wylosowano łup: {}", loot);

// 2. Tasowany spawner wrogów (ShuffleBag)
let mut enemy_deck = ShuffleBag::new(vec![
    "Goblin Wojownik",
    "Goblin Łucznik",
    "Szaman",
]);
println!("Następny wróg z talii: {}", enemy_deck.next());`,
          collapsible: false
        }
      ]
    },
    {
      id: "save-system-and-crc32",
      title: "3. Trwały Zapis Gry z Sumą Kontrolną CRC32 (`SaveSystem`)",
      content: `Komponent **\`SaveSystem\`** (\`ctx.save_system\`) zarządza zapisem i odczytem slotów gry na dysku twardym.

### 🛡️ Ochrona Integralności CRC32:
Podczas zapisu silnik oblicza 32-bitową sumę kontrolną z bufora stanu. Przy wczytywaniu następuje automatyczna weryfikacja. Jeśli gracz zmodyfikował plik w Notatniku lub plik uległ uszkodzeniu, silnik natychmiast zgłosi błąd **\`SaveError::ChecksumMismatch\`**!`,
      codeExamples: [
        {
          title: "Zapisywanie i Wczytywanie Slotu z Metadanymi",
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

// 2. Bezpieczne wczytanie ze sprawdzeniem CRC32
match ctx.save_system.load_slot(1) {
    Ok((loaded_state, loaded_meta)) => {
        ctx.state = loaded_state;
        println!("Wczytano zapis: '{}'", loaded_meta.title);
    }
    Err(SaveError::ChecksumMismatch) => {
        eprintln!("BŁĄD: Plik zapisu został uszkodzony lub zmodyfikowany!");
    }
    Err(e) => eprintln!("Inny błąd: {:?}", e),
}`,
          collapsible: false
        }
      ]
    }
  ]
};
