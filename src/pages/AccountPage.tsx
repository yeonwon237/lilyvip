import React from 'react';
import { HardDrive } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { UserTier } from '../types';

const plans: Array<{ tier?: UserTier; name: string; price: string; limit: string; details: string[]; pending?: boolean }> = [
  { tier: 'free', name: 'Miễn phí', price: '0đ', limit: '5 truyện trên máy', details: ['2 truyện LilyHub', '3 truyện từ file hoặc website'] },
  { tier: 'vip1', name: 'VIP 1', price: '149.000đ / năm', limit: '30 truyện trên máy', details: ['Tự do chọn nguồn', 'Đọc và nghe offline'] },
  { tier: 'vip2', name: 'VIP 2', price: '249.000đ / năm', limit: '100 truyện trên máy', details: ['Tự do chọn nguồn', 'Đọc và nghe offline'] },
  { name: 'SVIP', price: 'Dự kiến 299.000đ / năm', limit: 'Không giới hạn slot', details: ['500 MB cloud', 'Đọc trên nhiều thiết bị'], pending: true },
];

export const AccountPage: React.FC = () => {
  const { user, books, setUserTier, libraryLimits, lilyHubSlotsUsed, externalSlotsUsed } = useApp();
  const isDev = import.meta.env.DEV;

  return (
    <div className="mx-auto max-w-3xl pb-24 pt-2">
      <header className="flex items-center gap-4 border-b border-ink-200 pb-6">
        <img src={user.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl font-bold text-ink-950">{user.name}</h1>
          <p className="truncate text-sm text-ink-500">{user.email || 'Tài khoản LilyHub'}</p>
        </div>
      </header>

      <section className="border-b border-ink-200 py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-ink-500">Dung lượng gói hiện tại</p>
            <p className="mt-1 text-lg font-semibold text-ink-950">{books.length} / {libraryLimits.total} truyện</p>
          </div>
          <HardDrive className="h-5 w-5 text-ink-500" />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden bg-ink-100">
          <div className="h-full bg-lily-600" style={{ width: `${Math.min(100, books.length / libraryLimits.total * 100)}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-600">
          <span>LilyHub {lilyHubSlotsUsed}/{libraryLimits.lilyhub}</span>
          <span>File & website {externalSlotsUsed}/{libraryLimits.external}</span>
        </div>
      </section>

      <section className="py-6">
        <h2 className="font-serif text-xl font-bold text-ink-950">Chọn gói</h2>
        <p className="mt-1 text-xs text-ink-500">Truyện vẫn nằm trên thiết bị của bạn.</p>
        <div className="mt-4 divide-y divide-ink-100 border-y border-ink-200">
          {plans.map(plan => {
            const active = plan.tier === user.tier || (user.tier === 'vip' && plan.tier === 'vip2');
            return (
              <div key={plan.name} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink-950">{plan.name}</h3>
                    {active && <span className="bg-lily-100 px-2 py-0.5 text-[10px] font-semibold text-lily-800">Đang dùng</span>}
                    {plan.pending && <span className="border border-ink-200 px-2 py-0.5 text-[10px] text-ink-500">Đang phát triển</span>}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-lily-800">{plan.price}</p>
                  <p className="mt-2 text-sm text-ink-800">{plan.limit}</p>
                  <p className="mt-1 text-xs text-ink-500">{plan.details.join(' · ')}</p>
                </div>
                {plan.tier && (
                  <button
                    type="button"
                    onClick={() => setUserTier(plan.tier!)}
                    disabled={active || !isDev}
                    className="h-10 border border-ink-300 px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-ink-950 hover:text-white disabled:border-lily-200 disabled:bg-lily-50 disabled:text-lily-800"
                  >
                    {active ? 'Gói hiện tại' : isDev ? 'Dùng thử gói' : 'Sắp mở bán'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
