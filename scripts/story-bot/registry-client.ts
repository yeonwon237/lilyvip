import type { RegistryEntry } from './types';

export const BASE_URL = (process.env.LILY_OWNER_LIBRARY_URL || 'https://lily-owner-library-api.nguyenyen15011998.workers.dev').replace(/\/$/, '');
export const OWNER_KEY = process.env.OWNER_KEY || '';

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  if (!OWNER_KEY) throw new Error('Thiếu biến môi trường OWNER_KEY.');
  return { Authorization: `Bearer ${OWNER_KEY}`, ...extra };
}

async function responseError(response: Response): Promise<Error> {
  const payload = await response.json().catch(() => null);
  return new Error(payload?.error || `OWNER_LIBRARY_${response.status}`);
}

export async function listRegistry(): Promise<RegistryEntry[]> {
  const response = await fetch(`${BASE_URL}/v1/admin/registry`, { headers: authHeaders() });
  if (!response.ok) throw await responseError(response);
  const payload = await response.json();
  if (!Array.isArray(payload?.entries)) throw new Error('INVALID_REGISTRY_RESPONSE');
  return payload.entries as RegistryEntry[];
}

export async function putRegistryEntry(id: string, entry: Partial<RegistryEntry>): Promise<RegistryEntry> {
  const response = await fetch(`${BASE_URL}/v1/admin/registry/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ...entry, id }),
  });
  if (!response.ok) throw await responseError(response);
  const payload = await response.json();
  return payload.entry as RegistryEntry;
}

export async function deleteRegistryEntry(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/v1/admin/registry/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!response.ok) throw await responseError(response);
}
