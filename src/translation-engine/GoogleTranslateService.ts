import type { TranslatedChapterContent, TranslationProgress } from './TranslationWorkerClient';
import type { QtGlossaryTerm } from './qt/qtTranslator';
import { translateQtChapter } from './qt/translateQtChapter';

/**
 * "Google Dịch" quick mode, an extra option beside Lily QT (QT itself is unchanged).
 * Calls Google's free web endpoint straight from the reader's browser (no key, no VPS load).
 *
 * Google's Vietnamese drifts between tôi/em/anh/cô and invents a "tôi" subject for
 * subjectless Chinese sentences. So every sentence is sent on its own line, and each
 * Vietnamese line is fixed against ITS Chinese sentence (same rules as Lily):
 *   我 → ta · no 我 → drop the invented "tôi" · 你 → ngươi
 *   她 (or no 他 in the paragraph) → cô / cô ấy / anh / anh ấy → nàng · only 他 → anh ấy → hắn
 * Names from the book's QT name table are put into the Chinese text before sending, so
 * Google keeps the Hán-Việt reading instead of pinyin. Any request failure falls back to QT.
 */

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=vi&dt=t';
const FALLBACK_ENDPOINT = 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=zh-CN&tl=vi';
const MAX_CHARS = 3500;
const CONCURRENCY = 2;

const KIN = String.raw`(?!\s+(?:gái|trai|họ|út|rể|dâu|cả|hai|ba|em|chị|ấy|học|bè|cùng|thân)(?![\p{L}]))`;
const NOT_PRON = String.raw`(?!\s*(?:giáo|gái|bé|nương|ta|đơn|độc|lập|đọng|dâu|chú|dì|út)(?![\p{L}]))`;
// \b does not understand Vietnamese letters; use Unicode-aware word edges instead.
const B = String.raw`(?<![\p{L}])`;
const E = String.raw`(?![\p{L}])`;
const re = (src: string, flags = 'gu') => new RegExp(src, flags);
const PRON_EM = B + String.raw`(em|anh|chị)` + E + KIN;

const SENTENCE_END = /(?<=[。！？!?…])(?![”」’』！？!?…])|(?<=[。！？!?…][”」’』])/u;

function splitSentences(text: string): string[] {
  return text.split(SENTENCE_END).filter(s => s.trim());
}

