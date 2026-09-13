import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Cloud, Download, Link2, LoaderCircle, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LocalLibraryBackup } from '../../book-engine/storage/LocalLibraryBackup';
import { OwnerCloudBook, OwnerCloudPage, OwnerLibraryClient } from '../../book-engine/owner-library/OwnerLibraryClient';
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
  const [selectedId, setSelectedId] = useState(books[0]?.id || '');
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
      showToast('Chưa thể đọc thư viện Cloud.', 'error');
    } finally { setBusy(''); }
  }, [page, query, showToast, unlocked]);

  useEffect(() => { void refresh(); }, [refresh]);
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
    const book = books.find(item => item.id === selectedId);
    if (!book) return;
    setBusy(`upload:${book.id}`);
    try {
      const backup = await LocalLibraryBackup.createForBook(book.id);
      const blob = await LocalLibraryBackup.serializeCompressed(backup);
      const cloudId = await OwnerLibraryClient.cloudId(book.id);
      await OwnerLibraryClient.upload(cloudId, blob, book.title, book.author, book.coverUrl, book.coverColor);
      setPage(1); setQuery(''); setSearchDraft(''); await refresh(1, '');
      showToast(`Đã đưa “${book.title}” vào Cloud.`, 'success');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      showToast(`Chưa thể tải truyện lên Cloud · ${reason}`, 'error');
    } finally { setBusy(''); }
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
    try { const code = await OwnerLibraryClient.createShare(book.id); await navigator.clipboard.writeText(code); showToast('Đã tạo và sao chép mã chia sẻ.', 'success'); }
    catch { showToast('Chưa thể tạo mã chia sẻ.', 'error'); }
    finally { setBusy(''); }
  };

  const remove = async (book: OwnerCloudBook) => {
    if (!window.confirm(`Xóa “${book.title}” khỏi Cloud? Bản trên máy không bị ảnh hưởng.`)) return;
    setBusy(`delete:${book.id}`);
    try { await OwnerLibraryClient.remove(book.id); await refresh(page, query); showToast('Đã xóa khỏi Cloud.', 'success'); }
    catch { showToast('Chưa thể xóa truyện khỏi Cloud.', 'error'); }
    finally { setBusy(''); }
  };

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xs font-bold uppercase text-ink-500">Thư viện Cloud của admin</h2><p className="mt-1 text-xs text-ink-500">{catalog.totalCount} truyện · {sizeLabel(catalog.totalBytes)} trên R2</p></div><button type="button" onClick={() => void refresh()} disabled={Boolean(busy)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-700 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${busy === 'refresh' ? 'animate-spin' : ''}`} />Làm mới</button></div>
    <div className="rounded-xl border border-lily-200 bg-lily-50/40 p-4"><div className="flex items-center gap-2 text-lily-900"><Cloud className="h-5 w-5" /><strong className="text-sm">Đưa truyện trên máy lên Cloud</strong></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><select value={selectedId} onChange={event => setSelectedId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-xs"><option value="">Chọn truyện trên máy</option>{books.map(book => <option key={book.id} value={book.id}>{book.title}{remoteIds.has(cloudIdsByLocalId[book.id]) ? ' · Đã có trên Cloud' : ''}</option>)}</select><button type="button" onClick={() => void upload()} disabled={!selectedId || Boolean(busy)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"><Upload className="h-4 w-4" />Tải lên</button></div></div>
    <form onSubmit={submitSearch} className="flex gap-2"><label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" /><input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Tìm tên truyện hoặc tác giả trên Cloud..." className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-lily-400" /></label><button className="rounded-xl bg-lily-700 px-4 text-xs font-semibold text-white">Tìm kiếm</button></form>
    {query && <p className="text-xs text-ink-500">Tìm thấy {catalog.matchedCount} kết quả cho “{query}”.</p>}
    {busy === 'refresh' && catalog.books.length === 0 ? <div className="flex justify-center py-12"><LoaderCircle className="h-6 w-6 animate-spin text-lily-700" /></div> : catalog.books.length === 0 ? <div className="rounded-xl border border-dashed border-ink-200 py-12 text-center text-sm text-ink-500">Không tìm thấy truyện trên Cloud.</div> : <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-5">{catalog.books.map(book => {
      const isOnDevice = localIdsByCloudId.has(book.id); const itemBusy = busy.includes(book.id);
      return <article key={book.id} className="group min-w-0"><BookCover title={book.title || book.id} author={book.author} coverUrl={book.coverUrl} coverColor={book.coverColor} size="responsive" /><strong className="mt-2 block line-clamp-2 min-h-10 text-sm leading-5 text-ink-900">{book.title || book.id}</strong><span className="mt-1 block truncate text-[11px] text-ink-500">{book.author || 'Chưa rõ tác giả'} · {sizeLabel(book.size)}</span><div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-1">{itemBusy ? <span className="col-span-3 flex h-9 items-center justify-center"><LoaderCircle className="h-4 w-4 animate-spin text-lily-700" /></span> : <><button onClick={() => isOnDevice ? navigateTo('book-detail', localIdsByCloudId.get(book.id)) : void restore(book, true)} className="rounded-lg bg-ink-950 px-2 py-2 text-[11px] font-semibold text-white">{isOnDevice ? 'Mở' : 'Tải & mở'}</button><button onClick={() => void share(book)} className="rounded-lg border border-ink-200 p-2 text-lily-700" aria-label="Tạo mã chia sẻ"><Link2 className="h-4 w-4" /></button><button onClick={() => void remove(book)} className="rounded-lg border border-rose-100 p-2 text-rose-600" aria-label="Xóa khỏi Cloud"><Trash2 className="h-4 w-4" /></button></>}</div>{!isOnDevice && <button onClick={() => void restore(book)} disabled={itemBusy} className="mt-1 inline-flex w-full items-center justify-center gap-1 py-1 text-[10px] font-semibold text-ink-500"><Download className="h-3 w-3" />Chỉ tải về máy</button>}</article>;
    })}</div>}
    <div className="flex items-center justify-between border-t border-ink-100 pt-4"><button type="button" disabled={page <= 1 || Boolean(busy)} onClick={() => setPage(value => Math.max(1, value - 1))} className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-200 px-3 text-xs font-semibold disabled:opacity-30"><ChevronLeft className="h-4 w-4" />Trước</button><span className="text-xs font-semibold text-ink-600">Trang {catalog.page} / {catalog.totalPages}</span><button type="button" disabled={page >= catalog.totalPages || Boolean(busy)} onClick={() => setPage(value => Math.min(catalog.totalPages, value + 1))} className="inline-flex h-9 items-center gap-1 rounded-lg border border-ink-200 px-3 text-xs font-semibold disabled:opacity-30">Sau<ChevronRight className="h-4 w-4" /></button></div>
  </section>;
};
