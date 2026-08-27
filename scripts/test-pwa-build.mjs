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
