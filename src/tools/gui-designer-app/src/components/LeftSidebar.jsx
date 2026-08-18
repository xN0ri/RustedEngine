import React, { useState } from 'react';
import { MousePointer2, Image, Square, Type, Layout, BarChart2, Sliders, CheckSquare, TextCursor, FolderPlus, Upload, Eye, EyeOff, ChevronUp, ChevronDown, Layers, Box } from 'lucide-react';

const PALETTE = [
  { type: 'Select', icon: MousePointer2, label: 'Select', full: true },
  { type: 'Image', icon: Image, label: 'Image' },
  { type: 'Button', icon: Square, label: 'Button' },
  { type: 'Text', icon: Type, label: 'Text' },
  { type: 'Panel', icon: Layout, label: 'Panel' },
  { type: 'ProgressBar', icon: BarChart2, label: 'Progress' },
  { type: 'Slider', icon: Sliders, label: 'Slider' },
  { type: 'Checkbox', icon: CheckSquare, label: 'Checkbox' },
  { type: 'TextField', icon: TextCursor, label: 'TextField' },
];

export function LeftSidebar({
  tool, setTool, elements, setElements, selectedId, setSelectedId,
  projectAssets, setProjectAssets, addElement
}) {
  const [activeAssetTab, setActiveAssetTab] = useState('textures');

  const handleFolderScan = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const textures = [];
    const fonts = [];
    const promises = [];

    const textureExts = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'svg'];
    const fontExts = ['ttf', 'otf', 'woff', 'woff2'];

    for (const file of files) {
      const relPath = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
      const ext = file.name.split('.').pop().toLowerCase();
      const assetName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_");

      if (textureExts.includes(ext)) {
        const p = new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = ev => {
            const dataUrl = ev.target.result;
            const img = new window.Image();
            img.onload = () => {
              textures.push({ name: assetName, path: relPath, file, dataUrl, imgObj: img, w: img.naturalWidth, h: img.naturalHeight });
              resolve();
            };
            img.onerror = () => resolve();
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
        });
        promises.push(p);
      } else if (fontExts.includes(ext)) {
        const p = (async () => {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const fontFace = new FontFace(assetName, arrayBuffer);
            await fontFace.load();
            document.fonts.add(fontFace);
            fonts.push({ name: assetName, path: relPath, file, fontFace });
          } catch (e) {}
        })();
        promises.push(p);
      }
    }

    Promise.all(promises).then(() => {
      setProjectAssets({ textures, fonts });
    });
  };

  const applyTexture = (tex) => {
    const sel = elements.find(e => e.id === selectedId);
    if (sel && sel.type === 'Image') {
      setElements(prev => prev.map(e => e.id === selectedId ? {
        ...e, assetName: tex.name, assetPath: tex.path, tag: tex.name, imgObj: tex.imgObj, dataUrl: tex.dataUrl, w: tex.w, h: tex.h
      } : e));
    } else {
      addElement('Image', 320, 180);
    }
  };

  const applyFont = (fnt) => {
    const sel = elements.find(e => e.id === selectedId);
    if (sel && sel.type === 'Text') {
      setElements(prev => prev.map(e => e.id === selectedId ? { ...e, fontName: fnt.name, fontPath: fnt.path } : e));
    } else {
      addElement('Text', 320, 180);
    }
  };

  const moveLayer = (id, dir) => {
    const idx = elements.findIndex(e => e.id === id);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= elements.length) return;
    const next = [...elements];
    const temp = next[idx];
    next[idx] = next[newIdx];
    next[newIdx] = temp;
    setElements(next);
  };

  return (
    <aside className="w-56 bg-[#121215] border-r border-[#1f1f23] flex flex-col flex-shrink-0 select-none text-xs">
      {/* Palette Header */}
      <div className="px-3 pt-3 pb-1.5 flex items-center justify-between">
        <span className="text-[10.5px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5 text-zinc-500" /> Palette
        </span>
      </div>

      {/* Palette Items Grid */}
      <div className="px-2.5 grid grid-cols-2 gap-1 pb-3">
        {PALETTE.map(item => {
          const Icon = item.icon;
          const isActive = tool === item.type;
          return (
            <button
              key={item.type}
              onClick={() => setTool(item.type)}
              className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                item.full ? 'col-span-2 py-2 flex-row gap-2' : ''
              } ${
                isActive
                  ? 'bg-zinc-100 border-zinc-100 text-zinc-950 font-bold shadow-sm'
                  : 'bg-[#16161a] border-[#242429] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Layers Header */}
      <div className="px-3 py-2 flex items-center justify-between border-t border-[#1f1f23] bg-[#141418]">
        <span className="text-[10.5px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-zinc-500" /> Layers ({elements.length})
        </span>
      </div>

      {/* Layers Stack */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5">
        {elements.length === 0 ? (
          <div className="text-zinc-600 text-center py-8 text-[11px]">No elements on canvas.</div>
        ) : (
          [...elements].reverse().map(el => {
            const isSel = el.id === selectedId;
            return (
              <div
                key={el.id}
                onClick={() => setSelectedId(el.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-all ${
                  isSel
                    ? 'bg-[#27272a] text-white font-medium shadow-sm border border-zinc-600/50'
                    : 'text-zinc-400 hover:bg-[#18181b] hover:text-zinc-200'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-indigo-400' : 'bg-zinc-600'}`}></div>
                <span className="flex-1 truncate font-mono text-[11px]">{el.tag}</span>
                <div className="flex items-center gap-0.5 text-zinc-500">
                  <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, 1); }} className="hover:text-white p-1 rounded hover:bg-zinc-800"><ChevronUp className="w-3 h-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, -1); }} className="hover:text-white p-1 rounded hover:bg-zinc-800"><ChevronDown className="w-3 h-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setElements(prev => prev.map(x => x.id === el.id ? { ...x, visible: !x.visible } : x)); }} className="hover:text-white p-1 rounded hover:bg-zinc-800">
                    {el.visible !== false ? <Eye className="w-3 h-3 text-zinc-400" /> : <EyeOff className="w-3 h-3 text-zinc-600" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Project Assets Library */}
      <div className="h-88 border-t border-[#1f1f23] bg-[#121215] flex flex-col p-2.5 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10.5px] font-semibold text-zinc-500 uppercase tracking-wider">Project Assets</span>
          <div className="flex gap-1">
            <label title="Select texture/font files" className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#18181b] border border-[#27272a] text-zinc-300 hover:text-white hover:border-zinc-500 cursor-pointer text-[10px] transition-all">
              <Upload className="w-3 h-3 text-indigo-400" /> Files
              <input type="file" multiple accept="image/*,.ttf,.otf,.woff,.woff2" onChange={handleFolderScan} className="hidden" />
            </label>
            <label title="Select assets directory" className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#18181b] border border-[#27272a] text-zinc-300 hover:text-white hover:border-zinc-500 cursor-pointer text-[10px] transition-all">
              <FolderPlus className="w-3 h-3 text-indigo-400" /> Folder
              <input type="file" webkitdirectory="true" directory="true" mozdirectory="true" multiple onChange={handleFolderScan} className="hidden" />
            </label>
          </div>
        </div>

        <div className="flex gap-1 mb-2 bg-[#18181b] p-0.5 rounded-lg border border-[#27272a]">
          <button
            onClick={() => setActiveAssetTab('textures')}
            className={`flex-1 py-1 rounded-md text-[10.5px] font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeAssetTab === 'textures' ? 'bg-[#27272a] text-white shadow-sm font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Image className="w-3 h-3" /> Textures ({projectAssets.textures.length})
          </button>
          <button
            onClick={() => setActiveAssetTab('fonts')}
            className={`flex-1 py-1 rounded-md text-[10.5px] font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeAssetTab === 'fonts' ? 'bg-[#27272a] text-white shadow-sm font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Type className="w-3 h-3" /> Fonts ({projectAssets.fonts.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1.5 pr-0.5">
          {activeAssetTab === 'textures' ? (
            projectAssets.textures.length === 0 ? (
              <div className="col-span-2 text-center text-zinc-600 text-[10.5px] py-8">Click 'Assets Folder' to load textures (.png).</div>
            ) : (
              projectAssets.textures.map(tex => (
                <div
                  key={tex.path}
                  onClick={() => applyTexture(tex)}
                  title={`Click to apply: ${tex.name}`}
                  className="bg-[#18181b] border border-[#27272a] hover:border-zinc-500 p-1.5 rounded-lg cursor-pointer flex flex-col items-center justify-center transition-all group"
                >
                  <img src={tex.dataUrl} alt={tex.name} className="w-full h-11 object-contain rounded bg-black/50 mb-1 pixelated" />
                  <span className="text-[9.5px] font-mono text-zinc-400 truncate w-full text-center group-hover:text-zinc-200">{tex.name}</span>
                </div>
              ))
            )
          ) : (
            projectAssets.fonts.length === 0 ? (
              <div className="col-span-2 text-center text-zinc-600 text-[10.5px] py-8">Click 'Assets Folder' to load fonts (.ttf).</div>
            ) : (
              projectAssets.fonts.map(fnt => (
                <div
                  key={fnt.path}
                  onClick={() => applyFont(fnt)}
                  title={`Click to apply font: ${fnt.name}`}
                  className="bg-[#18181b] border border-[#27272a] hover:border-zinc-500 p-2 rounded-lg cursor-pointer flex flex-col items-center justify-center transition-all group"
                >
                  <span style={{ fontFamily: `"${fnt.name}", sans-serif` }} className="text-sm text-white mb-1 truncate w-full text-center">Aa Bb</span>
                  <span className="text-[9.5px] font-mono text-zinc-400 truncate w-full text-center group-hover:text-zinc-200">{fnt.name}</span>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </aside>
  );
}
