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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 safe-area-pb">
          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cream-100 text-ink-400 flex items-center justify-center shadow-soft">
                <BookmarkIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-sm text-ink-900">
                  Chưa có dấu trang
                </h4>
                <p className="text-xs text-ink-500 max-w-[240px] leading-relaxed">
                  Bôi chọn đoạn văn khi đọc để lưu dấu trang hoặc tạo ảnh trích dẫn.
                </p>
              </div>
            </div>
          ) : (
            bookmarks.map((bm) => (
              <div 
                key={bm.id}
                className="group bg-white hover:bg-cream-50/60 p-3 sm:p-3.5 rounded-2xl border border-ink-100/80 transition-all shadow-xs space-y-2"
              >
                {/* Meta info */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-lily-900 px-2 py-0.5 rounded-md bg-lily-50 border border-lily-100 text-[11px] truncate max-w-[200px]">
                    {bm.chapterTitle || `Chương ${bm.chapterIndex}`}
                  </span>
                  <span className="text-[10px] text-ink-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(bm.createdAt)}</span>
                  </span>
                </div>

                {/* Excerpt */}
                <p className="text-xs sm:text-[13px] text-ink-800 italic font-serif leading-relaxed line-clamp-3 pl-2.5 border-l-2 border-lily-400">
                  “{bm.selectedText}”
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    onClick={() => {
                      jumpToBookmark(bm);
                      setIsBookmarkDrawerOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-ink-950 hover:bg-ink-900 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Đọc tiếp</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        openQuoteEditor({
                          text: bm.selectedText,
                          bookTitle: currentBook?.title,
                          chapterTitle: bm.chapterTitle,
                          author: currentBook?.author,
                          bookmarkId: bm.id,
                        });
                        setIsBookmarkDrawerOpen(false);
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-lily-200 bg-lily-50/80 hover:bg-lily-100 text-lily-900 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-lily-600" />
                      <span>Tạo ảnh</span>
                    </button>

                    <button
                      onClick={() => deleteBookmarkById(bm.id)}
                      className="p-1.5 rounded-xl text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Xóa dấu trang này"
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
