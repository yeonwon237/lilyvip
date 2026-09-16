// Caches translated chapter text locally so re-opening a chapter doesn't re-run the model.
// A separate small IndexedDB rather than a bump of the main library schema, with an
// in-memory fallback so a blocked/unavailable DB never blocks reading.

const DB_NAME = 'LilyVIP_TranslationCache_v1';
const DB_VERSION = 1;
const STORE_NAME = 'translations';

export interface CachedTranslation {
  title: string;
  paragraphs: string[];
  cachedAt: number;
}

export const buildTranslationCacheKey = (
  bookId: string,
  chapterIndex: number,
  modelId: string
): string => `${bookId}:${chapterIndex}:${modelId}`;

const memoryStore = new Map<string, CachedTranslation>();

const withTimeout = <T>(operation: Promise<T>): Promise<T> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Translation cache timed out')), 1000);
  operation.then(resolve, reject).finally(() => clearTimeout(timer));
});

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    const timer = setTimeout(() => reject(new Error('Translation cache opening timed out')), 1000);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      clearTimeout(timer);
      const db = request.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    request.onerror = () => { clearTimeout(timer); reject(request.error || new Error('Translation cache opening failed')); };
    request.onblocked = () => { clearTimeout(timer); reject(new Error('Translation cache opening blocked')); };
  }).catch(err => {
    dbPromise = null;
    throw err;
  });

  return dbPromise;
};

const hasIndexedDB = () => {
  try {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  } catch {
    return false;
  }
};

export class TranslationCache {
  static async get(key: string): Promise<CachedTranslation | null> {
    if (!hasIndexedDB()) return memoryStore.get(key) ?? null;

    try {
      const db = await openDB();
      return await withTimeout(new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      }));
    } catch (err) {
      console.warn('[TranslationCache] get error, falling back to memory:', err);
      return memoryStore.get(key) ?? null;
    }
  }

  static async set(key: string, value: CachedTranslation): Promise<void> {
    if (!hasIndexedDB()) { memoryStore.set(key, value); return; }

    try {
      const db = await openDB();
      await withTimeout(new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }));
    } catch (err) {
      console.warn('[TranslationCache] set error, falling back to memory:', err);
      memoryStore.set(key, value);
    }
  }
}
