import React, { useState } from 'react';
import { Check, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { UserTier } from '../types';

type Plan = { tier?: UserTier; name: string; price: string; total: string; benefits: string[]; pending?: boolean };

const plans: Plan[] = [
  { tier: 'free', name: 'Miễn phí', price: '0đ', total: '5 truyện', benefits: ['2 LilyHub', '3 file hoặc website'] },
  { tier: 'vip1', name: 'VIP 1', price: '149.000đ / năm', total: '30 truyện', benefits: ['Mọi nguồn', 'Đọc và nghe offline'] },
  { tier: 'vip2', name: 'VIP 2', price: '249.000đ / năm', total: '100 truyện', benefits: ['Mọi nguồn', 'Đọc và nghe offline'] },
  { name: 'SVIP', price: '349.000đ / năm', total: 'Không giới hạn', benefits: ['500 MB cloud', 'Nhiều thiết bị'], pending: true },
];

const normalizeTier = (tier: UserTier): UserTier => tier === 'vip' ? 'vip2' : tier === 'audio' ? 'free' : tier;

export const AccountPage: React.FC = () => {
  const {
    user, books, setUserTier, libraryLimits, lilyHubSlotsUsed, externalSlotsUsed, disconnectLilyHub,
  } = useApp();
  const [signingOut, setSigningOut] = useState(false);
  const isDev = import.meta.env.DEV;
  const currentTier = normalizeTier(user.tier);
  const currentPlan = plans.find(plan => plan.tier === currentTier) || plans[0];

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try { await disconnectLilyHub(); } finally { setSigningOut(false); }
  };

  return (
    <div className="mx-auto max-w-4xl pb-24 pt-2">
      <header className="border-b border-ink-200 pb-6">
        <p className="text-xs font-semibold uppercase text-ink-500">Tài khoản & gói</p>
        <div className="mt-3 flex items-center gap-3">
          <img src={user.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
          <div className="min-w-0">
            <h1 className="truncate font-serif text-xl font-bold text-ink-950">{user.name}</h1>
            <p className="truncate text-sm text-ink-500">{user.email || 'Tài khoản LilyHub'}</p>
          </div>
          <span className={`ml-auto border px-2 py-1 text-[10px] font-semibold ${user.lilyHubConnected ? 'border-emerald-200 text-emerald-700' : 'border-ink-200 text-ink-500'}`}>
            {user.lilyHubConnected ? 'Đã kết nối' : 'Chưa kết nối'}
          </span>
        </div>
      </header>

      <section className="grid gap-7 border-b border-ink-200 py-6 md:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-ink-500">Gói hiện tại</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-serif text-3xl font-bold text-ink-950">{currentPlan.name}</h2>
            <span className="text-sm font-semibold text-lily-800">{currentPlan.price}</span>
          </div>
          <p className="mt-3 text-sm text-ink-600">Lưu trên thiết bị · {currentPlan.total}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4 text-xs">
            <div><span className="block text-ink-500">Chu kỳ</span><strong className="mt-1 block text-ink-900">{currentTier === 'free' ? 'Không thời hạn' : 'Hằng năm'}</strong></div>
            <div><span className="block text-ink-500">Gia hạn</span><strong className="mt-1 block text-ink-900">{user.subscriptionAutoRenew ? 'Tự động' : 'Chưa bật'}</strong></div>
          </div>
          {user.subscriptionEndsAt && <p className="mt-3 text-xs text-ink-500">Dùng đến {new Date(user.subscriptionEndsAt).toLocaleDateString('vi-VN')}</p>}
        </div>

        <div className="space-y-5">
          <Quota label="Tổng thư viện" used={books.length} limit={libraryLimits.total} />
          <Quota label="LilyHub" used={lilyHubSlotsUsed} limit={libraryLimits.lilyhub} />
          <Quota label="File & website" used={externalSlotsUsed} limit={libraryLimits.external} />
        </div>
      </section>

      <section className="py-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink-950">Các gói Lily Reader</h2>
            <p className="mt-1 text-xs text-ink-500">Cloud chỉ dùng khi bạn chủ động bật.</p>
          </div>
          {isDev && <span className="text-[10px] font-semibold uppercase text-lily-700">Chế độ thử</span>}
        </div>

        <div className="mt-4 divide-y divide-ink-100 border-y border-ink-200">
          {plans.map(plan => {
            const active = plan.tier === currentTier;
            return (
              <div key={plan.name} className="grid gap-3 py-5 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink-950">{plan.name}</h3>
                    {active && <Check className="h-4 w-4 text-emerald-700" />}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-lily-800">{plan.price}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-800">{plan.total}</p>
                  <p className="mt-1 text-xs text-ink-500">{plan.benefits.join(' · ')}</p>
                </div>
                {plan.pending ? (
                  <span className="w-fit border border-ink-200 px-3 py-2 text-xs text-ink-500">Đang phát triển</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setUserTier(plan.tier!)}
                    disabled={active || !isDev}
                    className="h-10 min-w-28 border border-ink-300 px-4 text-xs font-semibold text-ink-900 hover:bg-ink-950 hover:text-white disabled:border-ink-100 disabled:bg-ink-50 disabled:text-ink-400"
                  >
                    {active ? 'Đang dùng' : isDev ? 'Dùng thử' : 'Chọn gói'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 border-t border-ink-200 py-6 sm:grid-cols-2">
        <div>
          <h2 className="font-serif text-lg font-bold text-ink-950">Thanh toán</h2>
          <p className="mt-2 text-sm text-ink-600">{currentTier === 'free' ? 'Bạn chưa có giao dịch.' : 'Hóa đơn sẽ xuất hiện khi cổng thanh toán được mở.'}</p>
        </div>
        <div className="sm:border-l sm:border-ink-200 sm:pl-6">
          <h2 className="font-serif text-lg font-bold text-ink-950">Tài khoản LilyHub</h2>
          <p className="mt-2 text-sm text-ink-600">{user.lilyHubConnected ? 'Dùng chung tài khoản với LilyHub.' : 'Đăng nhập để nhận đúng quyền lợi.'}</p>
          {user.lilyHubConnected && (
            <button type="button" onClick={handleSignOut} disabled={signingOut} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-rose-700 disabled:opacity-50">
              <LogOut className="h-4 w-4" /> {signingOut ? 'Đang đăng xuất' : 'Đăng xuất'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

const Quota: React.FC<{ label: string; used: number; limit: number }> = ({ label, used, limit }) => (
  <div>
    <div className="flex items-center justify-between text-xs">
      <span className="font-medium text-ink-700">{label}</span>
      <span className="text-ink-500">{used}/{limit}</span>
    </div>
    <div className="mt-2 h-1.5 overflow-hidden bg-ink-100">
      <div className="h-full bg-lily-600 transition-[width]" style={{ width: `${Math.min(100, limit ? used / limit * 100 : 0)}%` }} />
    </div>
  </div>
);
