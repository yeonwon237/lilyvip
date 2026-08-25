import React, { useState } from 'react';
import { X, Search, Sparkles, ArrowRight } from 'lucide-react';
import { useReader } from '../../context/ReaderContext';
import { mockSearchResults } from '../../mock/mockData';

export const SearchDrawer: React.FC = () => {
  const { 
    isSearchOpen, 
    setIsSearchOpen, 
    jumpToChapter,
    searchQuery,
    setSearchQuery,
    searchResults 
  } = useReader();

  const [inputVal, setInputVal] = useState(searchQuery);

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-950/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md h-full bg-white shadow-modal border-l border-ink-100 p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-ink-100">
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-base text-ink-900">
                Tìm kiếm trong truyện
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-lily-100 text-lily-800">
                ✦ PRO
              </span>
            </div>
            <button
              onClick={() => setIsSearchOpen(false)}
              className="p-1 rounded-full text-ink-400 hover:text-ink-700 hover:bg-ink-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setSearchQuery(e.target.value);
              }}
              placeholder="Nhập tên nhân vật, câu thoại..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-xs focus:ring-2 focus:ring-lily-500/20"
            />
          </div>

          {/* Search stats */}
          <div className="text-xs text-ink-500 mt-2 px-1">
            Tìm thấy <strong>{searchResults.length}</strong> kết quả cho "{inputVal}"
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto my-3 space-y-2.5 pr-1">
          {searchResults.map((item, idx) => (
            <div
              key={idx}
              onClick={() => {
                jumpToChapter(item.chapterIndex);
                setIsSearchOpen(false);
              }}
              className="p-3.5 rounded-2xl bg-cream-50/80 hover:bg-cream-100/90 border border-cream-200/80 cursor-pointer transition-colors text-xs"
            >
              <div className="font-semibold text-lily-900 mb-1 flex items-center justify-between">
                <span>{item.chapterTitle}</span>
                <ArrowRight className="w-3.5 h-3.5 text-ink-400" />
              </div>
              <p className="text-ink-700 leading-relaxed italic">
                {item.snippet}
              </p>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-ink-100 text-center text-[11px] text-ink-400">
          Chạm vào trích đoạn bất kỳ để nhảy ngay tới vị trí trong truyện
        </div>
      </div>
    </div>
  );
};
