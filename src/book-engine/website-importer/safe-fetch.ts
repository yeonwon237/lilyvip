/** Fetch public source text; never forward cookies or credentials through the proxy. */
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
    if (typeof window === 'undefined') return await fetch(url, { ...init, signal: controller.signal });
    if (target.hostname === 'public-api.wordpress.com') {
      try {
        const direct = await fetch(url, { ...init, credentials: 'omit', signal: controller.signal });
        if (direct.ok) return direct;
      } catch { controller.signal.throwIfAborted(); }
    }
    const response = await fetch(`/api/cors-proxy?url=${encodeURIComponent(url)}`, {
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
