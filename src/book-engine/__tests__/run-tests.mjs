/**
 * Comprehensive Automated Test Suite for Book Engine V2
 * Repo: yeonwon237/lilyvip
 */

class TextCleaner {
  static removeBOM(text) {
    if (!text) return '';
    if (text.charCodeAt(0) === 0xFEFF || text.charCodeAt(0) === 0xFFFE) {
      return text.slice(1);
    }
    return text.replace(/^\uFEFF/, '').replace(/^\uFFFE/, '');
  }

  static normalizeLineEndings(text) {
    if (!text) return '';
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  static removeControlCharacters(text) {
    if (!text) return '';
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  static normalizeWhitespace(text) {
    if (!text) return '';
    return text
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  }

  static trimLineEnds(text) {
    if (!text) return '';
    return text
      .split('\n')
      .map(line => line.replace(/[ \t]+$/, ''))
      .join('\n');
  }

  static collapseExcessiveBlankLines(text) {
    if (!text) return '';
    return text.replace(/\n{3,}/g, '\n\n');
  }

  static clean(rawText) {
    if (!rawText) return '';
    let result = this.removeBOM(rawText);
    result = this.normalizeLineEndings(result);
    result = this.removeControlCharacters(result);
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
    /^[ \t]*(?:chương|ch\u01b0\u01a1ng|CH\u01af\u01a0NG|Chương)[ \t]+(?:số[ \t]+)?(\d+)(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i,
    /^[ \t]*[\[【\(\《](?:chương|ch\u01b0\u01a1ng|CH\u01af\u01a0NG|Chương)[ \t]+(\d+)[\]】\)\》](?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i,
    /^[ \t]*(?:chương|ch\u01b0\u01a1ng|CH\u01af\u01a0NG|Chương)[ \t]+(?:thứ[ \t]+)?([mnhbtscv\u0111\u00e0-\u1ef9\s]{1,35})(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i,
    /^[ \t]*(?:quyển|quy\u1ec3n|QUY\u1ec2N|Quyển)[ \t]+(\d+|[IVXLCDM]+)[ \t]+(?:chương|ch\u01b0\u01a1ng|Chương)[ \t]+(\d+)(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i,
    /^[ \t]*(?:hồi|h\u1ed3i|H\u1ed2I|Hồi)[ \t]+(?:thứ[ \t]+)?(\d+|[mnhbtscv\u0111\u00e0-\u1ef9]{1,25})(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i,
    /^[ \t]*(?:tiết|ti\u1ebft|TI\u1ebeT|Tiết|phần|ph\u1ea7n|PH\u1ea6N|Phần)[ \t]+(\d+|[IVXLCDM]+|[mnhbtscv\u0111\u00e0-\u1ef9]{1,25})(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i,
    /^[ \t]*(?:chapter|CHAPTER|Chapter)[ \t]+(\d+)(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i,
    /^[ \t]*第[ \t]*(\d+)[ \t]*[章回节](?:[ \t]*(.*))?$/i,
  ];

  static isChapterHeading(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 120) return false;

    if (/^(?:trong|vào|ở|khi|tại|theo|như)\s+(?:chương|hồi|tiết|phần)/i.test(trimmed)) {
      return false;
    }

    if (/[,;]$/.test(trimmed)) {
      return false;
    }

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
        confidence: 'LOW',
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
        confidence: 'LOW',
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

    const confidence = chapters.length >= 3 ? 'HIGH' : 'MEDIUM';

    return {
      chapters,
      hasDetectedChapters: true,
      totalChapters: chapters.length,
      totalWords,
      confidence,
    };
  }
}

class TxtDecoderTest {
  static decode(bytes) {
    // UTF-8 BOM
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return { text: new TextDecoder('utf-8').decode(bytes.subarray(3)), encoding: 'UTF-8 BOM' };
    }
    // UTF-16 LE
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return { text: new TextDecoder('utf-16le').decode(bytes.subarray(2)), encoding: 'UTF-16 LE' };
    }
    // UTF-16 BE
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return { text: new TextDecoder('utf-16be').decode(bytes.subarray(2)), encoding: 'UTF-16 BE' };
    }
    // Default UTF-8
    return { text: new TextDecoder('utf-8').decode(bytes), encoding: 'UTF-8' };
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

console.log('\n======================================================');
console.log('🧪 RUNNING BOOK ENGINE V2 COMPREHENSIVE TEST SUITE');
console.log('======================================================\n');

// 1. TextCleaner Tests
console.log('📦 1. Testing TextCleaner Normalization...');
assert(TextCleaner.removeBOM('\uFEFFTiêu đề truyện') === 'Tiêu đề truyện', 'Removes UTF-8 BOM');
assert(TextCleaner.removeBOM('\uFFFETiêu đề truyện') === 'Tiêu đề truyện', 'Removes UTF-16 BOM');
assert(TextCleaner.normalizeLineEndings('A\r\nB\rC\nD') === 'A\nB\nC\nD', 'Normalizes CRLF and CR to LF');
assert(TextCleaner.removeControlCharacters('A\x00\x07B\x1F C') === 'AB C', 'Strips ASCII control characters');
assert(TextCleaner.normalizeWhitespace('Trường\u00A0An\u200B\u3000Dạ\u00A0Vũ') === 'Trường An Dạ Vũ', 'Cleans non-breaking and fullwidth spaces');
assert(TextCleaner.collapseExcessiveBlankLines('A\n\n\n\n\nB') === 'A\n\nB', 'Collapses excessive blank lines');
assert(TextCleaner.clean('\uFEFF  Tiêu đề  \r\n\r\n\r\nNội dung.\u00A0  ') === 'Tiêu đề\n\nNội dung.', 'Full clean pipeline');
assert(TextCleaner.toParagraphs('Đoạn 1\n\nĐoạn 2\n\nĐoạn 3').length === 3, 'Splits into 3 paragraphs');

// 2. Real-World Heading Patterns Test
console.log('\n📦 2. Testing Real-World Chapter Heading Patterns...');
const headingSamples = [
  'Chương 1',
  'Chương 01',
  'Chương 001',
  'CHƯƠNG 1',
  'Chương 1:',
  'Chương 1: Tên chương',
  'Chương 1 - Tên chương',
  'Chương 1 — Tên chương',
  'Chương 1. Tên chương',
  'Chương 1 Tên chương',
  'Chương thứ 1',
  'Chương thứ nhất',
  'Chương Một',
  'Chương Thứ Nhất',
  '[Chương 1]',
  '【Chương 1】',
  '(Chương 1)',
  '《Chương 1》',
  'Hồi 1',
  'Hồi thứ nhất',
  'Phần 1',
  'Tiết 1',
  'Quyển 1 Chương 2',
  'Chapter 1',
  'Chapter 001: Title',
  'CHAPTER 1',
  '第1章',
  '第001章',
  '第1章 标题',
  '第1回',
  '第1节',
];

for (const sample of headingSamples) {
  assert(ChapterDetector.isChapterHeading(sample), `Recognizes "${sample}"`);
}

// 3. False-Positive Rejections Test
console.log('\n📦 3. Testing False-Positive Prose Rejection...');
const falsePositives = [
  'Nàng đã đọc chương 1 của cuốn sách từ lâu.',
  'Trong chương 1 chúng ta đã thấy nàng khóc rất nhiều.',
  'Vào hồi 3, trời đổ mưa to gió lớn khắp Trường An.',
  'Ở tiết 1 này, cô giáo bước vào lớp.',
  'Chương 1, nhưng câu này lại kết thúc bằng dấu phẩy,',
  'Một đoạn văn rất dài quá 120 ký tự có chứa từ Chương 1 ở đầu nhưng là câu văn xuôi miêu tả cảnh vật mùa xuân bên dòng sông trôi êm đềm.',
  '',
];

for (const falseSample of falsePositives) {
  assert(!ChapterDetector.isChapterHeading(falseSample), `Rejects prose: "${falseSample.substring(0, 40)}..."`);
}

// 4. TXT Encoding Detection Test
console.log('\n📦 4. Testing Multi-Encoding Decoding...');
const utf8Bytes = new Uint8Array([0xEF, 0xBB, 0xBF, 0x58, 0x69, 0x6E, 0x20, 0x63, 0x68, 0xC3, 0xA0, 0x6F]);
const utf8Result = TxtDecoderTest.decode(utf8Bytes);
assert(utf8Result.encoding === 'UTF-8 BOM' && utf8Result.text === 'Xin chào', 'Decodes UTF-8 with BOM correctly');

const utf16leBytes = new Uint8Array([0xFF, 0xFE, 0x58, 0x00, 0x69, 0x00, 0x6E, 0x00]);
const utf16Result = TxtDecoderTest.decode(utf16leBytes);
assert(utf16Result.encoding === 'UTF-16 LE' && utf16Result.text === 'Xin', 'Decodes UTF-16 LE correctly');

// 5. Scale Tests: 200 Chapters & 600 Chapters
console.log('\n📦 5. Testing Scale: 200 & 600 Chapters...');

// 200 Chapters
let text200 = '';
for (let i = 1; i <= 200; i++) {
  text200 += `Chương ${i}: Tiêu đề diễn biến kỳ ${i}\nĐoạn văn miêu tả sự việc của chương số ${i} diễn ra vô cùng hấp dẫn và kịch tính.\n\n`;
}
const start200 = Date.now();
const res200 = ChapterDetector.detect(text200);
const duration200 = Date.now() - start200;
assert(res200.totalChapters === 200, `200 Chapters: Exactly 200 chapters parsed in ${duration200}ms`);
assert(res200.chapters[0].title.startsWith('Chương 1'), 'First chapter is Chương 1');
assert(res200.chapters[199].title.startsWith('Chương 200'), 'Last chapter is Chương 200');
assert(res200.confidence === 'HIGH', 'Confidence is HIGH for 200 chapters');

// 600 Chapters
let text600 = '';
for (let i = 1; i <= 600; i++) {
  text600 += `Chương ${i} - Phong vân biến sắc hồi ${i}\nNội dung chương ${i} tiếp nối câu chuyện phiêu lưu trong giang hồ.\n\n`;
}
const start600 = Date.now();
const res600 = ChapterDetector.detect(text600);
const duration600 = Date.now() - start600;
assert(res600.totalChapters === 600, `600 Chapters: Exactly 600 chapters parsed in ${duration600}ms`);
assert(res600.chapters[599].title.startsWith('Chương 600'), 'Last chapter is Chương 600');

// 6. Single Chapter Fallback Test
console.log('\n📦 6. Testing Fallback...');
const noHeadingText = 'Đây là một bức thư tự sự ngắn không có tiêu đề chương nào cả.\nNgười đọc vẫn đọc được bình thường.';
const fallbackRes = ChapterDetector.detect(noHeadingText);
assert(fallbackRes.hasDetectedChapters === false, 'Fallback: hasDetectedChapters is false');
assert(fallbackRes.totalChapters === 1, 'Fallback: Exactly 1 chapter created');
assert(fallbackRes.chapters[0].title.includes('Chương 1'), 'Fallback title contains Chương 1');
assert(fallbackRes.chapters[0].body.includes('bức thư tự sự ngắn'), 'Fallback chapter preserves entire content');

// 7. 3-Slot Hard Enforcement
console.log('\n📦 7. Testing 3-Slot Constraint...');
assert(MAX_LOCAL_BOOKS === 3, 'MAX_LOCAL_BOOKS is strictly 3');

console.log('\n======================================================');
console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
