import { JjwxcChapterExtractor } from '../JjwxcChapterExtractor';
import { JjwxcTocLoader } from '../JjwxcTocLoader';
import {
  LOCKED_CHAPTER_HTML,
  PURCHASED_CHAPTER_HTML,
  SESSION_EXPIRED_HTML,
  TOC_OK_HTML,
  UNKNOWN_FORMAT_HTML,
} from '../JjwxcDevFixtures';

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

console.log('\n=== JjwxcChapterExtractor: status classification ===');
{
  const result = JjwxcChapterExtractor.extract(PURCHASED_CHAPTER_HTML);
  check(result.status === 'ok', 'purchased-chapter fixture classifies as ok');
  check(result.title === '3、第 3 章 归途', 'ok result extracts the chapter heading from <h2 class="big o">');
  check(result.paragraphs.length === 3, 'ok result extracts all 3 body paragraphs');
  check(result.paragraphs.every(p => p.length > 0), 'no empty paragraphs in ok result');
  check(!JSON.stringify(result).match(/comment-form|发表评论/), 'ok result excludes the comment-form noise block');
}
{
  // Anonymously (no cookie), JJWXC can't distinguish "not logged in" from
  // "logged in but hasn't purchased" — both render the same /my/login prompt,
  // which this fixture matches — so this classifies as session_expired.
  const result = JjwxcChapterExtractor.extract(LOCKED_CHAPTER_HTML);
  check(result.status === 'session_expired', 'VIP/locked-chapter fixture (anonymous view) classifies as session_expired');
  check(result.paragraphs.length === 0, 'locked result returns no paragraphs (does not leak partial/preview text)');
}
{
  const result = JjwxcChapterExtractor.extract(SESSION_EXPIRED_HTML);
  check(result.status === 'session_expired', 'login-page fixture classifies as session_expired');
  check(result.paragraphs.length === 0, 'session_expired result returns no paragraphs');
  check(result.title === null, 'session_expired result returns no title (does not try to read the login page as a chapter)');
}
{
  const result = JjwxcChapterExtractor.extract(UNKNOWN_FORMAT_HTML);
  check(result.status === 'unknown_format', 'unrelated HTML fixture classifies as unknown_format, not silently as ok');
  check(result.paragraphs.length === 0, 'unknown_format result returns no paragraphs');
}
{
  const result = JjwxcChapterExtractor.extract('');
  check(result.status === 'unknown_format', 'empty input classifies as unknown_format rather than throwing');
}

console.log('\n=== JjwxcChapterExtractor: result shape never carries auth data ===');
{
  const result = JjwxcChapterExtractor.extract(PURCHASED_CHAPTER_HTML);
  const keys = Object.keys(result).sort();
  check(JSON.stringify(keys) === JSON.stringify(['paragraphs', 'status', 'title']), 'extractor result has exactly {status, title, paragraphs} — no cookie/token/header field');
}

console.log('\n=== JjwxcTocLoader: metadata + chapter list from DOM ===');
{
  const result = JjwxcTocLoader.parse(TOC_OK_HTML);
  check(result.status === 'ok', 'book/TOC fixture classifies as ok');
  check(result.title === '示例小说', 'TOC result extracts the bracketed book title out of the <title> tag');
  check(result.author === '某作者', 'TOC result extracts the author');
  check(result.chapters.length === 4, 'TOC result extracts the 3 free + 1 VIP chapter link, skipping only the "expand all" chrome link');
  check(result.chapters[0].title === '第一章 初见', 'first chapter title parsed correctly');
  check(result.chapters[0].index === 1, 'chapters are indexed in document order starting at 1');
  check(result.chapters[2].url === '/book2/1/3', 'a free chapter url is preserved for later per-chapter fetch');
  check(result.chapters[3].url === '/vip/1/4?ctime=1', 'a VIP chapter link is still listed (not silently dropped) so the reader can see it exists — fetchChapterContent fails it individually later');
}
{
  const result = JjwxcTocLoader.parse(SESSION_EXPIRED_HTML);
  check(result.status === 'session_expired', 'TOC loader also reports session_expired for a login page');
  check(result.chapters.length === 0, 'session_expired TOC result has no chapters');
}
{
  const result = JjwxcTocLoader.parse(UNKNOWN_FORMAT_HTML);
  check(result.status === 'unknown_format', 'TOC loader reports unknown_format for unrelated HTML rather than guessing');
}

console.log(`\n${passedTests}/${totalTests} JJWXC Phase 2 (TOC + chapter extractor) tests passed`);
if (passedTests !== totalTests) process.exitCode = 1;
