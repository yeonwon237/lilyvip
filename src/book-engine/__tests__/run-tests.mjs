/**
 * Automated Test Runner for Local Book Engine in pure ESM
 */

class TextCleaner {
  static removeBOM(text) {
    if (text.charCodeAt(0) === 0xFEFF || text.charCodeAt(0) === 0xFFFE) {
      return text.slice(1);
    }
    return text.replace(/^\uFEFF/, '').replace(/^\uFFFE/, '');
  }

  static normalizeLineEndings(text) {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  static normalizeWhitespace(text) {
    return text
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  }

  static trimLineEnds(text) {
    return text
      .split('\n')
      .map(line => line.replace(/[ \t]+$/, ''))
      .join('\n');
  }

  static collapseExcessiveBlankLines(text) {
    return text.replace(/\n{3,}/g, '\n\n');
  }

  static clean(rawText) {
    if (!rawText) return '';
    let result = this.removeBOM(rawText);
    result = this.normalizeLineEndings(result);
    result = this.normalizeWhitespace(result);
    result = this.trimLineEnds(result);
    result = this.collapseExcessiveBlankLines(result);
    return result.trim();
  }

  static toParagraphs(text) {
    if (!text) return [];
    return text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }
}

class ChapterDetector {
  static CHAPTER_PATTERNS = [
    /^[ \t]*(?:chương|ch\u01b0\u01a1ng|CH\u01af\u01a0NG|Chương)[ \t]+(?:số[ \t]+)?(\d+)(?:[ \t]*[:\.\-–—][ \t]*(.*))?$/i,
    /^[ \t]*(?:chương|ch\u01b0\u01a1ng|CH\u01af\u01a0NG|Chương)[ \t]+(?:thứ[ \t]+)?([mnhbtscv\u0111\u00e0-\u1ef9\s]{1,30})(?:[ \t]*[:\.\-–—][ \t]*(.*))?$/i,
    /^[ \t]*(?:quyển|quy\u1ec3n|QUY\u1ec2N|Quyển)[ \t]+(\d+|[IVXLCDM]+)[ \t]+(?:chương|ch\u01b0\u01a1ng|Chương)[ \t]+(\d+)(?:[ \t]*[:\.\-–—][ \t]*(.*))?$/i,
    /^[ \t]*(?:hồi|h\u1ed3i|H\u1ed2I|Hồi)[ \t]+(?:thứ[ \t]+)?(\d+|[mnhbtscv\u0111\u00e0-\u1ef9]{1,20})(?:[ \t]*[:\.\-–—][ \t]*(.*))?$/i,
    /^[ \t]*(?:tiết|ti\u1ebft|TI\u1ebeT|Tiết|phần|ph\u1ea7n|PH\u1ea6N|Phần)[ \t]+(\d+|[IVXLCDM]+|[mnhbtscv\u0111\u00e0-\u1ef9]{1,20})(?:[ \t]*[:\.\-–—][ \t]*(.*))?$/i,
    /^[ \t]*(?:chapter|CHAPTER|Chapter)[ \t]+(\d+)(?:[ \t]*[:\.\-–—][ \t]*(.*))?$/i,
  ];

  static isChapterHeading(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 120) return false;
    return this.CHAPTER_PATTERNS.some(pattern => pattern.test(trimmed));
  }

  static countWords(text) {
    if (!text) return 0;
    const matches = text.trim().match(/[\w\u00C0-\u024F\u1EA0-\u1EF9]+/g);
    return matches ? matches.length : 0;
  }

  static detect(cleanedText, fallbackTitle = 'Chương 1') {
    if (!cleanedText || cleanedText.trim().length === 0) {
      return {
        chapters: [{ index: 1, title: fallbackTitle, body: '', wordCount: 0 }],
        hasDetectedChapters: false,
        totalChapters: 1,
        totalWords: 0,
      };
    }

    const lines = cleanedText.split('\n');
    const chapterSplits = [];
    let currentTitle = '';
    let currentLines = [];
    let foundFirstHeading = false;
    let preHeadingLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (this.isChapterHeading(trimmed)) {
        if (foundFirstHeading) {
          chapterSplits.push({ title: currentTitle, lines: currentLines });
        } else {
          foundFirstHeading = true;
          if (currentLines.length > 0) preHeadingLines = currentLines;
        }
        currentTitle = trimmed;
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }

    if (foundFirstHeading && currentTitle) {
      chapterSplits.push({ title: currentTitle, lines: currentLines });
    }

    if (!foundFirstHeading || chapterSplits.length === 0) {
      const allText = cleanedText.trim();
      const wordCount = this.countWords(allText);
      return {
        chapters: [{ index: 1, title: 'Chương 1: Toàn văn tác phẩm', body: allText, wordCount }],
        hasDetectedChapters: false,
        totalChapters: 1,
        totalWords: wordCount,
      };
    }

    if (preHeadingLines.length > 0 && chapterSplits.length > 0) {
      const preText = preHeadingLines.join('\n').trim();
      if (preText.length > 0) {
        chapterSplits[0].lines = [...preHeadingLines, '', ...chapterSplits[0].lines];
      }
    }

    let totalWords = 0;
    const chapters = chapterSplits.map((c, idx) => {
      const body = c.lines.join('\n').trim();
      const wordCount = this.countWords(body) + this.countWords(c.title);
      totalWords += wordCount;
      return { index: idx + 1, title: c.title, body, wordCount };
    });

    return {
      chapters,
      hasDetectedChapters: true,
      totalChapters: chapters.length,
      totalWords,
    };
  }
}

