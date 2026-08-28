import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';

const domains = ['wordpress.com', 'wp.com', 'wikicv.org', 'wikicv.net', 'wikidich.net', 'wikidich.com', 'wikidich3.com', 'wikidich.me', 'wikidth.net', 'wikidth.com', 'wattpad.com', 'tiguaien.blog'];
export function validateTarget(raw) {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') ||
      !(domains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`)) ||
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
  validateTarget(url.href);
  const addresses = await transport.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(entry => !isPublicAddress(entry.address))) throw new Error('UNSUPPORTED_SOURCE');
  signal.throwIfAborted();
  // Pin the validated DNS answer; redirects are validated again before requesting.
  const resolved = addresses.find(entry => entry.family === 4) || addresses[0];
  const response = await new Promise((resolve, reject) => {
    const req = transport.request(url, {
      signal,
      lookup: (_host, options, callback) => options.all
        ? callback(null, [resolved]) : callback(null, resolved.address, resolved.family),
      headers: { Accept: 'text/html,application/json,text/plain', 'User-Agent': 'Lily/1.0 WebsiteReader', 'Accept-Encoding': 'identity' },
    }, resolve);
    req.on('error', reject);
    req.end();
  });
  if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
    response.destroy();
    if (redirects >= 3 || !response.headers.location) throw new Error('SOURCE_UNAVAILABLE');
    return fetchPublic(new URL(response.headers.location, url), signal, redirects + 1, transport);
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
  if (req.method !== 'GET') { res.statusCode = 405; res.end(); return; }
  if (req.headers['sec-fetch-site'] === 'cross-site') { res.statusCode = 403; res.end(); return; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const disconnected = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', disconnected);
  try {
    const raw = new URL(req.url || '/', 'https://lily.invalid').searchParams.get('url');
    if (!raw || raw.length > 4096) throw new Error('UNSUPPORTED_SOURCE');
    const result = await fetchPublic(validateTarget(raw), controller.signal);
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
