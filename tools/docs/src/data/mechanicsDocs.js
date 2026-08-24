// ============================================================================
// 5. GOTOWE MECHANIKI GRY — ROZBUDOWANE
// ============================================================================

export const meleeCombatDoc = {
  id: "melee-combat",
  title: "29. ⚔️ Walka Wręcz, Combo & Hitstop",
  badge: "Combat System",
  description: "3-stopniowy łańcuch cięć miecza, okienko czasowe na kolejny cios, zmienne obrażenia finishera oraz efekt chwilowego zamrożenia klatki (Hitstop).",
  sections: [
    {
      id: "melee-overview",
      title: "Architektura Systemu Walki Wręcz",
      content: `System walki wręcz w RustedEngine opiera się na **łańcuchu combo** (combo chain) zarządzanym przez strukturę \`MeleeCombo\` trzymaną w \`Data\` encji gracza.

### Kluczowe Mechaniki:
- **3-stopniowy łańcuch ataków** — każdy kolejny cios w oknie czasowym wykonuje silniejszy atak.
- **Okienko combo (\`combo_window\`)** — jeśli gracz nie uderzy w ciągu ~0.6s, łańcuch resetuje się do 0.
- **Zmienna siła obrażeń** — Cios 1: 25, Cios 2: 40, Cios 3 (Finisher): 90 pkt.
- **Hitstop przy finisherze** — \`ctx.set_time_scale(0.08)\` zamraża czas na ułamek sekundy dla dramatycznego efektu uderzenia.
- **Kapsuła kolizji miecza** — \`Capsule::new(start, end, radius)\` modeluje zasięg ostrza.

> [!TIP]
> **Hitstop** to technika stosowana w bijatykach (Street Fighter, Sekiro). Przez ~80ms czas gry jest spowolniony do 8%, co daje graczowi wrażenie wagowości uderzenia. Po tym czasie \`time_scale\` wraca automatycznie do \`1.0\`.

> [!NOTE]
> Kapsułę kolizji miecza warto debugować rysując ją \`ctx.draw_capsule(capsule, RED)\` w trybie debug. Pozwala to precyzyjnie wyregulować zasięg i promień hitboxa.`,
      codeExamples: [
        {
          title: "Struktura MeleeCombo — Dane Combo",
          code: `pub struct MeleeCombo {
    pub current_step: u32,  // 0, 1, 2 → Finisher
    pub combo_timer: f32,   // Czas pozostały na kolejny cios
    pub combo_window: f32,  // Okno czasowe na kontynuację combo
}

impl MeleeCombo {
    pub fn new() -> Self {
        Self { current_step: 0, combo_timer: 0.0, combo_window: 0.6 }
    }

    pub fn update(&mut self, dt: f32) {
        if self.combo_timer > 0.0 {
            self.combo_timer -= dt;
            if self.combo_timer <= 0.0 {
                self.current_step = 0; // Reset combo po przekroczeniu okienka
            }
        }
    }
}`,
          collapsible: false
        },
        {
          title: "Metoda attack() z Hitstopem i Cząsteczkami",
          code: `pub fn attack(&mut self, ctx: &mut Context, origin: Vec2, facing: Vec2) {
    let (damage, is_finisher) = match self.current_step {
        0 => (25, false),
        1 => (40, false),
        _ => (90, true), // Trzeci cios: Potężny Finisher!
    };

    self.current_step = (self.current_step + 1) % 3;
    self.combo_timer = self.combo_window;

    // Dźwięk zamachu z losową wariacją tonu:
    ctx.play_sound_varied("sword_slash", 0.1, 0.1);

    // Kapsuła zasięgu miecza (hitbox):
    let slash_capsule = Capsule::new(origin, origin + facing * 45.0, 14.0);

    // Sprawdź trafienie wrogów:
    for enemy in ctx.query_mut::<EnemyData>() {
        if slash_capsule.overlaps_rect(enemy.rect()) {
            ctx.emit(EnemyHit { damage, source: origin });
        }
    }

    if is_finisher {
        ctx.set_time_scale(0.08); // Hitstop: zamrożenie czasu!
        ctx.camera.shake(0.25, 7.0);

        // Wybuch cząsteczek przy uderzeniu krytycznym:
        let mut burst = ParticleEmitter::new().with_auto_destroy();
        burst.emit_burst(origin + facing * 35.0, 20, RED, (80.0, 200.0), 3.0, 0.35);
        ctx.spawn(burst);
    }
}`,
          collapsible: false
        },
        {
          title: "Integracja z Encją Gracza",
          code: `struct PlayerData {
    pub combo: MeleeCombo,
    pub facing: Vec2,
    // ... inne pola
}

// W update() gracza:
player.data.combo.update(ctx.dt());

if ctx.mouse_pressed(Side::Left) {
    let mouse_pos = ctx.mouse_world();
    player.data.facing = (mouse_pos - player.position).normalize_or_zero();
    player.data.combo.attack(ctx, player.position, player.data.facing);
}`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "melee-api",
      title: "API Reference: Walka Wręcz",
      apiTable: {
        headers: ["Metoda / Typ", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["MeleeCombo::new()", "brak", "MeleeCombo", "Tworzy nowy łańcuch combo z domyślnym oknem 0.6s."],
          ["combo.update(dt)", "f32", "()", "Odlicza timer combo i resetuje łańcuch po przekroczeniu okna."],
          ["combo.attack(ctx, origin, facing)", "&mut Context, Vec2, Vec2", "bool", "Wykonuje atak zgodny z aktualnym krokiem combo. Zwraca true jeśli był to finisher."],
          ["ctx.set_time_scale(scale)", "f32", "()", "Ustawia globalną skalę czasu gry (1.0 = normalny, 0.08 = Hitstop)."],
          ["ctx.camera.shake(dur, intensity)", "f32, f32", "()", "Wstrząsa kamerą przez podany czas z podaną intensywnością."],
          ["Capsule::new(start, end, r)", "Vec2, Vec2, f32", "Capsule", "Tworzy kapsułę kolizyjną (hitbox miecza) od punktu start do end z promieniem r."],
          ["burst.emit_burst(pos, count, ...)", "Vec2, u32, Color, ...", "()", "Emituje jednorazowy wybuch N cząsteczek z podanymi parametrami."],
        ]
      }
    }
  ]
};

export const shootingWeaponsDoc = {
  id: "shooting-weapons",
  title: "30. 🔫 Broń Palna, Rozrzut & Odrzut (Weapons)",
  badge: "Combat System",
  description: "Moduł broni ze stożkowym rozrzutem pocisków, strzelbami wielo-śrucinowymi, magazynkiem z przeładowaniem oraz fizycznym odrzutem gracza.",
  sections: [
    {
      id: "shooting-overview",
      title: "Architektura Systemu Broni Palnej",
      content: `Struktura \`Weapon\` przechowywana w \`Resources\` (lub \`Data\` gracza) zarządza całą logiką strzelectwa:

### Parametry Broni:
- **\`fire_rate\`** — minimalny czas (s) między strzałami (cooldown).
- **\`bullets_per_shot\`** — liczba pocisków na jeden strzał (strzelba = 6).
- **\`spread_rad\`** — kąt rozrzutu w radianach (0.0 = celny, 0.4 = losowy rozrzut).
- **\`recoil\`** — siła odpychania gracza w tył przy strzale (pixels/s).
- **\`mag_size / current_ammo\`** — rozmiar magazynka i aktualny stan amunicji.

### Typy Broni (wzorce konfiguracyjne):
| Typ | fire_rate | bullets | spread | recoil |
|---|---|---|---|---|
| Pistolet | 0.35s | 1 | 0.04 rad | 45px |
| Strzelba | 0.75s | 6 | 0.22 rad | 180px |
| Karabin | 0.12s | 1 | 0.08 rad | 30px |

> [!TIP]
> Rozrzut pocisków obliczany jest przez \`random_range(-spread_rad, spread_rad)\` dodawany do bazowego kąta strzału. Daje to naturalny stożek rozproszenia bez żadnych dodatkowych bibliotek.`,
      codeExamples: [
        {
          title: "Definicja i Konstruktory Broni",
          code: `pub struct Weapon {
    pub name: String,
    pub fire_rate: f32,
    pub cooldown: f32,
    pub bullets_per_shot: u32,
    pub spread_rad: f32,
    pub recoil: f32,
    pub mag_size: u32,
    pub current_ammo: u32,
}

impl Weapon {
    pub fn pistol() -> Self {
        Self {
            name: "Glock".into(),
            fire_rate: 0.35, cooldown: 0.0,
            bullets_per_shot: 1, spread_rad: 0.04,
            recoil: 45.0, mag_size: 17, current_ammo: 17,
        }
    }

    pub fn shotgun() -> Self {
        Self {
            name: "Dwururka".into(),
            fire_rate: 0.75, cooldown: 0.0,
            bullets_per_shot: 6, spread_rad: 0.22,
            recoil: 180.0, mag_size: 2, current_ammo: 2,
        }
    }
}`,
          collapsible: false
        },
        {
          title: "Metoda try_shoot() — Strzelanie z Rozrzutem i Odrzutem",
          code: `impl Weapon {
    pub fn update_cooldown(&mut self, dt: f32) {
        self.cooldown = (self.cooldown - dt).max(0.0);
    }

    pub fn try_shoot(
        &mut self,
        ctx: &mut Context,
        origin: Vec2,
        target: Vec2,
        player_vel: &mut Vec2,
    ) -> bool {
        if self.cooldown > 0.0 || self.current_ammo == 0 { return false; }
        self.cooldown = self.fire_rate;
        self.current_ammo -= 1;

        let base_dir = (target - origin).normalize_or_zero();
        let base_angle = base_dir.y.atan2(base_dir.x);

        for _ in 0..self.bullets_per_shot {
            let angle = base_angle + random_range(-self.spread_rad, self.spread_rad);
            let dir = vec2(angle.cos(), angle.sin());

            let bullet = Sprite::solid(origin, vec2(6.0, 6.0), YELLOW)
                .with_data(dir * 540.0) // prędkość jako Vec2
                .update(|b, ctx| {
                    b.position += *b.data * ctx.dt();
                    // Zniszcz po 2 sekundach:
                    if b.data.lifetime() > 2.0 { b.destroy(); }
                });
            ctx.spawn(bullet);
        }

        // Fizyczny odrzut gracza w tył:
        *player_vel -= base_dir * self.recoil;
        ctx.camera.shake(0.14, 3.5);
        ctx.play_sound_varied("shotgun_blast", 0.08, 0.1);
        true
    }

    pub fn needs_reload(&self) -> bool { self.current_ammo == 0 }
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "shooting-api",
      title: "API Reference: Broń & Strzelectwo",
      apiTable: {
        headers: ["Metoda / Typ", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["weapon.try_shoot(...)", "&mut Context, Vec2, Vec2, &mut Vec2", "bool", "Próbuje wystrzelić. Zwraca true jeśli strzał się powiódł."],
          ["weapon.update_cooldown(dt)", "f32", "()", "Odlicza cooldown broni. Wywołuj co klatkę."],
          ["weapon.needs_reload()", "brak", "bool", "Sprawdza czy magazynek jest pusty."],
          ["random_range(min, max)", "f32, f32", "f32", "Generuje losowy float w przedziale [min, max] (rozrzut pocisków)."],
          ["ctx.spawn(bullet)", "impl Object + 'static", "()", "Dodaje pocisk do warstwy objects świata."],
          ["ctx.play_sound_varied(name, p, v)", "&str, f32, f32", "()", "Odtwarza dźwięk z losową wariacją tonu i głośności."],
        ]
      }
    }
  ]
};

export const inventorySystemDoc = {
  id: "inventory-system",
  title: "31. 🎒 System Ekwipunku & Stackowania",
  badge: "Gameplay",
  description: "Moduł plecaka ze stackowaniem przedmiotów, limitami pojemności i slotami wyposażenia trzymany w Resources.",
  sections: [
    {
      id: "inventory-overview",
      title: "Architektura Systemu Ekwipunku",
      content: `Ekwipunek przechowywany jest w \`ctx.resources\` jako globalny zasób \`Inventory\`. Składa się z:

### Kluczowe Struktury:
- **\`ItemDef\`** — definicja przedmiotu: ID, nazwa, max stack (blueprint, niemodyfikowalny).
- **\`ItemStack\`** — slot w ekwipunku: referencja do definicji + aktualna ilość.
- **\`Inventory\`** — lista slotów (\`Vec<Option<ItemStack>>\`) z ograniczoną pojemnością.

### Logika Stackowania:
1. Przy dodaniu przedmiotu najpierw **dopełniane są istniejące stacki** tego samego ID do \`max_stack\`.
2. Jeśli zostały nadmiarowe sztuki — **zajmowane są kolejne wolne sloty**.
3. Jeśli plecak jest pełny — metoda zwraca \`false\` (pickup odrzucony).

> [!NOTE]
> Inventory rejestruj przez \`ctx.resources.insert(Inventory::new(30))\` na starcie sceny. Dostęp z dowolnej encji przez \`ctx.resources.get_mut::<Inventory>()\`.`,
      codeExamples: [
        {
          title: "Definicje Przedmiotów i Struktura Inventory",
          code: `#[derive(Clone, Debug)]
pub struct ItemDef {
    pub id: &'static str,
    pub name: String,
    pub max_stack: u32,
}

#[derive(Clone, Debug)]
pub struct ItemStack {
    pub def: ItemDef,
    pub count: u32,
}

pub struct Inventory {
    pub slots: Vec<Option<ItemStack>>,
}

impl Inventory {
    pub fn new(capacity: usize) -> Self {
        Self { slots: vec![None; capacity] }
    }

    // Dodaje przedmiot, zwraca true jeśli się zmieścił
    pub fn add_item(&mut self, item: ItemDef, mut amount: u32) -> bool {
        // 1. Dopełnianie istniejących stacków:
        for slot in self.slots.iter_mut().flatten() {
            if slot.def.id == item.id && slot.count < slot.def.max_stack {
                let space = slot.def.max_stack - slot.count;
                let add = amount.min(space);
                slot.count += add;
                amount -= add;
                if amount == 0 { return true; }
            }
        }
        // 2. Nowe wolne sloty:
        for slot in self.slots.iter_mut() {
            if slot.is_none() {
                let add = amount.min(item.max_stack);
                *slot = Some(ItemStack { def: item.clone(), count: add });
                amount -= add;
                if amount == 0 { return true; }
            }
        }
        amount == 0
    }

    pub fn remove_item(&mut self, id: &str, amount: u32) -> bool {
        let total: u32 = self.slots.iter().flatten()
            .filter(|s| s.def.id == id)
            .map(|s| s.count)
            .sum();
        if total < amount { return false; }
        let mut to_remove = amount;
        for slot in self.slots.iter_mut() {
            if let Some(s) = slot {
                if s.def.id == id {
                    let take = to_remove.min(s.count);
                    s.count -= take;
                    to_remove -= take;
                    if s.count == 0 { *slot = None; }
                    if to_remove == 0 { return true; }
                }
            }
        }
        true
    }

    pub fn count_item(&self, id: &str) -> u32 {
        self.slots.iter().flatten()
            .filter(|s| s.def.id == id)
            .map(|s| s.count)
            .sum()
    }
}`,
          collapsible: false
        },
        {
          title: "Pickup z Encji i Odczyt z UI",
          code: `// Rejestracja ekwipunku na starcie sceny:
ctx.resources.insert(Inventory::new(30));

// Definicje przedmiotów (stałe):
const HEALTH_POTION: ItemDef = ItemDef { id: "potion_hp", name: "Eliksir HP".into(), max_stack: 10 };
const GOLD_COIN: ItemDef    = ItemDef { id: "gold",      name: "Złota Moneta".into(), max_stack: 999 };

// W update() encji Pickup (pochłaniana przez gracza):
if pickup.rect().overlaps(&player.rect()) {
    if let Some(inv) = ctx.resources.get_mut::<Inventory>() {
        if inv.add_item(HEALTH_POTION, 3) {
            ctx.play_sound("item_pickup");
            pickup.destroy();
        }
    }
}

// W UI — wyświetlenie liczby złota:
if let Some(inv) = ctx.resources.get::<Inventory>() {
    let gold = inv.count_item("gold");
    ctx.set_ui_text("gold_label", &format!("Złoto: {}", gold));
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "inventory-api",
      title: "API Reference: Ekwipunek",
      apiTable: {
        headers: ["Metoda", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["Inventory::new(capacity)", "usize", "Inventory", "Tworzy pusty plecak z podaną liczbą slotów."],
          ["inv.add_item(def, amount)", "ItemDef, u32", "bool", "Dodaje przedmiot ze stackowaniem. Zwraca false jeśli brak miejsca."],
          ["inv.remove_item(id, amount)", "&str, u32", "bool", "Usuwa podaną ilość przedmiotów. Zwraca false jeśli za mało."],
          ["inv.count_item(id)", "&str", "u32", "Zwraca łączną ilość przedmiotów o danym ID we wszystkich slotach."],
          ["ctx.resources.get_mut::<T>()", "brak", "Option<&mut T>", "Pobiera mutowalną referencję do globalnego zasobu typu T."],
        ]
      }
    }
  ]
};

export const turnSystemDoc = {
  id: "turn-system",
  title: "32. ⏳ Taktyczny System Turowy & Punkty AP",
  badge: "Gameplay",
  description: "Deterministyczny menedżer faz tury (Tura Gracza / Tura Przeciwników) z punktami akcji (AP) i animowanymi opóźnieniami ruchów AI.",
  sections: [
    {
      id: "turn-overview",
      title: "Architektura Systemu Turowego",
      content: `System turowy realizowany jest przez maszynę stanów \`TurnManager\` przechowywaną w \`ctx.resources\`.

### Fazy Tury (enum \`TurnPhase\`):
- **\`PlayerTurn\`** — gracz może wykonywać akcje kosztem Punktów Akcji (AP). Po wyczerpaniu AP lub ręcznym zakończeniu tury → przejście do \`EnemyTurn\`.
- **\`EnemyTurn { current_enemy, delay_timer }\`** — silnik iteruje po wrogach jeden po jeden z animowanym opóźnieniem (\`delay_timer\`), dając graczowi czas na śledzenie ruchów AI.

### Punkty Akcji (AP):
Każda akcja gracza (ruch, atak, użycie przedmiotu) kosztuje określoną liczbę AP. Po zakończeniu tury gracza AP są odnawiane do \`max_player_ap\`.

> [!TIP]
> Opóźnienie \`delay_timer\` między ruchami wrogów to kluczowy element UX w grach turowych. Bez niego gracz nie widzi co się dzieje gdy wrogów jest dużo. Wartość 0.35s jest wyważona — nie za wolna, nie za szybka.

> [!NOTE]
> \`TurnManager\` przechowuj w \`ctx.resources\`, nie w obiekcie Logic — dzięki temu jest dostępny zarówno dla gracza jak i encji wrogów.`,
      codeExamples: [
        {
          title: "Maszyna Stanów TurnManager",
          code: `#[derive(PartialEq, Debug)]
pub enum TurnPhase {
    PlayerTurn,
    EnemyTurn { current_enemy: usize, delay_timer: f32 },
}

pub struct TurnManager {
    pub phase: TurnPhase,
    pub player_ap: u32,
    pub max_player_ap: u32,
}

impl TurnManager {
    pub fn new(max_ap: u32) -> Self {
        Self {
            phase: TurnPhase::PlayerTurn,
            player_ap: max_ap,
            max_player_ap: max_ap,
        }
    }

    pub fn spend_ap(&mut self, cost: u32) -> bool {
        if self.player_ap >= cost {
            self.player_ap -= cost;
            true
        } else {
            false // Brak AP — akcja odrzucona
        }
    }

    pub fn end_player_turn(&mut self) {
        self.phase = TurnPhase::EnemyTurn {
            current_enemy: 0,
            delay_timer: 0.35,
        };
    }

    pub fn start_player_turn(&mut self) {
        self.phase = TurnPhase::PlayerTurn;
        self.player_ap = self.max_player_ap; // Odnowienie AP
    }
}`,
          collapsible: false
        },
        {
          title: "Kontroler Tury w Warstwie Logic",
          code: `// Rejestracja:
ctx.resources.insert(TurnManager::new(3)); // 3 AP na turę

// Kontroler Logic napędzający turę:
let turn_controller = Logic::run(|ctx| {
    let Some(turns) = ctx.resources.get_mut::<TurnManager>() else { return };

    match &mut turns.phase {
        TurnPhase::PlayerTurn => {
            // Zakończ turę gdy AP wyczerpane lub klawisz Enter:
            if turns.player_ap == 0 || ctx.input.is_key_pressed(KeyCode::Enter) {
                turns.end_player_turn();
                ctx.play_sound("end_turn_sfx");
            }
        }
        TurnPhase::EnemyTurn { current_enemy, delay_timer } => {
            *delay_timer -= ctx.dt();
            if *delay_timer <= 0.0 {
                // Emituj zdarzenie ruchu następnego wroga:
                ctx.emit(EnemyMoveTurn { index: *current_enemy });
                *current_enemy += 1;
                *delay_timer = 0.35;

                let enemy_count = ctx.resources.get::<EnemyList>()
                    .map(|l| l.count).unwrap_or(0);
                if *current_enemy >= enemy_count {
                    // Wszyscy wrogowie wykonali ruch → tura gracza:
                    turns.start_player_turn();
                    ctx.play_sound("player_turn_sfx");
                }
            }
        }
    }
});`,
          collapsible: false
        },
        {
          title: "Gracz Wydaje AP na Ruch i Atak",
          code: `// W update() gracza:
if let Some(turns) = ctx.resources.get_mut::<TurnManager>() {
    if matches!(turns.phase, TurnPhase::PlayerTurn) {
        // Ruch: koszt 1 AP
        let dir = ctx.input.wasd();
        if dir.length() > 0.1 && turns.spend_ap(1) {
            let new_tile = player.tile_pos + dir.round().as_ivec2();
            if !map.is_solid(new_tile) {
                player.position = new_tile.as_vec2() * TILE_SIZE;
            }
        }

        // Atak: koszt 2 AP
        if ctx.mouse_pressed(Side::Left) && turns.spend_ap(2) {
            ctx.emit(PlayerAttack { target: ctx.mouse_world() });
        }
    }
}`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "turn-api",
      title: "API Reference: System Turowy",
      apiTable: {
        headers: ["Metoda", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["TurnManager::new(max_ap)", "u32", "TurnManager", "Tworzy menedżer tury z podaną maksymalną liczbą AP."],
          ["turns.spend_ap(cost)", "u32", "bool", "Próbuje wydać AP. Zwraca false jeśli brak wystarczającej ilości."],
          ["turns.end_player_turn()", "brak", "()", "Przełącza na fazę EnemyTurn z opóźnieniem 0.35s."],
          ["turns.start_player_turn()", "brak", "()", "Przełącza na fazę PlayerTurn i odnawia AP do maksimum."],
          ["ctx.emit(EnemyMoveTurn { index })", "impl Event", "()", "Emituje zdarzenie kolejki ruchu AI dla konkretnego wroga."],
        ]
      }
    }
  ]
};

export const enemyAiDoc = {
  id: "enemy-ai",
  title: "33. 👾 Maszyna Stanów AI Przeciwnika (FSM)",
  badge: "AI System",
  description: "Czysta maszyna stanów przeciwnika: Patrol → Pościg (Chase) → Przygotowanie Ataku (Windup) → Ucieczka (Flee) z logiką pola widzenia.",
  sections: [
    {
      id: "ai-overview",
      title: "Architektura FSM Przeciwnika",
      content: `AI przeciwnika opiera się na **Finite State Machine (FSM)** — maszynie stanów zarządzanej przez enum \`AiState\` przechowywany w \`Data\` encji wroga.

### 4 Stany AI:
| Stan | Wyzwalacz wejścia | Zachowanie |
|---|---|---|
| \`Patrol\` | Start / Powrót po ucieczce | Poruszanie między punktami lub losowo |
| \`Chase\` | Gracz w zasięgu widzenia (<220px) | Podążanie w stronę gracza |
| \`AttackWindup\` | Gracz blisko (<35px) | Animacja przygotowania ciosu (0.45s) |
| \`Flee\` | HP < 15% | Ucieczka w przeciwną stronę od gracza |

### Pole Widzenia:
Przejście do \`Chase\` bazuje na \`dist_to_player < vision_range\`. Dla bardziej zaawansowanego AI można dodać raycasting sprawdzający przeszkody (ściany między wrogiem a graczem).

> [!TIP]
> **Windup** (przygotowanie ciosu) to ważna mechanika fair-play — daje graczowi ~0.45s na reakcję i unik. Bez niego wrogowie atakują natychmiast, co jest frustrujące. Warto animować windup zmianą koloru / animacją sprite'a.

> [!NOTE]
> Ucieczka przy niskim HP to opcjonalna mechanika nadająca wrogom "osobowość". Uciekający wróg może być dobijany lub może wezwać posiłki — otwiera to ciekawe decyzje taktyczne dla gracza.`,
      codeExamples: [
        {
          title: "Enum AiState i Struktury Danych Wroga",
          code: `pub enum AiState {
    Patrol { target_x: f32 },
    Chase,
    AttackWindup { timer: f32 },
    Flee,
}

pub struct EnemyData {
    pub state: AiState,
    pub hp: i32,
    pub max_hp: i32,
    pub speed: f32,
    pub vision_range: f32,
    pub attack_range: f32,
}

impl EnemyData {
    pub fn new() -> Self {
        Self {
            state: AiState::Patrol { target_x: 0.0 },
            hp: 100, max_hp: 100,
            speed: 85.0,
            vision_range: 220.0,
            attack_range: 35.0,
        }
    }

    pub fn hp_percent(&self) -> f32 {
        self.hp as f32 / self.max_hp as f32
    }
}`,
          collapsible: false
        },
        {
          title: "Kompletna Logika FSM w update() Wroga",
          code: `// W update() encji wroga:
let player_pos = ctx.resources.get::<PlayerPos>().map(|p| p.0).unwrap_or(Vec2::ZERO);
let dist_to_player = enemy.position.distance(player_pos);

match enemy.data.state {
    AiState::Patrol { ref mut target_x } => {
        // Porusz się do celu patrolu:
        let dir = if enemy.position.x < *target_x { 1.0 } else { -1.0 };
        enemy.position.x += dir * enemy.data.speed * ctx.dt();

        // Odwróć kierunek przy dotarciu do celu:
        if (enemy.position.x - *target_x).abs() < 5.0 {
            *target_x = enemy.position.x + dir * -120.0; // Odwrót
        }

        // Wykryj gracza:
        if dist_to_player < enemy.data.vision_range {
            enemy.data.state = AiState::Chase;
            ctx.play_sound("alert_growl");
        }
    }

    AiState::Chase => {
        // Podąża w stronę gracza z pełną prędkością:
        let dir = (player_pos - enemy.position).normalize_or_zero();
        enemy.position += dir * enemy.data.speed * ctx.dt();

        // Zasięg ataku → Windup:
        if dist_to_player < enemy.data.attack_range {
            enemy.data.state = AiState::AttackWindup { timer: 0.45 };
        }

        // Ucieczka przy niskim HP:
        if enemy.data.hp_percent() < 0.15 {
            enemy.data.state = AiState::Flee;
            ctx.play_sound("enemy_flee");
        }
    }

    AiState::AttackWindup { ref mut timer } => {
        *timer -= ctx.dt();
        // Wizualny feedback: pulsuj czerwienią
        enemy.color = if (*timer * 8.0) as i32 % 2 == 0 { RED } else { DARKGRAY };

        if *timer <= 0.0 {
            // Wykonaj atak:
            ctx.emit(EnemyAttack { damage: 25, source: enemy.position });
            ctx.play_sound("bite_attack");
            enemy.color = DARKGRAY;
            enemy.data.state = AiState::Chase;
        }
    }

    AiState::Flee => {
        // Ucieka w przeciwną stronę od gracza:
        let dir = (enemy.position - player_pos).normalize_or_zero();
        enemy.position += dir * (enemy.data.speed * 1.4) * ctx.dt();

        // Jeśli daleko — wróć do Patrolu:
        if dist_to_player > 400.0 {
            enemy.data.state = AiState::Patrol { target_x: enemy.position.x };
        }
    }
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "ai-api",
      title: "API Reference: AI Przeciwnika",
      apiTable: {
        headers: ["Koncept / Metoda", "Parametry", "Zwraca", "Opis"],
        rows: [
          ["AiState (enum)", "brak", "brak", "Definiuje stany FSM: Patrol, Chase, AttackWindup, Flee."],
          ["pos.distance(other)", "Vec2", "f32", "Odległość euklidesowa między dwoma punktami (do wykrywania zasięgu)."],
          ["(target - pos).normalize_or_zero()", "Vec2", "Vec2", "Wektor kierunkowy znormalizowany (bezpieczna wersja — zero jeśli identyczne poz.)."],
          ["ctx.play_sound(name)", "&str", "()", "Odtwarza dźwięk reakcji AI (alert, ucieczka, atak)."],
          ["ctx.emit(EnemyAttack { ... })", "impl Event", "()", "Emituje zdarzenie ataku wroga odebrane przez kontroler obrażeń."],
          ["ctx.resources.get::<PlayerPos>()", "brak", "Option<&PlayerPos>", "Pobiera pozycję gracza z globalnych zasobów (bez bezpośredniej referencji)."],
        ]
      }
    }
  ]
};
