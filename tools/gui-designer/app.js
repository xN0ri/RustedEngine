// ================================================================
// STATE & CONFIG
// ================================================================
let elements = [], selectedId = null, tool = 'Select', fileHandle = null, idCounter = 0;
let isDragging = false, isResizing = false, dragStart = null, resizeHandle = null;
let VW = 640, VH = 360, GRID = 8, snapToGrid = true, showGrid = true, scale = 1;
let pixelArtMode = true;

const COLORS = { Image:'#71717a', Button:'#e4e4e7', Text:'#a1a1aa', Panel:'#3f3f46', ProgressBar:'#52525b', Slider:'#6366f1', Checkbox:'#22c55e', TextField:'#3b82f6' };
const DEFAULTS = { Image:[120,60], Button:[120,30], Text:[120,20], Panel:[200,140], ProgressBar:[160,20], Slider:[180,24], Checkbox:[140,24], TextField:[160,28] };
const MARKER_S = '// RUSTED_UI_START', MARKER_E = '// RUSTED_UI_END';

// DOM REFS
const canvas     = document.getElementById('canvas');
const C          = canvas.getContext('2d');
const layersList = document.getElementById('layers-list');
const codeOutput = document.getElementById('code-output');
const noSel      = document.getElementById('no-selection');
const propEd     = document.getElementById('prop-editor');
const vresLabel  = document.getElementById('vres-label');
const fileLabel  = document.getElementById('file-label');

// ── Element Factory ──
function mkEl(type, vx, vy) {
  const [dw,dh] = DEFAULTS[type] || [120,30], id = ++idCounter;
  const assetName = type==='Image'?`texture_${id}`:'';
  return {
    id, type,
    x: clamp(snap(vx-dw/2), 0, VW-dw),
    y: clamp(snap(vy-dh/2), 0, VH-dh),
    w: dw, h: dh,
    tag: `${type.toLowerCase()}_${id}`,
    anchor: 'None', padL:0, padT:0, padR:0, padB:0,
    assetName: assetName,
    assetPath: assetName ? `assets/${assetName}.png` : '',
    fontName: '',
    fontPath: '',
    labelVal: type==='Button'?'Click me':(type==='Text'?'Text':(type==='Slider'?'Volume':(type==='Checkbox'?'Toggle Option':''))),
    fontSize: 16,
    textAlign: 'Left',
    shadowEnabled: false, shadowX: 2, shadowY: 2,
    outlineEnabled: false, outlineW: 1,
    nsL: 0, nsT: 0, nsR: 0, nsB: 0,
    sliderMin: 0, sliderMax: 1, sliderVal: 0.5,
    checked: true,
    placeholder: 'Type here...',
    visible: true,
    imgObj: null,
  };
}

// ── Custom Texture File Loader ──
document.getElementById('prop-img-file').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const el = selEl(); if (!el) return;

  const assetName = file.name.replace(/\.[^/.]+$/, "");
  el.assetName = assetName;
  el.assetPath = `assets/${file.name}`;
  el.tag = assetName;
  document.getElementById('prop-tag').value = assetName;
  document.getElementById('prop-asset').value = assetName;
  document.getElementById('prop-asset-path').value = el.assetPath;

  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    el.dataUrl = dataUrl;
    const img = new Image();
    img.onload = () => {
      el.imgObj = img;
      el.w = img.naturalWidth;
      el.h = img.naturalHeight;
      updatePaddingFromPos(el);
      syncPos();
      updateCode();
      render();
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
};

// ── Custom TTF Font File Loader ──
document.getElementById('prop-font-file').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const el = selEl(); if (!el) return;

  const fontName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_");
  const reader = new FileReader();
  reader.onload = async ev => {
    const fontDataUrl = ev.target.result;
    try {
      const fontFace = new FontFace(fontName, fontDataUrl);
      await fontFace.load();
      document.fonts.add(fontFace);

      el.fontName = fontName;
      el.fontPath = `assets/${file.name}`;
      el.fontDataUrl = fontDataUrl;
      document.getElementById('prop-font-name').value = fontName;
      document.getElementById('prop-font-path').value = el.fontPath;

      updateCode();
      render();
    } catch (err) {
      alert("Failed to load TTF font:\n" + err.message);
    }
  };
  reader.readAsDataURL(file);
};

// ── Project Asset Library State ──
const projectAssets = {
  textures: [], // Array of { name, path, file, dataUrl, imgObj, w, h }
  fonts: []     // Array of { name, path, file, fontFace }
};

function processFolderFiles(files) {
  projectAssets.textures = [];
  projectAssets.fonts = [];

  const textureExts = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'svg'];
  const fontExts = ['ttf', 'otf', 'woff', 'woff2'];
  const promises = [];

  for (const file of files) {
    const relPath = file.webkitRelativePath || file.name;
    const cleanPath = relPath.replace(/\\/g, '/');
    const ext = file.name.split('.').pop().toLowerCase();
    const assetName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_");

    if (textureExts.includes(ext)) {
      const promise = new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = ev => {
          const dataUrl = ev.target.result;
          const img = new Image();
          img.onload = () => {
            projectAssets.textures.push({
              name: assetName,
              path: cleanPath,
              file: file,
              dataUrl: dataUrl,
              imgObj: img,
              w: img.naturalWidth,
              h: img.naturalHeight
            });
            resolve();
          };
          img.onerror = () => resolve();
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      });
      promises.push(promise);
    } else if (fontExts.includes(ext)) {
      const promise = (async () => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const fontFace = new FontFace(assetName, arrayBuffer);
          await fontFace.load();
          document.fonts.add(fontFace);

          projectAssets.fonts.push({
            name: assetName,
            path: cleanPath,
            file: file,
            fontFace: fontFace
          });
        } catch (e) {
          console.warn("Could not load font from folder:", file.name, e);
        }
      })();
      promises.push(promise);
    }
  }

  Promise.all(promises).then(() => {
    renderAssetLibraryUI();
    updateInspectorAssetDropdowns();
  });
}

function renderAssetLibraryUI() {
  const texContainer = document.getElementById('asset-list-textures');
  const fontContainer = document.getElementById('asset-list-fonts');
  if (!texContainer || !fontContainer) return;

  document.getElementById('count-textures').textContent = projectAssets.textures.length;
  document.getElementById('count-fonts').textContent = projectAssets.fonts.length;

  if (projectAssets.textures.length === 0) {
    texContainer.innerHTML = `<div class="asset-empty-hint">No textures found in folder.</div>`;
  } else {
    texContainer.innerHTML = '';
    for (const tex of projectAssets.textures) {
      const card = document.createElement('div');
      card.className = 'asset-card';
      card.title = `Click to apply/add texture: ${tex.name} (${tex.path})`;
      card.innerHTML = `
        <img class="asset-card-thumb" src="${tex.dataUrl}" alt="${tex.name}">
        <div class="asset-card-name">${tex.name}</div>
      `;
      card.onclick = () => applyTextureFromLibrary(tex);
      texContainer.appendChild(card);
    }
  }

  if (projectAssets.fonts.length === 0) {
    fontContainer.innerHTML = `<div class="asset-empty-hint">No TTF/OTF fonts found in folder.</div>`;
  } else {
    fontContainer.innerHTML = '';
    for (const fnt of projectAssets.fonts) {
      const card = document.createElement('div');
      card.className = 'asset-card';
      card.title = `Click to apply/add font: ${fnt.name}`;
      card.innerHTML = `
        <div style="font-family:'${fnt.name}', sans-serif; font-size:16px; margin-bottom:4px; color:#fff; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Aa Bb</div>
        <div class="asset-card-name">${fnt.name}</div>
      `;
      card.onclick = () => applyFontFromLibrary(fnt);
      fontContainer.appendChild(card);
    }
  }
}

