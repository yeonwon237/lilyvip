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
        // Fallback to regex decoder
      }
    }

    // Comprehensive regex entity map
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
      '&hellip;': '…',
      '&mdash;': '—',
      '&ndash;': '–',
      '&lsquo;': '‘',
      '&rsquo;': '’',
      '&ldquo;': '“',
      '&rdquo;': '”',
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

    // 1. Remove dangerous or non-content tags: script, style, noscript, iframe, svg, head, button, form, nav, header, footer, aside
    processed = processed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    processed = processed.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    processed = processed.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
    processed = processed.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    processed = processed.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');
    processed = processed.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
    processed = processed.replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, '');
    processed = processed.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');
    processed = processed.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');
    processed = processed.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');
    processed = processed.replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '');

    // 2. Remove WordPress / web specific noise containers (sharing, related posts, ads, comments, navigation)
    processed = processed.replace(/<div\b[^>]*class="[^"]*(?:sharedaddy|sd-sharing|jp-relatedposts|wpcnt|entry-utility|post-ratings|reaction-buttons|comment-form|wp-block-comments|ads|advertisement|banner|author-box|post-navigation|nav-links|navigation|social-share)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    processed = processed.replace(/<section\b[^>]*class="[^"]*(?:sharedaddy|sd-sharing|jp-relatedposts|wpcnt|comments|post-navigation)[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '');
    processed = processed.replace(/<ul\b[^>]*class="[^"]*(?:post-categories|post-tags|share-buttons)[^"]*"[^>]*>[\s\S]*?<\/ul>/gi, '');

    // 3. Drop-caps handling: Ensure <span class="dropcap">T</span>ôi doesn't introduce space
    processed = processed.replace(/<span\b[^>]*class="[^"]*(?:dropcap|has-drop-cap|initial-letter)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1');

    // 4. Normalize block-level breaks to paragraphs
    processed = processed.replace(/<(?:p|h[1-6]|div|blockquote|section|article|li|tr|figure|figcaption)[^>]*>/gi, '\n\n');
    processed = processed.replace(/<\/(?:p|h[1-6]|div|blockquote|section|article|li|tr|figure|figcaption)>/gi, '\n\n');
    processed = processed.replace(/<br\s*[\/]?>/gi, '\n');
    processed = processed.replace(/<hr\s*[\/]?>/gi, '\n\n***\n\n');

    // 5. Strip inline HTML tags without inserting spaces (preserves word integrity)
    processed = processed.replace(/<(?:span|em|strong|b|i|u|a|small|mark|font|sub|sup|abbr|code)\b[^>]*>/gi, '');
    processed = processed.replace(/<\/(?:span|em|strong|b|i|u|a|small|mark|font|sub|sup|abbr|code)>/gi, '');

    // 6. Strip any other remaining tags
    processed = processed.replace(/<[^>]+>/g, ' ');

    // 7. Decode HTML entities
    processed = this.decodeHtmlEntities(processed);

    // 8. Pass through standard TextCleaner
    processed = TextCleaner.clean(processed);

    // 9. Split into paragraphs
    let rawParas = TextCleaner.toParagraphs(processed);

    // 10. Filter out boilerplate navigation lines
    const navBoilerplateRegex = /^(?:chương\s+(?:trước|sau|tiếp|tiếp\s+theo)|mục\s+lục|trang\s+chủ|trở\s+về\s+trang\s+chủ|like\s+this:|chia\s+sẻ:|share\s+this:|loading\.\.\.|theo\s+dõi\s+qua\s+email|wordpress\.com|blog\s+at\s+wordpress\.com|posted\s+in\s+|tag:\s+|category:\s+|đăng\s+bởi\s+|gợi\s+ý\s+pass:?|pass\s+chương:?|pass:?)\s*$/i;
    rawParas = rawParas.filter(p => !navBoilerplateRegex.test(p.trim()));

    // 11. Deduplicate Chapter Title at the top of the body
    if (chapterTitle && rawParas.length > 0) {
      const cleanExpected = this.stripEmojis(chapterTitle).toLowerCase().normalize('NFC').replace(/[\s\-_:–—\[\]\(\)]+/g, '');
      const firstParaClean = this.stripEmojis(rawParas[0]).toLowerCase().normalize('NFC').replace(/[\s\-_:–—\[\]\(\)]+/g, '');

      // Check if first paragraph is a repeat of chapter title:
      // Case A: Exact match
      const isExactMatch = firstParaClean === cleanExpected;

      // Case B: First paragraph explicitly starts with a chapter keyword and contains expected title/number
      const isExplicitChapHeading = /^(?:chương|chap|chapter|hồi|tiết|phần|c\d|vănán|phiênngoại)/i.test(firstParaClean);
      const isContainedHeading = isExplicitChapHeading && (cleanExpected.includes(firstParaClean) || firstParaClean.includes(cleanExpected));

      if (isExactMatch || isContainedHeading) {
        rawParas = rawParas.slice(1);
      }
    }

    // 12. Reconstruct body
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

    // Remove common bracket prefixes like "[BHTT - EDIT HOÀN - CAO H]" or "[BHTT]" or "[EDIT]" or "[FULL]"
    decoded = decoded.replace(/^\[[^\]]+\]\s*/i, '');
    decoded = decoded.replace(/^\([^\)]+\)\s*/i, '');

    // Remove common site suffix like " | WordPress.com" or " – Tên Blog"
    decoded = decoded.replace(/\s*\|\s*(?:wordpress(?:\.com)?|blog\s+của\s+[^\|]+|trang\s+chủ)$/i, '');

    // Check if title has author separator (e.g. "Muốn trăng chỉ soi riêng ta - Lạc Dương Bibi" or "Tên truyện / Tác giả")
    let author: string | undefined = undefined;
    const parts = decoded.split(/\s+[-–—/]\s+/);
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
