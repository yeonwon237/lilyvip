export type CompletionStatus = 'completed' | 'ongoing' | 'unknown';

const COMPLETION_KEYWORDS = /hoàn\s*thành|hoan\s*thanh|đủ\s*chương|du\s*chuong|\bfull\b|\bend\b|\bcomplete(?:d)?\b/i;

/**
 * Category/tag/label names never state "ongoing" explicitly, only "completed"
 * conventions (e.g. "Hoàn thành", "Full", "Đủ chương") — absence of a match
 * means unknown, not ongoing, so callers never fetch a story on a guess.
 */
export function detectCompletionFromLabels(labels: string[] = []): CompletionStatus {
  return labels.some(label => COMPLETION_KEYWORDS.test(label)) ? 'completed' : 'unknown';
}
