import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Headphones, 
  HardDrive, 
  Plus, 
  Flame, 
  ChevronRight,
  Globe
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookCard } from '../components/common/BookCard';
import { BookCover } from '../components/common/BookCover';
import { ProgressBar } from '../components/common/ProgressBar';
import { formatRelativeTime } from '../utils/dateUtils';
import { Book } from '../types';

type LibraryFilter = 'all' | 'reading' | 'completed' | 'website';

export const DashboardPage: React.FC = () => {
  const { user, books, navigateTo, maxLocalSlots } = useApp();
  const [filter, setFilter] = useState<LibraryFilter>('all');

  const continueBook = books[0] || null;
  const freeSlotsTotal = maxLocalSlots;
  const freeSlotsUsed = books.length;

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      if (filter === 'reading') return b.progressPercent > 0 && b.progressPercent < 100;
      if (filter === 'completed') return b.progressPercent >= 100;
      if (filter === 'website') return b.fileFormat === 'WEBSITE';
      return true;
    });
  }, [books, filter]);

  const readingCount = books.filter(b => b.progressPercent > 0 && b.progressPercent < 100).length;
  const websiteCount = books.filter(b => b.fileFormat === 'WEBSITE').length;

  return (
    <div className="flat-page max-w-7xl mx-auto py-2 sm:py-4 pb-20 space-y-7 sm:space-y-9 animate-in fade-in duration-200">
      
      {/* ================= PAGE HEADER (Apple Books Style) ================= */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-ink-200 pb-5">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl md:text-4xl text-ink-950 tracking-tight">
            Đọc & Thư viện
          </h1>
          <p className="mt-1 text-xs text-ink-500">Thư viện đọc cá nhân của bạn.</p>
        </div>

        {/* Header Right: Clean Slot Badge & Add Book Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
            <HardDrive className="w-3.5 h-3.5 text-ink-500 shrink-0" />
            <span>
              Bộ nhớ: <strong>{freeSlotsUsed}/{freeSlotsTotal}</strong> tác phẩm
            </span>
          </div>

          <button
            onClick={() => navigateTo('add-book')}
            className="flex min-h-10 items-center justify-center gap-2 rounded-md bg-ink-950 px-4 text-xs font-semibold text-white transition-colors hover:bg-ink-800 sm:px-5 sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm truyện</span>
          </button>
        </div>
      </div>

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

      {books.length === 0 && (
        <section className="border-y border-ink-200 px-5 py-12 text-center sm:px-10 sm:py-16">
          <img src="/lilyhub-icon-192.png" alt="" className="mx-auto h-20 w-20 object-contain" />
          <h2 className="mt-4 font-serif text-2xl font-bold text-ink-950 sm:text-3xl">Đọc truyện của bạn theo cách của Lily</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-600">Thêm file TXT, EPUB, DOCX hoặc nhập từ website để đọc và nghe ngay trên thiết bị.</p>
          <button onClick={() => navigateTo('add-book')} className="mt-6 inline-flex items-center gap-2 rounded-md bg-ink-950 px-5 py-3 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" /> Thêm truyện đầu tiên
          </button>
          <p className="mt-4 text-xs text-ink-500">Gói hiện tại lưu tối đa {maxLocalSlots} truyện trên thiết bị.</p>
        </section>
      )}

      {/* ================= HERO: ĐANG ĐỌC (Reading Now Card) ================= */}
      {continueBook && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-base sm:text-lg md:text-xl text-ink-950 flex items-center gap-2">
              <span>ĐANG ĐỌC</span>
              <span className="w-2 h-2 rounded-full bg-lily-500 animate-pulse"></span>
            </h2>
            <button
              onClick={() => navigateTo('library')}
              className="text-xs sm:text-sm text-ink-500 hover:text-lily-700 transition-colors flex items-center gap-1 font-medium"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
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
            className="group relative hidden cursor-pointer items-start gap-7 border-y border-ink-200 py-6 transition-colors hover:border-lily-300 sm:flex md:gap-8 md:py-8"
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
                size="lg"
              />
            </div>

            {/* Book Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-between h-full text-center sm:text-left py-0.5 space-y-3 sm:space-y-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-[11px] uppercase text-ink-400 sm:justify-start">
                  <span>{continueBook.fileFormat}</span>
                  <span>·</span>
                  <span>Đọc {formatRelativeTime(continueBook.lastReadAt)}</span>
                </div>

                <h3 
                  onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}
                  className="font-serif font-bold text-xl sm:text-2xl md:text-3xl text-ink-950 group-hover:text-lily-800 transition-colors leading-snug"
                >
                  {continueBook.title}
                </h3>
                <p className="text-xs sm:text-sm text-ink-600 font-serif italic mt-1">
                  {continueBook.author}
                </p>

                {continueBook.description && (
                  <p className="text-xs sm:text-sm text-ink-600 line-clamp-2 mt-2 leading-relaxed">
                    {continueBook.description}
                  </p>
                )}
              </div>

              {/* Progress Bar & Actions */}
              <div className="space-y-3 border-t border-ink-200 pt-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-ink-800 truncate max-w-[240px]">
                    {continueBook.currentChapterTitle || 'Bắt đầu đọc'}
                  </span>
                  <span className="font-bold text-lily-800 font-mono">{Math.round(continueBook.progressPercent)}%</span>
                </div>
                <ProgressBar progress={continueBook.progressPercent} size="md" />

                {/* Primary & Audio Action Buttons */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3 pt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}
                    className="flex min-h-10 items-center gap-2 rounded-md bg-ink-950 px-5 text-xs font-semibold text-white transition-colors hover:bg-ink-800 sm:px-6 sm:text-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Tiếp tục đọc</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); navigateTo('audio'); }}
                    className="flex min-h-10 items-center gap-2 rounded-md border border-ink-200 px-4 text-xs font-semibold text-ink-700 transition-colors hover:border-lavender-300 hover:text-lavender-800 sm:px-5 sm:text-sm"
                  >
                    <Headphones className="w-4 h-4 text-lavender-700" />
                    <span>Nghe sách nói</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); navigateTo('book-detail', continueBook.id); }}
                    className="min-h-10 px-3 text-xs font-medium text-ink-500 transition-colors hover:text-ink-900 sm:text-sm"
                  >
                    Chi tiết
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= LIBRARY BOOKSHELF (Apple Books Shelf Grid) ================= */}
      {books.length > 0 && <section className="space-y-4 sm:space-y-5">
        
        {/* Shelf Header & Filter Pills */}
        <div className="flex flex-col gap-3 border-b border-ink-200 pb-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-serif font-bold text-lg sm:text-xl text-ink-950">
              Kệ sách của bạn
            </h2>
            <span className="text-xs text-ink-400">{books.length} cuốn</span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`border-b-2 px-2 py-1.5 font-medium transition-colors ${
                filter === 'all' 
                  ? 'border-ink-950 text-ink-950 font-semibold'
                  : 'border-transparent text-ink-500 hover:text-ink-900'
              }`}
            >
              Tất cả ({books.length})
            </button>
            <button
              onClick={() => setFilter('reading')}
              className={`border-b-2 px-2 py-1.5 font-medium transition-colors ${
                filter === 'reading' 
                  ? 'border-ink-950 text-ink-950 font-semibold'
                  : 'border-transparent text-ink-500 hover:text-ink-900'
              }`}
            >
              Đang đọc ({readingCount})
            </button>
            {websiteCount > 0 && (
              <button
                onClick={() => setFilter('website')}
                className={`flex items-center gap-1 border-b-2 px-2 py-1.5 font-medium transition-colors ${
                  filter === 'website' 
                    ? 'border-ink-950 text-ink-950 font-semibold'
                    : 'border-transparent text-ink-500 hover:text-ink-900'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>Website ({websiteCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Books Grid */}
        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {filteredBooks.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}

          </div>
        ) : (
          <div className="space-y-3 border-y border-ink-200 p-10 text-center">
            <BookOpen className="w-8 h-8 text-ink-400 mx-auto" />
            <h3 className="font-serif font-bold text-base text-ink-950">Không có truyện trong mục này</h3>
            <p className="text-xs text-ink-500">Hãy thêm truyện mới bằng file hoặc nhập từ website truyện.</p>
            <button
              onClick={() => navigateTo('add-book')}
              className="rounded-md bg-ink-950 px-4 py-2 text-xs font-semibold text-white"
            >
              Thêm truyện mới
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
          className="group flex w-full items-center justify-between gap-4 py-5 text-left md:border-r md:border-ink-200 md:pr-6"
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center text-amber-500">
              <Flame className="h-5 w-5 fill-amber-500" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-base font-bold text-ink-950">Thói quen đọc</h3>
              <p className="mt-0.5 truncate text-xs text-ink-500">Xem thời gian và tiến độ đọc.</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-500 group-hover:text-ink-950" />
        </button>

        {/* Audio Quick Jump */}
        <button
          type="button"
          onClick={() => navigateTo('audio')}
          className="group flex w-full items-center justify-between gap-4 border-t border-ink-200 py-5 text-left md:border-t-0 md:pl-6"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center text-lavender-700">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-bold text-base text-ink-950">
                Phòng nghe Sách nói
              </h3>
              <p className="text-xs text-ink-500 mt-0.5 truncate">
                Nghe truyện rảnh tay với Giọng Lily
              </p>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 shrink-0 text-ink-500 group-hover:text-ink-950" />
        </button>

      </div>}

    </div>
  );
};
