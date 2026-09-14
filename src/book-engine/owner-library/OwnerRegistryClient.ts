const BUILD_ENV = import.meta.env || {};
const PUBLIC_BASE = (BUILD_ENV.VITE_LILY_OWNER_LIBRARY_URL || 'https://lily-owner-library-api.nguyenyen15011998.workers.dev').replace(/\/$/, '');
const BASE = `${PUBLIC_BASE}/v1/admin`;
const SESSION_KEY = 'LILY_OWNER_CLOUD_SESSION_V1';

export type RegistryStatus = 'pending' | 'watching' | 'fetched';
export type RegistryCompletion = 'completed' | 'ongoing' | 'unknown';
export type RegistryPlatform = 'wattpad' | 'wordpress' | 'blogspot';

export interface RegistryEntry {
  id: string;
  title: string;
  author: string;
  sourceUrl: string;
  platform: RegistryPlatform;
  status: RegistryStatus;
  completion: RegistryCompletion;
  chapterCount: number;
  bookId?: string;
  addedAt: string;
  lastCheckedAt: string;
  discoveredVia?: 'manual' | 'wattpad-search';
  searchKeyword?: string;
}

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

async function responseError(response: Response): Promise<Error> {
  const payload = await response.json().catch(() => null);
  return new Error(payload?.error || `OWNER_REGISTRY_${response.status}`);
}

/** Same admin session as OwnerLibraryClient — one Cloud Admin login covers both. */
export class OwnerRegistryClient {
  private static authHeaders(extra: HeadersInit = {}): Headers {
    const headers = new Headers(extra);
    const token = sessionStorage.getItem(SESSION_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  static async list(): Promise<RegistryEntry[]> {
    const response = await fetchWithTimeout(`${BASE}/registry`, { headers: this.authHeaders() });
    if (!response.ok) throw await responseError(response);
    const payload = await response.json();
    if (!Array.isArray(payload?.entries)) throw new Error('INVALID_REGISTRY_RESPONSE');
    return payload.entries as RegistryEntry[];
  }

  static async put(id: string, entry: Partial<RegistryEntry>): Promise<RegistryEntry> {
    const response = await fetchWithTimeout(`${BASE}/registry/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...entry, id }),
    });
    if (!response.ok) throw await responseError(response);
    const payload = await response.json();
    return payload.entry as RegistryEntry;
  }

  static async remove(id: string): Promise<void> {
    const response = await fetchWithTimeout(`${BASE}/registry/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    if (!response.ok) throw await responseError(response);
  }
}
