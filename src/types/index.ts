export type UserTier = 'free' | 'audio' | 'vip';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  tier: UserTier;
  audioDaysRemaining?: number;
  vipDaysRemaining?: number;
  usedStorageMB: number;
  totalStorageMB: number;
  freeSlotsUsed: number;
  freeSlotsTotal: number;
  lastSyncedAt?: string;
  syncedDevices?: string[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  coverColor: string;
  totalChapters: number;
  currentChapter: number;
  currentChapterTitle: string;
  progressPercent: number;
  wordCount: number;
  fileSizeMB: number;
  fileFormat: 'TXT' | 'EPUB' | 'DOCX';
  storageType: 'local' | 'cloud';
  lastReadAt: string;
  addedAt: string;
  tags: string[];
  shelfIds: string[];
  isOffline?: boolean;
  syncedToCloud?: boolean;
  description?: string;
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
  paragraphs: string[];
}

export interface Shelf {
  id: string;
  name: string;
  icon: string;
  description?: string;
  bookCount: number;
  color?: string;
  isSystem?: boolean;
}

export interface ReadingStats {
  weeklyHours: number;
  weeklyMinutes: number;
  weeklyChapters: number;
  weeklyBooksCount: number;
  streakDays: number;
  audioMinutesWeek: number;
  completedBooksCount: number;
  dailyStats: {
    day: string; // 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'
    readingMinutes: number;
    audioMinutes: number;
  }[];
}

export type ReadingMode = 'scroll' | 'page' | 'auto' | 'focus';
export type FooterDisplay = 'percent' | 'pages' | 'time_chapter' | 'time_book' | 'hidden';

export interface ReaderSettings {
  fontFamily: 'Literata' | 'Merriweather' | 'Playfair Display' | 'Be Vietnam Pro' | 'Inter' | 'Monospace';
  fontSize: number; // 15 - 32
  fontWeight: 'normal' | 'medium' | 'semibold';
  lineHeight: number; // 1.5 - 2.5
  paragraphSpacing: number; // 0.8 - 2.5
  pageWidth: 'narrow' | 'normal' | 'wide' | 'full';
  marginHorizontal: number; // px
  textAlign: 'left' | 'justify';
  firstLineIndent: boolean;
  readingMode: ReadingMode;
  autoScrollSpeed: number; // 1 - 10
  footerDisplay: FooterDisplay;
  activeThemeId: string;
  selectedPreset?: string;
}

export interface ReaderThemeOption {
  id: string;
  name: string;
  isVipOnly: boolean;
  className: string;
  previewBg: string;
  previewText: string;
  description?: string;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  bookId: string | null;
  chapterIndex: number;
  currentTime: number;
  duration: number;
  playbackRate: number;
  voice: 'linh_nhi' | 'mai_phuong' | 'nguyen_anh' | 'hoang_nam';
  sleepTimer: number | null; // minutes remaining
  isMiniPlayerVisible: boolean;
  isSheetOpen: boolean;
}

export interface SearchResult {
  chapterIndex: number;
  chapterTitle: string;
  snippet: string;
  matchIndex: number;
}
