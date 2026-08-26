/**
 * URL Normalizer & Classifier for Website Importer
 * Standardizes web addresses, strips tracking noise, and classifies WordPress URL types.
 */

export interface ClassifiedWpUrl {
  type: 'homepage' | 'category' | 'tag' | 'page' | 'post' | 'unknown';
  slug?: string;
  id?: number;
  normalizedUrl: string;
  hostname: string;
  isWordPressCom: boolean;
}

export class UrlNormalizer {
  private static TRACKING_PARAMS = new Set([
    'fbclid',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    '_hsenc',
    '_hsmi',
    'mc_cid',
    'mc_eid',
    'ref',
    'source',
    'share',
    'sp_tk',
    'preview',
  ]);

  /**
   * Normalize any URL: strip tracking parameters, hash, and trailing slashes
   */
  public static normalize(rawUrl: string): string {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';

    try {
      // Ensure protocol
      const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const parsed = new URL(withProto);

      // Clean query params
      const cleanParams = new URLSearchParams();
      parsed.searchParams.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (!this.TRACKING_PARAMS.has(lowerKey) && !lowerKey.startsWith('utm_')) {
          cleanParams.set(key, value);
        }
      });

      // Normalize pathname
      let pathname = parsed.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.replace(/\/+$/, '');
      }

      const queryString = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
      return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.port ? `:${parsed.port}` : ''}${pathname || '/'}${queryString}`;
    } catch {
      return trimmed;
    }
  }

  /**
   * Resolve a relative URL or absolute URL against a base URL
   */
  public static resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
    if (!relativeOrAbsolute) return '';
    try {
      const resolved = new URL(relativeOrAbsolute, baseUrl);
      return this.normalize(resolved.toString());
    } catch {
      return relativeOrAbsolute;
    }
  }

  /**
   * Classify a WordPress URL into its intent (homepage, category, tag, page, post)
   */
  public static classifyWordPressUrl(rawUrl: string): ClassifiedWpUrl {
    const normalizedUrl = this.normalize(rawUrl);
    let parsed: URL;
    try {
      parsed = new URL(normalizedUrl);
    } catch {
      return {
        type: 'unknown',
        normalizedUrl: rawUrl,
        hostname: '',
        isWordPressCom: false,
      };
    }

    const hostname = parsed.hostname.toLowerCase();
    const isWordPressCom = hostname.endsWith('.wordpress.com') || hostname.endsWith('.wp.com');
    const pathname = parsed.pathname.replace(/\/+$/, '');
    const pathParts = pathname.split('/').filter(Boolean);

    // 1. Homepage
    if (pathParts.length === 0 || pathname === '' || pathname === '/') {
      return {
        type: 'homepage',
        normalizedUrl,
        hostname,
        isWordPressCom,
      };
    }

    // 2. Category URL (e.g. /category/ban-toi or /chuyen-muc/ban-toi or ?cat=12 or ?category_name=ban-toi)
    const catQuery = parsed.searchParams.get('cat') || parsed.searchParams.get('category_name');
    if (catQuery) {
      const numericId = parseInt(catQuery, 10);
      return {
        type: 'category',
        slug: isNaN(numericId) ? catQuery : undefined,
        id: isNaN(numericId) ? undefined : numericId,
        normalizedUrl,
        hostname,
        isWordPressCom,
      };
    }

    const catIndex = pathParts.findIndex(p => p.toLowerCase() === 'category' || p.toLowerCase() === 'chuyen-muc');
    if (catIndex !== -1 && pathParts[catIndex + 1]) {
      return {
        type: 'category',
        slug: decodeURIComponent(pathParts[catIndex + 1].toLowerCase()),
        normalizedUrl,
        hostname,
        isWordPressCom,
      };
    }

    // 3. Tag URL (e.g. /tag/ten-tag or /the/ten-tag or ?tag=ten-tag)
    const tagQuery = parsed.searchParams.get('tag');
    if (tagQuery) {
      return {
        type: 'tag',
        slug: tagQuery.toLowerCase(),
        normalizedUrl,
        hostname,
        isWordPressCom,
      };
    }

    const tagIndex = pathParts.findIndex(p => p.toLowerCase() === 'tag' || p.toLowerCase() === 'the');
    if (tagIndex !== -1 && pathParts[tagIndex + 1]) {
      return {
        type: 'tag',
        slug: decodeURIComponent(pathParts[tagIndex + 1].toLowerCase()),
        normalizedUrl,
        hostname,
        isWordPressCom,
      };
    }

    // 4. Date-based Post URL (e.g. /2023/05/12/chuong-1 or /2023/05/chuong-1)
    if (pathParts.length >= 3 && /^\d{4}$/.test(pathParts[0]) && /^\d{1,2}$/.test(pathParts[1])) {
      const lastSlug = pathParts[pathParts.length - 1];
      return {
        type: 'post',
        slug: decodeURIComponent(lastSlug.toLowerCase()),
        normalizedUrl,
        hostname,
        isWordPressCom,
      };
    }

    // 5. Post by ID (e.g. ?p=12345)
    const postById = parsed.searchParams.get('p');
    if (postById) {
      const pId = parseInt(postById, 10);
      if (!isNaN(pId)) {
        return {
          type: 'post',
          id: pId,
          normalizedUrl,
          hostname,
          isWordPressCom,
        };
      }
    }

    // 6. Page by ID (e.g. ?page_id=12345)
    const pageById = parsed.searchParams.get('page_id');
    if (pageById) {
      const pageId = parseInt(pageById, 10);
      if (!isNaN(pageId)) {
        return {
          type: 'page',
          id: pageId,
          normalizedUrl,
          hostname,
          isWordPressCom,
        };
      }
    }

    // 7. Single path part: Could be a page or a post slug (e.g. /muc-luc-ban-toi or /chuong-1)
    const slug = decodeURIComponent(pathParts[pathParts.length - 1].toLowerCase());
    
    // If slug clearly indicates a chapter (e.g. chuong-1, chap-2, c1), classify as post
    if (/^(?:chuong|chap|chapter|c|hoi|tiet)-\d+/i.test(slug) || /-\d+$/.test(slug)) {
      return {
        type: 'post',
        slug,
        normalizedUrl,
        hostname,
        isWordPressCom,
      };
    }

    // Otherwise default to page/post candidate with slug
    return {
      type: 'page',
      slug,
      normalizedUrl,
      hostname,
      isWordPressCom,
    };
  }
}
