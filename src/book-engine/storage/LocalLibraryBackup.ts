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
  shelvesRestored: boolean;
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
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');
  const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
  const optionalText = (v: unknown) => v === undefined || typeof v === 'string';
  const integer = (v: unknown) => finite(v) && Number.isInteger(v);
  const optionalInteger = (v: unknown) => v === undefined || integer(v);
  if (!books.every(book => date(book.createdAt) && date(book.updatedAt)
      && typeof book.lastReadAt === 'string' && typeof book.currentChapterTitle === 'string'
      && typeof book.originalFileName === 'string' && typeof book.coverColor === 'string'
      && strings(book.tags) && strings(book.shelfIds) && optionalText(book.description)
      && ['TXT', 'EPUB', 'DOCX', 'WEBSITE'].includes(book.fileFormat) && book.storageType === 'local'
      && integer(book.currentChapter) && book.currentChapter >= 1 && book.currentChapter <= book.totalChapters
      && finite(book.wordCount) && finite(book.fileSizeMB) && finite(book.progressPercent) && book.progressPercent <= 100
      && (book.source === undefined || (isRecord(book.source) && ['website', 'remote-file'].includes(book.source.type)
        && ['adapter', 'url', 'hostname', 'importedAt'].every(key => typeof (book.source as unknown as Record<string, unknown>)[key] === 'string'))))) throw new Error('INVALID_BACKUP');
  if (!chapters.every(ch => typeof ch.title === 'string' && finite(ch.wordCount)
      && optionalText(ch.volumeTitle) && optionalText(ch.specialType) && optionalText(ch.sourceUrl))) throw new Error('INVALID_BACKUP');
  const bookMap = new Map(books.map(book => [book.id, book]));
  const locator = (item: Bookmark | Annotation) => isRecord(item) && isNonEmptyString(item.id)
    && isNonEmptyString(item.bookId) && integer(item.chapterIndex) && item.chapterIndex >= 1
    && item.chapterIndex <= (bookMap.get(item.bookId)?.totalChapters || 0)
    && typeof item.selectedText === 'string' && optionalText(item.chapterTitle)
    && date(item.createdAt) && date(item.updatedAt);
  if (!progress.every(item => isRecord(item) && bookMap.has(item.bookId) && integer(item.chapterIndex)
      && item.chapterIndex >= 1 && item.chapterIndex <= bookMap.get(item.bookId)!.totalChapters
      && typeof item.chapterTitle === 'string' && finite(item.percentage) && item.percentage <= 100
      && (item.scrollPercent === undefined || (finite(item.scrollPercent) && item.scrollPercent <= 100))
      && (item.scrollOffset === undefined || finite(item.scrollOffset)) && date(item.updatedAt))
      || new Set(progress.map(item => item.bookId)).size !== progress.length) throw new Error('INVALID_BACKUP');
  if (!bookmarks.every(item => locator(item) && typeof item.chapterTitle === 'string'
      && optionalInteger(item.paragraphIndex) && optionalInteger(item.startOffset) && optionalInteger(item.endOffset)
      && optionalText(item.contextBefore) && optionalText(item.contextAfter))) throw new Error('INVALID_BACKUP');
  if (!annotations.every(item => locator(item) && integer(item.paragraphIndex) && integer(item.startOffset)
      && integer(item.endOffset) && item.endOffset >= item.startOffset
      && ['yellow', 'pink', 'purple', 'green'].includes(item.color) && optionalText(item.prefix) && optionalText(item.suffix)
      && (item.note === null || optionalText(item.note)))) throw new Error('INVALID_BACKUP');
  if (!shelves.every(item => isRecord(item) && isNonEmptyString(item.id) && isNonEmptyString(item.name)
      && strings(item.bookIds) && item.bookIds.every(id => bookMap.has(id))
      && optionalText(item.description) && typeof item.color === 'string' && typeof item.icon === 'string')) throw new Error('INVALID_BACKUP');
  if (!hasUniqueIds(books) || !hasUniqueIds(chapters) || !hasUniqueIds(bookmarks) || !hasUniqueIds(annotations)
      || !hasUniqueIds(shelves)) throw new Error('INVALID_BACKUP');
  if (chapters.some(item => !bookMap.has(item.bookId))) throw new Error('INVALID_BACKUP');
  for (const book of books) {
    const owned = chapters.filter(chapter => chapter.bookId === book.id);
    const indices = new Set(owned.map(chapter => chapter.index));
    if (owned.length !== book.totalChapters || indices.size !== owned.length
        || owned.some(ch => ch.index > book.totalChapters)) throw new Error('INVALID_BACKUP');
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
  return JSON.stringify([book.title, book.author, owned.map(ch => [ch.index, ch.title, ch.paragraphs])]);
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
    let selectedBooks: NormalizedBook[] = [];
    let uniqueBooks: NormalizedBook[] = [];
    let idMap = new Map<string, string>();
    // Count, duplicate check and writes share the same lock, including other tabs/imports.
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['books', 'chapters', 'progress', 'bookmarks', 'annotations'], 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Khôi phục đã bị hủy an toàn.'));
      const booksRequest = tx.objectStore('books').getAll();
      const chaptersRequest = tx.objectStore('chapters').getAll();
      chaptersRequest.onsuccess = () => {
        try {
          const existingBooks = booksRequest.result as NormalizedBook[];
          const existingChapters = chaptersRequest.result as NormalizedChapter[];
          const fingerprints = new Set(existingBooks.map(book => fingerprint(book, existingChapters)));
          uniqueBooks = backup.books.filter(book => {
            const key = fingerprint(book, backup.chapters);
            if (fingerprints.has(key)) return false;
            fingerprints.add(key);
            return true;
          });
          selectedBooks = uniqueBooks.slice(0, Math.max(0, getMaxLocalBooks() - existingBooks.length));
          const selectedIds = new Set(selectedBooks.map(book => book.id));
          idMap = new Map(selectedBooks.map(book => [book.id, newId('restored-book')]));
          for (const book of selectedBooks) {
            const mappedId = idMap.get(book.id)!;
            tx.objectStore('books').add({ ...book, id: mappedId, coverUrl: sanitizeCoverUrl(book.coverUrl), shelfIds: [] });
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
        } catch { tx.abort(); }
      };
    });
    let shelvesRestored = true;

    if (selectedBooks.length > 0 && backup.shelves.length > 0) {
      const existingShelves = readShelves();
      const restoredShelves = backup.shelves.map(shelf => ({
        ...shelf,
        id: newId('shelf'),
        bookIds: (shelf.bookIds || []).filter(id => idMap.has(id)).map(id => idMap.get(id)!),
        bookCount: (shelf.bookIds || []).filter(id => idMap.has(id)).length,
      })).filter(shelf => shelf.bookIds.length > 0);
      try { localStorage.setItem(SHELVES_STORAGE_KEY, JSON.stringify([...existingShelves, ...restoredShelves])); }
      catch { shelvesRestored = false; }
    }

    return {
      shelvesRestored,
      restoredBooks: selectedBooks.length,
      skippedDuplicates: backup.books.length - uniqueBooks.length,
      skippedForLimit: Math.max(0, uniqueBooks.length - selectedBooks.length),
    };
  }
}
