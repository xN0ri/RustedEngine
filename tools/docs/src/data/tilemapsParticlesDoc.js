export const tilemapsParticlesDoc = {
  id: "tilemaps-particles",
  title: "10. 🧱 Tilemapy & Cząsteczki",
  icon: "Grid",
  badge: "Tiles & VFX",
  description: "Siatki kafelkowe z poziomów ASCII, zaawansowane kształty kolizji TileCollision (rampy 45°, platformy OneWay, półpłytki) oraz emiter cząsteczek ParticleEmitter z auto-destroy.",
  sections: [
    {
      id: "tilemap-ascii",
      title: "1. Siatka Kafelkowa & Kolizje Kafelków (`TileCollision`)",
      content: `Komponent **\`Tilemap\`** obsługuje siatki kafelkowe z arkuszy tekstur oraz zaawansowaną geometrię kolizji:

- **\`TileCollision::Solid\`**: Pełna bryła AABB (\`16×16\`).
- **\`TileCollision::SlopeUpRight\` / \`SlopeUpLeft\`**: 45-stopniowe rampy i pochyłości (wspinanie w prawo/lewo).
- **\`TileCollision::OneWay\`**: Platforma jednokierunkowa (przenikalna od dołu, solidna przy lądowaniu).
- **\`TileCollision::HalfBottom\`**: Półpłytka (*half-slab*).
- **\`map.get_slope_surface_y(pos) -> Option<f32>\`**: Oblicza dokładną wysokość powierzchni rampy w świecie (do płynnego biegania po zboczach).
- **\`map.collides_oneway_landing(rect, prev_y) -> Option<f32>\`**: Wykrywa lądowanie stóp na platformie OneWay.`,
      codeExamples: [
        {
          title: "Wczytywanie Mapy ASCII z Rampami i Platformami",
          code: `let mut map = Tilemap::new(tile_texture, vec2(16.0, 16.0), 32, 18)
    .with_solid_tiles([1])                               // Pełna ściana '#'
    .with_tile_collision(2, TileCollision::SlopeUpRight) // Rampa '/'
    .with_tile_collision(3, TileCollision::OneWay);      // Platforma '='

map.load_from_ascii("
####################
#    ==            #
#         /        #
####################
", |c| match c { '#' => Some(1), '/' => Some(2), '=' => Some(3), _ => None });

// W update postaci: przyklejenie do powierzchni rampy
if let Some(ground_y) = map.get_slope_surface_y(player.position + vec2(8.0, 16.0)) {
    player.position.y = ground_y - 16.0;
}`,
          collapsible: false
        }
      ]
    },
    {
      id: "particle-emitter-auto-destroy",
      title: "2. Emiter Cząsteczek (`ParticleEmitter`) z Auto-Destroy",
      content: `\`ParticleEmitter\` generuje efekty cząsteczkowe z fizyczną grawitacją i automatycznym czyszczeniem pamięci:

- **\`with_auto_destroy()\`**: Gdy wszystkie cząsteczki zgasną, emiter automatycznie usuwa się ze świata gry!
- **\`emit_burst(pos, count, color, speed_range, size, lifetime)\`**: Natychmiastowy wybuch cząsteczek.`,
      codeExamples: [
        {
          title: "Tworzenie Wybuchu z Grawitacją i Samozniszczeniem",
          code: `let mut emitter = ParticleEmitter::new()
    .with_gravity(vec2(0.0, 150.0))
    .with_auto_destroy();

// Wyemitowanie 40 pomarańczowych iskier:
emitter.emit_burst(hit_position, 40, ORANGE, (80.0, 200.0), 4.0, 0.4);

// Dodanie do świata gry:
ctx.spawn(emitter);`,
          collapsible: false
        }
      ]
    }
  ]
};
