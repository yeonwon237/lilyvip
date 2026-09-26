export interface ReadingRange {
  firstChapterIndex?: number;
  totalChapters: number;
}

export function getReadingBounds(book: ReadingRange): { first: number; last: number; total: number } {
  const first = Number.isFinite(book.firstChapterIndex) ? Math.trunc(book.firstChapterIndex as number) : 1;
  const total = Number.isFinite(book.totalChapters) ? Math.max(1, Math.trunc(book.totalChapters)) : 1;
  return { first, last: first + total - 1, total };
}

export function clampChapterIndex(chapterIndex: number, book: ReadingRange): number {
  const { first, last } = getReadingBounds(book);
  const safeIndex = Number.isFinite(chapterIndex) ? Math.trunc(chapterIndex) : first;
  return Math.min(last, Math.max(first, safeIndex));
}

export function calculateReadingProgress(
  chapterIndex: number,
  scrollPercent: number,
  book: ReadingRange,
): number {
  const { first, total } = getReadingBounds(book);
  const safeChapter = clampChapterIndex(chapterIndex, book);
  const safeScroll = Number.isFinite(scrollPercent) ? Math.min(100, Math.max(0, scrollPercent)) : 0;
  return Math.min(100, Math.max(0, ((safeChapter - first + safeScroll / 100) / total) * 100));
}

export function clampProgressPercent(progress: number): number {
  return Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0;
}
