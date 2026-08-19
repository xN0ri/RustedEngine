import { useEffect } from 'react';

export function useKeybindings({
  undo, redo, copySelected, pasteClipboard, duplicateSelected,
  deleteSelectedElement, setTool, selectedId, selectedIds, moveSelectedElements, elements, updateSelectedElement, grid, vw, vh, saveAutoDraft
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        const isZ = k === 'z' || e.code === 'KeyZ';
        const isY = k === 'y' || e.code === 'KeyY';

        if (k === 'r') {
          saveAutoDraft();
        }
        if (isZ) {
          if (e.shiftKey) redo();
          else undo();
          e.preventDefault();
          return;
        }
        if (isY) {
          redo();
          e.preventDefault();
          return;
        }
        if (k === 'c') {
          copySelected();
          e.preventDefault();
          return;
        }
        if (k === 'v') {
          pasteClipboard();
          e.preventDefault();
          return;
        }
        if (k === 'd') {
          duplicateSelected();
          e.preventDefault();
          return;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedElement();
        e.preventDefault();
      }

      if (e.key === 'Escape') {
        setTool('Select');
        e.preventDefault();
      }

      if (selectedId || (selectedIds && selectedIds.length > 0)) {
        if (e.key.startsWith('Arrow')) {
          const d = e.shiftKey ? 1 : grid;
          let dx = 0, dy = 0;
          if (e.key === 'ArrowLeft') dx = -d;
          if (e.key === 'ArrowRight') dx = d;
          if (e.key === 'ArrowUp') dy = -d;
          if (e.key === 'ArrowDown') dy = d;
          if (moveSelectedElements) moveSelectedElements(dx, dy);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', saveAutoDraft);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', saveAutoDraft);
    };
  }, [undo, redo, copySelected, pasteClipboard, duplicateSelected, deleteSelectedElement, setTool, selectedId, elements, updateSelectedElement, grid, vw, vh, saveAutoDraft]);
}
