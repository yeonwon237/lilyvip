import { InAppBrowser, ToolBarType } from '@capgo/capacitor-inappbrowser';
import { JjwxcAccessManager } from './JjwxcAccessManager';
import { JjwxcSession } from './JjwxcSession';
import { JjwxcTocLoader, JjwxcTocResult, JjwxcTocStatus } from './JjwxcTocLoader';
import { JjwxcChapterExtractor, JjwxcChapterResult, JjwxcChapterStatus } from './JjwxcChapterExtractor';

const JJWXC_LOGIN_URL = 'https://wap.jjwxc.net';

/** Load-level outcomes on top of what the pure parsers can classify — the page
 * either never loaded (network/redirect failure) or took too long. */
export type JjwxcLoadStatus = 'navigation_error' | 'timeout';

export type JjwxcTocFetchStatus = JjwxcTocStatus | JjwxcLoadStatus;
export interface JjwxcTocFetchResult extends Omit<JjwxcTocResult, 'status'> {
  status: JjwxcTocFetchStatus;
}

export type JjwxcChapterFetchStatus = JjwxcChapterStatus | JjwxcLoadStatus;
export interface JjwxcChapterFetchResult extends Omit<JjwxcChapterResult, 'status'> {
  status: JjwxcChapterFetchStatus;
}

type PageFetchOutcome = { ok: true; html: string } | { ok: false; reason: JjwxcLoadStatus };

const PAGE_LOAD_TIMEOUT_MS = 20_000;
const EXTRACT_TIMEOUT_MS = 10_000;

// Injected into the JJWXC page itself, running in that page's own JS context
// (same isolation InAppBrowser already gives the WebView). It only ever reads
// the DOM tree and hands back HTML text through the plugin's postMessage
// bridge — it has no access to, and never touches, document.cookie,
// localStorage/sessionStorage, or any request header. Password inputs and
// <script>/<style> tags are stripped from the clone before it leaves the page,
// so even a stray autofilled value can't ride along.
const EXTRACT_HTML_SCRIPT = `(function(){
  try {
    var clone = document.documentElement.cloneNode(true);
    var junk = clone.querySelectorAll('script, style, input[type="password"]');
    for (var i = 0; i < junk.length; i++) { junk[i].remove(); }
    window.mobileApp.postMessage({ type: 'lily_jjwxc_html', html: clone.outerHTML });
  } catch (e) {
    window.mobileApp.postMessage({ type: 'lily_jjwxc_html', html: '' });
  }
})();`;

/**
 * The only place allowed to call the InAppBrowser plugin for JJWXC. Every method
 * re-checks access via JjwxcAccessManager.assertAccess() itself — callers (pages,
 * TOC/chapter loading code) must not rely on having already checked `isOwner` in
 * their own UI layer, since that check is bypassable by anyone importing this
 * service directly. This never reads or forwards JJWXC cookies/session/passwords;
 * it only opens a WebView, waits for JJWXC's own page to load, and reads back the
 * page's HTML through the plugin's JS bridge.
 */
export class JjwxcWebViewService {
  static async openLogin(isOwner: boolean | undefined, onClosed?: () => void): Promise<void> {
    JjwxcAccessManager.assertAccess(isOwner);

    const closeSub = await InAppBrowser.addListener('closeEvent', () => {
      // UI convenience flag only — not proof of a successful login.
      JjwxcSession.markConnected();
      closeSub.remove();
      onClosed?.();
    });

    try {
      await InAppBrowser.openWebView({
        url: JJWXC_LOGIN_URL,
        title: 'Đăng nhập JJWXC',
        toolbarType: ToolBarType.NAVIGATION,
        showArrow: true,
        // Explicit even though these match plugin defaults: session persists on
        // device, isolated from Lily's own WebView data store.
        persistWebViewData: true,
        useSharedDataStore: false,
      });
    } catch (error) {
      closeSub.remove();
      throw error;
    }
  }

  static async disconnect(isOwner: boolean | undefined): Promise<void> {
    JjwxcAccessManager.assertAccess(isOwner);
    await InAppBrowser.clearAllBrowsingData();
    JjwxcSession.clear();
  }

