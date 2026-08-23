import React, { useState } from 'react';
import { Film, Play, RotateCcw, ArrowRight } from 'lucide-react';

export function SequencePlayground() {
  const steps = [
    { type: 'ShowText', tag: 'dialog', text: 'Witaj w Podziemiach!' },
    { type: 'Wait', seconds: 1.0 },
    { type: 'AppendLine', tag: 'log', text: 'Próba otwarcia wrot...' },
    { type: 'SetFlag', key: 'door_open', value: true },
    { type: 'ShowText', tag: 'dialog', text: 'Wrota zostały otwarte!' },
    { type: 'End' },
  ];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [dialogText, setDialogText] = useState('...');
  const [logLines, setLogLines] = useState([]);
  const [flags, setFlags] = useState({});

  const handleNextStep = () => {
    if (currentIdx >= steps.length - 1) return;
    const step = steps[currentIdx];

    if (step.type === 'ShowText') {
      setDialogText(step.text);
    } else if (step.type === 'AppendLine') {
      setLogLines((prev) => [...prev, step.text]);
    } else if (step.type === 'SetFlag') {
      setFlags((prev) => ({ ...prev, [step.key]: step.value }));
    }

    setCurrentIdx((prev) => prev + 1);
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setDialogText('...');
    setLogLines([]);
    setFlags({});
  };

  return (
    <div className="my-8 border border-zinc-800 rounded-2xl bg-zinc-950/80 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-zinc-100 text-sm tracking-tight">Symulator Wykonywania Sequence</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-md text-xs font-medium border border-zinc-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button
            onClick={handleNextStep}
            disabled={currentIdx >= steps.length - 1}
            className="flex items-center gap-1.5 px-3.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-md text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
          >
            <Play className="w-3 h-3 fill-current" /> Wykonaj Krok ({currentIdx + 1}/{steps.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">
            Lista Kroków Sekwencji:
          </label>
          <div className="space-y-1.5 font-mono text-xs">
            {steps.map((step, idx) => {
              const isCurrent = idx === currentIdx;
              const stepValueText = step.text || step.key || (step.seconds !== undefined ? `${step.seconds}s` : '');
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-semibold'
                      : idx < currentIdx
                      ? 'bg-zinc-950/40 border-zinc-800/40 text-zinc-600 line-through'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isCurrent && <ArrowRight className="w-3.5 h-3.5 text-amber-400" />}
                    <span>Step::{step.type}</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                    {stepValueText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-1 uppercase tracking-wider">
              Stan Dialogu (tag: dialog):
            </label>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-xs text-amber-300">
              "{dialogText}"
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-1 uppercase tracking-wider">
              Logi Konsoli (tag: log):
            </label>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-xs text-zinc-300 h-24 overflow-y-auto space-y-1">
              {logLines.length === 0 ? (
                <span className="text-zinc-600 font-sans italic">Brak wpisów w konsoli...</span>
              ) : (
                logLines.map((l, i) => <div key={i}>&gt; {l}</div>)
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-1 uppercase tracking-wider">
              Flagi w StateStore:
            </label>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-xs text-emerald-400">
              {Object.keys(flags).length === 0
                ? '{}'
                : JSON.stringify(flags, null, 2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
