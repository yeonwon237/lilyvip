import React, { useState, useEffect, useMemo } from 'react';
import {
  Crown,
  Calendar,
  Flame,
  Award,
  Gift,
  Sparkles,
  Download,
  Copy,
  ExternalLink,
  Check,
  Search,
  BookOpen,
  Filter,
  CheckCircle2,
  KeyRound,
  RotateCcw,
  Languages,
  Info,
  Clock
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
  const [showViIntro, setShowViIntro] = useState<Record<string, boolean>>({});

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

  const toggleIntroLang = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowViIntro(prev => ({ ...prev, [id]: !prev[id] }));
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

      // Lọc trạng thái
      if (statusFilter !== 'all' && story.status !== statusFilter) {
        return false;
      }

      // Lọc theo tag
      if (selectedTag !== 'all') {
        const hasTag = story.tagsVi.includes(selectedTag) || story.tags.includes(selectedTag);
        if (!hasTag) return false;
      }

      return true;
    });
  }, [stories, searchQuery, statusFilter, selectedTag]);

  // Danh sách các tag phổ biến có trong kết quả
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    stories.forEach(s => s.tagsVi.forEach(t => set.add(t)));
    return Array.from(set).slice(0, 10);
  }, [stories]);

  const renderTabIcon = (tabId: JjwxcRankingType, isActive: boolean) => {
    const cls = `w-3.5 h-3.5 ${isActive ? 'text-white' : ''}`;
    switch (tabId) {
      case 'vip_gold':
        return <Crown className={`${cls} ${!isActive ? 'text-amber-500' : ''}`} />;
      case 'daily_free':
        return <Gift className={`${cls} ${!isActive ? 'text-pink-500' : ''}`} />;
      case 'month':
        return <Calendar className={`${cls} ${!isActive ? 'text-rose-500' : ''}`} />;
      case 'quarter':
        return <Flame className={`${cls} ${!isActive ? 'text-orange-500' : ''}`} />;
      case 'half_year':
        return <Award className={`${cls} ${!isActive ? 'text-purple-500' : ''}`} />;
      case 'free':
        return <BookOpen className={`${cls} ${!isActive ? 'text-emerald-500' : ''}`} />;
      case 'points':
        return <Sparkles className={`${cls} ${!isActive ? 'text-sky-500' : ''}`} />;
      default:
        return <BookOpen className={cls} />;
    }
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      {/* Header bar: Tinh tế & Gọn gàng */}
      <div className="flex items-center justify-between gap-2 pb-0.5">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-pink-100 text-pink-700">
            <Crown className="w-4 h-4" />
          </span>
          <h2 className="font-serif font-bold text-base sm:text-lg text-ink-950">
            Bách Hợp Tấn Giang
          </h2>
          <span className="text-xs text-ink-400 font-medium">
            ({filteredStories.length})
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasCookie ? (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium flex items-center gap-1 border border-emerald-200/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Cookie VIP OK
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenCookieSettings}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 hover:bg-pink-100 font-medium flex items-center gap-1 border border-pink-200 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Cookie VIP</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Làm mới dữ liệu từ Tấn Giang"
            className="p-1.5 rounded-xl border border-ink-200 hover:bg-cream-100 text-ink-600 transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-pink-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs Bảng xếp hạng dạng Pills cuộn ngang */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {JJWXC_RANKING_TABS.map(tab => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCurrentTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-pink-600 text-white shadow-soft shadow-pink-500/20 scale-[1.02]'
                  : 'bg-white hover:bg-cream-100 text-ink-700 border border-ink-100'
              }`}
            >
              {renderTabIcon(tab.id, isActive)}
              <span>{tab.title}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-bar gọn cho VIP Miễn Phí (Hôm nay - Hôm qua - Ngày mai) */}
      {currentTab === 'daily_free' && (
        <div className="flex items-center gap-1.5 py-0.5">
          {(
            [
              { id: 'today', label: 'Hôm nay', icon: '🌟' },
              { id: 'yesterday', label: 'Hôm qua', icon: '⏪' },
              { id: 'tomorrow', label: 'Ngày mai', icon: '⏩' },
            ] as const
          ).map((p) => {
            const isActive = dailyPeriod === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePeriodChange(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                  isActive
                    ? 'bg-ink-950 text-white shadow-xs'
                    : 'bg-white hover:bg-cream-100 text-ink-700 border border-ink-100'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
          {metaInfo.dateStr && (
            <span className="text-[11px] text-ink-400 font-mono ml-auto">
              {metaInfo.dateStr}
            </span>
          )}
        </div>
      )}

      {/* Thanh tìm kiếm & lọc trạng thái */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên truyện, tác giả hoặc Book ID..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-ink-200 text-xs font-medium text-ink-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(['all', 'completed', 'ongoing'] as const).map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-ink-950 text-white'
                  : 'bg-white hover:bg-ink-100 text-ink-600 border border-ink-100'
              }`}
            >
              {st === 'all' ? 'Tất cả' : st === 'completed' ? 'Hoàn thành' : 'Đang ra'}
            </button>
          ))}
        </div>
      </div>

      {/* Tags thể loại dạng cuộn ngang nhẹ nhàng */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setSelectedTag('all')}
            className={`text-[11px] px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition-all ${
              selectedTag === 'all' ? 'bg-pink-600 text-white' : 'bg-white text-ink-600 hover:bg-ink-100 border border-ink-100'
            }`}
          >
            Tất cả thể loại
          </button>
          {availableTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
              className={`text-[11px] px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition-all ${
                selectedTag === tag ? 'bg-pink-600 text-white' : 'bg-white text-ink-700 hover:bg-cream-100 border border-ink-100'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Danh sách truyện */}
      <div className="space-y-2.5">
        {filteredStories.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-ink-100 p-6">
            <BookOpen className="w-8 h-8 text-ink-300 mx-auto mb-2" />
            <p className="text-sm font-serif font-bold text-ink-800">Không tìm thấy truyện phù hợp</p>
            <p className="text-xs text-ink-500 mt-0.5">Hãy thử xóa bộ lọc hoặc đổi từ khóa tìm kiếm</p>
          </div>
        ) : (
          filteredStories.map((story) => {
            const isExpanded = expandedIntroId === story.novelId;
            // Chỉ hiển thị khung tóm tắt khi truyện có văn án chi tiết thực sự (không phải câu template lặp lại)
            const hasRealIntro = Boolean(
              story.introVi &&
              story.introVi.length > 30 &&
              !story.introVi.includes('Nhấp Tải truyện') &&
              !story.introVi.includes('đang thịnh hành trên Tấn Giang')
            );

            return (
              <div
                key={story.novelId}
                className="bg-white rounded-2xl border border-ink-100/80 p-3.5 sm:p-4 shadow-xs hover:border-pink-200 hover:shadow-soft transition-all space-y-2.5 group"
              >
                {/* Header: Hạng, Tên, Tác giả, Nút tải */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-serif font-bold text-[11px] shrink-0 mt-0.5 ${
                      story.rank === 1
                        ? 'bg-amber-400 text-amber-950 font-extrabold'
                        : story.rank === 2
                        ? 'bg-slate-200 text-slate-900 font-extrabold'
                        : story.rank === 3
                        ? 'bg-amber-700 text-amber-50 font-extrabold'
                        : 'bg-ink-100 text-ink-600'
                    }`}>
                      {story.rank}
                    </span>

                    <div className="min-w-0">
                      <h3 className="font-serif font-bold text-sm sm:text-base text-ink-950 group-hover:text-pink-700 transition-colors leading-snug">
                        {story.titleVi || story.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-ink-500 mt-0.5 flex-wrap">
                        <span className="font-medium text-ink-700">{story.authorVi || story.author}</span>
                        <span>·</span>
                        <span className="text-ink-400 italic">《{story.title}》</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectNovel(story.novelId, story.titleVi || story.title)}
                    className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 shrink-0 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải truyện</span>
                  </button>
                </div>

                {/* Dòng thông số & Tag gọn gàng */}
                <div className="flex items-center gap-2 text-[11px] text-ink-500 flex-wrap pt-0.5">
                  <span className={`px-2 py-0.5 rounded-md font-medium ${
                    story.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                  }`}>
                    {story.status === 'completed' ? 'Hoàn thành' : 'Đang ra'}
                  </span>

                  <span>{story.chapterCount} chương</span>

                  {story.tagsVi.slice(0, 3).map((t, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded-md bg-cream-100/80 text-ink-700 border border-cream-200/60">
                      {t}
                    </span>
                  ))}

                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleCopy(story.novelId, e)}
                      className="px-1.5 py-0.5 rounded-md bg-ink-50 hover:bg-ink-100 text-ink-600 font-mono text-[10px] flex items-center gap-1 transition-colors"
                      title="Sao chép Book ID"
                    >
                      {copiedId === story.novelId ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>ID: {story.novelId}</span>
                    </button>

                    <a
                      href={`https://wap.jjwxc.net/book2/${story.novelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink-400 hover:text-pink-600 p-0.5"
                      title="Mở WAP Tấn Giang"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Văn án thật (chỉ hiển thị nếu truyện có văn án chi tiết) */}
                {hasRealIntro && (
                  <div className="bg-cream-50/60 rounded-xl p-2.5 border border-cream-200/60 text-xs text-ink-700 leading-relaxed font-serif">
                    <p className={isExpanded ? '' : 'line-clamp-2'}>
                      {story.introVi || story.intro}
                    </p>
                    {((story.introVi || story.intro).length > 120) && (
                      <button
                        type="button"
                        onClick={() => setExpandedIntroId(isExpanded ? null : story.novelId)}
                        className="text-[11px] text-pink-700 font-sans font-medium hover:underline pt-0.5 block"
                      >
                        {isExpanded ? 'Thu gọn' : 'Xem thêm…'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
