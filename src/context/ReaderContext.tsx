import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { 
  ReaderSettings, 
  AudioPlayerState, 
  SearchResult,
  ReaderThemeOption,
  ReaderErrorType
} from '../types';
import { mockThemes } from '../mock/mockData';
import { useApp } from './AppContext';

export interface ChapterTocItem {
  index: number;
  title: string;
  wordCount: number;
  isRead: boolean;
  isCurrent: boolean;
}

export const FREE_THEME_IDS = new Set([
  'theme-white',
  'theme-cream',
  'theme-paper',
  'theme-gray',
  'theme-night',
]);

const SETTINGS_STORAGE_KEY = 'lily_reader_settings_v1';

const defaultSettings: ReaderSettings = {
  fontFamily: 'Literata',
  fontSize: 18,
  fontWeight: 'normal',
  lineHeight: 1.8,
  paragraphSpacing: 1.2,
  pageWidth: 'normal',
  marginHorizontal: 24,
  textAlign: 'left',
  firstLineIndent: true,
  readingMode: 'scroll',
  autoScrollSpeed: 3,
  footerDisplay: 'percent',
  activeThemeId: 'theme-paper',
  selectedPreset: 'Tiểu thuyết',
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
    if (userTier === 'free' && (!merged.activeThemeId || !FREE_THEME_IDS.has(merged.activeThemeId))) {
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
  } catch {
    // Ignore localStorage write errors (quota / private mode)
  }
};

interface ReaderContextType {
  settings: ReaderSettings;
  updateSetting: <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => void;
  applyPreset: (presetName: 'ban-dem' | 'tieu-thuyet' | 'co-trang' | 'doc-lau') => void;
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
  
  // In-book Search (100% Free & Real Local IndexedDB)
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  searchError: string | null;
  
  // Audio Player
  audioState: AudioPlayerState;
  togglePlayAudio: () => void;
  seekAudio: (seconds: number) => void;
  setAudioSpeed: (rate: number) => void;
  setAudioVoice: (voice: AudioPlayerState['voice']) => void;
  setAudioSleepTimer: (minutes: number | null) => void;
  skip15Sec: (direction: 'forward' | 'backward') => void;
  closeAudioPlayer: () => void;
  
  // Theme Info
  activeTheme: ReaderThemeOption;
  themes: ReaderThemeOption[];
}

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

