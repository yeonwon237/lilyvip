# Lily Models Worker

Phát file model dịch trên máy (ONNX) từ bucket R2 riêng tư `lily-models`, chỉ cho tài khoản
LilyHub là owner hoặc được cấp `ai_translation`.

- Trình duyệt gọi `/api/model-ticket` trên chính my.lilyhub.top (hàm Vercel, thấy được cookie
  phiên `.lilyhub.top`). Hàm đó chuyển cookie sang `POST /v1/ticket` của Worker.
- Worker hỏi `api.lilyhub.top/api/reader/account`; đủ quyền thì ký vé HMAC hạn 6 giờ bằng
  `TICKET_SECRET` (chỉ Worker biết).
- File model: `GET /m/<model>/<đường dẫn>` kèm header `X-Lily-Ticket`. URL không chứa vé nên
  bộ nhớ đệm model của trình duyệt vẫn dùng lại được khi vé đổi.

## Thiết lập

```bash
npx wrangler r2 bucket create lily-models
npx wrangler secret put TICKET_SECRET   # chuỗi ngẫu nhiên dài, không lưu vào git
npx wrangler deploy
npx wrangler r2 object put lily-models/lily-cophong/config.json --file ... --remote
```

Model hiện có: `lily-cophong` (Lily Cổ Phong — V20 cổ đại, bản names).
