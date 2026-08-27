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
        },
        {
          title: "Zaawansowane Wzorce Pocisków: Homing, Orbitale i Wiązka Lasera",
          code: `// 1. Pocisk Samonaprowadzający (Homing Tear / Magic Missile):
pub fn spawn_homing_missile(origin: Vec2, initial_dir: Vec2, ctx: &mut Context) {
    let missile = Rectangle::simple(vec2(10.0, 10.0), PURPLE)
        .with_position(origin)
        .with_tag("bullet_player")
        .with_data((initial_dir * 320.0, 3.0_f32)) // (velocity, lifetime)
        .on_update(|obj, m_ctx| {
            // Szukaj najbliższego wroga w promieniu 350px:
            if let Some(target_pos) = m_ctx.get_vec2("nearest_enemy") {
                let to_target = (target_pos - obj.position).normalize_or_zero();
                // Płynny skręt wektora prędkości (lerp):
                let current_dir = obj.data.0.normalize_or_zero();
                let new_dir = current_dir.lerp(to_target, 6.0 * m_ctx.dt()).normalize_or_zero();
                obj.data.0 = new_dir * 320.0;
            }

            obj.position += obj.data.0 * m_ctx.dt();
            obj.data.1 -= m_ctx.dt();
            if obj.data.1 <= 0.0 { obj.destroy(); }
        });
    ctx.spawn(missile);
}

// 2. Tarcza Orbitujących Pocisków (Orbiting Flies):
pub fn spawn_orbital_fly(player_pos: Vec2, start_angle: f32, ctx: &mut Context) {
    let orbital = Rectangle::simple(vec2(12.0, 12.0), BLUE)
        .with_position(player_pos)
        .with_tag("orbital_shield")
        .with_data(start_angle)
        .on_update(|obj, o_ctx| {
            // Zwiększaj kąt obrotu:
            *obj.data += 3.5 * o_ctx.dt(); // 3.5 rad/s
            let player = o_ctx.get_vec2_or("player_pos", vec2(400.0, 300.0));

            // Pozycja na okręgu wokół gracza (promień 55px):
            let offset = vec2(obj.data.cos(), obj.data.sin()) * 55.0;
            obj.position = player + offset;
        });
    ctx.spawn(orbital);
}

// 3. Ciągła Wiązka Lasera (Brimstone / Laser Beam):
pub fn fire_laser_beam(origin: Vec2, dir: Vec2, range: f32, ctx: &mut Context) {
    let beam = Segment::new(origin, origin + dir.normalize_or_zero() * range);
    
    // Oblicz trafienia wrogów przeciętych odcinkiem lasera:
    for enemy in ctx.query_mut::<EnemyData>() {
        if beam.distance_to_point(enemy.rect().center()) < 16.0 {
            ctx.emit(EnemyHit { damage: 15, source: origin });
        }
    }

    // Dynamiczny błysk ekranu i dźwięk:
    ctx.camera.shake(0.2, 5.0);
    ctx.play_sound("laser_blast");
}`,
          collapsible: true,
          defaultCollapsed: false
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
          ["Segment::new(start, end)", "Vec2, Vec2", "Segment", "Odcinek 2D do modelowania laserów i promieni penetrujących."],
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
        },
        {
          title: "Przedmiot Aktywny ze Spacją & Magnes Przyciągający Pickupy",
          code: `// 1. Struktura Przedmiotu Aktywnego (Spacebar Active Item):
#[derive(Clone, Debug)]
pub struct ActiveItem {
    pub name: String,
    pub max_charges: u32,
    pub current_charges: u32,
}

impl ActiveItem {
    pub fn try_use(&mut self, ctx: &mut Context) -> bool {
        if self.current_charges < self.max_charges { return false; }
        self.current_charges = 0; // Zużyj ładunki

        // Efekt (np. The Yum Heart: ulecz gracza o 1 serce):
        ctx.increment("player_hp", 2);
        ctx.camera.shake(0.2, 4.0);
        ctx.play_sound("heal_chime");
        true
    }

    pub fn charge_on_room_clear(&mut self) {
        self.current_charges = (self.current_charges + 1).min(self.max_charges);
    }
}

// 2. Pickup z Efektem Magnesu (Magnet Effect):
pub fn spawn_magnetic_coin(pos: Vec2, ctx: &mut Context) {
    let coin = Rectangle::simple(vec2(12.0, 12.0), GOLD)
        .with_position(pos)
        .with_tag("pickup_coin")
        .on_update(|obj, c_ctx| {
            if let Some(player_pos) = c_ctx.get_vec2("player_pos") {
                let dist = obj.position.distance(player_pos);

                // Jeśli gracz jest w zasięgu 110px — przyciągaj monetę z przyspieszeniem!
                if dist < 110.0 {
                    let dir = obj.position.dir_to(player_pos);
                    let magnet_speed = (110.0 - dist) * 4.5 + 80.0;
                    obj.position += dir * magnet_speed * c_ctx.dt();
                }

                // Zebranie przy bezpośrednim kontakcie:
                if dist < 18.0 {
                    obj.destroy();
                    c_ctx.increment("coins", 1);
                    c_ctx.play_varied("coin_pickup", 0.05, 0.05);
                }
            }
        });
    ctx.spawn(coin);
}`,
          collapsible: true,
          defaultCollapsed: false
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
        },
        {
          title: "Separacja Wrogów (Flocking Separation) & Telegrafowanie Ataku",
          code: `// 1. Separacja wrogów (zapobieganie zlewaniu się w jeden punkt):
pub fn apply_enemy_separation(current_enemy_pos: Vec2, speed: f32, dt: f32, ctx: &mut Context) -> Vec2 {
    let mut separation_force = Vec2::ZERO;

    // Pobierz pozycje innych wrogów w promieniu 32px:
    for other in ctx.query_mut::<EnemyData>() {
        let diff = current_enemy_pos - other.rect().center();
        let dist = diff.length();
        if dist > 0.001 && dist < 32.0 {
            // Siła odwrotnie proporcjonalna do dystansu:
            separation_force += (diff / dist) * (32.0 - dist) * 2.0;
        }
    }

    separation_force * dt
}

// 2. Telegrafowanie ataku (Windup z Tweenem i Błyskiem):
pub fn spawn_telegraphed_boss(pos: Vec2, ctx: &mut Context) {
    let boss = Rectangle::simple(vec2(48.0, 48.0), DARKGRAY)
        .with_position(pos)
        .with_tag("boss")
        .with_data(0.0_f32) // attack_timer
        .on_update(|obj, b_ctx| {
            *obj.data += b_ctx.dt();

            // Telegrafowanie: co 3 sekundy ładuj atak przez 0.8s:
            let cycle = *obj.data % 3.0;
            if cycle > 2.2 {
                // Pulsujący błysk ostrzegawczy na żółto/czerwono:
                let flash = ((cycle - 2.2) * 20.0).sin().abs();
                obj.color = Color::new(1.0, 0.2 + flash * 0.8, 0.0, 1.0);
            } else if cycle < 0.2 && *obj.data > 3.0 {
                // WYKONAJ ATAK (np. fala uderzeniowa 360 stopni):
                b_ctx.camera.shake(0.3, 8.0);
                b_ctx.play_sound("boss_slam");
                obj.color = DARKGRAY;
            } else {
                obj.color = DARKGRAY;
            }
        });
    ctx.spawn(boss);
}`,
          collapsible: true,
          defaultCollapsed: false
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

export const twinStickRoguelikeDoc = {
  id: "twinstick-roguelike",
  title: "34. 🩸 Dungeon Crawler / Twin-Stick Roguelike (TBoI Style)",
  badge: "Game Recipe",
  description: "Kompletny poradnik tworzenia gry typu The Binding of Isaac: podział na pliki i moduły, gdzie trzymać stan, iterowanie i kolizje, inercja łez, AI wrogów, bomby, piedestały i HUD.",
  sections: [
    {
      id: "twinstick-structure",
      title: "1. 📁 Podział Projektu na Pliki & Wzorzec Fabryk (Project Structure)",
      content: `Aby gra nie stała się jednym wielkim monolitem w \`main.rs\`, kod dzielimy na wyspecjalizowane moduły. W RustedEngine najlepszym podejściem jest **wzorzec funkcji fabrycznych** (\`spawn_*\`):

### Rekomendowany Układ Plików:
\`\`\`
src/
├── main.rs         # Inicjalizacja Engine, scen, pętla startowa
├── player.rs       # spawn_player(), PlayerData, sterowanie WASD
├── tears.rs        # spawn_tear(), TearData, inercja, pękanie pocisków
├── enemies.rs      # spawn_gaper(), spawn_fly(), EnemyData, zachowania AI
├── dungeon.rs      # Graf pokoi, kafelki ścian, logika otwierania drzwi
├── items.rs        # Pule przedmiotów (WeightedList), piedestały z Tween
└── hud.rs          # Deklaratywny interfejs UI (col!, row!, paski HP)
\`\`\`

### Wzorzec Funkcji Fabrycznej (\`spawn_*\`):
Funkcja fabryczna przyjmuje pozycję i \`&mut Context\` (lub zwraca byt do \`ctx.spawn\`), konfigurując tagi, dane i callbacki:`,
      codeExamples: [
        {
          title: "src/player.rs — Wydzielony Moduł Gracza",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

pub struct PlayerData {
    pub speed: f32,
    pub shoot_cooldown: f32,
    pub shoot_timer: f32,
}

/// Funkcja fabryczna: tworzy i konfiguruje encję gracza
pub fn spawn_player(pos: Vec2, ctx: &mut Context) {
    let player = Rectangle::simple(vec2(28.0, 28.0), WHITE)
        .with_position(pos)
        .with_tag("player")
        .with_data(PlayerData {
            speed: 230.0,
            shoot_cooldown: 0.22,
            shoot_timer: 0.0,
        })
        .on_update(|obj, p_ctx| {
            // Ruch WASD
            let mut move_dir = Vec2::ZERO;
            if p_ctx.is_key_down(KeyCode::W) { move_dir.y -= 1.0; }
            if p_ctx.is_key_down(KeyCode::S) { move_dir.y += 1.0; }
            if p_ctx.is_key_down(KeyCode::A) { move_dir.x -= 1.0; }
            if p_ctx.is_key_down(KeyCode::D) { move_dir.x += 1.0; }

            if move_dir != Vec2::ZERO {
                obj.position += move_dir.normalize() * obj.data.speed * p_ctx.dt();
            }

            // Ograniczenie do granic pokoju (Clamp)
            obj.position.x = obj.position.x.clamp(52.0, 728.0);
            obj.position.y = obj.position.y.clamp(52.0, 528.0);
            p_ctx.set_vec2("player_pos", obj.position);

            // Obsługa strzelania łzami
            obj.data.shoot_timer -= p_ctx.dt();
            let mut shoot_dir = Vec2::ZERO;
            if p_ctx.is_key_down(KeyCode::Up)    { shoot_dir.y -= 1.0; }
            if p_ctx.is_key_down(KeyCode::Down)  { shoot_dir.y += 1.0; }
            if p_ctx.is_key_down(KeyCode::Left)  { shoot_dir.x -= 1.0; }
            if p_ctx.is_key_down(KeyCode::Right) { shoot_dir.x += 1.0; }

            if shoot_dir != Vec2::ZERO && obj.data.shoot_timer <= 0.0 {
                obj.data.shoot_timer = obj.data.shoot_cooldown;
                crate::tears::spawn_tear(obj.position + vec2(9.0, 9.0), shoot_dir, move_dir, obj.data.speed, p_ctx);
            }
        });

    ctx.spawn(player);
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "twinstick-state-ownership",
      title: "2. 🧠 Gdzie Trzymać Stan: obj.data vs ctx.resources vs ctx.state",
      content: `W grach w Rust kluczem do czystego kodu bez walki z borrow checkerem jest właściwe przypisanie danych do 3 poziomów stanu silnika:

| Poziom Stanu | Gdzie ląduje | Kiedy stosować | Przykład w Isaacu |
| :--- | :--- | :--- | :--- |
| **Prywatny stan encji** | \`obj.data\` w \`Behavior<Inner, Data>\` | Dane dotyczące **wyłącznie tej jednej instancji obiektu**. | Bieżące HP tego konkretnego wroga, timer strzału gracza, prędkość lotu tej jednej łzy. |
| **Żywy stan sesji (Global)** | \`ctx.resources.get / get_mut\` | Złożone struktury Rust współdzielone przez wiele systemów. | \`PlayerStats\` (Damage, TearRate, ShotSpeed, Luck), graf lochu \`DungeonGraph\`, pule itemów. |
| **Trwałe flagi & Save** | \`ctx.state\` / \`ctx.save_system\` | Proste flagi, liczniki punktów, postęp i zapis gry do JSON. | \`ctx.set_int("coins", 15)\`, \`ctx.flag("boss_killed")\`, odblokowane postacie. |

### Dlaczego \`ctx.spawn\` i \`obj.destroy\` nigdy nie powodują konfliktów borrow checkera:
W RustedEngine dodawanie (\`ctx.spawn\`) i niszczenie (\`obj.destroy\`) bytów trafia do bezpiecznej kolejki odroczonej (\`pending_spawn\`). Pętla aktualizacji świata nie modyfikuje wektora obiektów w trakcie iteracji, co pozwala na bezpieczne tworzenie pocisków i cząsteczek bezpośrednio z wnętrza \`on_update\`!`,
      codeExamples: [
        {
          title: "Zarządzanie Statystykami Gracza w ctx.resources",
          code: `#[derive(Clone, Debug)]
pub struct PlayerStats {
    pub damage: f32,
    pub tear_rate: f32,
    pub shot_speed: f32,
    pub coins: i32,
}

// Inicjalizacja na starcie gry w main.rs:
ctx.resources.insert(PlayerStats {
    damage: 3.5,
    tear_rate: 0.25,
    shot_speed: 420.0,
    coins: 0,
});

// Podniesienie przedmiotu Cricket's Head (+1.5 Damage):
if let Some(stats) = ctx.resources.get_mut::<PlayerStats>() {
    stats.damage += 1.5;
    ctx.play_sound("item_pickup_fanfare");
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "twinstick-collisions-and-querying",
      title: "3. 🎯 Iterowanie po Obiektach, Tagi & Detekcja Kolizji",
      content: `W grze typu TBoI potrzebujesz wykrywać:
1. **Trafienia łez we wrogów** (Łza niszczy się i zadaje obrażenia).
2. **Zbieranie przedmiotów przez gracza** (Monety, serduszka, bomby).
3. **Śmierć wrogów i otwieranie drzwi** po wyczyszczeniu pokoju.

### Wzorce Kolizji i Iteracji:
- **Tagowanie Bytów**: Oznaczaj encje za pomocą \`.with_tag("enemy")\`, \`.with_tag("tear")\`, \`.with_tag("pickup_coin")\`.
- **Kolizje w Warstwie Logiki (\`add_logic_fn\`)**: Najczystszy wzorzec — zamiast sprawdzać kolizje w każdym obiekcie z osobna, sprawdzasz je w fazie \`Logic\`, która wykonuje się po aktualizacji obiektów świata.`,
      codeExamples: [
        {
          title: "src/tears.rs — Pocisk z Inercją i Pękaniem",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

pub struct TearData {
    pub velocity: Vec2,
    pub lifetime: f32,
    pub damage: f32,
}

pub fn spawn_tear(pos: Vec2, shoot_dir: Vec2, player_move: Vec2, player_speed: f32, ctx: &mut Context) {
    let stats = ctx.resources.get::<PlayerStats>().cloned().unwrap_or(PlayerStats {
        damage: 3.5,
        tear_rate: 0.25,
        shot_speed: 420.0,
        coins: 0,
    });

    // Inercja pędu gracza:
    let tear_vel = shoot_dir.normalize() * stats.shot_speed + player_move * (player_speed * 0.25);

    let tear = Rectangle::simple(vec2(10.0, 10.0), SKYBLUE)
        .with_position(pos)
        .with_tag("tear")
        .with_data(TearData {
            velocity: tear_vel,
            lifetime: 1.1,
            damage: stats.damage,
        })
        .on_update(|obj, t_ctx| {
            obj.position += obj.data.velocity * t_ctx.dt();
            obj.data.lifetime -= t_ctx.dt();

            // Pęknięcie o ściany pokoju
            let hit_wall = obj.position.x < 48.0 || obj.position.x > 742.0
                        || obj.position.y < 48.0 || obj.position.y > 542.0;

            if obj.data.lifetime <= 0.0 || hit_wall {
                obj.destroy();
                t_ctx.play_varied("tear_pop", 0.1, 0.05);
            }
        });

    ctx.spawn(tear);
    ctx.play_varied("tear_shoot", 0.1, 0.05);
}`,
          collapsible: false
        },
        {
          title: "src/enemies.rs — Wrogowie Goniący (Gaper) i Latający (Fly)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

pub struct EnemyData {
    pub hp: f32,
    pub speed: f32,
}

/// Goniący zombie (Gaper)
pub fn spawn_gaper(pos: Vec2, ctx: &mut Context) {
    let gaper = Rectangle::simple(vec2(26.0, 26.0), RED)
        .with_position(pos)
        .with_tag("enemy")
        .with_data(EnemyData { hp: 10.0, speed: 110.0 })
        .on_update(|obj, e_ctx| {
            if let Some(player_pos) = e_ctx.get_vec2("player_pos") {
                let to_player = obj.position.dir_to(player_pos);
                obj.position += to_player * obj.data.speed * e_ctx.dt();
            }

            if obj.data.hp <= 0.0 {
                obj.destroy();
                e_ctx.camera.shake(6.0, 0.2); // Wstrząs kamery po zabiciu
                e_ctx.play_sound("enemy_die");
                e_ctx.increment("score", 100);
            }
        });

    ctx.spawn(gaper);
}

/// Chaotycznie latająca mucha (Fly)
pub fn spawn_fly(pos: Vec2, ctx: &mut Context) {
    let fly = Rectangle::simple(vec2(16.0, 16.0), BLACK)
        .with_position(pos)
        .with_tag("enemy")
        .with_data((EnemyData { hp: 5.0, speed: 95.0 }, random_angle()))
        .on_update(|obj, e_ctx| {
            obj.data.1 += random_range(-2.0, 2.0) * e_ctx.dt();
            if let Some(player_pos) = e_ctx.get_vec2("player_pos") {
                let to_p = obj.position.dir_to(player_pos);
                let orbit = (Vec2Ext::rotated(to_p, obj.data.1) + to_p).normalize();
                obj.position += orbit * obj.data.0.speed * e_ctx.dt();
            }

            if obj.data.0.hp <= 0.0 {
                obj.destroy();
                e_ctx.play_sound("fly_splat");
            }
        });

    ctx.spawn(fly);
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "twinstick-complete-room",
      title: "4. 🚀 Kompletny, Działający Szablon Pokoju TBoI",
      content: `Oto kompletny, gotowy do uruchomienia program łączący pokój lochu, gracza, łzy, wrogów, sprawdzanie wyczyszczenia pokoju oraz deklaratywny HUD w warstwie UI:`,
      codeExamples: [
        {
          title: "src/main.rs — Pełny Prototyp Pokoju",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

#[derive(Clone, Debug)]
pub struct PlayerStats {
    pub damage: f32,
    pub tear_rate: f32,
    pub shot_speed: f32,
    pub coins: i32,
}

#[macroquad::main("The Binding of Rust")]
async fn main() {
    let mut engine = Engine::new(800, 600)
        .with_title("The Binding of Rust - Roguelike Prototype")
        .with_fps_limit(60);

    let mut game_scene = Scene::new_empty("Dungeon");

    // 1. Podłoga i ściany pokoju
    game_scene.add(
        Rectangle::simple(vec2(720.0, 520.0), DARKGRAY)
            .with_position(vec2(40.0, 40.0))
            .with_border(BLACK, 8.0)
    );

    // 2. Gracz (na środku pokoju)
    let player = Rectangle::simple(vec2(28.0, 28.0), WHITE)
        .with_position(vec2(400.0, 300.0))
        .with_tag("player")
        .with_data(0.0_f32) // timer strzału
        .on_update(|obj, ctx| {
            let speed = 230.0;
            let dt = ctx.dt();

            let mut dir = Vec2::ZERO;
            if ctx.is_key_down(KeyCode::W) { dir.y -= 1.0; }
            if ctx.is_key_down(KeyCode::S) { dir.y += 1.0; }
            if ctx.is_key_down(KeyCode::A) { dir.x -= 1.0; }
            if ctx.is_key_down(KeyCode::D) { dir.x += 1.0; }
            if dir != Vec2::ZERO {
                obj.position += dir.normalize() * speed * dt;
            }
            obj.position.x = obj.position.x.clamp(52.0, 728.0);
            obj.position.y = obj.position.y.clamp(52.0, 528.0);
            ctx.set_vec2("player_pos", obj.position);

            // Strzał łzą
            *obj.data -= dt;
            let mut shoot = Vec2::ZERO;
            if ctx.is_key_down(KeyCode::Up)    { shoot.y -= 1.0; }
            if ctx.is_key_down(KeyCode::Down)  { shoot.y += 1.0; }
            if ctx.is_key_down(KeyCode::Left)  { shoot_dir_x(&mut shoot); }
            if ctx.is_key_down(KeyCode::Right) { shoot.x += 1.0; }

            if shoot != Vec2::ZERO && *obj.data <= 0.0 {
                *obj.data = 0.22;
                let tear_vel = shoot.normalize() * 420.0 + dir * (speed * 0.25);
                let tear = Rectangle::simple(vec2(10.0, 10.0), SKYBLUE)
                    .with_position(obj.position + vec2(9.0, 9.0))
                    .with_tag("tear")
                    .with_data((tear_vel, 1.2_f32))
                    .on_update(|t, t_ctx| {
                        t.position += t.data.0 * t_ctx.dt();
                        t.data.1 -= t_ctx.dt();
                        if t.data.1 <= 0.0 || t.position.x < 48.0 || t.position.x > 742.0 || t.position.y < 48.0 || t.position.y > 542.0 {
                            t.destroy();
                            t_ctx.play_varied("tear_pop", 0.1, 0.05);
                        }
                    });
                ctx.spawn(tear);
                ctx.play_varied("tear_shoot", 0.1, 0.05);
            }
        });
    game_scene.add(player);

    // 3. Spawnowanie wrogów
    game_scene.add(
        Rectangle::simple(vec2(24.0, 24.0), RED)
            .with_position(vec2(120.0, 120.0))
            .with_tag("enemy")
            .with_data(10.0_f32) // HP
            .on_update(|e, ctx| {
                if let Some(target) = ctx.get_vec2("player_pos") {
                    let to_p = e.position.dir_to(target);
                    e.position += to_p * 105.0 * ctx.dt();
                }
            })
    );

    // 4. Deklaratywny HUD (UI Layer)
    game_scene.add_ui(
        col![
            row![
                Text::new("❤️ ❤️ ❤️", Vec2::ZERO, 22.0, RED).with_tag("hud_hp"),
                Gap::width(16.0),
                ProgressBar::progress(1.0).with_size(vec2(70.0, 16.0)),
            ],
            Gap::height(6.0),
            row![
                Text::new("💰 00", Vec2::ZERO, 16.0, GOLD).with_tag("hud_coins"),
                Gap::width(12.0),
                Text::new("💣 01", Vec2::ZERO, 16.0, WHITE),
                Gap::width(12.0),
                Text::new("🔑 01", Vec2::ZERO, 16.0, WHITE),
            ],
        ]
        .with_padding(Padding::all(16.0))
        .align_to_screen(UIAnchor::TopLeft, Padding::all(16.0))
    );

    engine.add_scene(game_scene);
    engine.run().await;
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "twinstick-room-transitions",
      title: "5. 🚪 Przejścia Między Pokojami, Płynna Kamera & Spawner Fal",
      content: `W dungeon crawlerze loch składa się z siatki pokoi. Gdy gracz wejdzie w otwarte drzwi, silnik wykonuje **płynne przejście kamery (Room Transition)** za pomocą \`TweenVec2\`, a kontroler \`Logic\` zarządza falami wrogów i otwieraniem przejść.

### Elementy Układanki:
1. **Wykrycie Wejścia w Drzwi**: Bounding box drzwi na obrzeżach pokoju (\`door_rect.overlaps_rect(player_rect)\`).
2. **Animacja Kamery**: \`TweenVec2\` przesuwa \`ctx.camera.target\` z centrum starego pokoju do nowego.
3. **Teleport Gracza**: Gracz zostaje przesunięty pod przeciwległe drzwi nowego pokoju.
4. **Zarządca Fal (\`Logic\`)**: Sprawdza liczbę aktywnych wrogów — po pokonaniu wszystkich wrogów emituje dźwięk i odblokowuje drzwi.`,
      codeExamples: [
        {
          title: "Płynne Przejście Kamery i Kontroler Fali (Logic)",
          code: `// 1. Struktura Menedżera Pokoju i Kamery:
pub struct DungeonRoomController {
    pub camera_tween: Option<TweenVec2>,
    pub enemies_spawned: bool,
}

// 2. Kontroler Logiki Pokoju (warstwa Logic):
let dungeon_logic = Logic::with_data(DungeonRoomController {
    camera_tween: None,
    enemies_spawned: false,
})
.on_update(|ctrl, ctx| {
    // A. Animacja przejścia kamery między pokojami:
    if let Some(ref mut tween) = ctrl.camera_tween {
        ctx.camera.target = tween.tick(ctx.dt());
        if tween.is_finished() {
            ctrl.camera_tween = None; // Koniec przejścia
        }
        return; // Zablokuj logikę gry w trakcie tranzycji pokoju
    }

    // B. Sprawdzenie wyczyszczenia pokoju (Room Clear):
    let alive_enemies = ctx.get_int_or("alive_enemies", 0);
    if ctrl.enemies_spawned && alive_enemies == 0 && !ctx.flag("room_cleared") {
        ctx.set_flag("room_cleared", true);
        ctx.play_sound("room_clear_jingle");
        
        // Zespawnuj nagrodę (skrzynia lub piedestał):
        crate::items::spawn_chest(vec2(400.0, 300.0), ctx);
    }
});

// 3. Wejście w Drzwi Północne (North Door Transition):
pub fn check_door_transition(player: &mut Rectangle, ctx: &mut Context, ctrl: &mut DungeonRoomController) {
    let north_door = Rect::new(370.0, 30.0, 60.0, 20.0);

    if north_door.overlaps(&player.rect()) && ctx.flag("room_cleared") {
        // Płynny przesuw kamery o 600px w górę (0.45 sekundy):
        ctrl.camera_tween = Some(TweenVec2::new(
            ctx.camera.target,
            ctx.camera.target - vec2(0.0, 600.0),
            0.45,
            Easing::EaseInOutCubic,
        ));

        // Teleportuj gracza do dolnych drzwi nowego pokoju:
        player.position.y = 510.0;
        ctx.set_flag("room_cleared", false);
        ctrl.enemies_spawned = false;
        ctx.play_sound("door_open");
    }
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const spatialQueriesDetectionDoc = {
  id: "spatial-queries-detection",
  title: "35. 📡 Raycasty, Detekcja Obszarowa & Zapytania Przestrzenne (Spatial Queries)",
  badge: "Spatial Math & Queries",
  description: "Zaawansowane zapytania przestrzenne: Raycasty 2D i Line-of-Sight, wykrywanie przedmiotów w promieniu gracza, dynamiczne prompty interakcji UI ('Naciśnij E'), stożki widzenia AI (FOV Cone), cięcia kapsułą i eksplozje AoE.",
  sections: [
    {
      id: "spatial-raycasting-los",
      title: "1. 🔦 Raycasting 2D & Pole Widzenia (Line of Sight)",
      content: `Promienie **\`Ray2D\`** pozwalają na rzucanie niewidzialnych linii w przestrzeni świata 2D w celu wykrywania kolizji z przeszkodami (AABB, okręgi, odcinki) oraz sprawdzania czystej linii wzroku (*Line of Sight*):

### Metody Ray2D:
- **\`Ray2D::new(origin, direction)\`**: Tworzy promień z automatyczną normalizacją kierunku.
- **\`.cast_against_rect(rect, max_dist) -> Option<RayHit>\`**: Zwraca punkt uderzenia (\`hit.point\`), odległość (\`hit.distance\`) oraz wektor normalny powierzchni (\`hit.normal\`).
- **\`.cast_against_circle(circle, max_dist) -> Option<RayHit>\`**: Trafienie w okrąg kolizyjny.
- **\`.cast_against_segment(segment, max_dist) -> Option<RayHit>\`**: Przecięcie z odcinkiem linii.`,
      codeExamples: [
        {
          title: "Line of Sight AI — Czy Wróg Widzi Gracza Przez Ściany?",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

// Funkcja pomocnicza testująca czy linia między punktem A a B jest wolna od ścian:
pub fn has_line_of_sight(from: Vec2, to: Vec2, walls: &[Rect]) -> bool {
    let to_target = to - from;
    let dist = to_target.length();
    if dist < 0.001 { return true; }

    let ray = Ray2D::new(from, to_target / dist);

    for wall in walls {
        if let Some(hit) = ray.cast_against_rect(*wall, dist) {
            if hit.distance < dist {
                return false; // Ściana przesłania widok!
            }
        }
    }
    true // Czysta linia widzenia
}

// W update() przeciwnika AI:
let player_pos = ctx.resources.get::<Vec2>().copied().unwrap_or(Vec2::ZERO);
let walls = ctx.resources.get::<Vec<Rect>>().map(|w| w.as_slice()).unwrap_or(&[]);

if enemy.position.distance(player_pos) < 300.0 && has_line_of_sight(enemy.position, player_pos, walls) {
    // Wróg widzi gracza — przejdź do agresywnego pościgu:
    enemy.data.is_chasing = true;
}`,
          collapsible: false
        },
        {
          title: "Odbicie Promienia Lasera od Ściany (Ray Reflection)",
          code: `// Rzucenie promienia i obliczenie kąta odbicia od powierzchni:
let laser = Ray2D::new(gun_pos, gun_dir);

if let Some(hit) = laser.cast_against_rect(wall_rect, 600.0) {
    // 1. Rysuj główny promień:
    draw_line(gun_pos.x, gun_pos.y, hit.point.x, hit.point.y, 2.0, RED);

    // 2. Oblicz wektor odbicia: r = d - 2*(d · n)*n
    let bounce_dir = laser.direction - 2.0 * laser.direction.dot(hit.normal) * hit.normal;
    let bounce_ray = Ray2D::new(hit.point, bounce_dir);

    // 3. Rysuj odbity promień o długości 200px:
    let end_pos = bounce_ray.point_at(200.0);
    draw_line(hit.point.x, hit.point.y, end_pos.x, end_pos.y, 1.5, ORANGE);
}`,
          collapsible: true,
          defaultCollapsed: true
        }
      ]
    },
    {
      id: "spatial-interaction-prompts",
      title: "2. 🎁 Zasięg Interakcji z Przedmiotami & Dynamiczny Prompt UI (Press E)",
      content: `Wyszukiwanie najbliższego interaktywnego przedmiotu (skrzynia, mikstura, NPC) w zasięgu gracza i wyświetlanie komunikatu w interfejsie:

### Dobre Praktyki:
1. **Pojedyncza Etykieta Promptu w UI**: W HUD trzymaj jeden element tekstowy (np. z tagiem \`"interact_prompt"\`), który aktualizujesz co klatkę.
2. **Wyszukanie z Tagiem**: Użyj \`ctx.find_nearest(player.position, "pickup")\` lub \`ctx.find_within_radius(player.position, 60.0)\`.
3. **Akcja pod Klawiszem**: Wciśnięcie klawisza \`E\` aplikuje efekt (np. leczenie) i usuwa zebrany przedmiot (\`obj.destroy()\`).`,
      codeExamples: [
        {
          title: "Kompletny System Podnoszenia Przedmiotów i Otwierania Skrzyń",
          code: `// Encja Skrzyni ze Skarbem:
pub struct ChestData {
    pub is_opened: bool,
    pub gold_reward: i32,
}

pub fn spawn_chest(pos: Vec2) -> impl Object {
    Sprite::solid(pos, vec2(24.0, 24.0), GOLD)
        .with_tag("chest")
        .with_data(ChestData { is_opened: false, gold_reward: 150 })
}

// W update() encji Gracza:
let interact_range = 60.0;
let mut active_prompt = None;

// 1. Sprawdź czy w pobliżu znajduje się skrzynia:
if let Some(chest) = ctx.find_nearest(player.position, "chest") {
    if let Some(bounds) = chest.bounds() {
        let center = vec2(bounds.x + bounds.w * 0.5, bounds.y + bounds.h * 0.5);
        
        if player.position.distance(center) <= interact_range {
            active_prompt = Some("[E] Otwórz Skrzynię");

            if ctx.input.is_key_pressed(KeyCode::E) {
                ctx.increment("gold", 150);
                ctx.play_varied("chest_open_fanfare", 0.1, 0.05);
                ctx.emit_signal("chest_looted");
            }
        }
    }
}

// 2. Aktualizacja etykiety w UI HUD:
if let Some(msg) = active_prompt {
    ctx.set_ui_text("interact_prompt", msg);
} else {
    ctx.set_ui_text("interact_prompt", ""); // Ukryj gdy brak obiektów w zasięgu
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "spatial-fov-cone",
      title: "3. 👁️ Stożek Wzroku AI / Zasięg Latarki (Vision Cone)",
      content: `Wykrywanie czy gracz znajduje się w kątowym stożku widzenia postaci (np. $60^\circ$ przed oczyma):

### Wzór Kątowy (Dot Product):
Wektor patrzenia $\\vec{F}$ oraz znormalizowany wektor do celu $\\vec{D}$:
$$\\vec{F} \\cdot \\vec{D} \\ge \\cos(\\text{half\\_fov})$$`,
      codeExamples: [
        {
          title: "Detekcja Gracza w Stożku Widzenia Strażnika",
          code: `pub fn is_inside_cone(
    viewer_pos: Vec2,
    viewer_facing: Vec2, // np. vec2(1.0, 0.0)
    target_pos: Vec2,
    max_distance: f32,
    fov_degrees: f32,
) -> bool {
    let to_target = target_pos - viewer_pos;
    let dist = to_target.length();

    if dist > max_distance || dist < 0.001 {
        return false;
    }

    let dir = to_target / dist;
    let threshold = (fov_degrees.to_radians() * 0.5).cos();

    viewer_facing.dot(dir) >= threshold
}

// W update() strażnika:
let player_pos = ctx.resources.get::<Vec2>().copied().unwrap_or(Vec2::ZERO);

// Kąt 75 stopni na dystans 250px:
if is_inside_cone(guard.position, guard.data.facing, player_pos, 250.0, 75.0) {
    // Gracz wszedł w pole widzenia!
    guard.data.alert_level = 1.0;
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "spatial-aoe-explosion",
      title: "4. 💥 Eksplozje Obszarowe & Odrzut (AoE Damage & Knockback)",
      content: `Wybuchy bomb i min wykorzystują zapytanie \`ctx.find_within_radius(pos, radius)\` w celu zadania obrażeń i odrzucenia fizycznego:`,
      codeExamples: [
        {
          title: "Eksplozja Obszarowa z Odrzutem Wrogów",
          code: `pub fn trigger_bomb_explosion(ctx: &mut Context, bomb_pos: Vec2, radius: f32, max_dmg: f32) {
    ctx.camera.shake(0.35, 12.0);
    ctx.play_varied("explosion_heavy", 0.1, 0.15);

    // Znajdź wszystkie byty w promieniu rażenia:
    let targets = ctx.find_within_radius(bomb_pos, radius);

    for target in targets {
        if target.has_tag("enemy") {
            if let Some(b) = target.bounds() {
                let target_pos = vec2(b.x + b.w * 0.5, b.y + b.h * 0.5);
                let dist = bomb_pos.distance(target_pos).max(1.0);

                // Opad obrażeń proporcjonalny do odległości:
                let falloff = (1.0 - (dist / radius)).clamp(0.0, 1.0);
                let damage = (max_dmg * falloff).round() as i32;

                // Wektor odrzutu (Knockback):
                let knockback_dir = (target_pos - bomb_pos).normalize_or_zero();
                let knockback_force = knockback_dir * (400.0 * falloff);

                println!("Trafiono wroga: {} dmg, odrzut: {:?}", damage, knockback_force);
            }
        }
    }
}`,
          collapsible: false
        }
      ]
    }
  ]
};
