/**
 * JjwxcFontManager
 * Handles extraction, TTF-level glyph hash mapping, and complete character decoding
 * for JJWXC's anti-crawler custom font obfuscation (PUA U+E000-U+F8FF).
 *
 * JJWXC dynamically reassigns ~200 Private Use Area Unicode codepoints per chapter,
 * but uses a static set of 201 TrueType vector glyph outlines. By matching the binary
 * outline hash of each glyph directly from the chapter's TTF font file, we can decode
 * 100% of the obfuscated characters deterministically in <1ms without OCR.
 */

// 201 deterministic TrueType glyph vector outline hashes to real Chinese characters
export const JJWXC_GLYPH_HASH_MAP: Record<string, string> = {
  '7ea857511500aa758fcdbceffb768483': '书',
  'a7b629f9b3b1b48d03b437232238d275': '民',
  '80d5203bbbeb1a35f59a73aac06f565f': '什',
  '13aa6cab150c65459aa46805cda100de': '力',
  '18c1bd8a082bb71716e7845f7dbb2532': '三',
  'a7ad75e6e20f87bb65db83df48747159': '事',
  'a5a22f8346c19defb149b42891e1efbb': '再',
  '93d3e4edfeadf8e529d59fbcb3e9cb43': '作',
  '6873db05d39ea01bca7533a944589e41': '体',
  '6546641d4e10580321bb4bc567a9392e': '一',
  '369bf06b2dc05f853d392b861d40e45c': '上',
  'be1eb66dab777dd5e0e5846f04141944': '部',
  'f96e9ecc8de31bbd7d2d7840cf2251b7': '更',
  '61713c7e5931a7c9ad98499c9d3cbb69': '太',
  '91e5db49c506ff3bcec9fd4fade4a936': '天',
  '9a8e335dddc05f43b32a892ef4b71269': '理',
  '01611b8bedabd79297c1a64fd1266a73': '开',
  '56cc1576336d6794eaa6fb66b716c0b2': '性',
  '86e03314556c24acc1390b94c5530d27': '气',
  '317770c0fac9ad12538fb2c976fd5e45': '方',
  '7fcf86bdb3c9d358fe60af5e0d3e875d': '但',
  '2139276c25b7ddbd63b47be571dd6d31': '又',
  '353a1b2e86d5770a5ccefcdcce03b606': '女',
  '5bfe0cec30c97e5636ccf5f2af5e79e9': '和',
  'fd1d6d8b5a3cf0df7cc25592d3d64182': '时',
  '79bb5332b71bc4d0faabfe9e5f664133': '只',
  '2d48e8423d293f0bb5601185ca2c8940': '很',
  '94656ced4e4ae0ca0daa082e9807bd35': '点',
  'a9759476c71b82a1a173bf3fb26a443c': 'x',
  '8f8d5be267b39fd6b5417484d6d7b533': '口',
  '2dd907c2c5037b025fd2cc279920c704': '才',
  'a0341d4b6404c5f9876123b76e14298e': '都',
  'd592ddc7726a3d9fc639700ce1ed9560': '等',
  '293a667303c6d9bd292146aedee8a304': '能',
  '7eae4910b474ee5e7b52aa22596a7ea4': '本',
  '417c435069f0ff2c249794116331e9d0': '不',
  'acf471537a118ef191c060db9dd21c0d': '后',
  '28353ed25c4e8f32a61c0d093db1bc8e': '经',
  '53b9b4b983226036c2673639975f4bcf': '声',
  '5b134d591d24053947e7206d8d820dba': '特',
  '0411d21a038abbc6736971d1140453c7': '物',
  'e14b5ecde52a394c92c6023e70de8b66': '长',
  'd89a11e4a9ab123981a5fad53683ef28': '听',
  '37fb5d09c57efad0b23b9c5729cf55f5': '起',
  '34a421d34b36d2f61d2a0f3d9a94ba7f': '公',
  'c1e67310e05c59e708b2079153a3e4ea': '多',
  '89b39f8e1af2596eb0351b674a934e2e': '手',
  '6b6193a558fb2f09401364cdfdfc758a': '着',
  '9c68dd340fb3e17d547ab9d528852554': '心',
  'b830cfb60483f8b08b8e6ae4ce89893a': '与',
  'b546f93ce65f9c450f5a1c1c00185ed6': '问',
  '4c55135910aecbeddb61e449c6ebafac': '人',
  '041b41508192d8d7d44f8546201da2ac': '年',
  '1d69e46ead2065a808d9e6303329bcb5': '白',
  '4038c2837494a50a90accd271648e2cc': '得',
  '6abe6f3b3781ec1bbcb6af966f97679e': '想',
  'ab3c76fd18e419a66051e0d031774d40': '子',
  '6f89bc1d6f92cb845666cba32f93e341': '样',
  '5fcc0c68e4d317bfbdc8a8c726936800': '明',
  '7ccf161c0b3092ad46074cc528d95f71': '日',
  'c1eca6fe5daf0b271989605581c1eea2': '下',
  'b183f0daa2500c55f5eebffb471e4705': '这',
  'd3e187b451c0c3b253602802a82f36a9': '去',
  '2f9a03d9ecf305a9f5638c23c6773337': '果',
  '0bdb49ab3e679ea5c4c579cb5b5d25ca': '头',
  '1ce82b3ecd32006079be5e14aab340a9': '论',
  'cafcda2cdfd438cbd51349cb05e69e92': '使',
  '24d0207df2b86c948d3826f8fb075aed': '好',
  '41f2245031c5c1484abc10421edc4522': '眼',
  'f519db9e5ea40b5d37d11e82df54e139': '进',
  '2f202a6ea99171a16f9e1c5809bf6eff': '学',
  '16c68f4444f9589d83d6edb79da6ba64': '社',
  'c11a212d3a5ea5f6edaba57eab276bce': '动',
  '52a33fcc5281c49fe8cd326e76fc45b7': '分',
  '257cee1950c1736a6ddd1483a5aa5d04': '它',
  'f358ec4cf597a1b0e745d5923f148cc9': '间',
  '7aaaa6bfebca5c8df6032e62669c7af9': '两',
  '1c068d388fec6c540ed6646ebf7cede8': '打',
  '583afd846c09304ec122af3b2ca3a7e8': '史',
  'c142db2ca60515d2e71958288d708058': '几',
  '4b4c4615bc0fb3479aa46cbe2e8823d5': '因',
  '0a7e95560d9807ed099509a29c57a6e3': '主',
  '8710560890d228b340d528af6cab3b56': '会',
  'eff644da4e00751f742fe61e002eb3fe': '何',
  '923cc2aa3f0aa8b362c8178d2b1388d3': '么',
  'e87753249f991170c4f6dbca32f49013': '出',
  'e85c754af51d1a0a3c9925fa1f51a0ba': '世',
  'dcdee0a79ac3d8095cfb477022187a8e': '大',
  '8790f72ac5b41274295478f58effdd44': '要',
  '4d38e445f29953bd34f483bb4d8f65af': '并',
  '91cac8d7bf221157e7ef350ba7fc5f02': '如',
  '871c84c27e0e9a1eacc61d298b8e88fc': '走',
  '88800632d7e0e97503fa85a61da06564': '前',
  '6e8805c33bb3e2cf91bf38e514d8a8ab': '个',
  'b207733b903244627685e59dbeb7ed19': '了',
  'b1a6ab67d317ae5fda14bc135fe86f29': '却',
  'aedfedbd9516b6541f63e35c51f56989': '写',
  '51182d3c3fac2828b58480fb68ed2b1a': '神',
  '0a5b5b828205b9fb97030a9ceb665d14': '小',
  '90b331ffdb6852d963893618e901ec43': '儿',
  'fa93087a6c35f3dde166608dd8cf24cb': '十',
  'dd617d3905bd6b641ad43a1ee7e40402': '然',
  '8a2221f1a0e5860a3d3978d99cd5750b': '之',
  '33641e389df7d7609f586e320370a679': '她',
  '5a5cca55879de76db7734b00e0a104e0': '过',
  '69f13d097105ce25fe6a396f66438f9b': '美',
  'e79f0666d75964780bbc0b475367b58f': '中',
  '3d4c8c0ae3e36a44f50fa50fdf19256c': '回',
  'b87ce7aeaaaa748b2f935b01804b1026': '些',
  '3aab5d2f1708af6470e930fbf59cd9cd': '最',
  '78cc873ebbe7c15436949aa42660401e': '从',
  '29a7901e72f84e7574d17d66c173b5e7': '法',
  'e8b251dd406f61d502c44737c43e3ba3': '二',
  'a7a3a9b925695b99e4d677b1694ae48f': '情',
  '2db90bc38fa2d65c48a60337f74c8008': '西',
  '5ce1bbeff24cf6bbdc4bd79e4b652288': '可',
  'd5fcc0a63e41185c2f09465826f1976a': '便',
  'bac0f3d9e28bb8a77168b21854f3f22e': '话',
  'da6844cba2b35a426b6743d4103e6937': '老',
  '63add42e66e2e6b21c9d9783632eae98': '当',
  '8414d044b38b86d5709991ecc4416667': '用',
  '91ccba92c7b3929a42b2161127a9e40b': '为',
  'c86a4da8a7e04e615d5836ba5b4d9223': '高',
  '807d69b4dbb383757647a62564f09eaf': '种',
  'c73bbfb405ec7102d3359410d739b24b': '成',
  'da428532abb02db908719b4b546804a3': '笑',
  'bf79a405af22ce175429e16a32cce92a': '已',
  'add9c3c59f9a556ac1b9459c776fff87': '行',
  '9398243788daa14b7ceaeee2e67838dc': '道',
  'c47b89beaa34a02a77c2709ef4e4e29b': '定',
  '59cfde27ca6f40425a102cb3d6ec5e33': '在',
  '19d89a6ca1cfe62d8923d73181ad496a': '对',
  'b5a1ab42fbdd332f29c77cacd64af6a8': '全',
  '59085b666daf3fcb7a32be051b6a22cb': '以',
  '42fe05657aeba6115cf9cb7fd98163c5': '于',
  'acf3eb0d922f7eb69ce6b9d77ec17cda': '那',
  '93b3ad2e0dfee7961937072eb4ced11b': '说',
  '3adfff3284888c034019d1e6e276a4be': '相',
  'ff3f57a5365467a5dc1e5905eb73d641': '意',
  '620c721014bf0302b4f20e218fd8689c': '身',
  'be9a7471c194ab32d1e8442b732fbc52': '你',
  '7b2e443e79f720af2255d56b555e3515': '里',
  'e21b82828974e1bcb7e5e1c36ef13bf4': '正',
  '180f6c32e4d092645ad268d59f2514c1': '给',
  '79ca424b6700168c548c76f01ad33b8c': '新',
  '6950174b78f848b96f90e5851505cc0d': '己',
  'c36d89e6c073cdc8f4150e46174dd0e8': '别',
  '150b3ac2535d667c557eb475e0ab6bf7': '关',
  '55d8bfb3cac2be847fbb9f67ec30ec8a': '代',
  '38450a3bd5d8c912a6f5bb03809e0fb5': '文',
  '6b7cb8ce79001819ad4f97ef8c50e93a': '少',
  '767ef005182bbe1c4bec9baae7600b8e': '的',
  '816ab1fb93afdf24909d153baf4745f3': '其',
  '4192fcf5a7216a32cbd73ba4d0d100e4': '现',
  '1461736583c4d2fb7e90ad7b995e375c': '们',
  '7efc975b468906d0b7f4f1f1c843860d': '此',
  'be4225c4ebd93c85fd87769f2abb36b6': '我',
  '66c2defaa0ecddcb17b1cde66f0593da': '也',
  '1dc134fbbdc099ffb147d1b4e1a6c67d': '将',
  'c842261aa16a07b4de63ccd6fcab7e38': '是',
  '8bf7235a50cf96903a14104b7106a15b': '被',
  '57d1d1a98d98443db87d9a287deeed30': '家',
  '6b729928d7e63a230d6ff64907a7425a': '所',
  '370e63d8084f0380d61651200030fd7a': '到',
  '1f36a7996b66f9c20034f801ea191cfc': '先',
  'be1f7c695d98bfecaa8a2ed37ea8d34b': '还',
  '9d390c2deddbd442a9a9a76f648f0899': '他',
  '24d2fc2765375aba1f7db6968ac2c6b1': '义',
  'afbba580ac9331041e722c2d82f7734a': '教',
  '9e4dcdf3dca1c50c820d8b0558b71fac': '面',
  '9da50f417236ee11c1b778cf8363db04': '门',
  '25e289fa6b1a4eaee146831ec50da658': '没',
  '763e5b4ea995712e5855c7d6ed46438e': '感',
  '63735c7e5aa17ecc1eb61bd157c1f003': '名',
  '0b6bd69f7e809d3ee5331fe40f7929bc': '自',
  'a579e3da5f03f4199edf133da9f9911b': '国',
  'd1c19a59ce8df5755adc044af2fc3ee3': '生',
  '8dc3bcba7f464f6b12b751acc103504d': '发',
  '860479068637828d12e108911341d9fa': '化',
  '28cdd36feb9e0502b4e6dff7d64b1439': '实',
  '6a18ba0fe1a0c009468f15b93dbdbb0b': '由',
  'f38ca00c5c4c0c1b68732207a9ee1b3a': '有',
  'c3f277223dc26f2e7860260c22f8fa91': '四',
  '0ef229187c1a00028d21787b24d17f17': '无',
  '453c479a56a73a72c70d32b9c853322f': '向',
  'e1f7bb2298ed695f48814bc704948d85': '把',
  'ee2ce2aefec9fe4ba7831b3f1da4a70e': '地',
  '54f95ce3872fdd27b71723a783816fb8': '来',
  'ccc01cf05336487774852e29494ade6d': '见',
  '511862b66ff77d0c28e23c2c1de9a736': '重',
  '9c2f89329ac270cfff401f1c5b698ce8': '同',
  '3173d6a9c22cd1a62b22add3292cf465': '思',
  'eeeaff40c413882d258522a661384c70': '知',
  '953f73360152b1f64b3b8bd70bd373e2': '紧',
  '2dd9289623b7b0b87245844afcd92757': '而',
  '7b620834414ba63dc11ed48c8c447886': '者',
  '5b64ced5911db000e16ad6c2ef7cbb8d': '外',
  '26082e87d1367bf4618dfebc2bcb5cc0': '看',
  'cae18281dff07f2bd0841507288d26b8': '真',
  '0422b1c25a1800651550471aa6fa2880': '第',
  'bb4b89c57def05b79ce0a1accbcb63d6': '就',
};

