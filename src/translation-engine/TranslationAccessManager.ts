import type { UserFeatures } from '../types';

// Gates all chapter translation (Gemini and the on-device models). Only the owner/admin
// account or accounts granted 'ai_translation' in the LilyHub admin can translate; flip
// ROLLOUT_TO_EVERYONE to true to open it up for all readers. Models marked ownerOnly in
// the config stay hidden from readers without that grant even after a rollout.
const ROLLOUT_TO_EVERYONE = false;

export type TranslationAccessSubject = boolean | { isOwner?: boolean; features?: UserFeatures } | null | undefined;

export class TranslationAccessManager {
  public static isTranslationEnabled(subject?: TranslationAccessSubject): boolean {
    if (ROLLOUT_TO_EVERYONE) return true;
    if (typeof subject === 'boolean') return subject;
    if (subject?.isOwner) return true;
    return Boolean(subject?.features?.ai_translation);
  }
}
