const BUILD_ENV = (import.meta as { env?: Record<string, string | undefined> }).env || {};
const CLIENT_ID = BUILD_ENV.VITE_GOOGLE_DRIVE_CLIENT_ID || '';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const APP_FOLDER_NAME = 'Lily Reader - Sao luu';
const BACKUP_FILE_NAME = 'lily-reader-backup.lilybackup';
const TOKEN_STORAGE_KEY = 'LILY_DRIVE_TOKEN_V1';
const STATE_STORAGE_KEY = 'LILY_DRIVE_BACKUP_STATE_V1';

interface DriveTokenState {
  accessToken: string;
  expiresAt: number;
}

export interface DriveBackupState {
  connected: boolean;
  autoEnabled: boolean;
  lastBackupAt: string | null;
  lastBackupAttemptAt?: string | null;
  lastError?: string | null;
  email?: string;
  folderId?: string;
  fileId?: string;
}

const DEFAULT_STATE: DriveBackupState = {
  connected: false,
  autoEnabled: false,
  lastBackupAt: null,
  lastBackupAttemptAt: null,
  lastError: null,
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; expires_in?: number; error?: string }) => void;
            error_callback?: (error: { type?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
          revoke: (token: string, callback: () => void) => void;
        };
      };
    };
  }
}

let gisLoadPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('DRIVE_UNAVAILABLE'));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;
  gisLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => { gisLoadPromise = null; reject(new Error('DRIVE_SCRIPT_LOAD_FAILED')); };
    document.head.appendChild(script);
  });
  return gisLoadPromise;
}

function readState(): DriveBackupState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) || 'null');
    if (parsed && typeof parsed === 'object') return { ...DEFAULT_STATE, ...parsed };
  } catch { /* fall through to default */ }
  return { ...DEFAULT_STATE };
}

function writeState(patch: Partial<DriveBackupState>): DriveBackupState {
  const next = { ...readState(), ...patch };
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(next));
  return next;
}

function readToken(): DriveTokenState | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(TOKEN_STORAGE_KEY) || 'null');
    if (parsed && typeof parsed.accessToken === 'string' && typeof parsed.expiresAt === 'number') return parsed;
  } catch { /* ignore corrupt token cache */ }
  return null;
}

function writeToken(token: DriveTokenState | null): void {
  if (token) sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
  else sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function driveFetch(path: string, init: RequestInit, accessToken: string): Promise<Response> {
  return fetch(`https://www.googleapis.com${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${accessToken}` },
  });
}

export class GoogleDriveBackupClient {
  static isConfigured(): boolean {
    return Boolean(CLIENT_ID);
  }

  static getState(): DriveBackupState {
    return readState();
  }

  static setAutoEnabled(enabled: boolean): void {
    writeState({ autoEnabled: enabled });
  }

  static markAttempt(): void {
    writeState({ lastBackupAttemptAt: new Date().toISOString() });
  }

