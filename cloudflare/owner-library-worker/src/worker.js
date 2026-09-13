const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const BOOK_PREFIX = 'books/';
const SHARE_PREFIX = 'shares/';
const CATALOG_KEY = 'catalog/books-v1.json';
const PAGE_SIZE = 20;

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

const safeId = value => /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value || '');
const bookKey = id => `${BOOK_PREFIX}${id}/content`;

const bytesToBase64Url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const textToBase64Url = text => bytesToBase64Url(new TextEncoder().encode(text));
const signValue = async (value, secret) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))));
};
const constantTimeEqual = (left, right) => {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
};
const createAdminSession = async env => {
  const payload = textToBase64Url(JSON.stringify({ role: 'owner', exp: Date.now() + 12 * 60 * 60 * 1000 }));
  return `${payload}.${await signValue(payload, env.SESSION_SIGNING_KEY)}`;
};
const validAdminSession = async (token, env) => {
  if (!token || !env.SESSION_SIGNING_KEY) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;
  const expected = await signValue(payload, env.SESSION_SIGNING_KEY);
  if (!constantTimeEqual(signature, expected)) return false;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0))));
    return parsed.role === 'owner' && Number(parsed.exp) > Date.now();
  } catch { return false; }
};

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
    'access-control-allow-headers': 'authorization, content-type, x-book-title, x-book-author, x-book-format, x-book-cover-url, x-book-cover-color',
    'access-control-expose-headers': 'content-length, content-type, etag, x-book-title, x-book-author, x-book-format',
    'access-control-max-age': '86400',
    vary: 'Origin',
  } : {};
};

const unauthorized = headers => json({ error: 'UNAUTHORIZED' }, 401, headers);