function applyTextureFromLibrary(tex) {
  const el = selEl();
  if (el && el.type === 'Image') {
    el.assetName = tex.name;
    el.assetPath = tex.path;
    el.tag = tex.name;
    el.imgObj = tex.imgObj;
    el.w = tex.w;
    el.h = tex.h;
    updatePaddingFromPos(el);
    syncPos();
    updateUI();
  } else {
    const newEl = mkEl('Image', VW / 2, VH / 2);
    newEl.assetName = tex.name;
    newEl.assetPath = tex.path;
    newEl.tag = tex.name;
    newEl.imgObj = tex.imgObj;
    newEl.w = tex.w;
    newEl.h = tex.h;
    elements.push(newEl);
    selectedId = newEl.id;
    updateUI();
  }
}

function applyFontFromLibrary(fnt) {
  const el = selEl();
  if (el && el.type === 'Text') {
    el.fontName = fnt.name;
    el.fontPath = fnt.path;
    updateUI();
  } else {
    const newEl = mkEl('Text', VW / 2, VH / 2);
    newEl.fontName = fnt.name;
    newEl.fontPath = fnt.path;
    elements.push(newEl);
    selectedId = newEl.id;
    updateUI();
  }
}

function updateInspectorAssetDropdowns() {
  const assetSelect = document.getElementById('prop-asset-select');
  const fontSelect = document.getElementById('prop-font-select');

  if (assetSelect) {
    assetSelect.innerHTML = '<option value="">-- Select Texture --</option>';
    for (const tex of projectAssets.textures) {
      const opt = document.createElement('option');
      opt.value = tex.name;
      opt.textContent = `🖼 ${tex.name}`;
      assetSelect.appendChild(opt);
    }
  }

  if (fontSelect) {
    fontSelect.innerHTML = '<option value="">-- Select Font --</option>';
    for (const fnt of projectAssets.fonts) {
      const opt = document.createElement('option');
      opt.value = fnt.name;
      opt.textContent = `🔤 ${fnt.name}`;
      fontSelect.appendChild(opt);
    }
  }
}

document.getElementById('assets-folder-input').onchange = e => {
  const files = e.target.files;
  if (files && files.length > 0) {
    processFolderFiles(files);
  }
};

document.querySelectorAll('.asset-tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.asset-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    document.getElementById('asset-list-textures').style.display = target === 'textures' ? 'grid' : 'none';
    document.getElementById('asset-list-fonts').style.display = target === 'fonts' ? 'grid' : 'none';
  };
});

document.getElementById('prop-asset-select')?.addEventListener('change', e => {
  const name = e.target.value;
  if (!name) return;
  const tex = projectAssets.textures.find(t => t.name === name);
  if (tex) applyTextureFromLibrary(tex);
});

document.getElementById('prop-font-select')?.addEventListener('change', e => {
  const name = e.target.value;
  if (!name) return;
  const fnt = projectAssets.fonts.find(f => f.name === name);
  if (fnt) applyFontFromLibrary(fnt);
});

// ── High DPI Pixel-Crisp Canvas Resize ──
function resizeCanvas() {
  const a = document.getElementById('canvas-area');
  const dpr = window.devicePixelRatio || 1;
  scale = Math.max(0.05, Math.min((a.clientWidth-48)/VW, (a.clientHeight-48)/VH));
  
  const cssW = Math.round(VW * scale);
  const cssH = Math.round(VH * scale);

  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  render();
}

// ── Render ──
function render() {
  const dpr = window.devicePixelRatio || 1;
  C.save();
  C.scale(dpr, dpr);

  // Toggle Nearest-Neighbor Pixel Art Filtering
  C.imageSmoothingEnabled = !pixelArtMode;

  const cssW = Math.round(VW * scale);
  const cssH = Math.round(VH * scale);

  C.fillStyle='#0a0a0c';
  C.fillRect(0,0,cssW,cssH);

  // Subtle grid
  if(showGrid && scale >= 0.4) {
    C.strokeStyle='rgba(255,255,255,0.03)';
    C.lineWidth=0.5;
    for(let x=0; x<=VW; x+=GRID){
      const px = Math.round(x * scale);
      C.beginPath(); C.moveTo(px,0); C.lineTo(px,cssH); C.stroke();
    }
    for(let y=0; y<=VH; y+=GRID){
      const py = Math.round(y * scale);
      C.beginPath(); C.moveTo(0,py); C.lineTo(cssW,py); C.stroke();
    }
  }

  for(const el of elements) if(el.visible) drawEl(el, el.id===selectedId);
  
  const sel=selEl();
  if(sel && sel.anchor!=='None') drawGuides(sel);

  // Border
  C.strokeStyle='#24242c'; C.lineWidth=1;
  C.strokeRect(0.5, 0.5, cssW-1, cssH-1);

  C.restore();
}

