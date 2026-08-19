import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export function CanvasArea({
  vw, vh, grid, snapToGrid, smartSnap = true, snapDistance = 6, snapTargetMode = 'both',
  pixelArtMode, tool, setTool, elements, setElements, selectedId, setSelectedId, selectedIds = [], selectElement, addElement, saveHistory
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const isPanningRef = useRef(false);

  const dragStartRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Resize base scale to fit container
  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth - 64;
    const ch = containerRef.current.clientHeight - 64;
    const s = Math.max(0.05, Math.min(cw / vw, ch / vh));
    setBaseScale(s);
  }, [vw, vh]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  const scale = baseScale * zoom;

  // Cursor-Centered Wheel Zoom Listener (Smooth Exponential)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - (rect.left + rect.width / 2);
      const mouseY = e.clientY - (rect.top + rect.height / 2);

      const factor = Math.exp(-e.deltaY * 0.0012);

      setZoom(prevZoom => {
        const newZoom = Math.max(0.25, Math.min(6.0, prevZoom * factor));
        const k = newZoom / prevZoom;

        setPan(prevPan => ({
          x: mouseX - (mouseX - prevPan.x) * k,
          y: mouseY - (mouseY - prevPan.y) * k
        }));

        return newZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const resetViewport = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Virtual Coordinates mapper (unclamped to detect out-of-bounds clicks)
  const getVirtualCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) * (vw / rect.width);
    const rawY = (e.clientY - rect.top) * (vh / rect.height);
    return { vx: rawX, vy: rawY };
  };

  const getHandles = (el) => {
    const x = el.x * scale, y = el.y * scale, w = el.w * scale, h = el.h * scale;
    return [
      { n: 'nw', sx: x, sy: y }, { n: 'n', sx: x + w / 2, sy: y }, { n: 'ne', sx: x + w, sy: y },
      { n: 'w', sx: x, sy: y + h / 2 }, { n: 'e', sx: x + w, sy: y + h / 2 },
      { n: 'sw', sx: x, sy: y + h }, { n: 's', sx: x + w / 2, sy: y + h }, { n: 'se', sx: x + w, sy: y + h }
    ];
  };

  const hitElement = (vx, vy) => {
    if (vx < 0 || vx > vw || vy < 0 || vy > vh) return null;
    for (let i = elements.length - 1; i >= 0; i--) {
      const e = elements[i];
      if (e.visible !== false && vx >= e.x && vx <= e.x + e.w && vy >= e.y && vy <= e.y + e.h) return e;
    }
    return null;
  };

  const hitHandle = (vx, vy, el) => {
    if (!el) return null;
    const ht = 9 / scale;
    for (const h of getHandles(el)) {
      if (Math.abs(vx - h.sx / scale) <= ht && Math.abs(vy - h.sy / scale) <= ht) return h.n;
    }
    return null;
  };

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const C = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const cssW = Math.round(vw * scale);
    const cssH = Math.round(vh * scale);

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    C.save();
    C.scale(dpr, dpr);
    C.imageSmoothingEnabled = !pixelArtMode;

    // Background
    C.fillStyle = '#0a0a0c';
    C.fillRect(0, 0, cssW, cssH);

    // Grid
    if (scale >= 0.4) {
      C.strokeStyle = 'rgba(255,255,255,0.03)';
      C.lineWidth = 0.5;
      for (let x = 0; x <= vw; x += grid) {
        const px = Math.round(x * scale);
        C.beginPath(); C.moveTo(px, 0); C.lineTo(px, cssH); C.stroke();
      }
      for (let y = 0; y <= vh; y += grid) {
        const py = Math.round(y * scale);
        C.beginPath(); C.moveTo(0, py); C.lineTo(cssW, py); C.stroke();
      }
    }

    // Draw Elements
    for (const el of elements) {
      if (el.visible === false) continue;
      const sel = el.id === selectedId;
      const px = Math.round(el.x * scale), py = Math.round(el.y * scale);
      const pw = Math.round(el.w * scale), ph = Math.round(el.h * scale);

      if (el.type === 'Text') {
        const fontSize = el.fontSize || 16;
        const fs = Math.max(8, Math.round(fontSize * scale));
        const fontFam = el.fontName ? `"${el.fontName}", sans-serif` : 'sans-serif';
        C.font = `600 ${fs}px ${fontFam}`;
        C.textBaseline = 'top';

        const textVal = el.labelVal || 'Text';
        let tx = px;
        if (el.textAlign === 'Center') { C.textAlign = 'center'; tx = px + pw / 2; }
        else if (el.textAlign === 'Right') { C.textAlign = 'right'; tx = px + pw; }
        else { C.textAlign = 'left'; tx = px; }

        if (el.shadowEnabled) {
          C.fillStyle = 'rgba(0, 0, 0, 0.7)';
          C.fillText(textVal, tx + (el.shadowX || 2) * scale, py + (el.shadowY || 2) * scale);
        }
        if (el.outlineEnabled) {
          C.strokeStyle = '#000000';
          C.lineWidth = (el.outlineW || 1) * scale * 2;
          C.strokeText(textVal, tx, py);
        }
        C.fillStyle = '#ffffff';
        C.fillText(textVal, tx, py);

        if (sel) {
          C.setLineDash([3, 3]); C.strokeStyle = 'rgba(255, 255, 255, 0.4)'; C.lineWidth = 1;
          C.strokeRect(px - 1.5, py - 1.5, pw + 3, ph + 3); C.setLineDash([]);
        }
      } else if (el.type === 'Slider') {
        C.fillStyle = '#1c1c21'; C.fillRect(px, py, pw, ph);
        const trackH = Math.max(4, Math.round(6 * scale));
        const trackY = py + (ph - trackH) / 2;
        C.fillStyle = '#27272a'; C.fillRect(px + 4, trackY, pw - 8, trackH);
        const norm = Math.max(0, Math.min(1, ((el.sliderVal || 0.5) - (el.sliderMin || 0)) / ((el.sliderMax || 1) - (el.sliderMin || 0))));
        const fillW = (pw - 8) * norm;
        C.fillStyle = '#6366f1'; C.fillRect(px + 4, trackY, fillW, trackH);
        const thumbR = Math.max(5, Math.round(7 * scale));
        C.beginPath(); C.arc(px + 4 + fillW, py + ph / 2, thumbR, 0, Math.PI * 2);
        C.fillStyle = '#ffffff'; C.fill(); C.strokeStyle = '#6366f1'; C.lineWidth = 1.5; C.stroke();
        C.strokeStyle = sel ? '#ffffff' : '#3f3f46'; C.lineWidth = sel ? 1.5 : 1;
        C.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      } else if (el.type === 'Checkbox') {
        const boxS = Math.min(ph - 4, Math.max(12, Math.round(16 * scale)));
        const boxY = py + (ph - boxS) / 2;
        C.fillStyle = el.checked ? '#22c55e' : '#1c1c21'; C.fillRect(px + 2, boxY, boxS, boxS);
        C.strokeStyle = sel ? '#ffffff' : '#3f3f46'; C.lineWidth = 1; C.strokeRect(px + 2.5, boxY + 0.5, boxS - 1, boxS - 1);
        if (el.checked) {
          C.font = `bold ${Math.max(10, Math.round(boxS * 0.8))}px sans-serif`;
          C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillStyle = '#ffffff';
          C.fillText('✓', px + 2 + boxS / 2, boxY + boxS / 2 + 1);
        }
        if (el.labelVal) {
          C.font = `500 ${Math.max(10, Math.round(11 * scale))}px sans-serif`;
          C.textAlign = 'left'; C.textBaseline = 'middle'; C.fillStyle = sel ? '#ffffff' : '#e4e4e7';
          C.fillText(el.labelVal, px + boxS + 8, py + ph / 2);
        }
        if (sel) {
          C.setLineDash([3, 3]); C.strokeStyle = 'rgba(255, 255, 255, 0.4)'; C.lineWidth = 1;
          C.strokeRect(px - 1.5, py - 1.5, pw + 3, ph + 3); C.setLineDash([]);
        }
      } else if (el.type === 'TextField') {
        if (!el.plainInput) {
          C.fillStyle = '#18181b'; C.fillRect(px, py, pw, ph);
          C.strokeStyle = sel ? '#ffffff' : '#3f3f46'; C.lineWidth = sel ? 1.5 : 1; C.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
        } else if (sel) {
          C.setLineDash([3, 3]); C.strokeStyle = 'rgba(255, 255, 255, 0.4)'; C.lineWidth = 1;
          C.strokeRect(px - 1.5, py - 1.5, pw + 3, ph + 3); C.setLineDash([]);
        }
        const fontSize = el.fontSize || 16;
        const fs = Math.max(8, Math.round(fontSize * scale));
        const fontFam = el.fontName ? `"${el.fontName}", sans-serif` : 'sans-serif';
        C.font = `400 ${fs}px ${fontFam}`;
        C.textAlign = 'left'; C.textBaseline = 'middle'; C.fillStyle = el.labelVal ? '#ffffff' : '#71717a';
        const displayTxt = el.labelVal || el.placeholder || '';
        C.fillText(displayTxt, px + (el.plainInput ? 2 : 8), py + ph / 2);
        C.fillStyle = '#3b82f6';
        const txtW = C.measureText(el.labelVal || '').width;
        C.fillRect(px + (el.plainInput ? 3 : 9) + (el.labelVal ? txtW : 0), py + 4, 1.5, ph - 8);
      } else if (el.type === 'Image' && el.imgObj && el.imgObj.complete) {
        C.drawImage(el.imgObj, px, py, pw, ph);
        C.strokeStyle = sel ? '#ffffff' : '#27272a'; C.lineWidth = sel ? 1.5 : 1;
        C.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      } else {
        C.fillStyle = sel ? '#27272a' : '#1c1c21'; C.fillRect(px, py, pw, ph);
        C.font = `500 ${Math.max(9, Math.round(10.5 * scale))}px sans-serif`;
        C.textAlign = 'center'; C.textBaseline = 'middle'; C.fillStyle = sel ? '#ffffff' : '#a1a1aa';
        const txt = el.type === 'Image' ? `Image (${el.assetName || 'texture'})` : el.type === 'Button' ? `Button: ${el.labelVal}` : el.type === 'ProgressBar' ? `ProgressBar` : `Panel`;
        C.fillText(txt, px + pw / 2, py + ph / 2);
        C.strokeStyle = sel ? '#ffffff' : '#27272a'; C.lineWidth = sel ? 1.5 : 1;
        C.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      }

      // NineSlice Preview Lines
      if (sel && (el.nsL > 0 || el.nsT > 0 || el.nsR > 0 || el.nsB > 0)) {
        C.setLineDash([2, 2]); C.strokeStyle = '#22c55e'; C.lineWidth = 1;
        const nsl = Math.round(el.nsL * scale), nst = Math.round(el.nsT * scale);
        const nsr = Math.round(el.nsR * scale), nsb = Math.round(el.nsB * scale);
        if (nsl > 0) { C.beginPath(); C.moveTo(px + nsl, py); C.lineTo(px + nsl, py + ph); C.stroke(); }
        if (nsr > 0) { C.beginPath(); C.moveTo(px + pw - nsr, py); C.lineTo(px + pw - nsr, py + ph); C.stroke(); }
        if (nst > 0) { C.beginPath(); C.moveTo(px, py + nst); C.lineTo(px + pw, py + nst); C.stroke(); }
        if (nsb > 0) { C.beginPath(); C.moveTo(px, py + ph - nsb); C.lineTo(px + pw, py + ph - nsb); C.stroke(); }
        C.setLineDash([]);
      }      // Handles & Selection Tag Badge
      const isMultiSelected = selectedIds && selectedIds.includes(el.id);
      if (isMultiSelected && !sel) {
        C.setLineDash([3, 3]); C.strokeStyle = '#6366f1'; C.lineWidth = 1;
        C.strokeRect(px - 1.5, py - 1.5, pw + 3, ph + 3); C.setLineDash([]);
      }

      if (sel) {
        for (const h of getHandles(el)) {
          C.fillStyle = '#ffffff'; C.strokeStyle = '#09090b'; C.lineWidth = 1.5;
          C.beginPath(); C.rect(Math.round(h.sx - 3), Math.round(h.sy - 3), 6, 6); C.fill(); C.stroke();
        }
        const badgeText = `${el.type} [${el.x}, ${el.y}] (${el.w}×${el.h})`;
        C.font = '10px monospace';
        const tw = C.measureText(badgeText).width;
        const bx = Math.max(0, px);
        const by = py > 20 ? py - 18 : py + ph + 4;
        C.fillStyle = '#121215'; C.fillRect(bx, by, tw + 8, 15);
        C.strokeStyle = '#3f3f46'; C.lineWidth = 1; C.strokeRect(bx + 0.5, by + 0.5, tw + 7, 14);
        C.fillStyle = '#f4f4f5'; C.textAlign = 'left'; C.textBaseline = 'middle';
        C.fillText(badgeText, bx + 4, by + 7.5);
      }

      // Smart Alignment Snap Lines (Single Main X and Single Main Y Center/Edge Snap)
      if (smartSnap && sel && (isDraggingRef.current || isResizingRef.current)) {
        const selLeft = Math.round(el.x);
        const selRight = Math.round(el.x + el.w);
        const selCenterX = Math.round(el.x + el.w / 2);
        const selTop = Math.round(el.y);
        const selBottom = Math.round(el.y + el.h);
        const selCenterY = Math.round(el.y + el.h / 2);

        let bestVSnap = null;
        let bestHSnap = null;

        const targets = [
          { x: 0, y: 0, w: vw, h: vh, isScreen: true },
          ...elements.filter(o => o.id !== el.id && o.visible !== false)
        ];

        const checkCenter = snapTargetMode === 'both' || snapTargetMode === 'center';
        const checkEdges = snapTargetMode === 'both' || snapTargetMode === 'edges';

        for (const target of targets) {
          const tLeft = Math.round(target.x);
          const tRight = Math.round(target.x + target.w);
          const tCenterX = Math.round(target.x + target.w / 2);
          const tTop = Math.round(target.y);
          const tBottom = Math.round(target.y + target.h);
          const tCenterY = Math.round(target.y + target.h / 2);

          // Vertical Candidates
          if (checkCenter && Math.abs(selCenterX - tCenterX) <= 1) {
            if (!bestVSnap || bestVSnap.prio > 1) bestVSnap = { pos: tCenterX, prio: 1 };
          }
          if (checkEdges && !target.isScreen) {
            if (Math.abs(selLeft - tLeft) <= 1) bestVSnap = { pos: tLeft, prio: 2 };
            else if (Math.abs(selRight - tRight) <= 1) bestVSnap = { pos: tRight, prio: 2 };
            else if (Math.abs(selLeft - tRight) <= 1) bestVSnap = { pos: tRight, prio: 3 };
            else if (Math.abs(selRight - tLeft) <= 1) bestVSnap = { pos: tLeft, prio: 3 };
          }

          // Horizontal Candidates
          if (checkCenter && Math.abs(selCenterY - tCenterY) <= 1) {
            if (!bestHSnap || bestHSnap.prio > 1) bestHSnap = { pos: tCenterY, prio: 1 };
          }
          if (checkEdges && !target.isScreen) {
            if (Math.abs(selTop - tTop) <= 1) bestHSnap = { pos: tTop, prio: 2 };
            else if (Math.abs(selBottom - tBottom) <= 1) bestHSnap = { pos: tBottom, prio: 2 };
            else if (Math.abs(selTop - tBottom) <= 1) bestHSnap = { pos: tBottom, prio: 3 };
            else if (Math.abs(selBottom - tTop) <= 1) bestHSnap = { pos: tTop, prio: 3 };
          }
        }

        // Render Single Main Vertical Snap Line (+0.5 for crisp canvas line)
        if (bestVSnap) {
          const lineX = Math.round(bestVSnap.pos * scale) + 0.5;
          C.setLineDash([3, 3]);
          C.strokeStyle = bestVSnap.prio === 1 ? '#6366f1' : 'rgba(161, 161, 170, 0.4)';
          C.lineWidth = 1;
          C.beginPath(); C.moveTo(lineX, 0); C.lineTo(lineX, cssH); C.stroke();
          C.setLineDash([]);
        }

        // Render Single Main Horizontal Snap Line (+0.5 for crisp canvas line)
        if (bestHSnap) {
          const lineY = Math.round(bestHSnap.pos * scale) + 0.5;
          C.setLineDash([3, 3]);
          C.strokeStyle = bestHSnap.prio === 1 ? '#6366f1' : 'rgba(161, 161, 170, 0.4)';
          C.lineWidth = 1;
          C.beginPath(); C.moveTo(0, lineY); C.lineTo(cssW, lineY); C.stroke();
          C.setLineDash([]);
        }
      }
    }

    C.restore();
  }, [vw, vh, grid, scale, pixelArtMode, elements, selectedId, selectedIds, smartSnap, snapDistance, snapTargetMode]);

  // Mouse Handlers
  const handleMouseDown = (e) => {
    if (e.button === 1 || e.button === 2) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    const { vx, vy } = getVirtualCoords(e);
    if (tool !== 'Select') {
      addElement(tool, vx, vy);
      return;
    }

    const sel = elements.find(el => el.id === selectedId);
    if (sel) {
      const h = hitHandle(vx, vy, sel);
      if (h) {
        isResizingRef.current = true;
        resizeHandleRef.current = h;
        dragStartRef.current = { vx, vy, x: sel.x, y: sel.y, w: sel.w, h: sel.h };
        return;
      }
    }

    const hit = hitElement(vx, vy);
    if (hit) {
      const isShift = e.shiftKey;
      if (isShift) {
        if (selectElement) selectElement(hit.id, true);
      } else {
        if (!selectedIds.includes(hit.id)) {
          if (selectElement) selectElement(hit.id, false);
        }
      }

      const activeIds = isShift
        ? (selectedIds.includes(hit.id) ? selectedIds : [...selectedIds, hit.id])
        : (selectedIds.includes(hit.id) ? selectedIds : [hit.id]);

      isDraggingRef.current = true;
      dragStartRef.current = {
        vx, vy,
        primaryId: hit.id,
        elements: elements.filter(el => activeIds.includes(el.id)).map(el => ({ id: el.id, x: el.x, y: el.y, w: el.w, h: el.h }))
      };
    } else {
      if (selectElement) selectElement(null);
    }
  };

  const handleMouseMove = (e) => {
    if (isPanningRef.current) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    const { vx, vy } = getVirtualCoords(e);

    if (isDraggingRef.current && dragStartRef.current && dragStartRef.current.elements) {
      const dx = vx - dragStartRef.current.vx;
      const dy = vy - dragStartRef.current.vy;

      const primary = dragStartRef.current.elements.find(e => e.id === dragStartRef.current.primaryId) || dragStartRef.current.elements[0];
      let pnx = primary.x + dx;
      let pny = primary.y + dy;

      if (snapToGrid) {
        pnx = Math.round(pnx / grid) * grid;
        pny = Math.round(pny / grid) * grid;
      }

      const el = elements.find(item => item.id === primary.id);
      if (smartSnap && el) {
        const threshold = snapDistance || 6;
        const selW = el.w, selH = el.h;
        const selCX = Math.round(pnx + selW / 2);
        const selCY = Math.round(pny + selH / 2);

        const checkCenter = snapTargetMode === 'both' || snapTargetMode === 'center';
        const checkEdges = snapTargetMode === 'both' || snapTargetMode === 'edges';

        const activeSet = new Set(dragStartRef.current.elements.map(e => e.id));
        const targets = [
          { x: 0, y: 0, w: vw, h: vh, isScreen: true },
          ...elements.filter(o => !activeSet.has(o.id) && o.visible !== false)
        ];

        let bestVSnap = null;
        let bestHSnap = null;

        for (const target of targets) {
          const tLeft = Math.round(target.x);
          const tRight = Math.round(target.x + target.w);
          const tCX = Math.round(target.x + target.w / 2);
          const tTop = Math.round(target.y);
          const tBottom = Math.round(target.y + target.h);
          const tCY = Math.round(target.y + target.h / 2);

          if (checkCenter) {
            const diffCX = Math.abs(selCX - tCX);
            if (diffCX <= threshold && (!bestVSnap || diffCX < bestVSnap.diff)) {
              bestVSnap = { snapX: Math.round(tCX - selW / 2), diff: diffCX };
            }
          }
          if (checkEdges && !target.isScreen) {
            const diffL = Math.abs(Math.round(pnx) - tLeft);
            if (diffL <= threshold && (!bestVSnap || diffL < bestVSnap.diff)) {
              bestVSnap = { snapX: tLeft, diff: diffL };
            }
            const diffR = Math.abs(Math.round(pnx + selW) - tRight);
            if (diffR <= threshold && (!bestVSnap || diffR < bestVSnap.diff)) {
              bestVSnap = { snapX: tRight - selW, diff: diffR };
            }
          }

          if (checkCenter) {
            const diffCY = Math.abs(selCY - tCY);
            if (diffCY <= threshold && (!bestHSnap || diffCY < bestHSnap.diff)) {
              bestHSnap = { snapY: Math.round(tCY - selH / 2), diff: diffCY };
            }
          }
          if (checkEdges && !target.isScreen) {
            const diffT = Math.abs(Math.round(pny) - tTop);
            if (diffT <= threshold && (!bestHSnap || diffT < bestHSnap.diff)) {
              bestHSnap = { snapY: tTop, diff: diffT };
            }
            const diffB = Math.abs(Math.round(pny + selH) - tBottom);
            if (diffB <= threshold && (!bestHSnap || diffB < bestHSnap.diff)) {
              bestHSnap = { snapY: tBottom - selH, diff: diffB };
            }
          }
        }

        if (bestVSnap) pnx = bestVSnap.snapX;
        if (bestHSnap) pny = bestHSnap.snapY;
      }

      const deltaX = pnx - primary.x;
      const deltaY = pny - primary.y;

      const draggedMap = new Map(dragStartRef.current.elements.map(item => [
        item.id,
        {
          x: Math.max(0, Math.min(vw - 10, Math.round(item.x + deltaX))),
          y: Math.max(0, Math.min(vh - 10, Math.round(item.y + deltaY)))
        }
      ]));

      setElements(prev => prev.map(item => draggedMap.has(item.id) ? { ...item, ...draggedMap.get(item.id) } : item));
      return;
    }

    if (isResizingRef.current && selectedId) {
      const dx = vx - dragStartRef.current.vx;
      const dy = vy - dragStartRef.current.vy;
      const handle = resizeHandleRef.current;

      setElements(prev => prev.map(item => {
        if (item.id !== selectedId) return item;
        let { x, y, w, h } = dragStartRef.current;
        if (handle.includes('e')) w = Math.max(8, snapToGrid ? Math.round((w + dx) / grid) * grid : Math.round(w + dx));
        if (handle.includes('s')) h = Math.max(8, snapToGrid ? Math.round((h + dy) / grid) * grid : Math.round(h + dy));
        if (handle.includes('w')) {
          const nw = Math.max(8, snapToGrid ? Math.round((w - dx) / grid) * grid : Math.round(w - dx));
          x = x + (w - nw); w = nw;
        }
        if (handle.includes('n')) {
          const nh = Math.max(8, snapToGrid ? Math.round((h - dy) / grid) * grid : Math.round(h - dy));
          y = y + (h - nh); h = nh;
        }
        return { ...item, x, y, w, h };
      }));
    }
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current || isResizingRef.current) {
      if (saveHistory) saveHistory();
    }
    isDraggingRef.current = false;
    isResizingRef.current = false;
    isPanningRef.current = false;
  };

  return (
    <main
      ref={containerRef}
      onContextMenu={e => e.preventDefault()}
      onMouseDown={e => {
        if (e.target === containerRef.current || e.target.id === 'canvas-container') {
          if (e.button === 0) setSelectedId(null);
        }
      }}
      className="flex-1 bg-[#0a0a0c] flex items-center justify-center relative overflow-hidden select-none"
    >
      {/* Resolution Badge Top Center */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#121215]/90 border border-[#27272a] px-3 py-1 rounded-full text-[10.5px] font-semibold text-zinc-400 pointer-events-none shadow-md z-20">
        {vw} × {vh}
      </div>

      {/* Floating Zoom Controls Bottom Right */}
      <div className="absolute bottom-4 right-4 bg-[#141418]/90 backdrop-blur-md border border-[#242429] px-2.5 py-1 rounded-xl text-[11px] font-mono text-zinc-300 shadow-xl flex items-center gap-1.5 z-20">
        <button
          onClick={() => {
            setZoom(prev => {
              const newZoom = Math.max(0.25, prev / 1.2);
              const k = newZoom / prev;
              setPan(p => ({ x: p.x * k, y: p.y * k }));
              return newZoom;
            });
          }}
          title="Zoom Out"
          className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="w-12 text-center font-bold text-zinc-200">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => {
            setZoom(prev => {
              const newZoom = Math.min(6.0, prev * 1.2);
              const k = newZoom / prev;
              setPan(p => ({ x: p.x * k, y: p.y * k }));
              return newZoom;
            });
          }}
          title="Zoom In"
          className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetViewport}
          title="Reset Zoom & Pan"
          className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all ml-0.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        id="canvas-container"
        className="relative transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`
        }}
      >
        <div className="border border-[#27272a] rounded-lg shadow-2xl overflow-hidden bg-black">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="block rounded-md cursor-default"
          />
        </div>
      </div>
    </main>
  );
}
