import assert from 'node:assert/strict';
import websiteProxy, { validateTarget, isPublicAddress, fetchPublic } from '../server/website-proxy.mjs';
import { WordPressAdapter } from '../src/book-engine/website-importer/adapters/WordPressAdapter';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { safeFetch } from '../src/book-engine/website-importer/safe-fetch';
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
console.log('Website import: source/IP validation, proxy HTTP/routing, cancellation, Wattpad content tests passed');

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

// Public Docs, custom WordPress Pages, removed source rejection.
const { GoogleDocsAdapter } = await import('../src/book-engine/website-importer/adapters/GoogleDocsAdapter');
const { WebsiteImporter } = await import('../src/book-engine/website-importer/WebsiteImporter');
for (const url of ['https://tiguaien.blog/wp-json/wp/v2/pages', 'https://docs.google.com/document/d/test/export?format=txt', 'https://docs.google.com/document/d/e/test/pub']) assert.doesNotThrow(() => validateTarget(url));
for (const url of ['https://tiguaien.blog.evil.test/', 'https://docs.google.com.evil.test/document/d/test/export', 'https://docs.google.com/url?q=https://evil.test/', 'https://docs.google.com/spreadsheets/d/test/export', 'https://accounts.google.com/']) assert.throws(() => validateTarget(url));
try {
  const docs = new GoogleDocsAdapter();
  assert.equal(WebsiteImporter.getAdapter('https://docs.google.com/document/d/test/edit').name, 'google-docs');
  const calls: string[] = [];
  globalThis.fetch = async (url) => { calls.push(String(url)); return new Response('\uFEFFChương một\r\nNội dung tiếng Việt.\n\nĐoạn hai.', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); };
  const analyzed = await docs.analyze('https://docs.google.com/document/d/test/edit?usp=sharing#heading=x');
  assert.equal(calls[0], 'https://docs.google.com/document/d/test/export?format=txt');
  assert.equal(analyzed.candidateBooks.length, 1);
  assert.equal((await docs.fetchChapterContent(analyzed.candidateBooks[0].chapters[0])).paragraphs.length, 3);
  globalThis.fetch = async () => new Response('<title>Tài liệu thử</title><header>Không nhập</header><div id="contents"><p>Nội dung công khai.</p></div>', { headers: { 'Content-Type': 'text/html' } });
  const published = await docs.fetchChapterContent({ index: 1, title: '', url: 'https://docs.google.com/document/d/e/test/pub' });
  assert.equal(published.title, 'Tài liệu thử');
  assert.equal(published.content.includes('Không nhập'), false);
  assert.ok(published.content.includes('Nội dung công khai.'));
  await assert.rejects(docs.fetchChapterContent({ index: 1, title: '', url: 'https://docs.google.com/document/d/test/edit' }), /quyền truy cập/);
  globalThis.fetch = async () => new Response('Forbidden', { status: 403 });
  await assert.rejects(docs.analyze('https://docs.google.com/document/d/test/edit'), /quyền xem công khai/);
  await assert.rejects(docs.analyze('https://docs.google.com/spreadsheets/d/test/edit'), /tài liệu Google Docs/);
  const wp = new WordPressAdapter();
  const pages = [
    { id: 1, slug: 'home', link: 'https://tiguaien.blog/', title: {rendered: 'Trang chủ'}, content: {rendered: '<p>Xin chào</p>'} },
    { id: 2, slug: 'story', link: 'https://tiguaien.blog/story/', title: {rendered: 'Truyện thử'}, content: {rendered: '<a href="/story/chuong-1">Chương 1</a><a href="/story/chuong-2">Chương 2</a><a href="https://evil.test/chuong-3">Chương 3</a>'} },
    { id: 3, slug: 'chuong-1', link: 'https://tiguaien.blog/story/chuong-1/', title: {rendered: 'Chương 1'}, content: {rendered: '<p>Nội dung</p><a href="/story/chuong-2">Chương 2</a>'} },
  ];
  globalThis.fetch = async url => new Response(JSON.stringify(String(url).includes('/pages?') ? pages : []), {headers: {'Content-Type':'application/json'}});
  const blog = await wp.analyze('https://tiguaien.blog/');
  assert.equal(blog.candidateBooks.length, 1);
  assert.equal(blog.candidateBooks[0].title, 'Truyện thử');
  assert.equal(blog.candidateBooks[0].chapters.length, 2);
  const single = await wp.analyze('https://tiguaien.blog/story/chuong-1/');
  assert.equal(single.candidateBooks[0].chapters.length, 1);
  assert.equal(single.candidateBooks[0].chapters[0].url, 'https://tiguaien.blog/story/chuong-1/');

  const wattpad = new WattpadAdapter();
  globalThis.fetch = async url => String(url).includes('/api/') ? new Response('', {status:503}) : new Response('<h1>Truyện thử</h1><a class="part-title" href="/123-chuong-1"><span>Chương 1</span></a>');
  assert.equal((await wattpad.analyze('https://www.wattpad.com/story/456')).candidateBooks[0].chapters.length, 1);
  globalThis.fetch = async url => new Response(String(url).includes('page=2') ? '<p data-p-id="2">Trang hai.</p>' : '<p data-p-id="1">Trang một.</p><a href="?page=2" rel="next">Tiếp</a>');
  const chapter = {index:1,title:'Chương 1',url:'https://www.wattpad.com/123-chuong-1'};
  assert.deepEqual((await wattpad.fetchChapterContent(chapter)).paragraphs, ['Trang một.', 'Trang hai.']);
  globalThis.fetch = async url => String(url).includes('page=2') ? new Response('Blocked', {status:403}) : new Response('<p data-p-id="1">Trang một.</p><a href="?page=2" rel="next">Tiếp</a>');
  await assert.rejects(wattpad.fetchChapterContent(chapter), /tránh thiếu nội dung/);
} finally { globalThis.fetch = originalFetch; }
console.log('Docs/public access, custom blog Pages, Wattpad TOC and multi-page regressions passed');

