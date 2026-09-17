// Shared status keyword detection for chapter pages and the book/TOC page.
//
// Calibrated against a real anonymous (no-cookie) fetch of a live wap.jjwxc.net
// chapter — see JjwxcAdapter, which only ever fetches anonymously through the
// stateless proxy. Anonymously, a VIP/locked chapter renders a login prompt
// linking to /my/login (JJWXC can't tell "not logged in" from "logged in but
// not purchased" without a session, so both look identical from here) — the
// href pattern is the reliable signal, not the surrounding Chinese wording,
// which is short UI copy that could easily change between pages/redesigns.
// The exact-phrase markers below are still a secondary, UNVERIFIED guess for
// a future authenticated (real session) fetch path, where JJWXC may show
// different copy once it can actually distinguish those two cases.
export const JJWXC_SESSION_EXPIRED_MARKERS: RegExp[] = [
  /\/my\/login\?referer=/,
  /请(?:先)?登录/,
  /用户登录/,
  /登入帐?号/,
  /立即登录/,
  /name=["']loginform["']/i,
  /id=["']loginform["']/i,
];

export const JJWXC_LOCKED_MARKERS: RegExp[] = [
  /未购买/,
  /需要购买/,
  /本章[为是]?\s*vip/i,
  /购买本章/,
  /订阅本章/,
  /积分不足/,
  /请(?:先)?购买/,
  /订阅后可读/,
  /本文[为是]?收费章节/,
];

export type JjwxcKnownStatus = 'locked' | 'session_expired';

/** Order matters: an expired-session page and a locked-chapter page can both
 * mention "购买"/purchase in navigation chrome, so session markers are checked
 * first since a login page is the more specific/urgent state to report. */
export function detectKnownJjwxcStatus(html: string): JjwxcKnownStatus | null {
  if (JJWXC_SESSION_EXPIRED_MARKERS.some(marker => marker.test(html))) return 'session_expired';
  if (JJWXC_LOCKED_MARKERS.some(marker => marker.test(html))) return 'locked';
  return null;
}
