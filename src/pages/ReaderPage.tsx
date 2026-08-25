import React, { useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  ArrowLeft, 
  AlertCircle, 
  RotateCcw,
  Loader2,
  BookX,
  FileQuestion
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useReader } from '../context/ReaderContext';
import { ReaderToolbar } from '../components/reader/ReaderToolbar';
import { AaSettingsSheet } from '../components/reader/AaSettingsSheet';
import { ThemeSelectorSheet } from '../components/reader/ThemeSelectorSheet';
import { TocDrawer } from '../components/reader/TocDrawer';
import { SearchDrawer } from '../components/reader/SearchDrawer';
import { AudioPlayerSheet } from '../components/audio/AudioPlayerSheet';
import { MiniAudioPlayer } from '../components/audio/MiniAudioPlayer';

export const ReaderPage: React.FC = () => {
  const { currentBook, user, navigateTo } = useApp();
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
    saveScrollPosition,
    nextChapter, 
    prevChapter,
    isToolbarVisible,
    toggleToolbar,
  } = useReader();

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Restore scroll position on chapter initial load
  useEffect(() => {
    if (!isLoadingChapter && initialScrollPercent > 0 && scrollContainerRef.current) {
      const targetScroll = (scrollContainerRef.current.scrollHeight * initialScrollPercent) / 100;
      scrollContainerRef.current.scrollTo({ top: targetScroll, behavior: 'instant' });
    }
  }, [isLoadingChapter, initialScrollPercent]);

  // Track scroll position
  const handleScroll = () => {
    if (!scrollContainerRef.current || isLoadingChapter) return;
    const el = scrollContainerRef.current;
    const scrollPercent = el.scrollHeight > el.clientHeight 
      ? Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100) 
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

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={`h-screen h-[100dvh] w-full overflow-y-auto overscroll-contain transition-colors duration-300 ${activeTheme.className} select-text relative`}
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
      <AudioPlayerSheet />
      <MiniAudioPlayer />

      {/* ERROR STATE: Render explicit error UI instead of silent mock fallback */}
      {readerError ? (
        <div className="flex items-center justify-center min-h-[85vh] px-6">
          <div className="max-w-md w-full p-8 bg-white/90 backdrop-blur-md rounded-3xl border border-ink-100 shadow-modal text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-soft">
              {readerError === 'BOOK_NOT_FOUND' ? (
                <BookX className="w-7 h-7" />
              ) : (
                <FileQuestion className="w-7 h-7" />
              )}
            </div>

            <div>
              <h2 className="font-serif font-bold text-xl text-ink-950">
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
                className="px-5 py-2 rounded-xl bg-ink-900 text-white text-xs font-semibold shadow-soft flex items-center gap-1.5"
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
            if ((e.target as HTMLElement).closest('button, input, a, select')) return;
            toggleToolbar();
          }}
          className={`mx-auto px-5 sm:px-8 md:px-12 py-10 md:py-16 cursor-pointer ${maxWidthClass} transition-all duration-200 min-h-[92vh] flex flex-col justify-between`}
        >
          {/* Chapter Header */}
          <header className="mb-10 pb-6 border-b transition-colors" style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}>
            <div className="flex items-center justify-between text-xs opacity-65 mb-2.5 font-serif">
              <span className="truncate max-w-[200px]">{currentBook?.title || 'Lily VIP'}</span>
              <span>Chương {currentChapterIndex} / {totalChapters}</span>
            </div>

            <h1 className="font-serif font-bold text-2xl md:text-3xl tracking-tight leading-snug">
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
              className="space-y-6 select-text flex-1"
              style={fontStyle}
            >
              {currentChapterContent.map((paragraph, idx) => (
                <p 
                  key={idx}
                  className={`leading-relaxed ${settings.firstLineIndent ? 'indent-7 md:indent-8' : ''}`}
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
          <section className="mt-16 pt-8 border-t space-y-6" style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}>
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={(e) => { e.stopPropagation(); prevChapter(); }}
                disabled={currentChapterIndex <= 1 || isLoadingChapter}
                className="flex-1 p-4 rounded-2xl border text-left transition-all disabled:opacity-30 flex items-center gap-3 group bg-white/30 hover:bg-white/60"
                style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}
              >
                <ChevronLeft className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="min-w-0">
                  <div className="text-xs opacity-60">Chương trước</div>
                  <div className="font-serif font-semibold text-xs md:text-sm truncate">
                    {currentChapterIndex > 1 ? `Chương ${currentChapterIndex - 1}` : 'Hết chương'}
                  </div>
                </div>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); nextChapter(); }}
                disabled={currentChapterIndex >= totalChapters || isLoadingChapter}
                className="flex-1 p-4 rounded-2xl border text-right transition-all disabled:opacity-30 flex items-center justify-end gap-3 group bg-white/30 hover:bg-white/60"
                style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}
              >
                <div className="min-w-0">
                  <div className="text-xs opacity-60">Chương sau</div>
                  <div className="font-serif font-semibold text-xs md:text-sm truncate">
                    {currentChapterIndex < totalChapters ? `Chương ${currentChapterIndex + 1}` : 'Hết truyện'}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
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

          {/* Reader Footer Display */}
          {settings.footerDisplay !== 'hidden' && (
            <footer 
              className="mt-12 pt-4 flex items-center justify-between text-xs opacity-60 select-none border-t border-dashed"
              style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}
            >
              <div>
                {settings.footerDisplay === 'percent' && (
                  <span>Chương {currentChapterIndex} · {calculateProgress}% toàn truyện</span>
                )}
                {settings.footerDisplay === 'pages' && (
                  <span>Trang {currentChapterIndex * 4} / {totalChapters * 4}</span>
                )}
                {settings.footerDisplay === 'time_chapter' && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Còn khoảng 6 phút hết chương</span>
                  </span>
                )}
                {settings.footerDisplay === 'time_book' && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Còn khoảng 3 giờ 45 phút</span>
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
