import assert from 'node:assert/strict';
import websiteProxy, { validateTarget, isPublicAddress, fetchPublic, isBlockedSource } from '../server/website-proxy.mjs';
import { WordPressAdapter } from '../src/book-engine/website-importer/adapters/WordPressAdapter';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { safeFetch } from '../src/book-engine/website-importer/safe-fetch';
import { WattpadAdapter } from '../src/book-engine/website-importer/adapters/WattpadAdapter';
import { parseDynamicIndexConfig, parseWikiCvIndexLinks, WikiCvAdapter } from '../src/book-engine/website-importer/adapters/WikiCvAdapter';
import { NovelToonAdapter, parseNovelToonEpisodes } from '../src/book-engine/website-importer/adapters/NovelToonAdapter';
import { UnavailableFictionSourceAdapter } from '../src/book-engine/website-importer/adapters/UnavailableFictionSourceAdapter';
import { BlogspotAdapter } from '../src/book-engine/website-importer/adapters/BlogspotAdapter';
import { GoogleDriveFolderAdapter, parsePublicDriveDocuments, parsePublicDriveFiles } from '../src/book-engine/website-importer/adapters/GoogleDriveFolderAdapter';
import { NotionAdapter, parseNotionBlocks } from '../src/book-engine/website-importer/adapters/NotionAdapter';
import { LilyManifestAdapter } from '../src/book-engine/website-importer/adapters/LilyManifestAdapter';

for (const url of ['https://127.0.0.1/', 'http://wikicv.org/', 'https://wikicv.org.evil.test/', 'https://user:pass@wikicv.org/', 'https://wikicv.org:444/', 'https://169.254.169.254/', 'https://example.org/']) {
  assert.throws(() => validateTarget(url));
}
assert.equal(validateTarget('https://public-api.wordpress.com/wp/v2/sites/test.wordpress.com').hostname, 'public-api.wordpress.com');
assert.equal(validateTarget('https://publisher.example/.well-known/lily-reader.json').hostname, 'publisher.example');
assert.equal(validateTarget('https://drive.google.com/embeddedfolderview?id=folder_123').hostname, 'drive.google.com');
assert.throws(() => validateTarget('https://drive.google.com/embeddedfolderview?id=folder_123&evil=1'));
assert.equal(validateTarget('https://drive.usercontent.google.com/download?id=drive_file_123&export=download&confirm=t').hostname, 'drive.usercontent.google.com');
assert.throws(() => validateTarget('https://drive.usercontent.google.com/download?id=drive_file_123&export=download&url=https://evil.test'));
assert.throws(() => validateTarget('https://publisher.example/private/catalog.json'));
assert.equal(isBlockedSource('example.wordpress.com', ['example.wordpress.com']), true);
assert.equal(isBlockedSource('www.example.wordpress.com', ['example.wordpress.com']), true);
assert.equal(isBlockedSource('notexample.wordpress.com', ['example.wordpress.com']), false);
for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.1.2', '192.168.1.1', '169.254.169.254', '100.64.1.1', '::1', '::ffff:127.0.0.1', 'fc00::1']) assert.equal(isPublicAddress(ip), false);
assert.equal(isPublicAddress('8.8.8.8'), true);

