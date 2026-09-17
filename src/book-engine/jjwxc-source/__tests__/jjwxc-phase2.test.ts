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
  check(result.title === '第三章 归途', 'ok result extracts the chapter title from <h1>');
  check(result.paragraphs.length === 3, 'ok result extracts all 3 body paragraphs');
  check(result.paragraphs.every(p => p.length > 0), 'no empty paragraphs in ok result');
  check(!JSON.stringify(result).match(/comment-form|发表评论/), 'ok result excludes the comment-form noise block');
}
{
  const result = JjwxcChapterExtractor.extract(LOCKED_CHAPTER_HTML);
  check(result.status === 'locked', 'locked-chapter fixture classifies as locked');
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
  check(result.title === '示例小说', 'TOC result extracts the book title');
  check(result.author === '墨言', 'TOC result extracts the author');
  check(result.chapters.length === 3, 'TOC result extracts all 3 chapter links');
  check(result.chapters[0].title === '第一章 初见', 'first chapter title parsed correctly');
  check(result.chapters[0].index === 1, 'chapters are indexed in document order starting at 1');
  check(result.chapters[2].url.includes('chapterid=3'), 'chapter url is preserved for later per-chapter fetch');
  check(!result.chapters[0].url.includes('&amp;'), 'chapter url has HTML entities decoded (real "&", not "&amp;")');
  check(result.chapters[0].url.includes('novelid=9209789&chapterid=1'), 'decoded chapter url query string is well-formed');
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
