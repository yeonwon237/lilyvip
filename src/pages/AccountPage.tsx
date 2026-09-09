import React, { useState } from 'react';
import { Check, LogOut, MessageCircle, RefreshCw, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LilyHubClient } from '../book-engine/lilyhub/LilyHubClient';
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
    user, books, libraryLimits, lilyHubSlotsUsed, externalSlotsUsed, disconnectLilyHub,
    refreshLilyHubSession, navigateTo, showToast,
  } = useApp();
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const currentTier = normalizeTier(user.tier);
  const currentPlan = plans.find(plan => plan.tier === currentTier) || plans[0];

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await disconnectLilyHub();
    } catch {
      showToast('Chưa thể đăng xuất. Hãy thử lại.', 'error');
    } finally {
      setSigningOut(false);
    }
  };

  const refreshPlan = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const connected = await refreshLilyHubSession();
    setRefreshing(false);
    showToast(connected ? 'Đã cập nhật gói từ LilyHub.' : 'Hãy đăng nhập LilyHub để kiểm tra gói.', connected ? 'success' : 'warning');
  };

  const contactTelegram = (plan: Plan) => {
    const message = `Chào Lily, mình muốn đăng ký ${plan.name} (${plan.price}).`;
    window.open(`https://t.me/noooo4518?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mx-auto max-w-4xl pb-24 pt-2">
      <header className="border-b border-ink-200 pb-6">
        <p className="text-xs font-semibold uppercase text-ink-500">Tài khoản & gói</p>
        <div className="mt-3 flex items-center gap-3">
          {user.avatar && !avatarFailed ? (
            <img src={user.avatar} alt="" onError={() => setAvatarFailed(true)} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lily-100 font-serif text-lg font-bold uppercase text-lily-800">
              {(user.name || 'L').trim().charAt(0)}
            </span>
          )}
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
          <button type="button" onClick={refreshPlan} disabled={refreshing} className="inline-flex h-9 items-center gap-2 border border-ink-200 px-3 text-xs font-semibold text-ink-700 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Kiểm tra gói
          </button>
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
                    onClick={() => setSelectedPlan(plan)}
                    disabled={active}
                    className="h-10 min-w-28 border border-ink-300 px-4 text-xs font-semibold text-ink-900 hover:bg-ink-950 hover:text-white disabled:border-ink-100 disabled:bg-ink-50 disabled:text-ink-400"
                  >
                    {active ? 'Đang dùng' : 'Mua gói'}
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

      {selectedPlan && (
        <div className="fixed inset-0 z-[90] flex items-end bg-ink-950/45 p-0 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="purchase-title">
          <section className="w-full bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-modal sm:max-w-md sm:border sm:border-ink-200 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-lily-700">Đăng ký thủ công</p>
                <h2 id="purchase-title" className="mt-1 font-serif text-2xl font-bold text-ink-950">{selectedPlan.name}</h2>
                <p className="mt-1 text-sm font-semibold text-lily-800">{selectedPlan.price}</p>
              </div>
              <button type="button" onClick={() => setSelectedPlan(null)} className="grid h-9 w-9 place-items-center text-ink-500 hover:bg-ink-50" aria-label="Đóng"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-5 border-y border-ink-200 py-4 text-sm leading-6 text-ink-700">
              <p>Hiện Lily xác nhận thanh toán và kích hoạt VIP trực tiếp qua Telegram.</p>
              {!user.lilyHubConnected && <p className="mt-2 font-medium text-ink-950">Bạn cần một tài khoản LilyHub. Tài khoản này dùng chung cho LilyHub và Lily Reader.</p>}
            </div>

            <div className="mt-5 grid gap-3">
              {!user.lilyHubConnected && (
                <a href={LilyHubClient.registerUrl()} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center border border-ink-300 px-4 text-sm font-semibold text-ink-900">
                  Tạo tài khoản LilyHub
                </a>
              )}
              {!user.lilyHubConnected && (
                <button type="button" onClick={() => { setSelectedPlan(null); navigateTo('login'); }} className="min-h-11 border border-ink-200 px-4 text-sm font-semibold text-ink-700">
                  Tôi đã có tài khoản
                </button>
              )}
              <button type="button" onClick={() => contactTelegram(selectedPlan)} className="flex min-h-11 items-center justify-center gap-2 bg-ink-950 px-4 text-sm font-semibold text-white">
                <MessageCircle className="h-4 w-4" /> Liên hệ Telegram
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-ink-500">Sau khi được kích hoạt, quay lại và bấm “Kiểm tra gói”.</p>
          </section>
        </div>
      )}
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