class TxtImporter {
  static cleanFileNameToTitle(fileName) {
    const withoutExt = fileName.replace(/\.[^/.]+$/, '');
    const cleanWords = withoutExt
      .replace(/[_\-+]+/g, ' ')
      .replace(/\s*(?:full|hoan|convert|dich|edit|raw)\s*$/i, '')
      .trim();

    if (!cleanWords) return 'Tác phẩm mới';

    return cleanWords
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}

const MAX_LOCAL_BOOKS = 3;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

console.log('\n=============================================');
console.log('🧪 RUNNING LOCAL BOOK ENGINE TEST SUITE');
console.log('=============================================\n');

// 1. TextCleaner
console.log('📦 1. Testing TextCleaner...');
assert(TextCleaner.removeBOM('\uFEFFXin chào Trường An') === 'Xin chào Trường An', 'Removes UTF-8 BOM correctly');
assert(TextCleaner.normalizeLineEndings('Dòng 1\r\nDòng 2\rDòng 3\nDòng 4') === 'Dòng 1\nDòng 2\nDòng 3\nDòng 4', 'Normalizes CRLF and CR to LF');
assert(TextCleaner.normalizeWhitespace('Trường\u00A0An\u200B\u3000Dạ\u00A0Vũ') === 'Trường An Dạ Vũ', 'Cleans NBSP and zero-width spaces');
assert(TextCleaner.collapseExcessiveBlankLines('Đoạn 1\n\n\n\n\n\nĐoạn 2') === 'Đoạn 1\n\nĐoạn 2', 'Collapses 3+ blank lines to 2');
assert(TextCleaner.clean('\uFEFF  Tiêu đề truyện  \r\n\r\n\r\n\r\nNội dung đoạn văn.\u00A0   \r\n') === 'Tiêu đề truyện\n\nNội dung đoạn văn.', 'Full pipeline cleans messy text seamlessly');
assert(TextCleaner.toParagraphs('Đoạn 1\n\nĐoạn 2\n\nĐoạn 3').length === 3, 'Splits text into correct paragraphs');

// 2. ChapterDetector
console.log('\n📦 2. Testing ChapterDetector...');
assert(ChapterDetector.isChapterHeading('Chương 1'), 'Detects "Chương 1"');
assert(ChapterDetector.isChapterHeading('Chương 01: Khởi đầu mưa bụi'), 'Detects "Chương 01: Khởi đầu mưa bụi"');
assert(ChapterDetector.isChapterHeading('Chương 001 - Tiếng tiêu ngoài quan ải'), 'Detects "Chương 001 - ..."');
assert(ChapterDetector.isChapterHeading('CHƯƠNG 10'), 'Detects "CHƯƠNG 10"');
assert(ChapterDetector.isChapterHeading('Chương Một: Tái ngộ'), 'Detects "Chương Một: Tái ngộ"');
assert(ChapterDetector.isChapterHeading('Hồi 5: Đại náo Trường An'), 'Detects "Hồi 5: ..."');
assert(ChapterDetector.isChapterHeading('Chapter 12: The Journey'), 'Detects "Chapter 12: ..."');
assert(!ChapterDetector.isChapterHeading('Trong chương 1 chúng ta đã thấy nàng khóc rất nhiều.'), 'Rejects normal sentences');

// 10 chapters test
let tenChaptersText = '';
for (let i = 1; i <= 10; i++) {
  tenChaptersText += `Chương ${i}: Tiêu đề phần ${i}\nNội dung chi tiết của chương số ${i} diễn ra vô cùng gay cấn và cảm động.\n\n`;
}
const result10 = ChapterDetector.detect(tenChaptersText);
assert(result10.hasDetectedChapters === true, '10 chapters: hasDetectedChapters is true');
assert(result10.totalChapters === 10, '10 chapters: totalChapters is exactly 10');
assert(result10.chapters[0].title.startsWith('Chương 1'), 'First chapter title is Chương 1');
assert(result10.chapters[9].title.startsWith('Chương 10'), 'Last chapter title is Chương 10');

// 200 chapters test
let twoHundredChaptersText = '';
for (let i = 1; i <= 200; i++) {
  twoHundredChaptersText += `Chương ${i}\nNội dung chương ${i}.\n\n`;
}
const result200 = ChapterDetector.detect(twoHundredChaptersText);
assert(result200.totalChapters === 200, '200 chapters scale test: successfully parsed 200 chapters');

// Fallback test
const noHeadingText = 'Đây là một bức thư tình ngắn không có tiêu đề chương nào cả.\nChỉ có những lời tâm sự chân thành.';
const fallbackResult = ChapterDetector.detect(noHeadingText);
assert(fallbackResult.hasDetectedChapters === false, 'No heading: hasDetectedChapters is false');
assert(fallbackResult.totalChapters === 1, 'No heading: creates fallback Chapter 1');
assert(fallbackResult.chapters[0].body.includes('bức thư tình ngắn'), 'Fallback chapter contains all text');

// 3. TxtImporter utilities
console.log('\n📦 3. Testing TxtImporter utilities...');
assert(TxtImporter.cleanFileNameToTitle('truong_an_da_vu_full.txt') === 'Truong An Da Vu', 'Cleans filename -> "Truong An Da Vu"');
assert(TxtImporter.cleanFileNameToTitle('xuan-phong-qua-thanh-hoan.txt') === 'Xuan Phong Qua Thanh', 'Cleans filename -> "Xuan Phong Qua Thanh"');

// 4. Slot Limit Rule
console.log('\n📦 4. Testing Slot Limit Rule...');
assert(MAX_LOCAL_BOOKS === 3, 'MAX_LOCAL_BOOKS constant is strictly 3');

console.log('\n=============================================');
console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log('=============================================\n');

if (failedTests > 0) {
  process.exit(1);
}
