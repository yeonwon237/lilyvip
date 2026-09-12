import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Cloud, Gift, LogOut, MessageCircle, RefreshCw, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LilyHubClient } from '../book-engine/lilyhub/LilyHubClient';
import type { UserTier } from '../types';
import { PRODUCT_PLANS, ProductPlan } from '../config/plans';
import { openTelegramPurchase } from '../utils/telegram';
import { UserAvatar } from '../components/common/UserAvatar';

type Plan = ProductPlan;
const plans = PRODUCT_PLANS.filter(plan => !plan.pending);

const normalizeTier = (tier: UserTier): UserTier => tier === 'vip' ? 'vip2' : tier === 'audio' ? 'free' : tier;

export const AccountPage: React.FC = () => {
  const {
    user, books, libraryLimits, lilyHubSlotsUsed, externalSlotsUsed, disconnectLilyHub,
    refreshLilyHubSession, navigateTo, showToast,
  } = useApp();
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [redeemingCoupon, setRedeemingCoupon] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
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
    if (plan.tier === 'vip1' || plan.tier === 'vip2') openTelegramPurchase(plan.tier);
  };

  const redeemCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!couponCode.trim() || redeemingCoupon) return;
    setRedeemingCoupon(true);
    try {
      const result = await LilyHubClient.redeemCoupon(couponCode);
      await refreshLilyHubSession();
      setCouponCode('');
      const label = result.tier === 'vip1' ? 'MY30' : 'MY100';
      showToast(`Đã kích hoạt ${label} trong ${result.durationDays} ngày.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Chưa thể sử dụng coupon.', 'error');
    } finally {
      setRedeemingCoupon(false);
    }
  };

  return (
    <div className="flat-page mx-auto max-w-5xl space-y-7 pb-24 pt-2">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar src={user.avatarUrl || user.avatar} className="h-14 w-14 ring-4 ring-lily-100" iconClassName="h-6 w-6" />
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">{user.isOwner ? 'Chủ sở hữu Lily' : 'Tài khoản'}</p><h1 className="truncate font-serif text-2xl font-bold text-ink-950">{user.lilyHubConnected ? user.name : 'Khách Lily'}</h1><p className="truncate text-xs text-ink-500">{user.lilyHubConnected ? user.email || 'Đã kết nối LilyHub' : 'Chưa kết nối LilyHub'}</p></div>
        </div>
        <div className="flex gap-2"><button type="button" onClick={refreshPlan} disabled={refreshing} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-ink-200 px-3 text-xs font-semibold text-ink-700 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Làm mới</button>{!user.lilyHubConnected && <button type="button" onClick={() => navigateTo('login')} className="primary-action min-h-9 rounded-xl px-4 text-xs font-semibold">Đăng nhập</button>}</div>
      </header>

      <section className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
        <article className="relative overflow-hidden rounded-3xl border border-lily-200 bg-gradient-to-br from-lily-50 via-white to-amber-50 p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-lily-800">Gói hiện tại</p><h2 className="mt-2 font-serif text-3xl font-bold text-ink-950">{currentPlan.name}</h2></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"><Check className="mr-1 inline h-3 w-3" />Đang dùng</span></div>
          <div className="mt-5 flex items-end justify-between border-t border-ink-100 pt-4"><div><p className="text-xs text-ink-500">Sức chứa</p><strong className="mt-1 block text-sm text-ink-900">{libraryLimits.total} truyện trên máy</strong></div><div className="text-right"><p className="text-xs text-ink-500">Gia hạn</p><strong className="mt-1 block text-sm text-ink-900">Không tự động</strong></div></div>
          {user.subscriptionEndsAt && <p className="mt-3 text-[11px] text-ink-500">Hết hạn {new Date(user.subscriptionEndsAt).toLocaleDateString('vi-VN')}</p>}
        </article>
        <article className="rounded-3xl border border-ink-200 bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">Thư viện</p><h2 className="mt-2 font-serif text-2xl font-bold text-ink-950">{books.length}<span className="text-base font-normal text-ink-400"> / {user.isOwner ? '∞' : libraryLimits.total}</span></h2></div><span className="rounded-full bg-lily-50 px-3 py-1.5 text-xs font-semibold text-lily-800">{user.isOwner ? 'Không giới hạn' : `${Math.max(0, libraryLimits.total - books.length)} chỗ trống`}</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-lily-600" style={{ width: `${user.isOwner ? 100 : Math.min(100, libraryLimits.total ? books.length / libraryLimits.total * 100 : 0)}%` }} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><span className="text-ink-500">LilyHub</span><strong className="ml-2 text-ink-900">{lilyHubSlotsUsed}/{user.isOwner ? '∞' : libraryLimits.lilyhub}</strong></div><div><span className="text-ink-500">File & web</span><strong className="ml-2 text-ink-900">{externalSlotsUsed}/{user.isOwner ? '∞' : libraryLimits.external}</strong></div></div></article>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500">Nâng cấp</p><h2 className="mt-1 font-serif text-2xl font-bold text-ink-950">Chọn sức chứa phù hợp</h2></div><span className="hidden text-xs text-ink-500 sm:block">Thanh toán một lần · Không tự gia hạn</span></div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {plans.map(plan => { const active = plan.tier === currentTier; return <article key={plan.name} className={`flex min-h-64 flex-col rounded-3xl border p-5 ${plan.recommended ? 'border-lily-300 bg-lily-50/40 shadow-card' : 'border-ink-200 bg-white shadow-soft'}`}>
            <div className="flex items-start justify-between gap-2"><div><h3 className="font-serif text-xl font-bold text-ink-950">{plan.name}</h3><p className="mt-1 text-xs font-semibold text-lily-800">{plan.price}</p></div>{plan.recommended && !active && <span className="rounded-full bg-lily-700 px-2 py-1 text-[9px] font-bold uppercase text-white">Phổ biến</span>}{active && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Hiện tại</span>}</div>
            <p className="mt-5 font-serif text-2xl font-bold text-ink-950">{plan.tier === 'free' ? '5' : plan.tier === 'vip1' ? '30' : '100'} <span className="text-sm font-normal text-ink-500">truyện</span></p>
            <ul className="mt-4 flex-1 space-y-2 text-xs text-ink-600">{plan.benefits.slice(0, 3).map(benefit => <li key={benefit} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" /><span>{benefit}</span></li>)}</ul>
            {plan.tier === 'free' ? <span className="mt-5 flex min-h-10 items-center justify-center rounded-xl border border-ink-200 text-xs font-semibold text-ink-500">{active ? 'Đang sử dụng' : 'Gói mặc định'}</span> : <button type="button" onClick={() => setSelectedPlan(plan)} disabled={active} className={`mt-5 min-h-10 rounded-xl px-4 text-xs font-semibold ${active ? 'bg-ink-100 text-ink-400' : plan.recommended ? 'primary-action' : 'border border-ink-300 text-ink-900'}`}>{active ? 'Đang sử dụng' : `Chọn ${plan.name}`}</button>}
          </article>; })}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-ink-50/60 px-4 py-3"><span className="flex items-center gap-2 text-xs text-ink-600"><Cloud className="h-4 w-4 text-ink-400" /><strong className="text-ink-800">MY CLOUD</strong> đang được phát triển</span>
          <button type="button" onClick={() => setCouponOpen(value => !value)} className="inline-flex h-9 items-center gap-2 rounded-full border border-lily-200 bg-lily-50 px-3.5 text-xs font-semibold text-lily-800 hover:bg-lily-100" aria-expanded={couponOpen}>
            <Gift className="h-3.5 w-3.5" /> {couponOpen ? 'Đóng' : 'Có coupon?'}
          </button>
        </div>
          {couponOpen && <form onSubmit={redeemCoupon} className="mt-3 max-w-xl rounded-xl border border-lily-200 bg-lily-50/50 p-3">
            <p className="text-[11px] text-ink-500">Coupon sẽ kích hoạt cho tài khoản LilyHub đang đăng nhập.</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="LILY-XXXX-XXXX-XXXX" autoComplete="off" autoFocus className="h-10 min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 font-mono text-xs uppercase outline-none focus:border-lily-400" />
              <button type="submit" disabled={!couponCode.trim() || redeemingCoupon} className="h-10 rounded-lg bg-lily-800 px-4 text-xs font-semibold text-white disabled:opacity-40">{redeemingCoupon ? 'Đang kiểm tra…' : 'Áp dụng'}</button>
            </div>
          </form>}
      </section>

      {user.lilyHubConnected && <button type="button" onClick={handleSignOut} disabled={signingOut} className="inline-flex items-center gap-2 text-xs font-semibold text-rose-700 disabled:opacity-50"><LogOut className="h-4 w-4" />{signingOut ? 'Đang đăng xuất' : 'Đăng xuất LilyHub'}</button>}

      {selectedPlan && createPortal(
        <div className="fixed inset-0 z-[120] flex items-end bg-ink-950/60 p-0 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="purchase-title">
          <section className="surface-solid max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-modal sm:max-w-md sm:border sm:border-ink-300 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-lily-700">Thanh toán qua Telegram</p>
                <h2 id="purchase-title" className="mt-1 font-serif text-2xl font-bold text-ink-950">{selectedPlan.name}</h2>
                <p className="mt-1 text-sm font-semibold text-lily-800">{selectedPlan.price}</p>
              </div>
              <button type="button" onClick={() => setSelectedPlan(null)} className="grid h-9 w-9 place-items-center text-ink-500 hover:bg-ink-50" aria-label="Đóng"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-5 border-y border-ink-200 py-4 text-sm leading-6 text-ink-700">
              <ol className="space-y-2">
                <li><strong>1.</strong> Bot xác nhận {selectedPlan.name}, giá và tài khoản LilyHub.</li>
                <li><strong>2.</strong> Bot tạo mã đơn và gửi thông tin chuyển khoản.</li>
                <li><strong>3.</strong> Quản trị viên kiểm tra giao dịch và kích hoạt gói. Thời gian xử lý phụ thuộc thời điểm xác nhận giao dịch.</li>
                <li><strong>4.</strong> Quay lại Lily Reader và bấm “Kiểm tra gói”.</li>
              </ol>
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
              <button type="button" onClick={() => contactTelegram(selectedPlan)} className="primary-action flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold">
                <MessageCircle className="h-4 w-4" /> Tiếp tục trên Telegram
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-ink-500">Gói không tự động gia hạn. Lily sẽ nhắc trong ứng dụng khi gần đến ngày hết hạn.</p>
            <button type="button" onClick={() => { setSelectedPlan(null); navigateTo('legal'); }} className="mt-2 w-full text-center text-xs font-medium text-ink-500 underline">Điều khoản, quyền riêng tư và hoàn tiền</button>
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
};
