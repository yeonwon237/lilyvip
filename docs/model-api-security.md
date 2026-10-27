# Model API security rollout — 2026-10-27

## Boundary

The browser calls `https://api.lilyhub.top/api/reader/translate` with its LilyHub
session cookie and public product model ID. Only the LilyHub Worker knows the
upstream URL, internal model names and gateway secret. Knowing the public gateway
URL does not authorize inference. An authorized reader can still automate their
own session within their entitlement and server quota; Origin/CORS cannot prove
that a request was sent by an unmodified website.

Server layers:

- The gateway checks the trusted Origin, current session, current VIP entitlement
  or owner identity, and a quota claim belonging to that user and model. S1 uses
  the free account quota and now requires login. Anonymous QT/dictionary remains
  local; its local limits do not protect a server model.
- A claim lasts 30 minutes and permits at most 64 batches / 120,000 input
  characters. A batch is at most 64 paragraphs / 24,000 characters. A database
  transaction reserves each batch, binds its index to a content hash and caps
  each account at 60 new batches/minute. Cloudflare also limits requests per IP.
- Retrying a completed batch returns the stored result, without new inference.
  Pending/failed batches cannot be resubmitted or refunded by the client. If a
  server timeout leaves an uncertain result, support must review the consumed
  quota rather than allowing a client-controlled refund.
- Result text is purged after 24 hours. Usage tombstones remain for 32 days,
  longer than quota claims, so cleanup cannot make a used claim refundable.
  Migration 017 is additive and is also bootstrapped idempotently by the Worker.
- The VPS accepts only `X-Lily-Gateway-Key`, requires the secret before parsing a
  body or entering any route, caps streamed request bytes, and runs inference on
  loopback only. Legacy licenses, claims and Origin never authorize the VPS.
- The old model Worker becomes a deny-all tombstone. This revokes all previously
  issued public licenses and disables model-file downloads and code creation.
  Previously downloaded weights cannot be recalled. Previously public IPs/URLs
  cannot be made unknown retroactively.

## Code locations

Frontend / retired model Worker / VPS API: this repository.
LilyHub gateway: `GEMINI-LILYHUB`, branch `codex/model-api-security`, local checkout
`/Users/hongyen2911/Documents/lilyhub-model-security`.

## Deployment

1. Keep a backup of the existing VPS `server.py` and systemd configuration.
2. Configure a random secret (at least 32 characters) as `MODEL_UPSTREAM_KEY` in
   the LilyHub Worker and `MODEL_GATEWAY_KEY` in a root-readable systemd
   EnvironmentFile on the VPS. Never put it in frontend/VITE variables or Git.
   Configure `MODEL_UPSTREAM_URL` as a Worker secret and the production Origin
   allowlist as `MODEL_API_TRUSTED_ORIGINS`.
3. Deploy the LilyHub gateway; its additive table setup changes no balances.
4. Install `server/lily-model-api/server.py` and `gateway_auth.py` beside the
   existing VPS `lily_ct2.py`. Preserve model configuration. Restart `lily-api`,
   whose Uvicorn binding must remain `127.0.0.1:8000`. No legacy fallback.
5. Publish the frontend and retire the public model Worker. Old open tabs need
   to refresh. Remove model code administration from the frontend.
6. Verify unauthenticated VPS requests (including S1, health and forged old
   credentials) fail. Verify no-session gateway requests fail even with a trusted
   Origin. Verify a valid signed-in reader can translate and consumes quota.
7. Do not roll back to unauthenticated grant or public inference code. If the
   gateway fails, keep inference closed while repairing it.

## Verification commands

- `node --test cloudflare/lily-models-worker/test/*.test.mjs`
- `node_modules/.bin/tsx src/translation-engine/__tests__/api-gateway.test.ts`
- `npm run build` and `npm run test:pwa`
- In the LilyHub Worker directory: `npm test`; `wrangler deploy --dry-run`
- On the VPS Python environment: `python -m unittest discover` in a temporary
  directory with the new API files and their tests. Tests stub model loading;
  they do not load weights or call paid services.

Deployment status and unresolved account access are recorded in the chat; a
passing local test does not establish that every production layer was deployed.
