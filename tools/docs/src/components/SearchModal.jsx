import React, { useState, useEffect } from 'react';
import { Search, X, BookOpen, ChevronRight, CornerDownLeft } from 'lucide-react';
import { searchDocs } from '../data/docsData';

export function SearchModal({ isOpen, onClose, onSelectResult }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
    } else {
      setResults(searchDocs(query));
    }
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 p-4 select-none">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj struktur, metod, porad pro tip, zapisu, zdarzeń..."
            autoFocus
            className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none text-sm font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {query.trim() === '' ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              Wpisz frazę wyszukiwania (np. <span className="text-amber-400 font-mono">Behavior</span>, <span className="text-amber-400 font-mono">SaveSystem</span>, <span className="text-amber-400 font-mono">EventBus</span>, <span className="text-amber-400 font-mono">BitmapFont</span>)...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs">
              Brak wyników wyszukiwania dla &quot;{query}&quot;.
            </div>
          ) : (
            results.map((res, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectResult(res.docId, res.sectionId);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {res.docTitle}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-xs font-bold text-zinc-200">{res.sectionTitle}</span>
                  </div>
                  <CornerDownLeft className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">{res.snippet}</p>
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500">
          <span>Wymagany klawisz: <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[10px] text-zinc-400">ESC</kbd> aby zamknąć</span>
          <span className="font-mono text-[10px]">rusted_engine v0.5.0</span>
        </div>
      </div>
    </div>
  );
}