function upperFirst(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function fixSentence(zh: string, vi: string, paragraph: string): string {
  const wo = zh.includes('我');
  const ni = zh.includes('你') || zh.includes('您');
  if (zh.includes('我们') || zh.includes('咱们')) vi = vi.replace(re(B + '([Cc])húng tôi' + E), '$1húng ta');
  if (wo) {
    vi = vi.replace(re(B + 'tôi' + E), 'ta').replace(re(B + 'Tôi' + E), 'Ta');
    if (!re(B + '[Tt]a' + E, 'u').test(vi) && !ni) {
      vi = vi.replace(re(PRON_EM, 'u'), 'ta').replace(re(B + String.raw`(Em|Anh|Chị)(?=\s)` + KIN, 'u'), 'Ta');
    }
  } else {
    // Google invented a "tôi" subject.
    vi = vi.replace(re(String.raw`(^|[.!?…:"“]\s*)Tôi\s+(\p{L})`), (_m, p: string, c: string) => p + c.toUpperCase());
    vi = vi.replace(re(String.raw`,\s*tôi\s+`), ', ').replace(re(String.raw`\s+tôi` + E), '');
  }
  if (ni) {
    vi = vi.replace(re(B + '(bạn|cậu)' + E + KIN), 'ngươi').replace(re(B + '(Bạn|Cậu)' + E + KIN), 'Ngươi');
    if (!re(B + '[Nn]gươi' + E, 'u').test(vi) && !wo) vi = vi.replace(re(PRON_EM, 'u'), 'ngươi');
  } else {
    vi = vi.replace(re(String.raw`(^|[.!?…:"“]\s*)Bạn\s+(?!(?:học|bè|cùng|thân)(?![\p{L}]))(\p{L})`),
      (_m, p: string, c: string) => p + c.toUpperCase());
  }
  if (wo && ni && !re(B + '([Tt]a|[Nn]gươi)' + E, 'u').test(vi)) {
    vi = vi.replace(re(B + 'em' + E + KIN), 'ta').replace(re(B + String.raw`Em(?=\s)` + KIN), 'Ta')
      .replace(re(B + '(anh|chị)' + E + KIN), 'ngươi').replace(re(B + String.raw`(Anh|Chị)(?=\s)` + KIN), 'Ngươi');
  }
  const she = zh.includes('她');
  const he = zh.includes('他');
  if ((she && !he) || !paragraph.includes('他')) {
    vi = vi.replace(re(B + '(anh ấy|cô ấy|cậu ấy)' + E), 'nàng').replace(re(B + '(Anh ấy|Cô ấy|Cậu ấy)' + E), 'Nàng');
    if (!wo && !ni) vi = vi.replace(re(B + 'anh' + E + KIN), 'nàng');
    vi = vi.replace(re(String.raw`(^|[.!?…“"]\s*)Cô` + E + NOT_PRON), '$1Nàng');
    vi = vi.replace(re(B + 'cô' + E + NOT_PRON), 'nàng');
    if (!ni) vi = vi.replace(re(String.raw`(^|[.!?…]\s+)Anh(?=\s)` + KIN), '$1Nàng');
  } else if (he && !she) {
    vi = vi.replace(re(B + '(anh ấy|cậu ấy)' + E), 'hắn').replace(re(B + '(Anh ấy|Cậu ấy)' + E), 'Hắn');
  }
  vi = vi.replace(/([!?])\s+(?=[!?])/g, '$1');
  return upperFirst(vi.replace(/\s{2,}/g, ' ').trim());
}

/** fetch with a deadline: on some phone networks a refused Google call hangs instead of failing. */
async function fetchWithin(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    throw new Error(controller.signal.aborted ? `quá ${ms / 1000}s không phản hồi` : (e as Error).message);
  } finally {
    clearTimeout(timer);
  }
}

async function postForm(url: string, text: string, ms: number): Promise<unknown> {
  const response = await fetchWithin(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: 'q=' + encodeURIComponent(text),
  }, ms);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function viaRelay(text: string): Promise<string> {
  const response = await fetchWithin(RELAY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text }),
  }, 25000);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data?.text !== 'string' || !data.text.trim()) throw new Error(data?.error || `HTTP ${response.status}`);
  return data.text;
}

let lastError = '';
const RELAY = '/api/gtranslate';
const RELAY_KEY = 'lily.googleQuick.useRelay';
// Once direct calls failed on this device, every later request goes to Lily's relay first.
let preferRelay = (() => { try { return localStorage.getItem(RELAY_KEY) === '1'; } catch { return false; } })();
function rememberRelay() {
  preferRelay = true;
  try { localStorage.setItem(RELAY_KEY, '1'); } catch { /* private mode */ }
}

/** Order: Google directly (5 s) → Lily's relay api/gtranslate → Chrome dictionary endpoint (5 s). */
async function googleTranslate(text: string): Promise<string> {
  lastError = '';
  if (!preferRelay) {
    try {
      const data = await postForm(ENDPOINT, text, 5000) as unknown[][][];
      const out = (data?.[0] || []).map(part => (part?.[0] as string) || '').join('');
      if (out.trim()) return out;
      throw new Error('trả về rỗng');
    } catch (e) {
      lastError = `trực tiếp: ${(e as Error).message} · `;
      rememberRelay();
    }
  }
  try {
    return await viaRelay(text);
  } catch (e) {
    lastError += `máy chủ Lily: ${(e as Error).message}`;
  }
  try {
    const data = await postForm(FALLBACK_ENDPOINT, text, 5000) as unknown[];
    const first = data?.[0];
    const out = typeof first === 'string' ? first : Array.isArray(first) ? String(first[0] ?? '') : '';
    if (out.trim()) return out;
    throw new Error('trả về rỗng');
  } catch (e) {
    lastError += ` · cổng phụ: ${(e as Error).message}`;
    throw new Error(lastError);
  }
}

