import { NormalizedChapter, ParsedBookDraft } from '../types';
import type { UserTier } from '../../types';

const BUILD_ENV = import.meta.env || {};
const API_BASE = (BUILD_ENV.VITE_LILYHUB_API_URL || (BUILD_ENV.DEV ? '/__lilyhub_api' : 'https://api.lilyhub.top')).replace(/\/$/, '');
const AUTH_BASE = (BUILD_ENV.VITE_LILYHUB_AUTH_URL || (BUILD_ENV.DEV ? '/__lilyhub_auth' : 'https://api.lilyhub.top')).replace(/\/$/, '');
const WEB_BASE = (BUILD_ENV.VITE_LILYHUB_WEB_URL || (BUILD_ENV.DEV ? 'http://localhost:4175' : 'https://www.lilyhub.top')).replace(/\/$/, '');
const SUPABASE_ANON_KEY = BUILD_ENV.VITE_LILYHUB_SUPABASE_ANON_KEY
  || 'sb_publishable_fBI0JdeuAHrlZGg_2wA_oA_-oHzhiKk';

export interface LilyHubNovel {
  id: string;
  slug?: string;
  title: string;
  author?: string;
  description?: string;
  cover_image?: string;
  cover_url?: string;
  genre?: string;
  category?: string;
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
  private static sessionJustCreatedUntil = 0;

  static async signIn(email: string, password: string): Promise<void> {
    const response = await withTimeout(`${AUTH_BASE}/api/auth/sign-in/email`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    }, 12_000);
    if (response.ok) {
      // The auth cookie can take a moment to become visible to the next request,
      // especially through the local development proxy.
      this.sessionJustCreatedUntil = Date.now() + 5_000;
      return;
    }
    const payload = await response.json().catch(() => null);
    if (response.status === 401 || payload?.code === 'INVALID_EMAIL_OR_PASSWORD') throw new Error('Email hoặc mật khẩu chưa đúng.');
    if (payload?.code === 'INVALID_ORIGIN') throw new Error('Miền Lily Reader chưa được cấp quyền đăng nhập.');
    throw new Error(payload?.message || 'Chưa thể đăng nhập. Vui lòng thử lại.');
  }

  static async signOut(): Promise<void> {
    const response = await withTimeout(`${AUTH_BASE}/api/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }, 8_000);
    if (!response.ok) throw new Error('Chưa thể đăng xuất. Vui lòng thử lại.');
  }

  static async getSession(): Promise<{
    id: string;
    name: string;
    email?: string;
    image?: string;
    tier?: UserTier;
    subscriptionEndsAt?: string | null;
    subscriptionAutoRenew?: boolean;
  } | null> {
    if (!navigator.onLine) return null;
    const delays = Date.now() < this.sessionJustCreatedUntil ? [0, 250, 750, 1_500] : [0];
    for (const delay of delays) {
      if (delay) await new Promise(resolve => window.setTimeout(resolve, delay));
      const accountResponse = await withTimeout(`${AUTH_BASE}/api/reader/account`, { credentials: 'include' }, 6_000).catch(() => null);
      if (accountResponse?.ok) {
        const payload = await accountResponse.json().catch(() => null);
        if (payload?.user) return payload.user;
      }

      // Safari/iOS can expose a newly written cookie to the next request a little later.
      // The auth session endpoint lets login finish even if entitlement lookup is delayed.
      if (Date.now() < this.sessionJustCreatedUntil || accountResponse?.status === 404) {
        const authResponse = await withTimeout(`${AUTH_BASE}/api/auth/get-session`, { credentials: 'include' }, 6_000).catch(() => null);
        if (authResponse?.ok) {
          const payload = await authResponse.json().catch(() => null);
          const user = payload?.user || payload?.session?.user;
          if (user) return user;
        }
      }
    }
    return null;
  }

  static loginUrl(returnTo: string): string {
    return `${WEB_BASE}/dang-nhap?returnTo=${encodeURIComponent(returnTo)}`;
  }

  static registerUrl(): string {
    return `${WEB_BASE}/dang-ky`;
  }

  static homeUrl(): string {
    return WEB_BASE;
  }

  static async redeemCoupon(code: string): Promise<{ tier: UserTier; durationDays: number; expiresAt: string }> {
    const response = await withTimeout(`${AUTH_BASE}/api/reader/coupons/redeem`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    }, 10_000);
    const payload = await response.json().catch(() => null);
    if (response.ok) return payload;
    if (response.status === 401) throw new Error('Hãy đăng nhập LilyHub trước khi nhập coupon.');
    if (payload?.error === 'COUPON_ALREADY_USED') throw new Error('Coupon này đã được sử dụng.');
    if (payload?.error === 'INVALID_COUPON') throw new Error('Coupon không đúng hoặc không tồn tại.');
    throw new Error('Chưa thể sử dụng coupon. Vui lòng thử lại.');
  }

  static async getCatalog(): Promise<LilyHubNovel[]> {
    const params = new URLSearchParams({
      select: 'id,title,author,description,cover_url,category,chapter_count',
      is_hidden: 'eq.false',
      order: 'updated_date.desc',
      limit: '5000',
    });
    const response = await withTimeout(`${API_BASE}/rest/v1/novels?${params}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!response.ok) throw new Error('Chưa thể tải thư viện Lilyhub.');
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Danh mục Lilyhub không hợp lệ.');
    return rows
      .filter((row): row is LilyHubNovel => Boolean(row?.id && row?.title))
      .map(row => ({
        ...row,
        cover_image: row.cover_image || row.cover_url,
        genre: row.genre || row.category,
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
    return `${API_BASE}/${contentKey.replace(/^\/+/, '')}`;
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
