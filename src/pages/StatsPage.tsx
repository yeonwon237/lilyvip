import React from 'react';
import { 
  Flame, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp,
  HardDrive,
  Bookmark
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const StatsPage: React.FC = () => {
  const { books, navigateTo } = useApp();

  const totalBooks = books.length;
  const totalWords = books.reduce((acc, b) => acc + (b.wordCount || 0), 0);
  const totalChapters = books.reduce((acc, b) => acc + (b.totalChapters || 0), 0);
  const readChapters = books.reduce((acc, b) => acc + Math.max(0, (b.currentChapter || 1) - 1), 0);
  const completedBooks = books.filter(b => b.progressPercent >= 100 || (b.currentChapter >= b.totalChapters && b.totalChapters > 0));
  const readingBooks = books.filter(b => b.progressPercent > 0 && b.progressPercent < 100);

  const estimatedReadingMinutes = Math.round(totalWords / 220);
  const estHours = Math.floor(estimatedReadingMinutes / 60);
  const estMins = estimatedReadingMinutes % 60;

  return (
    <div className="max-w-4xl mx-auto py-4 pb-16 sm:pb-20 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-serif font-bold text-2xl md:text-3xl text-ink-950">
            Nhật ký đọc sách (Reading Diary)
          </h1>
        </div>
        <p className="text-xs text-ink-500 mt-1">
          Dữ liệu thống kê dựa trên toàn bộ các tác phẩm đang lưu trữ cục bộ trong thư viện của bạn.
        </p>
      </div>

      {/* HIGHLIGHT HERO CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Books */}
        <div className="bg-gradient-to-br from-lily-500/10 via-white to-lily-500/5 border border-lily-200/80 rounded-3xl p-5 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-lily-500/20 text-lily-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-lily-800 uppercase font-bold tracking-wider">
              Tác phẩm trong máy
            </span>
            <div className="font-serif font-bold text-2xl text-ink-950 mt-0.5">
              {totalBooks} / 3 truyện
            </div>
            <p className="text-[11px] text-ink-500 mt-0.5">
              {totalBooks > 0 ? `${totalBooks} slot đã sử dụng` : 'Chưa có truyện nào'}
            </p>
          </div>
        </div>

        {/* Read Chapters */}
        <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 border border-amber-200/80 rounded-3xl p-5 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-amber-800 uppercase font-bold tracking-wider">
              Chương đã đọc
            </span>
            <div className="font-serif font-bold text-2xl text-ink-950 mt-0.5">
              {readChapters} / {totalChapters}
            </div>
            <p className="text-[11px] text-ink-500 mt-0.5">
              {totalChapters > 0 ? `Tiến độ: ~${Math.round((readChapters / totalChapters) * 100)}% tổng số chương` : 'Chưa ghi nhận'}
            </p>
          </div>
        </div>

        {/* Total Words */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-white to-emerald-500/5 border border-emerald-200/80 rounded-3xl p-5 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider">
              Hoàn thành
            </span>
            <div className="font-serif font-bold text-2xl text-ink-950 mt-0.5">
              {completedBooks.length} tác phẩm
            </div>
            <p className="text-[11px] text-ink-500 mt-0.5">
              {readingBooks.length} truyện đang đọc dở
            </p>
          </div>
        </div>
      </div>

      {/* READING STATS SUMMARY TABLE */}
      <div className="bg-white border border-ink-100 rounded-3xl p-6 md:p-8 shadow-soft space-y-6">
        <div>
          <h3 className="font-serif font-bold text-lg text-ink-950">
            Tổng quan kho sách cá nhân
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">
            Ước lượng thời gian và khối lượng nội dung trên thiết bị hiện tại
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-cream-50/80 border border-cream-200 text-center space-y-1">
            <span className="text-[11px] text-ink-500">Tổng số từ</span>
            <div className="font-mono font-bold text-lg text-ink-950">
              {totalWords.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-cream-50/80 border border-cream-200 text-center space-y-1">
            <span className="text-[11px] text-ink-500">Tổng số chương</span>
            <div className="font-mono font-bold text-lg text-ink-950">
              {totalChapters}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-cream-50/80 border border-cream-200 text-center space-y-1">
            <span className="text-[11px] text-ink-500">Thời lượng ước tính</span>
            <div className="font-mono font-bold text-lg text-ink-950">
              ~{estHours > 0 ? `${estHours}h ${estMins}m` : `${estMins}m`}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-cream-50/80 border border-cream-200 text-center space-y-1">
            <span className="text-[11px] text-ink-500">Lưu trữ</span>
            <div className="font-mono font-bold text-lg text-ink-950">
              100% Local
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
              className="px-5 py-2 rounded-xl bg-ink-950 text-white text-xs font-semibold hover:bg-ink-800"
            >
              + Thêm truyện ngay
            </button>
          </div>
        ) : (
          <div className="pt-2 border-t border-ink-100/70 space-y-3">
            <h4 className="text-xs font-bold text-ink-800 uppercase tracking-wider">
              Chi tiết tiến độ từng truyện:
            </h4>
            <div className="divide-y divide-ink-100/70">
              {books.map(book => (
                <div 
                  key={book.id}
                  onClick={() => navigateTo('book-detail', book.id)}
                  className="py-3 flex items-center justify-between hover:bg-cream-50/50 p-2 rounded-xl cursor-pointer transition-colors"
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
                      {book.progressPercent}%
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
