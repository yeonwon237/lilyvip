import React, { useEffect, useRef, useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  ArrowLeft, 
  RotateCcw,
  BookX,
  FileQuestion,
  Bookmark,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useReader } from '../context/ReaderContext';
import { ReaderToolbar } from '../components/reader/ReaderToolbar';
import { AaSettingsSheet } from '../components/reader/AaSettingsSheet';
import { ThemeSelectorSheet } from '../components/reader/ThemeSelectorSheet';
import { TocDrawer } from '../components/reader/TocDrawer';
import { SearchDrawer } from '../components/reader/SearchDrawer';
import { BookmarkDrawer } from '../components/reader/BookmarkDrawer';
import { QuoteCardEditor } from '../components/reader/QuoteCardEditor';
import { AudioPlayerSheet } from '../components/audio/AudioPlayerSheet';
import { MiniAudioPlayer } from '../components/audio/MiniAudioPlayer';
import { TextCleaner } from '../book-engine/cleaner/TextCleaner';

export const ReaderPage: React.FC = () => {
  const { currentBook, navigateTo, showToast } = useApp();
  const { 
    settings, 
    activeTheme, 
    currentChapterIndex, 
    currentChapterTitle,
    currentChapterContent, 
    totalChapters, 
    isLoadingChapter,
    readerError,
    retryLoadChapter,
    initialScrollPercent,
    targetParagraphIndex,
    setTargetParagraphIndex,
    saveScrollPosition,
    nextChapter, 
    prevChapter,
    toggleToolbar,
    saveBookmarkFromSelection,
    openQuoteEditor,
  } = useReader();

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Floating text selection state
  const [selectionData, setSelectionData] = useState<{
    text: string;
    paragraphIndex?: number;
    x: number;
    y: number;
    isMobile: boolean;
  } | null>(null);

  // Text selection change listener (strictly scoped to reading article)
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        setSelectionData(null);
        return;
      }

      const rawSelected = selection.toString();
      const trimmed = rawSelected.trim();
      if (trimmed.length < 3) {
        setSelectionData(null);
        return;
      }

      // Check if selection is inside article container
      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      const articleEl = document.getElementById('reader-article-content');

      if (!articleEl || !anchorNode || !focusNode) {
        setSelectionData(null);
        return;
      }

      if (!articleEl.contains(anchorNode) || !articleEl.contains(focusNode)) {
        setSelectionData(null);
        return;
      }

      // Find paragraph index from closest element with id reader-p-X
      let pIndex: number | undefined;
      let parentElement = anchorNode instanceof HTMLElement ? anchorNode : anchorNode.parentElement;
      while (parentElement && parentElement !== articleEl) {
        if (parentElement.id && parentElement.id.startsWith('reader-p-')) {
          const parsed = parseInt(parentElement.id.replace('reader-p-', ''), 10);
          if (!isNaN(parsed)) {
            pIndex = parsed;
            break;
          }
        }
        parentElement = parentElement.parentElement;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const isMobile = window.innerWidth < 640;

      // Position toolbar above the selection or dock on bottom
      const x = Math.max(16, Math.min(window.innerWidth - 200, rect.left + rect.width / 2 - 100));
      const y = Math.max(70, rect.top - 46);

      setSelectionData({
        text: trimmed,
        paragraphIndex: pIndex,
        x,
        y,
        isMobile,
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const handleSaveBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectionData) return;

    await saveBookmarkFromSelection(selectionData.text, selectionData.paragraphIndex);
    window.getSelection()?.removeAllRanges();
    setSelectionData(null);
  };

  const handleCreateQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectionData) return;

    if (selectionData.text.length > 1000) {
      showToast('Đoạn trích quá dài để tạo ảnh. Hãy chọn ngắn hơn.', 'info');
      return;
    }

    openQuoteEditor({
      text: selectionData.text,
      bookTitle: currentBook?.title,
      chapterTitle: currentChapterTitle,
      author: currentBook?.author,
    });

    window.getSelection()?.removeAllRanges();
    setSelectionData(null);
  };

  // Restore scroll position accurately using (scrollHeight - clientHeight)
  useEffect(() => {
    if (!isLoadingChapter && initialScrollPercent > 0 && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      const maxScrollable = el.scrollHeight - el.clientHeight;
      if (maxScrollable > 0) {
        const targetScroll = (maxScrollable * initialScrollPercent) / 100;
        el.scrollTo({ top: targetScroll, behavior: 'instant' });
      }
    }
  }, [isLoadingChapter, initialScrollPercent]);

  // Jump to specific paragraph with Locator Resilience (Paragraph ID -> Fallback exact text)
  useEffect(() => {
    if (!isLoadingChapter && targetParagraphIndex !== null) {
      let targetEl = document.getElementById(`reader-p-${targetParagraphIndex}`);
      
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.add('bg-lily-100/70', 'transition-colors', 'duration-1000', 'rounded-xl', 'p-2');
        setTimeout(() => {
          targetEl?.classList.remove('bg-lily-100/70');
        }, 2500);
      }
      setTargetParagraphIndex(null);
    }
  }, [isLoadingChapter, targetParagraphIndex, setTargetParagraphIndex]);

  // Track scroll position (throttled inside ReaderContext)
  const handleScroll = () => {
    if (!scrollContainerRef.current || isLoadingChapter) return;
    const el = scrollContainerRef.current;
    const maxScrollable = el.scrollHeight - el.clientHeight;
    const scrollPercent = maxScrollable > 0 
      ? Math.round((el.scrollTop / maxScrollable) * 100) 
      : 0;
    saveScrollPosition(scrollPercent, el.scrollTop);
  };

  // Auto scroll effect when in 'auto' mode
  useEffect(() => {
    if (settings.readingMode !== 'auto') return;

    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollBy({ top: settings.autoScrollSpeed * 1.5, behavior: 'smooth' });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [settings.readingMode, settings.autoScrollSpeed]);

  // Page width calculation
  const maxWidthClass = {
    narrow: 'max-w-xl',
    normal: 'max-w-3xl',
    wide: 'max-w-5xl',
    full: 'max-w-full',
  }[settings.pageWidth];

  // Font family and sizing
  const fontStyle = {
    fontFamily: settings.fontFamily === 'Be Vietnam Pro' ? '"Be Vietnam Pro", sans-serif'
      : settings.fontFamily === 'Merriweather' ? '"Merriweather", serif'
      : settings.fontFamily === 'Playfair Display' ? '"Playfair Display", serif'
      : settings.fontFamily === 'Inter' ? '"Inter", sans-serif'
      : '"Literata", Georgia, serif',
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    fontWeight: settings.fontWeight === 'semibold' ? 600 : settings.fontWeight === 'medium' ? 500 : 400,
    textAlign: settings.textAlign,
  };

  const calculateProgress = Math.round((currentChapterIndex / totalChapters) * 100);

  // Real reading time calculations based on ~220 words/minute
  const chapterWordCount = currentChapterContent.reduce((acc, p) => acc + (p.split(/\s+/).filter(Boolean).length), 0);
  const estimatedChapterMinutes = Math.max(1, Math.ceil(chapterWordCount / 220));

  const avgWordsPerChapter = currentBook?.wordCount && totalChapters > 0
    ? Math.round(currentBook.wordCount / totalChapters)
    : 2200;
  const remainingChapters = Math.max(0, totalChapters - currentChapterIndex);
  const remainingWords = remainingChapters * avgWordsPerChapter;
  const totalRemainingMinutes = Math.round(remainingWords / 220);
  const remHours = Math.floor(totalRemainingMinutes / 60);
  const remMins = totalRemainingMinutes % 60;
  const estimatedTotalTime = remHours > 0 
    ? `${remHours} giờ ${remMins > 0 ? `${remMins} phút` : ''}` 
    : `${Math.max(1, remMins)} phút`;

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={`h-screen h-[100dvh] w-full overflow-y-auto overscroll-contain ${activeTheme.className} select-text relative`}
      style={{
        backgroundColor: 'var(--reader-bg, #FAF8F5)',
        color: 'var(--reader-text, #1F1C18)',
      }}
    >
      {/* Floating Toolbars & Bottom Sheets (Tap center on mobile to toggle) */}
      <ReaderToolbar />
      <AaSettingsSheet />
      <ThemeSelectorSheet />
      <TocDrawer />
      <SearchDrawer />
      <BookmarkDrawer />
      <QuoteCardEditor />
      <AudioPlayerSheet />
      <MiniAudioPlayer />

      {/* Floating Selection Toolbar for Bookmark & Quote Creator */}
      {selectionData && (
        <div
          style={{
            position: 'fixed',
            top: selectionData.isMobile ? undefined : `${selectionData.y}px`,
            left: selectionData.isMobile ? '50%' : `${selectionData.x}px`,
            bottom: selectionData.isMobile ? '28px' : undefined,
            transform: selectionData.isMobile ? 'translateX(-50%)' : undefined,
          }}
          className="z-50 bg-ink-950/95 text-white rounded-2xl shadow-modal border border-white/15 px-2 py-1.5 flex items-center gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleSaveBookmark}
            className="px-3 py-1.5 rounded-xl hover:bg-white/15 active:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5 text-lily-400" />
            <span>Lưu dấu</span>
          </button>

          <div className="w-[1px] h-4 bg-white/20" />

          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCreateQuote}
            className="px-3 py-1.5 rounded-xl hover:bg-white/15 active:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-lavender-400" />
            <span>Tạo ảnh</span>
          </button>
        </div>
      )}

      {/* ERROR STATE */}
      {readerError ? (
        <div className="flex items-center justify-center min-h-[85vh] px-4 sm:px-6">
          <div className="max-w-md w-full p-6 sm:p-8 bg-white/90 backdrop-blur-md rounded-3xl border border-ink-100 shadow-modal text-center space-y-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-soft">
              {readerError === 'BOOK_NOT_FOUND' ? (
                <BookX className="w-6 h-6 sm:w-7 sm:h-7" />
              ) : (
                <FileQuestion className="w-6 h-6 sm:w-7 sm:h-7" />
              )}
            </div>

            <div>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-ink-950">
                {readerError === 'BOOK_NOT_FOUND' && 'Không tìm thấy truyện'}
                {readerError === 'CHAPTER_NOT_FOUND' && `Không thể mở Chương ${currentChapterIndex}`}
                {readerError === 'STORAGE_ERROR' && 'Lỗi truy cập dữ liệu IndexedDB'}
              </h2>
              <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                {readerError === 'BOOK_NOT_FOUND' && 'Cuốn truyện này chưa được lưu trên thiết bị hoặc đã bị xóa.'}
                {readerError === 'CHAPTER_NOT_FOUND' && `Dữ liệu của Chương ${currentChapterIndex} không tồn tại trong IndexedDB.`}
                {readerError === 'STORAGE_ERROR' && 'Trình duyệt không thể đọc bộ nhớ IndexedDB của thiết bị.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigateTo('library')}
                className="px-4 py-2 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-cream-50"
              >
                Về Thư viện
              </button>
              <button
                onClick={retryLoadChapter}
                className="px-5 py-2 rounded-xl bg-ink-950 text-white text-xs font-semibold shadow-soft flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Tap anywhere in reader body to toggle floating toolbars */
        <main 
          ref={containerRef}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button, input, a, select, mark')) return;
            toggleToolbar();
          }}
          className={`mx-auto px-4 sm:px-8 md:px-12 py-8 sm:py-10 md:py-16 cursor-pointer ${maxWidthClass} min-h-[92vh] flex flex-col justify-between`}
        >
          {/* Chapter Header */}
          <header className="mb-8 sm:mb-10 pb-5 sm:pb-6 border-b transition-colors" style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}>
            <div className="flex items-center justify-between text-xs opacity-65 mb-2 font-serif">
              <span className="truncate max-w-[180px] sm:max-w-[240px]">{currentBook?.title || 'Lily VIP'}</span>
              <span>Chương {currentChapterIndex} / {totalChapters}</span>
            </div>

            <h1 className="font-serif font-bold text-xl sm:text-2xl md:text-3xl tracking-tight leading-snug">
              {currentChapterTitle || `Chương ${currentChapterIndex}`}
            </h1>
          </header>

          {/* SKELETON / LOADING STATE */}
          {isLoadingChapter ? (
            <div className="space-y-4 py-8 animate-pulse flex-1">
              <div className="h-4 bg-black/10 rounded w-3/4"></div>
              <div className="h-4 bg-black/10 rounded w-full"></div>
              <div className="h-4 bg-black/10 rounded w-5/6"></div>
              <div className="h-4 bg-black/10 rounded w-full"></div>
              <div className="h-4 bg-black/10 rounded w-2/3"></div>
            </div>
          ) : (
            /* REAL READING BODY CONTENT */
            <article 
              id="reader-article-content"
              className="space-y-5 sm:space-y-6 select-text flex-1"
              style={fontStyle}
            >
              {currentChapterContent
                .filter(p => !TextCleaner.isDecorativeDivider(p))
                .map((paragraph, idx) => (
                  <p 
                    id={`reader-p-${idx}`}
                    key={idx}
                    className={`leading-vietnamese ${settings.firstLineIndent ? 'indent-6 sm:indent-8' : ''}`}
                    style={{
                      marginBottom: `${settings.paragraphSpacing}em`,
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
            </article>
          )}

          {/* End of Chapter & Navigation Cards */}
          <section className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t space-y-5 sm:space-y-6" style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}>
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <button
                onClick={(e) => { e.stopPropagation(); prevChapter(); }}
                disabled={currentChapterIndex <= 1 || isLoadingChapter}
                className="flex-1 p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all disabled:opacity-30 flex items-center gap-2.5 sm:gap-3 group bg-white/30 hover:bg-white/60"
                style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs opacity-60">Chương trước</div>
                  <div className="font-serif font-semibold text-xs sm:text-sm truncate">
                    {currentChapterIndex > 1 ? `Chương ${currentChapterIndex - 1}` : 'Hết chương'}
                  </div>
                </div>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); nextChapter(); }}
                disabled={currentChapterIndex >= totalChapters || isLoadingChapter}
                className="flex-1 p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-right transition-all disabled:opacity-30 flex items-center justify-end gap-2.5 sm:gap-3 group bg-white/30 hover:bg-white/60"
                style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}
              >
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs opacity-60">Chương sau</div>
                  <div className="font-serif font-semibold text-xs sm:text-sm truncate">
                    {currentChapterIndex < totalChapters ? `Chương ${currentChapterIndex + 1}` : 'Hết truyện'}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            </div>

            {/* Quick back to detail */}
            <div className="text-center">
              <button
                onClick={(e) => { e.stopPropagation(); navigateTo('book-detail', currentBook?.id); }}
                className="inline-flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100 transition-opacity py-1 px-3 rounded-lg"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Xem trang chi tiết truyện</span>
              </button>
            </div>
          </section>

          {/* Reader Footer Display (Real Chapter & Progress Numbers) */}
          {settings.footerDisplay !== 'hidden' && (
            <footer 
              className="mt-8 sm:mt-12 pt-3 sm:pt-4 flex items-center justify-between text-[11px] sm:text-xs opacity-60 select-none border-t border-dashed"
              style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}
            >
              <div>
                {settings.footerDisplay === 'percent' && (
                  <span>Chương {currentChapterIndex} / {totalChapters} · Tiến độ ~{calculateProgress}%</span>
                )}
                {settings.footerDisplay === 'pages' && (
                  <span>Chương {currentChapterIndex} / {totalChapters}</span>
                )}
                {settings.footerDisplay === 'time_chapter' && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Còn khoảng {estimatedChapterMinutes} phút hết chương</span>
                  </span>
                )}
                {settings.footerDisplay === 'time_book' && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Còn khoảng {estimatedTotalTime}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span>{activeTheme.name}</span>
                <span>•</span>
                <span>{settings.fontFamily}</span>
              </div>
            </footer>
          )}
        </main>
      )}
    </div>
  );
};
