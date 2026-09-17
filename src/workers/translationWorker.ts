// Runs @huggingface/transformers translation pipelines off the main thread so a long
// chapter never freezes the reader UI. Mirrors the request/response style of
// piperTtsWorker.ts, but streams per-batch progress instead of a single result.
//
// Texts are translated in small batches (title + paragraphs together) rather than one
// call per paragraph: each model() call has fixed overhead in WASM, so batching cuts
// the number of calls roughly 8x for a typical chapter, which is the single biggest
// lever available without touching cross-origin isolation (multi-threaded WASM needs
// COOP/COEP headers, which would also affect the website-importer's cross-origin
// fetches — out of scope for this pass).
import { pipeline, TranslationPipeline } from '@huggingface/transformers';

interface TranslateRequest {
  id: number;
  hfRepo: string;
  title: string;
  paragraphs: string[];
  /** Only sent the first time a given book/model is translated — cached by the caller
   *  after that, so it isn't re-sent (and re-translated) on every chapter. */
  bookTitle?: string;
}

const BATCH_SIZE = 8;

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

/** Translates one batch, skipping/preserving blank entries so the model never sees empty input. */
async function translateBatch(model: TranslationPipeline, texts: string[]): Promise<string[]> {
  const nonEmptyIndexes: number[] = [];
  const nonEmptyTexts: string[] = [];
  texts.forEach((text, i) => {
    if (text && text.trim()) {
      nonEmptyIndexes.push(i);
      nonEmptyTexts.push(text);
    }
  });

  const results = [...texts];
  if (nonEmptyTexts.length === 0) return results;

  const output: any = await model(nonEmptyTexts);
  const outputArray = Array.isArray(output) ? output : [output];
  nonEmptyIndexes.forEach((originalIndex, i) => {
    const translated = outputArray[i]?.translation_text;
    results[originalIndex] = typeof translated === 'string' && translated.length > 0 ? translated : texts[originalIndex];
  });
  return results;
}

self.onmessage = async (event: MessageEvent<TranslateRequest>) => {
  const { id, hfRepo, title, paragraphs, bookTitle } = event.data;
  const hasBookTitle = typeof bookTitle === 'string';

  try {
    const model = await loadPipeline(hfRepo, (loaded, total) => {
      (self as any).postMessage({ id, type: 'model-progress', loaded, total });
    });

    // Chapter title (and book title, when included) travel through the same batched
    // pipeline as the paragraphs — they're just more short strings to the model.
    const items = hasBookTitle ? [bookTitle as string, title, ...paragraphs] : [title, ...paragraphs];
    const results: string[] = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const translatedBatch = await translateBatch(model, batch);
      results.push(...translatedBatch);
      (self as any).postMessage({ id, type: 'progress', done: results.length, total: items.length });
    }

    const [translatedBookTitle, translatedTitle, ...translatedParagraphs] = hasBookTitle
      ? results
      : [undefined, ...results];

    (self as any).postMessage({
      id,
      type: 'done',
      bookTitle: translatedBookTitle,
      title: translatedTitle,
      paragraphs: translatedParagraphs,
    });
  } catch (err: any) {
    (self as any).postMessage({ id, type: 'error', message: err?.message || 'Lỗi khi dịch chương' });
  }
};
