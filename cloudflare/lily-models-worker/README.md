# Lily Models Worker

Phát file model dịch trên máy (ONNX) từ bucket R2 riêng tư `lily-models`, theo cơ chế mã
giống mã chia sẻ truyện trên Cloud.

- Admin (phiên Cloud admin / OWNER_KEY, xác minh qua Worker `lily-owner-library-api`) tạo mã
  model dùng một lần trong mục Cloud → "Mã model dịch", xem danh sách và thu hồi.
- Người dùng nhập mã trong mục dịch. Mã gắn vĩnh viễn với máy (mã thiết bị ngẫu nhiên lưu
  trong trình duyệt) và tài khoản LilyHub đó, đổi thành giấy phép HMAC (`LICENSE_SECRET`).
  Máy khác / tài khoản khác không dùng được; thu hồi mã thì giấy phép mất hiệu lực.
- Máy admin tự nhận giấy phép mọi model khi Cloud đã mở khóa (`POST /v1/admin/licenses/self`).
- File model: `GET /m/<model>/<đường dẫn>` kèm `X-Lily-License`, `X-Lily-Device`,
  `X-Lily-Account`. URL không chứa giấy phép nên bộ nhớ đệm model của trình duyệt vẫn dùng lại.

## Thiết lập

```bash
npx wrangler r2 bucket create lily-models
npx wrangler secret put LICENSE_SECRET   # chuỗi ngẫu nhiên dài, không lưu vào git
npx wrangler deploy
npx wrangler r2 object put lily-models/lily-cophong/config.json --file ... --remote
```

Model hiện có: `lily-cophong` (Lily Cổ Phong — V20 cổ đại, bản names). Thêm model mới: tải
file lên `<tên>/`, thêm vào `MODELS` trong worker.js và vào `TRANSLATION_MODELS` của app.
