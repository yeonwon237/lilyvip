import { useColorTheme } from '../common/ColorThemes';
import { localeTag } from '../../i18n';
import { t } from '../../i18n';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Download, Globe, ListOrdered, Loader2, RefreshCw, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BookRepository } from '../../book-engine/storage/BookRepository';
import { WebsiteImporter } from '../../book-engine/website-importer';
import { mergeNormalizedChapters } from '../../book-engine/website-importer/chapter-merge';
import { ChapterSorter } from '../../book-engine/website-importer/chapter-sorter';
import { CandidateBook, ChapterFetchProgress, WebsiteAnalysisResult } from '../../book-engine/website-importer/types';
import { NormalizedChapter } from '../../book-engine/types';
import { Book } from '../../types';

type SyncState = 'loading' | 'input' | 'analyzing' | 'choose' | 'pick' | 'fetching' | 'confirm' | 'saving' | 'done' | 'error';

interface WebsiteBookSyncModalProps {
  book: Book;
  onClose: () => void;
}

const normalizeForCompare = (value: string) => value.toLocaleLowerCase(localeTag()).replace(/[^\p{L}\p{N}]+/gu, '').trim();

/** Same key mergeNormalizedChapters uses, so "Đã có" here means it would be skipped there. */
const chapterNumber = (title: string, fallback: number) => ChapterSorter.parseMeta(title).number ?? fallback;

