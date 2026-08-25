# 🌸 Lily VIP — vip.lilyhub.top

> **Thư viện truyện cá nhân & Trình đọc sách Reader Pro**
> Một sản phẩm mở rộng của LilyHub, tập trung vào việc cho người dùng đưa file truyện cá nhân vào để đọc, nghe audio và lưu trữ an toàn.

---

## ✨ Tính năng nổi bật

### 📚 Free Local Library (100% Client-Side & Riêng tư)
- **Hỗ trợ đa định dạng**: Nhập file **TXT**, **EPUB**, **DOCX** trực tiếp trên trình duyệt.
- **Local Book Engine**:
  - Tự động khử BOM (`\uFEFF`), chuẩn hóa ngắt dòng (CRLF/LF), gộp dòng trống thừa.
  - Tự động nhận diện cấu trúc chương tiếng Việt (`Chương 1`, `CHƯƠNG 01`, `Chương Một`, `Hồi`, `Tiết`...).
  - Lưu trữ bền vững trên **IndexedDB** (`LilyVIP_LocalLibrary_v1`), không mất khi tải lại trang.
- **Giới hạn 3 slot local**: Quản lý slot trực quan, thay đổi hoặc xóa truyện linh hoạt.
- **Bảo mật tuyệt đối**: 0 request mạng gửi nội dung truyện ra ngoài thiết bị.

### 📖 Lily Reader & Reader Pro
- **Giao diện đọc đắm chìm**: Tối ưu không gian đọc, tự động ẩn toolbar khi đọc trên điện thoại (chạm giữa màn hình để mở).
- **Typography & Tùy biến**:
  - Phông chữ văn học: *Literata*, *Merriweather*, *Playfair Display*, *Be Vietnam Pro*.
  - Điều chỉnh cỡ chữ (A-/A+), giãn dòng (1.4 - 2.4), độ rộng khung đọc (Hẹp/Chuẩn/Rộng), căn lề và thụt đầu dòng.
  - **5 Giao diện Tiêu chuẩn (Free)**: Trắng, Kem, Giấy, Xám, Đêm.
  - **8 Giao diện Cao cấp (VIP Pro)**: Matcha, Hoàng hôn, Nguyệt dạ, Cổ trang...
  - Style Presets: Ban đêm, Tiểu thuyết, Cổ trang, Đọc lâu.
- **Mục lục & Tiến độ**:
  - Mục lục chương trượt mượt mà (TOC Drawer) với tìm kiếm số chương.
  - Tự động lưu và đồng bộ tiến độ đọc theo từng chương và vị trí cuộn.

### 🎧 Audio & Giọng đọc AI (TTS)
- 4 giọng đọc AI truyền cảm: *Linh Nhi* (Nữ Bắc), *Mai Phương* (Nữ Nam), *Nguyên Anh* (Nam Bắc), *Hoàng Nam* (Nam Nam).
- Tùy chỉnh tốc độ phát (0.8x - 2.0x), hẹn giờ tắt tự động (15p - 60p), tua nhanh 15 giây.
- Mini player ghim dưới cùng và Audio Sheet toàn màn hình.

### 📱 Thiết kế Web App Độc lập (PWA)
- Thêm vào màn hình chính (Add to Home Screen) trên iOS / Android để mở toàn màn hình (Full Screen), ẩn 100% thanh link URL như ứng dụng gốc.
- Cố định Header & Bottom Navigation (Zero-bounce App Shell), cuộn quán tính mượt mà.

---

## 🛠️ Công nghệ sử dụng

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), Lucide Icons
- **Storage**: Client-side **IndexedDB** (`LilyVIP_LocalLibrary_v1`)
- **Importers**: Native TextDecoder, ZipReader (EPUB & DOCX client extraction)

---

## 🚀 Cài đặt & Chạy cục bộ

```bash
# Cài đặt dependencies
npm install

# Chạy môi trường phát triển (Port 3000)
npm run dev

# Build production
npm run build
```

---

## 📄 Bản quyền & Giấy phép

Phát triển bởi đội ngũ **LilyHub**.
Mã nguồn phát hành theo giấy phép MIT.
