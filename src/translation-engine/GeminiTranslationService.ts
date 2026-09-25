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
  model: 'gemini-3.8-flash',
  storyMode: 'auto',
};

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
  memoryNotes: string;
}

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
        model: typeof parsed.model === 'string' ? parsed.model : DEFAULT_SETTINGS.model,
        storyMode: ['auto', 'modern', 'modern-abo', 'ancient', 'ancient-abo'].includes(parsed.storyMode)
          ? parsed.storyMode
          : DEFAULT_SETTINGS.storyMode,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },
  setSettings(settings: GeminiSettings): void {
    try { localStorage.setItem(SETTINGS_STORAGE, JSON.stringify(settings)); } catch {}
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
    if (current.length && (current.length >= 12 || chars + item.text.length > 6500)) {
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

async function requestGemini(apiKey: string, model: string, prompt: string): Promise<GeminiPayload> {
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
              memoryNotes: { type: 'string' },
            },
            required: ['translations', 'memoryNotes'],
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
    await sleep(1000 * (attempt + 1));
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
  previousVietnamese: string,
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

ĐOẠN DỊCH LIỀN TRƯỚC TRONG CHƯƠNG (chỉ để nối mạch, không dịch lại):
${previousVietnamese || '(không có)'}

NGUYÊN VĂN CẦN DỊCH, dạng JSON:
${JSON.stringify(batch)}

Trả về translations đủ đúng ${batch.length} index. memoryNotes là hồ sơ ngắn gọn tối đa 3500 ký tự, chỉ ghi sự thật đã xác nhận: tên Hán–Việt, giới tính, vai vế, quan hệ, cặp xưng hô hai chiều, thuật ngữ và tóm tắt mạch truyện. Giữ lại thông tin cũ còn đúng.`;

export class GeminiTranslationService {
  static async testConnection(): Promise<string> {
    const key = GeminiLocalSettings.getApiKey();
    if (!key) throw new Error('Hãy nhập Gemini API key.');
    const settings = GeminiLocalSettings.getSettings();
    const result = await requestGemini(key, settings.model, 'Trả về JSON có translations là mảng rỗng và memoryNotes là "OK".');
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
    let previousVietnamese = '';
    let done = 0;

    for (const batch of batches) {
      const prompt = buildPrompt(bookTitle, chapterTitle, chapterIndex, batch, settings, notes, previousVietnamese);
      const payload = await requestGemini(apiKey, settings.model, prompt);
      const received = new Map(payload.translations.map(item => [item.index, item.text?.trim()]));
      for (const item of batch) {
        const translated = received.get(item.index);
        if (!translated) throw new Error(`Gemini bỏ sót đoạn ${item.index}. Vui lòng bấm dịch lại.`);
        output.set(item.index, translated);
      }
      notes = payload.memoryNotes?.trim() || notes;
      previousVietnamese = batch.map(item => output.get(item.index)).join('\n').slice(-2500);
      done += batch.length;
      onProgress?.({ stage: 'translating', done, total_items: sourceItems.length });
    }

    writeMemory(bookId, notes);
    return {
      title: output.get(0) || chapterTitle,
      paragraphs: paragraphs.map((_, index) => output.get(index + 1) || ''),
      bookTitle: undefined,
    };
  }
}
