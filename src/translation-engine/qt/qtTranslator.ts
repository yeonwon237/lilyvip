// Ported from edittruyenqt (src/lib/hanviet.js) — dictionary ("QT thô") translator.
// Keep behaviour in sync with that project when either side changes.
//
// Built-in ("tự thân") Chinese → Vietnamese draft translator.
// Runs entirely client-side — zero AI cost, zero DB reads/writes. Produces
// a rough "QT thô" draft exactly like classic dictionary-based QT/Convert
// tools: greedy longest-match segmentation, glossary override first, then
// dictionary phrase/particle lookup, then per-character Hán-Việt reading.
//
// Four dictionary layers, in priority order (first match wins):
// 1. Hand-curated overrides in ./hanvietData.js (pronouns, grammar particles,
//    "false friend" compounds) — always wins on key collision.
// 2. A large community-built Chinese→Vietnamese phrase dataset (VietPhrase,
//    used for years by the Vietnamese fan-translation "QT/convert" scene),
//    filtered down to 1-3 character entries and bundled as separate JSON
//    chunks.
// 3. `../data/cvdict-extra.json` — words/phrases (2-4 char) found in CVDICT
//    (https://github.com/ph0ngp/CVDICT, CC BY-SA 4.0, a Vietnamese-translated
//    port of CC-CEDICT) that VietPhrase has no entry for at all. Only ever
//    fills gaps — never overrides an existing VietPhrase/curated entry — so
//    it can't make an already-working translation worse, only turn some
//    "unknown character" fallbacks into a real word.
// 4. `../data/hanviet-chars-extra.json` — ~1190 extra single-character
//    Hán-Việt readings for characters missing from layers 1-2, sourced from
//    hanviet-pinyin-words/hanviet-pinyin-wordlist
//    (https://github.com/ph0ngp/hanviet-pinyin-words, MIT) — see the
//    "traditional vs simplified" note below layers 4/5 share. Only
//    characters with exactly one distinct reading across every pinyin that
//    dictionary lists for them are included — a polyphonic character with
//    genuinely different readings per pronunciation is skipped rather than
//    guessed, since this app has no pinyin input to disambiguate with
//    (falls back to "unknown char", same as before, rather than risk a
//    wrong reading in ordinary prose).
// All four layers are bundled as separate JSON/JS modules, loaded lazily on
// first use (dynamic import) so none of this slows down normal app loading —
// only paid for by someone who actually clicks "Tự dịch".
//
// On top of the four dictionary layers, a personal-name heuristic (see
// tryReadNameSpan below) catches Chinese personal names that have no
// Glossary entry yet: a known surname character followed by 1-2 more
// characters gets rendered as a capitalized Hán-Việt name ("Lục Vị Hi")
// instead of being read as ordinary dictionary words — it only fires where
// the dictionary genuinely has no better answer, so it never overrides a
// Glossary entry or an already-correct dictionary match. It reads each
// syllable from a 5th layer, `../data/hanviet-formal-readings.json` (~10k
// entries, same hanviet-pinyin-words/-wordlist source as layer 4, falling
// back to the regular `chars` table for anything missing from it) rather
// than the general single-char fallback table above, because the two want
// different things from the same character: layers 1-4 deliberately favor
// whichever reading is most useful in *ordinary prose* (e.g. 未 → "không",
// its practical/grammatical sense — "not yet"), while a name wants the
// *formal Sino-Vietnamese sound reading* regardless of meaning (未 → "vị"),
// since that's the actual convention for rendering a Chinese name in
// Vietnamese. Reusing the prose-tuned table here was tried first and got
// real names wrong (e.g. 陆未晞 → "Lục Không Hi" instead of "Lục Vị Hi") —
// this dedicated table is why it's now "Lục Vị Hi".
//
// Traditional vs simplified, for layers 4 and 5: hanviet-pinyin-words/
// -wordlist's own data only covers traditional-character forms (its README
// says so explicitly), but this app's source text is simplified Chinese.
// Both JSON files here are pre-converted to simplified keys at build time
// (see the generating script's use of a simplified→traditional map derived
// from CVDICT's own trad/simp column pair) — anyone regenerating either
// file must redo that conversion, not import the upstream data as-is, or
// every surname/character that differs between the two scripts (张/張,
// 陆/陸, 谢/謝, 苏/蘇...) will silently fail to match.
import { HANVIET_CHARS, HANVIET_WORDS, PUNCT_MAP } from "./qtData";
import { ChapterDetector } from "../../book-engine/chapter-detector/ChapterDetector";

type Dict = Record<string, string>;
export interface QtGlossaryTerm { source_term?: string; translation?: string; category?: string }
interface LockedTerm { source: string; translation: string }

// Reserve approved phrases before dictionary segmentation can consume their prefix.
function glossarySpans(text: string, terms: QtGlossaryTerm[]): Map<number, LockedTerm> {
  const byFirst = new Map<string, LockedTerm[]>();
  for (const term of terms || []) {
    const source = String(term.source_term || "").trim();
    const translation = String(term.translation || "").trim();
    if (!source || !translation) continue;
    const list = byFirst.get(source[0]) || [];
    list.push({ source, translation });
    byFirst.set(source[0], list);
  }
  for (const list of byFirst.values()) list.sort((a, b) => b.source.length - a.source.length);
  const spans = new Map<number, LockedTerm>();
  for (let at = 0; at < text.length;) {
    const match = byFirst.get(text[at])?.find(t => text.startsWith(t.source, at));
    if (match) { spans.set(at, match); at += match.source.length; }
    else at += 1;
  }
  return spans;
}

function isCjk(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
}

function isSpace(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\r";
}

function buildGlossaryMap(glossaryTerms: QtGlossaryTerm[]): Map<string, string> {
  const map = new Map<string, string>();
  (glossaryTerms || []).forEach((t) => {
    const src = (t.source_term || "").trim();
    const trans = (t.translation || "").trim();
    if (src && trans) map.set(src, trans);
  });
  return map;
}

