import { CandidateChapter } from './types';
import { HtmlCleaner } from './html-cleaner';
import { ChapterDetector } from '../chapter-detector/ChapterDetector';
import { UrlNormalizer } from './url-normalizer';

export interface ParsedChapterMeta {
  number: number | null;
  rawNumberString?: string;
  specialType?: CandidateChapter['specialType'];
  isNoise: boolean;
  cleanTitle: string;
  subPart?: string;
}

export class ChapterSorter {
  private static ROMAN_NUMERALS: Record<string, number> = {
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
    'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
    'xi': 11, 'xii': 12, 'xiii': 13, 'xiv': 14, 'xv': 15,
    'xvi': 16, 'xvii': 17, 'xviii': 18, 'xix': 19, 'xx': 20,
  };

  /**
   * Parse chapter number and special classification from title, slug, and url
   */
  public static parseMeta(title: string, slug: string = '', url: string = ''): ParsedChapterMeta {
    const raw = HtmlCleaner.decodeHtmlEntities(title || '').trim();
    const cleanLower = raw.toLowerCase();

    // 1. Noise check (Thông báo, Giới thiệu blog, Mục lục blog, Review, Tuyển editor, Lịch đăng...)
    const isNoisePattern = /^(?:\[?[^\]]*\]?\s*)?(?:thông báo|thong bao|mục lục blog|giới thiệu blog|review|lịch đăng|lich dang|tuyển editor|tuyen editor|tuyển nhân sự|update|cập nhật|faq|gợi ý pass|pass chương|pass\s+\d+)/i;
    if (isNoisePattern.test(cleanLower) && !cleanLower.includes('chương') && !cleanLower.includes('chapter')) {
      return { number: null, isNoise: true, cleanTitle: raw };
    }

