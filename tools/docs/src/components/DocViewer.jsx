import React, { useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { Callout } from "./Callout";
import { ApiTable } from "./ApiTable";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { TableOfContents } from "./TableOfContents";
import { FeatureGrid } from "./FeatureGrid";
import { PipelineFlow } from "./PipelineFlow";
import { ContextFieldsGrid } from "./ContextFieldsGrid";
import { RichTextPlayground } from "./Playgrounds/RichTextPlayground";
import { SequencePlayground } from "./Playgrounds/SequencePlayground";
import { LayoutPlayground } from "./Playgrounds/LayoutPlayground";
import { ArrowLeft, ArrowRight, Copy, Check } from "lucide-react";

const ENGINE_LIFECYCLE_STEPS = [
  {
    title: "Reset Skali UI",
    tag: "Frame Start",
    description:
      "Przywrócenie skali UI do domyślnej 1.0 (set_ui_scale(1.0, ZERO)) na początku klatki.",
  },
  {
    title: "Przejścia Scen & Callbacki on_enter",
    tag: "Scene System",
    description:
      "Wykonanie oczekujących żądań switch_scene, emisja SceneChanged oraz wywołanie on_enter.",
  },
  {
    title: "Wirtualna Rozdzielczość & Mysz",
    tag: "Input Remap",
    description:
      "Remapowanie wektora myszy w ctx.input z uwzględnieniem offsetu i skali letterboksu.",
  },
  {
    title: "Aktualizacja Kamery & Wstrząsów",
    tag: "Camera 2D",
    description:
      "Przeliczenie macierzy widoku, tłumienie i losowanie przesunięć shake.",
  },
  {
    title: "Aktualizacja Logiki Świata",
    tag: "World Logic Pass",
    description:
      "Wywołanie world.update(&mut ctx) dla warstw objects, ui_objects, logic oraz sequences.",
  },
  {
    title: "Czyszczenie Tła Screen Pass",
    tag: "Clear Screen",
    description: "Wywołanie clear_background(background_color) w buforze GPU.",
  },
  {
    title: "Renderowanie Świata & UI (Virtual vs Native)",
    tag: "Render Pass",
    description:
      "Rysowanie świata do render targetu VRT, blitting z letterboxingiem i rysowanie tekstu w natywnej rozdzielczości.",
  },
  {
    title: "Overlay Kursora & Oczekiwanie",
    tag: "Frame End",
    description:
      "Narysowanie CustomCursor i wywołanie async next_frame().await.",
  },
];

const BEHAVIOR_WRAPPER_CARDS = [
  {
    title: "Behavior<Inner, Data>",
    badge: "Generic Wrapper",
    description:
      "Łączy dowolny obiekt rysowalny (Inner: Object), własne dane (Data) oraz opcjonalny update closure.",
    code: "Behavior::new(sprite, data).update(...)",
  },
  {
    title: "GameObject<Data>",
    badge: "Sprite + State",
    description:
      "Skrót dla Behavior<Sprite, Data>. Dostęp do pól Sprite przez Deref (position, color, click_ctx).",
    code: "obj.position.x += 1.0;",
  },
  {
    title: "LogicObject<Data>",
    badge: "Invisible Controller",
    description:
      "Niewidzialny obiekt logiki wywoływany w klatce bez kosztów renderowania.",
    code: "LogicObject::logic(data).update(...)",
  },
];

const WORLD_LAYERS_CARDS = [
  {
    title: "objects",
    badge: "2D World Layer",
    description:
      "Obiekty renderowane w przestrzeni świata 2D przez kamerę (duszki, tilemapy, cząsteczki).",
    code: "world.add(sprite)",
  },
  {
    title: "ui_objects",
    badge: "Screen Layer",
    description:
      "Obiekty UI renderowane w przestrzeni ekranu (panele, przyciski, paski postępu, logi).",
    code: "world.add_ui(panel)",
  },
  {
    title: "logic",
    badge: "Logic Layer",
    description:
      "Niewidzialne kontrolery systemowe aktualizowane co klatkę bez kosztu rysowania.",
    code: "world.add_logic(controller)",
  },
];

export function DocViewer({
  doc,
  allDocs,
  onNavigateDoc,
  activeSectionId,
  onSelectSection,
}) {
  const [copiedPage, setCopiedPage] = useState(false);

  if (!doc) return null;

  const currentIdx = allDocs.findIndex((d) => d.id === doc.id);
  const prevDoc = currentIdx > 0 ? allDocs[currentIdx - 1] : null;
  const nextDoc =
    currentIdx < allDocs.length - 1 ? allDocs[currentIdx + 1] : null;

  const handleCopyPageLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedPage(true);
    setTimeout(() => setCopiedPage(false), 2000);
  };

  return (
    <div className="flex-1 flex justify-between max-w-7xl mx-auto w-full min-w-0">
      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl overflow-y-auto w-full min-w-0">
        {/* Breadcrumb & Header */}
        <div className="mb-8 pb-6 border-b border-zinc-800/80">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 min-w-0">
              <span>Docs</span>
              <span>/</span>
              <span className="text-zinc-200 truncate">{doc.title}</span>
            </div>

            <button
              onClick={handleCopyPageLink}
              className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md text-xs text-zinc-300 transition-colors cursor-pointer shrink-0"
            >
              {copiedPage ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">
                    Skopiowano link
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Kopiuj link</span>
                </>
              )}
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight mb-2.5">
            {doc.title}
          </h1>
          <p className="text-[14px] sm:text-[15px] text-zinc-300 leading-relaxed font-normal">
            {doc.description}
          </p>
        </div>

        {/* Render Sections */}
        <div className="space-y-10">
          {doc.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-20">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 mb-3 tracking-tight flex items-center gap-2 border-b border-zinc-800/60 pb-2 mt-1">
                <span>{section.title}</span>
              </h2>

              <div className="my-3">
                <MarkdownRenderer content={section.content} />
              </div>

              {/* Custom Visual Cards & Flow Component Extensions */}
              {doc.id === "getting-started" &&
                section.id === "engine-lifecycle" && (
                  <PipelineFlow steps={ENGINE_LIFECYCLE_STEPS} />
                )}

              {doc.id === "getting-started" &&
                section.id === "context-struct" && <ContextFieldsGrid />}

              {doc.id === "world-objects" &&
                section.id === "world-structure" && (
                  <FeatureGrid items={WORLD_LAYERS_CARDS} />
                )}

              {doc.id === "world-objects" &&
                section.id === "behavior-and-wrappers" && (
                  <FeatureGrid items={BEHAVIOR_WRAPPER_CARDS} />
                )}

              {/* Callouts */}
              {section.callouts &&
                section.callouts.map((call, idx) => (
                  <Callout
                    key={idx}
                    type={call.type}
                    title={call.title}
                    text={call.text}
                  />
                ))}

              {/* Code Examples */}
              {section.codeExample && (
                <CodeBlock
                  title={section.codeExample.title}
                  code={section.codeExample.code}
                  language={section.codeExample.language}
                  collapsible={section.codeExample.collapsible}
                  defaultCollapsed={section.codeExample.defaultCollapsed}
                />
              )}
              {section.codeExamples &&
                section.codeExamples.map((ex, exIdx) => (
                  <CodeBlock
                    key={exIdx}
                    title={ex.title}
                    code={ex.code}
                    language={ex.language}
                    collapsible={ex.collapsible}
                    defaultCollapsed={ex.defaultCollapsed}
                  />
                ))}

              {/* API Table */}
              {section.apiTable && (
                <ApiTable
                  headers={section.apiTable.headers}
                  rows={section.apiTable.rows}
                />
              )}

              {/* Interactive Playgrounds */}
              {doc.id === "ui-system" && section.id === "widgets-overview" && (
                <RichTextPlayground />
              )}
              {doc.id === "ui-system" && section.id === "flexbox-layout" && (
                <LayoutPlayground />
              )}
              {doc.id === "sequence" && section.id === "sequence-overview" && (
                <SequencePlayground />
              )}

              {/* Subsections */}
              {section.subsections && section.subsections.length > 0 && (
                <div className="mt-6 space-y-6 pl-4 border-l border-zinc-800/80 ml-1">
                  {section.subsections.map((sub) => (
                    <div key={sub.id} id={sub.id} className="scroll-mt-20">
                      <h3 className="text-base sm:text-lg font-bold text-zinc-100 mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>{sub.title}</span>
                      </h3>

                      <div className="my-2">
                        <MarkdownRenderer content={sub.content} />
                      </div>

                      {sub.callouts &&
                        sub.callouts.map((call, idx) => (
                          <Callout
                            key={idx}
                            type={call.type}
                            title={call.title}
                            text={call.text}
                          />
                        ))}

                      {sub.codeExample && (
                        <CodeBlock
                          title={sub.codeExample.title}
                          code={sub.codeExample.code}
                          language={sub.codeExample.language}
                          collapsible={sub.codeExample.collapsible}
                          defaultCollapsed={sub.codeExample.defaultCollapsed}
                        />
                      )}
                      {sub.codeExamples &&
                        sub.codeExamples.map((ex, exIdx) => (
                          <CodeBlock
                            key={exIdx}
                            title={ex.title}
                            code={ex.code}
                            language={ex.language}
                            collapsible={ex.collapsible}
                            defaultCollapsed={ex.defaultCollapsed}
                          />
                        ))}

                      {sub.apiTable && (
                        <ApiTable
                          headers={sub.apiTable.headers}
                          rows={sub.apiTable.rows}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Footer Pagination */}
        <div className="mt-16 pt-8 border-t border-zinc-800/80 flex items-center justify-between gap-4 flex-wrap">
          {prevDoc ? (
            <button
              onClick={() => onNavigateDoc(prevDoc.id)}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-left transition-all cursor-pointer group flex-1 min-w-[200px]"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:-translate-x-1 transition-transform shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  Poprzedni
                </div>
                <div className="text-xs font-bold text-zinc-200 truncate">
                  {prevDoc.title}
                </div>
              </div>
            </button>
          ) : (
            <div />
          )}

          {nextDoc ? (
            <button
              onClick={() => onNavigateDoc(nextDoc.id)}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-right transition-all cursor-pointer group flex-1 min-w-[200px] justify-end"
            >
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  Następny
                </div>
                <div className="text-xs font-bold text-zinc-200 truncate">
                  {nextDoc.title}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </main>

      {/* Right Sidebar: Table of Contents ("Na tej stronie") */}
      <TableOfContents
        sections={doc.sections}
        activeSectionId={activeSectionId}
        onSelectSection={onSelectSection}
      />
    </div>
  );
}
