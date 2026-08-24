import React, { useEffect, useState, useRef } from 'react';
import { AlignLeft } from 'lucide-react';

export function TableOfContents({ sections, activeSectionId, onSelectSection }) {
  const [visibleSectionId, setVisibleSectionId] = useState(activeSectionId);
  const activeRef = useRef(null);

  useEffect(() => {
    setVisibleSectionId(activeSectionId);
  }, [activeSectionId]);

  useEffect(() => {
    if (!sections || sections.length === 0) return;

    const allIds = [];
    sections.forEach((sec) => {
      allIds.push(sec.id);
      if (sec.subsections) {
        sec.subsections.forEach((sub) => allIds.push(sub.id));
      }
    });

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;

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

  // Auto-scroll active item into view inside the ToC
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [visibleSectionId]);

  if (!sections || sections.length === 0) return null;

  // Flatten all IDs for flat numbering
  const flatItems = [];
  sections.forEach((sec, secIdx) => {
    flatItems.push({ id: sec.id, title: sec.title, level: 0, number: `${secIdx + 1}` });
    if (sec.subsections) {
      sec.subsections.forEach((sub, subIdx) => {
        flatItems.push({ id: sub.id, title: sub.title, level: 1, number: `${secIdx + 1}.${subIdx + 1}` });
      });
    }
  });

  return (
    <aside className="w-60 hidden xl:block shrink-0 py-8 px-3 h-[calc(100vh-4rem)] sticky top-16 select-none overflow-y-auto">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-4 uppercase tracking-wider">
        <AlignLeft className="w-3.5 h-3.5 text-zinc-500" />
        <span>Na tej stronie</span>
      </div>

      <nav className="relative space-y-0.5">
        {/* Animated indicator track */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-800/80" />

        {flatItems.map((item) => {
          const isActive = visibleSectionId === item.id;
          return (
            <button
              key={item.id}
              ref={isActive ? activeRef : null}
              onClick={() => {
                setVisibleSectionId(item.id);
                onSelectSection(item.id);
              }}
              className={`relative w-full text-left py-1.5 transition-all cursor-pointer rounded-r-md group ${
                item.level === 1 ? 'pl-6 pr-2' : 'pl-4 pr-2'
              } ${
                isActive
                  ? 'text-amber-400 font-semibold'
                  : item.level === 1
                    ? 'text-zinc-600 hover:text-zinc-300'
                    : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {/* Active bar */}
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-px rounded-full transition-all duration-200 ${
                  isActive ? 'h-4/5 bg-amber-400 shadow-[0_0_6px_rgba(251,146,60,0.7)]' : 'h-0'
                }`}
              />

              <span className={`flex items-center gap-2 ${item.level === 1 ? 'text-[10.5px]' : 'text-xs'}`}>
                <span className={`font-mono shrink-0 transition-colors ${isActive ? 'text-amber-500' : 'text-zinc-700 group-hover:text-zinc-600'}`}>
                  {item.number}
                </span>
                <span className="truncate">{item.title}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
