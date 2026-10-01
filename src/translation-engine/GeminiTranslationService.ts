import type { TranslationProgress, TranslatedChapterContent } from './TranslationWorkerClient';

const API_KEY_STORAGE = 'lily_gemini_api_key_v1';
const SETTINGS_STORAGE = 'lily_gemini_settings_v1';
const MEMORY_PREFIX = 'lily_gemini_story_memory_v1:';

export type GeminiStoryMode = 'auto' | 'modern' | 'modern-abo' | 'ancient' | 'ancient-abo';

export interface GeminiSettings {
  model: string;
  storyMode: GeminiStoryMode;
}

const DEFAULT_SETTINGS: GeminiSettings = {
  model: 'gemini-3.5-flash-lite',
  storyMode: 'auto',
};

const ALLOWED_MODELS = new Set(['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']);

interface GeminiMemory {
  notes: string;
  updatedAt: number;
}

interface TranslationItem {
  index: number;
  text: string;
}

interface GeminiPayload {
  translations: TranslationItem[];
  /** Only facts not already in the profile — rewriting the whole profile on every call doubled the output. */
  newNotes?: string;
  memoryNotes?: string;
}

const PROFILE_LIMIT = 3500;
/** Batches run side by side; free-tier keys allow ~15 requests/minute, so keep it small. */
const PARALLEL = 3;

export const GeminiLocalSettings = {
  getApiKey(): string {
    try { return localStorage.getItem(API_KEY_STORAGE)?.trim() || ''; } catch { return ''; }
  },
  setApiKey(value: string): void {
    try {
      const trimmed = value.trim();
      if (trimmed) localStorage.setItem(API_KEY_STORAGE, trimmed);
      else localStorage.removeItem(API_KEY_STORAGE);
    } catch {}
  },
  getSettings(): GeminiSettings {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETTINGS_STORAGE) || '{}');
      return {
        model: typeof parsed.model === 'string' && ALLOWED_MODELS.has(parsed.model)
          ? parsed.model
          : DEFAULT_SETTINGS.model,
        storyMode: ['auto', 'modern', 'modern-abo', 'ancient', 'ancient-abo'].includes(parsed.storyMode)
          ? parsed.storyMode
          : DEFAULT_SETTINGS.storyMode,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },
  setSettings(settings: GeminiSettings): void {
    const safeSettings = {
      ...settings,
      model: ALLOWED_MODELS.has(settings.model) ? settings.model : DEFAULT_SETTINGS.model,
    };
    try { localStorage.setItem(SETTINGS_STORAGE, JSON.stringify(safeSettings)); } catch {}
  },
};