function drawEl(el, sel) {
  const px=Math.round(el.x*scale), py=Math.round(el.y*scale);
  const pw=Math.round(el.w*scale), ph=Math.round(el.h*scale);

  C.shadowBlur=0;

  if (el.type === 'Text') {
    // ── TEXT ELEMENT: Alignment, Shadow, Outline, Font ──
    const fontSize = el.fontSize || 16;
    const fs = Math.max(8, Math.round(fontSize * scale));
    const fontFam = el.fontName ? `"${el.fontName}", -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif` : `-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`;
    C.font = `600 ${fs}px ${fontFam}`;
    C.textBaseline = 'top';

    const textVal = el.labelVal || 'Text';
    const metrics = C.measureText(textVal);
    const textW = Math.max(20, Math.round(metrics.width / scale));
    const textH = Math.max(14, Math.round(fontSize / scale));
    el.w = textW;
    el.h = textH;

    let tx = px;
    if (el.textAlign === 'Center') {
      C.textAlign = 'center';
      tx = px + pw / 2;
    } else if (el.textAlign === 'Right') {
      C.textAlign = 'right';
      tx = px + pw;
    } else {
      C.textAlign = 'left';
      tx = px;
    }

    // Shadow
    if (el.shadowEnabled) {
      C.fillStyle = 'rgba(0, 0, 0, 0.7)';
      C.fillText(textVal, tx + (el.shadowX || 2) * scale, py + (el.shadowY || 2) * scale);
    }

    // Outline
    if (el.outlineEnabled) {
      C.strokeStyle = '#000000';
      C.lineWidth = (el.outlineW || 1) * scale * 2;
      C.strokeText(textVal, tx, py);
    }

    // Fill
    C.fillStyle = '#ffffff';
    C.fillText(textVal, tx, py);

    if (sel) {
      C.setLineDash([3, 3]);
      C.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      C.lineWidth = 1;
      C.strokeRect(px - 1.5, py - 1.5, pw + 3, ph + 3);
      C.setLineDash([]);
    }
  } else if (el.type === 'Slider') {
    // ── SLIDER COMPONENT ──
    C.fillStyle = '#1c1c21'; C.fillRect(px, py, pw, ph);
    const trackH = Math.max(4, Math.round(6 * scale));
    const trackY = py + (ph - trackH) / 2;

    C.fillStyle = '#27272a'; C.fillRect(px + 4, trackY, pw - 8, trackH);

    const norm = Math.max(0, Math.min(1, ((el.sliderVal || 0.5) - (el.sliderMin || 0)) / ((el.sliderMax || 1) - (el.sliderMin || 0))));
    const fillW = (pw - 8) * norm;
    C.fillStyle = '#6366f1'; C.fillRect(px + 4, trackY, fillW, trackH);

    const thumbR = Math.max(5, Math.round(7 * scale));
    const thumbX = px + 4 + fillW;
    C.beginPath(); C.arc(thumbX, py + ph / 2, thumbR, 0, Math.PI * 2);
    C.fillStyle = '#ffffff'; C.fill(); C.strokeStyle = '#6366f1'; C.lineWidth = 1.5; C.stroke();

    if (el.labelVal && ph > 12) {
      C.font = `500 ${Math.max(9, Math.round(10 * scale))}px sans-serif`;
      C.textAlign = 'left'; C.textBaseline = 'bottom';
      C.fillStyle = '#a1a1aa';
      C.fillText(el.labelVal, px + 4, py - 2);
    }

    C.strokeStyle = sel ? '#ffffff' : '#3f3f46';
    C.lineWidth = sel ? 1.5 : 1;
    C.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
  } else if (el.type === 'Checkbox') {
    // ── CHECKBOX COMPONENT ──
    const boxS = Math.min(ph - 4, Math.max(12, Math.round(16 * scale)));
    const boxY = py + (ph - boxS) / 2;

    C.fillStyle = el.checked ? '#22c55e' : '#1c1c21';
    C.fillRect(px + 2, boxY, boxS, boxS);
    C.strokeStyle = sel ? '#ffffff' : '#3f3f46'; C.lineWidth = 1;
    C.strokeRect(px + 2.5, boxY + 0.5, boxS - 1, boxS - 1);

    if (el.checked) {
      C.font = `bold ${Math.max(10, Math.round(boxS * 0.8))}px sans-serif`;
      C.textAlign = 'center'; C.textBaseline = 'middle';
      C.fillStyle = '#ffffff';
      C.fillText('✓', px + 2 + boxS / 2, boxY + boxS / 2 + 1);
    }

    if (el.labelVal) {
      C.font = `500 ${Math.max(10, Math.round(11 * scale))}px sans-serif`;
      C.textAlign = 'left'; C.textBaseline = 'middle';
      C.fillStyle = sel ? '#ffffff' : '#e4e4e7';
      C.fillText(el.labelVal, px + boxS + 8, py + ph / 2);
    }

    if (sel) {
      C.setLineDash([3, 3]); C.strokeStyle = 'rgba(255, 255, 255, 0.4)'; C.lineWidth = 1;
      C.strokeRect(px - 1.5, py - 1.5, pw + 3, ph + 3); C.setLineDash([]);
    }
  } else if (el.type === 'TextField') {
    // ── TEXT FIELD COMPONENT ──
    C.fillStyle = '#18181b'; C.fillRect(px, py, pw, ph);
    C.strokeStyle = sel ? '#ffffff' : '#3f3f46'; C.lineWidth = sel ? 1.5 : 1;
    C.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

    C.font = `400 ${Math.max(10, Math.round(11.5 * scale))}px sans-serif`;
    C.textAlign = 'left'; C.textBaseline = 'middle';
    C.fillStyle = el.labelVal ? '#ffffff' : '#71717a';
    C.fillText(el.labelVal || el.placeholder || 'Type here...', px + 8, py + ph / 2);

    C.fillStyle = '#3b82f6';
    const txtW = C.measureText(el.labelVal || '').width;
    C.fillRect(px + 9 + (el.labelVal ? txtW : 0), py + 4, 1.5, ph - 8);
  } else if (el.type === 'Image' && el.imgObj && el.imgObj.complete) {
    C.drawImage(el.imgObj, px, py, pw, ph);
    C.strokeStyle = sel ? '#ffffff' : '#27272a';
    C.lineWidth = sel ? 1.5 : 1;
    C.strokeRect(px+0.5, py+0.5, pw-1, ph-1);
  } else {
    C.fillStyle = sel ? '#27272a' : '#1c1c21';
    C.fillRect(px, py, pw, ph);

    const fs=Math.max(9,Math.min(12,Math.round(10.5*scale)));
    C.font=`500 ${fs}px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif`;
    C.textAlign='center'; C.textBaseline='middle';
    C.fillStyle= sel ? '#ffffff' : '#a1a1aa';

    const txt=el.type==='Image'?`🖼 ${el.assetName||'Image'}`:el.type==='Button'?`🔲 ${el.labelVal}`:el.type==='ProgressBar'?`▬ Progress`:`▭ Panel`;
    
    C.save(); C.beginPath(); C.rect(px+2,py+2,pw-4,ph-4); C.clip();
    if(ph>10) C.fillText(txt, px+pw/2, py+ph/2);
    C.restore();

    C.strokeStyle = sel ? '#ffffff' : '#27272a';
    C.lineWidth = sel ? 1.5 : 1;
    C.strokeRect(px+0.5, py+0.5, pw-1, ph-1);
  }

  // NineSlice 9-Patch Guide Lines Preview
  if (sel && (el.nsL > 0 || el.nsT > 0 || el.nsR > 0 || el.nsB > 0)) {
    C.setLineDash([2, 2]); C.strokeStyle = '#22c55e'; C.lineWidth = 1;
    const nsl = Math.round((el.nsL || 0) * scale), nst = Math.round((el.nsT || 0) * scale);
    const nsr = Math.round((el.nsR || 0) * scale), nsb = Math.round((el.nsB || 0) * scale);
    if (nsl > 0) { C.beginPath(); C.moveTo(px + nsl, py); C.lineTo(px + nsl, py + ph); C.stroke(); }
    if (nsr > 0) { C.beginPath(); C.moveTo(px + pw - nsr, py); C.lineTo(px + pw - nsr, py + ph); C.stroke(); }
    if (nst > 0) { C.beginPath(); C.moveTo(px, py + nst); C.lineTo(px + pw, py + nst); C.stroke(); }
    if (nsb > 0) { C.beginPath(); C.moveTo(px, py + ph - nsb); C.lineTo(px + pw, py + ph - nsb); C.stroke(); }
    C.setLineDash([]);
  }

  if(pw>30&&ph>18&&el.type!=='Text'&&(!el.imgObj||sel)){
    C.font=`${Math.max(8,Math.round(8.5*scale))}px JetBrains Mono,monospace`;
    C.textAlign='left'; C.textBaseline='top';
    C.fillStyle = sel ? '#ffffff' : '#71717a';
    C.fillText(el.tag, px+3, py+2);
  }

  if(sel){
    drawHandles(el);
    const badgeText = `${el.type} [${el.x}, ${el.y}] (${el.w}×${el.h})`;
    C.font = '10px JetBrains Mono, monospace';
    const tw = C.measureText(badgeText).width;
    const bx = Math.max(0, px);
    const by = py > 20 ? py - 18 : py + ph + 4;
    C.fillStyle = '#121215';
    C.fillRect(bx, by, tw + 8, 15);
    C.strokeStyle = '#3f3f46'; C.lineWidth = 1;
    C.strokeRect(bx + 0.5, by + 0.5, tw + 7, 14);
    C.fillStyle = '#f4f4f5';
    C.textAlign = 'left'; C.textBaseline = 'middle';
    C.fillText(badgeText, bx + 4, by + 7.5);
  }
}

function drawHandles(el) {
  const HS=6;
  C.fillStyle='#ffffff'; C.strokeStyle='#09090b'; C.lineWidth=1.5;
  for(const h of hpos(el)){C.beginPath();C.rect(Math.round(h.sx-HS/2),Math.round(h.sy-HS/2),HS,HS);C.fill();C.stroke();}
}

function hpos(el) {
  const x=el.x*scale, y=el.y*scale, w=el.w*scale, h=el.h*scale;
  return [{n:'nw',sx:x,sy:y},{n:'n',sx:x+w/2,sy:y},{n:'ne',sx:x+w,sy:y},
          {n:'w',sx:x,sy:y+h/2},{n:'e',sx:x+w,sy:y+h/2},
          {n:'sw',sx:x,sy:y+h},{n:'s',sx:x+w/2,sy:y+h},{n:'se',sx:x+w,sy:y+h}];
}

