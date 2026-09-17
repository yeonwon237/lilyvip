import { HtmlCleaner } from '../website-importer/html-cleaner';
import { detectKnownJjwxcStatus } from './jjwxcStatusMarkers';

export type JjwxcTocStatus = 'ok' | 'locked' | 'session_expired' | 'unknown_format';

export interface JjwxcTocChapter {
  index: number;
  title: string;
  url: string;
}

export interface JjwxcTocResult {
  status: JjwxcTocStatus;
  title: string | null;
  author: string | null;
  chapters: JjwxcTocChapter[];
}

// Calibrated against a real anonymous fetch of a live wap.jjwxc.net book page
// (via JjwxcAdapter — the page must be fetched with `?more=0&whole=1` appended
// or this only holds a truncated teaser list, not the full TOC).
const CHAPTER_LIST_CONTAINER_PATTERNS: RegExp[] = [
  /<div[^>]*id=["']?chapter_list_box["']?[^>]*>([\s\S]*?)<\/div>/i,
];

const CHAPTER_LINK_PATTERN = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

// The chapter list container also holds a "展开全部章节" (expand all chapters)
// link and similar chrome that isn't a real chapter — only accept links that
// actually look like a numbered chapter URL (free: /book2/{id}/{n}, VIP:
// /vip/{id}/{n}). VIP links are kept in the list (so the TOC accurately shows
// they exist) — fetchChapterContent() will fail them individually instead of
// silently dropping them here.
const CHAPTER_URL_PATTERN = /^\/(?:book2|vip)\/\d+\/\d+(?:[?/].*)?$/;

const BOOK_TITLE_PATTERNS: RegExp[] = [
  /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  /<title[^>]*>([\s\S]*?)<\/title>/i,
];

// 作者 = "author" — looks for "作者：<name>" either as plain text or wrapped in a tag.
const AUTHOR_PATTERNS: RegExp[] = [
  /作者[:：]\s*<[^>]*>([\s\S]*?)<\//i,
  /作者[:：]\s*([^\s<]{1,40})/,
];

function stripTags(fragment: string): string {
  return HtmlCleaner.decodeHtmlEntities(fragment.replace(/<[^>]+>/g, '').trim());
}

// The book page's <title> is "《书名》作者_晋江文学城_【...】" (no <h1> exists on
// the real page) — pull just the bracketed book name out of that rather than
// showing the whole jumbled tag text as the book's title.
function cleanBookTitle(raw: string): string {
  const bracketed = raw.match(/《([^《》]+)》/);
  return bracketed ? bracketed[1] : raw;
}

function extractFirstMatch(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    const value = stripTags(match[1]);
    if (value) return value;
  }
  return null;
}

export class JjwxcTocLoader {
  /**
   * Parses an already-fetched book/TOC page into metadata + a chapter list. Pure
   * function of an HTML string — no network call, no cookie/header access. Chapter
   * fetching itself (one chapter at a time, via the authenticated WebView) is a
   * separate, later step; this only reads what the page's table of contents says.
   */
  public static parse(html: string): JjwxcTocResult {
    if (!html || !html.trim()) {
      return { status: 'unknown_format', title: null, author: null, chapters: [] };
    }

    const knownStatus = detectKnownJjwxcStatus(html);
    if (knownStatus === 'session_expired') {
      return { status: 'session_expired', title: null, author: null, chapters: [] };
    }
    const rawTitle = extractFirstMatch(html, BOOK_TITLE_PATTERNS);
    const title = rawTitle ? cleanBookTitle(rawTitle) : null;
    const author = extractFirstMatch(html, AUTHOR_PATTERNS);

    if (knownStatus === 'locked') {
      return { status: 'locked', title, author, chapters: [] };
    }

    for (const containerPattern of CHAPTER_LIST_CONTAINER_PATTERNS) {
      const containerMatch = html.match(containerPattern);
      if (!containerMatch || !containerMatch[1]) continue;

      const chapters: JjwxcTocChapter[] = [];
      const linkPattern = new RegExp(CHAPTER_LINK_PATTERN.source, CHAPTER_LINK_PATTERN.flags);
      let linkMatch: RegExpExecArray | null;
      while ((linkMatch = linkPattern.exec(containerMatch[1])) !== null) {
        // href values are HTML-attribute-encoded (e.g. "&amp;" for a literal "&"
        // in a query string), same as any other HTML text — decode before use.
        const rawHref = linkMatch[1];
        if (!CHAPTER_URL_PATTERN.test(rawHref)) continue; // skip "expand all" / other non-chapter links
        const url = HtmlCleaner.decodeHtmlEntities(rawHref);
        const chapterTitle = stripTags(linkMatch[2]);
        if (chapterTitle) chapters.push({ index: chapters.length + 1, title: chapterTitle, url });
      }

      if (chapters.length > 0) {
        return { status: 'ok', title, author, chapters };
      }
    }

    return { status: 'unknown_format', title, author, chapters: [] };
  }
}
