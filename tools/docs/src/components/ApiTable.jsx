import React from 'react';

export function ApiTable({ headers, rows }) {
  if (!headers || !rows) return null;

  return (
    <div className="my-6 overflow-x-auto border border-zinc-800/90 rounded-xl bg-zinc-950/80 shadow-md touch-scroll">
      <table className="w-full text-left border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="bg-zinc-900/95 border-b border-zinc-800 text-zinc-300 font-semibold">
            {headers.map((h, idx) => (
              <th key={idx} className="py-3 px-4 font-bold uppercase tracking-wider text-amber-400 text-[11px] sm:text-xs">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-zinc-900/50 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="py-3 px-4 text-zinc-300 align-middle">
                  {cIdx === 0 ? (
                    <code className="font-mono text-amber-300 font-semibold bg-zinc-900/90 px-2 py-0.5 rounded-md border border-zinc-700/60 text-[11px] sm:text-xs inline-block">
                      {cell}
                    </code>
                  ) : cIdx === 1 || cIdx === 2 ? (
                    <code className="font-mono text-zinc-300 text-[11px] sm:text-xs bg-zinc-900/40 px-1.5 py-0.5 rounded border border-zinc-800/50 inline-block">{cell}</code>
                  ) : (
                    <span className="text-zinc-300 text-xs sm:text-[13px] leading-relaxed">{cell}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
