import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { 
  ReaderSettings, 
  AudioPlayerState, 
  SearchResult,
  ReaderThemeOption,
  ReaderErrorType,
  Bookmark,
  Annotation,
  HighlightColor
} from '../types';
import { mockThemes } from '../mock/mockData';
import { useApp } from './AppContext';
import { 
  TtsQueue, 
  TtsTextPreprocessor, 
  TtsChunker, 
  NghiTtsEngine, 
  SystemSpeechEngine,
  AudioAccessManager,
  AudioAccess,
  VoiceInfo 
} from '../audio-engine';
import { presentVoice, getVoicePresentation } from '../audio-engine/voicePresentation';
import { canUseFeature as hasFeatureAccess } from '../config/features';
import { AnnotationLocator } from '../book-engine/annotation/AnnotationLocator';

export interface ChapterTocItem {
  index: number;
  title: string;
  wordCount: number;
  isRead: boolean;
  isCurrent: boolean;
}

export interface QuoteData {
  text: string;
  bookTitle?: string;
  chapterTitle?: string;
  author?: string;
  bookmarkId?: string;
}

export interface NoteEditorData {
  annotationId?: string;
  selectedText: string;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  color: HighlightColor;
  initialNote?: string;
}

export const FREE_THEME_IDS = new Set([
  'theme-white',
  'theme-cream',
  'theme-paper',
  'theme-gray',
  'theme-night',
]);

const SETTINGS_STORAGE_KEY = 'lily_reader_settings_v1';
const AUDIO_SETTINGS_STORAGE_KEY = 'lily_audio_settings_v1';

const defaultSettings: ReaderSettings = {
  fontFamily: 'Literata',
  fontSize: 18,
  fontWeight: 'normal',
  lineHeight: 1.85,
  paragraphSpacing: 1.2,
  letterSpacing: 0,
  pageWidth: 'normal',
  marginHorizontal: 24,
  textAlign: 'left',
  firstLineIndent: true,
  readingMode: 'scroll',
  autoScrollSpeed: 3,
  footerDisplay: 'percent',
  activeThemeId: 'theme-paper',
  selectedPreset: 'Thoải mái',
};

interface PersistedAudioSettings {
  voice: AudioPlayerState['voice'];
  playbackRate: number;
  autoNextChapter: boolean;
  readChapterTitle: boolean;
}

const loadPersistedAudioSettings = (): PersistedAudioSettings => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PersistedAudioSettings;
        // Bản cũ lưu sai ID `ngoc_huyen`; model NghiTTS thật có ID `ngochuyen`.
        if (parsed.voice === 'ngoc_huyen') parsed.voice = 'ngochuyen';
        return parsed;
      }
    }
  } catch {}
  return {
    voice: 'ngochuyen',
    playbackRate: 1.0,
    autoNextChapter: true,
    readChapterTitle: true,
  };
};

const savePersistedAudioSettings = (audioSettings: PersistedAudioSettings) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(audioSettings));
    }
  } catch {}
};

// Safe load settings from localStorage with fallback
const loadPersistedSettings = (userTier: string = 'free'): ReaderSettings => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return defaultSettings;
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return defaultSettings;

    const parsed = JSON.parse(stored) as Partial<ReaderSettings>;
    const merged: ReaderSettings = { ...defaultSettings, ...parsed };

    // Enforce 5 Free Themes for Free tier
    if (!hasFeatureAccess('premiumThemes', userTier as any) && (!merged.activeThemeId || !FREE_THEME_IDS.has(merged.activeThemeId))) {
      merged.activeThemeId = 'theme-paper';
    }

    // Validate activeThemeId exists in theme list
    if (!mockThemes.some(t => t.id === merged.activeThemeId)) {
      merged.activeThemeId = 'theme-paper';
    }

    return merged;
  } catch {
    return defaultSettings;
  }
};

const saveSettingsToStorage = (settings: ReaderSettings) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }
  } catch {}
};

interface ReaderContextType {
  settings: ReaderSettings;
  updateSetting: <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => void;
  applyPreset: (presetName: 'thoai-mai' | 'gon-gang' | 'sach-giay' | 'doc-dem' | 'ban-dem' | 'tieu-thuyet' | 'co-trang' | 'doc-lau' | string) => void;
  resetSettings: () => void;
  
  // Real Chapter Navigation & Content
  currentChapterIndex: number;
  currentChapterTitle: string;
  currentChapterContent: string[];
  totalChapters: number;
  chapterList: ChapterTocItem[];
  isLoadingChapter: boolean;
  readerError: ReaderErrorType;
  retryLoadChapter: () => void;
  initialScrollPercent: number;
  targetParagraphIndex: number | null;
  setTargetParagraphIndex: (idx: number | null) => void;
  jumpToChapter: (chapterIndex: number, targetParagraph?: number) => Promise<void>;
  jumpToSearchResult: (chapterIndex: number, paragraphIndex?: number) => Promise<void>;
  nextChapter: () => void;
  prevChapter: () => void;
  saveScrollPosition: (scrollPercent: number, scrollOffset: number) => void;
  
  // Immersive UI & Toolbars
  isToolbarVisible: boolean;
  toggleToolbar: () => void;
  hideToolbar: () => void;
  showToolbar: () => void;
  
