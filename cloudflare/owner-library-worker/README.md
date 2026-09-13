# Lily Owner Library Worker

Worker riêng cho kho truyện cá nhân của chủ Lily Reader.

Worker được khóa vào Cloudflare account chứa kho cá nhân bằng `account_id` trong
`wrangler.toml`, tránh triển khai nhầm sang account LilyHub.

- Bucket R2 luôn để private; chỉ Worker được bind trực tiếp.
- API quản trị yêu cầu `Authorization: Bearer <OWNER_KEY>`.
- Mã chia sẻ là chuỗi ngẫu nhiên 144 bit; trong R2 chỉ lưu SHA-256 của mã.
- Mã mới mặc định dùng 1 lần và hết hạn sau 24 giờ; admin có thể chọn tối đa 50 lượt và 7 ngày.
- Lượt dùng được cập nhật có điều kiện theo ETag để các yêu cầu đồng thời không vượt hạn mức.
- Có thể xem trạng thái và thu hồi mã chia sẻ mà không xóa truyện.
- Chỉ cho phép CORS từ localhost và `my.lilyhub.top`.

## Thiết lập Cloudflare

```bash
npx wrangler secret put OWNER_KEY
npx wrangler deploy
```

Không commit `OWNER_KEY` hoặc lưu khóa này trong mã nguồn/frontend.

## API

- `GET /health`
- `GET /v1/admin/books`
- `PUT /v1/admin/books/:id`
- `GET /v1/admin/books/:id`
- `DELETE /v1/admin/books/:id`
- `POST /v1/admin/books/:id/shares`
- `GET /v1/admin/shares`
- `DELETE /v1/admin/shares/:id`
- `GET /v1/share/:code`
