import { 
  CandidateBook, 
  CandidateChapter, 
  WebsiteAdapter, 
  WebsiteAnalysisResult 
} from '../types';
import { HtmlCleaner } from '../html-cleaner';
import { safeFetch } from '../safe-fetch';

/**
 * SHA-256 calculation that runs seamlessly in both Browser and Node.js
 */
async function computeSha256Hex(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgUint8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Pure JS SHA-256 fallback
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const words: number[] = [];
  const asciiBitLength = str.length * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isPrime = (n: number) => {
    for (let factor = 2, max = Math.sqrt(n); factor <= max; factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(candidate, 1 / 2) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  str += '\x80';
  while ((str.length % 64) - 56) str += '\x00';
  for (let i = 0; i < str.length; i++) {
    const j = str.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & hash[5]) ^ (~e & hash[6]);
      const temp1 = hash[7] + s1 + ch + k[i] + (w[i] = (i < 16) ? w[i] : (
        w[i - 16] +
        (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
        w[i - 7] +
        (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
      ) | 0);
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = s0 + maj;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

function fuzzySign(text: string): string {
  if (text.length <= 34) return text;
  return text.substring(34) + text.substring(0, 34);
}

export class WikiCvAdapter implements WebsiteAdapter {
  public name = 'wikicv';

  /**
   * Determine if URL belongs to WikiCV / WikiDich ecosystem
   */
  public canHandle(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return (
        host.includes('wikicv.org') ||
        host.includes('wikicv.net') ||
        host.includes('wikidich.net') ||
        host.includes('wikidich.com') ||
        host.includes('wikidich3.com') ||
        host.includes('wikidich.me') ||
        host.includes('wikidth.net') ||
        host.includes('wikidth.com')
      );
    } catch {
      return false;
    }
  }

  /**
   * Extract chapter index from title or URL
   */
  private parseChapterNumber(title: string, url: string): number | null {
    const chapMatch = title.match(/(?:chương|ch\u01b0\u01a1ng|chap|chapter|hồi|tiết|phần)\s*(?:số\s*)?(\d+)/i);
    if (chapMatch) {
      return parseInt(chapMatch[1], 10);
    }
    const urlMatch = url.match(/chuong-(\d+)/i);
    if (urlMatch) {
      return parseInt(urlMatch[1], 10);
    }
    return null;
  }

  /**
   * Analyze WikiCV story page, retrieve TOC and chapter list
   */
  public async analyze(rawUrl: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      throw new Error('Địa chỉ WikiCV không hợp lệ.');
    }

    const hostname = parsedUrl.hostname;
    let storyUrl = rawUrl;
    let isSingleChapter = false;
    let singleChapterUrl = '';

    // Check if user pasted a direct chapter link
    if (parsedUrl.pathname.includes('/chuong-')) {
      isSingleChapter = true;
      singleChapterUrl = rawUrl;
      // Derive story base URL: /truyen/slug/chuong-1... -> /truyen/slug
      const pathParts = parsedUrl.pathname.split('/');
      const truyenIdx = pathParts.indexOf('truyen');
      if (truyenIdx !== -1 && pathParts[truyenIdx + 1]) {
        storyUrl = `${parsedUrl.origin}/truyen/${pathParts[truyenIdx + 1]}`;
      }
    }

    // 1. Fetch novel main page HTML
    let mainHtml = '';
    try {
      const res = await safeFetch(storyUrl, {
        signal,
      });
      if (!res.ok) {
        throw new Error(`Máy chủ WikiCV phản hồi mã lỗi ${res.status}.`);
      }
      mainHtml = await res.text();
    } catch (err: any) {
      if (signal?.aborted) throw new Error('Đã hủy phân tích website.');
      throw new Error(`Không thể kết nối đến WikiCV (${err.message}).`);
    }

    // 2. Extract Metadata (Title, Author, Cover, Description)
    const titleMatch = mainHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || mainHtml.match(/<title>([\s\S]*?)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Truyện WikiCV';
    const { title: cleanBookTitle } = HtmlCleaner.cleanTitle(rawTitle);

    const authorMatch = mainHtml.match(/Tác giả:[^<]*<a[^>]*>([^<]+)<\/a>/i) || mainHtml.match(/author[^>]*>([^<]+)</i);
    const bookAuthor = authorMatch ? authorMatch[1].trim() : 'Tác giả';

    const coverMatch = mainHtml.match(/<div class="cover"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i) || mainHtml.match(/property="og:image"\s+content="([^"]+)"/i);
    let coverUrl: string | undefined = undefined;
    if (coverMatch && coverMatch[1]) {
      coverUrl = coverMatch[1];
      if (!coverUrl.startsWith('http')) {
        coverUrl = `${parsedUrl.origin}${coverUrl}`;
      }
    }

    // 3. Extract bookId and signKey for Dynamic TOC
    const bookIdMatch = mainHtml.match(/var\s+bookId\s*=\s*['"]([^'"]+)['"]/);
    const signKeyMatch = mainHtml.match(/var\s+signKey\s*=\s*['"]([^'"]+)['"]/);

    const rawChapters: Array<{ url: string; title: string }> = [];

    if (bookIdMatch && signKeyMatch) {
      const bookId = bookIdMatch[1];
      const signKey = signKeyMatch[1];

      // Fetch TOC in chunks of 500 chapters
      let start = 0;
      const size = 500;
      let hasMore = true;

      while (hasMore) {
        const sign = await computeSha256Hex(fuzzySign(signKey + start + size));
        const indexUrl = `${parsedUrl.origin}/book/index?bookId=${bookId}&start=${start}&size=${size}&signKey=${signKey}&sign=${sign}`;

        try {
          const indexRes = await safeFetch(indexUrl, {
            signal,
            headers: {
              'Referer': storyUrl,
            }
          });

          if (indexRes.ok) {
            const indexHtml = await indexRes.text();
            const chRegex = /href="(\/truyen\/[^\/]+\/chuong-[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
            let m;
            let batchCount = 0;
            while ((m = chRegex.exec(indexHtml)) !== null) {
              batchCount++;
              rawChapters.push({
                url: `${parsedUrl.origin}${m[1]}`,
                title: HtmlCleaner.decodeHtmlEntities(m[2].replace(/<[^>]+>/g, '').trim()),
              });
            }

            if (batchCount < size || rawChapters.length >= 2000) {
              hasMore = false;
            } else {
              start += size;
            }
          } else {
            hasMore = false;
          }
        } catch {
          hasMore = false;
        }
      }
    }

    // Fallback: If bookId/signKey failed, try scanning chapter links directly on page HTML
    if (rawChapters.length === 0) {
      const fallbackRegex = /href="(\/truyen\/[^\/]+\/chuong-[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = fallbackRegex.exec(mainHtml)) !== null) {
        rawChapters.push({
          url: `${parsedUrl.origin}${m[1]}`,
          title: HtmlCleaner.decodeHtmlEntities(m[2].replace(/<[^>]+>/g, '').trim()),
        });
      }
    }

    if (rawChapters.length === 0) {
      throw new Error('Không tìm thấy danh sách chương nào từ truyện WikiCV này.');
    }

    // 4. Clean chapter titles & build CandidateChapter[]
    const candidateChapters: CandidateChapter[] = rawChapters.map((ch, idx) => {
      let cleanTitle = HtmlCleaner.stripEmojis(ch.title);
      // Clean repeated chapter titles e.g. "Chương 1 chương 1: Nàng người nhà" -> "Chương 1: Nàng người nhà"
      cleanTitle = cleanTitle.replace(/^(chương\s+\d+)\s+chương\s+\d+:\s*/i, '$1: ');
      cleanTitle = cleanTitle.replace(/^(chương\s+\d+)\s+chương\s+\d+\s+/i, '$1 - ');

      let specialType: CandidateChapter['specialType'] = undefined;
      if (/(?:văn án|van an|lời mở đầu|tiền truyện)/i.test(cleanTitle)) specialType = 'preface';
      if (/(?:phiên ngoại|phien ngoai|ngoại truyện)/i.test(cleanTitle)) specialType = 'side_story';

      return {
        id: `wikicv_${idx + 1}`,
        index: idx + 1,
        title: cleanTitle || `Chương ${idx + 1}`,
        url: ch.url,
        specialType,
      };
    });

    const candidateBook: CandidateBook = {
      id: `wikicv_${Date.now()}`,
      title: cleanBookTitle,
      author: bookAuthor,
      sourceUrl: storyUrl,
      hostname,
      totalChapters: candidateChapters.length,
      chapters: candidateChapters,
      confidence: 'HIGH',
      coverUrl,
      suggestedCoverColor: '#2B5B84',
      adapterName: this.name,
    };

    let singleChapterItem: CandidateChapter | undefined = undefined;
    if (isSingleChapter && singleChapterUrl) {
      singleChapterItem = candidateChapters.find(c => c.url === singleChapterUrl) || {
        id: 'wikicv_single',
        index: 1,
        title: 'Chương hiện tại',
        url: singleChapterUrl,
      };
    }

    return {
      adapter: this.name,
      hostname,
      sourceUrl: storyUrl,
      isWordPress: false,
      isWordPressCom: false,
      candidateBooks: [candidateBook],
      isSingleChapterLink: isSingleChapter,
      singleChapterItem,
      singleChapterBookCandidate: isSingleChapter ? candidateBook : undefined,
      diagnostics: {
        totalPostsDiscovered: candidateChapters.length,
        totalPagesDiscovered: 1,
        categoriesDiscovered: 1,
        restRoutes: ['/book/index'],
        warnings: [],
        errors: [],
      },
    };
  }

  /**
   * Fetch body of a single chapter from WikiCV
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
      const res = await safeFetch(chapter.url, {
        signal,
      });
      if (!res.ok) {
        throw new Error(`Lỗi tải chương (${res.status}).`);
      }
      html = await res.text();
    } catch (err: any) {
      if (signal?.aborted) throw new Error('Đã hủy tải chương.');
      throw new Error(`Không thể tải chương "${chapter.title}": ${err.message}`);
    }

    // Extract content container
    const contentMatch =
      html.match(/<div[^>]*id="bookContentBody"[^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/<div[^>]*class="[^"]*reading-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/<div[^>]*class="[^"]*chapter-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    const rawContentHtml = contentMatch ? contentMatch[1] : html;

    const { body, paragraphs, wordCount } = HtmlCleaner.cleanHtml(rawContentHtml, chapter.title);

    if (!body || paragraphs.length === 0) {
      throw new Error(`Nội dung chương "${chapter.title}" bị trống.`);
    }

    return {
      content: body,
      paragraphs,
      wordCount,
    };
  }
}
