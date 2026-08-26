import React, { useMemo, useState } from 'react';
import { 
  ArrowLeft, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  Download, 
  Headphones, 
  Moon, 
  MoreHorizontal, 
  Pause, 
  Play, 
  RotateCcw, 
  RotateCw, 
  Settings2, 
  SkipBack, 
  SkipForward, 
  Sliders, 
  Timer, 
  Volume2, 
  X 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';
import { BookCover } from '../common/BookCover';
import { getVoicePresentation } from '../../audio-engine/voicePresentation';

const SPEEDS = [0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
const TIMER_OPTIONS: Array<{ label: string; value: number | 'end_of_chapter' | null }> = [
  { label: 'Tắt hẹn giờ', value: null },
  { label: '10 phút', value: 10 },
  { label: '20 phút', value: 20 },
  { label: '30 phút', value: 30 },
  { label: '45 phút', value: 45 },
  { label: '60 phút', value: 60 },
  { label: 'Hết chương hiện tại', value: 'end_of_chapter' },
];

const FALLBACK_VOICES = [
  ['ngochuyen', 48.5],
  ['ngochuyennew', 48.5],
  ['maiphuong', 44],
  ['minhkhang', 46.2],
  ['manhdung', 46.5],
  ['minhthu', 44.8],
  ['vietthao3886', 47],
].map(([id, size]) => ({
  id: String(id),
  ...getVoicePresentation(String(id)),
  modelSizeMB: Number(size),
  isInstalled: false,
  engineType: 'nghi-tts' as const,
}));

export const AudioPlayerSheet: React.FC = () => {
  const { currentBook, canUseFeature } = useApp();
  const {
    isAudioSheetOpen,
    setIsAudioSheetOpen,
    audioState,
    audioAccess,
    availableVoices,
    downloadingVoices,
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
    totalChapters,
    nextChapter,
    prevChapter,
    downloadVoiceModel,
  } = useReader();

  const [panel, setPanel] = useState<'player' | 'voices' | 'speed' | 'timer' | 'settings'>('player');

  const voices = useMemo(() => {
    const neural = availableVoices.filter(v => v.engineType !== 'system-speech');
    return neural.length > 0 ? neural : (FALLBACK_VOICES as any[]);
  }, [availableVoices]);

  const deviceVoices = availableVoices.filter(v => v.engineType === 'system-speech');
  const activeVoice = [...voices, ...deviceVoices].find(v => v.id === audioState.voice);
  const voiceCopy = getVoicePresentation(audioState.voice, activeVoice);
  const isEntitled = canUseFeature('audio') || audioAccess.enabled;
  const progress = Math.max(0, Math.min(100, audioState.chunkProgressPercent));

  if (!isAudioSheetOpen || !isEntitled) return null;

  const close = () => {
    setPanel('player');
    setIsAudioSheetOpen(false);
  };

  const getTimerDisplay = () => {
    if (audioState.sleepTimer === 'end_of_chapter') return 'Hết chương';
    if (typeof audioState.sleepTimer === 'number') {
      const remainingSecs = audioState.sleepTimerSecondsRemaining;
      if (remainingSecs !== undefined && remainingSecs !== null) {
        const mins = Math.max(1, Math.ceil(remainingSecs / 60));
        return `${mins}p`;
      }
      return `${audioState.sleepTimer}p`;
    }
    return 'Hẹn giờ';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-950/45 backdrop-blur-md sm:p-4 animate-in fade-in duration-150">
      <div 
        className="relative w-full sm:max-w-md h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col bg-[#FAF7F2] sm:rounded-[36px] shadow-modal animate-in slide-in-from-bottom duration-200 overflow-hidden border border-ink-100/50"
      >
        {/* ================= PANEL 1: MAIN AUDIOBOOK PLAYER ================= */}
        {panel === 'player' && (
          <div className="flex-1 flex flex-col justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-7 overflow-y-auto">
            
            {/* Top Bar */}
            <header className="flex items-center justify-between h-10 shrink-0">
              <button
                onClick={close}
                className="p-2 -ml-2 rounded-full hover:bg-white/80 text-ink-600 active:scale-95 transition-all"
                title="Thu nhỏ"
                aria-label="Thu nhỏ trình phát"
              >
                <ChevronDown className="w-5 h-5" />
              </button>

              <span className="font-serif text-xs font-semibold tracking-wider uppercase text-ink-500">
                Sách nói
              </span>

              <button
                onClick={() => setPanel('settings')}
                className="p-2 -mr-2 rounded-full hover:bg-white/80 text-ink-600 active:scale-95 transition-all"
                title="Cài đặt phát"
                aria-label="Cài đặt phát âm thanh"
              >
                <Sliders className="w-4 h-4" />
              </button>
            </header>

            {/* Stage: Responsive Cover & Titles */}
            <div className="my-auto py-2 flex flex-col items-center text-center">
              {/* Cover Art with Warm Drop Shadow */}
              <div className="relative group shrink-0 max-h-[30vh] sm:max-h-[34vh] flex items-center justify-center">
                <div className="absolute inset-x-8 inset-y-4 rounded-3xl bg-lily-400/20 blur-2xl -z-10" />
                <div className="drop-shadow-[0_16px_28px_rgba(65,39,50,0.22)] transition-transform duration-300">
                  <BookCover
                    title={currentBook?.title || 'Truyện'}
                    author={currentBook?.author}
                    coverUrl={currentBook?.coverUrl}
                    coverColor={currentBook?.coverColor}
                    format={currentBook?.fileFormat}
                    size="lg"
                  />
                </div>
              </div>

              {/* Title & Chapter */}
              <div className="mt-4 sm:mt-5 max-w-full px-2 space-y-1">
                <h2 className="font-serif font-bold text-lg sm:text-xl text-ink-950 truncate">
                  {currentBook?.title || 'Truyện'}
                </h2>
                <p className="text-xs sm:text-sm text-ink-500 font-medium truncate">
                  {currentChapterTitle || `Chương ${currentChapterIndex}`}
                </p>
              </div>
            </div>

            {/* Bottom Controls Stage */}
            <div className="space-y-4 sm:space-y-5 shrink-0 pt-2">
              
              {/* Progress Slider */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, audioState.totalChunks - 1)}
                  value={audioState.currentChunkIndex}
                  onChange={(e) => seekAudio(Number(e.target.value))}
                  className="w-full h-1.5 rounded-lg bg-ink-200/80 accent-lily-700 cursor-pointer"
                  aria-label="Tiến độ nghe"
                />
                <div className="flex items-center justify-between text-[11px] font-mono text-ink-400 select-none">
                  <span>Chương {currentChapterIndex} / {totalChapters}</span>
                  <span>{progress}%</span>
                </div>
              </div>

              {/* Transport Buttons: Prev | -15s | PLAY/PAUSE | +30s | Next */}
              <div className="flex items-center justify-center gap-3 sm:gap-5">
                <button
                  onClick={prevChapter}
                  disabled={currentChapterIndex <= 1}
                  className="p-2.5 rounded-full text-ink-500 hover:text-ink-900 hover:bg-white/80 disabled:opacity-30 transition-all active:scale-95"
                  title="Chương trước"
                  aria-label="Chương trước"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={() => skip15Sec('backward')}
                  disabled={audioState.currentChunkIndex <= 0}
                  className="p-2.5 rounded-full text-ink-600 hover:text-ink-950 hover:bg-white/80 disabled:opacity-30 transition-all active:scale-95 flex flex-col items-center"
                  title="Tua lùi 15 giây"
                  aria-label="Tua lùi 15 giây"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span className="text-[9px] font-bold font-mono -mt-0.5">15</span>
                </button>

                {/* PRIMARY PLAY/PAUSE BUTTON */}
                <button
                  onClick={togglePlayAudio}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-lily-600 via-lily-700 to-lily-900 text-white flex items-center justify-center shadow-[0_12px_28px_-6px_rgba(125,41,73,0.55)] hover:shadow-[0_16px_32px_-6px_rgba(125,41,73,0.65)] active:scale-95 transition-all hover:scale-105"
                  aria-label={audioState.isPlaying ? 'Tạm dừng' : 'Phát'}
                >
                  {audioState.status === 'SYNTHESIZING' ? (
                    <span className="w-6 h-6 rounded-full border-2.5 border-white/30 border-t-white animate-spin" />
                  ) : audioState.isPlaying ? (
                    <Pause className="w-7 h-7 fill-white text-white" />
                  ) : (
                    <Play className="w-7 h-7 fill-white text-white ml-1" />
                  )}
                </button>

                <button
                  onClick={() => skip15Sec('forward')}
                  disabled={audioState.currentChunkIndex >= audioState.totalChunks - 1}
                  className="p-2.5 rounded-full text-ink-600 hover:text-ink-950 hover:bg-white/80 disabled:opacity-30 transition-all active:scale-95 flex flex-col items-center"
                  title="Tua tới 30 giây"
                  aria-label="Tua tới 30 giây"
                >
                  <RotateCw className="w-5 h-5" />
                  <span className="text-[9px] font-bold font-mono -mt-0.5">30</span>
                </button>

                <button
                  onClick={nextChapter}
                  disabled={currentChapterIndex >= totalChapters}
                  className="p-2.5 rounded-full text-ink-500 hover:text-ink-900 hover:bg-white/80 disabled:opacity-30 transition-all active:scale-95"
                  title="Chương tiếp theo"
                  aria-label="Chương tiếp theo"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Status Hint */}
              {audioState.status === 'SYNTHESIZING' && (
                <p className="text-center text-xs text-lily-800 animate-pulse font-medium">
                  Đang chuẩn bị giọng đọc…
                </p>
              )}

              {/* 3 SECONDARY CONTROL PILLS */}
              <div className="pt-2 border-t border-ink-100/70 grid grid-cols-3 gap-2">
                {/* Voice Pill */}
                <button
                  onClick={() => setPanel('voices')}
                  className="py-2.5 px-3 rounded-2xl bg-white/80 hover:bg-white border border-ink-100/80 text-left transition-all active:scale-98 flex items-center justify-between shadow-xs min-w-0"
                >
                  <div className="min-w-0 pr-1">
                    <span className="block text-[10px] text-ink-400 font-medium">Giọng Lily</span>
                    <span className="block text-xs font-semibold text-ink-900 truncate">
                      {voiceCopy.name}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                </button>

                {/* Speed Pill */}
                <button
                  onClick={() => setPanel('speed')}
                  className="py-2.5 px-3 rounded-2xl bg-white/80 hover:bg-white border border-ink-100/80 text-center transition-all active:scale-98 shadow-xs"
                >
                  <span className="block text-[10px] text-ink-400 font-medium">Tốc độ</span>
                  <span className="block text-xs font-mono font-bold text-ink-900">
                    {audioState.playbackRate.toFixed(1)}×
                  </span>
                </button>

                {/* Timer Pill */}
                <button
                  onClick={() => setPanel('timer')}
                  className={`py-2.5 px-3 rounded-2xl border text-center transition-all active:scale-98 shadow-xs truncate ${
                    audioState.sleepTimer
                      ? 'bg-lily-50/90 border-lily-300 text-lily-900 font-semibold'
                      : 'bg-white/80 hover:bg-white border-ink-100/80 text-ink-800'
                  }`}
                >
                  <span className="block text-[10px] text-ink-400 font-medium">Hẹn giờ</span>
                  <span className="block text-xs font-medium truncate">
                    {getTimerDisplay()}
                  </span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ================= PANEL 2: VOICE PICKER ================= */}
        {panel === 'voices' && (
          <div className="flex-1 flex flex-col justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-7 overflow-y-auto">
            <div>
              <header className="flex items-center gap-2 h-10 border-b border-ink-100/70 pb-2">
                <button
                  onClick={() => setPanel('player')}
                  className="p-2 -ml-2 rounded-full hover:bg-white text-ink-700"
                  aria-label="Quay lại"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-serif font-bold text-base text-ink-950">Giọng đọc Lily</h3>
                </div>
              </header>

              <p className="text-xs text-ink-500 mt-2 mb-3">
                Mỗi giọng chỉ cần tải một lần và có thể nghe ngoại tuyến bất kỳ lúc nào.
              </p>

              {/* List of Voices */}
              <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-0.5">
                {voices.map((voice) => {
                  const isSelected = audioState.voice === voice.id;
                  const presentation = getVoicePresentation(voice.id, voice);
                  const isDownloading = downloadingVoices[voice.id] !== undefined;
                  const progressPct = downloadingVoices[voice.id] || 0;

                  return (
                    <div
                      key={voice.id}
                      onClick={() => {
                        if (voice.isInstalled) {
                          setAudioVoice(voice.id);
                          setPanel('player');
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-lily-500 bg-gradient-to-r from-lily-50/90 via-white to-lily-50/60 shadow-xs ring-1 ring-lily-400/40'
                          : 'border-ink-100/80 bg-white/80 hover:bg-white hover:border-ink-200'
                      } ${voice.isInstalled ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Radio indicator */}
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'border-lily-600 bg-lily-600 text-white'
                              : 'border-ink-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        <div className="min-w-0">
                          <strong className="block text-sm font-semibold text-ink-950">
                            {presentation.name}
                          </strong>
                          <span className="block text-xs text-ink-500 truncate mt-0.5">
                            {presentation.description}
                          </span>
                        </div>
                      </div>

                      {/* Right Action: Ready or Download */}
                      <div className="shrink-0">
                        {isDownloading ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lily-50 border border-lily-200 text-xs font-semibold text-lily-900">
                            <span className="w-3 h-3 rounded-full border-2 border-lily-400 border-t-lily-700 animate-spin" />
                            <span>{progressPct}%</span>
                          </div>
                        ) : voice.isInstalled ? (
                          <span className="text-[11px] font-semibold text-emerald-700 px-2 py-0.5 rounded-md bg-emerald-50">
                            Đã sẵn sàng
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadVoiceModel(voice.id);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-lily-100 hover:bg-lily-200 text-lily-900 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải giọng (~{voice.modelSizeMB || 48} MB)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Device Voices (Optional Fallback) */}
                {deviceVoices.length > 0 && (
                  <div className="pt-3 border-t border-ink-100">
                    <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wider block mb-1.5">
                      Giọng hệ thống
                    </span>
                    <button
                      onClick={() => {
                        setAudioVoice(deviceVoices[0].id);
                        setPanel('player');
                      }}
                      className="w-full p-3.5 rounded-2xl bg-white/70 hover:bg-white border border-ink-100 text-left transition-all flex items-center justify-between"
                    >
                      <div>
                        <strong className="block text-sm font-semibold text-ink-900">Giọng thiết bị</strong>
                        <span className="block text-xs text-ink-400 mt-0.5">Giọng mặc định có sẵn trên máy</span>
                      </div>
                      {audioState.voice.startsWith('sys_') && (
                        <Check className="w-4 h-4 text-lily-600" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setPanel('player')}
              className="mt-4 w-full py-3 rounded-2xl bg-ink-950 text-white text-xs font-semibold shadow-soft active:scale-98 transition-transform"
            >
              Xong
            </button>
          </div>
        )}

        {/* ================= PANEL 3: SPEED PICKER ================= */}
        {panel === 'speed' && (
          <div className="flex-1 flex flex-col justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-7">
            <div>
              <header className="flex items-center gap-2 h-10 border-b border-ink-100/70 pb-2">
                <button
                  onClick={() => setPanel('player')}
                  className="p-2 -ml-2 rounded-full hover:bg-white text-ink-700"
                  aria-label="Quay lại"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="font-serif font-bold text-base text-ink-950">Tốc độ đọc</h3>
              </header>

              <div className="grid grid-cols-4 gap-2.5 mt-5">
                {SPEEDS.map((rate) => {
                  const isSelected = Math.abs(audioState.playbackRate - rate) < 0.01;
                  return (
                    <button
                      key={rate}
                      onClick={() => {
                        setAudioSpeed(rate);
                        setPanel('player');
                      }}
                      className={`py-3.5 rounded-2xl font-mono text-sm font-bold transition-all active:scale-95 border ${
                        isSelected
                          ? 'bg-lily-700 text-white border-lily-700 shadow-soft'
                          : 'bg-white hover:bg-cream-50 border-ink-100 text-ink-800 shadow-2xs'
                      }`}
                    >
                      {rate.toFixed( rate % 1 === 0 ? 0 : (rate * 10) % 1 === 0 ? 1 : 2 )}×
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setPanel('player')}
              className="mt-4 w-full py-3 rounded-2xl bg-ink-950 text-white text-xs font-semibold shadow-soft active:scale-98 transition-transform"
            >
              Đóng
            </button>
          </div>
        )}

        {/* ================= PANEL 4: SLEEP TIMER ================= */}
        {panel === 'timer' && (
          <div className="flex-1 flex flex-col justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-7">
            <div>
              <header className="flex items-center gap-2 h-10 border-b border-ink-100/70 pb-2">
                <button
                  onClick={() => setPanel('player')}
                  className="p-2 -ml-2 rounded-full hover:bg-white text-ink-700"
                  aria-label="Quay lại"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="font-serif font-bold text-base text-ink-950">Hẹn giờ dừng phát</h3>
              </header>

              <div className="space-y-2 mt-4">
                {TIMER_OPTIONS.map((opt) => {
                  const isSelected = audioState.sleepTimer === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() => {
                        setAudioSleepTimer(opt.value);
                        setPanel('player');
                      }}
                      className={`w-full p-3.5 rounded-2xl border text-left text-sm font-semibold transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-lily-500 bg-lily-50 text-lily-950 shadow-xs'
                          : 'border-ink-100 bg-white hover:bg-cream-50 text-ink-800 shadow-2xs'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-lily-600 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setPanel('player')}
              className="mt-4 w-full py-3 rounded-2xl bg-ink-950 text-white text-xs font-semibold shadow-soft active:scale-98 transition-transform"
            >
              Đóng
            </button>
          </div>
        )}

        {/* ================= PANEL 5: SETTINGS ================= */}
        {panel === 'settings' && (
          <div className="flex-1 flex flex-col justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-7">
            <div>
              <header className="flex items-center gap-2 h-10 border-b border-ink-100/70 pb-2">
                <button
                  onClick={() => setPanel('player')}
                  className="p-2 -ml-2 rounded-full hover:bg-white text-ink-700"
                  aria-label="Quay lại"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="font-serif font-bold text-base text-ink-950">Tùy chọn nghe</h3>
              </header>

              <div className="mt-4 divide-y divide-ink-100 rounded-2xl bg-white border border-ink-100 px-4 shadow-2xs">
                <label className="py-4 flex items-center justify-between text-sm cursor-pointer select-none">
                  <div>
                    <span className="font-medium text-ink-900 block">Đọc tên chương trước</span>
                    <span className="text-xs text-ink-400 block mt-0.5">Đọc tiêu đề chương trước khi vào nội dung</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={audioState.readChapterTitle}
                    onChange={(e) => setAudioReadTitle(e.target.checked)}
                    className="accent-lily-700 w-4 h-4 rounded"
                  />
                </label>

                <label className="py-4 flex items-center justify-between text-sm cursor-pointer select-none">
                  <div>
                    <span className="font-medium text-ink-900 block">Tự động phát chương tiếp theo</span>
                    <span className="text-xs text-ink-400 block mt-0.5">Tiếp tục đọc chương sau khi hoàn thành</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={audioState.autoNextChapter}
                    onChange={(e) => setAudioAutoNext(e.target.checked)}
                    className="accent-lily-700 w-4 h-4 rounded"
                  />
                </label>
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-cream-100/80 border border-cream-200/80 text-xs text-ink-600 flex gap-2.5 leading-relaxed">
                <Timer className="w-4 h-4 text-ink-500 shrink-0 mt-0.5" />
                <p>Nội dung truyện và giọng đọc được bảo vệ riêng tư 100% trên thiết bị của bạn.</p>
              </div>
            </div>

            <button
              onClick={() => setPanel('player')}
              className="mt-4 w-full py-3 rounded-2xl bg-ink-950 text-white text-xs font-semibold shadow-soft active:scale-98 transition-transform"
            >
              Đóng
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
