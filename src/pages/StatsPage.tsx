import React from 'react';
import { 
  Flame, 
  Clock, 
  BookOpen, 
  Headphones, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  TrendingUp,
  Award
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const StatsPage: React.FC = () => {
  const { readingStats, user } = useApp();

  const dailyStats = readingStats.dailyStats || [
    { day: 'T2', readingMinutes: 110, audioMinutes: 30 },
    { day: 'T3', readingMinutes: 95, audioMinutes: 20 },
    { day: 'T4', readingMinutes: 130, audioMinutes: 45 },
    { day: 'T5', readingMinutes: 80, audioMinutes: 10 },
    { day: 'T6', readingMinutes: 140, audioMinutes: 15 },
    { day: 'T7', readingMinutes: 190, audioMinutes: 25 },
    { day: 'CN', readingMinutes: 180, audioMinutes: 0 },
  ];

  const maxReadingMin = Math.max(...dailyStats.map(d => d.readingMinutes), 1);
  const audioMinutesWeek = readingStats.audioMinutesWeek || 145;

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-serif font-bold text-2xl md:text-3xl text-ink-950">
            Nhật ký đọc sách (Reading Diary)
          </h1>
        </div>
        <p className="text-xs text-ink-500 mt-1">
          Ghi lại từng trang sách, khoảng thời gian tĩnh lặng và cảm xúc qua từng con chữ.
        </p>
      </div>

      {/* STREAK & WEEKLY HIGHLIGHT HERO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Streak Card */}
        <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 border border-amber-200/80 rounded-3xl p-5 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 fill-amber-500" />
          </div>
          <div>
            <span className="text-[10px] text-amber-800 uppercase font-bold tracking-wider">
              Chuỗi ngày đọc
            </span>
            <div className="font-serif font-bold text-2xl text-ink-950 mt-0.5">
              🔥 {readingStats.streakDays} ngày
            </div>
            <p className="text-[11px] text-ink-500 mt-0.5">Kỷ lục dài nhất: 14 ngày</p>
          </div>
        </div>

        {/* Weekly Hours */}
        <div className="bg-gradient-to-br from-lily-500/10 via-white to-lily-500/5 border border-lily-200/80 rounded-3xl p-5 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-lily-500/20 text-lily-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-lily-800 uppercase font-bold tracking-wider">
              Thời gian đọc tuần này
            </span>
            <div className="font-serif font-bold text-2xl text-ink-950 mt-0.5">
              {readingStats.weeklyHours}h {readingStats.weeklyMinutes}m
            </div>
            <p className="text-[11px] text-ink-500 mt-0.5">Trung bình ~1h45m / ngày</p>
          </div>
        </div>

        {/* Chapters & Books */}
        <div className="bg-gradient-to-br from-lavender-500/10 via-white to-lavender-500/5 border border-lavender-200/80 rounded-3xl p-5 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-lavender-500/20 text-lavender-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-lavender-800 uppercase font-bold tracking-wider">
              Chương đã đọc
            </span>
            <div className="font-serif font-bold text-2xl text-ink-950 mt-0.5">
              {readingStats.weeklyChapters} chương
            </div>
            <p className="text-[11px] text-ink-500 mt-0.5">Qua 4 tác phẩm khác nhau</p>
          </div>
        </div>
      </div>

      {/* READING TIME CHART (POETIC READING DIARY STYLE) */}
      <div className="bg-white border border-ink-100 rounded-3xl p-6 md:p-8 shadow-soft space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-lg text-ink-950">
              Nhịp điệu đọc 7 ngày qua
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Thời lượng đọc chữ và nghe audio theo từng ngày trong tuần
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-ink-700">
              <span className="w-2.5 h-2.5 rounded-full bg-lily-500"></span>
              <span>Đọc sách</span>
            </span>
            <span className="flex items-center gap-1.5 text-ink-700">
              <span className="w-2.5 h-2.5 rounded-full bg-lavender-400"></span>
              <span>Nghe audio</span>
            </span>
          </div>
        </div>

        {/* Custom Bar Graph */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end pt-8 pb-2 h-56 border-b border-ink-100">
          {dailyStats.map((item) => {
            const heightPercent = Math.round((item.readingMinutes / maxReadingMin) * 100);
            const audioHeightPercent = Math.round((item.audioMinutes / maxReadingMin) * 100);

            return (
              <div key={item.day} className="flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-mono text-ink-400 group-hover:text-ink-900 transition-colors">
                  {item.readingMinutes}m
                </div>

                <div className="w-full max-w-[40px] bg-ink-50 rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                  {/* Audio bar slice */}
                  {item.audioMinutes > 0 && (
                    <div
                      className="w-full bg-lavender-400/80 transition-all duration-500 group-hover:bg-lavender-500"
                      style={{ height: `${audioHeightPercent}%` }}
                      title={`${item.audioMinutes} phút nghe audio`}
                    />
                  )}

                  {/* Reading bar slice */}
                  <div
                    className="w-full bg-gradient-to-t from-lily-600 to-lily-400 rounded-t-lg transition-all duration-500 group-hover:from-lily-700 group-hover:to-lily-500"
                    style={{ height: `${heightPercent}%` }}
                    title={`${item.readingMinutes} phút đọc`}
                  />
                </div>

                <span className="text-xs font-semibold text-ink-700 group-hover:text-lily-800">
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>

        {/* Supplementary stats footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200 flex items-center gap-3">
            <Headphones className="w-5 h-5 text-lavender-600 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-ink-900 block">
                🎧 {Math.round(audioMinutesWeek / 60)}h {audioMinutesWeek % 60}m nghe Audio
              </span>
              <span className="text-[11px] text-ink-500">Giọng Linh Nhi được nghe nhiều nhất</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-ink-900 block">
                📚 {readingStats.completedBooksCount} tác phẩm đã hoàn thành
              </span>
              <span className="text-[11px] text-ink-500">Mới nhất: "Phù Sinh Nhược Mộng"</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
