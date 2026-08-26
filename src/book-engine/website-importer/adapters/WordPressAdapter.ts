import { 
  CandidateBook, 
  CandidateChapter, 
  WebsiteAdapter, 
  WebsiteAnalysisResult 
} from '../types';
import { HtmlCleaner } from '../html-cleaner';
import { ChapterDetector } from '../../chapter-detector/ChapterDetector';
import { safeFetch } from '../safe-fetch';

interface WpCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  description?: string;
}

interface WpPostSummary {
  id: number;
  title: { rendered: string };
  slug: string;
  link: string;
  date: string;
  categories: number[];
  tags: number[];
  featured_media?: number;
}

interface WpPageSummary {
  id: number;
  title: { rendered: string };
  slug: string;
  link: string;
  content?: { rendered: string };
  featured_media?: number;
}

export class WordPressAdapter implements WebsiteAdapter {
  public readonly name = 'wordpress';

  public canHandle(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (
        host.includes('wikicv.') || 
        host.includes('wikidich.') || 
        host.includes('wikidth.') || 
        host.includes('wattpad.') || 
        host.includes('.my.canva.site') || 
        host.includes('canva.site')
      ) {
        return false;
      }
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Parse natural chapter numbers and special types from title and slug
   */
  public static parseChapterMeta(title: string, slug: string): {
    number: number | null;
    specialType?: CandidateChapter['specialType'];
    isNoise: boolean;
    cleanTitle: string;
  } {
    const raw = HtmlCleaner.decodeHtmlEntities(title).trim();
    const cleanLower = raw.toLowerCase();

    // 1. Noise check (Thông báo, Giới thiệu blog, Mục lục blog, Review, Tuyển editor, Lịch đăng...)
    const isNoisePattern = /^(?:\[?[^\]]*\]?\s*)?(?:thông báo|thong bao|mục lục blog|giới thiệu blog|review|lịch đăng|lich dang|tuyển editor|tuyen editor|tuyển nhân sự|update|cập nhật|faq|gợi ý pass|pass chương|pass\s+\d+)/i;
    if (isNoisePattern.test(cleanLower) && !cleanLower.includes('chương') && !cleanLower.includes('chapter')) {
      return { number: null, isNoise: true, cleanTitle: raw };
    }

    // 2. Special Chapter Check (Văn án, Giới thiệu tác phẩm, Lời mở đầu, Prologue, Epilogue, Phiên ngoại, Ngoại truyện)
    if (/(?:văn án|van an|giới thiệu|tóm tắt|lời mở đầu|prologue|tiền truyện)/i.test(cleanLower)) {
      return {
        number: 0,
        specialType: 'preface',
        isNoise: false,
        cleanTitle: raw.replace(/^\[[^\]]+\]\s*/, '').trim(),
      };
    }

