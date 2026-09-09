import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, UserTier, Book, Shelf, ReadingStats } from '../types';
import { mockUser } from '../mock/mockData';
import { LocalBookSource } from '../book-engine/source/LocalBookSource';
import { NormalizedBook, NormalizedChapter, ParsedBookDraft } from '../book-engine/types';
import { BookRepository } from '../book-engine/storage/BookRepository';
import { canUseFeature, FeatureId, getLibraryLimits, LibraryLimits, PRODUCT_MODE } from '../config/features';
import { LilyHubClient } from '../book-engine/lilyhub/LilyHubClient';

export type PageRoute = 
  | 'landing'
  | 'login'
  | 'dashboard' 
  | 'library' 
  | 'add-book' 
  | 'book-detail' 
  | 'reader' 
  | 'shelves' 
  | 'stats' 
  | 'audio'
  | 'settings'
  | 'account';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  user: User;
  refreshLilyHubSession: () => Promise<boolean>;
  disconnectLilyHub: () => Promise<void>;
  setUserTier: (tier: UserTier) => void;
  currentPage: PageRoute;
  selectedBookId: string | null;
  selectedShelfId: string | null;
  navigateTo: (page: PageRoute, bookId?: string | null, shelfId?: string | null) => void;
  books: Book[];
  shelves: Shelf[];
  readingStats: ReadingStats;
  currentBook: Book | null;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  
  // Real Local Book Storage actions
  localBookSource: LocalBookSource;
  addParsedBook: (draft: ParsedBookDraft, customMeta?: Partial<Book>) => Promise<Book>;
  syncLocalBook: (bookId: string, chapters: NormalizedChapter[], updates: Partial<NormalizedBook>) => Promise<Book>;
  addBook: (newBook: Partial<Book>) => void;
  removeBook: (bookId: string) => Promise<void>;
  updateBook: (bookId: string, updates: Partial<Book>) => void;
  toggleBookOffline: (bookId: string) => void;
  reloadLocalBooks: () => Promise<void>;
  libraryError: string | null;
  
  // Slot Limit Info
  maxLocalSlots: number;
  isSlotFull: boolean;
  libraryLimits: LibraryLimits;
  lilyHubSlotsUsed: number;
  externalSlotsUsed: number;
  canAddBookFrom: (source: 'lilyhub' | 'external') => boolean;
  getSlotError: (source: 'lilyhub' | 'external') => string | null;
  
  // Shelf actions
  createShelf: (shelf: Omit<Shelf, 'id' | 'bookCount'>) => void;
  addBookToShelf: (bookId: string, shelfId: string) => void;
  renameShelf: (shelfId: string, name: string) => void;
  deleteShelf: (shelfId: string) => void;
  
  // Modal states
  isUpgradeModalOpen: boolean;
  setIsUpgradeModalOpen: (open: boolean) => void;
  upgradeModalFeature: string;
  openUpgradeModal: (featureName: string) => void;
  canUseFeature: (feature: FeatureId) => boolean;
  isOpenBeta: boolean;
  
  // Global search
  globalSearch: string;
  setGlobalSearch: (query: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SHELVES_STORAGE_KEY = 'LILY_LOCAL_SHELVES_V1';
const PERSISTENCE_REQUESTED_KEY = 'LILY_STORAGE_PERSISTENCE_REQUESTED_V1';
const USER_TIER_STORAGE_KEY = 'LILY_USER_TIER_V1';

const getInitialTier = (): UserTier => {
  if (!import.meta.env.DEV || typeof localStorage === 'undefined') return mockUser.tier;
  const saved = localStorage.getItem(USER_TIER_STORAGE_KEY);
  return saved === 'vip1' || saved === 'vip2' ? saved : mockUser.tier;
};

const getInitialShelves = (): Shelf[] => {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(SHELVES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return [
    { id: 'shelf-1', name: 'Đang đọc', description: 'Các tác phẩm đang đọc dở', icon: 'BookOpen', color: '#D9829B', bookCount: 0, bookIds: [] },
    { id: 'shelf-2', name: 'Yêu thích', description: 'Tác phẩm chạm tới cảm xúc nhất', icon: 'Heart', color: '#E06D88', bookCount: 0, bookIds: [] },
    { id: 'shelf-3', name: 'Đã hoàn thành', description: 'Những câu chuyện đã đọc xong', icon: 'CheckCircle', color: '#6BBF59', bookCount: 0, bookIds: [] },
  ];
};

const saveShelvesToStorage = (shelvesToSave: Shelf[]) => {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SHELVES_STORAGE_KEY, JSON.stringify(shelvesToSave));
    } catch {}
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const localBookSource = LocalBookSource.getInstance();
  const [user, setUser] = useState<User>(() => ({ ...mockUser, tier: getInitialTier() }));
  const [currentPage, setCurrentPage] = useState<PageRoute>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('novel')
      ? 'add-book'
      : typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('connect') === 'lilyhub'
        ? 'login'
        : 'dashboard'
  );
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>(getInitialShelves);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [libraryError, setLibraryError] = useState<string | null>(null);
  
  // Real Local Reading Stats calculated from real stored books
  const totalWords = books.reduce((acc, b) => acc + (b.wordCount || 0), 0);
  const readingStats: ReadingStats = {
    totalBooks: books.length,
    totalWordsRead: totalWords,
    streakDays: books.length > 0 ? 1 : 0,
    readingStreakDays: books.length > 0 ? 1 : 0,
    weeklyReadingMinutes: Math.round(totalWords / 220),
    dailyAverageMinutes: books.length > 0 ? 20 : 0,
    totalNotes: 0,
    totalBookmarks: 0,
    audioMinutesWeek: 0,
  };
  
  // Modals
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState<string>('');

  // Reload books from IndexedDB
  const reloadLocalBooks = async () => {
    try {
      const loaded = await localBookSource.getBooks();
      const health = await BookRepository.checkLibraryHealth();
      const incompleteIds = new Set(health.incompleteBookIds);
      const healthyBooks = loaded.filter(book => !incompleteIds.has(book.id));
      const currentShelves = getInitialShelves();
      setShelves(currentShelves);
      setBooks(healthyBooks.map(book => ({
        ...book,
        shelfIds: currentShelves.filter(shelf => shelf.bookIds?.includes(book.id)).map(shelf => shelf.id),
      })));
      setUser(prev => ({
        ...prev,
        freeSlotsUsed: healthyBooks.length,
        freeSlotsTotal: getLibraryLimits(prev.tier).total,
      }));
      if (healthyBooks.length > 0 && !selectedBookId) {
        setSelectedBookId(healthyBooks[0].id);
      }
      setLibraryError(null);
      if (!health.isHealthy) {
        showToast('Lily phát hiện dữ liệu thư viện chưa hoàn chỉnh và đã giữ nguyên để bạn có thể phục hồi.', 'warning');
      }
    } catch {
      setLibraryError('Lily chưa thể mở thư viện trên thiết bị. Dữ liệu hiện tại không bị xóa.');
    }
  };

  const refreshLilyHubSession = useCallback(async () => {
    const session = await LilyHubClient.getSession().catch(() => null);
    if (!session) return false;
    setUser(previous => ({
      ...previous,
      id: session.id,
      name: session.name || previous.name,
      email: session.email,
      avatar: session.image,
      avatarUrl: session.image,
      lilyHubConnected: true,
      ...(session.tier === 'vip1' || session.tier === 'vip2' ? { tier: session.tier } : {}),
    }));
    return true;
  }, []);

  const disconnectLilyHub = async () => {
    await LilyHubClient.signOut();
    setUser(previous => ({
      ...previous,
      id: mockUser.id,
      name: 'Khách Lily',
      email: undefined,
      avatar: mockUser.avatar,
      avatarUrl: mockUser.avatarUrl,
      lilyHubConnected: false,
      tier: import.meta.env.DEV ? previous.tier : 'free',
    }));
    showToast('Đã đăng xuất khỏi tài khoản LilyHub.', 'info');
  };

  // Initial load on mount
  useEffect(() => {
    reloadLocalBooks();
    void refreshLilyHubSession();
  }, []);

  // Switch Tier helper
  const setUserTier = (tier: UserTier) => {
    const normalizedTier: UserTier = tier === 'vip' ? 'vip2' : tier === 'audio' ? 'free' : tier;
    const limits = getLibraryLimits(normalizedTier);
    setUser(prev => ({
      ...prev,
      tier: normalizedTier,
      freeSlotsUsed: books.length,
      freeSlotsTotal: limits.total,
      lastSyncedAt: undefined,
    }));
    if (import.meta.env.DEV) {
      try { localStorage.setItem(USER_TIER_STORAGE_KEY, normalizedTier); } catch {}
    }
    const tierName = normalizedTier === 'free' ? 'Miễn phí' : normalizedTier === 'vip1' ? 'VIP 1' : 'VIP 2';
    showToast(`Đã chuyển sang gói: ${tierName}`, 'info');
  };

  // Toast System
  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => {
      if (prev.some(toast => toast.message === message && toast.type === type)) return prev;
      return [...prev.slice(-2), { id, message, type }];
    });

    window.setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, type === 'error' ? 7000 : 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Safe Navigation
  const navigateTo = (page: PageRoute, bookId: string | null = null, shelfId: string | null = null) => {
    setCurrentPage(page);
    if (bookId !== null) setSelectedBookId(bookId);
    if (shelfId !== null) setSelectedShelfId(shelfId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Upgrade Modal Trigger
  const openUpgradeModal = (featureName: string) => {
    setUpgradeModalFeature(featureName);
    setIsUpgradeModalOpen(false);
    setCurrentPage('account');
  };

  // Real Add Parsed Book to IndexedDB
  const addParsedBook = async (draft: ParsedBookDraft, customMeta?: Partial<Book>): Promise<Book> => {
    const source = customMeta?.source?.type === 'lilyhub' ? 'lilyhub' : 'external';
    const errorMsg = getSlotError(source);
    if (errorMsg) {
      showToast(errorMsg, 'error');
      throw new Error(errorMsg);
    }

    const estimate = await localBookSource.getStorageEstimate();
    if (estimate.percentUsed >= 90) {
      showToast('Thiết bị sắp hết dung lượng. Truyện hoặc Giọng Lily mới có thể không lưu được.', 'warning');
    }
    const savedBook = await localBookSource.saveBook(draft, customMeta as any, libraryLimits);
    try {
      if (localStorage.getItem(PERSISTENCE_REQUESTED_KEY) !== 'true') {
        localStorage.setItem(PERSISTENCE_REQUESTED_KEY, 'true');
        await BookRepository.requestPersistentStorage();
      }
    } catch {}
    await reloadLocalBooks();
    setSelectedBookId(savedBook.id);
    showToast(`Đã thêm thành công "${savedBook.title}" (${savedBook.totalChapters} chương)`, 'success');
    return savedBook;
  };

  const syncLocalBook = async (bookId: string, chapters: NormalizedChapter[], updates: Partial<NormalizedBook>): Promise<Book> => {
    const saved = await localBookSource.syncBook(bookId, chapters, updates);
    await reloadLocalBooks();
    return saved;
  };

  // Fallback Add Book (for quick testing)
  const addBook = (newBook: Partial<Book>) => {
    const source = newBook.source?.type === 'lilyhub' ? 'lilyhub' : 'external';
    const errorMsg = getSlotError(source);
    if (errorMsg) {
      showToast(errorMsg, 'error');
      return;
    }

    const bookId = `local-book-${Date.now()}`;
    const fullBook: Book = {
      id: bookId,
      title: newBook.title || 'Truyện mới',
      author: newBook.author || 'Tác giả',
      coverUrl: newBook.coverUrl,
      coverColor: newBook.coverColor || '#D9829B',
      totalChapters: newBook.totalChapters || 1,
      currentChapter: 1,
      currentChapterTitle: 'Chương 1',
      progressPercent: 0,
      wordCount: newBook.wordCount || 1000,
      fileSizeMB: newBook.fileSizeMB || 0.5,
      fileFormat: newBook.fileFormat || 'TXT',
      storageType: 'local',
      lastReadAt: 'Vừa thêm',
      addedAt: new Date().toLocaleDateString('vi-VN'),
      tags: newBook.tags || ['Truyện cá nhân'],
      shelfIds: [],
      description: newBook.description || 'Truyện cá nhân tải lên máy',
    };

    setBooks(prev => [fullBook, ...prev]);
    setUser(prev => ({
      ...prev,
      freeSlotsUsed: prev.freeSlotsUsed + 1,
    }));
    setSelectedBookId(bookId);
    showToast(`Đã thêm "${fullBook.title}" vào thư viện`, 'success');
  };

  // Real Delete Book from IndexedDB
  const removeBook = async (bookId: string) => {
    const bookToRemove = books.find(b => b.id === bookId);
    try {
      await localBookSource.deleteBook(bookId);
      await reloadLocalBooks();
      showToast(`Đã xóa "${bookToRemove?.title || 'truyện'}" khỏi thiết bị`, 'info');
    } catch {
      showToast('Chưa thể xóa truyện. Dữ liệu và danh sách hiện tại được giữ nguyên; hãy thử lại.', 'error');
      return;
    }

    // Clean up shelf associations and persist
    setShelves(prev => {
      const next = prev.map(s => {
        const remaining = (s.bookIds || []).filter(id => id !== bookId);
        return {
          ...s,
          bookIds: remaining,
          bookCount: remaining.length,
        };
      });
      saveShelvesToStorage(next);
      return next;
    });

    if (selectedBookId === bookId) {
      setSelectedBookId(books.find(b => b.id !== bookId)?.id || null);
    }
  };

  const updateBook = (bookId: string, updates: Partial<Book>) => {
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, ...updates } : b));
  };

  const toggleBookOffline = (bookId: string) => {
    setBooks(prev => prev.map(b => {
      if (b.id === bookId) {
        const nextOffline = !b.isOffline;
        showToast(nextOffline ? `Đã lưu "${b.title}" để đọc offline` : `Đã tắt offline cho "${b.title}"`, 'info');
        return { ...b, isOffline: nextOffline };
      }
      return b;
    }));
  };

  // Shelf management with local persistence
  const createShelf = (shelfData: Omit<Shelf, 'id' | 'bookCount'>) => {
    const newShelf: Shelf = {
      ...shelfData,
      id: `shelf-${Date.now()}`,
      bookCount: 0,
      bookIds: [],
    };
    setShelves(prev => {
      const next = [...prev, newShelf];
      saveShelvesToStorage(next);
      return next;
    });
    showToast(`Đã tạo tủ sách "${newShelf.name}"`, 'success');
  };

  const addBookToShelf = (bookId: string, shelfId: string) => {
    setBooks(prev => prev.map(book => {
      if (book.id === bookId) {
        const hasShelf = book.shelfIds.includes(shelfId);
        const nextShelves = hasShelf
          ? book.shelfIds.filter(id => id !== shelfId)
          : [...book.shelfIds, shelfId];
        
        const targetShelf = shelves.find(s => s.id === shelfId);
        showToast(
          hasShelf
            ? `Đã xóa khỏi "${targetShelf?.name}"`
            : `Đã thêm vào "${targetShelf?.name}"`,
          'info'
        );
        return { ...book, shelfIds: nextShelves };
      }
      return book;
    }));

    setShelves(prev => {
      const next = prev.map(s => {
        if (s.id === shelfId) {
          const currentBookIds = s.bookIds || [];
          const hasBook = currentBookIds.includes(bookId);
          const nextBookIds = hasBook
            ? currentBookIds.filter(id => id !== bookId)
            : [...currentBookIds, bookId];
          return {
            ...s,
            bookIds: nextBookIds,
            bookCount: nextBookIds.length,
          };
        }
        return s;
      });
      saveShelvesToStorage(next);
      return next;
    });
  };

  const renameShelf = (shelfId: string, name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setShelves(prev => {
      const next = prev.map(shelf => shelf.id === shelfId ? { ...shelf, name: cleanName } : shelf);
      saveShelvesToStorage(next);
      return next;
    });
    showToast('Đã đổi tên tủ sách.', 'success');
  };

  const deleteShelf = (shelfId: string) => {
    const shelf = shelves.find(item => item.id === shelfId);
    if (!shelf || shelf.isSystem) return;
    setShelves(prev => {
      const next = prev.filter(item => item.id !== shelfId);
      saveShelvesToStorage(next);
      return next;
    });
    setBooks(prev => prev.map(book => ({ ...book, shelfIds: book.shelfIds.filter(id => id !== shelfId) })));
    showToast(`Đã xóa tủ sách "${shelf.name}". Truyện của bạn vẫn được giữ nguyên.`, 'success');
  };

  const currentBook = books.find(b => b.id === selectedBookId) || books[0] || null;
  const libraryLimits = getLibraryLimits(user.tier);
  const lilyHubSlotsUsed = books.filter(book => book.source?.type === 'lilyhub').length;
  const externalSlotsUsed = books.length - lilyHubSlotsUsed;
  const canAddBookFrom = (source: 'lilyhub' | 'external') => {
    if (books.length >= libraryLimits.total) return false;
    return source === 'lilyhub'
      ? lilyHubSlotsUsed < libraryLimits.lilyhub
      : externalSlotsUsed < libraryLimits.external;
  };
  const getSlotError = (source: 'lilyhub' | 'external'): string | null => {
    if (canAddBookFrom(source)) return null;
    if (books.length >= libraryLimits.total) {
      return `Thư viện đã đủ ${libraryLimits.total} truyện của gói hiện tại.`;
    }
    return source === 'lilyhub'
      ? `Bạn đã dùng hết ${libraryLimits.lilyhub} slot truyện LilyHub.`
      : `Bạn đã dùng hết ${libraryLimits.external} slot tải từ thiết bị và website.`;
  };
  const isSlotFull = books.length >= libraryLimits.total;

  return (
    <AppContext.Provider
      value={{
        user,
        refreshLilyHubSession,
        disconnectLilyHub,
        setUserTier,
        currentPage,
        selectedBookId,
        selectedShelfId,
        navigateTo,
        books,
        shelves,
        readingStats,
        currentBook,
        toasts,
        showToast,
        removeToast,
        localBookSource,
        addParsedBook,
        syncLocalBook,
        addBook,
        removeBook,
        updateBook,
        toggleBookOffline,
        reloadLocalBooks,
        libraryError,
        maxLocalSlots: libraryLimits.total,
        isSlotFull,
        libraryLimits,
        lilyHubSlotsUsed,
        externalSlotsUsed,
        canAddBookFrom,
        getSlotError,
        createShelf,
        addBookToShelf,
        renameShelf,
        deleteShelf,
        isUpgradeModalOpen,
        setIsUpgradeModalOpen,
        upgradeModalFeature,
        openUpgradeModal,
        canUseFeature: (feature) => canUseFeature(feature, user.tier),
        isOpenBeta: PRODUCT_MODE.openBeta,
        globalSearch,
        setGlobalSearch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
