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

interface WpCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  description?: string;
}

interface WpTag {
  id: number;
  name: string;
  slug: string;
  count: number;
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
  content?: { rendered: string };
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
   * Parse natural chapter numbers and special types from title and slug (delegated to ChapterSorter)
   */
  public static parseChapterMeta(title: string, slug: string = '', url: string = '') {
    return ChapterSorter.parseMeta(title, slug, url);
  }

  /**
   * Analyze WordPress site or URL to discover candidate books and chapters
   */
  public async analyze(rawUrl: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    const classified = UrlNormalizer.classifyWordPressUrl(rawUrl);
    if (classified.type === 'unknown' || !classified.hostname) {
      throw new Error('Địa chỉ website không hợp lệ. Vui lòng nhập liên kết đầy đủ (ví dụ: https://kemchanhlemontang.wordpress.com/).');
    }

    const hostname = classified.hostname;
    const isWordPressCom = classified.isWordPressCom;

    // 1. Determine REST API base
    let restApiBase = isWordPressCom
      ? `https://public-api.wordpress.com/wp/v2/sites/${hostname}`
      : `${new URL(classified.normalizedUrl).origin}/wp-json/wp/v2`;

    const restRoutesDiscovered: string[] = [];
    let categories: WpCategory[] = [];
    let pages: WpPageSummary[] = [];
    let posts: WpPostSummary[] = [];

    // Helper to fetch paginated posts
    const fetchPostsForQuery = async (queryParam: string): Promise<WpPostSummary[]> => {
      const results: WpPostSummary[] = [];
      let pageNum = 1;
      let totalPages = 1;

      while (pageNum <= totalPages && pageNum <= 10) {
        if (signal?.aborted) throw new Error('Đã hủy phân tích website.');

        const endpoint = `${restApiBase}/posts?per_page=100&page=${pageNum}&${queryParam}&_fields=id,title,slug,link,categories,tags,date,featured_media`;
        const postRes = await safeFetch(endpoint, { signal });

        if (!postRes.ok) break;

        const pagePosts = await postRes.json();
        if (Array.isArray(pagePosts) && pagePosts.length > 0) {
          results.push(...pagePosts);
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

      return results;
    };

    // 2. Query Categories (with fallback for self-hosted rest_route)
    try {
      const catRes = await safeFetch(`${restApiBase}/categories?per_page=100`, { signal });
      if (catRes.ok) {
        categories = await catRes.json();
        restRoutesDiscovered.push('/categories');
      } else if (catRes.status === 404 && !isWordPressCom) {
        // Fallback for self-hosted sites with index.php?rest_route=
        restApiBase = `${new URL(classified.normalizedUrl).origin}/index.php?rest_route=/wp/v2`;
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
        throw new Error('Website này hiện chưa cho phép kết nối trực tiếp (chặn CORS). Hãy kiểm tra lại liên kết.');
      }
      warnings.push(`Không thể đọc danh mục: ${err.message}`);
    }

    // 3. Query Pages
    try {
      const pageRes = await safeFetch(`${restApiBase}/pages?per_page=100&_fields=id,title,slug,link,featured_media,content`, { signal });
      if (pageRes.ok) {
        pages = await pageRes.json();
        restRoutesDiscovered.push('/pages');
      }
    } catch (err: any) {
      if (signal?.aborted) throw new Error('Đã hủy phân tích website.');
      warnings.push(`Không thể đọc danh sách trang: ${err.message}`);
    }

    // 4. Targeted Discovery based on URL Classification
    let isSingleChapterLink = false;
    let targetSinglePost: WpPostSummary | undefined;
    const candidateBooks: CandidateBook[] = [];

    // Case C: Target is a Category URL
    if (classified.type === 'category' && (classified.slug || classified.id)) {
      let matchedCategory = categories.find(c => 
        (classified.slug && c.slug.toLowerCase() === classified.slug.toLowerCase()) || 
        (classified.id && c.id === classified.id)
      );

      if (!matchedCategory && classified.slug) {
        // Try direct lookup by slug
        try {
          const directCatRes = await safeFetch(`${restApiBase}/categories?slug=${classified.slug}`, { signal });
          if (directCatRes.ok) {
            const found = await directCatRes.json();
            if (Array.isArray(found) && found.length > 0) {
              matchedCategory = found[0];
            }
          }
        } catch {}
      }

      if (matchedCategory) {
        const catPosts = await fetchPostsForQuery(`categories=${matchedCategory.id}`);
        if (catPosts.length > 0) {
          const candidate = this.buildCandidateBookFromPosts(
            matchedCategory.name,
            catPosts,
            matchedCategory.description,
            classified.normalizedUrl,
            hostname,
            pages
          );
          if (candidate.chapters.length > 0) {
            candidateBooks.push(candidate);
          }
        }
      }
    }

    // Case C2: Target is a Tag URL
    if (classified.type === 'tag' && classified.slug) {
      try {
        const tagRes = await safeFetch(`${restApiBase}/tags?slug=${classified.slug}`, { signal });
        if (tagRes.ok) {
          const foundTags = await tagRes.json();
          if (Array.isArray(foundTags) && foundTags.length > 0) {
            const tag = foundTags[0];
            const tagPosts = await fetchPostsForQuery(`tags=${tag.id}`);
            if (tagPosts.length > 0) {
              const candidate = this.buildCandidateBookFromPosts(
                tag.name,
                tagPosts,
                undefined,
                classified.normalizedUrl,
                hostname,
                pages
              );
              if (candidate.chapters.length > 0) {
                candidateBooks.push(candidate);
              }
            }
          }
        }
      } catch {}
    }

    // Case B: Target is a specific Page (TOC Page / Trang mục lục)
    if (candidateBooks.length === 0 && classified.type === 'page' && classified.slug) {
      const matchedPage = pages.find(p => p.slug.toLowerCase() === classified.slug!.toLowerCase());
      if (matchedPage && matchedPage.content?.rendered) {
        // Parse chapter links from TOC page HTML
        const tocChapters = this.extractChapterLinksFromHtml(matchedPage.content.rendered, classified.normalizedUrl);
        if (tocChapters.length > 0) {
          const { title } = HtmlCleaner.cleanTitle(matchedPage.title.rendered);
          const candidate = this.buildCandidateBookFromChapterLinks(
            title,
            tocChapters,
            classified.normalizedUrl,
            hostname
          );
          if (candidate.chapters.length > 0) {
            candidateBooks.push(candidate);
          }
        }
      }
    }

    // Case A & Fallback: Query all posts across the site and group into books
    if (candidateBooks.length === 0) {
      posts = await fetchPostsForQuery('');
      if (posts.length > 0) {
        restRoutesDiscovered.push('/posts');
      }

      // Check if input URL points to a single post
      if (classified.type === 'post' && (classified.slug || classified.id)) {
        targetSinglePost = posts.find(p => 
          (classified.slug && p.slug.toLowerCase() === classified.slug.toLowerCase()) ||
          (classified.id && p.id === classified.id)
        );

        if (!targetSinglePost && classified.slug) {
          try {
            const singleRes = await safeFetch(`${restApiBase}/posts?slug=${classified.slug}&_fields=id,title,slug,link,categories,tags,date,featured_media`, { signal });
            if (singleRes.ok) {
              const resPosts = await singleRes.json();
              if (Array.isArray(resPosts) && resPosts.length > 0 && resPosts[0]) {
                targetSinglePost = resPosts[0];
                posts.push(resPosts[0]);
              }
            }
          } catch {}
        }

        if (targetSinglePost) {
          const meta = ChapterSorter.parseMeta(targetSinglePost.title.rendered, targetSinglePost.slug, targetSinglePost.link);
          if (meta.number !== null || meta.specialType) {
            isSingleChapterLink = true;
          }
        }
      }

      // Group posts by category
      const validCategories = categories.filter(c => c.count > 0 && c.slug !== 'uncategorized');
      if (validCategories.length > 0) {
        for (const cat of validCategories) {
          const catPosts = posts.filter(p => p.categories && p.categories.includes(cat.id));
          if (catPosts.length === 0) continue;

          const candidate = this.buildCandidateBookFromPosts(
            cat.name,
            catPosts,
            cat.description,
            classified.normalizedUrl,
            hostname,
            pages
          );

          if (candidate.chapters.length > 0) {
            candidateBooks.push(candidate);
          }
        }
      }

      // Group by prefix in title if no categories
      if (candidateBooks.length === 0 && posts.length > 0) {
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
              classified.normalizedUrl,
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
            classified.normalizedUrl,
            hostname,
            pages
          );
          if (candidate.chapters.length > 0) {
            candidateBooks.push(candidate);
          }
        }
      }
    }

    // 5. Build Single Chapter Prompt item if single chapter was detected
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

      const meta = ChapterSorter.parseMeta(targetSinglePost.title.rendered, targetSinglePost.slug, targetSinglePost.link);
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
      sourceUrl: classified.normalizedUrl,
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
   * Helper to construct a CandidateBook from post summaries using ChapterSorter
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

    // Try to find matching TOC Page for better metadata description
    let matchedPage = pages.find(p => {
      const pTitle = HtmlCleaner.decodeHtmlEntities(p.title.rendered).toLowerCase();
      const bTitle = title.toLowerCase();
      return pTitle.includes(bTitle) || bTitle.includes(pTitle);
    });

    const items = rawPosts.map(p => ({
      id: p.id,
      title: p.title.rendered,
      slug: p.slug,
      url: p.link,
      date: p.date,
    }));

    const { chapters, missingChapters, duplicateChapters } = ChapterSorter.processAndSortChapters(items);

    // Confidence Calculation
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
    let confidenceReason = 'Cấu trúc chương liền mạch, nhận diện tốt.';

    if (chapters.length === 0) {
      confidence = 'LOW';
      confidenceReason = 'Không tìm thấy chương nào.';
    } else if (duplicateChapters.length > 3 || missingChapters.length > 5) {
      confidence = 'MEDIUM';
      confidenceReason = 'Có một số chương bị thiếu hoặc trùng lặp số.';
    } else if (chapters.some(c => c.specialType === undefined && !c.title.toLowerCase().includes('chương'))) {
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
      totalChapters: chapters.length,
      chapters,
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
   * Helper to extract chapter links from HTML TOC content
   */
  private extractChapterLinksFromHtml(html: string, baseUrl: string): Array<{ title: string; url: string }> {
    const results: Array<{ title: string; url: string }> = [];
    const linkRegex = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const rawHref = match[1];
      const rawTitle = HtmlCleaner.decodeHtmlEntities(match[2].replace(/<[^>]+>/g, '').trim());

      if (!rawHref || !rawTitle) continue;

      const fullUrl = UrlNormalizer.resolveUrl(rawHref, baseUrl);
      const meta = ChapterSorter.parseMeta(rawTitle, '', fullUrl);

      if (!meta.isNoise && (meta.number !== null || meta.specialType)) {
        results.push({
          title: rawTitle,
          url: fullUrl,
        });
      }
    }

    return results;
  }

  /**
   * Helper to build CandidateBook from chapter links extracted from HTML TOC
   */
  private buildCandidateBookFromChapterLinks(
    title: string,
    links: Array<{ title: string; url: string }>,
    sourceUrl: string,
    hostname: string
  ): CandidateBook {
    const items = links.map((l, i) => ({
      id: `toc_link_${i + 1}`,
      title: l.title,
      url: l.url,
    }));

    const { chapters, missingChapters, duplicateChapters } = ChapterSorter.processAndSortChapters(items);

    return {
      id: `wp-toc-book-${Date.now()}`,
      title,
      author: '',
      sourceUrl,
      hostname,
      adapterName: this.name,
      totalChapters: chapters.length,
      chapters,
      confidence: 'HIGH',
      confidenceReason: 'Trích xuất trực tiếp từ trang Mục lục tác phẩm.',
      missingChapters: missingChapters.length > 0 ? missingChapters : undefined,
      duplicateChapters: duplicateChapters.length > 0 ? duplicateChapters : undefined,
      diagnostics: {
        postsCount: chapters.length,
        strategy: 'WordPress HTML TOC Discovery',
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

    // 1. Try WP REST API post content if we have numeric post ID
    if (chapter.id && typeof chapter.id === 'number') {
      try {
        let apiUrl = '';
        if (chapter.url.includes('.wordpress.com') || chapter.url.includes('.wp.com')) {
          const parsed = new URL(chapter.url);
          apiUrl = `https://public-api.wordpress.com/wp/v2/sites/${parsed.hostname}/posts/${chapter.id}`;
        } else if (chapter.url.startsWith('http')) {
          const parsed = new URL(chapter.url);
          apiUrl = `${parsed.origin}/wp-json/wp/v2/posts/${chapter.id}`;
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
