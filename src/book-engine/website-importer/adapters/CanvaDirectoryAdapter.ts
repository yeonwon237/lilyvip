import { WebsiteAdapter, WebsiteAnalysisResult, CandidateChapter } from '../types';
import { HtmlCleaner } from '../html-cleaner';
import { safeFetch } from '../safe-fetch';

export class CanvaDirectoryAdapter implements WebsiteAdapter {
  public name = 'canva';
  public canHandle(raw: string): boolean {
    try { const u = new URL(raw); return u.protocol === 'https:' && u.hostname.endsWith('.my.canva.site'); }
    catch { return false; }
  }

  public async analyze(raw: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const source = new URL(raw);
    const response = await safeFetch(source.href, { signal });
    if (!response.ok) throw new Error('Lily chưa thể mở trang danh mục Canva này.');
    const html = await response.text();
    const links = new Map<string, string>();
    const add = (rawUrl: string, label = '') => {
      try {
        const url = new URL(HtmlCleaner.decodeHtmlEntities(rawUrl), source);
        if (url.protocol !== 'https:' || url.username || url.password) return;
        const host = url.hostname;
        if (!['wordpress.com', 'wattpad.com', 'wikicv.org', 'wikidich.net', 'notion.site', 'wdoiquan.com']
          .some(domain => host === domain || host.endsWith(`.${domain}`))) return;
        const title = HtmlCleaner.decodeHtmlEntities(label.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
        if (!links.has(url.href) || title) links.set(url.href, title);
      } catch { /* Ignore malformed directory entries. */ }
    };
    for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) add(match[1], match[2]);
    // Canva can embed URLs in serialized page data instead of anchor elements.
    for (const match of html.replace(/\\\//g, '/').matchAll(/https?:\/\/[^\s<>"'\\]+/g)) add(match[0]);
    const externalLinks = [...links].map(([url, title], index) => {
      const host = new URL(url).hostname;
      return { url, title: title || `Liên kết truyện ${index + 1} · ${host}`,
        supported: ['wordpress.com', 'wattpad.com', 'wikicv.org', 'wikidich.net'].some(d => host === d || host.endsWith(`.${d}`)) };
    });
    if (!externalLinks.length) throw new Error('Không tìm thấy liên kết truyện công khai trên trang Canva này.');
    return { adapter: this.name, hostname: source.hostname, sourceUrl: source.href,
      isWordPress: false, isWordPressCom: false, candidateBooks: [], externalLinks,
      diagnostics: { totalPostsDiscovered: 0, totalPagesDiscovered: 1, categoriesDiscovered: 0,
        restRoutes: [], warnings: ['Canva là trang danh mục; nội dung truyện nằm ở website đích.'], errors: [] } };
  }

  public async fetchChapterContent(_chapter: CandidateChapter): Promise<{ content: string; paragraphs: string[]; wordCount: number }> {
    throw new Error('Hãy chọn nguồn truyện từ danh mục Canva trước khi nhập.');
  }
}
