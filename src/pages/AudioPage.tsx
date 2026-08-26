import React from 'react';
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
  ArrowRight,
  Download,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useReader } from '../context/ReaderContext';
import { BookCover } from '../components/common/BookCover';
import { PlanStatus } from '../components/common/PlanStatus';

export const AudioPage: React.FC = () => {
  const { currentBook, user, openUpgradeModal, navigateTo } = useApp();
  const { 
    audioState, 
    audioAccess,
    availableVoices,
    togglePlayAudio, 
    seekAudio, 
    setAudioSpeed, 
    setAudioVoice, 
    setAudioSleepTimer, 
    skip15Sec,
    currentChapterIndex,
    currentChapterTitle,
    downloadVoiceModel,
    toggleDevAudioAccess
  } = useReader();

  const isEntitled = user.tier === 'vip' || user.tier === 'audio' || audioAccess.enabled;
  const speeds = [0.8, 1.0, 1.2, 1.5, 2.0];
  const timers = [15, 30, 45, 60];

  const displayVoices = availableVoices.length > 0 ? availableVoices : [
    { id: 'ngochuyen', name: 'Ngọc Huyền (NghiTTS Original)', description: 'Nữ miền Bắc · Giọng Review Phim & Truyện', sampleText: '“Sau khi xuyên không, nàng phát hiện mình đã trở thành đích nữ của Thừa tướng phủ…”', modelSizeMB: 48.5, isInstalled: false, engineType: 'nghi-tts' },
    { id: 'ngochuyennew', name: 'Ngọc Huyền Mới (NghiTTS V2)', description: 'Nữ miền Bắc · Bản V2 trong trẻo, mượt mà', sampleText: '“Ánh trăng chiếu rọi khắp sân viện, tiếng gió thoảng qua mang theo hương hoa nhài…”', modelSizeMB: 48.5, isInstalled: false, engineType: 'nghi-tts' },
    { id: 'maiphuong', name: 'Mai Phương (NghiTTS)', description: 'Nữ miền Nam · Ngọt ngào, sâu lắng', sampleText: '“Dưới gốc cây lê nhỏ ven sông, hai người cùng ngồi ngắm hoàng hôn buông xuống…”', modelSizeMB: 44.0, isInstalled: false, engineType: 'nghi-tts' },
    { id: 'minhkhang', name: 'Minh Khang (NghiTTS)', description: 'Nam miền Bắc · Tự nhiên, đĩnh đạc', sampleText: '“Con đường phía trước dẫu còn nhiều chông gai nhưng ý chí vẫn luôn kiên định…”', modelSizeMB: 46.2, isInstalled: false, engineType: 'nghi-tts' },
    { id: 'manhdung', name: 'Mạnh Dũng (NghiTTS)', description: 'Nam miền Bắc · Trầm ấm, uy nghiêm', sampleText: '“Tiếng tiêu vang vọng giữa thảo nguyên bao la trong đêm trăng sáng…”', modelSizeMB: 46.5, isInstalled: false, engineType: 'nghi-tts' },
    { id: 'minhthu', name: 'Minh Thu (NghiTTS)', description: 'Nữ miền Bắc · Thanh thoát, nhẹ nhàng', sampleText: '“Gió sớm mai thổi nhẹ làm lay động những cánh hoa còn đọng sương đêm…”', modelSizeMB: 44.8, isInstalled: false, engineType: 'nghi-tts' },
    { id: 'vietthao3886', name: 'Việt Thảo (NghiTTS)', description: 'Nam miền Nam · Phong cách kể chuyện hải ngoại', sampleText: '“Kính thưa quý vị, câu chuyện ly kỳ này bắt đầu từ một buổi chiều mưa gió…”', modelSizeMB: 47.0, isInstalled: false, engineType: 'nghi-tts' },
  ];

  return (
    <div className="audio-lounge max-w-6xl mx-auto py-2 pb-16 sm:pb-20 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100/70 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif font-semibold text-2xl md:text-3xl lg:text-4xl text-ink-950 tracking-[-0.035em]">
              Phòng nghe Lily
            </h1>
            <PlanStatus tier={user.tier} size="sm" />
          </div>
          <p className="text-sm text-ink-600 mt-1">
            Không gian nghe truyện riêng tư · giọng Việt xử lý hoàn toàn trên thiết bị.
          </p>
        </div>

        {!isEntitled && (
          <button
            onClick={() => openUpgradeModal('Audio Pass')}
            className="px-5 py-2.5 rounded-2xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs md:text-sm font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105"
          >
            <Headphones className="w-4 h-4" />
            <span>Mở Audio Pass</span>
          </button>
        )}
      </div>

      {/* LOCKED NOTICE FOR FREE USERS */}
      {!isEntitled && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-lavender-50 via-white to-lavender-50 border border-lavender-200 shadow-soft text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-lavender-100 text-lavender-700 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-lg text-lavender-950">
            Audio TTS đang ở trạng thái khóa
          </h3>
          <p className="text-xs md:text-sm text-ink-600 max-w-lg mx-auto leading-relaxed">
            Bạn có thể kích hoạt <strong>Audio Pass</strong> để nghe đọc cho 3 slot truyện Local hoặc nâng cấp <strong>Lily VIP</strong> để sở hữu trọn bộ Cloud Storage và Audio.
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

      {/* MAIN AUDIO HUB LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT 7 COLS: CURRENT AUDIO PLAYER */}
        <div className="lg:col-span-7 bg-white border border-ink-100 rounded-3xl p-6 md:p-8 shadow-soft space-y-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row gap-6 items-center text-center sm:text-left">
            <div className="shrink-0">
              <BookCover
                title={currentBook?.title || 'Truyện'}
                author={currentBook?.author}
                coverUrl={currentBook?.coverUrl}
                coverColor={currentBook?.coverColor}
                format={currentBook?.fileFormat}
                size="lg"
              />
            </div>

            <div className="space-y-1 min-w-0">
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-lavender-100 text-lavender-800 uppercase">
                🎧 Nghi TTS Engine · Local
              </span>
              <h2 className="font-serif font-bold text-xl md:text-2xl text-ink-950 truncate">
                {currentChapterTitle || `Chương ${currentChapterIndex}`}
              </h2>
              <p className="text-sm text-ink-500 italic">
                {currentBook?.title} · {currentBook?.author}
              </p>
            </div>
          </div>

          {/* Timeline & Slider */}
          <div className="space-y-1.5 pt-4">
            <input
              type="range"
              min="0"
              max={Math.max(0, audioState.totalChunks - 1)}
              value={audioState.currentChunkIndex}
              onChange={(e) => seekAudio(Number(e.target.value))}
              disabled={!isEntitled}
              className="w-full accent-lavender-600 cursor-pointer disabled:opacity-40"
            />
            <div className="flex justify-between text-xs font-mono text-ink-500">
              <span>
                Đoạn {audioState.totalChunks > 0 ? audioState.currentChunkIndex + 1 : 0} / {audioState.totalChunks}
              </span>
              <span>{audioState.chunkProgressPercent}% chương</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-8 py-2">
            <button
              onClick={() => skip15Sec('backward')}
              disabled={!isEntitled || audioState.currentChunkIndex <= 0}
              className="p-3 rounded-full hover:bg-cream-100 text-ink-600 disabled:opacity-40 transition-colors flex flex-col items-center"
              title="Đoạn trước"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="text-[10px] font-mono mt-0.5">Trước</span>
            </button>

            <button
              onClick={togglePlayAudio}
              className="w-16 h-16 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white flex items-center justify-center shadow-card transition-transform active:scale-95"
            >
              {audioState.isPlaying ? (
                <Pause className="w-7 h-7 fill-white" />
              ) : (
                <Play className="w-7 h-7 fill-white ml-1" />
              )}
            </button>

            <button
              onClick={() => skip15Sec('forward')}
              disabled={!isEntitled || audioState.currentChunkIndex >= audioState.totalChunks - 1}
              className="p-3 rounded-full hover:bg-cream-100 text-ink-600 disabled:opacity-40 transition-colors flex flex-col items-center"
              title="Đoạn kế tiếp"
            >
              <RotateCw className="w-5 h-5" />
              <span className="text-[10px] font-mono mt-0.5">Tiếp</span>
            </button>
          </div>

          {/* Speed and Sleep Timer Row */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-ink-100">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-2 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-ink-500" />
                <span>Tốc độ đọc: {audioState.playbackRate}x</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {speeds.map((s) => (
                  <button
                    key={s}
                    onClick={() => setAudioSpeed(s)}
                    disabled={!isEntitled}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-medium disabled:opacity-40 ${
                      audioState.playbackRate === s
                        ? 'bg-lavender-600 text-white font-bold'
                        : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-2 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-ink-500" />
                <span>Hẹn giờ tắt tự động</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {timers.map((t) => (
                  <button
                    key={t}
                    onClick={() => setAudioSleepTimer(audioState.sleepTimer === t ? null : t)}
                    disabled={!isEntitled}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-medium disabled:opacity-40 ${
                      audioState.sleepTimer === t
                        ? 'bg-lavender-600 text-white font-bold'
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

        {/* RIGHT 5 COLS: 4 AI VOICES SELECTOR */}
        <div className="lg:col-span-5 bg-white border border-ink-100 rounded-3xl p-6 md:p-8 shadow-soft space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-ink-100">
            <Mic className="w-5 h-5 text-lavender-600" />
            <h3 className="font-serif font-bold text-lg text-ink-950">
              Chọn giọng đọc AI
            </h3>
          </div>

          <div className="space-y-3">
            {displayVoices.map((v) => {
              const isSelected = audioState.voice === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => isEntitled && setAudioVoice(v.id as any)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-lavender-500 bg-lavender-50/70 shadow-xs'
                      : 'border-ink-200/80 bg-cream-50/40 hover:bg-cream-50'
                  } ${!isEntitled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-ink-900">{v.name}</span>
                    <div className="flex items-center gap-1.5">
                      {v.isInstalled ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Sẵn sàng
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadVoiceModel(v.id);
                          }}
                          className="text-[10px] font-semibold px-2 py-0.5 bg-lavender-100 hover:bg-lavender-200 text-lavender-800 rounded flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>{v.modelSizeMB}MB</span>
                        </button>
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lavender-600 text-white">
                          Đang chọn
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-ink-500">{v.description}</div>
                  {v.sampleText && (
                    <p className="text-xs text-lavender-900 italic mt-2 bg-white/70 p-2 rounded-xl border border-lavender-100">
                      {v.sampleText}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
