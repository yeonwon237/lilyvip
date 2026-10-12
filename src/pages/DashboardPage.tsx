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
  const mobileBookRowRef = React.useRef<HTMLDivElement>(null);
  const openLibraryResults = () => {
    const row = window.matchMedia('(max-width: 900px)').matches ? mobileBookRowRef.current : bookRowRef.current;
    row?.scrollTo({left:0,behavior:'smooth'});
    row?.scrollIntoView({behavior:'smooth',block:'nearest'});
  };
  const readingStreak = getReadingStreak();
  const effectiveStreak = getEffectiveCurrentStreak(readingStreak);
  const readToday = hasReadToday(readingStreak);
  const recentActivity = getRecentActivity(readingStreak, 7);
  const activeDays = recentActivity.filter(Boolean).length;
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
  const mobileBookGroups = Array.from({ length: Math.ceil(filteredBooks.length / 5) }, (_, index) => filteredBooks.slice(index * 5, index * 5 + 5));
  useEffect(() => { bookRowRef.current?.scrollTo({left:0}); mobileBookRowRef.current?.scrollTo({left:0}); }, [globalSearch, filter]);

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
      {books.length > 0 && <form className="bookshop-discover-search" onSubmit={event => {event.preventDefault();openLibraryResults();}}>
        <label><span className="sr-only">{t("Lọc truyện")}</span><select value={filter} onChange={event => setFilter(event.target.value as LibraryFilter)}><option value="all">{t("Tất cả truyện")}</option><option value="reading">{t("Đang đọc")}</option><option value="completed">{t("Hoàn thành")}</option><option value="favorite">{t("Yêu thích")}</option><option value="website">Website</option></select></label>
        <Search className="h-4 w-4" />
        <input type="search" value={globalSearch} onChange={event => setGlobalSearch(event.target.value)} placeholder={t("Tìm truyện hoặc tác giả trong thư viện...")} aria-label={t("Tìm truyện")} />
        <button type="submit">{t("Tìm kiếm")}</button>
      </form>}

      {books.length > 0 && <section className="bookshop-discover-row">
        <div className="bookshop-feature-heading"><h2>{t("Trong thư viện")}</h2><div className="lily-shelf-controls"><button type="button" aria-label={t("Truyện trước")} onClick={() => bookRowRef.current?.scrollBy({left:-bookRowRef.current.clientWidth,behavior:'smooth'})}><ChevronLeft size={16}/></button><button type="button" aria-label={t("Truyện tiếp theo")} onClick={() => bookRowRef.current?.scrollBy({left:bookRowRef.current.clientWidth,behavior:'smooth'})}><ChevronRight size={16}/></button></div><button type="button" onClick={() => navigateTo('library')}>{t("Xem tất cả ")}<ChevronRight className="h-4 w-4" /></button></div>
        <div ref={bookRowRef} className="bookshop-feature-row" tabIndex={0} aria-label={t("Truyện trong thư viện, cuộn ngang để xem thêm")}>
          {filteredBooks.map(book => <button type="button" key={book.id} className="bookshop-feature-book" onClick={() => navigateTo('book-detail', book.id)} title={book.title} aria-label={t("Mở {0}", [book.title])}><BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} coverColor={book.coverColor} size="responsive" /><span>{book.title}</span><small>{book.progressPercent > 0 ? t("Đang đọc · {0}%", [Math.round(book.progressPercent)]) : t("Trong thư viện")}</small></button>)}
          {filteredBooks.length === 0 && <p className="lily-search-empty" role="status">{t("Không tìm thấy truyện. Thử tên truyện hoặc tác giả khác.")}</p>}

        </div>
        <div ref={mobileBookRowRef} className="bookshop-feature-mosaic" tabIndex={0} aria-label={t("Truyện trong thư viện, cuộn ngang để xem thêm")}>
          {mobileBookGroups.map(group => <div className="bookshop-feature-mosaic-group" key={group[0].id}>
              {group.map(book => <button type="button" key={book.id} className="bookshop-feature-mosaic-book" onClick={() => navigateTo('book-detail', book.id)} title={book.title} aria-label={t("Mở {0}", [book.title])}>
                <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} coverColor={book.coverColor} size="responsive" />
              </button>)}
          </div>)}
          {filteredBooks.length === 0 && <p className="lily-search-empty" role="status">{t("Không tìm thấy truyện. Thử tên truyện hoặc tác giả khác.")}</p>}
        </div>
      </section>}

      {books.some(book => book.progressPercent > 0 && book.progressPercent < 100) && <section className="bookshop-reading-section">
        <div className="bookshop-feature-heading"><h2>{t("Đọc tiếp")}</h2><button type="button" onClick={() => navigateTo('library')}>{t("Xem tất cả ")}<ChevronRight className="h-4 w-4" /></button></div>
        <div className="bookshop-reading-list">
          {books.filter(book => book.progressPercent > 0 && book.progressPercent < 100).sort((a, b) => new Date(b.lastReadAt || 0).getTime() - new Date(a.lastReadAt || 0).getTime()).map(book => <button type="button" key={book.id} className="bookshop-reading-item" onClick={() => navigateTo('reader', book.id)}>
            <span className="bookshop-reading-cover">
              <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} coverColor={book.coverColor} size="responsive" />
              <span className="bookshop-reading-progress" role="progressbar" aria-label={book.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(book.progressPercent)}><span style={{ width: `${book.progressPercent}%` }} /></span>
            </span>
            <span className="bookshop-reading-copy"><b>{book.title}</b><small>{t("Chương {0}", [book.currentChapter || 1])}</small></span>
          </button>)}
        </div>
      </section>}

      {books.length > 0 && <section className="bookshop-category-section bookshop-home-shelves">
        <div className="bookshop-feature-heading"><h2>{t("Tủ sách")}</h2><button type="button" onClick={() => navigateTo('shelves')}>{t("Xem tất cả ")}<ChevronRight className="h-4 w-4" /></button></div>
        <div className="lily-wood-home lily-wood-tier">
          <div className="lily-wood-books">
            {shelves.slice(0, 4).map((shelf, index) => {
              const book = books.find(book => book.shelfIds.includes(shelf.id));
              return <button type="button" className="lily-wood-book" key={shelf.id} onClick={() => navigateTo('shelves', undefined, shelf.id)} title={shelf.name}>
                <BookCover title={book?.title || shelf.name} author={book?.author} coverUrl={book?.coverUrl || `/default-covers/lily-cover-${String(index + 1).padStart(2, '0')}.jpg`} size="responsive" />
                <span className="lily-wood-label">{shelf.name}</span>
              </button>;
            })}
            <span className="lily-wood-bookend" aria-hidden="true" />
          </div>
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
        <section className="lily-empty-library">
          <div className="lily-empty-covers" aria-hidden="true">
            <span className="lily-empty-book"><img src="/default-covers/lily-cover-04.jpg" alt="" /></span>
            <span className="lily-empty-book"><img src="/default-covers/lily-cover-09.jpg" alt="" /></span>
            <span className="lily-empty-book"><img src="/default-covers/lily-cover-02.jpg" alt="" /></span>
          </div>
          <h2>{t("Bạn chưa có truyện nào")}</h2>
          <button type="button" onClick={() => navigateTo('add-book')}><Plus size={16}/>{t("Thêm truyện")}</button>
          <small>EPUB · TXT · DOCX · Website</small>
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

      {books.length > 0 && <section className="lily-reading-habits">
        <div className="bookshop-feature-heading"><h2>{t("Thói quen đọc của bạn")}</h2></div>
        <div className="lily-reading-rhythm">
          <div className="lily-habit-overview">
            <div className="lily-habit-ring" style={{ '--habit-progress': `${activeDays / 7 * 360}deg` } as React.CSSProperties} aria-label={`${activeDays}/7 ${t("Hoạt động đọc 7 ngày gần nhất")}`}><div><strong>{activeDays}<span>/7</span></strong><small>{t("Hoạt động đọc")}</small></div></div>
            <div className="lily-rhythm-summary"><span>{t("Hoạt động đọc 7 ngày gần nhất")}</span><p><strong>{effectiveStreak}</strong> {t(" ngày liên tiếp")}</p><small className={readToday ? 'has-read' : ''}>{readToday && <Check size={12}/ >}{readToday ? t("Đã đọc hôm nay.") : t("Chưa đọc hôm nay.")}</small></div>
          </div>
          <div className="lily-week" aria-label={t("Hoạt động đọc 7 ngày gần nhất")}>
            {recentActivity.map((active, index) => {
              const date = new Date(); date.setDate(date.getDate() - 6 + index);
              const today = index === 6;
              return <div key={index} className={`lily-week-day ${active ? 'is-read' : ''} ${today ? 'is-today' : ''}`} aria-label={`${date.toLocaleDateString(localeTag())}: ${active ? t("Đã đọc") : t("Chưa đọc")}`}><span>{today ? t('H.nay') : date.toLocaleDateString(localeTag(), { weekday: 'short' })}</span><i>{active ? <Check size={17}/> : <span>{date.getDate()}</span>}</i><b/></div>;
            })}
          </div>
        </div>
        <div className="lily-rhythm-footer"><span><strong>{books.filter(b => b.progressPercent > 0 && b.progressPercent < 100).length}</strong> {t(" đang đọc ")}<i>·</i> <strong>{books.filter(b => b.progressPercent >= 100).length}</strong> {t(" đã hoàn thành")}</span><button type="button" onClick={() => navigateTo('stats')}>{t("Xem nhật ký ")}<ChevronRight size={14}/></button></div>

      </section>}

    </div>
  );
};
