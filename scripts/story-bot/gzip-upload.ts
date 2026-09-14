import { gzipSync } from 'node:zlib';
import type { BotLilyLibraryBackupV1 } from './types';

/** Byte-compatible with the browser's CompressionStream('gzip') (both plain DEFLATE/gzip). */
export function gzipEnvelope(envelope: BotLilyLibraryBackupV1): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(envelope), 'utf8'));
}

/** Same PUT /v1/admin/books/:id contract as OwnerLibraryClient.upload() (src/book-engine/owner-library/OwnerLibraryClient.ts). */
export async function uploadBook(
  baseUrl: string,
  ownerKey: string,
  cloudBookId: string,
  gz: Buffer,
  title: string,
  author: string,
  coverUrl?: string,
  coverColor?: string,
): Promise<void> {
  if (!ownerKey) throw new Error('Thiếu biến môi trường OWNER_KEY.');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${ownerKey}`,
    'Content-Type': 'application/gzip',
    'X-Book-Title': encodeURIComponent(title),
    'X-Book-Author': encodeURIComponent(author),
    'X-Book-Format': 'lilybackup',
  };
  if (coverUrl && !coverUrl.startsWith('data:')) headers['X-Book-Cover-Url'] = encodeURIComponent(coverUrl);
  if (coverColor) headers['X-Book-Cover-Color'] = coverColor;

  const response = await fetch(`${baseUrl}/v1/admin/books/${encodeURIComponent(cloudBookId)}`, {
    method: 'PUT',
    headers,
    body: gz,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || `UPLOAD_FAILED_${response.status}`);
  }
}
