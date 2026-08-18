import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULTS = {
  Image: [120, 60],
  Button: [120, 30],
  Text: [120, 20],
  Panel: [200, 140],
  ProgressBar: [160, 20],
  Slider: [180, 24],
  Checkbox: [140, 24],
  TextField: [160, 28]
};

export function useGuiState() {
  const [vw, setVw] = useState(640);
  const [vh, setVh] = useState(360);
  const [grid, setGrid] = useState(8);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [pixelArtMode, setPixelArtMode] = useState(true);
  const [scope, setScope] = useState('engine.ctx');
  const [targetComment, setTargetComment] = useState('// UI_HERE');

  const [tool, setTool] = useState('Select');
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedIdState] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [idCounter, setIdCounter] = useState(0);

  const [projectAssets, setProjectAssets] = useState({ textures: [], fonts: [] });

  const imageCacheRef = useRef(new Map());

  const clipboardRef = useRef(null);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const isRestoringRef = useRef(false);
  const isInitializedRef = useRef(false);

  const selectElement = useCallback((id, multi = false) => {
    if (id === null) {
      setSelectedIds([]);
      setSelectedIdState(null);
      return;
    }
    if (multi) {
      setSelectedIds(prev => {
        const exists = prev.includes(id);
        const next = exists ? prev.filter(i => i !== id) : [...prev, id];
        setSelectedIdState(next.length > 0 ? next[next.length - 1] : null);
        return next;
      });
    } else {
      setSelectedIds([id]);
      setSelectedIdState(id);
    }
  }, []);

  const setSelectedId = useCallback((id) => {
    selectElement(id, false);
  }, [selectElement]);

  const exportProjectData = useCallback(() => {
    return {
      version: 1,
      resolution: { vw, vh },
      grid: { size: grid, snap: snapToGrid },
      pixelArtMode,
      scope,
      targetComment,
      idCounter,
      elements: elements.map(el => ({
        id: el.id,
        type: el.type,
        x: el.x,
        y: el.y,
        w: el.w,
        h: el.h,
        tag: el.tag,
        anchor: el.anchor,
        padL: el.padL,
        padT: el.padT,
        padR: el.padR,
        padB: el.padB,
        assetName: el.assetName || '',
        assetPath: el.assetPath || '',
        fontName: el.fontName || '',
        fontPath: el.fontPath || '',
        labelVal: el.labelVal || '',
        fontSize: el.fontSize || 16,
        textAlign: el.textAlign || 'Left',
        shadowEnabled: !!el.shadowEnabled,
        shadowX: el.shadowX ?? 2,
        shadowY: el.shadowY ?? 2,
        outlineEnabled: !!el.outlineEnabled,
        outlineW: el.outlineW ?? 1,
        nsL: el.nsL || 0,
        nsT: el.nsT || 0,
        nsR: el.nsR || 0,
        nsB: el.nsB || 0,
        sliderMin: el.sliderMin ?? 0,
        sliderMax: el.sliderMax ?? 1,
        sliderVal: el.sliderVal ?? 0.5,
        checked: el.checked !== false,
        placeholder: el.placeholder || 'Type here...',
        plainInput: !!el.plainInput,
        dataUrl: el.dataUrl || '',
        fontDataUrl: el.fontDataUrl || '',
        visible: el.visible !== false,
      }))
    };
  }, [vw, vh, grid, snapToGrid, pixelArtMode, scope, targetComment, idCounter, elements]);

  const saveHistory = useCallback(() => {
    if (!isInitializedRef.current || isRestoringRef.current) return;
    const snap = JSON.stringify(exportProjectData());
    const stack = undoStackRef.current;
    if (stack.length === 0 || stack[stack.length - 1] !== snap) {
      stack.push(snap);
      if (stack.length > 50) stack.shift();
      redoStackRef.current = [];
    }
  }, [exportProjectData]);

  const saveAutoDraft = useCallback(() => {
    try {
      localStorage.setItem('rusted_gui_auto_draft', JSON.stringify(exportProjectData()));
    } catch (e) {}
  }, [exportProjectData]);

  const importProjectData = useCallback((data) => {
    if (!data || !Array.isArray(data.elements)) return;

    if (data.resolution) {
      setVw(parseInt(data.resolution.vw) || 640);
      setVh(parseInt(data.resolution.vh) || 360);
    }
    if (data.grid) {
      setGrid(parseInt(data.grid.size) || 8);
      setSnapToGrid(data.grid.snap !== false);
    }
    if (typeof data.pixelArtMode === 'boolean') {
      setPixelArtMode(data.pixelArtMode);
    }
    if (data.scope) setScope(data.scope);
    if (data.targetComment) setTargetComment(data.targetComment);

    const restoredElements = data.elements.map(el => {
      let imgObj = null;

      if (el.dataUrl) {
        if (imageCacheRef.current.has(el.dataUrl)) {
          imgObj = imageCacheRef.current.get(el.dataUrl);
        } else {
          const img = new window.Image();
          img.onload = () => {
            imageCacheRef.current.set(el.dataUrl, img);
            setElements(prev => prev.map(e => e.id === el.id ? { ...e, imgObj: img } : e));
          };
          img.src = el.dataUrl;
          if (img.complete) {
            imageCacheRef.current.set(el.dataUrl, img);
            imgObj = img;
          }
        }
      }

      if (el.fontName && el.fontDataUrl) {
        (async () => {
          try {
            const fontFace = new FontFace(el.fontName, el.fontDataUrl);
            await fontFace.load();
            document.fonts.add(fontFace);
          } catch (e) {}
        })();
      }

      return { ...el, imgObj };
    });

    setElements(restoredElements);
    setIdCounter(Math.max(0, ...restoredElements.map(e => e.id || 0), data.idCounter || 0));
    setSelectedIds([]);
    setSelectedIdState(null);
  }, []);

  // Initial Restore & History Initialization ONCE on Mount
  useEffect(() => {
    try {
      const json = localStorage.getItem('rusted_gui_auto_draft');
      if (json) {
        const data = JSON.parse(json);
        if (data && Array.isArray(data.elements) && data.elements.length > 0) {
          isRestoringRef.current = true;
          importProjectData(data);
          isRestoringRef.current = false;
        }
      }
    } catch (e) {}
    isInitializedRef.current = true;
    undoStackRef.current = [JSON.stringify(exportProjectData())];
  }, []);

  // Auto-Save ONLY AFTER Initialization
  useEffect(() => {
    if (isInitializedRef.current && !isRestoringRef.current) {
      saveAutoDraft();
    }
  }, [elements, vw, vh, grid, snapToGrid, pixelArtMode, scope, targetComment, saveAutoDraft]);

  // Undo / Redo Actions
  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length <= 1) return;
    const currentState = stack.pop();
    redoStackRef.current.push(currentState);
    const previousState = stack[stack.length - 1];
    if (previousState) {
      isRestoringRef.current = true;
      importProjectData(JSON.parse(previousState));
      isRestoringRef.current = false;
    }
  }, [importProjectData]);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    const nextState = stack.pop();
    undoStackRef.current.push(nextState);
    isRestoringRef.current = true;
    importProjectData(JSON.parse(nextState));
    isRestoringRef.current = false;
  }, [importProjectData]);

  // Element Factory
  const addElement = useCallback((type, vx, vy) => {
    saveHistory();
    const [dw, dh] = DEFAULTS[type] || [120, 30];
    const newId = idCounter + 1;
    setIdCounter(newId);

    const assetName = type === 'Image' ? `texture_${newId}` : '';
    const newEl = {
      id: newId,
      type,
      x: Math.max(0, Math.min(vw - dw, Math.round((vx - dw / 2) / grid) * grid)),
      y: Math.max(0, Math.min(vh - dh, Math.round((vy - dh / 2) / grid) * grid)),
      w: dw,
      h: dh,
      tag: `${type.toLowerCase()}_${newId}`,
      anchor: 'None', padL: 0, padT: 0, padR: 0, padB: 0,
      assetName,
      assetPath: assetName ? `assets/${assetName}.png` : '',
      fontName: '',
      fontPath: '',
      labelVal: type === 'Button' ? 'Click me' : (type === 'Text' ? 'Text' : (type === 'Slider' ? 'Volume' : (type === 'Checkbox' ? 'Toggle Option' : ''))),
      fontSize: 16,
      textAlign: 'Left',
      shadowEnabled: false, shadowX: 2, shadowY: 2,
      outlineEnabled: false, outlineW: 1,
      nsL: 0, nsT: 0, nsR: 0, nsB: 0,
      sliderMin: 0, sliderMax: 1, sliderVal: 0.5,
      checked: true,
      placeholder: 'Type here...',
      plainInput: false,
      visible: true,
      imgObj: null,
    };

    setElements(prev => [...prev, newEl]);
    setSelectedIds([newId]);
    setSelectedIdState(newId);
    setTool('Select');
  }, [idCounter, vw, vh, grid, saveHistory]);

  const updateSelectedElement = useCallback((updater) => {
    if (selectedIds.length === 0) return;
    saveHistory();
    const ids = new Set(selectedIds);
    setElements(prev => prev.map(el => ids.has(el.id) ? (typeof updater === 'function' ? updater(el) : { ...el, ...updater }) : el));
  }, [selectedIds, saveHistory]);

  const moveSelectedElements = useCallback((dx, dy) => {
    if (selectedIds.length === 0) return;
    saveHistory();
    const ids = new Set(selectedIds);
    setElements(prev => prev.map(el => {
      if (!ids.has(el.id)) return el;
      const nx = Math.max(0, Math.min(vw - el.w, el.x + dx));
      const ny = Math.max(0, Math.min(vh - el.h, el.y + dy));
      return { ...el, x: nx, y: ny };
    }));
  }, [selectedIds, vw, vh, saveHistory]);

  const deleteSelectedElement = useCallback(() => {
    if (selectedIds.length === 0) return;
    saveHistory();
    const idsToRemove = new Set(selectedIds);
    setElements(prev => prev.filter(el => !idsToRemove.has(el.id)));
    setSelectedIds([]);
    setSelectedIdState(null);
  }, [selectedIds, saveHistory]);

  const copySelected = useCallback(() => {
    const ids = new Set(selectedIds);
    const toCopy = elements.filter(e => ids.has(e.id));
    if (toCopy.length > 0) clipboardRef.current = JSON.parse(JSON.stringify(toCopy));
  }, [elements, selectedIds]);

  const pasteClipboard = useCallback(() => {
    if (!clipboardRef.current) return;
    saveHistory();
    const newId = idCounter + 1;
    setIdCounter(newId);
    const newEl = {
      ...JSON.parse(JSON.stringify(clipboardRef.current)),
      id: newId,
      x: Math.max(0, Math.min(vw - 20, clipboardRef.current.x + grid)),
      y: Math.max(0, Math.min(vh - 20, clipboardRef.current.y + grid)),
      tag: `${clipboardRef.current.type.toLowerCase()}_${newId}`
    };
    if (newEl.dataUrl) {
      const img = new window.Image();
      img.onload = () => { newEl.imgObj = img; setElements(prev => [...prev]); };
      img.src = newEl.dataUrl;
    }
    setElements(prev => [...prev, newEl]);
    setSelectedId(newId);
  }, [idCounter, vw, vh, grid, saveHistory]);

  const duplicateSelected = useCallback(() => {
    copySelected();
    pasteClipboard();
  }, [copySelected, pasteClipboard]);

  const alignToElement = useCallback((sourceId, targetId, mode) => {
    const target = elements.find(e => e.id === targetId);
    if (!target) return;
    saveHistory();
    setElements(prev => prev.map(el => {
      if (el.id !== sourceId) return el;
      let nx = el.x, ny = el.y;
      if (mode === 'center') {
        nx = Math.round(target.x + (target.w - el.w) / 2);
        ny = Math.round(target.y + (target.h - el.h) / 2);
      } else if (mode === 'center-h') {
        nx = Math.round(target.x + (target.w - el.w) / 2);
      } else if (mode === 'center-v') {
        ny = Math.round(target.y + (target.h - el.h) / 2);
      } else if (mode === 'align-left') {
        nx = target.x;
      } else if (mode === 'align-right') {
        nx = target.x + target.w - el.w;
      } else if (mode === 'align-top') {
        ny = target.y;
      } else if (mode === 'align-bottom') {
        ny = target.y + target.h - el.h;
      }
      return { ...el, x: Math.max(0, nx), y: Math.max(0, ny) };
    }));
  }, [elements, saveHistory]);

  const [smartSnap, setSmartSnap] = useState(true);
  const [snapDistance, setSnapDistance] = useState(6);
  const [snapTargetMode, setSnapTargetMode] = useState('both'); // 'both', 'center', 'edges'

  return {
    vw, setVw, vh, setVh, grid, setGrid, snapToGrid, setSnapToGrid,
    smartSnap, setSmartSnap, snapDistance, setSnapDistance, snapTargetMode, setSnapTargetMode,
    pixelArtMode, setPixelArtMode, scope, setScope, targetComment, setTargetComment,
    tool, setTool, elements, setElements, selectedId, setSelectedId, selectedIds, selectElement, moveSelectedElements,
    projectAssets, setProjectAssets,
    addElement, updateSelectedElement, deleteSelectedElement, alignToElement, saveHistory,
    copySelected, pasteClipboard, duplicateSelected, undo, redo,
    exportProjectData, importProjectData, saveAutoDraft
  };
}
