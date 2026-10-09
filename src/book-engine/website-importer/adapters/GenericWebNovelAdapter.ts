import { ChapterSorter } from '../chapter-sorter';
import { HtmlCleaner } from '../html-cleaner';
import { UrlNormalizer } from '../url-normalizer';
import type { CandidateChapter, WebsiteAdapter, WebsiteAnalysisResult } from '../types';

/** Local experiment for public, server-rendered chapter-list pages. */
export class GenericWebNovelAdapter implements WebsiteAdapter {
  readonly name = 'generic-web-novel';

  canHandle(url: string): boolean {
    try { return new URL(url).protocol === 'https:'; } catch { return false; }
  }

  private async page(url: string, signal?: AbortSignal): Promise<Document> {
    const response = await fetch(`/api/local-webpage?url=${encodeURIComponent(url)}`, { signal, credentials: 'omit' });
    if (response.headers.get('X-Lily-Proxy') !== '1') throw new Error('Bộ nhập nguồn chung chỉ hoạt động trên localhost.');
    if (!response.ok) throw new Error(`Không tải được trang nguồn (HTTP ${response.status}).`);
    return new DOMParser().parseFromString(await response.text(), 'text/html');
  }

  async analyze(url: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const page = await this.page(url, signal);
    const origin = new URL(url).origin;
    const entries: Array<{ title: string; url: string; el: Element }> = [];
    const seen = new Set<string>();
    for (const el of page.querySelectorAll('a[href]')) {
      if (entries.length >= 3000) break;
      const title = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!title || title.length > 160) continue;
      let target: URL;
      try { target = new URL(el.getAttribute('href') || '', url); } catch { continue; }
      if (target.protocol !== 'https:' || target.origin !== origin) continue;
      const normalized = UrlNormalizer.normalize(target.href);
      if (seen.has(normalized)) continue;
      // A numeric URL alone is not evidence of a chapter. Otherwise sidebar
      // links such as RSS, Report Chapter and Previous Chapter become chapters.
      const meta = ChapterSorter.parseMeta(title);
      if (meta.isNoise || (meta.number === null && !meta.specialType)) continue;
      seen.add(normalized);
      entries.push({ title, url: normalized, el });
    }

    // Pick the deepest list covering most chapter-like links. Sidebars and
    // "latest chapters" widgets usually have much lower coverage.
    const counts = new Map<Element, number>();
    for (const entry of entries) {
      for (let parent = entry.el.parentElement; parent; parent = parent.parentElement) {
        counts.set(parent, (counts.get(parent) || 0) + 1);
      }
    }
    const minimum = Math.max(3, Math.ceil(entries.length * 0.75));
    const container = [...counts].filter(([, count]) => count >= minimum)
      .sort(([a], [b]) => this.depth(b) - this.depth(a))[0]?.[0];
    const links = container ? entries.filter(entry => container.contains(entry.el)) : [];
    if (links.length < 3) throw new Error('Không thấy mục lục đủ rõ trên trang này. Hãy dán link trang mục lục của truyện.');

    const ordered = ChapterSorter.processAndSortChapters(links.map(({ title, url }) => ({ title, url })));
    const title = page.querySelector('meta[property="og:novel:book_name"], meta[property="og:title"]')?.getAttribute('content')
      || page.querySelector('h1')?.textContent?.trim()
      || page.title.split(/\s*[|｜]\s*/)[0]?.trim()
      || new URL(url).hostname;
    const author = page.querySelector('meta[property="og:novel:author"], meta[name="author"]')?.getAttribute('content') || '';
    const rawCover = page.querySelector('meta[property="og:image"]')?.getAttribute('content');
    let coverUrl: string | undefined;
    try { if (rawCover) coverUrl = new URL(rawCover, url).href; } catch { /* optional */ }
    const hostname = new URL(url).hostname;
    const candidate = {
      id: `generic_${hostname}_${Date.now()}`,
      title: HtmlCleaner.cleanTitle(title).title,
      author,
      sourceUrl: url,
      hostname,
      adapterName: this.name,
      totalChapters: ordered.chapters.length,
      chapters: ordered.chapters,
      confidence: 'MEDIUM' as const,
      confidenceReason: 'Nhận diện tự động từ link chương; cần xem lại trước khi nhập.',
      missingChapters: ordered.missingChapters,
      duplicateChapters: ordered.duplicateChapters,
      coverUrl,
    };
    return {
      adapter: this.name, hostname, sourceUrl: url, isWordPress: false, isWordPressCom: false,
      candidateBooks: [candidate],
      diagnostics: { totalPostsDiscovered: 0, totalPagesDiscovered: 1, categoriesDiscovered: 0,
        restRoutes: [], warnings: ['Bộ nhập nguồn chung đang thử nghiệm trên localhost.'], errors: [] },
    };
  }

  private depth(el: Element): number {
    let depth = 0;
    for (let parent = el.parentElement; parent; parent = parent.parentElement) depth++;
    return depth;
  }

  async fetchChapterContent(chapter: CandidateChapter, signal?: AbortSignal) {
    const page = await this.page(chapter.url, signal);
    const selectors = ['#chapter-content', '.chapter-content', '.read-content', '.entry-content',
      '.post-content', 'article', 'main'];
    const choices = selectors.flatMap(selector => [...page.querySelectorAll(selector)]);
    const content = choices.sort((a, b) => (b.textContent?.length || 0) - (a.textContent?.length || 0))[0];
    if (!content) throw new Error('Không nhận diện được nội dung chương trên trang này.');
    const copy = content.cloneNode(true) as Element;
    copy.querySelectorAll('script,style,nav,footer,aside,form,iframe,.ads,.advertisement,.comments').forEach(el => el.remove());
    const cleaned = HtmlCleaner.cleanHtml(copy.innerHTML, chapter.title);
    if (cleaned.body.length < 100) throw new Error('Nội dung chương quá ngắn hoặc trang yêu cầu đăng nhập/JavaScript.');
    return { content: cleaned.body, paragraphs: cleaned.paragraphs, wordCount: cleaned.wordCount };
  }
}
