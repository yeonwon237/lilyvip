// Node's safeFetch() calls global fetch directly (typeof window === 'undefined'),
// so stubbing globalThis.fetch — same pattern as scripts/test-website-import.ts —
// exercises JjwxcAdapter without any real network call to jjwxc.net.
import assert from 'node:assert/strict';
import { JjwxcAdapter } from '../../website-importer/adapters/JjwxcAdapter';
import { PURCHASED_CHAPTER_HTML, LOCKED_CHAPTER_HTML, SESSION_EXPIRED_HTML, TOC_OK_HTML, UNKNOWN_FORMAT_HTML } from '../JjwxcDevFixtures';

const originalFetch = globalThis.fetch;
let totalTests = 0;
let passedTests = 0;

function check(condition: boolean, name: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    process.exitCode = 1;
  }
}

const adapter = new JjwxcAdapter();

console.log('\n=== JjwxcAdapter.canHandle ===');
check(adapter.canHandle('https://wap.jjwxc.net/book2/9209789'), 'canHandle true for a valid JJWXC book URL');
check(!adapter.canHandle('https://wattpad.com/story/123'), 'canHandle false for an unrelated site');
check(!adapter.canHandle('not a url'), 'canHandle false for garbage input');

console.log('\n=== JjwxcAdapter.analyze: public TOC ===');
try {
  globalThis.fetch = async () => new Response(TOC_OK_HTML, { headers: { 'Content-Type': 'text/html' } });
  const result = await adapter.analyze('https://wap.jjwxc.net/book2/9209789');
  const book = result.candidateBooks[0];
  check(book.title === '示例小说', 'analyze extracts the book title from the TOC page');
  check(book.author === '某作者', 'analyze extracts the author');
  check(book.chapters.length === 4, 'analyze extracts the 3 free + 1 VIP chapters from the full (?more=0&whole=1) TOC');
  check(book.chapters[0].url === 'https://wap.jjwxc.net/book2/1/1', 'chapter URLs are resolved to absolute URLs');
  check(book.adapterName === 'jjwxc', 'candidate book is tagged with the jjwxc adapter name');
} finally { globalThis.fetch = originalFetch; }

console.log('\n=== JjwxcAdapter.analyze: refuses to guess on locked/expired/unknown TOC ===');
for (const [label, html] of [['session_expired', SESSION_EXPIRED_HTML], ['unknown_format', UNKNOWN_FORMAT_HTML]] as const) {
  try {
    globalThis.fetch = async () => new Response(html, { headers: { 'Content-Type': 'text/html' } });
    await assert.rejects(() => adapter.analyze('https://wap.jjwxc.net/book2/9209789'));
    totalTests++; passedTests++;
    console.log(`  ✓ PASS: analyze() rejects for a ${label} TOC page instead of importing an empty/wrong book`);
  } finally { globalThis.fetch = originalFetch; }
}

console.log('\n=== JjwxcAdapter.fetchChapterContent: free chapter succeeds ===');
try {
  globalThis.fetch = async () => new Response(PURCHASED_CHAPTER_HTML, { headers: { 'Content-Type': 'text/html' } });
  const result = await adapter.fetchChapterContent({ index: 1, title: 'C1', url: 'https://wap.jjwxc.net/onebook.php?novelid=1&chapterid=1' });
  check(result.paragraphs.length === 3, 'fetchChapterContent returns the free chapter paragraphs');
  check(result.wordCount > 0, 'fetchChapterContent computes a non-zero word count');
  check(result.content === result.paragraphs.join('\n\n'), 'content is the paragraphs joined with blank lines');
} finally { globalThis.fetch = originalFetch; }

console.log('\n=== JjwxcAdapter.fetchChapterContent: VIP/locked chapter fails instead of importing a stub ===');
try {
  // Anonymously, JJWXC shows the same /my/login prompt for VIP/locked content
  // as for "not logged in" — this fixture matches that real page shape.
  globalThis.fetch = async () => new Response(LOCKED_CHAPTER_HTML, { headers: { 'Content-Type': 'text/html' } });
  await assert.rejects(
    () => adapter.fetchChapterContent({ index: 4, title: 'C4', url: 'https://wap.jjwxc.net/vip/1/4?ctime=1' }),
    /đăng nhập/,
  );
  totalTests++; passedTests++;
  console.log('  ✓ PASS: a VIP/locked chapter throws (ChapterFetchQueue marks it failed) instead of bypassing the paywall');
} finally { globalThis.fetch = originalFetch; }

