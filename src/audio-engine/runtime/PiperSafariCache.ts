import type * as VitsWeb from '@diffusionstudio/vits-web';

const WRITER_SOURCE = `self.onmessage=async(e)=>{const{name,buffer}=e.data;try{const r=await navigator.storage.getDirectory();const d=await r.getDirectoryHandle('piper',{create:true});const f=await d.getFileHandle(name,{create:true});const h=await f.createSyncAccessHandle();h.write(buffer,{at:0});h.truncate(buffer.byteLength);h.flush();h.close();self.postMessage({ok:true})}catch(error){self.postMessage({ok:false,error:String(error?.message||error)})}}`;
const SILENT_WAV_BASE64 = 'UklGRiUAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQEAAACA';
let writerUrl: string | null = null;

function writeViaWorker(name: string, buffer: ArrayBuffer): Promise<boolean> {
  if (!writerUrl) writerUrl = URL.createObjectURL(new Blob([WRITER_SOURCE], { type: 'application/javascript' }));
  return new Promise((resolve) => {
    const worker = new Worker(writerUrl!);
    worker.onmessage = (event) => { worker.terminate(); resolve(Boolean(event.data?.ok)); };
    worker.onerror = () => { worker.terminate(); resolve(false); };
    worker.postMessage({ name, buffer }, [buffer]);
  });
}

async function fileIsValid(name: string): Promise<boolean> {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('piper', { create: false });
    const file = await (await dir.getFileHandle(name)).getFile();
    if (name.endsWith('.onnx')) {
      return file.size > 1000000; // ONNX models are > 30MB
    }
    if (name.endsWith('.json')) {
      return file.size > 50; // Config JSON is ~4-6KB
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

  try {
    const response = await fetch(url);
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
          chunks.push(value);
          loaded += value.length;
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
    if (!writeOk) {
      await removeFile(name);
      throw new Error('Không lưu được dữ liệu giọng đọc trên thiết bị');
    }
    onProgress?.(100);
  } catch (err) {
    await removeFile(name);
    throw err;
  }
}

export interface ExternalPiperVoice { id: string; modelUrl: string; configUrl: string }

export async function isExternalVoiceCached(voiceId: string): Promise<boolean> {
  return (await fileIsValid(`${voiceId}.onnx`)) && (await fileIsValid(`${voiceId}.onnx.json`));
}

export async function ensureExternalVoiceCached(tts: typeof VitsWeb, voice: ExternalPiperVoice, onProgress?: (percent: number) => void): Promise<void> {
  (tts.PATH_MAP as unknown as Record<string, string>)[voice.id] = `external/${voice.id}.onnx`;
  await fetchAndCache(voice.modelUrl, `${voice.id}.onnx`, (value) => onProgress?.(Math.round(value * 0.92)));
  await fetchAndCache(voice.configUrl, `${voice.id}.onnx.json`, (value) => onProgress?.(92 + Math.round(value * 0.08)));
}

export function primeAudioPlaybackForSafari(audio: HTMLAudioElement): void {
  try {
    const binary = atob(SILENT_WAV_BASE64); const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
    audio.src = url; audio.play().catch(() => {}).finally(() => URL.revokeObjectURL(url));
  } catch { /* best effort */ }
}
