import React from 'react';

interface InfoTipProps {
  children: React.ReactNode;
  label?: string;
  align?: 'left' | 'right';
}

export const InfoTip: React.FC<InfoTipProps> = ({
  children,
  label = 'Xem giải thích',
  align = 'left',
}) => (
  <details className="group relative inline-block align-middle">
    <summary
      aria-label={label}
      className="flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-full border border-ink-300 text-[11px] font-bold text-ink-500 transition-colors hover:border-ink-500 hover:text-ink-800 [&::-webkit-details-marker]:hidden"
    >
      !
    </summary>
    <div
      className={`surface-solid fixed left-3 right-3 top-16 z-50 w-auto rounded-md border border-ink-300 p-3 text-left text-xs font-normal leading-5 text-ink-800 shadow-modal sm:absolute sm:left-auto sm:right-auto sm:top-7 sm:w-64 ${
        align === 'right' ? 'sm:right-0' : 'sm:left-0'
      }`}
    >
      {children}
    </div>
  </details>
);
