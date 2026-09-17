// Gates the experimental JJWXC connect trial. Same pattern as TranslationAccessManager:
// visible only on the owner/admin account during the trial, flip ROLLOUT_TO_EVERYONE
// once the parsing/import flow has been verified stable against real JJWXC pages.
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
  public static isJjwxcConnectEnabled(isOwner?: boolean, allowDev: boolean = false): boolean {
    if (ROLLOUT_TO_EVERYONE) return true;
    if (allowDev) return true;
    return Boolean(isOwner);
  }

  /**
   * Every JJWXC-related action should call this first, not just rely on the
   * calling UI having already checked `isOwner`. Throws JjwxcAccessDeniedError
   * instead of returning a boolean so a call site can't accidentally ignore the
   * result and proceed anyway.
   */
  public static assertAccess(isOwner?: boolean, allowDev: boolean = false): void {
    if (!this.isJjwxcConnectEnabled(isOwner, allowDev)) {
      throw new JjwxcAccessDeniedError('Tính năng Kết nối JJWXC chưa được bật cho tài khoản này.');
    }
  }
}
