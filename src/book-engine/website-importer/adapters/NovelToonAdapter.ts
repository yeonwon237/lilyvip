import { HtmlCleaner } from '../html-cleaner';
import { safeFetch } from '../safe-fetch';
import { UrlNormalizer } from '../url-normalizer';
import { CandidateBook, CandidateChapter, WebsiteAdapter, WebsiteAnalysisResult } from '../types';

interface NovelToonEpisode { id: number; title: string; weight: number; is_fee?: boolean | number }

export function parseNovelToonEpisodes(html: string): NovelToonEpisode[] {
  const match = html.match(/\bdata\s*=\s*JSON\.parse\('([\s\S]*?)'\);/i);
  if (!match) return [];
  try {
    const json = match[1]
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\//g, '/');
    const value = JSON.parse(json);
    return Array.isArray(value) ? value.filter(item => item && Number.isFinite(Number(item.id))) : [];
  } catch {
    return [];
  }
}

export class NovelToonAdapter implements WebsiteAdapter {
  public name = 'noveltoon';

  public canHandle(raw: string): boolean {
    try {
      const host = new URL(raw).hostname.toLowerCase();
      return host === 'noveltoon.vn' || host === 'www.noveltoon.vn';
    } catch { return false; }
  }

  public async analyze(rawUrl: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const input = new URL(UrlNormalizer.normalize(rawUrl));
    const detail = input.pathname.match(/^\/vi\/detail\/(\d+)/i);
    const watch = input.pathname.match(/^\/vi\/watch\/(\d+)\/(\d+)/i);
    const bookId = detail?.[1] || watch?.[1];
    if (!bookId) {
      throw new Error('Hãy mở một truyện NovelToon rồi dán liên kết trang truyện hoặc chương đang đọc.');
    }

    const storyUrl = `${input.origin}/vi/detail/${bookId}`;
    const response = await safeFetch(storyUrl, { signal });
    if (!response.ok) throw new Error(`Không thể mở truyện NovelToon (${response.status}).`);
    const html = await response.text();
    const title = HtmlCleaner.decodeHtmlEntities(
      html.match(/<h1[^>]*class="[^"]*detail-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
        ?.replace(/<[^>]+>/g, '').trim() || 'Truyện NovelToon'
    );
    const author = HtmlCleaner.decodeHtmlEntities(
      html.match(/class="[^"]*detail-author[^>]*>\s*Tên tác giả:\s*([^<]+)/i)?.[1]?.trim() || 'Tác giả NovelToon'
    );
    const coverUrl = html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1];
    const allEpisodes = parseNovelToonEpisodes(html);
    if (!allEpisodes.length) throw new Error('NovelToon không cung cấp mục lục công khai cho truyện này.');

    const publicEpisodes = allEpisodes.filter(item => !item.is_fee);
    if (!publicEpisodes.length) throw new Error('Truyện NovelToon này không có chương miễn phí công khai để nhập.');
    const chapters: CandidateChapter[] = publicEpisodes.map((episode, position) => ({
      id: episode.id,
      index: position + 1,
      title: HtmlCleaner.decodeHtmlEntities(episode.title || `Chương ${episode.weight || position + 1}`),
      url: `${input.origin}/vi/watch/${bookId}/${episode.id}`,
    }));
    const selected = watch ? chapters.find(chapter => String(chapter.id) === watch[2]) : undefined;
    const candidate: CandidateBook = {
      id: `noveltoon_${bookId}`,
      title, author, coverUrl,
      sourceUrl: storyUrl,
      hostname: input.hostname,
      adapterName: this.name,
      totalChapters: chapters.length,
      chapters,
      confidence: 'HIGH',
      suggestedCoverColor: '#319FFF',
    };
    const locked = allEpisodes.length - publicEpisodes.length;
    return {
      adapter: this.name,
      hostname: input.hostname,
      sourceUrl: storyUrl,
      isWordPress: false,
      isWordPressCom: false,
      candidateBooks: [candidate],
      isSingleChapterLink: Boolean(watch),
      singleChapterItem: selected,
      singleChapterBookCandidate: watch ? candidate : undefined,
      diagnostics: {
        totalPostsDiscovered: chapters.length,
        totalPagesDiscovered: 1,
        categoriesDiscovered: 1,
        restRoutes: [],
        warnings: locked ? [`${locked} chương trả phí không được đưa vào danh sách nhập.`] : [],
        errors: [],
      },
    };
  }

  public async fetchChapterContent(chapter: CandidateChapter, signal?: AbortSignal) {
    const response = await safeFetch(chapter.url, { signal });
    if (!response.ok) throw new Error(`Không thể tải chương NovelToon (${response.status}).`);
    const html = await response.text();
    if (/lock-episodes|mua chương|unlock/i.test(html) && !/watch-page-fiction-content/i.test(html)) {
      throw new Error('Chương NovelToon này cần mở khóa trên trang gốc.');
    }
    const paragraphs: string[] = [];
    const regex = /<p[^>]*class=["'][^"']*watch-page-fiction-content[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      const cleaned = HtmlCleaner.cleanHtml(match[1], chapter.title).body.trim();
      if (cleaned) paragraphs.push(cleaned);
    }
    if (!paragraphs.length) throw new Error('Chương NovelToon này không có nội dung chữ công khai.');
    const content = paragraphs.join('\n\n');
    return { content, paragraphs, wordCount: content.split(/\s+/).filter(Boolean).length };
  }
}
