import type * as VitsWeb from '@diffusionstudio/vits-web';

const WRITER_SOURCE = `self.onmessage=async(e)=>{const{name,buffer}=e.data;try{const r=await navigator.storage.getDirectory();const d=await r.getDirectoryHandle('piper',{create:true});const f=await d.getFileHandle(name,{create:true});const h=await f.createSyncAccessHandle();h.write(buffer,{at:0});h.truncate(buffer.byteLength);h.flush();h.close();self.postMessage({ok:true})}catch(error){self.postMessage({ok:false,error:String(error?.message||error)})}}`;
const SILENT_WAV_BASE64 = 'UklGRiUAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQEAAACA';
let writerUrl: string | null = null;

function writeViaWorker(name: string, buffer: ArrayBuffer): Promise<boolean> {
  if (!writerUrl) writerUrl = URL.createObjectURL(new Blob([WRITER_SOURCE], { type: 'application/javascript' }));
  return new Promise((resolve) => {
    const worker = new Worker(writerUrl!);
    const timer = setTimeout(() => { worker.terminate(); resolve(false); }, 30000);
    worker.onmessage = (event) => { clearTimeout(timer); worker.terminate(); resolve(Boolean(event.data?.ok)); };
    worker.onerror = () => { clearTimeout(timer); worker.terminate(); resolve(false); };
    worker.postMessage({ name, buffer }, [buffer]);
  });
}

async function fileIsValid(name: string): Promise<boolean> {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('piper', { create: false });
    const file = await (await dir.getFileHandle(name)).getFile();
    if (name.endsWith('.onnx')) {
      return file.size >= 30 * 1024 * 1024 && file.size <= 100 * 1024 * 1024; // ONNX models are > 30MB
    }
    if (name.endsWith('.json')) {
      if (file.size < 50 || file.size > 1024 * 1024) return false;
      const config = JSON.parse(await file.text());
      return typeof config.espeak?.voice === 'string' && Number.isFinite(config.audio?.sample_rate) && typeof config.inference === 'object';
    }
    return file.size > 0;
  } catch { return false; }
}

async function removeFile(name: string): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('piper', { create: true });
    await dir.removeEntry(name);
  } catch { /* file not present */ }
}

async function writeFile(name: string, buffer: ArrayBuffer): Promise<boolean> {
  if (typeof FileSystemFileHandle !== 'undefined' && 'createWritable' in FileSystemFileHandle.prototype) {
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle('piper', { create: true });
      const writable = await (await dir.getFileHandle(name, { create: true })).createWritable();
      await writable.write(buffer);
      await writable.close();
      return true;
    } catch { /* Fallback to worker sync handle for Safari */ }
  }
  return writeViaWorker(name, buffer);
}

async function fetchAndCache(url: string, name: string, onProgress?: (percent: number) => void): Promise<void> {
  if (await fileIsValid(name)) {
    onProgress?.(100);
    return;
  }
  await removeFile(name);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit' });
    if (!response.ok) throw new Error(`Không tải được tệp (HTTP ${response.status})`);
    
    let total = Number(response.headers.get('Content-Length') || 0);
    if (!total || isNaN(total) || total <= 0) {
      total = name.endsWith('.onnx') ? 48 * 1024 * 1024 : 5000;
    }

    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          loaded += value.length;
          if (loaded > (name.endsWith('.onnx') ? 100 * 1024 * 1024 : 1024 * 1024)) { await reader.cancel(); throw new Error('Dữ liệu giọng đọc quá lớn.'); }
          chunks.push(value);
          const pct = Math.min(99, Math.round((loaded / total) * 100));
          onProgress?.(pct);
        }
      }
    } else {
      const blob = await response.blob();
      chunks.push(new Uint8Array(await blob.arrayBuffer()));
    }

    const buffer = await new Blob(chunks).arrayBuffer();
    const writeOk = await writeFile(name, buffer);
    if (!writeOk || !(await fileIsValid(name))) {
      await removeFile(name);
      throw new Error('Không lưu được dữ liệu giọng đọc trên thiết bị');
    }
    onProgress?.(100);
  } catch (err) {
    await removeFile(name);
    throw err;
  } finally { clearTimeout(timer); }
}

const RUNTIME_CACHE = 'lily-voice-runtime-v1';
export const VOICE_RUNTIME_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/ort-wasm-simd.wasm',
  'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/ort-wasm.wasm',
  'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm',
  'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data',
];
async function runtimeIsCached(): Promise<boolean> {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    return (await Promise.all(VOICE_RUNTIME_URLS.map(url => cache.match(url)))).every(Boolean);
  } catch { return false; }
}
async function cacheRuntime(): Promise<void> {
  const cache = await caches.open(RUNTIME_CACHE);
  for (const url of VOICE_RUNTIME_URLS) {
    if (await cache.match(url)) continue;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: 'omit' });
      if (!response.ok) throw new Error('Chưa tải được bộ tạo giọng ngoại tuyến.');
      await cache.put(url, response);
    } finally { clearTimeout(timer); }
  }
}

export interface ExternalPiperVoice { id: string; modelUrl: string; configUrl: string }

export async function isExternalVoiceCached(voiceId: string): Promise<boolean> {
  return (await fileIsValid(`${voiceId}.onnx`)) && (await fileIsValid(`${voiceId}.onnx.json`)) && await runtimeIsCached();
}

async function cacheExternalVoice(tts: typeof VitsWeb, voice: ExternalPiperVoice, onProgress?: (percent: number) => void): Promise<void> {
  (tts.PATH_MAP as unknown as Record<string, string>)[voice.id] = `external/${voice.id}.onnx`;
  await fetchAndCache(voice.modelUrl, `${voice.id}.onnx`, (value) => onProgress?.(Math.round(value * 0.92)));
  await fetchAndCache(voice.configUrl, `${voice.id}.onnx.json`, (value) => onProgress?.(92 + Math.round(value * 0.03)));
  await cacheRuntime();
  onProgress?.(100);
}

const downloads = new Map<string, Promise<void>>();
export async function ensureExternalVoiceCached(tts: typeof VitsWeb, voice: ExternalPiperVoice, onProgress?: (percent: number) => void): Promise<void> {
  const pending = downloads.get(voice.id);
  if (pending) return pending;
  const task = cacheExternalVoice(tts, voice, onProgress).finally(() => downloads.delete(voice.id));
  downloads.set(voice.id, task);
  return task;
}

export function primeAudioPlaybackForSafari(audio: HTMLAudioElement): void {
  try {
    const binary = atob(SILENT_WAV_BASE64); const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
    audio.src = url; audio.play().catch(() => {}).finally(() => URL.revokeObjectURL(url));
  } catch { /* best effort */ }
}