  /** Loads a book/TOC page in the authenticated WebView and parses it with JjwxcTocLoader. */
  static async fetchToc(novelUrl: string, isOwner: boolean | undefined): Promise<JjwxcTocFetchResult> {
    const outcome = await this.fetchPage(novelUrl, isOwner);
    if (!outcome.ok) return { status: outcome.reason, title: null, author: null, chapters: [] };
    return JjwxcTocLoader.parse(outcome.html);
  }

  /** Loads one chapter page in the authenticated WebView and parses it with JjwxcChapterExtractor. */
  static async fetchChapter(chapterUrl: string, isOwner: boolean | undefined): Promise<JjwxcChapterFetchResult> {
    const outcome = await this.fetchPage(chapterUrl, isOwner);
    if (!outcome.ok) return { status: outcome.reason, title: null, paragraphs: [] };
    return JjwxcChapterExtractor.extract(outcome.html);
  }

  /**
   * Opens a hidden WebView on `url`, waits for load-state to settle (ready /
   * navigation_error / timeout), reads back sanitized HTML only once the page
   * has actually finished loading, then always closes the WebView. Hidden
   * because the extracted text is what the user reads (inside Lily's own
   * Reader), not JJWXC's page chrome.
   */
  private static async fetchPage(url: string, isOwner: boolean | undefined, timeoutMs = PAGE_LOAD_TIMEOUT_MS): Promise<PageFetchOutcome> {
    JjwxcAccessManager.assertAccess(isOwner);

    let webviewId: string | undefined;
    let pageLoadedSub: { remove: () => void } | undefined;
    let navErrorSub: { remove: () => void } | undefined;

    try {
      const loadOutcome = await new Promise<'ready' | JjwxcLoadStatus>((resolve) => {
        let settled = false;
        const settle = (result: 'ready' | JjwxcLoadStatus) => {
          if (settled) return;
          settled = true;
          resolve(result);
        };
        const timer = setTimeout(() => settle('timeout'), timeoutMs);

        Promise.all([
          InAppBrowser.addListener('browserPageLoaded', (event) => {
            if (webviewId && event.id && event.id !== webviewId) return;
            clearTimeout(timer);
            settle('ready');
          }),
          InAppBrowser.addListener('pageLoadError', (event) => {
            if (webviewId && event.id && event.id !== webviewId) return;
            clearTimeout(timer);
            settle('navigation_error');
          }),
        ]).then(([loadedSub, errorSub]) => {
          pageLoadedSub = loadedSub;
          navErrorSub = errorSub;
        });

        InAppBrowser.openWebView({
          url,
          hidden: true,
          persistWebViewData: true,
          useSharedDataStore: false,
        }).then(res => {
          webviewId = res.id;
        }).catch(() => {
          clearTimeout(timer);
          settle('navigation_error');
        });
      });

      if (loadOutcome !== 'ready') {
        return { ok: false, reason: loadOutcome };
      }

      const html = await this.extractHtml(webviewId);
      return { ok: true, html };
    } finally {
      pageLoadedSub?.remove();
      navErrorSub?.remove();
      if (webviewId) {
        InAppBrowser.close({ id: webviewId }).catch(() => {});
      }
    }
  }

  /** Only called after fetchPage() confirms the page finished loading. */
  private static async extractHtml(id: string | undefined): Promise<string> {
    return new Promise((resolve, reject) => {
      let sub: { remove: () => void } | undefined;
      const timer = setTimeout(() => {
        sub?.remove();
        reject(new Error('jjwxc_extract_timeout'));
      }, EXTRACT_TIMEOUT_MS);

      InAppBrowser.addListener('messageFromWebview', (event) => {
        if (id && event.id && event.id !== id) return;
        if (event.detail?.type !== 'lily_jjwxc_html') return;
        clearTimeout(timer);
        sub?.remove();
        resolve(String(event.detail.html || ''));
      }).then(handle => { sub = handle; });

      InAppBrowser.executeScript({ id, code: EXTRACT_HTML_SCRIPT }).catch(error => {
        clearTimeout(timer);
        sub?.remove();
        reject(error);
      });
    });
  }
}