const originalFetch = globalThis.fetch;
assert.equal(new BlogspotAdapter().canHandle('https://example.blogspot.com/2026/01/muc-luc.html'), true);
assert.equal(new GoogleDriveFolderAdapter().canHandle('https://drive.google.com/drive/folders/abc_123'), true);
assert.equal(new NotionAdapter().canHandle('https://reader.notion.site/Book-6bcfe02493e54f3b82afdcfce5a53172'), true);
assert.deepEqual(parsePublicDriveDocuments('<div aria-label="Chương 1 Google Docs Shared"><div data-id="document_id_123" data-tooltip="Chương 1 Google Docs"></div></div>'), [
  { id: 'document_id_123', title: 'Chương 1' },
]);
assert.deepEqual(parsePublicDriveFiles('<tr data-selectable data-id="drive_file_123"><td><div aria-label="Tên truyện.epub EPUB Shared"></div></td></tr>'), [
  { id: 'drive_file_123', title: 'Tên truyện.epub', format: 'EPUB' },
]);
assert.deepEqual(parsePublicDriveFiles('<div class="flip-entry" id="entry-drive_file_456"><a><img src="https://drive-thirdparty.googleusercontent.com/16/type/application/epub+zip"><div class="flip-entry-title">Truyện đầy đủ.epub</div></a></div>'), [
  { id: 'drive_file_456', title: 'Truyện đầy đủ.epub', format: 'EPUB' },
]);
const notionFixture = parseNotionBlocks('root', {
  root: { id: 'root', type: 'page', properties: { title: [['Truyện Notion']] }, content: ['h1', 'p1', 'h2', 'p2'] },
  h1: { id: 'h1', type: 'header', properties: { title: [['Chương 1']] } },
  p1: { id: 'p1', type: 'text', properties: { title: [['Nội dung một.']] } },
  h2: { id: 'h2', type: 'header', properties: { title: [['Chương 2']] } },
  p2: { id: 'p2', type: 'text', properties: { title: [['Nội dung hai.']] } },
});
assert.equal(notionFixture.title, 'Truyện Notion');
assert.equal(notionFixture.sections.length, 2);
try {
  const manifestText = readFileSync(new URL('../docs/examples/lily-reader.json', import.meta.url), 'utf8');
  globalThis.fetch = async () => new Response(manifestText, { headers: { 'Content-Type': 'application/json' } });
  const manifest = await new LilyManifestAdapter().analyze('https://publisher.example/lily-reader.json');
  assert.equal(manifest.candidateBooks[0].totalChapters, 2);
} finally { globalThis.fetch = originalFetch; }
assert.deepEqual(parseDynamicIndexConfig('<script>var bookId = "book-1"; function fuzzySign(text) { return text.substring(9) + text.substring(0, 9); } var signKey = "secret"; loadBookIndex(0, 501, false);</script>'), {
  bookId: 'book-1', signKey: 'secret', rotation: 9, start: 0, size: 501,
});
assert.deepEqual(parseWikiCvIndexLinks('<a href="/truyen/sach/phan-1-id">Phần 1</a><a href=\'/truyen/sach/chuong-2-id\'><b>Chương 2</b></a>', 'https://wikicv.org'), [
  { url: 'https://wikicv.org/truyen/sach/phan-1-id', title: 'Phần 1' },
  { url: 'https://wikicv.org/truyen/sach/chuong-2-id', title: 'Chương 2' },
]);
assert.deepEqual(parseNovelToonEpisodes(`<script>data = JSON.parse('[{\\"id\\":1,\\"title\\":\\"Chương 1\\",\\"weight\\":1,\\"is_fee\\":false}]');</script>`), [
  { id: 1, title: 'Chương 1', weight: 1, is_fee: false },
]);
assert.equal(new NovelToonAdapter().canHandle('https://noveltoon.vn/vi/detail/142167'), true);
assert.equal(new NovelToonAdapter().canHandle('https://noveltoon.vn.evil.test/vi/detail/142167'), false);
const unavailableSource = new UnavailableFictionSourceAdapter();
assert.equal(unavailableSource.canHandle('https://truyenfull.live/truyen/test'), true);
assert.equal(unavailableSource.canHandle('https://truyenfull.live.evil.test/truyen/test'), false);
await assert.rejects(unavailableSource.analyze('https://truyenfull.live/truyen/test'), /Cloudflare/);
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
    { id: 1, slug: 'home', link: 'https://tiguaien.blog/', title: {rendered: 'Trang chủ'}, content: {rendered: '<p>Xin chào</p><a href="/news/chuong-98">Chương 98</a><a href="/news/chuong-99">Chương 99</a>'} },
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

  const pagedRequests: string[] = [];
  globalThis.fetch = async url => {
    const value = String(url);
    pagedRequests.push(value);
    if (value.includes('/categories?')) return new Response(JSON.stringify([
      { id: 10, name: 'Truyện đủ chương', slug: 'truyen-du-chuong', count: 11 },
      { id: 20, name: 'Ebook tổng hợp', slug: 'ebook-tong-hop', count: 11 },
    ]), { headers: { 'Content-Type': 'application/json' } });
    if (value.includes('/pages?')) return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    const page = Number(new URL(value).searchParams.get('page') || 1);
    return new Response(JSON.stringify([
      { id: page, title: { rendered: `Truyện đủ chương – Chương ${page}` }, slug: `truyen-chuong-${page}`, link: `https://tiguaien.blog/truyen-chuong-${page}/`, date: '2026-01-01', categories: [10], tags: [] },
      { id: 100 + page, title: { rendered: `Tác phẩm tổng hợp ${String.fromCharCode(64 + page)}` }, slug: `tac-pham-${String.fromCharCode(96 + page)}`, link: `https://tiguaien.blog/tac-pham-${String.fromCharCode(96 + page)}/`, date: '2026-01-01', categories: [20], tags: [] },
    ]), { headers: { 'Content-Type': 'application/json', 'x-wp-totalpages': '11' } });
  };
  const pagedBlog = await wp.analyze('https://tiguaien.blog/');
  assert.ok(pagedRequests.some(url => url.includes('page=11&')), 'WordPress discovery reads beyond the old 1,000-post cap');
  assert.equal(pagedBlog.diagnostics.totalPostsDiscovered, 22);
  assert.deepEqual(pagedBlog.candidateBooks.map(book => book.title), ['Truyện đủ chương']);
  assert.equal(pagedBlog.candidateBooks[0].chapters.length, 11);

  globalThis.fetch = async () => new Response(JSON.stringify({ code: 'unauthorized' }), { status: 403 });
  await assert.rejects(wp.analyze('https://private.wordpress.com/'), /chế độ riêng tư/);

  // Some fiction blogs tag posts with shared genre categories instead of one
  // category per book, so a book's chapters can be split across categories.
  // Discovery must not silently drop the chapters that landed elsewhere.
  globalThis.fetch = async url => {
    const value = String(url);
    if (value.includes('/categories?')) return new Response(JSON.stringify([
      { id: 30, name: 'Blog', slug: 'blog', count: 4 },
      { id: 40, name: 'Blog2', slug: 'blog2', count: 5 },
    ]), { headers: { 'Content-Type': 'application/json' } });
    if (value.includes('/pages?')) return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify([
      { id: 1, title: { rendered: 'Sói Trắng – 1' }, slug: 'soi-trang-1', link: 'https://tiguaien.blog/soi-trang-1/', date: '2026-01-01', categories: [30], tags: [] },
      { id: 2, title: { rendered: 'Sói Trắng – 2' }, slug: 'soi-trang-2', link: 'https://tiguaien.blog/soi-trang-2/', date: '2026-01-02', categories: [30], tags: [] },
      { id: 3, title: { rendered: 'Sói Trắng – 3' }, slug: 'soi-trang-3', link: 'https://tiguaien.blog/soi-trang-3/', date: '2026-01-03', categories: [30], tags: [] },
      { id: 4, title: { rendered: 'Sói Trắng – 4' }, slug: 'soi-trang-4', link: 'https://tiguaien.blog/soi-trang-4/', date: '2026-01-04', categories: [30], tags: [] },
      { id: 5, title: { rendered: 'Sói Trắng – 5' }, slug: 'soi-trang-5', link: 'https://tiguaien.blog/soi-trang-5/', date: '2026-01-05', categories: [40], tags: [] },
      { id: 6, title: { rendered: 'Sói Trắng – PN 1' }, slug: 'soi-trang-pn-1', link: 'https://tiguaien.blog/soi-trang-pn-1/', date: '2026-01-06', categories: [40], tags: [] },
      { id: 7, title: { rendered: 'Cáo Lửa – 1' }, slug: 'cao-lua-1', link: 'https://tiguaien.blog/cao-lua-1/', date: '2026-01-07', categories: [40], tags: [] },
      { id: 8, title: { rendered: 'Cáo Lửa – 2' }, slug: 'cao-lua-2', link: 'https://tiguaien.blog/cao-lua-2/', date: '2026-01-08', categories: [40], tags: [] },
      { id: 9, title: { rendered: 'Cáo Lửa – 3' }, slug: 'cao-lua-3', link: 'https://tiguaien.blog/cao-lua-3/', date: '2026-01-09', categories: [40], tags: [] },
    ]), { headers: { 'Content-Type': 'application/json', 'x-wp-totalpages': '1' } });
  };
  const scattered = await wp.analyze('https://tiguaien.blog/soi-trang-1/');
  const soiTrang = scattered.candidateBooks.find(b => b.title === 'Sói Trắng');
  assert.ok(soiTrang, 'Sói Trắng candidate must be discovered');
  assert.equal(soiTrang!.chapters.length, 6, 'chapters scattered across a second shared genre category (including a PN side-story) must still be found');

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
