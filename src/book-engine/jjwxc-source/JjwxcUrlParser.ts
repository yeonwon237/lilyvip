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

  /**
   * Extracts a valid JJWXC novelId from:
   * 1. Plain numeric ID: "9209789"
   * 2. Prefix format: "jjwxc:9209789"
   * 3. Desktop URL: "https://www.jjwxc.net/onebook.php?novelid=9209789"
   * 4. WAP / Mobile URL: "https://wap.jjwxc.net/book2/9209789"
   */
  public static extractNovelId(raw: string): string | null {
    if (!raw) return null;
    const trimmed = raw.trim();

    // Plain numeric ID (JJWXC novel IDs are typically 4 to 10 digits)
    if (/^\d{4,10}$/.test(trimmed)) {
      return trimmed;
    }

    // Prefix format e.g. "jjwxc:9209789" or "id:9209789"
    const prefixMatch = trimmed.match(/^(?:jjwxc|book|id)[:=]\s*(\d{4,10})$/i);
    if (prefixMatch) return prefixMatch[1];

    // Desktop URL query param e.g. novelid=9209789
    const desktopMatch = trimmed.match(/novelid=(\d+)/i);
    if (desktopMatch && /jjwxc\.net/i.test(trimmed)) {
      return desktopMatch[1];
    }

    // WAP URL path e.g. /book2/9209789
    const wapMatch = trimmed.match(/\/book2\/(\d+)/i);
    if (wapMatch && (!trimmed.includes('://') || /wap\.jjwxc\.net/i.test(trimmed))) {
      return wapMatch[1];
    }

    return null;
  }

  /**
   * Converts any supported JJWXC input (pure ID, desktop URL, or WAP URL)
   * into the canonical WAP URL format "https://wap.jjwxc.net/book2/{novelId}".
   */
  public static toWapUrl(raw: string): string | null {
    const id = this.extractNovelId(raw);
    return id ? `https://wap.jjwxc.net/book2/${id}` : null;
  }
}

