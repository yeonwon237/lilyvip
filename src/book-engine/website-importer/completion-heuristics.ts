export type CompletionStatus = 'completed' | 'ongoing' | 'unknown';

const COMPLETION_KEYWORDS = /hoàn\s*thành|hoan\s*thanh|đủ\s*chương|du\s*chuong|kết\s*thúc|ket\s*thuc|trọn\s*bộ|tron\s*bo|hết\s*truyện|het\s*truyen|\bfull\b|\bend\b|\bcomplete(?:d)?\b/i;

// Fiction blogs/tags commonly shorten "hoàn thành"/"kết thúc" to a bare
// "Hoàn"/"Hết" used as its own bracket/tag word or as the whole title of the
// last chapter, e.g. "[BHTT - EDIT HOÀN - CAO H] ...", "[HOÀN] [EDIT-AI]",
// or a final chapter simply titled "Hết". Only count it when it stands alone
// right before a tag/title boundary (`]`, `-`, or end of string) — "hoàn"
// and "hết" are also the first syllable of many unrelated words (hoàn cảnh,
// hoàn toàn, hết lòng, hết sức...), which always continue with another
// syllable instead of hitting a boundary there.
const STANDALONE_COMPLETION_TAG = /\b(?:hoàn|hoan|hết|het)\s*(?:[\]\-–—]|$)/i;

/**
 * Category/tag/label names (and optionally the title of the last known
 * chapter) never state "ongoing" explicitly, only "completed" conventions
 * (e.g. "Hoàn thành", "Full", "Đủ chương", a last chapter titled "Hết") —
 * absence of a match means unknown, not ongoing, so callers never fetch a
 * story on a guess.
 */
export function detectCompletionFromLabels(labels: string[] = []): CompletionStatus {
  // Some blogs store Vietnamese diacritics as decomposed Unicode (base
  // letter + combining accent) instead of precomposed characters — visually
  // identical but a different byte sequence, so it silently fails every
  // accented match above unless normalized to NFC first.
  return labels.some(label => {
    const normalized = label.normalize('NFC');
    return COMPLETION_KEYWORDS.test(normalized) || STANDALONE_COMPLETION_TAG.test(normalized);
  }) ? 'completed' : 'unknown';
}
