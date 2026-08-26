/**
 * Voice Storage Manager
 * Handles local caching and lifecycle of TTS voice models and assets in CacheStorage.
 */

export class VoiceStorageManager {
  private static CACHE_NAME = 'lily_audio_models_v1';
  private static PREFIX = '/__lily_voice_models__/';

  /**
   * Checks if CacheStorage is supported
   */
  private static isCacheSupported(): boolean {
    return typeof window !== 'undefined' && 'caches' in window;
  }

  /**
   * Checks if a voice model asset is cached and valid on device
   */
  public static async isVoiceCached(voiceId: string): Promise<boolean> {
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle('piper', { create: false });
      const model = await (await dir.getFileHandle(`${voiceId}.onnx`)).getFile();
      const config = await (await dir.getFileHandle(`${voiceId}.onnx.json`)).getFile();
      if (model.size > 1000000 && config.size > 50) return true;
    } catch { /* Fallback to legacy CacheStorage check below */ }
    if (!this.isCacheSupported()) return false;
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const match = await cache.match(`${this.PREFIX}${voiceId}`);
      if (match) {
        const blob = await match.blob();
        return blob.size > 1000000;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Estimates if device has sufficient storage for voice download (~60MB)
   */
  public static async hasEnoughFreeSpace(requiredMB: number = 60): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota !== undefined && estimate.usage !== undefined) {
          const freeBytes = estimate.quota - estimate.usage;
          const freeMB = freeBytes / (1024 * 1024);
          return freeMB >= requiredMB;
        }
      }
    } catch {}
    return true; // Assume enough space if API not supported
  }

  /**
   * Caches voice model asset
   */
  public static async cacheVoiceModel(voiceId: string, response: Response | Blob): Promise<void> {
    if (!this.isCacheSupported()) return;
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const respToStore = response instanceof Response ? response : new Response(response, {
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      await cache.put(`${this.PREFIX}${voiceId}`, respToStore);
    } catch (err) {
      console.warn('Could not cache voice model:', err);
    }
  }

  /**
   * Retrieves voice model asset from cache
   */
  public static async getVoiceModel(voiceId: string): Promise<Blob | null> {
    if (!this.isCacheSupported()) return null;
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const match = await cache.match(`${this.PREFIX}${voiceId}`);
      if (!match) return null;
      return await match.blob();
    } catch {
      return null;
    }
  }

  /**
   * Calculates total size of cached voice models in MB
   */
  public static async getTotalVoiceStorageMB(): Promise<number> {
    let totalBytes = 0;
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle('piper');
      for await (const [, handle] of (dir as any).entries()) {
        if (handle.kind === 'file') totalBytes += (await handle.getFile()).size;
      }
    } catch { /* chưa có model Piper */ }
    if (!this.isCacheSupported()) return Number((totalBytes / (1024 * 1024)).toFixed(1));
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const keys = await cache.keys();

      for (const key of keys) {
        const resp = await cache.match(key);
        if (resp) {
          const blob = await resp.blob();
          totalBytes += blob.size;
        }
      }

      return Number((totalBytes / (1024 * 1024)).toFixed(1));
    } catch {
      return Number((totalBytes / (1024 * 1024)).toFixed(1));
    }
  }

  /**
   * Deletes a specific voice model
   */
  public static async deleteVoiceModel(voiceId: string): Promise<boolean> {
    let deleted = false;
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle('piper');
      await dir.removeEntry(`${voiceId}.onnx`); deleted = true;
      await dir.removeEntry(`${voiceId}.onnx.json`);
    } catch { /* có thể chỉ có cache cũ */ }
    if (!this.isCacheSupported()) return deleted;
    try {
      const cache = await caches.open(this.CACHE_NAME);
      return (await cache.delete(`${this.PREFIX}${voiceId}`)) || deleted;
    } catch {
      return false;
    }
  }

  /**
   * Clears all cached voice models
   */
  public static async clearAllVoiceModels(): Promise<boolean> {
    let deleted = false;
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry('piper', { recursive: true }); deleted = true;
    } catch { /* chưa có OPFS */ }
    if (!this.isCacheSupported()) return deleted;
    try {
      return (await caches.delete(this.CACHE_NAME)) || deleted;
    } catch {
      return false;
    }
  }
}
