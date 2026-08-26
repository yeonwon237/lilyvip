import React from 'react';
import { 
  Play, 
  Pause, 
  X, 
  ChevronUp 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';
import { BookCover } from '../common/BookCover';

export const MiniAudioPlayer: React.FC = () => {
  const { currentBook, canUseFeature } = useApp();
  const { 
    audioState, 
    audioAccess,
    togglePlayAudio, 
    closeAudioPlayer, 
    setIsAudioSheetOpen,
    currentChapterIndex,
    currentChapterTitle 
  } = useReader();

  const isEntitled = canUseFeature('audio') || audioAccess.enabled;

  if (!audioState.isMiniPlayerVisible || !isEntitled) return null;

  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-3 left-3 sm:left-auto sm:right-6 sm:w-[380px] z-40 bg-white/95 backdrop-blur-md border border-ink-200/80 rounded-[24px] px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-modal animate-in slide-in-from-bottom-3 duration-200 overflow-hidden select-none">
      {/* Mini Progress Bar Line at Bottom */}
      <div 
        className="absolute bottom-0 left-0 h-[2.5px] bg-gradient-to-r from-lily-500 to-lily-700 transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(100, audioState.chunkProgressPercent))}%` }}
      />

      {/* Cover & Track info (Tap to expand full player) */}
      <div 
        onClick={() => setIsAudioSheetOpen(true)}
        className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 group"
        title="Mở trình phát đầy đủ"
      >
        <div className="w-8 h-10 rounded-lg overflow-hidden shrink-0 shadow-xs group-hover:scale-105 transition-transform">
          <BookCover 
            title={currentBook?.title || 'Truyện'} 
            author={currentBook?.author} 
            coverUrl={currentBook?.coverUrl} 
            coverColor={currentBook?.coverColor} 
            format={currentBook?.fileFormat} 
            size="sm" 
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-ink-950 truncate group-hover:text-lily-900 transition-colors">
            {currentChapterTitle || `Chương ${currentChapterIndex}`}
          </div>
          <div className="text-[11px] text-ink-500 truncate flex items-center gap-1.5 mt-0.5">
            <span>{currentBook?.title || 'Truyện'}</span>
            <span>·</span>
            <span className="font-mono text-lily-800 font-medium">{audioState.chunkProgressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Controls: Play/Pause + Expand + Close */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlayAudio();
          }}
          className="w-9 h-9 rounded-full bg-lily-700 hover:bg-lily-800 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95"
          aria-label={audioState.isPlaying ? 'Tạm dừng' : 'Phát'}
        >
          {audioState.status === 'SYNTHESIZING' ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          ) : audioState.isPlaying ? (
            <Pause className="w-4 h-4 fill-white text-white" />
          ) : (
            <Play className="w-4 h-4 fill-white text-white ml-0.5" />
          )}
        </button>

        <button
          onClick={() => setIsAudioSheetOpen(true)}
          className="p-1.5 rounded-full text-ink-400 hover:text-ink-800 hover:bg-ink-100/60 transition-colors"
          title="Mở trình phát đầy đủ"
          aria-label="Mở trình phát đầy đủ"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            closeAudioPlayer();
          }}
          className="p-1.5 rounded-full text-ink-400 hover:text-ink-800 hover:bg-ink-100/60 transition-colors"
          title="Đóng"
          aria-label="Đóng trình phát thu nhỏ"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
