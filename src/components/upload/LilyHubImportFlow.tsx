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

  // Chapter metadata (numbers/titles only, no body text) for the selected
  // novel, fetched as soon as it's picked so the range inputs below can show
  // real bounds and validate before the user commits to a download.
  const [metadata, setMetadata] = useState<LilyHubChapterMeta[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(1);

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
  const existingFirst = existing ? (existing.firstChapterIndex ?? 1) : 0;
  const existingLast = existing ? existingFirst + existing.totalChapters - 1 : 0;

  // Fetch this novel's chapter numbering as soon as it's selected, and seed
  // sensible range defaults: the whole book for a first import, or "from
  // right after what's already on the device" for a re-sync.
  useEffect(() => {
    if (!selected) { setMetadata([]); return; }
    let cancelled = false;
    setMetadataLoading(true);
    setError('');
    LilyHubClient.getChapters(selected)
      .then((rows) => {
        if (cancelled) return;
        setMetadata(rows);
        if (!rows.length) return;
        const sourceMin = Number(rows[0].chapter_number);
        const sourceMax = Number(rows[rows.length - 1].chapter_number);
        if (existing) {
          setRangeFrom(Math.min(Math.max(existingLast + 1, sourceMin), sourceMax));
          setRangeTo(sourceMax);
        } else {
          setRangeFrom(sourceMin);
          setRangeTo(sourceMax);
        }
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Chưa thể tải danh sách chương.'); })
      .finally(() => { if (!cancelled) setMetadataLoading(false); });
    return () => { cancelled = true; };
    // existingFirst/existingLast are derived from `existing`, already covered by selected.id changing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const sourceMin = metadata.length ? Number(metadata[0].chapter_number) : 1;
  const sourceMax = metadata.length ? Number(metadata[metadata.length - 1].chapter_number) : (selected?.chapter_count || 1);
  const isFullRange = rangeFrom <= sourceMin && rangeTo >= sourceMax;

  const handleImport = async () => {
    if (!selected || busy || metadataLoading) return;
    if (!existing && !canAddBookFrom('lilyhub')) {
      showToast(getSlotError('lilyhub') || 'Không còn slot LilyHub.', 'error');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (!metadata.length) throw new Error('Truyện này chưa có chương để tải.');
      const from = Math.min(Math.max(rangeFrom, sourceMin), sourceMax);
      const to = Math.min(Math.max(rangeTo, sourceMin), sourceMax);
      const desiredStart = Math.min(from, to);
      const desiredEnd = Math.max(from, to);

      let rangeStart = desiredStart;
      let rangeEnd = desiredEnd;
      if (existing) {
        // Storage requires one dense, contiguous run of chapters, so a new
        // selection has to touch (or overlap) what's already on the device —
        // otherwise merging would silently force-download everything in
        // between just to keep the run unbroken.
        const touches = desiredStart <= existingLast + 1 && desiredEnd >= existingFirst - 1;
        if (!touches) {
          throw new Error(`Khoảng chương ${desiredStart}–${desiredEnd} không liền với khoảng đã tải (${existingFirst}–${existingLast}). Hãy chọn khoảng chạm hoặc liền kề với khoảng đã có.`);
        }
        rangeStart = Math.min(existingFirst, desiredStart);
        rangeEnd = Math.max(existingLast, desiredEnd);
      }

      const metaInRange = metadata.filter((meta) => {
        const num = Number(meta.chapter_number);
        return num >= rangeStart && num <= rangeEnd;
      });
      if (!metaInRange.length) throw new Error('Không tìm thấy chương nào trong khoảng đã chọn.');

      const oldChapters = existing ? await BookRepository.getChapters(existing.id) : [];
      const oldBySource = new Map(oldChapters.map(chapter => [chapter.sourceUrl, chapter]));
      const toFetch: Array<{ meta: LilyHubChapterMeta; index: number }> = [];
      const chapters: Array<NormalizedChapter | undefined> = new Array(metaInRange.length);
      metaInRange.forEach((meta, index) => {
        const sourceUrl = LilyHubClient.publicChapterUrl(meta.content_key);
        const cached = oldBySource.get(sourceUrl);
        if (cached) chapters[index] = { ...cached, index: Number(meta.chapter_number), title: meta.title || cached.title };
        else toFetch.push({ meta, index });
      });
      setProgress({ done: 0, total: toFetch.length });
      const downloaded = await mapConcurrent(toFetch, 4, async ({ meta, index }) => {
        const chapter = await LilyHubClient.fetchChapter(meta, existing?.id || '');
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
          sourceTotalChapters: metadata.length,
          currentChapter: existing.currentChapter,
          currentChapterTitle: complete.find(c => c.index === existing.currentChapter)?.title || complete[0].title,
        });
        showToast(toFetch.length ? `Đã tải ${toFetch.length} chương mới hoặc vừa sửa.` : 'Truyện đã là phiên bản mới nhất.', 'success');
      } else {
        const draft = LilyHubClient.buildDraft(selected, complete);
        await addParsedBook(draft, {
          title: selected.title, author: selected.author || 'Tác giả', coverUrl: selected.cover_image,
          description: selected.description, tags: [selected.genre || 'Lilyhub'], source,
          sourceTotalChapters: metadata.length,
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
        <span className="min-w-0 flex-1"><strong className="block line-clamp-2 font-serif text-sm text-ink-950">{selected.title}</strong><span className="mt-1 block text-xs text-ink-500">{selected.author || 'Chưa rõ tác giả'} · {selected.chapter_count || 0} chương</span>{existing && <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Đã có trên thiết bị · chương {existingFirst}–{existingLast}</span>}</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-500"><ChevronDown className="h-4 w-4" /></span>
      </button>}

      {selected && (
        <div className="space-y-2 rounded-2xl border border-ink-100 bg-[#FCFAF8] p-3.5">
          <p className="text-xs font-semibold text-ink-700">Chọn khoảng chương muốn tải</p>
          {metadataLoading ? (
            <p className="flex items-center gap-1.5 text-xs text-ink-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang tải danh sách chương...</p>
          ) : metadata.length ? (
            <>
              <div className="flex items-center gap-2">
                <label className="flex-1">
                  <span className="mb-1 block text-[11px] text-ink-500">Từ chương</span>
                  <input
                    type="number" min={sourceMin} max={sourceMax} value={rangeFrom}
                    onChange={(event) => setRangeFrom(Number(event.target.value) || sourceMin)}
                    className="h-9 w-full rounded-lg border border-ink-200 bg-white px-2.5 text-sm outline-none focus:border-lily-400"
                  />
                </label>
                <span className="mt-4 text-ink-400">–</span>
                <label className="flex-1">
                  <span className="mb-1 block text-[11px] text-ink-500">Đến chương</span>
                  <input
                    type="number" min={sourceMin} max={sourceMax} value={rangeTo}
                    onChange={(event) => setRangeTo(Number(event.target.value) || sourceMax)}
                    className="h-9 w-full rounded-lg border border-ink-200 bg-white px-2.5 text-sm outline-none focus:border-lily-400"
                  />
                </label>
                {!isFullRange && (
                  <button type="button" onClick={() => { setRangeFrom(sourceMin); setRangeTo(sourceMax); }} className="mt-4 shrink-0 whitespace-nowrap text-[11px] font-semibold text-lily-700 hover:underline">
                    Tải cả truyện
                  </button>
                )}
              </div>
              <p className="text-[11px] text-ink-400">Truyện có {sourceMax - sourceMin + 1} chương (từ {sourceMin} đến {sourceMax}).</p>
            </>
          ) : <p className="text-xs text-ink-500">Chưa có chương nào.</p>}
        </div>
      )}

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {busy && progress.total > 0 && <p className="text-center text-xs text-ink-500">Đang tải {progress.done}/{progress.total} chương cần cập nhật...</p>}
      <button type="button" disabled={!selected || busy || metadataLoading} onClick={handleImport} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : existing ? <RefreshCw className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
        {busy ? 'Đang chuẩn bị...' : existing ? 'Load chương mới' : isFullRange ? 'Lưu để đọc offline' : `Lưu chương ${rangeFrom}–${rangeTo}`}
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
