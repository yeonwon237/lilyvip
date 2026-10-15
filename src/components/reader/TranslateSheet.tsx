import React, { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { useReader } from '../../context/ReaderContext';
import { useApp } from '../../context/AppContext';
import { TranslationQuota, type TranslationQuotaStatus } from '../../translation-engine/TranslationQuota';
import { AdminTranslateSheet } from './AdminTranslateSheet';

const modes = [
  { id: 'qt-dictionary', label: 'Lily QT', hint: 'Dịch theo từ điển VietPhrase' },
  { id: 'google-quick-2', label: 'Dịch máy', hint: 'Dịch nhanh, giữ tên riêng' },
];

const PublicTranslateSheet: React.FC = () => {
  const { user } = useApp();
  const { isTranslatePanelOpen, setIsTranslatePanelOpen, selectedTranslationModelId, setSelectedTranslationModelId, isTranslating, translationProgress, translationError, translateCurrentChapter, translatedParagraphs } = useReader();
  const [quota, setQuota] = useState<TranslationQuotaStatus | null>(null);
  const [quotaError, setQuotaError] = useState('');
  useEffect(() => {
    if (!isTranslatePanelOpen) return;
    let active = true;
    const refresh = () => {
      TranslationQuota.status(user).then(value => { if (active) { setQuota(value); setQuotaError(''); } }).catch(error => { if (active) setQuotaError(error?.message || 'Chưa kiểm tra được lượt dịch.'); });
    };
    refresh();
    window.addEventListener('lily-translation-quota-change', refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { active = false; window.removeEventListener('lily-translation-quota-change', refresh); window.clearInterval(timer); };
  }, [isTranslatePanelOpen, user?.id, user?.lilyHubConnected]);
  if (!isTranslatePanelOpen) return null;
  const progress = translationProgress?.stage === 'loading-model' ? 'Đang chuẩn bị bản dịch...' : translationProgress ? `Đang dịch ${translationProgress.done ?? 0}/${translationProgress.total_items ?? '?'} đoạn...` : 'Đang dịch chương...';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/35" onClick={() => !isTranslating && setIsTranslatePanelOpen(false)}>
      <section className="reader-panel reader-settings-sheet w-full max-w-2xl overflow-y-auto border-t border-ink-200" onClick={event => event.stopPropagation()}>
        <header className="flex h-12 items-center justify-between border-b border-ink-100 bg-white px-4">
          <h3 className="font-serif text-base font-bold text-ink-900">Dịch chương này</h3>
          <button onClick={() => setIsTranslatePanelOpen(false)} disabled={isTranslating} className="flex h-9 w-9 items-center justify-center text-ink-600 disabled:opacity-30" aria-label="Đóng"><X className="h-5 w-5" /></button>
        </header>
        <div className="space-y-4 p-4 pb-6">
          <div className="grid grid-cols-2 gap-2">
            {modes.map(mode => <button key={mode.id} type="button" disabled={isTranslating} onClick={() => setSelectedTranslationModelId(mode.id)} className={`rounded-xl border px-3 py-3 text-left transition ${selectedTranslationModelId === mode.id ? 'border-amber-500 bg-amber-50 text-ink-950' : 'border-ink-200 bg-white text-ink-700'}`}>
              <span className="flex items-center justify-between text-sm font-semibold">{mode.label}{selectedTranslationModelId === mode.id && <Check className="h-4 w-4 text-amber-600" />}</span>
              <span className="mt-1 block text-xs text-ink-500">{mode.hint}</span>
            </button>)}
          </div>
          <div className="rounded-xl bg-ink-50 px-3 py-3 text-sm text-ink-700">
            {quota ? <><strong>Còn {quota.remaining}/{quota.limit} lượt hôm nay</strong><span className="mt-1 block text-xs text-ink-500">Làm mới lúc {new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(quota.resetsAt)}.</span></> : quotaError || 'Đang kiểm tra lượt dịch...'}
          </div>
          <p className="text-xs text-ink-500">Lily QT và Dịch máy không phải AI nên bản dịch có thể không mượt như bản dịch AI.</p>
          {translationError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{translationError}</p>}
          {isTranslating && <p className="flex items-center gap-2 text-sm text-ink-600"><Loader2 className="h-4 w-4 animate-spin" />{progress}</p>}
          <button type="button" disabled={isTranslating || !quota || quota.remaining <= 0 || Boolean(quotaError)} onClick={() => translateCurrentChapter(selectedTranslationModelId, Boolean(translatedParagraphs))} className="w-full rounded-xl bg-ink-900 py-3 text-sm font-semibold text-white disabled:opacity-40">
            {translatedParagraphs ? 'Dịch lại chương' : 'Dịch chương'}
          </button>
          {translatedParagraphs && <p className="text-center text-xs text-ink-500">Dịch lại sẽ tính thêm một lượt. Bản đã lưu được mở lại miễn phí.</p>}
        </div>
      </section>
    </div>
  );
};

export const TranslateSheet: React.FC = () => {
  const { user } = useApp();
  return user?.isOwner ? <AdminTranslateSheet /> : <PublicTranslateSheet />;
};
