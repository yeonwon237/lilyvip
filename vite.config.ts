import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import websiteProxy from './server/website-proxy.mjs';

const corsProxyPlugin: Plugin = {
  name: 'cors-proxy-plugin',
  configureServer(server) {
    server.middlewares.use('/api/cors-proxy', websiteProxy);
  },
  configurePreviewServer(server) {
    server.middlewares.use('/api/cors-proxy', websiteProxy);
  },
};

/** Injects the actual Vite output names into the service worker after every build. */
const appShellPrecachePlugin: Plugin = {
  name: 'lily-app-shell-precache',
  apply: 'build',
  enforce: 'post',
  async writeBundle(options, bundle) {
    const outDir = path.resolve(options.dir || 'dist');
    const urls = new Set([
      '/', '/index.html', '/manifest.json', '/favicon-32.png', '/apple-touch-icon.png',
      '/lilyhub-icon-192.png', '/lilyhub-icon-512.png', '/lilyhub-logo.png',
    ]);

    for (const output of Object.values(bundle)) {
      if (output.fileName !== 'sw.js' && !output.fileName.endsWith('.map')) {
        urls.add(`/${output.fileName}`);
      }
    }

    // Worker sub-bundles are emitted separately and may not appear in `bundle`.
    const assetsDir = path.join(outDir, 'assets');
    for (const file of await readdir(assetsDir)) {
      if (!file.endsWith('.map')) urls.add(`/assets/${file}`);
    }
    const precacheUrls = [...urls].sort();
    const swPath = path.join(outDir, 'sw.js');
    const source = await readFile(swPath, 'utf8');
    const hash = createHash('sha256').update(source);
    for (const url of precacheUrls.filter(url => url !== '/')) {
      hash.update(url).update(await readFile(path.join(outDir, url.slice(1))));
    }
    const buildId = hash.digest('hex').slice(0, 12);
    const injected = source
      .replace('__LILY_BUILD_ID__', buildId)
      .replace(/\/\* __LILY_PRECACHE_MANIFEST__ \*\/[\s\S]*?\n\];/, JSON.stringify(precacheUrls, null, 2) + ';');

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
