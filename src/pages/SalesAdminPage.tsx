import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatSalesPrice, isSalesLocalPreview, loadSalesConfig, saveSalesConfig, SALES_PLAN_KEYS, type SalesConfig, type SalesPlanKey } from '../services/salesConfig';

export const SalesAdminPage: React.FC = () => {
  const { user, navigateTo, showToast } = useApp();
  const [config, setConfig] = useState<SalesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user.isOwner) return;
    let active = true;
    loadSalesConfig().then(value => { if (active) setConfig(value); }).catch(reason => { if (active) setError(reason.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.isOwner]);
  if (!user.isOwner) return <div className="mx-auto max-w-xl rounded-2xl border border-ink-200 bg-white p-6"><h1 className="font-serif text-2xl font-bold">Chỉ tài khoản quản trị mới được xem trang này.</h1><button className="mt-4 text-lily-700 underline" onClick={() => navigateTo('account')}>Về tài khoản</button></div>;
  const updatePlan = (key: SalesPlanKey, patch: Partial<SalesConfig['plans'][SalesPlanKey]>) => setConfig(previous => previous ? ({ ...previous, plans: { ...previous.plans, [key]: { ...previous.plans[key], ...patch } } }) : previous);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!config || saving) return;
    setSaving(true); setError('');
    try { const saved = await saveSalesConfig(config); setConfig(saved); showToast(isSalesLocalPreview() ? 'Đã lưu bản xem thử trên trình duyệt này.' : 'Đã lưu giá gói và nội dung bot.', 'success'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được cấu hình.'); }
    finally { setSaving(false); }
  };
  return <div className="mx-auto max-w-4xl space-y-6 pb-24 pt-2">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-lily-700">Quản trị Lilyhub</p><h1 className="mt-1 font-serif text-3xl font-bold text-ink-950">Gói bán & bot Telegram</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">Giá đã lưu được dùng trên trang Tài khoản và khi bot tạo đơn mới. Đơn đã tạo giữ nguyên giá tại thời điểm đặt.</p></div><button type="button" className="rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm" onClick={() => navigateTo('account')}>Về tài khoản</button></header>
    {loading && <p>Đang tải cấu hình…</p>}
    {!loading && config && isSalesLocalPreview() && <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">Bản xem thử trên localhost. Thay đổi chỉ lưu trong trình duyệt này, chưa áp dụng cho bot Telegram hoặc khách hàng.</p>}
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {config && <form onSubmit={save} className="space-y-6">
      <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft"><h2 className="font-serif text-xl font-bold">Giá và tên từng kỳ hạn</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{SALES_PLAN_KEYS.map(key => <div key={key} className="rounded-xl border border-ink-100 bg-ink-50/50 p-4"><p className="text-xs font-semibold text-lily-700">{key.startsWith('my01') ? 'MY01' : 'MY02'} · {key.endsWith('_12') ? '1 năm' : `${key.split('_')[1]} tháng`}</p><label className="mt-3 block text-xs font-semibold text-ink-700">Tên hiển thị<input className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm" required maxLength={80} value={config.plans[key].label} onChange={event => updatePlan(key, { label: event.target.value })} /></label><label className="mt-3 block text-xs font-semibold text-ink-700">Giá (VNĐ)<input className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm" type="number" min={1000} max={100000000} step={1000} required value={config.plans[key].priceVnd} onChange={event => updatePlan(key, { priceVnd: Number(event.target.value) })} /></label><p className="mt-2 text-sm text-ink-500">Khách thấy: {formatSalesPrice(config.plans[key].priceVnd || 0)}</p></div>)}</div></section>
      <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft"><h2 className="font-serif text-xl font-bold">Lời chào của bot</h2><p className="mt-1 text-sm text-ink-500">Bot gửi lời chào này khi khách bấm /start. Các nút chọn gói dùng tên và giá ở trên.</p><textarea className="mt-4 min-h-52 w-full rounded-xl border border-ink-200 bg-white p-3 text-sm leading-6" required minLength={10} maxLength={2000} value={config.intro} onChange={event => setConfig({ ...config, intro: event.target.value })} /><p className="mt-2 text-xs text-ink-500">Sau khi triển khai API và bot, lời chào và các nút gói sẽ dùng nội dung đã lưu trên máy chủ.</p></section>
      <section className="rounded-2xl border border-ink-200 bg-white p-5 shadow-soft"><h2 className="font-serif text-xl font-bold">Lời nhắn trong quy trình mua</h2><p className="mt-1 text-sm text-ink-500">Thông tin ngân hàng, mã đơn và số tiền vẫn được bot tạo tự động.</p><label className="mt-4 block text-sm font-semibold">Nhắc khi gửi hướng dẫn thanh toán<textarea className="mt-2 min-h-24 w-full rounded-xl border border-ink-200 bg-white p-3 text-sm font-normal" required maxLength={1000} value={config.paymentNote} onChange={event => setConfig({ ...config, paymentNote: event.target.value })} /></label><label className="mt-4 block text-sm font-semibold">Lời nhắn sau khi kích hoạt<textarea className="mt-2 min-h-24 w-full rounded-xl border border-ink-200 bg-white p-3 text-sm font-normal" required maxLength={1000} value={config.successNote} onChange={event => setConfig({ ...config, successNote: event.target.value })} /></label></section>
      <button type="submit" disabled={saving} className="primary-action min-h-11 rounded-xl px-6 text-sm font-semibold disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
    </form>}
  </div>;
};
