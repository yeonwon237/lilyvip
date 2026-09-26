import type { RegistryEntry } from './OwnerRegistryClient';
import type { CandidateBook } from '../website-importer/types';

/** Mirrors normalizeSearch() in cloudflare/owner-library-worker/src/worker.js. */
export function normalizeSearch(value: string): string {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Registry id — a digest over sourceUrl+title. Title is
 * included because a WordPress blog ROOT url is identical for every book
 * discovered on that site (one candidate per category) — hashing sourceUrl
 * alone would give every book on the same blog the same id, so a second
 * book silently overwrites the first one's registry entry (and upload).
 */
export async function registryId(sourceUrl: string, title = ''): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sourceUrl}::${normalizeSearch(title)}`));
  return [...new Uint8Array(digest).slice(0, 10)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Exact sourceUrl+title match first, then normalized title+author alone.
 * sourceUrl is intentionally never checked by itself: a WordPress blog ROOT
 * url is identical across every book discovered on that site, so "same
 * sourceUrl" alone would make the second book on the same blog look like a
 * duplicate of the first and get silently skipped.
 */
export function findRegistryMatch(
  entries: RegistryEntry[],
  candidate: { sourceUrl: string; title: string; author: string },
): RegistryEntry | undefined {
  const bySourceUrlAndTitle = entries.find(entry => entry.sourceUrl === candidate.sourceUrl && normalizeSearch(entry.title) === normalizeSearch(candidate.title));
  if (bySourceUrlAndTitle) return bySourceUrlAndTitle;
  const key = `${normalizeSearch(candidate.title)}::${normalizeSearch(candidate.author)}`;
  return entries.find(entry => `${normalizeSearch(entry.title)}::${normalizeSearch(entry.author)}` === key);
}

/**
 * A tracked entry's sourceUrl can be a blog root that yields several books on
 * re-analysis (WordPress groups by category) — re-checking a specific entry
 * must pick the candidate that's actually THIS book, by sourceUrl first then
 * normalized title+author, rather than assuming it's always the first one.
 */
export function pickMatchingCandidate(candidates: CandidateBook[], entry: { sourceUrl: string; title: string; author: string }): CandidateBook | undefined {
  const bySourceUrlAndTitle = candidates.find(candidate => candidate.sourceUrl === entry.sourceUrl && normalizeSearch(candidate.title) === normalizeSearch(entry.title));
  if (bySourceUrlAndTitle) return bySourceUrlAndTitle;
  const key = `${normalizeSearch(entry.title)}::${normalizeSearch(entry.author)}`;
  return candidates.find(candidate => `${normalizeSearch(candidate.title)}::${normalizeSearch(candidate.author)}` === key) || candidates[0];
}
