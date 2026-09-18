import type { UserFeatures } from '../../types';

// Gates the experimental JJWXC connect trial. Same pattern as TranslationAccessManager:
// visible only on the owner/admin account during the trial, or accounts granted 'jjwxc_import'.
// Flip ROLLOUT_TO_EVERYONE once the parsing/import flow has been verified stable against real JJWXC pages.
const ROLLOUT_TO_EVERYONE = false;

/** Thrown by assertAccess() so every call site fails closed instead of silently no-opping. */
export class JjwxcAccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JjwxcAccessDeniedError';
  }
}

export type JjwxcAccessSubject = boolean | { isOwner?: boolean; features?: UserFeatures } | null | undefined;

export class JjwxcAccessManager {
  /** UI-facing check: should the "Kết nối JJWXC" entry point even be shown. */
  public static isJjwxcConnectEnabled(subject?: JjwxcAccessSubject, allowDev: boolean = false): boolean {
    if (ROLLOUT_TO_EVERYONE) return true;
    if (allowDev) return true;
    if (typeof subject === 'boolean') return subject;
    if (subject?.isOwner) return true;
    return Boolean(subject?.features?.jjwxc_import);
  }

  /**
   * Every JJWXC-related action should call this first, not just rely on the
   * calling UI having already checked `isOwner`. Throws JjwxcAccessDeniedError
   * instead of returning a boolean so a call site can't accidentally ignore the
   * result and proceed anyway.
   */
  public static assertAccess(subject?: JjwxcAccessSubject, allowDev: boolean = false): void {
    if (!this.isJjwxcConnectEnabled(subject, allowDev)) {
      throw new JjwxcAccessDeniedError('Tính năng Kết nối JJWXC chưa được bật cho tài khoản này.');
    }
  }
}
