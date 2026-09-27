import { HtmlCleaner } from '../html-cleaner';
import { safeFetch } from '../safe-fetch';
import { CandidateBook, CandidateChapter, WebsiteAdapter, WebsiteAnalysisResult } from '../types';
import { countCjkAwareWords } from '../../jjwxc-source/countCjkAwareWords';

/**
 * 52书库 (www.52shuku.net). A book page lists its text as numbered pages
 * (第1页 → {id}_2.html, 第2页 → {id}_3.html, ...), and each page holds several
 * chapters whose headings ("第12章 …") sit inline among the paragraphs. Pages are
 * what gets fetched; regroupChapters() then re-splits the fetched text on those
 * headings so the library stores real chapters instead of arbitrary pages.
 */

const HOSTS = new Set(['52shuku.net', 'www.52shuku.net', 'm.52shuku.net']);
const BOOK_PATH = /^\/(.+?\/)?([A-Za-z0-9]+?)(?:_(\d+))?\.html$/;
// "第12章 …" style, plus classical section titles such as "本议第一" / "力耕第二".
const CHAPTER_HEADING = /^(?:第[0-9０-９零〇一二三四五六七八九十百千两]+[章回节卷]|番外|终章|尾声|楔子|序章)|^[一-鿿]{1,12}第[0-9０-９零〇一二三四五六七八九十百千两]+$/;
// Page-break markers the site leaves inside the text, e.g. "------- 页面 3-------".
const PAGE_MARKER = /-{3,}\s*(?:页面\s*)?\d+\s*-{3,}/g;
const MAX_HEADING_LENGTH = 40;

export function parseShuku52Url(raw: string): { origin: string; dir: string; id: string } | null {
  try {
    const url = new URL(raw);
    if (!HOSTS.has(url.hostname.toLowerCase())) return null;
    const match = url.pathname.match(BOOK_PATH);
    if (!match) return null;
    return { origin: 'https://www.52shuku.net', dir: `/${match[1] || ''}`, id: match[2] };
  } catch {
    return null;
  }
}

const stripTags = (html: string) => HtmlCleaner.decodeHtmlEntities(html.replace(/<[^>]+>/g, '')).replace(/ /g, ' ').trim();

/** Splits "书名_作者【完结+番外】" into its parts. */
export function parseShuku52Title(raw: string): { title: string; author: string; completed: boolean } {
  const completed = /完结/.test(raw);
  const withoutTag = raw.replace(/【[^】]*】\s*$/, '').trim();
  const cut = withoutTag.lastIndexOf('_');
  if (cut <= 0) return { title: withoutTag || raw, author: '', completed };
  return { title: withoutTag.slice(0, cut).trim(), author: withoutTag.slice(cut + 1).trim(), completed };
}

/** Readable paragraphs of one content page, without the site's ads, share links and pager. */
export function extractShuku52Paragraphs(html: string): string[] {
  const start = html.search(/<article[^>]*class="[^"]*article-content/i);
  if (start < 0) return [];
  let body = html.slice(start);
  const end = body.search(/<div[^>]*class="[^"]*pagination2|<\/article>/i);
  if (end >= 0) body = body.slice(0, end);
  body = body.replace(/<script[\s\S]*?<\/script>/gi, '');
  return body
    .split(/<p[^>]*>|<\/p>|<br\s*\/?>/i)
    .map(stripTags)
    .map(text => text.replace(PAGE_MARKER, '').replace(/^[\s　]+/, '').trim())
    .filter(text => text && !/52书库|52shuku\.net|传送门：|^Tips：/.test(text));
}

const isHeading = (text: string) => text.length <= MAX_HEADING_LENGTH && CHAPTER_HEADING.test(text);

export class Shuku52Adapter implements WebsiteAdapter {
  public name = '52shuku';

  public canHandle(raw: string): boolean {
    return parseShuku52Url(raw) !== null;
  }

