import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DocViewer } from './components/DocViewer';
import { SearchModal } from './components/SearchModal';
import { allDocs } from './data/docsData';

export function App() {
  const [activeDocId, setActiveDocId] = useState(allDocs[0].id);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [activeTab, setActiveTab] = useState('docs');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    // Detect Tauri environment
    const tauriDetected = !!(window.__TAURI_INTERNALS__ || window.__TAURI__);
    setIsTauri(tauriDetected);

    // Keyboard shortcut Ctrl+K or Cmd+K to open search
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeDoc = allDocs.find((d) => d.id === activeDocId) || allDocs[0];

  const handleSelectDoc = (docId) => {
    setActiveDocId(docId);
    setActiveSectionId(null);
    setIsMobileMenuOpen(false);
    if (['getting-started', 'world-objects'].includes(docId)) {
      setActiveTab('architecture');
    } else if (['ui-system'].includes(docId)) {
      setActiveTab('components');
    } else {
      setActiveTab('docs');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSection = (sectionId) => {
    setActiveSectionId(sectionId);
    setIsMobileMenuOpen(false);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectResult = (docId, sectionId) => {
    setActiveDocId(docId);
    setActiveSectionId(sectionId);
    setIsMobileMenuOpen(false);
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
    if (tabId === 'components') {
      setActiveDocId('ui-system');
    } else if (tabId === 'architecture') {
      setActiveDocId('getting-started');
    } else if (tabId === 'api') {
      setActiveDocId('getting-started');
      handleSelectSection('api-reference');
    } else {
      setActiveDocId(allDocs[0].id);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        isTauri={isTauri}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      <div className="flex flex-1">
        <Sidebar
          docs={allDocs}
          activeDocId={activeDocId}
          onSelectDoc={handleSelectDoc}
          activeSectionId={activeSectionId}
          onSelectSection={handleSelectSection}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        <DocViewer
          doc={activeDoc}
          allDocs={allDocs}
          onNavigateDoc={handleSelectDoc}
          onNavigateTo={handleSelectResult}
          activeSectionId={activeSectionId}
          onSelectSection={handleSelectSection}
        />
      </div>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectResult}
      />
    </div>
  );
}
