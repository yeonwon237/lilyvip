import { TranslationEngine } from './TranslationEngine';
import { TranslationCache, buildTranslationCacheKey } from './TranslationCache';
import { TranslationProgress } from './TranslationWorkerClient';
import { LocalBookSource } from '../book-engine/source/LocalBookSource';

export interface TranslationJob {
  bookId: string;
  chapterIndex: number;
  modelId: string;
  polish: boolean;
  /** 'foreground' jumps to the front of the queue (the reader is waiting on it right now);
   *  'background' is a pre-fetch queued behind whatever else is running so reading stays smooth. */
  priority: 'foreground' | 'background';
}

interface TranslationQueueCallbacks {
  onJobStart?: (job: TranslationJob) => void;
  onJobProgress?: (job: TranslationJob, progress: TranslationProgress) => void;
  onJobDone?: (job: TranslationJob, paragraphs: string[]) => void;
  onJobError?: (job: TranslationJob, message: string) => void;
  onQueueIdle?: () => void;
}

const jobKey = (job: Pick<TranslationJob, 'bookId' | 'chapterIndex' | 'modelId' | 'polish'>) =>
  buildTranslationCacheKey(job.bookId, job.chapterIndex, job.modelId, job.polish);

/**
 * Runs chapter translation jobs one at a time — both the reader's own "translate this
 * chapter" click and speculative background pre-translation of upcoming chapters share
 * this single queue, since only one ONNX inference can safely run in the worker at once.
 * A foreground job jumps ahead of any queued background jobs so the reader never waits
 * behind a batch they didn't ask for right now.
 */
export class TranslationQueue {
  private queue: TranslationJob[] = [];
  private runningKey: string | null = null;
  private isProcessing = false;
  private callbacks: TranslationQueueCallbacks = {};

  setCallbacks(callbacks: TranslationQueueCallbacks): void {
    this.callbacks = callbacks;
  }

  getQueuedChapters(bookId: string): number[] {
    return this.queue.filter(j => j.bookId === bookId).map(j => j.chapterIndex);
  }

  isChapterActive(bookId: string, chapterIndex: number, modelId: string, polish: boolean): boolean {
    const key = jobKey({ bookId, chapterIndex, modelId, polish });
    return this.runningKey === key || this.queue.some(j => jobKey(j) === key);
  }

  /** Adds a job. Silently resolves against the cache if this exact chapter/model/polish
   *  combo was already translated, and skips duplicates already queued or running. */
  async enqueue(job: TranslationJob): Promise<void> {
    const key = jobKey(job);
    if (this.runningKey === key) return;

    const existingIndex = this.queue.findIndex(j => jobKey(j) === key);
    if (existingIndex !== -1) {
      if (job.priority === 'foreground' && this.queue[existingIndex].priority !== 'foreground') {
        const [existing] = this.queue.splice(existingIndex, 1);
        this.queue.unshift({ ...existing, priority: 'foreground' });
        this.processNext();
      }
      return;
    }

    const cached = await TranslationCache.get(key);
    if (cached) {
      this.callbacks.onJobDone?.(job, cached.paragraphs);
      return;
    }

    if (job.priority === 'foreground') {
      this.queue.unshift(job);
    } else {
      this.queue.push(job);
    }
    this.processNext();
  }

  /** Drops queued (not yet running) background jobs for a book — e.g. when the user
   *  switches translation model and the old pre-fetch batch is no longer wanted. */
  cancelBackground(bookId: string): void {
    this.queue = this.queue.filter(j => !(j.bookId === bookId && j.priority === 'background'));
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    const job = this.queue.shift();
    if (!job) {
      this.callbacks.onQueueIdle?.();
      return;
    }

    this.isProcessing = true;
    this.runningKey = jobKey(job);
    this.callbacks.onJobStart?.(job);

    try {
      const chapter = await LocalBookSource.getInstance().getChapter(job.bookId, job.chapterIndex);
      const paragraphs = chapter?.paragraphs;
      if (!paragraphs || paragraphs.length === 0) {
        throw new Error('Không tìm thấy nội dung chương để dịch.');
      }

      const result = await TranslationEngine.getInstance().translateChapter(
        paragraphs,
        job.modelId,
        job.polish,
        (progress) => this.callbacks.onJobProgress?.(job, progress)
      );

      await TranslationCache.set(jobKey(job), { paragraphs: result, cachedAt: Date.now() });
      this.callbacks.onJobDone?.(job, result);
    } catch (err: any) {
      this.callbacks.onJobError?.(job, err?.message || 'Không thể dịch chương này.');
    } finally {
      this.runningKey = null;
      this.isProcessing = false;
      this.processNext();
    }
  }
}
