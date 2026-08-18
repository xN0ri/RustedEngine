import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Bookmark, Code2, Sparkles, SlidersHorizontal, Monitor, Grid, Magnet } from 'lucide-react';

export function HeaderBar({
  vw, setVw, vh, setVh, grid, setGrid, snapToGrid, setSnapToGrid,
  smartSnap, setSmartSnap, snapDistance, setSnapDistance, snapTargetMode, setSnapTargetMode,
  pixelArtMode, setPixelArtMode, scope, setScope,
  exportProjectData, importProjectData, elements, showCodeDrawer, setShowCodeDrawer
}) {
  const [draftSlots, setDraftSlots] = useState({});

  const updateDraftSlotsUI = () => {
    try {
      const slots = JSON.parse(localStorage.getItem('rusted_gui_slots') || '{}');
      setDraftSlots(slots);
    } catch (e) {}
  };

  useEffect(() => {
    updateDraftSlotsUI();
  }, []);

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotNameInput, setSlotNameInput] = useState('');

  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(exportProjectData(), null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gui_draft_${vw}x${vh}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (e) {
      console.error("Failed to export JSON draft:", e);
    }
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        importProjectData(JSON.parse(ev.target.result));
      } catch (err) {
        alert("Invalid JSON draft: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const openSaveSlotModal = () => {
    setSlotNameInput(`Layout_${elements.length}_elements`);
    setShowSlotModal(true);
  };

  const confirmSaveSlot = () => {
    const slotName = slotNameInput.trim();
    if (!slotName) return;
    try {
      const slots = JSON.parse(localStorage.getItem('rusted_gui_slots') || '{}');
      slots[slotName] = exportProjectData();
      localStorage.setItem('rusted_gui_slots', JSON.stringify(slots));
      updateDraftSlotsUI();
      setShowSlotModal(false);
    } catch (e) {}
  };

  const handleSlotSelect = (e) => {
    const name = e.target.value;
    if (!name) return;
    try {
      const slots = JSON.parse(localStorage.getItem('rusted_gui_slots') || '{}');
      if (slots[name]) importProjectData(slots[name]);
    } catch (e) {}
  };

  return (
    <header className="h-11 bg-[#121215]/90 backdrop-blur-md border-b border-[#1f1f23] flex items-center justify-between px-3.5 select-none z-20 flex-shrink-0 text-xs">
      {/* Left: Brand Logo & Title */}
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-md bg-zinc-100 text-zinc-950 flex items-center justify-center font-black text-[11px] shadow-sm">
          R
        </div>
        <span className="font-semibold text-zinc-200 tracking-tight text-[12.5px]">RustedEngine GUI</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 font-mono">v2.0</span>
      </div>

      {/* Center: File Actions & Settings Pills */}
      <div className="flex items-center gap-1.5">
        {/* Save / Load Draft Pill Group */}
        <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded-lg p-0.5 shadow-sm">
          <button
            onClick={handleExportJSON}
            title="Save draft to JSON file"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-zinc-300 hover:text-white hover:bg-[#27272a] transition-all font-medium text-[11.5px]"
          >
            <Save className="w-3.5 h-3.5 text-zinc-400" /> Save
          </button>
          <label
            title="Load draft from JSON file"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-zinc-300 hover:text-white hover:bg-[#27272a] transition-all font-medium text-[11.5px] cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" /> Open
            <input type="file" accept=".json,.rustedui" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>

        {/* Quick Slots Pill */}
        <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded-lg p-0.5">
          <select
            onChange={handleSlotSelect}
            defaultValue=""
            className="bg-transparent text-zinc-300 text-[11.5px] px-2 py-1 font-medium focus:outline-none cursor-pointer"
          >
            <option value="">Draft Slots...</option>
            {Object.keys(draftSlots).map(name => (
              <option key={name} value={name}>📋 {name}</option>
            ))}
          </select>
          <button
            onClick={openSaveSlotModal}
            title="Save to Quick Slot"
            className="p-1 text-zinc-400 hover:text-white hover:bg-[#27272a] rounded-md transition-all"
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Resolution Input Pill */}
        <div className="flex items-center gap-1 bg-[#18181b] border border-[#27272a] px-2.5 py-1 rounded-lg text-zinc-400 text-[11px]">
          <Monitor className="w-3.5 h-3.5 text-zinc-500" />
          <input
            type="number"
            value={vw}
            onChange={e => setVw(parseInt(e.target.value) || 640)}
            className="w-9 bg-transparent text-center text-zinc-200 font-mono focus:outline-none"
          />
          <span className="text-zinc-600">×</span>
          <input
            type="number"
            value={vh}
            onChange={e => setVh(parseInt(e.target.value) || 360)}
            className="w-9 bg-transparent text-center text-zinc-200 font-mono focus:outline-none"
          />
        </div>

        {/* Grid & Snap Pill */}
        <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] px-2.5 py-1 rounded-lg text-zinc-400 text-[11px]">
          <Grid className="w-3.5 h-3.5 text-zinc-500" />
          <input
            type="number"
            value={grid}
            onChange={e => setGrid(parseInt(e.target.value) || 8)}
            className="w-6 bg-transparent text-center text-zinc-200 font-mono focus:outline-none"
          />
          <label className="flex items-center gap-1 cursor-pointer text-zinc-400 hover:text-zinc-200">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={e => setSnapToGrid(e.target.checked)}
              className="rounded accent-indigo-500 w-3 h-3"
            />
            Grid
          </label>
        </div>

        {/* Smart Align Snap Pill */}
        <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] px-2 py-1 rounded-lg text-zinc-400 text-[11px]">
          <Magnet className={`w-3.5 h-3.5 ${smartSnap ? 'text-indigo-400' : 'text-zinc-600'}`} />
          <label className="flex items-center gap-1 cursor-pointer text-zinc-300 hover:text-white font-medium">
            <input
              type="checkbox"
              checked={smartSnap}
              onChange={e => setSmartSnap(e.target.checked)}
              className="rounded accent-indigo-500 w-3 h-3"
            />
            Smart Align
          </label>

          {smartSnap && (
            <>
              <select
                value={snapDistance}
                onChange={e => setSnapDistance(parseInt(e.target.value) || 6)}
                title="Snap Threshold Distance"
                className="bg-transparent text-zinc-300 text-[10.5px] focus:outline-none cursor-pointer border-l border-[#27272a] pl-1.5"
              >
                <option value={4}>4px</option>
                <option value={6}>6px</option>
                <option value={10}>10px</option>
                <option value={16}>16px</option>
              </select>

              <select
                value={snapTargetMode}
                onChange={e => setSnapTargetMode(e.target.value)}
                title="Snap Mode: Center / Edges / Both"
                className="bg-transparent text-zinc-300 text-[10.5px] focus:outline-none cursor-pointer border-l border-[#27272a] pl-1.5"
              >
                <option value="both">Both</option>
                <option value="center">Center</option>
                <option value="edges">Edges</option>
              </select>
            </>
          )}
        </div>

        {/* Scope Pill */}
        <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded-lg px-2 py-1">
          <select
            value={scope}
            onChange={e => setScope(e.target.value)}
            className="bg-transparent text-zinc-300 text-[11px] font-mono focus:outline-none cursor-pointer"
          >
            <option value="assets">assets</option>
            <option value="engine.ctx">engine.ctx</option>
            <option value="ctx">ctx</option>
            <option value="ctx.assets">ctx.assets</option>
          </select>
        </div>
      </div>

      {/* Right: Code Toggle Action */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCodeDrawer(!showCodeDrawer)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11.5px] font-medium transition-all shadow-sm ${
            showCodeDrawer
              ? 'bg-zinc-100 text-zinc-950 hover:bg-white font-semibold'
              : 'bg-[#18181b] border border-[#27272a] text-zinc-300 hover:bg-[#27272a] hover:text-white'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" /> Code
        </button>
      </div>

      {/* Save Slot Modal */}
      {showSlotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-xl p-4 w-80 shadow-2xl flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-indigo-400" /> Save Quick Slot
            </h3>
            <input
              type="text"
              autoFocus
              value={slotNameInput}
              onChange={e => setSlotNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmSaveSlot()}
              placeholder="Slot name..."
              className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                onClick={() => setShowSlotModal(false)}
                className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveSlot}
                className="px-3.5 py-1 text-xs bg-indigo-600 text-white hover:bg-indigo-500 font-medium rounded-md transition-colors shadow-sm"
              >
                Save Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
