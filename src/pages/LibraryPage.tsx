import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  BookOpen,
  Cloud,
  Plus
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookCard } from '../components/common/BookCard';
import { OwnerLibraryPanel } from '../components/owner/OwnerLibraryPanel';
import { OwnerLibraryClient } from '../book-engine/owner-library/OwnerLibraryClient';

export const LibraryPage: React.FC = () => {
  const { user, books, navigateTo, maxLocalSlots, isLibraryLoading } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress'>('recent');
  const [visibleCount, setVisibleCount] = useState(40);
  const cloudEntry = user.isOwner || OwnerLibraryClient.hasSession() || new URLSearchParams(window.location.search).get('admin') === 'cloud';
  const [libraryMode, setLibraryMode] = useState<'device' | 'cloud'>(() => new URLSearchParams(window.location.search).get('admin') === 'cloud' ? 'cloud' : 'device');

  const allTags = ['all', ...Array.from(new Set(books.flatMap(book => book.tags))).sort()];
  const showSearch = books.length > 0;
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
    <div className="flat-page mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden py-1 pb-16 sm:py-2 sm:pb-20 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-ink-200 pb-3 sm:items-end sm:gap-4 sm:pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <h1 className="font-serif font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl text-ink-950 tracking-tight">
              {libraryMode === 'cloud' ? 'Thư viện Cloud' : 'Thư viện truyện'}
            </h1>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {libraryMode === 'cloud' ? 'Kho truyện riêng của admin · nội dung chỉ tải khi bạn yêu cầu' : `${books.length}/${user.isOwner ? '∞' : maxLocalSlots} truyện trên thiết bị`}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          {cloudEntry && <button type="button" onClick={() => setLibraryMode(mode => mode === 'cloud' ? 'device' : 'cloud')} className={`flex h-9 items-center justify-center gap-1.5 rounded-[10px] border px-2.5 text-[11px] font-semibold transition-colors sm:h-10 sm:px-4 sm:text-xs ${libraryMode === 'cloud' ? 'border-ink-300 bg-ink-950 text-white' : 'border-lily-200 bg-white text-lily-900 hover:bg-lily-50'}`}><Cloud className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden min-[430px]:inline">{libraryMode === 'cloud' ? 'Trên máy' : 'Cloud'}</span></button>}
          {libraryMode === 'device' && <button onClick={() => navigateTo('add-book')} className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-[#E8CBD9] bg-[#F6E8EF] px-3 text-[11px] font-semibold text-[#7A3158] transition-colors hover:bg-[#EFD8E4] sm:h-10 sm:px-4 sm:text-xs"><Plus className="h-4 w-4" /><span className="hidden min-[390px]:inline">Thêm truyện</span></button>}
        </div>
      </div>

      {libraryMode === 'cloud' && cloudEntry ? <OwnerLibraryPanel /> : <>

      {/* Search & Filter Toolbar */}
      {showToolbar && (
      <div className="space-y-2 border-b border-ink-200 pb-3 md:flex md:items-center md:justify-between md:gap-3 md:space-y-0">
        <div className="flex min-w-0 items-center gap-2 md:flex-1">
          {showSearch && <div className="relative min-w-0 flex-1 md:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm truyện hoặc tác giả..." className="dashboard-search h-9 w-full rounded-[10px] border border-ink-100 bg-white pl-9 pr-3 text-[11px] text-ink-900 outline-none placeholder:text-ink-400 hover:border-ink-200 focus:border-lily-300 sm:h-10 sm:text-xs" />
          </div>}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="dashboard-filter-select h-9 w-[112px] shrink-0 rounded-[10px] border border-ink-100 bg-white px-2 text-[11px] font-semibold text-ink-700 outline-none md:hidden">
            <option value="recent">Gần đây</option><option value="title">Tên A–Z</option><option value="progress">Tiến độ</option>
          </select>
        </div>

        <div className="flex min-w-0 items-center gap-2 md:shrink-0">
          {showTags && <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain py-0.5 md:max-w-md">
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

          {showTags && <div className="hidden h-5 w-px bg-ink-200 md:block" />}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="dashboard-filter-select hidden h-10 rounded-[10px] border border-ink-100 bg-white px-3 text-xs font-semibold text-ink-700 outline-none hover:border-ink-200 focus:border-lily-300 md:block"
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
      </>}
    </div>
  );
};
