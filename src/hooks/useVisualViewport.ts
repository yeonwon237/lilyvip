import { useEffect } from 'react';

/** Follow the visible viewport when mobile browser chrome or the keyboard changes. */
export function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;
    let settled = 0;
    let fullHeight = window.innerHeight;
    const isEditing = () => {
      const active = document.activeElement;
      return active instanceof HTMLElement && active.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),textarea,[contenteditable="true"]');
    };
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = document.documentElement;
        const height = viewport?.height ?? window.innerHeight;
        const top = Math.max(0, viewport?.offsetTop ?? 0);
        // Do not resize the reader during pinch zoom.
        if (viewport && Math.abs(viewport.scale - 1) > 0.01) return;
        if (!isEditing()) fullHeight = window.innerHeight;
        const keyboardOpen = isEditing() && Math.max(fullHeight, window.innerHeight) - height > 120;
        root.toggleAttribute('data-keyboard-open', keyboardOpen);
        root.style.setProperty('--visible-height' , `${height}px`);
        root.style.setProperty('--visible-top', `${top}px`);
        root.style.setProperty('--visible-bottom', `${Math.max(0, window.innerHeight - height - top)}px`);
        // Move only the app scroller, never the document (Safari may pan it too).
        if (keyboardOpen) {
          const input = document.activeElement as HTMLElement;
          const scroller = input.closest('.luxury-content, .bookshop-public, .reader-panel');
          if (scroller) {
            const field = input.getBoundingClientRect();
            const bounds = scroller.getBoundingClientRect();
            const bottom = Math.min(bounds.bottom, top + height) - 16;
            const upper = Math.max(bounds.top, top) + 16;
            if (field.bottom > bottom) scroller.scrollTop += field.bottom - bottom;
            else if (field.top < upper) scroller.scrollTop -= upper - field.top;
          }
        }
      });
    };
    const focusChanged = () => {
      update();
      window.clearTimeout(settled);
      settled = window.setTimeout(update, 350);
    };
    update();
    document.addEventListener('focusin', focusChanged);
    document.addEventListener('focusout', focusChanged);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settled);
      document.removeEventListener('focusin', focusChanged);
      document.removeEventListener('focusout', focusChanged);
      document.documentElement.removeAttribute('data-keyboard-open');
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      ['--visible-height','--visible-top','--visible-bottom'].forEach(key => document.documentElement.style.removeProperty(key));
    };
  }, []);
}
