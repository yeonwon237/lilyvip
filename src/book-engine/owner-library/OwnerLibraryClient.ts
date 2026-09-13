const BUILD_ENV = import.meta.env || {};
const PUBLIC_BASE = (BUILD_ENV.VITE_LILY_OWNER_LIBRARY_URL || 'https://lily-owner-library-api.nguyenyen15011998.workers.dev').replace(/\/$/, '');
const BASE = `${PUBLIC_BASE}/v1/admin`;
const SESSION_KEY = 'LILY_OWNER_CLOUD_SESSION_V1';

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 45_000): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) controller.abort();
  init.signal?.addEventListener('abort', abort, { once: true });
  const timer = window.setTimeout(abort, timeoutMs);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally {
    window.clearTimeout(timer);
    init.signal?.removeEventListener('abort', abort);
  }
}

export interface OwnerCloudBook {
  id: string;
  title: string;
  author: string;
  format: string;
  size: number;
  uploaded: string;
  coverUrl?: string;
  coverColor?: string;
}

export interface OwnerCloudPage {
  books: OwnerCloudBook[];
  page: number;
  pageSize: number;
  totalPages: number;
  matchedCount: number;
  totalCount: number;
  totalBytes: number;
  knownBooks: Array<Pick<OwnerCloudBook, 'id' | 'title'>>;
}

export interface OwnerShare {
  id: string;
  bookId: string;
  bookIds: string[];
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  remainingUses: number;
  status: 'active' | 'used' | 'expired';
}

export interface CreatedOwnerShare extends Pick<OwnerShare, 'id' | 'expiresAt' | 'maxUses' | 'usedCount'> { code: string; }

async function responseError(response: Response): Promise<Error> {
  const payload = await response.json().catch(() => null);
  return new Error(payload?.error || `OWNER_LIBRARY_${response.status}`);
}

export class OwnerLibraryClient {
  static hasSession(): boolean { return Boolean(sessionStorage.getItem(SESSION_KEY)); }

  static async login(key: string): Promise<void> {
    const response = await fetchWithTimeout(`${BASE}/session`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }),
    });
    if (!response.ok) throw await responseError(response);
    const payload = await response.json();
    if (typeof payload?.token !== 'string') throw new Error('INVALID_ADMIN_SESSION');
    sessionStorage.setItem(SESSION_KEY, payload.token);
  }

  static logout(): void { sessionStorage.removeItem(SESSION_KEY); }

  private static authHeaders(extra: HeadersInit = {}): Headers {
    const headers = new Headers(extra);
    const token = sessionStorage.getItem(SESSION_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  static async cloudId(localId: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(localId));
    const suffix = [...new Uint8Array(digest).slice(0, 6)].map(value => value.toString(16).padStart(2, '0')).join('');
    const safe = localId.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+/, '').slice(0, 55) || 'book';
    return `${safe}-${suffix}`;
  }

  static async list(page = 1, query = ''): Promise<OwnerCloudPage> {
    const params = new URLSearchParams({ page: String(page) });
    if (query.trim()) params.set('q', query.trim());
    const response = await fetchWithTimeout(`${BASE}/books?${params}`, { headers: this.authHeaders() });
    if (!response.ok) throw await responseError(response);
    const payload = await response.json();
    if (!Array.isArray(payload?.books) || !Number.isFinite(payload?.totalCount)) throw new Error('INVALID_OWNER_LIBRARY_CATALOG');
    return payload as OwnerCloudPage;
  }

  static async upload(id: string, blob: Blob, title: string, author: string, coverUrl?: string, coverColor?: string): Promise<void> {
    const response = await fetchWithTimeout(`${BASE}/books/${encodeURIComponent(id)}`, {
      method: 'PUT', body: blob,
      headers: this.authHeaders({
        'Content-Type': blob.type || 'application/gzip',
        'X-Book-Title': encodeURIComponent(title),
        'X-Book-Author': encodeURIComponent(author),
        'X-Book-Format': 'lilybackup',
        ...(coverUrl && !coverUrl.startsWith('data:') ? { 'X-Book-Cover-Url': encodeURIComponent(coverUrl) } : {}),
        ...(coverColor ? { 'X-Book-Cover-Color': coverColor } : {}),
      }),
    });
    if (!response.ok) throw await responseError(response);
  }

  static async download(id: string, title: string): Promise<File> {
    const response = await fetchWithTimeout(`${BASE}/books/${encodeURIComponent(id)}`, { headers: this.authHeaders() });
    if (!response.ok) throw await responseError(response);
    return new File([await response.blob()], `${title || id}.lilybackup`, { type: response.headers.get('content-type') || 'application/gzip' });
  }

  static async remove(id: string): Promise<void> {
    const response = await fetchWithTimeout(`${BASE}/books/${encodeURIComponent(id)}`, { method: 'DELETE', headers: this.authHeaders() });
    if (!response.ok) throw await responseError(response);
  }

  static async createShare(id: string, options: { maxUses: number; expiresInHours: number }): Promise<CreatedOwnerShare> {
    const response = await fetchWithTimeout(`${BASE}/books/${encodeURIComponent(id)}/shares`, {
      method: 'POST', headers: this.authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(options),
    });
    if (!response.ok) throw await responseError(response);
    const payload = await response.json();
    if (!payload?.code) throw new Error('INVALID_SHARE_CODE');
    return payload as CreatedOwnerShare;
  }

  static async createBundleShare(blob: Blob, bookIds: string[], options: { maxUses: number; expiresInHours: number }): Promise<CreatedOwnerShare> {
    const response = await fetchWithTimeout(`${BASE}/shares/bundle`, {
      method: 'POST', body: blob,
      headers: this.authHeaders({
        'Content-Type': blob.type || 'application/gzip',
        'X-Share-Book-Ids': bookIds.join(','),
        'X-Share-Max-Uses': String(options.maxUses),
        'X-Share-Expires-Hours': String(options.expiresInHours),
      }),
    }, 120_000);
    if (!response.ok) throw await responseError(response);
    const payload = await response.json();
    if (!payload?.code) throw new Error('INVALID_SHARE_CODE');
    return payload as CreatedOwnerShare;
  }

  static async listShares(): Promise<OwnerShare[]> {
    const response = await fetchWithTimeout(`${BASE}/shares`, { headers: this.authHeaders() });
    if (!response.ok) throw await responseError(response);
    const payload = await response.json();
    if (!Array.isArray(payload?.shares)) throw new Error('INVALID_SHARE_LIST');
    return payload.shares as OwnerShare[];
  }

  static async revokeShare(id: string): Promise<void> {
    const response = await fetchWithTimeout(`${BASE}/shares/${encodeURIComponent(id)}`, { method: 'DELETE', headers: this.authHeaders() });
    if (!response.ok) throw await responseError(response);
  }

  static async downloadShared(code: string): Promise<File> {
    const normalized = code.trim();
    if (!/^[a-zA-Z0-9_-]{12,128}$/.test(normalized)) throw new Error('INVALID_SHARE_CODE');
    const response = await fetchWithTimeout(`${PUBLIC_BASE}/v1/share/${encodeURIComponent(normalized)}`);
    if (!response.ok) throw await responseError(response);
    const disposition = response.headers.get('content-disposition') || '';
    const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const filename = encodedName ? decodeURIComponent(encodedName) : 'truyen-lily.lilybackup';
    return new File([await response.blob()], filename, { type: response.headers.get('content-type') || 'application/gzip' });
  }
}
