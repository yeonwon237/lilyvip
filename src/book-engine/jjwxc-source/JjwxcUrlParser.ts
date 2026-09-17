// Pure URL parsing only — no network request, no DOM access, no dependency on the
// native WebView. Safe to run and test in an ordinary browser tab or in Node.
// Only ever used to read a novelId out of a URL the owner pasted in; it does not
// fetch anything from JJWXC.

export interface JjwxcNovelUrl {
  novelId: string;
  hostname: string;
}

// Exact hostname allowlist (not "endsWith") so a lookalike like
// "wap.jjwxc.net.evil.com" or "notwap.jjwxc.net" is rejected, not just anything
// containing "jjwxc.net".
const ALLOWED_HOSTNAMES = new Set(['wap.jjwxc.net']);

const NOVEL_PATH_PATTERN = /^\/book2\/(\d+)\/?$/;

export class JjwxcUrlParser {
  /**
   * Parses a JJWXC novel URL such as "https://wap.jjwxc.net/book2/9209789".
   * Returns null for anything that isn't exactly that shape — including
   * non-HTTPS, a non-JJWXC host, or a path that isn't /book2/{digits}.
   */
  public static parseNovelUrl(raw: string): JjwxcNovelUrl | null {
    let url: URL;
    try {
      url = new URL(raw.trim());
    } catch {
      return null;
    }

    if (url.protocol !== 'https:') return null;
    if (!ALLOWED_HOSTNAMES.has(url.hostname.toLowerCase())) return null;

    const match = url.pathname.match(NOVEL_PATH_PATTERN);
    if (!match) return null;

    return { novelId: match[1], hostname: url.hostname.toLowerCase() };
  }
}
