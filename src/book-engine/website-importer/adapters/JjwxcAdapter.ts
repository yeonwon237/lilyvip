import { CandidateBook, CandidateChapter, WebsiteAdapter, WebsiteAnalysisResult } from '../types';
import { safeFetch } from '../safe-fetch';
import { JjwxcUrlParser } from '../../jjwxc-source/JjwxcUrlParser';
import { JjwxcTocLoader } from '../../jjwxc-source/JjwxcTocLoader';
import { JjwxcChapterExtractor } from '../../jjwxc-source/JjwxcChapterExtractor';
import { JjwxcCookieStorage } from '../../jjwxc-source/JjwxcCookieStorage';
import { countCjkAwareWords } from '../../jjwxc-source/countCjkAwareWords';

/**
 * JJWXC website adapter: fetches chapters through the local/edge proxy.
 * If user has saved a JJWXC session cookie (via JjwxcCookieStorage), it is
 * securely forwarded strictly to jjwxc.net to fetch purchased VIP chapters.
 * If no cookie is provided or the chapter is not purchased, VIP chapters fail
 * closed with clear feedback.
 */
export class JjwxcAdapter implements WebsiteAdapter {
  public name = 'jjwxc';

  public canHandle(url: string): boolean {
    return JjwxcUrlParser.parseNovelUrl(url) !== null || JjwxcUrlParser.extractNovelId(url) !== null;
  }

  public async analyze(rawUrl: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const canonical = JjwxcUrlParser.toWapUrl(rawUrl) || rawUrl;
    const parsed = JjwxcUrlParser.parseNovelUrl(canonical);
    if (!parsed) throw new Error('Liên kết hoặc BookID Tấn Giang không hợp lệ. Vui lòng nhập BookID (VD: 9209789) hoặc liên kết https://wap.jjwxc.net/book2/{novelId}.');

    // The plain book page only renders a truncated teaser chapter list (first
    // few + last few); ?more=0&whole=1 is JJWXC's own "expand all chapters"
    // link and returns the complete TOC on the same page.
    const tocUrl = `https://${parsed.hostname}/book2/${parsed.novelId}?more=0&whole=1`;
    const response = await safeFetch(tocUrl, { signal });
    if (!response.ok) throw new Error(`Không thể mở trang truyện JJWXC (${response.status}).`);
    const html = await response.text();

    const toc = JjwxcTocLoader.parse(html);
    if (toc.status === 'not_found') {
      throw new Error('Truyện không tồn tại trên Tấn Giang (Book ID không đúng hoặc truyện đã bị tác giả gỡ bỏ).');
    }
    if (toc.status === 'content_locked') {
      throw new Error('Truyện này đã bị Tấn Giang khóa (do tác giả ẩn truyện hoặc chính sách kiểm duyệt của Tấn Giang).');
    }
    if (toc.status === 'session_expired') {
      throw new Error('Trang JJWXC yêu cầu đăng nhập ngay để xem mục lục — vui lòng kiểm tra lại liên kết hoặc nhập Cookie JJWXC.');
    }
    if (toc.status === 'locked') {
      throw new Error('Không lấy được mục lục — trang yêu cầu mua truyện trước khi xem danh sách chương.');
    }
    if (toc.status === 'unknown_format' || toc.chapters.length === 0) {
      throw new Error('Lily không nhận diện được mục lục của trang này (có thể truyện đã bị khóa hoặc JJWXC đổi giao diện).');
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

    const hasCookie = JjwxcCookieStorage.hasCookie();
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
        warnings: [
          hasCookie
            ? 'Đang sử dụng Cookie Tấn Giang để tải các chương VIP đã mua.'
            : 'Chương VIP/chưa mua sẽ không tải được nếu chưa nhập Cookie tài khoản Tấn Giang.',
        ],
        errors: [],
      },
    };
  }

  public async fetchChapterContent(
    chapter: CandidateChapter,
    signal?: AbortSignal
  ): Promise<{ content: string; paragraphs: string[]; wordCount: number; fontFamily?: string; fontUrl?: string }> {
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

    const result = await JjwxcChapterExtractor.extractAsync(html);
    const hasCookie = JjwxcCookieStorage.hasCookie();
    if (result.status === 'locked') {
      throw new Error(
        hasCookie
          ? `Chương "${chapter.title}" là chương VIP và tài khoản Tấn Giang chưa mua chương này.`
          : `Chương "${chapter.title}" là chương VIP/chưa mua — vui lòng nhập Cookie tài khoản đã mua trên Tấn Giang để tải.`
      );
    }
    if (result.status === 'session_expired') {
      throw new Error(
        hasCookie
          ? `Phiên Cookie JJWXC đã hết hạn hoặc không hợp lệ — vui lòng cập nhật lại Cookie Tấn Giang.`
          : `Chương "${chapter.title}" yêu cầu đăng nhập — vui lòng nhập Cookie JJWXC để tải chương này.`
      );
    }
    if (result.status === 'unknown_format' || result.paragraphs.length === 0) {
      throw new Error(`Lily không nhận diện được nội dung chương "${chapter.title}".`);
    }

    const content = result.paragraphs.join('\n\n');
    return {
      content,
      paragraphs: result.paragraphs,
      wordCount: countCjkAwareWords(result.paragraphs),
      fontFamily: result.fontFamily,
      fontUrl: result.fontUrl,
    };
  }
}
