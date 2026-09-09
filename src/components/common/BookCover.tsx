import React, { useEffect, useState } from 'react';
import { FormatBadge } from './Badges';

import { SupportedFormat } from '../../book-engine/types';

interface BookCoverProps {
  title: string;
  author?: string;
  coverUrl?: string;
  coverColor?: string;
  format?: SupportedFormat;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'responsive';
  className?: string;
}

const DEFAULT_COVER_COUNT = 10;

const getDefaultCover = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }
  const coverNumber = (Math.abs(hash) % DEFAULT_COVER_COUNT) + 1;
  return `/default-covers/lily-cover-${String(coverNumber).padStart(2, '0')}.jpg`;
};

export const BookCover: React.FC<BookCoverProps> = ({
  title,
  author,
  coverUrl,
  coverColor = '#D9829B',
  format,
  size = 'md',
  className = '',
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [coverUrl]);
  const showOriginalCover = Boolean(coverUrl) && !imageFailed;
  const displayedCover = showOriginalCover ? coverUrl : getDefaultCover(`${title}|${author || ''}`);
  const sizeClasses = {
    sm: 'w-16 h-24 text-[10px]',
    md: 'w-24 sm:w-28 h-36 sm:h-40 text-xs',
    lg: 'w-28 h-[10.5rem] sm:w-32 sm:h-48 md:w-36 md:h-52 text-sm',
    xl: 'w-36 h-[13.5rem] sm:w-44 sm:h-64 md:w-48 md:h-72 text-base',
    responsive: 'w-full aspect-[2/3] text-xs sm:text-sm',
  }[size];

  return (
    <div
      className={`relative rounded-md bg-ink-100 shadow-sm ring-1 ring-black/10 transition-transform duration-500 group-hover:scale-[1.02] flex flex-col justify-between overflow-hidden shrink-0 select-none ${sizeClasses} ${className}`}
      style={{
        backgroundColor: coverColor,
      }}
    >
      <img
        src={displayedCover}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        onError={() => {
          if (showOriginalCover) setImageFailed(true);
        }}
      />

      {format && (
        <div className="absolute top-1.5 right-1.5 z-10">
          <FormatBadge format={format} variant="cover" />
        </div>
      )}
      
      <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-md pointer-events-none" />
    </div>
  );
};
