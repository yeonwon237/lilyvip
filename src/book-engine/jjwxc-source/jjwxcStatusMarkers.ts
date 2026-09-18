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
  /vip内容加载失败/i,
];

export const JJWXC_NOT_FOUND_MARKERS: RegExp[] = [
  /文章不存在/,
  /该文章不存在/,
  /找不到该页面/,
  /作品不存在/,
  /该文不存在/,
  /没有找到相关文章/,
  /内容不存在/,
  /文章已被删除/,
];

export const JJWXC_CONTENT_LOCKED_MARKERS: RegExp[] = [
  /已被.*锁定/,
  /作者自行锁定/,
  /相关内容已被.*锁定/,
  /文章已被锁定/,
  /已被锁定/,
  /该文已被锁定/,
  /由于作者原因/,
  /由于版权原因/,
  /暂时不能阅读/,
  /文章正在审核中/,
  /该作品已被屏蔽/,
  /内容已被屏蔽/,
];

export type JjwxcKnownStatus = 'locked' | 'session_expired' | 'not_found' | 'content_locked';

/** Order matters: an expired-session page and a locked-chapter page can both
 * mention "购买"/purchase in navigation chrome, so session markers are checked
 * first since a login page is the more specific/urgent state to report. */
export function detectKnownJjwxcStatus(html: string): JjwxcKnownStatus | null {
  if (JJWXC_NOT_FOUND_MARKERS.some(marker => marker.test(html))) return 'not_found';
  if (JJWXC_CONTENT_LOCKED_MARKERS.some(marker => marker.test(html))) return 'content_locked';
  if (JJWXC_SESSION_EXPIRED_MARKERS.some(marker => marker.test(html))) return 'session_expired';
  if (JJWXC_LOCKED_MARKERS.some(marker => marker.test(html))) return 'locked';
  return null;
}