// Lily's own fixes for frequent phrases the imported dictionary reads badly
// (没有说 → "cũng không nói gì" left 话 as "thoại"; 叹了口气 → "hít khẩu khí").
const LILY_WORDS: Dict = {
  没有说话: "không nói gì",
  没说话: "không nói gì",
  叹了口气: "thở dài một hơi",
  叹了一口气: "thở dài một hơi",
  叹气: "thở dài",
  松了口气: "thở phào một hơi",
  松了一口气: "thở phào một hơi",
  笑了起来: "bật cười",
  哭了起来: "bật khóc",
  很累: "rất mệt",
  看得: "nhìn đến",
  一眼: "một cái",
  我的天: "trời ơi",
  我的天啊: "trời ơi",
  // 把 left in place means the 把-reorder wasn't sure: "đem sách đặt ở…".
  把: "đem",
  是不是: "có phải",
  // Everyday characters standing alone read by meaning, as QT readers expect
  // ("vừa đi", not "vừa tẩu"). Characters common in given names (小, 天, 雨,
  // 山…) are left out so the name guess still treats them as names.
  人: "người", 走: "đi", 看: "nhìn", 听: "nghe", 站: "đứng", 坐: "ngồi", 跑: "chạy",
  笑: "cười", 哭: "khóc", 来: "tới", 拿: "cầm", 给: "cho", 让: "để", 打: "đánh",
  开: "mở", 关: "đóng", 门: "cửa", 手: "tay", 眼: "mắt", 话: "lời", 事: "chuyện",
  快: "nhanh", 慢: "chậm", 冷: "lạnh", 热: "nóng", 多: "nhiều", 少: "ít",
  短: "ngắn", 低: "thấp", 旧: "cũ",
};

interface LoadedDictionary { chars: Dict; words: Dict; maxWordLen: number; formalChars: Dict }
let dictPromise: Promise<LoadedDictionary> | null = null;

// Merge the big imported dataset with the hand-curated overrides (curated
// wins) once, then cache the result for the rest of the session.
/** Loads (once) the ~10 MB dictionary; later calls reuse the same promise. */
export function loadDictionary(): Promise<LoadedDictionary> {
  if (!dictPromise) {
    dictPromise = Promise.all([
      import("./data/qtdict-vietphrase-chars.json"),
      import("./data/qtdict-vietphrase-words.json"),
      import("./data/qtdict-cvdict-extra.json"),
      import("./data/qtdict-hanviet-chars-extra.json"),
      import("./data/qtdict-hanviet-formal-readings.json"),
    ]).then(([charsMod, wordsMod, cvdictExtraMod, charsExtraMod, formalMod]) => {
      const chars: Dict = { ...(charsExtraMod.default as Dict), ...(charsMod.default as Dict), ...HANVIET_CHARS };
      const words: Dict = { ...(cvdictExtraMod.default as Dict), ...(wordsMod.default as Dict), ...HANVIET_WORDS, ...LILY_WORDS };
      let maxWordLen = 1;
      // eslint-disable-next-line no-restricted-syntax
      for (const k in words) {
        if (k.length > maxWordLen) maxWordLen = k.length;
      }
      loadedWords = words;
      return { chars, words, maxWordLen, formalChars: formalMod.default as Dict };
    });
  }
  return dictPromise;
}

// --- "Modifier 的 noun" clause reorder (Nhóm 4: đảo cú pháp ngược) ---
// Chinese puts the modifier before 的 and the noun after it (定语的中心语);
// Vietnamese puts the noun first ("Giang Nam mưa bụi như rượu", not "mưa bụi
// như rượu đích Giang Nam"). A full syntactic reorder needs real parsing,
// which this dictionary-substitution engine doesn't do, so this only handles
// the narrow, low-risk case where an ENTIRE clause (the text between two
// punctuation marks, or start/end of text) is exactly "[modifier]的[noun]"
// with nothing else in it — nothing else in the clause can get dragged along
// by mistake. Anything less certain (multiple 的 in one clause, no clean
// clause boundary, or text after 的 that looks like it continues into a verb
// rather than staying a noun) is left in the original Chinese order.
const CLAUSE_BOUNDARY_CHARS = new Set([
  ...Object.keys(PUNCT_MAP),
  "\n", ",", ".", "!", "?", ";", ":",
]);

// If the span right after 的 contains one of these characters, it's very
// likely "noun + verb/predicate..." rather than a pure noun phrase — either
// a common verb (e.g. 桌上的书走了 = "the book on the table left", where
// treating the whole "书走了" as the noun would be wrong) or a function word
// that typically starts a new predicate right after its subject (是/有/让/
// 使/被/把/将...), e.g. 波谲云诡的局势让人不安 = "the ever-shifting situation
// makes people uneasy" — "局势让人不安" is subject+predicate, not a noun
// phrase, even though it has no comma before 让. Bail in either case rather
// than risk a garbled sentence.
const REORDER_VERB_GUARD = new Set([
  // Common verbs (mirrors the "Verbs" section of HANVIET_CHARS).
  "看", "听", "走", "跑", "坐", "站", "躺", "笑", "哭", "打", "杀", "死", "生",
  "活", "来", "去", "进", "出", "开", "关", "拿", "放", "给", "取", "问", "答",
  "想", "知", "道", "记", "忘", "喜", "欢", "爱", "恨", "怕", "惊", "修", "炼",
  "到", "动", "说", "认", "识", "明", "觉", "希", "望", "决", "定", "始",
  "继", "续", "停", "止", "结", "束",
  // Copula / causative / passive / modal markers that typically open a new
  // predicate right after the subject (mirrors HANVIET_WORDS' copula,
  // negation, adverb and modal sections).
  "是", "有", "没", "别", "让", "使", "令", "叫", "被", "把", "将",
  "也", "都", "很", "太", "更", "最", "还", "又", "再", "就", "才", "只",
  "在", "和", "跟", "与", "能", "会", "要", "应", "该", "需", "须", "可",
]);

// Kept short and symmetric with MAX_NOUN_LEN on purpose: a real "modifier的
// noun" clause tends to have a short modifier (an adjective, a short
// descriptive phrase, a name/pronoun). A long modifier candidate is a signal
// that what's actually before 的 is "[verb phrase][true short modifier]",
// e.g. "还伸手回抱住丁其羽的腰" ("[still reached out and hugged] [Ding Qiyu]的
// [waist]") — the real modifier is just "丁其羽", not the whole "还伸手回抱住
// 丁其羽". A wide cap here previously reordered whole verb phrases like that
// by mistake (confirmed against a real chapter), so keep this tight.
const MAX_MODIFIER_LEN = 6;
const MAX_NOUN_LEN = 6;