// Wattpad's current SSR layout has no legacy TOC anchors.
const { readWattpadLoader } = await import('../src/book-engine/website-importer/wattpad-state');
const remix = { state: { loaderData: { 'routes/story.$storyid': { story: {
  id: '414318417', title: 'Truyện thử } có "dấu"', user: { name: 'Tác giả' },
  parts: [{ id: 1646719809, title: 'Văn án', url: 'https://www.wattpad.com/1646719809' }, { id: 1646719810, title: 'Chương 1', url: 'https://www.wattpad.com/1646719810' }],
} } } } };
const ssr = `<script>window.__remixContext = ${JSON.stringify(remix)}; throw new Error('must never execute');</script>`;
assert.equal(readWattpadLoader(ssr, 'routes/story.$storyid').story.id, '414318417');
assert.equal(readWattpadLoader('<script>window.__remixContext = {invalid};</script>', 'routes/story.$storyid'), undefined);
try {
  const requested: string[] = [];
  globalThis.fetch = async url => { requested.push(String(url)); return new Response(ssr); };
  const book = (await new WattpadAdapter().analyze('https://www.wattpad.com/story/414318417')).candidateBooks[0];
  assert.equal(book.chapters.length, 2);
  assert.equal(book.author, 'Tác giả');
  assert.equal(requested.length, 1);
  assert.equal(requested[0], 'https://www.wattpad.com/story/414318417');
} finally { globalThis.fetch = originalFetch; }
console.log('Wattpad public Remix discovery and non-executable JSON parsing passed');

for (const url of ['https://adachisensei.my.canva.site/', 'https://www.canva.com/design/test', 'https://wdoiquan.com/stories/test']) {
  assert.throws(() => WebsiteImporter.getAdapter(url), /Không nhận diện/);
  assert.throws(() => validateTarget(url));
}

// Google Docs TXT export redirects to a narrowly scoped, ephemeral download host.
const exportUrl = new URL('https://docs.google.com/document/d/test/export?format=txt');
const downloadUrl = 'https://doc-0s-48-docstext.googleusercontent.com/export/test-token';
const redirectTransport = (location: string, privateDownload = false) => ({
  lookup: async (host: string) => [{address: privateDownload && host.endsWith('.googleusercontent.com') ? '127.0.0.1' : '8.8.8.8', family: 4}],
  request: (url: URL, options: any, callback: any) => {
    assert.equal(options.headers.Cookie, undefined);
    assert.equal(options.headers.Authorization, undefined);
    const req = new EventEmitter() as any;
    req.end = () => {
      const isDownload = url.hostname.endsWith('.googleusercontent.com');
      const response = Readable.from(isDownload ? [Buffer.from('Nội dung thử nghiệm.')] : []) as any;
      response.statusCode = isDownload ? 200 : 307;
      response.headers = isDownload ? {'content-type':'text/plain; charset=utf-8'} : {location};
      callback(response);
    };
    return req;
  },
});
const activeSignal = new AbortController().signal;
const exported = await fetchPublic(exportUrl, activeSignal, 0, redirectTransport(downloadUrl));
assert.equal(exported.status, 200);
assert.equal(exported.body.toString(), 'Nội dung thử nghiệm.');
assert.throws(() => validateTarget(downloadUrl));
await assert.rejects(fetchPublic(new URL(downloadUrl), activeSignal, 0, redirectTransport(downloadUrl)), /UNSUPPORTED_SOURCE/);
await assert.rejects(fetchPublic(exportUrl, activeSignal, 0, redirectTransport(downloadUrl, true)), /UNSUPPORTED_SOURCE/);
for (const target of [
  'https://doc-0s-48-docstext.googleusercontent.com.evil.test/export/token',
  'https://arbitrary.googleusercontent.com/export/token',
  'https://doc-0s-48-docstext.googleusercontent.com/other/token',
  'http://doc-0s-48-docstext.googleusercontent.com/export/token',
  'https://user:pass@doc-0s-48-docstext.googleusercontent.com/export/token',
  'https://accounts.google.com/login',
]) await assert.rejects(fetchPublic(exportUrl, activeSignal, 0, redirectTransport(target)), /UNSUPPORTED_SOURCE/);
for (const source of ['https://example.wordpress.com/', 'https://docs.google.com/document/d/test/pub', 'https://docs.google.com/document/d/test/export?format=pdf']) {
  await assert.rejects(fetchPublic(new URL(source), activeSignal, 0, redirectTransport(downloadUrl)), /UNSUPPORTED_SOURCE/);
}
console.log('Google Docs TXT redirects: success, direct-target denial, origin/host/path restrictions and private DNS denial passed');
