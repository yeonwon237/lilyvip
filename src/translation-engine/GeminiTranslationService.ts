import type { TranslationProgress, TranslatedChapterContent } from './TranslationWorkerClient';
import { mergeLearned, profileForPrompt, StoryCharacter, StoryAddress, StoryProfiles } from './GeminiStoryProfile';

const API_KEY_STORAGE = 'lily_gemini_api_key_v1';
const SETTINGS_STORAGE = 'lily_gemini_settings_v1';

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

/** Batches run side by side; free-tier keys allow ~15 requests/minute, so keep it small. */
const PARALLEL = 3;

interface TranslationItem {
  index: number;
  text: string;
}

interface GeminiPayload {
  translations: TranslationItem[];
  /** Only what this batch taught: new characters, address pairs and terms — never the whole profile. */
  characters?: Partial<StoryCharacter>[];
  addresses?: Partial<StoryAddress>[];
  newNotes?: string;
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

const modeInstruction: Record<GeminiStoryMode, string> = {
  auto: 'Tự nhận diện thời đại, bối cảnh và hệ thuật ngữ từ nguyên văn.',
  modern: 'Bối cảnh hiện đại. Dùng tiếng Việt tự nhiên, đương đại.',
  'modern-abo': 'Bối cảnh hiện đại ABO. Giữ Alpha, Beta, Omega, pheromone, tuyến thể và đánh dấu theo cách dùng hiện đại.',
  ancient: 'Bối cảnh cổ đại. Dùng nàng, ta, ngươi, khanh và tôn xưng cổ phong đúng thân phận; tuyệt đối không lẫn cô/tôi/cậu hiện đại.',
  'ancient-abo': 'Bối cảnh cổ đại ABO. Dùng Càn Nguyên, Khôn Trạch, Trung Dung, tín hương, kết khế và hệ xưng hô cổ phong phù hợp thân phận.',
};

/** Ngôi thứ ba mặc định khi bảng chưa ghi riêng cho nhân vật — cổ đại lẫn hiện đại đều nàng (user 01/10). */
const DEFAULT_PRONOUNS = '她 → nàng, 他 → hắn (cả truyện hiện đại lẫn cổ đại)';

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

const RESPONSE_SCHEMA = {
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
    characters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          zh: { type: 'string' },
          vi: { type: 'string' },
          gender: { type: 'string', enum: ['nữ', 'nam', '?'] },
          pronoun: { type: 'string' },
        },
        required: ['zh', 'vi', 'gender', 'pronoun'],
      },
    },
    addresses: {
      type: 'array',
      items: {
        type: 'object',
        properties: { from: { type: 'string' }, to: { type: 'string' }, self: { type: 'string' }, call: { type: 'string' } },
        required: ['from', 'to', 'self', 'call'],
      },
    },
    newNotes: { type: 'string' },
  },
  required: ['translations', 'characters', 'addresses', 'newNotes'],
};

