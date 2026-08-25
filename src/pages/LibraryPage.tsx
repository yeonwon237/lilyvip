import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Sparkles, 
  HardDrive, 
  Cloud, 
  Filter, 
  ArrowUpDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookCard } from '../components/common/BookCard';
import { StorageMeter } from '../components/common/StorageMeter';
import { EmptyState } from '../components/common/EmptyState';
import { PlanStatus } from '../components/common/PlanStatus';

export const LibraryPage: React.FC = () => {
  const { user, books, navigateTo, openUpgradeModal } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress'>('recent');

  const allTags = ['all', 'Bách hợp', 'Cổ đại', 'Hiện đại', 'Tiên hiệp', 'Cổ trang'];

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
    <div className="max-w-7xl mx-auto py-2 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100/70 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif font-bold text-2xl md:text-3xl lg:text-4xl text-ink-950 tracking-tight">
              Thư viện truyện
            </h1>
            <PlanStatus tier={user.tier} size="sm" />
          </div>
          <p className="text-sm text-ink-600 mt-1">
            {user.tier === 'vip'
              ? `Tất cả ${books.length} truyện đều được sao lưu và đồng bộ trên Lily Cloud.`
              : `Bạn đang dùng ${user.freeSlotsUsed} / ${user.freeSlotsTotal} slot lưu trữ trên thiết bị này.`}
          </p>
        </div>

        <button
          onClick={() => navigateTo('add-book')}
          className="px-5 py-2.5 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white text-xs md:text-sm font-semibold shadow-soft flex items-center justify-center gap-2 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm truyện mới</span>
        </button>
      </div>

      {/* Storage Header Banner */}
      {user.tier === 'vip' ? (
        <StorageMeter />
      ) : (
        <div className="p-4 rounded-2xl bg-cream-50/80 border border-cream-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs md:text-sm">
          <div className="flex items-center gap-2.5 text-ink-700">
            <HardDrive className="w-5 h-5 text-ink-500 shrink-0" />
            <div>
              <span className="font-semibold text-ink-900">Giới hạn 3 slot Local:</span>
              <span className="text-ink-600 ml-1">
                Bạn có thể xóa truyện cũ để giải phóng slot và thay truyện mới bất kỳ lúc nào.
              </span>
            </div>
          </div>
          <button
            onClick={() => openUpgradeModal('Không giới hạn slot với Lily VIP')}
            className="shrink-0 text-xs font-semibold text-lily-700 hover:underline flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mở không giới hạn slot</span>
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-ink-100 rounded-3xl p-4 shadow-soft flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm truyện, tác giả..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-ink-50 border border-ink-200 text-sm focus:ring-2 focus:ring-lily-500/20"
          />
        </div>

        {/* Filter tags & Sort */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
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

      {/* BOOKS GRID (4-5 CARDS EXPANDED DESKTOP VIEW) */}
      {user.tier === 'free' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {localBooks[0] ? <BookCard book={localBooks[0]} /> : <BookCard isEmptySlot slotNumber={1} />}
            {localBooks[1] ? <BookCard book={localBooks[1]} /> : <BookCard isEmptySlot slotNumber={2} />}
            {localBooks[2] ? <BookCard book={localBooks[2]} /> : <BookCard isEmptySlot slotNumber={3} />}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
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
