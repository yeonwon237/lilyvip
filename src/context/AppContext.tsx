import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, UserTier, Book, Shelf, ReadingStats } from '../types';
import { mockUser, mockShelves, mockReadingStats, mockBooks } from '../mock/mockData';
import { LocalBookSource } from '../book-engine/source/LocalBookSource';
import { ParsedBookDraft } from '../book-engine/types';
import { MAX_LOCAL_BOOKS } from '../book-engine/storage/BookRepository';
import { canUseFeature, FeatureId, PRODUCT_MODE } from '../config/features';

export type PageRoute = 
  | 'landing'
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
  addBook: (newBook: Partial<Book>) => void;
  removeBook: (bookId: string) => Promise<void>;
  updateBook: (bookId: string, updates: Partial<Book>) => void;
  toggleBookOffline: (bookId: string) => void;
  reloadLocalBooks: () => Promise<void>;
  
  // Slot Limit Info
  maxLocalSlots: number;
  isSlotFull: boolean;
  
  // Shelf actions
  createShelf: (shelf: Omit<Shelf, 'id' | 'bookCount'>) => void;
  addBookToShelf: (bookId: string, shelfId: string) => void;
  renameShelf: (shelfId: string, name: string) => void;
  deleteShelf: (shelfId: string) => void;
  
  // Modal states
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
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
  const [user, setUser] = useState<User>(mockUser);
  const [currentPage, setCurrentPage] = useState<PageRoute>('dashboard');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>(getInitialShelves);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState<string>('');

  // Reload books from IndexedDB
  const reloadLocalBooks = async () => {
    try {
      const loaded = await localBookSource.getBooks();
      const currentShelves = getInitialShelves();
      setBooks(loaded.map(book => ({
        ...book,
        shelfIds: currentShelves.filter(shelf => shelf.bookIds?.includes(book.id)).map(shelf => shelf.id),
      })));
      setUser(prev => ({
        ...prev,
        freeSlotsUsed: loaded.length,
        freeSlotsTotal: MAX_LOCAL_BOOKS,
      }));
      if (loaded.length > 0 && !selectedBookId) {
        setSelectedBookId(loaded[0].id);
      }
    } catch {
      // Fallback
    }
  };

  // Initial load on mount
  useEffect(() => {
    reloadLocalBooks();
  }, []);

  // Switch Tier helper
  const setUserTier = (tier: UserTier) => {
    setUser(prev => ({
      ...prev,
      tier,
      freeSlotsUsed: tier === 'vip' ? books.length : Math.min(books.filter(b => b.storageType === 'local').length, MAX_LOCAL_BOOKS),
      lastSyncedAt: tier === 'vip' ? 'Vừa xong' : undefined,
    }));

    if (tier === 'vip') {
      if (books.length === 0) {
        setBooks(mockBooks.map(b => ({ ...b, storageType: 'cloud', syncedToCloud: true })));
      } else {
        setBooks(prev => prev.map(b => ({ ...b, storageType: 'cloud', syncedToCloud: true })));
      }
    } else {
      reloadLocalBooks();
    }

    const tierName = tier === 'free' ? 'FREE' : tier === 'audio' ? 'FREE + AUDIO PASS' : 'LILY VIP ✦';
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
    if (PRODUCT_MODE.openBeta) {
      showToast('Tính năng đang mở miễn phí trong giai đoạn thử nghiệm.', 'info');
      return;
    }
    setUpgradeModalFeature(featureName);
    setIsUpgradeModalOpen(true);
  };

  // Real Add Parsed Book to IndexedDB
  const addParsedBook = async (draft: ParsedBookDraft, customMeta?: Partial<Book>): Promise<Book> => {
    if (books.length >= MAX_LOCAL_BOOKS) {
      const errorMsg = `Bạn đã dùng hết ${MAX_LOCAL_BOOKS}/${MAX_LOCAL_BOOKS} slot lưu trữ trên thiết bị. Hãy xóa bớt truyện cũ để thêm truyện mới.`;
      showToast(errorMsg, 'error');
      throw new Error(errorMsg);
    }

    const savedBook = await localBookSource.saveBook(draft, customMeta as any);
    await reloadLocalBooks();
    setSelectedBookId(savedBook.id);
    showToast(`Đã thêm thành công "${savedBook.title}" (${savedBook.totalChapters} chương)`, 'success');
    return savedBook;
  };

  // Fallback Add Book (for quick testing)
  const addBook = (newBook: Partial<Book>) => {
    if (books.length >= MAX_LOCAL_BOOKS) {
      showToast(`Bạn đã dùng hết ${MAX_LOCAL_BOOKS}/${MAX_LOCAL_BOOKS} slot lưu trữ local.`, 'error');
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
      freeSlotsUsed: Math.min(prev.freeSlotsUsed + 1, MAX_LOCAL_BOOKS),
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
      setBooks(prev => prev.filter(b => b.id !== bookId));
      setUser(prev => ({
        ...prev,
        freeSlotsUsed: Math.max(0, prev.freeSlotsUsed - 1),
      }));
      showToast('Đã xóa truyện khỏi danh sách', 'info');
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
  const isSlotFull = books.length >= MAX_LOCAL_BOOKS;

  return (
    <AppContext.Provider
      value={{
        user,
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
        addBook,
        removeBook,
        updateBook,
        toggleBookOffline,
        reloadLocalBooks,
        maxLocalSlots: MAX_LOCAL_BOOKS,
        isSlotFull,
        createShelf,
        addBookToShelf,
        renameShelf,
        deleteShelf,
        isAuthModalOpen,
        setIsAuthModalOpen,
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
