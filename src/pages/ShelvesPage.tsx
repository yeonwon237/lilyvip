import React, { useState } from 'react';
import { 
  Plus, 
  X,
  ArrowLeft,
  ChevronRight,
  Pencil,
  Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookCard } from '../components/common/BookCard';

export const ShelvesPage: React.FC = () => {
  const { shelves, createShelf, renameShelf, deleteShelf, books, selectedShelfId, navigateTo } = useApp();

  const [activeShelfId, setActiveShelfId] = useState<string | null>(selectedShelfId);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfDesc, setNewShelfDesc] = useState('');
  const [newShelfColor, setNewShelfColor] = useState('#DD6B9A');

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
    <div className="flat-page max-w-6xl mx-auto py-4 pb-16 sm:pb-20 space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-ink-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif font-bold text-2xl md:text-3xl text-ink-950">
              Tủ sách cá nhân
            </h1>
          </div>
          <p className="mt-1 text-xs text-ink-500">Các bộ sưu tập của bạn.</p>
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
        <div className="space-y-5">
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
            {!currentShelf.isSystem && <div className="ml-auto flex items-center gap-1">
              <button onClick={() => { const name = window.prompt('Tên mới cho tủ sách', currentShelf.name); if (name) renameShelf(currentShelf.id, name); }} className="rounded-xl border border-ink-200 bg-white p-2 text-ink-500" aria-label="Đổi tên tủ sách"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => { if (window.confirm(`Xóa tủ “${currentShelf.name}”? Truyện bên trong sẽ không bị xóa.`)) { deleteShelf(currentShelf.id); setActiveShelfId(null); } }} className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600" aria-label="Xóa tủ sách"><Trash2 className="h-4 w-4" /></button>
            </div>}
          </div>

          {shelfBooks.length === 0 ? (
            <div className="border-y border-ink-200 py-10 text-center">
              <h3 className="font-serif font-semibold text-ink-800 text-sm">Chưa có truyện nào trong tủ này</h3>
              <button
                onClick={() => navigateTo('library')}
                className="mt-4 rounded-md bg-ink-900 px-4 py-2 text-xs font-medium text-white"
              >
                Đến thư viện
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
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
            return (
              <div
                key={shelf.id}
                onClick={() => setActiveShelfId(shelf.id)}
                className="group relative flex min-h-[168px] cursor-pointer flex-col justify-between overflow-hidden border border-ink-200 bg-white p-5 transition-colors hover:border-ink-400"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-0.5"
                  style={{ backgroundColor: shelf.color || '#DD6B9A' }}
                />
                <div>
                  <div className="mb-5 flex items-center justify-between text-[11px] font-medium text-ink-400">
                    <span>{shelf.isSystem ? 'Tủ mặc định' : 'Tủ cá nhân'}</span>
                    <span className="font-mono">{shelf.bookCount} truyện</span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-ink-900 group-hover:text-lily-800 transition-colors">
                    {shelf.name}
                  </h3>
                  <p className="text-xs text-ink-500 mt-1 line-clamp-2 leading-relaxed">
                    {shelf.description || 'Bộ sưu tập cá nhân trong thư viện Lily.'}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-end gap-1 border-t border-ink-100 pt-3 text-xs font-semibold text-lily-700">
                  <span>Mở tủ</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            );
          })}

          {/* Create Shelf Placeholder Card */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="group flex min-h-[168px] items-center justify-center border border-dashed border-ink-300 p-6 text-center transition-colors hover:border-ink-500"
          >
            <h4 className="font-serif text-sm font-semibold text-ink-700 group-hover:text-ink-950">
              + Tạo tủ sách
            </h4>
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
