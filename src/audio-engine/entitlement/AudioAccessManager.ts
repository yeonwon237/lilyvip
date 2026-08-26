import { AudioAccess } from '../types';

export class AudioAccessManager {
  private static STORAGE_KEY = 'LILY_AUDIO_ACCESS_V1';
  // Temporary product-wide unlock while the Audio feature is being completed.
  // Switch this single flag off when entitlement enforcement is ready to return.
  private static TEMPORARILY_UNLOCKED = true;

  /**
   * Checks if audio development mode is active via env or localStorage
   */
  public static isDevEnvironment(): boolean {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
      return true;
    }
    return false;
  }

  /**
   * Gets the current audio access state
   */
  public static getAudioAccess(): AudioAccess {
    if (this.TEMPORARILY_UNLOCKED) {
      return { enabled: true, source: 'local-test' };
    }

    if (typeof window === 'undefined' || !window.localStorage) {
      return { enabled: false, source: 'local-test' };
    }

    try {
      const stored = window.localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AudioAccess;
        return parsed;
      }
    } catch {}

    // Default: in DEV mode, allow local testing flag
    return {
      enabled: false,
      source: 'local-test',
    };
  }

  /**
   * Sets the audio access state
   */
  public static setAudioAccess(access: AudioAccess): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(access));
    } catch {}
  }

  /**
   * Returns whether audio playback is permitted
   */
  public static isAudioEnabled(): boolean {
    const access = this.getAudioAccess();
    return Boolean(access.enabled);
  }

  /**
   * Toggles development audio enablement
   */
  public static toggleDevAudio(explicitState?: boolean): boolean {
    if (this.TEMPORARILY_UNLOCKED) return true;

    const current = this.getAudioAccess();
    const nextState = explicitState !== undefined ? explicitState : !current.enabled;
    this.setAudioAccess({
      enabled: nextState,
      source: 'dev',
    });
    return nextState;
  }
}
