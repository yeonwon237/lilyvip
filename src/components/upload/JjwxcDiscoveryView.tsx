import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  JjwxcDiscoveryService,
  JjwxcRankingType,
  JjwxcDailyFreePeriod,
  JjwxcStoryItem,
  JJWXC_RANKING_TABS
} from '../../book-engine/jjwxc-source/JjwxcDiscoveryService';
import { JjwxcCookieStorage } from '../../book-engine/jjwxc-source/JjwxcCookieStorage';
import { useApp } from '../../context/AppContext';

interface JjwxcDiscoveryViewProps {
  onSelectNovel: (novelId: string, novelTitle: string) => void;
  onOpenCookieSettings?: () => void;
}

const STATUS_LABEL = { all: 'Tất cả', completed: 'Hoàn thành', ongoing: 'Đang ra' } as const;
const DAILY_PERIODS = [
  { id: 'yesterday', label: 'Hôm qua' },
  { id: 'today', label: 'Hôm nay' },
  { id: 'tomorrow', label: 'Ngày mai' },
] as const;

/** Bỏ câu giới thiệu mẫu lặp lại, chỉ hiện văn án thật. */
const isRealIntro = (intro: string) =>
  intro.length > 30
  && !intro.includes('Nhấp Tải truyện')
  && !intro.includes('Nhấp Đọc truyện')
  && !intro.includes('đang thịnh hành trên Tấn Giang');

