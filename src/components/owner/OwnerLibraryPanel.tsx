import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Cloud, Download, Link2, LoaderCircle, RefreshCw, Search, ShieldCheck, Trash2, Upload, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LocalLibraryBackup } from '../../book-engine/storage/LocalLibraryBackup';
import { CreatedOwnerShare, OwnerCloudBook, OwnerCloudPage, OwnerLibraryClient, OwnerShare } from '../../book-engine/owner-library/OwnerLibraryClient';
import { BookCover } from '../common/BookCover';

const EMPTY_PAGE: OwnerCloudPage = { books: [], page: 1, pageSize: 20, totalPages: 1, matchedCount: 0, totalCount: 0, totalBytes: 0, knownBooks: [] };
const sizeLabel = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const OwnerLibraryPanel: React.FC = () => {
  const { user, books, libraryLimits, reloadLocalBooks, showToast, navigateTo } = useApp();
  const [unlocked, setUnlocked] = useState(() => OwnerLibraryClient.hasSession());
  const [adminKey, setAdminKey] = useState('');
  const [catalog, setCatalog] = useState<OwnerCloudPage>(EMPTY_PAGE);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [query, setQuery] = useState('');
  const [cloudIdsByLocalId, setCloudIdsByLocalId] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCloudIds, setSelectedCloudIds] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [createdShare, setCreatedShare] = useState<CreatedOwnerShare | null>(null);
  const [shareBook, setShareBook] = useState<OwnerCloudBook | null>(null);
  const [shareSelection, setShareSelection] = useState<string[]>([]);
  const [shareMaxUses, setShareMaxUses] = useState(1);
  const [shareHours, setShareHours] = useState(24);
  const [shares, setShares] = useState<OwnerShare[]>([]);
  const [busy, setBusy] = useState('');

  const refresh = useCallback(async (targetPage = page, targetQuery = query) => {
    if (!unlocked) return;
    setBusy('refresh');
    try {
      const result = await OwnerLibraryClient.list(targetPage, targetQuery);
      setCatalog(result);
      if (result.page !== targetPage) setPage(result.page);
    } catch (error) {
      console.error('[Lily owner cloud catalog]', error);
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        OwnerLibraryClient.logout();
        setCatalog(EMPTY_PAGE);
        setUnlocked(false);
        showToast('Phiên Cloud Admin đã hết hạn. Vui lòng nhập lại mã.', 'info');
      } else {
        showToast('Chưa thể đọc thư viện Cloud.', 'error');
      }
    } finally { setBusy(''); }
  }, [page, query, showToast, unlocked]);

  const refreshShares = useCallback(async () => {
    if (!unlocked) return;
    try { setShares(await OwnerLibraryClient.listShares()); }
    catch (error) { console.error('[Lily owner shares]', error); }
  }, [unlocked]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { void refreshShares(); }, [refreshShares]);
  useEffect(() => {
    let active = true;
    void Promise.all(books.map(async book => [book.id, await OwnerLibraryClient.cloudId(book.id)] as const)).then(entries => {
      if (active) setCloudIdsByLocalId(Object.fromEntries(entries));
    });
    return () => { active = false; };
  }, [books]);
  const adminEntry = user.isOwner || new URLSearchParams(window.location.search).get('admin') === 'cloud' || unlocked;
  if (!adminEntry) return null;

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('login');
    try { await OwnerLibraryClient.login(adminKey); setAdminKey(''); setUnlocked(true); showToast('Đã mở Thư viện Cloud Admin.', 'success'); }
    catch { showToast('Mã Cloud Admin không đúng.', 'error'); }
    finally { setBusy(''); }
  };

  if (!unlocked) return <section className="rounded-2xl border border-lily-200 bg-lily-50/40 p-5">
    <div className="flex items-center gap-2 text-lily-900"><Cloud className="h-5 w-5" /><h2 className="text-sm font-bold">Cloud Admin độc lập</h2></div>
    <p className="mt-2 text-xs leading-5 text-ink-500">Nhập mã Cloud Admin để mở kho riêng. Phiên này không sử dụng tài khoản hoặc API LilyHub.</p>
    <form onSubmit={login} className="mt-4 flex flex-col gap-2 sm:flex-row"><input type="password" value={adminKey} onChange={event => setAdminKey(event.target.value)} autoComplete="current-password" placeholder="Mã Cloud Admin" className="h-11 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-lily-400" /><button disabled={!adminKey || busy === 'login'} className="h-11 rounded-xl bg-ink-950 px-5 text-xs font-semibold text-white disabled:opacity-40">{busy === 'login' ? 'Đang kiểm tra...' : 'Mở Cloud Admin'}</button></form>
  </section>;

  const remoteIds = new Set(catalog.books.map(book => book.id));
  const localIdsByCloudId = new Map(Object.entries(cloudIdsByLocalId).map(([localId, cloudId]) => [cloudId, localId]));
  const submitSearch = (event: FormEvent) => { event.preventDefault(); const next = searchDraft.trim(); setQuery(next); setPage(1); if (next === query && page === 1) void refresh(1, next); };

  const upload = async () => {
    const selectedBooks = books.filter(book => selectedIds.includes(book.id));
    if (!selectedBooks.length) return;
    setBusy('upload:batch');
    let uploaded = 0;
    const failed: string[] = [];
    for (const [index, book] of selectedBooks.entries()) {
      setUploadProgress(`${index + 1}/${selectedBooks.length} · ${book.title}`);
      try {
        const backup = await LocalLibraryBackup.createForBook(book.id);
        const blob = await LocalLibraryBackup.serializeCompressed(backup);
        const cloudId = await OwnerLibraryClient.cloudId(book.id);
        await OwnerLibraryClient.upload(cloudId, blob, book.title, book.author, book.coverUrl, book.coverColor);
        uploaded += 1;
      } catch (error) {
        console.error('[Lily owner cloud upload]', book.title, error);
        failed.push(book.title);
      }
    }
    setSelectedIds([]);
    setPage(1); setQuery(''); setSearchDraft('');
    await refresh(1, '');
    if (failed.length) showToast(`Đã tải ${uploaded}/${selectedBooks.length} truyện; ${failed.length} truyện bị lỗi.`, 'error');
    else showToast(`Đã đưa ${uploaded} truyện vào Cloud.`, 'success');
    setUploadProgress('');
    setBusy('');
  };

  const restore = async (book: OwnerCloudBook, openAfterRestore = false) => {
    setBusy(`download:${book.id}`);
    try {
      const file = await OwnerLibraryClient.download(book.id, book.title);
      const backup = await LocalLibraryBackup.parseFile(file);
      const originalId = backup.books[0]?.id;
      const result = await LocalLibraryBackup.restore(backup, libraryLimits);
      await reloadLocalBooks();
      showToast(result.restoredBooks ? `Đã tải “${book.title}” về máy.` : 'Truyện này đã có trên máy.', result.restoredBooks ? 'success' : 'info');
      if (openAfterRestore && originalId) navigateTo('book-detail', originalId);
    } catch { showToast('Chưa thể tải truyện từ Cloud.', 'error'); }
    finally { setBusy(''); }
  };

  const share = async (book: OwnerCloudBook) => {
    setBusy(`share:${book.id}`);
    try {
      const selectedBooks = shareSelection.length > 1 ? catalog.books.filter(item => shareSelection.includes(item.id)) : [book];
      let result: CreatedOwnerShare;
      if (selectedBooks.length > 1) {
        const backups = [];
        for (const item of selectedBooks) backups.push(await LocalLibraryBackup.parseFile(await OwnerLibraryClient.download(item.id, item.title)));
        const bundle = await LocalLibraryBackup.serializeCompressed(LocalLibraryBackup.merge(backups));
        result = await OwnerLibraryClient.createBundleShare(bundle, selectedBooks.map(item => item.id), { maxUses: shareMaxUses, expiresInHours: shareHours });
      } else {
        result = await OwnerLibraryClient.createShare(book.id, { maxUses: shareMaxUses, expiresInHours: shareHours });
      }
      setCreatedShare(result);
      setShareCode(result.code);
      await refreshShares();
      try {
        await navigator.clipboard.writeText(result.code);
        showToast('Đã tạo và sao chép mã chia sẻ.', 'success');
      } catch {
        showToast('Đã tạo mã. Hãy sao chép mã đang hiện trên màn hình.', 'info');
      }
    }
    catch { showToast('Chưa thể tạo mã chia sẻ.', 'error'); }
    finally { setBusy(''); }
  };

  const revokeShare = async (share: OwnerShare) => {
    setBusy(`revoke:${share.id}`);
    try { await OwnerLibraryClient.revokeShare(share.id); await refreshShares(); showToast('Đã thu hồi mã chia sẻ.', 'success'); }
    catch { showToast('Chưa thể thu hồi mã chia sẻ.', 'error'); }
    finally { setBusy(''); }
  };

  const restoreSelected = async () => {
    const selected = catalog.books.filter(book => selectedCloudIds.includes(book.id));
    if (!selected.length) return;
    setBusy('download:batch');
    let restored = 0;
    let failed = 0;
    for (const book of selected) {
      try {
        const backup = await LocalLibraryBackup.parseFile(await OwnerLibraryClient.download(book.id, book.title));
        const result = await LocalLibraryBackup.restore(backup, libraryLimits);
        restored += result.restoredBooks;
      } catch { failed += 1; }
    }
    await reloadLocalBooks();
    setSelectedCloudIds([]);
    setBusy('');
    showToast(failed ? `Đã nhập ${restored} truyện, ${failed} truyện bị lỗi.` : `Đã nhập ${restored} truyện về máy.`, failed ? 'warning' : 'success');
  };

  const openBatchShare = () => {
    const selected = catalog.books.filter(book => selectedCloudIds.includes(book.id));
    if (!selected.length) return;
    setShareSelection(selected.map(book => book.id));
    setShareBook(selected.length === 1 ? selected[0] : { ...selected[0], id: 'bundle', title: `${selected.length} truyện đã chọn` });
    setShareCode('');
    setCreatedShare(null);
  };

  const closeShareDialog = () => { setShareBook(null); setShareSelection([]); setShareCode(''); setCreatedShare(null); setShareMaxUses(1); setShareHours(24); };

  const remove = async (book: OwnerCloudBook) => {
    if (!window.confirm(`Xóa “${book.title}” khỏi Cloud? Bản trên máy không bị ảnh hưởng.`)) return;
    setBusy(`delete:${book.id}`);
    try { await OwnerLibraryClient.remove(book.id); await refresh(page, query); showToast('Đã xóa khỏi Cloud.', 'success'); }
    catch { showToast('Chưa thể xóa truyện khỏi Cloud.', 'error'); }
    finally { setBusy(''); }
  };

  return <section className="space-y-5">
    {shareBook && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-ink-950/45 p-4" role="dialog" aria-modal="true" aria-label="Tạo mã chia sẻ"><div className="w-full max-w-sm rounded-2xl border border-ink-100 bg-white p-5 shadow-modal">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-ink-950">{shareCode ? 'Mã chia sẻ đã tạo' : 'Tạo mã chia sẻ an toàn'}</p><p className="mt-1 line-clamp-1 text-xs text-ink-500">{shareBook.title}</p></div><button type="button" onClick={closeShareDialog} className="p-1 text-ink-400"><X className="h-4 w-4" /></button></div>
      {!shareCode ? <><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-[11px] font-semibold text-ink-600">Số lượt dùng<input type="number" inputMode="numeric" min={1} max={1000} step={1} value={shareMaxUses} onChange={event => setShareMaxUses(Math.max(1, Math.min(1000, Number.parseInt(event.target.value, 10) || 1)))} className="mt-1.5 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-lily-400" /></label><label className="text-[11px] font-semibold text-ink-600">Thời hạn<select value={shareHours} onChange={event => setShareHours(Number(event.target.value))} className="mt-1.5 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900"><option value={1}>1 giờ</option><option value={24}>24 giờ</option><option value={72}>3 ngày</option><option value={168}>7 ngày</option></select></label></div><p className="mt-1.5 text-[10px] text-ink-400">Cho phép từ 1 đến 1.000 lượt.</p><div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-[11px] leading-5 text-emerald-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Mã tự hết hiệu lực khi hết lượt hoặc hết thời hạn.</div><button type="button" onClick={() => void share(shareBook)} disabled={Boolean(busy)} className="mt-4 h-10 w-full rounded-lg bg-ink-950 text-xs font-semibold text-white disabled:opacity-40">{busy ? 'Đang tạo…' : 'Tạo và sao chép mã'}</button></> : <><code className="mt-4 block select-all break-all rounded-xl bg-emerald-50 p-3 text-center text-base font-bold text-emerald-950">{shareCode}</code><p className="mt-2 text-center text-[11px] text-ink-500">{createdShare?.maxUses || shareMaxUses} lượt · hết hạn {createdShare ? new Date(createdShare.expiresAt).toLocaleString('vi-VN') : ''}</p><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(shareCode); showToast('Đã sao chép mã chia sẻ.', 'success'); } catch { showToast('Hãy nhấn giữ vào mã để sao chép thủ công.', 'info'); } }} className="h-10 rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white">Sao chép mã</button><button type="button" onClick={closeShareDialog} className="h-10 rounded-lg border border-ink-200 px-3 text-xs font-semibold text-ink-700">Đóng</button></div></>}
    </div></div>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xs font-bold uppercase text-ink-500">Thư viện Cloud của admin</h2><p className="mt-1 text-xs text-ink-500">{catalog.totalCount} truyện · {sizeLabel(catalog.totalBytes)} trên R2</p></div><button type="button" onClick={() => void refresh()} disabled={Boolean(busy)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${busy === 'refresh' ? 'animate-spin' : ''}`} />Làm mới</button></div>
    <div className="rounded-xl border border-lily-200 bg-lily-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-lily-900"><Cloud className="h-5 w-5" /><strong className="text-sm">Đưa nhiều truyện trên máy lên Cloud</strong></div><button type="button" disabled={Boolean(busy) || !books.length} onClick={() => { const pending = books.filter(book => !remoteIds.has(cloudIdsByLocalId[book.id])).map(book => book.id); setSelectedIds(selectedIds.length === pending.length ? [] : pending); }} className="text-xs font-semibold text-lily-800 disabled:opacity-40">{selectedIds.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả chưa tải'}</button></div>
      <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-ink-200 bg-white p-2">{books.length ? books.map(book => { const onCloud = remoteIds.has(cloudIdsByLocalId[book.id]); return <label key={book.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs hover:bg-ink-50"><input type="checkbox" checked={selectedIds.includes(book.id)} disabled={Boolean(busy)} onChange={event => setSelectedIds(ids => event.target.checked ? [...ids, book.id] : ids.filter(id => id !== book.id))} className="h-4 w-4 accent-lily-700" /><span className="min-w-0 flex-1 truncate">{book.title}</span>{onCloud && <span className="shrink-0 text-[10px] text-ink-400">Đã có trên Cloud</span>}</label>; }) : <p className="px-2 py-3 text-center text-xs text-ink-500">Chưa có truyện nào trên máy.</p>}</div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="min-w-0 truncate text-xs text-ink-500">{uploadProgress || `Đã chọn ${selectedIds.length} truyện`}</p><button type="button" onClick={() => void upload()} disabled={!selectedIds.length || Boolean(busy)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{busy === 'upload:batch' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Tải {selectedIds.length || ''} truyện lên</button></div>
    </div>
    <div className="rounded-xl border border-ink-100 bg-white p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-xs font-bold text-ink-900"><ShieldCheck className="h-4 w-4 text-emerald-600" />Mã chia sẻ</h3><p className="mt-1 text-[11px] text-ink-500">{shares.filter(item => item.status === 'active').length} mã đang hoạt động</p></div><button type="button" onClick={() => void refreshShares()} className="text-[11px] font-semibold text-lily-800">Làm mới</button></div>{shares.length ? <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">{shares.map(item => <div key={item.id} className="flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2"><Clock3 className={`h-4 w-4 shrink-0 ${item.status === 'active' ? 'text-emerald-600' : 'text-ink-300'}`} /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-ink-800">{catalog.knownBooks.find(book => book.id === item.bookId)?.title || item.bookId}</p><p className="mt-0.5 text-[10px] text-ink-400">{item.usedCount}/{item.maxUses} lượt · {item.status === 'active' ? `hết hạn ${new Date(item.expiresAt).toLocaleString('vi-VN')}` : item.status === 'used' ? 'đã hết lượt' : 'đã hết hạn'}</p></div><button type="button" onClick={() => void revokeShare(item)} disabled={busy === `revoke:${item.id}`} className="shrink-0 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40">Thu hồi</button></div>)}</div> : <p className="mt-3 rounded-lg bg-ink-50 px-3 py-4 text-center text-[11px] text-ink-500">Chưa có mã chia sẻ.</p>}</div>
    <form onSubmit={submitSearch} className="flex gap-2"><label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" /><input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Tìm tên truyện hoặc tác giả trên Cloud..." className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-lily-400" /></label><button className="rounded-xl bg-lily-700 px-4 text-xs font-semibold text-white">Tìm kiếm</button></form>
    {query && <p className="text-xs text-ink-500">Tìm thấy {catalog.matchedCount} kết quả cho “{query}”.</p>}
    {catalog.books.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 bg-white p-2.5"><button type="button" onClick={() => setSelectedCloudIds(selectedCloudIds.length === catalog.books.length ? [] : catalog.books.map(book => book.id))} className="h-8 rounded-lg border border-ink-200 px-3 text-[11px] font-semibold text-ink-700">{selectedCloudIds.length === catalog.books.length ? 'Bỏ chọn' : 'Chọn trang này'}</button><span className="mr-auto text-[11px] text-ink-500">{selectedCloudIds.length} đã chọn</span><button type="button" onClick={openBatchShare} disabled={!selectedCloudIds.length || Boolean(busy)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-lily-200 bg-lily-50 px-3 text-[11px] font-semibold text-lily-900 disabled:opacity-40"><Link2 className="h-3.5 w-3.5" />Chia sẻ</button><button type="button" onClick={() => void restoreSelected()} disabled={!selectedCloudIds.length || Boolean(busy)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink-950 px-3 text-[11px] font-semibold text-white disabled:opacity-40">{busy === 'download:batch' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Nhập về máy</button></div>}
    {busy === 'refresh' && catalog.books.length === 0 ? <div className="flex justify-center py-12"><LoaderCircle className="h-6 w-6 animate-spin text-lily-700" /></div> : catalog.books.length === 0 ? <div className="rounded-xl border border-dashed border-ink-200 py-12 text-center text-sm text-ink-500">Không tìm thấy truyện trên Cloud.</div> : <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">{catalog.books.map(book => {
      const isOnDevice = localIdsByCloudId.has(book.id); const itemBusy = busy.includes(book.id);
      return <article key={book.id} className={`group min-w-0 rounded-xl bg-white p-2 ring-1 transition-shadow hover:shadow-soft ${selectedCloudIds.includes(book.id) ? 'ring-2 ring-lily-400' : 'ring-ink-100'}`}><div className="relative"><BookCover title={book.title || book.id} author={book.author} coverUrl={book.coverUrl} coverColor={book.coverColor} size="responsive" className="rounded-lg" /><label className="absolute left-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-white/95 shadow-sm"><input type="checkbox" checked={selectedCloudIds.includes(book.id)} onChange={event => setSelectedCloudIds(ids => event.target.checked ? [...ids, book.id] : ids.filter(id => id !== book.id))} className="h-4 w-4 accent-lily-700" /></label><div className="absolute right-1.5 top-1.5 flex gap-1 opacity-90 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"><button onClick={() => { setShareSelection([book.id]); setShareBook(book); setShareCode(''); setCreatedShare(null); }} className="rounded-md bg-white/95 p-1.5 text-lily-700 shadow-sm" aria-label="Tạo mã chia sẻ"><Link2 className="h-3.5 w-3.5" /></button><button onClick={() => void remove(book)} className="rounded-md bg-white/95 p-1.5 text-rose-600 shadow-sm" aria-label="Xóa khỏi Cloud"><Trash2 className="h-3.5 w-3.5" /></button></div></div><strong className="mt-2 block line-clamp-2 h-9 text-xs leading-[18px] text-ink-900">{book.title || book.id}</strong><span className="mt-0.5 block truncate text-[10px] text-ink-500">{book.author || 'Chưa rõ tác giả'}</span><span className="mt-0.5 block text-[10px] text-ink-400">{sizeLabel(book.size)}</span>{itemBusy ? <span className="mt-2 flex h-8 items-center justify-center"><LoaderCircle className="h-4 w-4 animate-spin text-lily-700" /></span> : <button onClick={() => isOnDevice ? navigateTo('book-detail', localIdsByCloudId.get(book.id)) : void restore(book)} className={`mt-2 inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg text-[10px] font-semibold ${isOnDevice ? 'bg-ink-950 text-white' : 'bg-lily-50 text-lily-900 ring-1 ring-lily-100'}`}>{isOnDevice ? 'Mở truyện' : <><Download className="h-3 w-3" />Tải về máy</>}</button>}</article>;
    })}</div>}
    <div className="flex items-center justify-between border-t border-ink-100 pt-4"><button type="button" disabled={page <= 1 || Boolean(busy)} onClick={() => setPage(value => Math.max(1, value - 1))} className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-200 px-3 text-xs font-semibold disabled:opacity-30"><ChevronLeft className="h-4 w-4" />Trước</button><span className="text-xs font-semibold text-ink-600">Trang {catalog.page} / {catalog.totalPages}</span><button type="button" disabled={page >= catalog.totalPages || Boolean(busy)} onClick={() => setPage(value => Math.min(catalog.totalPages, value + 1))} className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-200 px-3 text-xs font-semibold disabled:opacity-30">Sau<ChevronRight className="h-4 w-4" /></button></div>
  </section>;
};
