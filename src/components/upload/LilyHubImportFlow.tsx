import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Loader2, RefreshCw, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BookRepository } from '../../book-engine/storage/BookRepository';
import { LilyHubChapterMeta, LilyHubClient, LilyHubNovel } from '../../book-engine/lilyhub/LilyHubClient';
import { NormalizedChapter } from '../../book-engine/types';

async function mapConcurrent<T, R>(items: T[], concurrency: number, run: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await run(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export const LilyHubImportFlow: React.FC = () => {
  const { books, addParsedBook, syncLocalBook, reloadLocalBooks, showToast, canAddBookFrom, getSlotError, navigateTo } = useApp();
  const [novels, setNovels] = useState<LilyHubNovel[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    const deepLinkedId = new URLSearchParams(window.location.search).get('novel') || '';
    LilyHubClient.getCatalog()
      .then((items) => {
        setNovels(items);
        const matched = items.find(item => String(item.id) === deepLinkedId || item.slug === deepLinkedId);
        setSelectedId(String(matched?.id || items[0]?.id || ''));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Chưa thể tải thư viện Lilyhub.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase('vi-VN');
    if (!value) return novels;
    return novels.filter(novel => `${novel.title} ${novel.author || ''}`.toLocaleLowerCase('vi-VN').includes(value));
  }, [novels, query]);
  const selected = novels.find(novel => String(novel.id) === selectedId) || null;
  const existing = selected
    ? books.find(book => book.source?.type === 'lilyhub' && String(book.source.novelId) === String(selected.id))
    : undefined;

  const handleImport = async () => {
    if (!selected || busy) return;
    if (!existing && !canAddBookFrom('lilyhub')) {
      showToast(getSlotError('lilyhub') || 'Không còn slot LilyHub.', 'error');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const metadata = await LilyHubClient.getChapters(selected);
      if (!metadata.length) throw new Error('Truyện này chưa có chương để tải.');
      const oldChapters = existing ? await BookRepository.getChapters(existing.id) : [];
      const oldBySource = new Map(oldChapters.map(chapter => [chapter.sourceUrl, chapter]));
      const toFetch: Array<{ meta: LilyHubChapterMeta; index: number }> = [];
      const chapters: Array<NormalizedChapter | undefined> = new Array(metadata.length);
      metadata.forEach((meta, index) => {
        const sourceUrl = LilyHubClient.publicChapterUrl(meta.content_key);
        const cached = oldBySource.get(sourceUrl);
        if (cached) chapters[index] = { ...cached, index: index + 1, title: meta.title || cached.title };
        else toFetch.push({ meta, index });
      });
      setProgress({ done: 0, total: toFetch.length });
      const downloaded = await mapConcurrent(toFetch, 4, async ({ meta, index }) => {
        const chapter = await LilyHubClient.fetchChapter(meta, existing?.id || '', index + 1);
        setProgress(current => ({ ...current, done: current.done + 1 }));
        return { index, chapter };
      });
      downloaded.forEach(({ index, chapter }) => { chapters[index] = chapter; });
      const complete = chapters.filter((chapter): chapter is NormalizedChapter => Boolean(chapter));
      const wordCount = complete.reduce((sum, chapter) => sum + chapter.wordCount, 0);
      const source = {
        type: 'lilyhub' as const,
        adapter: 'lilyhub',
        url: `https://lilyhub.top/truyen/${selected.slug || selected.id}`,
        hostname: 'lilyhub.top',
        importedAt: new Date().toISOString(),
        novelId: String(selected.id),
      };
      if (existing) {
        await syncLocalBook(existing.id, complete, {
          title: selected.title, author: selected.author || existing.author,
          coverUrl: selected.cover_image, description: selected.description,
          fileSizeMB: Number(Math.max(0.1, wordCount * 6 / 1024 / 1024).toFixed(2)), wordCount, source,
          currentChapter: Math.min(existing.currentChapter, complete.length),
          currentChapterTitle: complete[Math.min(existing.currentChapter, complete.length) - 1]?.title || complete[0].title,
        });
        showToast(toFetch.length ? `Đã tải ${toFetch.length} chương mới hoặc vừa sửa.` : 'Truyện đã là phiên bản mới nhất.', 'success');
      } else {
        const draft = LilyHubClient.buildDraft(selected, complete);
        await addParsedBook(draft, {
          title: selected.title, author: selected.author || 'Tác giả', coverUrl: selected.cover_image,
          description: selected.description, tags: [selected.genre || 'Lilyhub'], source,
        });
        showToast(`Đã lưu ${complete.length} chương để đọc offline.`, 'success');
      }
      await reloadLocalBooks();
      window.history.replaceState({}, '', window.location.pathname);
      navigateTo('library');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Chưa thể tải truyện Lilyhub.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-ink-500"><Loader2 className="h-4 w-4 animate-spin" />Đang mở thư viện Lilyhub...</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-ink-100 bg-white p-5 shadow-soft sm:p-7">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lily-100 text-lily-700"><BookOpen className="h-5 w-5" /></div>
        <div><h2 className="font-serif text-lg font-bold text-ink-950">Thư viện Lilyhub</h2><p className="mt-1 text-xs leading-5 text-ink-500">Chọn truyện để đọc offline.</p></div>
      </div>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tên truyện hoặc tác giả" className="w-full rounded-xl border border-ink-200 bg-cream-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-lily-400" />
      </div>
      <select value={selectedId} onChange={event => setSelectedId(event.target.value)} className="w-full rounded-xl border border-ink-200 bg-white p-3 text-sm text-ink-900 outline-none focus:border-lily-400">
        {filtered.map(novel => <option key={novel.id} value={novel.id}>{novel.title}{novel.author ? ` - ${novel.author}` : ''}</option>)}
      </select>
      {selected && <div className="flex gap-3 border-y border-ink-100 py-4">
        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-md bg-ink-100">{selected.cover_image && <img src={selected.cover_image} alt="" className="h-full w-full object-cover" />}</div>
        <div className="min-w-0"><strong className="block truncate text-sm text-ink-950">{selected.title}</strong><span className="mt-1 block text-xs text-ink-500">{selected.author || 'Chưa rõ tác giả'} · {selected.chapter_count || 0} chương</span>{existing && <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Đã có trên thiết bị</span>}</div>
      </div>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {busy && progress.total > 0 && <p className="text-center text-xs text-ink-500">Đang tải {progress.done}/{progress.total} chương cần cập nhật...</p>}
      <button type="button" disabled={!selected || busy} onClick={handleImport} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : existing ? <RefreshCw className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
        {busy ? 'Đang chuẩn bị...' : existing ? 'Load chương mới' : 'Lưu để đọc offline'}
      </button>
    </div>
  );
};
