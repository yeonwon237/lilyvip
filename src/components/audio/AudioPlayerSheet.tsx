import React from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Headphones, 
  Sparkles, 
  Moon, 
  Mic, 
  Gauge,
  Lock,
  Volume2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';

export const AudioPlayerSheet: React.FC = () => {
  const { user, currentBook, openUpgradeModal } = useApp();
  const { 
    isAudioSheetOpen, 
    setIsAudioSheetOpen, 
    audioState, 
    togglePlayAudio, 
    seekAudio, 
    setAudioSpeed, 
    setAudioVoice, 
    setAudioSleepTimer, 
    skip15Sec,
    currentChapterIndex 
  } = useReader();

  if (!isAudioSheetOpen) return null;

  const voices = [
    { id: 'linh_nhi', name: 'Linh Nhi', desc: 'Dịu dàng · Nữ miền Bắc' },
    { id: 'mai_phuong', name: 'Mai Phương', desc: 'Truyền cảm · Nữ miền Nam' },
    { id: 'nguyen_anh', name: 'Nguyên Anh', desc: 'Trầm ấm · Nam miền Bắc' },
    { id: 'hoang_nam', name: 'Hoàng Nam', desc: 'Ấm áp · Nam miền Nam' },
  ];

  const speeds = [0.8, 1.0, 1.2, 1.5, 1.8, 2.0];
  const timers = [15, 30, 45, 60];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Locked state for Free users without Audio Pass
  if (user.tier === 'free') {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/30 backdrop-blur-xs animate-in fade-in duration-150">
        <div 
          className="w-full max-w-lg bg-white rounded-t-3xl shadow-modal border-t border-ink-100 p-6 space-y-5 animate-in slide-in-from-bottom duration-200 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-end">
            <button
              onClick={() => setIsAudioSheetOpen(false)}
              className="p-1 rounded-full text-ink-400 hover:text-ink-700 hover:bg-ink-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-14 h-14 rounded-full bg-lavender-100 text-lavender-600 flex items-center justify-center mx-auto">
            <Headphones className="w-7 h-7" />
          </div>

          <div>
            <h3 className="font-serif font-bold text-lg text-ink-900 flex items-center justify-center gap-1.5">
              <Lock className="w-4 h-4 text-ink-400" />
              <span>Audio & Giọng đọc AI đang khóa</span>
            </h3>
            <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1 leading-relaxed">
              Bạn có thể mở <strong>Audio Pass</strong> (19.000đ / 30 ngày) để nghe audio cho 3 truyện trên thiết bị, hoặc nâng cấp <strong>Lily VIP</strong> để có trọn bộ thư viện Cloud + Audio.
            </p>
          </div>

          <div className="p-4 bg-lavender-50/60 rounded-2xl border border-lavender-200/80 text-left text-xs space-y-1.5">
            <div className="font-semibold text-lavender-950 flex items-center justify-between">
              <span>🎧 Lily Audio Pass</span>
              <span className="text-sm font-bold text-lavender-900">19.000đ / 30 ngày</span>
            </div>
            <p className="text-[11px] text-lavender-800/80">
              ✓ Dùng cho toàn bộ 3 slot Local của bạn • 4 giọng đọc AI chuẩn Việt • Hẹn giờ tắt trước khi ngủ
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setIsAudioSheetOpen(false);
                openUpgradeModal('Lily Audio Pass');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-soft transition-all"
            >
              Tìm hiểu Audio Pass
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-modal border-t border-ink-100 p-5 md:p-6 max-h-[85vh] overflow-y-auto space-y-5 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-lavender-100 text-lavender-700 flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-ink-900">
                Lily Audio Reader
              </h3>
              <span className="text-[10px] text-emerald-700 font-medium">
                {user.tier === 'vip' ? '✦ VIP Audio Included' : '🎧 Audio Pass Active'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsAudioSheetOpen(false)}
            className="p-1 rounded-full text-ink-400 hover:text-ink-700 hover:bg-ink-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chapter Title Banner */}
        <div className="text-center">
          <h4 className="font-serif font-bold text-base text-ink-900">
            Chương {currentChapterIndex}: Đêm lạnh bên lầu ngắm sao
          </h4>
          <p className="text-xs text-ink-500 mt-0.5 truncate max-w-xs mx-auto">
            {currentBook?.title} · {currentBook?.author}
          </p>
        </div>

        {/* Timeline & Slider */}
        <div>
          <input
            type="range"
            min="0"
            max={audioState.duration}
            value={audioState.currentTime}
            onChange={(e) => seekAudio(Number(e.target.value))}
            className="w-full accent-lavender-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-mono text-ink-500 mt-1">
            <span>{formatTime(audioState.currentTime)}</span>
            <span>{formatTime(audioState.duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => skip15Sec('backward')}
            className="p-2.5 rounded-full hover:bg-cream-100 text-ink-600 transition-colors flex flex-col items-center"
            title="Lùi 15 giây"
          >
            <RotateCcw className="w-5 h-5" />
            <span className="text-[9px] font-mono mt-0.5">-15s</span>
          </button>

          <button
            onClick={togglePlayAudio}
            className="w-14 h-14 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white flex items-center justify-center shadow-card transition-transform active:scale-95"
            aria-label={audioState.isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            {audioState.isPlaying ? (
              <Pause className="w-6 h-6 fill-white" />
            ) : (
              <Play className="w-6 h-6 fill-white ml-0.5" />
            )}
          </button>

          <button
            onClick={() => skip15Sec('forward')}
            className="p-2.5 rounded-full hover:bg-cream-100 text-ink-600 transition-colors flex flex-col items-center"
            title="Tua 15 giây"
          >
            <RotateCw className="w-5 h-5" />
            <span className="text-[9px] font-mono mt-0.5">+15s</span>
          </button>
        </div>

        {/* Voice Selector */}
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-2 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-lavender-600" />
            <span>Giọng đọc AI</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {voices.map((v) => {
              const isSelected = audioState.voice === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setAudioVoice(v.id as any)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    isSelected
                      ? 'border-lavender-500 bg-lavender-50 font-semibold text-lavender-950 shadow-xs'
                      : 'border-ink-200 bg-white hover:bg-cream-50 text-ink-700'
                  }`}
                >
                  <div className="truncate">{v.name}</div>
                  <div className="text-[10px] text-ink-400 font-normal truncate mt-0.5">
                    {v.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Speed & Sleep Timer */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-ink-100">
          {/* Speed */}
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-ink-500" />
              <span>Tốc độ: {audioState.playbackRate}x</span>
            </label>
            <div className="flex flex-wrap gap-1">
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => setAudioSpeed(s)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-medium ${
                    audioState.playbackRate === s
                      ? 'bg-lavender-600 text-white'
                      : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Sleep timer */}
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5 flex items-center gap-1">
              <Moon className="w-3.5 h-3.5 text-ink-500" />
              <span>Hẹn giờ tắt</span>
            </label>
            <div className="flex flex-wrap gap-1">
              {timers.map((t) => (
                <button
                  key={t}
                  onClick={() => setAudioSleepTimer(audioState.sleepTimer === t ? null : t)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-medium ${
                    audioState.sleepTimer === t
                      ? 'bg-lavender-600 text-white'
                      : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
                  }`}
                >
                  {t}p
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