export const JjwxcDiscoveryView: React.FC<JjwxcDiscoveryViewProps> = ({
  onSelectNovel,
  onOpenCookieSettings
}) => {
  const { showToast } = useApp();
  const [currentTab, setCurrentTab] = useState<JjwxcRankingType>('vip_gold');
  const [dailyPeriod, setDailyPeriod] = useState<JjwxcDailyFreePeriod>('today');
  const [metaInfo, setMetaInfo] = useState<{
    isLive?: boolean;
    dateStr?: string;
    updatedAt?: string;
    note?: string;
  }>({});
  const [stories, setStories] = useState<JjwxcStoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'ongoing'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIntroId, setExpandedIntroId] = useState<string | null>(null);

  const hasCookie = JjwxcCookieStorage.hasCookie();

  const loadRankings = async (
    tab: JjwxcRankingType,
    period: JjwxcDailyFreePeriod = dailyPeriod,
    forceRefresh = false
  ) => {
    setIsLoading(true);
    try {
      const res = await JjwxcDiscoveryService.getRankings(tab, {
        dailyPeriod: period,
        forceRefresh
      });
      setStories(res.items);
      setMetaInfo({
        isLive: res.isLive,
        dateStr: res.dateStr,
        updatedAt: res.updatedAt,
        note: res.note
      });
    } catch {
      showToast('Không thể tải bảng xếp hạng, đang hiển thị danh sách tuyển chọn.', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRankings(currentTab, dailyPeriod);
  }, [currentTab]);

  const handlePeriodChange = (period: JjwxcDailyFreePeriod) => {
    setDailyPeriod(period);
    loadRankings('daily_free', period);
  };

  const handleRefresh = () => {
    loadRankings(currentTab, dailyPeriod, true);
    showToast('Đang làm mới dữ liệu trực tiếp từ Tấn Giang...', 'info');
  };

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    showToast(`Đã sao chép Book ID: ${id}`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Lọc danh sách truyện
  const filteredStories = useMemo(() => {
    return stories.filter(story => {
      // Tìm kiếm theo tên (Hán Việt hoặc Trung), tác giả, ID
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = story.title.toLowerCase().includes(q) || story.titleVi.toLowerCase().includes(q);
        const matchAuthor = story.author.toLowerCase().includes(q) || story.authorVi.toLowerCase().includes(q);
        const matchId = story.novelId.includes(q);
        if (!matchTitle && !matchAuthor && !matchId) return false;
      }
      if (statusFilter !== 'all' && story.status !== statusFilter) return false;
      if (selectedTag !== 'all' && !story.tagsVi.includes(selectedTag) && !story.tags.includes(selectedTag)) return false;
      return true;
    });
  }, [stories, searchQuery, statusFilter, selectedTag]);

  // Danh sách các tag phổ biến có trong kết quả
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    stories.forEach(s => s.tagsVi.forEach(t => set.add(t)));
    return Array.from(set).slice(0, 10);
  }, [stories]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Tiêu đề */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="whitespace-nowrap font-serif text-lg font-bold text-ink-950">Bách Hợp Tấn Giang</h2>
          <span className="whitespace-nowrap text-xs tabular-nums text-ink-400">{filteredStories.length} truyện</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {hasCookie ? (
            <span className="inline-flex items-center gap-1 px-2 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cookie VIP</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenCookieSettings}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900"
            >
              <KeyRound className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cookie VIP</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Làm mới dữ liệu từ Tấn Giang"
            aria-label="Làm mới"
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-900 disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bảng xếp hạng: tab gạch chân, cuộn ngang */}
      <div className="-mx-1 overflow-x-auto border-b border-ink-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-1 px-1">
          {JJWXC_RANKING_TABS.map(tab => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCurrentTab(tab.id)}
                className={`relative shrink-0 whitespace-nowrap px-3 pb-2.5 pt-1 text-sm transition-colors ${
                  isActive ? 'font-semibold text-ink-950' : 'text-ink-500 hover:text-ink-800'
                }`}
              >
                {tab.title}
                {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-lily-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* VIP miễn phí: chọn ngày */}
      {currentTab === 'daily_free' && (
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-ink-50 p-0.5">
            {DAILY_PERIODS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePeriodChange(p.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  dailyPeriod === p.id ? 'bg-white text-ink-950 shadow-xs' : 'text-ink-500 hover:text-ink-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {metaInfo.dateStr && <span className="ml-auto text-xs tabular-nums text-ink-400">{metaInfo.dateStr}</span>}
        </div>
      )}

      {/* Tìm kiếm + trạng thái */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm tên truyện, tác giả hoặc Book ID"
            className="w-full rounded-xl border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-lily-300 focus:outline-none focus:ring-2 focus:ring-lily-100"
          />
        </div>
        <div className="inline-flex shrink-0 self-start rounded-lg bg-ink-50 p-0.5 sm:self-auto">
          {(['all', 'completed', 'ongoing'] as const).map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === st ? 'bg-white text-ink-950 shadow-xs' : 'text-ink-500 hover:text-ink-800'
              }`}
            >
              {STATUS_LABEL[st]}
            </button>
          ))}
        </div>
      </div>

      {/* Thể loại */}
      {availableTags.length > 0 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {['all', ...availableTags].map(tag => {
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(isActive && tag !== 'all' ? 'all' : tag)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs transition-colors ${
                  isActive ? 'bg-lily-100 font-medium text-lily-800' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                }`}
              >
                {tag === 'all' ? 'Tất cả' : tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Danh sách */}
      {filteredStories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 py-12 text-center">
          <p className="text-sm font-medium text-ink-800">Không tìm thấy truyện phù hợp</p>
          <p className="mt-1 text-xs text-ink-500">Thử xoá bộ lọc hoặc đổi từ khoá.</p>
        </div>
      ) : (
        <ol className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
          {filteredStories.map(story => {
            const isExpanded = expandedIntroId === story.novelId;
            const intro = story.introVi || story.intro || '';
            const meta = [
              story.status === 'completed' ? 'Hoàn thành' : 'Đang ra',
              story.chapterCount ? `${story.chapterCount} chương` : '',
              ...story.tagsVi.slice(0, 3),
            ].filter(Boolean);

            return (
              <li key={story.novelId} className="group flex gap-3 px-4 py-3.5 transition-colors hover:bg-cream-50/70">
                <span className={`w-6 shrink-0 pt-0.5 text-right font-serif text-sm tabular-nums ${
                  story.rank <= 3 ? 'font-bold text-lily-700' : 'text-ink-400'
                }`}>
                  {story.rank}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-[15px] font-bold leading-snug text-ink-950">
                        {story.titleVi || story.title}
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {story.authorVi || story.author}
                        <span className="text-ink-300"> · </span>
                        <span className="text-ink-400">{story.title}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectNovel(story.novelId, story.titleVi || story.title)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-lily-200 bg-lily-50 px-3 py-1.5 text-xs font-semibold text-lily-700 hover:border-lily-300 hover:bg-lily-100 active:scale-95"
                    >
                      <BookOpen className="h-3.5 w-3.5" /> Đọc
                    </button>
                  </div>

                  <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-500">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${story.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {meta.map((m, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="text-ink-300">·</span>}
                        <span>{m}</span>
                      </React.Fragment>
                    ))}
                  </p>

                  {isRealIntro(intro) && (
                    <div className="mt-2 text-[13px] leading-relaxed text-ink-600">
                      <p className={isExpanded ? '' : 'line-clamp-2'}>{intro}</p>
                      {intro.length > 120 && (
                        <button
                          type="button"
                          onClick={() => setExpandedIntroId(isExpanded ? null : story.novelId)}
                          className="mt-0.5 text-xs font-medium text-lily-700 hover:underline"
                        >
                          {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-400 opacity-70 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={e => handleCopy(story.novelId, e)}
                      className="inline-flex items-center gap-1 hover:text-ink-700"
                      title="Sao chép Book ID"
                    >
                      {copiedId === story.novelId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      <span className="tabular-nums">ID {story.novelId}</span>
                    </button>
                    <a
                      href={`https://wap.jjwxc.net/book2/${story.novelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-ink-700"
                    >
                      <ExternalLink className="h-3 w-3" /> Tấn Giang
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
