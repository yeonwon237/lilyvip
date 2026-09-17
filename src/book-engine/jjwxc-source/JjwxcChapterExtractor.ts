import { HtmlCleaner } from '../website-importer/html-cleaner';
import { detectKnownJjwxcStatus } from './jjwxcStatusMarkers';
import { decryptJjwxcChapter } from './JjwxcCrypto';

import { JjwxcFontManager } from './JjwxcFontManager';

export type JjwxcChapterStatus = 'ok' | 'locked' | 'session_expired' | 'unknown_format';

export interface JjwxcChapterResult {
  status: JjwxcChapterStatus;
  title: string | null;
  paragraphs: string[];
  fontFamily?: string;
  fontUrl?: string;
}

// Calibrated against a real anonymous fetch of a live, free wap.jjwxc.net
// chapter page (via JjwxcAdapter/safeFetch — no cookies sent). Body paragraphs
// sit in <ul class="content_ul"><li>...<br><br>...</li></ul>, not a <div>.
// Note this markup could still differ for other novels/layouts or after a
// site redesign — the status branching above it (ok/locked/expired/unknown)
// does not need to change even if this selector does.
const CONTENT_CONTAINER_PATTERNS: RegExp[] = [
  /<ul[^>]*class=["'][^"']*\bcontent_ul\b[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i,
];

const TITLE_PATTERNS: RegExp[] = [
  // The chapter heading (e.g. "1、第 1 章 ...") — only reached for an 'ok'
  // result, so the same h2.big element being reused as breadcrumb nav on a
  // locked page (see jjwxcStatusMarkers) never gets read as a title.
  /<h2[^>]*class=["'][^"']*\bbig\b[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i,
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
   * Asynchronously extracts chapter content, automatically decrypting VIP chapters
   * when encrypted contentvars are present.
   */
  public static async extractAsync(html: string): Promise<JjwxcChapterResult> {
    if (!html || !html.trim()) {
      return { status: 'unknown_format', title: null, paragraphs: [] };
    }

    // Check if this is an encrypted VIP chapter
    if (html.includes('id="contentvars"') || html.includes("id='contentvars'")) {
      const decryptedHtml = await decryptJjwxcChapter(html);
      if (decryptedHtml) {
        const fontInfo = JjwxcFontManager.extractFontInfo(html);
        const decodedHtml = await JjwxcFontManager.decodeText(
          decryptedHtml,
          fontInfo.fontFamily,
          fontInfo.fontUrl
        );
        const { paragraphs } = HtmlCleaner.cleanHtml(decodedHtml);
        if (paragraphs.length > 0) {
          const cleanParas = paragraphs.map(p => JjwxcFontManager.cleanObfuscation(p));
          return {
            status: 'ok',
            title: extractTitle(html),
            paragraphs: cleanParas,
            fontFamily: fontInfo.fontFamily,
            fontUrl: fontInfo.fontUrl,
          };
        }
      }
    }

    const standardRes = this.extract(html);
    if (standardRes.status === 'ok' && standardRes.paragraphs.length > 0) {
      const fontInfo = JjwxcFontManager.extractFontInfo(html);
      if (fontInfo.fontUrl) {
        const decodedParas = await Promise.all(
          standardRes.paragraphs.map(p => JjwxcFontManager.decodeText(p, fontInfo.fontFamily, fontInfo.fontUrl))
        );
        return {
          ...standardRes,
          paragraphs: decodedParas.map(p => JjwxcFontManager.cleanObfuscation(p)),
          fontFamily: fontInfo.fontFamily,
          fontUrl: fontInfo.fontUrl,
        };
      }
    }

    return standardRes;
  }

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
