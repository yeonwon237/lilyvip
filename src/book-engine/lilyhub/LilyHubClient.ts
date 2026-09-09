import { NormalizedChapter, ParsedBookDraft } from '../types';

const API_BASE = (import.meta.env.VITE_LILYHUB_API_URL || (import.meta.env.DEV ? '/__lilyhub_api' : 'https://api.lilyhub.top')).replace(/\/$/, '');
const MEDIA_BASE = (import.meta.env.VITE_LILYHUB_MEDIA_URL || (import.meta.env.DEV ? '/__lilyhub_media' : 'https://media.lilyhub.top')).replace(/\/$/, '');
const AUTH_BASE = (import.meta.env.VITE_LILYHUB_AUTH_URL || 'https://api.lilyhub.top').replace(/\/$/, '');
const WEB_BASE = (import.meta.env.VITE_LILYHUB_WEB_URL || (import.meta.env.DEV ? 'http://localhost:4175' : 'https://lilyhub.top')).replace(/\/$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_LILYHUB_SUPABASE_ANON_KEY
  || 'sb_publishable_fBI0JdeuAHrlZGg_2wA_oA_-oHzhiKk';

export interface LilyHubNovel {
  id: string;
  slug?: string;
  title: string;
  author?: string;
  description?: string;
  cover_image?: string;
  genre?: string;
  chapter_count?: number;
}

export interface LilyHubChapterMeta {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  content_key: string;
  word_count?: number;
  updated_date?: string;
}

const withTimeout = async (url: string, init: RequestInit = {}, timeoutMs = 12_000) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: init.signal || controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
};

export class LilyHubClient {
  static async getSession(): Promise<{ id: string; name: string; email?: string; image?: string } | null> {
    if (!navigator.onLine) return null;
    const response = await withTimeout(`${AUTH_BASE}/api/auth/get-session`, { credentials: 'include' }, 6_000).catch(() => null);
    if (!response?.ok) return null;
    const payload = await response.json().catch(() => null);
    return payload?.user || payload?.session?.user || null;
  }

  static loginUrl(returnTo: string): string {
    return `${WEB_BASE}/dang-nhap?returnTo=${encodeURIComponent(returnTo)}`;
  }

  static homeUrl(): string {
    return WEB_BASE;
  }

  static async getCatalog(): Promise<LilyHubNovel[]> {
    const pointerResponse = await withTimeout(`${MEDIA_BASE}/snapshots/novels-pointer.json?v=2`);
    if (!pointerResponse.ok) throw new Error('Chưa thể tải thư viện Lilyhub.');
    const pointer = await pointerResponse.json();
    if (!pointer?.key || typeof pointer.key !== 'string') throw new Error('Danh mục Lilyhub không hợp lệ.');
    const catalogResponse = await withTimeout(`${MEDIA_BASE}/${pointer.key.replace(/^\/+/, '')}`);
    if (!catalogResponse.ok) throw new Error('Chưa thể tải thư viện Lilyhub.');
    const rows = await catalogResponse.json();
    if (!Array.isArray(rows)) throw new Error('Danh mục Lilyhub không hợp lệ.');
    return rows
      .filter((row): row is LilyHubNovel => Boolean(row?.id && row?.title))
      .map(row => ({
        ...row,
        description: typeof row.description === 'string'
          ? row.description.replace(/\s*<!--META:[\s\S]*?-->\s*$/i, '').trim()
          : row.description,
      }));
  }

  static async getChapters(novel: LilyHubNovel): Promise<LilyHubChapterMeta[]> {
    const variants = [novel.id, novel.slug, novel.title].filter(Boolean) as string[];
    const params = new URLSearchParams({
      select: 'id,novel_id,chapter_number,title,content_key,word_count,updated_date',
      novel_id: `in.(${variants.map(value => `"${String(value).replace(/"/g, '')}"`).join(',')})`,
      order: 'chapter_number.asc',
    });
    const rows: LilyHubChapterMeta[] = [];
    for (let from = 0; from < 5000; from += 1000) {
      const response = await withTimeout(`${API_BASE}/rest/v1/chapters?${params}`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Range: `${from}-${from + 999}`,
        },
      });
      if (!response.ok) throw new Error('Chưa thể tải danh sách chương Lilyhub.');
      const page = await response.json();
      if (!Array.isArray(page)) throw new Error('Danh sách chương Lilyhub không hợp lệ.');
      rows.push(...page);
      if (page.length < 1000) break;
    }
    return rows
      .filter(row => row?.id && row?.content_key && Number.isFinite(Number(row.chapter_number)))
      .sort((a, b) => Number(a.chapter_number) - Number(b.chapter_number));
  }

  static chapterUrl(contentKey: string): string {
    return `${MEDIA_BASE}/${contentKey.replace(/^\/+/, '')}`;
  }

  static publicChapterUrl(contentKey: string): string {
    return `https://media.lilyhub.top/${contentKey.replace(/^\/+/, '')}`;
  }

  static async fetchChapter(meta: LilyHubChapterMeta, bookId = '', index = Number(meta.chapter_number)): Promise<NormalizedChapter> {
    const requestUrl = this.chapterUrl(meta.content_key);
    const sourceUrl = this.publicChapterUrl(meta.content_key);
    const response = await withTimeout(requestUrl, {}, 20_000);
    if (!response.ok) throw new Error(`Không tải được Chương ${meta.chapter_number}.`);
    const content = (await response.text()).replace(/\r\n?/g, '\n').trim();
    const paragraphs = content.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean);
    return {
      id: `lilyhub_${meta.id}`,
      bookId,
      index,
      title: meta.title || `Chương ${meta.chapter_number}`,
      paragraphs,
      wordCount: Number(meta.word_count) || content.split(/\s+/).filter(Boolean).length,
      sourceUrl,
    };
  }

  static buildDraft(novel: LilyHubNovel, chapters: NormalizedChapter[]): ParsedBookDraft {
    const wordCount = chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
    return {
      title: novel.title,
      author: novel.author || 'Tác giả',
      originalFileName: 'lilyhub.top',
      fileFormat: 'WEBSITE',
      fileSizeMB: Number(Math.max(0.1, wordCount * 6 / 1024 / 1024).toFixed(2)),
      totalChapters: chapters.length,
      wordCount,
      chapters,
      hasDetectedChapters: true,
      confidence: 'HIGH',
      detectionStrategy: 'Lilyhub public library',
      diagnostics: {
        format: 'WEBSITE', fileSize: wordCount * 6, decodedEncoding: 'UTF-8',
        rawCharacters: wordCount * 6, cleanedCharacters: wordCount * 5,
        detectedHeadingCount: chapters.length, chapterCount: chapters.length,
        detectionStrategy: 'Lilyhub', confidence: 'HIGH', warnings: [], errors: [],
      },
      suggestedCoverColor: '#D9829B',
      coverUrl: novel.cover_image,
    };
  }
}
