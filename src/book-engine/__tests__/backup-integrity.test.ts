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
const legacyVersion = Number(process.env.LILY_TEST_DB_VERSION || 2);
const openOldDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, legacyVersion);
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
    if (legacyVersion >= 2) {
    const bookmarks = db.createObjectStore('bookmarks', { keyPath: 'id' });
    bookmarks.createIndex('by_bookId', 'bookId');
    bookmarks.createIndex('by_bookId_chapter', ['bookId', 'chapterIndex']);
    bookmarks.createIndex('by_createdAt', 'createdAt');
    }
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
  const tx = oldDb.transaction(['books', 'chapters', 'progress', ...(legacyVersion >= 2 ? ['bookmarks'] : [])], 'readwrite');
  tx.objectStore('books').put(makeBook('legacy', 1));
  tx.objectStore('chapters').put(makeChapters('legacy', 1)[0]);
  tx.objectStore('progress').put({ bookId: 'legacy', chapterIndex: 1, chapterTitle: 'Chương 1', percentage: 25, updatedAt: '2026-01-02T00:00:00.000Z' });
  if (legacyVersion >= 2) tx.objectStore('bookmarks').put({ id: 'legacy-bm', bookId: 'legacy', chapterIndex: 1, chapterTitle: 'Chương 1', selectedText: 'Nội dung', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' });
  tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
});
oldDb.close();
const migratedDb = await IndexedDBStore.getDB();
assert.equal(migratedDb.version, 3);
assert.ok(migratedDb.objectStoreNames.contains('annotations'));
assert.equal((await BookRepository.getBook('legacy'))?.title, 'Truyện legacy');
assert.equal((await BookRepository.getChapter('legacy', 1))?.paragraphs[0], 'Nội dung legacy, chương 1.');
assert.equal((await BookRepository.getProgress('legacy'))?.percentage, 25);
assert.equal((await BookRepository.getBookmarksForBook('legacy')).length, legacyVersion >= 2 ? 1 : 0);

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

// Final beta audit regressions: exercise real IndexedDB transactions, not mocks.
const clearFixture = async () => { for (const book of await BookRepository.getBooks()) await BookRepository.deleteBook(book.id); };
await clearFixture();
const [restoreA, restoreB] = await Promise.all([LocalLibraryBackup.restore(backup), LocalLibraryBackup.restore(backup)]);
assert.equal(restoreA.restoredBooks + restoreB.restoredBooks, 5, 'concurrent restores must share slot/duplicate lock');
assert.equal(await BookRepository.countBooks(), 5);
await clearFixture();
for (let i = 0; i < 4; i++) await BookRepository.saveBook(makeBook(`race-${i}`, 1), makeChapters(`race-${i}`, 1));
await Promise.allSettled([LocalLibraryBackup.restore(backup), BookRepository.saveBook(makeBook('racer', 1), makeChapters('racer', 1))]);
assert.equal(await BookRepository.countBooks(), 5, 'restore and import cannot claim the same slot');

const invalidBackups = [
  { ...backup, books: backup.books.map((b, i) => i ? b : { ...b, createdAt: null }) },
  { ...backup, books: backup.books.map((b, i) => i ? b : { ...b, tags: {} }) },
  { ...backup, chapters: backup.chapters.map((c, i) => i ? c : { ...c, title: {} }) },
  { ...backup, chapters: backup.chapters.map(c => ({ ...c, index: c.index === 600 ? 601 : c.index })) },
  { ...backup, annotations: backup.annotations.map(a => ({ ...a, selectedText: {} })) },
  { ...backup, annotations: backup.annotations.map(a => ({ ...a, note: {} })) },
  { ...backup, progress: [...backup.progress, backup.progress[0]] },
  { ...backup, shelves: [{ id: 'bad', name: 'Bad', bookIds: 'not-an-array' }] },
];
for (const invalid of invalidBackups) assert.throws(() => LocalLibraryBackup.parse(invalid), /INVALID_BACKUP/);
const preserved = await LocalLibraryBackup.create();
await assert.rejects(() => LocalLibraryBackup.restore(invalidBackups[0] as any), /INVALID_BACKUP/);
assert.deepEqual((await LocalLibraryBackup.create()).books, preserved.books, 'invalid restore leaves library unchanged');

await clearFixture();
await BookRepository.saveBook(makeBook('protected', 1), makeChapters('protected', 1), new Uint8Array([1, 2, 3]).buffer);
await assert.rejects(() => BookRepository.saveBook(makeBook('protected', 2), makeChapters('protected', 2)), /tồn tại/);
assert.equal((await BookRepository.getChapterList('protected')).length, 1, 'collision never overwrites/deletes old data');
await assert.rejects(() => BookRepository.saveBook(makeBook('gap', 2), [makeChapters('gap', 1)[0], { ...makeChapters('gap', 1)[0], index: 3 }]), /hoàn chỉnh/);
assert.equal(await BookRepository.getBook('gap'), null);

