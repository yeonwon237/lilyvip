import React from 'react';
import { Lock, Sparkles, Headphones } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface LockedFeatureProps {
  featureName: string;
  description?: string;
  type?: 'vip' | 'audio';
  compact?: boolean;
  className?: string;
}

export const LockedFeature: React.FC<LockedFeatureProps> = ({
  featureName,
  description,
  type = 'vip',
  compact = false,
  className = '',
}) => {
  const { openUpgradeModal } = useApp();

  if (compact) {
    return (
      <button
        onClick={() => openUpgradeModal(featureName)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-ink-100/70 hover:bg-lily-50 text-ink-600 hover:text-lily-800 transition-colors border border-dashed border-ink-300/80 ${className}`}
      >
        <Lock className="w-3 h-3 text-ink-400" />
        <span>{featureName}</span>
        <span className="text-[10px] text-lily-600 font-semibold">{type === 'audio' ? 'Audio' : 'VIP'}</span>
      </button>
    );
  }

  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-b from-white to-cream-50/50 border border-ink-200/70 text-center shadow-soft flex flex-col items-center justify-center ${className}`}>
      <div className="w-10 h-10 rounded-full bg-lily-100/80 text-lily-600 flex items-center justify-center mb-3">
        {type === 'audio' ? (
          <Headphones className="w-5 h-5" />
        ) : (
          <Sparkles className="w-5 h-5" />
        )}
      </div>

      <h4 className="font-semibold text-ink-900 text-sm mb-1 flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5 text-ink-400" />
        <span>{featureName}</span>
      </h4>

      <p className="text-xs text-ink-500 max-w-xs mb-4">
        {description || (type === 'audio' 
          ? 'Mở khóa tính năng nghe Audio/TTS cho các truyện trong thư viện của bạn.'
          : 'Trải nghiệm tính năng chuyên sâu này trên Lily VIP Reader Pro.')}
      </p>

      <button
        onClick={() => openUpgradeModal(featureName)}
        className="px-4 py-2 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-medium transition-all shadow-sm flex items-center gap-2"
      >
        <span>{type === 'audio' ? 'Mở Audio Pass 19.000đ' : 'Khám phá Lily VIP'}</span>
      </button>
    </div>
  );
};
