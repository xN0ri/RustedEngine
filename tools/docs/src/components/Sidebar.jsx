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
    docIds: ["quickstart", "lifecycle", "context", "world-layers", "behaviors"],
  },
  {
    id: "data",
    title: "Stan, Dane & Zapis",
    icon: Database,
    accent: "text-amber-400",
    docIds: [
      "entity-data",
      "resources",
      "state-store",
      "content-pipeline",
      "save-system",
    ],
  },
  {
    id: "logic",
    title: "Logika, Zdarzenia & Wejście",
    icon: Zap,
    accent: "text-yellow-400",
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
    docIds: [
      "camera",
      "virtual-resolution",
      "tilemaps",
      "particles",
      "ui-widgets",
      "ui-layout",
      "audio-sfx",
    ],
  },
  {
    id: "mechanics",
    title: "Gotowe Mechaniki Gry",
    icon: Crosshair,
    accent: "text-rose-400",
    docIds: [
      "melee-combat",
      "shooting-weapons",
      "inventory-system",
      "turn-system",
      "enemy-ai",
    ],
  },
  {
    id: "games",
    title: "Kompletne Gry",
    icon: Gamepad2,
    accent: "text-purple-400",
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

  // Szybkie filtrowanie tematów
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
        {/* Instant Clean Filter */}
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

        {/* Categorized List with Distinct Sections */}
        <div className="space-y-4 flex-1">
          {CATEGORIES.map((cat, idx) => {
            const categoryDocs = filteredDocs.filter((d) =>
              cat.docIds.includes(d.id),
            );
            if (categoryDocs.length === 0) return null;

            const Icon = cat.icon;

            return (
              <div
                key={cat.id}
                className={`space-y-1.5 ${
                  idx > 0 ? "pt-3.5 border-t border-zinc-800/80" : ""
                }`}
              >
                {/* Clean Typographic Category Header */}
                <div className="flex items-center justify-between px-2 pt-2 pb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${cat.accent}`} />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300/95">
                      {cat.title}
                    </span>
                  </div>
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
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer group ${
                            isActive
                              ? "bg-zinc-800/90 text-zinc-100 font-semibold shadow-xs border border-zinc-700/70"
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                          }`}
                        >
                          <span className="truncate pr-1">{doc.title}</span>
                          {isActive &&
                          doc.sections &&
                          doc.sections.length > 1 ? (
                            <ChevronDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : isActive ? (
                            <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 shrink-0" />
                          )}
                        </button>

                        {/* Active Document Sections (if multiple) */}
                        {isActive &&
                          doc.sections &&
                          doc.sections.length > 1 && (
                            <div className="pl-2.5 py-1 space-y-0.5 border-l border-zinc-800/90 ml-3.5 my-1">
                              {doc.sections.map((sec, secIdx) => (
                                <button
                                  key={sec.id}
                                  onClick={() => {
                                    if (onSelectSection)
                                      onSelectSection(sec.id);
                                    if (onClose) onClose();
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11.5px] transition-all flex items-center gap-1.5 cursor-pointer ${
                                    activeSectionId === sec.id
                                      ? "text-amber-400 font-semibold bg-amber-500/10"
                                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                                  }`}
                                >
                                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                    §{secIdx + 1}
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
        </div>

        {/* Footer Meta */}
        <div className="pt-3 mt-4 border-t border-zinc-800/80">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-2">
            <span>RustedEngine</span>
            <span className="font-mono text-amber-400 font-semibold bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-[11px]">
              v1.0.0
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