  public async analyze(rawUrl: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const parsed = parseShuku52Url(rawUrl);
    if (!parsed) throw new Error('Hãy dán liên kết trang truyện 52书库 (dạng https://www.52shuku.net/.../xxxx.html).');

    const bookUrl = `${parsed.origin}${parsed.dir}${parsed.id}.html`;
    const response = await safeFetch(bookUrl, { signal });
    if (!response.ok) throw new Error(`Không thể mở trang truyện 52书库 (${response.status}).`);
    const html = await response.text();

    const rawTitle = stripTags(html.match(/<h1[^>]*class="[^"]*article-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
    if (!rawTitle) throw new Error('Không nhận diện được trang truyện 52书库 này.');
    const { title, author, completed } = parseShuku52Title(rawTitle);

    const pageLinks = new Map<number, string>();
    const linkPattern = new RegExp(`href="([^"]*${parsed.id}_(\\d+)\\.html)"[^>]*>\\s*第(\\d+)页`, 'g');
    let link: RegExpExecArray | null;
    while ((link = linkPattern.exec(html)) !== null) {
      const pageNumber = Number(link[3]);
      if (!pageLinks.has(pageNumber)) pageLinks.set(pageNumber, new URL(link[1], bookUrl).toString());
    }
    if (!pageLinks.size) throw new Error('Truyện 52书库 này chưa có trang nội dung để nhập.');

    const chapters: CandidateChapter[] = [...pageLinks.entries()]
      .sort(([a], [b]) => a - b)
      .map(([pageNumber, url]) => ({ id: pageNumber, index: pageNumber, title: `Trang ${pageNumber}`, url }));

    const intro = stripTags(html.match(/<p>\s*小说简介：\s*<\/p>\s*<p>([\s\S]*?)<\/p>/i)?.[1] || '');
    const candidate: CandidateBook = {
      id: `52shuku_${parsed.id}`,
      title,
      author: author || 'Không rõ',
      description: intro || undefined,
      sourceUrl: bookUrl,
      hostname: 'www.52shuku.net',
      adapterName: this.name,
      totalChapters: chapters.length,
      chapters,
      confidence: 'MEDIUM',
      confidenceReason: '52书库 chia truyện theo trang; Lily tách lại thành chương sau khi tải.',
      completion: completed ? 'completed' : 'unknown',
      suggestedCoverColor: '#B5838D',
    };

    return {
      adapter: this.name,
      siteName: '52书库',
      hostname: candidate.hostname,
      sourceUrl: bookUrl,
      isWordPress: false,
      isWordPressCom: false,
      candidateBooks: [candidate],
      diagnostics: {
        totalPostsDiscovered: chapters.length,
        totalPagesDiscovered: chapters.length,
        categoriesDiscovered: 1,
        restRoutes: [],
        warnings: [],
        errors: [],
      },
    };
  }

  public async fetchChapterContent(chapter: CandidateChapter, signal?: AbortSignal) {
    const response = await safeFetch(chapter.url, { signal });
    if (!response.ok) throw new Error(`Không thể tải trang 52书库 (${response.status}).`);
    const paragraphs = extractShuku52Paragraphs(await response.text());
    if (!paragraphs.length) throw new Error('Trang 52书库 này không có nội dung chữ.');
    return { content: paragraphs.join('\n\n'), paragraphs, wordCount: countCjkAwareWords(paragraphs) };
  }

  /** Re-splits fetched pages (in page order) into chapters on inline headings.
   * Books with no recognisable headings keep one chapter per page. */
  public regroupChapters(pages: CandidateChapter[]): CandidateChapter[] {
    const ordered = [...pages].sort((a, b) => a.index - b.index);
    if (!ordered.some(page => (page.paragraphs || []).some(isHeading))) return ordered;
    const chapters: CandidateChapter[] = [];
    let current: CandidateChapter | null = null;
    let previousPage: number | null = null;

    for (const page of ordered) {
      // A gap means the user skipped pages: don't glue text across it.
      if (previousPage !== null && page.index !== previousPage + 1) current = null;
      previousPage = page.index;

      for (const text of page.paragraphs || []) {
        if (isHeading(text)) {
          current = { index: 0, title: text, url: page.url, paragraphs: [] };
          chapters.push(current);
          continue;
        }
        if (!current) {
          const isBookStart = page.index === 1 && chapters.length === 0;
          current = {
            index: 0,
            title: isBookStart ? 'Văn án' : `(Tiếp theo) Trang ${page.index}`,
            url: page.url,
            paragraphs: [],
            specialType: isBookStart ? 'preface' : undefined,
          };
          chapters.push(current);
        }
        current.paragraphs!.push(text);
      }
    }

    const nonEmpty = chapters.filter(chapter => chapter.paragraphs && chapter.paragraphs.length > 0);
    if (nonEmpty.length === 0) return ordered;
    return nonEmpty.map((chapter, position) => {
      const content = chapter.paragraphs!.join('\n\n');
      return { ...chapter, index: position + 1, content, wordCount: countCjkAwareWords(chapter.paragraphs!), status: 'success' };
    });
  }
}
