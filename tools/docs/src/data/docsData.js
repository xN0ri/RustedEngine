import { gettingStartedDoc } from './gettingStartedDoc.js';
import { worldObjectsDoc } from './worldObjectsDoc.js';
import { stateResourcesDoc } from './stateResourcesDoc.js';
import { dataSaveDoc } from './dataSaveDoc.js';
import { eventsActionsDoc } from './eventsActionsDoc.js';
import { sequenceDoc } from './sequenceDoc.js';
import { mathGeometryRngDoc } from './mathGeometryRngDoc.js';
import { uiSystemDoc } from './uiSystemDoc.js';
import { renderingCameraDoc } from './renderingCameraDoc.js';
import { tilemapsParticlesDoc } from './tilemapsParticlesDoc.js';
import { assetsAudioDoc } from './assetsAudioDoc.js';
import { combatSystemsDoc } from './combatSystemsDoc.js';
import { gameplaySystemsDoc } from './gameplaySystemsDoc.js';
import { examplesCookbookDoc } from './examplesCookbookDoc.js';

export const allDocs = [
  // 1. Architektura & Rdzeń
  gettingStartedDoc,
  worldObjectsDoc,

  // 2. Stan & Dane
  stateResourcesDoc,
  dataSaveDoc,

  // 3. Logika & Zdarzenia
  eventsActionsDoc,
  sequenceDoc,
  mathGeometryRngDoc,

  // 4. Grafika, UI & Audio
  uiSystemDoc,
  renderingCameraDoc,
  tilemapsParticlesDoc,
  assetsAudioDoc,

  // 5. Gotowe Systemy & Gry
  combatSystemsDoc,
  gameplaySystemsDoc,
  examplesCookbookDoc,
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