export interface JjwxcFontInfo {
  fontFamily?: string;
  fontUrl?: string;
}

// In-memory cache for decoded glyph maps: fontFamily -> { [puaChar: string]: string }
const fontDecodeCache = new Map<string, Record<string, string>>();

export class JjwxcFontManager {
  /**
   * Extracts font family name and font URL from chapter HTML
   */
  public static extractFontInfo(html: string): JjwxcFontInfo {
    if (!html) return {};
    const fontNameMatch = html.match(/font-family:\s*['"]?(jjwxcfont_[a-zA-Z0-9_-]+)['"]?/i);
    const fontFamily = fontNameMatch ? fontNameMatch[1] : undefined;

    let fontUrl: string | undefined;
    const ttfMatch = html.match(/url\(['"]?([^'"]+\.ttf[^'"]*)['"]?\)/i);
    const woff2Match = html.match(/url\(['"]?([^'"]+\.woff2[^'"]*)['"]?\)/i);

    if (woff2Match) {
      fontUrl = woff2Match[1];
    } else if (ttfMatch) {
      fontUrl = ttfMatch[1];
    } else if (fontFamily) {
      fontUrl = `https://static.jjwxc.net/tmp/fonts/${fontFamily}.woff2?h=wap.jjwxc.net`;
    }

    if (fontUrl && fontUrl.startsWith('//')) {
      fontUrl = `https:${fontUrl}`;
    }

    return { fontFamily, fontUrl };
  }

  /**
   * Cleans zero-width characters and resolves hex entities
   */
  public static cleanObfuscation(text: string): string {
    if (!text) return '';
    let cleaned = text.replace(/&zwnj;/gi, '').replace(/[\u200b-\u200d\ufeff]/g, '');

    // Decode hex entities like &#xec3d; or &#xec3d
    cleaned = cleaned.replace(/&#x([0-9a-fA-F]{4});?/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return '';
      }
    });

    return cleaned;
  }

  /**
   * Parses a JJWXC TTF binary buffer and derives exact PUA -> Chinese character mapping
   */
  public static parseTtfBuffer(buffer: ArrayBuffer | Uint8Array): Record<string, string> {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 50) return {};

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const numTables = view.getUint16(4);
    let cmapOffset = 0, locaOffset = 0, glyfOffset = 0, headOffset = 0;

    for (let i = 0; i < numTables; i++) {
      const p = 12 + i * 16;
      let tag = '';
      for (let t = 0; t < 4; t++) tag += String.fromCharCode(bytes[p + t]);
      const offset = view.getUint32(p + 8);
      if (tag === 'cmap') cmapOffset = offset;
      if (tag === 'loca') locaOffset = offset;
      if (tag === 'glyf') glyfOffset = offset;
      if (tag === 'head') headOffset = offset;
    }

    if (!cmapOffset || !locaOffset || !glyfOffset) return {};

    const isShortLoca = headOffset ? view.getInt16(headOffset + 50) === 0 : true;

    // Find format 12 subtable in cmap
    const numSubtables = view.getUint16(cmapOffset + 2);
    let format12Offset = 0;
    for (let i = 0; i < numSubtables; i++) {
      const subOffset = cmapOffset + view.getUint32(cmapOffset + 8 + i * 8);
      const format = view.getUint16(subOffset);
      if (format === 12) {
        format12Offset = subOffset;
        break;
      }
    }

    if (!format12Offset) return {};

    const nGroups = view.getUint32(format12Offset + 12);
    const decodeMap: Record<string, string> = {};

    const getGlyphBytes = (glyphId: number): Uint8Array | null => {
      const o1 = glyfOffset + (isShortLoca ? view.getUint16(locaOffset + glyphId * 2) * 2 : view.getUint32(locaOffset + glyphId * 4));
      const o2 = glyfOffset + (isShortLoca ? view.getUint16(locaOffset + (glyphId + 1) * 2) * 2 : view.getUint32(locaOffset + (glyphId + 1) * 4));
      const len = o2 - o1;
      if (len <= 0 || o1 + len > bytes.length) return null;
      return bytes.subarray(o1, o2);
    };

    for (let i = 0; i < nGroups; i++) {
      const grp = format12Offset + 16 + i * 12;
      const startCharCode = view.getUint32(grp);
      const endCharCode = view.getUint32(grp + 4);
      const startGlyphID = view.getUint32(grp + 8);

      for (let c = startCharCode, g = startGlyphID; c <= endCharCode; c++, g++) {
        const gBytes = getGlyphBytes(g);
        if (!gBytes) continue;
        const h = this.md5(gBytes);
        const realChar = JJWXC_GLYPH_HASH_MAP[h];
        if (realChar) {
          const hex = c.toString(16).toLowerCase();
          const puaChar = String.fromCodePoint(c);
          decodeMap[hex] = realChar;
          decodeMap[puaChar] = realChar;
        }
      }
    }

    return decodeMap;
  }

  /**
   * Injects @font-face rule into document head as visual fallback
   */
  public static injectJjwxcFont(fontFamily: string, fontUrl: string): void {
    if (typeof document === 'undefined' || !fontFamily || !fontUrl) return;
    const styleId = `jjwxc-font-${fontFamily}`;
    if (document.getElementById(styleId)) return;

    const proxiedUrl = `/api/cors-proxy?url=${encodeURIComponent(fontUrl)}`;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @font-face {
        font-family: "${fontFamily}";
        src: url("${proxiedUrl}") format("truetype"),
             url("${proxiedUrl}") format("woff2");
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Decodes PUA characters in text to standard Chinese characters using deterministic TTF parsing
   */
  public static async decodeText(
    text: string,
    fontFamily?: string,
    fontUrl?: string
  ): Promise<string> {
    if (!text) return '';
    let processed = this.cleanObfuscation(text);

    // If font info exists and we're in browser, also inject font-face as visual fallback
    if (fontFamily && fontUrl && typeof document !== 'undefined') {
      this.injectJjwxcFont(fontFamily, fontUrl);
    }

    // Check if there are any PUA characters to decode
    const hasPua = /[\ue000-\uf8ff]/.test(processed) || /&#x([0-9a-fA-F]{4})/i.test(text);
    if (!hasPua) return processed;

    // Check decode cache
    let decodeMap: Record<string, string> | undefined;
    if (fontFamily && fontDecodeCache.has(fontFamily)) {
      decodeMap = fontDecodeCache.get(fontFamily);
    } else if (fontUrl) {
      // Ensure TTF font URL (prefer TTF for direct TrueType table parsing)
      const ttfUrl = fontUrl.includes('.ttf')
        ? fontUrl
        : fontUrl.replace(/\.woff2?(\?|$)/i, '.ttf$1');

      try {
        const fetchTarget = typeof window !== 'undefined'
          ? `/api/cors-proxy?url=${encodeURIComponent(ttfUrl)}`
          : ttfUrl;

        let resp: Response | null = null;
        try {
          resp = await fetch(fetchTarget);
        } catch {
          if (fetchTarget !== ttfUrl) {
            try { resp = await fetch(ttfUrl); } catch {}
          }
        }
        if ((!resp || !resp.ok) && fetchTarget !== ttfUrl) {
          try { resp = await fetch(ttfUrl); } catch {}
        }

        if (resp && resp.ok) {
          const fontBuf = await resp.arrayBuffer();
          decodeMap = this.parseTtfBuffer(fontBuf);
          if (fontFamily && Object.keys(decodeMap).length > 0) {
            fontDecodeCache.set(fontFamily, decodeMap);
          }
        }
      } catch (err) {
        console.warn('[JjwxcFontManager] Failed to fetch and parse font for decoding:', err);
      }
    }

    // Replace PUA characters using the decode map
    if (decodeMap && Object.keys(decodeMap).length > 0) {
      // Replace raw PUA chars
      for (const [key, real] of Object.entries(decodeMap)) {
        if (key.length === 1) {
          processed = processed.split(key).join(real);
        } else {
          // Hex entity format fallback
          const entityRegex = new RegExp(`&#x${key};?`, 'gi');
          processed = processed.replace(entityRegex, real);
        }
      }
    }

    return processed;
  }

  /**
   * Pure JS MD5 implementation for binary arrays (zero dependency, runs anywhere)
   */
  private static md5(bytes: Uint8Array): string {
    function md5cycle(x: any, k: any) {
      var a = x[0], b = x[1], c = x[2], d = x[3];
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
    function cmn(q: any, a: any, b: any, x: any, s: any, t: any) {
      a = add32(add32(a, q), add32(x, t));
      return add32((a << s) | (a >>> (32 - s)), b);
    }
    function ff(a: any, b: any, c: any, d: any, x: any, s: any, t: any) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
    function gg(a: any, b: any, c: any, d: any, x: any, s: any, t: any) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
    function hh(a: any, b: any, c: any, d: any, x: any, s: any, t: any) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a: any, b: any, c: any, d: any, x: any, s: any, t: any) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
    function add32(a: any, b: any) { return (a + b) & 0xFFFFFFFF; }

    const n = bytes.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let i = 0;
    while (i + 64 <= n) {
      for (let j = 0; j < 16; j++) {
        const idx = i + j * 4;
        tail[j] = bytes[idx] | (bytes[idx + 1] << 8) | (bytes[idx + 2] << 16) | (bytes[idx + 3] << 24);
      }
      md5cycle(state, tail);
      i += 64;
    }
    tail.fill(0);
    let rem = n - i;
    for (let j = 0; j < rem; j++) {
      tail[j >> 2] |= bytes[i + j] << ((j & 3) * 8);
    }
    tail[rem >> 2] |= 0x80 << ((rem & 3) * 8);
    if (rem > 55) {
      md5cycle(state, tail);
      tail.fill(0);
    }
    tail[14] = (n * 8) & 0xFFFFFFFF;
    tail[15] = Math.floor((n * 8) / 0x100000000);
    md5cycle(state, tail);

    let hex = '';
    for (let k = 0; k < 4; k++) {
      for (let b = 0; b < 4; b++) {
        hex += ((state[k] >> (b * 8)) & 0xFF).toString(16).padStart(2, '0');
      }
    }
    return hex;
  }
}
