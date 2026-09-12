import React, { useState } from 'react';
import { KeyRound, LoaderCircle } from 'lucide-react';
import { OwnerLibraryClient } from '../../book-engine/owner-library/OwnerLibraryClient';
import { LocalLibraryBackup } from '../../book-engine/storage/LocalLibraryBackup';
import { useApp } from '../../context/AppContext';

export const LilyShareImportFlow: React.FC = () => {
  const { libraryLimits, reloadLocalBooks, showToast } = useApp();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const importSharedBook = async () => {
    const normalized = code.trim();
    if (!normalized || busy) return;
    setBusy(true);
    try {
      const file = await OwnerLibraryClient.downloadShared(normalized);
      const backup = await LocalLibraryBackup.parseFile(file);
      const result = await LocalLibraryBackup.restore(backup, libraryLimits);
      await reloadLocalBooks();
      if (result.restoredBooks > 0) {
        setCode('');
        showToast('Đã thêm truyện được chia sẻ vào thư viện.', 'success');
      } else {
        showToast('Truyện này đã có hoặc thư viện không còn chỗ.', 'info');
      }
    } catch {
      showToast('Mã chia sẻ không hợp lệ hoặc đã hết hiệu lực.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return <div className="mx-auto max-w-2xl rounded-3xl border border-ink-200 bg-white p-6 sm:p-8">
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lily-50 text-lily-700"><KeyRound className="h-5 w-5" /></span>
      <div><h2 className="font-serif text-lg font-bold text-ink-950">Nhận truyện được chia sẻ</h2><p className="mt-1 text-xs leading-relaxed text-ink-500">Nhập mã Lily do người chia sẻ gửi cho bạn.</p></div>
    </div>
    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
      <input value={code} onChange={event => setCode(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void importSharedBook(); }} placeholder="Nhập mã Lily" autoComplete="off" className="min-w-0 flex-1 rounded-xl border border-ink-200 bg-cream-50 px-4 py-3 text-sm text-ink-900 outline-none focus:border-lily-400" />
      <button type="button" onClick={() => void importSharedBook()} disabled={!code.trim() || busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Nhận truyện</button>
    </div>
  </div>;
};
