// Chapter translation on Lily's own translate API (VPS, CTranslate2) instead of in the browser.
// Same preprocessing / decoding as the on-device V20 path and the desktop comparison tool;
// the server does it (training/v20/vps/server.py). Access uses the same per-device license
// as the private model files (ModelLicense), which the API checks with the models Worker.
import type { ModelAuth } from './ModelLicense';
import { MODEL_LICENSE_REQUIRED } from './ModelLicense';
import type { TranslatedChapterContent, TranslationProgress } from './TranslationWorkerClient';

const BUILD_ENV = import.meta.env || {};
export const TRANSLATE_API = (BUILD_ENV.VITE_LILY_TRANSLATE_API_URL || 'https://158-178-235-239.sslip.io').replace(/\/$/, '');

// Server limits: 64 paragraphs / 24,000 characters per request. The server runs four batches
// at once (one core each), so four ~20-paragraph chunks in parallel finish a chapter fastest.
const CHUNK_ITEMS = 20;
const CHUNK_CHARS = 6000;
const PARALLEL = 4;

function chunkIndexes(items: string[]): number[][] {
  const chunks: number[][] = [];
  let current: number[] = [];
  let chars = 0;
  items.forEach((text, index) => {
    const size = text.length;
    if (current.length && (current.length >= CHUNK_ITEMS || chars + size > CHUNK_CHARS)) {
      chunks.push(current);
      current = [];
      chars = 0;
    }
    current.push(index);
    chars += size;
  });
  if (current.length) chunks.push(current);
  return chunks;
}

async function translateChunk(model: string, paragraphs: string[], auth: ModelAuth): Promise<string[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${TRANSLATE_API}/v1/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lily-License': auth.license,
          'X-Lily-Device': auth.device,
          'X-Lily-Account': auth.account,
        },
        body: JSON.stringify({ model, paragraphs }),
      });
      if (response.status === 401) throw new Error(MODEL_LICENSE_REQUIRED);
      if (!response.ok) throw new Error(`Máy chủ dịch trả lỗi ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload?.translations) || payload.translations.length !== paragraphs.length) {
        throw new Error('Máy chủ dịch trả kết quả không hợp lệ');
      }
      return payload.translations;
    } catch (error: any) {
      if (error?.message === MODEL_LICENSE_REQUIRED) throw error;
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw new Error(`Không kết nối được máy chủ dịch Lily. ${(lastError as any)?.message || ''}`.trim());
}

export async function translateChapterViaApi(
  title: string,
  paragraphs: string[],
  model: string,
  auth: ModelAuth,
  onProgress?: (progress: TranslationProgress) => void,
  bookTitle?: string,
): Promise<TranslatedChapterContent> {
  const hasBookTitle = typeof bookTitle === 'string';
  const items = hasBookTitle ? [bookTitle as string, title, ...paragraphs] : [title, ...paragraphs];
  const results = [...items];
  const chunks = chunkIndexes(items);
  let done = 0;
  let next = 0;
  onProgress?.({ stage: 'translating', done: 0, total_items: items.length });

  const run = async () => {
    while (next < chunks.length) {
      const indexes = chunks[next++];
      const translated = await translateChunk(model, indexes.map(i => items[i]), auth);
      indexes.forEach((itemIndex, i) => { results[itemIndex] = translated[i]; });
      done += indexes.length;
      onProgress?.({ stage: 'translating', done, total_items: items.length });
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, chunks.length) }, run));

  const offset = hasBookTitle ? 1 : 0;
  return {
    bookTitle: hasBookTitle ? results[0] : undefined,
    title: results[offset],
    paragraphs: results.slice(offset + 1),
  };
}