// --- "把/将 + object + verb" reorder (Nhóm 5: đảo câu 把/将-construction) ---
// 把/将 fronts the object before the verb (把字句/将字句) — Chinese "[chủ ngữ]
// 把/将 [tân ngữ] [động từ]...", Vietnamese wants the verb before the object.
// Same narrow, bail-rather-than-guess philosophy as Nhóm 4 above: only
// reorders a clause that is exactly "[optional subject]把/将[object][verb
// phrase]" with nothing ambiguous in it.
//
// Finding where the object ends and the verb phrase begins needs real
// parsing, which this engine doesn't have — instead this scans forward from
// the marker for the first character in BA_VERB_SIGNAL (a deliberately small
// set of common, unambiguous action-verb characters) and treats that as the
// start of the verb phrase. BA_VERB_SIGNAL intentionally excludes copulas,
// modals, degree adverbs and conjunctions (是/有/很/和/跟/与...) — those are
// far more likely to occur *inside* a multi-character or coordinated object
// ("他和她", "很重要的东西") than to genuinely start the next predicate, and
// firing on them risks splitting the object in the wrong place. Missing some
// valid verb starts this way is an acceptable trade for not garbling ones it
// does catch.
//
// Deliberately excluded: 给. It's extremely common as the *second* syllable
// of a compound verb (递给/交给/还给/送给/寄给/带给— "hand/return/send X to")
// rather than a verb start on its own, and including it made the scanner
// stop one character too early on those ("把书递给我" was splitting at 给
// instead of 递, stranding "书递" as a nonsense "object"). Every compound's
// *first* syllable (递/交/还/送/寄...) is in the set instead, so the scan
// still stops at the right place.
//
// The object is appended at the END of the verb phrase rather than right
// after the verb itself (e.g. "đưa cho người bên cạnh quyển sổ nhỏ" instead
// of the more natural "đưa quyển sổ nhỏ cho người bên cạnh") — knowing
// exactly where the verb word ends and a complement/preposition begins would
// again need real parsing. This settles for turning an unreadable sentence
// into a readable-but-not-perfectly-ordered one.
const BA_VERB_SIGNAL = new Set([
  "看", "听", "走", "跑", "坐", "站", "躺", "笑", "哭", "打", "杀", "死", "生",
  "活", "来", "去", "进", "出", "开", "关", "拿", "放", "取", "问", "答",
  "想", "知", "道", "记", "忘", "喜", "欢", "爱", "恨", "怕", "惊", "修", "炼",
  "到", "动", "说", "认", "识", "明", "觉", "希", "望", "决", "定", "始",
  "继", "续", "停", "止", "结", "束", "推", "拉", "扔", "丢", "摔", "撞",
  "抱", "抓", "握", "踢", "咬", "撕", "砸", "敲", "揉", "拽", "扯", "摸",
  "递", "交", "还", "送", "寄", "翻", "掀", "甩", "晃", "捏", "拧", "扭",
  "插", "塞", "挂", "摆", "藏", "躲", "遮", "盖", "擦", "洗", "刷", "剪",
  "削", "砍", "穿", "戴", "写", "画", "建", "造", "买", "卖", "搬", "抬",
  "举", "投", "踩", "带",
]);
const MAX_BA_OBJECT_LEN = 8;

function reorderOneBaJiangClause(clause: string): string {
  const baIndex = clause.indexOf("把");
  const jiangIndex = clause.indexOf("将");
  // Both markers, or the same marker twice, means a compound/ambiguous
  // construction this heuristic isn't confident about — bail.
  if (baIndex >= 0 && jiangIndex >= 0) return clause;
  const markerIndex = baIndex >= 0 ? baIndex : jiangIndex;
  if (markerIndex < 0) return clause;
  const marker = baIndex >= 0 ? "把" : "将";
  if (clause.indexOf(marker, markerIndex + 1) >= 0) return clause;

  const before = clause.slice(0, markerIndex);
  const after = clause.slice(markerIndex + marker.length);
  let verbStart = -1;
  for (let idx = 1; idx < after.length; idx += 1) {
    if (BA_VERB_SIGNAL.has(after[idx])) {
      verbStart = idx;
      break;
    }
  }
  if (verbStart <= 0) return clause;

  const obj = after.slice(0, verbStart);
  const rest = after.slice(verbStart);
  if (obj.length > MAX_BA_OBJECT_LEN) return clause;
  if (obj.includes("把") || obj.includes("将") || obj.includes("的")) return clause;

  return before + rest + obj;
}

// --- Sentence capitalization ---
// The dictionary/reading tables are all lowercase (that's the normal way to
// write a Vietnamese entry), so raw output never capitalizes anything except
// glossary terms that already come pre-capitalized (character names...).
// This pass capitalizes the first letter after start-of-text, a newline, a
// run of sentence-ending punctuation (.!?…), or a colon introducing a quote
// — covers normal sentences and "X nói:"Lời thoại..."" dialogue openings.
const VN_LOWER = "a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ";
const SENTENCE_START_RE = new RegExp(`(^|\\n|[.!?…]+|:)([\\s"'“”‘’»]*)([${VN_LOWER}])`, "gu");

function capitalizeSentences(text: string): string {
  return text.replace(SENTENCE_START_RE, (_m: string, sep: string, spacing: string, letter: string) => sep + spacing + letter.toUpperCase());
}

function reorderOneClause(clause: string): string {
  const deIndex = clause.indexOf("的");
  // No 的, or nothing before/after it to work with.
  if (deIndex <= 0 || deIndex >= clause.length - 1) return clause;

  const modifier = clause.slice(0, deIndex);
  const noun = clause.slice(deIndex + 1);

  if (isDeWord(clause, deIndex) || /^的(天|妈|神)/.test(clause.slice(deIndex, deIndex + 2))) return clause;
  // Another 的 on either side means an ambiguous/nested construction — skip.
  if (modifier.includes("的") || noun.includes("的")) return clause;
  if (modifier.length > MAX_MODIFIER_LEN || noun.length > MAX_NOUN_LEN) return clause;
  for (const ch of noun) {
    if (REORDER_VERB_GUARD.has(ch)) return clause;
  }
  // A verb character inside the MODIFIER span (not just the noun span, above)
  // means this isn't really "[modifier]的[noun]" at all — it's "[subject]
  // [verb]...的[noun]" with the noun as the verb's object, e.g. "温锦没点评
  // 她的狂妄发言" ("Ôn Cẩm didn't comment on her arrogant remarks"): the
  // 6-char span before 的 ("温锦没点评她") slips under MAX_MODIFIER_LEN and
  // has no verb char *in the noun*, but it's a full clause (subject+negation
  // +verb+object), not an attributive phrase — swapping it with the noun
  // produces "cuồng vọng phát ngôn ôn cẩm không bình luận nàng"-style
  // nonsense. Real chapter example that motivated this.
  for (const ch of modifier) {
    if (REORDER_VERB_GUARD.has(ch)) return clause;
  }

  return noun + modifier;
}

// --- Lily-only rules (not in edittruyenqt) ---
// Same bail-rather-than-guess approach as the groups above. Vietnamese words
// are written straight into the source text: the main loop passes Latin runs
// through untouched, so they come out exactly as written.

// "第12章 标题" → "Chương 12: 标题" (a heading otherwise reads "Đệ 12 chương").
const HEADING_UNITS: Record<string, string> = { 章: "Chương", 回: "Hồi", 节: "Tiết", 卷: "Quyển" };
const HEADING_RE = /^(\s*)第([0-9０-９]+|[零〇一二两三四五六七八九十百千]+)([章回节卷])\s*/;

