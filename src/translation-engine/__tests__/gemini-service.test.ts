import assert from 'node:assert/strict';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
}

(globalThis as any).localStorage = new MemoryStorage();

const { GeminiLocalSettings, GeminiTranslationService } = await import('../GeminiTranslationService');
GeminiLocalSettings.setApiKey('local-test-key');
GeminiLocalSettings.setSettings({ model: 'gemini-3.8-flash', storyMode: 'modern' });

let capturedHeader = '';
(globalThis as any).fetch = async (_url: string, init: RequestInit) => {
  capturedHeader = String((init.headers as Record<string, string>)['x-goog-api-key']);
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        translations: [
          { index: 0, text: 'Chương thứ nhất' },
          { index: 1, text: 'Nàng bước vào phòng.' },
          { index: 2, text: '“Chị đến rồi.”' },
        ],
        memoryNotes: 'Lâm Duyệt xưng em với Quý Hựu Ngôn; gọi Quý Hựu Ngôn là chị.',
      }) }] } }],
    }),
  };
};

const progress: number[] = [];
const result = await GeminiTranslationService.translateChapter(
  'book-test',
  1,
  'Truyện thử nghiệm',
  '第一章',
  ['她走进房间。', '“季姐，我到了。”'],
  value => progress.push(value.done || 0),
);

assert.equal(capturedHeader, 'local-test-key');
assert.equal(result.title, 'Chương thứ nhất');
assert.deepEqual(result.paragraphs, ['Nàng bước vào phòng.', '“Chị đến rồi.”']);
assert.deepEqual(progress, [3]);
assert.match(localStorage.getItem('lily_gemini_story_memory_v1:book-test') || '', /Lâm Duyệt/);
console.log('Gemini translation service test passed');
