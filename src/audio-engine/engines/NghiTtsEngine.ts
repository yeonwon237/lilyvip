import { AudioEngine } from './AudioEngine';
import { VoiceInfo, TtsSynthesisResult } from '../types';
import { VoiceStorageManager } from '../storage/VoiceStorageManager';
import { OnnxRuntimeLoader } from '../runtime/OnnxRuntimeLoader';
import { textToPhonemeSequence } from '../runtime/Phonemizer';
import { encodeFloat32ToWavBlob } from '../runtime/WavEncoder';

export class NghiTtsEngine implements AudioEngine {
  public readonly id = 'nghi-tts';
  public readonly name = 'Nghi TTS Engine (Local Neural ONNX)';
  public readonly isNeuralEngine = true;

  // Official Hugging Face repository for NghiTTS Piper ONNX models
  public static readonly ASSET_BASE_URL = 'https://huggingface.co/doof-ferb/nghitts-copy/resolve/main/piper-tts/';
  public static readonly CONFIG_URL = 'https://huggingface.co/doof-ferb/nghitts-copy/resolve/main/piper-tts/config.json';

  // EXACT VOICES FROM THE NGHI-TTS REPOSITORY
  private static REAL_NGHI_VOICES: VoiceInfo[] = [
    {
      id: 'ngochuyen',
      name: 'Ngọc Huyền (NghiTTS Original)',
      gender: 'female',
      region: 'north',
      description: 'Giọng Nữ Bắc review phim & truyện nổi tiếng của NghiTTS (Truyền cảm, sắc nét)',
      sampleText: 'Sau khi xuyên không, nàng phát hiện mình đã trở thành đích nữ của Thừa tướng phủ.',
      modelSizeMB: 48.5,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}ngochuyen.onnx`,
      engineType: 'nghi-tts',
    },
    {
      id: 'ngochuyennew',
      name: 'Ngọc Huyền Mới (NghiTTS V2)',
      gender: 'female',
      region: 'north',
      description: 'Bản nâng cấp V2 của giọng Ngọc Huyền (Trong trẻo, nhịp điệu mượt mà hơn)',
      sampleText: 'Ánh trăng chiếu rọi khắp sân viện, tiếng gió thoảng qua mang theo hương hoa nhài.',
      modelSizeMB: 48.5,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}ngochuyennew.onnx`,
      engineType: 'nghi-tts',
    },
    {
      id: 'maiphuong',
      name: 'Mai Phương (NghiTTS)',
      gender: 'female',
      region: 'south',
      description: 'Giọng Nữ miền Nam ngọt ngào, nhẹ nhàng và sâu lắng',
      sampleText: 'Dưới gốc cây lê nhỏ ven sông, hai người cùng ngồi ngắm hoàng hôn buông xuống.',
      modelSizeMB: 44.0,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}maiphuong.onnx`,
      engineType: 'nghi-tts',
    },
    {
      id: 'minhkhang',
      name: 'Minh Khang (NghiTTS)',
      gender: 'male',
      region: 'north',
      description: 'Giọng Nam miền Bắc rõ ràng, tự nhiên, điềm đạm',
      sampleText: 'Con đường phía trước dẫu còn nhiều chông gai nhưng ý chí vẫn luôn kiên định.',
      modelSizeMB: 46.2,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}minhkhang.onnx`,
      engineType: 'nghi-tts',
    },
    {
      id: 'manhdung',
      name: 'Mạnh Dũng (NghiTTS)',
      gender: 'male',
      region: 'north',
      description: 'Giọng Nam miền Bắc trầm ấm, chững chạc và uy nghiêm',
      sampleText: 'Tiếng tiêu vang vọng giữa thảo nguyên bao la trong đêm trăng sáng.',
      modelSizeMB: 46.5,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}manhdung.onnx`,
      engineType: 'nghi-tts',
    },
    {
      id: 'minhthu',
      name: 'Minh Thu (NghiTTS)',
      gender: 'female',
      region: 'north',
      description: 'Giọng Nữ miền Bắc thanh thoát, tự nhiên, dễ nghe',
      sampleText: 'Gió sớm mai thổi nhẹ làm lay động những cánh hoa còn đọng sương đêm.',
      modelSizeMB: 44.8,
      isInstalled: false,
      modelAssetUrl: `${NghiTtsEngine.ASSET_BASE_URL}minhthu.onnx`,
      engineType: 'nghi-tts',
    },
    {
      id: 'vietthao3886',
      name: 'Việt Thảo (NghiTTS)',
      gender: 'male',
      region: 'south',
      description: 'Giọng Nam truyền cảm, phong cách kể chuyện hải ngoại cuốn hút',
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
      const isCached = await VoiceStorageManager.isVoiceCached(v.id);
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
    return await VoiceStorageManager.isVoiceCached(voiceId);
  }

  /**
   * Real streaming download of the ONNX model file into CacheStorage
   */
  public async downloadVoice(voiceId: string, onProgress?: (percent: number) => void): Promise<void> {
    const voice = NghiTtsEngine.REAL_NGHI_VOICES.find(v => v.id === voiceId);
    if (!voice || !voice.modelAssetUrl) {
      throw new Error(`Không tìm thấy cấu hình giọng NghiTTS: ${voiceId}`);
    }

    if (await VoiceStorageManager.isVoiceCached(voiceId)) {
      onProgress?.(100);
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Thiết bị đang ngoại tuyến. Hãy kết nối internet để tải model NghiTTS.');
    }

    try {
      const response = await fetch(voice.modelAssetUrl, {
        mode: 'cors',
        headers: { 'Accept': 'application/octet-stream' },
      });

      if (!response.ok) {
        throw new Error(`Tải model NghiTTS thất bại (HTTP ${response.status})`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : (voice.modelSizeMB * 1024 * 1024);
      let receivedBytes = 0;

      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            receivedBytes += value.length;
            if (totalBytes > 0) {
              const progressPct = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
              onProgress?.(progressPct);
            }
          }
        }
      }

      const completeBlob = new Blob(chunks, { type: 'application/octet-stream' });
      await VoiceStorageManager.cacheVoiceModel(voiceId, completeBlob);
      onProgress?.(100);
    } catch (err: any) {
      console.error('NghiTTS model download error:', err);
      throw new Error(`Không thể tải giọng ${voice.name}: ${err.message || 'Lỗi mạng hoặc CORS'}`);
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
    if (!text || !text.trim()) {
      return { durationSec: 0, engine: 'nghi-tts' };
    }

    // 1. Check if ONNX model is downloaded in local CacheStorage
    const modelBlob = await VoiceStorageManager.getVoiceModel(voiceId);

    if (modelBlob) {
      try {
        const modelArrayBuffer = await modelBlob.arrayBuffer();
        // 2. Tokenize Vietnamese text into phoneme sequence
        const phonemeIds = textToPhonemeSequence(text);

        // 3. Run in-browser ONNX neural inference
        const audioSamples = await OnnxRuntimeLoader.runInference(
          voiceId,
          modelArrayBuffer,
          phonemeIds,
          playbackRate
        );

        // 4. Encode raw Float32Array neural output into 16-bit PCM WAV Blob (22050Hz)
        const sampleRate = 22050;
        const wavBlob = encodeFloat32ToWavBlob(audioSamples, sampleRate);
        const audioUrl = URL.createObjectURL(wavBlob);
        const durationSec = Number((audioSamples.length / sampleRate).toFixed(2));

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
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = Math.max(0.6, Math.min(1.8, playbackRate));

      const sysVoices = window.speechSynthesis.getVoices();
      const viVoice = sysVoices.find(v => v.lang.startsWith('vi') || v.lang.includes('VIE'));
      if (viVoice) utterance.voice = viVoice;

      const words = text.trim().split(/\s+/);
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
  }
}
