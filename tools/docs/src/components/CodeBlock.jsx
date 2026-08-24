import React, { useState } from 'react';
import { Check, Copy, Code, ChevronDown, ChevronRight } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-javascript';

export function CodeBlock({ title, code, language = 'rust', collapsible = false, defaultCollapsed = true }) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!collapsible || !defaultCollapsed);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lang = (language || 'rust').toLowerCase();
  const grammar = Prism.languages[lang] || Prism.languages.rust || Prism.languages.clike;
  const highlightedCode = grammar ? Prism.highlight(code, grammar, lang) : code;

  return (
    <div className="my-5 rounded-xl border border-zinc-800/90 bg-[#090a0f] overflow-hidden shadow-lg transition-all">
      <div
        onClick={collapsible ? () => setIsExpanded((prev) => !prev) : undefined}
        className={`px-3.5 sm:px-4 py-2.5 bg-zinc-900/95 border-b border-zinc-800/80 flex items-center justify-between select-none ${
          collapsible ? 'cursor-pointer hover:bg-zinc-900 transition-colors' : ''
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {collapsible ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-amber-400 shrink-0 transition-transform" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0 transition-transform" />
            )
          ) : (
            <Code className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[12px] sm:text-xs font-semibold text-zinc-200 font-mono tracking-tight truncate">
              {title || language}
            </span>
            {collapsible && (
              <span className="text-[10px] text-zinc-400 font-normal border border-zinc-700/60 px-1.5 py-0.5 rounded bg-zinc-950/80 shrink-0">
                {isExpanded ? 'Zwiń' : 'Rozwiń'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[10.5px] uppercase font-mono font-bold tracking-wider text-zinc-400 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800 hidden sm:inline-block">
            {lang}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-300 hover:text-zinc-100 bg-zinc-800/80 hover:bg-zinc-700/80 rounded-md border border-zinc-700/70 transition-colors cursor-pointer"
            title="Kopiuj kod do schowka"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Skopiowano</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Kopiuj</span>
              </>
            )}
          </button>
        </div>
      </div>

      {(!collapsible || isExpanded) && (
        <pre className="p-3.5 sm:p-4.5 overflow-x-auto text-[12px] sm:text-[13px] text-zinc-200 font-mono leading-[1.7] selection:bg-amber-500/30 touch-scroll">
          <code
            className={`language-${lang}`}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      )}
    </div>
  );
}
