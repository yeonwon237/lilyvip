import assert from 'node:assert/strict';
import { translateChapterViaApi } from '../ApiTranslationClient';

const calls: { url: string; init: RequestInit }[] = [];
globalThis.fetch = (async (url: string | URL | Request, init: RequestInit) => {
  calls.push({ url: String(url), init });
  const body = JSON.parse(String(init.body));
  return Response.json({ translations: body.paragraphs.map((text: string) => `vi:${text}`) });
}) as typeof fetch;
const result = await translateChapterViaApi('title', Array.from({ length: 25 }, (_, i) => `paragraph-${i}`), 'lily-dothi-v1', undefined, 'book', '11111111-1111-4111-8111-111111111111');
assert.equal(result.title, 'vi:title');
assert.equal(result.bookTitle, 'vi:book');
assert.equal(result.paragraphs.length, 25);
assert.equal(calls.length, 2);
assert.deepEqual(calls.map(({ init }) => JSON.parse(String(init.body)).batchId), [0, 1]);
for (const { url, init } of calls) {
  assert.equal(url, 'https://api.lilyhub.top/api/reader/translate');
  assert.equal(init.credentials, 'include');
  assert.deepEqual(init.headers, { 'Content-Type': 'application/json' });
  const body = JSON.parse(String(init.body));
  assert.equal(body.modelId, 'lily-dothi-v1');
  assert.equal(body.claimId, '11111111-1111-4111-8111-111111111111');
  assert.equal(body.model, undefined);
}
calls.length = 0;
await assert.rejects(() => translateChapterViaApi('title', ['text'], 'qt-polish-s1'), /lượt dịch/);
assert.equal(calls.length, 0);
console.log('Authenticated gateway client checks passed.');
