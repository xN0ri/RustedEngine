export const gameMechanicsRecipesDoc = {
  id: "game-mechanics-recipes",
  title: "11. ⚙️ Modular Game Systems (Ekwipunek, Strzelanie, Melee, Tury)",
  icon: "Boxes",
  badge: "Gameplay Systems",
  description: "Praktyczne, modularne przepisy i szablony na kluczowe systemy rozgrywki w RustedEngine — Ekwipunek i przedmioty, zaawansowane strzelanie z rozrzutem i odrzutem, walka wręcz z combo i hitstopem, system turowy oraz maszyny stanów AI.",
  sections: [
    {
      id: "inventory-equipment-system",
      title: "1. System Ekwipunku, Przedmiotów & Slotów Wyposażenia",
      content: `System ekwipunku opiera się na wydzieleniu niezmiennych definicji przedmiotów (*Database / ItemDef*) od ich instancji w plecaku (*ItemStack*) oraz strukturze \`Inventory\` umieszczanej w **\`ctx.resources\`**.

### 📐 Struktura Danych i Zasady Projektowe:
1. **Definicja Przedmiotu (\`ItemDef\`)**: Identyfikator, nazwa, maksymalna wielkość stosu (*stack size*), typ (używalny, broń, pancerz) oraz modyfikatory statystyk.
2. **Stos Przedmiotów (\`ItemStack\`)**: Para \`(item_id, count)\`.
3. **Magazyn Ekwipunku (\`Inventory\`)**: Wektor slotów plecaka o stałym rozmiarze oraz dedykowane sloty wyposażenia (\`equipped_weapon\`, \`equipped_armor\`).`,
      callouts: [
        {
          type: "protip",
          title: "Dlaczego trzymać Inventory w ctx.resources?",
          text: "Dzięki umieszczeniu `Inventory` w `ctx.resources`, dowolny obiekt gry, skrypt logiki, trigger czy okno UI (`PanelManager`) może odczytać lub zmodyfikować stan przedmiotów za pomocą `ctx.resources.get_mut::<Inventory>()` bez przekazywania referencji przez 10 warstw."
        }
      ],
      codeExamples: [
        {
          title: "Kompletny Moduł Ekwipunku (inventory.rs)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

// =======================================================================
// 1. TYPY I STRUKTURY PRZEDMIOTÓW
// =======================================================================
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ItemType {
    Consumable,
    Weapon,
    Armor,
    Material,
}

#[derive(Clone, Debug)]
pub struct ItemDef {
    pub id: &'static str,
    pub name: String,
    pub item_type: ItemType,
    pub max_stack: u32,
    pub bonus_damage: i32,
    pub bonus_defense: i32,
    pub heal_amount: i32,
}

#[derive(Clone, Debug)]
pub struct ItemStack {
    pub def: ItemDef,
    pub count: u32,
}

#[derive(Clone, Debug)]
pub struct Inventory {
    pub max_slots: usize,
    pub slots: Vec<Option<ItemStack>>,
    pub equipped_weapon: Option<ItemDef>,
    pub equipped_armor: Option<ItemDef>,
}

impl Inventory {
    pub fn new(capacity: usize) -> Self {
        Self {
            max_slots: capacity,
            slots: vec![None; capacity],
            equipped_weapon: None,
            equipped_armor: None,
        }
    }

    /// Dodaje przedmiot do ekwipunku ze stackowaniem
    pub fn add_item(&mut self, item: ItemDef, mut amount: u32) -> bool {
        // 1. Najpierw uzupełniamy istniejące stosy
        for slot in self.slots.iter_mut().flatten() {
            if slot.def.id == item.id && slot.count < slot.def.max_stack {
                let space = slot.def.max_stack - slot.count;
                let add = amount.min(space);
                slot.count += add;
                amount -= add;
                if amount == 0 {
                    return true;
                }
            }
        }

        // 2. Umieszczamy pozostałość w wolnych slotach
        for slot in self.slots.iter_mut() {
            if slot.is_none() {
                let add = amount.min(item.max_stack);
                *slot = Some(ItemStack {
                    def: item.clone(),
                    count: add,
                });
                amount -= add;
                if amount == 0 {
                    return true;
                }
            }
        }

        amount == 0 // Zwraca false jeśli plecak był pełny
    }

    /// Używa przedmiotu z danego slotu
    pub fn use_slot(&mut self, slot_idx: usize, hero_hp: &mut i32, max_hp: i32) -> bool {
        if let Some(Some(stack)) = self.slots.get_mut(slot_idx) {
            match stack.def.item_type {
                ItemType::Consumable => {
                    *hero_hp = (*hero_hp + stack.def.heal_amount).min(max_hp);
                    stack.count -= 1;
                    if stack.count == 0 {
                        self.slots[slot_idx] = None;
                    }
                    return true;
                }
                ItemType::Weapon => {
                    let prev_weapon = self.equipped_weapon.take();
                    self.equipped_weapon = Some(stack.def.clone());
                    self.slots[slot_idx] = prev_weapon.map(|w| ItemStack { def: w, count: 1 });
                    return true;
                }
                _ => {}
            }
        }
        false
    }
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "weapons-and-shooting-system",
      title: "2. System Broni Palnej: Rozrzut (Spread), Odrzut (Recoil), Shotgun & Laser",
      content: `System strzelania w grach 2D wymaga obsługi **rozrzutu kątowego (*Cone Spread*)**, **wielu śrucin na strzał (*Shotgun*)**, **fizycznego odrzutu gracza (*Recoil Knockback*)**, **promieni laserowych (*Hitscan Raycast*)** oraz dynamicznych efektów dźwiękowych.

### 📐 Kluczowe Wzorce Matematyczne:
1. **Rozrzut Kątowy**: Kierunek strzału obracamy o losowy kąt z zakresu $[-\\theta, +\\theta]$ za pomocą \`vec2(cos, sin)\`.
2. **Odrzut Gracza**: Po strzale dodajemy wektor przeciwstawny do prędkości lub pozycji gracza: \`player.velocity -= shoot_dir * recoil_force\`.
3. **Śrutownica (Multi-Pellet)**: W jednej klatce pętla generuje $N$ niezależnych pocisków o lekko zróżnicowanej prędkości i kącie.`,
      codeExamples: [
        {
          title: "Kompletny Moduł Broni i Strzelania (weapons.rs)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

#[derive(Clone, Debug)]
pub struct Weapon {
    pub name: &'static str,
    pub fire_rate: f32,       // Czas w sekundach między strzałami
    pub cooldown_timer: f32,
    pub bullets_per_shot: u32,// 1 dla pistoletu, 6 dla shotguna
    pub spread_radians: f32,  // Kąt stożka rozrzutu w radianach
    pub bullet_speed: f32,
    pub recoil_force: f32,
    pub is_automatic: bool,
}

impl Weapon {
    pub fn pistol() -> Self {
        Self {
            name: "Pistolet 9mm",
            fire_rate: 0.25,
            cooldown_timer: 0.0,
            bullets_per_shot: 1,
            spread_radians: 0.04, // ~2.3 stopnia
            bullet_speed: 550.0,
            recoil_force: 40.0,
            is_automatic: false,
        }
    }

    pub fn shotgun() -> Self {
        Self {
            name: "Strzelba Bojowa",
            fire_rate: 0.75,
            cooldown_timer: 0.0,
            bullets_per_shot: 7,
            spread_radians: 0.35, // ~20 stopni
            bullet_speed: 480.0,
            recoil_force: 180.0,
            is_automatic: false,
        }
    }

    pub fn update_cooldown(&mut self, dt: f32) {
        if self.cooldown_timer > 0.0 {
            self.cooldown_timer -= dt;
        }
    }

    /// Próbuje oddać strzał w stronę celu
    pub fn try_shoot(&mut self, ctx: &mut Context, origin: Vec2, target: Vec2, player_vel: &mut Vec2) -> bool {
        if self.cooldown_timer > 0.0 {
            return false;
        }

        self.cooldown_timer = self.fire_rate;
        let base_dir = origin.dir_to(target);
        let base_angle = base_dir.y.atan2(base_dir.x);

        // Generowanie pocisków (np. 7 dla shotguna)
        for _ in 0..self.bullets_per_shot {
            let spread_offset = random_range(-self.spread_radians, self.spread_radians);
            let final_angle = base_angle + spread_offset;
            let final_dir = vec2(final_angle.cos(), final_angle.sin());
            let speed_variance = self.bullet_speed * random_range(0.9, 1.1);

            let bullet = Sprite::solid(origin - vec2(3.0, 3.0), vec2(6.0, 6.0), YELLOW)
                .with_data(final_dir * speed_variance)
                .update(|b, ctx| {
                    let vel = *b.data;
                    b.position += vel * ctx.dt();
                    // Zniszczenie po wylocie za ekran
                    if b.position.x < 0.0 || b.position.x > 1280.0 || b.position.y < 0.0 || b.position.y > 720.0 {
                        b.destroy();
                    }
                });

            ctx.spawn(bullet);
        }

        // Fizyczny odrzut gracza
        *player_vel -= base_dir * self.recoil_force;

        // Efekty audiowizualne
        ctx.play_sound_varied("gun_fire", 0.1, 0.15);
        ctx.camera.shake(0.15, 3.0);

        true
    }
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "melee-combat-combo-hitstop",
      title: "3. Walka Wręcz (Melee Combat), Łańcuchy Combo & Hitstop Effect",
      content: `System walki wręcz w dynamicznych grach 2D (Hack'n'Slash / Brawler / Souls-like) wymaga trzech fundamentalnych elementów:
1. **Okienko Sekwencji Combo**: Naciśnięcie ataku w odpowiednim ułamku sekundy przechodzi do kolejnego ciosu (np. *Slash 1 $\\to$ Slash 2 $\\to$ Heavy Finisher*).
2. **Wycinek Kątowy / Stożek Trafienia (Arc Cone Query)**: Obrażenia zadawane są celom w określonym promieniu oraz przed postacią (\`dot > 0.4\`).
3. **Hitstop (Frame Freeze)**: Chwilowe zamrożenie czasu gry na kilkadziesiąt milisekund w momencie trafienia (\`ctx.set_time_scale(0.05)\`), co potęguje siłę uderzenia.`,
      codeExamples: [
        {
          title: "Kompletny Moduł Walki Wręcz i Combo (melee.rs)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

#[derive(Clone, Debug)]
pub struct MeleeCombat {
    pub combo_index: u32,       // 0, 1 lub 2
    pub combo_timer: f32,       // Okienko czasowe na kolejny cios
    pub attack_cooldown: f32,
    pub is_attacking: bool,
}

impl MeleeCombat {
    pub fn new() -> Self {
        Self {
            combo_index: 0,
            combo_timer: 0.0,
            attack_cooldown: 0.0,
            is_attacking: false,
        }
    }

    pub fn update(&mut self, dt: f32) {
        if self.attack_cooldown > 0.0 {
            self.attack_cooldown -= dt;
        }

        // Resetowanie combo jeśli gracz nie zaatakował na czas
        if self.combo_timer > 0.0 {
            self.combo_timer -= dt;
            if self.combo_timer <= 0.0 {
                self.combo_index = 0; // Powrót do pierwszego ciosu
            }
        }
    }

    /// Wykonuje cięcie wręcz
    pub fn perform_slash(&mut self, ctx: &mut Context, origin: Vec2, facing_dir: Vec2) {
        if self.attack_cooldown > 0.0 {
            return;
        }

        // Parametry zależne od etapu combo
        let (damage, range, arc_width, cooldown) = match self.combo_index {
            0 => (25, 45.0, 0.6, 0.2),  // Szybkie cięcie lekkie
            1 => (35, 50.0, 0.7, 0.25), // Drugie cięcie
            _ => (70, 65.0, 0.9, 0.5),  // Ciężki finisher z potężnym cięciem
        };

        self.attack_cooldown = cooldown;
        self.combo_timer = 0.6; // 600ms na wyprowadzenie kolejnego ciosu
        self.combo_index = (self.combo_index + 1) % 3;

        // Dźwięk i animacja
        ctx.play_sound_varied("sword_slash", 0.1, 0.1);

        // Jeśli to finisher, wywołaj Hitstop (zamrożenie klatek na uderzenie)
        if self.combo_index == 0 {
            ctx.set_time_scale(0.08); // Zwolnienie czasu
            ctx.camera.shake(0.25, 6.0); // Silny wstrząs kamery
            
            // Automatyczny powrót do normalnego czasu po 60ms przez Timer / Logic
        }

        println!("Wykonano atak Melee! Combo krok: {}, Obrażenia bazowe: {}", self.combo_index, damage);
    }
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "turn-based-tactical-system",
      title: "4. System Turowy: Kolejka Inicjatywy & Punkty Akcji (AP)",
      content: `Gry taktyczne i turowe (np. jRPG, strategie heksagonalne, gry karciane) wymagają precyzyjnej **Maszyny Stanów Tury (*Turn State Machine*)**.

### 📐 Przepływ Tury:
1. **\`PlayerTurn\`**: Gracz wydaje Punkty Akcji (*Action Points — AP*) na ruch lub atak.
2. **\`EnemyTurn\`**: Sztuczna inteligencja podejmuje decyzje sekwencyjnie z krótkim opóźnieniem timera.
3. **\`TurnResolution\`**: Przeliczenie efektów statusowych (trucizna, regeneracja) i odnowienie punktów AP.`,
      codeExamples: [
        {
          title: "Kompletny Moduł Systemu Turowego (turn_system.rs)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TurnPhase {
    PlayerTurn,
    EnemyTurn { enemy_idx: usize, timer: f32 },
    RoundSummary,
}

#[derive(Clone, Debug)]
pub struct CombatUnit {
    pub name: String,
    pub hp: i32,
    pub max_hp: i32,
    pub ap: u32,
    pub max_ap: u32,
    pub is_player: bool,
}

#[derive(Clone, Debug)]
pub struct TurnManager {
    pub phase: TurnPhase,
    pub round_number: u32,
    pub player: CombatUnit,
    pub enemies: Vec<CombatUnit>,
}

impl TurnManager {
    pub fn new() -> Self {
        Self {
            phase: TurnPhase::PlayerTurn,
            round_number: 1,
            player: CombatUnit {
                name: "Rycerz".into(),
                hp: 100,
                max_hp: 100,
                ap: 3,
                max_ap: 3,
                is_player: true,
            },
            enemies: vec![
                CombatUnit { name: "Goblin A".into(), hp: 30, max_hp: 30, ap: 2, max_ap: 2, is_player: false },
                CombatUnit { name: "Goblin B".into(), hp: 30, max_hp: 30, ap: 2, max_ap: 2, is_player: false },
            ],
        }
    }

    /// Gracz wykonuje akcję zużywającą punkty AP
    pub fn player_action_attack(&mut self, target_idx: usize, ctx: &mut Context) -> bool {
        if self.phase != TurnPhase::PlayerTurn || self.player.ap < 1 {
            return false;
        }

        if let Some(target) = self.enemies.get_mut(target_idx) {
            target.hp -= 20;
            self.player.ap -= 1;
            ctx.play_sound("hit_sfx");

            // Jeśli gracz zużył całe AP, automatycznie kończymy turę
            if self.player.ap == 0 {
                self.end_player_turn();
            }
            return true;
        }
        false
    }

    /// Ręczne lub automatyczne zakończenie tury gracza
    pub fn end_player_turn(&mut self) {
        self.phase = TurnPhase::EnemyTurn {
            enemy_idx: 0,
            timer: 0.4, // Opóźnienie przed ruchem wroga
        };
    }

    /// Aktualizacja pętli logicznej tury
    pub fn update(&mut self, dt: f32, ctx: &mut Context) {
        if let TurnPhase::EnemyTurn { ref mut enemy_idx, ref mut timer } = self.phase {
            *timer -= dt;
            if *timer <= 0.0 {
                // Wykonanie akcji przez aktualnego wroga
                if *enemy_idx < self.enemies.len() {
                    let enemy = &self.enemies[*enemy_idx];
                    if enemy.hp > 0 {
                        self.player.hp -= 12;
                        ctx.play_sound("enemy_hit");
                        println!("{} zaatakował gracza za 12 pkt!", enemy.name);
                    }

                    *enemy_idx += 1;
                    *timer = 0.5; // Odczekaj pół sekundy przed kolejnym wrogiem
                } else {
                    // Wszyscy wrogowie zakończyli ruch -> Nowa tura gracza!
                    self.round_number += 1;
                    self.player.ap = self.player.max_ap;
                    for e in &mut self.enemies {
                        e.ap = e.max_ap;
                    }
                    self.phase = TurnPhase::PlayerTurn;
                    println!("--- ROZPOCZĘTO RUNDĘ {} ---", self.round_number);
                }
            }
        }
    }
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "enemy-ai-fsm",
      title: "5. Maszyna Stanów AI Przeciwników (FSM: Patrol, Pościg, Atak & Ucieczka)",
      content: `Prosta, ale niezwykle czytelna **Maszyna Stanów (*Finite State Machine*)** wbudowana bezpośrednio w \`Behavior<Sprite, EnemyState>\`.

### 📐 Stany Maszyny:
- **\`Patrol\`**: Poruszanie się między punktami orientacyjnymi (*waypoints*).
- **\`Chase\`**: Płynny pościg za graczem, gdy wejdzie w promień widzenia ($< 220\\text{px}$).
- **\`Attack\`**: Zatrzymanie się i wyprowadzenie ataku z czasem ładowania (*wind-up*).
- **\`Flee\`**: Ucieczka w przeciwną stronę, gdy punkty życia spadną poniżej $20\\%$.`,
      codeExamples: [
        {
          title: "Kompletny Moduł AI FSM (enemy_ai.rs)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

#[derive(Clone, Debug, PartialEq)]
pub enum AiState {
    Patrol { target_x: f32 },
    Chase,
    AttackWindup { timer: f32 },
    Flee,
}

pub struct EnemyAiData {
    pub state: AiState,
    pub hp: i32,
    pub speed: f32,
}

pub fn create_fsm_enemy(pos: Vec2) -> impl Object {
    Sprite::solid(pos, vec2(24.0, 24.0), RED)
        .with_data(EnemyAiData {
            state: AiState::Patrol { target_x: pos.x + 100.0 },
            hp: 50,
            speed: 90.0,
        })
        .with_tag("enemy_fsm")
        .update(|enemy, ctx| {
            let player_pos = ctx.state.get_vec2("player_pos").unwrap_or_default();
            let dist_to_player = enemy.center().dist_to(player_pos);
            let dt = ctx.dt();

            // 1. Sprawdzenie stanu paniki / ucieczki
            if enemy.data.hp < 15 && enemy.data.state != AiState::Flee {
                enemy.data.state = AiState::Flee;
                enemy.color = ORANGE;
            }

            // 2. Obsługa aktualnego stanu
            match enemy.data.state {
                AiState::Patrol { ref mut target_x } => {
                    // Ruch w stronę waypointu
                    if (enemy.position.x - *target_x).abs() < 5.0 {
                        *target_x = if *target_x > enemy.position.x { enemy.position.x - 120.0 } else { enemy.position.x + 120.0 };
                    }
                    enemy.position.x += (*target_x - enemy.position.x).signum() * enemy.data.speed * 0.5 * dt;

                    // Wykrycie gracza w zasięgu widzenia
                    if dist_to_player < 180.0 {
                        enemy.data.state = AiState::Chase;
                        enemy.color = RED;
                    }
                }

                AiState::Chase => {
                    enemy.look_at(player_pos);
                    enemy.move_towards(player_pos, enemy.data.speed * dt);

                    // Zasięg ataku
                    if dist_to_player < 35.0 {
                        enemy.data.state = AiState::AttackWindup { timer: 0.4 };
                        enemy.color = YELLOW;
                    } else if dist_to_player > 260.0 {
                        // Gracz uciekł -> Powrót do patrolu
                        enemy.data.state = AiState::Patrol { target_x: enemy.position.x + 60.0 };
                        enemy.color = MAROON;
                    }
                }

                AiState::AttackWindup { ref mut timer } => {
                    *timer -= dt;
                    if *timer <= 0.0 {
                        // Wyprowadzenie uderzenia
                        if dist_to_player < 40.0 {
                            ctx.emit_signal("player_damaged");
                            ctx.play_sound("enemy_bite");
                        }
                        enemy.data.state = AiState::Chase;
                    }
                }

                AiState::Flee => {
                    // Ucieczka w kierunku przeciwnym do gracza
                    let flee_dir = player_pos.dir_to(enemy.center());
                    enemy.position += flee_dir * (enemy.data.speed * 1.3) * dt;
                }
            }
        })
}`,
          collapsible: false
        }
      ]
    }
  ]
};
