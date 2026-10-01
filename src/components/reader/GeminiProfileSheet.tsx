import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronDown, Lock, Plus, Trash2 } from 'lucide-react';
import { Gender, StoryAddress, StoryCharacter, StoryProfile, StoryProfiles, pronounFor } from '../../translation-engine/GeminiStoryProfile';

interface Props {
  bookId: string;
  bookTitle?: string;
  onClose: () => void;
}

// 16px: nhỏ hơn thì iPhone tự phóng to trang khi chạm vào ô nhập.
const field = 'w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-[16px] text-ink-900 focus:outline-none focus:ring-2 focus:ring-lily-200';

const GenderToggle: React.FC<{ value: Gender; onChange: (g: Gender) => void }> = ({ value, onChange }) => (
  <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-ink-200 text-sm">
    {(['nữ', 'nam'] as const).map(g => (
      <button key={g} type="button" onClick={() => onChange(g)}
        className={`py-2 font-semibold ${value === g ? 'bg-lily-700 text-white' : 'bg-white text-ink-600'}`}>
        {g === 'nữ' ? 'Nữ · nàng' : 'Nam · hắn'}
      </button>
    ))}
  </div>
);

/** Bảng xưng hô Gemini tự học theo từng truyện. Sửa là lưu ngay; dòng đã sửa bị khóa để Gemini không ghi đè. */
export const GeminiProfileSheet: React.FC<Props> = ({ bookId, bookTitle, onClose }) => {
  const [profile, setProfile] = useState<StoryProfile>(() => StoryProfiles.read(bookId));
  const [openChar, setOpenChar] = useState<number | null>(null);
  const [openAddr, setOpenAddr] = useState<number | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    StoryProfiles.write(bookId, profile);
  }, [bookId, profile]);

  const names = profile.characters.map(c => c.vi).filter(Boolean);

  const updateChar = (i: number, patch: Partial<StoryCharacter>) => setProfile(p => ({
    ...p,
    characters: p.characters.map((c, j) => {
      if (j !== i) return c;
      const next = { ...c, ...patch, locked: true };
      return patch.gender ? { ...next, pronoun: pronounFor(patch.gender) } : next;
    }),
  }));
  const removeChar = (i: number) => { setProfile(p => ({ ...p, characters: p.characters.filter((_, j) => j !== i) })); setOpenChar(null); };
  const addChar = () => {
    setProfile(p => ({ ...p, characters: [...p.characters, { zh: '', vi: '', gender: 'nữ', pronoun: 'nàng', locked: true }] }));
    setOpenChar(profile.characters.length);
  };

  const updateAddr = (i: number, patch: Partial<StoryAddress>) => setProfile(p => ({
    ...p, addresses: p.addresses.map((a, j) => (j === i ? { ...a, ...patch, locked: true } : a)),
  }));
  const removeAddr = (i: number) => { setProfile(p => ({ ...p, addresses: p.addresses.filter((_, j) => j !== i) })); setOpenAddr(null); };
  const addAddr = () => {
    setProfile(p => ({ ...p, addresses: [...p.addresses, { from: names[0] || '', to: names[1] || '', self: '', call: '', locked: true }] }));
    setOpenAddr(profile.addresses.length);
  };

  const close = () => {
    // Dòng chưa điền đủ thì bỏ.
    StoryProfiles.write(bookId, {
      ...profile,
      characters: profile.characters.filter(c => c.zh.trim() && c.vi.trim()),
      addresses: profile.addresses.filter(a => a.from.trim() && a.to.trim() && (a.self.trim() || a.call.trim())),
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[140] flex flex-col bg-cream-50" role="dialog" aria-modal="true" aria-labelledby="gemini-profile-title">
      <header className="flex items-center gap-2 border-b border-ink-100 bg-white px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button type="button" onClick={close} className="grid h-10 w-10 place-items-center rounded-full text-ink-700 hover:bg-ink-50" aria-label="Quay lại"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0">
          <h2 id="gemini-profile-title" className="font-serif text-lg font-bold text-ink-950">Bảng xưng hô</h2>
          {bookTitle && <p className="truncate text-xs text-ink-500">{bookTitle}</p>}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg space-y-6 px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <p className="text-sm leading-relaxed text-ink-600">
            Gemini tự ghi nhân vật và cách xưng hô sau mỗi chương, rồi dịch các chương sau theo đúng bảng này. Bạn sửa dòng nào thì dòng đó được khóa <Lock className="inline h-3.5 w-3.5 text-lily-700" />, Gemini không đổi nữa.
          </p>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900">Nhân vật <span className="font-normal text-ink-400">({profile.characters.length})</span></h3>
              <button type="button" onClick={addChar} className="flex items-center gap-1 rounded-full bg-lily-50 px-3 py-1.5 text-sm font-semibold text-lily-800"><Plus className="h-4 w-4" /> Thêm</button>
            </div>
            {profile.characters.length === 0 && (
              <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-4 text-sm text-ink-500">Chưa có nhân vật. Dịch một chương bằng Gemini là bảng tự điền, hoặc bấm Thêm.</p>
            )}
            <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
              {profile.characters.map((c, i) => (
                <div key={i}>
                  <button type="button" onClick={() => setOpenChar(openChar === i ? null : i)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink-950">{c.vi || 'Nhân vật mới'}</p>
                      <p className="truncate text-xs text-ink-500">{c.zh || '—'}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.gender === 'nam' ? 'bg-sky-50 text-sky-800' : c.gender === 'nữ' ? 'bg-lily-50 text-lily-800' : 'bg-ink-100 text-ink-600'}`}>
                      {c.gender === '?' ? 'Chưa rõ' : `${c.gender === 'nữ' ? 'Nữ' : 'Nam'} · ${c.pronoun || pronounFor(c.gender)}`}
                    </span>
                    {c.locked && <Lock className="h-3.5 w-3.5 shrink-0 text-lily-700" aria-label="Đã khóa" />}
                  </button>
                  {openChar === i && (
                    <div className="space-y-3 bg-ink-50/50 px-4 pb-4 pt-1">
                      <label className="block space-y-1"><span className="text-xs font-medium text-ink-500">Tên tiếng Trung</span>
                        <input value={c.zh} onChange={e => updateChar(i, { zh: e.target.value })} className={field} /></label>
                      <label className="block space-y-1"><span className="text-xs font-medium text-ink-500">Tên tiếng Việt</span>
                        <input value={c.vi} onChange={e => updateChar(i, { vi: e.target.value })} className={field} /></label>
                      <div className="space-y-1"><span className="text-xs font-medium text-ink-500">Giới tính</span>
                        <GenderToggle value={c.gender} onChange={g => updateChar(i, { gender: g })} /></div>
                      <button type="button" onClick={() => removeChar(i)} className="flex items-center gap-1.5 text-sm font-semibold text-rose-600"><Trash2 className="h-4 w-4" /> Xóa nhân vật</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900">Xưng hô <span className="font-normal text-ink-400">({profile.addresses.length})</span></h3>
              <button type="button" onClick={addAddr} disabled={names.length < 2} className="flex items-center gap-1 rounded-full bg-lily-50 px-3 py-1.5 text-sm font-semibold text-lily-800 disabled:opacity-40"><Plus className="h-4 w-4" /> Thêm</button>
            </div>
            {profile.addresses.length === 0 && (
              <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-4 text-sm text-ink-500">Chưa có. Khi hai nhân vật nói chuyện, Gemini sẽ ghi lại ai xưng gì, gọi người kia là gì.</p>
            )}
            <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
              {profile.addresses.map((a, i) => (
                <div key={i}>
                  <button type="button" onClick={() => setOpenAddr(openAddr === i ? null : i)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink-950">{a.from || '?'} <span className="font-normal text-ink-400">→</span> {a.to || '?'}</p>
                      <p className="truncate text-sm text-ink-600">xưng <strong className="text-ink-900">{a.self || '?'}</strong> · gọi <strong className="text-ink-900">{a.call || '?'}</strong></p>
                    </div>
                    {a.locked && <Lock className="h-3.5 w-3.5 shrink-0 text-lily-700" aria-label="Đã khóa" />}
                  </button>
                  {openAddr === i && (
                    <div className="space-y-3 bg-ink-50/50 px-4 pb-4 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block space-y-1"><span className="text-xs font-medium text-ink-500">Người nói</span>
                          <select value={a.from} onChange={e => updateAddr(i, { from: e.target.value })} className={field}>
                            {[...new Set([a.from, ...names])].filter(Boolean).map(n => <option key={n}>{n}</option>)}
                          </select></label>
                        <label className="block space-y-1"><span className="text-xs font-medium text-ink-500">Nói với</span>
                          <select value={a.to} onChange={e => updateAddr(i, { to: e.target.value })} className={field}>
                            {[...new Set([a.to, ...names])].filter(Boolean).map(n => <option key={n}>{n}</option>)}
                          </select></label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block space-y-1"><span className="text-xs font-medium text-ink-500">Tự xưng</span>
                          <input value={a.self} onChange={e => updateAddr(i, { self: e.target.value })} placeholder="ta" className={field} /></label>
                        <label className="block space-y-1"><span className="text-xs font-medium text-ink-500">Gọi người kia</span>
                          <input value={a.call} onChange={e => updateAddr(i, { call: e.target.value })} placeholder="ngươi" className={field} /></label>
                      </div>
                      <button type="button" onClick={() => removeAddr(i)} className="flex items-center gap-1.5 text-sm font-semibold text-rose-600"><Trash2 className="h-4 w-4" /> Xóa cặp này</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
            <button type="button" onClick={() => setNotesOpen(o => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
              <span className="text-sm font-bold text-ink-900">Ghi chú, thuật ngữ</span>
              <ChevronDown className={`h-4 w-4 text-ink-400 transition ${notesOpen ? 'rotate-180' : ''}`} />
            </button>
            {notesOpen && (
              <div className="px-4 pb-4">
                <textarea value={profile.notes} onChange={e => setProfile(p => ({ ...p, notes: e.target.value }))} rows={8}
                  className={`${field} text-[15px] leading-relaxed`} />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
};
