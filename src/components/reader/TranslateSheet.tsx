import React from 'react';
import { Check, Loader2, X, Zap } from 'lucide-react';
import { useReader } from '../../context/ReaderContext';
import { TRANSLATION_MODELS } from '../../translation-engine';

export const TranslateSheet: React.FC = () => {
  const {
    isTranslatePanelOpen,
    setIsTranslatePanelOpen,
    selectedTranslationModelId,
    setSelectedTranslationModelId,
    isTranslating,
    translationProgress,
    translationError,
    translateCurrentChapter,
    translatedParagraphs,
    setTextLanguageMode,
    currentChapterIndex,
    lastChapterIndex,
    backgroundTranslationQueue,
    isBackgroundTranslating,
    queueTranslateNextChapters,
    queueTranslateAllRemaining,
  } = useReader();

  if (!isTranslatePanelOpen) return null;

  const progressLabel = (() => {
    if (!translationProgress) return null;
    if (translationProgress.stage === 'loading-model') {
      if (translationProgress.total) {
        const pct = Math.round(((translationProgress.loaded || 0) / translationProgress.total) * 100);
        return `Đang tải mô hình dịch... ${pct}%`;
      }
      return 'Đang tải mô hình dịch...';
    }
    return `Đang dịch... ${translationProgress.done ?? 0}/${translationProgress.total_items ?? '?'} đoạn`;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/35" onClick={() => !isTranslating && setIsTranslatePanelOpen(false)}>
      <section className="reader-panel reader-settings-sheet w-full max-w-2xl overflow-y-auto border-t border-ink-200" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-ink-100 bg-white px-4">
          <h3 className="font-serif text-base font-bold text-ink-900">Dịch chương này (chạy ngay trên trình duyệt)</h3>
          <button
            onClick={() => !isTranslating && setIsTranslatePanelOpen(false)}
            disabled={isTranslating}
            className="flex h-9 w-9 items-center justify-center text-ink-600 disabled:opacity-30"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-4 p-4 pb-6">
          <p className="text-xs leading-relaxed text-ink-500">
            Tính năng thử nghiệm: mô hình dịch được tải và chạy trực tiếp trên máy bạn (WASM), không gửi nội dung
            lên máy chủ nào. Lần đầu dùng một mô hình sẽ mất thời gian tải về, các lần sau sẽ nhanh hơn nhờ bộ nhớ đệm.
          </p>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-600">Chọn cách dịch</h4>
            <div className="grid grid-cols-1 gap-2">
              {TRANSLATION_MODELS.map((m) => {
                const isSelected = selectedTranslationModelId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isTranslating}
                    onClick={() => setSelectedTranslationModelId(m.id)}
                    className={`rounded-2xl border p-3 text-left transition disabled:opacity-50 ${isSelected ? 'border-lily-600 bg-lily-50/70' : 'border-ink-200/70 hover:bg-ink-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-900">{m.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-lily-700" />}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10px] text-ink-500">{m.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {isTranslating && (
            <div className="flex items-center gap-2 rounded-xl border border-lily-200 bg-lily-50/80 px-3 py-2.5 text-xs text-lily-800">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              <span>{progressLabel || 'Đang xử lý...'}</span>
            </div>
          )}
          {translationError && !isTranslating && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">{translationError}</p>
          )}

          <button
            type="button"
            disabled={isTranslating}
            onClick={() => translateCurrentChapter(selectedTranslationModelId)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-lily-700 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-lily-800 disabled:opacity-60"
          >
            {isTranslating ? (<><Loader2 className="h-4 w-4 animate-spin" /> Đang dịch...</>) : 'Dịch chương này'}
          </button>

          {translatedParagraphs && !isTranslating && (
            <button
              type="button"
              onClick={() => { setTextLanguageMode('translated'); setIsTranslatePanelOpen(false); }}
              className="w-full rounded-xl border border-lily-300 py-2 text-xs font-semibold text-lily-800 transition hover:bg-lily-50"
            >
              Xem bản dịch đã có
            </button>
          )}

          {currentChapterIndex < lastChapterIndex && (
            <div className="space-y-2 border-t border-ink-100 pt-4">
              <h4 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-ink-600">
                <Zap className="h-3.5 w-3.5 text-lily-600" />
                Dịch trước, đọc sau
              </h4>
              <p className="text-[11px] leading-relaxed text-ink-500">
                Dịch ngầm các chương tiếp theo bằng mô hình đã chọn ở trên. Bạn cứ đọc bình thường —
                lúc lật sang chương đó, bản dịch đã sẵn sàng, không phải chờ.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => queueTranslateNextChapters(5)}
                  className="flex-1 rounded-xl border border-ink-200 py-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-50"
                >
                  5 chương tiếp theo
                </button>
                <button
                  type="button"
                  onClick={queueTranslateAllRemaining}
                  className="flex-1 rounded-xl border border-ink-200 py-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-50"
                >
                  Đến hết truyện
                </button>
              </div>
              {(isBackgroundTranslating || backgroundTranslationQueue.length > 0) && (
                <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-[11px] text-ink-600">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  <span>Đang dịch ngầm · còn {backgroundTranslationQueue.length} chương trong hàng đợi</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
