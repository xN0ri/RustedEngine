import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronRight, CornerDownLeft, Hash } from 'lucide-react';
import { searchDocs } from '../data/docsData';

function Highlight({ text, query }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-amber-500/25 text-amber-300 rounded px-0.5 font-semibold not-italic">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function SearchModal({ isOpen, onClose, onSelectResult }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resultsContainerRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
      setSelectedIndex(0);
    } else {
      const res = searchDocs(query);
      setResults(res);
      setSelectedIndex(0);
    }
  }, [query]);

  // Auto-scroll selected result into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        if (results.length > 0 && results[selectedIndex]) {
          e.preventDefault();
          const item = results[selectedIndex];
          onSelectResult(item.docId, item.sectionId);
          onClose();
          setQuery('');
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, results, selectedIndex, onSelectResult]);

  // Reset query on close
  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 p-4 select-none"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] section-fade-in">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj struktur, metod, zdarzeń, mechanik..."
            autoFocus
            className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none text-sm font-medium"
          />
          {query && (
            <div className="flex items-center gap-2 shrink-0">
              {results.length > 0 && (
                <span className="text-[11px] font-mono text-zinc-500">
                  {results.length} wyników
                </span>
              )}
              <button
                onClick={() => setQuery('')}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Results List */}
        <div ref={resultsContainerRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {query.trim() === '' ? (
            <div className="py-10 text-center space-y-3">
              <Search className="w-8 h-8 text-zinc-700 mx-auto" />
              <p className="text-zinc-500 text-xs">
                Wpisz frazę, np.{' '}
                <span className="text-amber-400 font-mono">EventBus</span>,{' '}
                <span className="text-amber-400 font-mono">Resources</span>,{' '}
                <span className="text-amber-400 font-mono">SaveSystem</span>
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-zinc-400 text-sm font-medium">Brak wyników</p>
              <p className="text-zinc-600 text-xs">dla &quot;{query}&quot;</p>
            </div>
          ) : (
            results.map((res, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={idx}
                  ref={isSelected ? selectedRef : null}
                  onClick={() => {
                    onSelectResult(res.docId, res.sectionId);
                    onClose();
                    setQuery('');
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-zinc-900 border-amber-500/50 shadow-sm'
                      : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800/60 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                        {res.docTitle}
                      </span>
                      <ChevronRight className="w-3 h-3 text-zinc-700 shrink-0" />
                      <span className="text-xs font-semibold text-zinc-300 truncate">
                        <Highlight text={res.sectionTitle} query={query} />
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isSelected && (
                        <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                          <CornerDownLeft className="w-3 h-3 text-amber-500" />
                        </span>
                      )}
                      <Hash className="w-3 h-3 text-zinc-700" />
                    </div>
                  </div>
                  <p className="text-[11.5px] text-zinc-500 line-clamp-2 leading-relaxed">
                    <Highlight text={res.snippet} query={query} />
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between text-[10px] text-zinc-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-zinc-500">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-zinc-500">↓</kbd>
              nawigacja
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-zinc-500">Enter</kbd>
              wybierz
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-zinc-500">Esc</kbd>
              zamknij
            </span>
          </div>
          <span className="font-mono text-zinc-700">rusted_engine v1.0</span>
        </div>
      </div>
    </div>
  );
}
