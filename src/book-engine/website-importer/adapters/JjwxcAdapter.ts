import { CandidateBook, CandidateChapter, WebsiteAdapter, WebsiteAnalysisResult } from '../types';
import { safeFetch } from '../safe-fetch';
import { JjwxcUrlParser } from '../../jjwxc-source/JjwxcUrlParser';
import { JjwxcTocLoader } from '../../jjwxc-source/JjwxcTocLoader';
import { JjwxcChapterExtractor } from '../../jjwxc-source/JjwxcChapterExtractor';
import { countCjkAwareWords } from '../../jjwxc-source/countCjkAwareWords';

/**
 * Same pattern as every other adapter here (WattpadAdapter, NovelToonAdapter,
 * etc.): a public, unauthenticated fetch through the stateless proxy
 * (server/website-proxy.mjs — credentials always omitted, see safeFetch). This
 * only ever sees what JJWXC shows an anonymous visitor, so it can only import
 * chapters that are actually free/public. A VIP/locked chapter fails to fetch
 * (thrown error → marked failed by ChapterFetchQueue) rather than being
 * skipped silently or guessed at — see JjwxcChapterExtractor's status
 * detection, reused here unchanged.
 *
 * Content-container/TOC selectors are the same best-guess ones documented as
 * UNVERIFIED in JjwxcTocLoader/JjwxcChapterExtractor — calibrate those two
 * files, not this adapter, once real JJWXC HTML has been seen.
 */
export class JjwxcAdapter implements WebsiteAdapter {
  public name = 'jjwxc';

  public canHandle(url: string): boolean {
    return JjwxcUrlParser.parseNovelUrl(url) !== null;
  }

  public async analyze(rawUrl: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const parsed = JjwxcUrlParser.parseNovelUrl(rawUrl);
    if (!parsed) throw new Error('Liên kết JJWXC không đúng dạng https://wap.jjwxc.net/book2/{novelId}.');

    // The plain book page only renders a truncated teaser chapter list (first
    // few + last few); ?more=0&whole=1 is JJWXC's own "expand all chapters"
    // link and returns the complete TOC on the same page.
    const tocUrl = `https://${parsed.hostname}/book2/${parsed.novelId}?more=0&whole=1`;
    const response = await safeFetch(tocUrl, { signal });
    if (!response.ok) throw new Error(`Không thể mở trang truyện JJWXC (${response.status}).`);
    const html = await response.text();

    const toc = JjwxcTocLoader.parse(html);
    if (toc.status === 'session_expired') {
      throw new Error('Trang JJWXC yêu cầu đăng nhập ngay để xem mục lục — Lily chỉ đọc nội dung công khai, không đăng nhập hộ.');
    }
    if (toc.status === 'locked') {
      throw new Error('Không lấy được mục lục — trang yêu cầu mua truyện trước khi xem danh sách chương.');
    }
    if (toc.status === 'unknown_format' || toc.chapters.length === 0) {
      throw new Error('Lily không nhận diện được mục lục của trang này (có thể JJWXC đã đổi giao diện).');
    }

    const chapters: CandidateChapter[] = toc.chapters.map(chapter => ({
      id: chapter.index,
      index: chapter.index,
      title: chapter.title,
      url: new URL(chapter.url, rawUrl).toString(),
    }));

    const candidate: CandidateBook = {
      id: `jjwxc_${parsed.novelId}`,
      title: toc.title || `Truyện JJWXC ${parsed.novelId}`,
      author: toc.author || 'Tác giả JJWXC',
      sourceUrl: rawUrl,
      hostname: parsed.hostname,
      adapterName: this.name,
      totalChapters: chapters.length,
      chapters,
      confidence: 'MEDIUM',
      confidenceReason: 'Mục lục JJWXC dò theo cấu trúc phổ biến, chưa xác minh trên mọi truyện.',
      suggestedCoverColor: '#D9829B',
    };

    return {
      adapter: this.name,
      hostname: parsed.hostname,
      sourceUrl: rawUrl,
      isWordPress: false,
      isWordPressCom: false,
      candidateBooks: [candidate],
      diagnostics: {
        totalPostsDiscovered: chapters.length,
        totalPagesDiscovered: 1,
        categoriesDiscovered: 0,
        restRoutes: [],
        warnings: ['Chương VIP/chưa mua sẽ không tải được — Lily chỉ thêm được các chương miễn phí, công khai.'],
        errors: [],
      },
    };
  }

  public async fetchChapterContent(
    chapter: CandidateChapter,
    signal?: AbortSignal
  ): Promise<{ content: string; paragraphs: string[]; wordCount: number }> {
    if (!chapter?.url) throw new Error('Chương không có đường dẫn hợp lệ.');

    let html = '';
    try {
      const response = await safeFetch(chapter.url, { signal });
      if (!response.ok) throw new Error(`Lỗi tải chương (${response.status}).`);
      html = await response.text();
    } catch (error: any) {
      if (signal?.aborted) throw new Error('Đã hủy tải chương.');
      throw new Error(`Không thể tải chương "${chapter.title}": ${error.message}`);
    }

    const result = JjwxcChapterExtractor.extract(html);
    if (result.status === 'locked') {
      throw new Error(`Chương "${chapter.title}" là chương VIP/chưa mua — Lily không tải được (không vượt qua tường phí).`);
    }
    if (result.status === 'session_expired') {
      throw new Error(`Chương "${chapter.title}" yêu cầu đăng nhập để đọc — Lily chỉ đọc nội dung công khai.`);
    }
    if (result.status === 'unknown_format' || result.paragraphs.length === 0) {
      throw new Error(`Lily không nhận diện được nội dung chương "${chapter.title}".`);
    }

    const content = result.paragraphs.join('\n\n');
    return { content, paragraphs: result.paragraphs, wordCount: countCjkAwareWords(result.paragraphs) };
  }
}
