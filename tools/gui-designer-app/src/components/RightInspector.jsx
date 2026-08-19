import React, { useState } from 'react';
import {
  Upload, SlidersHorizontal, AlignLeft, AlignCenter, AlignRight,
  ArrowUpToLine, ArrowDownToLine, MoveVertical, MoveHorizontal,
  ArrowUpLeft, ArrowUp, ArrowUpRight, ArrowLeft, X, ArrowRight,
  ArrowDownLeft, ArrowDown, ArrowDownRight, Image as ImageIcon, Type as TypeIcon
} from 'lucide-react';

const ANCHORS = [
  { id: 'TopLeft', label: 'TL', icon: ArrowUpLeft, title: 'Top-Left' },
  { id: 'TopCenter', label: 'TC', icon: ArrowUp, title: 'Top-Center' },
  { id: 'TopRight', label: 'TR', icon: ArrowUpRight, title: 'Top-Right' },
  { id: 'CenterLeft', label: 'CL', icon: ArrowLeft, title: 'Center-Left' },
  { id: 'None', label: 'Off', icon: X, title: 'Absolute (No Anchor)' },
  { id: 'CenterRight', label: 'CR', icon: ArrowRight, title: 'Center-Right' },
  { id: 'BottomLeft', label: 'BL', icon: ArrowDownLeft, title: 'Bottom-Left' },
  { id: 'BottomCenter', label: 'BC', icon: ArrowDown, title: 'Bottom-Center' },
  { id: 'BottomRight', label: 'BR', icon: ArrowDownRight, title: 'Bottom-Right' },
];

