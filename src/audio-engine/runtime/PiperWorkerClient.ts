let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<number, { resolve: (blob: Blob) => void; reject: (error: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('../../workers/piperTtsWorker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event) => {
    const request = pending.get(event.data?.id); if (!request) return;
    pending.delete(event.data.id);
    if (event.data.error) request.reject(new Error(event.data.error)); else request.resolve(event.data.wav);
  };
  worker.onerror = () => {
    for (const request of pending.values()) request.reject(new Error('Bộ tạo giọng đã dừng ngoài ý muốn'));
    pending.clear(); worker?.terminate(); worker = null;
  };
  return worker;
}

export function predictPiper(text: string, voiceId: string, modelPath: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const id = ++requestId; pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, text, voiceId, modelPath });
  });
}

export function terminatePiperWorker(): void {
  worker?.terminate(); worker = null;
  for (const request of pending.values()) request.reject(new Error('Đã dừng tạo giọng'));
  pending.clear();
}
