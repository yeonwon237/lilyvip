/**
 * Audio & TTS Engine Type Definitions for Lily Reader
 */

export type AudioEngineType = 'nghi-tts' | 'system-speech';

export type AudioPlayerStatus = 
  | 'LOCKED'
  | 'MODEL_NOT_READY'
  | 'DOWNLOADING_MODEL'
  | 'READY'
  | 'SYNTHESIZING'
  | 'PLAYING'
  | 'PAUSED'
  | 'ERROR';

export type AudioErrorCode = 
  | 'MODEL_LOAD_FAILED'
  | 'VOICE_LOAD_FAILED'
  | 'SYNTHESIS_FAILED'
  | 'PLAYBACK_FAILED'
  | 'OUT_OF_MEMORY'
  | 'UNSUPPORTED_BROWSER'
  | 'OFFLINE_FIRST_LOAD';

export interface AudioError {
  code: AudioErrorCode;
  message: string;
  userFacingMessage: string;
}

export type VoiceGender = 'female' | 'male';
export type VoiceRegion = 'north' | 'south' | 'central';

export interface VoiceInfo {
  id: string;
  name: string;
  gender: VoiceGender;
  region: VoiceRegion;
  description: string;
  sampleText: string;
  modelSizeMB: number;
  isInstalled: boolean;
  modelAssetUrl?: string;
  engineType: AudioEngineType;
}

export interface TtsSynthesisResult {
  audioBlob?: Blob;
  audioUrl?: string;
  durationSec: number;
  utterance?: SpeechSynthesisUtterance;
  engine: AudioEngineType;
}

export type ChunkStatus = 'pending' | 'synthesizing' | 'ready' | 'playing' | 'played' | 'error';

export interface TtsChunk {
  id: string;
  index: number;
  paragraphIndex: number;
  text: string;
  status: ChunkStatus;
  audioBlob?: Blob;
  audioUrl?: string;
  durationSec?: number;
  error?: string;
}

export interface AudioAccess {
  enabled: boolean;
  source: 'dev' | 'local-test' | 'future-pass';
  expiresAt?: string;
}

export interface AudioSettings {
  voiceId: string;
  playbackRate: number;
  autoNextChapter: boolean;
  readChapterTitle: boolean;
  followReadingText: boolean;
  sleepTimerMinutes: number | 'end_of_chapter' | null;
}

export interface AudioProgressInfo {
  currentChunkIndex: number;
  totalChunks: number;
  chunkProgressPercent: number;
  chapterProgressPercent: number;
  activeParagraphIndex: number;
}
