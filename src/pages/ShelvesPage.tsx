import React, { useState } from 'react';
import { 
  FolderHeart, 
  Plus, 
  BookOpen, 
  Clock, 
  Heart, 
  CheckCircle2, 
  Sparkles, 
  Scroll, 
  X,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookCard } from '../components/common/BookCard';
import { Shelf } from '../types';

export const ShelvesPage: React.FC = () => {
  const { shelves, createShelf, books, selectedShelfId, navigateTo } = useApp();

  const [activeShelfId, setActiveShelfId] = useState<string | null>(selectedShelfId);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfDesc, setNewShelfDesc] = useState('');
  const [newShelfColor, setNewShelfColor] = useState('#DD6B9A');

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'BookOpen': return BookOpen;
      case 'Clock': return Clock;
      case 'Heart': return Heart;
      case 'CheckCircle': return CheckCircle2;
      case 'Scroll': return Scroll;
      default: return Sparkles;
    }
  };

  const handleCreateShelf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelfName.trim()) return;
    createShelf({
      name: newShelfName.trim(),
      description: newShelfDesc.trim() || undefined,
      icon: 'Sparkles',
      color: newShelfColor,
    });
    setNewShelfName('');
    setNewShelfDesc('');
    setIsCreateModalOpen(false);
  };

  // If a shelf is selected, display its books
  const currentShelf = shelves.find(s => s.id === activeShelfId);
  const shelfBooks = currentShelf 
    ? books.filter(b => b.shelfIds.includes(currentShelf.id)) 
    : [];

  return (
    <div className="max-w-6xl mx-auto py-4 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif font-bold text-2xl md:text-3xl text-ink-950">
              Tủ sách cá nhân
            </h1>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Gom nhóm và phân loại truyện theo thể loại, tâm trạng hoặc tiến độ đọc.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center gap-1.5 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo tủ mới</span>
        </button>
      </div>

      {/* VIEW 1: SHELF DETAIL VIEW */}
      {activeShelfId && currentShelf ? (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveShelfId(null)}
              className="p-2 rounded-xl bg-white border border-ink-200 text-ink-600 hover:bg-cream-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="font-serif font-bold text-xl text-ink-900 flex items-center gap-2">
                <span>{currentShelf.name}</span>
                <span className="text-xs font-normal text-ink-400 font-mono">({shelfBooks.length} truyện)</span>
              </h2>
              {currentShelf.description && (
                <p className="text-xs text-ink-500 mt-0.5">{currentShelf.description}</p>
              )}
            </div>
          </div>

          {shelfBooks.length === 0 ? (
            <div className="bg-white border border-dashed border-ink-200 rounded-3xl p-10 text-center">
              <FolderHeart className="w-10 h-10 text-ink-300 mx-auto mb-2" />
              <h3 className="font-serif font-semibold text-ink-800 text-sm">Chưa có truyện nào trong tủ này</h3>
              <p className="text-xs text-ink-400 mt-1">
                Hãy mở trang chi tiết của một bộ truyện để gán vào tủ sách này.
              </p>
              <button
                onClick={() => navigateTo('library')}
                className="mt-4 px-4 py-2 rounded-xl bg-ink-900 text-white text-xs font-medium"
              >
                Đến thư viện
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shelfBooks.map(book => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: SHELVES GRID */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shelves.map((shelf) => {
            const IconComp = getIcon(shelf.icon);
            return (
              <div
                key={shelf.id}
                onClick={() => setActiveShelfId(shelf.id)}
                className="group bg-white border border-ink-100 hover:border-ink-200 rounded-3xl p-5 shadow-soft hover:shadow-card cursor-pointer transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div 
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-soft transition-transform group-hover:scale-110"
                      style={{ backgroundColor: shelf.color || '#DD6B9A' }}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-medium text-ink-500 bg-cream-50 px-2.5 py-1 rounded-full border border-cream-200">
                      {shelf.bookCount} truyện
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-ink-900 group-hover:text-lily-800 transition-colors">
                    {shelf.name}
                  </h3>
                  <p className="text-xs text-ink-500 mt-1 line-clamp-2 leading-relaxed">
                    {shelf.description || 'Bộ sưu tập cá nhân trong thư viện Lily.'}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-ink-50 flex items-center justify-between text-xs text-ink-400">
                  <span>{shelf.isSystem ? 'Tủ hệ thống' : 'Tủ tự tạo'}</span>
                  <span className="font-semibold text-lily-700 group-hover:translate-x-1 transition-transform">
                    Mở tủ →
                  </span>
                </div>
              </div>
            );
          })}

          {/* Create Shelf Placeholder Card */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="border-2 border-dashed border-ink-200 hover:border-lily-300 rounded-3xl p-6 bg-white/40 hover:bg-lily-50/20 text-center flex flex-col items-center justify-center min-h-[170px] transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-ink-100 group-hover:bg-lily-100 text-ink-400 group-hover:text-lily-600 flex items-center justify-center mb-2 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <h4 className="font-medium text-xs text-ink-800 group-hover:text-lily-800">
              Tạo tủ sách mới
            </h4>
            <p className="text-[11px] text-ink-400 mt-0.5">
              Phân loại tác phẩm theo phong cách của bạn
            </p>
          </button>
        </div>
      )}

      {/* CREATE SHELF MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-modal border border-ink-100 p-6 w-full max-w-md">
            <div className="flex items-center justify-between pb-3 border-b border-ink-100 mb-4">
              <h3 className="font-serif font-bold text-lg text-ink-900">
                Tạo tủ sách mới
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-ink-400 hover:text-ink-700 hover:bg-ink-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShelf} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Tên tủ sách *
                </label>
                <input
                  type="text"
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  placeholder="Ví dụ: Truyện trinh thám, Hay đọc đêm..."
                  className="w-full px-3.5 py-2 rounded-xl border border-ink-200 text-xs focus:ring-2 focus:ring-lily-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  value={newShelfDesc}
                  onChange={(e) => setNewShelfDesc(e.target.value)}
                  placeholder="Ghi chú ngắn về tủ sách này..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-ink-200 text-xs focus:ring-2 focus:ring-lily-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                  Màu sắc đại diện
                </label>
                <div className="flex items-center gap-2">
                  {['#DD6B9A', '#A070D6', '#E11D48', '#10B981', '#F472B6', '#D97706', '#3B82F6'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewShelfColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        newShelfColor === c ? 'scale-125 border-ink-900 ring-2 ring-lily-200' : 'border-white'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-ink-200 text-xs text-ink-600 hover:bg-ink-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft"
                >
                  Tạo tủ sách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