export function RightInspector({
  elements, selectedId, updateSelectedElement, alignToElement, projectAssets, vw, vh
}) {
  const [targetId, setTargetId] = useState('');
  const el = elements.find(item => item.id === selectedId);
  const otherElements = elements.filter(item => item.id !== selectedId);

  if (!el) {
    return (
      <aside className="w-72 bg-[#101014] border-l border-[#1f1f24] p-6 flex flex-col items-center justify-center text-center text-zinc-500 text-xs select-none">
        <div className="w-12 h-12 rounded-2xl bg-[#16161a] border border-[#27272c] flex items-center justify-center text-zinc-500 mb-3 shadow-inner">
          <SlidersHorizontal className="w-5 h-5 text-indigo-400/80" />
        </div>
        <p className="font-semibold text-zinc-300 text-[13px]">No element selected</p>
        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed max-w-[200px]">Click any widget on the canvas to inspect and customize properties.</p>
      </aside>
    );
  }

  const handleAlign = (type) => {
    let nx = el.x, ny = el.y;
    if (type === 'left') nx = 0;
    if (type === 'center-h') nx = Math.round((vw - el.w) / 2);
    if (type === 'right') nx = vw - el.w;
    if (type === 'top') ny = 0;
    if (type === 'center-v') ny = Math.round((vh - el.h) / 2);
    if (type === 'bottom') ny = vh - el.h;
    updateSelectedElement({ x: nx, y: ny });
  };

  const handleTextureFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const assetName = file.name.replace(/\.[^/.]+$/, "");
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      const img = new Image();
      img.onload = () => {
        updateSelectedElement({
          assetName,
          assetPath: `assets/${file.name}`,
          tag: assetName,
          imgObj: img,
          dataUrl,
          w: img.naturalWidth,
          h: img.naturalHeight
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFontFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fontName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_");
    const reader = new FileReader();
    reader.onload = async ev => {
      const fontDataUrl = ev.target.result;
      try {
        const fontFace = new FontFace(fontName, fontDataUrl);
        await fontFace.load();
        document.fonts.add(fontFace);
        updateSelectedElement({ fontName, fontPath: `assets/${file.name}`, fontDataUrl });
      } catch (err) {
        alert("Failed to load TTF font:\n" + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <aside className="w-72 bg-[#101014] border-l border-[#1f1f24] flex flex-col flex-shrink-0 select-none text-xs">
      {/* Header Badge */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#1f1f24] bg-[#141419]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span className="font-semibold text-zinc-100 text-[13px] tracking-tight">{el.type}</span>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-zinc-300">#{el.id}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Align Section */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-medium text-zinc-400">Quick Screen Alignment</span>
          <div className="grid grid-cols-6 gap-1 bg-[#16161a] p-1 rounded-xl border border-[#242429]">
            <button onClick={() => handleAlign('left')} title="Align Left" className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all">
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleAlign('center-h')} title="Center Horizontally" className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all">
              <MoveHorizontal className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleAlign('right')} title="Align Right" className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all">
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleAlign('top')} title="Align Top" className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all">
              <ArrowUpToLine className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleAlign('center-v')} title="Center Vertically" className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all">
              <MoveVertical className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleAlign('bottom')} title="Align Bottom" className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all">
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Align Relative To Other Element Section */}
        {otherElements.length > 0 && (
          <div className="space-y-2 border-t border-[#1f1f24] pt-3.5">
            <span className="text-[11px] font-medium text-zinc-400">Align Relative To Target Element</span>
            <select
              value={targetId}
              onChange={e => setTargetId(parseInt(e.target.value) || '')}
              className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Choose Target Element --</option>
              {otherElements.map(other => (
                <option key={other.id} value={other.id}>
                  {other.tag} ({other.type})
                </option>
              ))}
            </select>

            {targetId ? (
              <div className="grid grid-cols-2 gap-1.5 bg-[#16161a] p-1.5 rounded-xl border border-[#242429]">
                <button
                  onClick={() => alignToElement(el.id, targetId, 'center')}
                  title="Center inside target element"
                  className="col-span-2 py-1.5 px-2 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 font-medium text-[11px] hover:bg-indigo-600/40 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MoveHorizontal className="w-3.5 h-3.5" /> Center Inside Target
                </button>
                <button
                  onClick={() => alignToElement(el.id, targetId, 'center-h')}
                  title="Center Horizontally in Target"
                  className="py-1 px-1.5 rounded-lg bg-[#18181d] border border-[#25252b] text-zinc-300 hover:bg-[#222228] transition-all text-[10.5px] font-mono text-center"
                >
                  Center H
                </button>
                <button
                  onClick={() => alignToElement(el.id, targetId, 'center-v')}
                  title="Center Vertically in Target"
                  className="py-1 px-1.5 rounded-lg bg-[#18181d] border border-[#25252b] text-zinc-300 hover:bg-[#222228] transition-all text-[10.5px] font-mono text-center"
                >
                  Center V
                </button>
                <button
                  onClick={() => alignToElement(el.id, targetId, 'align-left')}
                  title="Snap Left edge to Target"
                  className="py-1 px-1.5 rounded-lg bg-[#18181d] border border-[#25252b] text-zinc-300 hover:bg-[#222228] transition-all text-[10.5px] font-mono text-center"
                >
                  Snap Left
                </button>
                <button
                  onClick={() => alignToElement(el.id, targetId, 'align-right')}
                  title="Snap Right edge to Target"
                  className="py-1 px-1.5 rounded-lg bg-[#18181d] border border-[#25252b] text-zinc-300 hover:bg-[#222228] transition-all text-[10.5px] font-mono text-center"
                >
                  Snap Right
                </button>
                <button
                  onClick={() => alignToElement(el.id, targetId, 'align-top')}
                  title="Snap Top edge to Target"
                  className="py-1 px-1.5 rounded-lg bg-[#18181d] border border-[#25252b] text-zinc-300 hover:bg-[#222228] transition-all text-[10.5px] font-mono text-center"
                >
                  Snap Top
                </button>
                <button
                  onClick={() => alignToElement(el.id, targetId, 'align-bottom')}
                  title="Snap Bottom edge to Target"
                  className="py-1 px-1.5 rounded-lg bg-[#18181d] border border-[#25252b] text-zinc-300 hover:bg-[#222228] transition-all text-[10.5px] font-mono text-center"
                >
                  Snap Bottom
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Tag Name */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-medium text-zinc-400">Tag Identifier</span>
          <input
            type="text"
            value={el.tag || ''}
            onChange={e => updateSelectedElement({ tag: e.target.value })}
            className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 font-mono text-[11.5px] transition-all"
          />
        </div>

        {/* Position & Size Inputs */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-zinc-400">Position (X, Y)</span>
            <div className="flex gap-1.5">
              <input type="number" value={el.x} onChange={e => updateSelectedElement({ x: parseInt(e.target.value) || 0 })} className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-2 py-1.5 text-center text-zinc-100 font-mono focus:outline-none focus:border-indigo-500" />
              <input type="number" value={el.y} onChange={e => updateSelectedElement({ y: parseInt(e.target.value) || 0 })} className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-2 py-1.5 text-center text-zinc-100 font-mono focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-zinc-400">Dimensions (W, H)</span>
            <div className="flex gap-1.5">
              <input type="number" value={el.w} onChange={e => updateSelectedElement({ w: Math.max(1, parseInt(e.target.value) || 1) })} className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-2 py-1.5 text-center text-zinc-100 font-mono focus:outline-none focus:border-indigo-500" />
              <input type="number" value={el.h} onChange={e => updateSelectedElement({ h: Math.max(1, parseInt(e.target.value) || 1) })} className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-2 py-1.5 text-center text-zinc-100 font-mono focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
        </div>

        {/* Image Texture Props */}
        {el.type === 'Image' && (
          <div className="space-y-2 border-t border-[#1f1f24] pt-3.5">
            <span className="text-[11px] font-medium text-zinc-400">Texture Asset</span>
            <select
              value={el.assetName || ''}
              onChange={e => {
                const tex = projectAssets.textures.find(t => t.name === e.target.value);
                if (tex) updateSelectedElement({ assetName: tex.name, assetPath: tex.path, tag: tex.name, imgObj: tex.imgObj, dataUrl: tex.dataUrl, w: tex.w, h: tex.h });
              }}
              className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Project Textures --</option>
              {projectAssets.textures.map(t => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
            <input type="text" placeholder="texture_name" value={el.assetName || ''} onChange={e => updateSelectedElement({ assetName: e.target.value })} className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-3 py-1.5 text-zinc-100 font-mono text-[11px]" />
            <input type="text" placeholder="assets/texture.png" value={el.assetPath || ''} onChange={e => updateSelectedElement({ assetPath: e.target.value })} className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-3 py-1.5 text-zinc-100 font-mono text-[11px]" />
            <label className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#18181d] border border-[#27272c] hover:bg-[#232328] hover:border-zinc-500 text-zinc-300 font-medium cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5 text-indigo-400" /> Load Texture File...
              <input type="file" accept="image/*" onChange={handleTextureFile} className="hidden" />
            </label>
          </div>
        )}

        {/* Text & Label Props */}
        {['Button', 'Text', 'Slider', 'Checkbox'].includes(el.type) && (
          <div className="space-y-1.5 border-t border-[#1f1f24] pt-3.5">
            <span className="text-[11px] font-medium text-zinc-400">Display Label</span>
            <input type="text" value={el.labelVal || ''} onChange={e => updateSelectedElement({ labelVal: e.target.value })} className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-indigo-500" />
          </div>
        )}

        {/* Text Alignment & Font Size Props */}
        {['Text', 'TextField'].includes(el.type) && (
          <div className="space-y-3 border-t border-[#1f1f24] pt-3.5">
            <div className="grid grid-cols-2 gap-2.5">
              {el.type === 'Text' && (
                <div>
                  <span className="text-[11px] font-medium text-zinc-400">Text Align</span>
                  <select value={el.textAlign || 'Left'} onChange={e => updateSelectedElement({ textAlign: e.target.value })} className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-2.5 py-1.5 text-zinc-200 mt-1 focus:outline-none">
                    <option value="Left">Left</option>
                    <option value="Center">Center</option>
                    <option value="Right">Right</option>
                  </select>
                </div>
              )}
              <div className={el.type === 'TextField' ? 'col-span-2' : ''}>
                <span className="text-[11px] font-medium text-zinc-400">Font Size (pt/px)</span>
                <input type="number" value={el.fontSize || 16} onChange={e => updateSelectedElement({ fontSize: parseInt(e.target.value) || 16 })} className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-2.5 py-1.5 text-center text-zinc-100 font-mono mt-1 focus:outline-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-zinc-400">Text Effects</span>
              <div className="flex items-center justify-between bg-[#16161a] p-2 rounded-lg border border-[#242429]">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300 text-[11.5px]">
                  <input type="checkbox" checked={!!el.shadowEnabled} onChange={e => updateSelectedElement({ shadowEnabled: e.target.checked })} className="rounded accent-indigo-500 w-3.5 h-3.5" /> Drop Shadow
                </label>
                <div className="flex gap-1.5 w-20">
                  <input type="number" value={el.shadowX ?? 2} onChange={e => updateSelectedElement({ shadowX: parseFloat(e.target.value) || 0 })} placeholder="X" className="w-1/2 bg-[#202025] text-center rounded-md py-0.5 text-zinc-100 font-mono text-[11px]" />
                  <input type="number" value={el.shadowY ?? 2} onChange={e => updateSelectedElement({ shadowY: parseFloat(e.target.value) || 0 })} placeholder="Y" className="w-1/2 bg-[#202025] text-center rounded-md py-0.5 text-zinc-100 font-mono text-[11px]" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-[#16161a] p-2 rounded-lg border border-[#242429]">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300 text-[11.5px]">
                  <input type="checkbox" checked={!!el.outlineEnabled} onChange={e => updateSelectedElement({ outlineEnabled: e.target.checked })} className="rounded accent-indigo-500 w-3.5 h-3.5" /> Stroke Outline
                </label>
                <input type="number" value={el.outlineW ?? 1} onChange={e => updateSelectedElement({ outlineW: parseFloat(e.target.value) || 1 })} placeholder="W" className="w-16 bg-[#202025] text-center rounded-md py-0.5 text-zinc-100 font-mono text-[11px]" />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-zinc-400">Custom Font</span>
              <select
                value={el.fontName || ''}
                onChange={e => {
                  const fnt = projectAssets.fonts.find(f => f.name === e.target.value);
                  if (fnt) updateSelectedElement({ fontName: fnt.name, fontPath: fnt.path });
                }}
                className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-2.5 py-1.5 text-zinc-200"
              >
                <option value="">-- Project Fonts --</option>
                {projectAssets.fonts.map(f => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </select>
              <input type="text" placeholder="font_name" value={el.fontName || ''} onChange={e => updateSelectedElement({ fontName: e.target.value })} className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-2.5 py-1.5 text-zinc-100 font-mono text-[11px]" />
              <label className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#18181d] border border-[#27272c] hover:bg-[#232328] hover:border-zinc-500 text-zinc-300 font-medium cursor-pointer transition-all mt-1">
                <Upload className="w-3.5 h-3.5 text-indigo-400" /> Load TTF Font...
                <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontFile} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* NineSlice Margins */}
        {['Panel', 'Button', 'Image'].includes(el.type) && (
          <div className="space-y-1.5 border-t border-[#1f1f24] pt-3.5">
            <span className="text-[11px] font-medium text-zinc-400">NineSlice Grid (L, T, R, B)</span>
            <div className="grid grid-cols-4 gap-1.5">
              <input type="number" placeholder="L" value={el.nsL || 0} onChange={e => updateSelectedElement({ nsL: parseFloat(e.target.value) || 0 })} className="bg-[#16161a] border border-[#242429] rounded-lg p-1.5 text-center text-zinc-100 font-mono" />
              <input type="number" placeholder="T" value={el.nsT || 0} onChange={e => updateSelectedElement({ nsT: parseFloat(e.target.value) || 0 })} className="bg-[#16161a] border border-[#242429] rounded-lg p-1.5 text-center text-zinc-100 font-mono" />
              <input type="number" placeholder="R" value={el.nsR || 0} onChange={e => updateSelectedElement({ nsR: parseFloat(e.target.value) || 0 })} className="bg-[#16161a] border border-[#242429] rounded-lg p-1.5 text-center text-zinc-100 font-mono" />
              <input type="number" placeholder="B" value={el.nsB || 0} onChange={e => updateSelectedElement({ nsB: parseFloat(e.target.value) || 0 })} className="bg-[#16161a] border border-[#242429] rounded-lg p-1.5 text-center text-zinc-100 font-mono" />
            </div>
          </div>
        )}

        {/* Slider Props */}
        {el.type === 'Slider' && (
          <div className="space-y-1.5 border-t border-[#1f1f24] pt-3.5">
            <span className="text-[11px] font-medium text-zinc-400">Slider Range (Min, Max, Val)</span>
            <div className="grid grid-cols-3 gap-1.5">
              <input type="number" placeholder="Min" value={el.sliderMin ?? 0} onChange={e => updateSelectedElement({ sliderMin: parseFloat(e.target.value) || 0 })} className="bg-[#16161a] border border-[#242429] rounded-lg p-1.5 text-center text-zinc-100 font-mono" />
              <input type="number" placeholder="Max" value={el.sliderMax ?? 1} onChange={e => updateSelectedElement({ sliderMax: parseFloat(e.target.value) || 1 })} className="bg-[#16161a] border border-[#242429] rounded-lg p-1.5 text-center text-zinc-100 font-mono" />
              <input type="number" step="0.01" placeholder="Val" value={el.sliderVal ?? 0.5} onChange={e => updateSelectedElement({ sliderVal: parseFloat(e.target.value) || 0 })} className="bg-[#16161a] border border-[#242429] rounded-lg p-1.5 text-center text-zinc-100 font-mono" />
            </div>
          </div>
        )}

        {/* Checkbox Props */}
        {el.type === 'Checkbox' && (
          <div className="border-t border-[#1f1f24] pt-3.5">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-300 text-[11.5px]">
              <input type="checkbox" checked={!!el.checked} onChange={e => updateSelectedElement({ checked: e.target.checked })} className="rounded accent-indigo-500 w-3.5 h-3.5" /> Initial Checked State
            </label>
          </div>
        )}

        {/* TextField Props */}
        {el.type === 'TextField' && (
          <div className="space-y-3 border-t border-[#1f1f24] pt-3.5">
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-zinc-400">Initial Text Value</span>
              <input type="text" value={el.labelVal || ''} onChange={e => updateSelectedElement({ labelVal: e.target.value })} placeholder="Default value..." className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-zinc-400">Placeholder Text</span>
              <input type="text" value={el.placeholder || ''} onChange={e => updateSelectedElement({ placeholder: e.target.value })} className="w-full bg-[#16161a] border border-[#242429] rounded-lg px-3 py-1.5 text-zinc-100 focus:outline-none" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-zinc-300 text-[11.5px]">
              <input type="checkbox" checked={!!el.plainInput} onChange={e => updateSelectedElement({ plainInput: e.target.checked })} className="rounded accent-indigo-500 w-3.5 h-3.5" /> Plain Input (No Box / Borderless)
            </label>
          </div>
        )}

        {/* UIAnchor Alignment Grid */}
        <div className="space-y-2 border-t border-[#1f1f24] pt-3.5">
          <span className="text-[11px] font-medium text-zinc-400">Screen Anchor Alignment</span>
          <div className="grid grid-cols-3 gap-1.5 bg-[#141418] p-1.5 rounded-xl border border-[#242429]">
            {ANCHORS.map(anc => {
              const IconComp = anc.icon;
              const isSelected = el.anchor === anc.id;
              return (
                <button
                  key={anc.id}
                  onClick={() => updateSelectedElement({ anchor: anc.id })}
                  title={anc.title}
                  className={`py-2 px-1 rounded-lg border text-center font-medium text-[11px] transition-all flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-zinc-100 border-zinc-100 text-zinc-950 font-bold shadow-sm'
                      : 'bg-[#18181d] border-[#25252b] text-zinc-400 hover:bg-[#222228] hover:text-zinc-200'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span className="text-[9.5px] font-mono opacity-80">{anc.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
