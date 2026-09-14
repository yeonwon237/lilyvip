import { createHash } from 'node:crypto';

/** Node reimplementation of OwnerLibraryClient.cloudId (src/book-engine/owner-library/OwnerLibraryClient.ts) — same algorithm, same output for the same input. */
export function cloudId(localId: string): string {
  const digest = createHash('sha256').update(localId).digest();
  const suffix = digest.subarray(0, 6).toString('hex');
  const safe = localId.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+/, '').slice(0, 55) || 'book';
  return `${safe}-${suffix}`;
}