function drawGuides(el) {
  const cssW = Math.round(VW * scale);
  const cssH = Math.round(VH * scale);
  const a=el.anchor, cx=Math.round((el.x+el.w/2)*scale), cy=Math.round((el.y+el.h/2)*scale);
  const lx=Math.round(el.x*scale), rx=Math.round((el.x+el.w)*scale);
  const ty=Math.round(el.y*scale), by=Math.round((el.y+el.h)*scale);
  
  C.setLineDash([3,3]); C.strokeStyle='rgba(255, 255, 255, 0.25)'; C.lineWidth=1;
  function ln(x1,y1,x2,y2){C.beginPath();C.moveTo(x1,y1);C.lineTo(x2,y2);C.stroke();}
  
  if(a.includes('Left'))   ln(lx,cy,0,cy);
  if(a.includes('Right'))  ln(rx,cy,cssW,cy);
  if(a.includes('Top'))    ln(cx,ty,cx,0);
  if(a.includes('Bottom')) ln(cx,by,cx,cssH);
  if(a==='Center'||a==='TopCenter'||a==='BottomCenter'){ln(cx,ty,cx,0);ln(cx,by,cx,cssH);}
  if(a==='Center'||a==='CenterLeft'||a==='CenterRight'){ln(lx,cy,0,cy);ln(rx,cy,cssW,cy);}
  C.setLineDash([]);
}

// ── EXACT Virtual Coordinate Mouse Mapping ──
function vc(e){
  const r = canvas.getBoundingClientRect();
  const rawX = (e.clientX - r.left) * (VW / r.width);
  const rawY = (e.clientY - r.top) * (VH / r.height);
  return {
    vx: clamp(rawX, 0, VW),
    vy: clamp(rawY, 0, VH)
  };
}

function hitEl(vx,vy){for(let i=elements.length-1;i>=0;i--){const e=elements[i];if(e.visible&&vx>=e.x&&vx<=e.x+e.w&&vy>=e.y&&vy<=e.y+e.h)return e;}return null;}
function hitH(vx,vy,el){if(!el)return null;const ht=(6+3)/scale;for(const h of hpos(el))if(Math.abs(vx-h.sx/scale)<=ht&&Math.abs(vy-h.sy/scale)<=ht)return h.n;return null;}

canvas.onmousedown=e=>{
  const{vx,vy}=vc(e);
  if(tool!=='Select'){
    const el=mkEl(tool,vx,vy);
    elements.push(el); selectedId=el.id;
    setTool('Select'); updateUI(); return;
  }
  const sel=selEl();
  if(sel){const h=hitH(vx,vy,sel);if(h){isResizing=true;resizeHandle=h;dragStart={vx,vy,x:sel.x,y:sel.y,w:sel.w,h:sel.h};return;}}
  const hit=hitEl(vx,vy);
  if(hit){selectedId=hit.id;isDragging=true;dragStart={vx,vy,x:hit.x,y:hit.y};}
  else selectedId=null;
  updateUI();
};

canvas.onmousemove=e=>{
  const{vx,vy}=vc(e);
  if(isDragging&&selectedId){
    const el=selEl();if(!el)return;
    el.x=clamp(snap(dragStart.x+vx-dragStart.vx),0,VW-el.w);
    el.y=clamp(snap(dragStart.y+vy-dragStart.vy),0,VH-el.h);
    updatePaddingFromPos(el);
    syncPos(); updateCode(); render(); return;
  }
  if(isResizing&&selectedId){
    const el=selEl();if(!el)return;
    const dx=vx-dragStart.vx, dy=vy-dragStart.vy, n=resizeHandle;
    if(n.includes('e')) el.w=Math.max(8,snap(dragStart.w+dx));
    if(n.includes('s')) el.h=Math.max(8,snap(dragStart.h+dy));
    if(n.includes('w')){const nx=snap(dragStart.x+dx);el.w=Math.max(8,dragStart.x+dragStart.w-nx);el.x=dragStart.x+dragStart.w-el.w;}
    if(n.includes('n')){const ny=snap(dragStart.y+dy);el.h=Math.max(8,dragStart.y+dragStart.h-ny);el.y=dragStart.y+dragStart.h-el.h;}
    updatePaddingFromPos(el);
    syncPos(); updateCode(); render(); return;
  }
  const sel=selEl();
  if(sel){const h=hitH(vx,vy,sel);if(h){const cm={nw:'nw-resize',ne:'ne-resize',sw:'sw-resize',se:'se-resize',n:'n-resize',s:'s-resize',e:'e-resize',w:'w-resize'};canvas.style.cursor=cm[h]||'crosshair';return;}}
  canvas.style.cursor=hitEl(vx,vy)?'move':(tool!=='Select'?'crosshair':'default');
};

canvas.onmouseup=()=>{isDragging=false;isResizing=false;dragStart=null;resizeHandle=null;updateUI();};
canvas.onmouseleave=()=>{isDragging=false;isResizing=false;};

function setTool(t){
  tool=t;
  document.querySelectorAll('.palette-item').forEach(el=>el.classList.toggle('active',el.dataset.type===t));
  canvas.style.cursor=t!=='Select'?'crosshair':'default';
}
document.querySelectorAll('.palette-item').forEach(el=>el.addEventListener('click',()=>setTool(el.dataset.type)));

// ── Properties UI ──
function updateUI(){
  updateLayers(); updateCode(); render(); saveAutoDraft();
  const el=selEl();
  if(!el){noSel.style.display='';propEd.style.display='none';return;}
  noSel.style.display='none'; propEd.style.display='';
  const G=id=>document.getElementById(id);
  G('prop-asset-group').style.display=el.type==='Image'?'':'none';
  G('prop-label-group').style.display=['Button','Text','Slider','Checkbox'].includes(el.type)?'':'none';
  G('prop-text-align-group').style.display=el.type==='Text'?'':'none';
  G('prop-font-size-group').style.display=el.type==='Text'?'':'none';
  G('prop-text-effects-group').style.display=el.type==='Text'?'':'none';
  G('prop-font-group').style.display=el.type==='Text'?'':'none';
  G('prop-nineslice-group').style.display=['Panel','Button','Image'].includes(el.type)?'':'none';
  G('prop-slider-group').style.display=el.type==='Slider'?'':'none';
  G('prop-checkbox-group').style.display=el.type==='Checkbox'?'':'none';
  G('prop-textfield-group').style.display=el.type==='TextField'?'':'none';

  G('prop-tag').value=el.tag; G('prop-x').value=el.x; G('prop-y').value=el.y;
  G('prop-w').value=el.w; G('prop-h').value=el.h;
  G('prop-asset').value=el.assetName||'';
  G('prop-asset-path').value=el.assetPath||(el.assetName?`assets/${el.assetName}.png`:'');
  G('prop-font-name').value=el.fontName||'';
  G('prop-font-path').value=el.fontPath||(el.fontName?`assets/${el.fontName}.ttf`:'');
  G('prop-label-val').value=el.labelVal||'';
  G('prop-text-align').value=el.textAlign||'Left';
  G('prop-font-size').value=el.fontSize||16;
  G('prop-shadow-check').checked=!!el.shadowEnabled;
  G('prop-shadow-x').value=el.shadowX??2;
  G('prop-shadow-y').value=el.shadowY??2;
  G('prop-outline-check').checked=!!el.outlineEnabled;
  G('prop-outline-w').value=el.outlineW??1;
  G('ns-l').value=el.nsL||0; G('ns-t').value=el.nsT||0; G('ns-r').value=el.nsR||0; G('ns-b').value=el.nsB||0;
  G('slider-min').value=el.sliderMin??0; G('slider-max').value=el.sliderMax??1; G('slider-val').value=el.sliderVal??0.5;
  G('checkbox-checked').checked=!!el.checked;
  G('textfield-placeholder').value=el.placeholder||'Type here...';

  G('pad-l').value=el.padL; G('pad-t').value=el.padT; G('pad-r').value=el.padR; G('pad-b').value=el.padB;
  document.querySelectorAll('.anchor-btn').forEach(b=>b.classList.toggle('active',b.dataset.anchor===el.anchor));
}

