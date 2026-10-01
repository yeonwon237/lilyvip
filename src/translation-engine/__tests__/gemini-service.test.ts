import assert from 'node:assert/strict';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
}

(globalThis as any).localStorage = new MemoryStorage();

const { GeminiLocalSettings, GeminiTranslationService } = await import('../GeminiTranslationService');
const { StoryProfiles, mergeLearned } = await import('../GeminiStoryProfile');
GeminiLocalSettings.setApiKey('local-test-key');
GeminiLocalSettings.setSettings({ model: 'gemini-3.5-flash-lite', storyMode: 'modern' });

let capturedHeader = '';
let capturedPrompt = '';
(globalThis as any).fetch = async (_url: string, init: RequestInit) => {
  capturedHeader = String((init.headers as Record<string, string>)['x-goog-api-key']);
  capturedPrompt = JSON.parse(String(init.body)).contents[0].parts[0].text;
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        translations: [
          { index: 0, text: 'Chương thứ nhất' },
          { index: 1, text: 'Lâm Duyệt bước vào phòng.' },
          { index: 2, text: '“Chị Quý, em đến rồi.”' },
        ],
        characters: [
          { zh: '林悦', vi: 'Lâm Duyệt', gender: 'nữ', pronoun: 'cô' },
          { zh: '季又言', vi: 'Quý Hựu Ngôn', gender: 'nữ', pronoun: 'cô' },
        ],
        addresses: [{ from: 'Lâm Duyệt', to: 'Quý Hựu Ngôn', self: 'em', call: 'chị' }],
        newNotes: '',
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
  ['林悦走进房间。', '“季姐，我到了。”'],
  value => progress.push(value.done || 0),
);

assert.equal(capturedHeader, 'local-test-key');
assert.equal(result.title, 'Chương thứ nhất');
assert.deepEqual(result.paragraphs, ['Lâm Duyệt bước vào phòng.', '“Chị Quý, em đến rồi.”']);
assert.deepEqual(progress, [3]);
const profile = StoryProfiles.read('book-test');
assert.equal(profile.characters.length, 2);
assert.deepEqual(profile.addresses[0], { from: 'Lâm Duyệt', to: 'Quý Hựu Ngôn', self: 'em', call: 'chị', locked: false });

// A row the reader edited (locked) is never overwritten by what Gemini learns later.
StoryProfiles.write('book-test', {
  ...profile,
  characters: profile.characters.map(c => c.zh === '林悦' ? { ...c, pronoun: 'nàng', locked: true } : c),
});
const merged = mergeLearned(StoryProfiles.read('book-test'), { characters: [{ zh: '林悦', vi: 'Lâm Nguyệt', gender: 'nam', pronoun: 'hắn' }] });
assert.equal(merged.characters.find(c => c.zh === '林悦')?.pronoun, 'nàng');
assert.equal(merged.characters.find(c => c.zh === '林悦')?.vi, 'Lâm Duyệt');

// The next chapter's prompt carries the table.
await GeminiTranslationService.translateChapter('book-test', 2, 'Truyện thử nghiệm', '第二章', ['林悦笑了。', '她说。'], () => {});
assert.match(capturedPrompt, /林悦 → Lâm Duyệt · nữ · ngôi thứ ba: nàng/);
console.log('Gemini translation service test passed');