function rewriteChapterHeading(clause: string): string {
  const match = clause.match(HEADING_RE);
  if (!match) return clause;
  const digits = match[2].replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
  const number = /^\d+$/.test(digits) ? Number(digits) : ChapterDetector.parseChineseNumber(match[2].replace(/〇/g, "零"));
  if (!number) return clause;
  const rest = clause.slice(match[0].length);
  // A heading followed by a title (even one that is a locked name) gets a colon.
  const hasTitle = Boolean(rest) || /\s$/.test(match[0]);
  return `${match[1]}${HEADING_UNITS[match[3]]} ${number}${hasTitle ? ": " : ""}${rest}`;
}

// "…的时候" is a time clause: Vietnamese puts "lúc" first. Without this, the
// generic 的 reorder above treats "时候…" as the noun and scrambles it
// ("爬过心脏的时候一阵瘙痒" → "Lúc một hồi ngứa bò qua trái tim").
function reorderWhenClause(clause: string): string {
  const at = clause.indexOf("的时候");
  if (at <= 0 || clause.indexOf("的时候", at + 1) >= 0) return clause;
  const body = clause.slice(0, at).replace(/^当/, "");
  const after = clause.slice(at + 3);
  if (!body) return clause;
  return `时候${body}${after ? "，" + after : ""}`;
}

// "在 + place + 上/里/中…" is location, not the progressive "đang" the
// dictionary picks for 在: "在书桌上" → "ở trên bàn sách", "在指间" → "ở giữa
// ngón tay". Only fires for a short place span with no verb in it.
const LOCATIVES: Record<string, string> = {
  上: "trên", 里: "trong", 内: "trong", 中: "trong", 下: "dưới", 外: "ngoài",
  旁: "bên cạnh", 边: "bên cạnh", 前: "trước", 后: "sau", 间: "giữa",
};
const MAX_PLACE_LEN = 6;

// Set once the dictionary is loaded; reorderLocative() needs it to keep real
// place words intact (地上 → "trên mặt đất") instead of splitting them.
let loadedWords: Dict | null = null;

const hasWord = (word: string) => Boolean(loadedWords && Object.prototype.hasOwnProperty.call(loadedWords, word));

function reorderLocative(clause: string): string {
  return clause.replace(/[在从]([一-鿿]{1,7})/g, (whole: string, span: string, offset: number) => {
    // Verb + 在 compounds (靠在, 放在, 坐在…) already read "tựa ở", "đặt ở"…:
    // keep them whole and only fix the place phrase that follows.
    const keepMarker = whole[0] === "在" && offset > 0 && hasWord(clause[offset - 1] + "在");
    const lead = keepMarker ? "在" : whole[0] === "从" ? " từ" : " ở";
    // Shortest place first: 在地上落下 is "地上", not "地上落" + 下.
    for (let len = 1; len <= Math.min(span.length - 1, MAX_PLACE_LEN); len += 1) {
      const place = span.slice(0, len);
      const locative = span[len];
      if (!LOCATIVES[locative]) continue;
      if (/^[这那哪]/.test(place) || [...place].some(ch => REORDER_VERB_GUARD.has(ch) || ch === "的")) continue;
      const tail = span.slice(len + 1);
      // A dictionary compound (地上, 桌上…) already reads as a place phrase.
      if (hasWord(place + locative)) return `${lead} ${place}${locative}${tail}`;
      return `${lead} ${LOCATIVES[locative]} ${place}${tail}`;
    }
    return whole;
  });
}

const isWordAt = (text: string, at: number, len: number) => at + len <= text.length && hasWord(text.slice(at, at + len));

/** Longest dictionary word (up to maxLen) starting at `at`, or a single character. */
function wordLengthAt(text: string, at: number, maxLen = 4): number {
  for (let len = Math.min(maxLen, text.length - at); len >= 2; len -= 1) {
    if (/^[一-鿿]+$/.test(text.slice(at, at + len)) && isWordAt(text, at, len)) return len;
  }
  return 1;
}

// Single-character nouns common enough after 的 to reorder on their own
// (她的手 → "tay của nàng"). Other single characters are too often verbs.
const SHORT_NOUNS = new Set([..."雨雪风花月手脸心眼头腰脚腿嘴唇身背肩发声话家人名事错书衣房门车衫袖指眉额颈腕耳鼻胸怀梦信剑刀笔杯茶酒床屋伞"]);
// Characters that start a predicate, not a noun: 的 before them isn't "của".
// Real words that start with 的 (the dictionary also has junk like 的书/的梦).
const isDeWord = (text: string, at: number) => /^的(确|话|士|哥)/.test(text.slice(at, at + 2));
const PREDICATE_START = new Set([..."是有没在把被让和跟与也都很太还又再就才只能会要不了着过得地"]);

function nounLengthAt(text: string, at: number): number {
  if (at >= text.length || !/[一-鿿]/.test(text[at]) || PREDICATE_START.has(text[at])) return 0;
  const len = wordLengthAt(text, at);
  // 脸红了: 脸红 ("đỏ mặt") followed by 了 is the predicate; the noun is just 脸.
  if (len > 1 && SHORT_NOUNS.has(text[at]) && /[了着过]/.test(text[at + len - 1] + (text[at + len] || ""))) return 1;
  if (len === 1 && !SHORT_NOUNS.has(text[at])) return 0;
  return len;
}

/** Noun at `at`, pulling in a trailing locative: 怀里 / 眼睛里 → "trong mắt". */
function nounPhraseAt(text: string, at: number): { source: string; length: number } | null {
  const len = nounLengthAt(text, at);
  if (!len) return null;
  const noun = text.slice(at, at + len);
  const locative = text[at + len];
  if (LOCATIVES[locative] && !isWordAt(text, at + len, 2)) {
    return { source: `${LOCATIVES[locative]} ${noun}`, length: len + 1 };
  }
  return { source: noun, length: len };
}

// "她的声音" → "声音 của 她" ("thanh âm của nàng"). Owners are pronouns and
// the book's names; runs over the whole text, before names are locked.
const PRONOUN_OWNERS = ["我们", "你们", "他们", "她们", "它们", "咱们", "我", "你", "您", "他", "她", "它"];

