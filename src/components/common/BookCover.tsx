import React from 'react';
import { BookOpen } from 'lucide-react';
import { FormatBadge } from './Badges';

interface BookCoverProps {
  title: string;
  author?: string;
  coverUrl?: string;
  coverColor?: string;
  format?: 'TXT' | 'EPUB' | 'DOCX';
  size?: 'sm' | 'md' | 'lg' | 'xl';
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
  const sizeClasses = {
    sm: 'w-16 h-24 text-[10px]',
    md: 'w-24 h-36 text-xs',
    lg: 'w-36 h-52 text-sm',
    xl: 'w-48 h-72 text-base',
  }[size];

  return (
    <div
      className={`relative rounded-lg shadow-card book-spine-effect transition-transform duration-200 hover:scale-[1.02] flex flex-col justify-between overflow-hidden shrink-0 select-none ${sizeClasses} ${className}`}
      style={{
        backgroundColor: coverColor,
      }}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        /* Fallback typography cover */
        <div className="absolute inset-0 p-2.5 flex flex-col justify-between bg-gradient-to-br from-white/20 via-transparent to-black/30">
          <div className="flex justify-between items-start">
            <span className="text-white/60 text-[9px] font-mono tracking-widest uppercase">LILY</span>
            {format && <FormatBadge format={format} className="scale-75 origin-top-right bg-black/20 text-white border-white/30" />}
          </div>
          <div>
            <h4 className="font-serif font-bold text-white line-clamp-2 leading-tight drop-shadow-sm">
              {title}
            </h4>
            {author && (
              <p className="text-white/80 text-[10px] mt-0.5 line-clamp-1 italic">
                {author}
              </p>
            )}
          </div>
          <div className="w-4 h-0.5 bg-white/40 rounded-full" />
        </div>
      )}

      {/* Format badge overlay if coverUrl exists */}
      {coverUrl && format && (
        <div className="absolute top-1.5 right-1.5 z-10">
          <FormatBadge format={format} className="bg-ink-900/80 text-white border-none shadow-sm backdrop-blur-sm" />
        </div>
      )}
      
      {/* Subtle overlay for depth */}
      <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-lg pointer-events-none" />
    </div>
  );
};
