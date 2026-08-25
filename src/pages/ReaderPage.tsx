import React, { useEffect, useRef, useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  ArrowLeft, 
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
import { AudioPlayerSheet } from '../components/audio/AudioPlayerSheet';
import { MiniAudioPlayer } from '../components/audio/MiniAudioPlayer';

export const ReaderPage: React.FC = () => {
  const { currentBook, user, navigateTo } = useApp();
  const { 
    settings, 
    activeTheme, 
    currentChapterIndex, 
    currentChapterContent, 
    totalChapters, 
    nextChapter, 
    prevChapter,
    isToolbarVisible,
    toggleToolbar,
    hideToolbar,
  } = useReader();

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll effect when in 'auto' mode
  useEffect(() => {
    if (settings.readingMode !== 'auto') return;

    const interval = setInterval(() => {
      window.scrollBy({ top: settings.autoScrollSpeed * 1.5, behavior: 'smooth' });
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

      {/* Tap anywhere in reader body to toggle floating toolbars */}
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

        {/* Reading Body Content */}
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

        {/* End of Chapter & Navigation Cards */}
        <section className="mt-16 pt-8 border-t space-y-6" style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}>
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={(e) => { e.stopPropagation(); prevChapter(); }}
              disabled={currentChapterIndex <= 1}
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
              disabled={currentChapterIndex >= totalChapters}
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
    </div>
  );
};
