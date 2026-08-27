import { TtsChunk, AudioPlayerStatus, AudioError, AudioProgressInfo, TtsSynthesisResult } from './types';
import { NghiTtsEngine } from './engines/NghiTtsEngine';
import { SystemSpeechEngine } from './engines/SystemSpeechEngine';
import { primeAudioPlaybackForSafari } from './runtime/PiperSafariCache';

export interface TtsQueueCallbacks {
  onStatusChange?: (status: AudioPlayerStatus) => void;
  onChunkChange?: (chunkIndex: number, paragraphIndex: number) => void;
  onProgress?: (progress: AudioProgressInfo) => void;
  onChapterComplete?: () => void;
  onError?: (error: AudioError) => void;
}

export class TtsQueue {
  private nghiEngine: NghiTtsEngine;
  private systemEngine: SystemSpeechEngine;
  private chunks: TtsChunk[] = [];
  private currentChunkIndex: number = 0;
  private isPaused: boolean = false;
  private isStopped: boolean = true;
  private chapterCompleteEmitted: boolean = false;
  private activeJobId: number = 0;
  private synthesizingJob: number | null = null;
  private systemPlaybackActive = false;
  private voiceId: string = 'ngochuyen';
  private playbackRate: number = 1.0;
  private bookTitle: string = '';
  private chapterTitle: string = '';
  private sleepTimerId: ReturnType<typeof setTimeout> | null = null;
  private sleepTimerEndsAt: number | null = null;
  private isEndOfChapterTimer: boolean = false;
  private callbacks: TtsQueueCallbacks = {};
  // Match LilyHub: prepare exactly one neural chunk while the current WAV is playing.
  // More than one lookahead can hold several ONNX sessions/WAVs and exhaust phone memory.
  private synthesisCache = new Map<number, Promise<TtsSynthesisResult>>();
  
  // Real HTMLAudioElement for neural WAV playback
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentAudioObjectUrl: string | null = null;

  constructor(callbacks?: TtsQueueCallbacks) {
    this.nghiEngine = NghiTtsEngine.getInstance();
    this.systemEngine = SystemSpeechEngine.getInstance();
    if (callbacks) this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: TtsQueueCallbacks): void {
    this.callbacks = callbacks;
  }

  /** Must run synchronously inside the user's play-button gesture on iOS Safari. */
  public primeForUserGesture(): void {
    if (!this.currentAudioElement) this.currentAudioElement = new Audio();
    primeAudioPlaybackForSafari(this.currentAudioElement);
  }

  /**
   * Loads chapter chunks and starts audio synthesis & playback
   */
  public async loadChapter(
    chunks: TtsChunk[], 
    bookTitle: string, 
    chapterTitle: string, 
    voiceId: string = 'ngochuyen',
    playbackRate: number = 1.0,
    startChunkIndex: number = 0
  ): Promise<void> {
    this.stop(false);

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
    this.chapterCompleteEmitted = false;

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
      if (this.chapterCompleteEmitted) return;
      this.chapterCompleteEmitted = true;
      this.isStopped = true;
      this.callbacks.onStatusChange?.('READY');

      if (this.isEndOfChapterTimer) {
        this.clearSleepTimer();
        this.pause();
        return;
      }

      this.callbacks.onChapterComplete?.();
      return;
    }

    const chunk = this.chunks[this.currentChunkIndex];
    chunk.status = 'playing';

    this.callbacks.onChunkChange?.(this.currentChunkIndex, chunk.paragraphIndex);
    this.emitProgress();