async function requestGemini(apiKey: string, model: string, prompt: string): Promise<GeminiPayload> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let lastError = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
      }),
    });
    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('') || '';
      if (!text) throw new Error('Gemini không trả về nội dung. Có thể yêu cầu bị bộ lọc an toàn chặn.');
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
  profileText: string,
) => `Bạn là biên dịch viên tiểu thuyết Trung–Việt chuyên nghiệp.

Mục tiêu bắt buộc:
- Dịch đủ 100% nội dung, không tóm tắt, không thêm, không bịa, không lược câu.
- Truyền đúng nghĩa, logic, sắc thái và chủ thể hành động. Không dịch máy theo từng chữ.
- Tiếng Việt phải mượt, tự nhiên như tiểu thuyết đã biên tập.
- Giữ nguyên ranh giới và thứ tự các đoạn. Mỗi index phải có đúng một bản dịch.

GIỚI TÍNH VÀ ĐẠI TỪ (sai là lỗi nặng nhất):
- 她 luôn là NỮ, 他 luôn là NAM, 它 là "nó". Không bao giờ đổi giới tính so với nguyên văn.
- Nhân vật nữ (kể cả Alpha, Càn Nguyên, nữ tổng tài, nữ cảnh sát…) KHÔNG BAO GIỜ được gọi là hắn, gã, anh ta, anh ấy, y, lão.
- Nhân vật nam KHÔNG được gọi là nàng, cô ấy, cô ta, ả.
- Ngôi thứ ba mặc định: ${DEFAULT_PRONOUNS}. Nhân vật có ghi "ngôi thứ ba" trong bảng thì dùng đúng từ đó.
- Câu lược chủ ngữ: suy ra từ đoạn trước; không chắc thì dùng tên nhân vật thay vì đoán đại từ.
- Tự xưng / gọi nhau trong hội thoại phải theo đúng mục XƯNG HÔ; cặp chưa có trong bảng thì chọn theo quan hệ, vai vế và giữ cố định.

THỂ LOẠI: ${modeInstruction[settings.storyMode]}
TÊN TRUYỆN: ${bookTitle || '(chưa rõ)'}
CHƯƠNG ${chapterIndex}: ${chapterTitle || '(không tiêu đề)'}

BẢNG XƯNG HÔ CỦA TRUYỆN:
${profileText || '(chưa có — hãy học từ nội dung này)'}

NGUYÊN VĂN CẦN DỊCH, dạng JSON:
${JSON.stringify(batch)}

Trả về:
- translations: đủ đúng ${batch.length} index.
- characters: nhân vật có tên xuất hiện trong lô này mà bảng CHƯA có: zh (tên Trung), vi (tên Hán–Việt), gender (nữ/nam/?), pronoun (ngôi thứ ba sẽ dùng). Không có thì mảng rỗng.
- addresses: cặp nhân vật nói chuyện trực tiếp trong lô mà bảng CHƯA có: from, to (tên Việt), self (from tự xưng), call (from gọi to). Không có thì mảng rỗng.
- newNotes: thuật ngữ/bối cảnh MỚI cần giữ nhất quán, mỗi ý một dòng, tối đa 300 ký tự; không có thì chuỗi rỗng.`;

export class GeminiTranslationService {
  static async testConnection(): Promise<string> {
    const key = GeminiLocalSettings.getApiKey();
    if (!key) throw new Error('Hãy nhập Gemini API key.');
    const settings = GeminiLocalSettings.getSettings();
    await requestGemini(key, settings.model, 'Trả về JSON với translations, characters, addresses là mảng rỗng và newNotes là "OK".');
    return 'OK';
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
    const sourceItems = [chapterTitle, ...paragraphs].map((text, index) => ({ index, text }));
    const batches = splitBatches(sourceItems);
    const output = new Map<number, string>();
    let profile = StoryProfiles.read(bookId);
    let done = 0;

    const learn = (payload: GeminiPayload) => {
      profile = mergeLearned(profile, {
        characters: payload.characters,
        addresses: payload.addresses,
        notes: payload.newNotes ? [payload.newNotes] : [],
      });
    };

    const run = async (batch: TranslationItem[]) => {
      const text = batch.map(item => item.text).join('\n');
      const prompt = buildPrompt(bookTitle, chapterTitle, chapterIndex, batch, settings, profileForPrompt(profile, text));
      const payload = await requestGemini(apiKey, settings.model, prompt);
      const received = new Map(payload.translations.map(item => [item.index, item.text?.trim()]));
      learn(payload);
      return received;
    };

    const translateBatch = async (batch: TranslationItem[]) => {
      const received = await run(batch);
      for (const item of batch) {
        const translated = received.get(item.index);
        if (!translated) throw new Error(`Gemini bỏ sót đoạn ${item.index}. Vui lòng bấm dịch lại.`);
        output.set(item.index, translated);
      }
      done += batch.length;
      onProgress?.({ stage: 'translating', done, total_items: sourceItems.length });
    };

    // Truyện chưa có bảng: dịch một lô trước để các lô chạy song song dùng chung tên và giới tính.
    let queue = batches;
    if (!profile.characters.length && batches.length > 1) {
      await translateBatch(batches[0]);
      queue = batches.slice(1);
    }
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, async () => {
      while (next < queue.length) await translateBatch(queue[next++]);
    }));

    StoryProfiles.write(bookId, profile);
    return {
      title: output.get(0) || chapterTitle,
      paragraphs: paragraphs.map((_, index) => output.get(index + 1) || ''),
      bookTitle: undefined,
    };
  }
}
