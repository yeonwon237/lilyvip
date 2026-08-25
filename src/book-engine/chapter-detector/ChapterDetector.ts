import { DetectionConfidence } from '../types';

export interface DetectedChapterRaw {
  index: number;
  title: string;
  body: string;
  wordCount: number;
}

export interface ChapterDetectionResult {
  chapters: DetectedChapterRaw[];
  hasDetectedChapters: boolean;
  totalChapters: number;
  totalWords: number;
  confidence: DetectionConfidence;
  strategy: string;
  warnings: string[];
}

export class ChapterDetector {
  /**
   * Comprehensive regex patterns for Vietnamese and International chapter headings
   */
  private static CHAPTER_PATTERNS = [
    // 1. Standard Vietnamese: Chương 1, Chương 01, Chương 001, CHƯƠNG 1
    // Matches: "Chương 1", "Chương 1: Tên", "Chương 1 - Tên", "Chương 1 — Tên", "Chương 1. Tên", "Chương 1 Tên"
    /^[ \t]*(?:chương|ch\u01b0\u01a1ng|CH\u01af\u01a0NG|Chương)[ \t]+(?:số[ \t]+)?(\d+)(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i,

    // 2. Bracketed chapters: [Chương 1], 【Chương 1】, (Chương 1), 《Chương 1》
    /^[ \t]*[\[【\(\《](?:chương|ch\u01b0\u01a1ng|CH\u01af\u01a0NG|Chương)[ \t]+(\d+)[\]】\)\》](?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i,

    // 3. Vietnamese Word Numbers: Chương Một, Chương Hai, Chương Ba, Chương Mười, Chương Thứ Nhất...
    /^[ \t]*(?:chương|ch\u01b0\u01a1ng|CH\u01af\u01a0NG|Chương)[ \t]+(?:thứ[ \t]+)?([mnhbtscv\u0111\u00e0-\u1ef9\s]{1,35})(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i,

    // 4. Quyển X Chương Y: Quyển 1 Chương 2: Tên
    /^[ \t]*(?:quyển|quy\u1ec3n|QUY\u1ec2N|Quyển)[ \t]+(\d+|[IVXLCDM]+)[ \t]+(?:chương|ch\u01b0\u01a1ng|Chương)[ \t]+(\d+)(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i,

    // 5. Hồi / Hồi thứ: Hồi 1, Hồi thứ nhất, HỒI 5: ...
    /^[ \t]*(?:hồi|h\u1ed3i|H\u1ed2I|Hồi)[ \t]+(?:thứ[ \t]+)?(\d+|[mnhbtscv\u0111\u00e0-\u1ef9]{1,25})(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i,

    // 6. Tiết / Phần: Tiết 1, Phần 1, Phần I, TIẾT 1
    /^[ \t]*(?:tiết|ti\u1ebft|TI\u1ebeT|Tiết|phần|ph\u1ea7n|PH\u1ea6N|Phần)[ \t]+(\d+|[IVXLCDM]+|[mnhbtscv\u0111\u00e0-\u1ef9]{1,25})(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i,

    // 7. English: Chapter 1, CHAPTER 1, Chapter 01: Title, Chapter 1 - Title, Chapter 1 Title
    /^[ \t]*(?:chapter|CHAPTER|Chapter)[ \t]+(\d+)(?:[ \t]*[:\.\-–—\s][ \t]*(.*))?$/i,

    // 8. Chinese Webnovel: 第1章, 第001章, 第1章 标题, 第1回, 第1节
    /^[ \t]*第[ \t]*(\d+)[ \t]*[章回节](?:[ \t]*(.*))?$/i,
  ];

  /**
   * Check if a single line is a genuine chapter heading
   */
  public static isChapterHeading(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 120) return false;

    // Filter out obvious prose sentences falsely starting with a heading keyword
    // e.g. "Trong chương 1 chúng ta thấy rằng..." -> not a heading
    if (/^(?:trong|vào|ở|khi|tại|theo|như)\s+(?:chương|hồi|tiết|phần)/i.test(trimmed)) {
      return false;
    }

    // Must not end with trailing sentence continuation like comma or semicolon
    if (/[,;]$/.test(trimmed)) {
      return false;
    }

    return this.CHAPTER_PATTERNS.some(pattern => pattern.test(trimmed));
  }

  /**
   * Count words in a string (Vietnamese & Unicode compatible)
   */
  public static countWords(text: string): number {
    if (!text) return 0;
    const matches = text.trim().match(/[\w\u00C0-\u024F\u1EA0-\u1EF9]+/g);
    return matches ? matches.length : 0;
  }

  /**
   * Evaluate detection confidence based on heading consistency and character scale
   */
  private static evaluateConfidence(
    chapterCount: number, 
    totalCharacters: number, 
    hasDetected: boolean
  ): DetectionConfidence {
    if (!hasDetected || chapterCount === 0) return 'LOW';

    // Single heading in a massive document (> 60k chars) is suspicious
    if (chapterCount === 1 && totalCharacters > 60000) return 'LOW';

    // Typical book ratio: 1 chapter per 4,000 - 30,000 characters
    if (chapterCount >= 3) {
      const avgCharsPerChapter = totalCharacters / chapterCount;
      if (avgCharsPerChapter > 1000 && avgCharsPerChapter < 80000) {
        return 'HIGH';
      }
      return 'MEDIUM';
    }

    if (chapterCount >= 1) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Detect and split raw or cleaned text into chapters
   */
  public static detect(cleanedText: string, fallbackTitle: string = 'Chương 1'): ChapterDetectionResult {
    const warnings: string[] = [];

    if (!cleanedText || cleanedText.trim().length === 0) {
      return {
        chapters: [{
          index: 1,
          title: fallbackTitle,
          body: '',
          wordCount: 0,
        }],
        hasDetectedChapters: false,
        totalChapters: 1,
        totalWords: 0,
        confidence: 'LOW',
        strategy: 'Empty Text Fallback',
        warnings: ['Tệp rỗng không có nội dung văn bản.'],
      };
    }

    const lines = cleanedText.split('\n');
    const chapterSplits: { title: string; lines: string[] }[] = [];
    
    let currentTitle = '';
    let currentLines: string[] = [];
    let foundFirstHeading = false;
    let preHeadingLines: string[] = [];
    let detectedHeadingCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (this.isChapterHeading(trimmed)) {
        detectedHeadingCount++;

        if (foundFirstHeading) {
          chapterSplits.push({
            title: currentTitle,
            lines: currentLines,
          });
        } else {
          foundFirstHeading = true;
          if (currentLines.length > 0) {
            preHeadingLines = currentLines;
          }
        }

        currentTitle = trimmed;
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }

    // Push the final chapter
    if (foundFirstHeading && currentTitle) {
      chapterSplits.push({
        title: currentTitle,
        lines: currentLines,
      });
    }

    // FALLBACK: If no chapter headers were reliably detected
    if (!foundFirstHeading || chapterSplits.length === 0) {
      const allText = cleanedText.trim();
      const wordCount = this.countWords(allText);
      warnings.push('Không nhận diện được tiêu đề chương mẫu. Tự động gom toàn bộ nội dung thành Chương 1.');

      return {
        chapters: [{
          index: 1,
          title: 'Chương 1: Toàn văn tác phẩm',
          body: allText,
          wordCount,
        }],
        hasDetectedChapters: false,
        totalChapters: 1,
        totalWords: wordCount,
        confidence: 'LOW',
        strategy: 'Single Chapter Fallback',
        warnings,
      };
    }

    // Attach intro text (pre-heading) to the first chapter
    if (preHeadingLines.length > 0 && chapterSplits.length > 0) {
      const preText = preHeadingLines.join('\n').trim();
      if (preText.length > 0) {
        chapterSplits[0].lines = [...preHeadingLines, '', ...chapterSplits[0].lines];
      }
    }

    // Map into normalized detected chapters
    let totalWords = 0;
    const chapters: DetectedChapterRaw[] = chapterSplits.map((c, idx) => {
      const body = c.lines.join('\n').trim();
      const wordCount = this.countWords(body) + this.countWords(c.title);
      totalWords += wordCount;

      return {
        index: idx + 1,
        title: c.title,
        body,
        wordCount,
      };
    });

    const confidence = this.evaluateConfidence(chapters.length, cleanedText.length, true);
    if (confidence === 'LOW') {
      warnings.push('Mật độ phân đoạn chương chưa tối ưu hoặc số chương nhận diện ít so với dung lượng tệp.');
    }

    return {
      chapters,
      hasDetectedChapters: true,
      totalChapters: chapters.length,
      totalWords,
      confidence,
      strategy: `Multi-Pattern Regex (${detectedHeadingCount} headings found)`,
      warnings,
    };
  }
}
