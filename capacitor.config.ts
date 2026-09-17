import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the existing web build (dist/) to give the JJWXC Connect
 * screen a real native WebView it controls. This does not change how the
 * app is served as a PWA — webDir just points at the same `dist/` the
 * `vite build` step already produces.
 */
const config: CapacitorConfig = {
  appId: 'top.lilyhub.reader',
  appName: 'Lily Reader',
  webDir: 'dist',
};

export default config;
