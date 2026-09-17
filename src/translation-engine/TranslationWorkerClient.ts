export interface TranslationProgress {
  stage: 'loading-model' | 'translating';
  loaded?: number;
  total?: number;
  /** Items (title + paragraphs) translated so far / total, once translation is underway. */
  done?: number;
  total_items?: number;
}

export interface TranslatedChapterContent {
  title: string;
  paragraphs: string[];
  bookTitle?: string;
}

let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<number, {
  onProgress?: (progress: TranslationProgress) => void;
  resolve: (result: TranslatedChapterContent) => void;
  reject: (error: Error) => void;
}>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('../workers/translationWorker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event) => {
    const data = event.data;
    const request = pending.get(data?.id);
    if (!request) return;

    if (data.type === 'model-progress') {
      request.onProgress?.({ stage: 'loading-model', loaded: data.loaded, total: data.total });
    } else if (data.type === 'progress') {
      request.onProgress?.({ stage: 'translating', done: data.done, total_items: data.total });
    } else if (data.type === 'done') {
      pending.delete(data.id);
      request.resolve({ title: data.title, paragraphs: data.paragraphs, bookTitle: data.bookTitle });
    } else if (data.type === 'error') {
      pending.delete(data.id);
      request.reject(new Error(data.message));
    }
  };
  worker.onerror = () => {
    for (const request of pending.values()) request.reject(new Error('Bộ dịch đã dừng ngoài ý muốn'));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

export function translateChapterContent(
  title: string,
  paragraphs: string[],
  hfRepo: string,
  onProgress?: (progress: TranslationProgress) => void,
  bookTitle?: string
): Promise<TranslatedChapterContent> {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { onProgress, resolve, reject });
    try {
      getWorker().postMessage({ id, hfRepo, title, paragraphs, bookTitle });
    } catch (error: any) {
      pending.delete(id);
      reject(error);
    }
  });
}

export function terminateTranslationWorker(): void {
  worker?.terminate();
  worker = null;
  for (const request of pending.values()) request.reject(new Error('Đã dừng dịch'));
  pending.clear();
}
