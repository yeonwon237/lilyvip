/**
 * Low-level IndexedDB Database Connection Manager
 */

export class IndexedDBStore {
  private static DB_NAME = 'LilyVIP_LocalLibrary_v1';
  private static DB_VERSION = 3;
  private static dbInstance: IDBDatabase | null = null;
  private static opening: Promise<IDBDatabase> | null = null;

  public static readonly STORES = {
    BOOKS: 'books',
    CHAPTERS: 'chapters',
    RAW_BLOBS: 'rawBlobs',
    PROGRESS: 'progress',
    BOOKMARKS: 'bookmarks',
    ANNOTATIONS: 'annotations',
  } as const;

  public static async getDB(): Promise<IDBDatabase> {
    if (this.dbInstance) return this.dbInstance;

    if (this.opening) return this.opening;
    this.opening = new Promise<IDBDatabase>((resolve, reject) => {
      let blocked = false;
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

        // 6. Annotations store (Highlights & Notes - v3 migration)
        if (!db.objectStoreNames.contains('annotations')) {
          const annotationStore = db.createObjectStore('annotations', { keyPath: 'id' });
          annotationStore.createIndex('by_bookId', 'bookId', { unique: false });
          annotationStore.createIndex('by_bookId_chapter', ['bookId', 'chapterIndex'], { unique: false });
          annotationStore.createIndex('by_createdAt', 'createdAt', { unique: false });
          annotationStore.createIndex('by_updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (blocked) { db.close(); return; }
        this.dbInstance = db;
        const release = () => { if (this.dbInstance === db) this.dbInstance = null; };
        db.onversionchange = () => { db.close(); release(); };
        db.onclose = release;
        resolve(db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error || new Error('Không thể mở IndexedDB'));
      };

      request.onblocked = () => {
        blocked = true;
        reject(new Error('Thư viện đang được mở ở một phiên Lily cũ. Hãy đóng tab cũ rồi thử lại.'));
      };
    }).finally(() => { this.opening = null; });
    return this.opening;
  }
}
