import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), corsProxyPlugin],
  server: {
    port: 3000,
    host: true,
  },
  worker: {
    format: 'es',
  },
});
