const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const BOOK_PREFIX = 'books/';
const SHARE_PREFIX = 'shares/';

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

const safeId = value => /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value || '');
const bookKey = id => `${BOOK_PREFIX}${id}/content`;

const allowedOrigin = (request, env) => {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(item => item.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
};

const corsHeaders = (request, env) => {
  const origin = allowedOrigin(request, env);
  return origin ? {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type, x-book-title, x-book-author, x-book-format',
    'access-control-expose-headers': 'content-length, content-type, etag, x-book-title, x-book-author, x-book-format',
    'access-control-max-age': '86400',
    vary: 'Origin',
  } : {};
};

const unauthorized = headers => json({ error: 'UNAUTHORIZED' }, 401, headers);

const hasOwnerAccess = (request, env) => {
  if (!env.OWNER_KEY) return false;
  const authorization = request.headers.get('authorization') || '';
  return authorization.startsWith('Bearer ') && authorization.slice(7) === env.OWNER_KEY;
};

const hashShareCode = async code => {
  const bytes = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
};

const newShareCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const metadataFromRequest = request => ({
  title: encodeURIComponent((request.headers.get('x-book-title') || '').slice(0, 300)),
  author: encodeURIComponent((request.headers.get('x-book-author') || '').slice(0, 200)),
  format: (request.headers.get('x-book-format') || 'binary').slice(0, 20),
});

const decodedMetadata = metadata => ({
  title: decodeURIComponent(metadata?.title || ''),
  author: decodeURIComponent(metadata?.author || ''),
  format: metadata?.format || 'binary',
});

const serveObject = (object, headers) => {
  const metadata = decodedMetadata(object.customMetadata);
  const responseHeaders = new Headers(headers);
  object.writeHttpMetadata(responseHeaders);
  responseHeaders.set('etag', object.httpEtag);
  responseHeaders.set('cache-control', 'private, no-store');
  responseHeaders.set('x-content-type-options', 'nosniff');
  responseHeaders.set('content-disposition', 'attachment');
  responseHeaders.set('x-book-title', encodeURIComponent(metadata.title));
  responseHeaders.set('x-book-author', encodeURIComponent(metadata.author));
  responseHeaders.set('x-book-format', metadata.format);
  return new Response(object.body, { headers: responseHeaders });
};

async function handleAdmin(request, env, path, headers) {
  if (!hasOwnerAccess(request, env)) return unauthorized(headers);

  if (request.method === 'GET' && path === '/v1/admin/books') {
    const listed = await env.LIBRARY.list({ prefix: BOOK_PREFIX, limit: 1000, include: ['customMetadata'] });
    const books = listed.objects.map(object => ({
      id: object.key.slice(BOOK_PREFIX.length).replace(/\/content$/, ''),
      size: object.size,
      uploaded: object.uploaded,
      ...decodedMetadata(object.customMetadata),
    }));
    return json({ books, truncated: listed.truncated }, 200, headers);
  }

  const bookMatch = path.match(/^\/v1\/admin\/books\/([^/]+)$/);
  if (bookMatch) {
    const id = decodeURIComponent(bookMatch[1]);
    if (!safeId(id)) return json({ error: 'INVALID_BOOK_ID' }, 400, headers);
    const key = bookKey(id);

    if (request.method === 'PUT') {
      const length = Number(request.headers.get('content-length') || 0);
      if (length > MAX_UPLOAD_BYTES) return json({ error: 'BOOK_TOO_LARGE', maxBytes: MAX_UPLOAD_BYTES }, 413, headers);
      if (!request.body) return json({ error: 'EMPTY_BOOK' }, 400, headers);
      const stored = await env.LIBRARY.put(key, request.body, {
        httpMetadata: { contentType: request.headers.get('content-type') || 'application/octet-stream' },
        customMetadata: metadataFromRequest(request),
      });
      return json({ ok: true, id, etag: stored.httpEtag }, 201, headers);
    }

    if (request.method === 'GET') {
      const object = await env.LIBRARY.get(key);
      return object ? serveObject(object, headers) : json({ error: 'BOOK_NOT_FOUND' }, 404, headers);
    }

    if (request.method === 'DELETE') {
      await env.LIBRARY.delete(key);
      return json({ ok: true }, 200, headers);
    }
  }

  const shareCreateMatch = path.match(/^\/v1\/admin\/books\/([^/]+)\/shares$/);
  if (request.method === 'POST' && shareCreateMatch) {
    const id = decodeURIComponent(shareCreateMatch[1]);
    if (!safeId(id)) return json({ error: 'INVALID_BOOK_ID' }, 400, headers);
    if (!await env.LIBRARY.head(bookKey(id))) return json({ error: 'BOOK_NOT_FOUND' }, 404, headers);

    const options = await request.json().catch(() => ({}));
    const expiresAt = options.expiresAt ? new Date(options.expiresAt) : null;
    if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) {
      return json({ error: 'INVALID_EXPIRY' }, 400, headers);
    }
    const code = newShareCode();
    const hash = await hashShareCode(code);
    await env.LIBRARY.put(`${SHARE_PREFIX}${hash}.json`, JSON.stringify({
      bookId: id,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt?.toISOString() || null,
    }), { httpMetadata: { contentType: 'application/json' } });
    return json({ code, expiresAt: expiresAt?.toISOString() || null }, 201, headers);
  }

  const shareDeleteMatch = path.match(/^\/v1\/admin\/shares\/([^/]+)$/);
  if (request.method === 'DELETE' && shareDeleteMatch) {
    const hash = await hashShareCode(decodeURIComponent(shareDeleteMatch[1]));
    await env.LIBRARY.delete(`${SHARE_PREFIX}${hash}.json`);
    return json({ ok: true }, 200, headers);
  }

  return json({ error: 'NOT_FOUND' }, 404, headers);
}

async function handleShared(request, env, path, headers) {
  if (request.method !== 'GET') return json({ error: 'METHOD_NOT_ALLOWED' }, 405, headers);
  const match = path.match(/^\/v1\/share\/([^/]+)$/);
  if (!match) return json({ error: 'NOT_FOUND' }, 404, headers);
  const code = decodeURIComponent(match[1]);
  if (!/^[a-zA-Z0-9_-]{20,40}$/.test(code)) return json({ error: 'INVALID_SHARE_CODE' }, 400, headers);

  const hash = await hashShareCode(code);
  const shareObject = await env.LIBRARY.get(`${SHARE_PREFIX}${hash}.json`);
  if (!shareObject) return json({ error: 'SHARE_NOT_FOUND' }, 404, headers);
  const share = await shareObject.json();
  if (share.expiresAt && new Date(share.expiresAt) <= new Date()) {
    return json({ error: 'SHARE_EXPIRED' }, 410, headers);
  }
  const object = await env.LIBRARY.get(bookKey(share.bookId));
  return object ? serveObject(object, headers) : json({ error: 'BOOK_NOT_FOUND' }, 404, headers);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = corsHeaders(request, env);
    if (request.method === 'OPTIONS') {
      return allowedOrigin(request, env)
        ? new Response(null, { status: 204, headers })
        : json({ error: 'ORIGIN_NOT_ALLOWED' }, 403);
    }
    if (url.pathname === '/health') return json({ ok: true, service: 'lily-owner-library' }, 200, headers);
    if (url.pathname.startsWith('/v1/admin/')) return handleAdmin(request, env, url.pathname, headers);
    if (url.pathname.startsWith('/v1/share/')) return handleShared(request, env, url.pathname, headers);
    return json({ error: 'NOT_FOUND' }, 404, headers);
  },
};
