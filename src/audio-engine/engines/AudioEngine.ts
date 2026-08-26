import { VoiceInfo } from '../types';

export interface AudioEngine {
  readonly id: string;
  readonly name: string;
  
  getVoiceList(): Promise<VoiceInfo[]>;
  isVoiceReady(voiceId: string): Promise<boolean>;
  downloadVoice(voiceId: string, onProgress?: (percent: number) => void): Promise<void>;
  synthesize(text: string, voiceId: string, playbackRate?: number): Promise<{ audioUrl?: string; utterance?: SpeechSynthesisUtterance; durationSec?: number }>;
  stop(): void;
}
