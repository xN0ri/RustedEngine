import React, { useEffect, useState } from 'react';
import { AlignLeft } from 'lucide-react';

export function TableOfContents({ sections, activeSectionId, onSelectSection }) {
  const [visibleSectionId, setVisibleSectionId] = useState(activeSectionId);

  useEffect(() => {
    setVisibleSectionId(activeSectionId);
  }, [activeSectionId]);

  useEffect(() => {
    if (!sections || sections.length === 0) return;

    // Pobieramy wszystkie identyfikatory sekcji i podsekcji
    const allIds = [];
    sections.forEach((sec) => {
      allIds.push(sec.id);
      if (sec.subsections) {
        sec.subsections.forEach((sub) => allIds.push(sub.id));
      }
    });

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120; // Lekki offset pod header

      let currentId = allIds[0];
      for (const id of allIds) {
        const element = document.getElementById(id);
        if (element) {
          const top = element.offsetTop;
          if (scrollPosition >= top) {
            currentId = id;
          }
        }
      }

      if (currentId) {
        setVisibleSectionId(currentId);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  if (!sections || sections.length === 0) return null;

  return (
    <aside className="w-64 hidden xl:block shrink-0 py-8 px-4 h-[calc(100vh-4rem)] sticky top-16 select-none overflow-y-auto">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-4 uppercase tracking-wider">
        <AlignLeft className="w-3.5 h-3.5 text-zinc-400" />
        <span>Na tej stronie</span>
      </div>

      <nav className="space-y-1 border-l border-zinc-800/80 pl-3">
        {sections.map((sec) => {
          const isActive = visibleSectionId === sec.id;
          return (
            <React.Fragment key={sec.id}>
              <button
                onClick={() => {
                  setVisibleSectionId(sec.id);
                  onSelectSection(sec.id);
                }}
                className={`block w-full text-left text-xs py-1.5 px-2.5 rounded-md transition-all truncate cursor-pointer ${
                  isActive
                    ? 'text-amber-400 font-medium bg-amber-500/10'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                {sec.title}
              </button>

              {sec.subsections &&
                sec.subsections.map((sub) => {
                  const isSubActive = visibleSectionId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setVisibleSectionId(sub.id);
                        onSelectSection(sub.id);
                      }}
                      className={`block w-full text-left text-[11px] py-1 pl-4 pr-2 rounded-md transition-all truncate cursor-pointer ${
                        isSubActive
                          ? 'text-amber-300 font-medium bg-amber-500/10'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                      }`}
                    >
                      {sub.title}
                    </button>
                  );
                })}
            </React.Fragment>
          );
        })}
      </nav>
    </aside>
  );
}
