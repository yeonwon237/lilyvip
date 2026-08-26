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
  private voiceId: string = 'ngochuyen';
  private playbackRate: number = 1.0;
  private bookTitle: string = '';
  private chapterTitle: string = '';
  private sleepTimerId: ReturnType<typeof setTimeout> | null = null;
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
      this.callbacks.onChapterComplete?.();
      return;
    }

    const chunk = this.chunks[this.currentChunkIndex];
    chunk.status = 'playing';

    this.callbacks.onChunkChange?.(this.currentChunkIndex, chunk.paragraphIndex);
    this.emitProgress();

    try {
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

      // 1. NEURAL AUDIO BLOB PLAYBACK (NGHI-TTS)
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
          console.warn('Audio playback error:', e);
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
            // Normal browser lifecycle when audio is paused or switched track
            return;
          }
          console.warn('Audio play rejected:', playErr);
        }
        return;
      }

      // 2. SYSTEM SPEECH PLAYBACK (FALLBACK)
      if (result.utterance) {
        let isChunkDone = false;
        const advanceChunk = async () => {
          if (isChunkDone || jobId !== this.activeJobId || this.isStopped) return;
          isChunkDone = true;
          chunk.status = 'played';

          if (this.isPaused) return;
          this.currentChunkIndex++;
          await this.playCurrentChunk(jobId);
        };

        result.utterance.onend = advanceChunk;

        result.utterance.onerror = (e) => {
          if (isChunkDone || jobId !== this.activeJobId || this.isStopped) return;
          console.warn('Utterance error:', e);
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
            console.error('SpeechSynthesis speak failed:', e);
            advanceChunk();
          }
        }
        return;
      }

      // If empty chunk, advance
      this.currentChunkIndex++;
      await this.playCurrentChunk(jobId);
    } catch (err: any) {
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
        userFacingMessage: err?.message || 'Không thể tổng hợp âm thanh cho đoạn này.',
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

    if (this.currentAudioElement) {
      this.currentAudioElement.play().catch(() => {});
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else {
      this.playCurrentChunk(this.activeJobId);
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

  public stop(): void {
    this.activeJobId++;
    this.isStopped = true;
    this.isPaused = false;
    
    this.cleanupActiveAudio();
    for (const pending of this.synthesisCache.values()) {
      pending.then(result => {
        if (result.audioUrl) URL.revokeObjectURL(result.audioUrl);
      }).catch(() => {});
    }
    this.synthesisCache.clear();
    this.nghiEngine.stop();
    this.systemEngine.stop();
    this.clearSleepTimer();
    
    this.callbacks.onStatusChange?.('READY');
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.currentAudioElement) {
      this.currentAudioElement.playbackRate = this.playbackRate;
    }
  }

  public setVoice(voiceId: string): void {
    this.voiceId = voiceId;
    if (!this.isStopped && !this.isPaused) {
      this.cleanupActiveAudio();
      this.nghiEngine.stop();
      this.systemEngine.stop();
      this.playCurrentChunk(this.activeJobId);
    }
  }

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
        artist: this.bookTitle || 'Lily Reader',
        album: 'Lily Local NghiTTS',
      });

      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('stop', () => this.stop());
    } catch {}
  }
}
