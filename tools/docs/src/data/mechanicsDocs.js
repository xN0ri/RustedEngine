// ============================================================================
// 5. GOTOWE MECHANIKI GRY
// ============================================================================

export const meleeCombatDoc = {
  id: "melee-combat",
  title: "25. ⚔️ Walka Wręcz, Combo & Hitstop",
  description: "3-stopniowy łańcuch cięć miecza, okienko czasowe na kolejny cios oraz efekt chwilowego zamrożenia klatki (Hitstop).",
  sections: [
    {
      id: "melee-main",
      title: "Kompletny Kod Systemu Walki Wręcz",
      content: `Poniższy kod realizuje łańcuch ataków z okienkiem czasowym na combo, zmiennymi obrażeniami oraz potężnym efektem uderzenia (*Hitstop*):`,
      codeExamples: [
        {
          title: "src/combat/melee.rs",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

pub struct MeleeCombo {
    pub current_step: u32,
    pub combo_timer: f32,
    pub combo_window: f32,
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

    pub fn attack(&mut self, ctx: &mut Context, origin: Vec2, facing: Vec2) {
        let (damage, is_finisher) = match self.current_step {
            0 => (25, false),
            1 => (40, false),
            _ => (90, true), // Trzeci cios: Potężny Finisher!
        };

        self.current_step = (self.current_step + 1) % 3;
        self.combo_timer = self.combo_window;

        // Dźwięk zamachu z losową wariacją
        ctx.play_sound_varied("sword_slash", 0.1, 0.1);

        // Kapsuła zasięgu miecza
        let slash_capsule = Capsule::new(origin, origin + facing * 45.0, 14.0);

        if is_finisher {
            ctx.set_time_scale(0.08); // Hitstop: zamrożenie czasu na ułamek sekundy!
            ctx.camera.shake(0.25, 7.0);

            // Wybuch cząsteczek przy uderzeniu krytycznym
            let mut burst = ParticleEmitter::new().with_auto_destroy();
            burst.emit_burst(origin + facing * 35.0, 20, RED, (80.0, 200.0), 3.0, 0.35);
            ctx.spawn(burst);
        }
    }
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const shootingWeaponsDoc = {
  id: "shooting-weapons",
  title: "26. 🔫 Broń Palna, Rozrzut & Odrzut (Weapons)",
  description: "Moduł broni ze stożkowym rozrzutem pocisków, strzelbami wielo-śrucinowymi oraz fizycznym odrzutem gracza.",
  sections: [
    {
      id: "shooting-main",
      title: "Kompletny Kod Systemu Broni Palnej",
      content: `Poniższy kod implementuje broń z cooldownem, rozrzutem pocisków, magazynkiem i odpychaniem postaci:`,
      codeExamples: [
        {
          title: "src/combat/weapons.rs",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

pub struct Weapon {
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
    pub fn shotgun() -> Self {
        Self {
            name: "Dwururka".into(),
            fire_rate: 0.75,
            cooldown: 0.0,
            bullets_per_shot: 6,
            spread_rad: 0.22,
            recoil: 180.0,
            mag_size: 2,
            current_ammo: 2,
        }
    }

    pub fn try_shoot(&mut self, ctx: &mut Context, origin: Vec2, target: Vec2, player_vel: &mut Vec2) -> bool {
        if self.cooldown > 0.0 || self.current_ammo == 0 { return false; }
        self.cooldown = self.fire_rate;
        self.current_ammo -= 1;

        let base_dir = origin.dir_to(target);
        let base_angle = base_dir.y.atan2(base_dir.x);

        for _ in 0..self.bullets_per_shot {
            let angle = base_angle + random_range(-self.spread_rad, self.spread_rad);
            let dir = vec2(angle.cos(), angle.sin());

            let bullet = Sprite::solid(origin, vec2(6.0, 6.0), YELLOW)
                .with_data(dir * 540.0)
                .update(|b, ctx| b.position += *b.data * ctx.dt());
            ctx.spawn(bullet);
        }

        // Fizyczny odrzut gracza w tył:
        *player_vel -= base_dir * self.recoil;
        ctx.camera.shake(0.14, 3.5);
        ctx.play_sound_varied("shotgun_blast", 0.08, 0.1);
        true
    }
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const inventorySystemDoc = {
  id: "inventory-system",
  title: "27. 🎒 System Ekwipunku & Stackowania",
  description: "Moduł plecaka ze stackowaniem przedmiotów, limitami pojemności i slotami wyposażenia trzymany w Resources.",
  sections: [
    {
      id: "inventory-main",
      title: "Kompletny Kod Ekwipunku",
      content: `Poniższy kod implementuje plecak ze stackowaniem i slotami:`,
      codeExamples: [
        {
          title: "src/gameplay/inventory.rs",
          code: `use rusted_engine::prelude::*;

#[derive(Clone, Debug)]
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
        // 2. Umieszczenie w pierwszym wolnym slocie:
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
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const turnSystemDoc = {
  id: "turn-system",
  title: "28. ⏳ Taktyczny System Turowy & Punkty AP",
  description: "Deterministyczny menedżer faz tury (Tura Gracza / Tura Przeciwników) z punktami akcji.",
  sections: [
    {
      id: "turns-main",
      title: "Kompletny Kod Systemu Turowego",
      content: `Poniższy kod realizuje maszynę stanów tury i punktów akcji:`,
      codeExamples: [
        {
          title: "src/gameplay/turns.rs",
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
    pub fn new() -> Self {
        Self {
            phase: TurnPhase::PlayerTurn,
            player_ap: 3,
            max_player_ap: 3,
        }
    }

    pub fn end_player_turn(&mut self) {
        self.phase = TurnPhase::EnemyTurn { current_enemy: 0, delay_timer: 0.35 };
    }

    pub fn start_player_turn(&mut self) {
        self.phase = TurnPhase::PlayerTurn;
        self.player_ap = self.max_player_ap; // Odnowienie punktów akcji
    }
}`,
          collapsible: false
        }
      ]
    }
  ]
};

export const enemyAiDoc = {
  id: "enemy-ai",
  title: "29. 👾 Maszyna Stanów AI Przeciwnika (FSM)",
  description: "Czysta maszyna stanów przeciwnika: Patrol -> Pościg (Chase) -> Przygotowanie Ataku (Windup) -> Ucieczka (Flee).",
  sections: [
    {
      id: "ai-main",
      title: "Kompletny Kod Maszyny Stanów AI",
      content: `Poniższy kod implementuje 4-stanowe zachowanie potwora z pościgiem, przygotowaniem ciosu i ucieczką:`,
      codeExamples: [
        {
          title: "src/gameplay/enemy_ai.rs",
          code: `pub enum AiState {
    Patrol { target_x: f32 },
    Chase,
    AttackWindup { timer: f32 },
    Flee,
}

pub struct EnemyData {
    pub state: AiState,
    pub hp: i32,
    pub speed: f32,
}

// W update potwora:
match enemy.data.state {
    AiState::Patrol { ref mut target_x } => {
        if dist_to_player < 220.0 {
            enemy.data.state = AiState::Chase;
            ctx.play_sound("alert_growl");
        }
    }
    AiState::Chase => {
        enemy.move_towards(player_pos, enemy.data.speed * ctx.dt());
        if dist_to_player < 35.0 {
            enemy.data.state = AiState::AttackWindup { timer: 0.45 };
        }
        if enemy.data.hp < 15 {
            enemy.data.state = AiState::Flee; // Ucieczka przy niskim HP!
        }
    }
    AiState::AttackWindup { ref mut timer } => {
        *timer -= ctx.dt();
        if *timer <= 0.0 {
            ctx.play_sound("bite_attack");
            enemy.data.state = AiState::Chase;
        }
    }
    AiState::Flee => {
        let dir = player_pos.dir_to(enemy.center());
        enemy.position += dir * (enemy.data.speed * 1.35) * ctx.dt();
    }
}`,
          collapsible: false
        }
      ]
    }
  ]
};
