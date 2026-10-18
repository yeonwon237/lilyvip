import { t } from '../../i18n';
import React from 'react';
import { HardDrive } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const StorageMeter: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { books, libraryLimits, openUpgradeModal } = useApp();
  const unlimited = !Number.isFinite(libraryLimits.total);
  const percent = unlimited ? 0 : Math.min(100, books.length / libraryLimits.total * 100);
  return (
    <div className={`rounded-2xl border border-cream-200/80 bg-cream-100/70 p-4 ${className}`}>
      <div className="mb-2 flex items-center justify-between text-xs text-ink-700">
        <span className="flex items-center gap-2 font-semibold"><HardDrive className="h-4 w-4" />{t("Bộ nhớ thiết bị (Local)")}</span>
        <span>{books.length} / {unlimited ? '∞' : libraryLimits.total}</span>
      </div>
      <div className="mb-2.5 h-2 overflow-hidden rounded-full bg-ink-200/70"><div className="h-full rounded-full bg-lily-500" style={{ width: `${percent}%` }} /></div>
      <p className="mb-3 text-[11px] leading-relaxed text-ink-500">{t("Truyện được lưu trên thiết bị này. Xóa dữ liệu trang web có thể xóa thư viện Local.")}</p>
      {!unlimited && <button onClick={() => openUpgradeModal(t("Chọn gói Lilyhub"))} className="w-full rounded-xl border border-cream-300 bg-white px-3 py-1.5 text-xs font-medium text-lily-800">{t("Xem các gói")}</button>}
    </div>
  );
};
