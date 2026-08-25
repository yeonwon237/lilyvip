export type SupportedFormat = 'TXT' | 'EPUB' | 'DOCX';

export interface NormalizedChapter {
  id: string;
  bookId: string;
  index: number; // 1-based index
  title: string;
  paragraphs: string[];
  wordCount: number;
}

export interface NormalizedBook {
  id: string;
  version: number;
  title: string;
  author: string;
  coverUrl?: string;
  coverColor: string;
  fileFormat: SupportedFormat;
  fileSizeMB: number;
  totalChapters: number;
  wordCount: number;
  originalFileName: string;
  storageType: 'local';
  createdAt: string;
  updatedAt: string;
  lastReadAt: string;
  currentChapter: number;
  currentChapterTitle: string;
  progressPercent: number;
  tags: string[];
  shelfIds: string[];
  hasDetectedChapters: boolean;
  description?: string;
}

export interface ReadingProgress {
  bookId: string;
  chapterIndex: number;
  chapterTitle: string;
  percentage: number;
  scrollPosition?: number;
  updatedAt: string;
}

export interface RawFileBlob {
  id: string; // bookId
  fileName: string;
  fileSize: number;
  fileType: string;
  data: ArrayBuffer;
  savedAt: string;
}

export interface ParsedBookDraft {
  title: string;
  author: string;
  originalFileName: string;
  fileFormat: SupportedFormat;
  fileSizeMB: number;
  totalChapters: number;
  wordCount: number;
  chapters: NormalizedChapter[];
  hasDetectedChapters: boolean;
  rawBlob?: ArrayBuffer;
  suggestedCoverColor: string;
}

export interface StorageEstimateInfo {
  usageMB: number;
  quotaMB: number;
  percentUsed: number;
  isPersistent: boolean;
}
