import { t } from '../i18n';
import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, ArrowLeft, RotateCcw, BookX, FileQuestion, Lock, Link as LinkIcon, Smartphone, Bookmark, Mic2, Highlighter, PenLine, Play, Pause, Plus, Minus, X as CloseIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useReader } from '../context/ReaderContext';
import { ReaderToolbar } from '../components/reader/ReaderToolbar';
import { AaSettingsSheet } from '../components/reader/AaSettingsSheet';
import { TranslateSheet } from '../components/reader/TranslateSheet';
import { TocDrawer } from '../components/reader/TocDrawer';
import { SearchDrawer } from '../components/reader/SearchDrawer';
import { BookmarkDrawer } from '../components/reader/BookmarkDrawer';
import { AnnotationDrawer } from '../components/reader/AnnotationDrawer';
import { NoteEditorModal } from '../components/reader/NoteEditorModal';
import { HighlightDetailSheet } from '../components/reader/HighlightDetailSheet';
import { QuoteCardEditor } from '../components/reader/QuoteCardEditor';
import { AudioPlayerSheet } from '../components/audio/AudioPlayerSheet';
import { MiniAudioPlayer } from '../components/audio/MiniAudioPlayer';
import { TextCleaner } from '../book-engine/cleaner/TextCleaner';
import { AnnotationLocator } from '../book-engine/annotation/AnnotationLocator';
import { AnnotationRenderer } from '../book-engine/annotation/AnnotationRenderer';
import { HighlightColor, Annotation } from '../types';
import { APP_THEME_STATUS_BAR_COLOR, setStatusBarColor } from '../utils/statusBarColor';

