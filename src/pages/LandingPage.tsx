import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { t } from '../i18n';
import React from 'react';
import { Languages, ArrowRight, BookOpen, Check, FileText, Globe2, Headphones, Library, WifiOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PRODUCT_PLANS } from '../config/plans';
import { openTelegramPurchase } from '../utils/telegram';

export const LandingPage: React.FC = () => {
  const { navigateTo, openUpgradeModal } = useApp();
  const buyOnTelegram = (tier?: string) => {
    if (tier !== 'vip1' && tier !== 'vip2') return openUpgradeModal(t("Chọn gói Lilyhub"));
    openTelegramPurchase(tier);
  };
  const availablePlans = PRODUCT_PLANS.filter(plan => !plan.pending);
  return (
    <div className="landing-page lily-welcome min-h-screen bg-white text-ink-900">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 px-5 py-4 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <button type="button" onClick={() => navigateTo('landing')} aria-label={t("Trang giới thiệu Lilyhub")} className="shrink-0"><span className="lily-wordmark">LILYHUB</span></button>
          <LanguageSwitcher /><nav className="hidden items-center gap-7 text-xs text-ink-600 md:flex"><button type="button" onClick={() => navigateTo('about')}>{t("Về chúng tôi")}</button><a href="#bang-gia">{t("Gói thành viên")}</a><a href="https://t.me/+Y8M62X2kWBIxODg9" target="_blank" rel="noreferrer">{t("Cộng đồng Lily")}</a><button type="button" onClick={() => navigateTo('legal')}>{t("Quyền riêng tư")}</button></nav>
          <div className="flex items-center gap-2"><button type="button" onClick={() => navigateTo('login')} className="rounded-xl px-3 py-2 text-xs font-semibold hover:bg-white">{t("Đăng nhập")}</button><button type="button" onClick={() => navigateTo('dashboard')} className="rounded-xl bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white shadow-soft">{t("Mở thư viện")}</button></div>
        </div>
      </header>

      <main>
        <section className="welcome-hero">
          <div className="welcome-intro"><h1>{t("Thư viện riêng cho người mê đọc.")}</h1><p>{t("Gom sách, truyện từ nhiều nguồn về một nơi. Đọc ngoại tuyến, nghe sách nói và dịch truyện Trung–Việt.")}</p><div className="welcome-actions"><button onClick={() => navigateTo('dashboard')}>{t("Mở thư viện ")}<ArrowRight size={17}/></button></div><small>{t("Miễn phí 10 truyện · Bắt đầu không cần tài khoản")}</small></div>
          <div className="welcome-shelf" aria-label={t("Bìa truyện minh họa từ bộ bìa Lily")}>{[1,4,9].map((n,i)=><div key={n} className={`welcome-book welcome-book-${i}`}><img src={`/default-covers/lily-cover-${String(n).padStart(2,'0')}.jpg`} alt=""/><span>{[t("Đọc truyện"),t("Sách nói"),t("Thư viện")][i]}</span></div>)}</div>
        </section>
        <div className="welcome-source-strip"><span><Library size={17}/> LilyHub</span><span><FileText size={17}/> TXT · EPUB · DOCX</span><span><Globe2 size={17}/> {t(" Website hỗ trợ")}</span><span><Languages size={17}/> {t(" Dịch truyện")}</span><span><WifiOff size={17}/> {t(" Đọc ngoại tuyến")}</span></div>

        <section id="cach-dung" className="welcome-how">
          <div className="welcome-section-title"><h2>{t("Đọc, nghe và quản lý truyện")}</h2></div>
          <div className="welcome-steps">
            <div><Library size={24}/><h3>{t("Thêm truyện")}</h3><p>{t("Chọn từ LilyHub, file hoặc website hỗ trợ.")}</p></div>
            <div><BookOpen size={24}/><h3>{t("Đọc truyện")}</h3><p>{t("Chỉnh chữ, đánh dấu và lưu tiến độ.")}</p></div>
            <div><Headphones size={24}/><h3>{t("Sách nói")}</h3><p>{t("Tải giọng về máy để nghe ngoại tuyến.")}</p></div>
            <div><Languages size={24}/><h3>{t("Dịch truyện")}</h3><p>{t("Dịch chương hiện tại hoặc dịch trước với mô hình trên máy hay Gemini.")}</p></div>
          </div>
          <p className="welcome-translation-note">{t("Dịch truyện: tùy mô hình cần quyền sử dụng, mã kích hoạt hoặc API key riêng.")}</p>
        </section>

        <section id="bang-gia" className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-col justify-between gap-4 border-b border-ink-300 pb-5 sm:flex-row sm:items-end"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">{t("Gói thành viên")}</p><h2 className="mt-3 font-serif text-2xl font-bold text-ink-950 sm:text-[1.75rem]">{t("Gói sử dụng")}</h2></div><p className="max-w-sm text-xs leading-5 text-ink-500">{t("Lưu trên thiết bị · Không tự gia hạn.")}</p></div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {availablePlans.map(plan => (
              <article key={plan.name} className={`flex flex-col rounded-3xl border bg-white p-5 shadow-soft ${plan.recommended ? 'border-lily-300 ring-1 ring-lily-200' : 'border-ink-200'}`}>
                <div><h3 className="font-serif text-base font-bold text-ink-950">{plan.name}</h3>{plan.recommended && <span className="mt-1 block text-[11px] font-bold uppercase tracking-wide text-lily-800">{t("Phù hợp số đông")}</span>}</div>
                <div className="mt-3"><p className="font-serif text-lg font-bold text-lily-900">{plan.price}</p><p className={`mt-1 ${plan.tier !== 'free' ? 'text-xs font-normal text-ink-400' : 'text-xs font-semibold text-ink-700'}`}>{plan.total}</p></div>
                <div className="flex-1"><ul className="mt-4 space-y-2 text-xs text-ink-600">{plan.benefits.slice(0, 3).map(benefit => <li key={t(benefit)} className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-700" />{t(benefit)}</li>)}</ul></div>
                {plan.pending ? <span className="mt-5 text-xs font-semibold text-ink-400">{t("Đang phát triển")}</span> : <button type="button" onClick={() => plan.tier === 'free' ? navigateTo('dashboard') : buyOnTelegram(plan.tier)} className={`mt-5 min-h-10 rounded-xl px-4 text-xs font-semibold ${plan.recommended ? 'bg-ink-950 text-white' : 'border border-ink-300 bg-white'}`}>{plan.tier === 'free' ? t("Dùng miễn phí") : t("Chọn {0}", [plan.name])}</button>}

              </article>
            ))}
          </div>
          <p className="welcome-plan-note">{t("Thanh toán và kích hoạt qua Telegram. ")}<button onClick={() => navigateTo('legal')}>{t("Điều khoản & hoàn tiền ")}<ArrowRight size={12}/></button></p>

        </section>

        <section className="border-t border-ink-100 bg-white/60 px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-10">
            <div><h2>{t("Câu hỏi thường gặp")}</h2></div>
            <div className="divide-y divide-ink-200 border-y border-ink-200">
              <Faq question={t("Tôi có cần đăng nhập để dùng thử không?")}>{t("Không. Bạn có thể mở thư viện và thêm truyện trên thiết bị trước. Tài khoản LilyHub cần thiết khi lấy truyện từ LilyHub hoặc kích hoạt gói đã mua.")}</Faq>
              <Faq question={t("Nội dung truyện được lưu ở đâu?")}>{t("Truyện, tiến độ, ghi chú và đánh dấu được lưu trong trình duyệt trên thiết bị. Lily không tự đồng bộ lên Cloud.")}</Faq>
              <Faq question={t("Xóa dữ liệu trình duyệt có làm mất truyện không?")}>{t("Có thể. MY50 và MY100 có chức năng tạo file sao lưu thủ công; hãy lưu file này trước khi đổi máy hoặc xóa dữ liệu trình duyệt.")}</Faq>
              <Faq question={t("Vì sao có website không nhập được?")}>{t("Website phải công khai và có cấu trúc Lily hỗ trợ. Lily không vượt đăng nhập, CAPTCHA, paywall hoặc biện pháp bảo vệ truy cập.")}</Faq>
              <Faq question={t("Lily có dịch truyện không?")}>{t("Có. Bạn có thể dịch chương đang đọc hoặc dịch trước các chương tiếp theo. Lily hỗ trợ mô hình chạy trên máy và Gemini. Tùy mô hình, bạn cần quyền sử dụng hoặc mã kích hoạt; Gemini cần API key riêng. Quyền dịch không mặc định đi kèm mọi gói.")}</Faq>
              <Faq question={t("Giọng Lily có nghe ngoại tuyến được không?")}>{t("Có. Sau khi tải giọng và tài nguyên cần thiết về thiết bị, bạn có thể nghe nội dung đã lưu mà không cần mạng.")}</Faq>
              <Faq question={t("Gói được mua và kích hoạt như thế nào?")}>{t("Bot Telegram xác nhận tài khoản, tạo mã đơn và hướng dẫn thanh toán. Quản trị viên kích hoạt gói sau khi kiểm tra giao dịch; thời gian xử lý phụ thuộc thời điểm giao dịch được xác nhận.")}</Faq>
              <Faq question={t("Gói có tự động gia hạn không?")}>{t("Không. Khi gần hết hạn, Lilyhub sẽ nhắc trong ứng dụng và bạn chủ động quyết định có gia hạn hay không.")}</Faq>
              <Faq question={t("Khi nào tôi được hoàn tiền?")}>{t("Nếu Lilyhub ngừng hoạt động lâu dài hoặc có sự cố từ phía Lily khiến bạn không thể tiếp tục dùng quyền lợi đã mua, Lily sẽ xem xét hoàn phần thời gian còn lại chưa sử dụng sau khi trừ thời gian gói đã hoạt động.")}</Faq>
            </div>
          </div>
        </section>

        <section className="welcome-final"><h2>{t("Thêm truyện vào thư viện")}</h2><button type="button" onClick={() => navigateTo('dashboard')}>{t("Mở thư viện miễn phí ")}<ArrowRight size={17}/></button></section>

      </main>

      <footer className="border-t border-ink-200 bg-cream-50 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-xs text-ink-600 sm:px-8 sm:pb-7">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-2.5 pt-5 sm:flex-row sm:items-center sm:gap-4"><p><strong className="font-serif text-ink-950">Lilyhub</strong> · © 2026</p><div className="flex flex-wrap gap-x-4 gap-y-1.5"><button type="button" onClick={() => navigateTo('about')}>{t("Về chúng tôi")}</button><button type="button" onClick={() => navigateTo('legal')} className="hover:text-ink-950">{t("Điều khoản & quyền riêng tư")}</button><a href="https://t.me/+Y8M62X2kWBIxODg9" target="_blank" rel="noreferrer" className="hover:text-ink-950">{t("Cộng đồng Lily")}</a><a href="https://t.me/noooo4518" target="_blank" rel="noreferrer" className="hover:text-ink-950">{t("Trợ giúp")}</a></div></div>
        </div>
      </footer>

    </div>
  );
};

const Faq: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => <details className="welcome-faq-item group py-3.5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13px] font-semibold text-ink-900"><span>{question}</span><span className="text-lg font-normal text-lily-700 transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary><p className="max-w-2xl pt-3 text-xs leading-5 text-ink-600">{children}</p></details>;
