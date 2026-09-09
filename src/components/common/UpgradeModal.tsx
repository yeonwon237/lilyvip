import React from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const UpgradeModal: React.FC = () => {
  const { isUpgradeModalOpen, setIsUpgradeModalOpen, upgradeModalFeature, navigateTo } = useApp();
  if (!isUpgradeModalOpen) return null;

  const openPlans = () => {
    setIsUpgradeModalOpen(false);
    navigateTo('account');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink-950/60 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
      <section className="surface-solid w-full px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-modal sm:max-w-md sm:border sm:border-ink-300 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-lily-700">Lily Reader VIP</p>
            <h2 id="upgrade-title" className="mt-1 font-serif text-2xl font-bold text-ink-950">Nâng giới hạn thư viện</h2>
          </div>
          <button type="button" onClick={() => setIsUpgradeModalOpen(false)} className="grid h-9 w-9 place-items-center text-ink-500 hover:bg-ink-50" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        {upgradeModalFeature && <p className="mt-3 text-sm text-ink-600">{upgradeModalFeature}</p>}
        <div className="mt-5 space-y-3 border-y border-ink-200 py-4 text-sm text-ink-700">
          <p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> VIP 1 lưu tối đa 30 truyện.</p>
          <p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> VIP 2 lưu tối đa 100 truyện.</p>
          <p className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> Nhập từ LilyHub, website hoặc thiết bị.</p>
        </div>

        <button type="button" onClick={openPlans} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 bg-ink-950 px-4 text-sm font-semibold text-white">
          Xem gói thành viên <ArrowRight className="h-4 w-4" />
        </button>
        <p className="mt-3 text-center text-xs text-ink-500">Đăng ký trực tiếp qua Telegram.</p>
      </section>
    </div>
  );
};
