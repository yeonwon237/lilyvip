// Serves Lily's private on-device translation models (ONNX) from the private R2 bucket.
//
// Access works like the owner cloud's share codes:
// - The owner (proved by the owner cloud's admin session / OWNER_KEY, checked against the
//   lily-owner-library Worker) creates one-time model codes and can revoke them.
// - A reader enters a code once; it is bound for good to that device + LilyHub account and
//   turns into a license (HMAC) the app keeps in localStorage. The same code or license on
//   another device or account does not work.
// - The owner's own devices get a license without a code (POST /v1/admin/licenses/self).
// Model files: GET /m/<model>/<path> with X-Lily-License / X-Lily-Device / X-Lily-Account.
// The translate API on the VPS checks the same licenses via POST /v1/license/verify.

const MODELS = { 'lily-cophong': 'Lily Cổ Phong', 'lily-dothi': 'Lily Đô Thị' };
const CODE_PREFIX = 'codes/';
const OWNER_DEVICE_PREFIX = 'owner-devices/';
const FILE_PATH = /^[a-z0-9][a-z0-9-]{0,63}\/[A-Za-z0-9._/-]{1,200}$/;
const SAFE_ID = /^[A-Za-z0-9_-]{8,80}$/;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const bytesToBase64Url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const sign = async (value, secret) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))));
};
const sha256Hex = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
  .map(byte => byte.toString(16).padStart(2, '0')).join('');
const constantTimeEqual = (left, right) => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
};