// Abort after a request succeeds but before the transaction commits.
const realTransaction = migratedDb.transaction.bind(migratedDb);
const abortNextWrite = () => {
  (migratedDb as any).transaction = (...args: any[]) => {
    const tx = (realTransaction as any)(...args) as IDBTransaction;
    if (args[1] === 'readwrite') {
      (migratedDb as any).transaction = realTransaction;
      const originalStore = tx.objectStore.bind(tx);
      (tx as any).objectStore = (name: string) => {
        const store = originalStore(name);
        const put = store.put.bind(store);
        store.put = (...putArgs: Parameters<IDBObjectStore['put']>) => {
          const request = put(...putArgs);
          request.addEventListener('success', () => tx.abort(), { once: true });
          return request;
        };
        return store;
      };
    }
    return tx;
  };
};
abortNextWrite();
await assert.rejects(() => BookRepository.saveBookmark({ bookId: 'protected', chapterIndex: 1, selectedText: 'Nội dung' }));
assert.equal((await BookRepository.getBookmarksForBook('protected')).length, 0);
abortNextWrite();
await assert.rejects(() => BookRepository.saveAnnotation({ bookId: 'protected', chapterIndex: 1, paragraphIndex: 0, startOffset: 0, endOffset: 8, selectedText: 'Nội dung', note: 'must not report saved' }));
assert.equal((await BookRepository.getAnnotationsForBook('protected')).length, 0);
const annotation = await BookRepository.saveAnnotation({ bookId: 'protected', chapterIndex: 1, paragraphIndex: 0, startOffset: 0, endOffset: 8, selectedText: 'Nội dung', note: 'original' });
abortNextWrite();
await assert.rejects(() => BookRepository.updateAnnotation(annotation.id, { note: 'lost update' }));
assert.equal((await BookRepository.getAnnotation(annotation.id))?.note, 'original');
await BookRepository.deleteBook('protected');
assert.equal(await BookRepository.getRawBlob('protected'), null);
await BookRepository.saveProgress({ bookId: 'protected', chapterIndex: 1, chapterTitle: '', percentage: 0, updatedAt: new Date().toISOString() });
assert.equal(await BookRepository.getProgress('protected'), null, 'late progress must not recreate deleted children');
await assert.rejects(() => BookRepository.saveAnnotation({ bookId: 'protected', chapterIndex: 1, paragraphIndex: 0, startOffset: 0, endOffset: 1, selectedText: 'x' }));

// Full metadata/progress/bookmarks/notes fidelity after ID remapping.
await LocalLibraryBackup.restore(backup);
const fullRoundTrip = await LocalLibraryBackup.create();
for (const oldBook of backup.books) {
  const nextBook = fullRoundTrip.books.find(b => b.title === oldBook.title)!;
  assert.deepEqual(JSON.parse(JSON.stringify({ ...nextBook, id: oldBook.id })), JSON.parse(JSON.stringify(oldBook)));
  for (const key of ['progress', 'bookmarks', 'annotations'] as const) {
    const normalize = (items: any[], id: string) => items.filter(x => x.bookId === id).map(({ id: _id, bookId: _bookId, ...rest }) => rest);
    assert.deepEqual(normalize(fullRoundTrip[key], nextBook.id), normalize(backup[key], oldBook.id));
  }
}
await clearFixture();
const scaleChapters = makeChapters('scale', 1000).map(c => ({ ...c, paragraphs: ['a'.repeat(10000) + (c.index === 1000 ? ' needle' : '')] }));
await BookRepository.saveBook(makeBook('scale', 1000), scaleChapters);
const started = performance.now();
assert.equal((await BookRepository.getChapterList('scale')).length, 1000);
assert.equal((await BookRepository.searchInBook('scale', 'needle'))[0].chapterIndex, 1000);
console.log(`Audit DB regressions passed; 1000 × 10k character TOC/search: ${Math.round(performance.now() - started)}ms (fake-indexeddb, not browser UI)`);

await clearFixture();
const remoteBook = { ...makeBook('remote-file', 1), source: { type: 'remote-file' as const, adapter: 'direct-link', url: 'https://example.org/book.txt', hostname: 'example.org', importedAt: '2026-08-27T00:00:00.000Z' } };
await BookRepository.saveBook(remoteBook, makeChapters(remoteBook.id, 1), new Uint8Array([1, 2]).buffer);
assert.equal(await BookRepository.getRawBlob(remoteBook.id), null, 'remote-file origin is never offered as device original');
await clearFixture();
const withShelf = { ...backup, shelves: [{ id: 'shelf', name: 'Fixture shelf', icon: 'BookOpen', color: '#D9829B', bookCount: 1, bookIds: [backup.books[0].id] }] };
const setItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
const shelfResult = await LocalLibraryBackup.restore(withShelf);
localStorage.setItem = setItem;
assert.equal(shelfResult.restoredBooks, 5);
assert.equal(shelfResult.shelvesRestored, false, 'shelf failure is reported separately from committed books/notes');
assert.equal((await BookRepository.checkLibraryHealth()).isHealthy, true);
console.log(`Migration v${legacyVersion}→v3, original-file provenance and shelf quota regression passed`);
const annotationBook = (await BookRepository.getBooks())[0];
await Promise.all(Array.from({ length: 400 }, (_, i) => BookRepository.saveAnnotation({ bookId: annotationBook.id, chapterIndex: 1, paragraphIndex: 0, startOffset: 0, endOffset: 8, selectedText: 'Nội dung', note: `Fixture ${i}` })));
assert.ok((await BookRepository.getAnnotationsForBook(annotationBook.id)).length >= 400);
const { AnnotationRenderer } = await import('../annotation/AnnotationRenderer');
assert.equal(AnnotationRenderer.sliceParagraph('Nội dung kiểm tra', await BookRepository.getAnnotationsForChapter(annotationBook.id, 1)).map(segment => segment.text).join(''), 'Nội dung kiểm tra');
console.log('400 overlapping annotations: storage and rendering preserve source text');
