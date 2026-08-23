import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function Sidebar({ docs, activeDocId, onSelectDoc, activeSectionId, onSelectSection, isOpen, onClose }) {
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
        className={`w-64 border-r border-zinc-800/80 bg-zinc-950/95 md:bg-zinc-950/60 backdrop-blur-md flex flex-col h-[calc(100vh-3.5rem)] select-none shrink-0 overflow-y-auto p-3 transition-transform duration-200 z-40 ${
          isOpen ? 'fixed left-0 top-14 translate-x-0' : 'fixed -translate-x-full md:translate-x-0 md:sticky md:top-14'
        }`}
      >
        <div className="space-y-6">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 px-2">
              Sekcje Dokumentacji
            </div>
            <div className="space-y-1">
              {docs.map((doc) => {
                const isActive = activeDocId === doc.id;
                return (
                  <div key={doc.id} className="space-y-0.5">
                    <button
                      onClick={() => {
                        onSelectDoc(doc.id);
                        if (onClose) onClose();
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-zinc-800/90 text-zinc-100 font-semibold shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                      }`}
                    >
                      <span className="truncate">{doc.title}</span>
                      {isActive ? (
                        <ChevronDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      )}
                    </button>

                    {isActive && doc.sections && doc.sections.length > 0 && (
                      <div className="pl-3 py-1 space-y-0.5 border-l border-zinc-800/80 ml-3">
                        {doc.sections.map((sec) => (
                          <button
                            key={sec.id}
                            onClick={() => {
                              if (onSelectSection) onSelectSection(sec.id);
                              if (onClose) onClose();
                            }}
                            className={`w-full text-left px-2 py-1 rounded text-[11px] transition-all truncate block cursor-pointer ${
                              activeSectionId === sec.id
                                ? 'text-amber-400 font-medium bg-amber-500/10'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                            }`}
                          >
                            {sec.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 px-2">
              Szybkie Zasoby
            </div>
            <div className="space-y-1 text-xs text-zinc-400 px-2">
              <div className="py-1 flex items-center justify-between text-zinc-400">
                <span>Wersja Silnika</span>
                <span className="font-mono text-zinc-300">0.5.0</span>
              </div>
              <div className="py-1 flex items-center justify-between text-zinc-400">
                <span>Framework 2D</span>
                <span className="font-mono text-emerald-400">Macroquad</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
