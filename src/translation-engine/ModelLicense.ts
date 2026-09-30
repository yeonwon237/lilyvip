// Access to Lily's private translation models (see cloudflare/lily-models-worker).
// A one-time model code, entered once, is bound to this device + LilyHub account and becomes
// a license kept in localStorage. The owner's devices get a license from the owner cloud
// session instead of a code.
import { OwnerLibraryClient } from '../book-engine/owner-library/OwnerLibraryClient';

const BUILD_ENV = import.meta.env || {};
export const MODELS_API = (BUILD_ENV.VITE_LILY_MODELS_URL || 'https://lily-models.nguyenyen15011998.workers.dev').replace(/\/$/, '');
export const MODEL_FILES_HOST = `${MODELS_API}/m/`;
const DEVICE_KEY = 'LILY_MODEL_DEVICE_ID_V1';
const LICENSES_KEY = 'LILY_MODEL_LICENSES_V1';
const OWNER_SESSION_KEY = 'LILY_OWNER_CLOUD_SESSION_V1';

export interface ModelAccount { id: string; name?: string; isOwner?: boolean }
/** Sent to the translation worker with every private-model request. */
export interface ModelAuth { license: string; device: string; account: string }

interface StoredLicense { license: string; account: string; model: string }

const readLicenses = (): StoredLicense[] => {
  try { const parsed = JSON.parse(localStorage.getItem(LICENSES_KEY) || '[]'); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
};
const writeLicenses = (licenses: StoredLicense[]) => {
  try { localStorage.setItem(LICENSES_KEY, JSON.stringify(licenses)); } catch {}
};

function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      id = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

const deviceLabel = () => {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Thiết bị khác';
  const browser = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Trình duyệt';
  return `${os} · ${browser}`;
};

const ERRORS: Record<string, string> = {
  INVALID_CODE: 'Mã model không đúng hoặc đã bị thu hồi.',
  CODE_ALREADY_USED: 'Mã này đã được dùng trên máy hoặc tài khoản khác.',
  BAD_DEVICE: 'Trình duyệt này không lưu được dữ liệu (chế độ ẩn danh?). Hãy mở bằng trình duyệt thường.',
  UNAUTHORIZED: 'Mã owner không đúng hoặc phiên đã hết hạn.',
};
async function failure(response: Response): Promise<Error> {
  const payload = await response.json().catch(() => null);
  return new Error(ERRORS[payload?.error] || 'Chưa kích hoạt được model. Vui lòng thử lại.');
}

export const MODEL_LICENSE_REQUIRED = 'Máy này chưa kích hoạt model. Hãy nhập mã model ở mục dịch.';

export class ModelLicense {
  /** Signed-in LilyHub account as last confirmed by the server (AppContext keeps this cache). */
  static currentAccount(): ModelAccount | null {
    try {
      const saved = JSON.parse(localStorage.getItem('LILY_LAST_KNOWN_LILYHUB_SESSION_V1') || 'null');
      return saved?.id ? { id: saved.id, name: saved.name, isOwner: saved.isOwner === true } : null;
    } catch {
      return null;
    }
  }

  /** Auth for a translation run; the owner's device activates itself from the cloud session. */
  static async ensureAuth(model: string): Promise<ModelAuth> {
    const account = this.currentAccount();
    let auth = this.authFor(model, account);
    if (!auth && account?.isOwner && this.hasOwnerSession()) {
      await this.activateOwnerDevice(account);
      auth = this.authFor(model, account);
    }
    if (!auth) throw new Error(MODEL_LICENSE_REQUIRED);
    return auth;
  }

  /** License usable for this model on this device by this account, if any. */
  static authFor(model: string, account?: ModelAccount | null): ModelAuth | null {
    if (!account?.id) return null;
    const device = deviceId();
    if (!device) return null;
    const found = readLicenses().find(item => item.account === account.id && (item.model === model || item.model === '*'));
    return found ? { license: found.license, device, account: account.id } : null;
  }

  private static store(license: string, account: string, model: string) {
    writeLicenses([...readLicenses().filter(item => !(item.account === account && item.model === model)), { license, account, model }]);
  }

  /** Redeems a one-time model code for this device + account. */
  static async activate(code: string, account: ModelAccount): Promise<string> {
    const device = deviceId();
    const response = await fetch(`${MODELS_API}/v1/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, device, account: account.id, accountName: account.name || '', deviceLabel: deviceLabel() }),
    });
    if (!response.ok) throw await failure(response);
    const payload = await response.json();
    this.store(payload.license, account.id, payload.model);
    return payload.model;
  }

  static hasOwnerSession(): boolean {
    try { return Boolean(sessionStorage.getItem(OWNER_SESSION_KEY)); } catch { return false; }
  }

  /** Owner device: one call with the owner cloud session grants every model, permanently. */
  static async activateOwnerDevice(account: ModelAccount): Promise<void> {
    const token = sessionStorage.getItem(OWNER_SESSION_KEY);
    if (!token) throw new Error(ERRORS.UNAUTHORIZED);
    const response = await fetch(`${MODELS_API}/v1/admin/licenses/self`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ device: deviceId(), account: account.id, accountName: account.name || '', deviceLabel: deviceLabel() }),
    });
    if (!response.ok) throw await failure(response);
    this.store((await response.json()).license, account.id, '*');
  }

  /** Owner who has not opened the cloud on this device: unlock with the owner key once. */
  static async unlockOwnerDevice(ownerKey: string, account: ModelAccount): Promise<void> {
    try { await OwnerLibraryClient.login(ownerKey); }
    catch { throw new Error('Mã owner không đúng.'); }
    await this.activateOwnerDevice(account);
  }
}

// ---- Owner admin: model codes -------------------------------------------------------------

export interface ModelCode {
  id: string;
  model: string;
  modelLabel: string;
  note?: string;
  status: 'active' | 'used' | 'revoked';
  createdAt: string;
  activatedAt?: string;
  accountName?: string;
  deviceLabel?: string;
}

const ownerHeaders = (extra: Record<string, string> = {}) => {
  const token = sessionStorage.getItem(OWNER_SESSION_KEY) || '';
  return { ...extra, Authorization: `Bearer ${token}` };
};

export class ModelCodeAdmin {
  static async list(): Promise<{ codes: ModelCode[]; models: Record<string, string> }> {
    const response = await fetch(`${MODELS_API}/v1/admin/codes`, { headers: ownerHeaders() });
    if (!response.ok) throw await failure(response);
    return response.json();
  }

  static async create(model: string, note: string): Promise<{ code: string; modelLabel: string }> {
    const response = await fetch(`${MODELS_API}/v1/admin/codes`, {
      method: 'POST', headers: ownerHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ model, note }),
    });
    if (!response.ok) throw await failure(response);
    return response.json();
  }

  static async revoke(id: string): Promise<void> {
    const response = await fetch(`${MODELS_API}/v1/admin/codes/${id}`, { method: 'DELETE', headers: ownerHeaders() });
    if (!response.ok) throw await failure(response);
  }
}
