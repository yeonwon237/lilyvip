import { t } from '../../i18n';
import React, { useEffect, useState } from 'react';
import { Check, KeyRound, Loader2, Languages, Users, X, Zap } from 'lucide-react';
import { useReader } from '../../context/ReaderContext';
import { useApp } from '../../context/AppContext';
import {
  GeminiLocalSettings,
  GeminiTranslationService,
  GeminiStoryMode,
  TRANSLATION_MODELS,
  usesModelLicense,
} from '../../translation-engine';
import { ModelAccount, ModelLicense } from '../../translation-engine/ModelLicense';
import { StoryProfiles } from '../../translation-engine/GeminiStoryProfile';
import { GeminiProfileSheet } from './GeminiProfileSheet';

export const TranslateSheet: React.FC = () => {
  const { user, currentBook } = useApp();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
    stopBackgroundTranslation,
  } = useReader();
  const [geminiApiKey, setGeminiApiKey] = useState(() => GeminiLocalSettings.getApiKey());
  const [geminiSettings, setGeminiSettings] = useState(() => GeminiLocalSettings.getSettings());
  const [geminiTestState, setGeminiTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [geminiTestMessage, setGeminiTestMessage] = useState('');
  const [translationTier, setTranslationTier] = useState<'basic' | 'advanced' | null>(null);
  const [modelCode, setModelCode] = useState('');
  const [activation, setActivation] = useState<{ state: 'idle' | 'busy' | 'error' | 'ok'; message: string }>({ state: 'idle', message: '' });
  const [, setLicenseVersion] = useState(0);
  const selectedModel = TRANSLATION_MODELS.find(model => model.id === selectedTranslationModelId);
  // A translation grant (🤖 Dịch AI) unlocks every model, same as the owner; Lily's own models
  // then get their per-device license automatically on the first translation.
  const hasFullTranslation = Boolean(user?.isOwner || user?.features?.ai_translation);
  const modelAccount: ModelAccount | null = user?.id && user.id !== 'guest' ? { id: user.id, name: user.name, isOwner: user.isOwner, canTranslate: hasFullTranslation } : null;
  const needsModelLicense = Boolean(usesModelLicense(selectedModel) && selectedModel?.hfRepo && !hasFullTranslation && !ModelLicense.authFor(selectedModel.licenseRepo || selectedModel.hfRepo, modelAccount));

  // The owner's device activates itself as soon as the owner cloud is unlocked — no code.
  useEffect(() => {
    if (!isTranslatePanelOpen || !needsModelLicense || !modelAccount?.isOwner || !ModelLicense.hasOwnerSession()) return;
    let cancelled = false;
    setActivation({ state: 'busy', message: t("Đang kích hoạt model cho máy admin...") });
    ModelLicense.activateOwnerDevice(modelAccount)
      .then(() => { if (!cancelled) { setActivation({ state: 'ok', message: t("Máy admin đã có đủ model.") }); setLicenseVersion(v => v + 1); } })
      .catch((error: any) => { if (!cancelled) setActivation({ state: 'error', message: error?.message || t("Chưa kích hoạt được.") }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTranslatePanelOpen, needsModelLicense, modelAccount?.id, modelAccount?.isOwner]);

  const submitModelCode = async () => {
    if (!modelAccount || !modelCode.trim()) return;
    setActivation({ state: 'busy', message: modelAccount.isOwner ? t("Đang mở khóa máy admin...") : t("Đang kích hoạt mã...") });
    try {
      if (modelAccount.isOwner) await ModelLicense.unlockOwnerDevice(modelCode.trim(), modelAccount);
      else await ModelLicense.activate(modelCode.trim(), modelAccount);
      setModelCode('');
      setActivation({ state: 'ok', message: modelAccount.isOwner ? t("Máy admin đã có đủ model.") : t("Đã kích hoạt model cho máy này.") });
      setLicenseVersion(v => v + 1);
    } catch (error: any) {
      setActivation({ state: 'error', message: error?.message || t("Chưa kích hoạt được.") });
    }
  };
  const isGeminiSelected = selectedModel?.provider === 'gemini';
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
      setGeminiTestMessage(t("Kết nối Gemini thành công."));
    } catch (error: any) {
      setGeminiTestState('error');
      setGeminiTestMessage(error?.message || t("Không thể kết nối Gemini."));
    }
  };

  if (!isTranslatePanelOpen) return null;

  const canTranslate = !needsModelLicense
    && visibleModels.some(model => model.id === selectedTranslationModelId)
    && !(isGeminiSelected && !geminiApiKey.trim());
  const startTranslate = () => {
    if (isGeminiSelected) {
      GeminiLocalSettings.setApiKey(geminiApiKey);
      GeminiLocalSettings.setSettings(geminiSettings);
    }
    translateCurrentChapter(selectedTranslationModelId, Boolean(translatedParagraphs));
  };
  const remainingChapters = Math.max(0, lastChapterIndex - currentChapterIndex);
  const prefetchRunning = isBackgroundTranslating || backgroundTranslationQueue.length > 0;
  // Gemini keeps story memory chapter by chapter, so it pre-translates only after this one.
  const showPrefetch = Boolean(translationTier) && (prefetchRunning || (
    remainingChapters > 0 && canTranslate && !isTranslating && (!isGeminiSelected || Boolean(translatedParagraphs))
  ));

  const progressLabel = (() => {
    if (!translationProgress) return null;
    if (translationProgress.stage === 'loading-model') {
      if (selectedModel?.provider === 'dictionary') return t("Đang tải từ điển QT (lần đầu hơi lâu)...");
      if (selectedModel?.provider === 'google') return t("Đang chuẩn bị bảng tên...");
      if (translationProgress.total) {
        const pct = Math.round(((translationProgress.loaded || 0) / translationProgress.total) * 100);
        return t("Đang tải mô hình dịch... {0}%", [pct]);
      }
      return t("Đang tải mô hình dịch...");
    }
    return t("Đang dịch... {0}/{1} đoạn", [translationProgress.done ?? 0, translationProgress.total_items ?? '?']);
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/35" onClick={() => !isTranslating && setIsTranslatePanelOpen(false)}>
      <section className="reader-panel reader-settings-sheet w-full max-w-2xl overflow-y-auto border-t border-ink-200" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-ink-100 bg-white px-4">
          <h3 className="font-serif text-base font-bold text-ink-900">{t("Dịch chương này")}</h3>
          <button
            onClick={() => !isTranslating && setIsTranslatePanelOpen(false)}
            disabled={isTranslating}
            className="flex h-9 w-9 items-center justify-center text-ink-600 disabled:opacity-30"
            aria-label={t("Đóng")}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-3 p-4 pb-5">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink-100/70 p-1">
            {([['basic', t("Cơ bản"), t("Trên máy")], ['advanced', t("Nâng cao"), 'Gemini']] as const).map(([tier, label, hint]) => (
              <button
                key={tier}
                type="button"
                disabled={isTranslating}
                onClick={() => selectTier(tier)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${translationTier === tier ? 'bg-white text-ink-950 shadow-xs' : 'text-ink-500 hover:text-ink-800'}`}
              >
                {tier === 'advanced' && <Languages className="h-3 w-3 text-amber-600" />}
                {t(label)}
                <span className="font-normal text-ink-400">· {hint}</span>
              </button>
            ))}
          </div>

          {translationTier && visibleModels.length === 0 && (
            <p className="text-[11px] text-ink-400">{t("Tài khoản này chưa có model dịch cơ bản.")}</p>
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
                  {geminiTestState === 'testing' ? t("Đang thử...") : t("Kiểm tra")}
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
                    <option value="gemini-3.1-flash-lite">{t("3.1 Flash-Lite · tiết kiệm")}</option>
                  </select>
                </label>
                <label className="space-y-1 text-[10px] font-medium text-ink-500">
                  <span>{t("Thể loại")}</span>
                  <select
                    value={geminiSettings.storyMode}
                    onChange={(event) => updateGeminiSettings({ ...geminiSettings, storyMode: event.target.value as GeminiStoryMode })}
                    className="w-full rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-800"
                  >
                    <option value="auto">{t("Tự nhận diện")}</option>
                    <option value="modern">{t("Hiện đại")}</option>
                    <option value="modern-abo">{t("Hiện đại ABO")}</option>
                    <option value="ancient">{t("Cổ đại")}</option>
                    <option value="ancient-abo">{t("Cổ đại ABO")}</option>
                  </select>
                </label>
              </div>
              <p className={`text-[10px] ${geminiTestState === 'ok' ? 'text-emerald-700' : geminiTestState === 'error' ? 'text-rose-700' : 'text-ink-400'}`}>
                {geminiTestMessage || t("Key chỉ lưu trên máy này.")}
              </p>
              {currentBook && (
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="flex w-full items-center gap-3 rounded-xl border border-lily-200 bg-lily-50/60 px-3 py-2.5 text-left hover:border-lily-400"
                >
                  <Users className="h-5 w-5 shrink-0 text-lily-700" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink-900">{t("Bảng xưng hô")}</span>
                    <span className="block text-xs text-ink-500">{StoryProfiles.read(currentBook.id).characters.length} {t(" nhân vật · Gemini dịch theo bảng này")}</span>
                  </span>
                  <span className="text-xs font-semibold text-lily-800">{t("Xem, sửa")}</span>
                </button>
              )}
              {isProfileOpen && currentBook && <GeminiProfileSheet bookId={currentBook.id} bookTitle={currentBook.title} onClose={() => setIsProfileOpen(false)} />}
            </div>
          )}

          {translationTier === 'basic' && usesModelLicense(selectedModel) && (needsModelLicense || activation.state === 'ok') && (
            <div className="space-y-2 rounded-xl border border-lily-200 bg-lily-50/50 p-3">
              {!modelAccount ? (
                <p className="text-[11px] text-ink-600">{t("Hãy đăng nhập LilyHub để dùng ")}{selectedModel.label}.</p>
              ) : needsModelLicense && activation.state !== 'busy' || activation.state === 'error' ? (
                <>
                  <p className="text-[11px] text-ink-600">
                    {modelAccount.isOwner
                      ? t("Máy admin này chưa mở khóa. Nhập mã owner (mã mở Cloud) một lần là có đủ model.")
                      : t("Nhập mã model do admin cấp để dùng {0} trên máy này. Mã chỉ dùng được một lần, cho một máy.", [selectedModel.label])}
                  </p>
                  <div className="flex gap-2">
                    <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-ink-200 bg-white px-2.5">
                      <KeyRound className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                      <input
                        type={modelAccount.isOwner ? 'password' : 'text'}
                        value={modelCode}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={modelAccount.isOwner ? t("Mã owner") : 'LILY-XXXX-XXXX-XXXX'}
                        aria-label={modelAccount.isOwner ? t("Mã owner") : t("Mã model")}
                        onChange={(event) => setModelCode(event.target.value)}
                        onKeyDown={(event) => { if (event.key === 'Enter') void submitModelCode(); }}
                        className="min-w-0 flex-1 bg-transparent py-2 text-xs uppercase text-ink-900 outline-none placeholder:normal-case"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!modelCode.trim()}
                      onClick={() => void submitModelCode()}
                      className="shrink-0 rounded-lg bg-lily-700 px-3 text-[11px] font-semibold text-white disabled:opacity-50"
                    >
                      {t("Kích hoạt")}</button>
                  </div>
                </>
              ) : null}
              {activation.message && (
                <p className={`flex items-center gap-1.5 text-[11px] ${activation.state === 'ok' ? 'text-emerald-700' : activation.state === 'error' ? 'text-rose-700' : 'text-ink-500'}`}>
                  {activation.state === 'busy' && <Loader2 className="h-3 w-3 animate-spin" />}
                  {activation.message}
                </p>
              )}
            </div>
          )}

          {isTranslating && (
            <div className="flex items-center gap-2 rounded-xl border border-lily-200 bg-lily-50/80 px-3 py-2 text-xs text-lily-800">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              <span>{progressLabel || t("Đang xử lý...")}</span>
            </div>
          )}
          {translationError && !isTranslating && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{translationError}</p>
          )}

          {translationTier && (translatedParagraphs && !isTranslating ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setTextLanguageMode('translated'); setIsTranslatePanelOpen(false); }}
                className="rounded-xl bg-lily-700 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-lily-800"
              >
                {t("Xem bản dịch")}</button>
              <button
                type="button"
                disabled={!canTranslate}
                onClick={startTranslate}
                className="rounded-xl border border-lily-300 py-2.5 text-sm font-semibold text-lily-800 transition hover:bg-lily-50 disabled:opacity-50"
              >
                {t("Dịch lại")}</button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isTranslating || !canTranslate}
              onClick={startTranslate}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-lily-700 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-lily-800 disabled:opacity-60"
            >
              {isTranslating ? <><Loader2 className="h-4 w-4 animate-spin" /> {t(" Đang dịch...")}</> : t("Dịch chương này")}
            </button>
          ))}

          {showPrefetch && (
            <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-ink-800">
                  <Zap className="h-3.5 w-3.5 text-lily-600" />
                  {t("Dịch trước, đọc sau")}</h4>
                <span className="text-[10px] text-ink-400">{t("Còn ")}{remainingChapters} {t(" chương")}</span>
              </div>
              {prefetchRunning ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-lily-700" />
                  <span className="min-w-0 flex-1 text-[11px] text-ink-600">
                    {t("Đang dịch ngầm")}{backgroundTranslationQueue.length ? t(" · còn {0} chương chờ", [backgroundTranslationQueue.length]) : t(" chương cuối")}
                  </span>
                  <button type="button" onClick={stopBackgroundTranslation} className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">
                    {t("Dừng")}</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => queueTranslateNextChapters(Math.min(5, remainingChapters))}
                    className="rounded-lg border border-ink-200 bg-white py-2 text-xs font-semibold text-ink-800 transition hover:border-lily-300 hover:bg-lily-50"
                  >
                    {remainingChapters > 5 ? t("5 chương tiếp") : t("{0} chương còn lại", [remainingChapters])}
                  </button>
                  <button
                    type="button"
                    disabled={remainingChapters <= 5}
                    onClick={queueTranslateAllRemaining}
                    className="rounded-lg border border-ink-200 bg-white py-2 text-xs font-semibold text-ink-800 transition hover:border-lily-300 hover:bg-lily-50 disabled:opacity-40"
                  >
                    {t("Cả truyện")}</button>
                </div>
              )}
              <p className="mt-2 text-[10px] text-ink-400">{t("Dịch sẵn ở chế độ nền, bạn cứ đọc tiếp. Chương dịch xong sẽ mở ra là có ngay.")}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
