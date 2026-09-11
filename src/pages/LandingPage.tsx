import React from 'react';
import { ArrowRight, BookOpen, Check, Headphones, Library, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PRODUCT_PLANS } from '../config/plans';

export const LandingPage: React.FC = () => {
  const { navigateTo, openUpgradeModal } = useApp();
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-ink-900">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-[#FAF8F5]/90 px-5 py-4 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <button type="button" onClick={() => navigateTo('landing')} aria-label="Trang giới thiệu LilyVIP" className="shrink-0"><img src="/lilyhub-logo.png" alt="LilyHub" className="block h-auto max-w-none" style={{ width: 132 }} /></button>
          <nav className="hidden items-center gap-7 text-xs text-ink-600 md:flex"><a href="#cach-dung">Cách dùng</a><a href="#bang-gia">Bảng giá</a><button type="button" onClick={() => navigateTo('legal')}>Pháp lý</button></nav>
          <div className="flex items-center gap-2"><button type="button" onClick={() => navigateTo('login')} className="rounded-xl px-3 py-2 text-xs font-semibold hover:bg-white">Đăng nhập</button><button type="button" onClick={() => navigateTo('dashboard')} className="rounded-xl bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white shadow-soft">Mở thư viện</button></div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-5 pb-20 pt-16 text-center sm:px-8 sm:pb-24 sm:pt-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-lily-200 bg-lily-50 px-3.5 py-1.5 text-xs font-medium text-lily-900"><BookOpen className="h-3.5 w-3.5" />Thư viện đọc cá nhân của bạn</div>
          <h1 className="mx-auto mt-6 max-w-3xl font-serif text-4xl font-bold leading-[1.08] text-ink-950 sm:text-6xl">Gom truyện về một nơi.<br />Đọc theo ý bạn.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-ink-600 sm:text-base">Nhập truyện từ LilyHub, file hoặc website được hỗ trợ. Lily kiểm tra mục lục trước khi lưu để bạn đọc, nghe và ghi chú ngay trên thiết bị.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => navigateTo('dashboard')} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-ink-950 px-6 text-sm font-semibold text-white shadow-card">Bắt đầu miễn phí <ArrowRight className="h-4 w-4" /></button><a href="#bang-gia" className="inline-flex min-h-11 items-center rounded-2xl border border-ink-200 bg-white px-6 text-sm font-semibold shadow-soft">Xem bảng giá</a></div>

          <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-ink-200/80 bg-white p-4 text-left shadow-float sm:p-6">
            <div className="flex items-center justify-between border-b border-ink-100 pb-4"><div><p className="font-serif text-lg font-bold text-ink-950">Thêm truyện vào Lily</p><p className="mt-1 text-xs text-ink-500">Chọn cách bạn đang có truyện</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Lưu trên thiết bị</span></div>
            <div className="grid gap-3 py-6 sm:grid-cols-3"><SourcePreview icon={<Library />} title="LilyHub" text="Chọn từ thư viện" /><SourcePreview icon={<BookOpen />} title="Từ thiết bị" text="TXT, EPUB, DOCX" /><SourcePreview icon={<ArrowRight />} title="Từ website" text="Dán liên kết công khai" /></div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-ink-100 pt-4 text-xs text-ink-500"><span>✓ Kiểm tra tên truyện</span><span>✓ Sắp xếp chương</span><span>✓ Báo chương thiếu</span></div>
          </div>
        </section>

        <section id="cach-dung" className="border-y border-ink-100 bg-white/60 px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Cách dùng</p><h2 className="mt-3 font-serif text-3xl font-bold text-ink-950">Không cần chuyển đổi file thủ công</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <Feature icon={<Library />} title="1. Chọn nguồn">Lấy truyện từ LilyHub, thiết bị hoặc dán một liên kết công khai.</Feature>
              <Feature icon={<BookOpen />} title="2. Kiểm tra trước">Xem tên truyện, tác giả, số chương và cảnh báo trước khi nhập.</Feature>
              <Feature icon={<Headphones />} title="3. Đọc hoặc nghe">Đọc ngoại tuyến, dùng Giọng Lily, đánh dấu và viết ghi chú.</Feature>
            </div>
          </div>
        </section>

        <section id="bang-gia" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="flex flex-col justify-between gap-4 border-b border-ink-300 pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Bảng giá</p><h2 className="mt-3 font-serif text-3xl font-bold text-ink-950">Chọn theo số truyện cần lưu</h2></div><p className="max-w-sm text-xs leading-5 text-ink-500">Truyện được lưu trên thiết bị. Những tính năng ghi “Đang phát triển” chưa nằm trong gói hiện hành.</p></div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCT_PLANS.map(plan => (
              <article key={plan.name} className={`flex flex-col rounded-3xl border bg-white p-5 shadow-soft ${plan.recommended ? 'border-lily-300 ring-1 ring-lily-200' : 'border-ink-200'}`}>
                <div><h3 className="font-serif text-lg font-bold text-ink-950">{plan.name}</h3>{plan.recommended && <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-lily-800">Phù hợp số đông</span>}</div>
                <div className="mt-4"><p className="font-serif text-lg font-bold text-lily-900">{plan.price}</p><p className="mt-1 text-xs font-semibold text-ink-700">{plan.total}</p></div>
                <div className="flex-1"><p className="mt-4 text-xs leading-5 text-ink-500">{plan.summary}</p><ul className="mt-4 space-y-2 text-[11px] text-ink-600">{plan.benefits.map(benefit => <li key={benefit} className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-700" />{benefit}</li>)}</ul></div>
                {plan.pending ? <span className="mt-6 text-xs font-semibold text-ink-400">Đang phát triển</span> : <button type="button" onClick={() => plan.tier === 'free' ? navigateTo('dashboard') : openUpgradeModal(`Nâng cấp ${plan.name}`)} className={`mt-6 min-h-10 rounded-xl px-4 text-xs font-semibold ${plan.recommended ? 'bg-ink-950 text-white' : 'border border-ink-300 bg-white'}`}>{plan.tier === 'free' ? 'Dùng miễn phí' : `Chọn ${plan.name}`}</button>}
              </article>
            ))}
          </div>
          <p className="mt-5 text-center text-xs text-ink-500">Sao lưu và khôi phục thư viện là quyền lợi của thành viên VIP 1 và VIP 2.</p>
        </section>

        <section className="border-t border-ink-200 bg-[#F3EFE8] px-5 py-12 sm:px-8"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" /><div><h2 className="font-serif text-xl font-bold">Dữ liệu đọc thuộc về bạn</h2><p className="mt-1 max-w-xl text-xs leading-5 text-ink-600">Thư viện, tiến độ, ghi chú và đánh dấu được lưu trên thiết bị, trừ khi sau này bạn chủ động bật một tính năng đồng bộ.</p></div></div><button type="button" onClick={() => navigateTo('legal')} className="shrink-0 text-left text-xs font-semibold underline">Đọc chính sách dữ liệu</button></div></section>
      </main>

      <footer className="border-t border-ink-200 px-5 py-7 text-xs text-ink-500 sm:px-8"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 sm:flex-row sm:items-center"><p><strong className="font-serif text-ink-900">my.lilyhub.top</strong> · Một sản phẩm của LilyHub</p><div className="flex flex-wrap gap-4"><button type="button" onClick={() => navigateTo('legal')}>Pháp lý & quyền riêng tư</button><a href="https://t.me/noooo4518" target="_blank" rel="noreferrer">Hỗ trợ</a><span>© 2026 LilyHub VIP</span></div></div></footer>
    </div>
  );
};

const SourcePreview: React.FC<{ icon: React.ReactElement; title: string; text: string }> = ({ icon, title, text }) => <div className="rounded-2xl border border-ink-100 bg-[#FAF9F7] px-4 py-4"><span className="text-lily-700 [&>svg]:h-4 [&>svg]:w-4">{icon}</span><strong className="mt-3 block font-serif text-sm text-ink-950">{title}</strong><span className="mt-1 block text-[11px] text-ink-500">{text}</span></div>;
const Feature: React.FC<{ icon: React.ReactElement; title: string; children: React.ReactNode }> = ({ icon, title, children }) => <article className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft"><span className="text-lily-700 [&>svg]:h-5 [&>svg]:w-5">{icon}</span><h3 className="mt-5 font-serif text-lg font-bold">{title}</h3><p className="mt-2 text-xs leading-5 text-ink-600">{children}</p></article>;
