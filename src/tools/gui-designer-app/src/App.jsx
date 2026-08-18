import React, { useState } from 'react';
import { useGuiState } from './hooks/useGuiState';
import { useKeybindings } from './hooks/useKeybindings';
import { HeaderBar } from './components/HeaderBar';
import { LeftSidebar } from './components/LeftSidebar';
import { CanvasArea } from './components/CanvasArea';
import { RightInspector } from './components/RightInspector';
import { CodeDrawer } from './components/CodeDrawer';

export default function App() {
  const guiState = useGuiState();
  const [showCodeDrawer, setShowCodeDrawer] = useState(false);

  useKeybindings({
    undo: guiState.undo,
    redo: guiState.redo,
    copySelected: guiState.copySelected,
    pasteClipboard: guiState.pasteClipboard,
    duplicateSelected: guiState.duplicateSelected,
    deleteSelectedElement: guiState.deleteSelectedElement,
    setTool: guiState.setTool,
    selectedId: guiState.selectedId,
    selectedIds: guiState.selectedIds,
    moveSelectedElements: guiState.moveSelectedElements,
    elements: guiState.elements,
    updateSelectedElement: guiState.updateSelectedElement,
    grid: guiState.grid,
    vw: guiState.vw,
    vh: guiState.vh,
    saveAutoDraft: guiState.saveAutoDraft
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      <HeaderBar
        vw={guiState.vw} setVw={guiState.setVw}
        vh={guiState.vh} setVh={guiState.setVh}
        grid={guiState.grid} setGrid={guiState.setGrid}
        snapToGrid={guiState.snapToGrid} setSnapToGrid={guiState.setSnapToGrid}
        smartSnap={guiState.smartSnap} setSmartSnap={guiState.setSmartSnap}
        snapDistance={guiState.snapDistance} setSnapDistance={guiState.setSnapDistance}
        snapTargetMode={guiState.snapTargetMode} setSnapTargetMode={guiState.setSnapTargetMode}
        pixelArtMode={guiState.pixelArtMode} setPixelArtMode={guiState.setPixelArtMode}
        scope={guiState.scope} setScope={guiState.setScope}
        targetComment={guiState.targetComment} setTargetComment={guiState.setTargetComment}
        exportProjectData={guiState.exportProjectData}
        importProjectData={guiState.importProjectData}
        elements={guiState.elements}
        showCodeDrawer={showCodeDrawer} setShowCodeDrawer={setShowCodeDrawer}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <LeftSidebar
          tool={guiState.tool} setTool={guiState.setTool}
          elements={guiState.elements} setElements={guiState.setElements}
          selectedId={guiState.selectedId} setSelectedId={guiState.setSelectedId}
          projectAssets={guiState.projectAssets} setProjectAssets={guiState.setProjectAssets}
          addElement={guiState.addElement}
        />

        <div className="flex-1 flex flex-col overflow-hidden relative bg-[#09090b]">
          <CanvasArea
            vw={guiState.vw} vh={guiState.vh}
            grid={guiState.grid} snapToGrid={guiState.snapToGrid}
            smartSnap={guiState.smartSnap} snapDistance={guiState.snapDistance}
            snapTargetMode={guiState.snapTargetMode}
            pixelArtMode={guiState.pixelArtMode}
            tool={guiState.tool} setTool={guiState.setTool}
            elements={guiState.elements} setElements={guiState.setElements}
            selectedId={guiState.selectedId} setSelectedId={guiState.setSelectedId}
            selectedIds={guiState.selectedIds} selectElement={guiState.selectElement}
            addElement={guiState.addElement} saveHistory={guiState.saveHistory}
          />

          {showCodeDrawer && (
            <CodeDrawer
              elements={guiState.elements}
              scope={guiState.scope}
              onClose={() => setShowCodeDrawer(false)}
            />
          )}
        </div>

        <RightInspector
          elements={guiState.elements}
          selectedId={guiState.selectedId}
          updateSelectedElement={guiState.updateSelectedElement}
          alignToElement={guiState.alignToElement}
          projectAssets={guiState.projectAssets}
          vw={guiState.vw} vh={guiState.vh}
        />
      </div>
    </div>
  );
}
