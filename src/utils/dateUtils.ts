import { t, localeTag } from '../i18n';
/**
 * Utility functions for date & relative timestamp formatting
 */

export function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return t('Chưa đọc');
  if (dateStr === 'Vừa xong' || dateStr === 'Vừa thêm' || dateStr === 'Chưa đọc') {
    return t(dateStr);
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return t(dateStr);
  }

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  const relative = new Intl.RelativeTimeFormat(localeTag(), { numeric: 'always' });
  if (diffSec < 60) return t('Vừa xong');
  if (diffSec < 3600) return relative.format(-Math.floor(diffSec / 60), 'minute');
  if (diffSec < 86400) return relative.format(-Math.floor(diffSec / 3600), 'hour');
  if (diffSec < 172800) return t('Hôm qua');
  if (diffSec < 604800) return relative.format(-Math.floor(diffSec / 86400), 'day');

  return date.toLocaleDateString(localeTag());
}
