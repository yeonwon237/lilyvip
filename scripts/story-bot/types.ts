import type { NormalizedBook, NormalizedChapter } from '../../src/book-engine/types';
import type { Bookmark, Annotation } from '../../src/book-engine/types';
import type { ReadingProgress } from '../../src/book-engine/types';
import type { Shelf } from '../../src/types';

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

export const LILY_BACKUP_FORMAT = 'lily-library-backup' as const;
export const LILY_BACKUP_VERSION = 1 as const;

/**
 * Structurally identical to LilyLibraryBackupV1 (src/book-engine/storage/LocalLibraryBackup.ts)
 * but redeclared here instead of imported — that file pulls in IndexedDBStore,
 * which throws under Node.
 */
export interface BotLilyLibraryBackupV1 {
  format: typeof LILY_BACKUP_FORMAT;
  version: typeof LILY_BACKUP_VERSION;
  createdAt: string;
  books: NormalizedBook[];
  chapters: NormalizedChapter[];
  progress: ReadingProgress[];
  bookmarks: Bookmark[];
  annotations: Annotation[];
  shelves: Shelf[];
}
