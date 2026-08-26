/**
 * TTS Text Preprocessor for Lily Reader
 * Cleans webnovel artifacts, decorative dividers, and prepares Vietnamese text for TTS.
 */

export interface PreprocessedParagraph {
  originalIndex: number;
  text: string;
}

export class TtsTextPreprocessor {
  private static DECORATIVE_PATTERNS = [
    /^[=\-_*~•#\s]{3,}$/,
    /^[─━═┄┅┈┉]{3,}$/,
    /^[-=_*~]{1,5}[oO0][-_*~]{1,5}$/,
    /^(?:[-=_*~]\s*){4,}$/,
    /^[✦★☆✧※\s]{3,}$/,
    /^---o0o---$/i,
    /^===o0o===$/i,
  ];

  private static GARBAGE_PATTERNS = [
    /^nguồn\s*[:：]/i,
    /^convert\s*(?:bởi|by)\s*[:：]/i,
    /^người\s*dịch\s*[:：]/i,
    /^chúc\s*bạn\s*đọc\s*truyện\s*vui\s*vẻ/i,
    /^(?:truyện\s*được\s*đăng\s*tại|đọc\s*tại\s*trang\s*web)/i,
  ];

  /**
   * Cleans a single paragraph of text
   */
  public static cleanParagraph(text: string): string {
    if (!text) return '';

    let cleaned = text.trim();

    // Check if whole paragraph is a decorative divider
    for (const pattern of this.DECORATIVE_PATTERNS) {
      if (pattern.test(cleaned)) return '';
    }

    // Check if paragraph is metadata/ad garbage
    for (const pattern of this.GARBAGE_PATTERNS) {
      if (pattern.test(cleaned)) return '';
    }

    // Normalize multiple spaces and non-breaking spaces
    cleaned = cleaned.replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000]/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Normalize dialog dashes (e.g. — or - to standard pause)
    cleaned = cleaned.replace(/^[—–-]\s*/, '');

    return cleaned.trim();
  }

  /**
   * Prepares chapter paragraphs for TTS chunking
   */
  public static prepareChapter(
    chapterTitle: string,
    paragraphs: string[],
    readTitle: boolean = true
  ): PreprocessedParagraph[] {
    const result: PreprocessedParagraph[] = [];

    // Optional: Add chapter title as first paragraph
    if (readTitle && chapterTitle && chapterTitle.trim()) {
      const cleanTitle = chapterTitle.trim().replace(/^Chương\s+/i, 'Chương ');
      result.push({
        originalIndex: -1,
        text: `${cleanTitle}.`,
      });
    }

    // Process each paragraph
    for (let i = 0; i < paragraphs.length; i++) {
      const rawPara = paragraphs[i];
      const cleaned = this.cleanParagraph(rawPara);

      if (cleaned.length > 0) {
        result.push({
          originalIndex: i,
          text: cleaned,
        });
      }
    }

    return result;
  }
}
