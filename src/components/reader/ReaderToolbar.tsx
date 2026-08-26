import React from 'react';
import { 
  ArrowLeft, 
  Menu, 
  Type, 
  Palette, 
  Search, 
  Headphones, 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  Sparkles,
  Sliders,
  Maximize2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';
import { PlanBadge } from '../common/Badges';

export const ReaderToolbar: React.FC = () => {
  const { currentBook, navigateTo, user, openUpgradeModal } = useApp();
  const { 
    isToolbarVisible, 
    currentChapterIndex, 
    totalChapters, 
    nextChapter, 
    prevChapter,
    setIsAaPanelOpen,
    setIsThemePanelOpen,
    setIsTocOpen,
    setIsSearchOpen,
    setIsAudioSheetOpen,
    setIsBookmarkDrawerOpen,
    bookmarks,
    settings,
    updateSetting,
    audioAccess,
  } = useReader();

  if (!isToolbarVisible) return null;

  return (
    <>
      {/* TOP FLOATING TOOLBAR */}
      <div className="reader-toolbar-top fixed top-2 sm:top-3 left-3 right-3 z-40 px-3 sm:px-4 py-2 rounded-[20px] transition-all animate-in slide-in-from-top duration-200">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Back to book detail */}
          <button
            onClick={() => navigateTo('book-detail', currentBook?.id)}
            className="flex items-center gap-1.5 p-1.5 rounded-xl text-ink-700 hover:bg-ink-100 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quay lại</span>
          </button>

          {/* Book title and chapter badge */}
          <div className="text-center min-w-0 flex-1 px-2">
            <h2 className="font-serif font-semibold text-xs text-ink-900 truncate">
              {currentBook?.title}
            </h2>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink-500">
              <span>Chương {currentChapterIndex} / {totalChapters}</span>
              {user.tier === 'vip' && (
                <span className="text-[10px] text-lily-600 font-bold">✦ PRO</span>
              )}
            </div>
          </div>

          {/* Right actions: Reading Mode switch & Bookmark */}
          <div className="flex items-center gap-1">
            {/* Quick reading mode toggle for VIP */}
            {user.tier === 'vip' ? (
              <button
                onClick={() => {
                  const nextMode = settings.readingMode === 'scroll' ? 'page' : 'scroll';
                  updateSetting('readingMode', nextMode);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-cream-100 hover:bg-cream-200 text-ink-800 transition-colors flex items-center gap-1"
                title="Chuyển chế độ cuộn / lật trang"
              >
                <span>{settings.readingMode === 'scroll' ? 'Cuộn' : 'Lật trang'}</span>
              </button>
            ) : (
              <button
                onClick={() => openUpgradeModal('Page Mode (Lật trang E-reader)')}
                className="px-2 py-1 rounded-lg text-[11px] text-ink-400 hover:text-ink-700 transition-colors flex items-center gap-1"
              >
                <span>Cuộn</span>
                <span className="text-[10px] text-lily-600 font-bold">🔒</span>
              </button>
            )}

            <button
              onClick={() => setIsBookmarkDrawerOpen(true)}
              className="p-2 rounded-xl text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition-colors relative"
              title="Danh sách đoạn đã lưu"
              aria-label="Mở danh sách đoạn đã lưu"
            >
              <Bookmark className="w-4 h-4" />
              {bookmarks.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-lily-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM FLOATING TOOLBAR */}
      <div className="reader-toolbar-bottom fixed bottom-2 sm:bottom-3 left-3 right-3 z-40 px-3 py-2 rounded-[22px] transition-all animate-in slide-in-from-bottom duration-200 safe-area-pb">
        <div className="max-w-2xl mx-auto flex flex-col gap-1.5">
          {/* Chapter Quick Stepper Slider */}
          <div className="flex items-center justify-between gap-3 text-xs text-ink-600 px-2">
            <button
              onClick={prevChapter}
              disabled={currentChapterIndex <= 1}
              className="p-1 rounded-lg hover:bg-ink-100 disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Chương trước</span>
            </button>

            <span className="font-mono font-medium text-ink-900 text-xs">
              Chương {currentChapterIndex} / {totalChapters}
            </span>

            <button
              onClick={nextChapter}
              disabled={currentChapterIndex >= totalChapters}
              className="p-1 rounded-lg hover:bg-ink-100 disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-1"
            >
              <span className="hidden sm:inline text-[11px]">Chương sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons row */}
          <div className="flex items-center justify-around pt-1 border-t border-ink-100/70">
            {/* TOC */}
            <button
              onClick={() => setIsTocOpen(true)}
              className="flex flex-col items-center p-1.5 rounded-xl text-ink-600 hover:text-ink-950 hover:bg-ink-50 transition-colors"
            >
              <Menu className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 font-medium">Mục lục</span>
            </button>

            {/* Typography Aa */}
            <button
              onClick={() => setIsAaPanelOpen(true)}
              className="flex flex-col items-center p-1.5 rounded-xl text-ink-600 hover:text-ink-950 hover:bg-ink-50 transition-colors"
            >
              <Type className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 font-medium">Cỡ chữ / Aa</span>
            </button>

            {/* Themes */}
            <button
              onClick={() => setIsThemePanelOpen(true)}
              className="flex flex-col items-center p-1.5 rounded-xl text-ink-600 hover:text-ink-950 hover:bg-ink-50 transition-colors"
            >
              <Palette className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 font-medium">Giao diện</span>
            </button>

            {/* Search (100% Free Local Search) */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex flex-col items-center p-1.5 rounded-xl text-ink-600 hover:text-ink-950 hover:bg-ink-50 transition-colors relative"
            >
              <Search className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 font-medium">
                Tìm kiếm
              </span>
            </button>

            {/* Audio */}
            <button
              onClick={() => setIsAudioSheetOpen(true)}
              className="flex flex-col items-center p-1.5 rounded-xl text-ink-600 hover:text-ink-950 hover:bg-ink-50 transition-colors relative"
            >
              <Headphones className="w-4 h-4 text-lavender-600" />
              <span className="text-[10px] mt-0.5 font-medium flex items-center gap-0.5">
                Audio {!audioAccess.enabled && user.tier === 'free' && '🔒'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
