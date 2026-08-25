import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  ReaderSettings, 
  ReadingMode, 
  FooterDisplay, 
  AudioPlayerState, 
  SearchResult,
  ReaderThemeOption 
} from '../types';
import { mockThemes, sampleChapterContent, mockSearchResults } from '../mock/mockData';
import { useApp } from './AppContext';

export interface ChapterTocItem {
  index: number;
  title: string;
  wordCount: number;
  isRead: boolean;
  isCurrent: boolean;
}

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
  jumpToChapter: (chapterIndex: number) => void;
  nextChapter: () => void;
  prevChapter: () => void;
  
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
  
  // In-book search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  
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

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

export const ReaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, currentBook, localBookSource, updateBook, showToast, openUpgradeModal } = useApp();
  
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(1);
  const [currentChapterTitle, setCurrentChapterTitle] = useState<string>('Chương 1');
  const [currentChapterContent, setCurrentChapterContent] = useState<string[]>([]);
  const [chapterList, setChapterList] = useState<ChapterTocItem[]>([]);
  const [isLoadingChapter, setIsLoadingChapter] = useState<boolean>(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState<boolean>(false);
  
  // Panels
  const [isAaPanelOpen, setIsAaPanelOpen] = useState<boolean>(false);
  const [isThemePanelOpen, setIsThemePanelOpen] = useState<boolean>(false);
  const [isTocOpen, setIsTocOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isAudioSheetOpen, setIsAudioSheetOpen] = useState<boolean>(false);
  
  // Search
  const [searchQuery, setSearchQuery] = useState<string>('Thẩm Uyển Khanh');
  const [searchResults, setSearchResults] = useState<SearchResult[]>(mockSearchResults);
  
  // Audio
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

  // Load real chapter content and TOC list whenever currentBook or chapterIndex changes
  useEffect(() => {
    let isCancelled = false;

    const loadChapterData = async () => {
      if (!currentBook) {
        setCurrentChapterContent(['Chưa có cuốn sách nào được chọn trong thư viện.']);
        return;
      }

      const targetIndex = currentBook.currentChapter || 1;
      setCurrentChapterIndex(targetIndex);

      try {
        setIsLoadingChapter(true);

        // 1. Fetch real chapter content from IndexedDB
        const chapter = await localBookSource.getChapter(currentBook.id, targetIndex);
        if (chapter && !isCancelled) {
          setCurrentChapterTitle(chapter.title);
          setCurrentChapterContent(chapter.paragraphs && chapter.paragraphs.length > 0 
            ? chapter.paragraphs 
            : ['Chương này chưa có nội dung.']);
        } else if (!isCancelled) {
          // Fallback to sample text if in mock mode
          const key = `chap-${targetIndex}`;
          setCurrentChapterTitle(`Chương ${targetIndex}`);
          setCurrentChapterContent(sampleChapterContent[key] || [
            `Nội dung mô phỏng cho Chương ${targetIndex} của tác phẩm "${currentBook.title}"...`,
            `Từng trang sách mở ra mang theo thế giới riêng của nhân vật, những mâu thuẫn, tình cảm và sự lựa chọn đầy xúc cảm.`,
            `Gió ngoài song cửa thổi nhẹ, mang theo hương thơm của cỏ cây hoa lá sau cơn mưa mùa hạ...`,
          ]);
        }

        // 2. Fetch real TOC chapter list
        const realToc = await localBookSource.getChapterList(currentBook.id);
        if (realToc && realToc.length > 0 && !isCancelled) {
          setChapterList(realToc);
        } else if (!isCancelled) {
          // Generate fallback list
          const total = currentBook.totalChapters || 1;
          const fallbackList: ChapterTocItem[] = Array.from({ length: total }, (_, i) => ({
            index: i + 1,
            title: `Chương ${i + 1}`,
            wordCount: 2500,
            isRead: i + 1 < targetIndex,
            isCurrent: i + 1 === targetIndex,
          }));
          setChapterList(fallbackList);
        }
      } catch {
        // Handle error silently
      } finally {
        if (!isCancelled) setIsLoadingChapter(false);
      }
    };

    loadChapterData();

    return () => {
      isCancelled = true;
    };
  }, [currentBook?.id]);

  const totalChapters = currentBook ? currentBook.totalChapters : 1;

  const updateSetting = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    if (user.tier === 'free') {
      if (key === 'readingMode' && value !== 'scroll') {
        openUpgradeModal('Chế độ đọc nâng cao (Page Mode / Auto Scroll / Focus Mode)');
        return;
      }
      if (key === 'activeThemeId') {
        const theme = mockThemes.find(t => t.id === value);
        if (theme?.isVipOnly) {
          openUpgradeModal('Bộ sưu tập Theme độc quyền Lily VIP');
          return;
        }
      }
    }

    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const applyPreset = (presetName: 'ban-dem' | 'tieu-thuyet' | 'co-trang' | 'doc-lau') => {
    if (user.tier === 'free') {
      openUpgradeModal('Reading Style Presets');
      return;
    }

    switch (presetName) {
      case 'ban-dem':
        setSettings(prev => ({
          ...prev,
          activeThemeId: 'theme-oled',
          fontSize: 18,
          lineHeight: 1.8,
          fontFamily: 'Literata',
          selectedPreset: 'Ban đêm',
        }));
        showToast('Đã áp dụng Preset: Ban đêm', 'info');
        break;
      case 'tieu-thuyet':
        setSettings(prev => ({
          ...prev,
          activeThemeId: 'theme-paper',
          fontSize: 18,
          lineHeight: 1.85,
          fontFamily: 'Merriweather',
          firstLineIndent: true,
          selectedPreset: 'Tiểu thuyết',
        }));
        showToast('Đã áp dụng Preset: Tiểu thuyết', 'info');
        break;
      case 'co-trang':
        setSettings(prev => ({
          ...prev,
          activeThemeId: 'theme-ancient',
          fontSize: 19,
          lineHeight: 2.0,
          fontFamily: 'Playfair Display',
          firstLineIndent: true,
          selectedPreset: 'Cổ trang',
        }));
        showToast('Đã áp dụng Preset: Cổ trang', 'info');
        break;
      case 'doc-lau':
        setSettings(prev => ({
          ...prev,
          activeThemeId: 'theme-warm',
          fontSize: 20,
          lineHeight: 1.9,
          fontFamily: 'Literata',
          pageWidth: 'narrow',
          selectedPreset: 'Đọc lâu',
        }));
        showToast('Đã áp dụng Preset: Đọc lâu', 'info');
        break;
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    showToast('Đã đặt lại cài đặt Reader mặc định', 'info');
  };

  const jumpToChapter = async (chapterIndex: number) => {
    if (!currentBook || chapterIndex < 1 || chapterIndex > totalChapters) return;

    setCurrentChapterIndex(chapterIndex);
    const progress = Math.round((chapterIndex / totalChapters) * 100);

    try {
      setIsLoadingChapter(true);
      const chapter = await localBookSource.getChapter(currentBook.id, chapterIndex);
      if (chapter) {
        setCurrentChapterTitle(chapter.title);
        setCurrentChapterContent(chapter.paragraphs || []);
      }

      // Save progress to IndexedDB
      await localBookSource.saveProgress(
        currentBook.id, 
        chapterIndex, 
        progress, 
        chapter ? chapter.title : `Chương ${chapterIndex}`
      );

      // Update app state
      updateBook(currentBook.id, {
        currentChapter: chapterIndex,
        currentChapterTitle: chapter ? chapter.title : `Chương ${chapterIndex}`,
        progressPercent: progress,
        lastReadAt: 'Vừa xong'
      });
    } catch {
      // Fallback
    } finally {
      setIsLoadingChapter(false);
    }

    setIsTocOpen(false);
    setIsSearchOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextChapter = () => {
    if (currentChapterIndex < totalChapters) {
      jumpToChapter(currentChapterIndex + 1);
    } else {
      showToast('Đã đến chương cuối cùng của bộ truyện!', 'info');
    }
  };

  const prevChapter = () => {
    if (currentChapterIndex > 1) {
      jumpToChapter(currentChapterIndex - 1);
    } else {
      showToast('Đang ở chương đầu tiên!', 'info');
    }
  };

  const toggleToolbar = () => setIsToolbarVisible(prev => !prev);
  const hideToolbar = () => setIsToolbarVisible(false);
  const showToolbar = () => setIsToolbarVisible(true);

  // Audio actions
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

  const activeTheme = mockThemes.find(t => t.id === settings.activeThemeId) || mockThemes[0];

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
        jumpToChapter,
        nextChapter,
        prevChapter,
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
