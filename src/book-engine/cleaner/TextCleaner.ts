/**
 * TextCleaner - Formatting & Normalization Pipeline for Local Books
 * 
 * Rules:
 * 1. Normalize line endings (CRLF / CR -> LF).
 * 2. Remove UTF-8/16 Byte Order Marks (BOM).
 * 3. Trim trailing spaces on each line.
 * 4. Collapse 3+ consecutive blank lines down to 2 blank lines (retaining paragraph breaks).
 * 5. Normalize unusual whitespace (NBSP, zero-width spaces).
 * 6. NEVER alter literary prose, dialogue quotes, or vocabulary.
 */

export class TextCleaner {
  /**
   * Remove Byte Order Mark (BOM) from string
   */
  public static removeBOM(text: string): string {
    if (text.charCodeAt(0) === 0xFEFF || text.charCodeAt(0) === 0xFFFE) {
      return text.slice(1);
    }
    return text.replace(/^\uFEFF/, '').replace(/^\uFFFE/, '');
  }

  /**
   * Normalize line breaks to standard '\n'
   */
  public static normalizeLineEndings(text: string): string {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * Normalize abnormal whitespace (NBSP, thin spaces, etc.) to standard spaces
   */
  public static normalizeWhitespace(text: string): string {
    // Replace non-breaking space, zero-width space, etc.
    return text
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  }

  /**
   * Trim trailing whitespace on each line while preserving indentations
   */
  public static trimLineEnds(text: string): string {
    return text
      .split('\n')
      .map(line => line.replace(/[ \t]+$/, ''))
      .join('\n');
  }

  /**
   * Collapse 3+ consecutive empty lines into 2 empty lines
   */
  public static collapseExcessiveBlankLines(text: string): string {
    return text.replace(/\n{3,}/g, '\n\n');
  }

  /**
   * Run the full cleaning pipeline on raw text
   */
  public static clean(rawText: string): string {
    if (!rawText) return '';
    let result = this.removeBOM(rawText);
    result = this.normalizeLineEndings(result);
    result = this.normalizeWhitespace(result);
    result = this.trimLineEnds(result);
    result = this.collapseExcessiveBlankLines(result);
    return result.trim();
  }

  /**
   * Convert cleaned text into an array of readable paragraphs
   */
  public static toParagraphs(text: string): string[] {
    if (!text) return [];
    return text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }
}
