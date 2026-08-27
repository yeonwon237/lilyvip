import { 
  NormalizedBook, 
  NormalizedChapter, 
  ReadingProgress, 
  RawFileBlob, 
  StorageEstimateInfo,
  SearchResult,
  Bookmark,
  Annotation,
  HighlightColor
} from '../types';
import { IndexedDBStore } from './IndexedDBStore';
import { getMaxLocalBooks } from '../../config/features';

/** @deprecated Prefer getMaxLocalBooks(); retained for existing imports. */
export const MAX_LOCAL_BOOKS = getMaxLocalBooks();

export interface LibraryHealthReport {
  bookCount: number;
  chapterCount: number;
  orphanChapterCount: number;
  orphanProgressCount: number;
  orphanBookmarkCount: number;
  orphanAnnotationCount: number;
  incompleteBookIds: string[];
  isHealthy: boolean;
}

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
        // Sort by updatedAt descending (numeric timestamp comparison)
        books.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        resolve(books);
      };
      getAllReq.onerror = () => reject(getAllReq.error);
    });
  }

  /** Read-only integrity scan. It never clears or mutates user data. */
  public static async checkLibraryHealth(): Promise<LibraryHealthReport> {
    const db = await IndexedDBStore.getDB();
    const stores = ['books', 'chapters', 'progress', 'bookmarks', 'annotations'];
    const tx = db.transaction(stores, 'readonly');
    const getAll = <T>(name: string) => new Promise<T[]>((resolve, reject) => {
      const request = tx.objectStore(name).getAll();
      request.onsuccess = () => resolve((request.result || []) as T[]);
      request.onerror = () => reject(request.error);
    });
    const [books, chapters, progress, bookmarks, annotations] = await Promise.all([
      getAll<NormalizedBook>('books'), new Promise<Array<{ bookId: string; index: number }>>((resolve, reject) => {
        const rows: Array<{ bookId: string; index: number }> = [];
        const req = tx.objectStore('chapters').index('by_bookId_index').openKeyCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) { resolve(rows); return; }
          const [bookId, index] = cursor.key as [string, number];
          rows.push({ bookId, index });
          cursor.continue();
        };
        req.onerror = () => reject(req.error);
      }), getAll<ReadingProgress>('progress'),
      getAll<Bookmark>('bookmarks'), getAll<Annotation>('annotations'),
    ]);
    const ids = new Set(books.map(book => book.id));
    const incompleteBookIds = books.filter(book => {
      const owned = chapters.filter(chapter => chapter.bookId === book.id);
      return owned.length !== book.totalChapters || owned.some(ch => ch.index < 1 || ch.index > book.totalChapters);
    }).map(book => book.id);
    const report: LibraryHealthReport = {
      bookCount: books.length,
      chapterCount: chapters.length,
      orphanChapterCount: chapters.filter(item => !ids.has(item.bookId)).length,
      orphanProgressCount: progress.filter(item => !ids.has(item.bookId)).length,
      orphanBookmarkCount: bookmarks.filter(item => !ids.has(item.bookId)).length,
      orphanAnnotationCount: annotations.filter(item => !ids.has(item.bookId)).length,
      incompleteBookIds,
      isHealthy: false,
    };
    report.isHealthy = report.incompleteBookIds.length === 0
      && report.orphanChapterCount + report.orphanProgressCount + report.orphanBookmarkCount + report.orphanAnnotationCount === 0;
    return report;
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
   * Strict centralized slot enforcement + post-save integrity verification.
   */
  public static async saveBook(
    book: NormalizedBook,
    chapters: NormalizedChapter[],
    rawBuffer?: ArrayBuffer
  ): Promise<NormalizedBook> {
    if (!chapters.length || chapters.length !== book.totalChapters
        || new Set(chapters.map(ch => ch.index)).size !== chapters.length
        || chapters.some(ch => !Number.isInteger(ch.index) || ch.index < 1 || ch.index > chapters.length
          || typeof ch.title !== 'string' || !Array.isArray(ch.paragraphs)
          || !ch.paragraphs.every(p => typeof p === 'string'))) {
      throw new Error('Nội dung truyện chưa hoàn chỉnh; thư viện không bị thay đổi.');
    }
    const db = await IndexedDBStore.getDB();
    let slotError: Error | null = null;

    // Slot validation and the complete write share one transaction, preventing
    // concurrent imports from both passing a stale count check.
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['books', 'chapters', 'rawBlobs', 'progress'], 'readwrite');
      const bookStore = tx.objectStore('books');
      const chapterStore = tx.objectStore('chapters');
      const blobStore = tx.objectStore('rawBlobs');
      const progressStore = tx.objectStore('progress');

      const countRequest = bookStore.count();
      const existingRequest = bookStore.get(book.id);
      let count: number | null = null;
      let existing: NormalizedBook | null | undefined;
      const writeWhenValidated = () => {
        if (count === null || existing === undefined) return;
        if (existing) {
          slotError = new Error('Truyện đã tồn tại; không ghi đè dữ liệu đã lưu.');
          tx.abort();
          return;
        }
        if (count >= MAX_LOCAL_BOOKS) {
          slotError = new Error(`Bạn đã dùng hết ${MAX_LOCAL_BOOKS}/${MAX_LOCAL_BOOKS} slot lưu trữ trên thiết bị. Vui lòng quản lý thư viện trước khi thêm truyện mới.`);
          tx.abort();
          return;
        }
        bookStore.put(book);
        for (const ch of chapters) chapterStore.put({ ...ch, bookId: book.id, id: `${book.id}_chap_${ch.index}` });
        if (rawBuffer) {
          const rawBlobRecord: RawFileBlob = { id: book.id, fileName: book.originalFileName, fileSize: rawBuffer.byteLength,
            fileType: book.fileFormat, data: rawBuffer, savedAt: new Date().toISOString() };
          blobStore.put(rawBlobRecord);
        }
        const initialProgress: ReadingProgress = { bookId: book.id, chapterIndex: book.currentChapter || 1,
          chapterTitle: book.currentChapterTitle || (chapters[0] ? chapters[0].title : 'Chương 1'),
          percentage: book.progressPercent || 0, scrollPercent: 0, scrollOffset: 0, updatedAt: new Date().toISOString() };
        progressStore.put(initialProgress);
      };
      countRequest.onsuccess = () => { count = countRequest.result; writeWhenValidated(); };
      existingRequest.onsuccess = () => { existing = existingRequest.result || null; writeWhenValidated(); };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Lỗi khi lưu sách vào IndexedDB'));
      tx.onabort = () => reject(slotError || tx.error || new Error('Lưu sách đã bị hủy an toàn.'));
    });

    // All validated records committed together. Never delete an existing book
    // as compensation for a separate, fallible read after commit.
    return book;
  }

  /**
   * Delete a book and all associated chapters, blobs, and progress
   */
  public static async deleteBook(id: string): Promise<void> {
    const db = await IndexedDBStore.getDB();

    return new Promise((resolve, reject) => {
      const stores = ['books', 'chapters', 'rawBlobs', 'progress', 'bookmarks'];
      if (db.objectStoreNames.contains('annotations')) {
        stores.push('annotations');
      }

      const tx = db.transaction(stores, 'readwrite');
      const bookStore = tx.objectStore('books');
      const chapterStore = tx.objectStore('chapters');
      const blobStore = tx.objectStore('rawBlobs');
      const progressStore = tx.objectStore('progress');
      const bookmarkStore = tx.objectStore('bookmarks');

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

      // 5. Delete bookmarks using index
      const bookmarkIndex = bookmarkStore.index('by_bookId');
      const bmReq = bookmarkIndex.openKeyCursor(IDBKeyRange.only(id));

      bmReq.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursor>).result;
        if (cursor) {
          bookmarkStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      // 6. Delete annotations using index if store exists
      if (db.objectStoreNames.contains('annotations')) {
        const annotationStore = tx.objectStore('annotations');
        const annotationIndex = annotationStore.index('by_bookId');
        const annReq = annotationIndex.openKeyCursor(IDBKeyRange.only(id));

        annReq.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursor>).result;
          if (cursor) {
            annotationStore.delete(cursor.primaryKey);
            cursor.continue();
          }
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Lỗi khi xóa sách khỏi IndexedDB'));
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
      const chapters: Array<{ index: number; title: string; wordCount: number }> = [];
      const req = index.openCursor(IDBKeyRange.only(bookId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) { resolve(chapters.sort((a, b) => a.index - b.index)); return; }
        const c = cursor.value as NormalizedChapter;
        chapters.push({ index: c.index, title: c.title, wordCount: c.wordCount });
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Save reading progress including chapter index, percentage, and scroll position
   */
  public static async saveProgress(progress: ReadingProgress): Promise<void> {
    const db = await IndexedDBStore.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['progress', 'books'], 'readwrite');
      const progressStore = tx.objectStore('progress');
      const bookStore = tx.objectStore('books');

      // Also update the book's current chapter, percentage, and lastReadAt
      const bookReq = bookStore.get(progress.bookId);
      bookReq.onsuccess = () => {
        const book = bookReq.result as NormalizedBook | undefined;
        if (book) {
          progressStore.put(progress);
          book.currentChapter = progress.chapterIndex;
          book.currentChapterTitle = progress.chapterTitle;
          book.progressPercent = progress.percentage;
          book.lastReadAt = 'Vừa xong';
          book.updatedAt = new Date().toISOString();
          bookStore.put(book);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Giao dịch đã bị hủy.'));
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
   * Search query text across all chapters of a book in IndexedDB (Streaming Cursor)
   * Real full-text search with clean snippets, match offsets, and paragraph indices.
   */
  public static async searchInBook(bookId: string, query: string, maxResults = 50): Promise<SearchResult[]> {
    if (!bookId || !query || !query.trim()) return [];
    const trimmedQuery = query.trim();
    const lowerQuery = trimmedQuery.toLowerCase();
    const db = await IndexedDBStore.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('chapters', 'readonly');
      const store = tx.objectStore('chapters');
      const index = store.index('by_bookId');
      const req = index.openCursor(IDBKeyRange.only(bookId));
      const results: SearchResult[] = [];

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && results.length < maxResults) {
          const chapter = cursor.value as NormalizedChapter;
          const paragraphs = chapter.paragraphs || [];

          for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
            const para = paragraphs[pIdx];
            const lowerPara = para.toLowerCase();
            let searchStart = 0;

            while (searchStart < lowerPara.length) {
              const matchIdx = lowerPara.indexOf(lowerQuery, searchStart);
              if (matchIdx === -1) break;

              // Generate clean snippet with ellipsis
              const snippetStart = Math.max(0, matchIdx - 35);
              const snippetEnd = Math.min(para.length, matchIdx + trimmedQuery.length + 55);
              let snippet = para.substring(snippetStart, snippetEnd).trim();
              if (snippetStart > 0) snippet = '…' + snippet;
              if (snippetEnd < para.length) snippet = snippet + '…';

              results.push({
                chapterIndex: chapter.index,
                chapterTitle: chapter.title,
                snippet,
                paragraphIndex: pIdx,
                matchOffset: matchIdx,
                matchIndex: results.length + 1,
              });

              if (results.length >= maxResults) break;
              searchStart = matchIdx + Math.max(1, trimmedQuery.length);
            }

            if (results.length >= maxResults) break;
          }

          cursor.continue();
        } else {
          resolve(results);
        }
      };

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
   * Extract raw file blob from IndexedDB for backup/download
   */
  public static async getRawBlob(bookId: string): Promise<Blob | null> {
    const db = await IndexedDBStore.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([IndexedDBStore.STORES.BOOKS, IndexedDBStore.STORES.RAW_BLOBS], 'readonly');
      const bookReq = tx.objectStore('books').get(bookId);
      const store = tx.objectStore(IndexedDBStore.STORES.RAW_BLOBS);
      const req = store.get(bookId);

      req.onsuccess = () => {
        const book = bookReq.result as NormalizedBook | undefined;
        if (!book || book.source || !['TXT', 'EPUB', 'DOCX'].includes(book.fileFormat)) { resolve(null); return; }
        const record = req.result as RawFileBlob | undefined;
        if (!record || !record.data) {
          resolve(null);
          return;
        }
        let mime = 'application/octet-stream';
        if (record.fileType.toLowerCase() === 'epub') mime = 'application/epub+zip';
        else if (record.fileType.toLowerCase() === 'docx') mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (record.fileType.toLowerCase() === 'txt') mime = 'text/plain;charset=utf-8';

        const blob = new Blob([record.data], { type: mime });
        resolve(blob);
      };

      req.onerror = () => reject(req.error || new Error('Không thể đọc file gốc từ IndexedDB'));
    });
  }

  /**
   * Attempt to request persistent storage
   */
  public static async requestPersistentStorage(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        return await navigator.storage.persist();
      }
    } catch {}
    return false;
  }
  /**
   * Save a bookmark to IndexedDB (with deduplication check)
   */
  public static async saveBookmark(bookmark: Partial<Bookmark> & { bookId: string; chapterIndex: number; selectedText: string }): Promise<Bookmark> {
    const db = await IndexedDBStore.getDB();
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['books', 'bookmarks'], 'readwrite');
      let saved: Bookmark;
      tx.oncomplete = () => resolve(saved);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Không thể lưu bookmark'));
      const parent = tx.objectStore('books').get(bookmark.bookId);
      parent.onsuccess = () => { if (!parent.result) tx.abort(); };
      const store = tx.objectStore('bookmarks');
      const chapterIndex = store.index('by_bookId_chapter');
      const req = chapterIndex.getAll(IDBKeyRange.only([bookmark.bookId, bookmark.chapterIndex]));

      req.onsuccess = () => {
        const existingList = (req.result || []) as Bookmark[];
        // Check for duplicate bookmark in the same chapter
        const duplicate = existingList.find(b => 
          b.selectedText.trim() === bookmark.selectedText.trim() && 
          (b.paragraphIndex === bookmark.paragraphIndex || bookmark.paragraphIndex === undefined)
        );

        if (duplicate) {
          // Return existing bookmark directly
          saved = duplicate;
          return;
        }

        const id = bookmark.id || `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const fullBookmark: Bookmark = {
          id,
          bookId: bookmark.bookId,
          chapterIndex: bookmark.chapterIndex,
          chapterTitle: bookmark.chapterTitle || `Chương ${bookmark.chapterIndex}`,
          selectedText: bookmark.selectedText.trim(),
          paragraphIndex: bookmark.paragraphIndex,
          startOffset: bookmark.startOffset,
          endOffset: bookmark.endOffset,
          contextBefore: bookmark.contextBefore,
          contextAfter: bookmark.contextAfter,
          createdAt: bookmark.createdAt || now,
          updatedAt: now,
        };

        store.put(fullBookmark);
        saved = fullBookmark;
      };

      req.onerror = () => reject(req.error || new Error('Không thể lưu bookmark'));
    });
  }

  /**
   * Delete a bookmark by ID
   */
  public static async deleteBookmark(id: string): Promise<void> {
    const db = await IndexedDBStore.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('bookmarks', 'readwrite');
      const store = tx.objectStore('bookmarks');
      const req = store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error || new Error('Giao dịch đã bị hủy.'));
      req.onerror = () => reject(req.error || new Error('Không thể xóa bookmark'));
    });
  }

  /**
   * Get a bookmark by ID
   */
  public static async getBookmark(id: string): Promise<Bookmark | null> {
    const db = await IndexedDBStore.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('bookmarks', 'readonly');
      const store = tx.objectStore('bookmarks');
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all bookmarks for a specific book (sorted by createdAt descending)
   */
  public static async getBookmarksForBook(bookId: string): Promise<Bookmark[]> {
    const db = await IndexedDBStore.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('bookmarks', 'readonly');
      const store = tx.objectStore('bookmarks');
      const index = store.index('by_bookId');
      const req = index.getAll(IDBKeyRange.only(bookId));

      req.onsuccess = () => {
        const list = (req.result || []) as Bookmark[];
        // Sort descending by createdAt (newest first)
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(list);
      };

      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all bookmarks for a specific chapter
   */
  public static async getBookmarksForChapter(bookId: string, chapterIndex: number): Promise<Bookmark[]> {
    const db = await IndexedDBStore.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('bookmarks', 'readonly');
      const store = tx.objectStore('bookmarks');
      const index = store.index('by_bookId_chapter');
      const req = index.getAll(IDBKeyRange.only([bookId, chapterIndex]));

      req.onsuccess = () => {
        const list = (req.result || []) as Bookmark[];
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(list);
      };

      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Save an annotation (Highlight or Note) to IndexedDB
   */
  public static async saveAnnotation(
    annotation: Partial<Annotation> & { 
      bookId: string; 
      chapterIndex: number; 
      paragraphIndex: number;
      startOffset: number;
      endOffset: number;
      selectedText: string;
      color?: HighlightColor;
    }
  ): Promise<Annotation> {
    const db = await IndexedDBStore.getDB();
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['books', 'annotations'], 'readwrite');
      const parent = tx.objectStore('books').get(annotation.bookId);
      parent.onsuccess = () => { if (!parent.result) tx.abort(); };
      const store = tx.objectStore('annotations');

      const id = annotation.id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fullAnnotation: Annotation = {
        id,
        bookId: annotation.bookId,
        chapterIndex: annotation.chapterIndex,
        chapterTitle: annotation.chapterTitle,
        paragraphIndex: annotation.paragraphIndex,
        startOffset: annotation.startOffset,
        endOffset: annotation.endOffset,
        selectedText: annotation.selectedText,
        prefix: annotation.prefix,
        suffix: annotation.suffix,
        color: annotation.color || 'yellow',
        note: annotation.note !== undefined ? annotation.note : null,
        createdAt: annotation.createdAt || now,
        updatedAt: now,
      };

      const putReq = store.put(fullAnnotation);
      tx.oncomplete = () => resolve(fullAnnotation);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Không thể lưu đánh dấu'));
      putReq.onerror = () => reject(putReq.error || new Error('Không thể lưu đánh dấu'));
    });
  }

  /**
   * Update an existing annotation's note or color
   */
  public static async updateAnnotation(
    id: string, 
    updates: Partial<Pick<Annotation, 'note' | 'color'>>
  ): Promise<Annotation | null> {
    const db = await IndexedDBStore.getDB();
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('annotations', 'readwrite');
      const store = tx.objectStore('annotations');
      let saved: Annotation | null = null;
      tx.oncomplete = () => resolve(saved);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Không thể cập nhật đánh dấu'));
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result as Annotation | undefined;
        if (!existing) {
          return;
        }

        const updated: Annotation = {
          ...existing,
          ...updates,
          updatedAt: now,
        };

        const putReq = store.put(updated);
        saved = updated;
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error || new Error('Không thể cập nhật đánh dấu'));
    });
  }

  /**
   * Delete an annotation by ID
   */
  public static async deleteAnnotation(id: string): Promise<void> {
    const db = await IndexedDBStore.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('annotations', 'readwrite');
      const store = tx.objectStore('annotations');
      const req = store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(tx.error || new Error('Giao dịch đã bị hủy.'));
      req.onerror = () => reject(req.error || new Error('Không thể xóa đánh dấu'));
    });
  }

  /**
   * Get a single annotation by ID
   */
  public static async getAnnotation(id: string): Promise<Annotation | null> {
    const db = await IndexedDBStore.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('annotations', 'readonly');
      const store = tx.objectStore('annotations');
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all annotations for a specific book (sorted by chapterIndex, paragraphIndex, startOffset)
   */
  public static async getAnnotationsForBook(bookId: string): Promise<Annotation[]> {
    const db = await IndexedDBStore.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('annotations', 'readonly');
      const store = tx.objectStore('annotations');
      const index = store.index('by_bookId');
      const req = index.getAll(IDBKeyRange.only(bookId));

      req.onsuccess = () => {
        const list = (req.result || []) as Annotation[];
        // Sort ascending by chapter, paragraph, offset
        list.sort((a, b) => {
          if (a.chapterIndex !== b.chapterIndex) return a.chapterIndex - b.chapterIndex;
          if (a.paragraphIndex !== b.paragraphIndex) return a.paragraphIndex - b.paragraphIndex;
          return a.startOffset - b.startOffset;
        });
        resolve(list);
      };

      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all annotations for a specific chapter
   */
  public static async getAnnotationsForChapter(bookId: string, chapterIndex: number): Promise<Annotation[]> {
    const db = await IndexedDBStore.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('annotations', 'readonly');
      const store = tx.objectStore('annotations');
      const index = store.index('by_bookId_chapter');
      const req = index.getAll(IDBKeyRange.only([bookId, chapterIndex]));

      req.onsuccess = () => {
        const list = (req.result || []) as Annotation[];
        list.sort((a, b) => {
          if (a.paragraphIndex !== b.paragraphIndex) return a.paragraphIndex - b.paragraphIndex;
          return a.startOffset - b.startOffset;
        });
        resolve(list);
      };

      req.onerror = () => reject(req.error);
    });
  }
}
