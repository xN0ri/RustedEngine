import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUpRight, Sparkles, AlertTriangle, Info, Lightbulb } from "lucide-react";
import { CodeBlock } from "./CodeBlock";

export function MarkdownRenderer({ content, onNavigate }) {
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
          p: ({ children }) => {
            return (
              <p className="mb-3.5 leading-relaxed text-zinc-300 text-[14px] sm:text-[15px] font-normal">
                {children}
              </p>
            );
          },
          blockquote: ({ children }) => {
            // Check for Alert patterns like [!TIP], [!NOTE], [!WARNING], [!IMPORTANT]
            const childArray = React.Children.toArray(children);
            let alertType = "tip";
            let title = "Porada";
            let icon = <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
            let containerClass = "shadcn-callout-amber";
            let titleClass = "text-amber-400";

            // Process children to strip [!TIP], [!NOTE], etc.
            const cleanChildren = React.Children.map(children, (child) => {
              if (React.isValidElement(child) && child.props && child.props.children) {
                const innerArray = React.Children.toArray(child.props.children);
                if (typeof innerArray[0] === "string") {
                  const match = innerArray[0].match(/^\[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\]\s*(.*)/i);
                  if (match) {
                    const tag = match[1].toUpperCase();
                    if (tag === "TIP") {
                      alertType = "tip";
                      title = "Wskazówka";
                      icon = <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
                      containerClass = "shadcn-callout-emerald";
                      titleClass = "text-emerald-400";
                    } else if (tag === "NOTE") {
                      alertType = "note";
                      title = "Informacja";
                      icon = <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />;
                      containerClass = "shadcn-callout-sky";
                      titleClass = "text-sky-400";
                    } else if (tag === "WARNING" || tag === "CAUTION") {
                      alertType = "warning";
                      title = "Uwaga";
                      icon = <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
                      containerClass = "shadcn-callout-rose";
                      titleClass = "text-rose-400";
                    }

                    const rest = match[2];
                    const newInner = rest
                      ? [rest, ...innerArray.slice(1)]
                      : innerArray.slice(1);
                    return React.cloneElement(child, {}, newInner);
                  }
                }
              }
              return child;
            });

            return (
              <div className={`my-4 p-4 rounded-xl shadow-md backdrop-blur-sm ${containerClass}`}>
                <div className="flex items-start gap-3">
                  {icon}
                  <div className="min-w-0 flex-1">
                    <h4 className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-1.5 ${titleClass}`}>
                      {title}
                    </h4>
                    <div className="text-[13px] sm:text-sm text-zinc-300 leading-relaxed font-normal [&>p]:mb-0">
                      {cleanChildren}
                    </div>
                  </div>
                </div>
              </div>
            );
          },
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
          a: ({ href, children }) => {
            if (href && (href.startsWith("#doc:") || href.startsWith("doc:"))) {
              const raw = href.replace(/^#?doc:/, "");
              const [targetDocId, targetSectionId] = raw.split("#");
              return (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (onNavigate) onNavigate(targetDocId, targetSectionId);
                  }}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 rounded-lg text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold cursor-pointer transition-all hover:scale-105 shadow-xs select-none"
                  title={`Przejdź do: ${targetDocId}`}
                >
                  <span>{children}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                </button>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:text-amber-300 underline underline-offset-4 font-medium transition-colors inline-flex items-center gap-0.5"
              >
                <span>{children}</span>
                <ArrowUpRight className="w-3 h-3 inline-block opacity-80" />
              </a>
            );
          },
          pre: ({ children }) => {
            return <>{children}</>;
          },
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            const isBlock = match || codeString.includes("\n");

            if (isBlock) {
              const lang = match ? match[1] : "rust";
              return <CodeBlock code={codeString} language={lang} collapsible={false} />;
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
