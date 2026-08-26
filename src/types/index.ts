export type UserTier = 'free' | 'audio' | 'vip';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  avatarUrl?: string;
  tier: UserTier;
  freeSlotsUsed: number;
  freeSlotsTotal: number;
  cloudStorageUsedMB: number;
  cloudStorageTotalMB: number;
  usedStorageMB?: number;
  totalStorageMB?: number;
  audioDaysRemaining?: number;
  vipDaysRemaining?: number;
  streakDays: number;
  totalReadingMinutes: number;
  lastSyncedAt?: string;
  syncedDevices?: any[];
}

export type StorageType = 'local' | 'cloud';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  coverColor?: string;
  totalChapters: number;
  currentChapter: number;
  currentChapterTitle: string;
  progressPercent: number;
  wordCount: number;
  fileSizeMB: number;
  fileFormat: 'TXT' | 'EPUB' | 'DOCX';
  storageType: StorageType;
  lastReadAt: string;
  addedAt: string;
  tags: string[];
  shelfIds: string[];
  description?: string;
  isOffline?: boolean;
  syncedToCloud?: boolean;
  audioDurationSec?: number;
  audioProgressSec?: number;
}

export interface Chapter {
  id: string;
  bookId: string;
  index: number;
  title: string;
  wordCount: number;
  isRead: boolean;
  isCurrent: boolean;
  paragraphs?: string[];
}

export interface Shelf {
  id: string;
  name: string;
  color: string;
  icon?: string;
  bookCount: number;
  description?: string;
  isSystem?: boolean;
}

export interface ReadingStats {
  todayMinutes?: number;
  weekMinutes?: number;
  monthMinutes?: number;
  streakDays: number;
  wordsReadToday?: number;
  booksFinished?: number;
  weeklyHistory?: { day: string; minutes: number }[];
  weeklyHours?: number;
  weeklyMinutes?: number;
  weeklyChapters?: number;
  weeklyBooksCount?: number;
  audioMinutesWeek?: number;
  completedBooksCount?: number;
  dailyStats?: Array<{ day: string; readingMinutes: number; audioMinutes: number; chapters?: number }>;
}

export type ReaderFontFamily = 
  | 'Literata' 
  | 'Merriweather' 
  | 'Playfair Display' 
  | 'Be Vietnam Pro' 
  | 'Inter';

export type ReaderPageWidth = 'narrow' | 'normal' | 'wide' | 'full';

export type ReadingMode = 'scroll' | 'page' | 'auto' | 'focus';

export type FooterDisplay = 'percent' | 'pages' | 'time_chapter' | 'time_book' | 'hidden';

export interface ReaderThemeOption {
  id: string;
  name: string;
  type?: 'free' | 'vip';
  bgHex?: string;
  textHex?: string;
  borderHex?: string;
  className: string;
  previewBg?: string;
  previewText?: string;
  description?: string;
  isVipOnly?: boolean;
}

export interface ReaderSettings {
  fontFamily: ReaderFontFamily;
  fontSize: number; // 14 to 28
  fontWeight: 'normal' | 'medium' | 'semibold';
  lineHeight: number; // 1.4 to 2.4
  paragraphSpacing: number; // 0.8 to 2.0
  pageWidth: ReaderPageWidth;
  marginHorizontal: number; // 16 to 48
  textAlign: 'left' | 'justify';
  firstLineIndent: boolean;
  readingMode: ReadingMode;
  autoScrollSpeed: number; // 1 to 10
  footerDisplay: FooterDisplay;
  activeThemeId: string;
  selectedPreset?: string;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  bookId: string | null;
  chapterIndex: number;
  currentTime: number;
  duration: number;
  playbackRate: number; // 0.8 to 2.0
  voice: 'linh_nhi' | 'mai_phuong' | 'nguyen_anh' | 'hoang_nam';
  sleepTimer: number | null; // minutes or null
  isMiniPlayerVisible: boolean;
  isSheetOpen: boolean;
}

export interface SearchResult {
  chapterIndex: number;
  chapterTitle: string;
  snippet: string;
  matchIndex: number;
  paragraphIndex?: number;
  matchOffset?: number;
}

export type ReaderErrorType = 'BOOK_NOT_FOUND' | 'CHAPTER_NOT_FOUND' | 'STORAGE_ERROR' | null;
