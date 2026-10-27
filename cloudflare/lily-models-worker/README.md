# Retired Lily Models Worker

This public Worker is a tombstone. It rejects all old license activation,
verification, admin and model-file routes. It must remain deployed so that copied
URLs, old browser bundles and previously issued licenses fail closed.

Model inference moves to the authenticated LilyHub `/api/reader/translate`
gateway. The gateway requires a current session, server-side entitlement checks,
a quota claim belonging to that user, bounded batches and a server-only upstream
key. The VPS must require that key on every inference route and bind the inference
process to localhost. Neither CORS nor a client-supplied account/device ID is an
authentication mechanism.

Run `node --test cloudflare/lily-models-worker/test/*.test.mjs` from the repo root.
Deploy with `wrangler deploy` from this directory using the owning Cloudflare
account. Deploy the new authenticated gateway and frontend together with the VPS
ingress lock. Old clients must update to use the gateway. See
`docs/model-api-security.md` for rollout and verification requirements.

The existing R2 binding remains for operational rollback only; this code never
reads or writes it. Do not restore the old unauthenticated grant route. Previously
downloaded model files cannot be recalled from a reader's device.
