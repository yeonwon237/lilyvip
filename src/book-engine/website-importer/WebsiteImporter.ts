import { 
  CandidateBook, 
  CandidateChapter, 
  ChapterFetchProgress, 
  WebsiteAdapter, 
  WebsiteAnalysisResult 
} from './types';
import { WordPressAdapter } from './adapters/WordPressAdapter';
import { WikiCvAdapter } from './adapters/WikiCvAdapter';
import { WattpadAdapter } from './adapters/WattpadAdapter';
import { CanvaDirectoryAdapter } from './adapters/CanvaDirectoryAdapter';
import { ChapterFetchQueue, QueueOptions } from './queue';
import { NormalizedChapter, ParsedBookDraft } from '../types';

export interface ImportExecutionOptions extends QueueOptions {
  onProgress?: (progress: ChapterFetchProgress) => void;
}

export class WebsiteImporter {
  private static adapters: WebsiteAdapter[] = [
    new WikiCvAdapter(),
    new WattpadAdapter(),
    new CanvaDirectoryAdapter(),
    new WordPressAdapter(),
  ];

  /**
   * Register a custom or future website adapter
   */
  public static registerAdapter(adapter: WebsiteAdapter): void {
    this.adapters.unshift(adapter);
  }

  /**
   * Resolve appropriate adapter for a given URL
   */
  public static getAdapter(url: string): WebsiteAdapter {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(url)) {
        return adapter;
      }
    }
    throw new Error('Không nhận diện được website này. Hiện tại Lily hỗ trợ nhập truyện từ WordPress, WikiCV / WikiDich, Wattpad và Canva Sites.');
  }

  /**
   * Analyze website URL to discover structure, candidate books and chapters (Discovery stage - NO full chapter download)
   */
  public static async analyze(url: string, signal?: AbortSignal): Promise<WebsiteAnalysisResult> {
    const adapter = this.getAdapter(url);
    return adapter.analyze(url, signal);
  }

  /**
   * Import candidate book chapters into NormalizedBookDraft with concurrency queue and retries
   */
  public static async fetchAndBuildDraft(
    candidateBook: CandidateBook,
    options: ImportExecutionOptions = {}
  ): Promise<{
    draft: ParsedBookDraft;
    completedChapters: CandidateChapter[];
    failedChapters: CandidateChapter[];
    isCancelled: boolean;
  }> {
    const adapter = this.getAdapter(candidateBook.sourceUrl);
    const queue = new ChapterFetchQueue({
      concurrency: options.concurrency || 4,
      maxRetries: options.maxRetries ?? 2,
      delayBetweenItemsMs: options.delayBetweenItemsMs ?? 40,
      signal: options.signal,
      onProgress: options.onProgress,
    });

    const { completed, failed, isCancelled } = await queue.processChapters(
      candidateBook.chapters,
      (chapter, signal) => adapter.fetchChapterContent(chapter, signal)
    );

    if (completed.length === 0 && !isCancelled) {
      throw new Error('Không tải được nội dung chương nào từ website.');
    }

    // Build NormalizedChapter array for Lily BookEngine
    let totalWords = 0;
    const normalizedChapters: NormalizedChapter[] = completed.map((ch, idx) => {
      const words = ch.wordCount || 0;
      totalWords += words;

      return {
        id: `web_chap_${idx + 1}_${Date.now()}`,
        bookId: candidateBook.id,
        index: idx + 1,
        title: ch.title,
        paragraphs: ch.paragraphs || (ch.content ? ch.content.split('\n\n') : []),
        wordCount: words,
        volumeTitle: ch.volumeTitle,
        specialType: ch.specialType,
      };
    });

    // Approximate size in MB (words * 6 bytes average)
    const approximateSizeMB = Number(((totalWords * 6) / (1024 * 1024)).toFixed(2)) || 0.1;

    const draft: ParsedBookDraft = {
      title: candidateBook.title,
      author: candidateBook.author || 'Tác giả',
      originalFileName: candidateBook.hostname,
      fileFormat: 'WEBSITE' as any,
      fileSizeMB: approximateSizeMB,
      totalChapters: normalizedChapters.length,
      wordCount: totalWords,
      chapters: normalizedChapters,
      hasDetectedChapters: true,
      confidence: candidateBook.confidence,
      detectionStrategy: `${adapter.name.toUpperCase()} Importer (${normalizedChapters.length} chương)`,
      suggestedCoverColor: candidateBook.suggestedCoverColor || '#D9829B',
      coverUrl: candidateBook.coverUrl,
      diagnostics: {
        format: 'WEBSITE' as any,
        fileSize: totalWords * 6,
        decodedEncoding: 'UTF-8',
        rawCharacters: totalWords * 6,
        cleanedCharacters: totalWords * 5,
        detectedHeadingCount: normalizedChapters.length,
        chapterCount: normalizedChapters.length,
        detectionStrategy: `${adapter.name.toUpperCase()} Web Importer`,
        confidence: candidateBook.confidence,
        warnings: failed.length > 0 ? [`Có ${failed.length} chương chưa tải được.`] : [],
        errors: [],
        firstChaptersPreview: normalizedChapters.slice(0, 3).map(c => `${c.index}. ${c.title}`),
        lastChaptersPreview: normalizedChapters.slice(-3).map(c => `${c.index}. ${c.title}`),
      },
    };

    return {
      draft,
      completedChapters: completed,
      failedChapters: failed,
      isCancelled,
    };
  }
}
