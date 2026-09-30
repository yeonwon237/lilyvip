// Serves the private on-device translation models (ONNX) from R2 to Lily Reader accounts
// that LilyHub confirms as owner or granted 'ai_translation'. The bucket is never public.
//
// Flow: the reader's browser asks its own origin (my.lilyhub.top/api/model-ticket, a Vercel
// function that can see the .lilyhub.top session cookie) for a ticket. That function forwards
// the cookie here; we ask LilyHub who it belongs to and, if allowed, sign a short-lived ticket
// with a secret only this Worker knows. Model file requests then carry the ticket in a header,
// so file URLs stay stable and the browser's model cache keeps working across tickets.

const TICKET_TTL_MS = 6 * 60 * 60 * 1000;
const MODEL_PREFIX = /^[a-z0-9][a-z0-9-]{0,63}\/[A-Za-z0-9._/-]{1,200}$/;

const bytesToBase64Url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const base64UrlToText = value => new TextDecoder().decode(Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0)));
const sign = async (value, secret) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))));
};
const constantTimeEqual = (left, right) => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
};

const createTicket = async (userId, env) => {
  const exp = Date.now() + TICKET_TTL_MS;
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ sub: userId, exp })));
  return { ticket: `${payload}.${await sign(payload, env.TICKET_SECRET)}`, exp };
};
const validTicket = async (ticket, env) => {
  if (!ticket || !env.TICKET_SECRET) return false;
  const [payload, signature, extra] = ticket.split('.');
  if (!payload || !signature || extra) return false;
  if (!constantTimeEqual(signature, await sign(payload, env.TICKET_SECRET))) return false;
  try { return Number(JSON.parse(base64UrlToText(payload)).exp) > Date.now(); } catch { return false; }
};

const allowedOrigin = (request, env) => {
  const origin = request.headers.get('origin');
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(item => item.trim()).filter(Boolean);
  return origin && allowed.includes(origin) ? origin : null;
};
const corsHeaders = (request, env) => {
  const origin = allowedOrigin(request, env);
  return origin ? {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-allow-headers': 'x-lily-ticket, range',
    'access-control-expose-headers': 'content-length, content-type, etag, content-range, accept-ranges',
    'access-control-max-age': '86400',
    vary: 'Origin',
  } : {};
};
const json = (value, status, headers = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});

/** Asks LilyHub whose session this cookie is. Only owner / 'ai_translation' accounts pass. */
const lilyHubUser = async (cookie, env) => {
  if (!cookie) return null;
  const response = await fetch(`${env.LILYHUB_API_URL}/api/reader/account`, {
    headers: { cookie, origin: env.LILYHUB_ORIGIN, accept: 'application/json' },
  }).catch(() => null);
  if (!response?.ok) return null;
  const user = (await response.json().catch(() => null))?.user;
  if (!user?.id) return null;
  const allowed = user.isOwner === true || user.role === 'owner' || Boolean(user.features?.ai_translation);
  return allowed ? user : null;
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
  // Private: never let a shared/CDN cache hand the file to someone without a ticket.
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: cors['access-control-allow-origin'] ? 204 : 403, headers: cors });
    if (url.pathname === '/health') return json({ ok: true }, 200, cors);

    // Called server-to-server by the Vercel function, never by browsers directly.
    if (url.pathname === '/v1/ticket' && request.method === 'POST') {
      const user = await lilyHubUser(request.headers.get('x-lily-cookie') || '', env);
      if (!user) return json({ error: 'FORBIDDEN' }, 403);
      return json(await createTicket(user.id, env), 200);
    }

    if (url.pathname.startsWith('/m/') && (request.method === 'GET' || request.method === 'HEAD')) {
      if (!await validTicket(request.headers.get('x-lily-ticket') || '', env)) return json({ error: 'UNAUTHORIZED' }, 401, cors);
      // transformers.js asks for "<model>/resolve/<revision>/<file>" unless the path template
      // is overridden; accept both so a config slip cannot break loading.
      const key = decodeURIComponent(url.pathname.slice(3)).replace(/^([^/]+)\/resolve\/[^/]+\//, '$1/');
      if (!MODEL_PREFIX.test(key) || key.includes('..')) return json({ error: 'BAD_PATH' }, 400, cors);
      return serveModelFile(request, env, key, cors);
    }
    return json({ error: 'NOT_FOUND' }, 404, cors);
  },
};
