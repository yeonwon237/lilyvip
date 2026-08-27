import { AudioEngine } from './AudioEngine';
import { VoiceInfo, TtsSynthesisResult } from '../types';
import { normalizeForSpeech } from '../TtsTextPreprocessor';

export class SystemSpeechEngine implements AudioEngine {
  public readonly id = 'system-speech';
  public readonly name = 'Giọng hệ thống (Web Speech API)';
  public readonly isNeuralEngine = false;

  private static instance: SystemSpeechEngine | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  public static getInstance(): SystemSpeechEngine {
    if (!this.instance) {
      this.instance = new SystemSpeechEngine();
    }
    return this.instance;
  }

  /**
   * Discovers all installed system voices from the browser/OS
   */
  public async getVoiceList(): Promise<VoiceInfo[]> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return [];
    }

    const sysVoices = window.speechSynthesis.getVoices();
    const viVoices = sysVoices.filter(v => v.localService === true && (v.lang.startsWith('vi') || v.name.toLowerCase().includes('vietnam')));

    if (viVoices.length > 0) {
      return viVoices.map((v, idx) => ({
        id: `sys_${v.name.toLowerCase().replace(/\s+/g, '_')}_${idx}`,
        name: `${v.name} (Hệ thống)`,
        gender: v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('nữ') || v.name.toLowerCase().includes('linh') ? 'female' : 'male',
        region: 'north',
        description: `Giọng đọc hệ thống ${v.name} tích hợp sẵn trên thiết bị`,
        sampleText: 'Đây là giọng đọc mặc định của hệ điều hành trên thiết bị của bạn.',
        modelSizeMB: 0,
        isInstalled: true,
        engineType: 'system-speech',
      }));
    }

    return [];
  }

  public async isVoiceReady(_voiceId: string): Promise<boolean> {
    return true; // System voices are always ready
  }

  public async downloadVoice(_voiceId: string): Promise<void> {
    // System voices do not require downloading
    return;
  }

  public async synthesize(
    text: string, 
    _voiceId: string, 
    playbackRate: number = 1.0
  ): Promise<TtsSynthesisResult> {
    const normalizedText = normalizeForSpeech(text);
    if (!normalizedText) {
      return { durationSec: 0, engine: 'system-speech' };
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      throw new Error('Trình duyệt không hỗ trợ Web Speech API.');
    }

    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.lang = 'vi-VN';
    utterance.rate = Math.max(0.5, Math.min(2.0, playbackRate));

    const sysVoices = window.speechSynthesis.getVoices();
    const localVoices = sysVoices.filter(v => v.localService === true && v.lang.startsWith('vi'));
    const viVoice = localVoices.find((v, idx) => `sys_${v.name.toLowerCase().replace(/\s+/g, '_')}_${idx}` === _voiceId) || localVoices[0];
    if (!viVoice) throw new Error('Chưa có giọng tiếng Việt trên thiết bị. Hãy tải Giọng Lily trước khi nghe.');
    if (viVoice) {
      utterance.voice = viVoice;
    }

    const wordCount = normalizedText.split(/\s+/).length;
    const durationSec = Math.max(1, Number(((wordCount / (160 * playbackRate)) * 60).toFixed(1)));
    this.currentUtterance = utterance;

    return {
      utterance,
      durationSec,
      engine: 'system-speech',
    };
  }

  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.currentUtterance = null;
  }
}
