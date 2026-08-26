import { 
  CandidateBook, 
  CandidateChapter, 
  WebsiteAdapter, 
  WebsiteAnalysisResult 
} from '../types';
import { HtmlCleaner } from '../html-cleaner';
import { UrlNormalizer } from '../url-normalizer';
import { ChapterSorter } from '../chapter-sorter';
import { safeFetch } from '../safe-fetch';

interface WattpadStoryApiData {
  id: number;
  title: string;
  description?: string;
  cover?: string;
  user?: {
    name?: string;
    username?: string;
  };
  parts?: Array<{
    id: number;
    title: string;
    url: string;
    voteCount?: number;
    readCount?: number;
  }>;
}

export class WattpadAdapter implements WebsiteAdapter {
  public name = 'wattpad';

  /**
   * Determine if URL belongs to Wattpad
   */
  public canHandle(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.hostname.toLowerCase().includes('wattpad.com');
    } catch {
      return false;
    }
  }

  /**
   * Extract story ID from various Wattpad URL structures
   */
  private extractStoryId(parsedUrl: URL): string | null {
    // /story/415176367 or /story/415176367-name
    const storyMatch = parsedUrl.pathname.match(/\/story\/(\d+)/i);
    if (storyMatch) return storyMatch[1];
    return null;
  }

  /**
   * Extract part ID from Wattpad chapter URL
   */
  private extractPartId(parsedUrl: URL): string | null {
    // /1651893803-bhtt-edit...
    const partMatch = parsedUrl.pathname.match(/^\/(\d+)/);
    if (partMatch) return partMatch[1];
    return null;
  }

  /**
   * Analyze Wattpad story or chapter URL
   */
  public async analyze(rawUrl: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const normalizedUrl = UrlNormalizer.normalize(rawUrl);
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      throw new Error('Địa chỉ Wattpad không hợp lệ.');
    }

    const hostname = parsedUrl.hostname;
    let storyId = this.extractStoryId(parsedUrl);
    const partId = this.extractPartId(parsedUrl);
    let isSingleChapter = false;

    // If user provided a part URL instead of a story URL, fetch part page to find the storyId
    if (!storyId && partId) {
      isSingleChapter = true;
      try {
        const partRes = await safeFetch(normalizedUrl, { signal });
        if (partRes.ok) {
          const partHtml = await partRes.text();
          // Find story ID link in HTML e.g. href="/story/415176367" or data-group-id="415176367"
          const sm = partHtml.match(/\/story\/(\d+)/) || partHtml.match(/data-group-id="(\d+)"/);
          if (sm) storyId = sm[1];
        }
      } catch {}
    }

    if (!storyId && !partId) {
      throw new Error('Không nhận diện được ID truyện từ liên kết Wattpad này.');
    }

    let storyData: WattpadStoryApiData | null = null;

    if (storyId) {
      const apiUrl = `https://www.wattpad.com/api/v3/stories/${storyId}?fields=id,title,description,cover,user(name,username),parts(id,title,url,voteCount,readCount)`;
      try {
        const res = await safeFetch(apiUrl, {
          signal,
          headers: {
            'Accept': 'application/json',
          }
        });
        if (res.ok) {
          storyData = await res.json();
        }
      } catch (err: any) {
        if (signal?.aborted) throw new Error('Đã hủy phân tích website.');
      }
    }

    // Fallback: If API returned null, try direct HTML scraping
    if (!storyData) {
      try {
        const pageRes = await safeFetch(normalizedUrl, { signal });
        if (!pageRes.ok) throw new Error(`Lỗi kết nối Wattpad (${pageRes.status}).`);
        const pageHtml = await pageRes.text();

        const titleM = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || pageHtml.match(/<title>([\s\S]*?)<\/title>/i);
        const authorM = pageHtml.match(/class="author[^"]*"[^>]*>([\s\S]*?)<\/a>/i) || pageHtml.match(/author_name:\s*['"]([^'"]+)['"]/);

        // Find parts in HTML
        const parts: Array<{ id: number; title: string; url: string }> = [];
        const partRegex = /href="(\/(\d+)-[^"]+)"[^>]*class="[^"]*part-title[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        while ((m = partRegex.exec(pageHtml)) !== null) {
          parts.push({
            id: parseInt(m[2], 10),
            url: `https://www.wattpad.com${m[1]}`,
            title: HtmlCleaner.decodeHtmlEntities(m[3].replace(/<[^>]+>/g, '').trim()),
          });
        }

        storyData = {
          id: storyId ? parseInt(storyId, 10) : (partId ? parseInt(partId, 10) : 0),
          title: titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : 'Truyện Wattpad',
          user: { name: authorM ? authorM[1].replace(/<[^>]+>/g, '').trim() : 'Tác giả' },
          parts,
        };
      } catch (err: any) {
        if (signal?.aborted) throw new Error('Đã hủy phân tích website.');
        throw new Error(`Không thể kết nối đến truyện Wattpad (${err.message}). Nếu mạng của bạn đang bị chặn Wattpad, hãy thử dùng DNS 1.1.1.1 hoặc VPN.`);
      }
    }

    if (!storyData || !storyData.parts || storyData.parts.length === 0) {
      // If single part without full story list, treat as 1 chapter candidate
      if (partId) {
        storyData = {
          id: parseInt(partId, 10),
          title: storyData?.title || 'Truyện Wattpad',
          user: storyData?.user || { name: 'Tác giả' },
          parts: [{
            id: parseInt(partId, 10),
            title: 'Chương hiện tại',
            url: normalizedUrl,
          }],
        };
        isSingleChapter = true;
      } else {
        throw new Error('Không tìm thấy danh sách phần/chương nào từ truyện Wattpad này.');
      }
    }

    const { title: cleanTitle, author: parsedAuthor } = HtmlCleaner.cleanTitle(storyData.title);
    const author = storyData.user?.name || storyData.user?.username || parsedAuthor || 'Tác giả Wattpad';

    const rawParts = storyData.parts || [];
    const items = rawParts.map(p => ({
      id: String(p.id),
      title: HtmlCleaner.stripEmojis(p.title),
      url: p.url.startsWith('http') ? p.url : `https://www.wattpad.com${p.url}`,
    }));

    const { chapters, missingChapters, duplicateChapters } = ChapterSorter.processAndSortChapters(items);

    const candidateBook: CandidateBook = {
      id: `wattpad_${storyData.id}_${Date.now()}`,
      title: cleanTitle,
      author,
      sourceUrl: normalizedUrl,
      hostname,
      totalChapters: chapters.length,
      chapters,
      confidence: 'HIGH',
      coverUrl: storyData.cover,
      suggestedCoverColor: '#F56C2D',
      adapterName: this.name,
      missingChapters: missingChapters.length > 0 ? missingChapters : undefined,
      duplicateChapters: duplicateChapters.length > 0 ? duplicateChapters : undefined,
    };

    let singleChapterItem: CandidateChapter | undefined = undefined;
    if (isSingleChapter && partId) {
      singleChapterItem = chapters.find(c => String(c.id) === partId) || chapters[0];
    }

    return {
      adapter: this.name,
      hostname,
      sourceUrl: normalizedUrl,
      isWordPress: false,
      isWordPressCom: false,
      candidateBooks: [candidateBook],
      isSingleChapterLink: isSingleChapter,
      singleChapterItem,
      singleChapterBookCandidate: isSingleChapter ? candidateBook : undefined,
      diagnostics: {
        totalPostsDiscovered: chapters.length,
        totalPagesDiscovered: 1,
        categoriesDiscovered: 1,
        restRoutes: ['/api/v3/stories/'],
        warnings: [],
        errors: [],
      },
    };
  }

  /**
   * Fetch and clean chapter body text from Wattpad part page
   */
  public async fetchChapterContent(
    chapter: CandidateChapter,
    signal?: AbortSignal
  ): Promise<{ content: string; paragraphs: string[]; wordCount: number }> {
    if (!chapter || !chapter.url) {
      throw new Error('Chương không có đường dẫn hợp lệ.');
    }

    let html = '';
    try {
      const res = await safeFetch(chapter.url, { signal });
      if (!res.ok) {
        throw new Error(`Lỗi tải chương (${res.status}).`);
      }
      html = await res.text();
    } catch (err: any) {
      if (signal?.aborted) throw new Error('Đã hủy tải chương.');
      throw new Error(`Không thể tải chương "${chapter.title}": ${err.message}`);
    }

    // Wattpad wraps paragraphs in <p data-p-id="..."> or <pre> or <div class="panel-reading">
    const paras: string[] = [];
    const pRegex = /<p[^>]*data-p-id[^>]*>([\s\S]*?)<\/p>/gi;
    let m;
    while ((m = pRegex.exec(html)) !== null) {
      const cleanP = HtmlCleaner.decodeHtmlEntities(m[1].replace(/<[^>]+>/g, '').trim());
      if (cleanP) {
        paras.push(cleanP);
      }
    }

    // Fallback: If no data-p-id found, use standard cleaner on whole HTML
    if (paras.length === 0) {
      const result = HtmlCleaner.cleanHtml(html, chapter.title);
      return { content: result.body, paragraphs: result.paragraphs, wordCount: result.wordCount };
    }

    const body = paras.join('\n\n');
    const latinWords = body.match(/[\w\u00C0-\u024F\u1EA0-\u1EF9]+/g) || [];
    const wordCount = latinWords.length;

    return {
      content: body,
      paragraphs: paras,
      wordCount,
    };
  }
}
