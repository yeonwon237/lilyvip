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
import { Converter } from 'opencc-js/t2cn';

interface TranslateRequest {
  id: number;
  hfRepo: string;
  inputMode?: 'default' | 'lilymt-modern-block' | 'lilymt-ancient-sentence';
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
      dtype: 'q8',
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

/** These zh-vi checkpoints are trained almost exclusively on Simplified Chinese webnovel
 *  text. Chapters scraped from Traditional-script sources (Taiwan/HK-style raws) feed the
 *  model characters it barely saw in training — confirmed by running the base checkpoint
 *  directly, outside this app: identical Traditional input consistently mistranslates or
 *  drops words (e.g. "S級alpha，時年23歲" → "...alpha Star... 230 tuổi..."), while
 *  converting to Simplified first ("S级alpha，时年23岁") produces a correct translation.
 *  Building the converter loads its dictionary once, not per call. */
const toSimplified = Converter({ from: 't', to: 'cn' });
const SENTENCE_END = /[^。！？？」』”]+[。！？？」』”]*/g;

/** Some source chapters (e.g. ABO-genre novels) splice Latin words/digits directly against
 *  CJK characters with no separator ("S级alpha", "23岁"). The tokenizer for these zh-vi
 *  models is trained almost exclusively on pure-CJK text, so an unseparated CJK/Latin
 *  boundary can desync its tokenization and corrupt translation for the rest of the
 *  sentence (garbled word order, mangled digits). Inserting a space at the boundary keeps
 *  the Latin run as its own token without changing the CJK content the model sees. */
function normalizeMixedScript(text: string): string {
  return text
    .replace(/([㐀-鿿豈-﫿])([a-zA-Z0-9])/g, '$1 $2')
    .replace(/([a-zA-Z0-9])([㐀-鿿豈-﫿])/g, '$1 $2');
}

/** Translates one batch, skipping/preserving blank entries so the model never sees empty input. */
function splitChineseSentences(text: string): string[] {
  return text.match(SENTENCE_END)?.map(part => part.trim()).filter(Boolean) || (text.trim() ? [text.trim()] : []);
}

function ancientSentenceInputs(text: string): string[] {
  const sentences = splitChineseSentences(toSimplified(text));
  return sentences.map(sentence => normalizeMixedScript(sentence));
}

async function translateBatch(
  model: TranslationPipeline,
  texts: string[],
  inputMode: 'default' | 'lilymt-modern-block' | 'lilymt-ancient-sentence' = 'default',
): Promise<string[]> {
  if (inputMode === 'lilymt-ancient-sentence') {
    const promptsByItem = texts.map(text => text?.trim() ? ancientSentenceInputs(text) : []);
    const prompts = promptsByItem.flat();
    if (prompts.length === 0) return [...texts];
    const raw: any = await model(prompts, {
      num_beams: 2,
      repetition_penalty: 1.2,
      max_new_tokens: 300,
      early_stopping: true,
      do_sample: false,
    });
    const translated = (Array.isArray(raw) ? raw : [raw]).map(
      result => typeof result?.translation_text === 'string' ? result.translation_text : '',
    );
    let cursor = 0;
    return promptsByItem.map((itemPrompts, itemIndex) => {
      if (itemPrompts.length === 0) return texts[itemIndex];
      const parts = translated.slice(cursor, cursor + itemPrompts.length);
      cursor += itemPrompts.length;
      return parts.some(Boolean) ? parts.filter(Boolean).join(' ') : texts[itemIndex];
    });
  }
  const nonEmptyIndexes: number[] = [];
  const nonEmptyTexts: string[] = [];
  texts.forEach((text, i) => {
    if (text && text.trim()) {
      nonEmptyIndexes.push(i);
      nonEmptyTexts.push(normalizeMixedScript(toSimplified(text)));
    }
  });

  const results = [...texts];
  if (nonEmptyTexts.length === 0) return results;

  // beam=2 (the reference desktop app's own default for this model — see edittruyenqt's
  // tools/nmt/server.py MODEL_CONFIGS) instead of the default greedy (num_beams=1): with
  // int8-quantized weights, greedy picks the single argmax token at each step, so a
  // close call between two candidates (e.g. "phút" vs "điểm" for "分") can flip either
  // way on tiny floating-point differences between runtimes. A small beam is far less
  // sensitive to that single-token noise.
  const output: any = await model(nonEmptyTexts, {
    num_beams: 2,
    repetition_penalty: inputMode === 'lilymt-modern-block' ? 1.2 : undefined,
    max_new_tokens: inputMode === 'lilymt-modern-block' ? 300 : undefined,
    early_stopping: inputMode === 'lilymt-modern-block' ? true : undefined,
    do_sample: false,
  });
  const outputArray = Array.isArray(output) ? output : [output];
  nonEmptyIndexes.forEach((originalIndex, i) => {
    const translated = outputArray[i]?.translation_text;
    results[originalIndex] = typeof translated === 'string' && translated.length > 0 ? translated : texts[originalIndex];
  });
  return results;
}

self.onmessage = async (event: MessageEvent<TranslateRequest>) => {
  const { id, hfRepo, inputMode = 'default', title, paragraphs, bookTitle } = event.data;
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
      const translatedBatch = await translateBatch(model, batch, inputMode);
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
