import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { t } from '../i18n';
import React from 'react';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const AboutPage: React.FC = () => {
  const { navigateTo } = useApp();
  return <main className="about-page">
    <header className="about-nav"><button onClick={() => navigateTo('landing')}><ArrowLeft size={16}/> {t(" Trang giới thiệu")}</button><LanguageSwitcher /><span className="lily-wordmark">LILYHUB</span></header>
    <section className="about-intro"><img src="/lilyhub-coral-192.png" alt=""/><h1>{t("Về Lilyhub")}</h1><p>{t("Lilyhub là nơi bạn quản lý thư viện cá nhân, đọc truyện, nghe sách nói và dịch nội dung ngay trong trang đọc.")}</p></section>
    <section className="about-section"><h2>{t("Một tài khoản, chung hệ thống")}</h2><p>{t("Ứng dụng đọc tại ")}<a href="https://my.lilyhub.top">my.lilyhub.top</a> {t(" dùng tài khoản Lilyhub. Bạn có thể thêm truyện từ thư viện Lilyhub, file trên thiết bị hoặc website được hỗ trợ, rồi sắp xếp và tiếp tục đọc trong thư viện của mình.")}</p></section>
    <section className="about-section"><h2>{t("Thư viện trên thiết bị của bạn")}</h2><p>{t("Truyện đã nhập, tiến độ đọc và ghi chú được lưu trong trình duyệt. Các tính năng sao lưu hoặc lưu lên đám mây được thực hiện khi bạn chủ động sử dụng. Hãy sao lưu trước khi đổi máy hoặc xóa dữ liệu trình duyệt.")}</p><p>{t("Khi nhập liên kết hoặc dùng dịch vụ dịch trực tuyến, ứng dụng cần kết nối tới dịch vụ tương ứng. Chi tiết được trình bày trong chính sách quyền riêng tư.")}</p></section>
    <section className="about-section"><h2>{t("Xem rõ quyền lợi trước khi mua")}</h2><p>{t("Bạn có thể bắt đầu với thư viện miễn phí. Giá, thời hạn và giới hạn của các gói được hiển thị trong ứng dụng. Gói không tự động gia hạn.")}</p><p>{t("Nếu chưa rõ cách kích hoạt hoặc quyền lợi, hãy liên hệ trước khi thanh toán. Điều kiện hoàn tiền được công bố tại trang điều khoản.")}</p><button className="about-link" onClick={() => navigateTo('legal')}>{t("Điều khoản & quyền riêng tư ")}<ArrowRight size={15}/></button></section>
    <section className="about-contact"><h2>{t("Liên hệ trực tiếp")}</h2><p>{t("Góp ý, báo lỗi, vấn đề tài khoản hoặc yêu cầu liên quan đến nội dung:")}</p><a className="about-email" href="mailto:yen.n@lilyhub.top"><Mail size={18}/>yen.n@lilyhub.top</a><p>{t("Khi báo lỗi, bạn có thể gửi ảnh màn hình, thiết bị đang dùng và mô tả thao tác gặp lỗi. Với vấn đề thanh toán, gửi mã đơn để tiện kiểm tra; không gửi mật khẩu hoặc mã xác thực.")}</p><a className="about-link" href="https://t.me/noooo4518" target="_blank" rel="noreferrer">{t("Hỗ trợ qua Telegram ")}<ArrowRight size={15}/></a></section>
    <footer className="about-footer">Lilyhub</footer>
  </main>;
};
