/**
 * Utility functions for date & relative timestamp formatting
 */

export function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Chưa đọc';
  if (dateStr === 'Vừa xong' || dateStr === 'Vừa thêm' || dateStr === 'Chưa đọc') {
    return dateStr;
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 172800) return 'Hôm qua';
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} ngày trước`;

  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}
