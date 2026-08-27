import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { BookRepository, MAX_LOCAL_BOOKS } from '../storage/BookRepository';
import { IndexedDBStore } from '../storage/IndexedDBStore';
import { LocalLibraryBackup } from '../storage/LocalLibraryBackup';
import type { NormalizedBook, NormalizedChapter } from '../types';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });

const DB_NAME = 'LilyVIP_LocalLibrary_v1';
const openOldDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 2);
  request.onupgradeneeded = () => {
    const db = request.result;
    const books = db.createObjectStore('books', { keyPath: 'id' });
    books.createIndex('by_updatedAt', 'updatedAt');
    books.createIndex('by_lastReadAt', 'lastReadAt');
    const chapters = db.createObjectStore('chapters', { keyPath: 'id' });
    chapters.createIndex('by_bookId', 'bookId');
    chapters.createIndex('by_bookId_index', ['bookId', 'index'], { unique: true });
    db.createObjectStore('rawBlobs', { keyPath: 'id' });
    db.createObjectStore('progress', { keyPath: 'bookId' });
    const bookmarks = db.createObjectStore('bookmarks', { keyPath: 'id' });
    bookmarks.createIndex('by_bookId', 'bookId');
    bookmarks.createIndex('by_bookId_chapter', ['bookId', 'chapterIndex']);
    bookmarks.createIndex('by_createdAt', 'createdAt');
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const makeBook = (id: string, chapterCount: number): NormalizedBook => ({
  id, version: 1, title: `Truyện ${id}`, author: `Tác giả ${id}`, coverColor: '#D9829B',
  fileFormat: 'TXT', fileSizeMB: 1, totalChapters: chapterCount, wordCount: chapterCount * 20,
  originalFileName: `${id}.txt`, storageType: 'local', createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z', lastReadAt: 'Vừa thêm', currentChapter: 1,
  currentChapterTitle: 'Chương 1', progressPercent: 0, tags: [], shelfIds: [], hasDetectedChapters: true,
});
const makeChapters = (bookId: string, count: number): NormalizedChapter[] => Array.from({ length: count }, (_, offset) => ({
  id: `${bookId}_draft_${offset + 1}`, bookId, index: offset + 1, title: `Chương ${offset + 1}`,
  paragraphs: [`Nội dung ${bookId}, chương ${offset + 1}.`], wordCount: 20,
}));

// Migration v2 -> v3 must preserve populated stores while adding annotations.
const oldDb = await openOldDatabase();
await new Promise<void>((resolve, reject) => {
  const tx = oldDb.transaction(['books', 'chapters', 'progress', 'bookmarks'], 'readwrite');
  tx.objectStore('books').put(makeBook('legacy', 1));
  tx.objectStore('chapters').put(makeChapters('legacy', 1)[0]);
  tx.objectStore('progress').put({ bookId: 'legacy', chapterIndex: 1, chapterTitle: 'Chương 1', percentage: 25, updatedAt: '2026-01-02T00:00:00.000Z' });
  tx.objectStore('bookmarks').put({ id: 'legacy-bm', bookId: 'legacy', chapterIndex: 1, chapterTitle: 'Chương 1', selectedText: 'Nội dung', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' });
  tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
});
oldDb.close();
const migratedDb = await IndexedDBStore.getDB();
assert.equal(migratedDb.version, 3);
assert.ok(migratedDb.objectStoreNames.contains('annotations'));
assert.equal((await BookRepository.getBook('legacy'))?.title, 'Truyện legacy');
assert.equal((await BookRepository.getChapter('legacy', 1))?.paragraphs[0], 'Nội dung legacy, chương 1.');
assert.equal((await BookRepository.getProgress('legacy'))?.percentage, 25);
assert.equal((await BookRepository.getBookmarksForBook('legacy')).length, 1);

assert.equal(MAX_LOCAL_BOOKS, 5);
for (let index = 2; index <= 5; index++) {
  const id = `book-${index}`;
  await BookRepository.saveBook(makeBook(id, 600), makeChapters(id, 600));
  await BookRepository.saveBookmark({ bookId: id, chapterIndex: 1, selectedText: `Dấu trang ${id}` });
  await BookRepository.saveAnnotation({ bookId: id, chapterIndex: 1, paragraphIndex: 0, startOffset: 0, endOffset: 8, selectedText: 'Nội dung', note: `Ghi chú ${id}` });
}
assert.equal(await BookRepository.countBooks(), 5, 'books 0 -> 5 succeed');
await assert.rejects(() => BookRepository.saveBook(makeBook('book-6', 1), makeChapters('book-6', 1)), /5\/5/);
assert.equal(await BookRepository.getBook('book-6'), null, 'rejected import leaves no book metadata');
assert.equal(await BookRepository.getChapterList('book-6').then(items => items.length), 0, 'rejected import leaves no chapters');

const beforeDelete = await LocalLibraryBackup.create();
await BookRepository.deleteBook('book-2');
const afterDelete = await LocalLibraryBackup.create();
assert.equal(afterDelete.books.some(book => book.id === 'book-2'), false);
assert.equal(afterDelete.chapters.some(chapter => chapter.bookId === 'book-2'), false);
assert.equal(afterDelete.progress.some(item => item.bookId === 'book-2'), false);
assert.equal(afterDelete.bookmarks.some(item => item.bookId === 'book-2'), false);
assert.equal(afterDelete.annotations.some(item => item.bookId === 'book-2'), false);
await BookRepository.saveBook(makeBook('replacement', 600), makeChapters('replacement', 600));
assert.equal(await BookRepository.countBooks(), 5, 'delete one then import succeeds');

const backup = await LocalLibraryBackup.create();
assert.equal(LocalLibraryBackup.preview(backup).chapterCount, 2401);
assert.throws(() => LocalLibraryBackup.parse({ ...backup, version: 99 }), /INVALID_BACKUP/);
assert.throws(() => LocalLibraryBackup.parse({ ...backup, chapters: backup.chapters.slice(1) }), /INVALID_BACKUP/);

for (const book of await BookRepository.getBooks()) await BookRepository.deleteBook(book.id);
assert.equal(await BookRepository.countBooks(), 0);
const restored = await LocalLibraryBackup.restore(backup);
assert.equal(restored.restoredBooks, 5);
const roundTrip = await LocalLibraryBackup.create();
assert.equal(roundTrip.books.length, backup.books.length);
assert.equal(roundTrip.chapters.length, backup.chapters.length);
assert.equal(roundTrip.progress.length, backup.progress.length);
assert.equal(roundTrip.bookmarks.length, backup.bookmarks.length);
assert.equal(roundTrip.annotations.length, backup.annotations.length);
const chapterText = (items: NormalizedChapter[]) => items.map(item => item.paragraphs.join('\n')).sort();
assert.deepEqual(chapterText(roundTrip.chapters), chapterText(backup.chapters));

const duplicateRestore = await LocalLibraryBackup.restore(backup);
assert.equal(duplicateRestore.restoredBooks, 0);
assert.equal(duplicateRestore.skippedDuplicates, 5);
assert.equal((await BookRepository.checkLibraryHealth()).isHealthy, true);

console.log('Backup/integrity: migration, 5-slot, cascade and 5×600 chapter round-trip passed');
