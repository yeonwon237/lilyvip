/**
 * Automated Test Suite for Local Book Engine
 * Tests TextCleaner, ChapterDetector, TxtImporter, and 3-Slot Enforcement logic.
 */

import { TextCleaner } from '../cleaner/TextCleaner';
import { ChapterDetector } from '../chapter-detector/ChapterDetector';
import { TxtImporter } from '../importers/TxtImporter';
import { MAX_LOCAL_BOOKS } from '../storage/BookRepository';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

async function runAllTests() {
  console.log('\n=============================================');
  console.log('🧪 RUNNING LOCAL BOOK ENGINE TEST SUITE');
  console.log('=============================================\n');

  // ----------------------------------------------------
  // TEST GROUP 1: TextCleaner
  // ----------------------------------------------------
  console.log('📦 1. Testing TextCleaner...');
  
  // 1.1 BOM Removal
  const bomText = '\uFEFFXin chào Trường An';
  assert(TextCleaner.removeBOM(bomText) === 'Xin chào Trường An', 'Removes UTF-8 BOM correctly');

  // 1.2 Line Endings Normalization
  const crlfText = 'Dòng 1\r\nDòng 2\rDòng 3\nDòng 4';
  assert(TextCleaner.normalizeLineEndings(crlfText) === 'Dòng 1\nDòng 2\nDòng 3\nDòng 4', 'Normalizes CRLF and CR to LF');

  // 1.3 Whitespace Normalization
  const nbspText = 'Trường\u00A0An\u200B\u3000Dạ\u00A0Vũ';
  assert(TextCleaner.normalizeWhitespace(nbspText) === 'Trường An Dạ Vũ', 'Cleans NBSP and zero-width spaces');

  // 1.4 Collapse Excessive Blank Lines
  const blankLinesText = 'Đoạn 1\n\n\n\n\n\nĐoạn 2';
  assert(TextCleaner.collapseExcessiveBlankLines(blankLinesText) === 'Đoạn 1\n\nĐoạn 2', 'Collapses 3+ blank lines to 2');

  // 1.5 Full Clean Pipeline
  const messyText = '\uFEFF  Tiêu đề truyện  \r\n\r\n\r\n\r\nNội dung đoạn văn.\u00A0   \r\n';
  const cleaned = TextCleaner.clean(messyText);
  assert(cleaned === 'Tiêu đề truyện\n\nNội dung đoạn văn.', 'Full pipeline cleans messy text seamlessly');

  // 1.6 Paragraph splitting
  const paragraphs = TextCleaner.toParagraphs('Đoạn 1\n\nĐoạn 2\n\nĐoạn 3');
  assert(paragraphs.length === 3 && paragraphs[1] === 'Đoạn 2', 'Splits text into correct paragraphs');

  // ----------------------------------------------------
  // TEST GROUP 2: ChapterDetector
  // ----------------------------------------------------
  console.log('\n📦 2. Testing ChapterDetector...');

  // 2.1 Standard Vietnamese Chapter Headings
  assert(ChapterDetector.isChapterHeading('Chương 1'), 'Detects "Chương 1"');
  assert(ChapterDetector.isChapterHeading('Chương 01: Khởi đầu mưa bụi'), 'Detects "Chương 01: Khởi đầu mưa bụi"');
  assert(ChapterDetector.isChapterHeading('Chương 001 - Tiếng tiêu ngoài quan ải'), 'Detects "Chương 001 - ..."');
  assert(ChapterDetector.isChapterHeading('CHƯƠNG 10'), 'Detects "CHƯƠNG 10"');
  assert(ChapterDetector.isChapterHeading('Chương Một: Tái ngộ'), 'Detects "Chương Một: Tái ngộ"');
  assert(ChapterDetector.isChapterHeading('Hồi 5: Đại náo Trường An'), 'Detects "Hồi 5: ..."');
  assert(ChapterDetector.isChapterHeading('Chapter 12: The Journey'), 'Detects "Chapter 12: ..."');

  // 2.2 Reject non-heading prose
  assert(!ChapterDetector.isChapterHeading('Trong chương 1 chúng ta đã thấy nàng khóc rất nhiều.'), 'Rejects normal sentences containing the word "chương"');
  assert(!ChapterDetector.isChapterHeading(''), 'Rejects empty lines');

  // 2.3 TXT with 10 chapters
  let tenChaptersText = '';
  for (let i = 1; i <= 10; i++) {
    tenChaptersText += `Chương ${i}: Tiêu đề phần ${i}\nNội dung chi tiết của chương số ${i} diễn ra vô cùng gay cấn và cảm động.\n\n`;
  }
  const result10 = ChapterDetector.detect(tenChaptersText);
  assert(result10.hasDetectedChapters === true, '10 chapters text: hasDetectedChapters is true');
  assert(result10.totalChapters === 10, '10 chapters text: totalChapters is exactly 10');
  assert(result10.chapters[0].title.startsWith('Chương 1'), 'First chapter title is Chương 1');
  assert(result10.chapters[9].title.startsWith('Chương 10'), 'Last chapter title is Chương 10');

  // 2.4 TXT with 200 chapters scale test
  let twoHundredChaptersText = '';
  for (let i = 1; i <= 200; i++) {
    twoHundredChaptersText += `Chương ${i}\nNội dung chương ${i}.\n\n`;
  }
  const result200 = ChapterDetector.detect(twoHundredChaptersText);
  assert(result200.totalChapters === 200, '200 chapters scale test: successfully parsed 200 chapters');

  // 2.5 Fallback when no heading is found
  const noHeadingText = 'Đây là một bức thư tình ngắn không có tiêu đề chương nào cả.\nChỉ có những lời tâm sự chân thành.';
  const fallbackResult = ChapterDetector.detect(noHeadingText);
  assert(fallbackResult.hasDetectedChapters === false, 'No heading text: hasDetectedChapters is false');
  assert(fallbackResult.totalChapters === 1, 'No heading text: creates fallback Chapter 1');
  assert(fallbackResult.chapters[0].body.includes('bức thư tình ngắn'), 'Fallback chapter contains the entire text');

  // ----------------------------------------------------
  // TEST GROUP 3: TxtImporter Utilities
  // ----------------------------------------------------
  console.log('\n📦 3. Testing TxtImporter utilities...');

  assert(
    TxtImporter.cleanFileNameToTitle('truong_an_da_vu_full.txt') === 'Truong An Da Vu',
    'Cleans filename "truong_an_da_vu_full.txt" -> "Truong An Da Vu"'
  );
  assert(
    TxtImporter.cleanFileNameToTitle('xuan-phong-qua-thanh-hoan.txt') === 'Xuan Phong Qua Thanh',
    'Cleans filename "xuan-phong-qua-thanh-hoan.txt" -> "Xuan Phong Qua Thanh"'
  );

  // ----------------------------------------------------
  // TEST GROUP 4: 3-Slot Enforcement Constant
  // ----------------------------------------------------
  console.log('\n📦 4. Testing Slot Limit Rule...');
  assert(MAX_LOCAL_BOOKS === 3, 'MAX_LOCAL_BOOKS constant is strictly 3');

  // ----------------------------------------------------
  // TEST GROUP 5: Website Importer & HtmlCleaner
  // ----------------------------------------------------
  console.log('\n📦 5. Testing Website Importer & HtmlCleaner...');
  const sampleWpHtml = '<h3><strong>Chương 1</strong></h3><p>Đoạn 1 của truyện.</p><div class="sharedaddy">share</div><p>Đoạn 2 của truyện.</p>';
  const { HtmlCleaner } = await import('../website-importer/html-cleaner');
  const cleanResult = HtmlCleaner.cleanWordPressChapter(sampleWpHtml, 'Chương 1');
  assert(cleanResult.paragraphs.length === 2, 'HtmlCleaner extracts exactly 2 paragraphs');
  assert(!cleanResult.body.includes('sharedaddy'), 'HtmlCleaner removes share widgets');

  const { WordPressAdapter } = await import('../website-importer/adapters/WordPressAdapter');
  const wpMeta = WordPressAdapter.parseChapterMeta('[bắt nạt] chương 5', 'bat-nat-chuong-5');
  assert(wpMeta.number === 5, 'WordPressAdapter parses chapter 5');
  const noiseMeta = WordPressAdapter.parseChapterMeta('Thông báo lịch đăng truyện', 'thong-bao');
  assert(noiseMeta.isNoise === true, 'WordPressAdapter identifies noise announcement');

  const { UrlNormalizer } = await import('../website-importer/url-normalizer');
  assert(UrlNormalizer.normalize('https://site.com/c/1/?fbclid=123') === 'https://site.com/c/1', 'UrlNormalizer strips tracking params');
  assert(UrlNormalizer.classifyWordPressUrl('https://kemchanhlemontang.wordpress.com/category/ban-toi/').type === 'category', 'UrlNormalizer classifies category URL');

  const { ChapterSorter } = await import('../website-importer/chapter-sorter');
  assert(ChapterSorter.parseMeta('Chương 10.5: Ngoại truyện').number === 10.5, 'ChapterSorter parses decimal chapter 10.5');
  assert(ChapterSorter.parseMeta('Chương 10a: Thượng').number === 10.1, 'ChapterSorter parses sub-chapter 10a');
  assert(ChapterSorter.parseMeta('Chương IV: Tái ngộ').number === 4, 'ChapterSorter parses Roman numeral IV as 4');
  assert(ChapterSorter.parseMeta('Chương Thứ Mười: Trở về').number === 10, 'ChapterSorter parses Vietnamese word number 10');

  // SUMMARY
  console.log('\n=============================================');
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('=============================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests();
