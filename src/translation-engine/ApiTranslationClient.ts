// Model requests go through LilyHub, which authenticates the session and enforces quota.
import type { TranslatedChapterContent, TranslationProgress } from './TranslationWorkerClient';

const BUILD_ENV = import.meta.env || {};
export const TRANSLATE_API = (BUILD_ENV.VITE_LILYHUB_API_URL || (BUILD_ENV.DEV ? '/__lilyhub_api' : 'https://api.lilyhub.top')).replace(/\/$/, '');

// Server limits: 64 paragraphs / 24,000 characters per request. The server runs four batches
// at once (one core each), so four ~20-paragraph chunks in parallel finish a chapter fastest.
const RATE_LIMITED = 'Máy chủ dịch Lily đang bận vì có quá nhiều yêu cầu từ mạng của bạn. Vui lòng thử lại sau ít phút.';
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

async function translateChunk(modelId: string, paragraphs: string[], claimId: string, batchId: number): Promise<string[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${TRANSLATE_API}/api/reader/translate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, paragraphs, claimId, batchId }),
      });
      if (response.status === 401) throw new Error('Vui lòng đăng nhập LilyHub để dùng model Lily.');
      if (response.status === 403) throw new Error('Tài khoản chưa được cấp quyền dùng model này.');
      if (response.status === 429) throw new Error(RATE_LIMITED);
      if (response.status === 409) throw new Error('Lượt dịch đang xử lý hoặc đã được sử dụng. Vui lòng thử lại sau.');
      if (!response.ok) throw Object.assign(new Error(`Máy chủ dịch trả lỗi ${response.status}`), { status: response.status });
      const payload = await response.json();
      if (!Array.isArray(payload?.translations) || payload.translations.length !== paragraphs.length) {
        throw new Error('Máy chủ dịch trả kết quả không hợp lệ');
      }
      return payload.translations;
    } catch (error: any) {
      if (error?.message === RATE_LIMITED || /^(Vui lòng đăng nhập|Tài khoản chưa|Lượt dịch đang)/.test(error?.message || '') || (error?.status >= 400 && error?.status < 500)) throw error;
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
  onProgress?: (progress: TranslationProgress) => void,
  bookTitle?: string,
  claim?: string,
): Promise<TranslatedChapterContent> {
  if (!claim) throw new Error('Chưa xác nhận được lượt dịch. Vui lòng thử lại.');
  const hasBookTitle = typeof bookTitle === 'string';
  const items = hasBookTitle ? [bookTitle as string, title, ...paragraphs] : [title, ...paragraphs];
  const results = [...items];
  const chunks = chunkIndexes(items);
  let done = 0;
  let next = 0;
  onProgress?.({ stage: 'translating', done: 0, total_items: items.length });

  const run = async () => {
    while (next < chunks.length) {
      const batchId = next++;
      const indexes = chunks[batchId];
      const translated = await translateChunk(model, indexes.map(i => items[i]), claim, batchId);
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
