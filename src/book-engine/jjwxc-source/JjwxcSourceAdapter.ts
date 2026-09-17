import { BookSourceMeta, ImportDiagnostics, NormalizedChapter, ParsedBookDraft } from '../types';
import { JjwxcTocResult } from './JjwxcTocLoader';

/**
 * Not a `WebsiteAdapter` (the interface every other src/book-engine/website-importer
 * adapter implements): those are fetched statelessly through the server-side proxy
 * (server/website-proxy.mjs), which has no JJWXC cookie and never will. JJWXC pages
 * can only be read from the user's own already-logged-in browser session — how that
 * HTML/text actually reaches this adapter (copy-paste, bookmarklet, or otherwise) is
 * a separate, not-yet-decided piece; this class only does the pure mapping once a
 * parsed TOC is in hand.
 *
 * Chapter bodies are intentionally left empty (`paragraphs: []`) here — see
 * JjwxcChapterService for how a chapter's text gets filled in later.
 */
export class JjwxcSourceAdapter {
  /** Pure mapping from an already-parsed TOC into a library-ready draft — no
   * network call, safe to unit test directly. */
  public static mapTocToDraft(novelId: string, hostname: string, toc: JjwxcTocResult): ParsedBookDraft | null {
    if (toc.status !== 'ok' || toc.chapters.length === 0) return null;

    const chapters: NormalizedChapter[] = toc.chapters.map(chapter => ({
      id: `jjwxc_${novelId}_chap_${chapter.index}`,
      bookId: '', // filled in by LocalBookSource.saveBook when the book id is assigned
      index: chapter.index,
      title: chapter.title,
      paragraphs: [],
      wordCount: 0,
      sourceUrl: chapter.url,
    }));

    const diagnostics: ImportDiagnostics = {
      format: 'WEBSITE',
      fileSize: 0,
      decodedEncoding: 'UTF-8',
      rawCharacters: 0,
      cleanedCharacters: 0,
      detectedHeadingCount: chapters.length,
      chapterCount: chapters.length,
      detectionStrategy: 'JJWXC TOC Loader',
      confidence: 'MEDIUM',
      warnings: ['Nội dung từng chương sẽ được thêm sau, không tải trước toàn bộ.'],
      errors: [],
      firstChaptersPreview: chapters.slice(0, 3).map(c => `${c.index}. ${c.title}`),
      lastChaptersPreview: chapters.slice(-3).map(c => `${c.index}. ${c.title}`),
    };

    return {
      title: toc.title || `Truyện JJWXC ${novelId}`,
      author: toc.author || 'Không rõ',
      originalFileName: hostname,
      fileFormat: 'WEBSITE',
      fileSizeMB: 0.1,
      totalChapters: chapters.length,
      wordCount: 0,
      chapters,
      hasDetectedChapters: true,
      confidence: 'MEDIUM',
      detectionStrategy: 'JJWXC TOC Loader',
      diagnostics,
      suggestedCoverColor: '#D9829B',
    };
  }

  public static buildSourceMeta(novelUrl: string, hostname: string, novelId: string): BookSourceMeta {
    return {
      type: 'website',
      adapter: 'jjwxc',
      url: novelUrl,
      hostname,
      novelId,
      importedAt: new Date().toISOString(),
    };
  }
}