    try {
      this.synthesizingJob = jobId;
      const isSystemVoice = this.voiceId.startsWith('sys_');
      const engine = isSystemVoice ? this.systemEngine : this.nghiEngine;
      const cachedSynthesis = this.synthesisCache.get(this.currentChunkIndex);
      this.synthesisCache.delete(this.currentChunkIndex);
      const result = cachedSynthesis
        ? await cachedSynthesis
        : await engine.synthesize(chunk.text, this.voiceId, this.playbackRate);

      if (jobId !== this.activeJobId || this.isStopped) {
        if (result.audioUrl) URL.revokeObjectURL(result.audioUrl);
        return;
      }

      this.synthesizingJob = null;
      if (this.isPaused) {
        this.synthesisCache.set(this.currentChunkIndex, Promise.resolve(result));
        return;
      }

      // 1. NEURAL AUDIO BLOB PLAYBACK
      if (result.audioUrl) {
        // Start only the next inference now. It runs during playback and removes the model
        // preparation delay from the audible gap between two WAV files.
        this.prefetchNextNeuralChunk(this.currentChunkIndex + 1, jobId);
        this.cleanupActiveAudio(false);
        this.currentAudioObjectUrl = result.audioUrl;
        const audio = this.currentAudioElement || new Audio();
        this.currentAudioElement = audio;
        audio.src = result.audioUrl;
        audio.load();
        audio.playbackRate = this.playbackRate;

        audio.onended = async () => {
          if (jobId !== this.activeJobId || this.isStopped) return;
          chunk.status = 'played';
          this.cleanupActiveAudio(false);

          if (this.isPaused) return;
          this.currentChunkIndex++;
          await this.playCurrentChunk(jobId);
        };

        audio.onerror = (e) => {
          if (jobId !== this.activeJobId || this.isStopped) return;
          console.warn('Không phát được đoạn âm thanh.');
          chunk.status = 'error';
          this.cleanupActiveAudio(false);
          this.currentChunkIndex++;
          this.playCurrentChunk(jobId);
        };

        try {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        } catch (playErr: any) {
          if (
            playErr?.name === 'AbortError' || 
            playErr?.name === 'NotAllowedError' ||
            playErr?.message?.includes('interrupted') ||
            playErr?.message?.includes('pause')
          ) {
            if (jobId === this.activeJobId && playErr?.name === 'NotAllowedError') this.pause();
            return;
          }
          console.warn('Audio play rejected:', playErr);
        }
        return;
      }

      // 2. SYSTEM SPEECH PLAYBACK (FALLBACK)
      if (result.utterance) {
        this.systemPlaybackActive = true;
        let isChunkDone = false;
        const advanceChunk = async () => {
          if (isChunkDone || jobId !== this.activeJobId || this.isStopped) return;
          isChunkDone = true;
          this.systemPlaybackActive = false;
          chunk.status = 'played';

          if (this.isPaused) return;
          this.currentChunkIndex++;
          await this.playCurrentChunk(jobId);
        };

        result.utterance.onend = advanceChunk;

        result.utterance.onerror = (e) => {
          if (isChunkDone || jobId !== this.activeJobId || this.isStopped) return;
          console.warn('Giọng thiết bị chưa phát được đoạn này.');
          chunk.status = 'error';
          isChunkDone = true;
          this.currentChunkIndex++;
          this.playCurrentChunk(jobId);
        };

        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            window.speechSynthesis.resume();
            window.speechSynthesis.speak(result.utterance);

            // Safety timeout to prevent Chrome background queue lockup
            const maxWaitMs = Math.max(4000, (result.durationSec || 5) * 1500);
            setTimeout(() => {
              if (!isChunkDone && jobId === this.activeJobId && !this.isStopped && !this.isPaused) {
                advanceChunk();
              }
            }, maxWaitMs);
          } catch (e) {
            console.error('Không khởi động được giọng thiết bị.');
            advanceChunk();
          }
        }
        return;
      }

      // If empty chunk, advance
      this.currentChunkIndex++;
      await this.playCurrentChunk(jobId);
    } catch (err: any) {
      if (this.synthesizingJob === jobId) this.synthesizingJob = null;
      if (
        jobId !== this.activeJobId || 
        this.isStopped || 
        err?.name === 'AbortError' || 
        err?.message?.includes('interrupted') ||
        err?.message?.includes('pause')
      ) {
        return;
      }
      this.callbacks.onError?.({
        code: 'SYNTHESIS_FAILED',
        message: err?.message || 'Lỗi khi phát âm thanh',
        userFacingMessage: 'Không thể tạo âm thanh cho đoạn này. Hãy thử lại hoặc chọn giọng khác.',
      });
      this.callbacks.onStatusChange?.('ERROR');
    }
  }

  /**
   * Pauses active audio playback
   */
  public pause(): void {
    if (this.isStopped) return;
    this.isPaused = true;

    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }

    this.callbacks.onStatusChange?.('PAUSED');
  }

  /**
   * Resumes paused audio playback
   */
  public resume(): void {
    if (this.isStopped) return;
    this.isPaused = false;

    if (this.synthesisCache.has(this.currentChunkIndex)) {
      void this.playCurrentChunk(this.activeJobId);
    } else if (this.currentAudioElement && this.currentAudioObjectUrl) {
      this.currentAudioElement.play().catch(() => this.pause());
    } else if (this.systemPlaybackActive && typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else if (this.synthesizingJob !== this.activeJobId) {
      void this.playCurrentChunk(this.activeJobId);
    }

    this.callbacks.onStatusChange?.('PLAYING');
  }

  public togglePlay(): void {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  public stop(clearTimer = true): void {
    this.activeJobId++;
    this.isStopped = true;
    this.isPaused = false;
    
    this.synthesizingJob = null;
    this.systemPlaybackActive = false;
    this.cleanupActiveAudio(false);
    for (const pending of this.synthesisCache.values()) {
      pending.then(result => {
        if (result.audioUrl) URL.revokeObjectURL(result.audioUrl);
      }).catch(() => {});
    }
    this.synthesisCache.clear();
    this.nghiEngine.stop();
    this.systemEngine.stop();
    if (clearTimer) this.clearSleepTimer();
    
    this.callbacks.onStatusChange?.('READY');
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.currentAudioElement) {
      this.currentAudioElement.playbackRate = this.playbackRate;
    }
  }

  public setVoice(voiceId: string): void {
    if (this.voiceId === voiceId) return;
    const wasStopped = this.isStopped;
    const wasPaused = this.isPaused;
    this.stop(false);
    this.voiceId = voiceId;
    this.isStopped = wasStopped;
    this.isPaused = wasPaused;
    if (!wasStopped) {
      this.callbacks.onStatusChange?.(wasPaused ? 'PAUSED' : 'PLAYING');
      if (!wasPaused) void this.playCurrentChunk(this.activeJobId);
    }
  }

  public setSleepTimer(minutes: number | 'end_of_chapter' | null): void {
    this.clearSleepTimer();
    if (minutes === 'end_of_chapter') {
      this.isEndOfChapterTimer = true;
      this.sleepTimerEndsAt = null;
    } else if (typeof minutes === 'number' && minutes > 0) {
      this.isEndOfChapterTimer = false;
      this.sleepTimerEndsAt = Date.now() + minutes * 60 * 1000;
      this.sleepTimerId = setTimeout(() => {
        this.pause();
        this.clearSleepTimer();
      }, minutes * 60 * 1000);
    } else {
      this.isEndOfChapterTimer = false;
      this.sleepTimerEndsAt = null;
    }
  }

  public getSleepTimerRemainingMinutes(): number | null {
    if (this.isEndOfChapterTimer) return null;
    if (!this.sleepTimerEndsAt) return null;
    const remainingMs = this.sleepTimerEndsAt - Date.now();
    return Math.max(0, Math.ceil(remainingMs / 60000));
  }

  private clearSleepTimer(): void {
    if (this.sleepTimerId) {
      clearTimeout(this.sleepTimerId);
      this.sleepTimerId = null;
    }
    this.sleepTimerEndsAt = null;
    this.isEndOfChapterTimer = false;
  }

  private prefetchNextNeuralChunk(index: number, jobId: number): void {
    if (
      index >= this.chunks.length ||
      jobId !== this.activeJobId ||
      this.isStopped ||
      this.voiceId.startsWith('sys_') ||
      this.synthesisCache.has(index)
    ) return;

    const nextChunk = this.chunks[index];
    const task = this.nghiEngine.synthesize(nextChunk.text, this.voiceId, this.playbackRate);
    // Attach a rejection observer immediately; playCurrentChunk will still receive the same
    // rejection later and route it through the normal user-facing error handling.
    task.catch(() => {});
    this.synthesisCache.set(index, task);
  }

  private cleanupActiveAudio(releaseElement: boolean = true): void {
    if (this.currentAudioElement) {
      // Detach handlers before clearing src. Safari/Chromium may otherwise emit an
      // error event for src='', advancing the queue a second time after onended.
      this.currentAudioElement.onended = null;
      this.currentAudioElement.onerror = null;
      this.currentAudioElement.pause();
      this.currentAudioElement.src = '';
      if (releaseElement) this.currentAudioElement = null;
    }
    if (this.currentAudioObjectUrl) {
      URL.revokeObjectURL(this.currentAudioObjectUrl);
      this.currentAudioObjectUrl = null;
    }
  }

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

  private updateMediaSessionMetadata(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.chapterTitle || 'Đang đọc',
        artist: this.bookTitle || 'Lily VIP',
        album: 'Sách nói Lily',
      });

      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('stop', () => this.stop());
    } catch {}
  }
}