function syncPos(){
  const el=selEl();if(!el)return;
  const G=id=>document.getElementById(id);
  G('prop-x').value=el.x; G('prop-y').value=el.y; G('prop-w').value=el.w; G('prop-h').value=el.h;
  G('pad-l').value=el.padL; G('pad-t').value=el.padT; G('pad-r').value=el.padR; G('pad-b').value=el.padB;
}

['prop-tag','prop-asset','prop-asset-path','prop-label-val','prop-font-name','prop-font-path','textfield-placeholder'].forEach(id=>document.getElementById(id)?.addEventListener('input',applyTextProps));
['prop-text-align','prop-font-size','prop-shadow-x','prop-shadow-y','prop-outline-w','ns-l','ns-t','ns-r','ns-b','slider-min','slider-max','slider-val'].forEach(id=>document.getElementById(id)?.addEventListener('input',applyTextProps));
['prop-shadow-check','prop-outline-check','checkbox-checked'].forEach(id=>document.getElementById(id)?.addEventListener('change',applyTextProps));
['prop-x','prop-y','prop-w','prop-h'].forEach(id=>document.getElementById(id)?.addEventListener('input',applyPosProps));
['pad-l','pad-t','pad-r','pad-b'].forEach(id=>document.getElementById(id)?.addEventListener('input',applyPaddingProps));

function applyTextProps(){
  const el=selEl();if(!el)return;
  const G=id=>document.getElementById(id);
  const oldTag = el.tag;
  const oldName = el.assetName;
  const newName = G('prop-asset').value;

  el.assetName = newName;
  const pathVal = G('prop-asset-path').value;
  if (pathVal) {
    el.assetPath = pathVal;
  } else if (el.assetName) {
    el.assetPath = `assets/${el.assetName}.png`;
  }

  el.fontName = G('prop-font-name').value;
  const fontPathVal = G('prop-font-path').value;
  if (fontPathVal) {
    el.fontPath = fontPathVal;
  } else if (el.fontName) {
    el.fontPath = `assets/${el.fontName}.ttf`;
  }

  if (el.type === 'Image' && oldName !== newName && newName) {
    if (!oldTag || oldTag === oldName || oldTag.startsWith('image_')) {
      el.tag = newName;
      G('prop-tag').value = newName;
    } else {
      el.tag = G('prop-tag').value || el.tag;
    }
  } else {
    el.tag = G('prop-tag').value || el.tag;
  }

  el.labelVal = G('prop-label-val').value;
  el.textAlign = G('prop-text-align').value;
  el.fontSize = parseInt(G('prop-font-size').value) || 16;
  el.shadowEnabled = G('prop-shadow-check').checked;
  el.shadowX = parseFloat(G('prop-shadow-x').value) || 2;
  el.shadowY = parseFloat(G('prop-shadow-y').value) || 2;
  el.outlineEnabled = G('prop-outline-check').checked;
  el.outlineW = parseFloat(G('prop-outline-w').value) || 1;
  el.nsL = parseFloat(G('ns-l').value) || 0;
  el.nsT = parseFloat(G('ns-t').value) || 0;
  el.nsR = parseFloat(G('ns-r').value) || 0;
  el.nsB = parseFloat(G('ns-b').value) || 0;
  el.sliderMin = parseFloat(G('slider-min').value) || 0;
  el.sliderMax = parseFloat(G('slider-max').value) || 1;
  el.sliderVal = parseFloat(G('slider-val').value) || 0.5;
  el.checked = G('checkbox-checked').checked;
  el.placeholder = G('textfield-placeholder').value;

  updateCode(); render(); saveAutoDraft();
}

function applyPosProps(){
  const el=selEl();if(!el)return;
  const G=id=>document.getElementById(id);
  el.x=parseInt(G('prop-x').value)||0; el.y=parseInt(G('prop-y').value)||0;
  el.w=Math.max(1,parseInt(G('prop-w').value)||1); el.h=Math.max(1,parseInt(G('prop-h').value)||1);
  updatePaddingFromPos(el);
  syncPos(); updateCode(); render();
}

function applyPaddingProps(){
  const el=selEl();if(!el)return;
  const G=id=>document.getElementById(id);
  el.padL=parseFloat(G('pad-l').value)||0; el.padT=parseFloat(G('pad-t').value)||0;
  el.padR=parseFloat(G('pad-r').value)||0; el.padB=parseFloat(G('pad-b').value)||0;
  computeAnchorPos(el);
  syncPos(); updateCode(); render();
}

// ── Quick Alignment Toolbar Handlers ──
document.getElementById('align-left').onclick = () => { const el=selEl(); if(el){ el.x=0; updatePaddingFromPos(el); syncPos(); updateCode(); render(); } };
document.getElementById('align-center-h').onclick = () => { const el=selEl(); if(el){ el.x=Math.round((VW-el.w)/2); updatePaddingFromPos(el); syncPos(); updateCode(); render(); } };
document.getElementById('align-right').onclick = () => { const el=selEl(); if(el){ el.x=VW-el.w; updatePaddingFromPos(el); syncPos(); updateCode(); render(); } };
document.getElementById('align-top').onclick = () => { const el=selEl(); if(el){ el.y=0; updatePaddingFromPos(el); syncPos(); updateCode(); render(); } };
document.getElementById('align-center-v').onclick = () => { const el=selEl(); if(el){ el.y=Math.round((VH-el.h)/2); updatePaddingFromPos(el); syncPos(); updateCode(); render(); } };
document.getElementById('align-bottom').onclick = () => { const el=selEl(); if(el){ el.y=VH-el.h; updatePaddingFromPos(el); syncPos(); updateCode(); render(); } };

// ── Snap & Set UIAnchor ──
document.querySelectorAll('.anchor-btn').forEach(btn=>btn.addEventListener('click',()=>{
  const el=selEl();if(!el)return;
  const newAnchor = btn.dataset.anchor;
  el.anchor = newAnchor;
  
  if (newAnchor !== 'None') {
    updatePaddingFromPos(el);
    computeAnchorPos(el);
  } else {
    el.padL = 0; el.padT = 0; el.padR = 0; el.padB = 0;
  }
  
  updateUI();
}));

// ── Double Click Anchor Button to Snap Directly to Zero-Padding Edge/Center ──
document.querySelectorAll('.anchor-btn').forEach(btn=>btn.addEventListener('dblclick',()=>{
  const el=selEl();if(!el)return;
  const newAnchor = btn.dataset.anchor;
  el.anchor = newAnchor;
  el.padL = 0; el.padT = 0; el.padR = 0; el.padB = 0;
  
  const cx = Math.round((VW - el.w) * 0.5);
  const cy = Math.round((VH - el.h) * 0.5);
  
  switch (newAnchor) {
    case 'TopLeft':      el.x = 0; el.y = 0; break;
    case 'TopCenter':    el.x = cx; el.y = 0; break;
    case 'TopRight':     el.x = VW - el.w; el.y = 0; break;
    case 'CenterLeft':   el.x = 0; el.y = cy; break;
    case 'Center':       el.x = cx; el.y = cy; break;
    case 'CenterRight':  el.x = VW - el.w; el.y = cy; break;
    case 'BottomLeft':   el.x = 0; el.y = VH - el.h; break;
    case 'BottomCenter': el.x = cx; el.y = VH - el.h; break;
    case 'BottomRight':  el.x = VW - el.w; el.y = VH - el.h; break;
  }
  updateUI();
}));

// ── Accurate Anchor Math ──
function computeAnchorPos(el) {
  if (el.anchor === 'None') return;
  const sw = VW, sh = VH;
  const w = el.w, h = el.h;
  const l = el.padL, t = el.padT, r = el.padR, b = el.padB;
  let x = el.x, y = el.y;

  switch (el.anchor) {
    case 'TopLeft':      x = l; y = t; break;
    case 'TopCenter':    x = (sw - w) * 0.5 + l - r; y = t; break;
    case 'TopRight':     x = sw - w - r; y = t; break;
    case 'CenterLeft':   x = l; y = (sh - h) * 0.5 + t - b; break;
    case 'Center':       x = (sw - w) * 0.5 + l - r; y = (sh - h) * 0.5 + t - b; break;
    case 'CenterRight':  x = sw - w - r; y = (sh - h) * 0.5 + t - b; break;
    case 'BottomLeft':   x = l; y = sh - h - b; break;
    case 'BottomCenter': x = (sw - w) * 0.5 + l - r; y = sh - h - b; break;
    case 'BottomRight':  x = sw - w - r; y = sh - h - b; break;
  }
  el.x = Math.round(x);
  el.y = Math.round(y);
}

