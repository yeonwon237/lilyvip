import React from 'react';
import { X, Search, ArrowRight, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { useReader } from '../../context/ReaderContext';

export const SearchDrawer: React.FC = () => {
  const { 
    isSearchOpen, 
    setIsSearchOpen, 
    jumpToSearchResult,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError
  } = useReader();

  if (!isSearchOpen) return null;

  // Highlight matched keyword in snippet safely
  const renderHighlightedSnippet = (snippet: string, query: string) => {
    if (!query.trim()) return snippet;
    
    // Escape special regex characters in search query
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = snippet.split(regex);

    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark 
          key={index} 
          className="bg-lily-200 text-lily-950 px-1 py-0.5 rounded font-semibold not-italic"
        >
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-950/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md h-full bg-white shadow-modal border-l border-ink-100 p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header (100% Free Local Search) */}
          <div className="flex items-center justify-between pb-3 border-b border-ink-100">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-lily-600" />
              <h3 className="font-serif font-bold text-base text-ink-950">
                Tìm kiếm trong toàn truyện
              </h3>
            </div>
            <button
              onClick={() => setIsSearchOpen(false)}
              className="p-1 rounded-full text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
              aria-label="Đóng tìm kiếm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập tên nhân vật, câu thoại, tình tiết..."
              autoFocus
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-xs focus:ring-2 focus:ring-lily-500/20 text-ink-900 placeholder:text-ink-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 p-0.5"
                aria-label="Xóa từ khóa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search stats / status bar */}
          {searchQuery.trim() && !isSearching && !searchError && (
            <div className="text-xs text-ink-500 mt-2 px-1 flex items-center justify-between">
              <span>
                Tìm thấy <strong>{searchResults.length}</strong> kết quả
              </span>
              <span className="text-[10px] text-ink-400">IndexedDB Local</span>
            </div>
          )}
        </div>

        {/* Results / Empty / Loading States */}
        <div className="flex-1 overflow-y-auto my-3 space-y-2.5 pr-1">
          {/* 1. INITIAL EMPTY STATE */}
          {!searchQuery.trim() && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-ink-50 flex items-center justify-center text-ink-300">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-xs text-ink-600 font-medium">
                Tìm kiếm toàn bộ nội dung tác phẩm
              </p>
              <p className="text-[11px] text-ink-400 max-w-[240px] leading-relaxed">
                Nhập tên nhân vật hoặc từ khóa để quét nhanh qua tất cả các chương lưu trong thiết bị.
              </p>
            </div>
          )}

          {/* 2. LOADING STATE */}
          {isSearching && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-500 space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-lily-600" />
              <p className="text-xs">Đang tìm kiếm trong các chương…</p>
            </div>
          )}

          {/* 3. ERROR STATE */}
          {searchError && !isSearching && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 my-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Lỗi tìm kiếm:</span> {searchError}
              </div>
            </div>
          )}

          {/* 4. NO RESULTS STATE */}
          {!isSearching && searchQuery.trim() && searchResults.length === 0 && !searchError && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-400 space-y-2">
              <p className="text-xs text-ink-600 font-medium">
                Không tìm thấy kết quả nào
              </p>
              <p className="text-[11px] text-ink-400 max-w-[240px] leading-relaxed">
                Không có đoạn văn nào chứa từ khóa "{searchQuery}" trong tác phẩm này.
              </p>
            </div>
          )}

          {/* 5. SEARCH RESULTS LIST */}
          {!isSearching && searchResults.map((item, idx) => (
            <div
              key={idx}
              onClick={() => jumpToSearchResult(item.chapterIndex, item.paragraphIndex)}
              className="p-3.5 rounded-2xl bg-cream-50/80 hover:bg-cream-100/90 border border-cream-200/80 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] text-xs space-y-1.5"
            >
              <div className="font-semibold text-lily-950 flex items-center justify-between">
                <span className="truncate max-w-[240px]">{item.chapterTitle}</span>
                <div className="flex items-center gap-1 text-[11px] text-lily-700 shrink-0">
                  <span>Chương {item.chapterIndex}</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
              <p className="text-ink-700 leading-relaxed italic text-[11.5px]">
                {renderHighlightedSnippet(item.snippet, searchQuery)}
              </p>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-ink-100 text-center text-[11px] text-ink-400">
          Chạm vào trích đoạn để chuyển ngay tới chương và đoạn văn tương ứng
        </div>
      </div>
    </div>
  );
};
