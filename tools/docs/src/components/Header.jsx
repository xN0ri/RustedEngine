import React from "react";
import { Search, Code, Monitor, Menu, X } from "lucide-react";

export function Header({
  onOpenSearch,
  isTauri,
  activeTab,
  onSelectTab,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) {
  const navTabs = [{ id: "docs", label: "Docs" }];

  return (
    <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Mobile Menu Toggle Button */}
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <Menu className="w-4 h-4" />
          )}
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center font-black text-zinc-950 text-xs tracking-tighter shadow-sm">
            RE
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-100 text-sm tracking-tight">
              RustedEngine
            </span>
            <span className="text-[11px] font-mono font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              v1.0
            </span>
          </div>
        </div>

        {/* Top Nav Links (desktop) */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-zinc-400">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab && onSelectTab(tab.id)}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "text-zinc-100 bg-zinc-800/80 font-semibold"
                  : "hover:text-zinc-200 hover:bg-zinc-900/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Compact Search Bar */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800/90 border border-zinc-800 rounded-lg text-zinc-400 text-xs transition-all shadow-sm group cursor-pointer w-36 sm:w-56 justify-between"
        >
          <span className="flex items-center gap-1.5 sm:gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400 transition-colors shrink-0" />
            <span className="truncate">Szukaj...</span>
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-zinc-950 border border-zinc-800 text-zinc-400 rounded">
            Ctrl+K
          </kbd>
        </button>

        {isTauri && (
          <span className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/20">
            <Monitor className="w-3 h-3" /> Desktop
          </span>
        )}

        {/* GitHub Link */}
        <a
          href="https://github.com/xN0ri/RustedEngine"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition-colors border border-zinc-800 text-xs font-medium shadow-xs"
          title="Repozytorium GitHub: xN0ri/RustedEngine"
        >
          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
          <span className="hidden sm:inline-block">GitHub</span>
        </a>

        {/* Macroquad Docs Link */}
        <a
          href="https://macroquad.rs"
          target="_blank"
          rel="noreferrer"
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition-colors border border-zinc-800"
          title="Macroquad Docs"
        >
          <Code className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
}
