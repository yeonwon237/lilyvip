// Shared status keyword detection for chapter pages and the book/TOC page.
//
// Deliberately keyword-based rather than tied to a specific DOM container or CSS
// class: visible Chinese/English UI copy for "please log in" and "you haven't
// purchased this" is far more stable across a site redesign than exact selectors,
// and — importantly — it's something we can reason about without having fetched a
// real wap.jjwxc.net page yet. These exact phrases are still UNVERIFIED against a
// real page; they are Lily's best guess at common paywall/login copy patterns used
// across Chinese web-novel platforms, not confirmed JJWXC wording. Calibrate this
// list (not the branching logic around it) once a real authenticated fetch from a
// native device is available.
export const JJWXC_SESSION_EXPIRED_MARKERS: RegExp[] = [
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
