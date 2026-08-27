import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Sparkles, 
  HardDrive
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookCard } from '../components/common/BookCard';
import { StorageMeter } from '../components/common/StorageMeter';
import { EmptyState } from '../components/common/EmptyState';
import { PlanStatus } from '../components/common/PlanStatus';

export const LibraryPage: React.FC = () => {
  const { user, books, navigateTo, openUpgradeModal, isOpenBeta, maxLocalSlots } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress'>('recent');

  const allTags = ['all', 'Bách hợp', 'Cổ đại', 'Hiện đại', 'Tiên hiệp', 'Cổ trang', 'Truyện cá nhân'];

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || book.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  }).sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'progress') return b.progressPercent - a.progressPercent;
    return 0;
  });

  const localBooks = books.filter(b => b.storageType === 'local');

  return (
    <div className="max-w-7xl mx-auto py-1 sm:py-2 pb-16 sm:pb-20 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-ink-100/70 pb-4 sm:pb-5">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <h1 className="font-serif font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl text-ink-950 tracking-tight">
              Thư viện truyện
            </h1>
            <PlanStatus tier={user.tier} size="sm" />
          </div>
          <p className="text-xs sm:text-sm text-ink-600 mt-1 leading-relaxed">
            {!isOpenBeta && user.tier === 'vip'
              ? `Tất cả ${books.length} truyện đều được sao lưu và đồng bộ trên Lily Cloud.`
              : `Bạn đang dùng ${user.freeSlotsUsed} / ${maxLocalSlots} slot lưu trữ trên thiết bị này.`}
          </p>
        </div>

        <button
          onClick={() => navigateTo('add-book')}
          className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-ink-950 hover:bg-ink-800 text-white text-xs sm:text-sm font-semibold shadow-soft flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm truyện mới</span>
        </button>
      </div>

      {/* Storage Header Banner */}
      {!isOpenBeta && user.tier === 'vip' ? (
        <StorageMeter />
      ) : (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-cream-50/80 border border-cream-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 text-ink-700">
            <HardDrive className="w-4.5 h-4.5 text-ink-500 shrink-0" />
            <div>
              <span className="font-semibold text-ink-900">Thư viện trên thiết bị · {localBooks.length}/{maxLocalSlots}</span>
              <span className="text-ink-600 ml-1">
                Bạn có thể đổi truyện bất kỳ lúc nào.
              </span>
            </div>
          </div>
          {!isOpenBeta && <button
            onClick={() => openUpgradeModal('Không giới hạn slot với Lily VIP')}
            className="shrink-0 text-xs font-semibold text-lily-700 hover:underline flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mở không giới hạn slot</span>
          </button>}
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-ink-100 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm truyện, tác giả..."
            className="w-full pl-9 pr-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-ink-50 border border-ink-200 text-xs sm:text-sm focus:ring-2 focus:ring-lily-500/20 focus:outline-none"
          />
        </div>

        {/* Filter tags & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
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
          </div>

          <div className="h-5 w-px bg-ink-200 hidden md:block" />

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

      {/* BOOKS GRID */}
      {isOpenBeta || user.tier === 'free' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: maxLocalSlots }, (_, index) => (
              localBooks[index]
                ? <BookCard key={localBooks[index].id} book={localBooks[index]} />
                : <BookCard key={`empty-${index + 1}`} isEmptySlot slotNumber={index + 1} />
            ))}
          </div>
        </div>
      ) : (
        <div>
          {filteredBooks.length === 0 ? (
            <EmptyState
              type="books"
              title="Không tìm thấy truyện phù hợp"
              description="Hãy thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
