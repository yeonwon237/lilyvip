export interface TranslationProgress {
  stage: 'loading-model' | 'translating';
  loaded?: number;
  total?: number;
  paragraphIndex?: number;
  paragraphCount?: number;
}

let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<number, {
  onProgress?: (progress: TranslationProgress) => void;
  resolve: (paragraphs: string[]) => void;
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
    } else if (data.type === 'paragraph') {
      request.onProgress?.({ stage: 'translating', paragraphIndex: data.index, paragraphCount: data.total });
    } else if (data.type === 'done') {
      pending.delete(data.id);
      request.resolve(data.paragraphs);
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

export function translateParagraphs(
  paragraphs: string[],
  hfRepo: string,
  onProgress?: (progress: TranslationProgress) => void
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { onProgress, resolve, reject });
    try {
      getWorker().postMessage({ id, hfRepo, paragraphs });
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
