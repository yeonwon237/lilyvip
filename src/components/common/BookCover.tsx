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
  const showImage = Boolean(coverUrl) && !imageFailed;
  const sizeClasses = {
    sm: 'w-16 h-24 text-[10px]',
    md: 'w-24 sm:w-28 h-36 sm:h-40 text-xs',
    lg: 'w-28 sm:w-32 md:w-36 h-42 sm:h-48 md:h-52 text-sm',
    xl: 'w-36 sm:w-44 md:w-48 h-54 sm:h-64 md:h-72 text-base',
    responsive: 'w-full aspect-[2/3] text-xs sm:text-sm',
  }[size];

  return (
    <div
      className={`relative rounded-xl shadow-soft book-spine-effect transition-all duration-200 group-hover:shadow-card flex flex-col justify-between overflow-hidden shrink-0 select-none ${sizeClasses} ${className}`}
      style={{
        backgroundColor: coverColor,
      }}
    >
      {showImage ? (
        <img
          src={coverUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        /* Fallback typography cover */
        <div className="absolute inset-0 p-3 sm:p-3.5 flex flex-col justify-between bg-gradient-to-br from-white/20 via-transparent to-black/35">
          <div className="flex justify-between items-start">
            <span className="text-white/70 text-[9px] font-mono tracking-widest uppercase font-semibold">LILY</span>
            {format && (
              <FormatBadge 
                format={format} 
                variant="cover"
              />
            )}
          </div>
          <div className="space-y-1">
            <h4 className="font-serif font-bold text-white line-clamp-3 leading-snug drop-shadow-sm text-xs sm:text-sm">
              {title}
            </h4>
            {author && (
              <p className="text-white/85 text-[10px] sm:text-[11px] line-clamp-1 italic">
                {author}
              </p>
            )}
          </div>
          <div className="w-5 h-0.5 bg-white/40 rounded-full" />
        </div>
      )}

      {/* Format badge overlay if coverUrl exists */}
      {showImage && format && (
        <div className="absolute top-1.5 right-1.5 z-10">
          <FormatBadge format={format} variant="cover" />
        </div>
      )}
      
      {/* Subtle overlay for depth */}
      <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-xl pointer-events-none" />
    </div>
  );
};
