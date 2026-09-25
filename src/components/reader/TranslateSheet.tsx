import React, { useState } from 'react';
import { Check, Download, KeyRound, Loader2, X, Zap } from 'lucide-react';
import { useReader } from '../../context/ReaderContext';
import { useApp } from '../../context/AppContext';
import {
  GeminiLocalSettings,
  GeminiTranslationService,
  GeminiStoryMode,
  TRANSLATION_MODELS,
} from '../../translation-engine';

export const TranslateSheet: React.FC = () => {
  const { user } = useApp();
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
    currentChapterTitle,
    currentChapterContent,
    setTextLanguageMode,
    currentChapterIndex,
    lastChapterIndex,
    backgroundTranslationQueue,
    isBackgroundTranslating,
    queueTranslateNextChapters,
    queueTranslateAllRemaining,
  } = useReader();
  const [geminiApiKey, setGeminiApiKey] = useState(() => GeminiLocalSettings.getApiKey());
  const [geminiSettings, setGeminiSettings] = useState(() => GeminiLocalSettings.getSettings());
  const [geminiTestState, setGeminiTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [geminiTestMessage, setGeminiTestMessage] = useState('');
  const selectedModel = TRANSLATION_MODELS.find(model => model.id === selectedTranslationModelId);
  const isGeminiSelected = selectedModel?.provider === 'gemini';

  const updateGeminiSettings = (next: typeof geminiSettings) => {
    setGeminiSettings(next);
    GeminiLocalSettings.setSettings(next);
    setGeminiTestState('idle');
  };

  const testGemini = async () => {
    GeminiLocalSettings.setApiKey(geminiApiKey);
    GeminiLocalSettings.setSettings(geminiSettings);
    setGeminiTestState('testing');
    setGeminiTestMessage('');
    try {
      await GeminiTranslationService.testConnection();
      setGeminiTestState('ok');
      setGeminiTestMessage('Kết nối Gemini thành công.');
    } catch (error: any) {
      setGeminiTestState('error');
      setGeminiTestMessage(error?.message || 'Không thể kết nối Gemini.');
    }
  };

  const exportTranslationAudit = () => {
    if (!translatedParagraphs) return;
    const model = TRANSLATION_MODELS.find(item => item.id === selectedTranslationModelId);
    const rows = currentChapterContent.map((source, index) => [
      `--- ĐOẠN ${index + 1} ---`,
      '[TRUNG]',
      source,
      '[VIỆT]',
      translatedParagraphs[index] || '[THIẾU BẢN DỊCH]',
    ].join('\n'));
    const report = [
      `Chương: ${currentChapterTitle}`,
      `Model: ${model?.label || selectedTranslationModelId}`,
      `Số đoạn gốc: ${currentChapterContent.length}`,
      `Số đoạn dịch: ${translatedParagraphs.length}`,
      '',
      ...rows,
    ].join('\n\n');
    const blob = new Blob(['\uFEFF', report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeTitle = (currentChapterTitle || `chuong-${currentChapterIndex}`)
      .replace(/[\\/:*?"<>|]+/g, '-')
      .slice(0, 80);
    anchor.href = url;
    anchor.download = `kiem-thu-dich-${safeTitle}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

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
          <h3 className="font-serif text-base font-bold text-ink-900">Dịch chương này</h3>
          <button
            onClick={() => !isTranslating && setIsTranslatePanelOpen(false)}
            disabled={isTranslating}
            className="flex h-9 w-9 items-center justify-center text-ink-600 disabled:opacity-30"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-3 p-4 pb-5">
          <p className="text-[11px] leading-snug text-ink-500">
            Chạy trên máy bạn (WASM), không gửi lên máy chủ. Lần đầu mất thời gian tải model, sau đó có bộ nhớ đệm.
          </p>

          <div className="grid grid-cols-1 gap-1.5">
            {TRANSLATION_MODELS.filter(m => !m.ownerOnly || user?.isOwner).map((m) => {
              const isSelected = selectedTranslationModelId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={isTranslating}
                  onClick={() => setSelectedTranslationModelId(m.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition disabled:opacity-50 ${isSelected ? 'border-lily-600 bg-lily-50/70' : 'border-ink-200/70 hover:bg-ink-50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink-900">{m.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-lily-700" />}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-ink-500">{m.description}</p>
                </button>
              );
            })}
          </div>

          {isGeminiSelected && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-950">
                <KeyRound className="h-3.5 w-3.5" /> Cài đặt Gemini trên máy này
              </div>
              <input
                type="password"
                value={geminiApiKey}
                autoComplete="off"
                spellCheck={false}
                placeholder="Nhập Gemini API key"
                onChange={(event) => {
                  const value = event.target.value;
                  setGeminiApiKey(value);
                  GeminiLocalSettings.setApiKey(value);
                  setGeminiTestState('idle');
                }}
                className="w-full rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-xs text-ink-900 outline-none focus:border-amber-500"
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="space-y-1 text-[10px] font-medium text-ink-600">
                  <span>Model Gemini</span>
                  <select
                    value={geminiSettings.model}
                    onChange={(event) => updateGeminiSettings({ ...geminiSettings, model: event.target.value })}
                    className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs text-ink-800"
                  >
                    <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite · mặc định</option>
                    <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite · tiết kiệm</option>
                  </select>
                </label>
                <label className="space-y-1 text-[10px] font-medium text-ink-600">
                  <span>Thể loại truyện</span>
                  <select
                    value={geminiSettings.storyMode}
                    onChange={(event) => updateGeminiSettings({ ...geminiSettings, storyMode: event.target.value as GeminiStoryMode })}
                    className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs text-ink-800"
                  >
                    <option value="auto">Tự nhận diện</option>
                    <option value="modern">Hiện đại</option>
                    <option value="modern-abo">Hiện đại ABO</option>
                    <option value="ancient">Cổ đại</option>
                    <option value="ancient-abo">Cổ đại ABO</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] leading-snug text-amber-900/80">
                  Key chỉ lưu trong localStorage của trình duyệt; nguyên văn được gửi trực tiếp tới Google khi dịch.
                </p>
                <button
                  type="button"
                  disabled={!geminiApiKey.trim() || geminiTestState === 'testing'}
                  onClick={testGemini}
                  className="shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-amber-900 disabled:opacity-50"
                >
                  {geminiTestState === 'testing' ? 'Đang thử...' : 'Kiểm tra key'}
                </button>
              </div>
              {geminiTestMessage && (
                <p className={`text-[10px] ${geminiTestState === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`}>{geminiTestMessage}</p>
              )}
            </div>
          )}

          {isTranslating && (
            <div className="flex items-center gap-2 rounded-xl border border-lily-200 bg-lily-50/80 px-3 py-2 text-xs text-lily-800">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              <span>{progressLabel || 'Đang xử lý...'}</span>
            </div>
          )}
          {translationError && !isTranslating && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{translationError}</p>
          )}

          <button
            type="button"
            disabled={isTranslating || (isGeminiSelected && !geminiApiKey.trim())}
            onClick={() => {
              if (isGeminiSelected) {
                GeminiLocalSettings.setApiKey(geminiApiKey);
                GeminiLocalSettings.setSettings(geminiSettings);
              }
              translateCurrentChapter(selectedTranslationModelId, Boolean(translatedParagraphs));
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-lily-700 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-lily-800 disabled:opacity-60"
          >
            {isTranslating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Đang dịch...</>
            ) : translatedParagraphs ? 'Địch lại chương này (bỏ cache)' : 'Dịch chương này'}
          </button>

          {translatedParagraphs && !isTranslating && (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => { setTextLanguageMode('translated'); setIsTranslatePanelOpen(false); }}
                className="w-full rounded-xl border border-lily-300 py-1.5 text-xs font-semibold text-lily-800 transition hover:bg-lily-50"
              >
                Xem bản dịch đã có
              </button>
              {user?.isOwner && (
                <button
                  type="button"
                  onClick={exportTranslationAudit}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-ink-300 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-ink-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Xuất bản kiểm thử
                </button>
              )}
            </div>
          )}

          {currentChapterIndex < lastChapterIndex && (
            <div className="space-y-1.5 border-t border-ink-100 pt-3">
              <h4 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-ink-600">
                <Zap className="h-3.5 w-3.5 text-lily-600" />
                Dịch trước, đọc sau
              </h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => queueTranslateNextChapters(5)}
                  className="flex-1 rounded-xl border border-ink-200 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-ink-50"
                >
                  5 chương tới
                </button>
                <button
                  type="button"
                  onClick={queueTranslateAllRemaining}
                  className="flex-1 rounded-xl border border-ink-200 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-ink-50"
                >
                  Hết truyện
                </button>
              </div>
              {(isBackgroundTranslating || backgroundTranslationQueue.length > 0) && (
                <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-1.5 text-[11px] text-ink-600">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  <span>Đang dịch ngầm · còn {backgroundTranslationQueue.length} chương</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