function applyNames(text: string, names: QtGlossaryTerm[]): string {
  for (const n of names) {
    if (n.source_term && n.translation) text = text.split(n.source_term).join(n.translation);
  }
  return text;
}

/** Translate several paragraphs in one request: one sentence per line, then regroup. */
async function translateGroup(paragraphs: string[], names: QtGlossaryTerm[]): Promise<string[]> {
  const sentences = paragraphs.map(splitSentences);
  const lines = sentences.flat();
  if (!lines.length) return paragraphs.map(() => '');
  const out = (await googleTranslate(lines.map(s => applyNames(s, names)).join('\n'))).split('\n');
  if (out.length !== lines.length) {
    if (paragraphs.length > 1) {
      // Line count drifted: retry paragraph by paragraph so each one still lines up.
      const each: string[] = [];
      for (const p of paragraphs) each.push(...await translateGroup([p], names));
      return each;
    }
    return [fixSentence(paragraphs[0], out.join(' '), paragraphs[0])];
  }
  let k = 0;
  return sentences.map((ss, i) => ss.map(s => fixSentence(s, out[k++], paragraphs[i])).join(' '));
}

export async function translateGoogleChapter(
  title: string,
  paragraphs: string[],
  onProgress?: (progress: TranslationProgress) => void,
  bookTitle?: string,
  names: QtGlossaryTerm[] = [],
): Promise<TranslatedChapterContent> {
  const sorted = [...names].sort((a, b) => (b.source_term?.length || 0) - (a.source_term?.length || 0));
  const items = [title, ...paragraphs, ...(bookTitle ? [bookTitle] : [])];
  const groups: number[][] = [];
  let cur: number[] = [];
  let size = 0;
  items.forEach((text, i) => {
    if (cur.length && size + text.length > MAX_CHARS) { groups.push(cur); cur = []; size = 0; }
    cur.push(i); size += text.length + 1;
  });
  if (cur.length) groups.push(cur);

  const result: string[] = new Array(items.length).fill('');
  let done = 0;
  let next = 0;
  let failed = 0;
  onProgress?.({ stage: 'translating', done: 0, total_items: items.length });
  const worker = async () => {
    while (next < groups.length) {
      const group = groups[next++];
      const texts = group.map(i => items[i]);
      try {
        const translated = await translateGroup(texts, sorted);
        group.forEach((i, j) => { result[i] = translated[j]; });
      } catch (e) {
        failed++;
        console.warn('[Google Dịch] lỗi, phần này dùng QT:', (e as Error).message);
        // Blocked for one part only: that part falls back to Lily QT so the chapter still opens.
        const qt = await translateQtChapter('', texts, undefined, undefined, names);
        group.forEach((i, j) => { result[i] = qt.paragraphs[j]; });
      }
      done += group.length;
      onProgress?.({ stage: 'translating', done, total_items: items.length });
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, groups.length) }, worker));
  // Whole chapter failed: say so instead of silently showing a QT chapter under the Google label
  // (and nothing gets cached, so the next try asks Google again).
  if (failed === groups.length) {
    throw new Error(`Google Dịch không phản hồi trên mạng này (${lastError}). Hãy thử lại, tắt VPN/iCloud Private Relay, hoặc dùng Lily QT.`);
  }

  return {
    title: result[0],
    paragraphs: result.slice(1, 1 + paragraphs.length),
    bookTitle: bookTitle ? result[items.length - 1] : undefined,
  };
}
