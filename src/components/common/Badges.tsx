import React from 'react';
import { Cloud, HardDrive, Headphones, Sparkles, Check } from 'lucide-react';
import { UserTier } from '../../types';

export const PlanBadge: React.FC<{ tier: UserTier; audioDays?: number; vipDays?: number; className?: string }> = ({
  tier,
  audioDays = 18,
  vipDays = 23,
  className = '',
}) => {
  if (tier === 'vip') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-lily-500/15 via-lavender-500/15 to-lily-500/15 text-lily-800 border border-lily-200/60 shadow-sm ${className}`}>
        <Sparkles className="w-3.5 h-3.5 text-lily-600 animate-pulse" />
        <span>✦ LILY VIP</span>
        <span className="text-ink-400 font-normal">· còn {vipDays} ngày</span>
      </span>
    );
  }

  if (tier === 'audio') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-lavender-100/70 text-lavender-800 border border-lavender-200/70 shadow-sm ${className}`}>
        <Headphones className="w-3.5 h-3.5 text-lavender-600" />
        <span>FREE</span>
        <span className="text-ink-400 font-normal">· 🎧 Audio {audioDays} ngày</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-ink-100 text-ink-700 border border-ink-200/60 shadow-sm ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-ink-400"></span>
      <span>FREE</span>
    </span>
  );
};

export const LocalBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-cream-200/70 text-ink-700 border border-cream-300/60 ${className}`}>
    <HardDrive className="w-3 h-3 text-ink-500" />
    <span>Local</span>
  </span>
);

export const CloudBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-lily-100/80 text-lily-800 border border-lily-200/70 ${className}`}>
    <Cloud className="w-3 h-3 text-lily-600" />
    <span>Cloud</span>
  </span>
);

export const AudioBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-lavender-100 text-lavender-800 border border-lavender-200 ${className}`}>
    <Headphones className="w-3 h-3 text-lavender-600" />
    <span>Audio</span>
  </span>
);

export const FormatBadge: React.FC<{ 
  format?: 'TXT' | 'EPUB' | 'DOCX'; 
  variant?: 'default' | 'cover' | 'subtle';
  className?: string 
}> = ({ format = 'TXT', variant = 'default', className = '' }) => {
  if (variant === 'cover') {
    return (
      <span className={`inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider bg-black/75 text-white border border-white/25 backdrop-blur-md shadow-xs ${className}`}>
        {format}
      </span>
    );
  }

  const formatStyles = {
    TXT: 'bg-ink-100 text-ink-900 border-ink-300',
    EPUB: 'bg-rose-100/90 text-rose-950 border-rose-300 font-bold',
    DOCX: 'bg-blue-100/90 text-blue-950 border-blue-300 font-bold',
  };

  return (
    <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider shadow-2xs ${formatStyles[format] || formatStyles.TXT} ${className}`}>
      {format}
    </span>
  );
};
