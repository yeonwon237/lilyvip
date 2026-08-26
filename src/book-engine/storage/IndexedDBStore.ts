/**
 * Low-level IndexedDB Database Connection Manager
 */

export class IndexedDBStore {
  private static DB_NAME = 'LilyVIP_LocalLibrary_v1';
  private static DB_VERSION = 2;
  private static dbInstance: IDBDatabase | null = null;

  public static async getDB(): Promise<IDBDatabase> {
    if (this.dbInstance) return this.dbInstance;

    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('Trình duyệt của bạn không hỗ trợ IndexedDB.'));
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Books store
        if (!db.objectStoreNames.contains('books')) {
          const bookStore = db.createObjectStore('books', { keyPath: 'id' });
          bookStore.createIndex('by_updatedAt', 'updatedAt', { unique: false });
          bookStore.createIndex('by_lastReadAt', 'lastReadAt', { unique: false });
        }

        // 2. Chapters store
        if (!db.objectStoreNames.contains('chapters')) {
          const chapterStore = db.createObjectStore('chapters', { keyPath: 'id' });
          chapterStore.createIndex('by_bookId', 'bookId', { unique: false });
          chapterStore.createIndex('by_bookId_index', ['bookId', 'index'], { unique: true });
        }

        // 3. Raw File Blobs store
        if (!db.objectStoreNames.contains('rawBlobs')) {
          db.createObjectStore('rawBlobs', { keyPath: 'id' });
        }

        // 4. Reading Progress store
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: 'bookId' });
        }

        // 5. Bookmarks store
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
          bookmarkStore.createIndex('by_bookId', 'bookId', { unique: false });
          bookmarkStore.createIndex('by_bookId_chapter', ['bookId', 'chapterIndex'], { unique: false });
          bookmarkStore.createIndex('by_createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(this.dbInstance);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error || new Error('Không thể mở IndexedDB'));
      };
    });
  }
}
