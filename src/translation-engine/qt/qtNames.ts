import { loadDictionary, QtGlossaryTerm } from './qtTranslator';

/**
 * Personal-name discovery for the QT (dictionary) translator. The dictionary
 * alone reads given-name characters by meaning (闻衍舟 → "nghe thấy diễn
 * thuyền"), so names found here are passed to translateHanViet() as glossary
 * terms, which always win over dictionary phrases.
 *
 * Two signals, most reliable first:
 * 1. The blurb's cast line, standard on JJWXC/52书库: "主角：庄逢，陆简声┃配角：…".
 * 2. Frequency: a known surname followed by 1–2 characters, repeated in the
 *    text and not itself a dictionary word.
 * Names are remembered per book so every chapter uses the same reading.
 */

// Common single-character surnames (百家姓 and frequent web-novel surnames),
// minus characters that are far more often function words (和, 从, 那, 都…).
const SURNAMES = new Set([...
  '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安傅皮卞齐康伍余元卜顾孟黄穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫房裘缪宗丁宣邓郁杭洪包诸左石崔吉龚程嵇邢裴陆荣翁荀羊惠甄曲封储靳段富巫乌焦巴弓牧隗山谷车侯宓蓬郗班秋仲伊宫宁仇栾厉戎祖武符刘景詹束龙叶幸司韶黎蓟薄白怀蒲邰鄂索咸籍赖卓蔺屠蒙池乔阴胥苍闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍桑桂濮牛寿扈燕冀郏浦尚农温庄晏柴瞿阎慕连茹习宦艾鱼古易慎戈廖庾暨衡步耿弘匡文寇禄阙欧殳沃蔚夔师巩厍聂晁勾敖融冷訾辛阚简饶曾鞠蒯荆红竺权逯盖桓楚洛沐迟商宴晋闫',
]);
const COMPOUND_SURNAMES = ['司马', '上官', '欧阳', '夏侯', '诸葛', '闻人', '东方', '赫连', '皇甫', '尉迟', '公羊', '澹台', '公冶', '宗政', '濮阳', '淳于', '单于', '太叔', '申屠', '公孙', '仲孙', '轩辕', '令狐', '钟离', '宇文', '长孙', '慕容', '鲜于', '司徒', '司空', '南宫', '西门', '东郭', '百里', '独孤', '端木', '拓跋'];

// A name never ends on these: they start the verb/particle that follows it.
const STOP_CHARS = new Set([...'的了是在说和与跟道笑看也就都又却把被给对向从让着过得地不没很太还再才只这那们一个上下里中来去到会要能可想问听见叫走站坐拿她他它我你您自己爸妈哥姐弟妹叔姨舅伯爷奶婆父母夫妻儿女']);

const CJK_ONLY = /^[㐀-鿿]+$/;
const MIN_OCCURRENCES = 3;

type NameMap = Record<string, string>;

function surnameAt(text: string, at: number): string | null {
  const two = text.slice(at, at + 2);
  if (COMPOUND_SURNAMES.includes(two)) return two;
  return SURNAMES.has(text[at]) ? text[at] : null;
}

function castNames(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(/(?:主角|配角)\s*[：:]\s*([^┃|│\n]{1,120})/g)) {
    for (const part of match[1].split(/[，,、；;／/\s]+/)) {
      const name = part.replace(/[（(][^）)]*[）)]/g, '').trim();
      if (name.length >= 2 && name.length <= 4 && CJK_ONLY.test(name)) names.push(name);
    }
  }
  return names;
}

