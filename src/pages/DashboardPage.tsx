import React from 'react';
import { 
  BookOpen, 
  Headphones, 
  Sparkles, 
  HardDrive, 
  Cloud, 
  ArrowRight, 
  Plus, 
  Flame, 
  Clock, 
  Smartphone,
  CheckCircle2,
  FolderHeart,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookCard } from '../components/common/BookCard';
import { BookCover } from '../components/common/BookCover';
import { ProgressBar } from '../components/common/ProgressBar';
import { PlanStatus } from '../components/common/PlanStatus';
import { StorageMeter } from '../components/common/StorageMeter';
import { CloudBadge, LocalBadge } from '../components/common/Badges';

export const DashboardPage: React.FC = () => {
  const { user, books, navigateTo, openUpgradeModal, readingStats } = useApp();

  const continueBook = books[0] || null;
  const localBooks = books.filter(b => b.storageType === 'local');
  const recentBooks = books.slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto py-2 space-y-8 animate-in fade-in duration-200">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink-100/70 pb-5">
        <div>
          <h1 className="font-serif font-bold text-2xl md:text-3xl lg:text-4xl text-ink-950 tracking-tight">
            Chào buổi tối, {user.name} ♡
          </h1>
          <p className="text-sm md:text-base text-ink-600 mt-1">
            {user.tier === 'vip' 
              ? 'Tủ sách cá nhân của bạn đã được đồng bộ an toàn trên Lily Cloud.' 
              : 'Trải nghiệm đọc sách yên bình với các file truyện lưu trên thiết bị này.'}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('add-book')}
            className="px-5 py-2.5 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white text-xs md:text-sm font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm truyện mới</span>
          </button>
        </div>
      </div>

      {/* AUDIO PASS COMPACT STATUS (FREE + AUDIO) */}
      {user.tier === 'audio' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-lavender-50 via-white to-lavender-50/80 border border-lavender-200 shadow-soft flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lavender-100 text-lavender-700 flex items-center justify-center">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-lavender-950">
                  🎧 Lily Audio Pass đang kích hoạt
                </h3>
                <span className="text-xs font-bold text-lavender-800 px-2 py-0.5 rounded-full bg-lavender-100">
                  Còn {user.audioDaysRemaining} ngày
                </span>
              </div>
              <p className="text-xs text-ink-500 mt-0.5">
                Đã mở khóa giọng đọc AI cho toàn bộ 3 slot truyện Local trên máy của bạn.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigateTo('audio')}
            className="px-3.5 py-1.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-xs"
          >
            Mở Audio Hub
          </button>
        </div>
      )}

      {/* VIP 2-COLUMN LAYOUT (8 COLS MAIN / 4 COLS SIDEBAR) */}
      {user.tier === 'vip' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 8 COLUMNS: ĐỌC TIẾP + THƯ VIỆN GẦN ĐÂY */}
          <div className="lg:col-span-8 space-y-8">
            {/* HERO CARD: ĐỌC TIẾP */}
            {continueBook && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif font-bold text-lg md:text-xl text-ink-950 flex items-center gap-2">
                    <span>ĐỌC TIẾP</span>
                    <span className="w-2 h-2 rounded-full bg-lily-500"></span>
                  </h2>
                  <button
                    onClick={() => navigateTo('library')}
                    className="text-xs md:text-sm text-ink-500 hover:text-lily-700 transition-colors flex items-center gap-1 font-medium"
                  >
                    <span>Xem tất cả</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div 
                  onClick={() => navigateTo('book-detail', continueBook.id)}
                  className="bg-white border border-ink-100 hover:border-ink-200 rounded-3xl p-6 md:p-7 shadow-soft hover:shadow-card transition-all flex flex-col md:flex-row gap-6 md:gap-7 items-center md:items-start cursor-pointer group"
                >
                  <div 
                    onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}
                    className="shrink-0 transition-transform group-hover:scale-[1.02]"
                  >
                    <BookCover
                      title={continueBook.title}
                      author={continueBook.author}
                      coverUrl={continueBook.coverUrl}
                      coverColor={continueBook.coverColor}
                      format={continueBook.fileFormat}
                      size="xl"
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full text-center md:text-left py-1">
                    <div>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                        <CloudBadge />
                        <span className="text-xs text-ink-400">Đọc lần cuối {continueBook.lastReadAt}</span>
                      </div>

                      <h3 
                        onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}
                        className="font-serif font-bold text-2xl md:text-3xl text-ink-950 group-hover:text-lily-800 transition-colors leading-tight"
                      >
                        {continueBook.title}
                      </h3>
                      <p className="text-sm text-ink-600 italic mt-1">
                        {continueBook.author}
                      </p>

                      <p className="text-xs md:text-sm text-ink-600 line-clamp-2 mt-3 leading-relaxed">
                        {continueBook.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-ink-100">
                      <div className="flex items-center justify-between text-xs md:text-sm mb-2">
                        <span className="font-medium text-ink-800">
                          {continueBook.currentChapterTitle}
                        </span>
                        <span className="font-bold text-lily-800">{continueBook.progressPercent}%</span>
                      </div>
                      <ProgressBar progress={continueBook.progressPercent} size="md" />

                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-5">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}
                          className="px-6 py-2.5 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white text-xs md:text-sm font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>Tiếp tục đọc</span>
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); navigateTo('book-detail', continueBook.id); }}
                          className="px-5 py-2.5 rounded-2xl border border-ink-200 hover:bg-ink-50 text-xs md:text-sm font-medium text-ink-700 transition-colors"
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* RECENT CLOUD BOOKS GRID */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif font-bold text-lg md:text-xl text-ink-950">
                    THƯ VIỆN LILY CLOUD
                  </h2>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {books.length} truyện đã lưu · Tự động đồng bộ tiến độ đọc trên mọi thiết bị
                  </p>
                </div>

                <button
                  onClick={() => navigateTo('library')}
                  className="text-xs md:text-sm text-ink-500 hover:text-lily-700 transition-colors flex items-center gap-1 font-medium"
                >
                  <span>Mở thư viện</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT 4 COLUMNS: CLOUD MODULE + STREAK + AUDIO PRO */}
          <div className="lg:col-span-4 space-y-6">
            {/* CLOUD STATUS DEDICATED MODULE */}
            <div className="bg-white border border-lily-100 rounded-3xl p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-lily-100 text-lily-700 flex items-center justify-center">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-ink-950">Lily Cloud Sync</h3>
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      ☁ Đã đồng bộ an toàn
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-lily-800 bg-lily-50 px-2 py-0.5 rounded-full">
                  VIP
                </span>
              </div>

              {/* Storage bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-ink-700">
                  <span>Dung lượng đã dùng:</span>
                  <span className="font-semibold text-ink-900">{user.usedStorageMB} MB / {user.totalStorageMB} MB</span>
                </div>
                <div className="w-full h-2.5 bg-ink-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-lily-500 to-lavender-500 rounded-full"
                    style={{ width: `${Math.round((user.usedStorageMB / user.totalStorageMB) * 100)}%` }}
                  />
                </div>
                <div className="text-[11px] text-ink-400 text-right">
                  {Math.round((user.usedStorageMB / user.totalStorageMB) * 100)}% đã dùng · Không giới hạn số truyện
                </div>
              </div>

              {/* Synced devices */}
              <div className="pt-3 border-t border-ink-100 space-y-2 text-xs">
                <span className="text-ink-400 font-medium block text-[11px] uppercase tracking-wider">
                  Thiết bị đang kết nối:
                </span>
                <div className="space-y-1.5 text-ink-700">
                  {user.syncedDevices?.map((device, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 px-2.5 rounded-xl bg-cream-50/70">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-ink-400" />
                        <span className="font-medium text-xs">{device}</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold">Đồng bộ</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* READING STATS & STREAK DIARY CARD */}
            <div className="bg-gradient-to-br from-amber-50/60 via-white to-lily-50/40 border border-amber-200/70 rounded-3xl p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
                  <h3 className="font-serif font-bold text-base text-ink-950">Chuỗi đọc & Nhật ký</h3>
                </div>
                <button
                  onClick={() => navigateTo('stats')}
                  className="text-xs text-lily-700 hover:underline font-semibold"
                >
                  Chi tiết →
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-white border border-ink-100 text-center">
                  <div className="text-xl font-bold font-serif text-ink-950">🔥 7 ngày</div>
                  <span className="text-[11px] text-ink-500">Chuỗi đọc hiện tại</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-ink-100 text-center">
                  <div className="text-xl font-bold font-serif text-ink-950">12h 34m</div>
                  <span className="text-[11px] text-ink-500">Thời gian tuần này</span>
                </div>
              </div>
            </div>

            {/* AUDIO ACTIVE SUMMARY WIDGET */}
            <div 
              onClick={() => navigateTo('audio')}
              className="bg-white border border-lavender-200 rounded-3xl p-5 shadow-soft hover:shadow-card transition-all cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-lavender-100 text-lavender-700 flex items-center justify-center">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-ink-950 group-hover:text-lavender-900 transition-colors">
                    Lily Audio Hub
                  </h4>
                  <p className="text-xs text-ink-500 mt-0.5">
                    4 giọng đọc AI · Tùy chỉnh tốc độ & hẹn giờ
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-lavender-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>
      ) : (
        /* FREE & AUDIO LAYOUT: 3 SLOTS GRID + GENTLE NOTICE */
        <div className="space-y-8">
          {/* HERO CARD: ĐỌC TIẾP */}
          {continueBook && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-serif font-bold text-lg md:text-xl text-ink-950 flex items-center gap-2">
                  <span>ĐỌC TIẾP</span>
                  <span className="w-2 h-2 rounded-full bg-lily-500"></span>
                </h2>
              </div>

              <div 
                onClick={() => navigateTo('book-detail', continueBook.id)}
                className="bg-white border border-ink-100 hover:border-ink-200 rounded-3xl p-6 md:p-7 shadow-soft hover:shadow-card transition-all flex flex-col md:flex-row gap-6 md:gap-7 items-center md:items-start cursor-pointer group"
              >
                <div 
                  onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}
                  className="shrink-0 transition-transform group-hover:scale-[1.02]"
                >
                  <BookCover
                    title={continueBook.title}
                    author={continueBook.author}
                    coverUrl={continueBook.coverUrl}
                    coverColor={continueBook.coverColor}
                    format={continueBook.fileFormat}
                    size="xl"
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between h-full text-center md:text-left py-1">
                  <div>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                      <LocalBadge />
                      <span className="text-xs text-ink-400">Đọc lần cuối {continueBook.lastReadAt}</span>
                    </div>

                    <h3 
                      onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}
                      className="font-serif font-bold text-2xl md:text-3xl text-ink-950 group-hover:text-lily-800 transition-colors leading-tight"
                    >
                      {continueBook.title}
                    </h3>
                    <p className="text-sm text-ink-600 italic mt-1">
                      {continueBook.author}
                    </p>

                    <p className="text-xs md:text-sm text-ink-600 line-clamp-2 mt-3 leading-relaxed">
                      {continueBook.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-ink-100">
                    <div className="flex items-center justify-between text-xs md:text-sm mb-2">
                      <span className="font-medium text-ink-800">
                        {continueBook.currentChapterTitle}
                      </span>
                      <span className="font-bold text-lily-800">{continueBook.progressPercent}%</span>
                    </div>
                    <ProgressBar progress={continueBook.progressPercent} size="md" />

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-5">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigateTo('reader', continueBook.id); }}
                        className="px-6 py-2.5 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white text-xs md:text-sm font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Tiếp tục đọc</span>
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); navigateTo('book-detail', continueBook.id); }}
                        className="px-5 py-2.5 rounded-2xl border border-ink-200 hover:bg-ink-50 text-xs md:text-sm font-medium text-ink-700 transition-colors"
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 3 LOCAL SLOTS GRID */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-bold text-lg md:text-xl text-ink-950">
                    THƯ VIỆN TRÊN THIẾT BỊ
                  </h2>
                  <span className="text-xs font-mono font-semibold text-ink-600 px-2.5 py-0.5 rounded-full bg-ink-100">
                    {user.freeSlotsUsed} / {user.freeSlotsTotal} slot
                  </span>
                </div>
                <p className="text-xs text-ink-500 mt-0.5">
                  Các truyện được lưu trữ cục bộ trong trình duyệt máy của bạn.
                </p>
              </div>

              <button
                onClick={() => openUpgradeModal('Lily VIP Cloud')}
                className="text-xs md:text-sm font-semibold text-lily-700 hover:text-lily-900 flex items-center gap-1"
              >
                <Sparkles className="w-4 h-4" />
                <span>Tìm hiểu Lily VIP</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Slot 1 */}
              {localBooks[0] ? (
                <BookCard book={localBooks[0]} />
              ) : (
                <BookCard isEmptySlot slotNumber={1} />
              )}

              {/* Slot 2 */}
              {localBooks[1] ? (
                <BookCard book={localBooks[1]} />
              ) : (
                <BookCard isEmptySlot slotNumber={2} />
              )}

              {/* Slot 3 */}
              {localBooks[2] ? (
                <BookCard book={localBooks[2]} />
              ) : (
                <BookCard isEmptySlot slotNumber={3} />
              )}
            </div>

            {/* Gentle Notice */}
            <div className="p-4 rounded-2xl bg-cream-100/70 border border-cream-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-ink-700">
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-ink-500 shrink-0" />
                <span>
                  Truyện Free chỉ được lưu trên thiết bị này. Lily không có bản sao nếu dữ liệu trình duyệt bị xóa.
                </span>
              </div>
              <button
                onClick={() => openUpgradeModal('Lily Cloud Sync')}
                className="shrink-0 font-semibold text-lily-800 hover:underline flex items-center gap-1"
              >
                <span>Tìm hiểu Lily VIP</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
