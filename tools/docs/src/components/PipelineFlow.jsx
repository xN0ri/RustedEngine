import React from 'react';
import { ArrowDown, CheckCircle2 } from 'lucide-react';

export function PipelineFlow({ steps }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="my-6 space-y-2">
      {steps.map((step, idx) => (
        <React.Fragment key={idx}>
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#0c0c0e] hover:border-zinc-700 transition-all flex items-start gap-3.5 shadow-sm group">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-xs text-amber-400 shrink-0 mt-0.5">
              {idx + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-zinc-100">{step.title}</h4>
                {step.tag && (
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                    {step.tag}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>

          {idx < steps.length - 1 && (
            <div className="flex justify-center py-0.5">
              <ArrowDown className="w-3.5 h-3.5 text-zinc-600" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
