/**
 * TTS Text Preprocessor for Lily Reader
 * Cleans webnovel artifacts, decorative dividers, and prepares Vietnamese text for TTS.
 */

export interface PreprocessedParagraph {
  originalIndex: number;
  text: string;
}

const DECORATIVE_PATTERNS = [
  /^(?:[=\-_*~•●◆◇#═─━✦★☆✧※]\s*){3,}$/u,
  /^[=\-_*~═─━\s]*(?:o0o|0o0|oO0)[=\-_*~═─━\s]*$/iu,
];

/**
 * Produces speech-only text. Reader/source text is never mutated.
 * Sentence punctuation is reduced to pauses understood by both Piper and Web Speech.
 */
export function normalizeForSpeech(text: string): string {
  if (!text) return '';

  let speech = text
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
    .trim();

  if (!speech || DECORATIVE_PATTERNS.some((pattern) => pattern.test(speech))) return '';

  speech = speech
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&(?:amp|#38);/gi, ' và ')
    .replace(/&(?:quot|#34|apos|#39);/gi, '')
    .replace(/&(?:lt|#60);/gi, ' ')
    .replace(/&(?:gt|#62);/gi, ' ')
    .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/^[\s—–-]+/, '')
    .replace(/[“”„‟‘’‚‛"']/g, '')
    .replace(/[()[\]{}<>]/g, ' ')
    .replace(/(?:\.{2,}|…+|。{2,})/g, ', ')
    .replace(/[!?！？]+/g, '.')
    .replace(/[:;：；]+/g, ',')
    .replace(/\s*[=═]{1,}\s*/g, ', ')
    .replace(/\s+[—–-]+\s+/g, ', ')
    .replace(/(?:[#@_*~|•●◆◇✦★☆※]\s*){2,}/gu, ' ')
    .replace(/(^|\s)[#@_*~|]+(?=\s|$)/g, ' ')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/([,.;]){2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return /^[,.;\s]+$/.test(speech) ? '' : speech;
}

export class TtsTextPreprocessor {
  private static DECORATIVE_PATTERNS = DECORATIVE_PATTERNS;

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

    return normalizeForSpeech(cleaned);
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
      const cleanTitle = normalizeForSpeech(chapterTitle.trim().replace(/^Chương\s+/i, 'Chương '));
      if (cleanTitle) result.push({
        originalIndex: -1,
        text: /[.,;]$/.test(cleanTitle) ? cleanTitle : `${cleanTitle}.`,
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
