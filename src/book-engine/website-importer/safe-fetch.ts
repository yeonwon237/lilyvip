/**
 * Safe Universal Web Fetcher for Website Importers
 * Handles CORS and anti-scraping rate limiting transparently
 */
export async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  const isBrowser = typeof window !== 'undefined';
  const urlObj = new URL(url);
  const isWpCom = urlObj.hostname.endsWith('.wordpress.com') || urlObj.hostname.endsWith('.wp.com');

  // 1. In browser environment:
  // If not WordPress.com (which natively supports CORS), prefer dev proxy directly to avoid CORS errors & Cloudflare blocks
  if (isBrowser) {
    // If it's WordPress.com public REST API, direct fetch works with native CORS
    if (isWpCom && url.includes('/wp-json/') || url.includes('public-api.wordpress.com')) {
      try {
        const directRes = await fetch(url, init);
        if (directRes.ok) return directRes;
      } catch (err: any) {
        if (init?.signal?.aborted) throw err;
      }
    }

    // For all other platforms or when direct fetch fails, use dev proxy
    try {
      const proxyEndpoint = `/api/cors-proxy?url=${encodeURIComponent(url)}`;
      const proxyRes = await fetch(proxyEndpoint, {
        signal: init?.signal,
      });

      if (proxyRes.ok || (proxyRes.status >= 200 && proxyRes.status < 400)) {
        return proxyRes;
      }
    } catch (err: any) {
      if (init?.signal?.aborted) throw err;
    }
  }

  // 2. Node or Direct Fetch Fallback
  const headers = new Headers(init?.headers || {});
  if (!headers.has('User-Agent') && !isBrowser) {
    headers.set(
      'User-Agent',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    headers.set('Referer', `${urlObj.origin}/`);
  }

  return fetch(url, {
    ...init,
    headers,
  });
}
