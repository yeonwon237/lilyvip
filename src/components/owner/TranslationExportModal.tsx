import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BookRepository } from '../../book-engine/storage/BookRepository';
import { BookExporter } from '../../book-engine/export/BookExporter';
import {
  TranslatedModelSummary,
  TranslationExportChapter,
  TranslationExporter,
} from '../../book-engine/export/TranslationExporter';
import { Book } from '../../types';

interface TranslationExportModalProps {
  book: Book;
  onClose: () => void;
}

/** Owner-only: save chapters already translated on this device as one TXT file. */
export const TranslationExportModal: React.FC<TranslationExportModalProps> = ({ book, onClose }) => {
  const { showToast } = useApp();
  const [chapters, setChapters] = useState<TranslationExportChapter[] | null>(null);
  const [models, setModels] = useState<TranslatedModelSummary[] | null>(null);
  const [modelId, setModelId] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<number[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = (await BookRepository.getChapters(book.id))
        .map(chapter => ({ index: chapter.index, title: chapter.title, volumeTitle: chapter.volumeTitle }))
        .sort((a, b) => a.index - b.index);
      if (cancelled) return;
      setChapters(list);
      if (list.length) {
        setRangeFrom(String(list[0].index));
        setRangeTo(String(list[list.length - 1].index));
      }
      const summary = await TranslationExporter.summarizeModels(book.id, list);
      if (cancelled) return;
      setModels(summary);
      if (summary.length) setModelId(summary[0].modelId);
    })().catch(() => {
      if (!cancelled) { setChapters([]); setModels([]); }
    });
    return () => { cancelled = true; };
  }, [book.id]);

  const selected = useMemo(() => {
    if (!chapters) return [];
    const from = Number(rangeFrom) || -Infinity;
    const to = Number(rangeTo) || Infinity;
    return chapters.filter(chapter => chapter.index >= from && chapter.index <= to);
  }, [chapters, rangeFrom, rangeTo]);

  const runExport = async (skipMissing: boolean) => {
    if (!modelId || !selected.length) return;
    setBusy(true);
    try {
      const result = await TranslationExporter.exportTxt({
        bookId: book.id, bookTitle: book.title, author: book.author, modelId, chapters: selected,
      });
      if (result.missing.length && !skipMissing) {
        setMissing(result.missing);
        return;
      }
      if (!result.exported) {
        showToast('Chưa có chương nào được dịch bằng model này trong khoảng đã chọn.', 'error');
        return;
      }
      BookExporter.downloadBlob(result.blob, result.filename);
      showToast(`Đã xuất ${result.exported} chương bản dịch.`, 'success');
      onClose();
    } catch (error) {
      console.error('[Lily export translation]', error);
      showToast('Chưa thể xuất bản dịch.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const loading = chapters === null || models === null;
  const missingPreview = missing && (missing.length > 12 ? `${missing.slice(0, 12).join(', ')}… (${missing.length} chương)` : missing.join(', '));

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-ink-950/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="export-translation-title">
      <section className="surface-solid w-full max-w-md max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-modal sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase text-lily-700">Xuất bản dịch</p>
            <h2 id="export-translation-title" className="mt-1 font-serif text-lg font-bold leading-snug text-ink-950 line-clamp-2">{book.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-ink-500 hover:bg-ink-50" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-ink-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra các chương đã dịch trên máy này…
          </div>
        ) : !models.length ? (
          <p className="py-6 text-sm leading-relaxed text-ink-700">
            Máy này chưa có chương nào của truyện được dịch. Bản dịch được lưu theo từng trình duyệt — hãy mở truyện
            và dịch trên đúng máy này trước khi xuất.
          </p>
        ) : (
          <div className="space-y-4 pt-4">
            <label className="block">
              <span className="text-xs font-semibold text-ink-700">Model đã dịch</span>
              <select
                value={modelId}
                onChange={event => { setModelId(event.target.value); setMissing(null); }}
                className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
              >
                {models.map(model => (
                  <option key={model.modelId} value={model.modelId}>
                    {model.label} — {model.translatedCount}/{chapters.length} chương
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-ink-700">Từ chương</span>
                <input inputMode="numeric" value={rangeFrom} onChange={event => { setRangeFrom(event.target.value); setMissing(null); }}
                  className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink-700">Đến chương</span>
                <input inputMode="numeric" value={rangeTo} onChange={event => { setRangeTo(event.target.value); setMissing(null); }}
                  className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900" />
              </label>
            </div>
            <p className="text-xs text-ink-500">{selected.length} chương trong khoảng đã chọn. File TXT, mở được bằng Notepad.</p>

            {missing && missing.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Chưa dịch bằng model này: chương {missingPreview}. Bạn có thể dịch nốt rồi xuất, hoặc xuất phần đã có.
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              {missing && missing.length > 0 && (
                <button type="button" disabled={busy} onClick={() => runExport(true)}
                  className="rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50 disabled:opacity-50">
                  Xuất phần đã dịch
                </button>
              )}
              <button type="button" disabled={busy || !selected.length} onClick={() => runExport(false)}
                className="inline-flex items-center gap-2 rounded-xl bg-ink-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Tải TXT
              </button>
            </div>
          </div>
        )}
      </section>
    </div>,
    document.body
  );
};
