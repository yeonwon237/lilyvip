/**
 * Local, on-device reading streak tracking. No server involved — this is a
 * personal-library app, so "streak" means "days this device recorded actual
 * reading activity", persisted in localStorage.
 */

const STREAK_STORAGE_KEY = 'LILY_READING_STREAK_V1';
const MAX_TRACKED_DAYS = 60;

export interface ReadingStreak {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null; // 'YYYY-MM-DD', local time
  activeDates: string[]; // ascending, capped to MAX_TRACKED_DAYS
}

const emptyStreak: ReadingStreak = {
  currentStreak: 0,
  longestStreak: 0,
  lastReadDate: null,
  activeDates: [],
};

const dateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const todayKey = (): string => dateKey(new Date());

const dayBeforeKey = (key: string): string => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() - 1);
  return dateKey(date);
};

export const getReadingStreak = (): ReadingStreak => {
  if (typeof localStorage === 'undefined') return emptyStreak;
  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    if (!raw) return emptyStreak;
    const parsed = JSON.parse(raw);
    return {
      currentStreak: Number(parsed?.currentStreak) || 0,
      longestStreak: Number(parsed?.longestStreak) || 0,
      lastReadDate: typeof parsed?.lastReadDate === 'string' ? parsed.lastReadDate : null,
      activeDates: Array.isArray(parsed?.activeDates) ? parsed.activeDates.slice(-MAX_TRACKED_DAYS) : [],
    };
  } catch {
    return emptyStreak;
  }
};

const saveReadingStreak = (streak: ReadingStreak) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streak));
  } catch {}
};

/**
 * Call whenever the user actually reads (e.g. scrolls in the Reader). Cheap
 * and idempotent — only touches storage the first time it's called on a given
 * calendar day.
 */
export const recordReadingActivityToday = (): ReadingStreak => {
  const today = todayKey();
  const current = getReadingStreak();
  if (current.lastReadDate === today) return current;

  const continuesStreak = current.lastReadDate === dayBeforeKey(today);
  const nextCount = continuesStreak ? current.currentStreak + 1 : 1;
  const next: ReadingStreak = {
    currentStreak: nextCount,
    longestStreak: Math.max(current.longestStreak, nextCount),
    lastReadDate: today,
    activeDates: [...current.activeDates, today].slice(-MAX_TRACKED_DAYS),
  };
  saveReadingStreak(next);
  return next;
};

/**
 * The streak as it should be *displayed right now*: a streak that hasn't
 * been kept up (no read today or yesterday) reads as broken (0) even before
 * the next actual read event formally resets the stored counter.
 */
export const getEffectiveCurrentStreak = (streak: ReadingStreak): number => {
  if (!streak.lastReadDate) return 0;
  const today = todayKey();
  if (streak.lastReadDate === today || streak.lastReadDate === dayBeforeKey(today)) {
    return streak.currentStreak;
  }
  return 0;
};

export const hasReadToday = (streak: ReadingStreak): boolean => streak.lastReadDate === todayKey();

/** Oldest-to-newest booleans for the last `days` calendar days (today last). */
export const getRecentActivity = (streak: ReadingStreak, days: number): boolean[] => {
  const active = new Set(streak.activeDates);
  const result: boolean[] = [];
  const cursor = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    result.push(active.has(dateKey(d)));
  }
  return result;
};
