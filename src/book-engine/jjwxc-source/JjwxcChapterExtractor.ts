import { HtmlCleaner } from '../website-importer/html-cleaner';
import { detectKnownJjwxcStatus } from './jjwxcStatusMarkers';

export type JjwxcChapterStatus = 'ok' | 'locked' | 'session_expired' | 'unknown_format';

export interface JjwxcChapterResult {
  status: JjwxcChapterStatus;
  title: string | null;
  paragraphs: string[];
}

// Highest-risk, most guess-driven part of this module: the actual container that
// holds chapter body text on a real wap.jjwxc.net chapter page. These candidate
// id/class names are UNVERIFIED — nobody on this project has inspected a real
// authenticated chapter page yet (blocked on Xcode/device access). Calibrate this
// list once that's possible; the status branching above it (ok/locked/expired/
// unknown) does not need to change even if these selectors do.
const CONTENT_CONTAINER_PATTERNS: RegExp[] = [
  /<div[^>]*id=["']?(?:noveltext|oneboolt|chaptercontent|booktext|content_read)["']?[^>]*>([\s\S]*?)<\/div>/i,
  /<div[^>]*class=["'][^"']*(?:noveltext|chapter-content|content_read)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
];

const TITLE_PATTERNS: RegExp[] = [
  /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  /<title[^>]*>([\s\S]*?)<\/title>/i,
];

function extractTitle(html: string): string | null {
  for (const pattern of TITLE_PATTERNS) {
    const match = html.match(pattern);
    if (!match) continue;
    const title = HtmlCleaner.decodeHtmlEntities(match[1].replace(/<[^>]+>/g, '').trim());
    if (title) return title;
  }
  return null;
}

export class JjwxcChapterExtractor {
  /**
   * Classifies an already-fetched chapter page and extracts its body text when
   * readable. Pure function of an HTML string — never touches cookies, headers,
   * or any transport itself. The caller (a future native WebView bridge) is
   * responsible for getting this HTML and must never forward auth data alongside
   * it; this function has no way to leak what it never receives.
   */
  public static extract(html: string): JjwxcChapterResult {
    if (!html || !html.trim()) {
      return { status: 'unknown_format', title: null, paragraphs: [] };
    }

    const knownStatus = detectKnownJjwxcStatus(html);
    if (knownStatus === 'session_expired') {
      return { status: 'session_expired', title: null, paragraphs: [] };
    }
    if (knownStatus === 'locked') {
      return { status: 'locked', title: extractTitle(html), paragraphs: [] };
    }

    for (const pattern of CONTENT_CONTAINER_PATTERNS) {
      const match = html.match(pattern);
      if (!match || !match[1]) continue;
      const { paragraphs } = HtmlCleaner.cleanHtml(match[1]);
      if (paragraphs.length > 0) {
        return { status: 'ok', title: extractTitle(html), paragraphs };
      }
    }

    return { status: 'unknown_format', title: extractTitle(html), paragraphs: [] };
  }
}
