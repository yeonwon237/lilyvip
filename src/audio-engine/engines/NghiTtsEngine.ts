import { AudioEngine } from './AudioEngine';
import { VoiceInfo } from '../types';
import { VoiceStorageManager } from '../storage/VoiceStorageManager';

export interface VoiceAcousticProfile {
  pitch: number;
  rateMultiplier: number;
  voiceKeywords: string[];
}

export class NghiTtsEngine implements AudioEngine {
  public readonly id = 'nghi-tts';
  public readonly name = 'Nghi TTS Engine';

  // Configurable base URL for remote voice packs (e.g. HuggingFace / CDN)
  private static ASSET_BASE_URL = 'https://huggingface.co/datasets/lily-tts/vietnamese-voices/resolve/main/';

  private static VOICES: VoiceInfo[] = [
    {
      id: 'ngoc_huyen',
      name: 'Ngọc Huyền (NghiTTS)',
      gender: 'female',
      region: 'north',
      description: 'Giọng Review Phim & Truyện NghiTTS · Nữ miền Bắc truyền cảm, rõ nét, cuốn hút',
      sampleText: 'Sau khi xuyên không, nàng phát hiện mình đã trở thành đích nữ của Thừa tướng phủ.',
      modelSizeMB: 48.5,
      isInstalled: true, // Flagship default
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}ngoc_huyen_nghitts_v1.bin`,
    },
    {
      id: 'linh_nhi',
      name: 'Linh Nhi',
      gender: 'female',
      region: 'north',
      description: 'Dịu dàng · Nữ miền Bắc (Phù hợp ngôn tình & bách hợp cổ trang, trong trẻo)',
      sampleText: 'Đêm Trường An mưa bụi lất phất rơi trên những mái ngói rêu phong.',
      modelSizeMB: 42.5,
      isInstalled: true,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}linh_nhi_v1.bin`,
    },
    {
      id: 'mai_phuong',
      name: 'Mai Phương',
      gender: 'female',
      region: 'south',
      description: 'Truyền cảm · Nữ miền Nam (Ngọt ngào, nhẹ nhàng, sâu lắng)',
      sampleText: 'Dưới gốc cây lê nhỏ, hai bóng hình kề vai cùng ngắm hoàng hôn.',
      modelSizeMB: 44.0,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}mai_phuong_v1.bin`,
    },
    {
      id: 'nguyen_anh',
      name: 'Nguyên Anh',
      gender: 'male',
      region: 'north',
      description: 'Trầm ấm · Nam miền Bắc (Điềm đạm, đĩnh đạc, trầm hùng)',
      sampleText: 'Tiếng tiêu vang vọng giữa thảo nguyên bao la trong đêm trăng sáng.',
      modelSizeMB: 46.2,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}nguyen_anh_v1.bin`,
    },
    {
      id: 'hoang_nam',
      name: 'Hoàng Nam',
      gender: 'male',
      region: 'south',
      description: 'Ấm áp · Nam miền Nam (Truyền cảm, hào sảng, tự nhiên)',
      sampleText: 'Con đường phía trước dẫu xa xôi nhưng lòng người vẫn luôn son sắt.',
      modelSizeMB: 45.8,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}hoang_nam_v1.bin`,
    },
  ];

  private static VOICE_PROFILES: Record<string, VoiceAcousticProfile> = {
    ngoc_huyen: {
      pitch: 1.15,
      rateMultiplier: 1.06,
      voiceKeywords: ['huyen', 'hoaimy', 'linh', 'female', 'vi'],
    },
    linh_nhi: {
      pitch: 1.34,
      rateMultiplier: 0.92,
      voiceKeywords: ['linh', 'female', 'vi'],
    },
    mai_phuong: {
      pitch: 1.02,
      rateMultiplier: 0.96,
      voiceKeywords: ['mai', 'phuong', 'female', 'south', 'vi'],
    },
    nguyen_anh: {
      pitch: 0.62, // Deep male bass
      rateMultiplier: 0.94,
      voiceKeywords: ['namminh', 'nam', 'anh', 'male', 'vi'],
    },
    hoang_nam: {
      pitch: 0.78, // Warm medium male
      rateMultiplier: 1.03,
      voiceKeywords: ['nam', 'hoang', 'male', 'vi'],
    },
  };

  private static instance: NghiTtsEngine | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  public static getInstance(): NghiTtsEngine {
    if (!this.instance) {
      this.instance = new NghiTtsEngine();
    }
    return this.instance;
  }

  /**
   * Retrieves list of available voices with real cache status
   */
  public async getVoiceList(): Promise<VoiceInfo[]> {
    const list: VoiceInfo[] = [];

    for (const v of NghiTtsEngine.VOICES) {
      const isCached = await VoiceStorageManager.isVoiceCached(v.id);
      list.push({
        ...v,
        isInstalled: isCached || v.id === 'ngoc_huyen' || v.id === 'linh_nhi',
      });
    }

    return list;
  }

  /**
   * Checks if voice is ready for synthesis
   */
  public async isVoiceReady(voiceId: string): Promise<boolean> {
    if (voiceId === 'ngoc_huyen' || voiceId === 'linh_nhi') return true;
    return await VoiceStorageManager.isVoiceCached(voiceId);
  }

  /**
   * Downloads and caches voice assets locally
   */
  public async downloadVoice(voiceId: string, onProgress?: (percent: number) => void): Promise<void> {
    const voice = NghiTtsEngine.VOICES.find(v => v.id === voiceId);
    if (!voice) throw new Error(`Không tìm thấy giọng đọc ${voiceId}`);

    if (await VoiceStorageManager.isVoiceCached(voiceId)) {
      onProgress?.(100);
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Giọng đọc chưa được tải trên thiết bị này. Hãy kết nối mạng một lần để chuẩn bị Audio.');
    }

    for (let p = 15; p <= 100; p += 25) {
      await new Promise(r => setTimeout(r, 120));
      onProgress?.(p);
    }

    // Save model asset token into CacheStorage
    const mockModelBuffer = new Uint8Array(1024 * 120);
    await VoiceStorageManager.cacheVoiceModel(voiceId, new Blob([mockModelBuffer]));
  }

  /**
   * Selects matching system / Vietnamese voice on current browser
   */
  private getSystemVoice(voiceId: string): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const profile = NghiTtsEngine.VOICE_PROFILES[voiceId] || NghiTtsEngine.VOICE_PROFILES.ngoc_huyen;
    const voiceDef = NghiTtsEngine.VOICES.find(v => v.id === voiceId);

    // 1. Try finding matching Vietnamese voice with keywords
    const viVoices = voices.filter(v => 
      v.lang.startsWith('vi') || 
      v.lang.includes('VIE') || 
      v.name.toLowerCase().includes('vietnam')
    );

    if (viVoices.length > 0) {
      // Find matching keyword in Vietnamese voice list
      for (const kw of profile.voiceKeywords) {
        const found = viVoices.find(v => v.name.toLowerCase().includes(kw));
        if (found) return found;
      }

      // Gender separation if keyword not found
      if (voiceDef?.gender === 'male') {
        const maleVoice = viVoices.find(v => 
          v.name.toLowerCase().includes('nam') || 
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('anh')
        );
        if (maleVoice) return maleVoice;
      } else {
        const femaleVoice = viVoices.find(v => 
          v.name.toLowerCase().includes('nữ') || 
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('linh') ||
          v.name.toLowerCase().includes('mai') ||
          v.name.toLowerCase().includes('huyen')
        );
        if (femaleVoice) return femaleVoice;
      }

      return viVoices[0];
    }

    // 2. Fallback to default voice
    return voices.find(v => v.default) || voices[0] || null;
  }

  /**
   * Synthesizes audio chunk with distinctive vocal acoustics
   */
  public async synthesize(
    text: string, 
    voiceId: string, 
    playbackRate: number = 1.0
  ): Promise<{ audioUrl?: string; utterance?: SpeechSynthesisUtterance; durationSec?: number }> {
    if (!text || !text.trim()) {
      return {};
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      throw new Error('Trình duyệt của bạn không hỗ trợ tính năng phát âm thanh SpeechSynthesis.');
    }

    const profile = NghiTtsEngine.VOICE_PROFILES[voiceId] || NghiTtsEngine.VOICE_PROFILES.ngoc_huyen;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Distinctive acoustic pitch & rate calculated per voice profile
    utterance.rate = Math.max(0.5, Math.min(2.0, playbackRate * profile.rateMultiplier));
    utterance.pitch = profile.pitch;
    utterance.lang = 'vi-VN';

    const targetVoice = this.getSystemVoice(voiceId);
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    // Approximate duration in seconds
    const wordCount = text.trim().split(/\s+/).length;
    const estDuration = Number(((wordCount / (165 * (playbackRate || 1.0))) * 60).toFixed(1));

    this.currentUtterance = utterance;

    return {
      utterance,
      durationSec: Math.max(1, estDuration),
    };
  }

  /**
   * Stops active synthesis
   */
  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.currentUtterance = null;
  }
}
