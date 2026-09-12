import { GoogleDocsAdapter } from './GoogleDocsAdapter';
import { HtmlCleaner } from '../html-cleaner';
import { safeFetch } from '../safe-fetch';
import type { CandidateChapter, WebsiteAdapter, WebsiteAnalysisResult } from '../types';
import { UrlNormalizer } from '../url-normalizer';

export interface PublicDriveDocument { id: string; title: string }

export function parsePublicDriveDocuments(html: string): PublicDriveDocument[] {
  const documents: PublicDriveDocument[] = [];
  const seen = new Set<string>();
  const pattern = /data-id=["']([A-Za-z0-9_-]{10,})["'][^>]*\sdata-tooltip=["']([^"']+?)(?:\s+Google Docs)?["']/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const nearby = html.slice(Math.max(0, match.index - 500), Math.min(html.length, pattern.lastIndex + 500));
    if (!/Google Docs|application\\?\/vnd\.google-apps\.document/i.test(nearby) || seen.has(match[1])) continue;
    seen.add(match[1]);
    documents.push({ id: match[1], title: HtmlCleaner.decodeHtmlEntities(match[2]).replace(/\s+Google Docs$/i, '').trim() });
  }
  // Drive also embeds the complete listing in an escaped bootstrap array.
  const escaped = /\\x22([A-Za-z0-9_-]{10,})\\x22,[\s\S]{0,100}?\\x22([^\\]{1,200})\\x22,\\x22application\\\/vnd\.google-apps\.document\\x22/g;
  while ((match = escaped.exec(html))) {
    if (seen.has(match[1])) continue;
    seen.add(match[1]);
    documents.push({ id: match[1], title: HtmlCleaner.decodeHtmlEntities(match[2]).trim() });
  }
  return documents;
}

export class GoogleDriveFolderAdapter implements WebsiteAdapter {
  public name = 'google-drive-folder';
  private docs = new GoogleDocsAdapter();

  public canHandle(raw: string): boolean {
    try {
      const url = new URL(raw);
      return url.protocol === 'https:' && url.hostname === 'drive.google.com' && /^\/drive\/folders\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
    } catch { return false; }
  }

  public async analyze(raw: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const sourceUrl = UrlNormalizer.normalize(raw);
    const response = await safeFetch(sourceUrl, { signal });
    if (!response.ok) throw new Error('Không đọc được thư mục Drive. Hãy bật quyền “Bất kỳ ai có liên kết đều có thể xem”.');
    const html = await response.text();
    const documents = parsePublicDriveDocuments(html);
    if (!documents.length) throw new Error('Thư mục Drive công khai chưa có Google Docs nào Lily có thể đọc.');
    const titleHtml = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || 'Thư mục Google Drive';
    const title = HtmlCleaner.decodeHtmlEntities(titleHtml).replace(/\s*[-–]\s*Google Drive\s*$/i, '').trim();
    const chapters: CandidateChapter[] = documents.map((document, index) => ({
      index: index + 1, title: document.title || `Phần ${index + 1}`,
      url: `https://docs.google.com/document/d/${document.id}/view`,
    }));
    return {
      adapter: this.name, siteName: 'Google Drive', hostname: 'drive.google.com', sourceUrl,
      isWordPress: false, isWordPressCom: false,
      candidateBooks: [{ id: `gdrive_${Date.now()}`, title, author: '', sourceUrl, hostname: 'drive.google.com',
        adapterName: this.name, totalChapters: chapters.length, chapters, confidence: 'HIGH',
        confidenceReason: `Tìm thấy ${chapters.length} tài liệu công khai trong thư mục.` }],
      diagnostics: { totalPostsDiscovered: chapters.length, totalPagesDiscovered: chapters.length,
        categoriesDiscovered: 0, restRoutes: [], warnings: ['Mỗi Google Docs trong thư mục được xếp thành một phần theo thứ tự Drive.'], errors: [] },
    };
  }

  public fetchChapterContent(chapter: CandidateChapter, signal?: AbortSignal) {
    return this.docs.fetchChapterContent(chapter, signal);
  }
}
