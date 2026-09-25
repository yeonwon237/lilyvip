import type { UserFeatures } from '../types';

// Gates the experimental in-browser translation feature. During the trial phase it's
// visible only on the owner/admin account or accounts granted 'ai_translation'; flip ROLLOUT_TO_EVERYONE
// to true once the feature has been verified stable to open it up for all readers.
// Gemini translation uses each reader's own locally stored API key, so the translation
// sheet is safe to expose to everyone. Experimental ONNX choices remain ownerOnly in the
// model config and therefore stay hidden from regular accounts.
const ROLLOUT_TO_EVERYONE = true;

export type TranslationAccessSubject = boolean | { isOwner?: boolean; features?: UserFeatures } | null | undefined;

export class TranslationAccessManager {
  public static isTranslationEnabled(subject?: TranslationAccessSubject): boolean {
    if (ROLLOUT_TO_EVERYONE) return true;
    if (typeof subject === 'boolean') return subject;
    if (subject?.isOwner) return true;
    return Boolean(subject?.features?.ai_translation);
  }
}
