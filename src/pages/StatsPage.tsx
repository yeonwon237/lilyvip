import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Flame
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getReadingStreak, getEffectiveCurrentStreak, hasReadToday, getRecentActivity } from '../utils/readingStreak';

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const StatsPage: React.FC = () => {
  const { books, navigateTo, maxLocalSlots } = useApp();
  const readingStreak = getReadingStreak();
  const effectiveStreak = getEffectiveCurrentStreak(readingStreak);
  const readToday = hasReadToday(readingStreak);
  const recentDays = 14;
  const recentActivity = getRecentActivity(readingStreak, recentDays);
  const recentLabels = Array.from({ length: recentDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (recentDays - 1 - i));
    return WEEKDAY_LABELS[d.getDay()];
  });

  const totalBooks = books.length;
  const totalWords = books.reduce((acc, b) => acc + (b.wordCount || 0), 0);
  const totalChapters = books.reduce((acc, b) => acc + (b.totalChapters || 0), 0);
  const readChapters = books.reduce((acc, b) => acc + Math.max(0, (b.currentChapter || 1) - 1), 0);
  const completedBooks = books.filter(b => b.progressPercent >= 100 || (b.currentChapter >= b.totalChapters && b.totalChapters > 0));
  const estimatedReadingMinutes = Math.round(totalWords / 220);
  const estHours = Math.floor(estimatedReadingMinutes / 60);
  const estMins = estimatedReadingMinutes % 60;
  const wholePercent = (value: number) => Math.round(Number(value) || 0);

  return (
    <div className="flat-page max-w-4xl mx-auto py-4 pb-16 sm:pb-20 space-y-7">
      {/* Header */}
      <div className="border-b border-ink-200 pb-5">
        <div className="flex items-center gap-2">
          <h1 className="font-serif font-bold text-2xl md:text-3xl text-ink-950">
            Nhật ký đọc
          </h1>
        </div>
      </div>

      {/* Reading Streak */}
      <div className="border-b border-ink-200 pb-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${effectiveStreak > 0 ? 'bg-amber-50 text-amber-500' : 'bg-ink-50 text-ink-400'}`}>
              <Flame className={`h-5 w-5 ${effectiveStreak > 0 ? 'fill-amber-500' : ''}`} />
            </div>
            <div>
              <div className="font-serif font-bold text-2xl text-ink-950">
                {effectiveStreak} ngày liên tiếp
              </div>
              <p className="text-[11px] text-ink-500 mt-0.5">
                {effectiveStreak > 0
                  ? readToday ? 'Đã đọc hôm nay' : 'Đọc hôm nay để giữ chuỗi'
                  : 'Đọc hôm nay để bắt đầu'}
              </p>
            </div>
          </div>
          {readingStreak.longestStreak > 0 && (
            <div className="text-right shrink-0">
              <span className="text-[10px] text-ink-400 uppercase font-bold tracking-wider block">Kỷ lục</span>
              <span className="font-mono font-bold text-lg text-ink-900">{readingStreak.longestStreak} ngày</span>
            </div>
          )}
        </div>

        <div className="flex items-end justify-between gap-1">
          {recentActivity.map((active, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`h-6 w-full max-w-6 rounded-md ${active ? 'bg-amber-400' : 'bg-ink-100'}`}
                title={active ? 'Có đọc' : 'Không đọc'}
              />
              <span className="text-[9px] text-ink-400">{recentLabels[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 border-y border-ink-200 sm:grid-cols-3">
        {/* Total Books */}
        <div className="flex items-center gap-3 py-5 sm:pr-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center text-lily-600">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-lily-800 uppercase font-bold tracking-wider">
              Trong thư viện
            </span>
            <div className="font-serif font-bold text-2xl text-ink-950 mt-0.5">
              {totalBooks}/{maxLocalSlots}
            </div>
          </div>
        </div>

        {/* Read Chapters */}
        <div className="flex items-center gap-3 border-t border-ink-200 py-5 sm:border-l sm:border-t-0 sm:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center text-amber-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-amber-800 uppercase font-bold tracking-wider">
              Đã đọc
            </span>
            <div className="font-serif font-bold text-2xl text-ink-950 mt-0.5">
              {readChapters} / {totalChapters}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-ink-200 py-5 sm:border-l sm:border-t-0 sm:pl-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider">
              Đọc xong
            </span>
            <div className="font-serif font-bold text-2xl text-ink-950 mt-0.5">
              {completedBooks.length} truyện
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <h3 className="font-serif font-bold text-lg text-ink-950">
            Tổng quan
          </h3>
        </div>

        <div className="grid grid-cols-2 border-y border-ink-200 sm:grid-cols-4">
          <div className="space-y-1 py-4 text-center">
            <span className="text-[11px] text-ink-500">Số từ</span>
            <div className="font-mono font-bold text-lg text-ink-950">
              {totalWords.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1 border-l border-ink-200 py-4 text-center">
            <span className="text-[11px] text-ink-500">Số chương</span>
            <div className="font-mono font-bold text-lg text-ink-950">
              {totalChapters}
            </div>
          </div>

          <div className="space-y-1 border-t border-ink-200 py-4 text-center sm:border-l sm:border-t-0">
            <span className="text-[11px] text-ink-500">Thời gian đọc</span>
            <div className="font-mono font-bold text-lg text-ink-950">
              {estHours > 0 ? `${estHours}g ${estMins}p` : `${estMins} phút`}
            </div>
          </div>

          <div className="space-y-1 border-l border-t border-ink-200 py-4 text-center sm:border-t-0">
            <span className="text-[11px] text-ink-500">Nơi lưu</span>
            <div className="font-mono font-bold text-lg text-ink-950">
              Thiết bị
            </div>
          </div>
        </div>

        {totalBooks === 0 ? (
          <div className="py-8 text-center space-y-3 border-t border-ink-100">
            <p className="text-xs text-ink-500">
              Chưa có dữ liệu đọc. Hãy thêm truyện đầu tiên vào thư viện để xem thống kê.
            </p>
            <button
              onClick={() => navigateTo('add-book')}
              className="rounded-md bg-ink-950 px-5 py-2 text-xs font-semibold text-white hover:bg-ink-800"
            >
              + Thêm truyện ngay
            </button>
          </div>
        ) : (
          <div className="pt-2 border-t border-ink-100/70 space-y-3">
            <h4 className="text-xs font-bold text-ink-800 uppercase tracking-wider">
              Tiến độ từng truyện
            </h4>
            <div className="divide-y divide-ink-100/70">
              {books.map(book => (
                <div 
                  key={book.id}
                  onClick={() => navigateTo('book-detail', book.id)}
                  className="flex cursor-pointer items-center justify-between px-1 py-3 transition-colors hover:bg-cream-50/50"
                >
                  <div className="min-w-0 pr-4">
                    <div className="font-serif font-bold text-xs sm:text-sm text-ink-900 truncate">
                      {book.title}
                    </div>
                    <div className="text-[11px] text-ink-400">
                      Chương {book.currentChapter} / {book.totalChapters} · {book.author}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-xs text-lily-800">
                      {wholePercent(book.progressPercent)}%
                    </span>
                    <span className="block text-[10px] text-ink-400">
                      {book.progressPercent >= 100 ? 'Đã xong' : 'Đang đọc'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
