import { gettingStartedDoc } from './gettingStartedDoc.js';
import { worldObjectsDoc } from './worldObjectsDoc.js';
import { uiSystemDoc } from './uiSystemDoc.js';
import { stateSaveDoc } from './stateSaveDoc.js';
import { eventsActionsDoc } from './eventsActionsDoc.js';
import { sequenceDoc } from './sequenceDoc.js';
import { assetsAudioDoc } from './assetsAudioDoc.js';
import { renderingGraphicsDoc } from './renderingGraphicsDoc.js';
import { mathGeometryRngDoc } from './mathGeometryRngDoc.js';
import { examplesCookbookDoc } from './examplesCookbookDoc.js';

export const allDocs = [
  gettingStartedDoc,
  worldObjectsDoc,
  uiSystemDoc,
  stateSaveDoc,
  eventsActionsDoc,
  sequenceDoc,
  assetsAudioDoc,
  renderingGraphicsDoc,
  mathGeometryRngDoc,
  examplesCookbookDoc,
];

export function searchDocs(query) {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();

  const results = [];

  for (const doc of allDocs) {
    for (const section of doc.sections) {
      let score = 0;

      if (doc.title.toLowerCase().includes(q)) score += 10;
      if (section.title.toLowerCase().includes(q)) score += 8;
      if (section.content.toLowerCase().includes(q)) score += 3;

      if (section.codeExample && section.codeExample.code.toLowerCase().includes(q)) {
        score += 5;
      }
      if (section.codeExamples) {
        for (const ex of section.codeExamples) {
          if (ex.code.toLowerCase().includes(q) || ex.title?.toLowerCase().includes(q)) {
            score += 5;
          }
        }
      }

      if (section.apiTable) {
        for (const row of section.apiTable.rows) {
          if (row.some((cell) => cell.toLowerCase().includes(q))) {
            score += 6;
          }
        }
      }

      if (score > 0) {
        results.push({
          docId: doc.id,
          docTitle: doc.title,
          sectionId: section.id,
          sectionTitle: section.title,
          snippet: section.content.slice(0, 140) + '...',
          score,
        });
      }

      // Index subsections if present
      if (section.subsections) {
        for (const sub of section.subsections) {
          let subScore = 0;
          if (sub.title.toLowerCase().includes(q)) subScore += 9;
          if (sub.content.toLowerCase().includes(q)) subScore += 4;
          if (sub.codeExample && sub.codeExample.code.toLowerCase().includes(q)) {
            subScore += 5;
          }
          if (sub.codeExamples) {
            for (const ex of sub.codeExamples) {
              if (ex.code.toLowerCase().includes(q) || ex.title?.toLowerCase().includes(q)) {
                subScore += 5;
              }
            }
          }
          if (sub.apiTable) {
            for (const row of sub.apiTable.rows) {
              if (row.some((cell) => cell.toLowerCase().includes(q))) {
                subScore += 6;
              }
            }
          }
          if (subScore > 0) {
            results.push({
              docId: doc.id,
              docTitle: doc.title,
              sectionId: sub.id,
              sectionTitle: `${section.title} → ${sub.title}`,
              snippet: sub.content.slice(0, 140) + '...',
              score: subScore,
            });
          }
        }
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