  // Bottom Sheets & Panels
  isAaPanelOpen: boolean;
  setIsAaPanelOpen: (open: boolean) => void;
  isThemePanelOpen: boolean;
  setIsThemePanelOpen: (open: boolean) => void;
  isTocOpen: boolean;
  setIsTocOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isAudioSheetOpen: boolean;
  setIsAudioSheetOpen: (open: boolean) => void;
  isBookmarkDrawerOpen: boolean;
  setIsBookmarkDrawerOpen: (open: boolean) => void;
  isAnnotationDrawerOpen: boolean;
  setIsAnnotationDrawerOpen: (open: boolean) => void;
  isNoteEditorOpen: boolean;
  setIsNoteEditorOpen: (open: boolean) => void;
  noteEditorData: NoteEditorData | null;
  openNoteEditor: (data: NoteEditorData) => void;
  openNoteEditorForAnnotation: (ann: Annotation) => void;
  closeNoteEditor: () => void;
  selectedAnnotationForDetail: Annotation | null;
  setSelectedAnnotationForDetail: (ann: Annotation | null) => void;
  isQuoteEditorOpen: boolean;
  setIsQuoteEditorOpen: (open: boolean) => void;
  quoteData: QuoteData | null;
  openQuoteEditor: (data: QuoteData) => void;
  closeQuoteEditor: () => void;
  
  // Bookmarks (100% Free & Local IndexedDB)
  bookmarks: Bookmark[];
  saveBookmarkFromSelection: (selectedText: string, paragraphIndex?: number, startOffset?: number, endOffset?: number) => Promise<Bookmark | null>;
  deleteBookmarkById: (id: string) => Promise<void>;
  loadBookmarks: () => Promise<void>;
  jumpToBookmark: (bookmark: Bookmark) => Promise<void>;
  
  // Annotations (Highlights & Notes - 100% Free & Local IndexedDB)
  annotations: Annotation[];
  bookAnnotations: Annotation[];
  saveHighlight: (selectedText: string, paragraphIndex: number, startOffset: number, endOffset: number, color?: HighlightColor) => Promise<Annotation | null>;
  saveNote: (selectedText: string, paragraphIndex: number, startOffset: number, endOffset: number, noteText: string, color?: HighlightColor, annotationId?: string) => Promise<Annotation | null>;
  updateAnnotationNote: (id: string, noteText: string | null) => Promise<void>;
  updateAnnotationColor: (id: string, color: HighlightColor) => Promise<void>;
  deleteAnnotationById: (id: string) => Promise<void>;
  loadAnnotations: () => Promise<void>;
  jumpToAnnotation: (annotation: Annotation) => Promise<void>;

  // In-book Search (100% Free & Real Local IndexedDB)
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  searchError: string | null;
  
  // Real Local Audio Engine
  audioState: AudioPlayerState;
  audioAccess: AudioAccess;
  availableVoices: VoiceInfo[];
  togglePlayAudio: () => Promise<void>;
  seekAudio: (chunkIndex: number) => void;
  setAudioSpeed: (rate: number) => void;
  setAudioVoice: (voice: AudioPlayerState['voice']) => Promise<void>;
  setAudioSleepTimer: (minutes: number | null) => void;
  setAudioAutoNext: (enabled: boolean) => void;
  setAudioReadTitle: (enabled: boolean) => void;
  skip15Sec: (direction: 'forward' | 'backward') => void;
  closeAudioPlayer: () => void;
  toggleDevAudioAccess: (enabled?: boolean) => void;
  downloadVoiceModel: (voiceId: string) => Promise<void>;
  
  // Theme Info
  activeTheme: ReaderThemeOption;
  themes: ReaderThemeOption[];
}

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