console.log('\n=== JjwxcAdapter.fetchChapterContent: session_expired/unknown_format also fail closed ===');
for (const [label, html] of [['session_expired', SESSION_EXPIRED_HTML], ['unknown_format', UNKNOWN_FORMAT_HTML]] as const) {
  try {
    globalThis.fetch = async () => new Response(html, { headers: { 'Content-Type': 'text/html' } });
    await assert.rejects(() => adapter.fetchChapterContent({ index: 1, title: 'C', url: 'https://wap.jjwxc.net/book2/1/1' }));
    totalTests++; passedTests++;
    console.log(`  ✓ PASS: a ${label} chapter page throws rather than being saved as empty/wrong content`);
  } finally { globalThis.fetch = originalFetch; }
}

console.log('\n=== JjwxcCookieStorage: get, set, clear, sanitize ===');
import { JjwxcCookieStorage } from '../JjwxcCookieStorage';
JjwxcCookieStorage.setCookie('  sid=test_session_123;\r\n token=abc;  ');
check(JjwxcCookieStorage.getCookie() === 'sid=test_session_123; token=abc;', 'JjwxcCookieStorage strips newlines and trims whitespace');

check(JjwxcCookieStorage.hasCookie() === true, 'hasCookie() is true when cookie is set');
JjwxcCookieStorage.clearCookie();
check(JjwxcCookieStorage.getCookie() === '', 'clearCookie() clears the stored cookie');
check(JjwxcCookieStorage.hasCookie() === false, 'hasCookie() is false when cookie is cleared');

console.log('\n=== JjwxcAdapter.fetchChapterContent: purchased VIP chapter with cookie succeeds ===');
try {
  globalThis.fetch = async () => new Response(PURCHASED_CHAPTER_HTML, { headers: { 'Content-Type': 'text/html' } });
  const result = await adapter.fetchChapterContent({ index: 24, title: 'C24', url: 'https://wap.jjwxc.net/vip/9209789/24?ctime=1' });
  check(result.paragraphs.length === 3, 'VIP chapter paragraphs extracted successfully when authenticated');
  check(result.wordCount > 0, 'VIP chapter computed word count is > 0');
} finally { globalThis.fetch = originalFetch; }

console.log('\n=== JjwxcChapterExtractor.extractAsync: automatic AES decryption for encrypted VIP chapters ===');
import { JjwxcChapterExtractor } from '../JjwxcChapterExtractor';
const ENCRYPTED_VIP_FIXTURE = `
<html>
<head><title>Chapter 1</title></head>
<body>
<h2 class="big o">1、第 1 章 密文测试</h2>
<ul class="content_ul"><span class="loading">vip内容加载中...</span></ul>
<div id="contentvars" style="display: none">
  <input type="hidden" name="novelid" value="100">
  <input type="hidden" name="chapterid" value="1">
  <input type="hidden" name="readerid" value="12345">
  <input type="hidden" name="accessKey" value="testkey">
  <input type="hidden" name="cryptInfo" value="UBpr48mSkHsfG1KyYUdP4t1VvYAjHB6xDh1G93ePjx5WqC0gYaSxqRsdDkybWpHCNG4oAwRaQtYyxniVd2F6Vun5LPqy71Sc3qlQ3TlLVdOPGHNW3rze24/S/AXeIytW">
  <input type="hidden" name="content" value="6Un/ro7eHDRaQhugURFAIfIuuuEt1CO96rJ/TVAcvD5C97OGVO4uYcfMcGPVYdZtoAGIYPS3+3YkhnTc6yVypA==">
</div>
</body>
</html>
`;
{
  const res = await JjwxcChapterExtractor.extractAsync(ENCRYPTED_VIP_FIXTURE);
  check(res.status === 'ok', 'extractAsync successfully decrypts encrypted VIP chapter');
  check(res.title === '1、第 1 章 密文测试', 'extracts title from encrypted VIP chapter');
  check(res.paragraphs.length === 2, 'extracts decrypted body paragraphs');
  check(res.paragraphs[0] === '第一段VIP测试内容。', 'decrypted content matches plaintext paragraph 1');
  check(res.paragraphs[1] === '第二段VIP测试内容。', 'decrypted content matches plaintext paragraph 2');
}

console.log(`\n${passedTests}/${totalTests} JjwxcAdapter tests passed`);
if (passedTests !== totalTests) process.exitCode = 1;


