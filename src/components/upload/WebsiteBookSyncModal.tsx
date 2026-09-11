import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Globe, Loader2, RefreshCw, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BookRepository } from '../../book-engine/storage/BookRepository';
import { WebsiteImporter } from '../../book-engine/website-importer';
import { mergeNormalizedChapters } from '../../book-engine/website-importer/chapter-merge';
import { CandidateBook, ChapterFetchProgress, WebsiteAnalysisResult } from '../../book-engine/website-importer/types';
import { NormalizedChapter } from '../../book-engine/types';
import { Book } from '../../types';

type SyncState = 'loading' | 'input' | 'analyzing' | 'choose' | 'fetching' | 'confirm' | 'saving' | 'done' | 'error';

interface WebsiteBookSyncModalProps {
  book: Book;
  onClose: () => void;
}

const normalizeForCompare = (value: string) => value.toLocaleLowerCase('vi-VN').replace(/[^\p{L}\p{N}]+/gu, '').trim();

export const WebsiteBookSyncModal: React.FC<WebsiteBookSyncModalProps> = ({ book, onClose }) => {
  const { syncLocalBook, showToast, reloadLocalBooks } = useApp();
  const [state, setState] = useState<SyncState>('loading');
  const [urlInput, setUrlInput] = useState(book.source?.url || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [existingChapters, setExistingChapters] = useState<NormalizedChapter[]>([]);
  const [analysisResult, setAnalysisResult] = useState<WebsiteAnalysisResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateBook | null>(null);
  const [fetchProgress, setFetchProgress] = useState<ChapterFetchProgress | null>(null);
  const [mergePreview, setMergePreview] = useState<{ merged: NormalizedChapter[]; addedCount: number; skippedDuplicateCount: number; chapterIndexShifted: boolean; failedCount: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    BookRepository.getChapters(book.id)
      .then(chapters => { if (!cancelled) { setExistingChapters(chapters); setState('input'); } })
      .catch(() => { if (!cancelled) { setErrorMessage('Chưa thể đọc danh sách chương hiện có trên thiết bị.'); setState('error'); } });
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
    setErrorMessage('');
    setState('analyzing');
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const result = await WebsiteImporter.analyze(raw, controller.signal);
      if (controller.signal.aborted) return;
      setAnalysisResult(result);
      if (result.candidateBooks.length === 0) throw new Error('Không tìm thấy chương nào ở liên kết này.');
      const best = pickBestCandidate(result.candidateBooks);
      if (best) {
        void startFetch(best, controller);
      } else {
        setState('choose');
      }
    } catch (err: any) {
      if (controller.signal.aborted) { setState('input'); return; }
      const message = err?.message || 'Chưa thể phân tích liên kết này.';
      setErrorMessage(message);
      setState('input');
    }
  };

  const startFetch = async (candidate: CandidateBook, controllerOverride?: AbortController) => {
    setSelectedCandidate(candidate);
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
      const { merged, addedCount, skippedDuplicateCount, chapterIndexShifted } = mergeNormalizedChapters(existingChapters, draft.chapters);
      setMergePreview({ merged, addedCount, skippedDuplicateCount, chapterIndexShifted, failedCount: failedChapters.length });
      setState('confirm');
    } catch (err: any) {
      if (controller.signal.aborted) { setState('input'); return; }
      setErrorMessage(err?.message || 'Chưa thể tải nội dung chương từ liên kết này.');
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
          ? `Đã bổ sung ${mergePreview.addedCount} chương mới.`
          : 'Không có chương mới, đã cập nhật lại nội dung.',
        'success'
      );
      setState('done');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Chưa thể cập nhật truyện. Dữ liệu hiện tại được giữ nguyên.', 'error');
      setState('confirm');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-950/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="sync-title">
      <section className="surface-solid w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-t-3xl p-5 shadow-modal sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase text-lily-700">Cập nhật / Bổ sung chương</p>
            <h2 id="sync-title" className="mt-1 font-serif text-xl font-bold text-ink-950 truncate">{book.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-50" aria-label="Đóng"><X className="h-5 w-5" /></button>
        </div>

        {state === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu truyện hiện có…
          </div>
        )}

        {state === 'input' && (
          <form onSubmit={handleAnalyze} className="mt-4 space-y-3">
            <p className="text-xs leading-relaxed text-ink-600">
              Dán link nguồn (mặc định là link đã nhập trước đó) để kiểm tra lại. Nếu chương còn thiếu không nằm ở link này, hãy dán link khác (chuyên mục hoặc trang) có chứa các chương đó — Lily sẽ tự động thêm phần còn thiếu, không tạo trùng truyện mới.
            </p>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="Dán link truyện hoặc chuyên mục"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-2xl border border-ink-200 bg-ink-50 py-3 pl-10 pr-4 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-lily-500/20"
              />
            </div>
            {errorMessage && (
              <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}
            <button type="submit" disabled={!urlInput.trim()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-ink-950 px-4 text-sm font-semibold text-white shadow-soft disabled:opacity-40">
              <RefreshCw className="h-4 w-4" /> Kiểm tra chương
            </button>
          </form>
        )}

        {state === 'analyzing' && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-lily-600" />
            <p className="text-sm text-ink-600">Đang phân tích liên kết…</p>
            <button type="button" onClick={handleCancel} className="text-xs font-semibold text-ink-500 underline">Hủy</button>
          </div>
        )}

        {state === 'choose' && analysisResult && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-ink-600">Tìm thấy nhiều truyện ở liên kết này. Chọn đúng truyện khớp với "{book.title}":</p>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {analysisResult.candidateBooks.map(candidate => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => startFetch(candidate)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white px-3.5 py-3 text-left hover:border-lily-400 hover:bg-lily-50/40"
                >
                  <span className="min-w-0 truncate text-sm font-semibold text-ink-950">{candidate.title}</span>
                  <span className="shrink-0 text-xs text-ink-500">{candidate.totalChapters} chương</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setState('input')} className="text-xs font-semibold text-ink-500 underline">Nhập link khác</button>
          </div>
        )}

        {state === 'fetching' && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-lily-600" />
            <p className="text-sm text-ink-600">
              Đang tải {fetchProgress?.completedCount || 0} / {fetchProgress?.totalCount || selectedCandidate?.totalChapters || 0} chương…
            </p>
            <button type="button" onClick={handleCancel} className="text-xs font-semibold text-ink-500 underline">Hủy</button>
          </div>
        )}

        {state === 'confirm' && mergePreview && (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-ink-100 bg-cream-50/70 p-4 text-sm text-ink-800 space-y-1.5">
              <p><strong className="text-emerald-700">+{mergePreview.addedCount}</strong> chương mới sẽ được thêm vào.</p>
              <p className="text-xs text-ink-500">{mergePreview.skippedDuplicateCount} chương trùng số đã có được giữ nguyên nội dung cũ.</p>
              {mergePreview.failedCount > 0 && (
                <p className="text-xs text-amber-700">{mergePreview.failedCount} chương tải thất bại, chưa được thêm — có thể thử lại sau.</p>
              )}
              <p className="text-xs text-ink-500">Tổng sau khi cập nhật: {mergePreview.merged.length} chương.</p>
            </div>

            {mergePreview.chapterIndexShifted && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <strong className="block font-semibold">Cảnh báo: thứ tự chương sẽ thay đổi.</strong>
                  Có chương mới được chèn vào giữa các chương bạn đã có. Ghi chú, đoạn đã đánh dấu hoặc vị trí đọc dở có thể trỏ sang chương khác sau khi cập nhật.
                </div>
              </div>
            )}

            {mergePreview.addedCount === 0 && !mergePreview.chapterIndexShifted && (
              <p className="text-xs text-ink-500">Không có chương mới nào để bổ sung từ liên kết này.</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={() => setState('input')} className="rounded-2xl border border-ink-200 px-4 py-2.5 text-xs font-semibold text-ink-700 hover:bg-cream-50">Quay lại</button>
              <button
                type="button"
                onClick={handleConfirmSync}
                disabled={mergePreview.addedCount === 0}
                className="flex items-center gap-2 rounded-2xl bg-ink-950 px-5 py-2.5 text-xs font-semibold text-white shadow-soft disabled:opacity-40"
              >
                <Check className="h-4 w-4" /> Xác nhận cập nhật
              </button>
            </div>
          </div>
        )}

        {state === 'saving' && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang lưu vào thiết bị…
          </div>
        )}

        {state === 'error' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
            <button type="button" onClick={() => setState('input')} className="text-xs font-semibold text-ink-700 underline">Thử lại</button>
          </div>
        )}
      </section>
    </div>
  );
};
