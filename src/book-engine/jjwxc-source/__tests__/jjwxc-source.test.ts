import { JjwxcAccessManager } from '../JjwxcAccessManager';
import { JjwxcUrlParser } from '../JjwxcUrlParser';
import { TranslationAccessManager } from '../../../translation-engine/TranslationAccessManager';

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

console.log('\n=== JJWXC source: public access ===');
check(JjwxcAccessManager.isJjwxcConnectEnabled(true) === true, 'owner (isOwner=true) is enabled');
check(JjwxcAccessManager.isJjwxcConnectEnabled(false) === true, 'non-owner is enabled');
check(JjwxcAccessManager.isJjwxcConnectEnabled(undefined) === true, 'guest is enabled');
check(JjwxcAccessManager.isJjwxcConnectEnabled({ isOwner: false, features: { jjwxc_import: true } }) === true, 'non-owner with jjwxc_import=true is enabled');
check(JjwxcAccessManager.isJjwxcConnectEnabled({ isOwner: false, features: { jjwxc_import: false } }) === true, 'non-owner without grant is enabled');
check(JjwxcAccessManager.isJjwxcConnectEnabled({ isOwner: false }) === true, 'non-owner without features is enabled');
check(JjwxcAccessManager.isJjwxcConnectEnabled({ isOwner: true, features: { jjwxc_import: false } }) === true, 'owner with jjwxc_import=false is still enabled (owner override)');

console.log('\n=== Translation source: public basic models ===');
check(TranslationAccessManager.isTranslationEnabled(true) === true, 'translation: owner is enabled');
check(TranslationAccessManager.isTranslationEnabled(false) === true, 'translation: non-owner is enabled');
check(TranslationAccessManager.isTranslationEnabled(undefined) === true, 'translation: guest is enabled');
check(TranslationAccessManager.isTranslationEnabled({ isOwner: false, features: { ai_translation: true } }) === true, 'translation: non-owner with ai_translation=true is enabled');
check(TranslationAccessManager.isTranslationEnabled({ isOwner: false, features: { ai_translation: false } }) === true, 'translation: non-owner without grant is enabled');
check(TranslationAccessManager.isTranslationEnabled({ isOwner: true, features: { ai_translation: false } }) === true, 'translation: owner override passes');

for (const subject of [undefined, false, { isOwner: false }, { isOwner: false, features: { ai_translation: true } }]) {
  check(TranslationAccessManager.canUseModel('qt-dictionary', subject), 'public QT is available');
  check(TranslationAccessManager.canUseModel('google-quick-2', subject), 'public machine translation is available');
  // Lily models are offered to readers; the LilyHub quota (MY01/MY02) decides who can actually translate.
  for (const model of ['qt-polish-s1', 'lily-cophong-v1', 'lily-dothi-v1']) {
    check(TranslationAccessManager.canUseModel(model, subject), `public access offers ${model}`);
  }
  for (const model of ['gemini-user-api-v1', 'unknown-model']) {
    check(!TranslationAccessManager.canUseModel(model, subject), `public access keeps ${model} closed`);
  }
}
check(TranslationAccessManager.canUseModel('gemini-user-api-v1', { isOwner: true }), 'owner keeps advanced translation');

console.log('\n=== JJWXC source: public route ===');
check(JjwxcAccessManager.isJjwxcConnectEnabled(false), 'non-owner can open JJWXC');
JjwxcAccessManager.assertAccess(false);
check(true, 'non-owner passes access check');

console.log('\n=== JJWXC source: owner access passes ===');
{
  let threw = false;
  try {
    JjwxcAccessManager.assertAccess(true);
  } catch {
    threw = true;
  }
  check(!threw, 'assertAccess(true) does not throw for an owner');
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

console.log('\n=== JJWXC source: extractNovelId & toWapUrl (BookID simplification) ===');
check(JjwxcUrlParser.extractNovelId('9209789') === '9209789', 'extracts pure numeric ID');
check(JjwxcUrlParser.extractNovelId('  84792167  ') === '84792167', 'extracts numeric ID with whitespace');
check(JjwxcUrlParser.extractNovelId('jjwxc:9209789') === '9209789', 'extracts jjwxc:ID prefix');
check(JjwxcUrlParser.extractNovelId('https://www.jjwxc.net/onebook.php?novelid=9209789') === '9209789', 'extracts from desktop URL');
check(JjwxcUrlParser.extractNovelId('https://wap.jjwxc.net/book2/9209789') === '9209789', 'extracts from WAP URL');
check(JjwxcUrlParser.extractNovelId('https://evil.com/book2/9209789') === null, 'rejects unrelated domain in extractNovelId');
check(JjwxcUrlParser.toWapUrl('9209789') === 'https://wap.jjwxc.net/book2/9209789', 'converts pure ID to canonical WAP URL');
check(JjwxcUrlParser.toWapUrl('https://www.jjwxc.net/onebook.php?novelid=9209789') === 'https://wap.jjwxc.net/book2/9209789', 'converts desktop URL to canonical WAP URL');

console.log(`\n${passedTests}/${totalTests} JJWXC source tests passed`);
if (passedTests !== totalTests) process.exitCode = 1;
