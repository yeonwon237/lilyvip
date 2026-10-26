import type { UserFeatures } from '../types';

// QT and machine translation are public; advanced models remain with the owner.

export type TranslationAccessSubject = boolean | { isOwner?: boolean; features?: UserFeatures } | null | undefined;

export class TranslationAccessManager {
  public static isTranslationEnabled(_subject?: TranslationAccessSubject): boolean {
    return true;
  }
  public static canUseModel(modelId: string, subject?: TranslationAccessSubject): boolean {
    const isOwner = typeof subject === 'boolean' ? subject : subject?.isOwner === true;
    return isOwner || modelId === 'qt-dictionary' || modelId === 'google-quick-2' || modelId === 'qt-polish-s1';
  }
}
