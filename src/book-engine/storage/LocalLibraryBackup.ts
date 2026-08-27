import type { Annotation, Bookmark, NormalizedBook, NormalizedChapter, ReadingProgress } from '../types';
import type { Shelf } from '../../types';
import { getMaxLocalBooks } from '../../config/features';
import { IndexedDBStore } from './IndexedDBStore';

export const LILY_BACKUP_FORMAT = 'lily-library-backup';
export const LILY_BACKUP_VERSION = 1;
export const MAX_BACKUP_FILE_BYTES = 250 * 1024 * 1024;
const SHELVES_STORAGE_KEY = 'LILY_LOCAL_SHELVES_V1';

export interface LilyLibraryBackupV1 {
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

export interface BackupPreview {
  createdAt: string;
  bookCount: number;
  chapterCount: number;
  bookmarkCount: number;
  annotationCount: number;
  noteCount: number;
}

export interface RestoreResult {
  restoredBooks: number;
  skippedDuplicates: number;
  skippedForLimit: number;
}

const requestResult = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Không thể đọc dữ liệu thư viện.'));
});

const transactionDone = (tx: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error || new Error('Giao dịch thư viện thất bại.'));
  tx.onabort = () => reject(tx.error || new Error('Giao dịch thư viện đã bị hủy.'));
});

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const hasUniqueIds = (items: Array<{ id: string }>): boolean => new Set(items.map(item => item.id)).size === items.length;

function sanitizeCoverUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 5_000_000) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(value)) return value;
  return undefined;
}

function validateBackup(value: unknown): LilyLibraryBackupV1 {
  if (!isRecord(value) || value.format !== LILY_BACKUP_FORMAT || value.version !== LILY_BACKUP_VERSION) {
    throw new Error('INVALID_BACKUP');
  }
  const arrayKeys = ['books', 'chapters', 'progress', 'bookmarks', 'annotations', 'shelves'] as const;
  if (!arrayKeys.every(key => Array.isArray(value[key]))) throw new Error('INVALID_BACKUP');

  const books = value.books as unknown as NormalizedBook[];
  const chapters = value.chapters as unknown as NormalizedChapter[];
  const progress = value.progress as unknown as ReadingProgress[];
  const bookmarks = value.bookmarks as unknown as Bookmark[];
  const annotations = value.annotations as unknown as Annotation[];
  const shelves = value.shelves as unknown as Shelf[];

  if (books.length > 100 || chapters.length > 20_000 || bookmarks.length > 100_000 || annotations.length > 100_000) {
    throw new Error('BACKUP_TOO_LARGE');
  }
  if (!isNonEmptyString(value.createdAt) || Number.isNaN(Date.parse(value.createdAt))) throw new Error('INVALID_BACKUP');
  if (!books.every(book => isRecord(book) && isNonEmptyString(book.id) && isNonEmptyString(book.title) && isNonEmptyString(book.author)
      && Number.isInteger(book.totalChapters) && book.totalChapters > 0 && book.totalChapters <= 20_000)) throw new Error('INVALID_BACKUP');
  if (!chapters.every(chapter => isRecord(chapter) && isNonEmptyString(chapter.id) && isNonEmptyString(chapter.bookId)
      && Number.isInteger(chapter.index) && chapter.index > 0 && Array.isArray(chapter.paragraphs)
      && chapter.paragraphs.every(paragraph => typeof paragraph === 'string'))) throw new Error('INVALID_BACKUP');
  if (!progress.every(item => isRecord(item) && isNonEmptyString(item.bookId) && Number.isInteger(item.chapterIndex))) throw new Error('INVALID_BACKUP');
  if (!bookmarks.every(item => isRecord(item) && isNonEmptyString(item.id) && isNonEmptyString(item.bookId))) throw new Error('INVALID_BACKUP');
  if (!annotations.every(item => isRecord(item) && isNonEmptyString(item.id) && isNonEmptyString(item.bookId))) throw new Error('INVALID_BACKUP');
  if (!shelves.every(item => isRecord(item) && isNonEmptyString(item.id) && isNonEmptyString(item.name))) throw new Error('INVALID_BACKUP');
  if (!hasUniqueIds(books) || !hasUniqueIds(chapters) || !hasUniqueIds(bookmarks) || !hasUniqueIds(annotations)) throw new Error('INVALID_BACKUP');

  const bookIds = new Set(books.map(book => book.id));
  if ([...chapters, ...progress, ...bookmarks, ...annotations].some(item => !bookIds.has(item.bookId))) throw new Error('INVALID_BACKUP');
  for (const book of books) {
    const owned = chapters.filter(chapter => chapter.bookId === book.id);
    const indices = new Set(owned.map(chapter => chapter.index));
    if (owned.length !== book.totalChapters || indices.size !== owned.length || !indices.has(1)) throw new Error('INVALID_BACKUP');
    book.coverUrl = sanitizeCoverUrl(book.coverUrl);
  }

  return value as unknown as LilyLibraryBackupV1;
}

