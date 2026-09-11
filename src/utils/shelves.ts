import type { Shelf } from '../types';

const shelfNameKey = (name: string): string => name.trim().toLocaleLowerCase('vi-VN');

/** Merge duplicate shelf names while preserving the first shelf's identity and style. */
export function mergeDuplicateShelves(shelves: Shelf[]): Shelf[] {
  const merged: Shelf[] = [];
  const indexByName = new Map<string, number>();

  for (const shelf of shelves) {
    const key = shelfNameKey(shelf.name || '');
    const existingIndex = indexByName.get(key);
    if (!key || existingIndex === undefined) {
      indexByName.set(key, merged.length);
      const bookIds = [...new Set(shelf.bookIds || [])];
      merged.push({ ...shelf, bookIds, bookCount: bookIds.length });
      continue;
    }

    const existing = merged[existingIndex];
    const bookIds = [...new Set([...(existing.bookIds || []), ...(shelf.bookIds || [])])];
    merged[existingIndex] = { ...existing, bookIds, bookCount: bookIds.length };
  }

  return merged;
}
