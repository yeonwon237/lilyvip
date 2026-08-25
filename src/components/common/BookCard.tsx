import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreVertical, 
  BookOpen, 
  Headphones, 
  Info, 
  Image, 
  Trash2, 
  Download, 
  WifiOff, 
  Plus,
  UploadCloud,
  FolderPlus
} from 'lucide-react';
import { Book } from '../../types';
import { BookCover } from './BookCover';
import { ProgressBar } from './ProgressBar';
import { LocalBadge, CloudBadge, FormatBadge } from './Badges';
import { useApp } from '../../context/AppContext';

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
  layout = 'grid',
}) => {
  const { 
    user, 
    navigateTo, 
    removeBook, 
    toggleBookOffline, 
    openUpgradeModal,
    showToast 
  } = useApp();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // EMPTY SLOT DROPZONE CARD FOR FREE TIER
  if (isEmptySlot) {
    return (
      <div
        onClick={onAddClick || (() => navigateTo('add-book'))}
        className="group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-ink-200 hover:border-lily-400 bg-white/50 hover:bg-lily-50/40 rounded-3xl transition-all duration-200 min-h-[280px] text-center cursor-pointer shadow-xs"
      >
        <div className="w-14 h-14 rounded-2xl bg-cream-100 group-hover:bg-lily-100 text-ink-500 group-hover:text-lily-700 flex items-center justify-center mb-3.5 transition-all group-hover:scale-110 shadow-soft">
          <UploadCloud className="w-7 h-7 stroke-[1.5]" />
        </div>
        <div className="font-serif font-bold text-ink-900 group-hover:text-lily-950 text-base">
          Slot {slotNumber || '+'} trống
        </div>
        <p className="text-xs text-ink-500 mt-1 max-w-[180px] leading-relaxed">
          Chạm hoặc kéo thả file TXT, EPUB, DOCX để thêm vào máy
        </p>
        <span className="mt-4 px-3.5 py-1.5 rounded-xl bg-white border border-ink-200 group-hover:border-lily-300 text-xs font-semibold text-ink-700 group-hover:text-lily-800 transition-colors shadow-xs">
          + Chọn file
        </span>
      </div>
    );
  }

  if (!book) return null;

  const handleReadClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigateTo('reader', book.id);
  };

  const handleDetailClick = () => {
    navigateTo('book-detail', book.id);
  };

  const handleAudioClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (user.tier === 'free') {
      openUpgradeModal('Lily Audio / TTS');
      return;
    }
    navigateTo('reader', book.id);
  };

  return (
    <div 
      onClick={handleDetailClick}
      className="group relative bg-white border border-ink-100 hover:border-ink-200/90 rounded-3xl p-4 shadow-soft hover:shadow-card transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[290px]"
    >
      <div>
        <div className="flex gap-4 items-start">
          {/* Large Cover */}
          <div 
            onClick={handleReadClick}
            className="cursor-pointer shrink-0 transition-transform group-hover:scale-[1.02]"
          >
            <BookCover
              title={book.title}
              author={book.author}
              coverUrl={book.coverUrl}
              coverColor={book.coverColor}
              format={book.fileFormat}
              size="lg"
            />
          </div>

          {/* Info Column */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              {/* Badge row: Storage + Format */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {book.storageType === 'cloud' ? (
                    <CloudBadge />
                  ) : (
                    <LocalBadge />
                  )}
                  <FormatBadge format={book.fileFormat} />
                </div>

                {/* Context menu ⋯ */}
                <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-1.5 rounded-xl text-ink-400 hover:text-ink-900 hover:bg-ink-100 transition-colors"
                    aria-label="Tùy chọn sách"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-modal border border-ink-100 py-2 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs">
                      <button
                        onClick={() => { setIsMenuOpen(false); handleReadClick(); }}
                        className="w-full px-4 py-2.5 text-left text-ink-700 hover:bg-cream-50 flex items-center gap-2.5"
                      >
                        <BookOpen className="w-4 h-4 text-lily-600" />
                        <span>Đọc tiếp</span>
                      </button>

                      <button
                        onClick={() => { setIsMenuOpen(false); handleAudioClick(); }}
                        className="w-full px-4 py-2.5 text-left text-ink-700 hover:bg-cream-50 flex items-center gap-2.5"
                      >
                        <Headphones className="w-4 h-4 text-lavender-600" />
                        <span>Nghe Audio {user.tier === 'free' && '🔒'}</span>
                      </button>

                      <button
                        onClick={() => { setIsMenuOpen(false); handleDetailClick(); }}
                        className="w-full px-4 py-2.5 text-left text-ink-700 hover:bg-cream-50 flex items-center gap-2.5"
                      >
                        <Info className="w-4 h-4 text-ink-400" />
                        <span>Xem chi tiết truyện</span>
                      </button>

                      <button
                        onClick={() => { 
                          setIsMenuOpen(false); 
                          showToast('Tính năng đổi bìa: chọn ảnh bìa mới', 'info');
                        }}
                        className="w-full px-4 py-2.5 text-left text-ink-700 hover:bg-cream-50 flex items-center gap-2.5"
                      >
                        <Image className="w-4 h-4 text-ink-400" />
                        <span>Đổi bìa truyện</span>
                      </button>

                      {user.tier === 'vip' && (
                        <>
                          <button
                            onClick={() => { setIsMenuOpen(false); toggleBookOffline(book.id); }}
                            className="w-full px-4 py-2.5 text-left text-ink-700 hover:bg-cream-50 flex items-center gap-2.5"
                          >
                            <WifiOff className="w-4 h-4 text-ink-400" />
                            <span>{book.isOffline ? 'Tắt Offline' : 'Lưu Offline'}</span>
                          </button>

                          <button
                            onClick={() => { 
                              setIsMenuOpen(false); 
                              showToast(`Đang tải file gốc ${book.fileFormat}...`, 'success');
                            }}
                            className="w-full px-4 py-2.5 text-left text-ink-700 hover:bg-cream-50 flex items-center gap-2.5"
                          >
                            <Download className="w-4 h-4 text-ink-400" />
                            <span>Tải file gốc</span>
                          </button>
                        </>
                      )}

                      <div className="my-1.5 border-t border-ink-100" />

                      <button
                        onClick={() => { setIsMenuOpen(false); removeBook(book.id); }}
                        className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2.5"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                        <span>Xóa khỏi thư viện</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Title 16-17px */}
              <h3 
                onClick={handleReadClick}
                className="font-serif font-bold text-ink-950 text-base md:text-[17px] leading-snug line-clamp-2 hover:text-lily-700 transition-colors"
              >
                {book.title}
              </h3>

              <p className="text-xs text-ink-500 mt-1 line-clamp-1 italic">
                {book.author}
              </p>
            </div>
          </div>
        </div>

        {/* Progress bar section */}
        <div className="mt-4 pt-3 border-t border-ink-50">
          <div className="flex items-center justify-between text-xs text-ink-600 mb-1.5">
            <span className="font-medium truncate max-w-[170px]">
              {book.currentChapterTitle.split(':')[0] || `Chương ${book.currentChapter}`}
            </span>
            <span className="font-bold text-ink-900">{book.progressPercent}%</span>
          </div>
          <ProgressBar progress={book.progressPercent} size="sm" />
        </div>
      </div>

      {/* Footer single primary CTA row */}
      <div className="mt-3 pt-2.5 flex items-center justify-between gap-3 text-xs text-ink-400">
        <span className="text-[11px] truncate">
          Đọc {book.lastReadAt}
        </span>

        <div className="flex items-center gap-2">
          {user.tier === 'audio' && (
            <button
              onClick={handleAudioClick}
              className="p-1.5 rounded-xl bg-lavender-50 hover:bg-lavender-100 text-lavender-800 transition-colors"
              title="Nghe Audio"
            >
              <Headphones className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleReadClick}
            className="px-4 py-1.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white font-semibold shadow-xs flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Đọc tiếp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
