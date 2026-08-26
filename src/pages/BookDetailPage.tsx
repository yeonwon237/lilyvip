import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Headphones, 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  FolderPlus, 
  Share2, 
  Check,
  Bookmark as BookmarkIcon,
  Sparkles,
  Trash2,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useReader } from '../context/ReaderContext';
import { BookCover } from '../components/common/BookCover';
import { ProgressBar } from '../components/common/ProgressBar';
import { LocalBadge, CloudBadge, FormatBadge } from '../components/common/Badges';
import { QuoteCardEditor } from '../components/reader/QuoteCardEditor';
import { SearchResult, Bookmark } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';

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

  const { jumpToChapter, openQuoteEditor } = useReader();

  const [activeTab, setActiveTab] = useState<'overview' | 'chapters' | 'bookmarks' | 'search' | 'stats'>('overview');
  const [chapterSearch, setChapterSearch] = useState('');
  const [inBookQuery, setInBookQuery] = useState('');
  const [inBookResults, setInBookResults] = useState<SearchResult[]>([]);
  const [isSearchingInBook, setIsSearchingInBook] = useState(false);
  const [realChapterList, setRealChapterList] = useState<Array<{ index: number; title: string; wordCount: number; isRead: boolean; isCurrent: boolean }>>([]);
  const [bookBookmarks, setBookBookmarks] = useState<Bookmark[]>([]);
  const [bookmarkSortBy, setBookmarkSortBy] = useState<'newest' | 'chapter'>('newest');

  const loadBookBookmarks = async () => {
    if (!currentBook?.id) return;
    try {
      const list = await localBookSource.getBookmarksForBook(currentBook.id);
      setBookBookmarks(list);
    } catch {
      setBookBookmarks([]);
    }
  };

  useEffect(() => {
    loadBookBookmarks();
  }, [currentBook?.id]);

  React.useEffect(() => {
    if (currentBook) {
      localBookSource.getChapterList(currentBook.id).then((list) => {
        if (list && list.length > 0) {
          setRealChapterList(list);
        }
      }).catch(() => {});
    }
  }, [currentBook?.id]);

  // Real search in Book Detail
  React.useEffect(() => {
    const trimmed = inBookQuery.trim();
    if (!trimmed || !currentBook?.id) {
      setInBookResults([]);
      setIsSearchingInBook(false);
      return;
    }

    setIsSearchingInBook(true);
    const timer = setTimeout(async () => {
      try {
        const res = await localBookSource.searchInBook(currentBook.id, trimmed);
        setInBookResults(res);
      } catch {
        setInBookResults([]);
      } finally {
        setIsSearchingInBook(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inBookQuery, currentBook?.id, localBookSource]);

  if (!currentBook) {
    return (
      <div className="p-8 sm:p-12 text-center">
        <p className="text-sm sm:text-base text-ink-500">Không tìm thấy thông tin tác phẩm.</p>
        <button
          onClick={() => navigateTo('library')}
          className="mt-4 px-5 py-2.5 rounded-2xl bg-ink-950 text-white text-xs font-semibold"
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
    <div className="max-w-6xl mx-auto py-1 sm:py-2 space-y-6 sm:space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigateTo('library')}
        className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại Thư viện</span>
      </button>

      {/* Book Hero Banner */}
      <div className="bg-white border border-ink-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-soft flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
        {/* Cover */}
        <div className="shrink-0">
          <BookCover
            title={currentBook.title}
            author={currentBook.author}
            coverUrl={currentBook.coverUrl}
            coverColor={currentBook.coverColor}
            format={currentBook.fileFormat}
            size="lg"
          />
        </div>

        {/* Info & CTA */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full text-center md:text-left py-0.5 w-full">
          <div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2.5">
              {currentBook.storageType === 'cloud' ? <CloudBadge /> : <LocalBadge />}
              <FormatBadge format={currentBook.fileFormat} />
              {currentBook.tags.map((tag) => (
                <span key={tag} className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-lg bg-ink-100 text-ink-700 font-medium">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="font-serif font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl text-ink-950 leading-snug">
              {currentBook.title}
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-ink-600 italic mt-1">
              Tác giả: <span className="font-semibold text-ink-900 not-italic">{currentBook.author}</span>
            </p>

            {/* Quick stats pills */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm text-ink-600">
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
                Thêm <span className="font-medium text-ink-800">{currentBook.addedAt}</span>
              </div>
            </div>

            {/* Reading progress banner */}
            <div className="mt-4 sm:mt-5 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-cream-50/80 border border-cream-200">
              <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
                <span className="font-medium text-ink-900 truncate max-w-[200px]">
                  {currentBook.currentChapterTitle}
                </span>
                <span className="font-bold text-lily-800 font-mono">{currentBook.progressPercent}%</span>
              </div>
              <ProgressBar progress={currentBook.progressPercent} size="md" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3 mt-5 sm:mt-6 w-full">
            <button
              onClick={handleStartReading}
              className="flex-1 sm:flex-initial px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-ink-950 hover:bg-ink-800 text-white text-xs sm:text-sm font-semibold shadow-soft flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span>Tiếp tục đọc (Chương {currentBook.currentChapter})</span>
            </button>

            <button
              onClick={handleStartAudio}
              className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border text-xs sm:text-sm font-semibold shadow-soft flex items-center justify-center gap-2 transition-all ${
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
              className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-ink-200 text-ink-600 hover:bg-ink-50 transition-colors"
              title="Chia sẻ truyện"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-ink-200 text-xs sm:text-sm font-medium gap-4 sm:gap-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 transition-colors border-b-2 shrink-0 ${
            activeTab === 'overview'
              ? 'border-lily-600 text-lily-950 font-bold'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          Tổng quan
        </button>

        <button
          onClick={() => setActiveTab('chapters')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 ${
            activeTab === 'chapters'
              ? 'border-lily-600 text-lily-950 font-bold'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          <span>Danh sách chương</span>
          <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 bg-ink-100 rounded-full text-ink-700">
            {currentBook.totalChapters}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'bookmarks'
              ? 'border-lily-600 text-lily-950 font-bold'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          <BookmarkIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Đoạn đã lưu</span>
          {bookBookmarks.length > 0 && (
            <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 bg-lily-100 text-lily-800 rounded-full font-bold">
              {bookBookmarks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === 'search'
              ? 'border-lily-600 text-lily-950 font-bold'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Tìm trong truyện</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-3 transition-colors border-b-2 shrink-0 ${
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="md:col-span-2 space-y-5">
            <div className="bg-white border border-ink-100 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-soft space-y-2.5">
              <h3 className="font-serif font-bold text-ink-950 text-sm sm:text-base">
                Giới thiệu tác phẩm
              </h3>
              <p className="text-xs sm:text-sm md:text-base text-ink-700 leading-relaxed whitespace-pre-line">
                {currentBook.description}
              </p>
            </div>

            {/* Shelves */}
            <div className="bg-white border border-ink-100 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-soft space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-ink-950 text-sm sm:text-base">
                  Thuộc tủ sách
                </h3>
                <span className="text-[11px] sm:text-xs text-ink-400">Chọn để gán vào tủ sách</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {shelves.map((shelf) => {
                  const isInShelf = currentBook.shelfIds.includes(shelf.id);
                  return (
                    <button
                      key={shelf.id}
                      onClick={() => addBookToShelf(currentBook.id, shelf.id)}
                      className={`px-3 py-1.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium border transition-all flex items-center gap-1.5 ${
                        isInShelf
                          ? 'bg-lily-50 border-lily-300 text-lily-950 font-semibold shadow-xs'
                          : 'bg-ink-50 border-ink-200 text-ink-700 hover:bg-ink-100'
                      }`}
                    >
                      {isInShelf ? <Check className="w-3.5 h-3.5 text-lily-600" /> : <FolderPlus className="w-3.5 h-3.5 text-ink-400" />}
                      <span>{shelf.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right file details info */}
          <div className="space-y-4">
            <div className="bg-cream-50/80 border border-cream-200 rounded-2xl sm:rounded-3xl p-5 text-xs sm:text-sm space-y-3">
              <h4 className="font-bold text-ink-950 uppercase tracking-wider text-[11px]">
                Chi tiết tệp tin
              </h4>
              <div className="flex justify-between py-1 border-b border-cream-200 text-ink-600">
                <span>Định dạng:</span>
                <span className="font-mono font-bold text-ink-950">{currentBook.fileFormat}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-cream-200 text-ink-600">
                <span>Kích thước:</span>
                <span className="font-medium text-ink-950">{currentBook.fileSizeMB} MB</span>
              </div>
              <div className="flex justify-between py-1 border-b border-cream-200 text-ink-600">
                <span>Lưu trữ:</span>
                <span className="font-medium text-ink-950 capitalize">{currentBook.storageType}</span>
              </div>
              <div className="flex justify-between py-1 text-ink-600">
                <span>Đọc lần cuối:</span>
                <span className="font-medium text-ink-950">{currentBook.lastReadAt}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CHAPTERS */}
      {activeTab === 'chapters' && (
        <div className="bg-white border border-ink-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                placeholder="Tìm số chương hoặc tên chương..."
                className="w-full pl-9 pr-4 py-2 rounded-xl sm:rounded-2xl bg-ink-50 border border-ink-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-lily-500/20"
              />
            </div>
            <div className="text-xs sm:text-sm text-ink-500">
              Hiển thị <strong>{filteredChapters.length}</strong> / {currentBook.totalChapters} chương
            </div>
          </div>

          <div className="divide-y divide-ink-100/70 max-h-[500px] overflow-y-auto pr-1">
            {filteredChapters.map((chap) => (
              <div
                key={chap.index}
                onClick={() => {
                  jumpToChapter(chap.index);
                  navigateTo('reader', currentBook.id);
                }}
                className={`py-3 px-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                  chap.isCurrent
                    ? 'bg-lily-50 text-lily-950 font-semibold'
                    : 'hover:bg-ink-50 text-ink-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono shrink-0 ${
                    chap.isCurrent
                      ? 'bg-lily-600 text-white font-bold'
                      : chap.isRead
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-ink-100 text-ink-600'
                  }`}>
                    {chap.isRead ? <CheckCircle2 className="w-3.5 h-3.5" /> : chap.index}
                  </span>
                  <div className="truncate text-xs sm:text-sm font-medium">
                    {chap.title}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs text-ink-400 font-mono">
                  <span>{chap.wordCount.toLocaleString()} từ</span>
                  <button className="text-lily-600 font-semibold hover:underline hidden sm:inline">
                    {chap.isCurrent ? 'Đang đọc' : 'Đọc'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SEARCH (100% Free Local Search) */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <div className="bg-white border border-ink-100 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-soft space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inBookQuery}
                onChange={(e) => setInBookQuery(e.target.value)}
                placeholder="Nhập từ khóa, tên nhân vật tìm kiếm trong toàn truyện..."
                className="flex-1 px-4 py-2.5 rounded-2xl bg-ink-50 border border-ink-200 text-sm focus:ring-2 focus:ring-lily-500/20 text-ink-900 placeholder:text-ink-400"
              />
              {inBookQuery && (
                <button
                  type="button"
                  onClick={() => setInBookQuery('')}
                  className="px-3 py-2.5 rounded-2xl border border-ink-200 text-ink-500 hover:text-ink-900 text-xs font-semibold"
                >
                  Xóa
                </button>
              )}
            </div>

            {isSearchingInBook && (
              <div className="py-8 text-center text-xs text-ink-500">
                Đang tìm kiếm trong các chương IndexedDB...
              </div>
            )}

            {!isSearchingInBook && inBookQuery.trim() && (
              <div className="space-y-3 pt-2">
                <div className="text-xs text-ink-500">
                  Tìm thấy <strong>{inBookResults.length} kết quả</strong> cho "{inBookQuery}":
                </div>
                {inBookResults.length === 0 ? (
                  <div className="py-6 text-center text-xs text-ink-400">
                    Không tìm thấy kết quả nào phù hợp trong tác phẩm này.
                  </div>
                ) : (
                  inBookResults.map((res, i) => (
                    <div 
                      key={i}
                      onClick={() => {
                        jumpToChapter(res.chapterIndex, res.paragraphIndex);
                        navigateTo('reader', currentBook.id);
                      }}
                      className="p-4 rounded-2xl bg-ink-50/70 hover:bg-lily-50/60 border border-ink-100 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-center text-xs font-semibold text-lily-800 mb-1">
                        <span>{res.chapterTitle}</span>
                        <span className="text-ink-400 font-normal">Chương {res.chapterIndex}</span>
                      </div>
                      <p className="text-xs text-ink-700 leading-relaxed italic">
                        "{res.snippet}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {!isSearchingInBook && !inBookQuery.trim() && (
              <div className="py-8 text-center text-xs text-ink-400">
                Nhập từ khóa ở trên để tìm kiếm nhanh trong toàn bộ các chương truyện.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: STATS */}
      {activeTab === 'stats' && (
        <div className="bg-white border border-ink-100 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-soft space-y-5">
          <h3 className="font-serif font-bold text-sm sm:text-base text-ink-950">
            Thống kê đọc tác phẩm này
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-cream-50 text-center">
              <span className="text-[11px] text-ink-500">Thời gian đã đọc</span>
              <div className="text-xl font-bold font-serif text-ink-950 mt-1">4h 15m</div>
            </div>
            <div className="p-4 rounded-2xl bg-cream-50 text-center">
              <span className="text-[11px] text-ink-500">Tốc độ đọc trung bình</span>
              <div className="text-xl font-bold font-serif text-ink-950 mt-1">260 từ/phút</div>
            </div>
            <div className="p-4 rounded-2xl bg-cream-50 text-center">
              <span className="text-[11px] text-ink-500">Số chương hoàn thành</span>
              <div className="text-xl font-bold font-serif text-ink-950 mt-1">{currentBook.currentChapter - 1}</div>
            </div>
            <div className="p-4 rounded-2xl bg-cream-50 text-center">
              <span className="text-[11px] text-ink-500">Dự kiến hoàn thành</span>
              <div className="text-xl font-bold font-serif text-ink-950 mt-1">~6 giờ nữa</div>
            </div>
          </div>
        </div>
      )}
      {/* TAB CONTENT: BOOKMARKS */}
      {activeTab === 'bookmarks' && (
        <div className="bg-white border border-ink-100 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink-100/70">
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-ink-950">
                Đoạn đã lưu ({bookBookmarks.length})
              </h3>
              <p className="text-xs text-ink-500 mt-0.5">
                Các đoạn trích dẫn và đánh dấu yêu thích trong cuốn truyện này
              </p>
            </div>

            {bookBookmarks.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-400">Sắp xếp:</span>
                <button
                  onClick={() => setBookmarkSortBy(bookmarkSortBy === 'newest' ? 'chapter' : 'newest')}
                  className="px-3 py-1.5 rounded-xl border border-ink-200 hover:bg-cream-50 text-xs font-medium text-ink-700 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{bookmarkSortBy === 'newest' ? 'Mới nhất trước' : 'Theo thứ tự chương'}</span>
                </button>
              </div>
            )}
          </div>

          {bookBookmarks.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cream-100 text-ink-400 flex items-center justify-center mx-auto shadow-soft">
                <BookmarkIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ink-800">Chưa có đoạn nào được lưu</p>
                <p className="text-xs text-ink-500 max-w-sm mx-auto">
                  Trong khi đọc, bạn có thể bôi đen một đoạn văn bất kỳ để lưu dấu trang hoặc tạo ảnh Quote Card.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {[...bookBookmarks]
                .sort((a, b) => {
                  if (bookmarkSortBy === 'chapter') return a.chapterIndex - b.chapterIndex;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((bm) => (
                  <div
                    key={bm.id}
                    className="bg-cream-50/40 hover:bg-cream-50/80 border border-ink-100/90 rounded-2xl p-4 sm:p-5 transition-all shadow-xs flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-lily-900 px-2.5 py-0.5 rounded-full bg-lily-50 border border-lily-100 text-[11px]">
                          {bm.chapterTitle || `Chương ${bm.chapterIndex}`}
                        </span>
                        <span className="text-[11px] text-ink-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatRelativeTime(bm.createdAt)}</span>
                        </span>
                      </div>

                      <p className="text-xs sm:text-[13px] text-ink-800 italic font-serif leading-relaxed line-clamp-4 pl-2.5 border-l-2 border-lily-300">
                        “{bm.selectedText}”
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-ink-100/60 text-xs">
                      <button
                        onClick={() => {
                          jumpToChapter(bm.chapterIndex, bm.paragraphIndex);
                          navigateTo('reader', currentBook.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-ink-950 hover:bg-ink-800 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Đọc lại</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openQuoteEditor({
                            text: bm.selectedText,
                            bookTitle: currentBook.title,
                            chapterTitle: bm.chapterTitle,
                            author: currentBook.author,
                            bookmarkId: bm.id,
                          })}
                          className="px-3 py-1.5 rounded-xl border border-lily-200 bg-lily-50 hover:bg-lily-100 text-lily-950 text-[11px] font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                        >
                          <Sparkles className="w-3 h-3 text-lily-600" />
                          <span>Tạo ảnh</span>
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              await localBookSource.deleteBookmark(bm.id);
                              await loadBookBookmarks();
                              showToast('Đã xóa đoạn đã lưu.', 'info');
                            } catch {
                              showToast('Không thể xóa bookmark.', 'error');
                            }
                          }}
                          className="p-1.5 rounded-xl text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Xóa đoạn này"
                          aria-label="Xóa bookmark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Quote Card Editor Modal */}
      <QuoteCardEditor />
    </div>
  );
};
