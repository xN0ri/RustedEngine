import React, { useState } from 'react';
import { Copy, Check, X, Sparkles, Layout, Box } from 'lucide-react';

export function CodeDrawer({ elements, scope, onClose }) {
  const [activeTab, setActiveTab] = useState('combined');
  const [copied, setCopied] = useState(false);

  const formatNumber = (v) => Number.isInteger(v) ? `${v}.` : `${v}`;

  const generateAssetCode = () => {
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

    if (!lines.length) return '// No texture/font assets needed';
    return lines.join('\n');
  };

  const getAssetsExpr = (sc) => {
    const s = (sc || 'engine.ctx').trim();
    if (s === 'assets' || s === '&assets') return '&assets';
    if (s.endsWith('.assets')) return s.startsWith('&') ? s : `&${s}`;
    return s.startsWith('&') ? `${s}.assets` : `&${s}.assets`;
  };

  const generateRustCode = () => {
    const lines = [];
    const assetsExpr = getAssetsExpr(scope);

    lines.push(`// Generated UI Code for RustyEngine`);
    lines.push(`// Scope Target: ${scope} | Resolution: ${vw}x${vh}`);
    lines.push(``);

    elements.forEach(el => {
      const ha = el.anchor && el.anchor !== 'None';
      const allZ = !el.padL && !el.padT && !el.padR && !el.padB;
      const padStr = allZ ? 'Padding::zero()' : `Padding::only(${formatNumber(el.padL)}, ${formatNumber(el.padT)}, ${formatNumber(el.padR)}, ${formatNumber(el.padB)})`;
      const posStr = ha ? 'vec2(0., 0.)' : `vec2(${formatNumber(el.x)}, ${formatNumber(el.y)})`;
      let chain = [];

      switch (el.type) {
        case 'Image':
          chain.push(`Image::from_assets(${assetsExpr}, "${el.assetName || 'my_texture'}")\n    .unwrap()`);
          chain.push(`    .with_size(vec2(${formatNumber(el.w)}, ${formatNumber(el.h)}))`);
          if (!ha) chain.push(`    .with_position(vec2(${formatNumber(el.x)}, ${formatNumber(el.y)}))`);
          if (el.nsL || el.nsT || el.nsR || el.nsB) chain.push(`    .with_nine_slice(${formatNumber(el.nsL||0)}, ${formatNumber(el.nsT||0)}, ${formatNumber(el.nsR||0)}, ${formatNumber(el.nsB||0)})`);
          break;
        case 'Button':
          chain.push(`Button::new(${posStr}, vec2(${formatNumber(el.w)}, ${formatNumber(el.h)}), "${el.labelVal || 'Button'}")`);
          if (el.nsL || el.nsT || el.nsR || el.nsB) chain.push(`    .with_nine_slice(${formatNumber(el.nsL||0)}, ${formatNumber(el.nsT||0)}, ${formatNumber(el.nsR||0)}, ${formatNumber(el.nsB||0)})`);
          break;
        case 'Text':
          let textCode = `Text::new("${el.labelVal || 'Text'}", ${posStr}, ${formatNumber(el.fontSize || 16)}, WHITE)`;
          if (el.textAlign && el.textAlign !== 'Left') textCode += `\n    .align(TextAlign::${el.textAlign})`;
          if (el.shadowEnabled) textCode += `\n    .with_shadow(Color::from_rgba(0, 0, 0, 180), vec2(${formatNumber(el.shadowX||2)}, ${formatNumber(el.shadowY||2)}))`;
          if (el.outlineEnabled) textCode += `\n    .with_outline(BLACK, ${formatNumber(el.outlineW||1)})`;
          if (el.fontName) textCode += `\n    .with_font_from_assets(${assetsExpr}, "${el.fontName}")`;
          chain.push(textCode);
          break;
        case 'Panel':
          chain.push(`Panel::new(${posStr}, vec2(${formatNumber(el.w)}, ${formatNumber(el.h)}))`);
          if (el.nsL || el.nsT || el.nsR || el.nsB) chain.push(`    .with_nine_slice(${formatNumber(el.nsL||0)}, ${formatNumber(el.nsT||0)}, ${formatNumber(el.nsR||0)}, ${formatNumber(el.nsB||0)})`);
          break;
        case 'ProgressBar':
          chain.push(`ProgressBar::new(${posStr}, vec2(${formatNumber(el.w)}, ${formatNumber(el.h)}), 1.0)`);
          break;
        case 'Slider':
          chain.push(`Slider::new(${posStr}, vec2(${formatNumber(el.w)}, ${formatNumber(el.h)}), ${formatNumber(el.sliderMin||0)}, ${formatNumber(el.sliderMax||1)}, ${formatNumber(el.sliderVal||0.5)})\n    .with_label("${el.labelVal || 'Slider'}")`);
          break;
        case 'Checkbox':
          chain.push(`Checkbox::new(${posStr}, vec2(${formatNumber(el.h||24)}, ${formatNumber(el.h||24)}), "${el.labelVal || 'Toggle'}", ${!!el.checked})`);
          break;
        case 'TextField':
          let tfStr = `TextField::new(${posStr}, vec2(${formatNumber(el.w)}, ${formatNumber(el.h)}), "${el.placeholder || ''}")`;
          if (el.labelVal) tfStr += `\n    .with_text("${el.labelVal}")`;
          if (el.fontSize) tfStr += `\n    .with_font_size(${formatNumber(el.fontSize)})`;
          if (el.plainInput) tfStr += `\n    .without_decoration()`;
          chain.push(tfStr);
          break;
        default:
          break;
      }

      if (ha) chain.push(`    .align_to_screen(UIAnchor::${el.anchor}, ${padStr})`);
      if (el.tag) chain.push(`    .with_tag("${el.tag}")`);
      if (el.visible === false) chain.push(`    .hidden()`);

      lines.push(`let ${el.tag} = ${chain.join('\n')};`);
    });

    return lines.join('\n').trimEnd();
  };

  const getFullCode = () => {
    if (activeTab === 'assets') return generateAssetCode();
    if (activeTab === 'ui') return generateRustCode();
    return `// --- Load Assets ---\n${generateAssetCode()}\n\n// --- Setup UI ---\n${generateRustCode()}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFullCode()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="h-56 bg-[#121215] border-t border-[#1f1f23] flex flex-col flex-shrink-0 select-none font-mono text-xs z-10 shadow-2xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f1f23] bg-[#141418]">
        <div className="flex items-center gap-1.5 font-sans">
          <button
            onClick={() => setActiveTab('combined')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
              activeTab === 'combined' ? 'bg-zinc-100 text-zinc-950 shadow-sm font-semibold' : 'text-zinc-400 hover:text-white hover:bg-[#27272a]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Combined
          </button>
          <button
            onClick={() => setActiveTab('ui')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
              activeTab === 'ui' ? 'bg-zinc-100 text-zinc-950 shadow-sm font-semibold' : 'text-zinc-400 hover:text-white hover:bg-[#27272a]'
            }`}
          >
            <Layout className="w-3.5 h-3.5" /> UI Only
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
              activeTab === 'assets' ? 'bg-zinc-100 text-zinc-950 shadow-sm font-semibold' : 'text-zinc-400 hover:text-white hover:bg-[#27272a]'
            }`}
          >
            <Box className="w-3.5 h-3.5" /> Assets Only
          </button>
        </div>

        <div className="flex items-center gap-2 font-sans">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-100 text-zinc-950 font-medium hover:bg-white transition-all shadow-sm text-[11.5px]"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-3 overflow-auto bg-[#09090b] text-indigo-300 font-mono text-[11.5px] leading-relaxed whitespace-pre select-text">
        {getFullCode()}
      </div>
    </div>
  );
}
