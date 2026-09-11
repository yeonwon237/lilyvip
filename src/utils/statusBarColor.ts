/** Colors the app-wide light/dark toggle uses for the status bar / notch area. */
export const APP_THEME_STATUS_BAR_COLOR: Record<'light' | 'dark', string> = {
  light: '#FAF8F5',
  dark: '#17151a',
};

/**
 * The status bar / notch area is painted by the browser itself from
 * <meta name="theme-color">, not by any element the app renders. Both the
 * app-wide theme toggle and the reader (which has its own, independent
 * reading themes) write to this same tag, so route every write through
 * here instead of scattering the selector/hex literals across files.
 */
export const setStatusBarColor = (hex: string): void => {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', hex);
};
