import assert from 'node:assert/strict';
import { JjwxcAccessManager, JjwxcAccessDeniedError } from '../JjwxcAccessManager';
import { JjwxcUrlParser } from '../JjwxcUrlParser';

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

console.log('\n=== JJWXC source: owner gating ===');
// Owner gating: enabled only for isOwner === true while the trial flag stays off.
check(JjwxcAccessManager.isJjwxcConnectEnabled(true) === true, 'owner (isOwner=true) is enabled');
check(JjwxcAccessManager.isJjwxcConnectEnabled(false) === false, 'non-owner (isOwner=false) is disabled');
check(JjwxcAccessManager.isJjwxcConnectEnabled(undefined) === false, 'missing isOwner defaults to disabled');

console.log('\n=== JJWXC source: non-owner route rejection ===');
// JjwxcConnectPage's only guard is `if (!isJjwxcConnectEnabled(user.isOwner)) navigateTo('settings')`,
// so exercising the guard function IS exercising the route-protection decision.
check(!JjwxcAccessManager.isJjwxcConnectEnabled(false), 'non-owner is denied the route (redirect condition true)');
assert.throws(() => JjwxcAccessManager.assertAccess(false), JjwxcAccessDeniedError, 'assertAccess throws for non-owner');
totalTests++; passedTests++;
console.log('  ✓ PASS: assertAccess(false) throws JjwxcAccessDeniedError');
{
  let message = '';
  try {
    JjwxcAccessManager.assertAccess(false);
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  check(/chưa được bật/.test(message), 'non-owner denial message explains the owner-only gate');
}

console.log('\n=== JJWXC source: native-platform guard ===');
// This test runs under tsx in Node, which is neither an Android WebView bridge nor
// an iOS WKWebView bridge, so Capacitor must report "web" / non-native here — the
// same as an ordinary browser tab running the PWA.
check(JjwxcAccessManager.isNativeRuntimeAvailable() === false, 'non-native (Node/browser) environment reports isNativeRuntimeAvailable() === false');
{
  let message = '';
  try {
    JjwxcAccessManager.assertAccess(true); // owner, but still not native
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  check(/chỉ khả dụng trong app di động/.test(message), 'owner on non-native still gets the native-required denial message');
}

console.log('\n=== JJWXC source: parse https://wap.jjwxc.net/book2/9209789 ===');
{
  const parsed = JjwxcUrlParser.parseNovelUrl('https://wap.jjwxc.net/book2/9209789');
  check(parsed !== null, 'parses a valid JJWXC novel URL');
  check(parsed?.novelId === '9209789', 'extracts the correct novelId');
  check(parsed?.hostname === 'wap.jjwxc.net', 'extracts the correct hostname');
}
{
  const parsed = JjwxcUrlParser.parseNovelUrl('  https://wap.jjwxc.net/book2/9209789/  ');
  check(parsed?.novelId === '9209789', 'tolerates surrounding whitespace and a trailing slash');
}

console.log('\n=== JJWXC source: reject non-JJWXC domains ===');
check(JjwxcUrlParser.parseNovelUrl('https://evil.com/book2/9209789') === null, 'rejects an unrelated domain');
check(JjwxcUrlParser.parseNovelUrl('https://wap.jjwxc.net.evil.com/book2/9209789') === null, 'rejects a lookalike hostname suffix trick');
check(JjwxcUrlParser.parseNovelUrl('https://notwap.jjwxc.net/book2/9209789') === null, 'rejects a different JJWXC subdomain not in the allowlist');
check(JjwxcUrlParser.parseNovelUrl('http://wap.jjwxc.net/book2/9209789') === null, 'rejects non-HTTPS even on the right host');
check(JjwxcUrlParser.parseNovelUrl('https://wap.jjwxc.net/book/9209789') === null, 'rejects a path that is not /book2/{id}');
check(JjwxcUrlParser.parseNovelUrl('https://wap.jjwxc.net/book2/abc') === null, 'rejects a non-numeric novelId');
check(JjwxcUrlParser.parseNovelUrl('not a url') === null, 'rejects garbage input without throwing');

console.log(`\n${passedTests}/${totalTests} JJWXC source tests passed`);
if (passedTests !== totalTests) process.exitCode = 1;
