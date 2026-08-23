import React from 'react';
import { Box, Code2, Layers, Cpu, CheckCircle } from 'lucide-react';

export function FeatureGrid({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="my-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="p-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] hover:border-zinc-700 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <code className="text-xs font-bold font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {item.title}
              </code>
              {item.badge && (
                <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                  {item.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {item.description}
            </p>
          </div>

          {item.code && (
            <div className="mt-3 pt-2.5 border-t border-zinc-800/80">
              <code className="text-[11px] font-mono text-zinc-400 block truncate">
                {item.code}
              </code>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
