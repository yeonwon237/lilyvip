import React from 'react';
import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { LEGAL_RETURN_STORAGE_KEY, PageRoute, useApp } from '../context/AppContext';

export const LegalPage: React.FC = () => {
  const { navigateTo } = useApp();
  const goBack = () => {
    const saved = sessionStorage.getItem(LEGAL_RETURN_STORAGE_KEY) as PageRoute | null;
    sessionStorage.removeItem(LEGAL_RETURN_STORAGE_KEY);
    navigateTo(saved && saved !== 'legal' ? saved : 'landing');
  };
  return (
    <main className="min-h-screen bg-[#FAF8F5] px-4 py-8 text-ink-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={goBack} className="inline-flex items-center gap-2 text-xs font-semibold text-ink-600 hover:text-ink-950">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>
        <header className="mt-8 border-b border-ink-200 pb-8">
          <div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-emerald-700" /><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Pháp lý & tin cậy</p></div>
          <h1 className="mt-3 font-serif text-3xl font-bold text-ink-950 sm:text-4xl">Thông tin sử dụng Lily Reader</h1>
          <p className="mt-3 text-sm leading-6 text-ink-600">Cập nhật ngày 11/09/2026. Bản này áp dụng cho Lily Reader tại my.lilyhub.top.</p>
          <nav className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
            {['Điều khoản', 'Quyền riêng tư', 'Gói dịch vụ', 'Hỗ trợ'].map(label => <a key={label} href={`#${label.toLowerCase().replace(/\s/g, '-')}`} className="rounded-full border border-ink-200 bg-white px-3 py-2 hover:border-ink-400">{label}</a>)}
          </nav>
        </header>

        <div className="space-y-12 py-10 text-sm leading-7 text-ink-700">
          <section id="điều-khoản">
            <h2 className="font-serif text-2xl font-bold text-ink-950">Điều khoản sử dụng</h2>
            <div className="mt-4 space-y-3">
              <p>Lily Reader là công cụ giúp bạn nhập, tổ chức, đọc và nghe nội dung mà bạn có quyền truy cập. Bạn chịu trách nhiệm bảo đảm việc nhập và sử dụng nội dung phù hợp với quyền của mình và quy định của nguồn cung cấp.</p>
              <p>Không sử dụng Lily Reader để vượt qua đăng nhập, tường phí, biện pháp bảo vệ truy cập hoặc để phân phối lại nội dung trái phép. Lily có thể từ chối nhập một nguồn khi không thể xác minh nội dung công khai và đầy đủ.</p>
              <p>Website bên thứ ba có thể thay đổi cấu trúc hoặc ngừng hoạt động. Lily cố gắng phát hiện lỗi và tránh lưu truyện thiếu, nhưng không thể cam kết mọi nguồn luôn khả dụng.</p>
            </div>
          </section>

          <section id="quyền-riêng-tư">
            <h2 className="font-serif text-2xl font-bold text-ink-950">Chính sách quyền riêng tư</h2>
            <div className="mt-4 space-y-3">
              <p>Thư viện, nội dung truyện đã nhập, tiến độ đọc, ghi chú và đánh dấu được lưu cục bộ trong trình duyệt trên thiết bị của bạn, trừ khi một tính năng đồng bộ được giới thiệu và bạn chủ động bật.</p>
              <p>Khi kết nối LilyHub, Lily Reader gửi thông tin đăng nhập tới dịch vụ xác thực LilyHub và nhận thông tin tài khoản, gói đang dùng cùng thời hạn gói. Lily Reader không lưu mật khẩu trong thư viện cục bộ.</p>
              <p>Khi nhập từ website, địa chỉ công khai có thể được gửi qua máy chủ trung gian của Lily để tải nội dung. Lily không chủ động gửi truyện đã lưu, ghi chú, đoạn đánh dấu hoặc lịch sử tìm kiếm khi bạn liên hệ hỗ trợ.</p>
              <p>Bạn có thể xóa từng truyện, đăng xuất LilyHub hoặc xóa dữ liệu trang web trong cài đặt trình duyệt. Xóa dữ liệu trình duyệt có thể làm mất thư viện chưa sao lưu.</p>
            </div>
          </section>

          <section id="gói-dịch-vụ">
            <h2 className="font-serif text-2xl font-bold text-ink-950">Gói dịch vụ, gia hạn và hoàn tiền</h2>
            <div className="mt-4 space-y-3">
              <p>Giá, thời hạn và giới hạn của từng gói được hiển thị tại trang Tài khoản trước khi đăng ký. Tính năng ghi “Đang phát triển” không thuộc quyền lợi đang cung cấp.</p>
              <p>Trong thời gian chưa có cổng thanh toán tự động, mọi đăng ký, thời điểm kích hoạt, điều kiện gia hạn và xử lý hoàn tiền phải được Lily xác nhận trực tiếp với bạn trước khi thanh toán.</p>
              <p>Nếu gói đã thanh toán chưa được kích hoạt hoặc quyền lợi nhận được không đúng nội dung đã xác nhận, hãy liên hệ hỗ trợ và cung cấp tài khoản cùng thông tin giao dịch để được kiểm tra.</p>
            </div>
          </section>

          <section id="hỗ-trợ" className="rounded-2xl border border-lily-200 bg-lily-50 p-5">
            <h2 className="font-serif text-2xl font-bold text-ink-950">Liên hệ hỗ trợ</h2>
            <p className="mt-3">Kênh hỗ trợ hiện tại: Telegram <strong>@noooo4518</strong>. Không gửi mật khẩu, mã đăng nhập hoặc toàn bộ nội dung truyện trong yêu cầu hỗ trợ.</p>
            <a href="https://t.me/noooo4518" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white">Mở Telegram <ExternalLink className="h-3.5 w-3.5" /></a>
          </section>
        </div>
      </div>
    </main>
  );
};
