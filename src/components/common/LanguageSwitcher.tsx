import React from 'react';
import { setLocale, useLocale } from '../../i18n';
export function LanguageSwitcher() {
  const locale = useLocale();
  return <div className="lily-language" role="group" aria-label={locale === 'en' ? 'Interface language' : 'Ngôn ngữ giao diện'}>
    <button type="button" lang="vi" aria-label="Tiếng Việt" aria-pressed={locale === 'vi'} onClick={() => setLocale('vi')}>Vi</button>
    <span aria-hidden="true">/</span>
    <button type="button" lang="en" aria-label="English" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>En</button>
  </div>;
}
