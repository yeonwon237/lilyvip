import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const html = await readFile(path.join(dist, 'index.html'), 'utf8');
const sw = await readFile(path.join(dist, 'sw.js'), 'utf8');
assert.doesNotMatch(sw, /__LILY_(?:BUILD_ID|PRECACHE_MANIFEST)__/, 'build tokens must be injected');

const manifestMatch = sw.match(/const APP_SHELL_CORE = (\[[\s\S]*?\]);/);
assert.ok(manifestMatch, 'generated precache manifest exists');
const urls = JSON.parse(manifestMatch[1]);
const htmlAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);

for (const required of [
  '/', '/index.html', '/manifest.json', '/favicon-32.png', '/apple-touch-icon.png',
  '/lilyhub-icon-192.png', '/lilyhub-icon-512.png', '/lilyhub-logo.png', ...htmlAssets,
]) {
  assert.ok(urls.includes(required), `precache includes ${required}`);
}
for (const url of urls.filter((item) => item !== '/')) {
  await access(path.join(dist, url.slice(1)));
}
assert.match(sw, /key\.startsWith\(CACHE_PREFIX\)/, 'cleanup is scoped to Lily app-shell caches');
assert.match(sw, /request\.mode === 'navigate'/, 'navigation fallback is configured');

console.log(`PWA build: ${urls.length} app-shell URLs verified`);

// Execute the built worker against controlled cache/network fixtures.
const { runInNewContext } = await import('node:vm');
const handlers = new Map();
const cacheData = new Map();
const keyOf = value => typeof value === 'string' ? value : value.url;
const cacheApi = {
  open: async name => {
    if (!cacheData.has(name)) cacheData.set(name, new Map());
    const entries = cacheData.get(name);
    return {
      addAll: async requests => { for (const request of requests) entries.set(new URL(request.url).pathname, new Response(`build-A:${new URL(request.url).pathname}`)); },
      match: async key => entries.get(keyOf(key))?.clone(),
    };
  },
  keys: async () => [...cacheData.keys()],
  delete: async key => cacheData.delete(key),
};
cacheData.set('lily-app-shell-legacy', new Map());
cacheData.set('lily_audio_models_v1', new Map([['voice', new Response('voice')]]));
const runtimeUrl = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/ort-wasm-simd.wasm';
cacheData.set('lily-voice-runtime-v1', new Map([[runtimeUrl, new Response('wasm')]]));
let networkCalls = 0;
runInNewContext(sw, {
  URL, Response, Request: class extends Request { constructor(url, options) { super(new URL(url, 'https://lily.test'), options); } },
  caches: cacheApi,
  fetch: async () => { networkCalls++; throw new Error('offline'); },
  self: { location: { origin: 'https://lily.test' }, clients: { claim: async () => {} },
    addEventListener: (name, handler) => handlers.set(name, handler),
    skipWaiting: () => { throw new Error('must not force activation over live notes/audio'); },
  },
});
let lifecycle;
handlers.get('install')({ waitUntil: promise => { lifecycle = promise; } });
await lifecycle;
handlers.get('activate')({ waitUntil: promise => { lifecycle = promise; } });
await lifecycle;
assert.equal(cacheData.has('lily-app-shell-legacy'), false);
assert.equal(cacheData.has('lily_audio_models_v1'), true);
const dispatch = async (pathname, mode = 'cors', method = 'GET') => {
  let response;
  handlers.get('fetch')({ request: { url: `https://lily.test${pathname}`, mode, method }, respondWith: promise => { response = promise; } });
  return response ? await response : undefined;
};
assert.match(await (await dispatch('/reader/book/1000', 'navigate')).text(), /build-A:\/index.html/);
assert.equal(networkCalls, 0, 'navigation cannot replace build-A shell with network build-B HTML');
for (const asset of urls.filter(url => url.startsWith('/assets/'))) assert.ok(await dispatch(asset));
assert.equal(await dispatch('/api/cors-proxy', 'navigate'), undefined);
assert.equal(await dispatch('/api', 'navigate'), undefined);
assert.equal(await dispatch('/anything', 'cors', 'POST'), undefined);
console.log('PWA lifecycle: offline deep route/assets, pinned shell, old shell cleanup, voice cache preservation and API exclusion passed');

let runtimeResponse;
handlers.get('fetch')({ request: { url: runtimeUrl, method: 'GET' }, respondWith: promise => { runtimeResponse = promise; } });
assert.equal(await (await runtimeResponse).text(), 'wasm');
assert.equal(networkCalls, 0, 'downloaded runtime survives update and is served without network');
