import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  BookOpen,
  Database,
  Zap,
  Layers,
  Crosshair,
  Gamepad2,
  X,
} from "lucide-react";

const CATEGORIES = [
  {
    id: "core",
    title: "Architektura & Rdzeń",
    icon: BookOpen,
    accent: "text-sky-400",
    dotColor: "#38bdf8",
    docIds: [
      "quickstart",
      "lifecycle",
      "context",
      "world-layers",
      "behavior",
      "architecture-best-practices",
    ],
  },
  {
    id: "data",
    title: "Stan, Dane & Zapis",
    icon: Database,
    accent: "text-amber-400",
    dotColor: "#f59e0b",
    docIds: [
      "entity-data",
      "resources",
      "state-store",
      "datasets-pipeline",
      "save-system",
    ],
  },
  {
    id: "logic",
    title: "Logika, Zdarzenia & Wejście",
    icon: Zap,
    accent: "text-yellow-400",
    dotColor: "#facc15",
    docIds: [
      "event-bus",
      "input-actions",
      "triggers",
      "sequences",
      "tweens-timers",
      "math-geometry",
      "rng-procedural",
    ],
  },
  {
    id: "graphics",
    title: "Grafika, UI & Audio",
    icon: Layers,
    accent: "text-emerald-400",
    dotColor: "#34d399",
    docIds: [
      "camera",
      "virtual-resolution",
      "postprocess",
      "animated-sprite",
      "bitmap-font",
      "tilemaps",
      "particles",
      "ui-widgets",
      "ui-image",
      "ui-layout",
      "panel-manager",
      "audio-sfx",
    ],
  },
  {
    id: "mechanics",
    title: "Gotowe Mechaniki Gry",
    icon: Crosshair,
    accent: "text-rose-400",
    dotColor: "#fb7185",
    docIds: [
      "melee-combat",
      "shooting-weapons",
      "inventory-system",
      "turn-system",
      "enemy-ai",
      "twin-stick-roguelike",
      "spatial-queries-detection",
    ],
  },
  {
    id: "games",
    title: "Kompletne Gry",
    icon: Gamepad2,
    accent: "text-purple-400",
    dotColor: "#c084fc",
    docIds: ["game-survivor", "game-rpg-quest", "game-platformer"],
  },
];

