// Local, on-device UI flag only — records whether the owner has opened the JJWXC
// WebView and asked Lily to remember that ("Đã kết nối"). It does NOT store any
// JJWXC credential, cookie, or session token: JJWXC's own cookies live entirely
// inside the InAppBrowser plugin's isolated WebView data store, which this class
// never reads. This flag is purely so the Connect screen can show "Đã kết nối
// lúc ..." / "Chưa kết nối" without probing the WebView on every render.

const STORAGE_KEY = 'lily_jjwxc_connect_state_v1';

interface JjwxcConnectState {
  markedConnectedAt: number | null;
}

const readState = (): JjwxcConnectState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { markedConnectedAt: null };
    const parsed = JSON.parse(raw);
    return { markedConnectedAt: typeof parsed?.markedConnectedAt === 'number' ? parsed.markedConnectedAt : null };
  } catch {
    return { markedConnectedAt: null };
  }
};

const writeState = (state: JjwxcConnectState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort only — losing this flag just means the UI re-asks the user to confirm.
  }
};

export class JjwxcSession {
  static getMarkedConnectedAt(): number | null {
    return readState().markedConnectedAt;
  }

  static markConnected(): void {
    writeState({ markedConnectedAt: Date.now() });
  }

  static clear(): void {
    writeState({ markedConnectedAt: null });
  }
}
