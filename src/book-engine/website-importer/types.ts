import { DetectionConfidence, NormalizedChapter, ParsedBookDraft } from '../types';

export interface SourceMetadata {
  type: 'website';
  adapter: string;
  url: string;
  hostname: string;
  importedAt: string;
}

export interface CandidateChapter {
  id?: string | number;
  index: number;
  title: string;
  url: string;
  slug?: string;
  date?: string;
  specialType?: 'prologue' | 'epilogue' | 'side_story' | 'preface' | 'special';
  volumeTitle?: string;
  isDuplicate?: boolean;
  status?: 'pending' | 'fetching' | 'success' | 'failed';
  error?: string;
  retries?: number;
  content?: string;
  paragraphs?: string[];
  wordCount?: number;
}

export interface CandidateBook {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  suggestedCoverColor?: string;
  sourceUrl: string;
  hostname: string;
  adapterName: string;
  totalChapters: number;
  chapters: CandidateChapter[];
  confidence: DetectionConfidence;
  confidenceReason?: string;
  missingChapters?: number[];
  duplicateChapters?: number[];
  diagnostics?: {
    postsCount?: number;
    pagesCount?: number;
    categoriesCount?: number;
    strategy: string;
  };
}

export interface WebsiteAnalysisResult {
  externalLinks?: Array<{ title: string; url: string; supported: boolean }>;
  adapter: string;
  siteName?: string;
  siteDescription?: string;
  hostname: string;
  sourceUrl: string;
  isWordPress: boolean;
  isWordPressCom: boolean;
  restApiBase?: string;
  candidateBooks: CandidateBook[];
  isSingleChapterLink?: boolean;
  singleChapterBookCandidate?: CandidateBook;
  singleChapterItem?: CandidateChapter;
  diagnostics: {
    totalPostsDiscovered: number;
    totalPagesDiscovered: number;
    categoriesDiscovered: number;
    restRoutes: string[];
    warnings: string[];
    errors: string[];
  };
}

export interface WebsiteAdapter {
  name: string;
  canHandle(url: string): boolean;
  analyze(url: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult>;
  fetchChapterContent(chapter: CandidateChapter, signal?: AbortSignal): Promise<{ content: string; paragraphs: string[]; wordCount: number }>;
}

export interface ChapterFetchProgress {
  currentChapterIndex: number;
  currentChapterTitle: string;
  completedCount: number;
  totalCount: number;
  failedChapters: CandidateChapter[];
  status: 'idle' | 'fetching' | 'success' | 'partial' | 'failed' | 'cancelled';
}
