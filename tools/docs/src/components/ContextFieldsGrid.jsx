import React from 'react';
import {
  Clock,
  Gamepad2,
  FolderArchive,
  Volume2,
  Camera,
  Database,
  Crosshair,
  Package,
  Zap,
  Radio,
  Save,
} from 'lucide-react';

const CONTEXT_FIELDS = [
  {
    field: 'ctx.time',
    type: 'Time',
    desc: 'Delta time (deltatime()), licznik FPS oraz całkowity elapsed time.',
    icon: Clock,
    color: 'text-amber-400',
  },
  {
    field: 'ctx.input',
    type: 'Input',
    desc: 'Stan klawiatury (WASD, Strzałki), myszy i pozycje wirtualne.',
    icon: Gamepad2,
    color: 'text-blue-400',
  },
  {
    field: 'ctx.assets',
    type: 'Assets',
    desc: 'Magazyn tekstur, sekwencji, dźwięków, czcionek TTF i BitmapFont.',
    icon: FolderArchive,
    color: 'text-emerald-400',
  },
  {
    field: 'ctx.audio',
    type: 'Audio',
    desc: 'Odtwarzanie efektów sound i płynne przełączanie ścieżek (crossfade).',
    icon: Volume2,
    color: 'text-purple-400',
  },
  {
    field: 'ctx.camera',
    type: 'Camera',
    desc: 'Kontroler kamery 2D z wygładzaniem (follow) i wstrząsami (shake).',
    icon: Camera,
    color: 'text-cyan-400',
  },
  {
    field: 'ctx.state',
    type: 'StateStore',
    desc: 'Przechowalnia flag i zmiennych gry (JSON & Serde structs).',
    icon: Database,
    color: 'text-yellow-400',
  },
  {
    field: 'ctx.actions',
    type: 'ActionMap',
    desc: 'Mapowanie klawiszy i myszy na nazwane akcje wyższego poziomu.',
    icon: Crosshair,
    color: 'text-red-400',
  },
  {
    field: 'ctx.resources',
    type: 'Resources',
    desc: 'Typowany kontener zasobów uniwersalnych (TypeId).',
    icon: Package,
    color: 'text-indigo-400',
  },
  {
    field: 'ctx.triggers',
    type: 'TriggerSystem',
    desc: 'Silnik reguł Warunek → Akcja (one-shot oraz repeating).',
    icon: Zap,
    color: 'text-amber-400',
  },
  {
    field: 'ctx.events',
    type: 'EventBus',
    desc: 'Magistrala pub/sub zdarzeń typowanych i sygnałów tekstowych.',
    icon: Radio,
    color: 'text-pink-400',
  },
  {
    field: 'ctx.save_system',
    type: 'SaveSystem',
    desc: 'Slotowy zapis gry z weryfikacją sumy kontrolnej CRC32.',
    icon: Save,
    color: 'text-teal-400',
  },
];

export function ContextFieldsGrid() {
  return (
    <div className="my-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {CONTEXT_FIELDS.map((item, idx) => {
        const IconComponent = item.icon;
        return (
          <div
            key={idx}
            className="p-3.5 rounded-xl border border-zinc-800 bg-[#0c0c0e] hover:border-zinc-700 transition-all flex flex-col justify-between shadow-sm group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <IconComponent className={`w-4 h-4 ${item.color}`} />
                  <code className="text-xs font-bold font-mono text-zinc-100">
                    {item.field}
                  </code>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                  {item.type}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
