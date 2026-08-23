import React, { useState } from 'react';
import { LayoutGrid, Columns, Rows } from 'lucide-react';

export function LayoutPlayground() {
  const [layoutType, setLayoutType] = useState('vbox');
  const [padding, setPadding] = useState(16);
  const [gap, setGap] = useState(12);

  return (
    <div className="my-8 border border-zinc-800 rounded-2xl bg-zinc-950 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <LayoutGrid className="w-4 h-4 text-amber-400" />
        <h3 className="font-bold text-zinc-100 text-sm tracking-tight">Symulator Layoutu UI (Flexbox)</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">
            Typ Kontenera:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setLayoutType('vbox')}
              className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                layoutType === 'vbox'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              <Rows className="w-4 h-4" />
              <span>VBox / Column</span>
            </button>
            <button
              onClick={() => setLayoutType('hbox')}
              className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                layoutType === 'hbox'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              <Columns className="w-4 h-4" />
              <span>HBox / Row</span>
            </button>
            <button
              onClick={() => setLayoutType('grid')}
              className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                layoutType === 'grid'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Grid (2 cols)</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">
            Padding Kontenera: {padding}px
          </label>
          <input
            type="range"
            min="0"
            max="32"
            value={padding}
            onChange={(e) => setPadding(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">
            Odstęp (Gap): {gap}px
          </label>
          <input
            type="range"
            min="0"
            max="32"
            value={gap}
            onChange={(e) => setGap(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>
      </div>

      <div className="w-full bg-[#090a0f] border border-zinc-800 rounded-2xl min-h-64 shadow-inner flex items-center justify-center p-4">
        <div
          className="border-2 border-dashed border-amber-500/40 rounded-xl bg-zinc-900/90 transition-all"
          style={{
            padding: `${padding}px`,
            gap: `${gap}px`,
            display: layoutType === 'grid' ? 'grid' : 'flex',
            flexDirection: layoutType === 'vbox' ? 'column' : 'row',
            gridTemplateColumns: layoutType === 'grid' ? 'repeat(2, minmax(0, 1fr))' : undefined,
          }}
        >
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold text-center">
            Widget 1 (Text)
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 font-mono text-xs font-bold text-center">
            Widget 2 (Button)
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold text-center">
            Widget 3 (ProgressBar)
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold text-center">
            Widget 4 (TextField)
          </div>
        </div>
      </div>
    </div>
  );
}
