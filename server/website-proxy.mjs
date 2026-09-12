import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';

const domains = ['wordpress.com', 'wp.com', 'blogspot.com', 'wikicv.org', 'wikicv.net', 'wikidich.net', 'wikidich.com', 'wikidich3.com', 'wikidich.me', 'wikidth.net', 'wikidth.com', 'wattpad.com', 'noveltoon.vn', 'tiguaien.blog'];
// A verified source owner can be opted out immediately in production without
// shipping a new client. Use a comma-separated list of exact domains; their
// subdomains are blocked as well. Redirect targets go through this same check.
const blockedSourceDomains = String(process.env.LILY_BLOCKED_SOURCE_DOMAINS || '')
  .split(',')
  .map(domain => domain.trim().toLowerCase().replace(/^\.+|\.+$/g, ''))
  .filter(Boolean);

function matchesDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function isBlockedSource(hostname, denylist = blockedSourceDomains) {
  const normalized = String(hostname || '').toLowerCase().replace(/\.$/, '');
  return denylist.some(domain => matchesDomain(normalized, domain));
}
// Export URLs contain ephemeral tokens. Accept them only as a redirect from
// Google Docs TXT export, never as user-supplied proxy targets.
function isDocsTextDownload(url) {
  return /^doc-[a-z0-9-]+-docstext\.googleusercontent\.com$/.test(url.hostname) && url.pathname.startsWith('/export/');
}
export function validateTarget(raw) { return validateUrl(raw, false, false); }
function validateUrl(raw, allowDocsTextDownload, allowNotionApi = false) {
  const url = new URL(raw);
  const isLilyManifest = url.pathname === '/.well-known/lily-reader.json' || url.pathname.endsWith('/lily-reader.json');
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || isBlockedSource(url.hostname) ||
      !(domains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`)) ||
        isLilyManifest ||
        (allowDocsTextDownload && isDocsTextDownload(url)) ||
        (allowNotionApi && url.hostname === 'www.notion.so' && url.pathname === '/api/v3/loadPageChunk') ||
        (url.hostname === 'drive.google.com' && /^\/drive\/folders\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) ||
        (url.hostname === 'docs.google.com' && /^\/document\/d\/(?:e\/)?[A-Za-z0-9_-]+\/(?:export|pub)(?:\/)?$/.test(url.pathname)))) {
    throw new Error('UNSUPPORTED_SOURCE');
  }
  return url;
}

export function isPublicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)));
  }
  return isIP(address) === 6 && /^[23]/i.test(address);
}

export async function fetchPublic(url, signal, redirects = 0, transport = { lookup, request }) {
  return fetchValidated(url, signal, redirects, transport, false, false);
}
export async function fetchPublicNotionPage(pageRequest, signal, transport = { lookup, request }) {
  const pageId = String(pageRequest?.pageId || '');
  const chunkNumber = Number(pageRequest?.chunkNumber || 0);
  if (!/^[a-f0-9-]{32,36}$/i.test(pageId) || !Number.isInteger(chunkNumber) || chunkNumber < 0 || chunkNumber > 50) throw new Error('UNSUPPORTED_SOURCE');
  const cursor = pageRequest?.cursor && typeof pageRequest.cursor === 'object' ? pageRequest.cursor : { stack: [] };
  const body = JSON.stringify({ pageId, limit: 100, cursor, chunkNumber, verticalColumns: false });
  if (body.length > 10_000) throw new Error('UNSUPPORTED_SOURCE');
  return fetchValidated(new URL('https://www.notion.so/api/v3/loadPageChunk'), signal, 0, transport, false, true, { method: 'POST', body });
}
async function fetchValidated(url, signal, redirects, transport, allowDocsTextDownload, allowNotionApi = false, requestOptions = {}) {
  validateUrl(url.href, allowDocsTextDownload, allowNotionApi);
  const addresses = await transport.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(entry => !isPublicAddress(entry.address))) throw new Error('UNSUPPORTED_SOURCE');
  signal.throwIfAborted();
  // Pin the validated DNS answer; redirects are validated again before requesting.
  const resolved = addresses.find(entry => entry.family === 4) || addresses[0];
  const response = await new Promise((resolve, reject) => {
    const headers = { Accept: 'text/html,application/json,text/plain', 'User-Agent': 'LilyReader/1.0 (+https://my.lilyhub.top/)', 'Accept-Encoding': 'identity' };
    if (requestOptions.method === 'POST') headers['Content-Type'] = 'application/json';
    const req = transport.request(url, {
      signal,
      lookup: (_host, options, callback) => options.all
        ? callback(null, [resolved]) : callback(null, resolved.address, resolved.family),
      method: requestOptions.method || 'GET',
      headers,
    }, resolve);
    req.on('error', reject);
    req.end(requestOptions.body);
  });
  if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
    response.destroy();
    if (redirects >= 3 || !response.headers.location) throw new Error('SOURCE_UNAVAILABLE');
    const next = new URL(response.headers.location, url);
    const fromDocsExport = url.hostname === 'docs.google.com' &&
      /^\/document\/d\/[A-Za-z0-9_-]+\/export\/?$/.test(url.pathname) && url.searchParams.get('format') === 'txt';
    const allowDownload = isDocsTextDownload(next) && (fromDocsExport ||
      (allowDocsTextDownload && next.hostname === url.hostname));
    return fetchValidated(next, signal, redirects + 1, transport, allowDownload, false);
  }
  const type = String(response.headers['content-type'] || '');
  if (!/^(text\/(html|plain)|application\/(json|xhtml\+xml))(?:\s*;|\s*$)/i.test(type)) {
    response.destroy();
    throw new Error('SOURCE_UNAVAILABLE');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of response) {
    size += chunk.length;
    if (size > 4 * 1024 * 1024) { response.destroy(); throw new Error('SOURCE_TOO_LARGE'); }
    chunks.push(chunk);
  }
  return { status: response.statusCode || 502, type, body: Buffer.concat(chunks), pages: response.headers['x-wp-totalpages'] };
}

export default async function websiteProxy(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Lily-Proxy', '1');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  if (!['GET', 'POST'].includes(req.method || '')) { res.statusCode = 405; res.end(); return; }
  if (req.headers['sec-fetch-site'] === 'cross-site') { res.statusCode = 403; res.end(); return; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const disconnected = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', disconnected);
  try {
    const raw = new URL(req.url || '/', 'https://lily.invalid').searchParams.get('url');
    if (req.method === 'POST' && raw !== 'https://www.notion.so/api/v3/loadPageChunk') { res.statusCode = 405; res.end(); return; }
    if (!raw || raw.length > 4096) throw new Error('UNSUPPORTED_SOURCE');
    let result;
    if (req.method === 'POST') {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 10_000) throw new Error('UNSUPPORTED_SOURCE');
        chunks.push(chunk);
      }
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      result = await fetchPublicNotionPage(payload, controller.signal);
    } else {
      result = await fetchPublic(validateTarget(raw), controller.signal);
    }
    res.statusCode = result.status;
    res.setHeader('Content-Type', result.type);
    if (result.pages) res.setHeader('X-WP-TotalPages', result.pages);
    res.end(result.body);
  } catch (error) {
    const code = controller.signal.aborted ? 'SOURCE_TIMEOUT' : error.message === 'UNSUPPORTED_SOURCE' ? 'UNSUPPORTED_SOURCE' : 'SOURCE_UNAVAILABLE';
    res.statusCode = code === 'UNSUPPORTED_SOURCE' ? 400 : code === 'SOURCE_TIMEOUT' ? 504 : 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: code }));
  } finally { clearTimeout(timer); res.off('close', disconnected); }
}
