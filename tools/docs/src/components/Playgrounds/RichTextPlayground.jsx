import React, { useState } from 'react';
import { Type, Sparkles } from 'lucide-react';

export function RichTextPlayground() {
  const [bbcodeText, setBbcodeText] = useState(
    'Zrobiłeś [color=gold]100 złota[/color] i [color=#00FF00]Miecz Zagłady[/color]!'
  );

  // Parse simple BBCode tags for interactive demonstration
  const renderParsedPreview = (input) => {
    // Regex for [color=X]text[/color]
    const parts = [];
    const regex = /\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(input)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: input.substring(lastIndex, match.index), color: null });
      }
      parts.push({ text: match[2], color: match[1] });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < input.length) {
      parts.push({ text: input.substring(lastIndex), color: null });
    }

    return parts.map((part, idx) => {
      let colorCss = part.color;
      if (colorCss === 'gold') colorCss = '#f59e0b';
      if (colorCss === 'red') colorCss = '#ef4444';
      if (colorCss === 'blue') colorCss = '#3b82f6';
      if (colorCss === 'green') colorCss = '#10b981';

      return (
        <span key={idx} style={{ color: colorCss || '#f4f4f5' }}>
          {part.text}
        </span>
      );
    });
  };

  return (
    <div className="my-8 border border-zinc-800 rounded-2xl bg-zinc-950 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-zinc-100 text-sm tracking-tight">Symulator BBCode RichText</h3>
        </div>
        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Interaktywny Podgląd
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">
            Wprowadź tekst z tagami BBCode:
          </label>
          <textarea
            value={bbcodeText}
            onChange={(e) => setBbcodeText(e.target.value)}
            rows={4}
            className="w-full bg-[#090a0f] border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 font-mono focus:border-amber-500/50 focus:outline-none transition-colors"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() =>
                setBbcodeText('Złoto: [color=gold]500[/color] | HP: [color=red]100/100[/color]')
              }
              className="text-[11px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-800 cursor-pointer"
            >
              Przykład 1 (HUD)
            </button>
            <button
              onClick={() =>
                setBbcodeText('System: [color=#3b82f6]Połączono ze serwerem[/color]!')
              }
              className="text-[11px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-800 cursor-pointer"
            >
              Przykład 2 (Logi)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">
            Wyrenderowany Podgląd Tekstu w Grze:
          </label>
          <div className="w-full h-32 bg-[#090a0f] border border-zinc-800 rounded-xl p-4 flex items-center justify-center font-mono text-base text-zinc-100 shadow-inner">
            <div>{renderParsedPreview(bbcodeText)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
