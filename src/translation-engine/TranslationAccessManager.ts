// Gates the experimental in-browser translation feature. During the trial phase it's
// visible only on the owner/admin account; flip ROLLOUT_TO_EVERYONE to true once the
// feature has been verified stable to open it up for all readers.
const ROLLOUT_TO_EVERYONE = false;

export class TranslationAccessManager {
  public static isTranslationEnabled(isOwner?: boolean): boolean {
    if (ROLLOUT_TO_EVERYONE) return true;
    return Boolean(isOwner);
  }
}
