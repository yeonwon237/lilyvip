import React, { useState, useMemo } from 'react';
import { 
  Headphones, 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Sparkles, 
  Mic, 
  Gauge, 
  Moon, 
  BookOpen, 
  Volume2,
  Lock,
  Download,
  Check,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Radio,
  Sliders,
  CheckCircle2,
  ListMusic,
  Clock,
  Waves
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useReader } from '../context/ReaderContext';
import { BookCover } from '../components/common/BookCover';
import { PlanStatus } from '../components/common/PlanStatus';
import { getVoicePresentation } from '../audio-engine/voicePresentation';

const FALLBACK_VOICES = [
  { id: 'ngochuyen', name: 'Lily Huyền', description: 'Trong trẻo · truyền cảm', sampleText: '“Sau khi xuyên không, nàng phát hiện mình đã trở thành đích nữ của Thừa tướng phủ…”', modelSizeMB: 48.5, isInstalled: false, engineType: 'nghi-tts' },
  { id: 'ngochuyennew', name: 'Lily Huyền 2', description: 'Mượt mà · giàu cảm xúc', sampleText: '“Ánh trăng chiếu rọi khắp sân viện, tiếng gió thoảng qua mang theo hương hoa nhài…”', modelSizeMB: 48.5, isInstalled: false, engineType: 'nghi-tts' },
  { id: 'maiphuong', name: 'Lily Mai', description: 'Dịu dàng · ấm áp', sampleText: '“Dưới gốc cây lê nhỏ ven sông, hai người cùng ngồi ngắm hoàng hôn buông xuống…”', modelSizeMB: 44.0, isInstalled: false, engineType: 'nghi-tts' },
  { id: 'minhkhang', name: 'Lily Khang', description: 'Nam trầm · điềm tĩnh', sampleText: '“Con đường phía trước dẫu còn nhiều chông gai nhưng ý chí vẫn luôn kiên định…”', modelSizeMB: 46.2, isInstalled: false, engineType: 'nghi-tts' },
  { id: 'manhdung', name: 'Lily Dũng', description: 'Nam ấm · chững chạc', sampleText: '“Tiếng tiêu vang vọng giữa thảo nguyên bao la trong đêm trăng sáng…”', modelSizeMB: 46.5, isInstalled: false, engineType: 'nghi-tts' },
  { id: 'minhthu', name: 'Lily Thu', description: 'Thanh thoát · tự nhiên', sampleText: '“Gió sớm mai thổi nhẹ làm lay động những cánh hoa còn đọng sương đêm…”', modelSizeMB: 44.8, isInstalled: false, engineType: 'nghi-tts' },
  { id: 'vietthao3886', name: 'Lily Thảo', description: 'Kể chuyện · sâu lắng', sampleText: '“Kính thưa quý vị, câu chuyện ly kỳ này bắt đầu từ một buổi chiều mưa gió…”', modelSizeMB: 47.0, isInstalled: false, engineType: 'nghi-tts' },
];

