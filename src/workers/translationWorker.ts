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

/** Some source chapters (e.g. ABO-genre novels) splice Latin words/digits directly against
 *  CJK characters with no separator ("S級alpha", "23歲"). The tokenizer for these zh-vi
 *  models is trained almost exclusively on pure-CJK text, so an unseparated CJK/Latin
 *  boundary can desync its tokenization and corrupt translation for the rest of the
 *  sentence (garbled word order, mangled digits). Inserting a space at the boundary keeps
 *  the Latin run as its own token without changing the CJK content the model sees. */
function normalizeMixedScript(text: string): string {
  return text
    .replace(/([㐀-鿿豈-﫿])([a-zA-Z0-9])/g, '$1 $2')
    .replace(/([a-zA-Z0-9])([㐀-鿿豈-﫿])/g, '$1 $2');
}

/** ABO-genre "rank + designation" terms (S級alpha, A級omega, ...): confirmed (by running
 *  the base checkpoint directly, outside this app) that the model mistranslates or drops
 *  these regardless of decoding settings — it never learned them. The reference desktop
 *  app (edittruyenqt) sidesteps this the same way: lock known terms out to a placeholder
 *  before translation, then splice the fixed Vietnamese rendering back in afterward, so
 *  the model never has to translate the term itself. */
const ABO_GLOSSARY: { source_term: string; translation: string }[] = (() => {
  const ranks = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D'];
  const types = ['alpha', 'Alpha', 'ALPHA', 'beta', 'Beta', 'BETA', 'omega', 'Omega', 'OMEGA'];
  const terms: { source_term: string; translation: string }[] = [];
  for (const rank of ranks) {
    for (const type of types) {
      terms.push({ source_term: `${rank}級${type}`, translation: `${type.toLowerCase()} cấp ${rank}` });
    }
    terms.push({ source_term: `${rank}級`, translation: `cấp ${rank}` });
  }
  return terms;
})();

/** Replaces known glossary terms with numbered placeholders ("[0]", "[1]", ...) before
 *  translation, longest term first so e.g. "S級alpha" matches whole rather than as "S級". */
function lockGlossary(text: string): { locked: string; placeholders: string[] } {
  const sorted = [...ABO_GLOSSARY].sort((a, b) => b.source_term.length - a.source_term.length);
  const placeholders: string[] = [];
  let out = '';
  let i = 0;
  outer: while (i < text.length) {
    for (const term of sorted) {
      if (text.startsWith(term.source_term, i)) {
        out += `[${placeholders.length}]`;
        placeholders.push(term.translation);
        i += term.source_term.length;
        continue outer;
      }
    }
    out += text[i];
    i += 1;
  }
  return { locked: out, placeholders };
}

/** Splices the locked terms' fixed translations back in, and un-capitalizes the word right
 *  after a placeholder that sat at the very start of the text (the model treats the
 *  placeholder token itself as sentence-start and capitalizes what follows it). */
function unlockGlossary(text: string, placeholders: string[]): string {
  const startedWithPlaceholder = /^\s*\[\s*0\s*\]/.test(text);
  let out = text.replace(/\[\s*(\d+)\s*\]/g, (match, idx) => {
    const term = placeholders[Number(idx)];
    return term === undefined ? match : term;
  });
  const lead = placeholders[0];
  if (startedWithPlaceholder && lead && out.startsWith(lead)) {
    const rest = out.slice(lead.length);
    const fixedRest = rest.replace(/^(\s+)([A-ZÀ-Ỹ])/, (m, space, c) => space + c.toLowerCase());
    out = lead + fixedRest;
  }
  return out;
}

/** Translates one batch, skipping/preserving blank entries so the model never sees empty input. */
async function translateBatch(model: TranslationPipeline, texts: string[]): Promise<string[]> {
  const nonEmptyIndexes: number[] = [];
  const nonEmptyTexts: string[] = [];
  const locksByIndex = new Map<number, string[]>();
  texts.forEach((text, i) => {
    if (text && text.trim()) {
      const { locked, placeholders } = lockGlossary(text);
      if (placeholders.length) locksByIndex.set(i, placeholders);
      nonEmptyIndexes.push(i);
      nonEmptyTexts.push(normalizeMixedScript(locked));
    }
  });

  const results = [...texts];
  if (nonEmptyTexts.length === 0) return results;

  const output: any = await model(nonEmptyTexts);
  const outputArray = Array.isArray(output) ? output : [output];
  nonEmptyIndexes.forEach((originalIndex, i) => {
    const translated = outputArray[i]?.translation_text;
    if (typeof translated !== 'string' || translated.length === 0) {
      results[originalIndex] = texts[originalIndex];
      return;
    }
    const placeholders = locksByIndex.get(originalIndex);
    results[originalIndex] = placeholders ? unlockGlossary(translated, placeholders) : translated;
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
