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

// Same caveat as JjwxcChapterExtractor: exact container selectors are UNVERIFIED
// against a real wap.jjwxc.net book page — this is Lily's best guess at where a
// chapter list would live, pending a real authenticated fetch to calibrate against.
const CHAPTER_LIST_CONTAINER_PATTERNS: RegExp[] = [
  /<div[^>]*id=["']?(?:oneboolt|chapterlistbox|noveltoc)["']?[^>]*>([\s\S]*?)<\/div>/i,
  /<ul[^>]*class=["'][^"']*(?:chapter-list|toc-list)[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i,
];

const CHAPTER_LINK_PATTERN = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

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
    if (knownStatus === 'locked') {
      return { status: 'locked', title: extractFirstMatch(html, BOOK_TITLE_PATTERNS), author: extractFirstMatch(html, AUTHOR_PATTERNS), chapters: [] };
    }

    const title = extractFirstMatch(html, BOOK_TITLE_PATTERNS);
    const author = extractFirstMatch(html, AUTHOR_PATTERNS);

    for (const containerPattern of CHAPTER_LIST_CONTAINER_PATTERNS) {
      const containerMatch = html.match(containerPattern);
      if (!containerMatch || !containerMatch[1]) continue;

      const chapters: JjwxcTocChapter[] = [];
      const linkPattern = new RegExp(CHAPTER_LINK_PATTERN.source, CHAPTER_LINK_PATTERN.flags);
      let linkMatch: RegExpExecArray | null;
      while ((linkMatch = linkPattern.exec(containerMatch[1])) !== null) {
        // href values are HTML-attribute-encoded (e.g. "&amp;" for a literal "&"
        // in a query string), same as any other HTML text — decode before use.
        const url = HtmlCleaner.decodeHtmlEntities(linkMatch[1]);
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
