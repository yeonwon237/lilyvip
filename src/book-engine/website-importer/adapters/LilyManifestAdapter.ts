import { HtmlCleaner } from '../html-cleaner';
import { safeFetch } from '../safe-fetch';
import type { CandidateChapter, WebsiteAdapter, WebsiteAnalysisResult } from '../types';
import { UrlNormalizer } from '../url-normalizer';

interface ManifestChapter { title?: unknown; content?: unknown; paragraphs?: unknown }
interface LilyManifest { lily?: unknown; title?: unknown; author?: unknown; description?: unknown; cover?: unknown; chapters?: unknown }

function manifestPath(url: URL): boolean {
  return url.pathname === '/.well-known/lily-reader.json' || url.pathname.endsWith('/lily-reader.json');
}

export class LilyManifestAdapter implements WebsiteAdapter {
  public name = 'lily-manifest';
  private cache = new Map<string, { content: string; paragraphs: string[]; wordCount: number }>();

  public canHandle(raw: string): boolean {
    try { const url = new URL(raw); return url.protocol === 'https:' && manifestPath(url); }
    catch { return false; }
  }

  private async read(raw: string, signal?: AbortSignal) {
    const response = await safeFetch(raw, { signal });
    if (!response.ok || !/^application\/(?:json|[^;]+\+json)\b/i.test(response.headers.get('content-type') || '')) {
      throw new Error('Lily Manifest phải là file JSON công khai hợp lệ.');
    }
    const manifest = await response.json() as LilyManifest;
    if (!['1', '1.0'].includes(String(manifest.lily)) || typeof manifest.title !== 'string' || !manifest.title.trim() || !Array.isArray(manifest.chapters)) {
      throw new Error('Lily Manifest thiếu phiên bản, tên truyện hoặc danh sách chương.');
    }
    if (manifest.chapters.length < 1 || manifest.chapters.length > 20_000) throw new Error('Số chương trong Lily Manifest không hợp lệ.');
    const chapters = manifest.chapters.map((rawChapter, index) => {
      const chapter = rawChapter as ManifestChapter;
      const title = typeof chapter.title === 'string' && chapter.title.trim() ? chapter.title.trim() : `Chương ${index + 1}`;
      const supplied = Array.isArray(chapter.paragraphs) ? chapter.paragraphs : typeof chapter.content === 'string' ? chapter.content.split(/\n\s*\n/) : [];
      const paragraphs = supplied.filter((item): item is string => typeof item === 'string').map(item => HtmlCleaner.decodeHtmlEntities(item).trim()).filter(Boolean);
      if (!paragraphs.length) throw new Error(`Chương ${index + 1} trong Lily Manifest chưa có nội dung.`);
      const content = paragraphs.join('\n\n');
      return { title, content, paragraphs, wordCount: content.split(/\s+/).filter(Boolean).length };
    });
    return { manifest, chapters };
  }

  public async analyze(raw: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const sourceUrl = UrlNormalizer.normalize(raw);
    const { manifest, chapters: content } = await this.read(sourceUrl, signal);
    const chapters: CandidateChapter[] = content.map((item, index) => {
      const url = `${sourceUrl}#lily-chapter=${index + 1}`;
      this.cache.set(url, { content: item.content, paragraphs: item.paragraphs, wordCount: item.wordCount });
      return { index: index + 1, title: item.title, url };
    });
    const hostname = new URL(sourceUrl).hostname;
    return {
      adapter: this.name, siteName: hostname, hostname, sourceUrl, isWordPress: false, isWordPressCom: false,
      candidateBooks: [{ id: `manifest_${Date.now()}`, title: String(manifest.title).trim(),
        author: typeof manifest.author === 'string' ? manifest.author.trim() : '',
        description: typeof manifest.description === 'string' ? manifest.description.trim() : undefined,
        coverUrl: typeof manifest.cover === 'string' && /^https:\/\//i.test(manifest.cover) ? manifest.cover : undefined,
        sourceUrl, hostname, adapterName: this.name, totalChapters: chapters.length, chapters, confidence: 'HIGH',
        confidenceReason: 'Nội dung được chủ website cung cấp theo chuẩn Lily Manifest.' }],
      diagnostics: { totalPostsDiscovered: chapters.length, totalPagesDiscovered: 1, categoriesDiscovered: 0,
        restRoutes: ['Lily Manifest 1.0'], warnings: [], errors: [] },
    };
  }

  public async fetchChapterContent(chapter: CandidateChapter, signal?: AbortSignal) {
    const cached = this.cache.get(chapter.url);
    if (cached) return cached;
    const sourceUrl = chapter.url.split('#')[0];
    const { chapters } = await this.read(sourceUrl, signal);
    const item = chapters[chapter.index - 1];
    if (!item) throw new Error('Không tìm thấy chương trong Lily Manifest.');
    return { content: item.content, paragraphs: item.paragraphs, wordCount: item.wordCount };
  }
}