export const ReaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, currentBook, localBookSource, updateBook, showToast, canUseFeature } = useApp();
  
  const [settings, setSettings] = useState<ReaderSettings>(() => loadPersistedSettings(user?.tier || 'free'));
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(1);
  const [currentChapterTitle, setCurrentChapterTitle] = useState<string>('Chương 1');
  const [currentChapterContent, setCurrentChapterContent] = useState<string[]>([]);
  const [chapterList, setChapterList] = useState<ChapterTocItem[]>([]);
  const totalChapters = currentBook?.totalChapters || chapterList.length || 1;
  const [isLoadingChapter, setIsLoadingChapter] = useState<boolean>(true);
  const [readerError, setReaderError] = useState<ReaderErrorType>(null);
  const [initialScrollPercent, setInitialScrollPercent] = useState<number>(0);
  const [targetParagraphIndex, setTargetParagraphIndex] = useState<number | null>(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState<boolean>(false);
  
  // Panels
  const [isAaPanelOpen, setIsAaPanelOpen] = useState<boolean>(false);
  const [isThemePanelOpen, setIsThemePanelOpen] = useState<boolean>(false);
  const [isTocOpen, setIsTocOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isAudioSheetOpen, setIsAudioSheetOpen] = useState<boolean>(false);
  const [isBookmarkDrawerOpen, setIsBookmarkDrawerOpen] = useState<boolean>(false);
  const [isAnnotationDrawerOpen, setIsAnnotationDrawerOpen] = useState<boolean>(false);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState<boolean>(false);
  const [noteEditorData, setNoteEditorData] = useState<NoteEditorData | null>(null);
  const [selectedAnnotationForDetail, setSelectedAnnotationForDetail] = useState<Annotation | null>(null);
  const [isQuoteEditorOpen, setIsQuoteEditorOpen] = useState<boolean>(false);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  
  // Bookmarks (Real Local IndexedDB)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  
  // Annotations (Real Local IndexedDB)
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [bookAnnotations, setBookAnnotations] = useState<Annotation[]>([]);
  
  // Search states (Real Local IndexedDB)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Audio state (Real Local TTS)
  const persistedAudio = useRef(loadPersistedAudioSettings()).current;
  const [audioAccess, setAudioAccess] = useState<AudioAccess>(() => AudioAccessManager.getAudioAccess());
  const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([]);

  const [audioState, setAudioState] = useState<AudioPlayerState>({
    status: 'READY',
    isPlaying: false,
    bookId: currentBook?.id || null,
    chapterIndex: 1,
    chapterTitle: 'Chương 1',
    currentChunkIndex: 0,
    totalChunks: 0,
    chunkProgressPercent: 0,
    activeParagraphIndex: 0,
    currentTime: 0,
    duration: 0,
    playbackRate: persistedAudio.playbackRate,
    voice: persistedAudio.voice,
    sleepTimer: null,
    isMiniPlayerVisible: false,
    isSheetOpen: false,
    autoNextChapter: persistedAudio.autoNextChapter,
    readChapterTitle: persistedAudio.readChapterTitle,
  });

  // Audio Engine & Queue Ref
  const ttsQueueRef = useRef<TtsQueue | null>(null);
  const audioStateRef = useRef(audioState);
  audioStateRef.current = audioState;

  if (!ttsQueueRef.current) {
    ttsQueueRef.current = new TtsQueue();
  }

  const refreshVoiceList = useCallback(async () => {
    try {
      const nghiVoices = await NghiTtsEngine.getInstance().getVoiceList();
      const sysVoices = await SystemSpeechEngine.getInstance().getVoiceList();
      setAvailableVoices([...nghiVoices, ...sysVoices].map(presentVoice));
    } catch {}
  }, []);

  // Load voices on mount
  useEffect(() => {
    refreshVoiceList();
  }, [refreshVoiceList]);

  // Refs for race condition & progress throttling
  const loadGenerationRef = useRef<number>(0);
  const lastSaveTimeRef = useRef<number>(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentBookRef = useRef(currentBook);
  const updateBookRef = useRef(updateBook);
  const pendingProgressRef = useRef<{
    chapterIndex: number;
    chapterTitle: string;
    scrollPercent: number;
    scrollOffset: number;
  } | null>(null);

  useEffect(() => {
    currentBookRef.current = currentBook;
    updateBookRef.current = updateBook;
  }, [currentBook, updateBook]);

  // Sync / validate persisted settings on user tier changes
  useEffect(() => {
    if (!canUseFeature('premiumThemes') && !FREE_THEME_IDS.has(settings.activeThemeId)) {
      setSettings(prev => {
        const next = { ...prev, activeThemeId: 'theme-paper' };
        saveSettingsToStorage(next);
        return next;
      });
    }
  }, [user?.tier, settings.activeThemeId]);

  // Flush pending reading progress immediately to IndexedDB
  const flushPendingProgress = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const pending = pendingProgressRef.current;
    const book = currentBookRef.current;
    if (pending && book?.id) {
      localBookSource.saveProgress(
        book.id,
        pending.chapterIndex,
        0,
        pending.chapterTitle,
        pending.scrollPercent,
        pending.scrollOffset
      ).catch(() => {});

      pendingProgressRef.current = null;
      lastSaveTimeRef.current = Date.now();
    }
  }, [localBookSource]);

  // Save scroll position with 1.5s throttling
  const saveScrollPosition = useCallback((scrollPercent: number, scrollOffset: number) => {
    const book = currentBookRef.current;
    if (!book?.id) return;

    pendingProgressRef.current = {
      chapterIndex: currentChapterIndex,
      chapterTitle: currentChapterTitle,
      scrollPercent: Math.round(scrollPercent * 100) / 100,
      scrollOffset: Math.round(scrollOffset),
    };

    const now = Date.now();
    if (now - lastSaveTimeRef.current >= 1500) {
      flushPendingProgress();
    } else if (!saveTimeoutRef.current) {
      saveTimeoutRef.current = setTimeout(flushPendingProgress, 1500);
    }
  }, [currentChapterIndex, currentChapterTitle, flushPendingProgress]);

  // Flush on page unload or visibility change
  useEffect(() => {
    const handleBeforeUnload = () => flushPendingProgress();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingProgress();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushPendingProgress();
    };
  }, [flushPendingProgress]);

  // Real TTS Queue Callback Registration
  useEffect(() => {
    if (!ttsQueueRef.current) return;

    ttsQueueRef.current.setCallbacks({
      onStatusChange: (status) => {
        setAudioState(prev => ({
          ...prev,
          status,
          isPlaying: status === 'PLAYING',
        }));
      },
      onChunkChange: (chunkIndex, paragraphIndex) => {
        setAudioState(prev => ({
          ...prev,
          currentChunkIndex: chunkIndex,
          activeParagraphIndex: paragraphIndex,
        }));
      },
      onProgress: (progress) => {
        setAudioState(prev => ({
          ...prev,
          currentChunkIndex: progress.currentChunkIndex,
          totalChunks: progress.totalChunks,
          chunkProgressPercent: progress.chunkProgressPercent,
          activeParagraphIndex: progress.activeParagraphIndex,
        }));
      },
      onChapterComplete: () => {
        const state = audioStateRef.current;
        const total = currentBookRef.current?.totalChapters || 1;
        if (state.autoNextChapter && state.chapterIndex < total) {
          showToast(`Đã đọc xong chương ${state.chapterIndex}. Chuyển sang chương ${state.chapterIndex + 1}…`, 'info');
          jumpToChapter(state.chapterIndex + 1);
        } else {
          showToast(`Đã hoàn thành audio chương ${state.chapterIndex}`, 'success');
        }
      },
      onError: (err) => {
        showToast(err.userFacingMessage, 'error');
        setAudioState(prev => ({
          ...prev,
          status: 'ERROR',
          isPlaying: false,
          error: err.userFacingMessage,
        }));
      },
    });
  }, [showToast]);

  // Load real chapter content from IndexedDB with Race-Condition Guard
  const loadChapterData = useCallback(async (targetChapter?: number, scrollPct?: number) => {
    const book = currentBookRef.current;
    if (!book) {
      setReaderError('BOOK_NOT_FOUND');
      setIsLoadingChapter(false);
      setCurrentChapterContent([]);
      return;
    }

    flushPendingProgress();

    const currentGeneration = ++loadGenerationRef.current;
    setReaderError(null);
    setIsLoadingChapter(true);

    try {
      let targetIndex = targetChapter;
      let targetScroll = scrollPct;

      if (targetIndex === undefined) {
        const progress = await localBookSource.getProgress(book.id);
        targetIndex = progress?.chapterIndex || book.currentChapter || 1;
        targetScroll = progress?.scrollPercent || 0;
      }

      if (loadGenerationRef.current !== currentGeneration) return;

      setCurrentChapterIndex(targetIndex);
      setInitialScrollPercent(targetScroll ?? 0);

      // Fetch chapter content
      const chapter = await localBookSource.getChapter(book.id, targetIndex);
      if (loadGenerationRef.current !== currentGeneration) return;

      let paragraphs: string[] = [];
      let chapterTitle = `Chương ${targetIndex}`;

      if (chapter) {
        chapterTitle = chapter.title;
        paragraphs = chapter.paragraphs && chapter.paragraphs.length > 0 
          ? chapter.paragraphs 
          : ['(Chương này chưa có nội dung đoạn văn.)'];
        setCurrentChapterTitle(chapter.title);
        setCurrentChapterContent(paragraphs);
        setReaderError(null);
      } else {
        setReaderError('CHAPTER_NOT_FOUND');
        setCurrentChapterContent([]);
      }

      // Fetch TOC list
      const realToc = await localBookSource.getChapterList(book.id);
      if (loadGenerationRef.current !== currentGeneration) return;

      if (realToc && realToc.length > 0) {
        setChapterList(realToc.map(c => ({
          ...c,
          isCurrent: c.index === targetIndex,
          isRead: c.index < targetIndex,
        })));
      } else {
        setChapterList([{
          index: 1,
          title: book.currentChapterTitle || 'Chương 1',
          wordCount: book.wordCount || 1000,
          isRead: false,
          isCurrent: true,
        }]);
      }

      // If Audio is playing, seamlessly transition audio queue to new chapter
      if (audioStateRef.current.isPlaying && ttsQueueRef.current && paragraphs.length > 0) {
        const preprocessed = TtsTextPreprocessor.prepareChapter(
          chapterTitle,
          paragraphs,
          audioStateRef.current.readChapterTitle
        );
        const chunks = TtsChunker.chunkChapter(preprocessed, targetIndex);
        setAudioState(prev => ({
          ...prev,
          chapterIndex: targetIndex,
          chapterTitle,
          totalChunks: chunks.length,
          currentChunkIndex: 0,
        }));
        ttsQueueRef.current.loadChapter(
          chunks,
          book.title,
          chapterTitle,
          audioStateRef.current.voice,
          audioStateRef.current.playbackRate,
          0
        );
      }
    } catch {
      if (loadGenerationRef.current === currentGeneration) {
        setReaderError('STORAGE_ERROR');
        setCurrentChapterContent([]);
      }
    } finally {
      if (loadGenerationRef.current === currentGeneration) {
        setIsLoadingChapter(false);
      }
    }
  }, [localBookSource, flushPendingProgress]);

  // Initial load on mount or currentBook ID change
  useEffect(() => {
    if (currentBook?.id) {
      loadChapterData();
    }
  }, [currentBook?.id, loadChapterData]);

  // Bookmarks Management
  const loadBookmarks = useCallback(async () => {
    const book = currentBookRef.current;
    if (!book?.id) {
      setBookmarks([]);
      return;
    }
    try {
      const list = await localBookSource.getBookmarksForBook(book.id);
      setBookmarks(list);
    } catch {
      setBookmarks([]);
    }
  }, [localBookSource]);

  useEffect(() => {
    if (currentBook?.id) {
      loadBookmarks();
    }
  }, [currentBook?.id, loadBookmarks]);

  const saveBookmarkFromSelection = async (
    selectedText: string,
    paragraphIndex?: number,
    startOffset?: number,
    endOffset?: number
  ): Promise<Bookmark | null> => {
    const book = currentBookRef.current;
    if (!book) return null;

    const trimmed = selectedText.trim();
    if (!trimmed) return null;

    try {
      const saved = await localBookSource.saveBookmark({
        bookId: book.id,
        chapterIndex: currentChapterIndex,
        chapterTitle: currentChapterTitle || `Chương ${currentChapterIndex}`,
        selectedText: trimmed,
        paragraphIndex,
        startOffset,
        endOffset,
      });

      await loadBookmarks();
      showToast('Đã lưu đoạn yêu thích.', 'success');
      return saved;
    } catch {
      showToast('Không thể lưu bookmark.', 'error');
      return null;
    }
  };

  const deleteBookmarkById = async (id: string) => {
    try {
      await localBookSource.deleteBookmark(id);
      await loadBookmarks();
      showToast('Đã xóa dấu trang.', 'info');
    } catch {
      showToast('Lỗi khi xóa dấu trang.', 'error');
    }
  };

  const jumpToBookmark = async (bookmark: Bookmark) => {
    if (bookmark.chapterIndex !== currentChapterIndex) {
      setTargetParagraphIndex(bookmark.paragraphIndex ?? 0);
      await loadChapterData(bookmark.chapterIndex, 0);
    } else {
      setTargetParagraphIndex(bookmark.paragraphIndex ?? 0);
    }
    setIsBookmarkDrawerOpen(false);
  };

  // Annotations Management (Highlights & Notes)
  const loadAnnotations = useCallback(async () => {
    const book = currentBookRef.current;
    if (!book?.id) {
      setAnnotations([]);
      setBookAnnotations([]);
      return;
    }
    try {
      const [allList, chapterList] = await Promise.all([
        localBookSource.getAnnotationsForBook(book.id),
        localBookSource.getAnnotationsForChapter(book.id, currentChapterIndex)
      ]);
      setBookAnnotations(allList);
      setAnnotations(chapterList);
    } catch {
      setAnnotations([]);
      setBookAnnotations([]);
    }
  }, [localBookSource, currentChapterIndex]);

  useEffect(() => {
    if (currentBook?.id) {
      loadAnnotations();
    }
  }, [currentBook?.id, currentChapterIndex, loadAnnotations]);

  const saveHighlight = async (
    selectedText: string,
    paragraphIndex: number,
    startOffset: number,
    endOffset: number,
    color: HighlightColor = 'yellow'
  ): Promise<Annotation | null> => {
    const book = currentBookRef.current;
    if (!book) return null;

    const trimmed = selectedText.trim();
    if (!trimmed) return null;

    const currentParagraph = currentChapterContent[paragraphIndex] || '';
    const { prefix, suffix } = AnnotationLocator.extractContext(currentParagraph, startOffset, endOffset);

    try {
      const saved = await localBookSource.saveAnnotation({
        bookId: book.id,
        chapterIndex: currentChapterIndex,
        chapterTitle: currentChapterTitle || `Chương ${currentChapterIndex}`,
        selectedText: trimmed,
        paragraphIndex,
        startOffset,
        endOffset,
        prefix,
        suffix,
        color,
        note: null,
      });

      await loadAnnotations();
      showToast('Đã đánh dấu đoạn văn.', 'success');
      return saved;
    } catch {
      showToast('Chưa thể lưu đánh dấu. Hãy thử lại.', 'error');
      return null;
    }
  };

  const saveNote = async (
    selectedText: string,
    paragraphIndex: number,
    startOffset: number,
    endOffset: number,
    noteText: string,
    color: HighlightColor = 'yellow',
    annotationId?: string
  ): Promise<Annotation | null> => {
    const book = currentBookRef.current;
    if (!book) return null;

    const trimmed = selectedText.trim();
    if (!trimmed) return null;

    const currentParagraph = currentChapterContent[paragraphIndex] || '';
    const { prefix, suffix } = AnnotationLocator.extractContext(currentParagraph, startOffset, endOffset);

    try {
      const saved = await localBookSource.saveAnnotation({
        id: annotationId,
        bookId: book.id,
        chapterIndex: currentChapterIndex,
        chapterTitle: currentChapterTitle || `Chương ${currentChapterIndex}`,
        selectedText: trimmed,
        paragraphIndex,
        startOffset,
        endOffset,
        prefix,
        suffix,
        color,
        note: noteText.trim() || null,
      });

      await loadAnnotations();
      showToast(annotationId ? 'Đã cập nhật ghi chú.' : 'Đã lưu ghi chú.', 'success');
      return saved;
    } catch {
      showToast('Chưa thể lưu ghi chú. Hãy thử lại.', 'error');
      return null;
    }
  };

  const updateAnnotationNote = async (id: string, noteText: string | null) => {
    try {
      await localBookSource.updateAnnotation(id, { note: noteText });
      await loadAnnotations();
      showToast('Đã cập nhật ghi chú.', 'success');
    } catch {
      showToast('Chưa thể cập nhật ghi chú.', 'error');
    }
  };

  const updateAnnotationColor = async (id: string, color: HighlightColor) => {
    try {
      await localBookSource.updateAnnotation(id, { color });
      await loadAnnotations();
    } catch {
      showToast('Chưa thể đổi màu đánh dấu.', 'error');
    }
  };

  const deleteAnnotationById = async (id: string) => {
    try {
      await localBookSource.deleteAnnotation(id);
      await loadAnnotations();
      showToast('Đã xóa đánh dấu.', 'info');
    } catch {
      showToast('Lỗi khi xóa đánh dấu.', 'error');
    }
  };

  const jumpToAnnotation = async (annotation: Annotation) => {
    setIsAnnotationDrawerOpen(false);
    if (annotation.chapterIndex !== currentChapterIndex) {
      setTargetParagraphIndex(annotation.paragraphIndex ?? 0);
      await loadChapterData(annotation.chapterIndex, 0);
    } else {
      setTargetParagraphIndex(annotation.paragraphIndex ?? 0);
    }
  };

  const openNoteEditor = (data: NoteEditorData) => {
    setNoteEditorData(data);
    setIsNoteEditorOpen(true);
  };

  const openNoteEditorForAnnotation = (ann: Annotation) => {
    setIsAnnotationDrawerOpen(false);
    setNoteEditorData({
      annotationId: ann.id,
      selectedText: ann.selectedText,
      paragraphIndex: ann.paragraphIndex,
      startOffset: ann.startOffset,
      endOffset: ann.endOffset,
      color: ann.color,
      initialNote: ann.note || '',
    });
    setIsNoteEditorOpen(true);
  };

  const closeNoteEditor = () => {
    setIsNoteEditorOpen(false);
    setNoteEditorData(null);
  };

  const openQuoteEditor = (data: QuoteData) => {
    setQuoteData(data);
    setIsQuoteEditorOpen(true);
  };

  const closeQuoteEditor = () => {
    setIsQuoteEditorOpen(false);
    setQuoteData(null);
  };

  const PRESET_DEFINITIONS: Record<string, Partial<ReaderSettings> & { label: string }> = {
    'thoai-mai': {
      fontFamily: 'Literata',
      fontSize: 19,
      fontWeight: 'normal',
      lineHeight: 1.85,
      paragraphSpacing: 1.3,
      letterSpacing: 0,
      marginHorizontal: 24,
      firstLineIndent: true,
      textAlign: 'left',
      activeThemeId: 'theme-paper',
      selectedPreset: 'Thoải mái',
      label: 'Thoải mái',
    },
    'gon-gang': {
      fontFamily: 'Be Vietnam Pro',
      fontSize: 17,
      fontWeight: 'normal',
      lineHeight: 1.65,
      paragraphSpacing: 1.0,
      letterSpacing: 0,
      marginHorizontal: 16,
      firstLineIndent: false,
      textAlign: 'left',
      activeThemeId: 'theme-cream',
      selectedPreset: 'Gọn gàng',
      label: 'Gọn gàng',
    },
    'sach-giay': {
      fontFamily: 'Merriweather',
      fontSize: 18,
      fontWeight: 'normal',
      lineHeight: 1.9,
      paragraphSpacing: 1.2,
      letterSpacing: 0.01,
      marginHorizontal: 28,
      firstLineIndent: true,
      textAlign: 'justify',
      activeThemeId: 'theme-paper',
      selectedPreset: 'Sách giấy',
      label: 'Sách giấy',
    },
    'doc-dem': {
      fontFamily: 'Literata',
      fontSize: 18,
      fontWeight: 'normal',
      lineHeight: 1.85,
      paragraphSpacing: 1.3,
      letterSpacing: 0,
      marginHorizontal: 24,
      firstLineIndent: true,
      textAlign: 'left',
      activeThemeId: 'theme-night',
      selectedPreset: 'Đọc đêm',
      label: 'Đọc đêm',
    },
    // Backwards-compatible legacy names
    'tieu-thuyet': {
      fontFamily: 'Literata',
      fontSize: 19,
      fontWeight: 'normal',
      lineHeight: 1.85,
      paragraphSpacing: 1.3,
      letterSpacing: 0,
      marginHorizontal: 24,
      firstLineIndent: true,
      textAlign: 'left',
      activeThemeId: 'theme-paper',
      selectedPreset: 'Thoải mái',
      label: 'Thoải mái',
    },
    'ban-dem': {
      fontFamily: 'Literata',
      fontSize: 18,
      fontWeight: 'normal',
      lineHeight: 1.85,
      paragraphSpacing: 1.3,
      letterSpacing: 0,
      marginHorizontal: 24,
      firstLineIndent: true,
      textAlign: 'left',
      activeThemeId: 'theme-night',
      selectedPreset: 'Đọc đêm',
      label: 'Đọc đêm',
    },
    'co-trang': {
      fontFamily: 'Playfair Display',
      fontSize: 19,
      fontWeight: 'normal',
      lineHeight: 1.9,
      paragraphSpacing: 1.4,
      letterSpacing: 0.01,
      marginHorizontal: 28,
      firstLineIndent: true,
      textAlign: 'left',
      activeThemeId: 'theme-cream',
      selectedPreset: 'Cổ trang',
      label: 'Cổ trang',
    },
    'doc-lau': {
      fontFamily: 'Be Vietnam Pro',
      fontSize: 18,
      fontWeight: 'normal',
      lineHeight: 1.75,
      paragraphSpacing: 1.1,
      letterSpacing: 0,
      marginHorizontal: 20,
      firstLineIndent: false,
      textAlign: 'left',
      activeThemeId: 'theme-paper',
      selectedPreset: 'Đọc lâu',
      label: 'Đọc lâu',
    },
  };

  const updateSetting = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      // If user customizes typography or theme specifically, automatically transition preset to 'Tùy chỉnh'
      if (
        key !== 'selectedPreset' && 
        key !== 'readingMode' && 
        key !== 'autoScrollSpeed' && 
        key !== 'footerDisplay'
      ) {
        next.selectedPreset = 'Tùy chỉnh';
      }
      saveSettingsToStorage(next);
      return next;
    });
  };

  const applyPreset = (presetName: string) => {
    const target = PRESET_DEFINITIONS[presetName];
    if (target) {
      const { label, ...settingsPatch } = target;
      setSettings(prev => {
        const next = { ...prev, ...settingsPatch };
        saveSettingsToStorage(next);
        return next;
      });
      showToast(`Đã áp dụng mẫu đọc: ${label}`, 'success');
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    saveSettingsToStorage(defaultSettings);
    showToast('Đã đặt lại cài đặt đọc sách', 'info');
  };

  const retryLoadChapter = () => loadChapterData(currentChapterIndex);

  const jumpToChapter = async (chapterIndex: number, targetParagraph?: number) => {
    if (targetParagraph !== undefined) {
      setTargetParagraphIndex(targetParagraph);
    } else {
      setTargetParagraphIndex(null);
    }
    await loadChapterData(chapterIndex, 0);
  };

  const jumpToSearchResult = async (chapterIndex: number, paragraphIndex?: number) => {
    setIsSearchOpen(false);
    if (paragraphIndex !== undefined) {
      setTargetParagraphIndex(paragraphIndex);
    }
    await loadChapterData(chapterIndex, 0);
  };

  const nextChapter = () => {
    if (currentChapterIndex < (currentBook?.totalChapters || 1)) {
      jumpToChapter(currentChapterIndex + 1);
    }
  };

  const prevChapter = () => {
    if (currentChapterIndex > 1) {
      jumpToChapter(currentChapterIndex - 1);
    }
  };

  // Full-book IndexedDB search with debounce
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !currentBook?.id) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const results = await localBookSource.searchInBook(currentBook.id, trimmed, 50);
        setSearchResults(results);
      } catch (err: any) {
        setSearchError(err?.message || 'Không thể tìm kiếm trong bộ nhớ thiết bị');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentBook?.id, localBookSource]);

  const toggleToolbar = () => setIsToolbarVisible(prev => !prev);
  const hideToolbar = () => setIsToolbarVisible(false);
  const showToolbar = () => setIsToolbarVisible(true);

  // Audio Actions (Real Local TTS)
  const togglePlayAudio = async () => {
    // Check entitlement (user tier audio/vip or dev enabled)
    const isEntitled = canUseFeature('audio') || AudioAccessManager.isAudioEnabled();
    if (!isEntitled) {
      showToast('Tính năng nghe hiện chưa khả dụng.', 'info');
      return;
    }

    if (audioState.isPlaying) {
      ttsQueueRef.current?.pause();
      return;
    }

    if (audioState.status === 'PAUSED') {
      ttsQueueRef.current?.resume();
      return;
    }

    // Safari grants delayed neural WAV playback per audio element. Prime the exact persistent
    // element synchronously, before preprocessing/download/inference consumes the user gesture.
    ttsQueueRef.current?.primeForUserGesture();

    // Start fresh chapter playback
    try {
      setAudioState(prev => ({
        ...prev,
        status: 'SYNTHESIZING',
        isMiniPlayerVisible: true,
        bookId: currentBook?.id || null,
        chapterIndex: currentChapterIndex,
        chapterTitle: currentChapterTitle,
      }));

      const preprocessed = TtsTextPreprocessor.prepareChapter(
        currentChapterTitle,
        currentChapterContent,
        audioState.readChapterTitle
      );

      const chunks = TtsChunker.chunkChapter(preprocessed, currentChapterIndex);

      setAudioState(prev => ({
        ...prev,
        totalChunks: chunks.length,
        currentChunkIndex: 0,
      }));

      await ttsQueueRef.current?.loadChapter(
        chunks,
        currentBook?.title || 'Truyện',
        currentChapterTitle || `Chương ${currentChapterIndex}`,
        audioState.voice,
        audioState.playbackRate,
        0
      );
    } catch (err: any) {
      if (
        err?.name === 'AbortError' || 
        err?.message?.includes('interrupted') ||
        err?.message?.includes('pause')
      ) {
        return;
      }
      showToast(err.message || 'Lỗi khi phát Audio', 'error');
      setAudioState(prev => ({
        ...prev,
        status: 'ERROR',
        isPlaying: false,
        error: err.message,
      }));
    }
  };

  const seekAudio = (chunkIndex: number) => {
    const targetChunk = Math.max(0, Math.min(chunkIndex, audioState.totalChunks - 1));
    const preprocessed = TtsTextPreprocessor.prepareChapter(
      currentChapterTitle,
      currentChapterContent,
      audioState.readChapterTitle
    );
    const chunks = TtsChunker.chunkChapter(preprocessed, currentChapterIndex);

    ttsQueueRef.current?.loadChapter(
      chunks,
      currentBook?.title || 'Truyện',
      currentChapterTitle,
      audioState.voice,
      audioState.playbackRate,
      targetChunk
    );
  };

  const setAudioSpeed = (rate: number) => {
    setAudioState(prev => {
      const next = { ...prev, playbackRate: rate };
      savePersistedAudioSettings({
        voice: next.voice,
        playbackRate: next.playbackRate,
        autoNextChapter: next.autoNextChapter,
        readChapterTitle: next.readChapterTitle,
      });
      return next;
    });
    ttsQueueRef.current?.setPlaybackRate(rate);
  };

  const setAudioVoice = async (voice: AudioPlayerState['voice']) => {
    setAudioState(prev => {
      const next = { ...prev, voice };
      savePersistedAudioSettings({
        voice: next.voice,
        playbackRate: next.playbackRate,
        autoNextChapter: next.autoNextChapter,
        readChapterTitle: next.readChapterTitle,
      });
      return next;
    });
    ttsQueueRef.current?.setVoice(voice);
  };

  const setAudioSleepTimer = (minutes: number | null) => {
    setAudioState(prev => ({ ...prev, sleepTimer: minutes }));
    ttsQueueRef.current?.setSleepTimer(minutes);
    if (minutes) {
      showToast(`Đã hẹn giờ tắt sau ${minutes} phút`, 'info');
    } else {
      showToast('Đã tắt hẹn giờ', 'info');
    }
  };

  const setAudioAutoNext = (enabled: boolean) => {
    setAudioState(prev => {
      const next = { ...prev, autoNextChapter: enabled };
      savePersistedAudioSettings({
        voice: next.voice,
        playbackRate: next.playbackRate,
        autoNextChapter: next.autoNextChapter,
        readChapterTitle: next.readChapterTitle,
      });
      return next;
    });
  };

  const setAudioReadTitle = (enabled: boolean) => {
    setAudioState(prev => {
      const next = { ...prev, readChapterTitle: enabled };
      savePersistedAudioSettings({
        voice: next.voice,
        playbackRate: next.playbackRate,
        autoNextChapter: next.autoNextChapter,
        readChapterTitle: next.readChapterTitle,
      });
      return next;
    });
  };

  const skip15Sec = (direction: 'forward' | 'backward') => {
    const delta = direction === 'forward' ? 1 : -1;
    const nextChunk = Math.max(0, Math.min(audioState.totalChunks - 1, audioState.currentChunkIndex + delta));
    seekAudio(nextChunk);
  };

  const closeAudioPlayer = () => {
    ttsQueueRef.current?.stop();
    setAudioState(prev => ({
      ...prev,
      status: 'READY',
      isPlaying: false,
      isMiniPlayerVisible: false,
      isSheetOpen: false,
    }));
  };

  const toggleDevAudioAccess = (enabled?: boolean) => {
    const next = AudioAccessManager.toggleDevAudio(enabled);
    setAudioAccess(AudioAccessManager.getAudioAccess());
    showToast(next ? 'Đã bật Audio Engine thử nghiệm' : 'Đã tắt Audio Engine', 'info');
  };

  const downloadVoiceModel = async (voiceId: string) => {
    try {
      const voiceName = getVoicePresentation(voiceId).name;
      showToast(`Đang tải ${voiceName}…`, 'info');
      await NghiTtsEngine.getInstance().downloadVoice(voiceId);
      await refreshVoiceList();
      showToast(`${voiceName} đã sẵn sàng để nghe offline.`, 'success');
    } catch (err: any) {
      console.error('Voice download failed:', err);
      showToast('Không thể tải giọng đọc lúc này. Vui lòng thử lại.', 'error');
    }
  };

  const activeTheme = mockThemes.find(t => t.id === settings.activeThemeId) || mockThemes[2];

  return (
    <ReaderContext.Provider
      value={{
        settings,
        updateSetting,
        applyPreset,
        resetSettings,
        currentChapterIndex,
        currentChapterTitle,
        currentChapterContent,
        totalChapters,
        chapterList,
        isLoadingChapter,
        readerError,
        retryLoadChapter,
        initialScrollPercent,
        targetParagraphIndex,
        setTargetParagraphIndex,
        jumpToChapter,
        jumpToSearchResult,
        nextChapter,
        prevChapter,
        saveScrollPosition,
        isToolbarVisible,
        toggleToolbar,
        hideToolbar,
        showToolbar,
        isAaPanelOpen,
        setIsAaPanelOpen,
        isThemePanelOpen,
        setIsThemePanelOpen,
        isTocOpen,
        setIsTocOpen,
        isSearchOpen,
        setIsSearchOpen,
        isAudioSheetOpen,
        setIsAudioSheetOpen,
        isBookmarkDrawerOpen,
        setIsBookmarkDrawerOpen,
        isAnnotationDrawerOpen,
        setIsAnnotationDrawerOpen,
        isNoteEditorOpen,
        setIsNoteEditorOpen,
        noteEditorData,
        openNoteEditor,
        openNoteEditorForAnnotation,
        closeNoteEditor,
        selectedAnnotationForDetail,
        setSelectedAnnotationForDetail,
        isQuoteEditorOpen,
        setIsQuoteEditorOpen,
        quoteData,
        openQuoteEditor,
        closeQuoteEditor,
        bookmarks,
        saveBookmarkFromSelection,
        deleteBookmarkById,
        loadBookmarks,
        jumpToBookmark,
        annotations,
        bookAnnotations,
        saveHighlight,
        saveNote,
        updateAnnotationNote,
        updateAnnotationColor,
        deleteAnnotationById,
        loadAnnotations,
        jumpToAnnotation,
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        searchError,
        audioState,
        audioAccess,
        availableVoices,
        togglePlayAudio,
        seekAudio,
        setAudioSpeed,
        setAudioVoice,
        setAudioSleepTimer,
        setAudioAutoNext,
        setAudioReadTitle,
        skip15Sec,
        closeAudioPlayer,
        toggleDevAudioAccess,
        downloadVoiceModel,
        activeTheme,
        themes: mockThemes,
      }}
    >
      {children}
    </ReaderContext.Provider>
  );
};

export const useReader = () => {
  const context = useContext(ReaderContext);
  if (!context) {
    throw new Error('useReader must be used within a ReaderProvider');
  }
  return context;
};
