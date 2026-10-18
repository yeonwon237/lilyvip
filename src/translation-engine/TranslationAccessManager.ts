import type { UserFeatures } from '../types';

// Temporarily keep chapter translation available only to the owner/admin while
// the public translation flow is being fixed.

export type TranslationAccessSubject = boolean | { isOwner?: boolean; features?: UserFeatures } | null | undefined;

export class TranslationAccessManager {
  public static isTranslationEnabled(subject?: TranslationAccessSubject): boolean {
    if (typeof subject === 'boolean') return subject;
    return subject?.isOwner === true;
  }
}
