import assert from 'node:assert/strict';
import websiteProxy, { validateTarget, isPublicAddress, fetchPublic } from '../server/website-proxy.mjs';
import { WordPressAdapter } from '../src/book-engine/website-importer/adapters/WordPressAdapter';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { safeFetch } from '../src/book-engine/website-importer/safe-fetch';
import { CanvaDirectoryAdapter } from '../src/book-engine/website-importer/adapters/CanvaDirectoryAdapter';
import { WattpadAdapter } from '../src/book-engine/website-importer/adapters/WattpadAdapter';
import { WikiCvAdapter } from '../src/book-engine/website-importer/adapters/WikiCvAdapter';

for (const url of ['https://127.0.0.1/', 'http://wikicv.org/', 'https://wikicv.org.evil.test/', 'https://user:pass@wikicv.org/', 'https://wikicv.org:444/', 'https://169.254.169.254/', 'https://example.org/']) {
  assert.throws(() => validateTarget(url));
}
assert.equal(validateTarget('https://public-api.wordpress.com/wp/v2/sites/test.wordpress.com').hostname, 'public-api.wordpress.com');
for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.1.2', '192.168.1.1', '169.254.169.254', '100.64.1.1', '::1', '::ffff:127.0.0.1', 'fc00::1']) assert.equal(isPublicAddress(ip), false);
assert.equal(isPublicAddress('8.8.8.8'), true);

const originalFetch = globalThis.fetch;
try {
  Object.assign(globalThis, { window: {} });
  globalThis.fetch = async () => new Response('<html>Lily app shell</html>');
  await assert.rejects(safeFetch('https://wikicv.org/'), /chưa sẵn sàng/);
  globalThis.fetch = async () => new Response('{}', { status: 504, headers: { 'X-Lily-Proxy': '1' } });
  await assert.rejects(safeFetch('https://wikicv.org/'), /quá lâu/);
  const cancelled = new AbortController(); cancelled.abort();
  globalThis.fetch = async (_url, init) => { init?.signal?.throwIfAborted(); return new Response(''); };
  await assert.rejects(safeFetch('https://wikicv.org/', { signal: cancelled.signal }), { name: 'AbortError' });
  delete (globalThis as any).window;
  globalThis.fetch = async () => new Response('<a href="https://example.wordpress.com/story/?x=1&amp;y=2">Truyện có dấu</a><a href="https://example.notion.site/story">Trang Notion</a><a href="https://evilwordpress.com/truyen">Giả mạo</a>');
  const canva = new CanvaDirectoryAdapter();
  const result = await canva.analyze('https://adachisensei.my.canva.site/');
  assert.equal(result.candidateBooks.length, 0);
  assert.equal(result.externalLinks?.length, 2);
  assert.equal(result.externalLinks?.[0].title, 'Truyện có dấu');
  assert.equal(result.externalLinks?.[0].supported, true);
  assert.equal(result.externalLinks?.[1].supported, false);
  await assert.rejects(canva.fetchChapterContent({ index: 1, title: 'Danh mục', url: 'https://example.notion.site/' }));
  const wattpad = new WattpadAdapter();
  globalThis.fetch = async () => new Response('<html><title>Log In</title><p>Đăng nhập để đọc</p><form id="loginform"></form></html>');
  await assert.rejects(new WordPressAdapter().fetchChapterContent({index:1,title:'Test',url:'https://example.wordpress.com/test'}), /đăng nhập/);
  assert.equal(wattpad.canHandle('https://wattpad.com.evil.test/story/123'), false);
  globalThis.fetch = async () => new Response('<html><h1>Đăng nhập</h1><p>Vui lòng đăng nhập</p></html>');
  await assert.rejects(new WikiCvAdapter().fetchChapterContent({ index: 1, title: 'Chương 1', url: 'https://wikicv.org/truyen/test' }), /chưa có nội dung/);
  await assert.rejects(wattpad.fetchChapterContent({ index: 1, title: 'Chương 1', url: 'https://www.wattpad.com/123' }), /chưa có nội dung/);
  globalThis.fetch = async () => new Response('<p data-p-id="1">Nội dung chương công khai.</p>');
  assert.equal((await wattpad.fetchChapterContent({ index: 1, title: 'Chương 1', url: 'https://www.wattpad.com/123' })).paragraphs.length, 1);
} finally { globalThis.fetch = originalFetch; delete (globalThis as any).window; }
const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const fallback = new RegExp(`^${config.rewrites[0].source}$`);
assert.equal(fallback.test('/api/cors-proxy'), false);
assert.equal(fallback.test('/library'), true);
const server = createServer(websiteProxy);
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const address = server.address() as import('node:net').AddressInfo;
  const endpoint = `http://127.0.0.1:${address.port}/api/cors-proxy`;
  const blocked = await fetch(`${endpoint}?url=http://127.0.0.1/`);
  assert.equal(blocked.status, 400);
  assert.equal(blocked.headers.get('X-Lily-Proxy'), '1');
  assert.equal((await blocked.json()).error, 'UNSUPPORTED_SOURCE');
  assert.equal((await fetch(endpoint, { method: 'POST' })).status, 405);
  assert.equal((await fetch(endpoint, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
} finally { await new Promise<void>(resolve => server.close(() => resolve())); }
console.log('Website import: source/IP validation, proxy HTTP/routing, cancellation, Canva directory and Wattpad content tests passed');

// Public-host/private-DNS and redirects are verified without contacting private networks.
const controller = new AbortController();
for (const address of ['127.0.0.1', '10.0.0.1', '172.31.1.1', '192.168.0.1', '169.254.169.254', '::1', '::ffff:127.0.0.1', 'fe80::1', 'fd00::1']) {
  await assert.rejects(() => fetchPublic(new URL('https://wikicv.org/'), controller.signal, 0, {
    lookup: async () => [{ address, family: address.includes(':') ? 6 : 4 }],
    request: () => { throw new Error('must not reach private host'); },
  }), /UNSUPPORTED_SOURCE/);
}
let requestCount = 0;
const transport = {
  lookup: async () => [{ address: '8.8.8.8', family: 4 }],
  request: (_url: URL, options: any, callback: any) => {
    requestCount++;
    options.lookup('wikicv.org', {}, (error: any, address: string) => { assert.equal(error, null); assert.equal(address, '8.8.8.8'); });
    const req = new EventEmitter() as any;
    req.end = () => { const response = Readable.from([]) as any; response.statusCode = 302; response.headers = { location: 'https://127.0.0.1/' }; callback(response); };
    return req;
  },
};
await assert.rejects(() => fetchPublic(new URL('https://wikicv.org/'), controller.signal, 0, transport), /UNSUPPORTED_SOURCE/);
assert.equal(requestCount, 1);
const oversizedTransport = { ...transport, request: (_url: URL, _options: any, callback: any) => {
  const req = new EventEmitter() as any;
  req.end = () => { const response = Readable.from([Buffer.alloc(4 * 1024 * 1024 + 1)]) as any; response.statusCode = 200; response.headers = { 'content-type': 'text/html' }; callback(response); };
  return req;
} };
await assert.rejects(() => fetchPublic(new URL('https://wikicv.org/'), controller.signal, 0, oversizedTransport), /SOURCE_TOO_LARGE/);
controller.abort();
await assert.rejects(() => fetchPublic(new URL('https://wikicv.org/'), controller.signal, 0, transport), { name: 'AbortError' });
console.log('Proxy integration: private DNS, pinned address, public-to-private redirect, body limit and abort passed');
