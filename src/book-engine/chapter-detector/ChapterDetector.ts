import { TextCleaner } from '../cleaner/TextCleaner';

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
}

export class ChapterDetector {
  /**
   * Primary regex patterns matching Vietnamese and standard chapter headers
   * Must match beginning of line and be relatively concise
   */
  private static CHAPTER_PATTERNS = [
    // Standard Vietnamese: Chương 1, Chương 01, Chương 001, CHƯƠNG 1, Chương 1: Tên chương, Chương 1 - Tên chương
    /^[ \t]*(?:chương|ch\u01b0\u01a1ng|CH\u01af\u01a0NG|Chương)[ \t]+(?:số[ \t]+)?(\d+)(?:[ \t]*[:\.\-–—][ \t]*(.*))?$/i,
    
    // Vietnamese word numbers: Chương Một, Chương Hai, Chương Ba, Chương Mười, Chương Thứ Nhất...
    /^[ \t]*(?:chương|ch\u01b0\u01a1ng|CH\u01af\u01a0NG|Chương)[ \t]+(?:thứ[ \t]+)?([mnhbtscv\u0111\u00e0-\u1ef9\s]{1,30})(?:[ \t]*[:\.\-–—][ \t]*(.*))?$/i,
    
    // Quyển X Chương Y: Quyển 1 Chương 2
    /^[ \t]*(?:quyển|quy\u1ec3n|QUY\u1ec2N|Quyển)[ \t]+(\d+|[IVXLCDM]+)[ \t]+(?:chương|ch\u01b0\u01a1ng|Chương)[ \t]+(\d+)(?:[ \t]*[:\.\-–—][ \t]*(.*))?$/i,

    // Hồi: Hồi 1, Hồi thứ nhất, HỒI 1
    /^[ \t]*(?:hồi|h\u1ed3i|H\u1ed2I|Hồi)[ \t]+(?:thứ[ \t]+)?(\d+|[mnhbtscv\u0111\u00e0-\u1ef9]{1,20})(?:[ \t]*[:\.\-–—][ \t]*(.*))?$/i,

    // Tiết / Phần: Tiết 1, Phần 1, Phần I
    /^[ \t]*(?:tiết|ti\u1ebft|TI\u1ebeT|Tiết|phần|ph\u1ea7n|PH\u1ea6N|Phần)[ \t]+(\d+|[IVXLCDM]+|[mnhbtscv\u0111\u00e0-\u1ef9]{1,20})(?:[ \t]*[:\.\-–—][ \t]*(.*))?$/i,

    // English: Chapter 1, CHAPTER 1, Chapter 01: Title
    /^[ \t]*(?:chapter|CHAPTER|Chapter)[ \t]+(\d+)(?:[ \t]*[:\.\-–—][ \t]*(.*))?$/i,
  ];

  /**
   * Check if a single line is a chapter heading
   */
  public static isChapterHeading(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 120) return false;

    return this.CHAPTER_PATTERNS.some(pattern => pattern.test(trimmed));
  }

  /**
   * Count words in a string (Vietnamese compatible)
   */
  public static countWords(text: string): number {
    if (!text) return 0;
    const matches = text.trim().match(/[\w\u00C0-\u024F\u1EA0-\u1EF9]+/g);
    return matches ? matches.length : 0;
  }

  /**
   * Split cleaned text into structured chapters
   */
  public static detect(cleanedText: string, fallbackTitle: string = 'Chương 1'): ChapterDetectionResult {
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
      };
    }

    const lines = cleanedText.split('\n');
    const chapterSplits: { title: string; lines: string[] }[] = [];
    
    let currentTitle = '';
    let currentLines: string[] = [];
    let foundFirstHeading = false;
    let preHeadingLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (this.isChapterHeading(trimmed)) {
        if (foundFirstHeading) {
          // Push previous chapter
          chapterSplits.push({
            title: currentTitle,
            lines: currentLines,
          });
        } else {
          foundFirstHeading = true;
          // Store intro lines before chapter 1 (prologue / intro info)
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
      };
    }

    // Attach pre-heading text (intro/prologue) to the first chapter or as prologue if significant
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

    return {
      chapters,
      hasDetectedChapters: true,
      totalChapters: chapters.length,
      totalWords,
    };
  }
}
