import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreVertical, 
  BookOpen, 
  Headphones, 
  Info, 
  Image, 
  Trash2, 
  Download, 
  UploadCloud,
  FolderPlus,
  Check
} from 'lucide-react';
import { Book } from '../../types';
import { BookCover } from './BookCover';
import { ProgressBar } from './ProgressBar';
import { useApp } from '../../context/AppContext';
import { formatRelativeTime } from '../../utils/dateUtils';

interface BookCardProps {
  book?: Book;
  isEmptySlot?: boolean;
  slotNumber?: number;
  onAddClick?: () => void;
  layout?: 'grid' | 'horizontal';
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  isEmptySlot = false,
  slotNumber,
  onAddClick,
}) => {
  const { 
    navigateTo, 
    removeBook, 
    canUseFeature,
    showToast,
    localBookSource,
    shelves,
    addBookToShelf
  } = useApp();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShelfPickerOpen, setIsShelfPickerOpen] = useState(false);
  const [isNetworkOffline, setIsNetworkOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const isOfflineReady = book?.storageType === 'local' && (book.totalChapters || 0) > 0;
  const canDownloadOriginal = !!book && book.fileFormat !== 'WEBSITE' && !book.source;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const syncNetworkState = () => setIsNetworkOffline(!navigator.onLine);
    window.addEventListener('online', syncNetworkState);
    window.addEventListener('offline', syncNetworkState);
    return () => {
      window.removeEventListener('online', syncNetworkState);
      window.removeEventListener('offline', syncNetworkState);
    };
  }, []);

  // EMPTY SLOT DROPZONE CARD FOR FREE TIER
  if (isEmptySlot) {
    return (
      <div
        onClick={onAddClick || (() => navigateTo('add-book'))}
        className="group relative flex aspect-[3/4] flex-col items-center justify-center rounded-lg border border-dashed border-ink-200 bg-white/60 p-4 text-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-lily-400 hover:bg-lily-50/40 hover:shadow-card"
      >
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-cream-100 text-ink-500 transition-colors group-hover:bg-lily-100 group-hover:text-lily-700">
          <UploadCloud className="h-5 w-5 stroke-[1.6]" />
        </div>
        <div className="text-sm font-semibold text-ink-900 group-hover:text-lily-950">
          Thêm truyện
        </div>
        {slotNumber && <span className="mt-1 text-[10px] text-ink-400">Vị trí {slotNumber}</span>}
      </div>
    );
  }

  if (!book) return null;
  const sourceLabel = book.source?.type === 'lilyhub'
    ? 'LilyHub'
    : book.fileFormat === 'WEBSITE'
      ? 'Website'
      : book.fileFormat;

  const handleReadClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigateTo('reader', book.id);
  };

  const handleDetailClick = () => {
    navigateTo('book-detail', book.id);
  };

  const handleAudioClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!canUseFeature('audio')) {
      showToast('Tính năng nghe hiện chưa khả dụng.', 'info');
      return;
    }
    navigateTo('reader', book.id);
  };

  const handleDownloadOriginal = async () => {
    try {
      const blob = await localBookSource.getRawBlob(book.id);
      if (!blob) {
        showToast('Không tìm thấy file gốc trên thiết bị.', 'error');
        return;
      }
      const safeTitle = book.title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'truyen';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeTitle}.${book.fileFormat.toLowerCase()}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Đã tải file gốc về thiết bị.', 'success');
    } catch {
      showToast('Chưa thể tải file gốc. Hãy thử lại.', 'error');
    }
  };

  return (
    <article
      onClick={handleDetailClick}
      className={`group relative flex min-w-0 cursor-pointer flex-col rounded-lg border bg-white p-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card ${isMenuOpen ? 'z-40' : ''} ${
        isNetworkOffline && isOfflineReady ? 'border-emerald-300' : 'border-ink-100 hover:border-lily-200'
      }`}
    >
      <div className="relative aspect-[3/4] rounded-md bg-ink-100">
        <div onClick={handleReadClick} className="absolute inset-0">
          <BookCover
            title={book.title}
            author={book.author}
            coverUrl={book.coverUrl}
            coverColor={book.coverColor}
            size="responsive"
            className="h-full"
          />
        </div>

        {isOfflineReady && (
          <span className="absolute bottom-2 left-2 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            Offline
          </span>
        )}

        <div className="absolute right-2 top-2" ref={menuRef} onClick={(event) => event.stopPropagation()}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
            aria-label="Tùy chọn sách"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-md border border-ink-100 bg-white py-1 text-[11px] shadow-modal animate-in fade-in zoom-in-95 duration-100">
                      <button
                        onClick={() => { setIsMenuOpen(false); handleReadClick(); }}
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-ink-700 hover:bg-cream-50"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-lily-600" />
                        <span>Đọc tiếp</span>
                      </button>

                      <button
                        onClick={() => { setIsMenuOpen(false); handleAudioClick(); }}
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-ink-700 hover:bg-cream-50"
                      >
                        <Headphones className="h-3.5 w-3.5 text-lavender-600" />
                        <span>Nghe truyện</span>
                      </button>

                      <button
                        onClick={() => { setIsMenuOpen(false); handleDetailClick(); }}
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-ink-700 hover:bg-cream-50"
                      >
                        <Info className="h-3.5 w-3.5 text-ink-400" />
                        <span>Chi tiết</span>
                      </button>

                      <button
                        onClick={() => setIsShelfPickerOpen(value => !value)}
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-ink-700 hover:bg-cream-50"
                      >
                        <FolderPlus className="h-3.5 w-3.5 text-lily-600" />
                        <span>Thêm vào tủ sách</span>
                      </button>

                      {isShelfPickerOpen && (
                        <div className="mx-2 my-1 border-y border-ink-100 py-1">
                          {shelves.map(shelf => {
                            const selected = book.shelfIds.includes(shelf.id);
                            return (
                              <button
                                key={shelf.id}
                                onClick={() => addBookToShelf(book.id, shelf.id)}
                                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-ink-700 hover:bg-cream-50"
                              >
                                <span className="truncate">{shelf.name}</span>
                                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-lily-700" />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {canUseFeature('offline') && canDownloadOriginal && (
                        <>
                          <button
                            onClick={() => { setIsMenuOpen(false); void handleDownloadOriginal(); }}
                            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-ink-700 hover:bg-cream-50"
                          >
                            <Download className="h-3.5 w-3.5 text-ink-400" />
                            <span>Tải file gốc</span>
                          </button>
                        </>
                      )}

                      <div className="my-1 border-t border-ink-100" />

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          if (window.confirm(`Xóa “${book.title}” khỏi thiết bị?\n\nTiến độ đọc, dấu trang, đoạn đánh dấu và ghi chú của truyện này cũng sẽ bị xóa.`)) {
                            void removeBook(book.id);
                          }
                        }}
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        <span>Xóa truyện</span>
                      </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-1.5 pb-1.5 pt-2.5">
        <span className="text-[10px] font-medium uppercase text-lily-700">
          {sourceLabel}
        </span>
        <h3 onClick={handleReadClick} className="mt-1.5 line-clamp-2 min-h-10 text-sm font-semibold leading-snug text-ink-950 transition-colors group-hover:text-lily-800">
          {book.title}
        </h3>
        <p className="mt-1 line-clamp-1 min-h-4 text-xs text-ink-500">{book.author}</p>

        <div className="mt-auto pt-2.5">
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-ink-400">
            <span className="truncate">{formatRelativeTime(book.lastReadAt)}</span>
            <span className="shrink-0 tabular-nums">{Math.round(book.progressPercent)}%</span>
          </div>
          <ProgressBar progress={book.progressPercent} size="sm" />
        </div>
      </div>
    </article>
  );
};
