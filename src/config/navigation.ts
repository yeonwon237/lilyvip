export const READER_STARTED_STORAGE_KEY = 'LILY_READER_STARTED_V1';

export function resolveInitialPage(search: string, hasStarted: boolean): 'add-book' | 'login' | 'dashboard' | 'landing' {
  const params = new URLSearchParams(search);
  if (params.has('novel')) return 'add-book';
  if (params.get('connect') === 'lilyhub') return 'login';
  if (params.get('welcome') === '1') return 'landing';
  return hasStarted ? 'dashboard' : 'landing';
}