    if (/(?:phiên ngoại|phien ngoai|ngoại truyện|ngoai truyen|epilogue|vĩ thanh)/i.test(cleanLower)) {
      // Extract side story number if any (e.g. "Phiên ngoại 2" -> 2)
      const sideNumMatch = raw.match(/(?:phiên ngoại|ngoại truyện)\s*(\d+)/i);
      const sideNum = sideNumMatch ? parseInt(sideNumMatch[1], 10) : 1;
      return {
        number: 10000 + sideNum, // place side stories after regular chapters
        specialType: 'side_story',
        isNoise: false,
        cleanTitle: raw.replace(/^\[[^\]]+\]\s*/, '').trim(),
      };
    }

    // 3. Chapter Number detection from title (e.g. "Chương 1", "chương 005", "Chap 12", "Hồi 3")
    const chapMatch = raw.match(/(?:chương|ch\u01b0\u01a1ng|chap|chapter|hồi|tiết|phần)\s*(?:số\s*)?(\d+)/i);
    if (chapMatch) {
      return {
        number: parseInt(chapMatch[1], 10),
        isNoise: false,
        cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
      };
    }

    // 4. Chapter Number detection from Vietnamese Word (e.g. "Chương Một", "Chương Thứ Mười")
    const wordChapMatch = raw.match(/(?:chương|ch\u01b0\u01a1ng)\s+([mnhbtscv\u0111\u00e0-\u1ef9\s]{1,30})/i);
    if (wordChapMatch) {
      const parsedWord = ChapterDetector.parseVietnameseWordNumber(wordChapMatch[1].trim());
      if (parsedWord !== null) {
        return {
          number: parsedWord,
          isNoise: false,
          cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
        };
      }
    }

    // 5. Chapter Number detection from range e.g. "Tổng Tài _ 1 - 10" or "Chương 1 - 10"
    const rangeMatch = raw.match(/[-–—_]\s*(\d+)\s*[-–—]\s*(\d+)/);
    if (rangeMatch) {
      return {
        number: parseInt(rangeMatch[1], 10),
        isNoise: false,
        cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
      };
    }

    // 6. Chapter Number detection from trailing hyphen/underscore + number (e.g. "Vi Thần – 8🍑" or "Cảng Đảo – 154")
    const trailingNumMatch = raw.match(/[-–—_]\s*(\d+)\s*(?:[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\s]*)$/u);
    if (trailingNumMatch) {
      return {
        number: parseInt(trailingNumMatch[1], 10),
        isNoise: false,
        cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
      };
    }

    // 7. Chapter Number detection from Slug (e.g. "bat-nat-chuong-5" or "chuong-12" or "vi-than-8")
    const slugMatch = slug.match(/(?:chuong|chapter|chap)-(\d+)/i) || slug.match(/-(\d+)$/);
    if (slugMatch) {
      return {
        number: parseInt(slugMatch[1], 10),
        isNoise: false,
        cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
      };
    }

    // 8. Generic Title Fallback
    return {
      number: null,
      isNoise: false,
      cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
    };
  }

  /**
   * Analyze WordPress site or URL to discover candidate books and chapters
   */
  public async analyze(rawUrl: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      throw new Error('Địa chỉ website không hợp lệ. Vui lòng nhập URL đầy đủ (ví dụ: https://kemchanhlemontang.wordpress.com/).');
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Giao thức không được hỗ trợ. Lily chỉ hỗ trợ liên kết http: và https:.');
    }

    const hostname = parsedUrl.hostname;
    const isWordPressCom = hostname.endsWith('.wordpress.com') || hostname.endsWith('.wp.com');

    // 1. Determine REST API base
    let restApiBase: string;
    if (isWordPressCom) {
      restApiBase = `https://public-api.wordpress.com/wp/v2/sites/${hostname}`;
    } else {
      restApiBase = `${parsedUrl.origin}/wp-json/wp/v2`;
    }

    // Diagnostics trackers
    const restRoutesDiscovered: string[] = [];
    let categories: WpCategory[] = [];
    let pages: WpPageSummary[] = [];
    let posts: WpPostSummary[] = [];

    // 2. Query Categories (with graceful error handling & CORS detection)
    try {
      const catRes = await safeFetch(`${restApiBase}/categories?per_page=100`, { signal });
      if (catRes.ok) {
        categories = await catRes.json();
        restRoutesDiscovered.push('/categories');
      } else if (catRes.status === 404 && !isWordPressCom) {
        // Fallback for self-hosted sites
        restApiBase = `${parsedUrl.origin}/index.php?rest_route=/wp/v2`;
        const retryCat = await safeFetch(`${restApiBase}/categories?per_page=100`, { signal });
        if (retryCat.ok) {
          categories = await retryCat.json();
          restRoutesDiscovered.push('/categories');
        }
      }
    } catch (err: any) {
      if (signal?.aborted || err.name === 'AbortError') {
        throw new Error('Đã hủy phân tích website.');
      }
      if (err.name === 'TypeError' && err.message && err.message.toLowerCase().includes('fetch')) {
        throw new Error('Website này hiện chưa cho phép Lily đọc trực tiếp (chặn CORS). Hãy kiểm tra lại liên kết hoặc cấu hình website.');
      }
      warnings.push(`Không thể đọc danh mục: ${err.message}`);
    }

    // 3. Query Pages
    try {
      const pageRes = await safeFetch(`${restApiBase}/pages?per_page=100&_fields=id,title,slug,link,featured_media`, { signal });
      if (pageRes.ok) {
        pages = await pageRes.json();
        restRoutesDiscovered.push('/pages');
      }
    } catch (err: any) {
      if (signal?.aborted) throw new Error('Đã hủy phân tích website.');
      warnings.push(`Không thể đọc danh sách trang: ${err.message}`);
    }

    // 4. Query All Posts Metadata (Supports Pagination for 100, 300, 600+ chapters!)
    try {
      let pageNum = 1;
      let totalPages = 1;

      while (pageNum <= totalPages && pageNum <= 10) { // Limit up to 1000 chapters for safety
        if (signal?.aborted) throw new Error('Đã hủy phân tích website.');

        const postRes = await safeFetch(
          `${restApiBase}/posts?per_page=100&page=${pageNum}&_fields=id,title,slug,link,categories,tags,date,featured_media`,
          { signal }
        );

        if (!postRes.ok) break;

        const pagePosts = await postRes.json();
        if (Array.isArray(pagePosts) && pagePosts.length > 0) {
          posts.push(...pagePosts);
        }

        const totalPagesHeader = postRes.headers.get('x-wp-totalpages');
        if (totalPagesHeader) {
          totalPages = parseInt(totalPagesHeader, 10) || 1;
        } else if (pagePosts.length === 100) {
          totalPages = pageNum + 1;
        } else {
          break;
        }

        pageNum++;
      }

      if (posts.length > 0) {
        restRoutesDiscovered.push('/posts');
      }
    } catch (err: any) {
      if (signal?.aborted) throw new Error('Đã hủy phân tích website.');
      if (posts.length === 0) {
        throw new Error('Không tìm thấy bài viết hoặc chương nào trên website này.');
      }
    }

    // 5. Analyze Input URL to see if it targets a specific Single Chapter / Post
    let isSingleChapterLink = false;
    let targetSinglePost: WpPostSummary | undefined;

    const pathname = parsedUrl.pathname.replace(/\/+$/, '');
    const pathSlug = pathname.substring(pathname.lastIndexOf('/') + 1);

    if (pathSlug && posts.length > 0) {
      targetSinglePost = posts.find(p => {
        const pSlug = p.slug.toLowerCase();
        const pLink = p.link.toLowerCase();
        return pSlug === pathSlug.toLowerCase() || pLink.includes(pathname.toLowerCase());
      });

      if (targetSinglePost) {
        const meta = WordPressAdapter.parseChapterMeta(targetSinglePost.title.rendered, targetSinglePost.slug);
        if (meta.number !== null || meta.specialType) {
          isSingleChapterLink = true;
        }
      }
    }

    // 6. Build Candidate Books from Categories, Pages, and Post Groups
    const candidateBooks: CandidateBook[] = [];
    const validCategories = categories.filter(c => c.count > 0 && c.slug !== 'uncategorized');

    if (validCategories.length > 0) {
      for (const cat of validCategories) {
        // Find posts belonging to this category
        const catPosts = posts.filter(p => p.categories && p.categories.includes(cat.id));
        if (catPosts.length === 0) continue;

        const candidate = this.buildCandidateBookFromPosts(
          cat.name,
          catPosts,
          cat.description,
          parsedUrl.toString(),
          hostname,
          pages
        );

        if (candidate.chapters.length > 0) {
          candidateBooks.push(candidate);
        }
      }
    }

    // Fallback: If no categories with posts found, group all posts into 1 or more candidate books
    if (candidateBooks.length === 0 && posts.length > 0) {
      // Group by prefix in title e.g. "[Bắt Nạt]"
      const prefixGroups = new Map<string, WpPostSummary[]>();
      for (const post of posts) {
        const rawTitle = HtmlCleaner.decodeHtmlEntities(post.title.rendered);
        const prefixMatch = rawTitle.match(/^\[([^\]]+)\]/);
        const key = prefixMatch ? prefixMatch[1].trim().toLowerCase() : '__general__';

        if (!prefixGroups.has(key)) {
          prefixGroups.set(key, []);
        }
        prefixGroups.get(key)!.push(post);
      }

      if (prefixGroups.size > 1 && !prefixGroups.has('__general__')) {
        for (const [groupName, groupPosts] of prefixGroups.entries()) {
          const candidate = this.buildCandidateBookFromPosts(
            groupName.toUpperCase(),
            groupPosts,
            undefined,
            parsedUrl.toString(),
            hostname,
            pages
          );
          if (candidate.chapters.length > 0) {
            candidateBooks.push(candidate);
          }
        }
      } else {
        const candidate = this.buildCandidateBookFromPosts(
          hostname,
          posts,
          undefined,
          parsedUrl.toString(),
          hostname,
          pages
        );
        if (candidate.chapters.length > 0) {
          candidateBooks.push(candidate);
        }
      }
    }

    // 7. If Single Chapter Link was pasted, build singleChapterBookCandidate and singleChapterItem
    let singleChapterBookCandidate: CandidateBook | undefined;
    let singleChapterItem: CandidateChapter | undefined;

    if (isSingleChapterLink && targetSinglePost) {
      const targetCatId = targetSinglePost.categories?.[0];
      if (targetCatId) {
        singleChapterBookCandidate = candidateBooks.find(b => 
          b.chapters.some(c => c.id === targetSinglePost!.id)
        );
      }
      if (!singleChapterBookCandidate && candidateBooks.length > 0) {
        singleChapterBookCandidate = candidateBooks[0];
      }

      const meta = WordPressAdapter.parseChapterMeta(targetSinglePost.title.rendered, targetSinglePost.slug);
      singleChapterItem = {
        id: targetSinglePost.id,
        index: 1,
        title: meta.cleanTitle || 'Chương 1',
        url: targetSinglePost.link,
        slug: targetSinglePost.slug,
        date: targetSinglePost.date,
        specialType: meta.specialType,
      };
    }

    if (candidateBooks.length === 0) {
      throw new Error('Không nhận diện được truyện hoặc danh sách chương hợp lệ từ website này.');
    }

    return {
      adapter: this.name,
      siteName: hostname,
      hostname,
      sourceUrl: rawUrl,
      isWordPress: true,
      isWordPressCom,
      restApiBase,
      candidateBooks,
      isSingleChapterLink,
      singleChapterBookCandidate,
      singleChapterItem,
      diagnostics: {
        totalPostsDiscovered: posts.length,
        totalPagesDiscovered: pages.length,
        categoriesDiscovered: categories.length,
        restRoutes: restRoutesDiscovered,
        warnings,
        errors,
      },
    };
  }

  /**
   * Helper to construct a CandidateBook from a list of post summaries with natural ordering,
   * duplicate detection, and missing chapter analysis
   */
  private buildCandidateBookFromPosts(
    rawGroupName: string,
    rawPosts: WpPostSummary[],
    rawDescription: string | undefined,
    sourceUrl: string,
    hostname: string,
    pages: WpPageSummary[]
  ): CandidateBook {
    const { title, author } = HtmlCleaner.cleanTitle(rawGroupName);

    // Try to find matching TOC Page for better metadata/cover
    let matchedPage = pages.find(p => {
      const pTitle = HtmlCleaner.decodeHtmlEntities(p.title.rendered).toLowerCase();
      const bTitle = title.toLowerCase();
      return pTitle.includes(bTitle) || bTitle.includes(pTitle);
    });

    const parsedChapters: Array<{
      post: WpPostSummary;
      meta: ReturnType<typeof WordPressAdapter.parseChapterMeta>;
    }> = [];

    for (const post of rawPosts) {
      const meta = WordPressAdapter.parseChapterMeta(post.title.rendered, post.slug);
      if (!meta.isNoise) {
        parsedChapters.push({ post, meta });
      }
    }

    // Natural Sorting:
    // 1. Preface / Intro (number === 0)
    // 2. Regular chapters ascending by number
    // 3. Side stories (number >= 10000)
    // 4. Unnumbered chapters sorted by date ascending
    parsedChapters.sort((a, b) => {
      if (a.meta.number !== null && b.meta.number !== null) {
        return a.meta.number - b.meta.number;
      }
      if (a.meta.number !== null) return -1;
      if (b.meta.number !== null) return 1;
      return new Date(a.post.date).getTime() - new Date(b.post.date).getTime();
    });

    // Check for Duplicates & Missing Numbers
    const duplicateChapters: number[] = [];
    const missingChapters: number[] = [];
    const seenNumbers = new Set<number>();
    let prevNum = 0;

    const candidateChapters: CandidateChapter[] = [];

    parsedChapters.forEach((item, idx) => {
      const chapNum = item.meta.number;
      let isDup = false;

      if (chapNum !== null && chapNum > 0 && chapNum < 10000) {
        if (seenNumbers.has(chapNum)) {
          isDup = true;
          if (!duplicateChapters.includes(chapNum)) {
            duplicateChapters.push(chapNum);
          }
        } else {
          seenNumbers.add(chapNum);

          // Check for gaps
          if (prevNum > 0 && chapNum > prevNum + 1 && chapNum <= prevNum + 10) {
            for (let m = prevNum + 1; m < chapNum; m++) {
              if (!missingChapters.includes(m)) {
                missingChapters.push(m);
              }
            }
          }
          prevNum = chapNum;
        }
      }

      candidateChapters.push({
        id: item.post.id,
        index: idx + 1,
        title: item.meta.cleanTitle,
        url: item.post.link,
        slug: item.post.slug,
        date: item.post.date,
        specialType: item.meta.specialType,
        isDuplicate: isDup,
        status: 'pending',
      });
    });

    // Confidence Calculation
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    let confidenceReason = 'Cấu trúc chương liền mạch, nhận diện tốt.';

    if (candidateChapters.length === 0) {
      confidence = 'LOW';
      confidenceReason = 'Không tìm thấy chương nào.';
    } else if (duplicateChapters.length > 3 || missingChapters.length > 5) {
      confidence = 'MEDIUM';
      confidenceReason = 'Có một số chương bị thiếu hoặc trùng lặp số.';
    } else if (candidateChapters.some(c => c.specialType === undefined && !c.title.toLowerCase().includes('chương'))) {
      confidence = 'MEDIUM';
      confidenceReason = 'Cần kiểm tra lại thứ tự chương.';
    }

    const bookId = `wp-book-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    return {
      id: bookId,
      title,
      author: author || '',
      description: rawDescription || (matchedPage ? `Mục lục: ${matchedPage.title.rendered}` : undefined),
      sourceUrl,
      hostname,
      adapterName: this.name,
      totalChapters: candidateChapters.length,
      chapters: candidateChapters,
      confidence,
      confidenceReason,
      missingChapters: missingChapters.length > 0 ? missingChapters : undefined,
      duplicateChapters: duplicateChapters.length > 0 ? duplicateChapters : undefined,
      diagnostics: {
        postsCount: rawPosts.length,
        strategy: 'WordPress REST API Category/Post Discovery',
      },
    };
  }

  /**
   * Fetch chapter body content and return cleaned text and paragraphs
   */
  public async fetchChapterContent(
    chapter: CandidateChapter,
    signal?: AbortSignal
  ): Promise<{ content: string; paragraphs: string[]; wordCount: number }> {
    if (!chapter) {
      throw new Error('Chương không hợp lệ.');
    }

    let htmlContent = '';

    // 1. Try WP REST API post content if we have post ID
    if (chapter.id) {
      try {
        let apiUrl = '';
        if (chapter.url.includes('.wordpress.com')) {
          const parsed = new URL(chapter.url);
          apiUrl = `https://public-api.wordpress.com/wp/v2/sites/${parsed.hostname}/posts/${chapter.id}`;
        }

        if (apiUrl) {
          const res = await safeFetch(apiUrl, { signal });
          if (res.ok) {
            const data = await res.json();
            htmlContent = data.content?.rendered || '';
          }
        }
      } catch (err: any) {
        if (signal?.aborted) throw new Error('Đã hủy tải chương.');
      }
    }

    // 2. Fallback to direct page fetch if needed
    if (!htmlContent && chapter.url) {
      try {
        const res = await safeFetch(chapter.url, { signal });
        if (res.ok) {
          htmlContent = await res.text();
        }
      } catch (err: any) {
        if (signal?.aborted) throw new Error('Đã hủy tải chương.');
        throw new Error(`Không thể tải chương "${chapter.title}": ${err.message}`);
      }
    }

    if (!htmlContent) {
      throw new Error(`Không nhận được nội dung cho chương "${chapter.title}".`);
    }

    // 3. Clean HTML and extract paragraphs
    const cleanResult = HtmlCleaner.cleanWordPressChapter(htmlContent, chapter.title);

    if (cleanResult.paragraphs.length === 0 && cleanResult.body.length === 0) {
      throw new Error(`Chương "${chapter.title}" không có nội dung văn bản sau khi lọc.`);
    }

    return {
      content: cleanResult.body,
      paragraphs: cleanResult.paragraphs,
      wordCount: cleanResult.wordCount,
    };
  }
}
