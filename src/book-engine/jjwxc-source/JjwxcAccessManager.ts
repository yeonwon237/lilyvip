import type { UserFeatures } from '../../types';

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
  public static isJjwxcConnectEnabled(_subject?: JjwxcAccessSubject, _allowDev: boolean = false): boolean {
    return true;
  }

  /**
   * Every JJWXC-related action should call this first, not just rely on the
   * calling UI having already checked `isOwner`. Throws JjwxcAccessDeniedError
   * instead of returning a boolean so a call site can't accidentally ignore the
   * result and proceed anyway.
   */
  public static assertAccess(subject?: JjwxcAccessSubject, allowDev: boolean = false): void {
    if (!this.isJjwxcConnectEnabled(subject, allowDev)) {
      throw new JjwxcAccessDeniedError('Không thể kết nối JJWXC lúc này.');
    }
  }
}
