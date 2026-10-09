import { t } from '../../i18n';
import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';

interface InfoTipProps {
  children: React.ReactNode;
  label?: string;
  align?: 'left' | 'right';
  width?: 'normal' | 'wide';
}

export const InfoTip: React.FC<InfoTipProps> = ({ children, label = t("Xem giải thích"), align = 'left', width = 'normal' }) => {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const position = () => {
      if (!trigger.current || !panel.current) return;
      const box = trigger.current.getBoundingClientRect();
      const tip = panel.current;
      const viewport = window.visualViewport;
      const vw = viewport?.width ?? window.innerWidth;
      const vh = viewport?.height ?? window.innerHeight;
      const top = viewport?.offsetTop ?? 0;
      const left = viewport?.offsetLeft ?? 0;
      tip.style.width = `${Math.min(width === 'wide' ? 340 : 290, vw - 24)}px`;
      tip.style.maxHeight = `${vh - 24}px`;
      tip.style.left = `${Math.max(left + 12, Math.min(align === 'right' ? box.right - tip.offsetWidth : box.left, left + vw - tip.offsetWidth - 12))}px`;
      tip.style.top = `${Math.max(top + 12, Math.min(box.bottom + 8, top + vh - tip.offsetHeight - 12))}px`;
    };
    position();
    const dismiss = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open, align, width]);
  const dark = trigger.current?.closest('.dark') || document.documentElement.classList.contains('dark');
  return <>
    <button ref={trigger} type="button" aria-label={t(label)} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)} className="lily-info-trigger"><Info size={16} /></button>
    {open && createPortal(<div ref={panel} id={id} role="region" aria-label={t(label)} className={`lily-info-popover${dark ? ' is-dark' : ''}`}>
      <button type="button" aria-label={t("Đóng giải thích")} onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={16} /></button>
      {children}
    </div>, document.body)}
  </>;
};
