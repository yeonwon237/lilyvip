import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const corsProxyPlugin: Plugin = {
  name: 'cors-proxy-plugin',
  configureServer(server) {
    server.middlewares.use('/api/cors-proxy', async (req, res) => {
      const parsed = new URL(req.url || '', 'http://localhost:3000');
      const targetUrl = parsed.searchParams.get('url');
      if (!targetUrl) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing url query parameter' }));
        return;
      }

      try {
        const parsedTarget = new URL(targetUrl);
        const fetchRes = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/json,*/*',
            'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
            'Referer': `${parsedTarget.origin}/`,
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
          },
        });

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'text/plain; charset=utf-8');
        res.statusCode = fetchRes.status;

        const buffer = await fetchRes.arrayBuffer();
        res.end(Buffer.from(buffer));
      } catch (err: any) {
        res.statusCode = 502;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  },
};

/** Injects the actual Vite output names into the service worker after every build. */
const appShellPrecachePlugin: Plugin = {
  name: 'lily-app-shell-precache',
  apply: 'build',
  enforce: 'post',
  async writeBundle(options, bundle) {
    const outDir = path.resolve(options.dir || 'dist');
    const urls = new Set(['/', '/index.html', '/manifest.json', '/icon.svg']);

    for (const output of Object.values(bundle)) {
      if (output.fileName !== 'sw.js' && !output.fileName.endsWith('.map')) {
        urls.add(`/${output.fileName}`);
      }
    }

    const precacheUrls = [...urls].sort();
    const buildId = createHash('sha256').update(precacheUrls.join('\n')).digest('hex').slice(0, 12);
    const swPath = path.join(outDir, 'sw.js');
    const source = await readFile(swPath, 'utf8');
    const injected = source
      .replace('__LILY_BUILD_ID__', buildId)
      .replace('/* __LILY_PRECACHE_MANIFEST__ */ [\n  \'/\',\n  \'/index.html\',\n  \'/manifest.json\',\n  \'/icon.svg\',\n]', JSON.stringify(precacheUrls, null, 2));

    if (injected === source || injected.includes('__LILY_PRECACHE_MANIFEST__')) {
      throw new Error('Failed to inject the Lily service-worker precache manifest.');
    }
    await writeFile(swPath, injected);
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), corsProxyPlugin, appShellPrecachePlugin],
  server: {
    port: 3000,
    host: true,
  },
  worker: {
    format: 'es',
  },
});