    // 2. Special Chapter Check: Preface / Văn án / Lời mở đầu / Prologue at start of title
    if (/^(?:\[[^\]]*\]\s*)?(?:văn án|van an|giới thiệu|tóm tắt|lời mở đầu|prologue|tiền truyện)/i.test(cleanLower)) {
      const prefaceMatch = raw.match(/(?:văn án|van an|giới thiệu|lời mở đầu|prologue)\s*(\d+)?/i);
      const prefaceNum = prefaceMatch && prefaceMatch[1] ? parseInt(prefaceMatch[1], 10) * 0.01 : 0;
      return {
        number: prefaceNum,
        specialType: 'preface',
        isNoise: false,
        cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
      };
    }

    // 3. Special Chapter Check: Side Story / Phiên ngoại / Ngoại truyện / Epilogue at start of title
    if (/^(?:\[[^\]]*\]\s*)?(?:phiên ngoại|phien ngoai|ngoại truyện|ngoai truyen|epilogue|vĩ thanh|extra)/i.test(cleanLower)) {
      const sideNumMatch = raw.match(/(?:phiên ngoại|phien ngoai|ngoại truyện|ngoai truyen|epilogue|extra)\s*(\d+(?:\.\d+)?)/i);
      const sideNum = sideNumMatch ? parseFloat(sideNumMatch[1]) : 1;
      return {
        number: 10000 + sideNum,
        specialType: 'side_story',
        isNoise: false,
        cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
      };
    }

    // 4. Chapter Number detection: Decimal chapter numbers (e.g. "Chương 10.5", "Chap 12.1", "C1.2")
    const decimalMatch = raw.match(/(?:chương|ch\u01b0\u01a1ng|chap|chapter|hồi|tiết|phần|c\.?)\s*(?:số\s*)?(\d+\.\d+)/i);
    if (decimalMatch) {
      return {
        number: parseFloat(decimalMatch[1]),
        rawNumberString: decimalMatch[1],
        isNoise: false,
        cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
      };
    }

    // 5. Chapter Number detection: Alphanumeric sub-parts (e.g. "Chương 10a", "Chương 10b", "Chương 10 (Thượng)", "Chương 10 (Hạ)")
    const subPartMatch = raw.match(/(?:chương|ch\u01b0\u01a1ng|chap|chapter|c\.?)\s*(?:số\s*)?(\d+)\s*([a-z]|(?:[-–—_]\s*)?(?:phần\s*\d+|\(?(?:thượng|hạ|trung)\)?))/i);
    if (subPartMatch) {
      const baseNum = parseInt(subPartMatch[1], 10);
      const suffix = subPartMatch[2].toLowerCase().trim();
      let subOffset = 0.1;
      if (suffix === 'a' || suffix.includes('thượng') || suffix.includes('1')) subOffset = 0.1;
      else if (suffix === 'b' || suffix.includes('trung') || suffix.includes('2')) subOffset = 0.2;
      else if (suffix === 'c' || suffix.includes('hạ') || suffix.includes('3')) subOffset = 0.3;
      else if (suffix === 'd' || suffix.includes('4')) subOffset = 0.4;

      return {
        number: baseNum + subOffset,
        subPart: suffix,
        isNoise: false,
        cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
      };
    }

    // 6. Standard Integer Chapter Detection (e.g. "Chương 1", "chương 005", "Chap 12", "Hồi 3", "C1", "C.10")
    const standardMatch = raw.match(/(?:chương|ch\u01b0\u01a1ng|chap|chapter|hồi|tiết|phần|c\.?)\s*(?:số\s*)?(?:thứ\s*)?(\d+)/i);
    if (standardMatch) {
      return {
        number: parseInt(standardMatch[1], 10),
        rawNumberString: standardMatch[1],
        isNoise: false,
        cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
      };
    }

    // 7. Roman Numerals (e.g. "Chương I", "Chương IV", "Chapter X")
    const romanMatch = raw.match(/(?:chương|ch\u01b0\u01a1ng|chap|chapter)\s+(?:thứ\s*)?([ivxlcdm]+)(?:\s*[:–—\-]|\s*$)/i);
    if (romanMatch && this.ROMAN_NUMERALS[romanMatch[1].toLowerCase()]) {
      return {
        number: this.ROMAN_NUMERALS[romanMatch[1].toLowerCase()],
        isNoise: false,
        cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
      };
    }

    // 8. Vietnamese Word Number (e.g. "Chương Một", "Chương Thứ Mười")
    const wordChapMatch = raw.match(/(?:chương|ch\u01b0\u01a1ng)\s+([a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9\s]{1,30}?)(?:\s*[:–—\-.]|\s*$)/i);
    if (wordChapMatch) {
      let wordText = wordChapMatch[1].trim().toLowerCase();
      wordText = wordText.replace(/^(?:thứ|thu)\s+/, '');
      const parsedWord = ChapterDetector.parseVietnameseWordNumber(wordText);
      if (parsedWord !== null) {
        return {
          number: parsedWord,
          isNoise: false,
          cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
        };
      }
    }

    // 9. Chapter Range (e.g. "Tổng Tài _ 1 - 10" or "Chương 1 - 10")
    const rangeMatch = raw.match(/[-–—_]\s*(\d+)\s*[-–—]\s*(\d+)/);
    if (rangeMatch) {
      return {
        number: parseInt(rangeMatch[1], 10),
        isNoise: false,
        cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
      };
    }

    // 10. Trailing hyphen/underscore + number (e.g. "Vi Thần – 8🍑" or "Cảng Đảo – 154")
    const trailingNumMatch = raw.match(/[-–—_]\s*(\d+)\s*(?:[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\s]*)$/u);
    if (trailingNumMatch) {
      return {
        number: parseInt(trailingNumMatch[1], 10),
        isNoise: false,
        cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
      };
    }

    // 11. Slug Fallback (e.g. "bat-nat-chuong-5" or "chuong-12" or "vi-than-8")
    if (slug) {
      const slugMatch = slug.match(/(?:chuong|chapter|chap|c)-(\d+(?:\.\d+)?)/i) || slug.match(/-(\d+)$/);
      if (slugMatch) {
        return {
          number: parseFloat(slugMatch[1]),
          isNoise: false,
          cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
        };
      }
    }

    // 12. URL Fallback
    if (url) {
      const urlMatch = url.match(/chuong-(\d+)/i) || url.match(/\/(\d+)\/?$/);
      if (urlMatch) {
        return {
          number: parseInt(urlMatch[1], 10),
          isNoise: false,
          cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
        };
      }
    }

    // 13. Generic Title Fallback
    return {
      number: null,
      isNoise: false,
      cleanTitle: HtmlCleaner.stripEmojis(raw.replace(/^\[[^\]]+\]\s*/, '').trim()),
    };
  }

  /**
   * Sort candidate chapters with natural chapter ordering, deduplicate URLs, and detect missing sequences
   */
  public static processAndSortChapters<T extends { title: string; slug?: string; url?: string; date?: string; id?: string | number }>(
    rawItems: T[]
  ): {
    chapters: CandidateChapter[];
    missingChapters: number[];
    duplicateChapters: number[];
  } {
    // 1. Deduplicate by Normalized URL first if URLs exist
    const seenUrls = new Set<string>();
    const uniqueRawItems: T[] = [];

    for (const item of rawItems) {
      if (item.url) {
        const normUrl = UrlNormalizer.normalize(item.url);
        if (normUrl && seenUrls.has(normUrl)) {
          continue;
        }
        if (normUrl) seenUrls.add(normUrl);
      }
      uniqueRawItems.push(item);
    }

    // 2. Parse metadata for each chapter
    const parsedList: Array<{
      item: T;
      meta: ParsedChapterMeta;
    }> = [];

    for (const item of uniqueRawItems) {
      const meta = this.parseMeta(item.title, item.slug || '', item.url || '');
      if (!meta.isNoise) {
        parsedList.push({ item, meta });
      }
    }

    // 3. Natural Sort:
    // a. Preface / Intro (number === 0 or < 1)
    // b. Regular chapters ascending by number
    // c. Side stories (number >= 10000)
    // d. Non-numbered items by date or original order
    parsedList.sort((a, b) => {
      if (a.meta.number !== null && b.meta.number !== null) {
        return a.meta.number - b.meta.number;
      }
      if (a.meta.number !== null) return -1;
      if (b.meta.number !== null) return 1;

      // Date comparison fallback
      if (a.item.date && b.item.date) {
        const timeA = new Date(a.item.date).getTime();
        const timeB = new Date(b.item.date).getTime();
        if (!isNaN(timeA) && !isNaN(timeB)) {
          return timeA - timeB;
        }
      }

      return 0;
    });

    // 4. Detect Duplicate Chapter Numbers and Missing Integer Gaps
    const seenNumbers = new Set<number>();
    const duplicateChapters: number[] = [];
    const missingChapters: number[] = [];
    let prevInteger = 0;

    const candidateChapters: CandidateChapter[] = [];

    parsedList.forEach((entry, idx) => {
      const num = entry.meta.number;
      let isDup = false;

      if (num !== null && num > 0 && num < 10000) {
        const isInteger = Math.floor(num) === num;

        if (isInteger) {
          if (seenNumbers.has(num)) {
            isDup = true;
            if (!duplicateChapters.includes(num)) {
              duplicateChapters.push(num);
            }
          } else {
            seenNumbers.add(num);

            // Check for integer gaps (e.g. 1, 2, 3, 5 -> missing 4)
            if (prevInteger > 0 && num > prevInteger + 1 && num <= prevInteger + 10) {
              for (let m = prevInteger + 1; m < num; m++) {
                if (!missingChapters.includes(m)) {
                  missingChapters.push(m);
                }
              }
            }
            prevInteger = num;
          }
        }
      }

      candidateChapters.push({
        id: entry.item.id,
        index: idx + 1,
        title: entry.meta.cleanTitle || `Chương ${idx + 1}`,
        url: entry.item.url || '',
        slug: entry.item.slug,
        date: entry.item.date,
        specialType: entry.meta.specialType,
        isDuplicate: isDup,
        status: 'pending',
      });
    });

    return {
      chapters: candidateChapters,
      missingChapters,
      duplicateChapters,
    };
  }
}
