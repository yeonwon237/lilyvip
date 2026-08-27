import assert from 'node:assert/strict';
import { TtsQueue } from '../TtsQueue';
import { NghiTtsEngine } from '../engines/NghiTtsEngine';
import { SystemSpeechEngine } from '../engines/SystemSpeechEngine';
import type { TtsChunk, TtsSynthesisResult } from '../types';
const pending: Array<{ voice: string; resolve: (value: TtsSynthesisResult) => void }> = [];
const revoked: string[] = [];
const played: string[] = [];
class FakeAudio {
  src = ''; playbackRate = 1; onended: (() => void) | null = null; onerror = null;
  load() {} pause() {} async play() { played.push(this.src); }
}
Object.assign(globalThis, { Audio: FakeAudio });
URL.revokeObjectURL = url => { revoked.push(url); };
const neural = NghiTtsEngine.getInstance();
neural.stop = () => {};
neural.synthesize = (_text, voice) => new Promise(resolve => pending.push({ voice, resolve }));
const chunk = (i: number): TtsChunk => ({ id: `c-${i}`, index: i, chapterIndex: 1, paragraphIndex: i, text: 'Nội dung.', status: 'pending' } as unknown as TtsChunk);
const result = (url: string): TtsSynthesisResult => ({ audioUrl: url, durationSec: 1, engine: 'nghi-tts' });
const tick = async () => { await new Promise(resolve => setTimeout(resolve, 0)); };
const queue = new TtsQueue();
const first = queue.loadChapter([chunk(0)], 'Book', 'First', 'ngochuyen');
queue.pause();
pending.shift()!.resolve(result('blob:paused'));
await first;
assert.equal(played.length, 0, 'pause during inference must prevent playback');
Object.assign(globalThis, { window: { speechSynthesis: { paused: true, resume() {}, pause() {}, cancel() {} } } });
queue.resume(); await tick();
assert.deepEqual(played, ['blob:paused']);
queue.stop();
const old = queue.loadChapter([chunk(0), chunk(1)], 'Book', 'Old', 'ngochuyen');
queue.setVoice('maiphuong');
assert.equal(pending[1].voice, 'maiphuong');
pending.shift()!.resolve(result('blob:stale'));
await old;
assert.ok(revoked.includes('blob:stale'));
pending.shift()!.resolve(result('blob:new')); await tick();
assert.equal(played.at(-1), 'blob:new');
assert.equal(pending.length, 1, 'only one lookahead');
queue.pause(); queue.setVoice('minhthu');
pending.shift()!.resolve(result('blob:stale-prefetch')); await tick();
assert.ok(revoked.includes('blob:stale-prefetch'));
const count = played.length;
queue.resume(); queue.pause(); queue.resume();
assert.equal(pending.length, 1, 'resume during inference does not duplicate synthesis');
pending.shift()!.resolve(result('blob:final')); await tick();
assert.equal(played.length, count + 1);
queue.stop();
pending.shift()!.resolve(result('blob:stopped-prefetch')); await tick();
assert.ok(revoked.includes('blob:stopped-prefetch'));
assert.ok(revoked.includes('blob:new') && revoked.includes('blob:final'));

Object.assign(globalThis, { SpeechSynthesisUtterance: class { constructor(public text: string) {} },
  window: { speechSynthesis: { getVoices: () => [{ name: 'Remote Vietnamese', lang: 'vi-VN', localService: false }], cancel() {} } } });
assert.deepEqual(await SystemSpeechEngine.getInstance().getVoiceList(), []);
await assert.rejects(() => SystemSpeechEngine.getInstance().synthesize('Private chapter', 'sys_default'), /thiết bị/);
console.log('Audio queue: pause/inference, voice switch, stale URL cleanup, bounded prefetch, duplicate resume and remote-voice rejection passed');

const { TtsChunker } = await import('../TtsChunker');
for (const wordCount of [3000, 6000, 10000]) {
  const text = 'kiểm tra '.repeat(wordCount);
  const chunks = TtsChunker.chunkChapter([{ originalIndex: 0, text }], 1);
  assert.ok(chunks.every(chunk => chunk.text.length <= 240));
  assert.equal(chunks.map(chunk => chunk.text).join(' '), text.trim());
}
assert.ok(TtsChunker.chunkChapter([{ originalIndex: 0, text: 'a'.repeat(10000) }], 1).every(chunk => chunk.text.length <= 240));
console.log('Audio bounds: 3k/6k/10k word chapters and 10k-character unbroken token passed');