function reorderPossessive(text: string, names: string[]): string {
  const owners = [...names, ...PRONOUN_OWNERS].filter(Boolean).sort((a, b) => b.length - a.length);
  let out = "";
  let at = 0;
  while (at < text.length) {
    const owner = owners.find(candidate => text.startsWith(candidate, at));
    const de = owner ? at + owner.length : -1;
    const ownerIsWordTail = owner && owner.length === 1 && at > 0 && isWordAt(text, at - 1, 2);
    // 我的天 is an exclamation, not "trời của ta".
    if (!owner || ownerIsWordTail || text[de] !== "的" || isDeWord(text, de) || /^的(天|妈|神)/.test(text.slice(de, de + 2))) {
      out += owner && !ownerIsWordTail ? owner : text[at];
      at += owner && !ownerIsWordTail ? owner.length : 1;
      continue;
    }
    const noun = nounPhraseAt(text, de + 1);
    if (!noun) {
      out += owner;
      at += owner.length;
      continue;
    }
    out += `${noun.source} của ${owner}`;
    at = de + 1 + noun.length;
  }
  return out;
}

// "很长的梦" → "梦很长" ("mộng rất dài"), "这么漂亮的女孩子" → "nữ hài tử xinh
// đẹp như vậy": a degree word + short adjective before 的 describes the noun.
const DEGREE_FIRST = ["非常", "十分", "特别", "极其", "极为", "格外", "很", "最", "更", "太", "好"];
const DEGREE_AFTER = ["这么", "那么", "如此", "这样", "那样", "多么"];

function reorderDegreeModifier(clause: string): string {
  const degrees = [...DEGREE_AFTER, ...DEGREE_FIRST];
  let out = clause;
  for (const degree of degrees) {
    let from = 0;
    for (let at = out.indexOf(degree, from); at >= 0; at = out.indexOf(degree, from)) {
      from = at + 1;
      const adjAt = at + degree.length;
      // A verb there (很喜欢的书) makes it a relative clause: leave it.
      const adjLen = [2, 1].find(len => out[adjAt + len] === "的" && /^[一-鿿]+$/.test(out.slice(adjAt, adjAt + len))
        && ![...out.slice(adjAt, adjAt + len)].some(ch => ch === "的" || REORDER_VERB_GUARD.has(ch) || BA_VERB_SIGNAL.has(ch)));
      // 友好的 is "friendly", not degree 好 + adjective; 很 never ends a word.
      if (!adjLen || (degree.length === 1 && degree !== "很" && isWordAt(out, at - 1, 2))) continue;
      const de = adjAt + adjLen;
      if (isDeWord(out, de)) continue;
      const noun = nounPhraseAt(out, de + 1);
      if (!noun) continue;
      const adj = out.slice(adjAt, de);
      const phrase = DEGREE_AFTER.includes(degree) ? `${noun.source}${adj}${degree}` : `${noun.source}${degree}${adj}`;
      out = out.slice(0, at) + phrase + out.slice(de + 1 + noun.length);
      from = at + phrase.length;
    }
  }
  return out;
}

// "手里的书" → "书手里" ("sách trong tay"), "在桌子上的书" → "书在桌子上"
// ("sách ở trên bàn"): a place phrase before 的 follows the noun.
function reorderPlaceModifier(clause: string): string {
  let out = clause;
  for (let de = out.indexOf("的", 1); de > 0; de = out.indexOf("的", de + 1)) {
    const locative = out[de - 1];
    if (!LOCATIVES[locative] || isDeWord(out, de)) continue;
    // The place is read backwards from the locative: 把手里的 → 手里, not 把手.
    const usable = (len: number) => {
      const place = out.slice(de - 1 - len, de - 1);
      return de - 1 - len >= 0 && /^[一-鿿]+$/.test(place)
        && !PREDICATE_START.has(place[0]) && !/[把将被给对向]/.test(place[0])
        && ![...place].some(ch => REORDER_VERB_GUARD.has(ch));
    };
    const placeLen = [3, 2, 1].find(len => usable(len) && hasWord(out.slice(de - 1 - len, de)))
      ?? [2, 1].find(len => usable(len) && (len === 1 || hasWord(out.slice(de - 1 - len, de - 1))));
    if (!placeLen) continue;
    let start = de - 1 - placeLen;
    if (start > 0 && /[在从]/.test(out[start - 1])) start -= 1;
    // Keep a posture verb with its 在: 躺在床上的女人 → "nữ nhân nằm ở trên giường".
    if (start > 0 && out[start] === "在" && hasWord(out[start - 1] + "在")) start -= 1;
    const noun = nounPhraseAt(out, de + 1);
    if (!noun || noun.source !== out.slice(de + 1, de + 1 + noun.length)) continue;
    const phrase = `${noun.source}${out.slice(start, de)}`;
    out = out.slice(0, start) + phrase + out.slice(de + 1 + noun.length);
    de = start + phrase.length - 1;
  }
  return out;
}

// "站在门口的人" → "人站在门口" ("người đứng ở cửa"): posture verb + 在 +
// place describing the noun after 的.
function reorderPostureModifier(clause: string): string {
  let out = clause;
  for (let de = out.indexOf("的", 3); de > 0; de = out.indexOf("的", de + 1)) {
    if (isDeWord(out, de)) continue;
    const placeLen = [3, 2].find(len => de - len - 2 >= 0 && out[de - len - 1] === "在" && hasWord(out.slice(de - len, de)));
    if (!placeLen) continue;
    const start = de - placeLen - 2;
    if (!hasWord(out.slice(start, start + 2))) continue;
    const noun = nounPhraseAt(out, de + 1);
    if (!noun || noun.source !== out.slice(de + 1, de + 1 + noun.length)) continue;
    const phrase = `${noun.source}${out.slice(start, de)}`;
    out = out.slice(0, start) + phrase + out.slice(de + 1 + noun.length);
    de = start + phrase.length - 1;
  }
  return out;
}

// "一边走一边想" → "vừa đi vừa nghĩ" (a lone 一边 stays "một bên").
function pairedWhile(clause: string): string {
  return (clause.match(/一边|一面/g) || []).length >= 2 ? clause.replace(/一边|一面/g, " vừa ") : clause;
}

// "像山间的泉水一样" → "giống như nước suối trong núi".
function reorderSimile(clause: string): string {
  return clause.replace(/(就像|好像|好似|宛如|如同|仿佛|犹如|像)([^像]{1,12}?)(一样|一般|似的)/, (_whole, _like: string, body: string) =>
    ` giống như ${reorderPlaceModifier(reorderOneClause(body))}`);
}

// "如果你不想去的话" → "nếu ngươi không muốn đi" (的话 would read "nếu" twice).
function dropConditionalDehua(clause: string): string {
  return /如果|假如|要是|若是|万一|倘若|如若|只要/.test(clause) ? clause.replace(/的话$/, "") : clause;
}