function frequentNames(text: string, words: Record<string, string>): string[] {
  const counts = new Map<string, number>();
  for (let at = 0; at < text.length; at += 1) {
    const surname = surnameAt(text, at);
    if (!surname) continue;
    for (const extra of [1, 2]) {
      const candidate = text.slice(at, at + surname.length + extra);
      if (candidate.length !== surname.length + extra || !CJK_ONLY.test(candidate)) break;
      counts.set(candidate, (counts.get(candidate) || 0) + 1);
    }
  }
  const isNameLike = (candidate: string) =>
    (counts.get(candidate) || 0) >= MIN_OCCURRENCES
    && !Object.prototype.hasOwnProperty.call(words, candidate)
    && ![...candidate.slice(1)].some(ch => STOP_CHARS.has(ch));

  const accepted: string[] = [];
  for (const [candidate, count] of counts) {
    if (!isNameLike(candidate)) continue;
    const surnameLength = surnameAt(candidate, 0)!.length;
    const isShort = candidate.length === surnameLength + 1;
    if (isShort) {
      // Prefer the full three-character name when most uses continue into it.
      const longer = [...counts.entries()].filter(([other]) => other.length === candidate.length + 1 && other.startsWith(candidate) && isNameLike(other));
      const longerCount = longer.reduce((sum, [, n]) => sum + n, 0);
      if (longerCount >= count * 0.6) continue;
    }
    accepted.push(candidate);
  }
  return accepted;
}

/** Capitalised Sino-Vietnamese reading of a name, or null if a character is unknown. */
async function readName(name: string): Promise<string | null> {
  const { chars, formalChars } = await loadDictionary();
  const surnameLength = surnameAt(name, 0)?.length ?? 0;
  const syllables: string[] = [];
  for (const [position, ch] of [...name].entries()) {
    // Surnames take the everyday one-syllable reading (褚 → Chử, not the rarer Trữ); given
    // names take the formal one (未 → Vị, not the prose sense "không").
    const everyday = /^\p{L}+$/u.test(chars[ch] || '') ? chars[ch] : undefined;
    const reading = position < surnameLength ? (everyday || formalChars[ch]) : (formalChars[ch] || chars[ch]);
    if (!reading || !/^\p{L}+$/u.test(reading)) return null;
    syllables.push(reading.charAt(0).toUpperCase() + reading.slice(1).toLowerCase());
  }
  return syllables.join(' ');
}

/** Names (source → Hán-Việt reading) found in the given texts. */
export async function detectQtNames(texts: string[]): Promise<NameMap> {
  const { words } = await loadDictionary();
  const text = texts.join('\n');
  const found: NameMap = {};
  const cast = new Set(castNames(text));
  for (const name of [...cast, ...frequentNames(text, words)]) {
    if (found[name]) continue;
    const reading = await readName(name);
    if (reading) found[name] = reading;
  }
  // A known character's family: 闻家 → "Văn gia" (not "nghe thấy mọi nhà").
  for (const [name, reading] of Object.entries(found)) {
    const surname = surnameAt(name, 0) || name[0];
    const family = `${surname}家`;
    // A main character's family wins over the dictionary (庄家 → "Trang gia", not "nhà cái").
    const isWord = Object.prototype.hasOwnProperty.call(words, family);
    if (found[family] || !text.includes(family) || (isWord && !cast.has(name))) continue;
    found[family] = `${reading.split(' ').slice(0, surname.length).join(' ')} gia`;
  }
  return found;
}

const storageKey = (bookId: string) => `lily.qtNames.${bookId}`;

export const QtNameStore = {
  get(bookId: string): NameMap {
    try {
      const raw = localStorage.getItem(storageKey(bookId));
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed as NameMap : {};
    } catch {
      return {};
    }
  },
  set(bookId: string, names: NameMap): void {
    try { localStorage.setItem(storageKey(bookId), JSON.stringify(names)); } catch { /* storage full or unavailable */ }
  },
};

/** Remembered names for a book plus any new ones found in these texts. Earlier readings are kept. */
export async function collectBookNames(bookId: string | undefined, texts: string[]): Promise<QtGlossaryTerm[]> {
  const known = bookId ? QtNameStore.get(bookId) : {};
  const detected = await detectQtNames(texts);
  const merged: NameMap = { ...detected, ...known };
  if (bookId && Object.keys(merged).length !== Object.keys(known).length) QtNameStore.set(bookId, merged);
  return Object.entries(merged).map(([source_term, translation]) => ({ source_term, translation, category: 'Tên riêng' }));
}
