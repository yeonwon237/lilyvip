export type SalesPlanKey = 'my01_12' | 'my02_12';
export interface SalesConfig {
  intro: string;
  paymentNote: string;
  successNote: string;
  plans: Record<SalesPlanKey, { label: string; priceVnd: number }>;
}
const API_BASE = (import.meta.env.VITE_LILYHUB_API_URL || (import.meta.env.DEV ? '/__lilyhub_api' : 'https://api.lilyhub.top')).replace(/\/$/, '');
const PREVIEW_KEY = 'LILY_SALES_ADMIN_LOCAL_PREVIEW_V2';
let localPreviewMode = false;
export const isSalesLocalPreview = () => localPreviewMode;
export const SALES_PLAN_KEYS: SalesPlanKey[] = ['my01_12', 'my02_12'];
const DEFAULT_PREVIEW: SalesConfig = {
  intro: 'Xin chào bạn 🌷\n\nLily là trợ lý đăng ký của Lily Reader. Lily sẽ hướng dẫn bạn chọn gói, xác nhận tài khoản, thanh toán và nhận biên nhận sau khi kích hoạt.\n\nBạn vui lòng chọn gói phù hợp bên dưới:',
  paymentNote: 'Bạn vui lòng nhập đúng nội dung chuyển khoản để Lily kiểm tra nhanh và chính xác.',
  successNote: 'Bạn có thể quay lại Lily Reader. Web sẽ tự cập nhật gói khi được mở lại; nếu chưa thấy thay đổi, hãy vào Tài khoản và bấm “Kiểm tra gói”.',
  plans: {
    my01_12: { label: 'MY01 · 1 năm', priceVnd: 239000 },
    my02_12: { label: 'MY02 · 1 năm', priceVnd: 399000 },
  },
};
function localDraft(): SalesConfig {
  try {
    const value = JSON.parse(localStorage.getItem(PREVIEW_KEY) || 'null') as SalesConfig | null;
    if (value?.plans && SALES_PLAN_KEYS.every(key => value.plans[key]?.label && Number.isSafeInteger(value.plans[key]?.priceVnd))) return value;
  } catch { /* Use the built-in preview when local storage is unavailable. */ }
  return structuredClone(DEFAULT_PREVIEW);
}
async function request(method: 'GET' | 'PUT', config?: SalesConfig): Promise<SalesConfig> {
  if (import.meta.env.DEV && localPreviewMode && method === 'PUT' && config) {
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(config));
    return config;
  }
  try {
    const response = await fetch(`${API_BASE}/api/reader/sales-config`, {
      method, credentials: 'include',
      headers: config ? { 'Content-Type': 'application/json' } : undefined,
      body: config ? JSON.stringify(config) : undefined,
      cache: 'no-store',
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.config || !SALES_PLAN_KEYS.every(key => result.config.plans?.[key]?.label && Number.isSafeInteger(result.config.plans?.[key]?.priceVnd))) {
      if (response.status === 401 || response.status === 403) throw new Error('Tài khoản này không có quyền quản trị gói bán.');
      throw new Error('Chưa kết nối được cấu hình bán gói. Vui lòng thử lại.');
    }
    localPreviewMode = false;
    return result.config as SalesConfig;
  } catch (error) {
    if (import.meta.env.DEV && method === 'GET' && (!(error instanceof Error) || !error.message.includes('không có quyền'))) {
      localPreviewMode = true;
      return localDraft();
    }
    throw error;
  }
}
export const loadSalesConfig = () => request('GET');
export const saveSalesConfig = (config: SalesConfig) => request('PUT', config);
export const formatSalesPrice = (value: number) => `${value.toLocaleString('vi-VN')}đ`;
