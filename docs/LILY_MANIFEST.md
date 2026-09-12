# Lily Manifest 1.0

Chủ website có thể đặt file `lily-reader.json` trên website của mình và đưa liên kết HTTPS đó cho người đọc. Lily chỉ đọc nội dung được khai báo trực tiếp trong file; không dò hoặc tải các trang khác trên website.

```json
{
  "lily": "1.0",
  "title": "Tên truyện",
  "author": "Tên tác giả hoặc đơn vị biên tập",
  "description": "Mô tả không bắt buộc",
  "cover": "https://example.com/cover.jpg",
  "chapters": [
    {
      "title": "Chương 1",
      "paragraphs": ["Đoạn thứ nhất.", "Đoạn thứ hai."]
    },
    {
      "title": "Chương 2",
      "content": "Đoạn thứ nhất.\n\nĐoạn thứ hai."
    }
  ]
}
```

Quy tắc:

- URL phải dùng HTTPS và có tên file `lily-reader.json`; vị trí khuyến nghị là `/.well-known/lily-reader.json`.
- `lily`, `title` và `chapters` là bắt buộc.
- Mỗi chương cần `title` và một trong hai trường `paragraphs` hoặc `content`.
- Tối đa 20.000 chương; phản hồi máy chủ tối đa 4 MB.
- Lily không gửi cookie, thông tin đăng nhập hoặc dữ liệu thư viện của người đọc tới website nguồn.
