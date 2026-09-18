/**
 * Utility for generating and processing the 1-Click JJWXC Cookie Bookmarklet.
 * Enables admin/owner users to sync their purchased JJWXC session cookies seamlessly.
 */

export class JjwxcBookmarklet {
  /**
   * Generates the draggable JavaScript bookmarklet snippet.
   * @param callbackUrl The destination URL where the browser should return with the cookie in the hash.
   */
  public static buildBookmarklet(callbackUrl: string): string {
    const cleanCallback = (callbackUrl || '').split('#')[0];
    const script = `(function(){var c=document.cookie||'';if(!c||c.trim()===''){alert('⚠️ Chưa tìm thấy Cookie trên trang này.\\n\\nHãy chắc chắn bạn đang mở trang https://wap.jjwxc.net và ĐÃ ĐĂNG NHẬP tài khoản mua truyện!');return;}try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(c);}}catch(e){}alert('✅ Đã lấy Cookie Tấn Giang thành công! Bấm OK để chuyển về LilyVIP.');window.location.href='${cleanCallback}#jjwxc_cookie='+encodeURIComponent(c);})();`;
    return `javascript:${script}`;
  }

  /**
   * Extracts, decodes, and validates a JJWXC cookie from a URL hash string.
   * Returns the decoded cookie string if valid, or null otherwise.
   */
  public static extractCookieFromHash(hash: string): string | null {
    if (!hash || typeof hash !== 'string') return null;
    const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
    const match = cleanHash.match(/(?:^|&)jjwxc_cookie=([^&]+)/);
    if (!match || !match[1]) return null;

    try {
      const decoded = decodeURIComponent(match[1]).trim();
      if (decoded.length > 3) {
        return decoded;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Removes the #jjwxc_cookie fragment from the current browser address bar
   * without triggering a page reload, preventing the token from lingering in history.
   */
  public static cleanAddressBar(): void {
    if (typeof window === 'undefined' || !window.history || !window.history.replaceState) return;
    try {
      const url = new URL(window.location.href);
      if (url.hash && url.hash.includes('jjwxc_cookie=')) {
        const remainingHash = url.hash
          .replace(/#?jjwxc_cookie=[^&]+&?/, '')
          .replace(/&$/, '');
        const newUrl = url.pathname + url.search + (remainingHash ? `#${remainingHash}` : '');
        window.history.replaceState(null, '', newUrl);
      }
    } catch {
      // Ignore if URL is not valid
    }
  }
}
