import { AudioEngine } from './AudioEngine';
import { normalizeForSpeech } from '../TtsTextPreprocessor';
import { VoiceInfo, TtsSynthesisResult } from '../types';
import * as tts from '@diffusionstudio/vits-web';
import { ensureExternalVoiceCached, isExternalVoiceCached } from '../runtime/PiperSafariCache';
import { predictPiper, terminatePiperWorker } from '../runtime/PiperWorkerClient';

export class NghiTtsEngine implements AudioEngine {
  public readonly id = 'nghi-tts';
  public readonly name = 'Nghi TTS Engine (Local Neural ONNX)';
  public readonly isNeuralEngine = true;

  // Official Hugging Face repository for NghiTTS Piper ONNX models
  public static readonly ASSET_BASE_URL = 'https://huggingface.co/doof-ferb/nghitts-copy/resolve/main/piper-tts/';
  public static readonly CONFIG_URL = 'https://huggingface.co/doof-ferb/nghitts-copy/resolve/main/piper-tts/config.json';

  // REAL LILY VOICES FROM THE PIPER ONNX REPOSITORY
  private static REAL_NGHI_VOICES: VoiceInfo[] = [
    {
      id: 'ngochuyen',
      name: 'Lily Huyền',
      gender: 'female',
      region: 'north',
      description: 'Trong trẻo · truyền cảm',
      sampleText: 'Sau khi xuyên không, nàng phát hiện mình đã trở thành đích nữ của Thừa tướng phủ.',
      modelSizeMB: 48.5,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}ngochuyen.onnx`,
      engineType: 'nghi-tts',
    },
    {
      id: 'ngochuyennew',
      name: 'Lily Huyền 2',
      gender: 'female',
      region: 'north',
      description: 'Mượt mà · giàu cảm xúc',
      sampleText: 'Ánh trăng chiếu rọi khắp sân viện, tiếng gió thoảng qua mang theo hương hoa nhài.',
      modelSizeMB: 48.5,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}ngochuyennew.onnx`,
      engineType: 'nghi-tts',
    },
    {
      id: 'maiphuong',
      name: 'Lily Mai',
      gender: 'female',
      region: 'south',
      description: 'Dịu dàng · ấm áp',
      sampleText: 'Dưới gốc cây lê nhỏ ven sông, hai người cùng ngồi ngắm hoàng hôn buông xuống.',
      modelSizeMB: 44.0,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}maiphuong.onnx`,
      engineType: 'nghi-tts',
    },
    {
      id: 'minhkhang',
      name: 'Lily Khang',
      gender: 'male',
      region: 'north',
      description: 'Trầm ấm · rõ ràng',
      sampleText: 'Con đường phía trước dẫu còn nhiều chông gai nhưng ý chí vẫn luôn kiên định.',
      modelSizeMB: 46.2,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}minhkhang.onnx`,
      engineType: 'nghi-tts',
    },
    {
      id: 'manhdung',
      name: 'Lily Dũng',
      gender: 'male',
      region: 'north',
      description: 'Điềm tĩnh · chắc giọng',
      sampleText: 'Tiếng tiêu vang vọng giữa thảo nguyên bao la trong đêm trăng sáng.',
      modelSizeMB: 46.5,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}manhdung.onnx`,
      engineType: 'nghi-tts',
    },
    {
      id: 'minhthu',
      name: 'Lily Thu',
      gender: 'female',
      region: 'north',
      description: 'Nhẹ nhàng · tự nhiên',
      sampleText: 'Gió sớm mai thổi nhẹ làm lay động những cánh hoa còn đọng sương đêm.',
      modelSizeMB: 44.8,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}minhthu.onnx`,
      engineType: 'nghi-tts',
    },
    {
      id: 'vietthao3886',
      name: 'Lily Thảo',
      gender: 'male',
      region: 'south',
      description: 'Êm dịu · kể chuyện',
      sampleText: 'Kính thưa quý vị, câu chuyện ly kỳ này bắt đầu từ một buổi chiều mưa gió.',
      modelSizeMB: 47.0,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}vietthao3886.onnx`,
      engineType: 'nghi-tts',
    },
  ];

  private static instance: NghiTtsEngine | null = null;
  private activeAudioElement: HTMLAudioElement | null = null;

  public static getInstance(): NghiTtsEngine {
    if (!this.instance) {
      this.instance = new NghiTtsEngine();
    }
    return this.instance;
  }

  /**
   * Returns list of real NghiTTS voices with actual cache status
   */
  public async getVoiceList(): Promise<VoiceInfo[]> {
    const list: VoiceInfo[] = [];

    for (const v of NghiTtsEngine.REAL_NGHI_VOICES) {
      const isCached = await isExternalVoiceCached(v.id);
      list.push({
        ...v,
        isInstalled: isCached,
      });
    }

    return list;
  }

  /**
   * Checks if voice model is cached locally
   */
  public async isVoiceReady(voiceId: string): Promise<boolean> {
    return isExternalVoiceCached(voiceId);
  }

  /**
   * Real streaming download of the ONNX model file into CacheStorage
   */
  public async downloadVoice(voiceId: string, onProgress?: (percent: number) => void): Promise<void> {
    const voice = NghiTtsEngine.REAL_NGHI_VOICES.find(v => v.id === voiceId);
    if (!voice || !voice.modelAssetUrl) {
      throw new Error(`Không tìm thấy cấu hình giọng đọc: ${voiceId}`);
    }

    if (await isExternalVoiceCached(voiceId)) {
      onProgress?.(100);
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Thiết bị đang ngoại tuyến. Hãy kết nối internet để tải giọng đọc.');
    }

    try {
      await ensureExternalVoiceCached(tts, {
        id: voice.id,
        modelUrl: voice.modelAssetUrl,
        configUrl: NghiTtsEngine.CONFIG_URL,
      }, onProgress);
    } catch (err: any) {
      console.error('Voice model download error:', err);
      throw new Error('Chưa tải được giọng. Hãy kiểm tra kết nối và thử lại.');
    }
  }

  /**
   * Real in-browser ONNX Neural Speech Synthesis
   */
  public async synthesize(
    text: string, 
    voiceId: string, 
    playbackRate: number = 1.0
  ): Promise<TtsSynthesisResult> {
    const normalizedText = normalizeForSpeech(text);
    if (!normalizedText) {
      return { durationSec: 0, engine: 'nghi-tts' };
    }

    const voice = NghiTtsEngine.REAL_NGHI_VOICES.find(v => v.id === voiceId);
    if (voice && await isExternalVoiceCached(voiceId)) {
      try {
        const pathMap = tts.PATH_MAP as unknown as Record<string, string>;
        pathMap[voiceId] = `external/${voiceId}.onnx`;
        const speechText = normalizedText.replace(/\brobot\b/gi, 'rô bốt').replace(/\.(?=\s|$)/g, ',').replace(/,\s*,+/g, ', ').replace(/\s+/g, ' ').trim();
        const wavBlob = await predictPiper(speechText, voiceId, pathMap[voiceId]);
        const audioUrl = URL.createObjectURL(wavBlob);
        const durationSec = Math.max(1, normalizedText.split(/\s+/).length / (165 * playbackRate) * 60);

        return {
          audioBlob: wavBlob,
          audioUrl,
          durationSec,
          engine: 'nghi-tts',
        };
      } catch (err) {
        console.warn('ONNX neural inference error, using instant fallback:', err);
      }
    }

    // Fast instant speech synthesis if ONNX model is not downloaded yet
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(normalizedText);
      utterance.lang = 'vi-VN';
      utterance.rate = Math.max(0.6, Math.min(1.8, playbackRate));

      const sysVoices = window.speechSynthesis.getVoices();
      const viVoice = sysVoices.find(v => v.lang.startsWith('vi') || v.lang.includes('VIE'));
      if (viVoice) utterance.voice = viVoice;

      const words = normalizedText.split(/\s+/);
      const durationSec = Math.max(1, Number(((words.length / (165 * (playbackRate || 1.0))) * 60).toFixed(2)));

      return {
        utterance,
        durationSec,
        engine: 'nghi-tts',
      };
    }

    throw new Error('Không thể khởi tạo âm thanh trên thiết bị.');
  }

  public stop(): void {
    if (this.activeAudioElement) {
      this.activeAudioElement.pause();
      this.activeAudioElement.src = '';
      this.activeAudioElement = null;
    }
    terminatePiperWorker();
  }
}