function readShelves(): Shelf[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SHELVES_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function fingerprint(book: NormalizedBook, chapters: NormalizedChapter[]): string {
  const owned = chapters.filter(chapter => chapter.bookId === book.id).sort((a, b) => a.index - b.index);
  const first = owned[0];
  const last = owned[owned.length - 1];
  return [book.title.trim().toLowerCase(), book.author.trim().toLowerCase(), book.totalChapters,
    first?.title, first?.paragraphs?.[0]?.slice(0, 120), last?.title].join('|');
}

function newId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${random}`;
}

export class LocalLibraryBackup {
  public static async create(): Promise<LilyLibraryBackupV1> {
    const db = await IndexedDBStore.getDB();
    const names = ['books', 'chapters', 'progress', 'bookmarks', 'annotations'];
    const tx = db.transaction(names, 'readonly');
    const [books, chapters, progress, bookmarks, annotations] = await Promise.all([
      requestResult(tx.objectStore('books').getAll()),
      requestResult(tx.objectStore('chapters').getAll()),
      requestResult(tx.objectStore('progress').getAll()),
      requestResult(tx.objectStore('bookmarks').getAll()),
      requestResult(tx.objectStore('annotations').getAll()),
    ]);
    await transactionDone(tx);
    return {
      format: LILY_BACKUP_FORMAT,
      version: LILY_BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      books: books as NormalizedBook[],
      chapters: chapters as NormalizedChapter[],
      progress: progress as ReadingProgress[],
      bookmarks: bookmarks as Bookmark[],
      annotations: annotations as Annotation[],
      shelves: readShelves(),
    };
  }

  public static serialize(backup: LilyLibraryBackupV1): Blob {
    return new Blob([JSON.stringify(backup)], { type: 'application/json' });
  }

  public static async parseFile(file: File): Promise<LilyLibraryBackupV1> {
    if (!file || file.size <= 0 || file.size > MAX_BACKUP_FILE_BYTES) throw new Error('BACKUP_TOO_LARGE');
    try {
      return validateBackup(JSON.parse(await file.text()));
    } catch (error) {
      if (error instanceof Error && error.message === 'BACKUP_TOO_LARGE') throw error;
      throw new Error('INVALID_BACKUP');
    }
  }

  public static parse(value: unknown): LilyLibraryBackupV1 {
    return validateBackup(value);
  }

  public static preview(backup: LilyLibraryBackupV1): BackupPreview {
    return {
      createdAt: backup.createdAt,
      bookCount: backup.books.length,
      chapterCount: backup.chapters.length,
      bookmarkCount: backup.bookmarks.length,
      annotationCount: backup.annotations.length,
      noteCount: backup.annotations.filter(item => typeof item.note === 'string' && item.note.trim()).length,
    };
  }

  public static async restore(backupInput: LilyLibraryBackupV1): Promise<RestoreResult> {
    const backup = validateBackup(backupInput);
    const db = await IndexedDBStore.getDB();
    const existingTx = db.transaction(['books', 'chapters'], 'readonly');
    const [existingBooks, existingChapters] = await Promise.all([
      requestResult(existingTx.objectStore('books').getAll()) as Promise<NormalizedBook[]>,
      requestResult(existingTx.objectStore('chapters').getAll()) as Promise<NormalizedChapter[]>,
    ]);
    await transactionDone(existingTx);

    const existingFingerprints = new Set(existingBooks.map(book => fingerprint(book, existingChapters)));
    const uniqueBooks = backup.books.filter(book => !existingFingerprints.has(fingerprint(book, backup.chapters)));
    const remainingSlots = Math.max(0, getMaxLocalBooks() - existingBooks.length);
    const selectedBooks = uniqueBooks.slice(0, remainingSlots);
    const selectedIds = new Set(selectedBooks.map(book => book.id));
    const idMap = new Map(selectedBooks.map(book => [book.id, newId('restored-book')]));

    if (selectedBooks.length > 0) {
      const tx = db.transaction(['books', 'chapters', 'progress', 'bookmarks', 'annotations'], 'readwrite');
      for (const book of selectedBooks) {
        const mappedId = idMap.get(book.id)!;
        tx.objectStore('books').add({ ...book, id: mappedId, coverUrl: sanitizeCoverUrl(book.coverUrl), updatedAt: new Date().toISOString() });
      }
      for (const chapter of backup.chapters.filter(item => selectedIds.has(item.bookId))) {
        const mappedId = idMap.get(chapter.bookId)!;
        tx.objectStore('chapters').add({ ...chapter, id: `${mappedId}_chap_${chapter.index}`, bookId: mappedId });
      }
      for (const item of backup.progress.filter(item => selectedIds.has(item.bookId))) {
        tx.objectStore('progress').put({ ...item, bookId: idMap.get(item.bookId)! });
      }
      for (const item of backup.bookmarks.filter(item => selectedIds.has(item.bookId))) {
        tx.objectStore('bookmarks').add({ ...item, id: newId('bm'), bookId: idMap.get(item.bookId)! });
      }
      for (const item of backup.annotations.filter(item => selectedIds.has(item.bookId))) {
        tx.objectStore('annotations').add({ ...item, id: newId('ann'), bookId: idMap.get(item.bookId)! });
      }
      await transactionDone(tx);
    }

    if (selectedBooks.length > 0 && backup.shelves.length > 0) {
      const existingShelves = readShelves();
      const restoredShelves = backup.shelves.map(shelf => ({
        ...shelf,
        id: newId('shelf'),
        bookIds: (shelf.bookIds || []).filter(id => idMap.has(id)).map(id => idMap.get(id)!),
        bookCount: (shelf.bookIds || []).filter(id => idMap.has(id)).length,
      })).filter(shelf => shelf.bookIds.length > 0);
      localStorage.setItem(SHELVES_STORAGE_KEY, JSON.stringify([...existingShelves, ...restoredShelves]));
    }

    return {
      restoredBooks: selectedBooks.length,
      skippedDuplicates: backup.books.length - uniqueBooks.length,
      skippedForLimit: Math.max(0, uniqueBooks.length - selectedBooks.length),
    };
  }
}
