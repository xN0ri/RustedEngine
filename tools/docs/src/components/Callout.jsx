import React from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';

export function Callout({ type = 'protip', title, text }) {
  const isEmerald = type === 'protip' || type === 'success';

  return (
    <div
      className={`my-6 p-4 sm:p-4.5 rounded-xl shadow-md backdrop-blur-sm ${
        isEmerald ? 'shadcn-callout-emerald' : 'shadcn-callout-amber'
      }`}
    >
      <div className="flex items-start gap-3">
        {isEmerald ? (
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
        ) : (
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
        )}
        <div className="min-w-0">
          <h4
            className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1.5 ${
              isEmerald ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {title}
          </h4>
          <p className="text-[13px] sm:text-sm text-zinc-300 leading-relaxed font-normal">{text}</p>
        </div>
      </div>
    </div>
  );
}