// --- Word segmentation ---
// Left-to-right greedy matching grabs the longest word at each position and
// can steal the first character of the next word: 没有关|系 ("không có đóng
// hệ"), 这件事|情. Instead pick the split with the fewest pieces, then the
// fewest single characters, then the most even word lengths (没有|关系 over
// 没有关|系 or 没|有关系). Remaining ties keep the longer first word, like the
// greedy match did.
function segmentRun(run: string, isWord: (candidate: string) => boolean, maxLen: number): number[] {
  type Cost = [pieces: number, singles: number, squares: number];
  const best: Array<{ cost: Cost; len: number }> = new Array(run.length + 1);
  best[run.length] = { cost: [0, 0, 0], len: 0 };
  const better = (a: Cost, b: Cost) => a[0] !== b[0] ? a[0] < b[0] : a[1] !== b[1] ? a[1] < b[1] : a[2] < b[2];
  for (let at = run.length - 1; at >= 0; at -= 1) {
    for (let len = Math.min(maxLen, run.length - at); len >= 1; len -= 1) {
      if (len > 1 && !isWord(run.slice(at, at + len))) continue;
      const rest = best[at + len].cost;
      const cost: Cost = [rest[0] + 1, rest[1] + (len === 1 ? 1 : 0), rest[2] + len * len];
      if (!best[at] || better(cost, best[at].cost)) best[at] = { cost, len };
    }
  }
  const lengths: number[] = [];
  for (let at = 0; at < run.length; at += best[at].len) lengths.push(best[at].len);
  return lengths;
}

// The imported dictionary glues pronouns onto a following verb (他看 → "nhìn
// hắn", making the subject an object) or a preceding particle (了你 → "ngươi
// rồi"). Pronoun + noun entries (她身边 → "bên người nàng") are kept.
const PRONOUN_WORDS = new Set(["他人", "他乡", "他日", "他方", "你好", "我国", "我方", "我军", "你我", "我辈", "他俩", "她俩", "我俩", "你俩", "自我"]);
const isPronounJunk = (word: string) => word.length >= 2 && !PRONOUN_WORDS.has(word) && (
  (/^[他她它我你您]/.test(word) && (REORDER_VERB_GUARD.has(word[1]) || BA_VERB_SIGNAL.has(word[1])))
  || /^[了着过][他她它我你您]/.test(word));

/** Start position → word length for every CJK run between locked terms. */
function segmentText(text: string, lockedAt: Map<number, LockedTerm>, isWord: (candidate: string) => boolean, maxLen: number): Map<number, number> {
  const starts = new Map<number, number>();
  let runStart = -1;
  const flush = (end: number) => {
    if (runStart < 0) return;
    let at = runStart;
    for (const len of segmentRun(text.slice(runStart, end), isWord, maxLen)) {
      starts.set(at, len);
      at += len;
    }
    runStart = -1;
  };
  for (let i = 0; i <= text.length; i += 1) {
    const locked = lockedAt.get(i);
    if (locked) {
      flush(i);
      i += locked.source.length - 1;
      continue;
    }
    if (i < text.length && isCjk(text[i])) {
      if (runStart < 0) runStart = i;
    } else flush(i);
  }
  return starts;
}

// Spacing around quotes and punctuation once the Vietnamese text is joined:
// “Ngươi tới? ”Nàng → “Ngươi tới?” Nàng.
function tidyPunctuation(text: string): string {
  return text
    .replace(/[ \t]+([”’»),.!?;:…])/g, "$1")
    .replace(/([“‘«(])[ \t]+/g, "$1")
    .replace(/([”’»])(?=[\p{L}\p{N}“‘«])/gu, "$1 ")
    .replace(/([\p{L}\p{N},.!?;:…])([“‘«])/gu, "$1 $2")
    .replace(/\bcái cái\b/g, "cái")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "");
}

function mapClauses(text: string, rewrite: (clause: string) => string): string {
  let out = "";
  let clauseStart = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (CLAUSE_BOUNDARY_CHARS.has(text[i])) {
      out += rewrite(text.slice(clauseStart, i)) + text[i];
      clauseStart = i + 1;
    }
  }
  return out + rewrite(text.slice(clauseStart));
}

function reorderClause(clause: string): string {
  const heading = rewriteChapterHeading(clause);
  if (heading !== clause) return heading;
  // 把/将-restructure first: it can move a 的-bearing object phrase to a spot
  // where Nhóm 4 can still catch it, but not the other way around.
  const ba = reorderOneBaJiangClause(clause);
  const lily = reorderPostureModifier(reorderPlaceModifier(reorderDegreeModifier(reorderSimile(pairedWhile(dropConditionalDehua(ba))))));
  return reorderLocative(reorderOneClause(lily));
}

function reorderModifierClauses(sourceText: string): string {
  let out = "";
  let clauseStart = 0;
  const n = sourceText.length;
  for (let i = 0; i < n; i += 1) {
    if (CLAUSE_BOUNDARY_CHARS.has(sourceText[i])) {
      out += reorderClause(sourceText.slice(clauseStart, i)) + sourceText[i];
      clauseStart = i + 1;
    }
  }
  out += reorderClause(sourceText.slice(clauseStart));
  return out;
}

// --- Personal-name heuristic (surname + 1-2 following characters) ---
// Chinese personal names are conventionally rendered in Vietnamese as the
// capitalized Hán-Việt reading of each character ("Lục Vị Hi", not "lục
// không hi") — see the "Common Chinese surnames" note in hanvietData.js.
// The normal greedy dictionary match has no concept of "this might be a
// name", though: it happily lets an ordinary WORDS-level entry (a grammar/
// function word) swallow a character that's actually sitting inside an
// unrecognized name. Real example that motivated this (a chapter with no
// Glossary entries yet): 陆未晞 used to come out "lục không hi", because 未
// independently matches WORDS as a negation word ("không") even though
// here it's the 2nd syllable of a 3-syllable name, not doing negation duty.
//
// This only ever fires as a *last resort*, gated so it can't touch anything
// the dictionary already handles correctly:
// - SURNAME_CHARS is checked only once the normal WORDS/glossary scan has
//   already failed to match anything of length >= 2 starting at that exact
//   position — so a real recognized word/phrase that happens to start with
//   a surname character (e.g. "陆地" = "lục địa", a real WORDS entry) is
//   matched by the normal greedy path first and this heuristic is never
//   even consulted for it.
// - Once triggered, it claims the next 1-2 characters *only* as long as
//   they likewise have no length>=2 WORDS/glossary match starting there, AND
//   no length==1 WORDS entry of their own either (unlike the surname
//   character itself, checked below) — a given-name character is almost
//   always a content/poetic word with no standalone dictionary entry, so a
//   character that DOES have one (是, 的, 了, 在...) is almost certainly a
//   real function/content word starting a new clause, not a continuation of
//   the name, and is left for the next loop iteration instead. This was
//   found live: without it, "龙是中国文化" (dragon is Chinese culture) — 龙
//   being a rare-but-real surname with no length>=2 match right after it —
//   grouped "是" into a fake 2-syllable name "Long Là" instead of leaving
//   the copula alone.
// - A single surname character with nothing plausible after it (already
//   has, or leads into, real dictionary coverage) is left completely alone
//   — this never overrides the Glossary, and never touches a name that
//   already has a Glossary entry (a Glossary hit is itself a length>=2
//   match, so the gate above blocks this heuristic from ever running on it).
// Best-effort by nature: this is a heuristic over a fixed surname list, not
// real named-entity recognition — it will still miss names that don't start
// with a listed surname character, and (rarely) may mis-group ordinary text
// that happens to look like [surname char][1-2 more untranslated chars]
// with nothing else nearby. Adding the name to the project's Glossary is
// still the reliable fix — this only helps *before* that's been done.
const SURNAME_CHARS = new Set([
  "丁", "羽", "莲", "陈", "李", "张", "刘", "杨", "赵", "周", "吴", "徐", "马",
  "朱", "胡", "郑", "谢", "何", "苏", "韩", "陆", "郭", "孙", "黄", "林", "梁",
  "宋", "唐", "冯", "邓", "许", "傅", "沈", "曾", "彭", "吕", "卢", "蒋", "蔡",
  "贾", "魏", "薛", "叶", "阎", "余", "潘", "杜", "戴", "邹", "郝", "孔", "崔",
  "康", "邱", "秦", "顾", "侯", "邵", "孟", "段", "尹", "黎", "乔", "贺", "赖",
  "龚", "萧", "梅", "牛", "董", "任", "姜", "范", "方", "姚", "谭", "廖", "熊",
  "汪", "田", "史", "龙", "江", "石", "万", "文", "高", "武", "常", "东", "钱",
  "汤", "白", "金",
]);
const MAX_NAME_SPAN = 3; // surname + up to 2 given-name characters