export const ReaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, currentBook, localBookSource, updateBook, showToast, openUpgradeModal } = useApp();
  
  const [settings, setSettings] = useState<ReaderSettings>(() => loadPersistedSettings(user?.tier || 'free'));
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(1);
  const [currentChapterTitle, setCurrentChapterTitle] = useState<string>('Chương 1');
  const [currentChapterContent, setCurrentChapterContent] = useState<string[]>([]);
  const [chapterList, setChapterList] = useState<ChapterTocItem[]>([]);
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
  
  // Search states (Real Local IndexedDB)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Audio state
  const [audioState, setAudioState] = useState<AudioPlayerState>({
    isPlaying: false,
    bookId: currentBook?.id || null,
    chapterIndex: 1,
    currentTime: 0,
    duration: 600,
    playbackRate: 1.0,
    voice: 'linh_nhi',
    sleepTimer: null,
    isMiniPlayerVisible: false,
    isSheetOpen: false,
  });

  // Refs for race condition & progress throttling
  const loadGenerationRef = useRef<number>(0);
  const lastSaveTimeRef = useRef<number>(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProgressRef = useRef<{
    chapterIndex: number;
    chapterTitle: string;
    scrollPercent: number;
    scrollOffset: number;
  } | null>(null);

  // Sync / validate persisted settings on user tier changes
  useEffect(() => {
    if (user?.tier === 'free' && !FREE_THEME_IDS.has(settings.activeThemeId)) {
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

    if (!currentBook || !pendingProgressRef.current) return;

    const pending = pendingProgressRef.current;
    pendingProgressRef.current = null;
    lastSaveTimeRef.current = Date.now();

    const totalChaps = currentBook.totalChapters || 1;
    const progress = Math.round((pending.chapterIndex / totalChaps) * 100);

    localBookSource.saveProgress(
      currentBook.id,
      pending.chapterIndex,
      progress,
      pending.chapterTitle,
      pending.scrollPercent,
      pending.scrollOffset
    ).catch(() => {});

    updateBook(currentBook.id, {
      currentChapter: pending.chapterIndex,
      currentChapterTitle: pending.chapterTitle,
      progressPercent: progress,
      lastReadAt: new Date().toISOString(),
    });
  }, [currentBook, localBookSource, updateBook]);

  // Visibility / pagehide / beforeunload listeners for progress flush
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingProgress();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', flushPendingProgress);
    window.addEventListener('beforeunload', flushPendingProgress);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', flushPendingProgress);
      window.removeEventListener('beforeunload', flushPendingProgress);
      flushPendingProgress();
    };
  }, [flushPendingProgress]);

  // Load real chapter content from IndexedDB with Race-Condition Guard
  const loadChapterData = useCallback(async (targetChapter?: number, scrollPct?: number) => {
    if (!currentBook) {
      setReaderError('BOOK_NOT_FOUND');
      setIsLoadingChapter(false);
      setCurrentChapterContent([]);
      return;
    }

    // Flush any pending progress for previous chapter before switching
    flushPendingProgress();

    const currentGeneration = ++loadGenerationRef.current;
    setReaderError(null);
    setIsLoadingChapter(true);

    try {
      // 1. Fetch real progress from IndexedDB if not explicitly requested
      let targetIndex = targetChapter;
      let targetScroll = scrollPct;

      if (targetIndex === undefined) {
        const progress = await localBookSource.getProgress(currentBook.id);
        targetIndex = progress?.chapterIndex || currentBook.currentChapter || 1;
        targetScroll = progress?.scrollPercent || 0;
      }

      // Check if stale request
      if (loadGenerationRef.current !== currentGeneration) return;

      setCurrentChapterIndex(targetIndex);
      setInitialScrollPercent(targetScroll ?? 0);

      // 2. Fetch real chapter content
      const chapter = await localBookSource.getChapter(currentBook.id, targetIndex);
      
      // Check if stale request
      if (loadGenerationRef.current !== currentGeneration) return;

      if (chapter) {
        setCurrentChapterTitle(chapter.title);
        setCurrentChapterContent(
          chapter.paragraphs && chapter.paragraphs.length > 0 
            ? chapter.paragraphs 
            : ['(Chương này chưa có nội dung đoạn văn.)']
        );
        setReaderError(null);
      } else {
        setReaderError('CHAPTER_NOT_FOUND');
        setCurrentChapterContent([]);
      }

      // 3. Fetch real TOC chapter list
      const realToc = await localBookSource.getChapterList(currentBook.id);
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
          title: currentBook.currentChapterTitle || 'Chương 1',
          wordCount: currentBook.wordCount || 1000,
          isRead: false,
          isCurrent: true,
        }]);
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
  }, [currentBook, localBookSource, flushPendingProgress]);

  // Initial load on mount or currentBook change
  useEffect(() => {
    loadChapterData();
  }, [loadChapterData]);

  const totalChapters = currentBook ? currentBook.totalChapters : 1;

  const retryLoadChapter = () => {
    loadChapterData(currentChapterIndex);
  };

  const updateSetting = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    if (user.tier === 'free') {
      if (key === 'readingMode' && value !== 'scroll') {
        openUpgradeModal('Chế độ đọc nâng cao (Page Mode / Auto Scroll / Focus Mode)');
        return;
      }
      if (key === 'activeThemeId') {
        if (typeof value === 'string' && !FREE_THEME_IDS.has(value)) {
          openUpgradeModal('Bộ sưu tập Theme độc quyền Lily VIP');
          return;
        }
      }
    }

    setSettings(prev => {
      const next = { ...prev, [key]: value };
      saveSettingsToStorage(next);
      return next;
    });
  };

  const applyPreset = (presetName: 'ban-dem' | 'tieu-thuyet' | 'co-trang' | 'doc-lau') => {
    if (user.tier === 'free') {
      openUpgradeModal('Reading Style Presets');
      return;
    }

    let nextPresetSettings: Partial<ReaderSettings> = {};
    switch (presetName) {
      case 'ban-dem':
        nextPresetSettings = {
          activeThemeId: 'theme-oled',
          fontSize: 18,
          lineHeight: 1.8,
          fontFamily: 'Literata',
          selectedPreset: 'Ban đêm',
        };
        showToast('Đã áp dụng Preset: Ban đêm', 'info');
        break;
      case 'tieu-thuyet':
        nextPresetSettings = {
          activeThemeId: 'theme-paper',
          fontSize: 18,
          lineHeight: 1.85,
          fontFamily: 'Merriweather',
          firstLineIndent: true,
          selectedPreset: 'Tiểu thuyết',
        };
        showToast('Đã áp dụng Preset: Tiểu thuyết', 'info');
        break;
      case 'co-trang':
        nextPresetSettings = {
          activeThemeId: 'theme-ancient',
          fontSize: 19,
          lineHeight: 2.0,
          fontFamily: 'Playfair Display',
          firstLineIndent: true,
          selectedPreset: 'Cổ trang',
        };
        showToast('Đã áp dụng Preset: Cổ trang', 'info');
        break;
      case 'doc-lau':
        nextPresetSettings = {
          activeThemeId: 'theme-warm',
          fontSize: 20,
          lineHeight: 1.9,
          fontFamily: 'Literata',
          pageWidth: 'narrow',
          selectedPreset: 'Đọc lâu',
        };
        showToast('Đã áp dụng Preset: Đọc lâu', 'info');
        break;
    }

    setSettings(prev => {
      const next = { ...prev, ...nextPresetSettings };
      saveSettingsToStorage(next);
      return next;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    saveSettingsToStorage(defaultSettings);
    showToast('Đã đặt lại cài đặt Reader mặc định', 'info');
  };

  const jumpToChapter = async (chapterIndex: number, targetParagraph?: number) => {
    if (!currentBook || chapterIndex < 1 || chapterIndex > totalChapters) return;

    if (targetParagraph !== undefined) {
      setTargetParagraphIndex(targetParagraph);
    } else {
      setTargetParagraphIndex(null);
    }

    setIsTocOpen(false);
    setIsSearchOpen(false);
    await loadChapterData(chapterIndex, 0);
  };

  const jumpToSearchResult = async (chapterIndex: number, paragraphIndex?: number) => {
    setIsSearchOpen(false);
    await jumpToChapter(chapterIndex, paragraphIndex);
  };

  const nextChapter = () => {
    if (isLoadingChapter) return;
    if (currentChapterIndex < totalChapters) {
      jumpToChapter(currentChapterIndex + 1);
    } else {
      showToast('Đã đến chương cuối cùng của bộ truyện!', 'info');
    }
  };

  const prevChapter = () => {
    if (isLoadingChapter) return;
    if (currentChapterIndex > 1) {
      jumpToChapter(currentChapterIndex - 1);
    } else {
      showToast('Đang ở chương đầu tiên!', 'info');
    }
  };

  // Throttled scroll position saving (max 1 IndexedDB write per 1000ms)
  const saveScrollPosition = (scrollPercent: number, scrollOffset: number) => {
    if (!currentBook) return;

    pendingProgressRef.current = {
      chapterIndex: currentChapterIndex,
      chapterTitle: currentChapterTitle,
      scrollPercent,
      scrollOffset,
    };

    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;

    if (timeSinceLastSave >= 1000) {
      flushPendingProgress();
    } else if (!saveTimeoutRef.current) {
      saveTimeoutRef.current = setTimeout(() => {
        flushPendingProgress();
      }, 1000 - timeSinceLastSave);
    }
  };

  // Real In-Book Full-Text Search with Debounce (300ms)
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
        const results = await localBookSource.searchInBook(currentBook.id, trimmed);
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

  // Audio actions (Preview UI state, not real cloud audio)
  const togglePlayAudio = () => {
    if (user.tier === 'free') {
      openUpgradeModal('Lily Audio / TTS');
      return;
    }
    setAudioState(prev => ({
      ...prev,
      isPlaying: !prev.isPlaying,
      isMiniPlayerVisible: true,
    }));
  };

  const seekAudio = (seconds: number) => {
    setAudioState(prev => ({ ...prev, currentTime: seconds }));
  };

  const setAudioSpeed = (rate: number) => {
    setAudioState(prev => ({ ...prev, playbackRate: rate }));
  };

  const setAudioVoice = (voice: AudioPlayerState['voice']) => {
    setAudioState(prev => ({ ...prev, voice }));
  };

  const setAudioSleepTimer = (minutes: number | null) => {
    setAudioState(prev => ({ ...prev, sleepTimer: minutes }));
  };

  const skip15Sec = (direction: 'forward' | 'backward') => {
    setAudioState(prev => {
      const delta = direction === 'forward' ? 15 : -15;
      const nextTime = Math.max(0, Math.min(prev.duration, prev.currentTime + delta));
      return { ...prev, currentTime: nextTime };
    });
  };

  const closeAudioPlayer = () => {
    setAudioState(prev => ({
      ...prev,
      isPlaying: false,
      isMiniPlayerVisible: false,
      isSheetOpen: false,
    }));
  };

  const activeTheme = mockThemes.find(t => t.id === settings.activeThemeId) || mockThemes[2]; // Default to 'theme-paper'

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
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        searchError,
        audioState,
        togglePlayAudio,
        seekAudio,
        setAudioSpeed,
        setAudioVoice,
        setAudioSleepTimer,
        skip15Sec,
        closeAudioPlayer,
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
