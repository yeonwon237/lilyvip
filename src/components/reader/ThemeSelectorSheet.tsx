import React from 'react';
import { Check, Lock, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';
import { mockThemes } from '../../mock/mockData';

export const ThemeSelectorSheet: React.FC = () => {
  const { canUseFeature } = useApp();
  const { isThemePanelOpen, setIsThemePanelOpen, settings, updateSetting } = useReader();
  if (!isThemePanelOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/35" onClick={() => setIsThemePanelOpen(false)}>
    <section className="reader-panel reader-settings-sheet w-full max-w-2xl border-t border-ink-200" onClick={(event) => event.stopPropagation()}>
      <header className="flex h-12 items-center justify-between border-b border-ink-100 px-4"><h3 className="font-serif text-base font-bold text-ink-900">Giao diện đọc</h3><button onClick={() => setIsThemePanelOpen(false)} className="flex h-9 w-9 items-center justify-center text-ink-600" aria-label="Đóng"><X className="h-5 w-5" /></button></header>
      <div className="grid grid-cols-4 gap-x-3 gap-y-4 p-4 sm:grid-cols-7">
        {mockThemes.map((theme) => {
          const selected = settings.activeThemeId === theme.id;
          const locked = theme.isVipOnly && !canUseFeature('premiumThemes');
          return <button key={theme.id} onClick={() => !locked && updateSetting('activeThemeId', theme.id)} disabled={locked} className="min-w-0 text-center disabled:opacity-45">
            <span className={`relative mx-auto flex h-11 w-11 items-center justify-center rounded-full border ${selected ? 'border-lily-700 ring-2 ring-lily-200' : 'border-ink-200'}`} style={{ backgroundColor: theme.previewBg, color: theme.previewText }}><span className="font-serif text-sm font-bold">Aa</span>{selected && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-lily-700 text-white"><Check className="h-2.5 w-2.5" /></span>}{locked && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink-700 text-white"><Lock className="h-2.5 w-2.5" /></span>}</span>
            <span className="mt-1 block truncate text-[11px] text-ink-700">{theme.name}</span>
          </button>;
        })}
      </div>
    </section>
  </div>;
};