// --- Adverbial 地 particle ---
// 地 is overwhelmingly used in ordinary prose as the adverb-forming suffix
// (形容词/短语+地+动词, like English "-ly") once it falls through to the
// single-character fallback table — every common *noun* sense of 地 ("land",
// "ground", "地方/地上/原地/当地"...) is a 2+ character compound that the
// WORDS-layer dictionary matches first via greedy longest-match, so this
// fallback is essentially never reached for those. Real example that
// motivated this: "毫不留情地敲在...后脑勺上" was coming out "không nương
// tay địa dập đầu..." — "địa" isn't a Vietnamese word here, it's just noise
// left over from reading 地 by its formal Hán-Việt sound.
// The one case where a bare fallback 地 genuinely is the noun "land/place"
// (rather than the adverb suffix) is immediately followed by a locative
// character forming an unlisted compound (地旁/地头...) — kept as "địa"
// there rather than silently dropped, since guessing wrong by dropping a
// real noun is worse than guessing wrong by keeping an adverb suffix.
const LOCATIVE_SUFFIX_CHARS = new Set(["上", "下", "里", "内", "外", "面", "中", "间", "头", "旁", "边", "前", "后", "左", "右", "东", "南", "西", "北", "方"]);

function hasWordMatchAt(sourceText: string, pos: number, glossaryMap: Map<string, string>, WORDS: Dict, maxWordLen: number): boolean {
  const maxLen = Math.min(maxWordLen, sourceText.length - pos);
  for (let len = maxLen; len >= 2; len -= 1) {
    const candidate = sourceText.slice(pos, pos + len);
    if (glossaryMap.has(candidate)) return true;
    if (Object.prototype.hasOwnProperty.call(WORDS, candidate)) return true;
  }
  return false;
}

function tryReadNameSpan(sourceText: string, pos: number, CHARS: Dict, FORMAL_CHARS: Dict, glossaryMap: Map<string, string>, WORDS: Dict, maxWordLen: number): { text: string; consumed: number } | null {
  const ch = sourceText[pos];
  if (!SURNAME_CHARS.has(ch)) return null;
  const surnameReading = FORMAL_CHARS[ch] || CHARS[ch];
  if (!surnameReading) return null;
  if (hasWordMatchAt(sourceText, pos, glossaryMap, WORDS, maxWordLen)) return null;

  const syllables = [surnameReading];
  const n = sourceText.length;
  let i = pos + 1;
  while (syllables.length < MAX_NAME_SPAN && i < n && isCjk(sourceText[i])) {
    const nextCh = sourceText[i];
    if (hasWordMatchAt(sourceText, i, glossaryMap, WORDS, maxWordLen)) break;
    // Lily's everyday single-character readings (走 → "đi") don't end a name.
    const isFunctionWord = Object.prototype.hasOwnProperty.call(WORDS, nextCh) && !Object.prototype.hasOwnProperty.call(LILY_WORDS, nextCh);
    if (glossaryMap.has(nextCh) || isFunctionWord) break;
    const reading = FORMAL_CHARS[nextCh] || CHARS[nextCh];
    if (!reading) break;
    syllables.push(reading);
    i += 1;
  }
  if (syllables.length < 2) return null; // a lone surname char isn't worth a special case

  const text = syllables.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
  return { text, consumed: i - pos };
}

export interface QtDiagnostics {
  glossaryChars: number;
  phraseChars: number;
  fallbackChars: number;
  guessedNameChars: number;
  fallbackSpans: Array<{ source: string; start: number; end: number; kind: string }>;
}
export interface QtTranslation {
  text: string;
  coverage: number;
  unknownChars: Array<{ ch: string; count: number }>;
  diagnostics?: QtDiagnostics;
}

/**
 * Translate Chinese source text into a rough Vietnamese draft.
 * @param {string} sourceText
 * @param {Array<{source_term:string, translation:string}>} glossaryTerms - project glossary, highest priority
 * @returns {Promise<{ text: string, coverage: number, unknownChars: Array<{ch:string,count:number}>, diagnostics: {glossaryChars:number,phraseChars:number,fallbackChars:number,guessedNameChars:number,fallbackSpans:Array<{source:string,start:number,end:number,kind:string}>} }>}
 */
