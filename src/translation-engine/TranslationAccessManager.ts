import type { UserFeatures } from '../types';

// QT, machine translation, Lily Làm mượt QT and the Lily models are public (the LilyHub quota decides who may
// translate: Lily models need MY01/MY02); the remaining advanced models stay with the owner.

export type TranslationAccessSubject = boolean | { isOwner?: boolean; features?: UserFeatures } | null | undefined;

export class TranslationAccessManager {
  public static isTranslationEnabled(_subject?: TranslationAccessSubject): boolean {
    return true;
  }
  public static canUseModel(modelId: string, subject?: TranslationAccessSubject): boolean {
    const isOwner = typeof subject === 'boolean' ? subject : subject?.isOwner === true;
    return isOwner || ['qt-dictionary', 'google-quick-2', 'qt-polish-s1', 'lily-cophong-v1', 'lily-dothi-v1'].includes(modelId);
  }
}
