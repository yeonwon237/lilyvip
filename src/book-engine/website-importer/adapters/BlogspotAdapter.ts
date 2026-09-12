import { ChapterSorter } from '../chapter-sorter';
import { HtmlCleaner } from '../html-cleaner';
import { safeFetch } from '../safe-fetch';
import type { CandidateChapter, WebsiteAdapter, WebsiteAnalysisResult } from '../types';
import { UrlNormalizer } from '../url-normalizer';
import { ChapterDetector } from '../../chapter-detector/ChapterDetector';

function text(value: string): string {
  return HtmlCleaner.decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function articleHtml(html: string): string {
  const start = html.search(/<div\b(?=[^>]*\bid=["']post-body-\d+["'])[^>]*>/i);
  if (start < 0) return html.match(/<article\b[^>]*>[\s\S]*?<\/article>/i)?.[0] || html;
  const tail = html.slice(start);
  const end = tail.search(/<div\b[^>]*class=["'][^"']*\bpost-footer\b/i);
  return end > 0 ? tail.slice(0, end) : tail;
}

function discoverChapterLinks(body: string, sourceUrl: string): CandidateChapter[] {
  const seen = new Set<string>();
  const discovered: Array<CandidateChapter & { order: number }> = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  let order = 0;
  while ((match = anchorPattern.exec(body))) {
    const title = text(match[2]);
    if (!title || !/^\s*(?:\[[^\]]+\]\s*)?(?:chương|chapter|chap|hồi|phần|phiên ngoại|ngoại truyện|văn án|prologue|epilogue)\b/i.test(title)) continue;
    const url = UrlNormalizer.resolveUrl(HtmlCleaner.decodeHtmlEntities(match[1]), sourceUrl);
    let parsed: URL;
    try { parsed = new URL(url); } catch { continue; }
    const isBlogspot = parsed.hostname === 'blogspot.com' || parsed.hostname.endsWith('.blogspot.com');
    if (!isBlogspot || seen.has(url)) continue;
    const meta = ChapterSorter.parseMeta(title, parsed.pathname, url);
    if (meta.isNoise) continue;
    seen.add(url);
    discovered.push({ index: meta.number ?? order + 1, title: meta.cleanTitle || title, url, specialType: meta.specialType, order: order++ });
  }
  discovered.sort((a, b) => a.index - b.index || a.order - b.order);
  return discovered.map(({ order: _order, ...chapter }, index) => ({ ...chapter, index: index + 1 }));
}

export class BlogspotAdapter implements WebsiteAdapter {
  public name = 'blogspot';
  private chapterCache = new Map<string, { content: string; paragraphs: string[]; wordCount: number }>();

  public canHandle(raw: string): boolean {
    try {
      const url = new URL(raw);
      return url.protocol === 'https:' && (url.hostname === 'blogspot.com' || url.hostname.endsWith('.blogspot.com'));
    } catch { return false; }
  }

  public async analyze(raw: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const sourceUrl = UrlNormalizer.normalize(raw);
    const source = new URL(sourceUrl);
    if (source.pathname === '/' || source.pathname === '') return this.analyzeHomepage(sourceUrl, signal);
    const response = await safeFetch(sourceUrl, { signal });
    if (!response.ok) throw new Error('Không đọc được trang Blogspot công khai này.');
    const html = await response.text();
    if (/Không tìm thấy blog|Blog not found/i.test(html)) throw new Error('Blogspot này không còn tồn tại hoặc không được công khai.');
    const body = articleHtml(html);
    const heading = text(html.match(/<h[123]\b(?=[^>]*class=["'][^"']*(?:post-title|entry-title)[^"']*["'])[^>]*>([\s\S]*?)<\/h[123]>/i)?.[1]
      || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || 'Truyện từ Blogspot').replace(/\s*[-|–]\s*[^-|–]+$/, '');
    const linkedChapters = discoverChapterLinks(body, sourceUrl);
    const chapters = await this.expandChapterBundles(linkedChapters, signal);
    const finalChapters = chapters.length ? chapters : [{ index: 1, title: heading, url: sourceUrl }];
    return {
      adapter: this.name, siteName: source.hostname, hostname: source.hostname, sourceUrl,
      isWordPress: false, isWordPressCom: false,
      candidateBooks: [{ id: `blogspot_${Date.now()}`, title: heading, author: '', sourceUrl, hostname: source.hostname,
        adapterName: this.name, totalChapters: finalChapters.length, chapters: finalChapters, confidence: chapters.length ? 'HIGH' : 'MEDIUM',
        confidenceReason: chapters.length ? `Tìm thấy ${chapters.length} liên kết chương trong mục lục.` : 'Trang được nhập thành một phần.' }],
      isSingleChapterLink: !chapters.length,
      diagnostics: { totalPostsDiscovered: finalChapters.length, totalPagesDiscovered: 1, categoriesDiscovered: 0,
        restRoutes: [], warnings: chapters.length ? [] : ['Không thấy mục lục; Lily sẽ nhập trang này thành một phần.'], errors: [] },
    };
  }

  private async expandChapterBundles(chapters: CandidateChapter[], signal?: AbortSignal): Promise<CandidateChapter[]> {
    const expandedGroups = await Promise.all(chapters.map(async chapter => {
      const range = chapter.title.match(/(?:chương|chapter|chap)\s*(\d+)\s*[-–—~]\s*(\d+)/i);
      if (!range) return [chapter];
      const start = Number(range[1]);
      const end = Number(range[2]);
      const expected = end - start + 1;
      if (expected < 2 || expected > 100) return [chapter];
      try {
        const loaded = await this.loadChapterPage(chapter.url, chapter.title, signal);
        const detection = ChapterDetector.detect(loaded.content);
        const sections = detection.chapters
          .filter(item => item.wordCount >= 100 && !/(?:giới thiệu|mục lục)/i.test(item.title))
          .slice(0, expected);
        if (sections.length !== expected) return [chapter];
        return sections.map((section, offset) => {
          const suffix = section.title.match(/:\s*(.+)$/)?.[1];
          const title = `Chương ${start + offset}${suffix ? `: ${suffix}` : ''}`;
          const url = `${chapter.url}#lily-split=${start + offset}`;
          const paragraphs = section.body.split(/\n\s*\n/).map(item => item.trim()).filter(Boolean);
          this.chapterCache.set(url, { content: section.body, paragraphs, wordCount: section.wordCount });
          return { index: start + offset, title, url } satisfies CandidateChapter;
        });
      } catch {
        return [chapter];
      }
    }));
    return expandedGroups.flat().map((chapter, index) => ({ ...chapter, index: index + 1 }));
  }

  private async analyzeHomepage(sourceUrl: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const source = new URL(sourceUrl);
    const endpoint = `${source.origin}/feeds/posts/default?alt=json&max-results=150`;
    const response = await safeFetch(endpoint, { signal });
    if (!response.ok) throw new Error('Không đọc được danh sách truyện công khai của Blogspot này.');
    const payload = await response.json();
    const entries = Array.isArray(payload?.feed?.entry) ? payload.feed.entry : [];
    const candidateBooks = entries.map((entry: any, position: number) => {
      const title = String(entry?.title?.$t || '').trim();
      const postUrl = entry?.link?.find((link: any) => link?.rel === 'alternate')?.href;
      if (!title || typeof postUrl !== 'string') return null;
      const body = String(entry?.content?.$t || entry?.summary?.$t || '');
      const linked = discoverChapterLinks(body, postUrl);
      const chapters = linked.length ? linked : [{ index: 1, title, url: postUrl }];
      const cleaned = HtmlCleaner.cleanHtml(body, title);
      const author = cleaned.body.match(/(?:^|\n)\s*Tác giả\s*:\s*([^\n]+)/i)?.[1]?.trim() || '';
      return {
        id: `blogspot_${position}_${Date.now()}`, title, author,
        description: cleaned.paragraphs.slice(0, 3).join(' ').slice(0, 500) || undefined,
        coverUrl: typeof entry?.media$thumbnail?.url === 'string' ? entry.media$thumbnail.url.replace(/\/s\d+(?:-c)?\//, '/s800/') : undefined,
        sourceUrl: postUrl, hostname: new URL(postUrl).hostname, adapterName: this.name,
        totalChapters: chapters.length, chapters, confidence: linked.length ? 'HIGH' as const : 'MEDIUM' as const,
        requiresExpansion: !linked.length,
        confidenceReason: linked.length ? `Tìm thấy ${linked.length} phần trong mục lục.` : 'Bài được nhập thành một phần.',
      };
    }).filter(Boolean);
    if (!candidateBooks.length) throw new Error('Blogspot này chưa có truyện công khai Lily có thể nhận diện.');
    const siteName = String(payload?.feed?.title?.$t || source.hostname).trim();
    return {
      adapter: this.name, siteName, hostname: source.hostname, sourceUrl, isWordPress: false, isWordPressCom: false,
      candidateBooks,
      diagnostics: { totalPostsDiscovered: entries.length, totalPagesDiscovered: entries.length, categoriesDiscovered: 0,
        restRoutes: ['Blogger public feed'], warnings: entries.length >= 150 ? ['Blog có nhiều bài; Lily đang hiển thị 150 bài mới nhất.'] : [], errors: [] },
    };
  }

  public async fetchChapterContent(chapter: CandidateChapter, signal?: AbortSignal) {
    const cached = this.chapterCache.get(chapter.url);
    if (cached) return cached;
    return this.loadChapterPage(chapter.url.split('#')[0], chapter.title, signal);
  }

  private async loadChapterPage(url: string, title: string, signal?: AbortSignal) {
    const response = await safeFetch(url, { signal });
    if (!response.ok) throw new Error('Không tải được chương Blogspot này.');
    const html = await response.text();
    const cleaned = HtmlCleaner.cleanHtml(articleHtml(html), title);
    if (!cleaned.paragraphs.length) throw new Error('Chương Blogspot không có nội dung văn bản sau khi lọc.');
    return { content: cleaned.body, paragraphs: cleaned.paragraphs, wordCount: cleaned.wordCount };
  }
}
