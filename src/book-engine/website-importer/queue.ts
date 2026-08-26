import { CandidateChapter, ChapterFetchProgress } from './types';

export interface QueueOptions {
  concurrency?: number;
  maxRetries?: number;
  delayBetweenItemsMs?: number;
  signal?: AbortSignal;
  onProgress?: (progress: ChapterFetchProgress) => void;
}

export class ChapterFetchQueue {
  private concurrency: number;
  private maxRetries: number;
  private delayBetweenItemsMs: number;
  private signal?: AbortSignal;
  private onProgress?: (progress: ChapterFetchProgress) => void;

  constructor(options: QueueOptions = {}) {
    this.concurrency = Math.max(1, Math.min(6, options.concurrency || 2));
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
    this.delayBetweenItemsMs = options.delayBetweenItemsMs !== undefined ? options.delayBetweenItemsMs : 80;
    this.signal = options.signal;
    this.onProgress = options.onProgress;
  }

  /**
   * Process a list of candidate chapters in parallel with bounded concurrency and retries
   */
  public async processChapters(
    chapters: CandidateChapter[],
    fetchFn: (chapter: CandidateChapter, signal?: AbortSignal) => Promise<{ content: string; paragraphs: string[]; wordCount: number }>
  ): Promise<{
    completed: CandidateChapter[];
    failed: CandidateChapter[];
    isCancelled: boolean;
  }> {
    const total = chapters.length;
    let completedCount = 0;
    const completedChapters: CandidateChapter[] = [];
    const failedChapters: CandidateChapter[] = [];
    let isCancelled = false;

    // Clone chapter list with initial status
    const queue: CandidateChapter[] = chapters.map(c => ({
      ...c,
      status: 'pending',
      retries: 0,
    }));

    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (nextIndex < queue.length) {
        if (this.signal?.aborted) {
          isCancelled = true;
          break;
        }

        const currentIndex = nextIndex++;
        const item = queue[currentIndex];

        item.status = 'fetching';
        this.emitProgress(item.index, item.title, completedCount, total, failedChapters, 'fetching');

        let success = false;
        let attempts = 0;

        while (attempts <= this.maxRetries && !success) {
          if (this.signal?.aborted) {
            isCancelled = true;
            break;
          }

          try {
            attempts++;
            const result = await fetchFn(item, this.signal);
            item.content = result.content;
            item.paragraphs = result.paragraphs;
            item.wordCount = result.wordCount;
            item.status = 'success';
            item.error = undefined;
            success = true;
            completedCount++;
            completedChapters.push(item);
          } catch (err: any) {
            if (this.signal?.aborted || err.name === 'AbortError') {
              isCancelled = true;
              break;
            }

            item.retries = attempts;
            item.error = err.message || 'Lỗi tải chương';

            if (attempts <= this.maxRetries) {
              // Exponential backoff
              await new Promise(r => setTimeout(r, 400 * attempts));
            }
          }
        }

        if (!success && !this.signal?.aborted) {
          item.status = 'failed';
          failedChapters.push(item);
        }

        this.emitProgress(
          item.index,
          item.title,
          completedCount,
          total,
          failedChapters,
          isCancelled ? 'cancelled' : 'fetching'
        );

        if (this.delayBetweenItemsMs > 0 && !this.signal?.aborted) {
          await new Promise(r => setTimeout(r, this.delayBetweenItemsMs));
        }
      }
    };

    // Run workers concurrently
    const activeWorkers: Promise<void>[] = [];
    const workerCount = Math.min(this.concurrency, chapters.length);

    for (let i = 0; i < workerCount; i++) {
      activeWorkers.push(worker());
    }

    await Promise.all(activeWorkers);

    // Sort completed chapters by their original index
    completedChapters.sort((a, b) => a.index - b.index);

    const finalStatus = isCancelled
      ? 'cancelled'
      : failedChapters.length > 0
      ? (completedCount > 0 ? 'partial' : 'failed')
      : 'success';

    this.emitProgress(
      total,
      'Hoàn tất',
      completedCount,
      total,
      failedChapters,
      finalStatus
    );

    return {
      completed: completedChapters,
      failed: failedChapters,
      isCancelled,
    };
  }

  private emitProgress(
    currentChapterIndex: number,
    currentChapterTitle: string,
    completedCount: number,
    totalCount: number,
    failedChapters: CandidateChapter[],
    status: ChapterFetchProgress['status']
  ) {
    if (this.onProgress) {
      this.onProgress({
        currentChapterIndex,
        currentChapterTitle,
        completedCount,
        totalCount,
        failedChapters,
        status,
      });
    }
  }
}
