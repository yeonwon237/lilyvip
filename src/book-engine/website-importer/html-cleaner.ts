import { TextCleaner } from '../cleaner/TextCleaner';

export class HtmlCleaner {
  /**
   * Fast & complete HTML Entity decoder (works in browser and node environments)
   */
  public static decodeHtmlEntities(text: string): string {
    if (!text) return '';

    // If running in browser with DOMParser or temporary element
    if (typeof document !== 'undefined') {
      try {
        const txt = document.createElement('textarea');
        txt.innerHTML = text;
        return txt.value;
      } catch {
        // Fallback to regex
      }
    }

    // Comprehensive regex decoder
    const commonEntities: Record<string, string> = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&#8216;': '‘',
      '&#8217;': '’',
      '&#8220;': '“',
      '&#8221;': '”',
      '&#8211;': '–',
      '&#8212;': '—',
      '&#8230;': '…',
      '&#160;': ' ',
      '&#38;': '&',
      '&#60;': '<',
      '&#62;': '>',
      '&#34;': '"',
      '&#39;': "'",
      '&aacute;': 'á',
      '&agrave;': 'à',
      '&atilde;': 'ã',
      '&acirc;': 'â',
      '&eacute;': 'é',
      '&egrave;': 'è',
      '&ecirc;': 'ê',
      '&iacute;': 'í',
      '&igrave;': 'ì',
      '&oacute;': 'ó',
      '&ograve;': 'ò',
      '&ocirc;': 'ô',
      '&otilde;': 'õ',
      '&uacute;': 'ú',
      '&ugrave;': 'ù',
      '&yacute;': 'ý',
      '&ETH;': 'Đ',
      '&eth;': 'đ',
    };

    let result = text;
    for (const [entity, char] of Object.entries(commonEntities)) {
      result = result.split(entity).join(char);
    }

    // Decode generic numeric decimal &#123;
    result = result.replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    });

    // Decode generic hex &#x1f600;
    result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return '';
      }
    });

    return result.normalize('NFC');
  }

  /**
   * Remove emojis and miscellaneous decorative symbols
   */
  public static stripEmojis(text: string): string {
    if (!text) return '';
    return text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FAFF}]/gu, '').trim();
  }

  /**
   * Generalized clean HTML into pure text while preserving paragraph structure
   */
  public static cleanHtml(html: string, chapterTitle?: string): { body: string; paragraphs: string[]; wordCount: number } {
    return this.cleanWordPressChapter(html, chapterTitle);
  }

  /**
   * Clean WordPress / Web rendered HTML into pure text while preserving paragraph structure
   */
  public static cleanWordPressChapter(html: string, chapterTitle?: string): { body: string; paragraphs: string[]; wordCount: number } {
    if (!html || !html.trim()) {
      return { body: '', paragraphs: [], wordCount: 0 };
    }

    let processed = html;

    // 1. Remove script, style, noscript, iframe, svg, head, button, form
    processed = processed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    processed = processed.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    processed = processed.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
    processed = processed.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    processed = processed.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');
    processed = processed.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
    processed = processed.replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, '');

    // 2. Remove WordPress / web specific noise blocks (sharing, related posts, ads, comments)
    processed = processed.replace(/<div\b[^>]*class="[^"]*(?:sharedaddy|sd-sharing|jp-relatedposts|wpcnt|entry-utility|post-ratings|reaction-buttons|comment-form|wp-block-comments|ads|advertisement|banner)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    processed = processed.replace(/<section\b[^>]*class="[^"]*(?:sharedaddy|sd-sharing|jp-relatedposts|wpcnt|comments)[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '');

    // 3. Normalize block breaks to ensure paragraphs are preserved
    processed = processed.replace(/<(?:p|h[1-6]|div|blockquote|section|article|li|tr)[^>]*>/gi, '\n\n');
    processed = processed.replace(/<\/(?:p|h[1-6]|div|blockquote|section|article|li|tr)>/gi, '\n\n');
    processed = processed.replace(/<br\s*[\/]?>/gi, '\n');
    processed = processed.replace(/<hr\s*[\/]?>/gi, '\n\n');

    // 4. Strip any remaining HTML tags
    processed = processed.replace(/<[^>]+>/g, ' ');

    // 5. Decode HTML entities
    processed = this.decodeHtmlEntities(processed);

    // 6. Pass through standard TextCleaner
    processed = TextCleaner.clean(processed);

    // 7. Paragraph conversion
    let rawParas = TextCleaner.toParagraphs(processed);

    // 8. Deduplicate Chapter Title if the first paragraph repeated the title
    if (chapterTitle && rawParas.length > 0) {
      const cleanExpected = this.stripEmojis(chapterTitle).toLowerCase().normalize('NFC').replace(/[\s\-_:–—\[\]\(\)]+/g, '');
      const firstParaClean = this.stripEmojis(rawParas[0]).toLowerCase().normalize('NFC').replace(/[\s\-_:–—\[\]\(\)]+/g, '');

      // If the first paragraph is an exact match or pure title repetition (e.g. "Chương 5")
      if (firstParaClean === cleanExpected || (firstParaClean.length <= 50 && cleanExpected.includes(firstParaClean) && firstParaClean.length >= 4)) {
        rawParas = rawParas.slice(1);
      }
    }

    // 9. Reconstruct body
    const body = rawParas.join('\n\n').trim();
    
    // Count words (compatible with Vietnamese & Unicode)
    const latinWords = body.match(/[\w\u00C0-\u024F\u1EA0-\u1EF9]+/g) || [];
    const cjkChars = body.match(/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/g) || [];
    const wordCount = latinWords.length + cjkChars.length;

    return {
      body,
      paragraphs: rawParas,
      wordCount,
    };
  }

  /**
   * Clean a book/category/post title from WordPress metadata
   */
  public static cleanTitle(rawTitle: string): { title: string; author?: string } {
    if (!rawTitle) return { title: 'Truyện không tên' };
    
    let decoded = this.decodeHtmlEntities(rawTitle).trim();
    decoded = this.stripEmojis(decoded);

    // Remove common prefixes like "[BHTT - EDIT HOÀN - CAO H]" or "[BHTT]" or "[EDIT]"
    decoded = decoded.replace(/^\[[^\]]+\]\s*/i, '');
    decoded = decoded.replace(/^\([^\)]+\)\s*/i, '');

    // Check if title has author separator (e.g. "Muốn trăng chỉ soi riêng ta - Lạc Dương Bibi" or "Tên truyện / Tác giả")
    let author: string | undefined = undefined;
    const parts = decoded.split(/\s+[-–—]\s+/);
    if (parts.length === 2 && parts[1].length <= 50) {
      decoded = parts[0].trim();
      author = parts[1].trim();
    }

    // Capitalize first letter of title if needed
    if (decoded.length > 0) {
      decoded = decoded.charAt(0).toUpperCase() + decoded.slice(1);
    }

    return {
      title: decoded || 'Truyện không tên',
      author,
    };
  }
}
