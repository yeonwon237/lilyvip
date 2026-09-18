import assert from 'node:assert/strict';
import { JjwxcBookmarklet } from '../JjwxcBookmarklet';

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

console.log('\n=== JjwxcBookmarklet: buildBookmarklet ===');
{
  const callback = 'https://my.lilyhub.top/upload?tab=website';
  const bookmarklet = JjwxcBookmarklet.buildBookmarklet(callback);
  check(bookmarklet.startsWith('javascript:'), 'bookmarklet starts with javascript: prefix');
  check(bookmarklet.includes('document.cookie'), 'bookmarklet references document.cookie');
  check(bookmarklet.includes('sid='), 'bookmarklet checks for sid= cookie session token');
  check(bookmarklet.includes(callback), 'bookmarklet contains callback URL');
  check(bookmarklet.includes('encodeURIComponent(c)'), 'bookmarklet encodes the cookie before appending to hash');
}

console.log('\n=== JjwxcBookmarklet: extractCookieFromHash ===');
{
  // Valid cases
  const validCookie = 'test_token=abc; sid=12345678_abcdef; test2=xyz';
  const hash1 = `#jjwxc_cookie=${encodeURIComponent(validCookie)}`;
  check(JjwxcBookmarklet.extractCookieFromHash(hash1) === validCookie, 'extracts valid cookie with leading #');

  const hash2 = `jjwxc_cookie=${encodeURIComponent(validCookie)}`;
  check(JjwxcBookmarklet.extractCookieFromHash(hash2) === validCookie, 'extracts valid cookie without leading #');

  const hash3 = `#foo=bar&jjwxc_cookie=${encodeURIComponent(validCookie)}&baz=1`;
  check(JjwxcBookmarklet.extractCookieFromHash(hash3) === validCookie, 'extracts cookie when other hash params exist');

  // Invalid cases
  check(JjwxcBookmarklet.extractCookieFromHash('') === null, 'returns null for empty hash');
  check(JjwxcBookmarklet.extractCookieFromHash('#other_hash=value') === null, 'returns null when jjwxc_cookie is missing');
  
  // Missing sid=
  const cookieNoSid = 'token=123; user=alice';
  const hashNoSid = `#jjwxc_cookie=${encodeURIComponent(cookieNoSid)}`;
  check(JjwxcBookmarklet.extractCookieFromHash(hashNoSid) === null, 'rejects cookie that does not contain sid=');
}

console.log(`\n${passedTests}/${totalTests} JjwxcBookmarklet tests passed\n`);
