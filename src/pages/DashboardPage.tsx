import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  Headphones, 
  Plus, 
  Flame, 
  ChevronRight,
  Globe,
  CloudUpload,
  Loader2,
  Trash2,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookCard } from '../components/common/BookCard';
import { BookCover } from '../components/common/BookCover';
import { ProgressBar } from '../components/common/ProgressBar';
import { formatRelativeTime } from '../utils/dateUtils';
import { getReadingStreak, getEffectiveCurrentStreak, hasReadToday } from '../utils/readingStreak';
import { Book } from '../types';
import { LocalLibraryBackup } from '../book-engine/storage/LocalLibraryBackup';
import { OwnerLibraryClient } from '../book-engine/owner-library/OwnerLibraryClient';

type LibraryFilter = 'all' | 'reading' | 'completed' | 'website';
type LibrarySort = 'recent' | 'title' | 'progress';

export const DashboardPage: React.FC = () => {
  const { user, books, navigateTo, maxLocalSlots, isLibraryLoading, openUpgradeModal, removeBook, showToast } = useApp();
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [sortBy, setSortBy] = useState<LibrarySort>('recent');
  const [visibleCount, setVisibleCount] = useState(32);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cloudByLocalId, setCloudByLocalId] = useState<Record<string, boolean>>({});
  const [cloudStatusReady, setCloudStatusReady] = useState(false);
  const [batchBusy, setBatchBusy] = useState<'delete' | 'upload' | ''>('');
  const cloudAdminActive = user.isOwner && OwnerLibraryClient.hasSession();
  const readingStreak = getReadingStreak();
  const effectiveStreak = getEffectiveCurrentStreak(readingStreak);
  const readToday = hasReadToday(readingStreak);
  const expiryReminderEnabled = localStorage.getItem('LILY_NOTIFY_EXPIRY_V1') !== 'false';

  const continueBook = books[0] || null;
  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      if (filter === 'reading') return b.progressPercent > 0 && b.progressPercent < 100;
      if (filter === 'completed') return b.progressPercent >= 100;
      if (filter === 'website') return b.fileFormat === 'WEBSITE';
      return true;
    }).sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title, 'vi');
      if (sortBy === 'progress') return b.progressPercent - a.progressPercent;
      return new Date(b.lastReadAt || b.addedAt || 0).getTime() - new Date(a.lastReadAt || a.addedAt || 0).getTime();
    });
  }, [books, filter, sortBy]);
  const visibleBooks = filteredBooks.slice(0, visibleCount);

  const refreshCloudStatus = useCallback(async () => {
    if (!cloudAdminActive) { setCloudByLocalId({}); setCloudStatusReady(false); return; }
    try {
      const catalog = await OwnerLibraryClient.list(1);
      const remoteIds = new Set(catalog.knownBooks.map(book => book.id));
      const normalizeTitle = (value: string) => value.replace(/\.(epub|txt|docx|lilybackup)$/i, '').trim().toLocaleLowerCase('vi-VN');
      const remoteTitles = new Set(catalog.knownBooks.map(book => normalizeTitle(book.title)));
      const entries = await Promise.all(books.map(async book => [book.id,
        remoteIds.has(await OwnerLibraryClient.cloudId(book.id)) || remoteTitles.has(normalizeTitle(book.title))] as const));
      setCloudByLocalId(Object.fromEntries(entries));
      setCloudStatusReady(true);
    } catch {
      setCloudStatusReady(false);
    }
  }, [books, cloudAdminActive]);

  useEffect(() => { void refreshCloudStatus(); }, [refreshCloudStatus]);
  useEffect(() => { setSelectedIds(ids => ids.filter(id => books.some(book => book.id === id))); }, [books]);

  const toggleSelected = (bookId: string) => setSelectedIds(ids => ids.includes(bookId) ? ids.filter(id => id !== bookId) : [...ids, bookId]);
  const closeSelection = () => { if (batchBusy) return; setSelectionMode(false); setSelectedIds([]); };
  const deleteSelected = async () => {
    const selected = books.filter(book => selectedIds.includes(book.id));
    if (!selected.length || !window.confirm(`Xóa ${selected.length} truyện đã chọn khỏi thiết bị?\n\nTiến độ đọc, dấu trang, đoạn đánh dấu và ghi chú của các truyện này cũng sẽ bị xóa.`)) return;
    setBatchBusy('delete');
    for (const book of selected) await removeBook(book.id);
    setBatchBusy(''); setSelectedIds([]); setSelectionMode(false);
  };
  const uploadSelected = async () => {
    const selected = books.filter(book => selectedIds.includes(book.id) && !cloudByLocalId[book.id]);
    if (!selected.length) { showToast('Các truyện đã chọn đều đã có trên Cloud.', 'info'); return; }
    setBatchBusy('upload');
    let uploaded = 0;
    for (const book of selected) {
      try {
        const backup = await LocalLibraryBackup.createForBook(book.id);
        const blob = await LocalLibraryBackup.serializeCompressed(backup);
        const cloudId = await OwnerLibraryClient.cloudId(book.id);
        await OwnerLibraryClient.upload(cloudId, blob, book.title, book.author, book.coverUrl, book.coverColor);
        uploaded += 1;
      } catch (error) { console.error('[Lily dashboard cloud upload]', book.title, error); }
    }
    await refreshCloudStatus();
    setBatchBusy('');
    showToast(uploaded === selected.length ? `Đã đưa ${uploaded} truyện lên Cloud.` : `Đã đưa ${uploaded}/${selected.length} truyện lên Cloud.`, uploaded === selected.length ? 'success' : 'warning');
  };

  const readingCount = books.filter(b => b.progressPercent > 0 && b.progressPercent < 100).length;
  const websiteCount = books.filter(b => b.fileFormat === 'WEBSITE').length;

  return (
    <div className="flat-page max-w-7xl mx-auto py-2 sm:py-4 pb-20 space-y-6 sm:space-y-7 animate-in fade-in duration-200">
      
      {/* ================= PAGE HEADER (Apple Books Style) ================= */}
      <div className="border-b border-ink-200 pb-4">
        <h1 className="font-serif font-bold text-2xl sm:text-3xl md:text-4xl text-ink-950 tracking-tight">
          Thư viện
        </h1>
      </div>

      {expiryReminderEnabled && (user.tier === 'vip1' || user.tier === 'vip2' || user.tier === 'vip') && user.vipDaysRemaining !== undefined && user.vipDaysRemaining <= 7 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-amber-950">Gói của bạn {user.vipDaysRemaining === 0 ? 'hết hạn hôm nay' : `còn ${user.vipDaysRemaining} ngày`}</p>
            <p className="mt-1 text-[11px] leading-5 text-amber-900/80">Lily không tự động gia hạn. Bạn có thể xem lại gói và chủ động gia hạn trong trang Tài khoản.</p>
          </div>
          <button type="button" onClick={() => navigateTo('account')} className="shrink-0 rounded-xl bg-amber-900 px-4 py-2.5 text-xs font-semibold text-white">Xem gói thành viên</button>
        </section>
      )}

      {/* AUDIO PASS BANNER (IF ACTIVE) */}
      {user.tier === 'audio' && (
        <div className="flex items-center justify-between gap-3 border-y border-lavender-200 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center text-lavender-700">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-xs sm:text-sm text-lavender-950 truncate">
                  Lily Audio Pass
                </h3>
                <span className="text-[10px] font-semibold text-lavender-700">
                  Còn {user.audioDaysRemaining} ngày
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigateTo('audio')}
            className="shrink-0 text-xs font-semibold text-lavender-800 hover:text-lavender-950"
          >
            Mở Sách nói
          </button>
        </div>
      )}

      {!isLibraryLoading && books.length === 0 && (
        <section className="grid min-h-[340px] items-center gap-10 overflow-hidden border-y border-ink-200 px-2 py-10 sm:grid-cols-[minmax(280px,0.9fr)_minmax(320px,1.1fr)] sm:px-8 sm:py-12 lg:min-h-[390px] lg:px-16">
          <div className="max-w-md text-center sm:text-left">
            <p className="text-[11px] font-semibold uppercase text-lily-700">Kệ sách đang chờ bạn</p>
            <h2 className="mt-3 font-serif text-3xl font-bold leading-tight text-ink-950 sm:text-4xl">Bắt đầu bằng một cuốn bạn yêu thích.</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">Chọn truyện từ LilyHub, website hoặc thiết bị. Lily sẽ kiểm tra chương trước khi lưu.</p>
            <button onClick={() => navigateTo('add-book')} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-md border border-[#E8CBD9] bg-[#F6E8EF] px-5 text-sm font-semibold text-[#7A3158] transition-colors hover:bg-[#EFD8E4]">
              <Plus className="h-4 w-4" /> Thêm truyện
            </button>
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-ink-500 sm:justify-start"><span>1. Chọn nguồn</span><span>2. Kiểm tra truyện</span><span>3. Đọc hoặc nghe</span></div>
            <p className="mt-2 text-[11px] text-ink-400">{user.isOwner ? 'Tài khoản chủ sở hữu · Không giới hạn truyện trên thiết bị' : `Không cần đăng nhập · Tối đa ${maxLocalSlots} truyện trên thiết bị`}</p>
          </div>

          <div className="relative mx-auto h-[210px] w-[280px] sm:h-[270px] sm:w-[360px]" aria-hidden="true">
            <div className="absolute bottom-1 left-1/2 h-px w-[92%] -translate-x-1/2 bg-ink-300" />
            <img src="/default-covers/lily-cover-04.jpg" alt="" className="absolute bottom-3 left-2 h-[172px] w-[114px] -rotate-6 border border-white/80 object-cover shadow-[0_15px_30px_rgba(40,32,26,0.16)] sm:h-[222px] sm:w-[148px]" />
            <img src="/default-covers/lily-cover-09.jpg" alt="" className="absolute bottom-3 left-1/2 z-10 h-[196px] w-[130px] -translate-x-1/2 object-cover shadow-[0_18px_38px_rgba(40,32,26,0.22)] sm:h-[252px] sm:w-[168px]" />
            <img src="/default-covers/lily-cover-02.jpg" alt="" className="absolute bottom-3 right-2 h-[172px] w-[114px] rotate-6 border border-white/80 object-cover shadow-[0_15px_30px_rgba(40,32,26,0.16)] sm:h-[222px] sm:w-[148px]" />
          </div>
        </section>
      )}

      {/* ================= HERO: ĐANG ĐỌC (Reading Now Card) ================= */}
      {continueBook && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-base sm:text-lg text-ink-950 flex items-center gap-2">
              <span>Đọc tiếp</span>
              <span className="w-1.5 h-1.5 rounded-full bg-lily-500"></span>
            </h2>
          </div>

          <div
            onClick={() => navigateTo('book-detail', continueBook.id)}
            className="flex cursor-pointer gap-3 border-y border-ink-200 py-4 sm:hidden"
          >
            <div onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}>
              <BookCover
                title={continueBook.title}
                author={continueBook.author}
                coverUrl={continueBook.coverUrl}
                coverColor={continueBook.coverColor}
                size="sm"
                className="!h-[108px] !w-[72px]"
                priority
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
              <div className="min-w-0">
                <p className="mb-1 text-[10px] uppercase text-ink-400">
                  {continueBook.fileFormat} · {formatRelativeTime(continueBook.lastReadAt)}
                </p>
                <h3 className="line-clamp-2 font-serif text-base font-bold leading-snug text-ink-950">
                  {continueBook.title}
                </h3>
                <p className="mt-0.5 truncate text-[11px] text-ink-500">{continueBook.author}</p>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="truncate pr-2 text-ink-600">{continueBook.currentChapterTitle || 'Bắt đầu đọc'}</span>
                  <span className="shrink-0 font-mono font-bold text-lily-800">{Math.round(continueBook.progressPercent)}%</span>
                </div>
                <ProgressBar progress={continueBook.progressPercent} size="sm" />
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}
              className="self-center px-1 py-4 text-xs font-semibold text-lily-800"
              aria-label={`Đọc tiếp ${continueBook.title}`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div
            onClick={() => navigateTo('book-detail', continueBook.id)}
            className="group relative hidden cursor-pointer items-start gap-6 border-y border-ink-200 py-5 transition-colors hover:border-lily-300 sm:flex"
          >
            {/* 3D Elevated Book Cover */}
            <div 
              onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}
              className="shrink-0"
            >
              <BookCover
                title={continueBook.title}
                author={continueBook.author}
                coverUrl={continueBook.coverUrl}
                coverColor={continueBook.coverColor}
                format={continueBook.fileFormat}
                size="md"
                priority
              />
            </div>

            {/* Book Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-between h-full text-left py-0.5 space-y-3">
              <div>
                <p className="mb-1.5 text-[11px] text-ink-400">Đọc {formatRelativeTime(continueBook.lastReadAt)}</p>

                <h3 
                  onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}
                  className="font-serif font-bold text-xl sm:text-2xl text-ink-950 group-hover:text-lily-800 transition-colors leading-snug"
                >
                  {continueBook.title}
                </h3>
                <p className="text-xs sm:text-sm text-ink-600 font-serif italic mt-1">
                  {continueBook.author}
                </p>
              </div>

              {/* Progress Bar & Actions */}
              <div className="space-y-2.5 border-t border-ink-200 pt-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-ink-800 truncate max-w-[240px]">
                    {continueBook.currentChapterTitle || 'Bắt đầu đọc'}
                  </span>
                  <span className="font-bold text-lily-800 font-mono">{Math.round(continueBook.progressPercent)}%</span>
                </div>
                <ProgressBar progress={continueBook.progressPercent} size="md" />

                <div className="flex items-center pt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}
                    className="flex min-h-10 items-center gap-2 rounded-md border border-[#E8CBD9] bg-[#F6E8EF] px-5 text-xs font-semibold text-[#7A3158] transition-colors hover:bg-[#EFD8E4] sm:px-6 sm:text-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Tiếp tục đọc</span>
                  </button>

                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {user.tier === 'free' && books.length >= Math.max(1, maxLocalSlots - 1) && (
        <section className="flex flex-col gap-3 rounded-2xl border border-lily-200 bg-lily-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-lily-900">{user.isOwner ? `Thư viện chủ sở hữu đang có ${books.length} truyện` : `Thư viện miễn phí đang dùng ${books.length}/${maxLocalSlots} truyện`}</p>
            <p className="mt-1 text-[11px] leading-5 text-ink-600">MY30 mở rộng lên 30 truyện và có sao lưu để chuyển thư viện khi đổi thiết bị.</p>
          </div>
          <button type="button" onClick={() => openUpgradeModal('Bạn sắp dùng hết giới hạn của thư viện miễn phí.')} className="shrink-0 rounded-xl bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white">Xem lựa chọn nâng cấp</button>
        </section>
      )}

      {/* ================= LIBRARY BOOKSHELF (Apple Books Shelf Grid) ================= */}
      {books.length > 0 && <section className="space-y-5 sm:space-y-6">
        
        {/* Shelf Header & Filter Pills */}
        <div className="flex flex-col gap-3.5 border-b border-ink-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-serif font-bold text-lg sm:text-xl text-ink-950">
              Kệ sách của bạn
            </h2>
            <span className="text-xs text-ink-400">{books.length} cuốn</span>
          </div>

          {/* Unified shelf toolbar: filter, sort and selection */}
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-ink-100 bg-ink-50/80 p-1 text-xs shadow-2xs">
            <button
              onClick={() => setFilter('all')}
              className={`h-8 shrink-0 rounded-lg px-3 text-[11px] font-semibold transition-all ${
                filter === 'all' 
                  ? 'bg-white text-ink-950 shadow-sm ring-1 ring-ink-100'
                  : 'text-ink-500 hover:bg-white/70 hover:text-ink-900'
              }`}
            >
              Tất cả
            </button>
            {readingCount > 0 && <button
              onClick={() => setFilter('reading')}
              className={`h-8 shrink-0 rounded-lg px-3 text-[11px] font-semibold transition-all ${
                filter === 'reading' 
                  ? 'bg-white text-ink-950 shadow-sm ring-1 ring-ink-100'
                  : 'text-ink-500 hover:bg-white/70 hover:text-ink-900'
              }`}
            >
              Đang đọc ({readingCount})
            </button>}
            {websiteCount > 0 && websiteCount < books.length && (
              <button
                onClick={() => setFilter('website')}
                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold transition-all ${
                  filter === 'website' 
                    ? 'bg-white text-ink-950 shadow-sm ring-1 ring-ink-100'
                    : 'text-ink-500 hover:bg-white/70 hover:text-ink-900'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>Website ({websiteCount})</span>
              </button>
            )}
            <span className="mx-0.5 h-5 w-px shrink-0 bg-ink-200" />
            <label className="shrink-0"><span className="sr-only">Sắp xếp kệ sách</span><select value={sortBy} onChange={event => setSortBy(event.target.value as LibrarySort)} className="h-8 cursor-pointer rounded-lg border-0 bg-transparent px-2 text-[11px] font-semibold text-ink-700 outline-none hover:bg-white focus:bg-white"><option value="recent">Mới đọc</option><option value="title">Tên A–Z</option><option value="progress">Tiến độ</option></select></label>
            <button type="button" onClick={() => selectionMode ? closeSelection() : setSelectionMode(true)} className={`h-8 shrink-0 rounded-lg px-3.5 text-[11px] font-bold transition-all ${selectionMode ? 'bg-ink-950 text-white shadow-sm' : 'bg-[#F6E8EF] text-[#7A3158] ring-1 ring-[#E8CBD9] hover:bg-[#EFD8E4]'}`}>{selectionMode ? 'Xong' : 'Chọn'}</button>
          </div>
        </div>

        {selectionMode && <div className="sticky top-2 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-ink-200 bg-white/95 p-2.5 shadow-card backdrop-blur"><button type="button" disabled={Boolean(batchBusy)} onClick={() => setSelectedIds(selectedIds.length === filteredBooks.length ? [] : filteredBooks.map(book => book.id))} className="rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700">{selectedIds.length === filteredBooks.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</button><span className="mr-auto text-xs text-ink-500">Đã chọn {selectedIds.length}</span>{cloudAdminActive && <button type="button" disabled={!selectedIds.length || Boolean(batchBusy)} onClick={() => void uploadSelected()} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{batchBusy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}Đẩy lên Cloud</button>}<button type="button" disabled={!selectedIds.length || Boolean(batchBusy)} onClick={() => void deleteSelected()} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{batchBusy === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Xóa khỏi máy</button><button type="button" disabled={Boolean(batchBusy)} onClick={closeSelection} aria-label="Đóng chọn nhiều" className="p-2 text-ink-500"><X className="h-4 w-4" /></button></div>}

        {/* Books Grid */}
        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 px-0.5 sm:grid-cols-3 sm:gap-5 sm:px-0 lg:grid-cols-4">
            {visibleBooks.map((b) => (
              <BookCard key={b.id} book={b} selectionMode={selectionMode} selected={selectedIds.includes(b.id)} onToggleSelect={toggleSelected} cloudStatus={cloudStatusReady ? (cloudByLocalId[b.id] ? 'uploaded' : 'local-only') : undefined} />
            ))}

          </div>
        ) : (
          <div className="space-y-3 border-y border-ink-200 p-10 text-center">
            <BookOpen className="w-8 h-8 text-ink-400 mx-auto" />
            <h3 className="font-serif font-bold text-base text-ink-950">Không có truyện trong mục này</h3>
            <p className="text-xs text-ink-500">Hãy thêm truyện mới bằng file hoặc nhập từ website truyện.</p>
            <button
              onClick={() => navigateTo('add-book')}
              className="rounded-md border border-[#E8CBD9] bg-[#F6E8EF] px-4 py-2 text-xs font-semibold text-[#7A3158] hover:bg-[#EFD8E4]"
            >
              Thêm truyện mới
            </button>
          </div>
        )}
        {visibleBooks.length < filteredBooks.length && (
          <div className="mt-5 flex justify-center">
            <button type="button" onClick={() => setVisibleCount(count => count + 32)} className="rounded-xl border border-ink-200 bg-white px-5 py-2.5 text-xs font-semibold text-ink-700 hover:bg-ink-50">
              Xem thêm · còn {filteredBooks.length - visibleBooks.length} truyện
            </button>
          </div>
        )}
      </section>}

      {/* ================= READING STREAKS & AUDIO QUICK LOUNGE WIDGETS ================= */}
      {books.length > 0 && <div className="grid grid-cols-1 border-y border-ink-200 md:grid-cols-2">
        
        {/* Reading Streak & Stats */}
        <button
          type="button"
          onClick={() => navigateTo('stats')}
          className="group flex w-full items-center justify-between gap-3 py-3 text-left md:border-r md:border-ink-200 md:pr-5"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center ${effectiveStreak > 0 ? 'text-amber-500' : 'text-ink-400'}`}>
              <Flame className={`h-4 w-4 ${effectiveStreak > 0 ? 'fill-amber-500' : ''}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-sm font-bold text-ink-950">Thói quen đọc</h3>
              <p className="truncate text-[11px] text-ink-500">
                {effectiveStreak > 0
                  ? `${effectiveStreak} ngày liên tiếp${readToday ? ' · đã đọc hôm nay' : ' · đọc hôm nay để giữ chuỗi'}`
                  : 'Đọc hôm nay để bắt đầu chuỗi ngày đọc.'}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-400 group-hover:text-ink-950" />
        </button>

        {/* Audio Quick Jump */}
        <button
          type="button"
          onClick={() => navigateTo('audio')}
          className="group flex w-full items-center justify-between gap-3 border-t border-ink-200 py-3 text-left md:border-t-0 md:pl-5"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center text-lavender-700">
              <Headphones className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-sm font-bold text-ink-950">
                Phòng nghe Sách nói
              </h3>
              <p className="truncate text-[11px] text-ink-500">
                Nghe truyện rảnh tay với Giọng Lily
              </p>
            </div>
          </div>

          <ChevronRight className="h-4 w-4 shrink-0 text-ink-400 group-hover:text-ink-950" />
        </button>

      </div>}

    </div>
  );
};
