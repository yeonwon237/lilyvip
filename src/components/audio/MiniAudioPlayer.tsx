import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Headphones, 
  X, 
  Maximize2 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';

export const MiniAudioPlayer: React.FC = () => {
  const { currentBook, user } = useApp();
  const { 
    audioState, 
    togglePlayAudio, 
    skip15Sec, 
    closeAudioPlayer, 
    setIsAudioSheetOpen,
    currentChapterIndex 
  } = useReader();

  if (!audioState.isMiniPlayerVisible || user.tier === 'free') return null;

  return (
    <div className="fixed bottom-14 md:bottom-5 right-4 left-4 md:left-auto md:w-96 z-40 bg-white/95 backdrop-blur-md border border-lavender-200/80 rounded-2xl p-3 shadow-float flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200">
      {/* Icon & Track info */}
      <div 
        onClick={() => setIsAudioSheetOpen(true)}
        className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
      >
        <div className="w-8 h-8 rounded-xl bg-lavender-100 text-lavender-700 flex items-center justify-center shrink-0">
          <Headphones className="w-4 h-4 animate-pulse" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-ink-900 truncate">
            Chương {currentChapterIndex} · Lily Voice
          </div>
          <div className="text-[10px] text-ink-500 truncate">
            {currentBook?.title || 'Truyện'} · {audioState.playbackRate}x
          </div>
        </div>
      </div>

      {/* Controls: ◀ ❚❚ ▶ */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => skip15Sec('backward')}
          className="p-1 rounded-lg text-ink-600 hover:bg-lavender-50 transition-colors"
          title="Lùi 15s"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={togglePlayAudio}
          className="w-8 h-8 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95"
        >
          {audioState.isPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white ml-0.5" />
          )}
        </button>

        <button
          onClick={() => skip15Sec('forward')}
          className="p-1 rounded-lg text-ink-600 hover:bg-lavender-50 transition-colors"
          title="Tua 15s"
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
