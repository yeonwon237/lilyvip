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

export interface BookSourceMeta {
  type: 'website' | 'remote-file';
  adapter: string;
  url: string;
  hostname: string;
  importedAt: string;
}

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
  fileFormat: 'TXT' | 'EPUB' | 'DOCX' | 'WEBSITE';
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
  source?: BookSourceMeta;
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
  sourceUrl?: string;
}

export interface Shelf {
  id: string;
  name: string;
  color: string;
  icon?: string;
  bookCount: number;
  bookIds?: string[];
  description?: string;
  isSystem?: boolean;
}

export interface ReadingStats {
  todayMinutes?: number;
  weekMinutes?: number;
  monthMinutes?: number;
  streakDays: number;
  readingStreakDays?: number;
  wordsReadToday?: number;
  booksFinished?: number;
  totalBooks?: number;
  totalWordsRead?: number;
  weeklyHistory?: { day: string; minutes: number }[];
  weeklyHours?: number;
  weeklyMinutes?: number;
  weeklyReadingMinutes?: number;
  dailyAverageMinutes?: number;
  weeklyChapters?: number;
  weeklyBooksCount?: number;
  audioMinutesWeek?: number;
  completedBooksCount?: number;
  totalNotes?: number;
  totalBookmarks?: number;
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

export type ReadingPresetId = 'thoai-mai' | 'gon-gang' | 'sach-giay' | 'doc-dem';

export interface ReaderSettings {
  fontFamily: ReaderFontFamily;
  fontSize: number; // 14 to 32
  fontWeight: 'normal' | 'medium' | 'semibold';
  lineHeight: number; // 1.4 to 2.4
  paragraphSpacing: number; // 0.6 to 2.4
  letterSpacing?: number; // -0.02 to 0.08em
  pageWidth: ReaderPageWidth;
  marginHorizontal: number; // 12 to 48px
  textAlign: 'left' | 'justify';
  firstLineIndent: boolean;
  readingMode: ReadingMode;
  autoScrollSpeed: number; // 1 to 10
  footerDisplay: FooterDisplay;
  activeThemeId: string;
  selectedPreset?: string;
}

export interface AudioPlayerState {
  status: 'LOCKED' | 'MODEL_NOT_READY' | 'DOWNLOADING_MODEL' | 'READY' | 'SYNTHESIZING' | 'PLAYING' | 'PAUSED' | 'ERROR';
  isPlaying: boolean;
  bookId: string | null;
  chapterIndex: number;
  chapterTitle?: string;
  currentChunkIndex: number;
  totalChunks: number;
  chunkProgressPercent: number;
  activeParagraphIndex: number;
  currentTime: number;
  duration: number;
  playbackRate: number; // 0.8 to 2.0
  voice: string;
  sleepTimer: number | 'end_of_chapter' | null; // minutes, 'end_of_chapter', or null
  sleepTimerSecondsRemaining?: number | null;
  isMiniPlayerVisible: boolean;
  isSheetOpen: boolean;
  autoNextChapter: boolean;
  readChapterTitle: boolean;
  error?: string;
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

export interface Bookmark {
  id: string;
  bookId: string;
  chapterIndex: number;
  chapterTitle: string;
  selectedText: string;
  paragraphIndex?: number;
  startOffset?: number;
  endOffset?: number;
  contextBefore?: string;
  contextAfter?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuoteTemplateId = 'lily' | 'ancient' | 'minimal' | 'night' | 'book_page' | 'film';
export type QuoteAspectRatio = '1:1' | '4:5' | '9:16' | 'bookmark';

export type HighlightColor = 'yellow' | 'pink' | 'purple' | 'green';

export interface Annotation {
  id: string;
  bookId: string;
  chapterIndex: number;
  chapterTitle?: string;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  prefix?: string;
  suffix?: string;
  color: HighlightColor;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}
