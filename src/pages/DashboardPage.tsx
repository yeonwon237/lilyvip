import { localeTag } from '../i18n';
import { t } from '../i18n';
import React, { useState, useMemo, useEffect } from 'react';
import { Check, Plus, ChevronLeft, ChevronRight, Search, UserRound, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BookCover } from '../components/common/BookCover';
import { ProgressBar } from '../components/common/ProgressBar';
import { formatRelativeTime } from '../utils/dateUtils';
import { getReadingStreak, getEffectiveCurrentStreak, hasReadToday, getRecentActivity } from '../utils/readingStreak';

type LibraryFilter = 'all' | 'reading' | 'completed' | 'favorite' | 'website';

export const DashboardPage: React.FC = () => {
  const { user, books, shelves, navigateTo, maxLocalSlots, isLibraryLoading, openUpgradeModal, globalSearch, setGlobalSearch } = useApp();
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const bookRowRef = React.useRef<HTMLDivElement>(null);
  const openLibraryResults = () => {
    bookRowRef.current?.scrollTo({left:0,behavior:'smooth'});
    bookRowRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'});
  };
  const readingStreak = getReadingStreak();
  const effectiveStreak = getEffectiveCurrentStreak(readingStreak);
  const readToday = hasReadToday(readingStreak);
  const expiryReminderEnabled = localStorage.getItem('LILY_NOTIFY_EXPIRY_V1') !== 'false';
  const favoriteShelf = shelves.find(shelf => shelf.name.toLocaleLowerCase(localeTag()).includes('yêu thích'));

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const query = globalSearch.trim().toLocaleLowerCase(localeTag());
      if (query && !`${b.title} ${b.author}`.toLocaleLowerCase(localeTag()).includes(query)) return false;
      if (filter === 'reading') return b.progressPercent > 0 && b.progressPercent < 100;
      if (filter === 'completed') return b.progressPercent >= 100;
      if (filter === 'favorite') return Boolean(favoriteShelf && b.shelfIds.includes(favoriteShelf.id));
      if (filter === 'website') return b.fileFormat === 'WEBSITE';
      return true;
    }).sort((a, b) => {
      return new Date(b.lastReadAt || b.addedAt || 0).getTime() - new Date(a.lastReadAt || a.addedAt || 0).getTime();
    });
  }, [books, filter, globalSearch, favoriteShelf]);
  useEffect(() => { bookRowRef.current?.scrollTo({left:0}); }, [globalSearch, filter]);

  return (
    <div className="bookshop-dashboard flat-page mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden py-1 pb-20 sm:py-4 space-y-5 sm:space-y-7 animate-in fade-in duration-200">
      
      <div className="bookshop-discover-header">
        <div className="bookshop-discover-title">
          <h1>{t("Trang chủ")}</h1>
          <div className="bookshop-discover-switch" aria-label={t("Chọn khu vực")}>
            <button type="button" className="active" aria-current="page">{t("Dành cho bạn")}</button>
            <button type="button" onClick={() => navigateTo('library')}>{t("Thư viện của tôi")}</button>
          </div>
        </div>
        <button type="button" onClick={() => navigateTo(user.id === 'guest' ? 'login' : 'account')} className="bookshop-discover-profile" aria-label={t("Tài khoản")}>
          <span><UserRound className="h-4 w-4" /></span><strong>{user.name}</strong><ChevronDown className="h-3 w-3" />
        </button>
      </div>
      <form className="bookshop-discover-search" onSubmit={event => {event.preventDefault();openLibraryResults();}}>
        <label><span className="sr-only">{t("Lọc truyện")}</span><select value={filter} onChange={event => setFilter(event.target.value as LibraryFilter)}><option value="all">{t("Tất cả truyện")}</option><option value="reading">{t("Đang đọc")}</option><option value="completed">{t("Hoàn thành")}</option><option value="favorite">{t("Yêu thích")}</option><option value="website">Website</option></select></label>
        <Search className="h-4 w-4" />
        <input type="search" value={globalSearch} onChange={event => setGlobalSearch(event.target.value)} placeholder={t("Tìm truyện hoặc tác giả trong thư viện...")} aria-label={t("Tìm truyện")} />
        <button type="submit">{t("Tìm kiếm")}</button>
      </form>

      {books.length > 0 && <section className="bookshop-discover-row">
        <div className="bookshop-feature-heading"><h2>{t("Trong thư viện")}</h2><div className="lily-shelf-controls"><button type="button" aria-label={t("Truyện trước")} onClick={() => bookRowRef.current?.scrollBy({left:-bookRowRef.current.clientWidth,behavior:'smooth'})}><ChevronLeft size={16}/></button><button type="button" aria-label={t("Truyện tiếp theo")} onClick={() => bookRowRef.current?.scrollBy({left:bookRowRef.current.clientWidth,behavior:'smooth'})}><ChevronRight size={16}/></button></div><button type="button" onClick={() => navigateTo('library')}>{t("Xem tất cả ")}<ChevronRight className="h-4 w-4" /></button></div>
        <div ref={bookRowRef} className="bookshop-feature-row" tabIndex={0} aria-label={t("Truyện trong thư viện, cuộn ngang để xem thêm")}>
          {filteredBooks.map(book => <button type="button" key={book.id} className="bookshop-feature-book" onClick={() => navigateTo('book-detail', book.id)} title={book.title} aria-label={t("Mở {0}", [book.title])}><BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} coverColor={book.coverColor} size="responsive" /><span>{book.title}</span><small>{book.progressPercent > 0 ? t("Đang đọc · {0}%", [Math.round(book.progressPercent)]) : t("Trong thư viện")}</small></button>)}
          {filteredBooks.length === 0 && <p className="lily-search-empty" role="status">{t("Không tìm thấy truyện. Thử tên truyện hoặc tác giả khác.")}</p>}

        </div>
      </section>}

      {books.length > 0 && <section className="bookshop-category-section bookshop-home-shelves">
        <div className="bookshop-feature-heading"><h2>{t("Tủ sách")}</h2><button type="button" onClick={() => navigateTo('library')}>{t("Xem tất cả ")}<ChevronRight className="h-4 w-4" /></button></div>
        <div className="bookshop-category-grid">
          {([
            ['reading', t("Đang đọc"), '/default-covers/lily-cover-02.jpg'],
            ['favorite', t("Yêu thích"), '/default-covers/lily-cover-04.jpg'],
            ['completed', t("Hoàn thành"), '/default-covers/lily-cover-06.jpg'],
            ['website', t("Từ website"), '/default-covers/lily-cover-08.jpg'],
          ] as const).map(([value, label, cover]) => (
            <button type="button" key={value} onClick={() => { setFilter(value); openLibraryResults(); }}>
              <span className="bookshop-category-image"><img src={cover} alt="" /></span>
              <span>{t(label)}</span>
            </button>
          ))}
        </div>
      </section>}

      {books.some(book => book.progressPercent > 0 && book.progressPercent < 100) && <section className="bookshop-reading-section">
        <div className="bookshop-feature-heading"><h2>{t("Đọc tiếp")}</h2><button type="button" onClick={() => navigateTo('library')}>{t("Xem tất cả ")}<ChevronRight className="h-4 w-4" /></button></div>
        <div className="bookshop-reading-list">
          {books.filter(book => book.progressPercent > 0 && book.progressPercent < 100).slice(0, 3).map(book => <button type="button" key={book.id} className="bookshop-reading-item" onClick={() => navigateTo('reader', book.id)}>
            <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} coverColor={book.coverColor} size="sm" />
            <span className="bookshop-reading-copy"><b>{book.title}</b><small>{book.currentChapterTitle || t("Chương {0}", [book.currentChapter || 1])}</small><i><span style={{ width: `${book.progressPercent}%` }} /></i></span>
            <ChevronRight className="h-4 w-4" />
          </button>)}
        </div>
      </section>}

      {expiryReminderEnabled && (user.tier === 'vip1' || user.tier === 'vip2' || user.tier === 'vip') && user.vipDaysRemaining !== undefined && user.vipDaysRemaining <= 7 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-amber-950">{t("Gói của bạn ")}{user.vipDaysRemaining === 0 ? t("hết hạn hôm nay") : t("còn {0} ngày", [user.vipDaysRemaining])}</p>
            <p className="mt-1 text-[11px] leading-5 text-amber-900/80">{t("Lily không tự động gia hạn. Bạn có thể xem lại gói và chủ động gia hạn trong trang Tài khoản.")}</p>
          </div>
          <button type="button" onClick={() => navigateTo('account')} className="shrink-0 rounded-xl bg-amber-900 px-4 py-2.5 text-xs font-semibold text-white">{t("Xem gói thành viên")}</button>
        </section>
      )}

      {!isLibraryLoading && books.length === 0 && (
        <section className="grid min-h-[340px] items-center gap-10 overflow-hidden border-y border-ink-200 px-2 py-10 sm:grid-cols-[minmax(280px,0.9fr)_minmax(320px,1.1fr)] sm:px-8 sm:py-12 lg:min-h-[390px] lg:px-16">
          <div className="max-w-md text-center sm:text-left">
            <p className="text-[11px] font-semibold uppercase text-lily-700">{t("Kệ sách đang chờ bạn")}</p>
            <h2 className="mt-3 font-serif text-3xl font-bold leading-tight text-ink-950 sm:text-4xl">{t("Bắt đầu bằng một cuốn bạn yêu thích.")}</h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">{t("Chọn truyện từ LilyHub, website hoặc thiết bị. Lily sẽ kiểm tra chương trước khi lưu.")}</p>
            <button onClick={() => navigateTo('add-book')} className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-md border border-[#E8CBD9] bg-[#F6E8EF] px-5 text-sm font-semibold text-[#7A3158] transition-colors hover:bg-[#EFD8E4]">
              <Plus className="h-4 w-4" /> {t(" Thêm truyện")}</button>
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-ink-500 sm:justify-start"><span>{t("1. Chọn nguồn")}</span><span>{t("2. Kiểm tra truyện")}</span><span>{t("3. Đọc hoặc nghe")}</span></div>
            <p className="mt-2 text-[11px] text-ink-400">{user.isOwner ? t("Tài khoản chủ sở hữu · Không giới hạn truyện trên thiết bị") : t("Không cần đăng nhập · Tối đa {0} truyện trên thiết bị", [maxLocalSlots])}</p>
          </div>

          <div className="relative mx-auto h-[210px] w-[280px] sm:h-[270px] sm:w-[360px]" aria-hidden="true">
            <div className="absolute bottom-1 left-1/2 h-px w-[92%] -translate-x-1/2 bg-ink-300" />
            <img src="/default-covers/lily-cover-04.jpg" alt="" className="absolute bottom-3 left-2 h-[172px] w-[114px] -rotate-6 border border-white/80 object-cover shadow-[0_15px_30px_rgba(40,32,26,0.16)] sm:h-[222px] sm:w-[148px]" />
            <img src="/default-covers/lily-cover-09.jpg" alt="" className="absolute bottom-3 left-1/2 z-10 h-[196px] w-[130px] -translate-x-1/2 object-cover shadow-[0_18px_38px_rgba(40,32,26,0.22)] sm:h-[252px] sm:w-[168px]" />
            <img src="/default-covers/lily-cover-02.jpg" alt="" className="absolute bottom-3 right-2 h-[172px] w-[114px] rotate-6 border border-white/80 object-cover shadow-[0_15px_30px_rgba(40,32,26,0.16)] sm:h-[222px] sm:w-[148px]" />
          </div>
        </section>
      )}


      {user.tier === 'free' && books.length >= Math.max(1, maxLocalSlots - 1) && (
        <section className="flex flex-col gap-3 rounded-2xl border border-lily-200 bg-lily-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-lily-900">{user.isOwner ? t("Thư viện chủ sở hữu đang có {0} truyện", [books.length]) : t("Thư viện miễn phí đang dùng {0}/{1} truyện", [books.length, maxLocalSlots])}</p>
            <p className="mt-1 text-[11px] leading-5 text-ink-600">{t("MY50 mở rộng lên 50 truyện và có sao lưu để chuyển thư viện khi đổi thiết bị.")}</p>
          </div>
          <button type="button" onClick={() => openUpgradeModal(t("Bạn sắp dùng hết giới hạn của thư viện miễn phí."))} className="shrink-0 rounded-xl bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white">{t("Xem lựa chọn nâng cấp")}</button>
        </section>
      )}

      <section className="lily-reading-habits">
        <div className="bookshop-feature-heading"><h2>{t("Thói quen đọc của bạn")}</h2></div>
        <div className="lily-reading-rhythm">
          <div className="lily-rhythm-summary"><span>{t("Hoạt động đọc")}</span><p><strong>{effectiveStreak}</strong> {t(" ngày liên tiếp")}</p><small>{readToday ? t("Đã đọc hôm nay.") : t("Chưa đọc hôm nay.")}</small></div>
          <div className="lily-week" aria-label={t("Hoạt động đọc 7 ngày gần nhất")}>
            {getRecentActivity(readingStreak, 7).map((active, index) => {
              const date = new Date(); date.setDate(date.getDate() - 6 + index);
              const today = index === 6;
              return <div key={index} className={`lily-week-day ${active ? 'is-read' : ''} ${today ? 'is-today' : ''}`} aria-label={`${date.toLocaleDateString(localeTag())}: ${active ? t("Đã đọc") : t("Chưa đọc")}`}><span>{today ? t('H.nay') : date.toLocaleDateString(localeTag(), { weekday: 'short' })}</span><i>{active ? <Check size={17}/> : <span>{date.getDate()}</span>}</i><b/></div>;
            })}
          </div>
        </div>
        <div className="lily-rhythm-footer"><span><strong>{books.filter(b => b.progressPercent > 0 && b.progressPercent < 100).length}</strong> {t(" đang đọc ")}<i>·</i> <strong>{books.filter(b => b.progressPercent >= 100).length}</strong> {t(" đã hoàn thành")}</span><button type="button" onClick={() => navigateTo('stats')}>{t("Xem nhật ký ")}<ChevronRight size={14}/></button></div>

      </section>

    </div>
  );
};