  /** Requests Drive access. `interactive` must only be true from a direct user click — a
   * silent (non-interactive) request is used for background auto-backups so we never try
   * to pop a consent window without a user gesture, which browsers block anyway. */
  private static async getAccessToken(interactive: boolean): Promise<string> {
    const cached = readToken();
    if (cached && cached.expiresAt > Date.now()) return cached.accessToken;
    if (!CLIENT_ID) throw new Error('DRIVE_NOT_CONFIGURED');
    await loadGis();
    return new Promise<string>((resolve, reject) => {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (response) => {
          if (response.error || !response.access_token) { reject(new Error('DRIVE_REAUTH_REQUIRED')); return; }
          const expiresAt = Date.now() + (Number(response.expires_in || 3600) - 60) * 1000;
          writeToken({ accessToken: response.access_token, expiresAt });
          resolve(response.access_token);
        },
        error_callback: () => reject(new Error(interactive ? 'DRIVE_AUTH_CANCELLED' : 'DRIVE_REAUTH_REQUIRED')),
      });
      client.requestAccessToken({ prompt: interactive ? 'consent' : '' });
    });
  }

  static async connect(): Promise<string> {
    const accessToken = await this.getAccessToken(true);
    let email = '';
    try {
      const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (info.ok) email = (await info.json())?.email || '';
    } catch { /* email is a nice-to-have, connection still succeeds without it */ }
    writeState({ connected: true, email: email || undefined, lastError: null });
    return email;
  }

  static async disconnect(): Promise<void> {
    const token = readToken();
    writeToken(null);
    writeState({ ...DEFAULT_STATE });
    if (token?.accessToken && window.google?.accounts?.oauth2) {
      try { window.google.accounts.oauth2.revoke(token.accessToken, () => {}); } catch { /* best effort */ }
    }
  }

  private static async ensureFolder(accessToken: string): Promise<string> {
    const state = readState();
    if (state.folderId) {
      const check = await driveFetch(`/drive/v3/files/${state.folderId}?fields=id,trashed`, {}, accessToken);
      if (check.ok) {
        const data = await check.json();
        if (!data.trashed) return state.folderId;
      }
    }
    const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false and 'root' in parents`);
    const listResponse = await driveFetch(`/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`, {}, accessToken);
    if (listResponse.ok) {
      const listData = await listResponse.json();
      const found = listData.files?.[0]?.id;
      if (found) { writeState({ folderId: found }); return found; }
    }
    const createResponse = await driveFetch('/drive/v3/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: APP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
    }, accessToken);
    if (!createResponse.ok) throw new Error('DRIVE_FOLDER_FAILED');
    const created = await createResponse.json();
    writeState({ folderId: created.id });
    return created.id;
  }

  private static async findBackupFile(accessToken: string, folderId: string): Promise<string | null> {
    const state = readState();
    if (state.fileId) {
      const check = await driveFetch(`/drive/v3/files/${state.fileId}?fields=id,trashed`, {}, accessToken);
      if (check.ok) {
        const data = await check.json();
        if (!data.trashed) return state.fileId;
      }
    }
    const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed=false`);
    const response = await driveFetch(`/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`, {}, accessToken);
    if (!response.ok) return null;
    const data = await response.json();
    const found = data.files?.[0]?.id || null;
    if (found) writeState({ fileId: found });
    return found;
  }

  /** Uploads (creating or overwriting) the single app-managed backup file. `interactive`
   * controls whether a blocked/expired token may prompt the user — true only for clicks. */
  static async backupNow(blob: Blob, options: { interactive?: boolean } = {}): Promise<{ fileId: string }> {
    try {
      const accessToken = await this.getAccessToken(Boolean(options.interactive));
      const folderId = await this.ensureFolder(accessToken);
      const existingFileId = await this.findBackupFile(accessToken, folderId);
      let fileId = existingFileId;
      if (existingFileId) {
        const response = await driveFetch(`/upload/drive/v3/files/${existingFileId}?uploadType=media`, {
          method: 'PATCH',
          headers: { 'Content-Type': blob.type || 'application/gzip' },
          body: blob,
        }, accessToken);
        if (!response.ok) throw new Error('DRIVE_UPLOAD_FAILED');
      } else {
        const boundary = `lily-${Date.now()}`;
        const metadata = JSON.stringify({ name: BACKUP_FILE_NAME, parents: [folderId] });
        const body = new Blob([
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
          `--${boundary}\r\nContent-Type: ${blob.type || 'application/gzip'}\r\n\r\n`,
          blob,
          `\r\n--${boundary}--`,
        ]);
        const response = await driveFetch('/upload/drive/v3/files?uploadType=multipart&fields=id', {
          method: 'POST',
          headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
          body,
        }, accessToken);
        if (!response.ok) throw new Error('DRIVE_UPLOAD_FAILED');
        fileId = (await response.json()).id;
        writeState({ fileId: fileId ?? undefined });
      }
      writeState({ lastBackupAt: new Date().toISOString(), lastError: null });
      return { fileId: fileId! };
    } catch (error) {
      writeState({ lastError: error instanceof Error ? error.message : 'DRIVE_BACKUP_FAILED' });
      throw error;
    }
  }

  static async restoreLatest(options: { interactive?: boolean } = { interactive: true }): Promise<Blob> {
    const accessToken = await this.getAccessToken(options.interactive !== false);
    const folderId = await this.ensureFolder(accessToken);
    const fileId = await this.findBackupFile(accessToken, folderId);
    if (!fileId) throw new Error('DRIVE_BACKUP_NOT_FOUND');
    const response = await driveFetch(`/drive/v3/files/${fileId}?alt=media`, {}, accessToken);
    if (!response.ok) throw new Error('DRIVE_DOWNLOAD_FAILED');
    return response.blob();
  }
}
