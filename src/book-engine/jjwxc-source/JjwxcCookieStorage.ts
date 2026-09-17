// Stores the user's personal JJWXC session cookie in localStorage on the client.
// Never sent to any third-party server — only forwarded by the local/edge proxy
// directly to *.jjwxc.net when requesting JJWXC chapter pages.

const STORAGE_KEY = 'lily_jjwxc_cookie_v1';
let memoryCookieFallback = '';

export class JjwxcCookieStorage {
  public static sanitize(raw: string): string {
    if (!raw) return '';
    let cleaned = raw.replace(/\s+/g, ' ').trim();
    // If user pasted only the sid token value without "sid="
    if (!cleaned.includes('=') && cleaned.length > 3) {
      cleaned = `sid=${cleaned}`;
    }
    return cleaned;
  }

  public static getCookie(): string {
    if (typeof localStorage === 'undefined') return memoryCookieFallback;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? this.sanitize(stored) : memoryCookieFallback;
    } catch {
      return memoryCookieFallback;
    }
  }

  public static setCookie(cookie: string): void {
    const sanitized = this.sanitize(cookie);
    memoryCookieFallback = sanitized;
    if (typeof localStorage === 'undefined') return;
    try {
      if (!sanitized) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, sanitized);
      }
    } catch {
      // Best-effort in private/restricted storage mode
    }
  }

  public static clearCookie(): void {
    memoryCookieFallback = '';
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  public static hasCookie(): boolean {
    return Boolean(this.getCookie());
  }
}
