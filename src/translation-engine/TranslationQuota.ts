export interface TranslationQuotaStatus {
  group: 'free' | 'lily';
  day: string;
  tier: string;
  limit: number;
  used: number;
  remaining: number;
  purchasedRemaining?: number;
  resetsAt: number;
}
export interface TranslationQuotaSubject { id?: string; lilyHubConnected?: boolean; isOwner?: boolean }
const API_BASE = (import.meta.env.VITE_LILYHUB_API_URL || (import.meta.env.DEV ? '/__lilyhub_api' : 'https://api.lilyhub.top')).replace(/\/$/, '');
const localKey = 'lily_translation_quota_v1';
const day = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const localStatus = (): TranslationQuotaStatus => {
  const today = day();
  let used = 0;
  try { const value = JSON.parse(localStorage.getItem(localKey) || 'null'); if (value?.day === today) used = Math.max(0, Number(value.used) || 0); } catch {}
  return { day: today, group: 'free', tier: 'free', limit: 5, used, remaining: Math.max(0, 5 - used), resetsAt: new Date(`${today}T17:00:00.000Z`).getTime() };
};
const isAccount = (subject?: TranslationQuotaSubject | null) => Boolean(subject?.id && subject.id !== 'guest' && subject.lilyHubConnected);
export const translationGroup = (modelId: string): 'free' | 'lily' => ['lily-cophong-v1', 'lily-dothi-v1'].includes(modelId) ? 'lily' : 'free';
async function remote(method: 'GET' | 'POST', group: 'free' | 'lily', body?: object): Promise<TranslationQuotaStatus> {
  const response = await fetch(`${API_BASE}/api/reader/translation-quota?group=${group}`, { method, credentials: 'include', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify({ ...body, group }) : undefined });
  const result = await response.json().catch(() => null);
  if (response.status === 429 && result?.error === 'QUOTA_EXHAUSTED') throw new Error('Bạn đã dùng hết lượt dịch hôm nay. Lượt mới sẽ có sau 0 giờ.');
  if (response.status === 403 && result?.error === 'VIP_REQUIRED') throw new Error('Chức năng này chỉ mở khoá cho MY01 VÀ MY02.');
  if (!response.ok || typeof result?.remaining !== 'number') throw new Error('Chưa kiểm tra được lượt dịch. Vui lòng thử lại.');
  return result as TranslationQuotaStatus;
}
export async function geminiCredits(): Promise<{ balance: number | null; unlimited: boolean }> {
  const response = await fetch(`${API_BASE}/api/reader/gemini-credits`, { credentials: 'include', cache: 'no-store' });
  if (!response.ok) throw new Error('Chưa kiểm tra được lượt Gemini.');
  return response.json();
}
async function geminiCreditAction(action: 'claim' | 'refund', requestId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/reader/gemini-credits`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, requestId }) });
  const result = await response.json().catch(() => null);
  if (response.status === 429 && result?.error === 'GEMINI_CREDITS_EXHAUSTED') throw new Error('Bạn đã hết lượt Gemini. Vui lòng liên hệ Lily để được cấp thêm.');
  if (response.status === 403) throw new Error('Tài khoản chưa được cấp quyền dịch Gemini.');
  if (!response.ok) throw new Error('Chưa cập nhật được lượt Gemini. Vui lòng thử lại.');
  window.dispatchEvent(new Event('lily-gemini-credits-change'));
}
export const TranslationQuota = {
  async status(subject?: TranslationQuotaSubject | null, group: 'free' | 'lily' = 'free') {
    if (group === 'lily' && !isAccount(subject)) return { ...localStatus(), group, limit: 0, used: 0, remaining: 0, purchasedRemaining: 0 };
    return isAccount(subject) ? remote('GET', group) : localStatus();
  },
  async claim(subject: TranslationQuotaSubject | null | undefined, modelId: string): Promise<string> {
    if (subject?.isOwner) return 'admin-unlimited';
    if (modelId === 'gemini-user-api-v1') {
      if (!isAccount(subject)) throw new Error('Vui lòng đăng nhập LilyHub để dùng Gemini.');
      const id = crypto.randomUUID();
      await geminiCreditAction('claim', id);
      return id;
    }
    if (!['qt-dictionary', 'google-quick-2', 'qt-polish-s1', 'lily-cophong-v1', 'lily-dothi-v1'].includes(modelId)) throw new Error('Chế độ dịch này chưa mở.');
    const group = translationGroup(modelId);
    const id = crypto.randomUUID();
    if (isAccount(subject)) await remote('POST', group, { action: 'claim', requestId: id, modelId });
    else {
      if (group === 'lily') throw new Error('Chức năng này chỉ mở khoá cho MY01 VÀ MY02.');
      const status = localStatus();
      if (!status.remaining) throw new Error('Bạn đã dùng hết 5 lượt dịch miễn phí hôm nay.');
      localStorage.setItem(localKey, JSON.stringify({ day: status.day, used: status.used + 1 }));
    }
    window.dispatchEvent(new Event('lily-translation-quota-change'));
    return id;
  },
  async refund(subject: TranslationQuotaSubject | null | undefined, requestId: string, modelId: string) {
    if (subject?.isOwner) return;
    if (modelId === 'gemini-user-api-v1') { await geminiCreditAction('refund', requestId); return; }
    if (isAccount(subject)) await remote('POST', translationGroup(modelId), { action: 'refund', requestId });
    else { const status = localStatus(); localStorage.setItem(localKey, JSON.stringify({ day: status.day, used: Math.max(0, status.used - 1) })); }
    window.dispatchEvent(new Event('lily-translation-quota-change'));
  },
};
