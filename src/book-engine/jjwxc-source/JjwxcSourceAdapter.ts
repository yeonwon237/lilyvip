import { BookSourceMeta, ImportDiagnostics, NormalizedChapter, ParsedBookDraft } from '../types';
import { JjwxcUrlParser } from './JjwxcUrlParser';
import { JjwxcTocFetchResult, JjwxcTocFetchStatus, JjwxcWebViewService } from './JjwxcWebViewService';

export type JjwxcImportStatus = JjwxcTocFetchStatus | 'invalid_url';

export interface JjwxcImportResult {
  status: JjwxcImportStatus;
  draft: ParsedBookDraft | null;
  novelId: string | null;
}

/**
 * Not a `WebsiteAdapter` (the interface every other src/book-engine/website-importer
 * adapter implements): those are fetched statelessly and concurrently through the
 * server-side proxy (server/website-proxy.mjs), which has no JJWXC cookie and never
 * will. JJWXC only goes through the authenticated native WebView, one page at a
 * time — a deliberately separate, parallel entry point, not registered with
 * WebsiteImporter.registerAdapter().
 *
 * This only builds the TOC/metadata draft. Chapter bodies are intentionally left
 * empty (`paragraphs: []`) here — see JjwxcChapterService for the lazy fetch that
 * happens when the reader actually opens a chapter.
 */
export class JjwxcSourceAdapter {
  /** Pure mapping from an already-parsed TOC into a library-ready draft — no
   * network/WebView call, safe to unit test directly. */
  public static mapTocToDraft(novelId: string, hostname: string, toc: JjwxcTocFetchResult): ParsedBookDraft | null {
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
      warnings: ['Nội dung từng chương sẽ được tải khi bạn mở đọc, không tải trước toàn bộ.'],
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

  /** Full flow: parse URL → load TOC via authenticated WebView → map to draft.
   * Native-only (goes through JjwxcWebViewService); not unit-testable off-device. */
  public static async buildDraftFromUrl(rawUrl: string, isOwner: boolean | undefined): Promise<JjwxcImportResult> {
    const parsed = JjwxcUrlParser.parseNovelUrl(rawUrl);
    if (!parsed) return { status: 'invalid_url', draft: null, novelId: null };

    const toc = await JjwxcWebViewService.fetchToc(rawUrl, isOwner);
    if (toc.status !== 'ok') {
      return { status: toc.status, draft: null, novelId: parsed.novelId };
    }

    const draft = this.mapTocToDraft(parsed.novelId, parsed.hostname, toc);
    if (!draft) return { status: 'unknown_format', draft: null, novelId: parsed.novelId };

    return { status: 'ok', draft, novelId: parsed.novelId };
  }
}
