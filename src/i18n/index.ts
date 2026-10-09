import { useSyncExternalStore } from 'react';
import en from './en.json';
export type Locale = 'vi' | 'en';
const KEY = 'LILY_UI_LANGUAGE_V1';
function initialLocale(): Locale {
  try { const saved = localStorage.getItem(KEY); if (saved === 'vi' || saved === 'en') return saved; } catch { /* Storage can be unavailable in private mode. */ }
  return typeof navigator !== 'undefined' && !navigator.language.toLowerCase().startsWith('vi') ? 'en' : 'vi';
}
let locale = initialLocale();
const listeners = new Set<() => void>();
const notify = () => { if (typeof document !== 'undefined') { document.documentElement.lang = locale; document.title = locale === 'en' ? 'Lilyhub — Your personal library' : 'Lilyhub — Thư viện truyện cá nhân'; } listeners.forEach(listener => listener()); };
export function setLocale(next: Locale) { locale = next; try { localStorage.setItem(KEY, next); } catch {} notify(); }
if (typeof window !== 'undefined') {
  notify();
  window.addEventListener('storage', event => { if (event.key === KEY) { locale = initialLocale(); notify(); } });
}
export function getLocale() { return locale; }
export function useLocale() { return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getLocale, () => 'vi' as Locale); }
export function t(value: string, args: readonly unknown[] = []): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  const translated = locale === 'en' ? (en as Record<string, string>)[normalized] : undefined;
  const text = translated === undefined ? value : `${/^\s/.test(value) ? ' ' : ''}${translated}${/\s$/.test(value) ? ' ' : ''}`;
  return text.replace(/\{(\d+)\}/g, (_, index: string) => String(args[Number(index)] ?? `{${index}}`));
}
export function localeTag() { return locale === 'en' ? 'en-US' : 'vi-VN'; }
