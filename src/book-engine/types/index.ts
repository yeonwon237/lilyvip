export type SupportedFormat = 'TXT' | 'EPUB' | 'DOCX';

export type DetectionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ImportDiagnostics {
  format: SupportedFormat;
  fileSize: number;
  decodedEncoding: string;
  rawCharacters: number;
  cleanedCharacters: number;
  detectedHeadingCount: number;
  candidateCount?: number;
  acceptedCount?: number;
  rejectedCount?: number;
  chapterCount: number;
  detectionStrategy: string;
  confidence: DetectionConfidence;
  score?: number;
  anomalies?: string[];
  warnings: string[];
  errors: string[];
  firstChaptersPreview?: string[];
  lastChaptersPreview?: string[];
}

export interface NormalizedChapter {
  id: string;
  bookId: string;
  index: number; // 1-based index
  title: string;
  paragraphs: string[];
  wordCount: number;
  volumeTitle?: string;
  specialType?: 'prologue' | 'epilogue' | 'side_story' | 'preface' | 'special';
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
  confidence?: DetectionConfidence;
  detectionStrategy?: string;
  description?: string;
}

export interface ReadingProgress {
  bookId: string;
  chapterIndex: number;
  chapterTitle: string;
  percentage: number;
  scrollPercent?: number; // 0 - 100
  scrollOffset?: number; // px offset
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
  confidence: DetectionConfidence;
  detectionStrategy?: string;
  diagnostics: ImportDiagnostics;
  rawBlob?: ArrayBuffer;
  suggestedCoverColor: string;
  coverUrl?: string;
}

export interface StorageEstimateInfo {
  usageMB: number;
  quotaMB: number;
  percentUsed: number;
  isPersistent: boolean;
}

export type ReaderErrorType = 'BOOK_NOT_FOUND' | 'CHAPTER_NOT_FOUND' | 'STORAGE_ERROR' | null;