function updatePaddingFromPos(el) {
  if (el.anchor === 'None') return;
  const sw = VW, sh = VH;
  const w = el.w, h = el.h;
  const x = el.x, y = el.y;
  let l = 0, t = 0, r = 0, b = 0;

  const cx = (sw - w) * 0.5;
  const cy = (sh - h) * 0.5;

  if (el.anchor.includes('Left'))   l = Math.max(0, Math.round(x));
  if (el.anchor.includes('Right'))  r = Math.max(0, Math.round(sw - w - x));
  if (el.anchor.includes('Top'))    t = Math.max(0, Math.round(y));
  if (el.anchor.includes('Bottom')) b = Math.max(0, Math.round(sh - h - y));

  if (el.anchor === 'TopCenter' || el.anchor === 'BottomCenter' || el.anchor === 'Center') {
    const diffX = x - cx;
    if (Math.abs(diffX) <= 0.51) { l = 0; r = 0; }
    else if (diffX > 0)          { l = Math.round(diffX); r = 0; }
    else                         { r = Math.round(-diffX); l = 0; }
  }

  if (el.anchor === 'CenterLeft' || el.anchor === 'CenterRight' || el.anchor === 'Center') {
    const diffY = y - cy;
    if (Math.abs(diffY) <= 0.51) { t = 0; b = 0; }
    else if (diffY > 0)          { t = Math.round(diffY); b = 0; }
    else                         { b = Math.round(-diffY); t = 0; }
  }

  el.padL = l; el.padT = t; el.padR = r; el.padB = b;
}

// ── Layers Reordering Stack ──
function moveLayer(id, dir) {
  const idx = elements.findIndex(e => e.id === id);
  if (idx === -1) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= elements.length) return;
  const temp = elements[idx];
  elements[idx] = elements[newIdx];
  elements[newIdx] = temp;
  updateUI();
}

function updateLayers(){
  layersList.innerHTML='';
  for(let i=elements.length-1;i>=0;i--){
    const el=elements[i];
    const div=document.createElement('div');
    div.className='layer-item'+(el.id===selectedId?' selected':'');
    div.innerHTML=`
      <div class="ldot"></div>
      <div class="lname">${el.tag}</div>
      <div class="layer-controls">
        <span class="lbtn lup" title="Move Up (Bring Forward)">▲</span>
        <span class="lbtn ldn" title="Move Down (Send Backward)">▼</span>
        <span class="lvis" title="Toggle Visibility">${el.visible?'👁':'🚫'}</span>
      </div>
    `;
    div.querySelector('.lup').onclick=e=>{e.stopPropagation(); moveLayer(el.id, 1);};
    div.querySelector('.ldn').onclick=e=>{e.stopPropagation(); moveLayer(el.id, -1);};
    div.querySelector('.lvis').onclick=e=>{e.stopPropagation();el.visible=!el.visible;updateLayers();render();};
    div.onclick=()=>{selectedId=el.id;updateUI();};
    layersList.appendChild(div);
  }
}

// ── Multi-Mode Code Generation ──
let currentCodeMode = 'combined';

function f(v){return Number.isInteger(v)?v+'.':v+'';}

function getScopePrefix() {
  const s = document.getElementById('ctx-scope');
  return s ? s.value : 'engine.ctx';
}

function generateAssetLoadersCode(scopeOverride) {
  const scope = scopeOverride || getScopePrefix();
  const loadedTextures = new Set();
  const loadedFonts = new Set();
  const lines = [];

  for (const el of elements) {
    if (el.type === 'Image') {
      const name = el.assetName || 'my_texture';
      const path = el.assetPath || `assets/${name}.png`;
      if (!loadedTextures.has(name)) {
        loadedTextures.add(name);
        lines.push(`${scope}.assets.load_texture("${name}", "${path}").await.unwrap();`);
      }
    }
    if (el.type === 'Text' && el.fontName) {
      const name = el.fontName;
      const path = el.fontPath || `assets/${name}.ttf`;
      if (!loadedFonts.has(name)) {
        loadedFonts.add(name);
        lines.push(`${scope}.assets.load_font("${name}", "${path}").await.unwrap();`);
      }
    }
  }

  if (!lines.length) {
    return '// No texture/font assets needed';
  }
  return lines.join('\n');
}

