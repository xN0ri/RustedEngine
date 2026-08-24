export const combatSystemsDoc = {
  id: "combat-systems",
  title: "12. ⚔️ Systemy Walki & Broni",
  icon: "Crosshair",
  badge: "Combat Recipes",
  description: "Gotowe moduły walki: broń palna ze stożkowym rozrzutem (spread), strzelby i fizyczny odrzut (recoil), a także 3-stopniowy łańcuch ciosów wręcz (melee) z efektem hitstop.",
  sections: [
    {
      id: "shooting-weapon-recoil",
      title: "1. System Broni Palnej, Rozrzutu (Spread) & Odrzutu (Recoil)",
      content: `Poniższy moduł implementuje w pełni funkcjonalny system broni:
- **Rozrzut kątowy (\`spread_rad\`)**: Losowe odchylenie pocisku w stożku celowania.
- **Strzelby (\`bullets_per_shot\`)**: Wystrzeliwanie wiązki wielu śrucin w jednej klatce.
- **Fizyczny odrzut (\`recoil\`)**: Odpychanie gracza w kierunku przeciwnym do strzału.
- **Wstrząs kamery**: Sprzężenie z \`ctx.camera.shake\`.`,
      codeExamples: [
        {
          title: "Kompletny Kod: Moduł Broni (weapons.rs)",
          code: `use rusted_engine::prelude::*;
use macroquad::prelude::*;

pub struct Weapon {
    pub name: String,
    pub fire_rate: f32,
    pub cooldown: f32,
    pub bullets_per_shot: u32,
    pub spread_rad: f32,
    pub bullet_speed: f32,
    pub recoil: f32,
}

impl Weapon {
    pub fn try_shoot(&mut self, ctx: &mut Context, origin: Vec2, target: Vec2, player_vel: &mut Vec2) -> bool {
        if self.cooldown > 0.0 { return false; }
        self.cooldown = self.fire_rate;

        let base_dir = origin.dir_to(target);
        let base_angle = base_dir.y.atan2(base_dir.x);

        for _ in 0..self.bullets_per_shot {
            let angle = base_angle + random_range(-self.spread_rad, self.spread_rad);
            let dir = vec2(angle.cos(), angle.sin());

            let bullet = Sprite::solid(origin, vec2(6.0, 6.0), YELLOW)
                .with_data(dir * self.bullet_speed)
                .update(|b, ctx| {
                    b.position += *b.data * ctx.dt();
                });
            ctx.spawn(bullet);
        }

        // Fizyczny odrzut:
        *player_vel -= base_dir * self.recoil;
        ctx.camera.shake(0.12, 3.0);
        ctx.play_sound_varied("gun_shot", 0.08, 0.1);
        true
    }
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "melee-combo-hitstop",
      title: "2. Walka Wręcz, Łańcuch Combo & Efekt Hitstop",
      content: `Płynna walka wręcz opiera się na 3 filarach:
1. **Okienko Combo**: Gracz ma określony czas na zadanie kolejnego ciosu.
2. **Animacja i Dźwięk**: Każdy cios ma inny zasięg, obrażenia i dźwięk cięcia.
3. **Efekt Hitstop (Hitfreeze)**: Przy potężnym finiszerze czas gry zwalnia na ułamek sekundy (\`ctx.set_time_scale(0.05)\`), potęgując uczucie siły uderzenia!`,
      codeExamples: [
        {
          title: "Kompletny Kod: Combo Cięć Miecza (melee.rs)",
          code: `pub struct MeleeCombo {
    pub current_step: u32,
    pub combo_timer: f32,
    pub combo_window: f32,
}

impl MeleeCombo {
    pub fn new() -> Self {
        Self { current_step: 0, combo_timer: 0.0, combo_window: 0.6 }
    }

    pub fn attack(&mut self, ctx: &mut Context, origin: Vec2, facing: Vec2) {
        let (damage, range, is_finisher) = match self.current_step {
            0 => (20, 35.0, false),
            1 => (30, 40.0, false),
            _ => (70, 55.0, true), // Finisher!
        };

        self.current_step = (self.current_step + 1) % 3;
        self.combo_timer = self.combo_window;

        ctx.play_sound_varied("sword_slash", 0.1, 0.1);

        if is_finisher {
            ctx.set_time_scale(0.08); // Hitstop na ułamek sekundy!
            ctx.camera.shake(0.2, 5.0);
        }
    }
}`,
          collapsible: false
        }
      ]
    }
  ]
};
