import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { t } from '../i18n';
import React from 'react';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AboutPage: React.FC = () => {
  const { navigateTo } = useApp();
  return <main className="info-page about-page">
    <header className="info-nav">
      <button type="button" onClick={() => navigateTo('landing')} aria-label={t("Trang giới thiệu Lilyhub")}><span className="lily-wordmark">LILYHUB</span></button>
      <div className="info-nav-actions"><LanguageSwitcher /><button type="button" className="info-back" onClick={() => navigateTo('landing')}><ArrowLeft size={15}/>{t("Trang giới thiệu")}</button><button type="button" className="info-open" onClick={() => navigateTo('dashboard')}>{t("Mở thư viện")}</button></div>
    </header>
    <div className="info-content">
      <section className="about-intro"><div><p className="info-eyebrow">LILYHUB · {t("Về chúng tôi")}</p><h1>{t("Về Lilyhub")}</h1><p>{t("Lilyhub là nơi bạn quản lý thư viện cá nhân, đọc truyện, nghe sách nói và dịch nội dung ngay trong trang đọc.")}</p></div><div className="about-intro-art" aria-hidden="true"><img src="/default-covers/lily-cover-01.jpg" alt=""/><img src="/default-covers/lily-cover-04.jpg" alt=""/></div></section>
      <div className="about-story">
        <section className="about-section"><span className="info-index">01</span><div><h2>{t("Một tài khoản, chung hệ thống")}</h2><p>{t("Ứng dụng đọc tại ")}<a href="https://my.lilyhub.top">my.lilyhub.top</a> {t(" dùng tài khoản Lilyhub. Bạn có thể thêm truyện từ thư viện Lilyhub, file trên thiết bị hoặc website được hỗ trợ, rồi sắp xếp và tiếp tục đọc trong thư viện của mình.")}</p></div></section>
        <section className="about-section"><span className="info-index">02</span><div><h2>{t("Thư viện trên thiết bị của bạn")}</h2><p>{t("Truyện đã nhập, tiến độ đọc và ghi chú được lưu trong trình duyệt. Các tính năng sao lưu hoặc lưu lên đám mây được thực hiện khi bạn chủ động sử dụng. Hãy sao lưu trước khi đổi máy hoặc xóa dữ liệu trình duyệt.")}</p><p>{t("Khi nhập liên kết hoặc dùng dịch vụ dịch trực tuyến, ứng dụng cần kết nối tới dịch vụ tương ứng. Chi tiết được trình bày trong chính sách quyền riêng tư.")}</p></div></section>
        <section className="about-section"><span className="info-index">03</span><div><h2>{t("Xem rõ quyền lợi trước khi mua")}</h2><p>{t("Bạn có thể bắt đầu với thư viện miễn phí. Giá, thời hạn và giới hạn của các gói được hiển thị trong ứng dụng. Gói không tự động gia hạn.")}</p><p>{t("Nếu chưa rõ cách kích hoạt hoặc quyền lợi, hãy liên hệ trước khi thanh toán. Điều kiện hoàn tiền được công bố tại trang điều khoản.")}</p><button type="button" className="about-link" onClick={() => navigateTo('legal')}>{t("Điều khoản & quyền riêng tư ")}<ArrowRight size={15}/></button></div></section>
      </div>
      <section className="about-contact"><div><p className="info-eyebrow">{t("Hỗ trợ")}</p><h2>{t("Liên hệ trực tiếp")}</h2><p>{t("Góp ý, báo lỗi, vấn đề tài khoản hoặc yêu cầu liên quan đến nội dung:")}</p><a className="about-email" href="mailto:yen.n@lilyhub.top"><Mail size={18}/>yen.n@lilyhub.top</a><p>{t("Khi báo lỗi, bạn có thể gửi ảnh màn hình, thiết bị đang dùng và mô tả thao tác gặp lỗi. Với vấn đề thanh toán, gửi mã đơn để tiện kiểm tra; không gửi mật khẩu hoặc mã xác thực.")}</p></div><a className="about-link" href="https://t.me/noooo4518" target="_blank" rel="noreferrer">{t("Hỗ trợ qua Telegram ")}<ArrowRight size={15}/></a></section>
    </div>
    <footer className="info-footer"><span>Lilyhub · © 2026</span><button type="button" onClick={() => navigateTo('legal')}>{t("Điều khoản & quyền riêng tư")}</button></footer>
  </main>;
};
