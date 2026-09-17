import { JjwxcCookieStorage } from '../jjwxc-source/JjwxcCookieStorage';

/** Fetch public source text; never forward cookies or credentials through the proxy except user-supplied JJWXC cookie to jjwxc.net. */
export async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  const target = new URL(url);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) {
    throw new Error('Liên kết website không hợp lệ.');
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init?.signal?.aborted) controller.abort();
  init?.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 20000);
  try {
    const isJjwxc = target.hostname === 'jjwxc.net' || target.hostname.endsWith('.jjwxc.net');
    const jjwxcCookie = isJjwxc ? JjwxcCookieStorage.getCookie() : '';

    if (typeof window === 'undefined') {
      const nodeHeaders: Record<string, string> = {
        'User-Agent': isJjwxc
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
          : 'LilyReader/1.0 (+https://my.lilyhub.top/)',
        ...(init?.headers as Record<string, string>),
      };
      if (jjwxcCookie && !nodeHeaders.Cookie && !nodeHeaders.cookie) {
        nodeHeaders.Cookie = jjwxcCookie;
      }
      return await fetch(url, {
        ...init,
        headers: nodeHeaders,
        signal: controller.signal,
      });
    }
    if (target.hostname === 'public-api.wordpress.com') {
      try {
        const direct = await fetch(url, { ...init, credentials: 'omit', signal: controller.signal });
        if (direct.ok) return direct;
      } catch { controller.signal.throwIfAborted(); }
    }
    const isNotionPageRequest = target.hostname === 'www.notion.so' && target.pathname === '/api/v3/loadPageChunk' && init?.method === 'POST';
    const proxyHeaders: Record<string, string> = {
      ...(init?.headers as Record<string, string>),
    };
    if (isNotionPageRequest) proxyHeaders['Content-Type'] = 'application/json';
    if (jjwxcCookie && !proxyHeaders['X-Jjwxc-Cookie'] && !proxyHeaders['x-jjwxc-cookie']) {
      proxyHeaders['X-Jjwxc-Cookie'] = jjwxcCookie;
    }
    const response = await fetch(`/api/cors-proxy?url=${encodeURIComponent(url)}`, {
      method: isNotionPageRequest ? 'POST' : 'GET',
      headers: Object.keys(proxyHeaders).length ? proxyHeaders : undefined,
      body: isNotionPageRequest ? init?.body : undefined,
      credentials: 'omit', signal: controller.signal,
    });
    if (response.headers.get('X-Lily-Proxy') !== '1') {
      throw new Error('Dịch vụ đọc website chưa sẵn sàng. Hãy thử lại sau.');
    }
    if (response.status === 504) throw new Error('Website phản hồi quá lâu. Hãy thử lại sau.');
    if (response.status === 400) throw new Error('Lily chưa hỗ trợ đọc trực tiếp từ nguồn này.');
    if (response.status === 502) throw new Error('Lily chưa thể kết nối website này. Hãy thử lại sau.');
    return response;
  } catch (error) {
    if (init?.signal?.aborted) throw new DOMException('Đã hủy thao tác.', 'AbortError');
    if (controller.signal.aborted) throw new Error('Website phản hồi quá lâu. Hãy thử lại sau.');
    throw error;
  } finally { clearTimeout(timer); init?.signal?.removeEventListener('abort', abort); }
}