export function Sidebar({
  docs,
  activeDocId,
  onSelectDoc,
  activeSectionId,
  onSelectSection,
  isOpen,
  onClose,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return docs;
    const q = searchQuery.toLowerCase().trim();
    return docs.filter((doc) => {
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchDesc = doc.description?.toLowerCase().includes(q);
      const matchSection = doc.sections?.some((s) =>
        s.title.toLowerCase().includes(q),
      );
      return matchTitle || matchDesc || matchSection;
    });
  }, [docs, searchQuery]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      <aside
        className={`w-76 lg:w-80 border-r border-zinc-800/80 bg-zinc-950/95 md:bg-zinc-950/80 backdrop-blur-md flex flex-col h-[calc(100vh-3.5rem)] select-none shrink-0 overflow-y-auto p-3.5 transition-transform duration-200 z-40 ${
          isOpen
            ? "fixed left-0 top-14 translate-x-0"
            : "fixed -translate-x-full md:translate-x-0 md:sticky md:top-14"
        }`}
      >
        {/* Search */}
        <div className="mb-4">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Filtruj tematy i API..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-7 py-2 bg-zinc-900/90 hover:bg-zinc-900 focus:bg-zinc-900 border border-zinc-800 focus:border-amber-500/60 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Categorized List */}
        <div className="space-y-4 flex-1">
          {CATEGORIES.map((cat, idx) => {
            const categoryDocs = filteredDocs.filter((d) =>
              cat.docIds.includes(d.id),
            );
            if (categoryDocs.length === 0) return null;

            const Icon = cat.icon;
            const hasActiveCat = categoryDocs.some((d) => d.id === activeDocId);

            return (
              <div
                key={cat.id}
                className={`space-y-1 ${idx > 0 ? "pt-3.5 border-t border-zinc-800/80" : ""}`}
              >
                {/* Category Header */}
                <div className="flex items-center justify-between px-2 pt-1.5 pb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${cat.accent}`} />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300/95">
                      {cat.title}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md border ${
                      hasActiveCat
                        ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                        : "text-zinc-600 bg-zinc-900/60 border-zinc-800/60"
                    }`}
                  >
                    {categoryDocs.length}
                  </span>
                </div>

                {/* Docs in Category */}
                <div className="space-y-0.5 pl-0.5">
                  {categoryDocs.map((doc) => {
                    const isActive = activeDocId === doc.id;

                    return (
                      <div key={doc.id} className="space-y-0.5">
                        <button
                          onClick={() => {
                            onSelectDoc(doc.id);
                            if (onClose) onClose();
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer group ${
                            isActive
                              ? "bg-zinc-800/90 text-zinc-100 font-semibold shadow-xs border border-zinc-700/70"
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                          }`}
                        >
                          {/* Active indicator dot */}
                          {isActive ? (
                            <span
                              className="sidebar-active-dot shrink-0"
                              style={{
                                background: `radial-gradient(circle, ${cat.dotColor}, #f59e0b)`,
                                boxShadow: `0 0 6px ${cat.dotColor}99`,
                              }}
                            />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 group-hover:bg-zinc-600 transition-colors shrink-0" />
                          )}

                          <span className="truncate flex-1 pr-1">{doc.title}</span>

                          {isActive &&
                          doc.sections &&
                          doc.sections.length > 1 ? (
                            <ChevronDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? "text-amber-400" : "text-zinc-700 group-hover:text-zinc-500"}`} />
                          )}
                        </button>

                        {/* Active Document Sections */}
                        {isActive &&
                          doc.sections &&
                          doc.sections.length > 1 && (
                            <div className="pl-2.5 py-1 space-y-0.5 border-l-2 border-zinc-800/90 ml-3.5 my-1"
                              style={{ borderColor: `${cat.dotColor}33` }}
                            >
                              {doc.sections.map((sec, secIdx) => (
                                <button
                                  key={sec.id}
                                  onClick={() => {
                                    if (onSelectSection)
                                      onSelectSection(sec.id);
                                    if (onClose) onClose();
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11.5px] transition-all flex items-center gap-2 cursor-pointer ${
                                    activeSectionId === sec.id
                                      ? "text-amber-400 font-semibold bg-amber-500/10"
                                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/40"
                                  }`}
                                >
                                  <span className="text-[10px] font-mono text-zinc-700 shrink-0 w-4 text-right">
                                    {secIdx + 1}
                                  </span>
                                  <span className="truncate">{sec.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Fallback for any docs not explicitly in CATEGORIES */}
          {(() => {
            const allCategorizedIds = new Set(CATEGORIES.flatMap((c) => c.docIds));
            const uncategorizedDocs = filteredDocs.filter((d) => !allCategorizedIds.has(d.id));
            if (uncategorizedDocs.length === 0) return null;

            return (
              <div className="space-y-1 pt-3.5 border-t border-zinc-800/80">
                <div className="flex items-center justify-between px-2 pt-1.5 pb-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300/95">
                      Pozostałe Dokumenty
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md border text-zinc-400 bg-zinc-900/60 border-zinc-800/60">
                    {uncategorizedDocs.length}
                  </span>
                </div>
                <div className="space-y-0.5 pl-0.5">
                  {uncategorizedDocs.map((doc) => {
                    const isActive = activeDocId === doc.id;
                    return (
                      <div key={doc.id} className="space-y-0.5">
                        <button
                          onClick={() => {
                            onSelectDoc(doc.id);
                            if (onClose) onClose();
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer group ${
                            isActive
                              ? "bg-zinc-800/90 text-zinc-100 font-semibold shadow-xs border border-zinc-700/70"
                              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-zinc-500" />
                          <span className="truncate flex-1">{doc.title}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer Meta */}
        <div className="pt-3 mt-4 border-t border-zinc-800/80">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-2">
            <span className="text-zinc-500">RustedEngine</span>
            <span className="font-mono text-amber-400 font-semibold bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-[11px]">
              v1.0.0
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
