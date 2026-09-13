import { LocalLibraryBackup } from '../storage/LocalLibraryBackup';
import { GoogleDriveBackupClient } from './GoogleDriveBackupClient';

const MIN_INTERVAL_MS = 60 * 60 * 1000;
const DEBOUNCE_MS = 3 * 60 * 1000;

let debounceTimer: number | null = null;
let running = false;

async function runBackup(): Promise<void> {
  if (running) return;
  const state = GoogleDriveBackupClient.getState();
  if (!state.connected || !state.autoEnabled) return;
  const lastAttempt = state.lastBackupAttemptAt ? Date.parse(state.lastBackupAttemptAt) : 0;
  if (Date.now() - lastAttempt < MIN_INTERVAL_MS) return;
  running = true;
  GoogleDriveBackupClient.markAttempt();
  try {
    const backup = await LocalLibraryBackup.create();
    const blob = await LocalLibraryBackup.serializeCompressed(backup);
    await GoogleDriveBackupClient.backupNow(blob, { interactive: false });
  } catch { /* state.lastError already recorded by backupNow; silently retry next trigger */ }
  finally {
    running = false;
  }
}

export const DriveAutoBackupScheduler = {
  /** Call after any local library mutation (add/delete/restore/sync). Debounces so a burst
   * of changes (e.g. a bulk import) results in one backup, and is a no-op unless the user
   * has connected Drive and turned auto-backup on. */
  notifyLibraryChanged(): void {
    const state = GoogleDriveBackupClient.getState();
    if (!state.connected || !state.autoEnabled) return;
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => { void runBackup(); }, DEBOUNCE_MS) as unknown as number;
  },
};
