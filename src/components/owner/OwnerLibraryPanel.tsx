import React, { useCallback, useEffect, useState } from 'react';
import { Cloud, Download, Link2, LoaderCircle, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LocalLibraryBackup } from '../../book-engine/storage/LocalLibraryBackup';
import { OwnerCloudBook, OwnerLibraryClient } from '../../book-engine/owner-library/OwnerLibraryClient';

const sizeLabel = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const OwnerLibraryPanel: React.FC = () => {
  const { user, books, libraryLimits, reloadLocalBooks, showToast, navigateTo } = useApp();
  const [remote, setRemote] = useState<OwnerCloudBook[]>([]);
  const [cloudIdsByLocalId, setCloudIdsByLocalId] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState(books[0]?.id || '');
  const [busy, setBusy] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);

  const refresh = useCallback(async () => {
    if (!user.isOwner) return;
    setBusy('refresh');
    try { setRemote(await OwnerLibraryClient.list()); }
    catch { showToast('Chưa thể đọc kho riêng.', 'error'); }
    finally { setBusy(''); }
  }, [showToast, user.isOwner]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    let active = true;
    void Promise.all(books.map(async book => [book.id, await OwnerLibraryClient.cloudId(book.id)] as const)).then(entries => {
      if (active) setCloudIdsByLocalId(Object.fromEntries(entries));
    });
    return () => { active = false; };
  }, [books]);
  if (!user.isOwner) return null;

  const remoteIds = new Set(remote.map(book => book.id));
  const localIdsByCloudId = new Map(Object.entries(cloudIdsByLocalId).map(([localId, cloudId]) => [cloudId, localId]));

  const upload = async () => {
    const book = books.find(item => item.id === selectedId);
    if (!book) return;
    setBusy(`upload:${book.id}`);
    try {
      const backup = await LocalLibraryBackup.createForBook(book.id);
      const blob = await LocalLibraryBackup.serializeCompressed(backup);
      const cloudId = await OwnerLibraryClient.cloudId(book.id);
      await OwnerLibraryClient.upload(cloudId, blob, book.title, book.author);
      await refresh();
      showToast(`Đã đưa “${book.title}” vào kho riêng.`, 'success');
    } catch { showToast('Chưa thể tải truyện lên kho riêng.', 'error'); }
    finally { setBusy(''); }
  };

  const restore = async (book: OwnerCloudBook, openAfterRestore = false) => {
    setBusy(`download:${book.id}`);
    try {
      const file = await OwnerLibraryClient.download(book.id, book.title);
      const backup = await LocalLibraryBackup.parseFile(file);
      const originalId = backup.books[0]?.id;
      const result = await LocalLibraryBackup.restore(backup, libraryLimits);
      await reloadLocalBooks();
      showToast(result.restoredBooks ? `Đã lấy “${book.title}” về thiết bị.` : 'Truyện này đã có trên thiết bị.', result.restoredBooks ? 'success' : 'info');
      if (openAfterRestore && originalId) navigateTo('book-detail', originalId);
    } catch { showToast('Chưa thể lấy truyện từ kho riêng.', 'error'); }
    finally { setBusy(''); }
  };

  const share = async (book: OwnerCloudBook) => {
    setBusy(`share:${book.id}`);
    try {
      const code = await OwnerLibraryClient.createShare(book.id);
      await navigator.clipboard.writeText(code);
      showToast('Đã tạo và sao chép mã chia sẻ.', 'success');
    } catch { showToast('Chưa thể tạo mã chia sẻ.', 'error'); }
    finally { setBusy(''); }
  };

  const remove = async (book: OwnerCloudBook) => {
    if (!window.confirm(`Xóa “${book.title}” khỏi kho riêng? Bản trên thiết bị không bị ảnh hưởng.`)) return;
    setBusy(`delete:${book.id}`);
    try { await OwnerLibraryClient.remove(book.id); await refresh(); showToast('Đã xóa khỏi kho riêng.', 'success'); }
    catch { showToast('Chưa thể xóa truyện khỏi kho riêng.', 'error'); }
    finally { setBusy(''); }
  };

  return <section className="space-y-3">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-xs font-bold uppercase text-ink-500">Kho riêng của chủ sở hữu</h2><p className="mt-1 text-[11px] text-ink-500">R2 riêng tư · {remote.length} truyện · {sizeLabel(remote.reduce((sum, item) => sum + item.size, 0))}</p></div><button type="button" onClick={() => void refresh()} disabled={Boolean(busy)} className="rounded-lg border border-ink-200 p-2 text-ink-600 disabled:opacity-40" aria-label="Làm mới kho"><RefreshCw className={`h-4 w-4 ${busy === 'refresh' ? 'animate-spin' : ''}`} /></button></div>
    <div className="rounded-xl border border-lily-200 bg-lily-50/40 p-4">
      <div className="flex items-center gap-2 text-lily-900"><Cloud className="h-5 w-5" /><strong className="text-sm">Đưa truyện trên máy lên Cloud</strong></div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row"><select value={selectedId} onChange={event => setSelectedId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-xs"><option value="">Chọn truyện trên máy</option>{books.map(book => <option key={book.id} value={book.id}>{book.title}{remoteIds.has(cloudIdsByLocalId[book.id]) ? ' · Đã có trên Cloud' : ' · Chỉ trên máy'}</option>)}</select><button type="button" onClick={() => void upload()} disabled={!selectedId || Boolean(busy)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"><Upload className="h-4 w-4" />{remoteIds.has(cloudIdsByLocalId[selectedId]) ? 'Cập nhật' : 'Tải lên'}</button></div>
    </div>
    <div className="divide-y divide-ink-100 overflow-hidden rounded-xl bg-white ring-1 ring-ink-100">{remote.length === 0 ? <div className="p-6 text-center text-xs text-ink-500">Cloud đang trống.</div> : remote.slice(0, visibleCount).map(book => { const isOnDevice = localIdsByCloudId.has(book.id); return <article key={book.id} className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lily-50 text-lily-700"><Cloud className="h-4 w-4" /></span><div className="min-w-0 flex-1"><strong className="block truncate text-sm text-ink-900">{book.title || book.id}</strong><span className="mt-0.5 block truncate text-[11px] text-ink-500">{book.author || 'Chưa rõ tác giả'} · {sizeLabel(book.size)}</span><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${isOnDevice ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>{isOnDevice ? 'Đã tải về máy' : 'Mở sẽ tải từ Cloud'}</span></div><div className="flex shrink-0 gap-1">{busy.includes(book.id) ? <LoaderCircle className="m-2 h-4 w-4 animate-spin text-lily-700" /> : <><button onClick={() => isOnDevice ? navigateTo('book-detail', localIdsByCloudId.get(book.id)) : void restore(book, true)} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-lily-800" aria-label={isOnDevice ? 'Mở truyện' : 'Tải và mở truyện'}>{isOnDevice ? 'Mở' : 'Tải & mở'}</button><button onClick={() => void restore(book)} disabled={isOnDevice} className="rounded-lg p-2 text-ink-600 disabled:opacity-25" aria-label={isOnDevice ? 'Đã có trên máy' : 'Tải về máy'}><Download className="h-4 w-4" /></button><button onClick={() => void share(book)} className="rounded-lg p-2 text-lily-700" aria-label="Tạo mã chia sẻ"><Link2 className="h-4 w-4" /></button><button onClick={() => void remove(book)} className="rounded-lg p-2 text-rose-600" aria-label="Xóa khỏi Cloud"><Trash2 className="h-4 w-4" /></button></>}</div></article>; })}</div>
    {visibleCount < remote.length && <button type="button" onClick={() => setVisibleCount(count => count + 30)} className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-xs font-semibold text-ink-700">Xem thêm · còn {remote.length - visibleCount} truyện</button>}
  </section>;
};
