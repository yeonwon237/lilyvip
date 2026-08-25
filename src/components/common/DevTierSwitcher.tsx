import React, { useState } from 'react';
import { Sparkles, Headphones, HardDrive, SlidersHorizontal, Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DevTierSwitcher: React.FC = () => {
  const { user, setUserTier, currentPage } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  // Hide on reader page unless opened
  if (currentPage === 'reader' && !isOpen) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-full bg-ink-900/80 text-white hover:bg-ink-900 backdrop-blur-md shadow-float text-xs flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
          title="Demo Tier Switcher"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <aside aria-label="Bộ điều khiển Demo" className="fixed bottom-20 md:bottom-5 left-4 z-50 select-none">
      {isOpen ? (
        <div className="bg-white/95 backdrop-blur-md border border-ink-200/90 rounded-2xl p-3 shadow-modal max-w-xs animate-in slide-in-from-bottom-2 duration-200 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-ink-100 mb-2">
            <span className="font-semibold text-ink-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5 text-lily-600" />
              <span>Mô phỏng Gói (Demo)</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-ink-400 hover:text-ink-700 hover:bg-ink-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={() => { setUserTier('free'); setIsOpen(false); }}
              className={`w-full p-2 rounded-xl text-left font-medium transition-all flex items-center justify-between ${
                user.tier === 'free'
                  ? 'bg-ink-900 text-white shadow-xs'
                  : 'bg-ink-50 hover:bg-ink-100 text-ink-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5 text-ink-400" />
                <span>Gói FREE (3 slot Local)</span>
              </div>
              {user.tier === 'free' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            <button
              onClick={() => { setUserTier('audio'); setIsOpen(false); }}
              className={`w-full p-2 rounded-xl text-left font-medium transition-all flex items-center justify-between ${
                user.tier === 'audio'
                  ? 'bg-lavender-600 text-white shadow-xs'
                  : 'bg-lavender-50 hover:bg-lavender-100 text-lavender-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Headphones className="w-3.5 h-3.5 text-lavender-300" />
                <span>FREE + AUDIO PASS</span>
              </div>
              {user.tier === 'audio' && <Check className="w-3.5 h-3.5 text-white" />}
            </button>

            <button
              onClick={() => { setUserTier('vip'); setIsOpen(false); }}
              className={`w-full p-2 rounded-xl text-left font-semibold transition-all flex items-center justify-between ${
                user.tier === 'vip'
                  ? 'bg-gradient-to-r from-lily-600 to-lily-700 text-white shadow-xs'
                  : 'bg-lily-50 hover:bg-lily-100 text-lily-950'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>✦ LILY VIP PRO</span>
              </div>
              {user.tier === 'vip' && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-ink-700 border border-ink-200/90 shadow-float backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-lily-600" />
          <span className="hidden sm:inline">Mô phỏng Gói:</span>
          <span className="font-bold text-ink-900 uppercase font-mono text-[11px]">
            {user.tier === 'free' ? 'Free' : user.tier === 'audio' ? 'Audio' : 'VIP Pro'}
          </span>
        </button>
      )}
    </aside>
  );
};
