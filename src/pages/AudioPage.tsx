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
  Search,
  ListMusic,
  Clock,
  Waves,
  ArrowLeft,
  HardDrive
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useReader } from '../context/ReaderContext';
import { BookCover } from '../components/common/BookCover';
import { PlanStatus } from '../components/common/PlanStatus';
import { LocalBadge, CloudBadge, FormatBadge } from '../components/common/Badges';
import { getVoicePresentation } from '../audio-engine/voicePresentation';
import { Book } from '../types';

const FALLBACK_VOICES = [
  { id: 'ngochuyen', name: 'Lily Huyền', description: 'Trong trẻo · truyền cảm', modelSizeMB: 48.5, isInstalled: false, engineType: 'nghi-tts' },
  { id: 'ngochuyennew', name: 'Lily Huyền 2', description: 'Mượt mà · giàu cảm xúc', modelSizeMB: 48.5, isInstalled: false, engineType: 'nghi-tts' },
  { id: 'maiphuong', name: 'Lily Mai', description: 'Dịu dàng · ấm áp', modelSizeMB: 44.0, isInstalled: false, engineType: 'nghi-tts' },
  { id: 'minhkhang', name: 'Lily Khang', description: 'Nam trầm · điềm tĩnh', modelSizeMB: 46.2, isInstalled: false, engineType: 'nghi-tts' },
  { id: 'manhdung', name: 'Lily Dũng', description: 'Nam ấm · chững chạc', modelSizeMB: 46.5, isInstalled: false, engineType: 'nghi-tts' },
  { id: 'minhthu', name: 'Lily Thu', description: 'Thanh thoát · tự nhiên', modelSizeMB: 44.8, isInstalled: false, engineType: 'nghi-tts' },
  { id: 'vietthao3886', name: 'Lily Thảo', description: 'Kể chuyện · sâu lắng', modelSizeMB: 47.0, isInstalled: false, engineType: 'nghi-tts' },
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
    chapterList,
    jumpToChapter,
    downloadVoiceModel,
    toggleDevAudioAccess,
    nextChapter,
    prevChapter
  } = useReader();

  // If user explicitly chooses to view book list or listening player
  const [viewMode, setViewMode] = useState<'picker' | 'player'>('player');
  const [chapterSearch, setChapterSearch] = useState('');

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

  // Filtered chapters for the scrollable list
  const filteredChapters = useMemo(() => {
    if (!chapterSearch.trim()) return chapterList;
    const q = chapterSearch.toLowerCase().trim();
    return chapterList.filter(c => 
      c.title.toLowerCase().includes(q) || 
      `chương ${c.index}`.includes(q) || 
      String(c.index) === q
    );
  }, [chapterList, chapterSearch]);

  // Handle selecting a book from the list
  const handleSelectBookToListen = (book: Book) => {
    navigateTo('audio', book.id);
    setViewMode('player');
  };

  return (
    <div className="audio-lounge max-w-7xl mx-auto py-2 sm:py-4 pb-20 space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* ================= TOP HEADER ================= */}
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
            Phòng nghe sách nói chất lượng cao · Giọng đọc AI tiếng Việt xử lý offline trực tiếp trên máy.
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {viewMode === 'player' && books.length > 1 && (
            <button
              onClick={() => setViewMode('picker')}
              className="px-3.5 py-2 rounded-xl bg-white border border-ink-200 text-xs font-semibold text-ink-800 hover:bg-cream-50 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <ListMusic className="w-4 h-4 text-lavender-700" />
              <span>Đổi truyện ({books.length})</span>
            </button>
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

      {/* ================= LOCKED NOTICE FOR FREE USERS ================= */}
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

      {/* ================= VIEW 1: BOOK SELECTION SCREEN (DANH SÁCH TRUYỆN MUỐN NGHE) ================= */}
      {viewMode === 'picker' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="font-serif font-bold text-lg sm:text-xl text-ink-950 flex items-center gap-2">
                <span>Chọn truyện bạn muốn nghe</span>
                <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-lavender-100 text-lavender-800">
                  {books.length} tác phẩm
                </span>
              </h2>
              <p className="text-xs text-ink-500">
                Chạm vào cuốn truyện để bắt đầu thưởng thức giọng đọc AI tiếng Việt.
              </p>
            </div>

            {currentBook && (
              <button
                onClick={() => setViewMode('player')}
                className="text-xs font-semibold text-lavender-800 hover:underline flex items-center gap-1"
              >
                <span>Quay lại trình phát</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {books.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {books.map((b) => {
                const isSelected = currentBook?.id === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBookToListen(b)}
                    className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between group shadow-soft hover:shadow-card ${
                      isSelected
                        ? 'border-lavender-500 bg-gradient-to-br from-lavender-50/70 via-white to-lavender-50/40 ring-2 ring-lavender-500/20'
                        : 'border-ink-100 bg-white hover:border-ink-200'
                    }`}
                  >
                    <div className="flex gap-4 items-start">
                      <div className="shrink-0 drop-shadow-md group-hover:scale-105 transition-transform">
                        <BookCover
                          title={b.title}
                          author={b.author}
                          coverUrl={b.coverUrl}
                          coverColor={b.coverColor}
                          format={b.fileFormat}
                          size="md"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <FormatBadge format={b.fileFormat} />
                          {isSelected && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lavender-700 text-white">
                              Đang mở
                            </span>
                          )}
                        </div>

                        <h3 className="font-serif font-bold text-base text-ink-950 group-hover:text-lavender-900 transition-colors line-clamp-2 leading-snug">
                          {b.title}
                        </h3>

                        <p className="text-xs text-ink-600 italic truncate font-serif">
                          {b.author}
                        </p>

                        <div className="text-[11px] text-ink-500 pt-1">
                          <span>{b.totalChapters || 1} chương</span>
                          {b.progressPercent > 0 && (
                            <span> · Đã đọc {b.progressPercent}%</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-ink-100/70 flex items-center justify-between">
                      <span className="text-[11px] text-ink-500 truncate max-w-[160px]">
                        {b.currentChapterTitle || `Chương ${b.currentChapter || 1}`}
                      </span>

                      <button
                        type="button"
                        className="px-3.5 py-1.5 rounded-xl bg-ink-950 group-hover:bg-lavender-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Headphones className="w-3.5 h-3.5" />
                        <span>{isSelected && audioState.isPlaying ? 'Đang phát' : 'Nghe ngay'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 rounded-3xl bg-white border border-ink-100 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-ink-400 mx-auto" />
              <h3 className="font-serif font-bold text-base text-ink-950">Chưa có truyện trong thư viện</h3>
              <p className="text-xs text-ink-500">Hãy thêm truyện để bắt đầu nghe sách nói.</p>
              <button
                onClick={() => navigateTo('add-book')}
                className="px-5 py-2.5 rounded-2xl bg-ink-950 text-white text-xs font-semibold shadow-soft"
              >
                + Thêm truyện mới
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW 2: AUDIOBOOK PLAYER & SCROLLABLE CHAPTER LIST ================= */}
      {viewMode === 'player' && currentBook && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start animate-in fade-in duration-200">
          
          {/* ----------------- LEFT 7 COLS: HERO AUDIOBOOK PLAYER ----------------- */}
          <div className="lg:col-span-7 space-y-5">
            <div className="relative overflow-hidden bg-gradient-to-b from-white via-cream-50/40 to-lavender-50/30 border border-ink-100/90 rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
              
              {/* Back to Book List Button */}
              <div className="flex items-center justify-between border-b border-ink-100/60 pb-3">
                <button
                  onClick={() => setViewMode('picker')}
                  className="text-xs font-semibold text-ink-600 hover:text-lavender-900 transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Danh sách truyện ({books.length})</span>
                </button>

                <div className="flex items-center gap-2">
                  <FormatBadge format={currentBook.fileFormat} />
                  <span className="text-[11px] font-mono text-ink-500">
                    {chapterList.length || currentBook.totalChapters || 1} chương
                  </span>
                </div>
              </div>

              {/* ARTWORK STAGE (3D Book Cover & Vinyl Rotation) */}
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-7 items-center justify-center text-center sm:text-left">
                
                {/* 3D Elevated Book Cover with Vinyl Disc Accent */}
                <div className="relative group shrink-0">
                  <div 
                    className={`absolute -right-4 top-1/2 -translate-y-1/2 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-ink-950 border-4 border-ink-800 shadow-xl flex items-center justify-center transition-all duration-700 ${
                      audioState.isPlaying ? 'translate-x-4 rotate-180 animate-spin-slow' : 'translate-x-0'
                    }`}
                    style={{ animationDuration: '8s' }}
                  >
                    <div className="w-10 h-10 rounded-full bg-lavender-200 border-2 border-ink-950 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-ink-950" />
                    </div>
                  </div>

                  <div className="relative z-10 drop-shadow-[0_16px_28px_rgba(40,20,30,0.22)] transition-transform group-hover:scale-[1.02]">
                    <BookCover
                      title={currentBook.title}
                      author={currentBook.author}
                      coverUrl={currentBook.coverUrl}
                      coverColor={currentBook.coverColor}
                      format={currentBook.fileFormat}
                      size="lg"
                    />
                  </div>
                </div>

                {/* Audiobook Track Info */}
                <div className="space-y-2 min-w-0 flex-1 z-10">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lavender-100/90 text-lavender-800 text-[11px] font-bold tracking-wide uppercase">
                      <Waves className="w-3.5 h-3.5" />
                      <span>{activeVoiceName}</span>
                    </span>

                    {audioState.isPlaying && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Đang đọc</span>
                      </span>
                    )}
                  </div>

                  <h2 className="font-serif font-bold text-xl sm:text-2xl text-ink-950 leading-snug line-clamp-2">
                    {currentChapterTitle || `Chương ${currentChapterIndex}`}
                  </h2>

                  <p className="font-serif italic text-xs sm:text-sm text-ink-600 truncate">
                    {currentBook.title} · {currentBook.author}
                  </p>

                  {/* Synthesis Status Indicator */}
                  {audioState.status === 'SYNTHESIZING' && (
                    <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 text-xs text-lavender-700 font-medium animate-pulse">
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-lavender-400 border-t-lavender-700 animate-spin" />
                      <span>Đang xử lý âm thanh AI…</span>
                    </div>
                  )}
                </div>
              </div>

              {/* TIMELINE & SCRUBBER */}
              <div className="space-y-2 pt-1 z-10 relative">
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

                <div className="flex items-center justify-between text-xs text-ink-500 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-ink-400" />
                    <span>Đoạn {audioState.currentChunkIndex + 1} / {Math.max(1, audioState.totalChunks)}</span>
                  </span>
                  <span className="font-bold text-lavender-900">{progressPercent}% chương</span>
                </div>
              </div>

              {/* AUDIOBOOK TRANSPORT CONTROLS */}
              <div className="flex items-center justify-center gap-4 sm:gap-6 py-1 z-10 relative">
                <button
                  onClick={prevChapter}
                  disabled={!isEntitled}
                  className="p-2.5 sm:p-3 rounded-full hover:bg-cream-100 text-ink-600 hover:text-ink-950 disabled:opacity-30 transition-colors"
                  title="Chương trước"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={() => skip15Sec('backward')}
                  disabled={!isEntitled || audioState.currentChunkIndex <= 0}
                  className="p-3 sm:p-3.5 rounded-2xl bg-ink-50 hover:bg-cream-100 border border-ink-100 text-ink-700 hover:text-ink-950 disabled:opacity-30 transition-all flex flex-col items-center group active:scale-95 shadow-xs"
                  title="Tua lại 15 giây"
                >
                  <RotateCcw className="w-5 h-5 group-hover:-rotate-45 transition-transform" />
                  <span className="text-[10px] font-bold font-mono mt-0.5">-15s</span>
                </button>

                <button
                  onClick={togglePlayAudio}
                  disabled={!isEntitled}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-lavender-600 via-lavender-700 to-ink-950 text-white flex items-center justify-center shadow-[0_12px_32px_rgba(112,66,134,0.38)] hover:shadow-[0_16px_36px_rgba(112,66,134,0.5)] active:scale-95 transition-all hover:scale-105 disabled:opacity-40 group"
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

                <button
                  onClick={() => skip15Sec('forward')}
                  disabled={!isEntitled || audioState.currentChunkIndex >= audioState.totalChunks - 1}
                  className="p-3 sm:p-3.5 rounded-2xl bg-ink-50 hover:bg-cream-100 border border-ink-100 text-ink-700 hover:text-ink-950 disabled:opacity-30 transition-all flex flex-col items-center group active:scale-95 shadow-xs"
                  title="Tua tới 30 giây"
                >
                  <RotateCw className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                  <span className="text-[10px] font-bold font-mono mt-0.5">+30s</span>
                </button>

                <button
                  onClick={nextChapter}
                  disabled={!isEntitled}
                  className="p-2.5 sm:p-3 rounded-full hover:bg-cream-100 text-ink-600 hover:text-ink-950 disabled:opacity-30 transition-colors"
                  title="Chương tiếp theo"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* COMPACT VOICE SELECTOR (TINH GỌN THEO YÊU CẦU) */}
              <div className="pt-3 border-t border-ink-100/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-ink-800">
                  <span className="flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-lavender-700" />
                    <span>Giọng đọc Lily:</span>
                  </span>
                  <span className="text-[11px] text-ink-500 font-normal">Offline 100%</span>
                </div>

                {/* Compact Horizontal Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {voices.map((v) => {
                    const isSelected = audioState.voice === v.id;
                    const presentation = getVoicePresentation(v.id, v);

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => isEntitled && setAudioVoice(v.id as any)}
                        disabled={!isEntitled}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-lavender-700 text-white shadow-xs'
                            : 'bg-ink-100/80 hover:bg-lavender-100 text-ink-800 hover:text-lavender-900'
                        } disabled:opacity-40`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{presentation.name}</span>
                        {!v.isInstalled && (
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadVoiceModel(v.id);
                            }}
                            title="Tải model về máy"
                            className="text-[9px] px-1 py-0.2 rounded bg-lavender-200/80 text-lavender-950 font-bold"
                          >
                            Tải
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AUDIOBOOK SETTINGS TOOLBAR (Speed & Sleep Timer) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-ink-100/70">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-ink-800">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-lavender-700" />
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
                        className={`px-2 py-0.5 rounded-lg text-xs font-mono font-semibold transition-all ${
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

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-ink-800">
                    <span className="flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-lavender-700" />
                      <span>Hẹn giờ tắt</span>
                    </span>
                    <span className="font-mono text-lavender-900 font-bold">
                      {audioState.sleepTimer ? `${audioState.sleepTimer}p` : 'Tắt'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {timers.map((t) => (
                      <button
                        key={t}
                        onClick={() => setAudioSleepTimer(audioState.sleepTimer === t ? null : t)}
                        disabled={!isEntitled}
                        className={`px-2 py-0.5 rounded-lg text-xs font-mono font-semibold transition-all ${
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

              {/* Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-ink-100/50 text-[11px] text-ink-600">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={audioState.readChapterTitle}
                    onChange={(e) => setAudioReadTitle(e.target.checked)}
                    disabled={!isEntitled}
                    className="w-3.5 h-3.5 rounded accent-lavender-700"
                  />
                  <span>Đọc tên chương trước</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={audioState.autoNextChapter}
                    onChange={(e) => setAudioAutoNext(e.target.checked)}
                    disabled={!isEntitled}
                    className="w-3.5 h-3.5 rounded accent-lavender-700"
                  />
                  <span>Tự chuyển chương sau</span>
                </label>
              </div>

            </div>
          </div>

          {/* ----------------- RIGHT 5 COLS: MỤC DANH SÁCH CHƯƠNG DẠNG CUỘN ----------------- */}
          <div className="lg:col-span-5 bg-white border border-ink-100 rounded-3xl p-5 sm:p-6 shadow-card space-y-4">
            
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-lavender-100 text-lavender-700 flex items-center justify-center shrink-0">
                  <ListMusic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-ink-950">
                    Danh sách chương
                  </h3>
                  <span className="text-[11px] text-ink-500 block font-mono">
                    {chapterList.length || currentBook.totalChapters || 1} chương · Chọn để nghe ngay
                  </span>
                </div>
              </div>
            </div>

            {/* Chapter Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                placeholder="Tìm chương nhanh..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-ink-50 border border-ink-200/80 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-lavender-500/20"
              />
            </div>

            {/* SCROLLABLE CHAPTER LIST CONTAINER */}
            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-ink-200">
              {filteredChapters.length > 0 ? (
                filteredChapters.map((c) => {
                  const isCurrent = c.index === currentChapterIndex;
                  return (
                    <div
                      key={c.index}
                      onClick={() => jumpToChapter(c.index)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                        isCurrent
                          ? 'border-lavender-500 bg-gradient-to-r from-lavender-100/90 via-lavender-50 to-white shadow-xs font-semibold text-lavender-950 ring-1 ring-lavender-400/40'
                          : 'border-transparent hover:border-ink-200 bg-ink-50/50 hover:bg-cream-50 text-ink-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Playing Wave Indicator or Chapter Number */}
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs ${
                          isCurrent 
                            ? 'bg-lavender-700 text-white font-bold' 
                            : 'bg-white border border-ink-200 text-ink-500 group-hover:border-lavender-300'
                        }`}>
                          {isCurrent && audioState.isPlaying ? (
                            <Waves className="w-3.5 h-3.5 animate-pulse" />
                          ) : (
                            c.index
                          )}
                        </div>

                        <div className="min-w-0">
                          <span className={`block text-xs truncate ${isCurrent ? 'font-bold text-lavender-950' : 'text-ink-900'}`}>
                            {c.title}
                          </span>
                          <span className="block text-[10px] text-ink-400 font-mono">
                            {c.wordCount ? `${c.wordCount} chữ` : 'Đầy đủ nội dung'}
                          </span>
                        </div>
                      </div>

                      {/* Right Playing Indicator */}
                      {isCurrent ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lavender-700 text-white shrink-0">
                          {audioState.isPlaying ? 'Đang phát' : 'Đang chọn'}
                        </span>
                      ) : (
                        <Play className="w-3.5 h-3.5 text-ink-300 group-hover:text-lavender-700 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-ink-400">
                  Không tìm thấy chương nào khớp với "{chapterSearch}"
                </div>
              )}
            </div>

            <div className="p-2.5 bg-cream-100/70 border border-cream-200 rounded-xl text-[11px] text-ink-600 flex items-center gap-2">
              <Headphones className="w-3.5 h-3.5 text-lavender-700 shrink-0" />
              <span>Chạm vào bất kỳ chương nào để chuyển và nghe ngay lập tức.</span>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