export async function translateHanViet(sourceText: string, glossaryTerms: QtGlossaryTerm[] = []): Promise<QtTranslation> {
  if (!sourceText) return { text: "", coverage: 1, unknownChars: [] };

  // Never reorder characters inside approved names/phrases. Reorder only the
  // gaps between them, so grammar heuristics cannot destroy glossary matches.
  // Single-character address defaults must not split plural words (我/我们)
  // or compounds. They still override equal dictionary keys in glossaryMap.
  const dictionary = await loadDictionary();
  const strictTerms = glossaryTerms.filter(t => !(t.category === "Xưng hô" && t.source_term?.trim().length === 1));
  // Time clauses first, over whole clauses: a "…的时候" clause often has a
  // character name inside it, which would otherwise split it into pieces.
  sourceText = mapClauses(sourceText, reorderWhenClause);
  const nameSources = strictTerms
    .filter(t => /^\p{Lu}/u.test(String(t.translation || "").trim()))
    .map(t => String(t.source_term || "").trim());
  sourceText = reorderPossessive(sourceText, nameSources);
  const originalLocks = glossarySpans(sourceText, strictTerms);
  let reordered = "";
  let cursor = 0;
  for (const [at, term] of originalLocks) {
    reordered += reorderModifierClauses(sourceText.slice(cursor, at)) + term.source;
    cursor = at + term.source.length;
  }
  sourceText = reordered + reorderModifierClauses(sourceText.slice(cursor));

  const { chars: CHARS, words: WORDS, maxWordLen: builtinMaxLen, formalChars: FORMAL_CHARS } = dictionary;

  const glossaryMap = buildGlossaryMap(glossaryTerms);
  let maxGlossaryLen = 1;
  glossaryMap.forEach((_v, k) => {
    if (k.length > maxGlossaryLen) maxGlossaryLen = k.length;
  });
  const maxWordLen = Math.max(maxGlossaryLen, builtinMaxLen);

  const out: string[] = [];
  let lastWasWord = false;
  let cjkTotal = 0;
  let cjkMatched = 0;
  const unknown = new Map<string, number>();
  const locks = glossarySpans(sourceText, strictTerms);
  const lockStarts = [...locks.keys()];
  const isWord = (candidate: string) => glossaryMap.has(candidate)
    || (Object.prototype.hasOwnProperty.call(WORDS, candidate) && !isPronounJunk(candidate));
  const segments = segmentText(sourceText, locks, isWord, maxWordLen);
  let lockIndex = 0;
  const diagnostics: QtDiagnostics = { glossaryChars: 0, phraseChars: 0, fallbackChars: 0, guessedNameChars: 0, fallbackSpans: [] };
  const recordFallback = (start: number, length: number, kind = "fallback") => {
    const previous = diagnostics.fallbackSpans.at(-1);
    if (previous && previous.kind === kind && previous.end === start && previous.source.length + length <= 8) {
      previous.source += sourceText.slice(start, start + length);
      previous.end += length;
    } else diagnostics.fallbackSpans.push({ source: sourceText.slice(start, start + length), start, end: start + length, kind });
  };

  const pushWord = (w: string | undefined) => {
    if (!w) return;
    out.push((lastWasWord ? " " : "") + w);
    lastWasWord = true;
  };
  const pushRaw = (s: string) => {
    out.push(s);
    lastWasWord = false;
  };

  const n = sourceText.length;
  let i = 0;
  while (i < n) {
    const ch = sourceText[i];
    while (lockIndex < lockStarts.length && lockStarts[lockIndex] < i) lockIndex += 1;
    const locked = locks.get(i);
    if (locked) {
      pushWord(locked.translation);
      const hanCount = [...locked.source].filter(isCjk).length;
      cjkTotal += hanCount;
      cjkMatched += hanCount;
      diagnostics.glossaryChars += hanCount;
      i += locked.source.length;
      continue;
    }
    const nextLock = lockStarts[lockIndex] ?? n;

    if (ch === "\n") {
      out.push("\n");
      lastWasWord = false;
      i += 1;
      continue;
    }
    if (isSpace(ch)) {
      i += 1;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(PUNCT_MAP, ch)) {
      pushRaw(PUNCT_MAP[ch]);
      i += 1;
      continue;
    }
    if (!isCjk(ch)) {
      // Latin letters/digits/other punctuation: pass a contiguous run through untouched.
      let j = i;
      while (
        j < n &&
        j < nextLock &&
        !isCjk(sourceText[j]) &&
        !isSpace(sourceText[j]) &&
        sourceText[j] !== "\n" &&
        !Object.prototype.hasOwnProperty.call(PUNCT_MAP, sourceText[j])
      ) {
        j += 1;
      }
      pushWord(sourceText.slice(i, j));
      i = j;
      continue;
    }

    // Personal-name heuristic: only ever a last resort (see comment on
    // tryReadNameSpan) — tried before the greedy match below because it
    // needs to claim multiple characters as one atomic unit, which the
    // greedy loop's per-position matching can't express.
    const nameSpan = tryReadNameSpan(sourceText, i, CHARS, FORMAL_CHARS, glossaryMap, WORDS, maxWordLen);
    if (nameSpan && i + nameSpan.consumed <= nextLock) {
      pushWord(nameSpan.text);
      cjkTotal += nameSpan.consumed;
      cjkMatched += nameSpan.consumed;
      diagnostics.guessedNameChars += nameSpan.consumed;
      recordFallback(i, nameSpan.consumed, "guessed-name");
      i += nameSpan.consumed;
      continue;
    }

    // CJK character: greedy longest-match across glossary, then dictionary phrases.
    // cjkTotal/cjkMatched are incremented by the same amount at every exit
    // point (`len` characters for a phrase match, 1 for a single char) so
    // `coverage` always stays within [0, 1] regardless of match length.
    const maxLen = Math.min(maxWordLen, n - i, nextLock - i);
    const segmentLen = segments.get(i);
    const lengths = segmentLen && segmentLen <= maxLen ? [segmentLen] : Array.from({ length: maxLen }, (_v, k) => maxLen - k);
    let matched = false;
    for (const len of lengths) {
      const candidate = sourceText.slice(i, i + len);
      if (glossaryMap.has(candidate)) {
        pushWord(glossaryMap.get(candidate));
        cjkTotal += len;
        cjkMatched += len;
        diagnostics.glossaryChars += len;
        i += len;
        matched = true;
        break;
      }
      if (Object.prototype.hasOwnProperty.call(WORDS, candidate)) {
        pushWord(WORDS[candidate]);
        cjkTotal += len;
        cjkMatched += len;
        diagnostics.phraseChars += len;
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      cjkTotal += 1;
      recordFallback(i, 1);
      const isAdverbialDe = ch === "地" && !LOCATIVE_SUFFIX_CHARS.has(sourceText[i + 1]);
      const reading = isAdverbialDe ? "" : CHARS[ch];
      if (isAdverbialDe || reading) {
        pushWord(reading);
        cjkMatched += 1;
        diagnostics.fallbackChars += 1;
      } else {
        // Unknown character: keep the original so it's easy to spot & fix by hand or AI.
        pushWord(ch);
        unknown.set(ch, (unknown.get(ch) || 0) + 1);
      }
      i += 1;
    }
  }

  const coverage = cjkTotal > 0 ? cjkMatched / cjkTotal : 1;
  const unknownChars = [...unknown.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([ch, count]) => ({ ch, count }));

  return { text: capitalizeSentences(tidyPunctuation(out.join(""))), coverage, unknownChars, diagnostics };
}
