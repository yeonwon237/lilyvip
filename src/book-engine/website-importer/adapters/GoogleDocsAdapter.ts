import { WebsiteAdapter, WebsiteAnalysisResult, CandidateChapter } from '../types';
import { safeFetch } from '../safe-fetch';
import { HtmlCleaner } from '../html-cleaner';
import { UrlNormalizer } from '../url-normalizer';

/** Only public documents; never forwards a user's Google session. */
export class GoogleDocsAdapter implements WebsiteAdapter {
  public name = 'google-docs';
  public canHandle(raw: string): boolean {
    try { const u = new URL(raw); return u.protocol === 'https:' && u.hostname === 'docs.google.com'; }
    catch { return false; }
  }
  private endpoint(raw: string): string {
    const u = new URL(UrlNormalizer.normalize(raw));
    if (!this.canHandle(u.href) || u.username || u.password) throw new Error('Liên kết Google Docs không hợp lệ.');
    const published = u.pathname.match(/^\/document\/d\/e\/([\w-]+)\/pub\/?$/);
    if (published) return `https://docs.google.com/document/d/e/${published[1]}/pub`;
    const doc = u.pathname.match(/^\/document\/d\/([\w-]+)(?:\/(?:edit|view|preview|export|pub))?\/?$/);
    if (doc && u.pathname.replace(/\/$/, '').endsWith('/pub')) return `https://docs.google.com/document/d/${doc[1]}/pub`;
    if (!doc) throw new Error('Hãy dán liên kết tài liệu Google Docs, không phải thư mục Drive hoặc bảng tính.');
    return `https://docs.google.com/document/d/${doc[1]}/export?format=txt`;
  }
  private async read(raw: string, signal?: AbortSignal) {
    const endpoint = this.endpoint(raw);
    const res = await safeFetch(endpoint, { signal });
    if (!res.ok) throw new Error('Không đọc được Google Docs. Chủ tài liệu cần bật quyền xem công khai hoặc Xuất bản lên web; Lily không đăng nhập Google.');
    const text = await res.text();
    const published = new URL(endpoint).pathname.endsWith('/pub');
    let title = 'Tài liệu Google Docs';
    let paragraphs: string[];
    if (published) {
      if (!/id=["']contents["']/i.test(text)) throw new Error('Google Docs chưa xuất bản nội dung văn bản công khai.');
      const titleHtml = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
      if (titleHtml) title = HtmlCleaner.decodeHtmlEntities(titleHtml.replace(/<[^>]+>/g, '')).trim();
      // The published document has a dedicated contents region; exclude page chrome.
      const body = text.slice(text.search(/<div\b[^>]*id=["']contents["']/i));
      paragraphs = HtmlCleaner.cleanHtml(body, '').paragraphs;
    } else {
      if (!/^text\/plain\b/i.test(res.headers.get('content-type') || '') || /^\s*<(?:!doctype|html)/i.test(text)) {
        throw new Error('Google Docs yêu cầu quyền truy cập hoặc đã tắt tải xuống. Hãy dùng liên kết Xuất bản lên web nếu chủ tài liệu cho phép.');
      }
      paragraphs = text.replace(/^\uFEFF/, '').split(/\r?\n/).map(p => p.trim()).filter(Boolean);
    }
    if (!paragraphs.length) throw new Error('Tài liệu Google Docs không có văn bản để đọc.');
    const content = paragraphs.join('\n\n');
    return { title, content, paragraphs, wordCount: content.split(/\s+/).length };
  }
  public async analyze(raw: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const sourceUrl = UrlNormalizer.normalize(raw);
    const document = await this.read(sourceUrl, signal);
    const chapter = { index: 1, title: document.title, url: sourceUrl };
    return { adapter: this.name, hostname: 'docs.google.com', sourceUrl, isWordPress: false, isWordPressCom: false,
      candidateBooks: [{ id: `gdocs_${Date.now()}`, title: document.title, author: '', sourceUrl,
        hostname: 'docs.google.com', adapterName: this.name, totalChapters: 1, chapters: [chapter], confidence: 'HIGH' }],
      diagnostics: { totalPostsDiscovered: 1, totalPagesDiscovered: 1, categoriesDiscovered: 0, restRoutes: [],
        warnings: ['Tài liệu được nhập thành một phần; bạn có thể đổi tên trước khi lưu.'], errors: [] } };
  }
  public async fetchChapterContent(chapter: CandidateChapter, signal?: AbortSignal) {
    return this.read(chapter.url, signal);
  }
}
