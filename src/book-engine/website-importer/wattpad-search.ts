import { safeFetch } from './safe-fetch';
import { readWattpadPrefetched } from './wattpad-state';
import type { CompletionStatus } from './completion-heuristics';

export interface WattpadSearchResult {
  id: string;
  title: string;
  author: string;
  sourceUrl: string;
  completion: CompletionStatus;
  totalChapters: number;
  description?: string;
  coverUrl?: string;
  tags: string[];
}

/** Fetches Wattpad's public search page and reads its embedded results — see wattpad-state.ts. */
export async function searchWattpadStories(keyword: string, signal?: AbortSignal): Promise<WattpadSearchResult[]> {
  const trimmed = keyword.trim();
  if (!trimmed) throw new Error('Cần nhập từ khóa tìm kiếm.');

  const url = `https://www.wattpad.com/search/${encodeURIComponent(trimmed)}`;
  const response = await safeFetch(url, { signal });
  if (!response.ok) throw new Error(`Wattpad phản hồi lỗi (${response.status}) khi tìm "${trimmed}".`);
  const html = await response.text();

  const prefetched = readWattpadPrefetched(html);
  const resultsKey = prefetched && Object.keys(prefetched).find(key => key.startsWith('search.stories.results.'));
  const stories = resultsKey ? prefetched?.[resultsKey]?.data?.stories : undefined;
  if (!Array.isArray(stories)) {
    throw new Error('Không đọc được kết quả tìm kiếm từ Wattpad (cấu trúc trang có thể đã thay đổi).');
  }

  return stories.map((story: any): WattpadSearchResult => ({
    id: String(story.id),
    title: String(story.title || 'Truyện Wattpad'),
    author: story.user?.name || 'Tác giả',
    sourceUrl: String(story.url || `https://www.wattpad.com/story/${story.id}`),
    completion: typeof story.completed === 'boolean' ? (story.completed ? 'completed' : 'ongoing') : 'unknown',
    totalChapters: Number(story.numParts) || 0,
    description: typeof story.description === 'string' ? story.description.slice(0, 500) : undefined,
    coverUrl: typeof story.cover === 'string' ? story.cover : undefined,
    tags: Array.isArray(story.tags) ? story.tags.map(String) : [],
  }));
}
