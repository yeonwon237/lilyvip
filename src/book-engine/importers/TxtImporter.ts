import { ParsedBookDraft, NormalizedChapter } from '../types';
import { TextCleaner } from '../cleaner/TextCleaner';
import { ChapterDetector } from '../chapter-detector/ChapterDetector';

export class TxtImporter {
  /**
   * Derive a clean human-readable title from a raw filename
   * e.g., "truong-an-da-vu_full.txt" -> "Truong An Da Vu"
   */
  public static cleanFileNameToTitle(fileName: string): string {
    const withoutExt = fileName.replace(/\.[^/.]+$/, '');
    const cleanWords = withoutExt
      .replace(/[_\-+]+/g, ' ')
      .replace(/\s*(?:full|hoan|convert|dich|edit|raw)\s*$/i, '')
      .trim();

    if (!cleanWords) return 'Tác phẩm mới';

    // Capitalize first letter of each word
    return cleanWords
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * Try to decode ArrayBuffer with UTF-8, with fallback
   */
  public static decodeBuffer(buffer: ArrayBuffer): string {
    try {
      const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
      return utf8Decoder.decode(buffer);
    } catch {
      // Fallback to basic ascii/latin1 string conversion
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return binary;
    }
  }

  /**
   * Suggest a pleasant aesthetic cover color based on title hash
   */
  private static pickCoverColor(title: string): string {
    const colors = [
      '#D9829B', // Rose Lily
      '#7AA387', // Matcha Jade
      '#8C7AB3', // Lavender Moon
      '#D19A66', // Amber Vintage
      '#5C8E9E', // Azure Ocean
      '#9C6B82', // Plum Silk
    ];
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  /**
   * Inspect the first few lines of text for title/author metadata patterns
   */
  private static extractMetadataFromHeader(rawLines: string[], fallbackTitle: string): { title: string; author: string } {
    let extractedTitle = fallbackTitle;
    let extractedAuthor = 'Chưa rõ tác giả';

    const headerSnippet = rawLines.slice(0, 15);
    for (const line of headerSnippet) {
      const trimmed = line.trim();

      // Check for "Tác giả: ...", "Tác giả : ..."
      const authorMatch = trimmed.match(/^(?:Tác giả|Tac gia|Author)\s*[:：\-]\s*(.+)$/i);
      if (authorMatch && authorMatch[1]) {
        extractedAuthor = authorMatch[1].trim();
        continue;
      }

      // Check for "Tên truyện: ...", "Tựa đề: ..."
      const titleMatch = trimmed.match(/^(?:Tên truyện|Ten truyen|Tựa đề|Tác phẩm|Title)\s*[:：\-]\s*(.+)$/i);
      if (titleMatch && titleMatch[1]) {
        extractedTitle = titleMatch[1].trim();
        continue;
      }
    }

    return { title: extractedTitle, author: extractedAuthor };
  }

  /**
   * Parse a raw TXT File into a ParsedBookDraft
   */
  public static async parseFile(file: File): Promise<ParsedBookDraft> {
    const arrayBuffer = await file.arrayBuffer();
    const rawText = this.decodeBuffer(arrayBuffer);
    const cleanedText = TextCleaner.clean(rawText);

    const fallbackTitle = this.cleanFileNameToTitle(file.name);
    const { title, author } = this.extractMetadataFromHeader(cleanedText.split('\n'), fallbackTitle);

    const detection = ChapterDetector.detect(cleanedText, 'Chương 1: Khởi đầu');
    const fileSizeMB = Number((file.size / (1024 * 1024)).toFixed(2)) || 0.1;

    // Convert to normalized chapters
    const chapters: NormalizedChapter[] = detection.chapters.map((c) => ({
      id: `chap-${c.index}`,
      bookId: '', // Will be assigned on save
      index: c.index,
      title: c.title,
      paragraphs: TextCleaner.toParagraphs(c.body),
      wordCount: c.wordCount,
    }));

    return {
      title,
      author,
      originalFileName: file.name,
      fileFormat: 'TXT',
      fileSizeMB,
      totalChapters: chapters.length,
      wordCount: detection.totalWords,
      chapters,
      hasDetectedChapters: detection.hasDetectedChapters,
      rawBlob: arrayBuffer,
      suggestedCoverColor: this.pickCoverColor(title),
    };
  }
}