export const WebsiteBookSyncModal: React.FC<WebsiteBookSyncModalProps> = ({ book, onClose }) => {
  const { syncLocalBook, showToast, reloadLocalBooks, appTheme } = useApp();
  const colorTheme = useColorTheme();
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const dark = appTheme === 'dark' || (appTheme === 'system' && systemDark);
  const [state, setState] = useState<SyncState>('loading');
  const [urlInput, setUrlInput] = useState(book.source?.url || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [existingChapters, setExistingChapters] = useState<NormalizedChapter[]>([]);
  const [analysisResult, setAnalysisResult] = useState<WebsiteAnalysisResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateBook | null>(null);
  const [fetchProgress, setFetchProgress] = useState<ChapterFetchProgress | null>(null);
  const [mergePreview, setMergePreview] = useState<{ merged: NormalizedChapter[]; addedCount: number; skippedDuplicateCount: number; chapterIndexShifted: boolean; failedCount: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [picked, setPicked] = useState<Set<number>>(() => new Set());
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  const existingNumbers = useMemo(
    () => new Set(existingChapters.map(chapter => chapterNumber(chapter.title, chapter.index))),
    [existingChapters]
  );
  const hasChapter = (chapter: { title: string; index: number }) => existingNumbers.has(chapterNumber(chapter.title, chapter.index));
  const unit = selectedCandidate?.adapterName === '52shuku' ? 'trang' : t("chương");

  useEffect(() => {
    let cancelled = false;
    BookRepository.getChapters(book.id)
      .then(chapters => { if (!cancelled) { setExistingChapters(chapters); setState('input'); } })
      .catch(() => { if (!cancelled) { setErrorMessage(t("Chưa thể đọc danh sách chương hiện có trên thiết bị.")); setState('error'); } });
    return () => {
      cancelled = true;
      abortControllerRef.current?.abort();
    };
  }, [book.id]);

  const pickBestCandidate = (candidates: CandidateBook[]): CandidateBook | null => {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    const target = normalizeForCompare(book.title);
    const exact = candidates.find(c => normalizeForCompare(c.title) === target);
    if (exact) return exact;
    const partial = candidates.find(c => normalizeForCompare(c.title).includes(target) || target.includes(normalizeForCompare(c.title)));
    return partial || null;
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = urlInput.trim();
    if (!raw) return;
    abortControllerRef.current?.abort();
    setErrorMessage('');
    setState('analyzing');
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const result = await WebsiteImporter.analyze(raw, controller.signal);
      if (controller.signal.aborted) return;
      setAnalysisResult(result);
      if (result.candidateBooks.length === 0) throw new Error(t("Không tìm thấy chương nào ở liên kết này."));
      const best = pickBestCandidate(result.candidateBooks);
      if (best) {
        await openPicker(best, controller);
      } else {
        setState('choose');
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      const message = err?.message || t("Chưa thể phân tích liên kết này.");
      setErrorMessage(message);
      setState('input');
    }
  };

  const openPicker = async (initial: CandidateBook, currentController?: AbortController) => {
    const controller = currentController || new AbortController();
    if (abortControllerRef.current !== controller) abortControllerRef.current?.abort();
    const request = controller;
    abortControllerRef.current = request;
    let candidate = initial;
    try {
      if (candidate.requiresExpansion) {
        setState('analyzing');
        const expanded = await WebsiteImporter.analyze(candidate.sourceUrl, request.signal);
        if (request.signal.aborted) return;
        const resolved = pickBestCandidate(expanded.candidateBooks);
        if (!resolved || resolved.requiresExpansion) throw new Error(t("Không tìm thấy chương nào ở liên kết này."));
        candidate = resolved;
      }
      if (!candidate.chapters.length) throw new Error(t("Không tìm thấy chương nào ở liên kết này."));
    } catch (error) {
      if (request.signal.aborted) return;
      setErrorMessage(error instanceof Error ? error.message : t("Chưa thể phân tích liên kết này."));
      setState('input');
      return;
    }
    setSelectedCandidate(candidate);
    const missing = candidate.chapters.filter(chapter => !hasChapter(chapter));
    setPicked(new Set(missing.map(chapter => chapter.index)));
    const first = missing[0] || candidate.chapters[0];
    const last = missing[missing.length - 1] || candidate.chapters[candidate.chapters.length - 1];
    setRangeFrom(first ? String(first.index) : '');
    setRangeTo(last ? String(last.index) : '');
    setState('pick');
  };

  const pickRange = () => {
    if (!selectedCandidate) return;
    const from = Number(rangeFrom);
    const to = Number(rangeTo);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return;
    const [low, high] = [Math.min(from, to), Math.max(from, to)];
    setPicked(new Set(selectedCandidate.chapters.filter(c => c.index >= low && c.index <= high).map(c => c.index)));
  };

  const togglePicked = (index: number) => setPicked(prev => {
    const next = new Set(prev);
    if (next.has(index)) next.delete(index); else next.add(index);
    return next;
  });

  const startFetch = async (fullCandidate: CandidateBook, controllerOverride?: AbortController) => {
    // Only download what the reader picked; chapters already saved are not re-fetched.
    const chosen = fullCandidate.chapters.filter(chapter => picked.has(chapter.index));
    const candidate = { ...fullCandidate, chapters: chosen, totalChapters: chosen.length };
    setSelectedCandidate(fullCandidate);
    setState('fetching');
    setErrorMessage('');
    const controller = controllerOverride || new AbortController();
    abortControllerRef.current = controller;
    try {
      const { draft, failedChapters } = await WebsiteImporter.fetchAndBuildDraft(candidate, {
        concurrency: 3,
        maxRetries: 3,
        signal: controller.signal,
        onProgress: prog => setFetchProgress({ ...prog }),
      });
      if (controller.signal.aborted) return;
      // The draft numbers chapters 1..N within this partial fetch; give chapters whose title has no
      // number their real position back so they don't collide with chapters 1..N already saved.
      const indexByUrl = new Map(chosen.map(chapter => [chapter.url, chapter.index]));
      for (const chapter of draft.chapters) {
        const original = chapter.sourceUrl ? indexByUrl.get(chapter.sourceUrl) : undefined;
        if (original !== undefined) chapter.index = original;
      }
      const { merged, addedCount, skippedDuplicateCount, chapterIndexShifted } = mergeNormalizedChapters(existingChapters, draft.chapters);
      setMergePreview({ merged, addedCount, skippedDuplicateCount, chapterIndexShifted, failedCount: failedChapters.length });
      setState('confirm');
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setErrorMessage(err?.message || t("Chưa thể tải nội dung chương từ liên kết này."));
      setState('error');
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setState('input');
  };

  const handleConfirmSync = async () => {
    if (!mergePreview || !selectedCandidate) return;
    setState('saving');
    try {
      const wordCount = mergePreview.merged.reduce((sum, c) => sum + c.wordCount, 0);
      await syncLocalBook(book.id, mergePreview.merged, {
        wordCount,
        currentChapter: Math.min(book.currentChapter, mergePreview.merged.length),
        currentChapterTitle: mergePreview.merged[Math.min(book.currentChapter, mergePreview.merged.length) - 1]?.title,
        source: {
          type: 'website',
          adapter: selectedCandidate.adapterName,
          url: selectedCandidate.sourceUrl,
          hostname: selectedCandidate.hostname,
          importedAt: new Date().toISOString(),
        },
      });
      await reloadLocalBooks();
      showToast(
        mergePreview.addedCount > 0
          ? t("Đã bổ sung {0} chương mới.", [mergePreview.addedCount])
          : t("Không có chương mới, đã cập nhật lại nội dung."),
        'success'
      );
      setState('done');
      onClose();
    } catch (err: any) {
      showToast(err?.message || t("Chưa thể cập nhật truyện. Dữ liệu hiện tại được giữ nguyên."), 'error');
      setState('confirm');
    }
  };

  // Portal to <body>: rendered inside the detail page, the sheet sat under the mobile bottom nav.
  return createPortal(
    <div data-color-theme={colorTheme} className={`lily-ui website-sync-overlay ${dark ? 'dark' : ''} fixed inset-0 z-[130] flex items-end justify-center p-0 sm:items-center sm:p-4`} style={{ background: 'rgba(0,0,0,.45)' }} role="dialog" aria-modal="true" aria-labelledby="sync-title">
      <section className="surface-solid w-full max-w-lg max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-modal sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase text-lily-700">{t("Cập nhật / Bổ sung chương")}</p>
            <h2 id="sync-title" className="mt-1 font-serif text-lg font-bold leading-snug text-ink-950 line-clamp-2">{book.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-50" aria-label={t("Đóng")}><X className="h-5 w-5" /></button>
        </div>

        {state === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin" /> {t(" Đang tải dữ liệu truyện hiện có…")}</div>
        )}

        {state === 'input' && (
          <form onSubmit={handleAnalyze} noValidate className="mt-4 space-y-3">
            <p className="text-xs leading-relaxed text-ink-600">
              {t("Lily kiểm tra link nguồn rồi cho bạn chọn chương muốn thêm. Truyện đang có ")}<strong className="text-ink-900">{existingChapters.length}</strong> {t(" chương.")}</p>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder={t("Dán link truyện hoặc chuyên mục")}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-2xl border border-ink-200 bg-ink-50 py-3 pl-10 pr-4 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-lily-500/20"
              />
            </div>
            {errorMessage && (
              <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{t(errorMessage)}</span>
              </div>
            )}
            <button type="submit" disabled={!urlInput.trim()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-ink-950 px-4 text-sm font-semibold text-white shadow-soft disabled:opacity-40">
              <RefreshCw className="h-4 w-4" /> {t(" Kiểm tra chương")}</button>
          </form>
        )}

        {state === 'analyzing' && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-lily-600" />
            <p className="text-sm text-ink-600">{t("Đang phân tích liên kết…")}</p>
            <button type="button" onClick={handleCancel} className="text-xs font-semibold text-ink-500 underline">{t("Hủy")}</button>
          </div>
        )}

        {state === 'choose' && analysisResult && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-ink-600">{t("Tìm thấy nhiều truyện ở liên kết này. Chọn đúng truyện khớp với \"")}{book.title}":</p>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {analysisResult.candidateBooks.map(candidate => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => openPicker(candidate)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white px-3.5 py-3 text-left hover:border-lily-400 hover:bg-lily-50/40"
                >
                  <span className="min-w-0 truncate text-sm font-semibold text-ink-950">{candidate.title}</span>
                  <span className="shrink-0 text-xs text-ink-500">{candidate.totalChapters} {t(" chương")}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setState('input')} className="text-xs font-semibold text-ink-500 underline">{t("Nhập link khác")}</button>
          </div>
        )}

        {state === 'pick' && selectedCandidate && (
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
                <ListOrdered className="h-3.5 w-3.5 text-emerald-600" /> {t(" Chọn ")}{unit} {t(" muốn thêm")}</span>
              <span className="text-[11px] text-ink-500">
                {t("Đã chọn ")}<strong className="text-ink-900">{picked.size}</strong>/{selectedCandidate.chapters.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <button type="button" onClick={() => setPicked(new Set(selectedCandidate.chapters.filter(c => !hasChapter(c)).map(c => c.index)))} className="rounded-full border border-ink-200 bg-white px-2.5 py-1 font-semibold text-ink-700 hover:border-ink-400">{t("Chưa có")}</button>
              <button type="button" onClick={() => setPicked(new Set(selectedCandidate.chapters.map(c => c.index)))} className="rounded-full border border-ink-200 bg-white px-2.5 py-1 font-semibold text-ink-700 hover:border-ink-400">{t("Tất cả")}</button>
              <button type="button" onClick={() => setPicked(new Set())} className="rounded-full border border-ink-200 bg-white px-2.5 py-1 font-semibold text-ink-700 hover:border-ink-400">{t("Bỏ chọn")}</button>
            </div>
            <form onSubmit={event => { event.preventDefault(); pickRange(); }} className="flex items-center gap-1.5 text-[11px] text-ink-500">
              <span>{t("Từ")}</span>
              <input type="number" inputMode="numeric" value={rangeFrom} onChange={event => setRangeFrom(event.target.value)} aria-label={t("Từ {0}", [unit])} className="w-16 rounded-lg border border-ink-200 bg-white px-1.5 py-1 text-center font-semibold text-ink-900 focus:outline-none focus:ring-2 focus:ring-lily-200" />
              <span>{t("đến")}</span>
              <input type="number" inputMode="numeric" value={rangeTo} onChange={event => setRangeTo(event.target.value)} aria-label={t("Đến {0}", [unit])} className="w-16 rounded-lg border border-ink-200 bg-white px-1.5 py-1 text-center font-semibold text-ink-900 focus:outline-none focus:ring-2 focus:ring-lily-200" />
              <button type="submit" className="rounded-full bg-lily-50 px-2.5 py-1 font-semibold text-lily-800 hover:bg-lily-100">{t("Chọn khoảng")}</button>
            </form>
            <div className="max-h-[40dvh] overflow-y-auto rounded-2xl border border-ink-100 bg-ink-50/40 p-1 text-xs">
              {selectedCandidate.chapters.map(chapter => {
                const owned = hasChapter(chapter);
                const on = picked.has(chapter.index);
                return (
                  <label key={chapter.index} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-1.5 hover:bg-white">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <input type="checkbox" checked={on} onChange={() => togglePicked(chapter.index)} className="h-3.5 w-3.5 shrink-0 accent-[#A93561]" />
                      <span className={`truncate ${on ? 'font-medium text-ink-900' : 'text-ink-400'}`}>{chapter.title}</span>
                    </span>
                    {owned && <span className="shrink-0 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">{t("Đã có")}</span>}
                  </label>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              <button type="button" onClick={() => setState('input')} className="rounded-2xl border border-ink-200 px-4 py-2.5 text-xs font-semibold text-ink-700 hover:bg-cream-50">{t("Link khác")}</button>
              <button type="button" onClick={() => startFetch(selectedCandidate)} disabled={picked.size === 0} className="flex items-center gap-2 rounded-2xl bg-ink-950 px-5 py-2.5 text-xs font-semibold text-white shadow-soft disabled:opacity-40">
                <Download className="h-4 w-4" /> {t(" Tải ")}{picked.size} {unit}
              </button>
            </div>
          </div>
        )}

        {state === 'fetching' && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-lily-600" />
            <p className="text-sm text-ink-600">
              {t("Đang tải ")}{fetchProgress?.completedCount || 0} / {fetchProgress?.totalCount || picked.size} {unit}…
            </p>
            <button type="button" onClick={handleCancel} className="text-xs font-semibold text-ink-500 underline">{t("Hủy")}</button>
          </div>
        )}

        {state === 'confirm' && mergePreview && (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-ink-100 bg-cream-50/70 p-4 text-sm text-ink-800 space-y-1.5">
              <p><strong className="text-emerald-700">+{mergePreview.addedCount}</strong> {t(" chương mới sẽ được thêm vào.")}</p>
              <p className="text-xs text-ink-500">{mergePreview.skippedDuplicateCount} {t(" chương trùng số đã có được giữ nguyên nội dung cũ.")}</p>
              {mergePreview.failedCount > 0 && (
                <p className="text-xs text-amber-700">{mergePreview.failedCount} {t(" chương tải thất bại, chưa được thêm — có thể thử lại sau.")}</p>
              )}
              <p className="text-xs text-ink-500">{t("Tổng sau khi cập nhật: ")}{mergePreview.merged.length} {t(" chương.")}</p>
            </div>

            {mergePreview.chapterIndexShifted && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <strong className="block font-semibold">{t("Cảnh báo: thứ tự chương sẽ thay đổi.")}</strong>
                  {t("Có chương mới được chèn vào giữa các chương bạn đã có. Ghi chú, đoạn đã đánh dấu hoặc vị trí đọc dở có thể trỏ sang chương khác sau khi cập nhật.")}</div>
              </div>
            )}

            {mergePreview.addedCount === 0 && !mergePreview.chapterIndexShifted && (
              <p className="text-xs text-ink-500">{t("Không có chương mới nào để bổ sung từ liên kết này.")}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={() => setState('input')} className="rounded-2xl border border-ink-200 px-4 py-2.5 text-xs font-semibold text-ink-700 hover:bg-cream-50">{t("Quay lại")}</button>
              <button
                type="button"
                onClick={handleConfirmSync}
                disabled={mergePreview.addedCount === 0}
                className="flex items-center gap-2 rounded-2xl bg-ink-950 px-5 py-2.5 text-xs font-semibold text-white shadow-soft disabled:opacity-40"
              >
                <Check className="h-4 w-4" /> {t(" Xác nhận cập nhật")}</button>
            </div>
          </div>
        )}

        {state === 'saving' && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-600">
            <Loader2 className="h-4 w-4 animate-spin" /> {t(" Đang lưu vào thiết bị…")}</div>
        )}

        {state === 'error' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{t(errorMessage)}</span>
            </div>
            <button type="button" onClick={() => setState('input')} className="text-xs font-semibold text-ink-700 underline">{t("Thử lại")}</button>
          </div>
        )}
      </section>
    </div>,
    document.body
  );
};
