import { Capacitor } from '@capacitor/core';

// Gates the experimental JJWXC connect trial. Same pattern as TranslationAccessManager:
// visible only on the owner/admin account during the trial, flip ROLLOUT_TO_EVERYONE
// once the WebView/session/extraction flow has been verified stable on real devices.
const ROLLOUT_TO_EVERYONE = false;

/** Thrown by assertAccess() so every call site fails closed instead of silently no-opping. */
export class JjwxcAccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JjwxcAccessDeniedError';
  }
}

export class JjwxcAccessManager {
  /** UI-facing check: should the "Kết nối JJWXC" entry point even be shown. */
  public static isJjwxcConnectEnabled(isOwner?: boolean): boolean {
    if (ROLLOUT_TO_EVERYONE) return true;
    return Boolean(isOwner);
  }

  /**
   * The JJWXC WebView plugin only exists on iOS/Android builds produced via Capacitor.
   * Running as an ordinary PWA/web tab has no isolated native WebView to hold a JJWXC
   * session in, so native actions must never be attempted there.
   */
  public static isNativeRuntimeAvailable(): boolean {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }

  /**
   * Every JJWXC native action (open WebView, clear session, and future TOC/chapter
   * calls) must call this first, not just rely on the calling UI having already
   * checked `isOwner`. Throws JjwxcAccessDeniedError instead of returning a boolean
   * so a call site can't accidentally ignore the result and proceed anyway.
   */
  public static assertAccess(isOwner?: boolean): void {
    if (!this.isJjwxcConnectEnabled(isOwner)) {
      throw new JjwxcAccessDeniedError('Tính năng Kết nối JJWXC chưa được bật cho tài khoản này.');
    }
    if (!this.isNativeRuntimeAvailable()) {
      throw new JjwxcAccessDeniedError('Kết nối JJWXC chỉ khả dụng trong app di động (iOS/Android), không chạy trên bản web.');
    }
  }
}
