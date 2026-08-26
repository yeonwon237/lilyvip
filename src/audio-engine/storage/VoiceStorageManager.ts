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
   * Checks if a voice model asset is cached on device
   */
  public static async isVoiceCached(voiceId: string): Promise<boolean> {
    if (!this.isCacheSupported()) return false;
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const match = await cache.match(`${this.PREFIX}${voiceId}`);
      return Boolean(match);
    } catch {
      return false;
    }
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
    if (!this.isCacheSupported()) return 0;
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const keys = await cache.keys();
      let totalBytes = 0;

      for (const key of keys) {
        const resp = await cache.match(key);
        if (resp) {
          const blob = await resp.blob();
          totalBytes += blob.size;
        }
      }

      return Number((totalBytes / (1024 * 1024)).toFixed(1));
    } catch {
      return 0;
    }
  }

  /**
   * Deletes a specific voice model
   */
  public static async deleteVoiceModel(voiceId: string): Promise<boolean> {
    if (!this.isCacheSupported()) return false;
    try {
      const cache = await caches.open(this.CACHE_NAME);
      return await cache.delete(`${this.PREFIX}${voiceId}`);
    } catch {
      return false;
    }
  }

  /**
   * Clears all cached voice models
   */
  public static async clearAllVoiceModels(): Promise<boolean> {
    if (!this.isCacheSupported()) return false;
    try {
      return await caches.delete(this.CACHE_NAME);
    } catch {
      return false;
    }
  }
}
