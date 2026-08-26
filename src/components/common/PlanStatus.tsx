import React from 'react';
import { Sparkles, Headphones, HardDrive, ShieldCheck } from 'lucide-react';
import { UserTier } from '../../types';

interface PlanStatusProps {
  tier: UserTier;
  audioDays?: number;
  vipDays?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'pill' | 'chip' | 'card';
  className?: string;
}

export const PlanStatus: React.FC<PlanStatusProps> = ({
  tier,
  audioDays = 18,
  vipDays = 23,
  size = 'md',
  variant = 'pill',
  className = '',
}) => {
  // LILY VIP
  if (tier === 'vip') {
    if (variant === 'card') {
      return (
        <div className={`p-3.5 rounded-2xl bg-gradient-to-r from-lily-50 via-white to-lavender-50 border border-lily-200/80 shadow-soft flex items-center justify-between ${className}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lily-100 text-lily-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-lily-600" />
            </div>
            <div>
              <div className="font-semibold text-xs text-lily-950 flex items-center gap-1.5">
                <span>✦ LILY VIP</span>
                <span className="text-[10px] font-bold text-lily-700 bg-lily-100 px-1.5 py-0.2 rounded-full">
                  Còn {vipDays} ngày
                </span>
              </div>
              <p className="text-[11px] text-ink-500 mt-0.5">Cloud Storage · Reader Pro · Audio Trọn gói</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold bg-lily-50 text-lily-900 border border-lily-200/80 shadow-xs ${
        size === 'sm' ? 'text-xs' : 'text-xs'
      } ${className}`}>
        <Sparkles className="w-3.5 h-3.5 text-lily-600 animate-pulse" />
        <span>✦ LILY VIP</span>
        <span className="text-ink-400 font-normal">· còn {vipDays} ngày</span>
      </span>
    );
  }

  // FREE + AUDIO PASS
  if (tier === 'audio') {
    if (variant === 'card') {
      return (
        <div className={`p-3.5 rounded-2xl bg-gradient-to-r from-lavender-50 via-white to-lavender-50/70 border border-lavender-200 shadow-soft flex items-center justify-between ${className}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lavender-100 text-lavender-700 flex items-center justify-center">
              <Headphones className="w-4 h-4 text-lavender-600" />
            </div>
            <div>
              <div className="font-semibold text-xs text-lavender-950 flex items-center gap-1.5">
                <span>FREE · 🎧 Audio Pass</span>
                <span className="text-[10px] font-bold text-lavender-800 bg-lavender-100 px-1.5 py-0.2 rounded-full">
                  Còn {audioDays} ngày
                </span>
              </div>
              <p className="text-[11px] text-ink-500 mt-0.5">3 truyện trên thiết bị · Giọng Lily</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium bg-lavender-50 text-lavender-900 border border-lavender-200/80 shadow-xs ${
        size === 'sm' ? 'text-xs' : 'text-xs'
      } ${className}`}>
        <Headphones className="w-3.5 h-3.5 text-lavender-600" />
        <span>FREE</span>
        <span className="text-ink-400 font-normal">· 🎧 Audio {audioDays} ngày</span>
      </span>
    );
  }

  // FREE TIER
  if (variant === 'card') {
    return (
      <div className={`p-3.5 rounded-2xl bg-cream-50/80 border border-cream-200 text-ink-700 flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-ink-100 text-ink-600 flex items-center justify-center">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-xs text-ink-900">Gói FREE (Lily Local)</div>
            <p className="text-[11px] text-ink-500 mt-0.5">3 Slot truyện trên thiết bị · 5 Theme đọc</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-ink-100/90 text-ink-700 border border-ink-200/60 shadow-xs ${
      size === 'sm' ? 'text-xs' : 'text-xs'
    } ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-ink-400"></span>
      <span>FREE</span>
      <span className="text-ink-400 font-normal">· 3 slot local</span>
    </span>
  );
};
