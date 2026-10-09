import { t } from '../i18n';
import React, { useState, useMemo, useEffect } from 'react';
import { Headphones, Play, Pause, RotateCcw, RotateCw, SkipBack, SkipForward, Search, ListMusic, BookOpen, Download, Check, ChevronRight, ArrowLeft, Moon, Gauge, Sliders, X, Mic2, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useReader, isFreeVoiceId } from '../context/ReaderContext';
import { BookCover } from '../components/common/BookCover';
import { FormatBadge } from '../components/common/Badges';
import { getVoicePresentation } from '../audio-engine/voicePresentation';
import { Book } from '../types';

const SPEEDS = [0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
const TIMER_OPTIONS: Array<{ label: string; value: number | 'end_of_chapter' | null }> = [
  { get label() { return t("Tắt hẹn giờ"); }, value: null },
  { get label() { return t("10 phút"); }, value: 10 },
  { get label() { return t("20 phút"); }, value: 20 },
  { get label() { return t("30 phút"); }, value: 30 },
  { get label() { return t("45 phút"); }, value: 45 },
  { get label() { return t("60 phút"); }, value: 60 },
  { get label() { return t("Hết chương hiện tại"); }, value: 'end_of_chapter' },
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

export const AudioPage: React.FC = () => {
  const { currentBook, books, canUseFeature, navigateTo, openUpgradeModal } = useApp();
  const {
    audioState,
    audioAccess,
    availableVoices,
    downloadingVoices,
    togglePlayAudio,
    seekAudio,
    setAudioSpeed,
    setAudioVoice,
    setAudioSleepTimer,
    skip15Sec,
    currentChapterIndex,
    currentChapterTitle,
    chapterList,
    totalChapters,
    jumpToChapter,
    downloadVoiceModel,
    nextChapter,
    prevChapter
  } = useReader();

  const [viewMode, setViewMode] = useState<'player' | 'picker'>('player');
  const [chapterSearch, setChapterSearch] = useState('');
  const [activeModal, setActiveModal] = useState<'voices' | 'speed' | 'timer' | null>(null);
  const [recentAudioIds, setRecentAudioIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('LILY_RECENT_AUDIO_BOOKS_V1') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    if (!currentBook) return;
    setRecentAudioIds(ids => {
      if (ids[0] === currentBook.id) return ids;
      const next = [currentBook.id, ...ids.filter(id => id !== currentBook.id)].slice(0, 12);
      localStorage.setItem('LILY_RECENT_AUDIO_BOOKS_V1', JSON.stringify(next));
      return next;
    });
  }, [currentBook?.id]);
  const recentAudioBooks = recentAudioIds.map(id => books.find(book => book.id === id)).filter((book): book is Book => Boolean(book));

  const hasFullAudioAccess = canUseFeature('audio') || audioAccess.enabled;
  const isVoiceUnlocked = (voiceId?: string) => hasFullAudioAccess || isFreeVoiceId(voiceId);
  const isEntitled = isVoiceUnlocked(audioState.voice);

  const voices = useMemo(() => {
    const neural = availableVoices.filter(v => v.engineType !== 'system-speech');
    return neural.length > 0 ? neural : (FALLBACK_VOICES as any[]);
  }, [availableVoices]);

  const deviceVoices = availableVoices.filter(v => v.engineType === 'system-speech');
  const activeVoice = [...voices, ...deviceVoices].find(v => v.id === audioState.voice);
  const voiceCopy = getVoicePresentation(audioState.voice, activeVoice);
  const progressPercent = Math.max(0, Math.min(100, audioState.chunkProgressPercent));

  // Filtered chapters for the scrollable list
  const filteredChapters = useMemo(() => {
    if (!chapterSearch.trim()) return chapterList;
    const q = chapterSearch.toLowerCase().trim();
    return chapterList.filter(c =>
      c.title.toLowerCase().includes(q) ||
      t("chương {0}", [c.index]).includes(q) ||
      String(c.index) === q
    );
  }, [chapterList, chapterSearch]);

  const handleSelectBookToListen = (book: Book) => {
    setRecentAudioIds(ids => {
      const next = [book.id, ...ids.filter(id => id !== book.id)].slice(0, 12);
      localStorage.setItem('LILY_RECENT_AUDIO_BOOKS_V1', JSON.stringify(next));
      return next;
    });
    navigateTo('audio', book.id);
    setViewMode('player');
  };

  const getTimerDisplay = () => {
    if (audioState.sleepTimer === 'end_of_chapter') return t("Hết chương");
    if (typeof audioState.sleepTimer === 'number') {
      const remainingSecs = audioState.sleepTimerSecondsRemaining;
      if (remainingSecs !== undefined && remainingSecs !== null) {
        const mins = Math.max(1, Math.ceil(remainingSecs / 60));
        return t("{0} phút", [mins]);
      }
      return t("{0} phút", [audioState.sleepTimer]);
    }
    return t("Hẹn giờ");
  };

  return (
    <div className="bookshop-audio-page flat-page max-w-6xl mx-auto py-2 sm:py-4 pb-20 space-y-6 animate-in fade-in duration-200">

      {/* ================= TOP HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100/70 pb-4">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-ink-950 tracking-tight flex items-center gap-2.5">
            <Headphones className="w-6 h-6 text-lily-700 shrink-0" />
            <span>{t("Sách nói")}</span>
          </h1>
          <p className="mt-1 text-xs text-ink-500">{t("Nghe truyện ngay trên thiết bị.")}</p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {viewMode === 'player' && books.length > 1 && (
            <button
              onClick={() => setViewMode('picker')}
              className="px-3.5 py-2 rounded-2xl bg-white border border-ink-200/80 text-xs font-semibold text-ink-800 hover:bg-cream-50 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <ListMusic className="w-4 h-4 text-lily-700" />
              <span>{t("Đổi truyện (")}{books.length})</span>
            </button>
          )}

          {currentBook && (
            <button
              onClick={() => navigateTo('reader', currentBook.id)}
              className="px-3.5 py-2 rounded-2xl bg-ink-950 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center gap-1.5 transition-all"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t("Đọc truyện")}</span>
            </button>
          )}
        </div>
      </div>

      {recentAudioBooks.length > 0 && <section className="bookshop-audio-recent">
        <h2>{t("Nghe gần đây ")}<span>{recentAudioBooks.length}</span></h2>
        <div className="bookshop-audio-recent-list">{recentAudioBooks.map(book => <button type="button" key={book.id} className={currentBook?.id === book.id ? 'active' : ''} onClick={() => handleSelectBookToListen(book)}>
          <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} coverColor={book.coverColor} size="sm" />
          <span><b>{book.title}</b><small>{book.currentChapterTitle || t("Chương {0}", [book.currentChapter || 1])}</small></span><Play className="h-4 w-4" />
        </button>)}</div>
      </section>}

      {/* ================= VIEW 1: BOOK SELECTION ================= */}
      {viewMode === 'picker' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif font-bold text-lg text-ink-950">{t("Chọn truyện để nghe")}</h2>
              <p className="text-xs text-ink-500">{t("Chạm vào cuốn truyện bất kỳ để thưởng thức giọng đọc.")}</p>
            </div>

            {currentBook && (
              <button
                onClick={() => setViewMode('player')}
                className="text-xs font-semibold text-lily-800 hover:underline flex items-center gap-1"
              >
                <span>{t("Quay lại trình phát")}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {books.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((b) => {
                const isSelected = currentBook?.id === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBookToListen(b)}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between group shadow-card hover:shadow-modal ${
                      isSelected
                        ? 'border-lily-500 bg-gradient-to-br from-lily-50/70 via-white to-lily-50/40 ring-1 ring-lily-400/30'
                        : 'border-ink-100 bg-white hover:border-ink-200'
                    }`}
                  >
                    <div className="flex gap-3.5 items-start">
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

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <FormatBadge format={b.fileFormat} />
                          {isSelected && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lily-700 text-white">
                              {t("Đang nghe")}</span>
                          )}
                        </div>

                        <h3 className="font-serif font-bold text-sm text-ink-950 group-hover:text-lily-900 transition-colors line-clamp-2">
                          {b.title}
                        </h3>

                        <p className="text-xs text-ink-500 italic truncate font-serif">
                          {b.author}
                        </p>

                        <div className="text-[11px] text-ink-400 pt-0.5">
                          <span>{b.totalChapters || 1} {t(" chương")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-ink-100/70 flex items-center justify-between">
                      <span className="text-[11px] text-ink-500 truncate max-w-[160px]">
                        {b.currentChapterTitle || t("Chương {0}", [b.currentChapter || 1])}
                      </span>

                      <span className="text-xs font-semibold text-lily-800 group-hover:underline flex items-center gap-1">
                        <span>{isSelected && audioState.isPlaying ? t("Đang phát") : 'Nghe ngay'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 rounded-3xl bg-white border border-ink-100 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-ink-400 mx-auto" />
              <h3 className="font-serif font-bold text-base text-ink-950">{t("Chưa có truyện trong thư viện")}</h3>
              <p className="text-xs text-ink-500">{t("Hãy thêm truyện mới để bắt đầu nghe sách nói.")}</p>
              <button
                onClick={() => navigateTo('add-book')}
                className="px-5 py-2.5 rounded-2xl bg-ink-950 text-white text-xs font-semibold shadow-soft"
              >
                {t("+ Thêm truyện")}</button>
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW 2: AUDIOBOOK HERO PLAYER ================= */}
      {viewMode === 'player' && currentBook && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start animate-in fade-in duration-200">

          {/* LEFT 7 COLS: HERO AUDIOBOOK PLAYER */}
          <div className="bookshop-audio-player lg:col-span-7 bg-white border border-ink-100/90 rounded-3xl p-6 sm:p-8 shadow-card space-y-6">

            {/* Top Stage: Cover & Titles */}
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
              {/* Cover Art */}
              <div className="relative group shrink-0">
                <div className="absolute inset-x-4 inset-y-3 rounded-2xl bg-lily-400/20 blur-xl -z-10" />
                <div className="drop-shadow-[0_16px_28px_rgba(65,39,50,0.22)] group-hover:scale-102 transition-transform">
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

              {/* Title & Info */}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="lily-voice-label inline-flex items-center gap-1.5 text-xs font-medium">
                    <Mic2 className="w-3.5 h-3.5 text-lily-600" />
                    <span>{voiceCopy.name}</span>
                  </span>

                  {audioState.isPlaying && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>{t("Đang phát")}</span>
                    </span>
                  )}
                </div>

                <h2 className="font-serif font-bold text-xl sm:text-2xl text-ink-950 leading-snug line-clamp-2">
                  {currentChapterTitle || t("Chương {0}", [currentChapterIndex])}
                </h2>

                <p className="font-serif italic text-xs sm:text-sm text-ink-600 truncate">
                  {currentBook.title} · {currentBook.author}
                </p>

                {audioState.status === 'SYNTHESIZING' && (
                  <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 text-xs text-lily-800 font-medium animate-pulse">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-lily-400 border-t-lily-700 animate-spin" />
                    <span>{t("Đang chuẩn bị giọng đọc…")}</span>
                  </div>
                )}

                {!isEntitled && (
                  <div className="pt-1 flex items-center justify-center sm:justify-start gap-2 text-xs text-ink-600 font-medium">
                    <Lock className="w-3.5 h-3.5 text-ink-400" />
                    <span>{t("Giọng này yêu cầu VIP hoặc Audio Pass.")}</span>
                    <button type="button" onClick={() => setActiveModal('voices')} className="font-semibold text-lily-800 underline underline-offset-2">{t("Đổi giọng free")}</button>
                    <span className="text-ink-300">·</span>
                    <button type="button" onClick={() => openUpgradeModal(t("Nghe sách nói bằng Giọng Lily"))} className="font-semibold text-lily-800 underline underline-offset-2">{t("Nâng cấp")}</button>
                  </div>
                )}
              </div>
            </div>

            {/* Scrubber Timeline */}
            <div className="space-y-1.5 pt-2">
              <input
                type="range"
                min="0"
                max={Math.max(0, audioState.totalChunks - 1)}
                value={audioState.currentChunkIndex}
                onChange={(e) => seekAudio(Number(e.target.value))}
                disabled={!isEntitled}
                className="w-full h-2 rounded-lg bg-ink-100 accent-lily-700 cursor-pointer disabled:opacity-40"
                aria-label={t("Tiến độ nghe")}
              />

              <div className="flex items-center justify-between text-xs font-mono text-ink-400 select-none">
                <span>{t("Đoạn ")}{audioState.currentChunkIndex + 1} / {Math.max(1, audioState.totalChunks)}</span>
                <span className="font-semibold text-lily-900">{progressPercent}{t("% chương")}</span>
              </div>
            </div>

            {/* Primary Transport Controls */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 py-2">
              <button
                onClick={prevChapter}
                disabled={!isEntitled || currentChapterIndex <= 1}
                className="p-3 rounded-full hover:bg-cream-100 text-ink-600 hover:text-ink-950 disabled:opacity-30 transition-all active:scale-95"
                title={t("Chương trước")}
                aria-label={t("Chương trước")}
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={() => skip15Sec('backward')}
                disabled={!isEntitled || audioState.currentChunkIndex <= 0}
                className="p-3 rounded-2xl bg-ink-50 hover:bg-cream-100 border border-ink-100 text-ink-700 hover:text-ink-950 disabled:opacity-30 transition-all flex flex-col items-center active:scale-95 shadow-2xs"
                title={t("Tua lùi 15 giây")}
                aria-label={t("Tua lùi 15 giây")}
              >
                <RotateCcw className="w-5 h-5" />
                <span className="text-[10px] font-bold font-mono mt-0.5">-15s</span>
              </button>

              {/* PRIMARY PLAY/PAUSE */}
              <button
                onClick={isEntitled ? togglePlayAudio : () => openUpgradeModal(t("Nghe sách nói bằng Giọng Lily"))}
                className="bookshop-play-button w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-lily-800 hover:bg-lily-900 text-white flex items-center justify-center active:scale-95 transition-colors"
                aria-label={!isEntitled ? t("Nghe sách nói yêu cầu nâng cấp") : audioState.isPlaying ? t("Tạm dừng") : t("Phát")}
              >
                {!isEntitled ? (
                  <Lock className="w-6 h-6 text-white" />
                ) : audioState.status === 'SYNTHESIZING' ? (
                  <span className="w-6 h-6 rounded-full border-2.5 border-white/30 border-t-white animate-spin" />
                ) : audioState.isPlaying ? (
                  <Pause className="w-7 h-7 fill-white text-white" />
                ) : (
                  <Play className="w-7 h-7 fill-white text-white ml-1" />
                )}
              </button>

              <button
                onClick={() => skip15Sec('forward')}
                disabled={!isEntitled || audioState.currentChunkIndex >= audioState.totalChunks - 1}
                className="p-3 rounded-2xl bg-ink-50 hover:bg-cream-100 border border-ink-100 text-ink-700 hover:text-ink-950 disabled:opacity-30 transition-all flex flex-col items-center active:scale-95 shadow-2xs"
                title={t("Tua tới 30 giây")}
                aria-label={t("Tua tới 30 giây")}
              >
                <RotateCw className="w-5 h-5" />
                <span className="text-[10px] font-bold font-mono mt-0.5">+30s</span>
              </button>

              <button
                onClick={nextChapter}
                disabled={!isEntitled || currentChapterIndex >= totalChapters}
                className="p-3 rounded-full hover:bg-cream-100 text-ink-600 hover:text-ink-950 disabled:opacity-30 transition-all active:scale-95"
                title={t("Chương tiếp theo")}
                aria-label={t("Chương tiếp theo")}
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Secondary Action Pills */}
            <div className="pt-4 border-t border-ink-100/70 grid grid-cols-3 gap-2.5">
              <button
                onClick={() => setActiveModal('voices')}
                className="p-3 rounded-2xl bg-cream-50/70 hover:bg-white border border-ink-100/80 text-left transition-all active:scale-98 shadow-2xs min-w-0"
              >
                <span className="block text-[10px] text-ink-400 font-medium">{t("Giọng đọc")}</span>
                <span className="block text-xs font-semibold text-ink-900 truncate mt-0.5">
                  {voiceCopy.name}
                </span>
              </button>

              <button
                onClick={() => setActiveModal('speed')}
                className="p-3 rounded-2xl bg-cream-50/70 hover:bg-white border border-ink-100/80 text-center transition-all active:scale-98 shadow-2xs"
              >
                <span className="block text-[10px] text-ink-400 font-medium">{t("Tốc độ")}</span>
                <span className="block text-xs font-mono font-bold text-ink-900 mt-0.5">
                  {audioState.playbackRate.toFixed(1)}{t("×")}</span>
              </button>

              <button
                onClick={() => setActiveModal('timer')}
                className={`p-3 rounded-2xl border text-center transition-all active:scale-98 shadow-2xs truncate ${
                  audioState.sleepTimer
                    ? 'bg-lily-50 border-lily-300 text-lily-900 font-semibold'
                    : 'bg-cream-50/70 hover:bg-white border-ink-100/80 text-ink-800'
                }`}
              >
                <span className="block text-[10px] text-ink-400 font-medium">{t("Hẹn giờ")}</span>
                <span className="block text-xs font-medium truncate mt-0.5">
                  {getTimerDisplay()}
                </span>
              </button>
            </div>

          </div>

          {/* RIGHT 5 COLS: CHAPTER LIST */}
          <div className="bookshop-audio-chapters lg:col-span-5 bg-white border border-ink-100 rounded-3xl p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-lily-50 text-lily-700 flex items-center justify-center shrink-0">
                  <ListMusic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-ink-950">{t("Mục lục chương")}</h3>
                  <span className="text-[11px] text-ink-500 block font-mono">
                    {chapterList.length || totalChapters} {t(" chương · Chọn để nghe ngay")}</span>
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
                placeholder={t("Tìm tên chương...")}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-ink-50 border border-ink-200/70 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-lily-500/20"
              />
            </div>

            {/* Chapter Scroll Area */}
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-ink-200">
              {filteredChapters.length > 0 ? (
                filteredChapters.map((c) => {
                  const isCurrent = c.index === currentChapterIndex;
                  return (
                    <div
                      key={c.index}
                      onClick={() => jumpToChapter(c.index)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                        isCurrent
                          ? 'border-lily-500 bg-gradient-to-r from-lily-100/80 via-lily-50 to-white shadow-xs text-lily-950 ring-1 ring-lily-400/40'
                          : 'border-transparent hover:border-ink-200 bg-ink-50/40 hover:bg-cream-50 text-ink-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs ${
                          isCurrent
                            ? 'bg-lily-700 text-white font-bold'
                            : 'bg-white border border-ink-200 text-ink-500 group-hover:border-lily-300'
                        }`}>
                          {c.index}
                        </div>

                        <div className="min-w-0">
                          <span className={`block text-xs truncate ${isCurrent ? 'font-bold text-lily-950' : 'text-ink-900'}`}>
                            {c.title}
                          </span>
                          <span className="block text-[10px] text-ink-400 font-mono">
                            {c.wordCount ? t("{0} chữ", [c.wordCount]) : t("Đầy đủ nội dung")}
                          </span>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lily-700 text-white shrink-0">
                          {audioState.isPlaying ? t("Đang đọc") : t("Đang chọn")}
                        </span>
                      ) : (
                        <Play className="w-3.5 h-3.5 text-ink-300 group-hover:text-lily-700 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-ink-400">
                  {t("Không tìm thấy chương nào khớp với \"")}{chapterSearch}"
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ================= MODAL: VOICE PICKER ================= */}
      {activeModal === 'voices' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#FAF7F2] border border-ink-100 rounded-3xl p-6 max-w-md w-full shadow-modal space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-ink-100/70 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-ink-950">{t("Chọn giọng Lily")}</h3>
                <p className="text-xs text-ink-500">{t("Mỗi giọng chỉ tải một lần để nghe offline.")}</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-white text-ink-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-0.5">
              {voices.map((voice) => {
                const isSelected = audioState.voice === voice.id;
                const presentation = getVoicePresentation(voice.id, voice);
                const isDownloading = downloadingVoices[voice.id] !== undefined;
                const progressPct = downloadingVoices[voice.id] || 0;
                const unlocked = isVoiceUnlocked(voice.id);

                return (
                  <div
                    key={voice.id}
                    onClick={() => {
                      if (!unlocked) {
                        openUpgradeModal(t("Giọng đọc {0}", [presentation.name]));
                        return;
                      }
                      if (voice.isInstalled) {
                        setAudioVoice(voice.id);
                        setActiveModal(null);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-lily-500 bg-lily-50/80 shadow-xs ring-1 ring-lily-400/40'
                        : unlocked
                        ? 'border-ink-100 bg-white/80 hover:bg-white hover:border-ink-200'
                        : 'border-ink-100 bg-white/50 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-lily-600 bg-lily-600 text-white' : 'border-ink-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <strong className="flex items-center gap-1.5 text-sm font-semibold text-ink-950">
                          <span className="truncate">{presentation.name}</span>
                          {!unlocked && <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-lily-100 text-lily-800">VIP</span>}
                        </strong>
                        <span className="block text-xs text-ink-500 truncate">
                          {presentation.description}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {!unlocked ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink-50 text-ink-500 text-xs font-semibold">
                          <Lock className="w-3.5 h-3.5" />
                          <span>{t("Nâng cấp")}</span>
                        </span>
                      ) : isDownloading ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lily-50 border border-lily-200 text-xs font-semibold text-lily-900">
                          <span className="w-3 h-3 rounded-full border-2 border-lily-400 border-t-lily-700 animate-spin" />
                          <span>{progressPct}%</span>
                        </div>
                      ) : voice.isInstalled ? (
                        <span className="text-[11px] font-semibold text-emerald-700 px-2 py-0.5 rounded-md bg-emerald-50">
                          {t("Đã sẵn sàng")}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadVoiceModel(voice.id);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-lily-100 hover:bg-lily-200 text-lily-900 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{t("Tải giọng")}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {deviceVoices.length > 0 && (
                <div className="pt-2 border-t border-ink-100">
                  <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wider block mb-1.5">
                    {t("Giọng hệ thống")}</span>
                  <button
                    onClick={() => {
                      setAudioVoice(deviceVoices[0].id);
                      setActiveModal(null);
                    }}
                    className="w-full p-3.5 rounded-2xl bg-white/70 hover:bg-white border border-ink-100 text-left transition-all flex items-center justify-between"
                  >
                    <div>
                      <strong className="block text-sm font-semibold text-ink-900">{t("Giọng thiết bị")}</strong>
                      <span className="block text-xs text-ink-400 mt-0.5">{t("Giọng mặc định có sẵn trên máy")}</span>
                    </div>
                    {audioState.voice.startsWith('sys_') && (
                      <Check className="w-4 h-4 text-lily-600" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-2xl bg-ink-950 text-white text-xs font-semibold shadow-soft"
            >
              {t("Đóng")}</button>
          </div>
        </div>
      )}

      {/* ================= MODAL: SPEED PICKER ================= */}
      {activeModal === 'speed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#FAF7F2] border border-ink-100 rounded-3xl p-6 max-w-sm w-full shadow-modal space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-ink-100/70 pb-3">
              <h3 className="font-serif font-bold text-base text-ink-950">{t("Tốc độ đọc")}</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-white text-ink-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {SPEEDS.map((rate) => {
                const isSelected = Math.abs(audioState.playbackRate - rate) < 0.01;
                return (
                  <button
                    key={rate}
                    onClick={() => {
                      setAudioSpeed(rate);
                      setActiveModal(null);
                    }}
                    className={`py-3 rounded-2xl font-mono text-sm font-bold transition-all active:scale-95 border ${
                      isSelected
                        ? 'bg-lily-700 text-white border-lily-700 shadow-soft'
                        : 'bg-white hover:bg-cream-50 border-ink-100 text-ink-800'
                    }`}
                  >
                    {rate.toFixed( rate % 1 === 0 ? 0 : (rate * 10) % 1 === 0 ? 1 : 2 )}{t("×")}</button>
                );
              })}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-2xl bg-ink-950 text-white text-xs font-semibold shadow-soft"
            >
              {t("Đóng")}</button>
          </div>
        </div>
      )}

      {/* ================= MODAL: SLEEP TIMER ================= */}
      {activeModal === 'timer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-[#FAF7F2] border border-ink-100 rounded-3xl p-6 max-w-sm w-full shadow-modal space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-ink-100/70 pb-3">
              <h3 className="font-serif font-bold text-base text-ink-950">{t("Hẹn giờ dừng phát")}</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-full hover:bg-white text-ink-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {TIMER_OPTIONS.map((opt) => {
                const isSelected = audioState.sleepTimer === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() => {
                      setAudioSleepTimer(opt.value);
                      setActiveModal(null);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left text-sm font-semibold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-lily-500 bg-lily-50 text-lily-950 shadow-xs'
                        : 'border-ink-100 bg-white hover:bg-cream-50 text-ink-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-lily-600 stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-2xl bg-ink-950 text-white text-xs font-semibold shadow-soft"
            >
              {t("Đóng")}</button>
          </div>
        </div>
      )}

    </div>
  );
};
