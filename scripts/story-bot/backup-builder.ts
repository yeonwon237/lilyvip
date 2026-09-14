import type { ParsedBookDraft, NormalizedBook, BookSourceMeta } from '../../src/book-engine/types';
import { LILY_BACKUP_FORMAT, LILY_BACKUP_VERSION } from './types';
import type { BotLilyLibraryBackupV1 } from './types';

/**
 * Builds the same LilyLibraryBackupV1 envelope the browser flow produces via
 * BookRepository → LocalLibraryBackup (see LocalBookSource.saveBook for the
 * field mapping this mirrors) — but directly in memory, with no IndexedDB.
 * progress/bookmarks/annotations/shelves stay empty: this is a fresh import.
 */
export function buildBackupEnvelope(
  draft: ParsedBookDraft,
  sourceMeta: BookSourceMeta,
  bookId: string,
): { book: NormalizedBook; envelope: BotLilyLibraryBackupV1 } {
  const now = new Date().toISOString();
  const firstChapterIndex = draft.chapters[0]?.index ?? 1;

  const book: NormalizedBook = {
    id: bookId,
    version: 1,
    title: draft.title,
    author: draft.author,
    coverUrl: draft.coverUrl,
    coverColor: draft.suggestedCoverColor,
    fileFormat: draft.fileFormat,
    fileSizeMB: draft.fileSizeMB,
    totalChapters: draft.totalChapters,
    firstChapterIndex,
    wordCount: draft.wordCount,
    originalFileName: draft.originalFileName,
    storageType: 'local',
    createdAt: now,
    updatedAt: now,
    lastReadAt: 'Vừa thêm',
    currentChapter: firstChapterIndex,
    currentChapterTitle: draft.chapters[0]?.title || 'Chương 1',
    progressPercent: 0,
    tags: ['Truyện cá nhân', 'Story Bot'],
    shelfIds: [],
    hasDetectedChapters: draft.hasDetectedChapters,
    confidence: draft.confidence,
    description: `Tự động lấy từ ${sourceMeta.hostname} (${draft.totalChapters} chương).`,
    source: sourceMeta,
  };

  const chapters = draft.chapters.map(chapter => ({ ...chapter, bookId }));

  const envelope: BotLilyLibraryBackupV1 = {
    format: LILY_BACKUP_FORMAT,
    version: LILY_BACKUP_VERSION,
    createdAt: now,
    books: [book],
    chapters,
    progress: [],
    bookmarks: [],
    annotations: [],
    shelves: [],
  };

  return { book, envelope };
}