export const AudioPage: React.FC = () => {
  const { currentBook, books, user, canUseFeature, openUpgradeModal, navigateTo } = useApp();
  const { 
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
    downloadVoiceModel,
    toggleDevAudioAccess,
    nextChapter,
    prevChapter
  } = useReader();

  const isEntitled = canUseFeature('audio') || audioAccess.enabled;
  const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const timers = [15, 30, 45, 60];

  const voices = useMemo(() => {
    const neural = availableVoices.filter(v => v.engineType !== 'system-speech');
    return neural.length > 0 ? neural : FALLBACK_VOICES as any[];
  }, [availableVoices]);

  const activeVoiceObj = voices.find(v => v.id === audioState.voice) || voices[1] || voices[0];
  const activeVoiceName = activeVoiceObj?.name || 'Lily Huyền 2';
  const progressPercent = Math.max(0, Math.min(100, audioState.chunkProgressPercent));

  return (
    <div className="audio-lounge max-w-7xl mx-auto py-2 sm:py-4 pb-20 space-y-6 sm:space-y-8">
      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100/70 pb-4 sm:pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif font-bold text-2xl sm:text-3xl md:text-4xl text-ink-950 tracking-tight flex items-center gap-2.5">
              <Headphones className="w-7 h-7 text-lavender-700 shrink-0" />
              <span>Sách nói & Giọng đọc</span>
            </h1>
            <PlanStatus tier={user.tier} size="sm" />
          </div>
          <p className="text-xs sm:text-sm text-ink-600 mt-1 leading-relaxed">
            Phòng nghe sách nói chất lượng cao · Giọng đọc AI tiếng Việt đọc offline ngay trên máy.
          </p>
        </div>

        {/* Book Selector Dropdown & Action */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {books.length > 1 && (
            <select
              value={currentBook?.id || ''}
              onChange={(e) => navigateTo('reader', e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-white border border-ink-200 text-xs font-medium text-ink-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-lavender-500/20"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  📖 {b.title}
                </option>
              ))}
            </select>
          )}

          {!isEntitled && (
            <button
              onClick={() => openUpgradeModal('Audio Pass')}
              className="px-4 sm:px-5 py-2 rounded-xl sm:rounded-2xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs sm:text-sm font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105"
            >
              <Headphones className="w-4 h-4" />
              <span>Kích hoạt Audio Pass</span>
            </button>
          )}
        </div>
      </div>

      {/* LOCKED NOTICE FOR FREE USERS */}
      {!isEntitled && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-lavender-50 via-white to-lavender-50 border border-lavender-200 shadow-soft text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-lavender-100 text-lavender-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-lavender-950">
            Tính năng Sách nói AI đang ở trạng thái khóa
          </h3>
          <p className="text-xs sm:text-sm text-ink-600 max-w-lg mx-auto leading-relaxed">
            Bạn có thể kích hoạt <strong>Audio Pass</strong> để nghe đọc mọi truyện trong thư viện hoặc nâng cấp <strong>Lily VIP</strong> để sở hữu trọn bộ Cloud Storage và Audio.
          </p>
          <div className="flex justify-center gap-3 pt-1">
            <button
              onClick={() => openUpgradeModal('Lily Audio Pass')}
              className="px-6 py-2.5 rounded-2xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-soft"
            >
              Tìm hiểu Audio Pass
            </button>

            {typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV) && (
              <button
                onClick={() => toggleDevAudioAccess(true)}
                className="px-4 py-2.5 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold hover:bg-amber-100"
              >
                🛠️ Bật Audio DEV Mode
              </button>
            )}
          </div>
        </div>
      )}

      {/* MAIN AUDIOBOOK STUDIO LAYOUT (7 COLS PLAYER / 5 COLS VOICES) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* ================= LEFT COLUMN: HERO AUDIOBOOK PLAYER ================= */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative overflow-hidden bg-gradient-to-b from-white via-cream-50/40 to-lavender-50/30 border border-ink-100/90 rounded-3xl p-6 sm:p-8 md:p-10 shadow-card space-y-7">
            
            {/* Ambient Background Glow when Playing */}
            {audioState.isPlaying && (
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-lavender-400/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
            )}

            {/* ARTWORK STAGE (Apple Books / Vinyl Aesthetic) */}
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center justify-center text-center sm:text-left">
              
              {/* 3D Elevated Book Cover with Vinyl Disc Accent */}
              <div className="relative group shrink-0">
                {/* Vinyl Record Behind Book */}
                <div 
                  className={`absolute -right-5 top-1/2 -translate-y-1/2 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-ink-950 border-4 border-ink-800 shadow-xl flex items-center justify-center transition-all duration-700 ${
                    audioState.isPlaying ? 'translate-x-4 rotate-180 animate-spin-slow' : 'translate-x-0'
                  }`}
                  style={{ animationDuration: '8s' }}
                >
                  <div className="w-10 h-10 rounded-full bg-lavender-200 border-2 border-ink-950 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-ink-950" />
                  </div>
                </div>

                {/* Main 3D Book Cover */}
                <div className="relative z-10 drop-shadow-[0_16px_28px_rgba(40,20,30,0.22)] transition-transform group-hover:scale-[1.02]">
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

              {/* Audiobook Track Info */}
              <div className="space-y-2 min-w-0 flex-1 z-10">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lavender-100/90 text-lavender-800 text-[11px] font-bold tracking-wide uppercase">
                    <Waves className="w-3.5 h-3.5" />
                    <span>Giọng {activeVoiceName}</span>
                  </span>

                  {audioState.isPlaying && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>Đang đọc</span>
                    </span>
                  )}
                </div>

                <h2 className="font-serif font-bold text-xl sm:text-2xl md:text-3xl text-ink-950 leading-snug line-clamp-2">
                  {currentChapterTitle || `Chương ${currentChapterIndex}`}
                </h2>

                <p className="font-serif italic text-sm text-ink-600 truncate">
                  {currentBook?.title || 'Chưa chọn tác phẩm'} · {currentBook?.author || 'Tác giả'}
                </p>

                {/* Synthesis Status Indicator */}
                {audioState.status === 'SYNTHESIZING' && (
                  <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 text-xs text-lavender-700 font-medium animate-pulse">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-lavender-400 border-t-lavender-700 animate-spin" />
                    <span>Đang chuẩn bị âm thanh giọng đọc…</span>
                  </div>
                )}
              </div>
            </div>

            {/* TIMELINE & SCRUBBER */}
            <div className="space-y-2 pt-2 z-10 relative">
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, audioState.totalChunks - 1)}
                  value={audioState.currentChunkIndex}
                  onChange={(e) => seekAudio(Number(e.target.value))}
                  disabled={!isEntitled}
                  className="w-full h-2 rounded-lg bg-ink-200 accent-lavender-700 cursor-pointer disabled:opacity-40 transition-all"
                  aria-label="Tiến độ nghe sách"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-ink-500 font-mono">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-ink-400" />
                  <span>Đoạn {audioState.currentChunkIndex + 1} / {Math.max(1, audioState.totalChunks)}</span>
                </span>
                <span className="font-bold text-lavender-900">{progressPercent}% chương</span>
              </div>
            </div>

            {/* AUDIOBOOK TRANSPORT CONTROLS (Play/Pause, -15s, +30s, Chapters) */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 py-2 z-10 relative">
              
              {/* Prev Chapter */}
              <button
                onClick={prevChapter}
                disabled={!isEntitled}
                className="p-2.5 sm:p-3 rounded-full hover:bg-cream-100 text-ink-600 hover:text-ink-950 disabled:opacity-30 transition-colors"
                title="Chương trước"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              {/* Skip Backward 15s */}
              <button
                onClick={() => skip15Sec('backward')}
                disabled={!isEntitled || audioState.currentChunkIndex <= 0}
                className="p-3 sm:p-3.5 rounded-2xl bg-ink-50 hover:bg-cream-100 border border-ink-100 text-ink-700 hover:text-ink-950 disabled:opacity-30 transition-all flex flex-col items-center group active:scale-95 shadow-xs"
                title="Tua lại 15 giây"
              >
                <RotateCcw className="w-5 h-5 group-hover:-rotate-45 transition-transform" />
                <span className="text-[10px] font-bold font-mono mt-0.5">-15s</span>
              </button>

              {/* Hero Play / Pause Big Button */}
              <button
                onClick={togglePlayAudio}
                disabled={!isEntitled}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-lavender-600 via-lavender-700 to-ink-950 text-white flex items-center justify-center shadow-[0_12px_32px_rgba(112,66,134,0.38)] hover:shadow-[0_16px_36px_rgba(112,66,134,0.5)] active:scale-95 transition-all hover:scale-105 disabled:opacity-40 group"
                aria-label={audioState.isPlaying ? 'Tạm dừng' : 'Phát sách nói'}
              >
                {audioState.status === 'SYNTHESIZING' ? (
                  <span className="w-7 h-7 rounded-full border-3 border-white/30 border-t-white animate-spin" />
                ) : audioState.isPlaying ? (
                  <Pause className="w-8 h-8 fill-white group-hover:scale-110 transition-transform" />
                ) : (
                  <Play className="w-8 h-8 fill-white ml-1 group-hover:scale-110 transition-transform" />
                )}
              </button>

              {/* Skip Forward 30s */}
              <button
                onClick={() => skip15Sec('forward')}
                disabled={!isEntitled || audioState.currentChunkIndex >= audioState.totalChunks - 1}
                className="p-3 sm:p-3.5 rounded-2xl bg-ink-50 hover:bg-cream-100 border border-ink-100 text-ink-700 hover:text-ink-950 disabled:opacity-30 transition-all flex flex-col items-center group active:scale-95 shadow-xs"
                title="Tua tới 30 giây"
              >
                <RotateCw className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                <span className="text-[10px] font-bold font-mono mt-0.5">+30s</span>
              </button>

              {/* Next Chapter */}
              <button
                onClick={nextChapter}
                disabled={!isEntitled}
                className="p-2.5 sm:p-3 rounded-full hover:bg-cream-100 text-ink-600 hover:text-ink-950 disabled:opacity-30 transition-colors"
                title="Chương tiếp theo"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* AUDIOBOOK SETTINGS TOOLBAR (Speed, Sleep Timer, Auto Next) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-ink-100/80 z-10 relative">
              
              {/* Playback Speed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-ink-800">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-lavender-700" />
                    <span>Tốc độ đọc</span>
                  </span>
                  <span className="font-mono text-lavender-900 font-bold">{audioState.playbackRate.toFixed(2)}x</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {speeds.map((s) => (
                    <button
                      key={s}
                      onClick={() => setAudioSpeed(s)}
                      disabled={!isEntitled}
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-semibold transition-all ${
                        audioState.playbackRate === s
                          ? 'bg-lavender-700 text-white shadow-xs'
                          : 'bg-ink-100/80 hover:bg-ink-200/80 text-ink-700'
                      } disabled:opacity-40`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Sleep Timer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-ink-800">
                  <span className="flex items-center gap-1.5">
                    <Moon className="w-4 h-4 text-lavender-700" />
                    <span>Hẹn giờ tắt</span>
                  </span>
                  <span className="font-mono text-lavender-900 font-bold">
                    {audioState.sleepTimer ? `${audioState.sleepTimer} phút` : 'Tắt'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {timers.map((t) => (
                    <button
                      key={t}
                      onClick={() => setAudioSleepTimer(audioState.sleepTimer === t ? null : t)}
                      disabled={!isEntitled}
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-semibold transition-all ${
                        audioState.sleepTimer === t
                          ? 'bg-lavender-700 text-white shadow-xs'
                          : 'bg-ink-100/80 hover:bg-ink-200/80 text-ink-700'
                      } disabled:opacity-40`}
                    >
                      {t}p
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions (Read Chapter / Auto Next Chapter Toggles) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-ink-100/60 text-xs text-ink-700">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={audioState.readChapterTitle}
                  onChange={(e) => setAudioReadTitle(e.target.checked)}
                  disabled={!isEntitled}
                  className="w-4 h-4 rounded accent-lavender-700 cursor-pointer"
                />
                <span>Đọc tiêu đề chương trước khi bắt đầu</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={audioState.autoNextChapter}
                  onChange={(e) => setAudioAutoNext(e.target.checked)}
                  disabled={!isEntitled}
                  className="w-4 h-4 rounded accent-lavender-700 cursor-pointer"
                />
                <span>Tự động phát tiếp chương sau</span>
              </label>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: AI VOICES CATALOG ================= */}
        <div className="lg:col-span-5 bg-white border border-ink-100 rounded-3xl p-6 sm:p-7 shadow-card space-y-5">
          <div className="flex items-center justify-between border-b border-ink-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-lavender-100 text-lavender-700 flex items-center justify-center shrink-0">
                <Mic className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-ink-950">
                  Bộ sưu tập Giọng đọc Lily
                </h3>
                <span className="text-[11px] text-ink-500 block">
                  Model thần kinh NghiTTS AI · Xử lý Offline 100%
                </span>
              </div>
            </div>
          </div>

          {/* Voice Cards List */}
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {voices.map((v) => {
              const isSelected = audioState.voice === v.id;
              const presentation = getVoicePresentation(v.id, v);

              return (
                <div
                  key={v.id}
                  onClick={() => isEntitled && setAudioVoice(v.id as any)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'border-lavender-500 bg-gradient-to-r from-lavender-50/80 via-white to-lavender-50/50 shadow-soft ring-1 ring-lavender-500/30'
                      : 'border-ink-200/80 bg-cream-50/40 hover:bg-cream-50 hover:border-ink-300'
                  } ${!isEntitled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {/* Avatar / Selected Checkmark */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected 
                          ? 'bg-lavender-700 text-white shadow-xs' 
                          : 'bg-ink-100 text-ink-600 group-hover:bg-lavender-100 group-hover:text-lavender-700'
                      }`}>
                        {isSelected ? <Check className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-ink-950">{presentation.name}</h4>
                          {isSelected && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lavender-700 text-white">
                              Đang phát
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-500 font-medium mt-0.5">
                          {presentation.description}
                        </p>
                      </div>
                    </div>

                    {/* Download / Ready Status Badge */}
                    <div className="shrink-0">
                      {v.isInstalled ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Sẵn sàng</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadVoiceModel(v.id);
                          }}
                          className="text-[10px] font-bold px-2.5 py-1 bg-lavender-100 hover:bg-lavender-200 text-lavender-800 rounded-xl flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>Tải ({v.modelSizeMB || 48} MB)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sample Reading Quote */}
                  {v.sampleText && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-white/80 border border-ink-100/70 text-xs text-ink-700 italic font-serif leading-relaxed">
                      {v.sampleText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-cream-100/80 border border-cream-200 rounded-2xl text-[11px] text-ink-600 flex items-start gap-2 leading-relaxed">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Mỗi giọng đọc chỉ cần tải về một lần. Sau khi tải, giọng đọc sẽ hoạt động hoàn toàn offline kể cả khi không có kết nối Internet.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
