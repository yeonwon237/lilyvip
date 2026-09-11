import { ChapterSorter } from './chapter-sorter';
import type { NormalizedChapter } from '../types';

export interface ChapterMergeResult {
  /** Full chapter list, re-sorted by chapter number and re-sequenced (index 1..N). */
  merged: NormalizedChapter[];
  /** Chapters from `incoming` that were not already present and got added. */
  addedCount: number;
  /** Chapters from `incoming` that matched an existing chapter number and were skipped (existing content wins). */
  skippedDuplicateCount: number;
  /**
   * True when merging changes the storage `index` of at least one already-existing
   * chapter (e.g. earlier chapters were found and inserted before ones the reader
   * has already reached). Notes/bookmarks are keyed by chapter index, so an index
   * shift means they can end up pointing at different content than before.
   */
  chapterIndexShifted: boolean;
}

/** The chapter's position in the story, independent of whatever index it was
 * assigned within whichever single fetch produced it. */
const chapterNumberOf = (chapter: NormalizedChapter): number => {
  const meta = ChapterSorter.parseMeta(chapter.title);
  return meta.number !== null ? meta.number : chapter.index;
};

/**
 * Combine an existing (already-saved) chapter list with a newly-fetched one,
 * keyed by each chapter's parsed number rather than its fetch-local index —
 * two separate fetches of the same book almost never agree on index (the
 * second fetch might only cover chapters the first one didn't reach at all).
 * On a number collision, the existing chapter's content is kept: the reader
 * may already have notes/progress tied to it.
 */
export function mergeNormalizedChapters(
  existing: NormalizedChapter[],
  incoming: NormalizedChapter[]
): ChapterMergeResult {
  const byNumber = new Map<number, NormalizedChapter>();
  for (const chapter of existing) byNumber.set(chapterNumberOf(chapter), chapter);

  let addedCount = 0;
  let skippedDuplicateCount = 0;
  for (const chapter of incoming) {
    const num = chapterNumberOf(chapter);
    if (byNumber.has(num)) {
      skippedDuplicateCount++;
      continue;
    }
    byNumber.set(num, chapter);
    addedCount++;
  }

  const sorted = [...byNumber.entries()].sort((a, b) => a[0] - b[0]).map(([, chapter]) => chapter);
  const merged = sorted.map((chapter, i) => ({ ...chapter, index: i + 1 }));

  const originalIndexById = new Map(existing.map(chapter => [chapter.id, chapter.index]));
  const chapterIndexShifted = merged.some(chapter => {
    const originalIndex = originalIndexById.get(chapter.id);
    return originalIndex !== undefined && originalIndex !== chapter.index;
  });

  return { merged, addedCount, skippedDuplicateCount, chapterIndexShifted };
}
