/**
 * Bảng xưng hô của một truyện cho Gemini: nhân vật (tên Trung → tên Việt → giới tính → ngôi thứ ba) và
 * cách từng cặp nhân vật tự xưng / gọi nhau. Gemini tự điền sau mỗi chương; người đọc sửa được, dòng đã
 * sửa bị khóa để Gemini không ghi đè.
 */

const PROFILE_PREFIX = 'lily_gemini_profile_v1:';
const LEGACY_MEMORY_PREFIX = 'lily_gemini_story_memory_v1:';
const NOTES_LIMIT = 2000;
const MAX_CHARACTERS = 60;

export type Gender = 'nữ' | 'nam' | '?';

export interface StoryCharacter {
  zh: string;
  vi: string;
  gender: Gender;
  /** Ngôi thứ ba dùng trong lời kể: nàng, cô, hắn, anh ta… */
  pronoun: string;
  locked?: boolean;
}

export interface StoryAddress {
  /** Tên Việt của người nói. */
  from: string;
  /** Tên Việt của người nghe. */
  to: string;
  /** Người nói tự xưng: ta, tôi, em… */
  self: string;
  /** Người nói gọi người nghe: ngươi, cậu, chị… */
  call: string;
  locked?: boolean;
}

export interface StoryProfile {
  characters: StoryCharacter[];
  addresses: StoryAddress[];
  /** Thuật ngữ, bối cảnh — văn bản tự do, ngắn. */
  notes: string;
  updatedAt: number;
}

/** Quy ước của Lily (user 01/10): cổ đại hay hiện đại đều nữ → nàng, nam → hắn. */
export const pronounFor = (gender: Gender) => (gender === 'nữ' ? 'nàng' : gender === 'nam' ? 'hắn' : '');

const empty = (): StoryProfile => ({ characters: [], addresses: [], notes: '', updatedAt: 0 });

const clean = (value: unknown, max = 40) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const asGender = (value: unknown): Gender => (value === 'nữ' || value === 'nam' ? value : '?');

