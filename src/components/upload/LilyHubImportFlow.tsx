import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Check, CheckCircle2, ChevronDown, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BookRepository } from '../../book-engine/storage/BookRepository';
import { LilyHubChapterMeta, LilyHubClient, LilyHubNovel } from '../../book-engine/lilyhub/LilyHubClient';
import { NormalizedChapter } from '../../book-engine/types';
import { BookCover } from '../common/BookCover';

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
  const [isPickerOpen, setIsPickerOpen] = useState(false);

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
        url: `https://www.lilyhub.top/truyen/${selected.slug || selected.id}`,
        hostname: 'www.lilyhub.top',
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
      {selected && <button type="button" onClick={() => setIsPickerOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-ink-100 bg-[#FCFAF8] p-3 text-left transition-colors hover:border-lily-200 hover:bg-lily-50/30">
        <BookCover title={selected.title} author={selected.author} coverUrl={selected.cover_image} size="sm" className="!h-20 !w-14" />
        <span className="min-w-0 flex-1"><strong className="block line-clamp-2 font-serif text-sm text-ink-950">{selected.title}</strong><span className="mt-1 block text-xs text-ink-500">{selected.author || 'Chưa rõ tác giả'} · {selected.chapter_count || 0} chương</span>{existing && <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Đã có trên thiết bị</span>}</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-500"><ChevronDown className="h-4 w-4" /></span>
      </button>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {busy && progress.total > 0 && <p className="text-center text-xs text-ink-500">Đang tải {progress.done}/{progress.total} chương cần cập nhật...</p>}
      <button type="button" disabled={!selected || busy} onClick={handleImport} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : existing ? <RefreshCw className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
        {busy ? 'Đang chuẩn bị...' : existing ? 'Load chương mới' : 'Lưu để đọc offline'}
      </button>

      {isPickerOpen && createPortal((
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="lilyhub-picker-title" onClick={() => setIsPickerOpen(false)}>
          <div className="flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-ink-100 bg-[#FFFCFA] shadow-modal sm:rounded-3xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <div><h3 id="lilyhub-picker-title" className="font-serif text-lg font-bold text-ink-950">Chọn truyện LilyHub</h3><p className="mt-0.5 text-[11px] text-ink-500">{novels.length} truyện trong thư viện</p></div>
              <button type="button" onClick={() => setIsPickerOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100" aria-label="Đóng"><X className="h-5 w-5" /></button>
            </div>
            <div className="border-b border-ink-100 p-3 sm:px-5">
              <div className="relative"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tên truyện hoặc tác giả" className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-lily-400" /></div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 sm:p-3">
              {filtered.length ? filtered.map(novel => {
                const chosen = String(novel.id) === selectedId;
                return <button type="button" key={novel.id} onClick={() => { setSelectedId(String(novel.id)); setIsPickerOpen(false); }} className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${chosen ? 'bg-lily-50 ring-1 ring-lily-200' : 'hover:bg-cream-50'}`}>
                  <BookCover title={novel.title} author={novel.author} coverUrl={novel.cover_image} size="sm" className="!h-16 !w-11" />
                  <span className="min-w-0 flex-1"><strong className="block line-clamp-2 text-sm font-semibold text-ink-900">{novel.title}</strong><span className="mt-1 block truncate text-[11px] text-ink-500">{novel.author || 'Chưa rõ tác giả'}{novel.chapter_count ? ` · ${novel.chapter_count} chương` : ''}</span></span>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${chosen ? 'border-lily-600 bg-lily-600 text-white' : 'border-ink-200 bg-white'}`}>{chosen && <Check className="h-3 w-3" />}</span>
                </button>;
              }) : <p className="px-4 py-10 text-center text-sm text-ink-500">Không tìm thấy truyện phù hợp.</p>}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
};
