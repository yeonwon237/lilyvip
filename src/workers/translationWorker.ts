// Runs @huggingface/transformers translation pipelines off the main thread so a long
// chapter never freezes the reader UI. Mirrors the request/response style of
// piperTtsWorker.ts, but streams per-paragraph progress instead of a single result.
import { pipeline, TranslationPipeline } from '@huggingface/transformers';

interface TranslateRequest {
  id: number;
  hfRepo: string;
  paragraphs: string[];
}

const pipelines = new Map<string, Promise<TranslationPipeline>>();

function loadPipeline(hfRepo: string, onProgress: (loaded: number, total: number) => void): Promise<TranslationPipeline> {
  let loading = pipelines.get(hfRepo);
  if (!loading) {
    loading = pipeline('translation', hfRepo, {
      device: 'wasm',
      progress_callback: (info: any) => {
        if (info?.status === 'progress' && typeof info.loaded === 'number' && typeof info.total === 'number') {
          onProgress(info.loaded, info.total);
        }
      },
    }) as Promise<TranslationPipeline>;
    loading.catch(() => pipelines.delete(hfRepo));
    pipelines.set(hfRepo, loading);
  }
  return loading;
}

self.onmessage = async (event: MessageEvent<TranslateRequest>) => {
  const { id, hfRepo, paragraphs } = event.data;

  try {
    const model = await loadPipeline(hfRepo, (loaded, total) => {
      (self as any).postMessage({ id, type: 'model-progress', loaded, total });
    });

    const results: string[] = [];
    for (let i = 0; i < paragraphs.length; i++) {
      const text = paragraphs[i];

      if (!text || !text.trim()) {
        results.push(text);
        (self as any).postMessage({ id, type: 'paragraph', index: i, total: paragraphs.length });
        continue;
      }

      const output: any = await model(text);
      const translated = Array.isArray(output) ? output[0]?.translation_text : output?.translation_text;
      const finalText = typeof translated === 'string' && translated.length > 0 ? translated : text;
      results.push(finalText);
      (self as any).postMessage({ id, type: 'paragraph', index: i, total: paragraphs.length });
    }

    (self as any).postMessage({ id, type: 'done', paragraphs: results });
  } catch (err: any) {
    (self as any).postMessage({ id, type: 'error', message: err?.message || 'Lỗi khi dịch chương' });
  }
};
