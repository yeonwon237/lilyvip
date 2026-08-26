import { VoiceInfo, TtsSynthesisResult } from '../types';

export interface AudioEngine {
  readonly id: string;
  readonly name: string;
  readonly isNeuralEngine: boolean;
  
  getVoiceList(): Promise<VoiceInfo[]>;
  isVoiceReady(voiceId: string): Promise<boolean>;
  downloadVoice(voiceId: string, onProgress?: (percent: number) => void): Promise<void>;
  synthesize(text: string, voiceId: string, playbackRate?: number): Promise<TtsSynthesisResult>;
  stop(): void;
}