export const ReaderPage: React.FC = () => {
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const { currentBook, navigateTo, showToast, appTheme } = useApp();
  const {
    settings,
    updateSetting,
    activeTheme,
    currentChapterIndex,
    currentChapterTitle,
    currentChapterContent,
    totalChapters,
    firstChapterIndex,
    lastChapterIndex,
    isLoadingChapter,
    readerError,
    retryLoadChapter,
    initialScrollPercent,
    targetParagraphIndex,
    setTargetParagraphIndex,
    saveScrollPosition,
    nextChapter,
    prevChapter,
    isToolbarVisible,
    toggleToolbar,
    hideToolbar,
    isAaPanelOpen,
    isThemePanelOpen,
    isTocOpen,
    isSearchOpen,
    isBookmarkDrawerOpen,
    isAnnotationDrawerOpen,
    isAudioSheetOpen,
    saveBookmarkFromSelection,
    annotations,
    saveHighlight,
    saveNote,
    updateAnnotationNote,
    updateAnnotationColor,
    deleteAnnotationById,
    isNoteEditorOpen,
    noteEditorData,
    openNoteEditor,
    closeNoteEditor,
    selectedAnnotationForDetail,
    setSelectedAnnotationForDetail,
    openQuoteEditor,
    isTranslatePanelOpen,
    textLanguageMode,
    translatedParagraphs,
    translatedChapterTitle,
    translatedBookTitle,
  } = useReader();

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);
  const selectionToolbarRef = useRef<HTMLDivElement>(null);

  const isAnyDrawerOpen = isAaPanelOpen || isThemePanelOpen || isTocOpen || isSearchOpen || isBookmarkDrawerOpen || isAnnotationDrawerOpen || isNoteEditorOpen || !!selectedAnnotationForDetail || isAudioSheetOpen || isTranslatePanelOpen;
  const isProtectedLilyHubBook = currentBook?.source?.type === 'lilyhub';

  // Floating text selection state
  const [selectionData, setSelectionData] = useState<{
    text: string;
    paragraphIndex?: number;
    startOffset?: number;
    endOffset?: number;
    isCrossParagraph?: boolean;
    x: number;
    y: number;
    isMobile: boolean;
  } | null>(null);

  // App-default paper follows system appearance; custom paper keeps its own status bar.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const appColor = () => APP_THEME_STATUS_BAR_COLOR[appTheme === 'system' ? (media.matches ? 'dark' : 'light') : appTheme];
    const sync = () => setStatusBarColor(activeTheme.id === 'theme-app' ? appColor() : activeTheme.previewBg || appColor());
    sync();
    media.addEventListener('change', sync);
    return () => { media.removeEventListener('change', sync); setStatusBarColor(appColor()); };
  }, [activeTheme, appTheme]);

  // Text selection change listener (strictly scoped to reading article)
  useEffect(() => {
    // Some Android browsers show their own native selection UI once a
    // selection settles — a copy/share bar, or on some devices/OS versions
    // a "Search Google for <word>" sheet — regardless of the contextmenu
    // suppression elsewhere in this file (that guards long-press
    // specifically; this native UI can also appear after a double-tap word
    // selection). Once a selection has been quiet for a moment we release
    // it ourselves, leaving nothing for that native UI to attach to — our
    // own floating toolbar (which renders its own preview of the selected
    // text below) takes over instead. releaseTimer is debounced against
    // selectionchange itself, not fired eagerly on gesture end, because a
    // double/triple-click or a drag-to-extend fires several selectionchange
    // events while the browser progressively builds up the final selection
    // — clearing on the first one would abort that before it finishes.
    let releaseTimer: number | null = null;
    let ignoreNextChange = false;
    const handleSelectionChange = () => {
      if (ignoreNextChange) {
        ignoreNextChange = false;
        return;
      }
      if (releaseTimer) {
        window.clearTimeout(releaseTimer);
        releaseTimer = null;
      }
      if (isProtectedLilyHubBook) {
        window.getSelection()?.removeAllRanges();
        setSelectionData(null);
        return;
      }
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        setSelectionData(null);
        return;
      }

      const rawSelected = selection.toString();
      const trimmed = rawSelected.trim();
      if (trimmed.length < 2) {
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

      // Helper to find closest paragraph index
      const findParagraphIndex = (node: Node): number | undefined => {
        let el = node instanceof HTMLElement ? node : node.parentElement;
        while (el && el !== articleEl) {
          if (el.id && el.id.startsWith('reader-p-')) {
            const parsed = parseInt(el.id.replace('reader-p-', ''), 10);
            if (!isNaN(parsed)) return parsed;
          }
          el = el.parentElement;
        }
        return undefined;
      };

      const anchorPIndex = findParagraphIndex(anchorNode);
      const focusPIndex = findParagraphIndex(focusNode);

      let pIndex = anchorPIndex !== undefined ? anchorPIndex : focusPIndex;
      const isCrossParagraph = anchorPIndex !== undefined && focusPIndex !== undefined && anchorPIndex !== focusPIndex;

      // Calculate character offset inside target paragraph element
      let startOffset = 0;
      let endOffset = trimmed.length;

      if (pIndex !== undefined && !isCrossParagraph) {
        try {
          const range = selection.getRangeAt(0);
          const pEl = document.getElementById(`reader-p-${pIndex}`);
          if (pEl) {
            const preRange = range.cloneRange();
            preRange.selectNodeContents(pEl);
            preRange.setEnd(range.startContainer, range.startOffset);
            startOffset = preRange.toString().length + (rawSelected.length - rawSelected.trimStart().length);
            endOffset = startOffset + trimmed.length;
          }
        } catch {}
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const isMobile = window.innerWidth < 640;

      // Position toolbar above the selection or dock on bottom
      const x = Math.max(16, Math.min(window.innerWidth - 260, rect.left + rect.width / 2 - 130));
      const y = Math.max(70, rect.top - 48);

      setSelectionData({
        text: trimmed,
        paragraphIndex: pIndex,
        startOffset,
        endOffset,
        isCrossParagraph,
        x,
        y,
        isMobile,
      });

      releaseTimer = window.setTimeout(() => {
        releaseTimer = null;
        const current = window.getSelection();
        if (current && !current.isCollapsed && current.rangeCount) {
          ignoreNextChange = true;
          current.removeAllRanges();
        }
      }, 400);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (releaseTimer) window.clearTimeout(releaseTimer);
    };
  }, [isProtectedLilyHubBook]);

  // Dismissing the floating toolbar on an outside tap used to happen for
  // free (tapping elsewhere cleared the native selection, which fired
  // selectionchange). Now that we release that selection ourselves as soon
  // as the gesture ends, an outside tap has nothing left to clear, so
  // nothing fires selectionchange again — listen for it explicitly instead.
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (selectionToolbarRef.current && event.target instanceof Node && !selectionToolbarRef.current.contains(event.target)) {
        setSelectionData(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // Smart pause auto-scroll when user interacts with panels or text selection
  useEffect(() => {
    if (isAnyDrawerOpen || selectionData !== null) {
      setIsAutoScrollPaused(true);
    }
  }, [isAnyDrawerOpen, selectionData]);

  const handleInstantHighlight = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectionData) return;

    if (selectionData.isCrossParagraph || selectionData.paragraphIndex === undefined) {
      showToast(t("Hãy chọn nội dung trong cùng một đoạn để đánh dấu."), 'info');
      return;
    }

    await saveHighlight(
      selectionData.text,
      selectionData.paragraphIndex,
      selectionData.startOffset ?? 0,
      selectionData.endOffset ?? selectionData.text.length,
      'yellow'
    );

    window.getSelection()?.removeAllRanges();
    setSelectionData(null);
  };

  const handleOpenNoteEditorFromSelection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectionData) return;

    if (selectionData.isCrossParagraph || selectionData.paragraphIndex === undefined) {
      showToast(t("Hãy chọn nội dung trong cùng một đoạn để ghi chú."), 'info');
      return;
    }

    openNoteEditor({
      selectedText: selectionData.text,
      paragraphIndex: selectionData.paragraphIndex,
      startOffset: selectionData.startOffset ?? 0,
      endOffset: selectionData.endOffset ?? selectionData.text.length,
      color: 'yellow',
    });

    window.getSelection()?.removeAllRanges();
    setSelectionData(null);
  };

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
      showToast(t("Đoạn trích quá dài để tạo ảnh. Hãy chọn ngắn hơn."), 'info');
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

  // Restore scroll position accurately ONCE per chapter load
  const hasRestoredScrollRef = useRef(false);

  useEffect(() => {
    hasRestoredScrollRef.current = false;
  }, [currentChapterIndex]);

  useEffect(() => {
    if (!isLoadingChapter && !hasRestoredScrollRef.current && scrollContainerRef.current) {
      if (initialScrollPercent > 0) {
        const el = scrollContainerRef.current;
        const maxScrollable = el.scrollHeight - el.clientHeight;
        if (maxScrollable > 0) {
          hasRestoredScrollRef.current = true;
          const targetScroll = (maxScrollable * initialScrollPercent) / 100;
          el.scrollTo({ top: targetScroll, behavior: 'instant' });
        }
      } else {
        hasRestoredScrollRef.current = true;
      }
    }
  }, [isLoadingChapter, initialScrollPercent]);

  // Jump to specific paragraph with Locator Resilience (Paragraph ID -> Scroll into view & pulse)
  useEffect(() => {
    if (!isLoadingChapter && targetParagraphIndex !== null) {
      let targetEl = document.getElementById(`reader-p-${targetParagraphIndex}`);

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.add('reader-highlight-focus', 'rounded-xl', 'p-1.5', 'transition-all');
        setTimeout(() => {
          targetEl?.classList.remove('reader-highlight-focus', 'p-1.5');
        }, 2600);
      }
      setTargetParagraphIndex(null);
    }
  }, [isLoadingChapter, targetParagraphIndex, setTargetParagraphIndex]);

  // Track scroll position & Auto-hide controls on scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current || isLoadingChapter) return;
    const el = scrollContainerRef.current;
    const currentScrollTop = el.scrollTop;
    const maxScrollable = el.scrollHeight - el.clientHeight;
    const scrollPercent = maxScrollable > 0
      ? Math.round((currentScrollTop / maxScrollable) * 100)
      : 0;
    saveScrollPosition(scrollPercent, currentScrollTop);

    // Auto-hide controls when user is actively scrolling and no modal/panel is open
    if (!isAnyDrawerOpen && isToolbarVisible && Math.abs(currentScrollTop - lastScrollTopRef.current) > 35) {
      hideToolbar();
    }
    lastScrollTopRef.current = currentScrollTop;
  };

  // Auto scroll effect when in 'auto' mode. Ticks at ~60/sec (instead of the old
  // 10/sec) and moves by real elapsed time rather than a fixed pixel-per-tick
  // amount, so motion looks continuous and stays correctly paced even if a tick
  // is delayed. Uses setInterval rather than requestAnimationFrame on purpose:
  // rAF is throttled hard by the browser when the window loses focus (even while
  // still visible), which would silently stall a long-running reading aid.
  useEffect(() => {
    if (settings.readingMode !== 'auto' || isAutoScrollPaused) return;

    const pixelsPerSecond = settings.autoScrollSpeed * 5.5;
    let lastTime = performance.now();

    const intervalId = setInterval(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const now = performance.now();
      const deltaSeconds = (now - lastTime) / 1000;
      lastTime = now;

      const maxScroll = el.scrollHeight - el.clientHeight;
      if (el.scrollTop >= maxScroll - 1) {
        // Graceful pause at bottom of chapter
        setIsAutoScrollPaused(true);
        return;
      }
      el.scrollTop += pixelsPerSecond * deltaSeconds;
    }, 16);

    return () => clearInterval(intervalId);
  }, [settings.readingMode, settings.autoScrollSpeed, isAutoScrollPaused]);

  useEffect(() => {
    if (settings.readingMode !== 'auto') setIsAutoScrollPaused(false);
  }, [settings.readingMode]);

  // Page width calculation
  const maxWidthClass = {
    narrow: 'max-w-xl',
    normal: 'max-w-3xl',
    wide: 'max-w-5xl',
    full: 'max-w-full',
  }[settings.pageWidth];

  // Font family, sizing and layout styling
  const fontStyle: React.CSSProperties = {
    fontFamily: settings.fontFamily === 'Plus Jakarta Sans' ? '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif'
      : settings.fontFamily === 'Be Vietnam Pro' ? '"Be Vietnam Pro", sans-serif'
      : settings.fontFamily === 'Merriweather' ? '"Merriweather", serif'
      : settings.fontFamily === 'Playfair Display' ? '"Playfair Display", serif'
      : settings.fontFamily === 'Inter' ? '"Inter", sans-serif'
      : settings.fontFamily === 'Lora' ? '"Lora", Georgia, serif'
      : settings.fontFamily === 'PT Serif' ? '"PT Serif", Georgia, serif'
      : settings.fontFamily === 'Noto Serif' ? '"Noto Serif", Georgia, serif'
      : '"Literata", Georgia, serif',
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    fontWeight: settings.fontWeight === 'semibold' ? 600 : settings.fontWeight === 'medium' ? 500 : 400,
    textAlign: settings.textAlign,
    letterSpacing: settings.letterSpacing !== undefined ? `${settings.letterSpacing}em` : undefined,
  };

  const calculateProgress = Math.round(((currentChapterIndex - firstChapterIndex + 1) / totalChapters) * 100);

  // Real reading time calculations based on ~220 words/minute
  const chapterWordCount = currentChapterContent.reduce((acc, p) => acc + (p.split(/\s+/).filter(Boolean).length), 0);
  const estimatedChapterMinutes = Math.max(1, Math.ceil(chapterWordCount / 220));

  const avgWordsPerChapter = currentBook?.wordCount && totalChapters > 0
    ? Math.round(currentBook.wordCount / totalChapters)
    : 2200;
  const remainingChapters = Math.max(0, lastChapterIndex - currentChapterIndex);
  const remainingWords = remainingChapters * avgWordsPerChapter;
  const totalRemainingMinutes = Math.round(remainingWords / 220);
  const remHours = Math.floor(totalRemainingMinutes / 60);
  const remMins = totalRemainingMinutes % 60;
  const estimatedTotalTime = remHours > 0
    ? t("{0} giờ {1}", [remHours, remMins > 0 ? t("{0} phút", [remMins]) : ''])
    : t("{0} phút", [Math.max(1, remMins)]);

  // Note editor save handler
  const handleSaveNoteModal = async (noteText: string, color: HighlightColor) => {
    if (!noteEditorData) return;
    const saved = await saveNote(
      noteEditorData.selectedText,
      noteEditorData.paragraphIndex,
      noteEditorData.startOffset,
      noteEditorData.endOffset,
      noteText,
      color,
      noteEditorData.annotationId
    );
    if (!saved) throw new Error(t("Chưa thể lưu ghi chú. Nội dung đang nhập được giữ lại để thử lại."));
  };

  const handleEditNoteFromDetail = (ann: Annotation) => {
    openNoteEditor({
      annotationId: ann.id,
      bookId: ann.bookId,
      chapterIndex: ann.chapterIndex,
      chapterTitle: ann.chapterTitle,
      selectedText: ann.selectedText,
      paragraphIndex: ann.paragraphIndex,
      startOffset: ann.startOffset,
      endOffset: ann.endOffset,
      color: ann.color,
      initialNote: ann.note || '',
    });
  };

  const handleDeleteNoteFromDetail = async (id: string) => {
    await updateAnnotationNote(id, null);
    if (selectedAnnotationForDetail) {
      setSelectedAnnotationForDetail({ ...selectedAnnotationForDetail, note: null });
    }
  };

  const handleCreateQuoteFromDetail = (ann: Annotation) => {
    openQuoteEditor({
      text: ann.selectedText,
      bookTitle: currentBook?.title,
      chapterTitle: ann.chapterTitle || currentChapterTitle,
      author: currentBook?.author,
    });
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      onCopy={(event) => {
        if (isProtectedLilyHubBook && event.target instanceof Element && event.target.closest('#reader-article-content')) event.preventDefault();
      }}
      onCut={(event) => {
        if (isProtectedLilyHubBook && event.target instanceof Element && event.target.closest('#reader-article-content')) event.preventDefault();
      }}
      onContextMenu={(event) => {
        // Always suppress the native long-press selection menu inside the
        // article so our own selection toolbar (Đánh dấu/Ghi chú/...) is the
        // only UI shown, not just for DRM-protected LilyHub books.
        if (event.target instanceof Element && event.target.closest('#reader-article-content')) event.preventDefault();
      }}
      onDragStart={(event) => {
        if (isProtectedLilyHubBook && event.target instanceof Element && event.target.closest('#reader-article-content')) event.preventDefault();
      }}
      className={`reader-luxury h-screen h-[100dvh] w-full overflow-y-auto ${activeTheme.className} select-text relative`}
      style={{
        backgroundColor: 'var(--reader-bg, #FAF8F5)',
        color: 'var(--reader-text, #1F1C18)',
      }}
    >
      {/* Floating Toolbars & Bottom Sheets */}
      <ReaderToolbar />
      <AaSettingsSheet />
      <TranslateSheet />
      <TocDrawer />
      <SearchDrawer />
      <BookmarkDrawer />
      <AnnotationDrawer />
      <QuoteCardEditor />
      <AudioPlayerSheet />
      <MiniAudioPlayer />

      {/* Note Editor Modal */}
      <NoteEditorModal
        isOpen={isNoteEditorOpen}
        data={noteEditorData}
        onClose={closeNoteEditor}
        onSave={handleSaveNoteModal}
      />

      {/* Highlight Detail Popover / Bottom Sheet */}
      <HighlightDetailSheet
        annotation={selectedAnnotationForDetail}
        isOpen={!!selectedAnnotationForDetail}
        onClose={() => setSelectedAnnotationForDetail(null)}
        onEditNote={handleEditNoteFromDetail}
        onChangeColor={updateAnnotationColor}
        onDeleteNote={handleDeleteNoteFromDetail}
        onDeleteAnnotation={deleteAnnotationById}
        onCreateQuote={handleCreateQuoteFromDetail}
      />

      {/* Smart Auto Scroll Floating Controls Pill */}
      {settings.readingMode === 'auto' && (
        <div
          className="reader-auto-controls fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-40 flex items-center gap-1.5 rounded-full border border-white/20 bg-ink-950/90 py-1.5 px-3 text-xs font-semibold text-white shadow-modal backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Pause / Play */}
          <button
            onClick={() => setIsAutoScrollPaused(value => !value)}
            className="p-1 rounded-full hover:bg-white/20 active:scale-95 transition-all flex items-center gap-1.5"
            aria-label={isAutoScrollPaused ? t("Tiếp tục cuộn tự động") : t("Tạm dừng cuộn tự động")}
          >
            {isAutoScrollPaused ? <Play className="h-3.5 w-3.5 fill-white text-white" /> : <Pause className="h-3.5 w-3.5 fill-white text-white" />}
            <span className="text-[11px]">{isAutoScrollPaused ? t("Tiếp tục") : t("Tự cuộn")}</span>
          </button>

          <div className="w-px h-3.5 bg-white/20 mx-0.5" />

          {/* Speed Indicator & Adjust */}
          <div className="flex items-center gap-1 text-[11px] font-mono text-lily-300">
            <button
              onClick={() => updateSetting('autoScrollSpeed', Math.max(1, settings.autoScrollSpeed - 1))}
              disabled={settings.autoScrollSpeed <= 1}
              className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30"
              title={t("Giảm tốc độ")}
            >
              <Minus className="w-3 h-3" />
            </button>
            <span>{settings.autoScrollSpeed}x</span>
            <button
              onClick={() => updateSetting('autoScrollSpeed', Math.min(10, settings.autoScrollSpeed + 1))}
              disabled={settings.autoScrollSpeed >= 10}
              className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30"
              title={t("Tăng tốc độ")}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="w-px h-3.5 bg-white/20 mx-0.5" />

          {/* Exit Auto Scroll */}
          <button
            onClick={() => updateSetting('readingMode', 'scroll')}
            className="p-1 rounded-full text-ink-400 hover:text-white hover:bg-white/20 transition-colors"
            title={t("Tắt cuộn tự động")}
            aria-label={t("Tắt cuộn tự động")}
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Selection Toolbar: Đánh dấu · Ghi chú · Tạo ảnh · Lưu dấu */}
      {selectionData && (
        <div
          ref={selectionToolbarRef}
          style={{
            position: 'fixed',
            top: selectionData.isMobile ? undefined : `${selectionData.y}px`,
            left: selectionData.isMobile ? '50%' : `${selectionData.x}px`,
            bottom: selectionData.isMobile ? '24px' : undefined,
            transform: selectionData.isMobile ? 'translateX(-50%)' : undefined,
          }}
          className="z-50 bg-ink-950/95 text-white rounded-2xl shadow-modal border border-white/15 px-2 py-1.5 flex items-center gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Highlight Instant */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInstantHighlight}
            className="px-2.5 py-1.5 rounded-xl hover:bg-white/15 active:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title={t("Đánh dấu đoạn văn")}
          >
            <Highlighter className="w-3.5 h-3.5 text-amber-400" />
            <span>{t("Đánh dấu")}</span>
          </button>

          <div className="w-[1px] h-3.5 bg-white/20" />

          {/* Note */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleOpenNoteEditorFromSelection}
            className="px-2.5 py-1.5 rounded-xl hover:bg-white/15 active:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title={t("Thêm ghi chú cá nhân")}
          >
            <PenLine className="w-3.5 h-3.5 text-rose-400" />
            <span>{t("Ghi chú")}</span>
          </button>

          <div className="w-[1px] h-3.5 bg-white/20" />

          {/* Quote Card */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCreateQuote}
            className="px-2.5 py-1.5 rounded-xl hover:bg-white/15 active:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title={t("Tạo ảnh trích dẫn")}
          >
            <Mic2 className="w-3.5 h-3.5 text-lavender-400" />
            <span className="hidden sm:inline">{t("Trích đoạn")}</span>
            <span className="sm:hidden">{t("Ảnh")}</span>
          </button>

          <div className="w-[1px] h-3.5 bg-white/20" />

          {/* Bookmark */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleSaveBookmark}
            className="px-2.5 py-1.5 rounded-xl hover:bg-white/15 active:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title={t("Lưu dấu trang")}
          >
            <Bookmark className="w-3.5 h-3.5 text-lily-400" />
            <span>{t("Lưu")}</span>
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
              ) : readerError === 'JJWXC_LOCKED' ? (
                <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
              ) : readerError === 'JJWXC_SESSION_EXPIRED' ? (
                <LinkIcon className="w-6 h-6 sm:w-7 sm:h-7" />
              ) : readerError === 'JJWXC_NOT_CONFIGURED' ? (
                <Smartphone className="w-6 h-6 sm:w-7 sm:h-7" />
              ) : (
                <FileQuestion className="w-6 h-6 sm:w-7 sm:h-7" />
              )}
            </div>

            <div>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-ink-950">
                {readerError === 'BOOK_NOT_FOUND' && t("Không tìm thấy truyện")}
                {readerError === 'CHAPTER_NOT_FOUND' && t("Không thể mở Chương {0}", [currentChapterIndex])}
                {readerError === 'STORAGE_ERROR' && t("Không thể mở dữ liệu truyện")}
                {readerError === 'JJWXC_LOCKED' && t("Chương chưa mua")}
                {readerError === 'JJWXC_SESSION_EXPIRED' && t("Cần đăng nhập lại JJWXC")}
                {readerError === 'JJWXC_UNKNOWN_FORMAT' && t("Không đọc được chương này")}
                {readerError === 'JJWXC_NOT_CONFIGURED' && t("Chưa thể tải chương này")}
              </h2>
              <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                {readerError === 'BOOK_NOT_FOUND' && t("Cuốn truyện này chưa được lưu trên thiết bị hoặc đã bị xóa.")}
                {readerError === 'CHAPTER_NOT_FOUND' && t("Chương {0} hiện không có dữ liệu để đọc.", [currentChapterIndex])}
                {readerError === 'STORAGE_ERROR' && t("Lily chưa thể mở dữ liệu truyện trên thiết bị này.")}
                {readerError === 'JJWXC_LOCKED' && t("Chương này chưa được mua trên chính tài khoản JJWXC của bạn. Lily không mở khoá được nội dung chưa mua.")}
                {readerError === 'JJWXC_SESSION_EXPIRED' && t("Phiên đăng nhập JJWXC trên thiết bị này đã hết hạn hoặc chưa đăng nhập. Vào Cài đặt → Kết nối JJWXC để đăng nhập lại.")}
                {readerError === 'JJWXC_UNKNOWN_FORMAT' && t("Lily không nhận diện được nội dung trang này (có thể JJWXC đã đổi giao diện, hoặc mạng có vấn đề). Lily không đoán bừa nội dung.")}
                {readerError === 'JJWXC_NOT_CONFIGURED' && t("Lily chưa có cách tự động lấy nội dung chương này trên web. Tính năng đang được hoàn thiện.")}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigateTo('library')}
                className="px-4 py-2 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-cream-50"
              >
                {t("Về Thư viện")}</button>
              <button
                onClick={retryLoadChapter}
                className="px-5 py-2 rounded-xl bg-ink-950 text-white text-xs font-semibold shadow-soft flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t("Thử lại")}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Tap anywhere in reader body to toggle floating toolbars */
        <main
          ref={containerRef}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button, input, a, select, mark, textarea')) return;
            toggleToolbar();
          }}
          className={`reader-manuscript mx-auto pt-20 sm:pt-24 pb-28 sm:pb-32 cursor-pointer ${maxWidthClass} min-h-full flex flex-col transition-all`}
          style={{
            paddingLeft: `${settings.marginHorizontal || 24}px`,
            paddingRight: `${settings.marginHorizontal || 24}px`,
          }}
        >
          {/* Chapter Header */}
          <header className="reader-chapter-heading mb-8 pb-5 border-b transition-colors text-center" style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}>
            <div className="flex items-center justify-between text-xs opacity-65 mb-2 font-serif">
              <span className="truncate max-w-[180px] sm:max-w-[240px]">{(textLanguageMode === 'translated' && translatedBookTitle) || currentBook?.title || 'Lilyhub'}</span>
              <span>{t("Chương ")}{currentChapterIndex} / {lastChapterIndex}</span>
            </div>

            <h1 className="mt-3 font-serif font-semibold text-2xl sm:text-3xl md:text-4xl leading-snug text-balance">
              {(textLanguageMode === 'translated' && translatedChapterTitle) || currentChapterTitle || t("Chương {0}", [currentChapterIndex])}
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
            /* REAL READING BODY CONTENT WITH HIGHLIGHT PRESENTATION LAYER */
            <article
              id="reader-article-content"
              className={`reader-prose flex-1 ${isProtectedLilyHubBook ? 'select-none' : 'select-text'}`}
              style={fontStyle}
            >
              {textLanguageMode === 'translated' && translatedParagraphs ? (
                translatedParagraphs
                  .filter(p => !TextCleaner.isDecorativeDivider(p))
                  .map((paragraph, idx) => (
                    <p
                      id={`reader-p-${idx}`}
                      key={idx}
                      className={`leading-vietnamese ${settings.firstLineIndent ? 'indent-6 sm:indent-8' : ''}`}
                      style={{ marginBottom: `${settings.paragraphSpacing}em` }}
                    >
                      {paragraph}
                    </p>
                  ))
              ) : currentChapterContent
                .filter(p => !TextCleaner.isDecorativeDivider(p))
                .map((paragraph, idx) => {
                  // Resolve annotations for this paragraph
                  const pAnnotations = annotations.filter(a => a.paragraphIndex === idx);
                  const resolvedAnnotations = pAnnotations.map(a => {
                    const loc = AnnotationLocator.resolve(a, currentChapterContent);
                    return {
                      ...a,
                      startOffset: loc.startOffset,
                      endOffset: loc.endOffset,
                    };
                  });

                  const segments = AnnotationRenderer.sliceParagraph(paragraph, resolvedAnnotations);

                  return (
                    <p
                      id={`reader-p-${idx}`}
                      key={idx}
                      className={`leading-vietnamese ${settings.firstLineIndent ? 'indent-6 sm:indent-8' : ''}`}
                      style={{
                        marginBottom: `${settings.paragraphSpacing}em`,
                      }}
                    >
                      {segments.map((seg, sIdx) => {
                        if (!seg.annotation) {
                          return <React.Fragment key={sIdx}>{seg.text}</React.Fragment>;
                        }
                        const ann = seg.annotation;
                        return (
                          <mark
                            key={sIdx}
                            data-annotation-id={ann.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAnnotationForDetail(ann);
                            }}
                            className={`reader-highlight reader-highlight-${ann.color}`}
                            title={ann.note ? t("Ghi chú: {0}", [ann.note]) : t("Đoạn đánh dấu")}
                          >
                            {seg.text}
                            {ann.note && (
                              <span className="reader-note-dot" title={t("Có ghi chú")} />
                            )}
                          </mark>
                        );
                      })}
                    </p>
                  );
                })}
            </article>
          )}

          {/* End of Chapter & Navigation Cards */}
          <section className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t space-y-5 sm:space-y-6" style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}>
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <button
                onClick={(e) => { e.stopPropagation(); prevChapter(); }}
                disabled={currentChapterIndex <= firstChapterIndex || isLoadingChapter}
                className="flex-1 p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all disabled:opacity-30 flex items-center gap-2.5 sm:gap-3 group bg-white/30 hover:bg-white/60"
                style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs opacity-60">{t("Chương trước")}</div>
                  <div className="font-serif font-semibold text-xs sm:text-sm truncate">
                    {currentChapterIndex > firstChapterIndex ? t("Chương {0}", [currentChapterIndex - 1]) : t("Hết chương")}
                  </div>
                </div>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); nextChapter(); }}
                disabled={currentChapterIndex >= lastChapterIndex || isLoadingChapter}
                className="flex-1 p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-right transition-all disabled:opacity-30 flex items-center justify-end gap-2.5 sm:gap-3 group bg-white/30 hover:bg-white/60"
                style={{ borderColor: 'var(--reader-border, #EAE5DE)' }}
              >
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs opacity-60">{t("Chương sau")}</div>
                  <div className="font-serif font-semibold text-xs sm:text-sm truncate">
                    {currentChapterIndex < lastChapterIndex ? t("Chương {0}", [currentChapterIndex + 1]) : t("Hết truyện")}
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
                <span>{t("Xem trang chi tiết truyện")}</span>
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
                  <span>{t("Chương ")}{currentChapterIndex} / {lastChapterIndex} {t(" · Tiến độ ~")}{calculateProgress}%</span>
                )}
                {settings.footerDisplay === 'pages' && (
                  <span>{t("Chương ")}{currentChapterIndex} / {lastChapterIndex}</span>
                )}
                {settings.footerDisplay === 'time_chapter' && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{t("Còn khoảng ")}{estimatedChapterMinutes} {t(" phút hết chương")}</span>
                  </span>
                )}
                {settings.footerDisplay === 'time_book' && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{t("Còn khoảng ")}{estimatedTotalTime}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span>{t(activeTheme.name)}</span>
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
