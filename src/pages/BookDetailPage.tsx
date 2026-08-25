import React, { useState } from 'react';
import { 
  BookOpen, 
  Headphones, 
  ArrowLeft, 
  Search, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  FolderPlus, 
  Download, 
  Share2, 
  Calendar, 
  FileText,
  Flame,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useReader } from '../context/ReaderContext';
import { BookCover } from '../components/common/BookCover';
import { ProgressBar } from '../components/common/ProgressBar';
import { LocalBadge, CloudBadge, FormatBadge } from '../components/common/Badges';
import { LockedFeature } from '../components/common/LockedFeature';
import { mockSearchResults } from '../mock/mockData';

export const BookDetailPage: React.FC = () => {
  const { 
    currentBook, 
    user, 
    navigateTo, 
    shelves, 
    addBookToShelf, 
    openUpgradeModal,
    localBookSource,
    showToast 
  } = useApp();

  const { jumpToChapter } = useReader();

  const [activeTab, setActiveTab] = useState<'overview' | 'chapters' | 'search' | 'stats'>('overview');
  const [chapterSearch, setChapterSearch] = useState('');
  const [inBookQuery, setInBookQuery] = useState('Thẩm Uyển Khanh');
  const [realChapterList, setRealChapterList] = useState<Array<{ index: number; title: string; wordCount: number; isRead: boolean; isCurrent: boolean }>>([]);

  React.useEffect(() => {
    if (currentBook) {
      localBookSource.getChapterList(currentBook.id).then((list) => {
        if (list && list.length > 0) {
          setRealChapterList(list);
        }
      }).catch(() => {});
    }
  }, [currentBook?.id]);

  if (!currentBook) {
    return (
      <div className="p-12 text-center">
        <p className="text-base text-ink-500">Không tìm thấy thông tin tác phẩm.</p>
        <button
          onClick={() => navigateTo('library')}
          className="mt-4 px-5 py-2.5 rounded-2xl bg-ink-900 text-white text-xs font-semibold"
        >
          Quay lại thư viện
        </button>
      </div>
    );
  }

  const chapters = realChapterList.length > 0 ? realChapterList : Array.from({ length: currentBook.totalChapters }, (_, i) => {
    const num = i + 1;
    const isCurrent = num === currentBook.currentChapter;
    const isRead = num < currentBook.currentChapter;
    return {
      index: num,
      title: `Chương ${num}`,
      isRead,
      isCurrent,
      wordCount: Math.round(2200 + (num % 5) * 300),
    };
  });

  const filteredChapters = chapters.filter(c => 
    c.title.toLowerCase().includes(chapterSearch.toLowerCase()) || 
    c.index.toString() === chapterSearch.trim()
  );

  const handleStartReading = () => {
    navigateTo('reader', currentBook.id);
  };

  const handleStartAudio = () => {
    if (user.tier === 'free') {
      openUpgradeModal('Lily Audio / TTS');
      return;
    }
    navigateTo('reader', currentBook.id);
  };

  return (
    <div className="max-w-6xl mx-auto py-2 space-y-8 animate-in fade-in duration-200">
      {/* Back button */}
      <button
        onClick={() => navigateTo('library')}
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại Thư viện</span>
      </button>

      {/* Book Hero Banner */}
      <div className="bg-white border border-ink-100 rounded-3xl p-6 md:p-10 shadow-soft flex flex-col md:flex-row gap-8 items-center md:items-start">
        {/* Cover */}
        <div className="shrink-0">
          <BookCover
            title={currentBook.title}
            author={currentBook.author}
            coverUrl={currentBook.coverUrl}
            coverColor={currentBook.coverColor}
            format={currentBook.fileFormat}
            size="xl"
          />
        </div>

        {/* Info & CTA */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full text-center md:text-left py-1">
          <div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-3">
              {currentBook.storageType === 'cloud' ? <CloudBadge /> : <LocalBadge />}
              <FormatBadge format={currentBook.fileFormat} />
              {currentBook.tags.map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-0.5 rounded-lg bg-ink-100 text-ink-700 font-medium">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="font-serif font-bold text-3xl md:text-4xl text-ink-950 leading-tight">
              {currentBook.title}
            </h1>
            <p className="text-base text-ink-600 italic mt-1.5">
              Tác giả: <span className="font-semibold text-ink-900 not-italic">{currentBook.author}</span>
            </p>

            {/* Quick stats pills */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-5 text-sm text-ink-600">
              <div>
                <span className="font-bold text-ink-950 font-mono">{currentBook.totalChapters}</span> chương
              </div>
              <span className="text-ink-300">•</span>
              <div>
                <span className="font-bold text-ink-950 font-mono">{(currentBook.wordCount / 1000).toFixed(0)}k</span> chữ
              </div>
              <span className="text-ink-300">•</span>
              <div>
                <span className="font-bold text-ink-950 font-mono">{currentBook.fileSizeMB} MB</span>
              </div>
              <span className="text-ink-300">•</span>
              <div>
                Thêm ngày <span className="font-medium text-ink-800">{currentBook.addedAt}</span>
              </div>
            </div>

            {/* Reading progress banner */}
            <div className="mt-6 p-4 rounded-2xl bg-cream-50/80 border border-cream-200">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-ink-900">
                  Bạn đang đọc {currentBook.currentChapterTitle}
                </span>
                <span className="font-bold text-lily-800">{currentBook.progressPercent}%</span>
              </div>
              <ProgressBar progress={currentBook.progressPercent} size="md" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3.5 mt-7">
            <button
              onClick={handleStartReading}
              className="px-6 py-3 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white text-sm font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105"
            >
              <BookOpen className="w-4 h-4" />
              <span>Tiếp tục đọc (Chương {currentBook.currentChapter})</span>
            </button>

            <button
              onClick={handleStartAudio}
              className={`px-5 py-3 rounded-2xl border text-sm font-semibold shadow-soft flex items-center gap-2 transition-all ${
                user.tier === 'free'
                  ? 'bg-lavender-50 border-lavender-200 text-lavender-900 hover:bg-lavender-100'
                  : 'bg-white border-ink-200 text-ink-900 hover:bg-ink-50'
              }`}
            >
              <Headphones className="w-4 h-4 text-lavender-600" />
              <span>Nghe Audio {user.tier === 'free' && '🔒'}</span>
            </button>

            <button
              onClick={() => showToast('Đã sao chép liên kết chia sẻ', 'success')}
              className="p-3 rounded-2xl border border-ink-200 text-ink-600 hover:bg-ink-50 transition-colors"
              title="Chia sẻ truyện"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-ink-200 text-sm font-medium gap-8">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3.5 transition-colors border-b-2 ${
            activeTab === 'overview'
              ? 'border-lily-600 text-lily-950 font-bold'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          Tổng quan
        </button>

        <button
          onClick={() => setActiveTab('chapters')}
          className={`pb-3.5 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'chapters'
              ? 'border-lily-600 text-lily-950 font-bold'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          <span>Danh sách chương</span>
          <span className="text-xs font-mono px-2 py-0.5 bg-ink-100 rounded-full text-ink-700">
            {currentBook.totalChapters}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`pb-3.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'search'
              ? 'border-lily-600 text-lily-950 font-bold'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Tìm trong truyện</span>
          {user.tier === 'free' && <span className="text-xs text-lily-600">🔒</span>}
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-3.5 transition-colors border-b-2 ${
            activeTab === 'stats'
              ? 'border-lily-600 text-lily-950 font-bold'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          Nhật ký đọc
        </button>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-150">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border border-ink-100 rounded-3xl p-6 md:p-7 shadow-soft space-y-3">
              <h3 className="font-serif font-bold text-ink-950 text-base">
                Giới thiệu tác phẩm
              </h3>
              <p className="text-sm md:text-base text-ink-700 leading-relaxed whitespace-pre-line">
                {currentBook.description}
              </p>
            </div>

            {/* Shelves */}
            <div className="bg-white border border-ink-100 rounded-3xl p-6 md:p-7 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-ink-950 text-base">
                  Thuộc tủ sách
                </h3>
                <span className="text-xs text-ink-400">Chọn để gán vào tủ sách</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {shelves.map((shelf) => {
                  const isInShelf = currentBook.shelfIds.includes(shelf.id);
                  return (
                    <button
                      key={shelf.id}
                      onClick={() => addBookToShelf(currentBook.id, shelf.id)}
                      className={`px-3.5 py-2 rounded-2xl text-xs md:text-sm font-medium border transition-all flex items-center gap-2 ${
                        isInShelf
                          ? 'bg-lily-50 border-lily-300 text-lily-950 font-semibold shadow-xs'
                          : 'bg-ink-50 border-ink-200 text-ink-700 hover:bg-ink-100'
                      }`}
                    >
                      {isInShelf ? <Check className="w-4 h-4 text-lily-600" /> : <FolderPlus className="w-4 h-4 text-ink-400" />}
                      <span>{shelf.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right file details info */}
          <div className="space-y-4">
            <div className="bg-cream-50/80 border border-cream-200 rounded-3xl p-6 text-sm space-y-3.5">
              <h4 className="font-bold text-ink-950 uppercase tracking-wider text-xs">
                Chi tiết tệp tin
              </h4>
              <div className="flex justify-between py-1.5 border-b border-cream-200 text-ink-600">
                <span>Định dạng:</span>
                <span className="font-mono font-bold text-ink-950">{currentBook.fileFormat}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-cream-200 text-ink-600">
                <span>Kích thước:</span>
                <span className="font-medium text-ink-950">{currentBook.fileSizeMB} MB</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-cream-200 text-ink-600">
                <span>Lưu trữ:</span>
                <span className="font-medium text-ink-950 capitalize">{currentBook.storageType}</span>
              </div>
              <div className="flex justify-between py-1.5 text-ink-600">
                <span>Đọc lần cuối:</span>
                <span className="font-medium text-ink-950">{currentBook.lastReadAt}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CHAPTERS */}
      {activeTab === 'chapters' && (
        <div className="bg-white border border-ink-100 rounded-3xl p-6 shadow-soft space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                placeholder="Tìm số chương hoặc tên chương..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-lily-500/20"
              />
            </div>
            <div className="text-sm text-ink-500">
              Hiển thị <strong>{filteredChapters.length}</strong> / {currentBook.totalChapters} chương
            </div>
          </div>

          <div className="divide-y divide-ink-100 max-h-[550px] overflow-y-auto pr-2">
            {filteredChapters.map((chap) => (
              <div
                key={chap.index}
                onClick={() => {
                  jumpToChapter(chap.index);
                  navigateTo('reader', currentBook.id);
                }}
                className={`py-3.5 px-4 rounded-2xl flex items-center justify-between text-sm cursor-pointer transition-colors ${
                  chap.isCurrent
                    ? 'bg-lily-50/80 font-bold text-lily-950 border border-lily-200'
                    : 'hover:bg-cream-50 text-ink-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {chap.isCurrent ? (
                    <span className="w-4 h-4 rounded-full bg-lily-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                      ●
                    </span>
                  ) : chap.isRead ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-ink-300 shrink-0" />
                  )}
                  <span className="truncate">{chap.title}</span>
                  {chap.isCurrent && (
                    <span className="text-[10px] font-bold text-lily-700 px-2 py-0.5 rounded-full bg-lily-100 uppercase tracking-wider">
                      Đang đọc
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0 text-ink-400 text-xs">
                  <span>{chap.wordCount.toLocaleString()} chữ</span>
                  <span className="text-ink-800 hover:text-lily-700 font-semibold">Đọc →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SEARCH IN BOOK */}
      {activeTab === 'search' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {user.tier === 'free' ? (
            <LockedFeature
              featureName="Tìm kiếm toàn bộ nội dung trong truyện"
              description="Tìm kiếm nhanh tên nhân vật, địa danh, câu thoại xuyên suốt hàng trăm chương sách."
              type="vip"
            />
          ) : (
            <div className="bg-white border border-ink-100 rounded-3xl p-6 shadow-soft space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={inBookQuery}
                    onChange={(e) => setInBookQuery(e.target.value)}
                    placeholder="Nhập tên nhân vật, câu thoại, địa danh..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-ink-50 border border-ink-200 text-sm focus:ring-2 focus:ring-lily-500/20"
                  />
                </div>
                <button className="px-5 py-2.5 rounded-2xl bg-ink-900 text-white text-xs md:text-sm font-semibold shadow-soft">
                  Tìm kiếm
                </button>
              </div>

              <div className="text-xs md:text-sm text-ink-500">
                Tìm thấy <strong>{mockSearchResults.length}</strong> kết quả cho "{inBookQuery}"
              </div>

              <div className="space-y-2.5">
                {mockSearchResults.map((res, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      jumpToChapter(res.chapterIndex);
                      navigateTo('reader', currentBook.id);
                    }}
                    className="p-4 rounded-2xl bg-cream-50/80 hover:bg-cream-100 border border-cream-200 cursor-pointer transition-colors text-sm"
                  >
                    <div className="font-bold text-lily-950 mb-1 flex items-center justify-between">
                      <span>{res.chapterTitle}</span>
                      <span className="text-xs text-ink-400 font-normal">Chuyển đến chương →</span>
                    </div>
                    <p className="text-ink-700 italic leading-relaxed">
                      {res.snippet}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: STATS */}
      {activeTab === 'stats' && (
        <div className="bg-white border border-ink-100 rounded-3xl p-8 shadow-soft space-y-6 animate-in fade-in duration-150">
          <h3 className="font-serif font-bold text-ink-950 text-lg">
            Nhật ký đọc bộ truyện này
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-cream-50 border border-cream-200 text-center">
              <Clock className="w-6 h-6 text-lily-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-ink-950 font-serif">5h 20m</div>
              <span className="text-xs text-ink-500">Tổng thời gian đọc</span>
            </div>

            <div className="p-5 rounded-2xl bg-cream-50 border border-cream-200 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-ink-950 font-serif">{currentBook.currentChapter}</div>
              <span className="text-xs text-ink-500">Chương đã đọc</span>
            </div>

            <div className="p-5 rounded-2xl bg-cream-50 border border-cream-200 text-center">
              <Flame className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-ink-950 font-serif">4 ngày</div>
              <span className="text-xs text-ink-500">Đọc liên tục</span>
            </div>

            <div className="p-5 rounded-2xl bg-cream-50 border border-cream-200 text-center">
              <Headphones className="w-6 h-6 text-lavender-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-ink-950 font-serif">45 phút</div>
              <span className="text-xs text-ink-500">Đã nghe Audio</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
