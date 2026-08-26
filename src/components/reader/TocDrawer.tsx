import React, { useState, useEffect, useRef } from 'react';
import { X, Search, CheckCircle2, Circle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';

export const TocDrawer: React.FC = () => {
  const { currentBook } = useApp();
  const { 
    isTocOpen, 
    setIsTocOpen, 
    currentChapterIndex, 
    totalChapters, 
    chapterList,
    jumpToChapter 
  } = useReader();

  const [search, setSearch] = useState('');
  const currentChapterRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to current chapter when TOC opens
  useEffect(() => {
    if (isTocOpen && currentChapterRef.current) {
      currentChapterRef.current.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  }, [isTocOpen]);

  if (!isTocOpen) return null;

  const chapters = chapterList.length > 0 ? chapterList : Array.from({ length: totalChapters }, (_, i) => {
    const num = i + 1;
    return {
      index: num,
      title: `Chương ${num}`,
      wordCount: 2000,
      isRead: num < currentChapterIndex,
      isCurrent: num === currentChapterIndex,
    };
  });

  const filtered = chapters.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.index.toString() === search.trim()
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-ink-950/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-sm h-full bg-white shadow-modal border-r border-ink-100 p-5 flex flex-col justify-between animate-in slide-in-from-left duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-ink-100">
            <div>
              <h3 className="font-serif font-bold text-base text-ink-950">
                Mục lục chương
              </h3>
              <p className="text-xs text-ink-500 mt-0.5 truncate max-w-[200px]">
                {currentBook?.title}
              </p>
            </div>
            <button
              onClick={() => setIsTocOpen(false)}
              className="p-1 rounded-full text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
              aria-label="Đóng mục lục"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search input */}
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm số hoặc tên chương..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-ink-50 border border-ink-200 text-xs focus:ring-2 focus:ring-lily-500/20 text-ink-900 placeholder:text-ink-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 p-0.5"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Chapter List */}
        <div className="flex-1 overflow-y-auto my-3 divide-y divide-ink-50 pr-1">
          {filtered.map((chap) => {
            const isCurrent = chap.index === currentChapterIndex;
            return (
              <div
                key={chap.index}
                ref={isCurrent ? currentChapterRef : undefined}
                onClick={() => jumpToChapter(chap.index)}
                className={`py-2.5 px-2.5 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors ${
                  isCurrent
                    ? 'bg-lily-50 font-semibold text-lily-950 border border-lily-200'
                    : 'hover:bg-cream-50 text-ink-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isCurrent ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-lily-600 text-white flex items-center justify-center text-[8px] shrink-0">
                      ●
                    </span>
                  ) : chap.isRead ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-ink-300 shrink-0" />
                  )}
                  <span className="truncate">{chap.title}</span>
                </div>
                {isCurrent && (
                  <span className="text-[10px] text-lily-700 font-bold px-1.5 py-0.5 rounded bg-lily-100 shrink-0 ml-1">
                    Đang đọc
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-ink-100 flex items-center justify-between text-xs text-ink-500">
          <span>{totalChapters} chương</span>
          <button
            onClick={() => jumpToChapter(currentChapterIndex)}
            className="text-lily-700 font-medium hover:underline text-xs"
          >
            Về chương đang đọc
          </button>
        </div>
      </div>
    </div>
  );
};
