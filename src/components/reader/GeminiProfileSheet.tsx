import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Plus, Trash2, X } from 'lucide-react';
import { Gender, StoryAddress, StoryCharacter, StoryProfile, StoryProfiles } from '../../translation-engine/GeminiStoryProfile';

interface Props {
  bookId: string;
  onClose: () => void;
}

const input = 'min-w-0 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-lily-200';
const same = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b);

/** Bảng xưng hô Gemini tự học theo từng truyện; dòng người đọc sửa được khóa lại để Gemini không ghi đè. */
export const GeminiProfileSheet: React.FC<Props> = ({ bookId, onClose }) => {
  const [original] = useState<StoryProfile>(() => StoryProfiles.read(bookId));
  const [characters, setCharacters] = useState<StoryCharacter[]>(() => original.characters.map(c => ({ ...c })));
  const [addresses, setAddresses] = useState<StoryAddress[]>(() => original.addresses.map(a => ({ ...a })));
  const [notes, setNotes] = useState(original.notes);

  const setCharacter = (i: number, patch: Partial<StoryCharacter>) =>
    setCharacters(list => list.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const setAddress = (i: number, patch: Partial<StoryAddress>) =>
    setAddresses(list => list.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  const save = () => {
    // Dòng mới hoặc đã đổi so với lúc mở → khóa.
    const lockIfEdited = <T extends { locked?: boolean }>(row: T, before: T | undefined): T =>
      before && same({ ...row, locked: false }, { ...before, locked: false }) ? row : { ...row, locked: true };
    StoryProfiles.write(bookId, {
      characters: characters.filter(c => c.zh.trim() && c.vi.trim())
        .map(c => lockIfEdited(c, original.characters.find(o => o.zh === c.zh))),
      addresses: addresses.filter(a => a.from.trim() && a.to.trim())
        .map(a => lockIfEdited(a, original.addresses.find(o => o.from === a.from && o.to === a.to))),
      notes: notes.trim(),
      updatedAt: Date.now(),
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-ink-950/45 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="gemini-profile-title" onClick={onClose}>
      <section onClick={event => event.stopPropagation()} className="surface-solid flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col rounded-t-3xl shadow-modal sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-3">
          <div>
            <h2 id="gemini-profile-title" className="font-serif text-lg font-bold text-ink-950">Bảng xưng hô</h2>
            <p className="text-[11px] text-ink-500">Gemini tự học sau mỗi chương và dịch theo bảng này. Dòng bạn sửa sẽ được khóa <Lock className="inline h-3 w-3" />.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-50" aria-label="Đóng"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-ink-700">Nhân vật</h3>
            {characters.length === 0 && <p className="text-[11px] text-ink-400">Chưa có — dịch một chương bằng Gemini là bảng tự điền.</p>}
            {characters.map((c, i) => (
              <div key={i} className="space-y-1 rounded-xl border border-ink-100 bg-ink-50/40 p-2">
                <div className="grid grid-cols-[5.5rem_auto_1fr_auto] items-center gap-1.5">
                  <input value={c.zh} onChange={e => setCharacter(i, { zh: e.target.value })} placeholder="Tên Trung" aria-label="Tên Trung" className={input} />
                  <span className="text-[11px] text-ink-400">→</span>
                  <input value={c.vi} onChange={e => setCharacter(i, { vi: e.target.value })} placeholder="Tên Việt" aria-label="Tên Việt" className={input} />
                  <span className="flex items-center gap-0.5">
                    {c.locked && <Lock className="h-3 w-3 text-lily-700" aria-label="Đã khóa" />}
                    <button type="button" onClick={() => setCharacters(list => list.filter((_, j) => j !== i))} className="grid h-7 w-7 place-items-center text-ink-400 hover:text-rose-600" aria-label="Xóa"><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                </div>
                <div className="grid grid-cols-[auto_4.5rem_auto_1fr] items-center gap-1.5 text-[11px] text-ink-500">
                  <span>giới tính</span>
                  <select value={c.gender} onChange={e => setCharacter(i, { gender: e.target.value as Gender })} aria-label="Giới tính" className={input}>
                    <option value="nữ">nữ</option>
                    <option value="nam">nam</option>
                    <option value="?">?</option>
                  </select>
                  <span>ngôi</span>
                  <input value={c.pronoun} onChange={e => setCharacter(i, { pronoun: e.target.value })} placeholder="nàng / hắn" aria-label="Ngôi thứ ba" className={input} />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setCharacters(list => [...list, { zh: '', vi: '', gender: 'nữ', pronoun: '' }])} className="flex items-center gap-1 text-[11px] font-semibold text-lily-800"><Plus className="h-3.5 w-3.5" /> Thêm nhân vật</button>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-ink-700">Xưng hô <span className="font-normal text-ink-400">— A nói với B: A tự xưng · A gọi B</span></h3>
            {addresses.map((a, i) => (
              <div key={i} className="space-y-1 rounded-xl border border-ink-100 bg-ink-50/40 p-2">
                <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5">
                  <input value={a.from} onChange={e => setAddress(i, { from: e.target.value })} placeholder="A" aria-label="Người nói" className={input} />
                  <span className="text-[11px] text-ink-400">nói với</span>
                  <input value={a.to} onChange={e => setAddress(i, { to: e.target.value })} placeholder="B" aria-label="Người nghe" className={input} />
                  <span className="flex items-center gap-0.5">
                    {a.locked && <Lock className="h-3 w-3 text-lily-700" aria-label="Đã khóa" />}
                    <button type="button" onClick={() => setAddresses(list => list.filter((_, j) => j !== i))} className="grid h-7 w-7 place-items-center text-ink-400 hover:text-rose-600" aria-label="Xóa"><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                </div>
                <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-1.5 text-[11px] text-ink-500">
                  <span>xưng</span>
                  <input value={a.self} onChange={e => setAddress(i, { self: e.target.value })} placeholder="ta" aria-label="Tự xưng" className={input} />
                  <span>gọi</span>
                  <input value={a.call} onChange={e => setAddress(i, { call: e.target.value })} placeholder="ngươi" aria-label="Gọi người nghe" className={input} />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setAddresses(list => [...list, { from: '', to: '', self: '', call: '' }])} className="flex items-center gap-1 text-[11px] font-semibold text-lily-800"><Plus className="h-3.5 w-3.5" /> Thêm cặp xưng hô</button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink-700">Ghi chú / thuật ngữ</span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className={`${input} w-full`} />
          </label>
        </div>

        <footer className="flex justify-end gap-2 border-t border-ink-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} className="rounded-2xl border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700">Hủy</button>
          <button type="button" onClick={save} className="rounded-2xl bg-ink-950 px-5 py-2 text-xs font-semibold text-white">Lưu bảng</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
};
