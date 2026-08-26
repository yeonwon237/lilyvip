/**
 * OnnxRuntimeLoader manages ONNX Runtime Web loading and in-browser neural TTS inference
 */

declare global {
  interface Window {
    ort?: any;
  }
}

export class OnnxRuntimeLoader {
  private static isScriptLoading = false;
  private static scriptLoadPromise: Promise<any> | null = null;
  private static sessions: Map<string, any> = new Map();

  /**
   * Dynamically loads ONNX Runtime Web on demand
   */
  public static async loadOrt(): Promise<any> {
    if (typeof window === 'undefined') {
      throw new Error('ONNX Runtime Web requires a browser environment.');
    }

    if (window.ort) {
      return window.ort;
    }

    if (this.scriptLoadPromise) {
      return this.scriptLoadPromise;
    }

    this.scriptLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js';
      script.async = true;
      script.onload = () => {
        if (window.ort) {
          try {
            // Configure WASM asset paths
            window.ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
            window.ort.env.wasm.numThreads = 1;
          } catch {}
          resolve(window.ort);
        } else {
          reject(new Error('Không thể khởi tạo ONNX Runtime Web.'));
        }
      };
      script.onerror = () => {
        this.scriptLoadPromise = null;
        reject(new Error('Không thể tải ONNX Runtime Web từ CDN.'));
      };
      document.head.appendChild(script);
    });

    return this.scriptLoadPromise;
  }

  /**
   * Initializes or gets cached inference session for a voice model
   */
  public static async getSession(voiceId: string, modelArrayBuffer: ArrayBuffer): Promise<any> {
    if (this.sessions.has(voiceId)) {
      return this.sessions.get(voiceId);
    }

    const ort = await this.loadOrt();
    
    // Create ONNX Inference Session from downloaded model ArrayBuffer
    const session = await ort.InferenceSession.create(modelArrayBuffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });

    this.sessions.set(voiceId, session);
    return session;
  }

  /**
   * Executes neural speech synthesis inference on ONNX model
   */
  public static async runInference(
    voiceId: string,
    modelArrayBuffer: ArrayBuffer,
    phonemeIds: number[],
    playbackRate: number = 1.0
  ): Promise<Float32Array> {
    const ort = await this.loadOrt();
    const session = await this.getSession(voiceId, modelArrayBuffer);

    // Prepare tensors matching Piper input signatures
    // 1. input: [1, seq_len] (int64)
    const inputData = BigInt64Array.from(phonemeIds.map(id => BigInt(id)));
    const inputTensor = new ort.Tensor('int64', inputData, [1, phonemeIds.length]);

    // 2. input_lengths: [1] (int64)
    const inputLengthsData = BigInt64Array.from([BigInt(phonemeIds.length)]);
    const inputLengthsTensor = new ort.Tensor('int64', inputLengthsData, [1]);

    // 3. scales: [3] (float32) [noise_scale, length_scale, noise_w]
    const lengthScale = 1.0 / Math.max(0.5, Math.min(2.0, playbackRate));
    const scalesData = new Float32Array([0.667, lengthScale, 0.8]);
    const scalesTensor = new ort.Tensor('float32', scalesData, [3]);

    const feeds: Record<string, any> = {
      input: inputTensor,
      input_lengths: inputLengthsTensor,
      scales: scalesTensor,
    };

    // Run neural model inference
    const outputMap = await session.run(feeds);
    
    // Piper outputs raw audio waveform in 'output' tensor
    const outputTensor = outputMap.output || Object.values(outputMap)[0];
    if (!outputTensor || !outputTensor.data) {
      throw new Error('Mô hình ONNX không trả về dữ liệu âm thanh.');
    }

    return outputTensor.data as Float32Array;
  }

  /**
   * Releases memory for all cached sessions
   */
  public static clearSessions(): void {
    for (const session of this.sessions.values()) {
      try {
        session.release?.();
      } catch {}
    }
    this.sessions.clear();
  }
}
