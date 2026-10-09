# Nhập truyện từ web: hướng triển khai cho LilyVIP

## Điều rút ra từ Readest

Readest có hai luồng: mở một trang trong trình duyệt nhúng để lấy nội dung hiện tại, và nhập web novel từ URL mục lục rồi chọn chương. Mã nguồn của họ dùng Tauri để tải trang, chia sẻ phiên đăng nhập và dựng trang chạy JavaScript. Bộ lấy mục lục dựa vào mẫu tiêu đề/link và vùng chứa danh sách, sau đó người dùng xác nhận trước khi tải. Đây là lý do Readest tiếp cận được nhiều nguồn; khả năng đó không thể chuyển nguyên sang web app thuần vì CORS và phiên đăng nhập của trang khác.

## Thiết kế đề xuất

1. Giữ adapter chuyên biệt hiện có cho các nguồn đã tối ưu.
2. Bổ sung bộ nhận diện chung cho trang mục lục công khai: tải HTML, lấy link cùng nguồn, tìm vùng chứa danh sách, đưa qua `ChapterSorter.processAndSortChapters` của LilyVIP để loại nhiễu, khử link trùng, sắp thứ tự và báo chương thiếu/trùng.
3. Dùng màn hình xem trước hiện tại để sửa tên/tác giả, chọn chương hoặc khoảng chương, rồi tải với hàng đợi và báo lỗi từng chương.
4. Chấm chất lượng mỗi chương sau khi lấy. Nếu trang trả trang chặn bot, nội dung quá ngắn hoặc chỉ có menu thì báo thất bại; không lưu nó như chương hợp lệ.
5. Sau khi thử với URL thực tế, thêm tìm trang mục lục từ link một chương, nhiều trang mục lục, các trang dùng JavaScript và cơ chế chọn vùng nội dung thủ công. Nguồn cần đăng nhập nên được nghiên cứu như một luồng riêng có trình duyệt nhúng hoặc tiện ích trình duyệt; proxy công khai không nhận cookie tùy ý.

## Bản thử nghiệm localhost hiện tại

- Chỉ bật bộ nhận diện chung trong Vite dev, qua `/api/local-webpage`; bản production không có route này.
- Proxy local chỉ nhận HTTPS và kết nối loopback; kiểm tra DNS, chặn địa chỉ private, ghim IP và kiểm tra lại từng redirect; giới hạn thời gian/kích thước phản hồi.
- Hiện phù hợp với URL **trang mục lục** công khai trả HTML đầy đủ. Chưa hỗ trợ đăng nhập, Cloudflare challenge, nội dung dựng hoàn toàn bằng JavaScript, mục lục chia nhiều trang, hay sách nằm trên một trang.
- Cần 2–3 URL thực tế mà LilyVIP đang không nhập được để đo độ chính xác lọc chương và tinh chỉnh bộ nhận diện theo trang thật.

## Điều kiện để cân nhắc triển khai production

- Thử trên ít nhất vài nguồn khác cấu trúc, gồm truyện tiếng Việt và tiếng Trung.
- Đối chiếu danh sách chương với trang gốc: số chương, thứ tự, chương phụ, chương trùng và chương thiếu.
- Kiểm tra nội dung đầu/giữa/cuối truyện; bảo đảm trang chặn bot không bị lưu thành chương.
- Thiết kế proxy production có xác thực, giới hạn tốc độ/tài nguyên và chính sách nguồn được phép truy cập; không mở proxy tự do theo URL người dùng.
