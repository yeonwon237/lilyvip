import React from 'react';

interface BrandProps {
  iconClassName?: string;
  textClassName?: string;
  className?: string;
}

/**
 * The "LilyHub" wordmark used to be a single flat PNG (icon + text baked
 * together). Its navy "Lily" text was tuned for a light page and turned
 * near-illegible on the app's dark theme, with no way to recolor pixels
 * inside a raster image. Render the wordmark as real (theme-aware) text
 * next to the icon crop instead, same split LilyHub's own site uses.
 */
export const Brand: React.FC<BrandProps> = ({ iconClassName = 'h-8 w-8', textClassName = 'text-xl', className = '' }) => (
  <span className={`inline-flex items-center gap-1.5 ${className}`}>
    <img src="/lilyhub-icon-mark.png" alt="" aria-hidden="true" className={`${iconClassName} shrink-0 object-contain`} />
    <span className={`font-serif font-bold tracking-tight text-[#17135f] dark:text-violet-100 ${textClassName}`}>
      Lily<span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent dark:from-violet-300 dark:to-fuchsia-300">Hub</span>
    </span>
  </span>
);
