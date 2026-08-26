import React from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';
import { mockThemes } from '../../mock/mockData';

export const ThemeSelectorSheet: React.FC = () => {
  const { canUseFeature, isOpenBeta } = useApp();
  const { 
    isThemePanelOpen, 
    setIsThemePanelOpen, 
    settings, 
    updateSetting 
  } = useReader();

  if (!isThemePanelOpen) return null;

  const freeThemes = mockThemes.filter(t => !t.isVipOnly);
  const vipThemes = mockThemes.filter(t => t.isVipOnly);

  const handleSelectTheme = (themeId: string, isVipOnly: boolean) => {
    if (isVipOnly && !canUseFeature('premiumThemes')) {
      return;
    } else {
      updateSetting('activeThemeId', themeId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-white rounded-t-3xl shadow-modal border-t border-ink-100 p-5 md:p-6 max-h-[85vh] overflow-y-auto space-y-5 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-base text-ink-900">
              Không gian đọc (Themes & Environments)
            </h3>
          </div>
          <button
            onClick={() => setIsThemePanelOpen(false)}
            className="p-1 rounded-full text-ink-400 hover:text-ink-700 hover:bg-ink-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Themes (5 Themes) */}
        <div>
          <h4 className="text-xs font-semibold text-ink-600 uppercase tracking-wider mb-2.5">
            5 Giao diện Tiêu chuẩn (Free)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {freeThemes.map((t) => {
              const isSelected = settings.activeThemeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTheme(t.id, false)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-between gap-2 transition-all relative ${
                    isSelected
                      ? 'ring-2 ring-lily-500 border-lily-500 shadow-sm'
                      : 'border-ink-200 hover:border-ink-300'
                  }`}
                  style={{ backgroundColor: t.previewBg }}
                >
                  <div 
                    className="w-full h-8 rounded-lg flex items-center justify-center font-serif text-sm font-semibold"
                    style={{ color: t.previewText }}
                  >
                    Aa
                  </div>
                  <span 
                    className="text-xs font-medium"
                    style={{ color: t.previewText }}
                  >
                    {t.name}
                  </span>
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-lily-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* VIP Reading Environments (8 Environments) */}
        <div className="pt-2 border-t border-ink-100">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-semibold text-lily-950 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-lily-600" />
              <span>8 Môi trường Đọc chuyên sâu (Lily VIP)</span>
            </h4>
            {isOpenBeta && (
              <span className="text-[10px] text-lily-700 font-bold px-2 py-0.5 rounded bg-lily-100">
                Beta
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {vipThemes.map((t) => {
              const isSelected = settings.activeThemeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTheme(t.id, true)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-between gap-1.5 transition-all relative ${
                    isSelected
                      ? 'ring-2 ring-lily-500 border-lily-500 shadow-card'
                      : 'border-ink-200 hover:border-lily-300'
                  }`}
                  style={{ backgroundColor: t.previewBg }}
                >
                  <div 
                    className="w-full h-10 rounded-lg flex items-center justify-center font-serif text-base font-bold"
                    style={{ color: t.previewText }}
                  >
                    Aa
                  </div>
                  <div className="text-center">
                    <span 
                      className="text-xs font-semibold block"
                      style={{ color: t.previewText }}
                    >
                      {t.name}
                    </span>
                    <span 
                      className="text-[10px] opacity-75 block truncate max-w-[100px]"
                      style={{ color: t.previewText }}
                    >
                      {t.description}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-lily-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