/** LILY-XXXX-XXXX-XXXX (60 random bits, no look-alike characters). */
const newCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = [...bytes].map(byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
  return `LILY-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
};
const normalizeCode = code => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^LILY/, '');
const codeId = async code => (await sha256Hex(`lily-model-code:${normalizeCode(code)}`)).slice(0, 32);

// A license is "<kind>.<recordId>.<model>.<signature>"; the signature also covers the device
// and account, which the app sends in their own headers on every file request.
const licensePayload = (kind, recordId, model, device, account) => `${kind}|${recordId}|${model}|${device}|${account}`;
const createLicense = async (env, kind, recordId, model, device, account) =>
  `${kind}.${recordId}.${model}.${await sign(licensePayload(kind, recordId, model, device, account), env.LICENSE_SECRET)}`;

const allowedOrigin = (request, env) => {
  const origin = request.headers.get('origin');
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(item => item.trim()).filter(Boolean);
  return origin && allowed.includes(origin) ? origin : null;
};
const corsHeaders = (request, env) => {
  const origin = allowedOrigin(request, env);
  return origin ? {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, HEAD, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type, range, x-lily-license, x-lily-device, x-lily-account',
    'access-control-expose-headers': 'content-length, content-type, etag, content-range, accept-ranges',
    'access-control-max-age': '86400',
    vary: 'Origin',
  } : {};
};
const json = (value, status, headers = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});
const readJson = async request => {
  const text = await request.text();
  if (text.length > 4096) return null;
  try { return JSON.parse(text); } catch { return null; }
};

// Owner check is delegated to the owner cloud Worker, which already knows OWNER_KEY and signs
// its admin sessions: a request it accepts as admin is the owner.
const ownerCache = new Map();
const isOwner = async (request, env) => {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ') || authorization.length < 20) return false;
  const key = await sha256Hex(authorization);
  const cached = ownerCache.get(key);
  if (cached && cached.until > Date.now()) return cached.ok;
  // Service binding: Cloudflare refuses a Worker fetching another workers.dev Worker of the
  // same account over the public URL (error 1042).
  const check = new Request(`${env.OWNER_LIBRARY_URL}/v1/admin/shares`, { headers: { authorization } });
  const response = await (env.OWNER_LIBRARY ? env.OWNER_LIBRARY.fetch(check) : fetch(check)).catch(() => null);
  const ok = Boolean(response?.ok);
  ownerCache.set(key, { ok, until: Date.now() + (ok ? 10 : 1) * 60 * 1000 });
  return ok;
};

const readRecord = async (env, key) => {
  const object = await env.MODELS.get(key);
  return object ? { value: await object.json().catch(() => null), etag: object.etag } : null;
};

const licenseCache = new Map();
const validLicense = async (request, env, model) => {
  const license = request.headers.get('x-lily-license') || '';
  const device = request.headers.get('x-lily-device') || '';
  const account = request.headers.get('x-lily-account') || '';
  const [kind, recordId, licensedModel, signature, extra] = license.split('.');
  if (extra || !signature || !SAFE_ID.test(device) || !account || account.length > 120) return false;
  if (licensedModel !== model && licensedModel !== '*') return false;
  const expected = await sign(licensePayload(kind, recordId, licensedModel, device, account), env.LICENSE_SECRET);
  if (!constantTimeEqual(signature, expected)) return false;
  // Revocation: the backing record must still be active. Cached briefly per Worker instance.
  const cacheKey = `${kind}:${recordId}`;
  const cached = licenseCache.get(cacheKey);
  if (cached && cached.until > Date.now()) return cached.ok;
  const prefix = kind === 'owner' ? OWNER_DEVICE_PREFIX : kind === 'code' ? CODE_PREFIX : null;
  const record = prefix ? await readRecord(env, `${prefix}${recordId}.json`) : null;
  const ok = record?.value?.status === 'active' || record?.value?.status === 'used';
  licenseCache.set(cacheKey, { ok, until: Date.now() + 5 * 60 * 1000 });
  return ok;
};

const serveModelFile = async (request, env, key, cors) => {
  const range = request.headers.get('range');
  const object = request.method === 'HEAD'
    ? await env.MODELS.head(key)
    : await env.MODELS.get(key, range ? { range: request.headers } : {});
  if (!object) return json({ error: 'NOT_FOUND' }, 404, cors);
  const headers = new Headers(cors);
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');
  // Private: never let a shared/CDN cache hand the file to someone without a license.
  headers.set('cache-control', 'private, max-age=31536000, immutable');
  if (!headers.has('content-type')) headers.set('content-type', key.endsWith('.json') ? 'application/json' : 'application/octet-stream');
  if (range && object.range) {
    const { offset = 0, length = object.size - offset } = object.range;
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set('content-length', String(length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set('content-length', String(object.size));
  return new Response(request.method === 'HEAD' ? null : object.body, { status: 200, headers });
};

const deviceInfo = body => ({
  device: String(body?.device || ''),
  account: String(body?.account || '').slice(0, 120),
  accountName: String(body?.accountName || '').slice(0, 80),
  deviceLabel: String(body?.deviceLabel || '').slice(0, 120),
});

async function listCodes(env) {
  const codes = [];
  let cursor;
  for (let page = 0; page < 50; page += 1) {
    const listed = await env.MODELS.list({ prefix: CODE_PREFIX, limit: 100, cursor });
    for (const object of listed.objects) {
      const record = await readRecord(env, object.key);
      if (record?.value?.id) {
        const { id, model, note, status, createdAt, activatedAt, accountName, deviceLabel, revokedAt } = record.value;
        codes.push({ id, model, modelLabel: MODELS[model] || model, note, status, createdAt, activatedAt, accountName, deviceLabel, revokedAt });
      }
    }
    if (!listed.truncated) break;
    cursor = listed.cursor;
  }
  return codes.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function handleAdmin(request, env, path, cors) {
  if (!await isOwner(request, env)) return json({ error: 'UNAUTHORIZED' }, 401, cors);

  if (path === '/v1/admin/codes' && request.method === 'GET') return json({ codes: await listCodes(env), models: MODELS }, 200, cors);

  if (path === '/v1/admin/codes' && request.method === 'POST') {
    const body = await readJson(request);
    const model = String(body?.model || '');
    if (!MODELS[model]) return json({ error: 'UNKNOWN_MODEL' }, 400, cors);
    const code = newCode();
    const id = await codeId(code);
    const record = { id, model, note: String(body?.note || '').slice(0, 120), status: 'active', createdAt: new Date().toISOString() };
    await env.MODELS.put(`${CODE_PREFIX}${id}.json`, JSON.stringify(record), { httpMetadata: { contentType: 'application/json' } });
    return json({ code, id, model, modelLabel: MODELS[model] }, 201, cors);
  }

  const revoke = path.match(/^\/v1\/admin\/codes\/([a-f0-9]{32})$/);
  if (revoke && request.method === 'DELETE') {
    const key = `${CODE_PREFIX}${revoke[1]}.json`;
    const record = await readRecord(env, key);
    if (!record?.value) return json({ error: 'NOT_FOUND' }, 404, cors);
    await env.MODELS.put(key, JSON.stringify({ ...record.value, status: 'revoked', revokedAt: new Date().toISOString() }), { httpMetadata: { contentType: 'application/json' } });
    licenseCache.delete(`code:${revoke[1]}`);
    return json({ ok: true }, 200, cors);
  }

  // The owner's own device: a license for every model, no code needed.
  if (path === '/v1/admin/licenses/self' && request.method === 'POST') {
    const info = deviceInfo(await readJson(request));
    if (!SAFE_ID.test(info.device) || !info.account) return json({ error: 'BAD_DEVICE' }, 400, cors);
    const id = (await sha256Hex(`owner-device:${info.device}:${info.account}`)).slice(0, 32);
    await env.MODELS.put(`${OWNER_DEVICE_PREFIX}${id}.json`, JSON.stringify({ id, status: 'active', ...info, device: undefined, createdAt: new Date().toISOString() }), { httpMetadata: { contentType: 'application/json' } });
    licenseCache.delete(`owner:${id}`);
    return json({ license: await createLicense(env, 'owner', id, '*', info.device, info.account) }, 200, cors);
  }
  return json({ error: 'NOT_FOUND' }, 404, cors);
}

async function activate(request, env, cors) {
  const body = await readJson(request);
  const info = deviceInfo(body);
  if (!SAFE_ID.test(info.device) || !info.account) return json({ error: 'BAD_DEVICE' }, 400, cors);
  if (normalizeCode(body?.code).length !== 12) return json({ error: 'INVALID_CODE' }, 404, cors);
  const id = await codeId(body.code);
  const key = `${CODE_PREFIX}${id}.json`;
  const record = await readRecord(env, key);
  const code = record?.value;
  if (!code || code.status === 'revoked') return json({ error: 'INVALID_CODE' }, 404, cors);
  const deviceHash = await sha256Hex(`device:${info.device}`);
  if (code.status === 'used') {
    // Re-activating on the very same device + account (e.g. after reinstalling) is fine.
    if (code.deviceHash === deviceHash && code.account === info.account) {
      return json({ license: await createLicense(env, 'code', id, code.model, info.device, info.account), model: code.model }, 200, cors);
    }
    return json({ error: 'CODE_ALREADY_USED' }, 409, cors);
  }
  const updated = { ...code, status: 'used', activatedAt: new Date().toISOString(), deviceHash, account: info.account, accountName: info.accountName, deviceLabel: info.deviceLabel };
  // Conditional write: two devices racing on one code cannot both win.
  const written = await env.MODELS.put(key, JSON.stringify(updated), { onlyIf: { etagMatches: record.etag }, httpMetadata: { contentType: 'application/json' } });
  if (!written) return json({ error: 'CODE_ALREADY_USED' }, 409, cors);
  return json({ license: await createLicense(env, 'code', id, code.model, info.device, info.account), model: code.model }, 200, cors);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: cors['access-control-allow-origin'] ? 204 : 403, headers: cors });
    if (url.pathname === '/health') return json({ ok: true }, 200, cors);
    if (url.pathname.startsWith('/v1/admin/')) return handleAdmin(request, env, url.pathname, cors);
    if (url.pathname === '/v1/activate' && request.method === 'POST') return activate(request, env, cors);
    // The translate API on the VPS asks whether a license (same headers as file requests)
    // may use a model; it caches the answer for a few minutes.
    if (url.pathname === '/v1/license/verify' && request.method === 'POST') {
      const model = String((await readJson(request))?.model || '');
      if (!MODELS[model]) return json({ ok: false, error: 'UNKNOWN_MODEL' }, 404, cors);
      return await validLicense(request, env, model) ? json({ ok: true }, 200, cors) : json({ ok: false }, 401, cors);
    }

    if (url.pathname.startsWith('/m/') && (request.method === 'GET' || request.method === 'HEAD')) {
      // transformers.js asks for "<model>/resolve/<revision>/<file>" unless the path template
      // is overridden; accept both so a config slip cannot break loading.
      const key = decodeURIComponent(url.pathname.slice(3)).replace(/^([^/]+)\/resolve\/[^/]+\//, '$1/');
      if (!FILE_PATH.test(key) || key.includes('..')) return json({ error: 'BAD_PATH' }, 400, cors);
      const model = key.split('/')[0];
      if (!MODELS[model]) return json({ error: 'NOT_FOUND' }, 404, cors);
      if (!await validLicense(request, env, model)) return json({ error: 'UNAUTHORIZED' }, 401, cors);
      return serveModelFile(request, env, key, cors);
    }
    return json({ error: 'NOT_FOUND' }, 404, cors);
  },
};
