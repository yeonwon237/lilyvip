import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2, X } from 'lucide-react';
import { useReader } from '../../context/ReaderContext';
import { useApp } from '../../context/AppContext';
import { TranslationQuota, geminiCredits, translationGroup, type TranslationQuotaStatus } from '../../translation-engine/TranslationQuota';
import { AdminTranslateSheet } from './AdminTranslateSheet';
import { GeminiProfileSheet } from './GeminiProfileSheet';
import { StoryProfiles } from '../../translation-engine/GeminiStoryProfile';
import { GeminiLocalSettings, type GeminiStoryMode } from '../../translation-engine/GeminiTranslationService';

type ModelGroup = 'free' | 'lily' | 'vip';
const freeModels = [
  { id: 'qt-dictionary', label: 'Lily QT', hint: 'Dịch theo từ điển VietPhrase' },
  { id: 'google-quick-2', label: 'Dịch máy', hint: 'Dịch nhanh, giữ tên riêng' },
];
const lilyModels = [
  { id: 'lily-cophong-v1', label: 'Lily Cổ Phong', hint: 'Truyện cổ đại và ABO cổ đại' },
  { id: 'lily-dothi-v1', label: 'Lily Đô Thị', hint: 'Truyện hiện đại, đô thị và ABO' },
];
const resetLabel = (timestamp: number) => new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
}).format(timestamp);

