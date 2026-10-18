# Dữ liệu Lily QT

Đây là nơi tập trung dữ liệu từ điển đang dùng và dữ liệu đối chiếu. `qtTranslator.ts` nạp năm tệp JSON ở thư mục này; `qtData.ts` và `LILY_WORDS` là các quy tắc Lily tự biên tập. Không xóa tệp đang nạp nếu chưa bỏ import và chạy lại kiểm tra.

| Tệp | Vai trò | Nguồn / quyền sử dụng | Trạng thái |
| --- | --- | --- | --- |
| `qtdict-vietphrase-words.json` | Cụm từ nền (301.663 mục) | Dữ liệu VietPhrase cộng đồng; cần xác nhận nguồn và giấy phép trước khi phân phối lại | Đang dùng |
| `qtdict-vietphrase-chars.json` | Nghĩa từng chữ (12.540 mục) | Cùng nguồn VietPhrase | Đang dùng |
| `qtdict-cvdict-extra.json` | Bổ sung 32.386 cụm chưa có trong VietPhrase | [CVDICT](https://github.com/ph0ngp/CVDICT), CC BY-SA 4.0 | Đang dùng |
| `qtdict-hanviet-chars-extra.json` | Âm Hán Việt còn thiếu (1.187 mục) | [hanviet-pinyin-words](https://github.com/ph0ngp/hanviet-pinyin-words), MIT | Đang dùng |
| `qtdict-hanviet-formal-readings.json` | Âm Hán Việt của tên riêng (10.030 mục) | [hanviet-pinyin-wordlist](https://github.com/ph0ngp/hanviet-pinyin-wordlist); kiểm tra giấy phép khi phát hành | Đang dùng |
| `evaluation/abo-comparison.json` | 12 câu đối chiếu Lily QT với Quick Translator Engine | Câu gốc từ tệp người dùng cung cấp; đầu ra tham chiếu chỉ dùng để đánh giá | Đánh giá, không nạp khi chạy |

`evaluation/abo-comparison.json` ghi rõ bản thử, câu nguồn, hai kết quả và nhận xét. Bản tham chiếu là [Quick Translator Engine](https://github.com/thiendiepdt/quick-translator-engine), **không phải Dịch Ngay**. Engine này là GPL-3.0-only; kho của họ cho biết quyền phân phối bộ dữ liệu `QT2025/` chưa được xác nhận. Bản sao thử nghiệm đã được xóa sau khi so sánh; không có dữ liệu QT2025 trong Lily.

Khi thay nguồn từ điển, cập nhật bảng này và chạy lại `npm run test:book-engine` cùng `npm run build`. Chỉ xóa bộ cũ sau khi đã đổi import và xác nhận bản thay thế tốt hơn trên nhiều thể loại truyện.
