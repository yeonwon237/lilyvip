import { GoogleDocsAdapter } from './GoogleDocsAdapter';
import { HtmlCleaner } from '../html-cleaner';
import { safeFetch } from '../safe-fetch';
import type { CandidateBook, CandidateChapter, WebsiteAdapter, WebsiteAnalysisResult } from '../types';
import { UrlNormalizer } from '../url-normalizer';

export interface PublicDriveDocument { id: string; title: string }
export interface PublicDriveFile extends PublicDriveDocument { format: 'EPUB' | 'TXT' | 'DOCX' }

export function parsePublicDriveFiles(html: string): PublicDriveFile[] {
  const files: PublicDriveFile[] = [];
  const seen = new Set<string>();
  const embeddedPattern = /<div class="flip-entry" id="entry-([A-Za-z0-9_-]{10,})"[\s\S]*?<img src="[^"]*\/type\/application\/(epub\+zip|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|[^\"]*text[^\"]*)"[\s\S]*?<div class="flip-entry-title">([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;
  while ((match = embeddedPattern.exec(html))) {
    const mime = match[2].toLowerCase();
    const format: PublicDriveFile['format'] = mime === 'epub+zip' ? 'EPUB' : mime.includes('wordprocessingml') ? 'DOCX' : 'TXT';
    seen.add(match[1]);
    files.push({
      id: match[1],
      title: HtmlCleaner.decodeHtmlEntities(match[3].replace(/<[^>]+>/g, '')).trim(),
      format,
    });
  }
  const rowPattern = /<tr\b[^>]*data-id=["']([A-Za-z0-9_-]{10,})["'][\s\S]{0,12000}?aria-label=["']([^"']+?\.(epub|txt|docx))\s+[^"']*["']/gi;
  while ((match = rowPattern.exec(html))) {
    if (seen.has(match[1])) continue;
    seen.add(match[1]);
    files.push({
      id: match[1],
      title: HtmlCleaner.decodeHtmlEntities(match[2]).trim(),
      format: match[3].toUpperCase() as PublicDriveFile['format'],
    });
  }
  return files;
}

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
    const folderId = new URL(sourceUrl).pathname.match(/^\/drive\/folders\/([A-Za-z0-9_-]+)/)?.[1];
    if (!folderId) throw new Error('Liên kết thư mục Google Drive không hợp lệ.');
    // The regular Drive page only renders the first 50 rows. Google's public
    // embedded view renders the complete shared-folder listing in one response.
    const listingUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}`;
    const response = await safeFetch(listingUrl, { signal });
    if (!response.ok) throw new Error('Không đọc được thư mục Drive. Hãy bật quyền “Bất kỳ ai có liên kết đều có thể xem”.');
    const html = await response.text();
    const documents = parsePublicDriveDocuments(html);
    const files = parsePublicDriveFiles(html);
    if (!documents.length && !files.length) throw new Error('Thư mục Drive công khai chưa có EPUB, TXT, DOCX hoặc Google Docs nào Lily có thể đọc.');
    const titleHtml = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || 'Thư mục Google Drive';
    const title = HtmlCleaner.decodeHtmlEntities(titleHtml).replace(/\s*[-–]\s*Google Drive\s*$/i, '').trim();
    const chapters: CandidateChapter[] = documents.map((document, index) => ({
      index: index + 1, title: document.title || `Phần ${index + 1}`,
      url: `https://docs.google.com/document/d/${document.id}/view`,
    }));
    const candidateBooks: CandidateBook[] = files.map((file, index) => ({
      id: `gdrive_file_${file.id}_${index}`,
      title: file.title.replace(/\.(epub|txt|docx)$/i, '').trim(),
      author: '',
      sourceUrl,
      hostname: 'drive.google.com',
      adapterName: this.name,
      totalChapters: 0,
      chapters: [] as CandidateChapter[],
      confidence: 'HIGH' as const,
      confidenceReason: `Đã nhận diện tệp ${file.format} công khai.`,
      remoteFile: {
        url: `https://drive.usercontent.google.com/download?id=${file.id}&export=download&confirm=t`,
        name: file.title,
        format: file.format,
      },
    }));
    if (chapters.length) {
      candidateBooks.unshift({
        id: `gdrive_docs_${Date.now()}`,
        title,
        author: '', sourceUrl, hostname: 'drive.google.com', adapterName: this.name,
        totalChapters: chapters.length, chapters, confidence: 'HIGH' as const,
        confidenceReason: `Tìm thấy ${chapters.length} tài liệu công khai trong thư mục.`,
        remoteFile: undefined,
      });
    }
    return {
      adapter: this.name, siteName: 'Google Drive', hostname: 'drive.google.com', sourceUrl,
      isWordPress: false, isWordPressCom: false,
      candidateBooks,
      diagnostics: { totalPostsDiscovered: candidateBooks.length, totalPagesDiscovered: documents.length + files.length,
        categoriesDiscovered: 0, restRoutes: [], warnings: ['Mỗi tệp EPUB, TXT hoặc DOCX được hiển thị thành một cuốn truyện riêng.'], errors: [] },
    };
  }

  public fetchChapterContent(chapter: CandidateChapter, signal?: AbortSignal) {
    return this.docs.fetchChapterContent(chapter, signal);
  }
}
