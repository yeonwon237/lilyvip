import { 
  CandidateBook, 
  WebsiteAdapter, 
  WebsiteAnalysisResult 
} from '../types';
import { HtmlCleaner } from '../html-cleaner';
import { UrlNormalizer } from '../url-normalizer';
import { safeFetch } from '../safe-fetch';

export class CanvaDirectoryAdapter implements WebsiteAdapter {
  public name = 'canva';

  /**
   * Determine if URL belongs to Canva Sites
   */
  public canHandle(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.hostname.toLowerCase().includes('.my.canva.site') || parsed.hostname.toLowerCase().includes('canva.site');
    } catch {
      return false;
    }
  }

  /**
   * Parse slug into clean readable title
   */
  private formatSlugToTitle(rawSlug: string): string {
    const clean = decodeURIComponent(rawSlug)
      .replace(/[0-9a-f]{32}/gi, '') // Remove hex IDs in Notion URLs
      .replace(/[-_]+/g, ' ')
      .trim();

    if (!clean) return 'Tác phẩm';
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  /**
   * Analyze Canva directory site and extract external story links
   */
  public async analyze(rawUrl: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const normalizedUrl = UrlNormalizer.normalize(rawUrl);
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      throw new Error('Địa chỉ Canva Site không hợp lệ.');
    }

    const hostname = parsedUrl.hostname;
    let html = '';

    try {
      const res = await safeFetch(normalizedUrl, { signal });
      if (!res.ok) {
        throw new Error(`Máy chủ Canva phản hồi mã lỗi ${res.status}.`);
      }
      html = await res.text();
    } catch (err: any) {
      if (signal?.aborted) throw new Error('Đã hủy phân tích website.');
      throw new Error(`Không thể kết nối đến Canva Site (${err.message}).`);
    }

    // Extract site title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const siteTitle = titleMatch ? titleMatch[1].trim() : 'Trang tổng hợp tác phẩm';

    // Extract all external story hyperlinks
    const linkRegex = /https?:\/\/[a-zA-Z0-9\.\-_/]+/g;
    const allMatches = html.match(linkRegex) || [];
    
    // Filter to only novel / project targets (e.g. Notion pages, story websites, WordPress, Wattpad)
    const storyLinks = [...new Set(allMatches)].filter(link => {
      const lower = link.toLowerCase();
      // Exclude asset and Canva internals
      if (lower.includes('canva.com') || lower.includes('canva.site') || lower.includes('static_font') || lower.includes('.png') || lower.includes('.js') || lower.includes('.css')) {
        return false;
      }
      return (
        lower.includes('notion.site') ||
        lower.includes('stories') ||
        lower.includes('truyen') ||
        lower.includes('wordpress.com') ||
        lower.includes('wattpad.com') ||
        lower.includes('wdoiquan.com')
      );
    });

    if (storyLinks.length === 0) {
      throw new Error(`Đây là trang danh mục Canva (${siteTitle}). Không tìm thấy liên kết truyện bên ngoài nào.`);
    }

    // Build CandidateBook for each discovered story
    const candidateBooks: CandidateBook[] = storyLinks.map((link, idx) => {
      let slug = '';
      try {
        const u = new URL(link);
        const parts = u.pathname.split('/').filter(Boolean);
        slug = parts[parts.length - 1] || u.hostname;
      } catch {
        slug = `Truyen ${idx + 1}`;
      }

      const bookTitle = this.formatSlugToTitle(slug);

      return {
        id: `canva_link_${idx + 1}`,
        title: bookTitle,
        author: siteTitle,
        sourceUrl: link,
        hostname: new URL(link).hostname,
        totalChapters: 1,
        chapters: [{
          id: `chap_${idx + 1}`,
          index: 1,
          title: `Chương mở đầu / Mục lục`,
          url: link,
        }],
        confidence: 'HIGH',
        suggestedCoverColor: '#7A4988',
        adapterName: this.name,
      };
    });

    return {
      adapter: this.name,
      hostname,
      sourceUrl: normalizedUrl,
      isWordPress: false,
      isWordPressCom: false,
      candidateBooks,
      diagnostics: {
        totalPostsDiscovered: candidateBooks.length,
        totalPagesDiscovered: 1,
        categoriesDiscovered: candidateBooks.length,
        restRoutes: [normalizedUrl],
        warnings: [],
        errors: [],
      },
    };
  }

  /**
   * Fetch chapter body content
   */
  public async fetchChapterContent(
    chapter: any,
    signal?: AbortSignal
  ): Promise<{ content: string; paragraphs: string[]; wordCount: number }> {
    if (!chapter || !chapter.url) {
      throw new Error('Chương không có đường dẫn hợp lệ.');
    }

    let html = '';
    try {
      const res = await safeFetch(chapter.url, { signal });
      if (!res.ok) throw new Error(`Lỗi tải trang (${res.status}).`);
      html = await res.text();
    } catch (err: any) {
      if (signal?.aborted) throw new Error('Đã hủy tải.');
      throw new Error(`Không thể tải nội dung (${err.message}).`);
    }

    const { body, paragraphs, wordCount } = HtmlCleaner.cleanHtml(html, chapter.title);
    return { content: body, paragraphs, wordCount };
  }
}
