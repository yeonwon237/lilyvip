// Decrypts VIP chapters fetched from wap.jjwxc.net.
// JJWXC serves VIP chapters encrypted with AES-128-CBC inside <input name="content">
// and dynamically derives keys from novelid, chapterid, readerid, accessKey, and cryptInfo.

function md5(string: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  function md51(s: string) {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i: number;
    for (i = 64; i <= s.length; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md5blk(s: string) {
    const md5blks: number[] = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] =
        s.charCodeAt(i) +
        (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) +
        (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  const hex_chr = '0123456789abcdef'.split('');
  function rhex(n: number) {
    let s = '';
    for (let j = 0; j < 4; j++) s += hex_chr[(n >> (j * 8 + 4)) & 0x0f] + hex_chr[(n >> (j * 8)) & 0x0f];
    return s;
  }

  function hex(x: number[]) {
    const out: string[] = [];
    for (let i = 0; i < x.length; i++) out.push(rhex(x[i]));
    return out.join('');
  }

  function add32(a: number, b: number) {
    return (a + b) & 0xffffffff;
  }

  return hex(md51(string));
}

function charSum(str: string): number {
  let sum = 0;
  for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i);
  return sum;
}

function safeAtob(b64: string): string {
  const clean = (b64 || '').replace(/\s+/g, '');
  if (typeof atob !== 'undefined') return atob(clean);
  return Buffer.from(clean, 'base64').toString('binary');
}

async function aesCbcDecrypt(ciphertextBase64: string, keyStr: string, ivStr: string): Promise<string> {
  const enc = new TextEncoder();
  const keyBuf = enc.encode(keyStr);
  const ivBuf = enc.encode(ivStr);
  const binaryString = safeAtob(ciphertextBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    keyBuf,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );

  const decryptedBuf = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: ivBuf },
    cryptoKey,
    bytes
  );

  return new TextDecoder('utf-8').decode(decryptedBuf);
}

export interface JjwxcEncryptedVars {
  contentid?: string;
  novelid?: string;
  chapterid?: string;
  accessKey?: string;
  readerid?: string;
  cryptInfo?: string;
  content?: string;
  type?: string;
}

export function extractJjwxcContentVars(html: string): JjwxcEncryptedVars | null {
  const match = html.match(/<div id=["']contentvars["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!match || !match[1]) return null;

  const vars: JjwxcEncryptedVars = {};
  const regex = /<input[^>]+name=["']([^"']+)["'][^>]+value=["']([^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(match[1])) !== null) {
    (vars as any)[m[1]] = m[2];
  }
  if (!vars.content || !vars.cryptInfo || !vars.accessKey) return null;
  return vars;
}

/**
 * Decrypts a VIP chapter's encrypted content using JJWXC's dynamic AES keys.
 * Returns the decrypted HTML snippet (usually with <br><br> tags) or null if not encrypted.
 */
export async function decryptJjwxcChapter(html: string): Promise<string | null> {
  const vars = extractJjwxcContentVars(html);
  if (!vars?.content || !vars?.cryptInfo || !vars?.accessKey) return null;

  const novelid = parseInt(vars.novelid || '0', 10);
  const chapterid = parseInt(vars.chapterid || '0', 10);
  const readerid = parseInt(vars.readerid || '0', 10);
  const accessKey = vars.accessKey;
  const sum = charSum(accessKey);

  // Even (novelid + chapterid) uses delim '.', odd uses delim '-'
  const funcIdx = (novelid + chapterid) % 2;
  let k1: string, v1: string;

  if (funcIdx === 1) {
    const plain1 = `${accessKey}-${novelid}-${chapterid}-${readerid}`;
    const h1 = md5(plain1);
    const shift1 = sum % (h1.length + 1);
    const shifted1 = h1.slice(shift1) + h1.slice(0, shift1);
    k1 = shifted1.slice(-16);
    v1 = shifted1.slice(0, 16);
  } else {
    const plain1 = `${novelid}.${chapterid}.${readerid}.${accessKey}`;
    const h1 = md5(plain1);
    const shift1 = sum % h1.length;
    const shifted1 = h1.slice(shift1) + h1.slice(0, shift1);
    k1 = shifted1.slice(-16);
    v1 = shifted1.slice(0, 16);
  }

  try {
    const cryptInfoRaw = await aesCbcDecrypt(vars.cryptInfo, k1, v1);
    const cryptObj = JSON.parse(safeAtob(cryptInfoRaw));
    if (!cryptObj?.key) return null;

    const cand = `${cryptObj.key}${cryptObj.time}${readerid}`;
    const h2 = md5(cand);
    const shift2 = sum % h2.length;
    const shifted2 = h2.slice(shift2) + h2.slice(0, shift2);
    const finalKey = shifted2.slice(0, 16);
    const finalIv = shifted2.slice(-16);

    return await aesCbcDecrypt(vars.content, finalKey, finalIv);
  } catch (err) {
    console.error('Failed to decrypt JJWXC chapter content:', err);
    return null;
  }
}