function generateUIElementsCode(scopeOverride) {
  if (!elements.length) return '// No elements — add some from palette!';
  const scope = scopeOverride || getScopePrefix();
  const lines = [];

  for (const el of elements) {
    const ha = el.anchor !== 'None';
    const allZ = !el.padL && !el.padT && !el.padR && !el.padB;
    const padStr = allZ ? 'Padding::zero()' : `Padding::only(${f(el.padL)}, ${f(el.padT)}, ${f(el.padR)}, ${f(el.padB)})`;
    const posStr = ha ? 'vec2(0., 0.)' : `vec2(${f(el.x)}, ${f(el.y)})`;
    let chain = [];

    switch (el.type) {
      case 'Image':
        chain.push(`Image::from_assets(&${scope}.assets, "${el.assetName || 'my_texture'}")\n    .unwrap()`);
        chain.push(`    .with_size(vec2(${f(el.w)}, ${f(el.h)}))`);
        if (!ha) chain.push(`    .with_position(vec2(${f(el.x)}, ${f(el.y)}))`);
        if (el.nsL || el.nsT || el.nsR || el.nsB) {
          chain.push(`    .with_nine_slice(${f(el.nsL||0)}, ${f(el.nsT||0)}, ${f(el.nsR||0)}, ${f(el.nsB||0)})`);
        }
        break;
      case 'Button':
        chain.push(`Button::new(${posStr}, vec2(${f(el.w)}, ${f(el.h)}), "${el.labelVal || 'Button'}")`);
        if (el.nsL || el.nsT || el.nsR || el.nsB) {
          chain.push(`    .with_nine_slice(${f(el.nsL||0)}, ${f(el.nsT||0)}, ${f(el.nsR||0)}, ${f(el.nsB||0)})`);
        }
        break;
      case 'Text':
        let textCode = `Text::new("${el.labelVal || 'Text'}", ${posStr}, ${f(el.fontSize || 16)}, WHITE)`;
        if (el.textAlign && el.textAlign !== 'Left') {
          textCode += `\n    .align(TextAlign::${el.textAlign})`;
        }
        if (el.shadowEnabled) {
          textCode += `\n    .with_shadow(Color::from_rgba(0, 0, 0, 180), vec2(${f(el.shadowX||2)}, ${f(el.shadowY||2)}))`;
        }
        if (el.outlineEnabled) {
          textCode += `\n    .with_outline(BLACK, ${f(el.outlineW||1)})`;
        }
        if (el.fontName) {
          textCode += `\n    .with_font_from_assets(&${scope}.assets, "${el.fontName}")`;
        }
        chain.push(textCode);
        break;
      case 'Panel':
        chain.push(`Panel::new(${posStr}, vec2(${f(el.w)}, ${f(el.h)}))`);
        if (el.nsL || el.nsT || el.nsR || el.nsB) {
          chain.push(`    .with_nine_slice(${f(el.nsL||0)}, ${f(el.nsT||0)}, ${f(el.nsR||0)}, ${f(el.nsB||0)})`);
        }
        break;
      case 'ProgressBar':
        chain.push(`ProgressBar::new(${posStr}, vec2(${f(el.w)}, ${f(el.h)}), 1.0)`);
        break;
      case 'Slider':
        chain.push(`Slider::new(${posStr}, vec2(${f(el.w)}, ${f(el.h)}), ${f(el.sliderMin||0)}, ${f(el.sliderMax||1)}, ${f(el.sliderVal||0.5)})\n    .with_label("${el.labelVal || 'Slider'}")`);
        break;
      case 'Checkbox':
        chain.push(`Checkbox::new(${posStr}, vec2(${f(el.h||24)}, ${f(el.h||24)}), "${el.labelVal || 'Toggle'}", ${!!el.checked})`);
        break;
      case 'TextField':
        chain.push(`TextField::new(${posStr}, vec2(${f(el.w)}, ${f(el.h)}))\n    .with_placeholder("${el.placeholder || 'Type here...'}")`);
        break;
    }

    if (ha) chain.push(`    .align_to_screen(UIAnchor::${el.anchor}, ${padStr})`);
    if (el.tag) chain.push(`    .with_tag("${el.tag}")`);
    if (!el.visible) chain.push(`    .hidden()`);

    lines.push(`let ${el.tag} = ${chain.join('\n')};`);
    lines.push(`world.add_ui(${el.tag});`);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

function generateCode(mode) {
  const m = mode || currentCodeMode;
  const scope = getScopePrefix();

  if (m === 'assets') return generateAssetLoadersCode(scope);
  if (m === 'ui') return generateUIElementsCode(scope);

  // Mode: combined (Assets + UI)
  const assetsPart = generateAssetLoadersCode(scope);
  const uiPart = generateUIElementsCode(scope);
  return `// --- Load Assets ---
${assetsPart}

// --- Setup UI ---
${uiPart}`;
}

function updateCode(){codeOutput.textContent=generateCode(currentCodeMode);}

// ── Smart File Writing ──
async function openFile(){
  try{
    [fileHandle]=await window.showOpenFilePicker({types:[{description:'Rust Files',accept:{'text/plain':['.rs']}}]});
    const file=await fileHandle.getFile();
    document.querySelector('.logo').textContent=`⚙ ${file.name}`;
    fileLabel.textContent=`📎 ${file.name}`; fileLabel.style.display='';
    document.getElementById('btn-write-file').disabled=false;
    document.getElementById('btn-write-file2').disabled=false;
  }catch(e){if(e.name!=='AbortError')alert('Could not open file:\n'+e.message);}
}

async function writeToFile(){
  if(!fileHandle){alert('Open a .rs file first.');return;}
  try{
    const file=await fileHandle.getFile();
    let content=await file.text();
    const code=generateCode('combined');
    const targetComment=document.getElementById('target-comment').value.trim();
    const block=`${MARKER_S}\n${code}\n${MARKER_E}`;

    if(content.includes(MARKER_S) && content.includes(MARKER_E)){
      const si=content.indexOf(MARKER_S);
      const ei=content.indexOf(MARKER_E)+MARKER_E.length;
      content=content.slice(0,si)+block+content.slice(ei);
    } else if(targetComment && content.includes(targetComment)){
      const idx=content.indexOf(targetComment);
      const lineStart=content.lastIndexOf('\n', idx);
      const indentMatch=content.slice(lineStart+1, idx).match(/^\s*/);
      const indent=indentMatch?indentMatch[0]:'  ';
      const indentedBlock=block.split('\n').map(l=>l?indent+l:l).join('\n');
      content=content.slice(0, idx) + indentedBlock + '\n' + indent + content.slice(idx);
    } else {
      const cb=content.lastIndexOf('}');
      const ind='    ';
      const indented=block.split('\n').map(l=>l?ind+l:l).join('\n');
      content=cb!==-1?content.slice(0,cb)+'\n'+indented+'\n'+content.slice(cb):content+'\n\n'+block;
    }

    const w=await fileHandle.createWritable();
    await w.write(content); await w.close();
    flash('btn-write-file','✅ Written!','💾 Write File');
    flash('btn-write-file2','✅ Written!','💾 Write');
  }catch(e){alert('Write failed:\n'+e.message);}
}

// ── GUI Draft Persistence & Project Export/Import ──
function exportProjectData() {
  return {
    version: 1,
    timestamp: Date.now(),
    resolution: { vw: VW, vh: VH },
    grid: { size: GRID, snap: snapToGrid },
    pixelArtMode: pixelArtMode,
    scope: getScopePrefix(),
    targetComment: document.getElementById('target-comment').value,
    idCounter: idCounter,
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
      visible: el.visible !== false,
    }))
  };
}

function importProjectData(data) {
  if (!data || !Array.isArray(data.elements)) {
    alert("Invalid GUI draft data!");
    return;
  }

  if (data.resolution) {
    VW = parseInt(data.resolution.vw) || 640;
    VH = parseInt(data.resolution.vh) || 360;
    document.getElementById('vw').value = VW;
    document.getElementById('vh').value = VH;
    vresLabel.textContent = `${VW} × ${VH}`;
  }

  if (data.grid) {
    GRID = parseInt(data.grid.size) || 8;
    snapToGrid = data.grid.snap !== false;
    document.getElementById('grid-size').value = GRID;
    document.getElementById('grid-snap').checked = snapToGrid;
  }

  if (typeof data.pixelArtMode === 'boolean') {
    pixelArtMode = data.pixelArtMode;
    document.getElementById('pixelart-snap').checked = pixelArtMode;
    canvas.style.imageRendering = pixelArtMode ? 'pixelated' : 'auto';
  }

  if (data.scope) {
    const scopeSelect = document.getElementById('ctx-scope');
    if (scopeSelect) scopeSelect.value = data.scope;
  }

  if (data.targetComment) {
    document.getElementById('target-comment').value = data.targetComment;
  }

  elements = data.elements.map(el => {
    const item = {
      ...el,
      imgObj: null,
    };

    if (el.dataUrl) {
      const img = new Image();
      img.onload = () => {
        item.imgObj = img;
        render();
      };
      img.src = el.dataUrl;
    }

    if (el.fontName && el.fontDataUrl) {
      (async () => {
        try {
          const fontFace = new FontFace(el.fontName, el.fontDataUrl);
          await fontFace.load();
          document.fonts.add(fontFace);
          render();
        } catch (e) {
          console.warn("Failed to restore font from draft:", el.fontName, e);
        }
      })();
    }

    return item;
  });

  idCounter = Math.max(0, ...elements.map(e => e.id || 0), data.idCounter || 0);
  selectedId = null;

  resizeCanvas();
  updateUI();
  pushHistory();
}

function saveAutoDraft() {
  try {
    const json = JSON.stringify(exportProjectData());
    localStorage.setItem('rusted_gui_auto_draft', json);
  } catch (e) {}
}

function loadAutoDraft() {
  try {
    const json = localStorage.getItem('rusted_gui_auto_draft');
    if (json) {
      const data = JSON.parse(json);
      if (data && Array.isArray(data.elements) && data.elements.length > 0) {
        importProjectData(data);
      }
    }
  } catch (e) {}
}

function updateDraftSlotsUI() {
  const select = document.getElementById('draft-slots');
  if (!select) return;
  select.innerHTML = '<option value="">Quick Drafts...</option>';

  try {
    const slots = JSON.parse(localStorage.getItem('rusted_gui_slots') || '{}');
    for (const name in slots) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `📋 ${name}`;
      select.appendChild(opt);
    }
  } catch (e) {}
}

function flash(id,msg,orig){const b=document.getElementById(id);if(!b)return;b.textContent=msg;setTimeout(()=>b.textContent=orig,1800);}

