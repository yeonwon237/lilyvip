import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Check, Cloud, Gift, LogOut, MessageCircle, RefreshCw, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LilyHubClient } from '../book-engine/lilyhub/LilyHubClient';
import type { UserTier } from '../types';
import { PRODUCT_PLANS, ProductPlan } from '../config/plans';
import { openTelegramPurchase } from '../utils/telegram';

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
    <div className="mx-auto max-w-4xl pb-24 pt-2">
      <header className="border-b border-ink-200 pb-6">
        <p className="text-xs font-semibold uppercase text-ink-500">Tài khoản & gói</p>
        <div className="mt-3 flex items-center gap-3">
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-lily-200 bg-lily-50 text-lily-800">
            <BookOpen className="h-5 w-5" strokeWidth={1.8} />
          </span>
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
        <div className="relative overflow-hidden rounded-2xl border border-lily-200 bg-gradient-to-br from-lily-50 via-white to-amber-50 p-5 shadow-soft">
          <div className="absolute inset-y-0 left-0 w-1 bg-lily-500" />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase text-lily-800">Gói hiện tại</p>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Đang sử dụng</span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-serif text-3xl font-bold text-ink-950">{currentPlan.name}</h2>
            <span className="text-sm font-semibold text-lily-800">{currentPlan.price}</span>
          </div>
          <p className="mt-3 text-sm text-ink-600">Lưu trên thiết bị · {currentPlan.total}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4 text-xs">
            <div><span className="block text-ink-500">Chu kỳ</span><strong className="mt-1 block text-ink-900">{currentTier === 'free' ? 'Không thời hạn' : 'Hằng năm'}</strong></div>
            <div><span className="block text-ink-500">Gia hạn</span><strong className="mt-1 block text-ink-900">{user.subscriptionAutoRenew ? 'Tự động' : 'Không tự động'}</strong></div>
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
            <p className="mt-1 text-xs text-ink-500">Chọn theo số truyện bạn muốn giữ trên thiết bị.</p>
          </div>
          <button type="button" onClick={refreshPlan} disabled={refreshing} className="inline-flex h-9 items-center gap-2 border border-ink-200 px-3 text-xs font-semibold text-ink-700 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Kiểm tra gói
          </button>
        </div>

        <div className="mt-4 flex items-start gap-3 border border-ink-200 bg-ink-50/60 p-4">
          <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
          <div><p className="text-xs font-semibold text-ink-800">Đồng bộ nhiều thiết bị đang được phát triển</p><p className="mt-1 text-[11px] leading-5 text-ink-500">MY CLOUD chưa thuộc các gói đang bán. MY30 và MY100 hiện dùng file sao lưu thủ công để chuyển thư viện.</p></div>
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
                  <p className="mt-1 text-xs text-ink-500">{plan.summary}</p>
                  <p className="mt-1 text-xs text-ink-500">{plan.benefits.join(' · ')}</p>
                </div>
                {plan.pending ? (
                  <span className="w-fit border border-ink-200 px-3 py-2 text-xs text-ink-500">Đang phát triển</span>
                ) : plan.tier === 'free' ? (
                  <span className="w-fit border border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-500">{active ? 'Đang dùng' : 'Gói mặc định'}</span>
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

        <div className="mt-5">
          <button type="button" onClick={() => setCouponOpen(value => !value)} className="inline-flex h-9 items-center gap-2 rounded-full border border-lily-200 bg-lily-50 px-3.5 text-xs font-semibold text-lily-800 hover:bg-lily-100" aria-expanded={couponOpen}>
            <Gift className="h-3.5 w-3.5" /> {couponOpen ? 'Đóng coupon' : 'Nhập coupon'}
          </button>
          {couponOpen && <form onSubmit={redeemCoupon} className="mt-3 max-w-xl rounded-xl border border-lily-200 bg-lily-50/50 p-3">
            <p className="text-[11px] text-ink-500">Coupon sẽ kích hoạt cho tài khoản LilyHub đang đăng nhập.</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="LILY-XXXX-XXXX-XXXX" autoComplete="off" autoFocus className="h-10 min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 font-mono text-xs uppercase outline-none focus:border-lily-400" />
              <button type="submit" disabled={!couponCode.trim() || redeemingCoupon} className="h-10 rounded-lg bg-lily-800 px-4 text-xs font-semibold text-white disabled:opacity-40">{redeemingCoupon ? 'Đang kiểm tra…' : 'Áp dụng'}</button>
            </div>
          </form>}
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
              <button type="button" onClick={() => contactTelegram(selectedPlan)} className="flex min-h-11 items-center justify-center gap-2 bg-ink-950 px-4 text-sm font-semibold text-white">
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
