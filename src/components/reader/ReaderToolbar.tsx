import React from 'react';
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Headphones, Highlighter, List, Palette, Search, Type } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';

export const ReaderToolbar: React.FC = () => {
  const { currentBook, navigateTo } = useApp();
  const { isToolbarVisible, currentChapterIndex, totalChapters, nextChapter, prevChapter, setIsAaPanelOpen, setIsThemePanelOpen, setIsTocOpen, setIsSearchOpen, setIsAudioSheetOpen, setIsBookmarkDrawerOpen, setIsAnnotationDrawerOpen, bookmarks, bookAnnotations } = useReader();
  if (!isToolbarVisible) return null;
  const toolClass = 'flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[var(--reader-muted)] transition-colors hover:bg-[var(--reader-border)] hover:text-[var(--reader-text)]';

  return <>
    <header className="reader-toolbar-top fixed inset-x-0 top-0 z-40 animate-in slide-in-from-top duration-200">
      <div className="mx-auto flex min-h-12 max-w-5xl items-center gap-2 px-2 sm:px-4">
        <button onClick={() => navigateTo('book-detail', currentBook?.id)} className="flex h-10 w-10 shrink-0 items-center justify-center hover:bg-[var(--reader-border)]" aria-label="Quay lại"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1 text-center">
          <h2 className="truncate font-serif text-sm font-semibold">{currentBook?.title}</h2>
          <p className="text-[11px] text-[var(--reader-muted)]">Chương {currentChapterIndex}/{totalChapters}</p>
        </div>
        <div className="flex shrink-0 items-center">
          <button onClick={() => setIsAnnotationDrawerOpen(true)} className="relative flex h-10 w-10 items-center justify-center text-[var(--reader-muted)] hover:bg-[var(--reader-border)] hover:text-[var(--reader-text)]" aria-label="Ghi chú"><Highlighter className="h-[18px] w-[18px]" />{bookAnnotations.length > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-lily-600" />}</button>
          <button onClick={() => setIsBookmarkDrawerOpen(true)} className="relative flex h-10 w-10 items-center justify-center text-[var(--reader-muted)] hover:bg-[var(--reader-border)] hover:text-[var(--reader-text)]" aria-label="Đoạn đã lưu"><Bookmark className="h-[18px] w-[18px]" />{bookmarks.length > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-lily-600" />}</button>
        </div>
      </div>
    </header>

    <footer className="reader-toolbar-bottom fixed inset-x-0 bottom-0 z-40 animate-in slide-in-from-bottom duration-200">
      <div className="mx-auto max-w-3xl">
        <div className="grid h-8 grid-cols-[1fr_auto_1fr] items-center border-b border-[var(--reader-border)] px-2 text-xs text-[var(--reader-muted)]">
          <button onClick={prevChapter} disabled={currentChapterIndex <= 1} className="flex h-full items-center justify-start gap-1 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /><span>Trước</span></button>
          <span className="px-3 font-medium text-[var(--reader-text)]">{currentChapterIndex} / {totalChapters}</span>
          <button onClick={nextChapter} disabled={currentChapterIndex >= totalChapters} className="flex h-full items-center justify-end gap-1 disabled:opacity-30"><span>Sau</span><ChevronRight className="h-4 w-4" /></button>
        </div>
        <nav className="grid grid-cols-5" aria-label="Công cụ đọc">
          <button onClick={() => setIsTocOpen(true)} className={toolClass}><List className="h-[18px] w-[18px]" /><span className="text-[10px]">Mục lục</span></button>
          <button onClick={() => setIsAaPanelOpen(true)} className={toolClass}><Type className="h-[18px] w-[18px]" /><span className="text-[10px]">Cỡ chữ</span></button>
          <button onClick={() => setIsThemePanelOpen(true)} className={toolClass}><Palette className="h-[18px] w-[18px]" /><span className="text-[10px]">Giao diện</span></button>
          <button onClick={() => setIsSearchOpen(true)} className={toolClass}><Search className="h-[18px] w-[18px]" /><span className="text-[10px]">Tìm</span></button>
          <button onClick={() => setIsAudioSheetOpen(true)} className={toolClass}><Headphones className="h-[18px] w-[18px]" /><span className="text-[10px]">Nghe</span></button>
        </nav>
      </div>
    </footer>
  </>;
};
