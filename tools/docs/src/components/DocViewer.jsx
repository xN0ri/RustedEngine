import React, { useState, useEffect } from "react";
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
import { ArrowLeft, ArrowRight, Copy, Check, ArrowUp, Link2, ArrowUpRight, Clock } from "lucide-react";

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
  onNavigateTo,
  activeSectionId,
  onSelectSection,
}) {
  const [copiedPage, setCopiedPage] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  const navigateFn = onNavigateTo || onNavigateDoc;

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      setShowScrollTop(scrollTop > 350);
      setReadingProgress(progress);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!doc) return null;

  const currentIdx = allDocs.findIndex((d) => d.id === doc.id);
  const prevDoc = currentIdx > 0 ? allDocs[currentIdx - 1] : null;
  const nextDoc =
    currentIdx < allDocs.length - 1 ? allDocs[currentIdx + 1] : null;

  // Estimated read time: ~200 words per minute
  const totalText = doc.sections?.map(s => (s.content || '') + (s.subsections?.map(ss => ss.content || '').join(' ') || '')).join(' ') || '';
  const wordCount = totalText.trim().split(/\s+/).length;
  const readMinutes = Math.max(1, Math.round(wordCount / 200));

  const handleCopyPageLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedPage(true);
    setTimeout(() => setCopiedPage(false), 2000);
  };

  return (
    <div className="flex-1 flex min-w-0 bg-[#09090b]">
      {/* Reading Progress Bar */}
      <div
        className="reading-progress"
        style={{ width: `${readingProgress}%` }}
      />
      {/* Main Content Area */}
      <main className="flex-1 min-w-0 max-w-4xl px-4 sm:px-8 py-8 mx-auto">
        {/* Breadcrumb & Quick Actions */}
        <div className="flex items-center justify-between gap-4 mb-6 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="text-zinc-500">Docs</span>
            <span>/</span>
            <span className="text-zinc-200 font-semibold truncate">
              {doc.title}
            </span>
          </div>

          <button
            onClick={handleCopyPageLink}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer shrink-0"
            title="Kopiuj link do strony"
          >
            {copiedPage ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Skopiowano link</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Kopiuj link</span>
              </>
            )}
          </button>
        </div>

        {/* Document Header */}
        <div className="mb-10 pb-6 border-b border-zinc-800/80">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              {doc.title}
            </h1>
            {doc.badge && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                {doc.badge}
              </span>
            )}
          </div>
          <p className="text-[14px] sm:text-[15px] text-zinc-300 leading-relaxed font-normal mb-3">
            {doc.description}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Clock className="w-3 h-3" />
            <span>~{readMinutes} min czytania</span>
            <span className="mx-1 opacity-40">·</span>
            <span>{doc.sections?.length || 0} sekcji</span>
          </div>
        </div>

        {/* Render Sections */}
        <div className="space-y-10">
          {doc.sections.map((section, secIdx) => (
            <section key={section.id} id={section.id} className="scroll-mt-20 section-fade-in" style={{ animationDelay: `${secIdx * 0.04}s` }}>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 mb-3 tracking-tight flex items-center gap-2.5 border-b border-zinc-800/60 pb-2 mt-1">
                <span className="section-accent-bar" />
                <span>{section.title}</span>
                <span className="ml-auto text-[10px] font-mono text-zinc-700 font-normal hidden sm:inline">§{secIdx + 1}</span>
              </h2>

              <div className="my-3">
                <MarkdownRenderer content={section.content} onNavigate={navigateFn} />
              </div>

              {/* Custom Visual Cards & Flow Component Extensions */}
              {(doc.id === "getting-started" || doc.id === "lifecycle" || doc.id === "quickstart") &&
                (section.id === "engine-lifecycle" || section.id === "lifecycle-order" || section.id === "lifecycle-main") && (
                  <PipelineFlow steps={ENGINE_LIFECYCLE_STEPS} />
                )}

              {(doc.id === "getting-started" || doc.id === "context") &&
                (section.id === "context-struct" || section.id === "context-main" || section.id === "context-shortcuts") && (
                  <ContextFieldsGrid />
                )}

              {(doc.id === "world-objects" || doc.id === "world-layers") &&
                (section.id === "world-structure" || section.id === "world-layers-main" || section.id === "layers-overview") && (
                  <FeatureGrid items={WORLD_LAYERS_CARDS} />
                )}

              {(doc.id === "world-objects" || doc.id === "behavior") &&
                (section.id === "behavior-and-wrappers" || section.id === "behavior-main") && (
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

              {/* Related Topics / Cross-Links */}
              {section.related && section.related.length > 0 && (
                <div className="my-6 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Powiązane Rozdziały & Szczegółowe Informacje</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {section.related.map((rel, rIdx) => (
                      <button
                        key={rIdx}
                        onClick={() => navigateFn(rel.docId, rel.sectionId)}
                        className="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-950/80 hover:bg-zinc-800/90 border border-zinc-800/90 hover:border-amber-500/40 text-left transition-all cursor-pointer group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-zinc-200 group-hover:text-amber-400 flex items-center justify-between">
                            <span className="truncate">{rel.title}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
                          </div>
                          {rel.description && (
                            <p className="text-[11.5px] text-zinc-400 line-clamp-1 mt-0.5">
                              {rel.description}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* API Table */}
              {section.apiTable && (
                <ApiTable
                  headers={section.apiTable.headers}
                  rows={section.apiTable.rows}
                />
              )}

              {/* Interactive Playgrounds */}
              {(doc.id === "ui-system" || doc.id === "ui-widgets" || doc.id === "ui-image") &&
                (section.id === "widgets-overview" || section.id === "ui-widgets-main" || section.id === "rich-text-bbcode" || section.id === "widgets-text-bbcode") && (
                  <RichTextPlayground />
                )}
              {(doc.id === "ui-system" || doc.id === "ui-layout") &&
                (section.id === "flexbox-layout" || section.id === "ui-layout-main" || section.id === "layout-containers") && (
                  <LayoutPlayground />
                )}
              {(doc.id === "sequence" || doc.id === "sequences") &&
                (section.id === "sequence-overview" || section.id === "sequences-main") && (
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
              className="pagination-btn flex items-center gap-3 p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left cursor-pointer group flex-1 min-w-[200px]"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-400 group-hover:-translate-x-1 transition-transform shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  Poprzedni
                </div>
                <div className="text-xs font-bold text-zinc-200 truncate group-hover:text-amber-400 transition-colors">
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
              className="pagination-btn flex items-center gap-3 p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-right cursor-pointer group flex-1 min-w-[200px] justify-end"
            >
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  Następny
                </div>
                <div className="text-xs font-bold text-zinc-200 truncate group-hover:text-amber-400 transition-colors">
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

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-30 p-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-amber-400 shadow-xl transition-all cursor-pointer backdrop-blur-sm"
          title="Przewiń na górę strony"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* Right Sidebar: Table of Contents ("Na tej stronie") */}
      <TableOfContents
        sections={doc.sections}
        activeSectionId={activeSectionId}
        onSelectSection={onSelectSection}
      />
    </div>
  );
}