export const StoryProfiles = {
  read(bookId: string): StoryProfile {
    try {
      const raw = localStorage.getItem(`${PROFILE_PREFIX}${bookId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          characters: Array.isArray(parsed.characters) ? parsed.characters.map((c: any) => ({
            zh: clean(c.zh, 12), vi: clean(c.vi), gender: asGender(c.gender), pronoun: clean(c.pronoun, 12), locked: Boolean(c.locked),
          })).filter((c: StoryCharacter) => c.zh && c.vi) : [],
          addresses: Array.isArray(parsed.addresses) ? parsed.addresses.map((a: any) => ({
            from: clean(a.from), to: clean(a.to), self: clean(a.self, 16), call: clean(a.call, 16), locked: Boolean(a.locked),
          })).filter((a: StoryAddress) => a.from && a.to) : [],
          notes: clean(parsed.notes, NOTES_LIMIT),
          updatedAt: Number(parsed.updatedAt) || 0,
        };
      }
      // Hồ sơ dạng văn bản của bản cũ: giữ lại làm ghi chú.
      const legacy = JSON.parse(localStorage.getItem(`${LEGACY_MEMORY_PREFIX}${bookId}`) || '{}');
      return { ...empty(), notes: clean(legacy.notes, NOTES_LIMIT) };
    } catch {
      return empty();
    }
  },
  write(bookId: string, profile: StoryProfile): void {
    try {
      localStorage.setItem(`${PROFILE_PREFIX}${bookId}`, JSON.stringify({ ...profile, updatedAt: Date.now() }));
    } catch {}
  },
};

const addressKey = (a: { from: string; to: string }) => `${a.from.toLowerCase()}→${a.to.toLowerCase()}`;
const lower = (s: string) => s.toLocaleLowerCase('vi-VN');

/** Cùng một người dưới tên khác: 倾时 ⊂ 季倾时, "Khuynh Thời" là đuôi của "Quý Khuynh Thời", hoặc trùng tên Việt. */
const sameCharacter = (c: StoryCharacter, zh: string, vi: string) =>
  c.zh.includes(zh) || zh.includes(c.zh) || lower(c.vi) === lower(vi) || lower(c.vi).endsWith(` ${lower(vi)}`) || lower(vi).endsWith(` ${lower(c.vi)}`);

/** Tên Việt Gemini dùng trong cặp xưng hô → đúng tên trong bảng (khớp nguyên tên hoặc phần tên sau họ). */
const resolveName = (characters: StoryCharacter[], name: string) => {
  const n = lower(name);
  return characters.find(c => lower(c.vi) === n)?.vi || characters.find(c => lower(c.vi).endsWith(` ${n}`))?.vi || '';
};

/**
 * Gộp phần Gemini học được vào bảng. Dòng đã có thì giữ nguyên (tránh đổi qua đổi lại giữa các chương),
 * trừ khi dòng cũ còn thiếu giới tính / ngôi; dòng bị khóa không bao giờ đổi.
 */
export function mergeLearned(
  profile: StoryProfile,
  learned: { characters?: Partial<StoryCharacter>[]; addresses?: Partial<StoryAddress>[]; notes?: string[] },
): StoryProfile {
  const characters = profile.characters.map(c => ({ ...c }));
  const byZh = new Map(characters.map(c => [c.zh, c]));
  for (const item of learned.characters || []) {
    const zh = clean(item.zh, 12);
    const vi = clean(item.vi);
    if (!zh || !vi) continue;
    const found = byZh.get(zh);
    if (!found) {
      if (characters.length >= MAX_CHARACTERS || characters.some(c => sameCharacter(c, zh, vi))) continue;
      const gender = asGender(item.gender);
      const next = { zh, vi, gender, pronoun: pronounFor(gender) };
      characters.push(next);
      byZh.set(zh, next);
    } else if (!found.locked) {
      if (found.gender === '?') {
        found.gender = asGender(item.gender);
        found.pronoun = pronounFor(found.gender);
      }
    }
  }
  const addresses = profile.addresses.map(a => ({ ...a }));
  const byPair = new Map(addresses.map(a => [addressKey(a), a]));
  for (const item of learned.addresses || []) {
    // Chỉ nhận cặp giữa hai nhân vật đã có trong bảng, ghi bằng đúng tên trong bảng — tên viết lệch không sinh cặp trùng.
    const next = { from: resolveName(characters, clean(item.from)), to: resolveName(characters, clean(item.to)), self: clean(item.self, 16), call: clean(item.call, 16) };
    if (!next.from || !next.to || next.from === next.to || (!next.self && !next.call)) continue;
    const found = byPair.get(addressKey(next));
    if (!found) {
      addresses.push(next);
      byPair.set(addressKey(next), next);
    } else if (!found.locked) {
      if (!found.self) found.self = next.self;
      if (!found.call) found.call = next.call;
    }
  }
  const known = new Set(profile.notes.split('\n').map(line => line.trim()).filter(Boolean));
  const added = (learned.notes || []).flatMap(block => block.split('\n')).map(line => line.trim()).filter(line => line && !known.has(line));
  const notes = [profile.notes, ...new Set(added)].filter(Boolean).join('\n');
  // Ghi chú quá dài thì bỏ dòng cũ nhất; bảng nhân vật / xưng hô mới là phần quan trọng.
  return { characters, addresses, notes: notes.length > NOTES_LIMIT ? notes.slice(notes.length - NOTES_LIMIT).replace(/^[^\n]*\n/, '') : notes, updatedAt: Date.now() };
}

/** Phần bảng đưa vào prompt; chỉ lấy nhân vật / cặp xưng hô xuất hiện trong lô này để prompt gọn. */
export function profileForPrompt(profile: StoryProfile, sourceText: string): string {
  const characters = profile.characters.filter(c => sourceText.includes(c.zh));
  const names = new Set(characters.map(c => c.vi.toLowerCase()));
  const addresses = profile.addresses.filter(a => names.has(a.from.toLowerCase()) && names.has(a.to.toLowerCase()));
  const lines: string[] = [];
  if (characters.length) {
    lines.push('NHÂN VẬT (bắt buộc theo đúng):');
    for (const c of characters) {
      const pronoun = c.pronoun || pronounFor(c.gender);
      lines.push(`- ${c.zh} → ${c.vi} · ${c.gender === '?' ? 'chưa rõ giới tính' : c.gender}${pronoun ? ` · ngôi thứ ba: ${pronoun}` : ''}`);
    }
  }
  if (addresses.length) {
    lines.push('XƯNG HÔ (bắt buộc theo đúng):');
    for (const a of addresses) {
      lines.push(`- ${a.from} nói với ${a.to}: tự xưng "${a.self || '?'}", gọi "${a.call || '?'}"`);
    }
  }
  if (profile.notes) lines.push('GHI CHÚ / THUẬT NGỮ:', profile.notes);
  return lines.join('\n');
}
