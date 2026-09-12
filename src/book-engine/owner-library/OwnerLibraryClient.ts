const BUILD_ENV = import.meta.env || {};
const AUTH_BASE = (BUILD_ENV.VITE_LILYHUB_AUTH_URL || (BUILD_ENV.DEV ? '/__lilyhub_auth' : 'https://api.lilyhub.top')).replace(/\/$/, '');
const BASE = `${AUTH_BASE}/api/owner-library`;
const PUBLIC_BASE = (BUILD_ENV.VITE_LILY_OWNER_LIBRARY_URL || 'https://lily-owner-library-api.nguyenyen15011998.workers.dev').replace(/\/$/, '');

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
}

async function responseError(response: Response): Promise<Error> {
  const payload = await response.json().catch(() => null);
  return new Error(payload?.error || `OWNER_LIBRARY_${response.status}`);
}

export class OwnerLibraryClient {
  static async cloudId(localId: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(localId));
    const suffix = [...new Uint8Array(digest).slice(0, 6)].map(value => value.toString(16).padStart(2, '0')).join('');
    const safe = localId.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+/, '').slice(0, 55) || 'book';
    return `${safe}-${suffix}`;
  }

  static async list(): Promise<OwnerCloudBook[]> {
    const response = await fetchWithTimeout(`${BASE}/books`, { credentials: 'include' });
    if (!response.ok) throw await responseError(response);
    const payload = await response.json();
    return Array.isArray(payload?.books) ? payload.books.map((book: OwnerCloudBook) => ({
      ...book,
      title: decodeURIComponent(book.title || ''),
      author: decodeURIComponent(book.author || ''),
    })) : [];
  }

  static async upload(id: string, blob: Blob, title: string, author: string): Promise<void> {
    const response = await fetchWithTimeout(`${BASE}/books/${encodeURIComponent(id)}`, {
      method: 'PUT', credentials: 'include', body: blob,
      headers: {
        'Content-Type': blob.type || 'application/gzip',
        'X-Book-Title': encodeURIComponent(title),
        'X-Book-Author': encodeURIComponent(author),
        'X-Book-Format': 'lilybackup',
      },
    });
    if (!response.ok) throw await responseError(response);
  }

  static async download(id: string, title: string): Promise<File> {
    const response = await fetchWithTimeout(`${BASE}/books/${encodeURIComponent(id)}`, { credentials: 'include' });
    if (!response.ok) throw await responseError(response);
    return new File([await response.blob()], `${title || id}.lilybackup`, { type: response.headers.get('content-type') || 'application/gzip' });
  }

  static async remove(id: string): Promise<void> {
    const response = await fetchWithTimeout(`${BASE}/books/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
    if (!response.ok) throw await responseError(response);
  }

  static async createShare(id: string): Promise<string> {
    const response = await fetchWithTimeout(`${BASE}/books/${encodeURIComponent(id)}/shares`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    if (!response.ok) throw await responseError(response);
    const payload = await response.json();
    if (!payload?.code) throw new Error('INVALID_SHARE_CODE');
    return payload.code;
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
