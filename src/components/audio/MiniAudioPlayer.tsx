import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  X, 
  Maximize2 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';
import { BookCover } from '../common/BookCover';

export const MiniAudioPlayer: React.FC = () => {
  const { currentBook, user } = useApp();
  const { 
    audioState, 
    audioAccess,
    togglePlayAudio, 
    skip15Sec, 
    closeAudioPlayer, 
    setIsAudioSheetOpen,
    currentChapterIndex,
    currentChapterTitle 
  } = useReader();

  const isEntitled = user.tier === 'vip' || user.tier === 'audio' || audioAccess.enabled;

  if (!audioState.isMiniPlayerVisible || !isEntitled) return null;

  return (
    <div className="mini-audio-luxury fixed bottom-5 right-4 left-4 md:left-auto md:w-[420px] z-40 rounded-[22px] px-3 py-2.5 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200 overflow-hidden">
      <div className="absolute bottom-0 left-0 h-[2px] bg-lily-300 transition-all" style={{ width: `${audioState.chunkProgressPercent}%` }} />
      {/* Icon & Track info */}
      <div 
        onClick={() => setIsAudioSheetOpen(true)}
        className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
      >
        <div className="w-8 h-10 rounded-lg overflow-hidden shrink-0 shadow-sm">
          <BookCover title={currentBook?.title || 'Truyện'} author={currentBook?.author} coverUrl={currentBook?.coverUrl} coverColor={currentBook?.coverColor} format={currentBook?.fileFormat} size="sm" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-ink-900 truncate">
            {currentChapterTitle || `Chương ${currentChapterIndex}`}
          </div>
          <div className="text-[10px] text-ink-500 truncate">
            {currentBook?.title || 'Truyện'} · {audioState.chunkProgressPercent}%
          </div>
        </div>
      </div>

      {/* Controls: ◀ ❚❚ ▶ */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => skip15Sec('backward')}
          className="p-1 rounded-lg text-ink-600 hover:bg-lavender-50 transition-colors disabled:opacity-40"
          title="Đoạn trước"
          disabled={audioState.currentChunkIndex <= 0}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={togglePlayAudio}
          className="w-9 h-9 rounded-full bg-[#f3e4d4] hover:bg-white text-[#412732] flex items-center justify-center shadow-xs transition-transform active:scale-95"
          aria-label={audioState.isPlaying ? 'Tạm dừng' : 'Phát'}
        >
          {audioState.isPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white ml-0.5" />
          )}
        </button>

        <button
          onClick={() => skip15Sec('forward')}
          className="p-1 rounded-lg text-ink-600 hover:bg-lavender-50 transition-colors disabled:opacity-40"
          title="Đoạn tiếp theo"
          disabled={audioState.currentChunkIndex >= audioState.totalChunks - 1}
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setIsAudioSheetOpen(true)}
          className="p-1 rounded-lg text-ink-400 hover:text-ink-700 transition-colors ml-1"
          title="Mở bảng điều khiển lớn"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={closeAudioPlayer}
          className="p-1 rounded-lg text-ink-400 hover:text-ink-700 transition-colors"
          title="Đóng Audio"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
