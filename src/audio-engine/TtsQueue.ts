import { TtsChunk, AudioPlayerStatus, AudioError, AudioProgressInfo } from './types';
import { NghiTtsEngine } from './engines/NghiTtsEngine';

export interface TtsQueueCallbacks {
  onStatusChange?: (status: AudioPlayerStatus) => void;
  onChunkChange?: (chunkIndex: number, paragraphIndex: number) => void;
  onProgress?: (progress: AudioProgressInfo) => void;
  onChapterComplete?: () => void;
  onError?: (error: AudioError) => void;
}

export class TtsQueue {
  private engine: NghiTtsEngine;
  private chunks: TtsChunk[] = [];
  private currentChunkIndex: number = 0;
  private isPaused: boolean = false;
  private isStopped: boolean = true;
  private activeJobId: number = 0;
  private voiceId: string = 'linh_nhi';
  private playbackRate: number = 1.0;
  private bookTitle: string = '';
  private chapterTitle: string = '';
  private sleepTimerId: ReturnType<typeof setTimeout> | null = null;
  private callbacks: TtsQueueCallbacks = {};

  constructor(callbacks?: TtsQueueCallbacks) {
    this.engine = NghiTtsEngine.getInstance();
    if (callbacks) this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: TtsQueueCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Initializes queue with new chunks and starts playback
   */
  public async loadChapter(
    chunks: TtsChunk[], 
    bookTitle: string, 
    chapterTitle: string, 
    voiceId: string = 'linh_nhi',
    playbackRate: number = 1.0,
    startChunkIndex: number = 0
  ): Promise<void> {
    this.stop();

    this.activeJobId++;
    const currentJob = this.activeJobId;

    this.chunks = chunks;
    this.currentChunkIndex = Math.max(0, Math.min(startChunkIndex, chunks.length - 1));
    this.bookTitle = bookTitle;
    this.chapterTitle = chapterTitle;
    this.voiceId = voiceId;
    this.playbackRate = playbackRate;
    this.isPaused = false;
    this.isStopped = false;

    this.updateMediaSessionMetadata();

    if (chunks.length === 0) {
      this.callbacks.onStatusChange?.('READY');
      return;
    }

    this.callbacks.onStatusChange?.('PLAYING');
    await this.playCurrentChunk(currentJob);
  }

  /**
   * Plays the chunk at currentChunkIndex
   */
  private async playCurrentChunk(jobId: number): Promise<void> {
    if (jobId !== this.activeJobId || this.isStopped) return;

    if (this.currentChunkIndex >= this.chunks.length) {
      this.callbacks.onStatusChange?.('READY');
      this.callbacks.onChapterComplete?.();
      return;
    }

    const chunk = this.chunks[this.currentChunkIndex];
    chunk.status = 'playing';

    // Notify listeners of active chunk and paragraph
    this.callbacks.onChunkChange?.(this.currentChunkIndex, chunk.paragraphIndex);
    this.emitProgress();

    try {
      const { utterance } = await this.engine.synthesize(chunk.text, this.voiceId, this.playbackRate);

      if (jobId !== this.activeJobId || this.isStopped) {
        this.engine.stop();
        return;
      }

      if (!utterance) {
        this.currentChunkIndex++;
        await this.playCurrentChunk(jobId);
        return;
      }

      utterance.onend = async () => {
        if (jobId !== this.activeJobId || this.isStopped) return;
        chunk.status = 'played';

        if (this.isPaused) return;

        this.currentChunkIndex++;
        await this.playCurrentChunk(jobId);
      };

      utterance.onerror = (e) => {
        if (jobId !== this.activeJobId || this.isStopped) return;
        console.warn('Utterance playback error:', e);
        chunk.status = 'error';
        // Auto-advance to next chunk on individual utterance error
        this.currentChunkIndex++;
        this.playCurrentChunk(jobId);
      };

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.speak(utterance);
      }
    } catch (err: any) {
      if (jobId !== this.activeJobId || this.isStopped) return;
      this.callbacks.onError?.({
        code: 'SYNTHESIS_FAILED',
        message: err?.message || 'Lỗi khi tổng hợp âm thanh',
        userFacingMessage: 'Không thể phát âm thanh cho đoạn này.',
      });
      this.callbacks.onStatusChange?.('ERROR');
    }
  }

  /**
   * Pauses active playback
   */
  public pause(): void {
    if (this.isStopped) return;
    this.isPaused = true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    this.callbacks.onStatusChange?.('PAUSED');
  }

  /**
   * Resumes paused playback
   */
  public resume(): void {
    if (this.isStopped) return;
    this.isPaused = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        this.playCurrentChunk(this.activeJobId);
      }
    }
    this.callbacks.onStatusChange?.('PLAYING');
  }

  /**
   * Toggles Play / Pause
   */
  public togglePlay(): void {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Stops playback and resets state
   */
  public stop(): void {
    this.activeJobId++;
    this.isStopped = true;
    this.isPaused = false;
    this.engine.stop();
    this.clearSleepTimer();
    this.callbacks.onStatusChange?.('READY');
  }

  /**
   * Sets playback rate in real-time
   */
  public setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    if (!this.isStopped && !this.isPaused) {
      // Re-trigger current chunk with updated speed
      this.engine.stop();
      this.playCurrentChunk(this.activeJobId);
    }
  }

  /**
   * Sets voice and re-triggers if playing
   */
  public setVoice(voiceId: string): void {
    this.voiceId = voiceId;
    if (!this.isStopped && !this.isPaused) {
      this.engine.stop();
      this.playCurrentChunk(this.activeJobId);
    }
  }

  /**
   * Sets Sleep Timer in minutes
   */
  public setSleepTimer(minutes: number | null): void {
    this.clearSleepTimer();
    if (minutes && minutes > 0) {
      this.sleepTimerId = setTimeout(() => {
        this.pause();
      }, minutes * 60 * 1000);
    }
  }

  private clearSleepTimer(): void {
    if (this.sleepTimerId) {
      clearTimeout(this.sleepTimerId);
      this.sleepTimerId = null;
    }
  }

  /**
   * Emits progress statistics
   */
  private emitProgress(): void {
    const total = this.chunks.length;
    const current = this.currentChunkIndex + 1;
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    const activePara = this.chunks[this.currentChunkIndex]?.paragraphIndex ?? 0;

    this.callbacks.onProgress?.({
      currentChunkIndex: this.currentChunkIndex,
      totalChunks: total,
      chunkProgressPercent: percent,
      chapterProgressPercent: percent,
      activeParagraphIndex: activePara,
    });
  }

  /**
   * Updates Media Session API metadata for lock-screen / bluetooth controls
   */
  private updateMediaSessionMetadata(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.chapterTitle || 'Đang đọc',
        artist: this.bookTitle || 'Lily Reader',
        album: 'Lily Local Audio',
      });

      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('stop', () => this.stop());
    } catch {}
  }
}
