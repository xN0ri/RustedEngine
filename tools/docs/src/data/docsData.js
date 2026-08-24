import * as Core from './coreDocs.js';
import * as Data from './dataDocs.js';
import * as Logic from './logicDocs.js';
import * as Graphics from './graphicsDocs.js';
import * as Mechanics from './mechanicsDocs.js';
import * as Games from './gamesDocs.js';

export const allDocs = [
  // 1. Architektura & Rdzeń
  Core.quickstartDoc,
  Core.lifecycleDoc,
  Core.contextDoc,
  Core.worldLayersDoc,
  Core.behaviorDoc,

  // 2. Stan, Dane & Zapis
  Data.entityDataDoc,
  Data.resourcesDoc,
  Data.stateStoreDoc,
  Data.datasetsPipelineDoc,
  Data.saveSystemDoc,

  // 3. Logika, Zdarzenia & Wejście
  Logic.eventBusDoc,
  Logic.inputActionsDoc,
  Logic.triggersDoc,
  Logic.sequencesDoc,
  Logic.tweensTimersDoc,
  Logic.mathGeometryDoc,
  Logic.rngProceduralDoc,

  // 4. Grafika, UI & Audio
  Graphics.cameraDoc,
  Graphics.virtualResolutionDoc,
  Graphics.tilemapsDoc,
  Graphics.particlesDoc,
  Graphics.uiWidgetsDoc,
  Graphics.uiLayoutDoc,
  Graphics.audioSfxDoc,

  // 5. Gotowe Mechaniki Gry
  Mechanics.meleeCombatDoc,
  Mechanics.shootingWeaponsDoc,
  Mechanics.inventorySystemDoc,
  Mechanics.turnSystemDoc,
  Mechanics.enemyAiDoc,

  // 6. Kompletne Gry
  Games.gameSurvivorDoc,
  Games.gameRpgQuestDoc,
  Games.gamePlatformerDoc,
];

export function searchDocs(query) {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  const results = [];

  for (const doc of allDocs) {
    for (const section of doc.sections || []) {
      let score = 0;

      if (doc.title.toLowerCase().includes(q)) score += 10;
      if (section.title.toLowerCase().includes(q)) score += 8;
      if (section.content?.toLowerCase().includes(q)) score += 3;

      if (section.codeExample && section.codeExample.code?.toLowerCase().includes(q)) {
        score += 5;
      }
      if (section.codeExamples) {
        for (const ex of section.codeExamples) {
          if (ex.code?.toLowerCase().includes(q) || ex.title?.toLowerCase().includes(q)) {
            score += 5;
          }
        }
      }

      if (score > 0) {
        results.push({
          docId: doc.id,
          docTitle: doc.title,
          sectionId: section.id,
          sectionTitle: section.title,
          snippet: section.content ? section.content.slice(0, 140) + '...' : '',
          score,
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
