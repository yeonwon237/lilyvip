import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Headphones, 
  Sparkles, 
  HardDrive, 
  Plus, 
  Flame, 
  ChevronRight,
  ArrowRight,
  Clock,
  Bookmark,
  Compass,
  Layers,
  Globe,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookCard } from '../components/common/BookCard';
import { BookCover } from '../components/common/BookCover';
import { ProgressBar } from '../components/common/ProgressBar';
import { LocalBadge, CloudBadge, FormatBadge } from '../components/common/Badges';
import { formatRelativeTime } from '../utils/dateUtils';
import { Book } from '../types';

type LibraryFilter = 'all' | 'reading' | 'completed' | 'website';

export const DashboardPage: React.FC = () => {
  const { user, books, navigateTo, openUpgradeModal, isOpenBeta, isSlotFull, maxLocalSlots } = useApp();
  const [filter, setFilter] = useState<LibraryFilter>('all');

  const continueBook = books[0] || null;
  const freeSlotsTotal = user.freeSlotsTotal || maxLocalSlots || 3;
  const freeSlotsUsed = books.length;
  const freeSlotsRemaining = Math.max(0, freeSlotsTotal - freeSlotsUsed);

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
    <div className="max-w-7xl mx-auto py-2 sm:py-4 pb-20 space-y-7 sm:space-y-9 animate-in fade-in duration-200">
      
      {/* ================= PAGE HEADER (Apple Books Style) ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100/80 pb-4 sm:pb-5">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl md:text-4xl text-ink-950 tracking-tight">
            Đọc & Thư viện
          </h1>
          <p className="text-xs sm:text-sm text-ink-600 mt-1 leading-relaxed">
            {user.tier === 'vip' 
              ? `Chào ${user.name}, toàn bộ câu chuyện và sách nói của bạn đã sẵn sàng.`
              : `Chào ${user.name}, hãy đắm mình vào từng trang truyện bạn yêu thích.`}
          </p>
        </div>

        {/* Header Right: Clean Slot Badge & Add Book Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-ink-100/80 border border-ink-200/60 text-xs font-semibold text-ink-800 shadow-xs">
            <HardDrive className="w-3.5 h-3.5 text-ink-500 shrink-0" />
            <span>
              {user.tier === 'vip' ? (
                'Lily VIP · Không giới hạn'
              ) : (
                <>Bộ nhớ: <strong>{freeSlotsUsed}/{freeSlotsTotal}</strong> tác phẩm</>
              )}
            </span>
          </div>

          <button
            onClick={() => navigateTo('add-book')}
            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-ink-950 hover:bg-ink-800 text-white text-xs sm:text-sm font-semibold shadow-soft flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm truyện</span>
          </button>
        </div>
      </div>

      {/* AUDIO PASS BANNER (IF ACTIVE) */}
      {user.tier === 'audio' && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-lavender-50 via-white to-lavender-50/80 border border-lavender-200 shadow-soft flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-lavender-100 text-lavender-700 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-xs sm:text-sm text-lavender-950 truncate">
                  🎧 Lily Audio Pass đang kích hoạt
                </h3>
                <span className="text-[10px] sm:text-xs font-bold text-lavender-800 px-2.5 py-0.5 rounded-full bg-lavender-100">
                  Còn {user.audioDaysRemaining} ngày
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-ink-500 mt-0.5 truncate">
                Giọng đọc AI đã sẵn sàng cho tất cả tác phẩm trong thư viện của bạn.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigateTo('audio')}
            className="shrink-0 px-4 py-2 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-xs transition-all hover:scale-105"
          >
            Mở Sách nói
          </button>
        </div>
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
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div 
            onClick={() => navigateTo('book-detail', continueBook.id)}
            className="relative overflow-hidden bg-gradient-to-br from-white via-cream-50/50 to-amber-50/20 border border-ink-100/90 hover:border-ink-200 rounded-3xl p-5 sm:p-7 md:p-8 shadow-card hover:shadow-modal transition-all flex flex-col sm:flex-row gap-5 sm:gap-7 md:gap-8 items-center sm:items-start cursor-pointer group"
          >
            {/* 3D Elevated Book Cover */}
            <div 
              onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}
              className="shrink-0 drop-shadow-[0_16px_28px_rgba(40,20,30,0.22)] transition-transform group-hover:scale-[1.03]"
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
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                  {continueBook.storageType === 'cloud' ? <CloudBadge /> : <LocalBadge />}
                  <FormatBadge format={continueBook.fileFormat} />
                  <span className="text-[11px] sm:text-xs text-ink-400 font-mono">
                    Đọc {formatRelativeTime(continueBook.lastReadAt)}
                  </span>
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
              <div className="pt-3 border-t border-ink-100/80 space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-ink-800 truncate max-w-[240px]">
                    {continueBook.currentChapterTitle || 'Bắt đầu đọc'}
                  </span>
                  <span className="font-bold text-lily-800 font-mono">{continueBook.progressPercent}%</span>
                </div>
                <ProgressBar progress={continueBook.progressPercent} size="md" />

                {/* Primary & Audio Action Buttons */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3 pt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}
                    className="px-5 sm:px-6 py-2.5 rounded-2xl bg-ink-950 hover:bg-ink-800 text-white text-xs sm:text-sm font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Tiếp tục đọc</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); navigateTo('audio'); }}
                    className="px-4 sm:px-5 py-2.5 rounded-2xl bg-lavender-50 hover:bg-lavender-100 text-lavender-800 border border-lavender-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors shadow-xs"
                  >
                    <Headphones className="w-4 h-4 text-lavender-700" />
                    <span>Nghe sách nói</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); navigateTo('book-detail', continueBook.id); }}
                    className="px-4 py-2.5 rounded-2xl border border-ink-200 hover:bg-ink-50 text-xs sm:text-sm font-medium text-ink-700 transition-colors"
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
      <section className="space-y-4 sm:space-y-5">
        
        {/* Shelf Header & Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-100/60 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-serif font-bold text-lg sm:text-xl text-ink-950">
              Kệ sách của bạn
            </h2>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-ink-100 text-ink-600">
              {books.length} cuốn
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                filter === 'all' 
                  ? 'bg-ink-950 text-white font-semibold shadow-xs' 
                  : 'bg-ink-100/80 hover:bg-ink-200/70 text-ink-600'
              }`}
            >
              Tất cả ({books.length})
            </button>
            <button
              onClick={() => setFilter('reading')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                filter === 'reading' 
                  ? 'bg-ink-950 text-white font-semibold shadow-xs' 
                  : 'bg-ink-100/80 hover:bg-ink-200/70 text-ink-600'
              }`}
            >
              Đang đọc ({readingCount})
            </button>
            {websiteCount > 0 && (
              <button
                onClick={() => setFilter('website')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1 ${
                  filter === 'website' 
                    ? 'bg-ink-950 text-white font-semibold shadow-xs' 
                    : 'bg-ink-100/80 hover:bg-ink-200/70 text-ink-600'
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredBooks.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}

            {/* If slots available and user tier is free, show compact add card at end */}
            {user.tier === 'free' && freeSlotsRemaining > 0 && (
              <div
                onClick={() => navigateTo('add-book')}
                className="group p-6 rounded-3xl border-2 border-dashed border-ink-200 hover:border-lily-400 bg-white/50 hover:bg-lily-50/40 transition-all flex flex-col items-center justify-center text-center cursor-pointer min-h-[250px] shadow-xs hover:shadow-soft"
              >
                <div className="w-12 h-12 rounded-2xl bg-cream-100 group-hover:bg-lily-100 text-ink-500 group-hover:text-lily-700 flex items-center justify-center mb-3 transition-all group-hover:scale-105 shadow-xs">
                  <Plus className="w-6 h-6" />
                </div>
                <h4 className="font-serif font-bold text-sm text-ink-900 group-hover:text-lily-950">
                  Thêm truyện vào slot trống
                </h4>
                <p className="text-[11px] text-ink-500 mt-1">
                  Còn trống {freeSlotsRemaining} slot bộ nhớ máy
                </p>
                <span className="mt-3 px-3 py-1 rounded-xl bg-white border border-ink-200 text-xs font-semibold text-ink-700 shadow-xs">
                  + Chọn file hoặc dán link
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-10 rounded-3xl bg-white border border-ink-100 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-ink-400 mx-auto" />
            <h3 className="font-serif font-bold text-base text-ink-950">Không có truyện trong mục này</h3>
            <p className="text-xs text-ink-500">Hãy thêm truyện mới bằng file hoặc nhập từ website truyện.</p>
            <button
              onClick={() => navigateTo('add-book')}
              className="px-4 py-2 rounded-2xl bg-ink-950 text-white text-xs font-semibold shadow-soft"
            >
              Thêm truyện mới
            </button>
          </div>
        )}
      </section>

      {/* ================= READING STREAKS & AUDIO QUICK LOUNGE WIDGETS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
        
        {/* Reading Streak & Stats */}
        <div className="bg-gradient-to-br from-amber-50/70 via-white to-lily-50/30 border border-amber-200/70 rounded-3xl p-5 sm:p-6 shadow-soft flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
              <h3 className="font-serif font-bold text-base text-ink-950">Thói quen đọc</h3>
            </div>
            <p className="text-xs text-ink-500">
              Duy trì chuỗi đọc sách mỗi ngày để hình thành thói quen tốt.
            </p>
            <div className="flex items-center gap-3 pt-2 font-serif font-bold text-sm text-ink-950">
              <span>🔥 Chuỗi 7 ngày</span>
              <span>·</span>
              <span>⏱️ 12h 34m tuần này</span>
            </div>
          </div>

          <button
            onClick={() => navigateTo('stats')}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-white border border-amber-200 hover:bg-amber-50 text-xs font-semibold text-amber-900 transition-colors shadow-xs"
          >
            Chi tiết →
          </button>
        </div>

        {/* Audio Quick Jump */}
        <div 
          onClick={() => navigateTo('audio')}
          className="bg-gradient-to-br from-lavender-50/80 via-white to-lavender-50/40 border border-lavender-200/80 rounded-3xl p-5 sm:p-6 shadow-soft flex items-center justify-between gap-4 cursor-pointer group hover:shadow-card transition-all"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-lavender-100 text-lavender-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-bold text-base text-ink-950 group-hover:text-lavender-900 transition-colors">
                Phòng nghe Sách nói
              </h3>
              <p className="text-xs text-ink-500 mt-0.5 truncate">
                Nghe truyện rảnh tay với Giọng đọc Lily AI Offline
              </p>
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-ink-400 group-hover:text-lavender-700 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

      </div>

    </div>
  );
};