const hasOwnerAccess = async (request, env) => {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (env.OWNER_KEY && token === env.OWNER_KEY) return true;
  return validAdminSession(token, env);
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

const effectiveShareExpiry = share => share.expiresAt || (share.createdAt ? new Date(new Date(share.createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString() : null);
const effectiveMaxUses = share => Math.max(1, Number.parseInt(share.maxUses, 10) || 1);

async function listShares(env) {
  const shares = [];
  let cursor;
  for (let page = 0; page < 100; page += 1) {
    const listed = await env.LIBRARY.list({ prefix: SHARE_PREFIX, limit: 100, cursor });
    for (const object of listed.objects) {
      if (!object.key.endsWith('.json')) continue;
      const stored = await env.LIBRARY.get(object.key);
      const share = stored ? await stored.json().catch(() => null) : null;
      if (!share?.bookId) continue;
      const expiresAt = effectiveShareExpiry(share);
      const maxUses = effectiveMaxUses(share);
      const usedCount = Math.max(0, Number.parseInt(share.usedCount, 10) || 0);
      shares.push({
        id: object.key.slice(SHARE_PREFIX.length).replace(/\.json$/, ''),
        bookId: share.bookId,
        createdAt: share.createdAt || object.uploaded,
        expiresAt,
        maxUses,
        usedCount,
        remainingUses: Math.max(0, maxUses - usedCount),
        status: expiresAt && new Date(expiresAt) <= new Date() ? 'expired' : usedCount >= maxUses ? 'used' : 'active',
      });
    }
    if (!listed.truncated) break;
    cursor = listed.cursor;
  }
  return shares.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

const metadataFromRequest = request => ({
  title: encodeURIComponent(decodeMetadataValue((request.headers.get('x-book-title') || '').slice(0, 300))),
  author: encodeURIComponent(decodeMetadataValue((request.headers.get('x-book-author') || '').slice(0, 200))),
  format: (request.headers.get('x-book-format') || 'binary').slice(0, 20),
  coverUrl: encodeURIComponent((request.headers.get('x-book-cover-url') || '').slice(0, 1500)),
  coverColor: (request.headers.get('x-book-cover-color') || '#D9829B').slice(0, 20),
});

const decodeMetadataValue = value => {
  let decoded = String(value || '');
  for (let pass = 0; pass < 3; pass += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch { break; }
  }
  return decoded;
};

const decodedMetadata = metadata => ({
  title: decodeMetadataValue(metadata?.title),
  author: decodeMetadataValue(metadata?.author),
  format: metadata?.format || 'binary',
  coverUrl: decodeMetadataValue(metadata?.coverUrl),
  coverColor: metadata?.coverColor || '#D9829B',
});

const normalizeSearch = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

async function rebuildCatalog(env) {
  const objects = [];
  let cursor;
  for (let page = 0; page < 100; page += 1) {
    const listed = await env.LIBRARY.list({ prefix: BOOK_PREFIX, limit: 100, include: ['customMetadata'], cursor });
    objects.push(...listed.objects);
    if (!listed.truncated) break;
    if (!listed.cursor || listed.cursor === cursor) throw new Error('INVALID_R2_CURSOR');
    cursor = listed.cursor;
  }
  const books = objects.filter(object => object.key.endsWith('/content')).map(object => ({
    id: object.key.slice(BOOK_PREFIX.length).replace(/\/content$/, ''),
    size: object.size,
    uploaded: object.uploaded,
    ...decodedMetadata(object.customMetadata),
  })).sort((a, b) => String(b.uploaded).localeCompare(String(a.uploaded)));
  const catalog = { version: 1, updatedAt: new Date().toISOString(), books };
  await env.LIBRARY.put(CATALOG_KEY, JSON.stringify(catalog), { httpMetadata: { contentType: 'application/json' } });
  return catalog;
}

async function loadCatalog(env) {
  const stored = await env.LIBRARY.get(CATALOG_KEY);
  if (stored) {
    const parsed = await stored.json().catch(() => null);
    if (parsed?.version === 1 && Array.isArray(parsed.books)) return parsed;
  }
  return rebuildCatalog(env);
}

async function saveCatalog(env, books) {
  const catalog = { version: 1, updatedAt: new Date().toISOString(), books };
  await env.LIBRARY.put(CATALOG_KEY, JSON.stringify(catalog), { httpMetadata: { contentType: 'application/json' } });
  return catalog;
}

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
  if (request.method === 'POST' && path === '/v1/admin/session') {
    if (!env.ADMIN_LOGIN_KEY || !env.SESSION_SIGNING_KEY) return json({ error: 'ADMIN_AUTH_NOT_CONFIGURED' }, 503, headers);
    const body = await request.json().catch(() => ({}));
    if (!constantTimeEqual(String(body.key || ''), String(env.ADMIN_LOGIN_KEY))) return unauthorized(headers);
    return json({ token: await createAdminSession(env), expiresIn: 43200 }, 200, headers);
  }
  if (!await hasOwnerAccess(request, env)) return unauthorized(headers);

  if (request.method === 'GET' && path === '/v1/admin/books') {
    const url = new URL(request.url);
    const requestedPage = Math.max(1, Math.min(100000, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1));
    const query = normalizeSearch(url.searchParams.get('q'));
    const catalog = await loadCatalog(env);
    const filtered = query ? catalog.books.filter(book => normalizeSearch(`${book.title} ${book.author}`).includes(query)) : catalog.books;
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const totalBytes = catalog.books.reduce((sum, book) => sum + Number(book.size || 0), 0);
    return json({
      books: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      page,
      pageSize: PAGE_SIZE,
      totalPages,
      matchedCount: filtered.length,
      totalCount: catalog.books.length,
      totalBytes,
      updatedAt: catalog.updatedAt,
      knownBooks: catalog.books.map(book => ({ id: book.id, title: book.title })),
    }, 200, headers);
  }

  if (request.method === 'POST' && path === '/v1/admin/catalog/rebuild') {
    const catalog = await rebuildCatalog(env);
    return json({ ok: true, totalCount: catalog.books.length }, 200, headers);
  }

  if (request.method === 'POST' && path === '/v1/admin/catalog/deduplicate') {
    const body = await request.json().catch(() => ({}));
    if (body.confirm !== 'KEEP_NEWEST_BY_TITLE_AND_AUTHOR') return json({ error: 'CONFIRMATION_REQUIRED' }, 400, headers);
    const catalog = await loadCatalog(env);
    const groups = new Map();
    for (const book of catalog.books) {
      const identity = `${normalizeSearch(book.title)}\u0000${normalizeSearch(book.author)}`;
      const group = groups.get(identity) || [];
      group.push(book);
      groups.set(identity, group);
    }
    const kept = [];
    const removed = [];
    for (const group of groups.values()) {
      group.sort((a, b) => String(b.uploaded).localeCompare(String(a.uploaded)));
      kept.push(group[0]);
      removed.push(...group.slice(1));
    }
    const keys = removed.flatMap(book => [bookKey(book.id), `${BOOK_PREFIX}${book.id}/cover`]);
    for (let index = 0; index < keys.length; index += 500) await env.LIBRARY.delete(keys.slice(index, index + 500));
    await saveCatalog(env, kept.sort((a, b) => String(b.uploaded).localeCompare(String(a.uploaded))));
    return json({
      ok: true,
      removedCount: removed.length,
      removedBytes: removed.reduce((sum, book) => sum + Number(book.size || 0), 0),
      remainingCount: kept.length,
    }, 200, headers);
  }

  if (request.method === 'GET' && path === '/v1/admin/shares') {
    return json({ shares: await listShares(env) }, 200, headers);
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
      const catalog = await loadCatalog(env);
      const metadata = decodedMetadata(metadataFromRequest(request));
      const record = { id, size: length || Number((await env.LIBRARY.head(key))?.size || 0), uploaded: new Date().toISOString(), ...metadata };
      await saveCatalog(env, [record, ...catalog.books.filter(book => book.id !== id)]);
      return json({ ok: true, id, etag: stored.httpEtag }, 201, headers);
    }

    if (request.method === 'GET') {
      const object = await env.LIBRARY.get(key);
      return object ? serveObject(object, headers) : json({ error: 'BOOK_NOT_FOUND' }, 404, headers);
    }

    if (request.method === 'DELETE') {
      await env.LIBRARY.delete([key, `${BOOK_PREFIX}${id}/cover`]);
      const catalog = await loadCatalog(env);
      await saveCatalog(env, catalog.books.filter(book => book.id !== id));
      return json({ ok: true }, 200, headers);
    }
  }

  const shareCreateMatch = path.match(/^\/v1\/admin\/books\/([^/]+)\/shares$/);
  if (request.method === 'POST' && shareCreateMatch) {
    const id = decodeURIComponent(shareCreateMatch[1]);
    if (!safeId(id)) return json({ error: 'INVALID_BOOK_ID' }, 400, headers);
    if (!await env.LIBRARY.head(bookKey(id))) return json({ error: 'BOOK_NOT_FOUND' }, 404, headers);

    const options = await request.json().catch(() => ({}));
    const maxUses = Number.parseInt(options.maxUses ?? 1, 10);
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 50) return json({ error: 'INVALID_MAX_USES' }, 400, headers);
    const expiresInHours = Number(options.expiresInHours ?? 24);
    if (!Number.isFinite(expiresInHours) || expiresInHours < 1 || expiresInHours > 168) return json({ error: 'INVALID_EXPIRY' }, 400, headers);
    const expiresAt = options.expiresAt ? new Date(options.expiresAt) : new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) {
      return json({ error: 'INVALID_EXPIRY' }, 400, headers);
    }
    const code = newShareCode();
    const hash = await hashShareCode(code);
    await env.LIBRARY.put(`${SHARE_PREFIX}${hash}.json`, JSON.stringify({
      bookId: id,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      maxUses,
      usedCount: 0,
    }), { httpMetadata: { contentType: 'application/json' } });
    return json({ code, id: hash, expiresAt: expiresAt.toISOString(), maxUses, usedCount: 0 }, 201, headers);
  }

  const shareDeleteMatch = path.match(/^\/v1\/admin\/shares\/([^/]+)$/);
  if (request.method === 'DELETE' && shareDeleteMatch) {
    const value = decodeURIComponent(shareDeleteMatch[1]);
    const hash = /^[a-f0-9]{64}$/.test(value) ? value : await hashShareCode(value);
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
  const shareKey = `${SHARE_PREFIX}${hash}.json`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const shareObject = await env.LIBRARY.get(shareKey);
    if (!shareObject) return json({ error: 'SHARE_NOT_FOUND' }, 404, headers);
    const share = await shareObject.json();
    const expiresAt = effectiveShareExpiry(share);
    if (expiresAt && new Date(expiresAt) <= new Date()) return json({ error: 'SHARE_EXPIRED' }, 410, headers);
    const maxUses = effectiveMaxUses(share);
    const usedCount = Math.max(0, Number.parseInt(share.usedCount, 10) || 0);
    if (usedCount >= maxUses) return json({ error: 'SHARE_LIMIT_REACHED' }, 410, headers);
    const object = await env.LIBRARY.get(bookKey(share.bookId));
    if (!object) return json({ error: 'BOOK_NOT_FOUND' }, 404, headers);
    const updated = { ...share, expiresAt, maxUses, usedCount: usedCount + 1, lastUsedAt: new Date().toISOString() };
    const stored = await env.LIBRARY.put(shareKey, JSON.stringify(updated), {
      onlyIf: { etagMatches: shareObject.etag },
      httpMetadata: { contentType: 'application/json' },
    });
    if (stored) return serveObject(object, headers);
  }
  return json({ error: 'SHARE_BUSY_RETRY' }, 409, headers);
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
