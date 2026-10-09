import { t } from '../i18n';
import React, { useState } from 'react';
import { 
  Plus, 
  X,
  ArrowLeft,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookCard } from '../components/common/BookCard';
import { BookCover } from '../components/common/BookCover';

export const ShelvesPage: React.FC = () => {
  const { shelves, createShelf, renameShelf, deleteShelf, addBookToShelf, books, selectedShelfId } = useApp();

  const [activeShelfId, setActiveShelfId] = useState<string | null>(selectedShelfId);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfDesc, setNewShelfDesc] = useState('');
  const [newShelfColor, setNewShelfColor] = useState('#ff765f');
  const [isBookPickerOpen, setIsBookPickerOpen] = useState(false);

  const handleCreateShelf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelfName.trim()) return;
    createShelf({
      name: newShelfName.trim(),
      description: newShelfDesc.trim() || undefined,
      icon: 'Folder',
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
    <div className="bookshop-shelves-page flat-page mx-auto max-w-6xl space-y-5 py-2 pb-16 sm:space-y-6 sm:py-4 sm:pb-20">
      {/* Header */}
      <div className="bookshop-shelves-heading flex flex-col justify-between gap-3 border-b border-ink-200 pb-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif font-bold text-2xl md:text-3xl text-ink-950">
              {t("Tủ sách cá nhân")}</h1>
          </div>
          <p className="mt-1 text-xs text-ink-500">{shelves.length} {t(" tủ · ")}{books.length} {t(" truyện")}</p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-[#E8CBD9] bg-[#F6E8EF] px-4 text-xs font-semibold text-[#7A3158] transition-colors hover:bg-[#EFD8E4] sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t("Tạo tủ mới")}</span>
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
                <span className="text-xs font-normal text-ink-400 font-mono">({shelfBooks.length} {t(" truyện)")}</span>
              </h2>
              {currentShelf.description && (
                <p className="text-xs text-ink-500 mt-0.5">{currentShelf.description}</p>
              )}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setIsBookPickerOpen(true)} className="flex items-center gap-1.5 rounded-xl border border-[#E8CBD9] bg-[#F6E8EF] px-3 py-2 text-xs font-semibold text-[#7A3158]" aria-label={t("Thêm truyện vào tủ")}><Plus className="h-4 w-4" /><span className="hidden sm:inline">{t("Thêm truyện")}</span></button>
            {!currentShelf.isSystem && <>
              <button onClick={() => { const name = window.prompt(t("Tên mới cho tủ sách"), currentShelf.name); if (name) renameShelf(currentShelf.id, name); }} className="rounded-xl border border-ink-200 bg-white p-2 text-ink-500" aria-label={t("Đổi tên tủ sách")}><Pencil className="h-4 w-4" /></button>
              <button onClick={() => { if (window.confirm(t("Xóa tủ “{0}”? Truyện bên trong sẽ không bị xóa.", [currentShelf.name]))) { deleteShelf(currentShelf.id); setActiveShelfId(null); } }} className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600" aria-label={t("Xóa tủ sách")}><Trash2 className="h-4 w-4" /></button>
            </>}
            </div>
          </div>

          {shelfBooks.length === 0 ? (
            <div className="border-y border-ink-200 py-10 text-center">
              <h3 className="font-serif font-semibold text-ink-800 text-sm">{t("Chưa có truyện nào trong tủ này")}</h3>
              <button
                onClick={() => setIsBookPickerOpen(true)}
                className="mt-4 rounded-md bg-ink-900 px-4 py-2 text-xs font-medium text-white"
              >
                {t("Thêm truyện")}</button>
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
        <div className="bookshop-shelves-grid grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {shelves.map((shelf, index) => {
            const previewBooks = books.filter(book => book.shelfIds.includes(shelf.id)).slice(0, 3);
            return (
              <button
                key={shelf.id}
                onClick={() => setActiveShelfId(shelf.id)}
                className="bookshop-shelf-tile group text-left"
              >
                <span className="bookshop-shelf-stage">
                  {previewBooks.length > 0 ? (
                    <span className="bookshop-shelf-stack" aria-hidden="true">
                      {previewBooks.map(book => <BookCover key={book.id} title={book.title} author={book.author} coverUrl={book.coverUrl} coverColor={book.coverColor} size="sm" />)}
                    </span>
                  ) : (
                    <img className="bookshop-shelf-sample-cover" src={`/default-covers/lily-cover-${String([2, 4, 6, 8, 10][index % 5]).padStart(2, '0')}.jpg`} alt="" />
                  )}
                </span>
                <span className="bookshop-shelf-meta"><strong>{shelf.name}</strong><span>{shelf.bookCount} {t(" truyện")}</span></span>
                <span className="bookshop-shelf-description">{shelf.description || t("Bộ sưu tập cá nhân trong thư viện Lily.")}</span>
              </button>
            );
          })}
        </div>
      )}

      {isBookPickerOpen && currentShelf && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="book-picker-title">
          <div className="max-h-[78vh] w-full max-w-md overflow-hidden rounded-t-3xl border border-ink-100 bg-white shadow-modal sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <div>
                <h3 id="book-picker-title" className="font-serif text-lg font-bold text-ink-900">{t("Thêm truyện")}</h3>
                <p className="mt-0.5 text-xs text-ink-500">{t("Chọn truyện cho “")}{currentShelf.name}”</p>
              </div>
              <button onClick={() => setIsBookPickerOpen(false)} className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100" aria-label={t("Đóng")}><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {books.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-ink-500">{t("Thư viện chưa có truyện.")}</p>
              ) : books.map(book => {
                const selected = book.shelfIds.includes(currentShelf.id);
                return (
                  <button key={book.id} onClick={() => addBookToShelf(book.id, currentShelf.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-cream-50">
                    <BookCover
                      title={book.title}
                      author={book.author}
                      coverUrl={book.coverUrl}
                      coverColor={book.coverColor}
                      size="sm"
                      className="!h-14 !w-10"
                    />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink-900">{book.title}</p><p className="truncate text-xs text-ink-500">{book.author}</p></div>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-lily-600 bg-lily-600 text-white' : 'border-ink-300'}`}>{selected && <Check className="h-3 w-3" />}</span>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-ink-100 p-3"><button onClick={() => setIsBookPickerOpen(false)} className="w-full rounded-xl border border-[#E8CBD9] bg-[#F6E8EF] py-2.5 text-sm font-semibold text-[#7A3158]">Xong</button></div>
          </div>
        </div>
      )}

      {/* CREATE SHELF MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-modal border border-ink-100 p-6 w-full max-w-md">
            <div className="flex items-center justify-between pb-3 border-b border-ink-100 mb-4">
              <h3 className="font-serif font-bold text-lg text-ink-900">
                {t("Tạo tủ sách mới")}</h3>
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
                  {t("Tên tủ sách *")}</label>
                <input
                  type="text"
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  placeholder={t("Ví dụ: Truyện trinh thám, Hay đọc đêm...")}
                  className="w-full px-3.5 py-2 rounded-xl border border-ink-200 text-xs focus:ring-2 focus:ring-lily-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  {t("Mô tả (tùy chọn)")}</label>
                <textarea
                  value={newShelfDesc}
                  onChange={(e) => setNewShelfDesc(e.target.value)}
                  placeholder={t("Ghi chú ngắn về tủ sách này...")}
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-ink-200 text-xs focus:ring-2 focus:ring-lily-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                  {t("Màu sắc đại diện")}</label>
                <div className="flex items-center gap-2">
                  {['#ff765f', '#28483d', '#c8a56d', '#9cafaa', '#d6b9b0', '#6d7860', '#a7a99a'].map(c => (
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
                  {t("Hủy")}</button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft"
                >
                  {t("Tạo tủ sách")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
