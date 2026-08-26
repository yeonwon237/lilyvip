import React from 'react';
import { 
  X, 
  Bookmark as BookmarkIcon, 
  BookOpen, 
  Sparkles, 
  Trash2, 
  Clock, 
  ChevronRight,
  BookmarkCheck
} from 'lucide-react';
import { useReader } from '../../context/ReaderContext';
import { useApp } from '../../context/AppContext';
import { Bookmark } from '../../types';
import { formatRelativeTime } from '../../utils/dateUtils';

export const BookmarkDrawer: React.FC = () => {
  const { 
    isBookmarkDrawerOpen, 
    setIsBookmarkDrawerOpen, 
    bookmarks, 
    deleteBookmarkById, 
    jumpToBookmark, 
    openQuoteEditor 
  } = useReader();
  const { currentBook } = useApp();

  if (!isBookmarkDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-950/30 backdrop-blur-xs">
      <div 
        className="w-full max-w-md bg-white h-full shadow-modal flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-ink-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lily-100 text-lily-800 flex items-center justify-center">
              <BookmarkCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-ink-950">
                Đoạn đã lưu ({bookmarks.length})
              </h3>
              <p className="text-[11px] text-ink-500 truncate max-w-[200px] sm:max-w-[240px]">
                {currentBook?.title || 'Truyện đang đọc'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsBookmarkDrawerOpen(false)}
            className="p-1.5 rounded-full text-ink-400 hover:text-ink-900 hover:bg-ink-100 transition-colors"
            aria-label="Đóng danh sách bookmark"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-ink-100/60">
          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-cream-100 text-ink-400 flex items-center justify-center shadow-soft">
                <BookmarkIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-sm text-ink-900">
                  Bạn chưa lưu đoạn nào
                </h4>
                <p className="text-xs text-ink-500 max-w-[240px] leading-relaxed">
                  Khi đọc truyện, hãy bôi đen bất kỳ đoạn văn yêu thích nào để lưu lại hoặc tạo ảnh trích dẫn.
                </p>
              </div>
            </div>
          ) : (
            bookmarks.map((bm) => (
              <div 
                key={bm.id}
                className="pt-3.5 first:pt-0 group bg-white hover:bg-cream-50/50 p-3 rounded-2xl border border-ink-100/80 transition-all shadow-xs space-y-2.5"
              >
                {/* Meta info */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-lily-900 px-2 py-0.5 rounded-full bg-lily-50 border border-lily-100 text-[11px]">
                    {bm.chapterTitle || `Chương ${bm.chapterIndex}`}
                  </span>
                  <span className="text-[11px] text-ink-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(bm.createdAt)}</span>
                  </span>
                </div>

                {/* Excerpt */}
                <p className="text-xs sm:text-[13px] text-ink-800 italic font-serif leading-relaxed line-clamp-4 pl-2 border-l-2 border-lily-300">
                  “{bm.selectedText}”
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    onClick={() => jumpToBookmark(bm)}
                    className="px-2.5 py-1.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Đọc lại</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openQuoteEditor({
                        text: bm.selectedText,
                        bookTitle: currentBook?.title,
                        chapterTitle: bm.chapterTitle,
                        author: currentBook?.author,
                        bookmarkId: bm.id,
                      })}
                      className="px-2.5 py-1.5 rounded-xl border border-lily-200 bg-lily-50/80 hover:bg-lily-100 text-lily-900 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-lily-600" />
                      <span>Tạo ảnh</span>
                    </button>

                    <button
                      onClick={() => deleteBookmarkById(bm.id)}
                      className="p-1.5 rounded-xl text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Xóa đoạn này"
                      aria-label="Xóa bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
