import React, { useState } from 'react';
import { Check, KeyRound, Loader2, Sparkles, X, Zap } from 'lucide-react';
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
    setTextLanguageMode,
    currentChapterIndex,
    lastChapterIndex,
    backgroundTranslationQueue,
    isBackgroundTranslating,
    queueTranslateNextChapters,
  } = useReader();
  const [geminiApiKey, setGeminiApiKey] = useState(() => GeminiLocalSettings.getApiKey());
  const [geminiSettings, setGeminiSettings] = useState(() => GeminiLocalSettings.getSettings());
  const [geminiTestState, setGeminiTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [geminiTestMessage, setGeminiTestMessage] = useState('');
  const [translationTier, setTranslationTier] = useState<'basic' | 'advanced' | null>(null);
  const [nextChapterCount, setNextChapterCount] = useState(5);
  const selectedModel = TRANSLATION_MODELS.find(model => model.id === selectedTranslationModelId);
  const isGeminiSelected = selectedModel?.provider === 'gemini';
  // A translation grant (🤖 Dịch AI) unlocks every model, same as the owner.
  const hasFullTranslation = Boolean(user?.isOwner || user?.features?.ai_translation);
  const availableModels = TRANSLATION_MODELS.filter(model => !model.ownerOnly || hasFullTranslation);
  const visibleModels = availableModels.filter(model =>
    translationTier === 'advanced' ? model.provider === 'gemini' : model.provider !== 'gemini',
  );

  const selectTier = (tier: 'basic' | 'advanced') => {
    setTranslationTier(tier);
    const models = availableModels.filter(model => tier === 'advanced' ? model.provider === 'gemini' : model.provider !== 'gemini');
    if (!models.some(model => model.id === selectedTranslationModelId) && models[0]) {
      setSelectedTranslationModelId(models[0].id);
    }
  };

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

  if (!isTranslatePanelOpen) return null;

  const progressLabel = (() => {
    if (!translationProgress) return null;
    if (translationProgress.stage === 'loading-model') {
      if (selectedModel?.provider === 'dictionary') return 'Đang tải từ điển QT (lần đầu hơi lâu)...';
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
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink-100/70 p-1">
            {([['basic', 'Cơ bản', 'Trên máy'], ['advanced', 'Nâng cao', 'Gemini']] as const).map(([tier, label, hint]) => (
              <button
                key={tier}
                type="button"
                disabled={isTranslating}
                onClick={() => selectTier(tier)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${translationTier === tier ? 'bg-white text-ink-950 shadow-xs' : 'text-ink-500 hover:text-ink-800'}`}
              >
                {tier === 'advanced' && <Sparkles className="h-3 w-3 text-amber-600" />}
                {label}
                <span className="font-normal text-ink-400">· {hint}</span>
              </button>
            ))}
          </div>

          {translationTier && visibleModels.length === 0 && (
            <p className="text-[11px] text-ink-400">Tài khoản này chưa có model dịch cơ bản.</p>
          )}

          {translationTier && visibleModels.length > 0 && <div className="grid grid-cols-1 gap-1">
            {visibleModels.map((m) => {
              const isSelected = selectedTranslationModelId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={isTranslating}
                  onClick={() => setSelectedTranslationModelId(m.id)}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-left text-xs transition disabled:opacity-50 ${isSelected ? 'border-lily-500 bg-lily-50/70 font-semibold text-ink-900' : 'border-ink-200/70 text-ink-700 hover:bg-ink-50'}`}
                >
                  <span className="truncate">{m.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-lily-700" />}
                </button>
              );
            })}
          </div>}

          {translationTier === 'advanced' && isGeminiSelected && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-ink-200 bg-white px-2.5">
                  <KeyRound className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                  <input
                    type="password"
                    value={geminiApiKey}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Gemini API key"
                    aria-label="Gemini API key"
                    onChange={(event) => {
                      const value = event.target.value;
                      setGeminiApiKey(value);
                      GeminiLocalSettings.setApiKey(value);
                      setGeminiTestState('idle');
                    }}
                    className="min-w-0 flex-1 bg-transparent py-2 text-xs text-ink-900 outline-none"
                  />
                </label>
                <button
                  type="button"
                  disabled={!geminiApiKey.trim() || geminiTestState === 'testing'}
                  onClick={testGemini}
                  className="shrink-0 rounded-lg border border-ink-200 bg-white px-3 text-[11px] font-semibold text-ink-700 disabled:opacity-50"
                >
                  {geminiTestState === 'testing' ? 'Đang thử...' : 'Kiểm tra'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-[10px] font-medium text-ink-500">
                  <span>Model</span>
                  <select
                    value={geminiSettings.model}
                    onChange={(event) => updateGeminiSettings({ ...geminiSettings, model: event.target.value })}
                    className="w-full rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
                  >
                    <option value="gemini-3.5-flash-lite">3.5 Flash-Lite</option>
                    <option value="gemini-3.1-flash-lite">3.1 Flash-Lite · tiết kiệm</option>
                  </select>
                </label>
                <label className="space-y-1 text-[10px] font-medium text-ink-500">
                  <span>Thể loại</span>
                  <select
                    value={geminiSettings.storyMode}
                    onChange={(event) => updateGeminiSettings({ ...geminiSettings, storyMode: event.target.value as GeminiStoryMode })}
                    className="w-full rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
                  >
                    <option value="auto">Tự nhận diện</option>
                    <option value="modern">Hiện đại</option>
                    <option value="modern-abo">Hiện đại ABO</option>
                    <option value="ancient">Cổ đại</option>
                    <option value="ancient-abo">Cổ đại ABO</option>
                  </select>
                </label>
              </div>
              <p className={`text-[10px] ${geminiTestState === 'ok' ? 'text-emerald-700' : geminiTestState === 'error' ? 'text-rose-700' : 'text-ink-400'}`}>
                {geminiTestMessage || 'Key chỉ lưu trên máy này.'}
              </p>
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

          {translationTier && <button
            type="button"
            disabled={isTranslating || !visibleModels.some(model => model.id === selectedTranslationModelId) || (isGeminiSelected && !geminiApiKey.trim())}
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
            ) : translatedParagraphs ? 'Dịch lại chương này' : 'Dịch chương này'}
          </button>}

          {translatedParagraphs && !isTranslating && (
            <button
              type="button"
              onClick={() => { setTextLanguageMode('translated'); setIsTranslatePanelOpen(false); }}
              className="w-full rounded-xl border border-lily-300 py-1.5 text-xs font-semibold text-lily-800 transition hover:bg-lily-50"
            >
              Xem bản dịch đã có
            </button>
          )}

          {translationTier === 'advanced' && isGeminiSelected && translatedParagraphs && currentChapterIndex < lastChapterIndex && (
            <div className="space-y-1.5 border-t border-ink-100 pt-3">
              <h4 className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-ink-600">
                <Zap className="h-3.5 w-3.5 text-lily-600" />
                Dịch trước, đọc sau
              </h4>
              <div className="flex gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3">
                  <span className="whitespace-nowrap text-[11px] text-ink-600">Số chương</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.min(50, lastChapterIndex - currentChapterIndex)}
                    value={nextChapterCount}
                    onChange={(event) => setNextChapterCount(Math.max(1, Math.min(50, Number(event.target.value) || 1)))}
                    className="min-w-0 flex-1 bg-transparent py-1.5 text-right text-xs font-semibold text-ink-900 outline-none"
                  />
                </label>
                <button
                  type="button"
                  disabled={isBackgroundTranslating || backgroundTranslationQueue.length > 0}
                  onClick={() => queueTranslateNextChapters(Math.min(nextChapterCount, lastChapterIndex - currentChapterIndex))}
                  className="flex-1 rounded-xl bg-amber-600 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                >
                  Dịch tiếp {Math.min(nextChapterCount, lastChapterIndex - currentChapterIndex)} chương
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
