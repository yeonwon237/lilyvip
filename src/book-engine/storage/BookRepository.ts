import { 
  NormalizedBook, 
  NormalizedChapter, 
  ReadingProgress, 
  RawFileBlob, 
  StorageEstimateInfo 
} from '../types';
import { IndexedDBStore } from './IndexedDBStore';

export const MAX_LOCAL_BOOKS = 3;

export class BookRepository {
  /**
   * Count total books currently stored in IndexedDB
   */
  public static async countBooks(): Promise<number> {
    const db = await IndexedDBStore.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readonly');
      const store = tx.objectStore('books');
      const countReq = store.count();

      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => reject(countReq.error);
    });
  }

  /**
   * Get all books stored locally
   */
  public static async getBooks(): Promise<NormalizedBook[]> {
    const db = await IndexedDBStore.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readonly');
      const store = tx.objectStore('books');
      const getAllReq = store.getAll();

      getAllReq.onsuccess = () => {
        const books = (getAllReq.result || []) as NormalizedBook[];
        // Sort by updatedAt / lastReadAt descending
        books.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        resolve(books);
      };
      getAllReq.onerror = () => reject(getAllReq.error);
    });
  }

  /**
   * Get single book metadata
   */
  public static async getBook(id: string): Promise<NormalizedBook | null> {
    const db = await IndexedDBStore.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('books', 'readonly');
      const store = tx.objectStore('books');
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Save a new book with all its chapters, raw blob, and initial progress
   * STRICT ENFORCEMENT of 3-slot limit
   */
  public static async saveBook(
    book: NormalizedBook,
    chapters: NormalizedChapter[],
    rawBuffer?: ArrayBuffer
  ): Promise<NormalizedBook> {
    const db = await IndexedDBStore.getDB();

    // 1. Check slot limit if this is a new book
    const existingCount = await this.countBooks();
    const existingBook = await this.getBook(book.id);

    if (!existingBook && existingCount >= MAX_LOCAL_BOOKS) {
      throw new Error(`Bạn đã dùng hết ${MAX_LOCAL_BOOKS}/${MAX_LOCAL_BOOKS} slot lưu trữ trên thiết bị. Vui lòng xóa bớt truyện cũ để thêm truyện mới.`);
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['books', 'chapters', 'rawBlobs', 'progress'], 'readwrite');
      const bookStore = tx.objectStore('books');
      const chapterStore = tx.objectStore('chapters');
      const blobStore = tx.objectStore('rawBlobs');
      const progressStore = tx.objectStore('progress');

      // Save book record
      bookStore.put(book);

      // Save all chapter records
      for (const ch of chapters) {
        chapterStore.put({
          ...ch,
          bookId: book.id,
          id: `${book.id}_chap_${ch.index}`,
        });
      }

      // Save raw blob if provided
      if (rawBuffer) {
        const rawBlobRecord: RawFileBlob = {
          id: book.id,
          fileName: book.originalFileName,
          fileSize: rawBuffer.byteLength,
          fileType: book.fileFormat,
          data: rawBuffer,
          savedAt: new Date().toISOString(),
        };
        blobStore.put(rawBlobRecord);
      }

      // Save initial progress
      const initialProgress: ReadingProgress = {
        bookId: book.id,
        chapterIndex: book.currentChapter || 1,
        chapterTitle: book.currentChapterTitle || (chapters[0] ? chapters[0].title : 'Chương 1'),
        percentage: book.progressPercent || 0,
        updatedAt: new Date().toISOString(),
      };
      progressStore.put(initialProgress);

      tx.oncomplete = () => resolve(book);
      tx.onerror = () => reject(tx.error || new Error('Lỗi khi lưu sách vào IndexedDB'));
    });
  }

  /**
   * Delete a book and all associated chapters, blobs, and progress
   */
  public static async deleteBook(id: string): Promise<void> {
    const db = await IndexedDBStore.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['books', 'chapters', 'rawBlobs', 'progress'], 'readwrite');
      const bookStore = tx.objectStore('books');
      const chapterStore = tx.objectStore('chapters');
      const blobStore = tx.objectStore('rawBlobs');
      const progressStore = tx.objectStore('progress');

      // 1. Delete book record
      bookStore.delete(id);

      // 2. Delete raw blob
      blobStore.delete(id);

      // 3. Delete progress
      progressStore.delete(id);

      // 4. Delete chapters using index
      const chapterIndex = chapterStore.index('by_bookId');
      const req = chapterIndex.openKeyCursor(IDBKeyRange.only(id));

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursor>).result;
        if (cursor) {
          chapterStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Lỗi khi xóa sách khỏi IndexedDB'));
    });
  }

  /**
   * Get specific chapter content for Reader
   */
  public static async getChapter(bookId: string, chapterIndex: number): Promise<NormalizedChapter | null> {
    const db = await IndexedDBStore.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('chapters', 'readonly');
      const store = tx.objectStore('chapters');
      const index = store.index('by_bookId_index');
      const req = index.get([bookId, chapterIndex]);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get chapter list metadata (index, title, wordCount) for TOC
   */
  public static async getChapterList(bookId: string): Promise<Array<{ index: number; title: string; wordCount: number }>> {
    const db = await IndexedDBStore.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('chapters', 'readonly');
      const store = tx.objectStore('chapters');
      const index = store.index('by_bookId');
      const req = index.getAll(IDBKeyRange.only(bookId));

      req.onsuccess = () => {
        const chapters = (req.result || []) as NormalizedChapter[];
        chapters.sort((a, b) => a.index - b.index);
        resolve(chapters.map(c => ({
          index: c.index,
          title: c.title,
          wordCount: c.wordCount,
        })));
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Save reading progress
   */
  public static async saveProgress(progress: ReadingProgress): Promise<void> {
    const db = await IndexedDBStore.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['progress', 'books'], 'readwrite');
      const progressStore = tx.objectStore('progress');
      const bookStore = tx.objectStore('books');

      progressStore.put(progress);

      // Also update the book's current chapter and progressPercent
      const bookReq = bookStore.get(progress.bookId);
      bookReq.onsuccess = () => {
        const book = bookReq.result as NormalizedBook | undefined;
        if (book) {
          book.currentChapter = progress.chapterIndex;
          book.currentChapterTitle = progress.chapterTitle;
          book.progressPercent = progress.percentage;
          book.lastReadAt = 'Vừa xong';
          book.updatedAt = new Date().toISOString();
          bookStore.put(book);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get reading progress for a book
   */
  public static async getProgress(bookId: string): Promise<ReadingProgress | null> {
    const db = await IndexedDBStore.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('progress', 'readonly');
      const store = tx.objectStore('progress');
      const req = store.get(bookId);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Estimate local storage usage via navigator.storage.estimate()
   */
  public static async getStorageEstimate(): Promise<StorageEstimateInfo> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usageMB = Number(((estimate.usage || 0) / (1024 * 1024)).toFixed(1));
        const quotaMB = Number(((estimate.quota || 0) / (1024 * 1024)).toFixed(1));
        const percentUsed = quotaMB > 0 ? Number(((usageMB / quotaMB) * 100).toFixed(2)) : 0;

        let isPersistent = false;
        if (navigator.storage.persisted) {
          isPersistent = await navigator.storage.persisted();
        }

        return { usageMB, quotaMB, percentUsed, isPersistent };
      }
    } catch {
      // Fallback
    }

    return { usageMB: 0, quotaMB: 100, percentUsed: 0, isPersistent: false };
  }

  /**
   * Attempt to request persistent storage
   */
  public static async requestPersistentStorage(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        return await navigator.storage.persist();
      }
    } catch {
      // Fallback
    }
    return false;
  }
}
