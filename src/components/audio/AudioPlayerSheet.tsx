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
  Volume2, 
  Download, 
  Check, 
  Settings2,
  BookOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';

export const AudioPlayerSheet: React.FC = () => {
  const { user, currentBook, openUpgradeModal } = useApp();
  const { 
    isAudioSheetOpen, 
    setIsAudioSheetOpen, 
    audioState, 
    audioAccess,
    availableVoices,
    togglePlayAudio, 
    seekAudio, 
    setAudioSpeed, 
    setAudioVoice, 
    setAudioSleepTimer,
    setAudioAutoNext,
    setAudioReadTitle,
    skip15Sec,
    currentChapterIndex,
    currentChapterTitle,
    toggleDevAudioAccess,
    downloadVoiceModel 
  } = useReader();

  if (!isAudioSheetOpen) return null;

  const isEntitled = user.tier === 'vip' || user.tier === 'audio' || audioAccess.enabled;
  const speeds = [0.8, 1.0, 1.2, 1.5, 2.0];
  const timers = [15, 30, 45, 60];

  // LOCKED STATE FOR FREE USERS WITHOUT AUDIO ACCESS
  if (!isEntitled) {
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
              aria-label="Đóng"
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
              <span>Audio & Giọng đọc AI</span>
            </h3>
            <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1 leading-relaxed">
              Bạn có thể mở <strong>Audio Pass</strong> để nghe đọc mọi tác phẩm cá nhân trên máy, hoặc nâng cấp <strong>Lily VIP</strong> để có trọn bộ thư viện Cloud + Audio.
            </p>
          </div>

          <div className="p-4 bg-lavender-50/60 rounded-2xl border border-lavender-200/80 text-left text-xs space-y-1.5">
            <div className="font-semibold text-lavender-950 flex items-center justify-between">
              <span>🎧 Lily Audio Reader</span>
              <span className="text-xs font-bold text-lavender-900">Nghi TTS Engine</span>
            </div>
            <p className="text-[11px] text-lavender-800/80">
              ✓ Dùng cho toàn bộ slot Local của bạn • 4 giọng đọc AI tiếng Việt mượt mà • Hẹn giờ tắt thông minh
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setIsAudioSheetOpen(false);
                openUpgradeModal('Lily Audio Pass');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-soft transition-all"
            >
              Tìm hiểu Audio Pass
            </button>

            {/* Dev helper button when in development */}
            {typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV) && (
              <button
                type="button"
                onClick={() => toggleDevAudioAccess(true)}
                className="w-full py-2 px-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-semibold hover:bg-amber-100 transition-colors"
              >
                🛠️ Bật thử nghiệm Audio Local (DEV Mode)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE PLAYER SHEET
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="audio-sheet-compact w-full max-w-xl bg-white rounded-t-3xl shadow-modal border-t border-ink-100 p-4 md:p-5 max-h-[92vh] overflow-y-auto space-y-3 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-lavender-100 text-lavender-700 flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-ink-900">
                Lily Audio Reader
              </h3>
              <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Nghi TTS Engine · 100% Local</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsAudioSheetOpen(false)}
            className="p-1 rounded-full text-ink-400 hover:text-ink-700 hover:bg-ink-100"
            aria-label="Thu nhỏ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chapter Title Banner */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
          <h4 className="font-serif font-bold text-sm text-ink-900 truncate">
            {currentChapterTitle || `Chương ${currentChapterIndex}`}
          </h4>
          <p className="text-[10px] text-ink-500 truncate">
            {currentBook?.title} · {currentBook?.author}
          </p>
          </div>
          <span className="text-[10px] font-mono text-ink-500 shrink-0">{audioState.chunkProgressPercent}% chương</span>
        </div>

        {/* Real Chunk Timeline & Slider */}
        <div className="space-y-0.5">
          <input
            type="range"
            min="0"
            max={Math.max(0, audioState.totalChunks - 1)}
            value={audioState.currentChunkIndex}
            onChange={(e) => seekAudio(Number(e.target.value))}
            className="w-full accent-lavender-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-mono text-ink-500">
            <span>
              Đoạn {audioState.totalChunks > 0 ? audioState.currentChunkIndex + 1 : 0} / {audioState.totalChunks}
            </span>
            <span>{audioState.totalChunks} đoạn</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-5 py-0.5">
          <button
            onClick={() => skip15Sec('backward')}
            className="p-1.5 rounded-full hover:bg-cream-100 text-ink-600 transition-colors flex items-center gap-1"
            title="Đoạn trước"
            disabled={audioState.currentChunkIndex <= 0}
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-[9px] font-mono">Trước</span>
          </button>

          <button
            onClick={togglePlayAudio}
            className="w-11 h-11 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white flex items-center justify-center shadow-card transition-transform active:scale-95"
            aria-label={audioState.isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            {audioState.isPlaying ? (
              <Pause className="w-5 h-5 fill-white" />
            ) : (
              <Play className="w-5 h-5 fill-white ml-0.5" />
            )}
          </button>

          <button
            onClick={() => skip15Sec('forward')}
            className="p-1.5 rounded-full hover:bg-cream-100 text-ink-600 transition-colors flex items-center gap-1"
            title="Đoạn kế tiếp"
            disabled={audioState.currentChunkIndex >= audioState.totalChunks - 1}
          >
            <span className="text-[9px] font-mono">Tiếp</span>
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Voice Selector */}
        <div className="space-y-2.5">
          {/* 1. NGHI-TTS REAL NEURAL VOICES */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-800 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-lavender-600" />
                <span>Giọng AI Offline</span>
              </span>
              <span className="text-[10px] text-lavender-700 font-mono">100% Local</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(availableVoices.filter(v => v.engineType !== 'system-speech').length > 0
                ? availableVoices.filter(v => v.engineType !== 'system-speech')
                : [
                    { id: 'ngochuyen', name: 'Ngọc Huyền (NghiTTS Original)', description: 'Nữ miền Bắc · Giọng Review Phim & Truyện', isInstalled: false, modelSizeMB: 48.5 },
                    { id: 'ngochuyennew', name: 'Ngọc Huyền Mới (NghiTTS V2)', description: 'Nữ miền Bắc · Bản V2 trong trẻo, mượt mà', isInstalled: false, modelSizeMB: 48.5 },
                    { id: 'maiphuong', name: 'Mai Phương (NghiTTS)', description: 'Nữ miền Nam · Ngọt ngào, sâu lắng', isInstalled: false, modelSizeMB: 44.0 },
                    { id: 'minhkhang', name: 'Minh Khang (NghiTTS)', description: 'Nam miền Bắc · Tự nhiên, đĩnh đạc', isInstalled: false, modelSizeMB: 46.2 },
                    { id: 'manhdung', name: 'Mạnh Dũng (NghiTTS)', description: 'Nam miền Bắc · Trầm ấm, uy nghiêm', isInstalled: false, modelSizeMB: 46.5 },
                    { id: 'minhthu', name: 'Minh Thu (NghiTTS)', description: 'Nữ miền Bắc · Thanh thoát, nhẹ nhàng', isInstalled: false, modelSizeMB: 44.8 },
                    { id: 'vietthao3886', name: 'Việt Thảo (NghiTTS)', description: 'Nam miền Nam · Phong cách kể chuyện hải ngoại', isInstalled: false, modelSizeMB: 47.0 },
                  ]
              ).map((v) => {
                const isSelected = audioState.voice === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setAudioVoice(v.id)}
                    className={`min-h-[52px] p-2 rounded-xl border text-left text-[11px] transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-lavender-500 bg-lavender-50 font-semibold text-lavender-950 shadow-xs'
                        : 'border-ink-200 bg-white hover:bg-cream-50 text-ink-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate flex items-center gap-1">
                        <span>{v.name}</span>
                        {isSelected && <span className="text-[10px] text-lavender-700">●</span>}
                      </div>
                      <div className="text-[9px] text-ink-400 font-normal truncate mt-0.5">
                        {v.description}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {v.isInstalled ? (
                        <span className="text-[10px] text-emerald-700 font-medium px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                          Sẵn sàng
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadVoiceModel(v.id);
                          }}
                          className="text-[9px] text-lavender-800 font-semibold px-1.5 py-0.5 bg-lavender-100 hover:bg-lavender-200 rounded-lg flex items-center gap-0.5"
                          title={`Tải model NghiTTS (${v.modelSizeMB} MB)`}
                        >
                          <Download className="w-3 h-3" />
                          <span>{v.modelSizeMB}MB</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. SYSTEM VOICES FALLBACK */}
          {availableVoices.filter(v => v.engineType === 'system-speech').length > 0 && (
            <div className="pt-2 border-t border-ink-100">
              <label className="block text-[10px] font-semibold text-ink-600 mb-1 flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-ink-400" />
                <span>Giọng có sẵn trên thiết bị</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {availableVoices.filter(v => v.engineType === 'system-speech').map((v) => {
                  const isSelected = audioState.voice === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setAudioVoice(v.id)}
                      className={`p-2 rounded-xl border text-left text-xs transition-all ${
                        isSelected
                          ? 'border-ink-400 bg-ink-50 font-semibold text-ink-900'
                          : 'border-ink-200/70 bg-white hover:bg-cream-50 text-ink-600'
                      }`}
                    >
                      <div className="truncate font-medium">{v.name}</div>
                      <div className="text-[9px] text-ink-400 truncate">{v.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Playback Settings Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2.5 bg-cream-50/80 rounded-xl border border-cream-200 text-[11px] text-ink-700">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={audioState.readChapterTitle}
              onChange={(e) => setAudioReadTitle(e.target.checked)}
              className="rounded accent-lavender-600"
            />
            <span>Đọc tiêu đề chương khi bắt đầu</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={audioState.autoNextChapter}
              onChange={(e) => setAudioAutoNext(e.target.checked)}
              className="rounded accent-lavender-600"
            />
            <span>Tự động chuyển chương tiếp theo khi đọc hết</span>
          </label>
        </div>

        {/* Speed & Sleep Timer */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ink-100">
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
