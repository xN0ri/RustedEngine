export const gameplaySystemsDoc = {
  id: "gameplay-systems",
  title: "13. 🎒 Systemy Rozgrywki & AI",
  icon: "Boxes",
  badge: "Gameplay Recipes",
  description: "Moduł ekwipunku ze stackowaniem przedmiotów, taktyczny system turowy z punktami akcji (AP) oraz 4-stanowa maszyna stanów wrogów AI (FSM).",
  sections: [
    {
      id: "inventory-stacking-system",
      title: "1. System Ekwipunku, Stackowania & Slotów",
      content: `Kompletny system plecaka ze stackowaniem przedmiotów i slotami, trzymany w \`ctx.resources\`:`,
      codeExamples: [
        {
          title: "Kompletny Kod Ekwipunku (inventory.rs)",
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
        // 1. Dopełnianie istniejących stacków
        for slot in self.slots.iter_mut().flatten() {
            if slot.def.id == item.id && slot.count < slot.def.max_stack {
                let space = slot.def.max_stack - slot.count;
                let add = amount.min(space);
                slot.count += add;
                amount -= add;
                if amount == 0 { return true; }
            }
        }
        // 2. Wstawianie do pustego slotu
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
    },
    {
      id: "turn-based-combat-system",
      title: "2. Taktyczny System Turowy & Punkty Akcji (AP)",
      content: `Deterministyczny menedżer faz turowych (Tura Gracza $\to$ Tura Przeciwników):`,
      codeExamples: [
        {
          title: "Kompletny Kod Systemu Turowego (turn_system.rs)",
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
        self.phase = TurnPhase::EnemyTurn { current_enemy: 0, delay_timer: 0.3 };
    }
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "enemy-ai-fsm",
      title: "3. Maszyna Stanów AI Przeciwnika (FSM)",
      content: `Czysta maszyna stanów (Patrol $\to$ Pościg $\to$ Przygotowanie Ataku $\to$ Ucieczka):`,
      codeExamples: [
        {
          title: "Kompletny Kod AI Przeciwnika (enemy_ai.rs)",
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

// W update wroga:
match enemy.data.state {
    AiState::Patrol { ref mut target_x } => {
        if dist_to_player < 200.0 {
            enemy.data.state = AiState::Chase;
        }
    }
    AiState::Chase => {
        enemy.move_towards(player_pos, enemy.data.speed * ctx.dt());
        if dist_to_player < 35.0 {
            enemy.data.state = AiState::AttackWindup { timer: 0.4 };
        }
    }
    AiState::AttackWindup { ref mut timer } => {
        *timer -= ctx.dt();
        if *timer <= 0.0 {
            ctx.play_sound("bite");
            enemy.data.state = AiState::Chase;
        }
    }
    AiState::Flee => {
        let dir = player_pos.dir_to(enemy.center());
        enemy.position += dir * (enemy.data.speed * 1.3) * ctx.dt();
    }
}`,
          collapsible: false
        }
      ]
    }
  ]
};