const readMemory = (bookId: string): GeminiMemory => {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${MEMORY_PREFIX}${bookId}`) || '{}');
    return { notes: typeof parsed.notes === 'string' ? parsed.notes.slice(0, 6000) : '', updatedAt: Number(parsed.updatedAt) || 0 };
  } catch {
    return { notes: '', updatedAt: 0 };
  }
};

const writeMemory = (bookId: string, notes: string) => {
  try {
    localStorage.setItem(`${MEMORY_PREFIX}${bookId}`, JSON.stringify({ notes: notes.slice(0, 6000), updatedAt: Date.now() }));
  } catch {}
};

const modeInstruction: Record<GeminiStoryMode, string> = {
  auto: 'Tự nhận diện thời đại, bối cảnh và hệ thuật ngữ từ nguyên văn.',
  modern: 'Bối cảnh hiện đại. Dùng tiếng Việt tự nhiên, đương đại.',
  'modern-abo': 'Bối cảnh hiện đại ABO. Giữ Alpha, Beta, Omega, pheromone, tuyến thể và đánh dấu theo cách dùng hiện đại.',
  ancient: 'Bối cảnh cổ đại. Dùng nàng, ta, ngươi, khanh và tôn xưng cổ phong đúng thân phận; tuyệt đối không lẫn cô/tôi/cậu hiện đại.',
  'ancient-abo': 'Bối cảnh cổ đại ABO. Dùng Càn Nguyên, Khôn Trạch, Trung Dung, tín hương, kết khế và hệ xưng hô cổ phong phù hợp thân phận.',
};

const splitBatches = (items: TranslationItem[]): TranslationItem[][] => {
  const batches: TranslationItem[][] = [];
  let current: TranslationItem[] = [];
  let chars = 0;
  for (const item of items) {
    if (current.length && (current.length >= 30 || chars + item.text.length > 3500)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(item);
    chars += item.text.length;
  }
  if (current.length) batches.push(current);
  return batches;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function requestGemini(apiKey: string, model: string, prompt: string, notesField: 'newNotes' | 'memoryNotes' = 'newNotes'): Promise<GeminiPayload> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let lastError = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              translations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { index: { type: 'integer' }, text: { type: 'string' } },
                  required: ['index', 'text'],
                },
              },
              [notesField]: { type: 'string' },
            },
            required: ['translations', notesField],
          },
        },
      }),
    });
    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('') || '';
      if (!text) throw new Error('Gemini không trả về nội dung. Có thể yêu cầu bị bộ lọc an toà chặn.');
      return JSON.parse(text) as GeminiPayload;
    }
    const errorData = await response.json().catch(() => null);
    lastError = errorData?.error?.message || `HTTP ${response.status}`;
    if (response.status !== 429 && response.status < 500) break;
    await sleep((response.status === 429 ? 4000 : 1000) * (attempt + 1));
  }
  throw new Error(`Gemini API: ${lastError || 'không thể kết nối'}`);
}

const buildPrompt = (
  bookTitle: string,
  chapterTitle: string,
  chapterIndex: number,
  batch: TranslationItem[],
  settings: GeminiSettings,
  memory: string,
) => `Bạn là biên dịch viên tiểu thuyết bách hợp Trung–Việt chuyên nghiệp.

Mục tiêu bắt buộc:
- Dịch đủ 100% nội dung, không tóm tắt, không thêm, không bịa, không lược câu.
- Truyền đúng nghĩa, logic, sắc thái và chủ thể hành động. Không dịch máy theo từng chữ.
- Tiếng Việt phải mượt, tự nhiên như tiểu thuyết đã biên tập.
- Tên riêng, giới tính, vai vế, quan hệ và cách xưng hô phải nhất quán với HỒ SƠ DỊCH.
- Khi nguyên văn chưa đủ dữ kiện xác định quan hệ, dùng cách xưng hô trung tính; không tự gán chị–em.
- Phân biệt tên nhân vật với động từ liền sau tên. Dịch chính xác thành ngữ, tiếng lóng, thuật ngữ y khoa, giải trí, cung đình và ABO theo ngữ cảnh.
- Giữ nguyên ranh giới và thứ tự các đoạn. Mỗi index phải có đúng một bản dịch.

THỂ LOẠI: ${modeInstruction[settings.storyMode]}
TÊN TRUYỆN: ${bookTitle || '(chưa rõ)'}
CHƯƠNG ${chapterIndex}: ${chapterTitle || '(không tiêu đề)'}

HỒ SƠ DỊCH CỤC BỘ TỪ CÁC CHƯƠNG TRƯỚC:
${memory || '(chưa có; hãy tạo từ nội dung này)'}

NGUYÊN VĂN CẦN DỊCH, dạng JSON:
${JSON.stringify(batch)}

Trả về translations đủ đúng ${batch.length} index. newNotes chỉ ghi điều MỚI chưa có trong HỒ SƠ DỊCH (tên Hán–Việt, giới tính, vai vế, quan hệ, cặp xưng hô hai chiều, thuật ngữ), mỗi ý một dòng, tối đa 600 ký tự; không có gì mới thì để chuỗi rỗng.`;

/** Profile grew past the limit: one background call condenses it, translation never waits on this. */
const compactProfile = (apiKey: string, model: string, bookId: string, notes: string) => {
  const prompt = `Rút gọn HỒ SƠ DỊCH dưới đây còn tối đa ${PROFILE_LIMIT} ký tự. Giữ mọi tên Hán–Việt, giới tính, vai vế, quan hệ, cặp xưng hô và thuật ngữ; bỏ ý trùng, tóm tắt mạch truyện thật ngắn. Trả về translations là mảng rỗng, memoryNotes là hồ sơ đã rút gọn.

HỒ SƠ DỊCH:
${notes}`;
  requestGemini(apiKey, model, prompt, 'memoryNotes')
    .then(result => { if (result.memoryNotes?.trim()) writeMemory(bookId, result.memoryNotes.trim()); })
    .catch(() => {});
};

export class GeminiTranslationService {
  static async testConnection(): Promise<string> {
    const key = GeminiLocalSettings.getApiKey();
    if (!key) throw new Error('Hãy nhập Gemini API key.');
    const settings = GeminiLocalSettings.getSettings();
    const result = await requestGemini(key, settings.model, 'Trả về JSON có translations là mảng rỗng và memoryNotes là "OK".', 'memoryNotes');
    return result.memoryNotes || 'OK';
  }

  static async translateChapter(
    bookId: string,
    chapterIndex: number,
    bookTitle: string,
    chapterTitle: string,
    paragraphs: string[],
    onProgress?: (progress: TranslationProgress) => void,
  ): Promise<TranslatedChapterContent> {
    const apiKey = GeminiLocalSettings.getApiKey();
    if (!apiKey) throw new Error('Chưa có Gemini API key. Hãy mở cài đặt Gemini trong bảng dịch.');
    const settings = GeminiLocalSettings.getSettings();
    const memory = readMemory(bookId);
    const sourceItems = [chapterTitle, ...paragraphs].map((text, index) => ({ index, text }));
    const batches = splitBatches(sourceItems);
    const output = new Map<number, string>();
    let notes = memory.notes;
    const newNotes: string[] = [];
    let done = 0;

    const run = async (batch: TranslationItem[]) => {
      const prompt = buildPrompt(bookTitle, chapterTitle, chapterIndex, batch, settings, notes);
      const payload = await requestGemini(apiKey, settings.model, prompt);
      const received = new Map(payload.translations.map(item => [item.index, item.text?.trim()]));
      for (const item of batch) {
        const translated = received.get(item.index);
        if (!translated) throw new Error(`Gemini bỏ sót đoạn ${item.index}. Vui lòng bấm dịch lại.`);
        output.set(item.index, translated);
      }
      if (payload.newNotes?.trim()) newNotes.push(payload.newNotes.trim());
      done += batch.length;
      onProgress?.({ stage: 'translating', done, total_items: sourceItems.length });
    };

    // A book's first chapter has no profile yet: translate one batch alone so the parallel ones
    // share its names instead of each inventing their own.
    let queue = batches;
    if (!notes && batches.length > 1) {
      await run(batches[0]);
      notes = newNotes.join('\n');
      queue = batches.slice(1);
    }
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, async () => {
      while (next < queue.length) await run(queue[next++]);
    }));

    const known = new Set(memory.notes.split('\n').map(line => line.trim()).filter(Boolean));
    const added = newNotes.flatMap(block => block.split('\n')).map(line => line.trim()).filter(line => line && !known.has(line));
    const merged = [memory.notes, ...new Set(added)].filter(Boolean).join('\n');
    writeMemory(bookId, merged);
    if (merged.length > PROFILE_LIMIT) compactProfile(apiKey, settings.model, bookId, merged);
    return {
      title: output.get(0) || chapterTitle,
      paragraphs: paragraphs.map((_, index) => output.get(index + 1) || ''),
      bookTitle: undefined,
    };
  }
}