const PublicTranslateSheet: React.FC = () => {
  const { user, currentBook } = useApp();
  const { isTranslatePanelOpen, setIsTranslatePanelOpen, selectedTranslationModelId, setSelectedTranslationModelId, isTranslating, translationProgress, translationError, translateCurrentChapter, translatedParagraphs } = useReader();
  const isVip = user?.tier === 'vip1' || user?.tier === 'vip2';
  const canUseGemini = Boolean(user?.features?.ai_translation);
  const [group, setGroup] = useState<ModelGroup>(() => selectedTranslationModelId === 'gemini-user-api-v1' ? 'vip' : translationGroup(selectedTranslationModelId));
  const [geminiSettings, setGeminiSettings] = useState(() => GeminiLocalSettings.getSettings());
  const [quota, setQuota] = useState<TranslationQuotaStatus | null>(null);
  const [quotaError, setQuotaError] = useState('');
  const [geminiBalance, setGeminiBalance] = useState<number | null>(null);
  const [geminiBalanceError, setGeminiBalanceError] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  useEffect(() => {
    if (!isTranslatePanelOpen || group === 'vip' || (group === 'lily' && !isVip)) return;
    let active = true;
    const refresh = () => TranslationQuota.status(user, group).then(value => {
      if (active) { setQuota(value); setQuotaError(''); }
    }).catch(error => { if (active) { setQuota(null); setQuotaError(error?.message || 'Chưa kiểm tra được lượt dịch.'); } });
    setQuota(null);
    refresh();
    window.addEventListener('lily-translation-quota-change', refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { active = false; window.removeEventListener('lily-translation-quota-change', refresh); window.clearInterval(timer); };
  }, [isTranslatePanelOpen, group, isVip, user?.id, user?.lilyHubConnected]);
  useEffect(() => {
    if (!isTranslatePanelOpen || group !== 'vip' || !canUseGemini) return;
    let active = true;
    const refresh = () => geminiCredits().then(value => { if (active) { setGeminiBalance(value.balance); setGeminiBalanceError(''); } }).catch(error => { if (active) setGeminiBalanceError(error?.message || 'Chưa kiểm tra được lượt Gemini.'); });
    refresh();
    window.addEventListener('lily-gemini-credits-change', refresh);
    return () => { active = false; window.removeEventListener('lily-gemini-credits-change', refresh); };
  }, [isTranslatePanelOpen, group, canUseGemini, user?.id]);
  if (!isTranslatePanelOpen) return null;
  const selectGroup = (next: ModelGroup) => {
    setGroup(next);
    setQuota(null);
    setQuotaError('');
    if (next === 'free' && translationGroup(selectedTranslationModelId) !== 'free') setSelectedTranslationModelId('qt-dictionary');
    if (next === 'lily' && isVip && translationGroup(selectedTranslationModelId) !== 'lily') setSelectedTranslationModelId('lily-cophong-v1');
    if (next === 'vip' && canUseGemini) setSelectedTranslationModelId('gemini-user-api-v1');
  };
  const models = group === 'free' ? freeModels : lilyModels;
  const progress = translationProgress?.stage === 'loading-model' ? 'Đang chuẩn bị bản dịch...' : translationProgress ? `Đang dịch ${translationProgress.done ?? 0}/${translationProgress.total_items ?? '?'} đoạn...` : 'Đang dịch chương...';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/35" onClick={() => (!isTranslating || group === 'vip') && setIsTranslatePanelOpen(false)}>
      <section className="reader-panel reader-settings-sheet w-full max-w-2xl overflow-y-auto border-t border-ink-200" onClick={event => event.stopPropagation()}>
        <header className="flex h-12 items-center justify-between border-b border-ink-100 bg-white px-4">
          <h3 className="font-serif text-sm font-bold text-ink-900">Dịch chương này</h3>
          <button onClick={() => setIsTranslatePanelOpen(false)} disabled={isTranslating && group !== 'vip'} className="flex h-9 w-9 items-center justify-center text-ink-600 disabled:opacity-30" aria-label="Đóng"><X className="h-5 w-5" /></button>
        </header>
        <div className="space-y-3 p-4 pb-5">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink-100/70 p-1">
            {([['free', 'Model Free'], ['lily', 'Model Lily'], ['vip', 'Model VIP']] as const).map(([value, label]) => (
              <button key={value} type="button" disabled={isTranslating} onClick={() => selectGroup(value)} className={`rounded-lg px-1 py-2 text-[11px] font-semibold transition ${group === value ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-500'}`}>{label}</button>
            ))}
          </div>
          {group === 'vip' && !canUseGemini ? (
            <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
              <h4 className="text-sm font-semibold text-ink-800">Gemini</h4>
              <p className="mt-1 text-xs text-ink-500">Tài khoản này chưa được cấp quyền dịch Gemini.</p>
            </div>
          ) : group === 'vip' ? (
            <div className="space-y-3 rounded-xl border border-ink-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-ink-800">Gemini</h4>
              <p className="text-xs font-medium text-ink-700">{geminiBalanceError || (geminiBalance === null ? 'Đang kiểm tra lượt Gemini...' : `Còn ${geminiBalance} lượt Gemini`)}</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-ink-600">Model<select value={geminiSettings.model} onChange={event => { const next = { ...geminiSettings, model: event.target.value }; setGeminiSettings(next); GeminiLocalSettings.setSettings(next); }} className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-2 py-2"><option value="gemini-3.5-flash-lite">3.5 Flash-Lite</option><option value="gemini-3.1-flash-lite">3.1 Flash-Lite</option></select></label>
                <label className="text-xs text-ink-600">Thể loại<select value={geminiSettings.storyMode} onChange={event => { const next = { ...geminiSettings, storyMode: event.target.value as GeminiStoryMode }; setGeminiSettings(next); GeminiLocalSettings.setSettings(next); }} className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-2 py-2"><option value="auto">Tự nhận diện</option><option value="modern">Hiện đại</option><option value="modern-abo">Hiện đại ABO</option><option value="ancient">Cổ đại</option><option value="ancient-abo">Cổ đại ABO</option></select></label>
              </div>
              {currentBook && <button type="button" onClick={() => setIsProfileOpen(true)} className="w-full rounded-xl border border-ink-200 bg-ink-50 px-3 py-3 text-left text-sm font-semibold text-ink-800">Bảng xưng hô · {StoryProfiles.read(currentBook.id).characters.length} nhân vật · Xem, sửa</button>}
              {isProfileOpen && currentBook && <GeminiProfileSheet bookId={currentBook.id} bookTitle={currentBook.title} onClose={() => setIsProfileOpen(false)} />}
              {translationError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{translationError}</p>}
              {isTranslating && <p className="flex items-center gap-2 text-sm text-ink-600"><Loader2 className="h-4 w-4 animate-spin" />{progress}</p>}
              <button type="button" disabled={isTranslating || geminiBalance === null || geminiBalance <= 0 || Boolean(geminiBalanceError)} onClick={() => { void translateCurrentChapter('gemini-user-api-v1', Boolean(translatedParagraphs)); setIsTranslatePanelOpen(false); }} className="w-full rounded-xl bg-ink-900 py-3 text-sm font-semibold text-white disabled:opacity-40">{translatedParagraphs ? 'Dịch lại chương bằng Gemini' : 'Dịch chương bằng Gemini'}</button>
            </div>
          ) : group === 'lily' && !isVip ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">Chức năng này chỉ mở khoá cho MY50 VÀ MY100.</div>
          ) : (
            <>
              <div className={`grid gap-2 ${group === 'free' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {models.map(model => <button key={model.id} type="button" disabled={isTranslating} onClick={() => setSelectedTranslationModelId(model.id)} className={`rounded-xl border px-3 py-2.5 text-left transition ${selectedTranslationModelId === model.id ? 'border-amber-500 bg-amber-50 text-ink-950' : 'border-ink-200 bg-white text-ink-700'}`}>
                  <span className="flex items-center justify-between text-sm font-semibold">{model.label}{selectedTranslationModelId === model.id && <Check className="h-4 w-4 text-amber-600" />}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-ink-500">{model.hint}</span>
                </button>)}
              </div>
              <div className="rounded-xl bg-ink-50 px-3 py-2.5 text-xs leading-4 text-ink-700">
                {quota ? <><strong>Còn {Math.max(0, quota.limit - quota.used)}/{quota.limit} lượt hôm nay</strong>{group === 'lily' && <span className="mt-0.5 block text-[11px] text-ink-600">Lượt đã mua còn lại: {quota.purchasedRemaining || 0}</span>}<span className="mt-0.5 block text-[11px] text-ink-500">Làm mới lúc {resetLabel(quota.resetsAt)}.</span></> : quotaError || 'Đang kiểm tra lượt dịch...'}
              </div>
              {group === 'free' ? (
                <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-900">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>MY50 có 30 lượt/ngày, MY100 có 80 lượt/ngày. Lily QT và Dịch máy không phải AI nên bản dịch có thể không mượt như AI.</span>
                </div>
              ) : <div className="space-y-2 text-xs text-ink-500"><p>Model Lily: MY50 có 5 lượt/ngày, MY100 có 10 lượt/ngày. Hết lượt ngày sẽ dùng lượt đã mua.</p><a href="https://t.me/LilyReaderVIPBot?start=lily100" target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg border border-ink-200 bg-white px-3 py-2 font-semibold text-ink-800">Mua 100 lượt · 19.000đ trên Telegram</a></div>}
              {translationError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{translationError}</p>}
              {isTranslating && <p className="flex items-center gap-2 text-sm text-ink-600"><Loader2 className="h-4 w-4 animate-spin" />{progress}</p>}
              <button type="button" disabled={isTranslating || !quota || quota.remaining <= 0 || Boolean(quotaError)} onClick={() => translateCurrentChapter(selectedTranslationModelId, Boolean(translatedParagraphs))} className="w-full rounded-xl bg-ink-900 py-3 text-sm font-semibold text-white disabled:opacity-40">
                {translatedParagraphs ? 'Dịch lại chương' : 'Dịch chương'}
              </button>
              {translatedParagraphs && <p className="text-center text-xs text-ink-500">Dịch lại sẽ tính thêm một lượt. Bản đã lưu được mở lại miễn phí.</p>}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export const TranslateSheet: React.FC = () => {
  const { user } = useApp();
  return user?.isOwner ? <AdminTranslateSheet /> : <PublicTranslateSheet />;
};
