import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownRenderer({ content }) {
  if (!content) return null;

  return (
    <div className="markdown-content text-zinc-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h3: ({ children }) => (
            <h3 className="text-base sm:text-lg font-bold text-zinc-100 mt-6 mb-3 tracking-tight">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm sm:text-base font-semibold text-zinc-200 mt-4 mb-2 tracking-tight">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-3.5 leading-relaxed text-zinc-300 text-[14px] sm:text-[15px] font-normal">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 space-y-2 pl-5 list-disc marker:text-amber-400/80 text-zinc-300 text-[14px] sm:text-[15px] leading-relaxed">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 space-y-2.5 pl-5 list-decimal marker:text-amber-400 font-medium text-zinc-300 text-[14px] sm:text-[15px] leading-relaxed">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-100">{children}</strong>
          ),
          pre: ({ children }) => (
            <div className="my-4 rounded-xl border border-zinc-800/90 bg-[#090a0f] p-4 overflow-x-auto shadow-md">
              <pre className="font-mono text-xs sm:text-[13px] text-zinc-200 leading-relaxed m-0">
                {children}
              </pre>
            </div>
          ),
          code: ({ node, inline, className, children, ...props }) => {
            const isMultiLine = String(children).includes("\n");
            if (isMultiLine) {
              return (
                <code className="font-mono text-xs sm:text-[13px] text-zinc-200 leading-relaxed" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="bg-zinc-900 text-amber-300 font-mono px-1.5 py-0.5 rounded text-[12px] sm:text-[13px] border border-zinc-800 font-medium"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="my-5 overflow-x-auto border border-zinc-800/90 rounded-xl bg-zinc-950/80 shadow-xs touch-scroll">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-900/95 border-b border-zinc-800 text-zinc-200 font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-zinc-800/60">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-zinc-900/40 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-amber-400">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="py-2.5 px-4 text-zinc-300 text-xs sm:text-[13px] leading-relaxed">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
