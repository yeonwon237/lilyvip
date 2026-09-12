# Lily Owner Library Worker

Worker riêng cho kho truyện cá nhân của chủ Lily Reader.

Worker được khóa vào Cloudflare account chứa kho cá nhân bằng `account_id` trong
`wrangler.toml`, tránh triển khai nhầm sang account LilyHub.

- Bucket R2 luôn để private; chỉ Worker được bind trực tiếp.
- API quản trị yêu cầu `Authorization: Bearer <OWNER_KEY>`.
- Mã chia sẻ là chuỗi ngẫu nhiên 144 bit; trong R2 chỉ lưu SHA-256 của mã.
- Có thể thu hồi mã chia sẻ mà không xóa truyện.
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
- `DELETE /v1/admin/shares/:code`
- `GET /v1/share/:code`