// ── Export / Import JSON Draft File Event Handlers ──
document.getElementById('btn-export-draft').onclick = () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportProjectData(), null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `gui_draft_${VW}x${VH}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  flash('btn-export-draft', '✅ Saved!', '💾 Save Draft');
};

document.getElementById('input-import-draft').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      importProjectData(data);
      flash('btn-export-draft', '✅ Loaded!', '💾 Save Draft');
    } catch (err) {
      alert("Could not load draft JSON:\n" + err.message);
    }
  };
  reader.readAsText(file);
};

// ── Quick Draft LocalStorage Slots Handlers ──
document.getElementById('btn-save-slot').onclick = () => {
  const defaultName = `Layout_${elements.length}_elements`;
  const name = prompt("Enter draft slot name (e.g. Main Menu, HUD, Inventory):", defaultName);
  if (!name || !name.trim()) return;
  const slotName = name.trim();

  try {
    const slots = JSON.parse(localStorage.getItem('rusted_gui_slots') || '{}');
    slots[slotName] = exportProjectData();
    localStorage.setItem('rusted_gui_slots', JSON.stringify(slots));
    updateDraftSlotsUI();
    document.getElementById('draft-slots').value = slotName;
    flash('btn-save-slot', '✅ Saved!', '📌 Save Slot');
  } catch (e) {
    alert("Could not save slot: " + e.message);
  }
};

document.getElementById('draft-slots').onchange = e => {
  const name = e.target.value;
  if (!name) return;
  try {
    const slots = JSON.parse(localStorage.getItem('rusted_gui_slots') || '{}');
    if (slots[name]) {
      importProjectData(slots[name]);
    }
  } catch (err) {
    alert("Error loading draft slot: " + err.message);
  }
};

document.querySelectorAll('.code-tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentCodeMode = tab.dataset.mode;
    updateCode();
  };
});

document.getElementById('ctx-scope')?.addEventListener('change', () => updateCode());

document.getElementById('btn-open-file').onclick=openFile;
document.getElementById('btn-write-file').onclick=writeToFile;
document.getElementById('btn-write-file2').onclick=writeToFile;
document.getElementById('btn-copy').onclick=()=>navigator.clipboard.writeText(generateCode(currentCodeMode)).then(()=>flash('btn-copy','✅ Copied!','📋 Copy Code'));
document.getElementById('btn-copy-assets').onclick=()=>navigator.clipboard.writeText(generateAssetLoadersCode()).then(()=>flash('btn-copy-assets','✅ Copied!','📦 Copy Assets'));
document.getElementById('btn-delete').onclick=()=>{elements=elements.filter(e=>e.id!==selectedId);selectedId=null;updateUI();};
document.getElementById('btn-clear').onclick=()=>{if(!elements.length||confirm('Clear all?')){elements=[];selectedId=null;updateUI();saveAutoDraft();}};

// ── Undo / Redo & Clipboard System ──
let undoStack = [];
let redoStack = [];
let clipboardElement = null;
let isRestoringHistory = false;

function pushHistory() {
  if (isRestoringHistory) return;
  const snapshot = JSON.stringify(exportProjectData());
  if (undoStack.length === 0 || undoStack[undoStack.length - 1] !== snapshot) {
    undoStack.push(snapshot);
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
  }
}

function undo() {
  if (undoStack.length <= 1) return;
  const currentState = undoStack.pop();
  redoStack.push(currentState);
  const previousState = undoStack[undoStack.length - 1];
  if (previousState) {
    isRestoringHistory = true;
    importProjectData(JSON.parse(previousState));
    isRestoringHistory = false;
    flash('select-tool', '↩ Undo', '↖ Select');
  }
}

function redo() {
  if (redoStack.length === 0) return;
  const nextState = redoStack.pop();
  undoStack.push(nextState);
  isRestoringHistory = true;
  importProjectData(JSON.parse(nextState));
  isRestoringHistory = false;
  flash('select-tool', '↪ Redo', '↖ Select');
}

function copySelected() {
  const el = selEl();
  if (!el) return;
  clipboardElement = JSON.parse(JSON.stringify(el));
  flash('select-tool', '📋 Copied!', '↖ Select');
}

function pasteClipboard() {
  if (!clipboardElement) return;
  pushHistory();
  const newEl = JSON.parse(JSON.stringify(clipboardElement));
  newEl.id = ++idCounter;
  newEl.x = clamp(newEl.x + GRID, 0, VW - newEl.w);
  newEl.y = clamp(newEl.y + GRID, 0, VH - newEl.h);
  newEl.tag = `${newEl.type.toLowerCase()}_${newEl.id}`;
  updatePaddingFromPos(newEl);

  if (newEl.dataUrl) {
    const img = new Image();
    img.onload = () => { newEl.imgObj = img; render(); };
    img.src = newEl.dataUrl;
  }

  elements.push(newEl);
  selectedId = newEl.id;
  updateUI();
  pushHistory();
  flash('select-tool', '📋 Pasted!', '↖ Select');
}

function duplicateSelected() {
  copySelected();
  pasteClipboard();
}

// ── Settings ──
document.getElementById('vw').oninput=e=>{VW=parseInt(e.target.value)||640;vresLabel.textContent=`${VW} × ${VH}`;resizeCanvas();saveAutoDraft();};
document.getElementById('vh').oninput=e=>{VH=parseInt(e.target.value)||360;vresLabel.textContent=`${VW} × ${VH}`;resizeCanvas();saveAutoDraft();};
document.getElementById('grid-size').oninput=e=>{GRID=parseInt(e.target.value)||8;render();saveAutoDraft();};
document.getElementById('grid-snap').onchange=e=>{snapToGrid=e.target.checked;saveAutoDraft();};

document.getElementById('pixelart-snap').onchange=e=>{
  pixelArtMode = e.target.checked;
  canvas.style.imageRendering = pixelArtMode ? 'pixelated' : 'auto';
  render(); saveAutoDraft();
};

// ── Keyboard Shortcuts (Undo/Redo, Copy/Paste/Duplicate, Delete, Nudge) ──
document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

  if (e.ctrlKey || e.metaKey) {
    const k = e.key.toLowerCase();
    if (k === 'r') {
      saveAutoDraft();
    }
    if (k === 'z') {
      if (e.shiftKey) redo();
      else undo();
      e.preventDefault();
      return;
    }
    if (k === 'y') {
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
    if (selectedId) {
      pushHistory();
      elements = elements.filter(el => el.id !== selectedId);
      selectedId = null;
      updateUI();
      pushHistory();
    }
  }
  if (e.key === 'Escape') {
    setTool('Select');
    selectedId = null;
    updateUI();
  }

  if (selectedId) {
    if (e.key === ']' || (e.ctrlKey && e.key === 'ArrowUp')) {
      pushHistory(); moveLayer(selectedId, 1); e.preventDefault(); return;
    }
    if (e.key === '[' || (e.ctrlKey && e.key === 'ArrowDown')) {
      pushHistory(); moveLayer(selectedId, -1); e.preventDefault(); return;
    }
    if (e.key.startsWith('Arrow')) {
      const el = selEl(); if (!el) return;
      pushHistory();
      const d = e.shiftKey ? 1 : GRID;
      if (e.key === 'ArrowLeft') el.x = clamp(el.x - d, 0, VW - el.w);
      if (e.key === 'ArrowRight') el.x = clamp(el.x + d, 0, VW - el.w);
      if (e.key === 'ArrowUp') el.y = clamp(el.y - d, 0, VH - el.h);
      if (e.key === 'ArrowDown') el.y = clamp(el.y + d, 0, VH - el.h);
      updatePaddingFromPos(el);
      syncPos(); updateCode(); render();
      e.preventDefault();
    }
  }
});

// ── Utils ──
const selEl=()=>elements.find(e=>e.id===selectedId)??null;
const snap=v=>snapToGrid?Math.round(v/GRID)*GRID:Math.round(v);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function hexRgba(h,a){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return `rgba(${r},${g},${b},${a})`;}

// ── Init & Auto-Save Triggers ──
window.addEventListener('beforeunload', () => saveAutoDraft());
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); setTool('Select');
updateDraftSlotsUI();
loadAutoDraft();
