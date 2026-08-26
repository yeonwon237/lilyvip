import React from 'react';
import { Cloud, HardDrive, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const StorageMeter: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user, openUpgradeModal } = useApp();

  if (user.tier !== 'vip') {
    return (
      <div className={`bg-cream-100/70 border border-cream-200/80 rounded-2xl p-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-ink-800">
            <HardDrive className="w-4 h-4 text-ink-600" />
            <span className="text-xs font-semibold">Bộ nhớ thiết bị (Local)</span>
          </div>
          <span className="text-xs font-medium text-ink-600">
            {user.freeSlotsUsed} / {user.freeSlotsTotal} slot
          </span>
        </div>
        
        {/* Slot pills */}
        <div className="grid grid-cols-3 gap-1.5 mb-2.5">
          {[1, 2, 3].map((slot) => {
            const isUsed = slot <= user.freeSlotsUsed;
            return (
              <div
                key={slot}
                className={`h-2 rounded-full transition-all ${
                  isUsed ? 'bg-lily-500' : 'bg-ink-200/70'
                }`}
              />
            );
          })}
        </div>

        <p className="text-[11px] text-ink-500 leading-relaxed mb-3">
          Truyện được lưu trên thiết bị này. Xóa dữ liệu trang web có thể xóa thư viện Local.
        </p>

        <button
          onClick={() => openUpgradeModal('Lily Cloud Storage')}
          className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-cream-50 border border-cream-300 text-xs font-medium text-lily-800 flex items-center justify-center gap-1.5 transition-colors shadow-soft"
        >
          <Sparkles className="w-3.5 h-3.5 text-lily-600" />
          <span>Tìm hiểu Lily Cloud</span>
        </button>
      </div>
    );
  }

  // VIP Storage Meter
  const usedMB = user.usedStorageMB ?? user.cloudStorageUsedMB ?? 0;
  const totalMB = user.totalStorageMB ?? user.cloudStorageTotalMB ?? 150;
  const percentUsed = Math.min(100, Math.round((usedMB / totalMB) * 100));

  return (
    <div className={`bg-white/80 border border-lily-100/80 rounded-2xl p-4 shadow-soft ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-ink-900">
          <Cloud className="w-4 h-4 text-lily-600" />
          <span className="text-xs font-semibold">Lily Cloud Storage</span>
        </div>
        <span className="text-xs font-medium text-ink-700">
          {usedMB} MB / {totalMB} MB
        </span>
      </div>

      {/* Progress */}
      <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden mb-2">
        <div 
          className="h-full bg-gradient-to-r from-lily-400 to-lavender-500 rounded-full transition-all duration-500"
          style={{ width: `${percentUsed}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-ink-400">
        <span className="text-emerald-700 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          ☁ Đã đồng bộ an toàn
        </span>
        <span>{percentUsed}% đã dùng</span>
      </div>
    </div>
  );
};
