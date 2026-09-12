import React, { useEffect, useMemo, useState } from 'react';
import { 
  Search, 
  BookOpen,
  Plus
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookCard } from '../components/common/BookCard';
import { PlanStatus } from '../components/common/PlanStatus';

export const LibraryPage: React.FC = () => {
  const { user, books, navigateTo, maxLocalSlots, isLibraryLoading } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress'>('recent');
  const [visibleCount, setVisibleCount] = useState(40);

  const allTags = ['all', ...Array.from(new Set(books.flatMap(book => book.tags))).sort()];
  const showSearch = books.length >= 6;
  const showTags = allTags.length > 2;
  const showToolbar = showSearch || showTags || books.length > 1;

  const filteredBooks = useMemo(() => books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || book.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  }).sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'progress') return b.progressPercent - a.progressPercent;
    return 0;
  }), [books, searchQuery, selectedTag, sortBy]);
  useEffect(() => { setVisibleCount(40); }, [searchQuery, selectedTag, sortBy]);
  const visibleBooks = filteredBooks.slice(0, visibleCount);

  return (
    <div className="flat-page max-w-7xl mx-auto py-1 sm:py-2 pb-16 sm:pb-20 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 border-b border-ink-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <h1 className="font-serif font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl text-ink-950 tracking-tight">
              Thư viện truyện
            </h1>
            <PlanStatus tier={user.tier} vipDays={user.vipDaysRemaining} size="sm" />
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {books.length}/{user.isOwner ? '∞' : maxLocalSlots} truyện trên thiết bị
          </p>
        </div>

        <button
          onClick={() => navigateTo('add-book')}
          className="flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-[#E8CBD9] bg-[#F6E8EF] px-4 text-xs font-semibold text-[#7A3158] transition-colors hover:bg-[#EFD8E4] sm:w-auto sm:px-5 sm:text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm truyện mới</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      {showToolbar && (
      <div className="flex flex-col items-stretch justify-between gap-2.5 border-b border-ink-200 pb-3 md:flex-row md:items-center">
        {/* Search */}
        {showSearch && <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm truyện, tác giả..."
            className="w-full pl-9 pr-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-ink-50 border border-ink-200 text-xs sm:text-sm focus:ring-2 focus:ring-lily-500/20 focus:outline-none"
          />
        </div>}

        {/* Filter tags & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {showTags && <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
                  selectedTag === tag
                    ? 'bg-lily-100 text-lily-900 font-semibold'
                    : 'text-ink-600 hover:bg-cream-50'
                }`}
              >
                {tag === 'all' ? 'Tất cả' : tag}
              </button>
            ))}
          </div>}

          {showTags && <div className="h-5 w-px bg-ink-200 hidden md:block" />}

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-ink-50 border border-ink-200 text-xs font-medium text-ink-700 focus:outline-none"
          >
            <option value="recent">Đọc gần đây</option>
            <option value="title">Tên sách (A-Z)</option>
            <option value="progress">Tiến độ cao nhất</option>
          </select>
        </div>
      </div>
      )}

      {/* BOOKS GRID */}
      {!isLibraryLoading && books.length === 0 ? (
        <section className="rounded-3xl border border-ink-100 bg-white px-5 py-10 text-center shadow-soft sm:py-14">
          <BookOpen className="mx-auto h-10 w-10 text-lily-500" />
          <h2 className="mt-4 font-serif text-xl font-bold text-ink-950">Thư viện của bạn đang trống</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-600">Thêm một truyện để bắt đầu đọc hoặc nghe với Giọng Lily. Truyện sẽ được lưu trên thiết bị và có thể đọc offline.</p>
          <button onClick={() => navigateTo('add-book')} className="mt-5 rounded-2xl border border-[#E8CBD9] bg-[#F6E8EF] px-5 py-2.5 text-sm font-semibold text-[#7A3158] hover:bg-[#EFD8E4]">Thêm truyện</button>
        </section>
      ) : books.length > 0 ? (
        <div>
          {filteredBooks.length === 0 ? (
            <div className="rounded-3xl border border-ink-100 bg-white p-8 text-center text-sm text-ink-600">Không tìm thấy truyện phù hợp. Hãy thử từ khóa khác.</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 px-0.5 sm:grid-cols-3 sm:gap-5 sm:px-0 md:grid-cols-4 xl:grid-cols-5">
              {visibleBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
          {visibleBooks.length < filteredBooks.length && (
            <div className="mt-6 flex justify-center">
              <button type="button" onClick={() => setVisibleCount(count => count + 40)} className="rounded-xl border border-ink-200 bg-white px-5 py-2.5 text-xs font-semibold text-ink-700 hover:bg-ink-50">
                Xem thêm 40 truyện · còn {filteredBooks.length - visibleBooks.length}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
