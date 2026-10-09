import { localeTag } from '../i18n';
import { t } from '../i18n';
import React, { useState } from 'react';
import { Check, ChevronRight, ArrowLeft, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getReadingStreak, getEffectiveCurrentStreak, hasReadToday, getRecentActivity } from '../utils/readingStreak';

export const StatsPage: React.FC = () => {
  const { books, navigateTo } = useApp();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(12);
  const streak = getReadingStreak();
  const activeDays = getRecentActivity(streak, 14);
  const words = books.reduce((sum,b)=>sum+(b.wordCount||0),0);
  const chapters = books.reduce((sum,b)=>sum+(b.totalChapters||0),0);
  const completed = books.filter(b=>b.progressPercent>=100).length;
  const inProgress = books.filter(b=>b.progressPercent>0 && b.progressPercent<100).length;
  const results = books.filter(b=>`${b.title} ${b.author}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'))).sort((a,b)=>new Date(b.lastReadAt||b.addedAt).getTime()-new Date(a.lastReadAt||a.addedAt).getTime());
  return <div className="flat-page lily-journal">
    <button className="journal-back" onClick={()=>navigateTo('dashboard')}><ArrowLeft size={15}/> {t(" Trang chủ")}</button>
    <header className="journal-heading"><h1>{t("Nhật ký đọc")}</h1></header>
    <section className="journal-activity" aria-label={t("Hoạt động đọc")}>
      <div className="lily-rhythm-summary"><span>{t("Chuỗi ngày đọc")}</span><p><strong>{getEffectiveCurrentStreak(streak)}</strong> {t(" ngày liên tiếp")}</p><small>{hasReadToday(streak)?t("Bạn đã đọc hôm nay."):t("Chưa ghi nhận hoạt động đọc hôm nay.")}</small><div className="journal-record">{t("Dài nhất ")}<b>{streak.longestStreak} {t(" ngày")}</b></div></div>
      <div className="journal-calendar"><div className="journal-section-heading"><h2>{t("14 ngày gần đây")}</h2><span>{activeDays.filter(Boolean).length} {t(" ngày đã đọc")}</span></div><div className="journal-days">{activeDays.map((active,index)=>{const d=new Date();d.setDate(d.getDate()-13+index);return <div key={index} className={`lily-week-day ${active?'is-read':''} ${index===13?'is-today':''}`} aria-label={`${d.toLocaleDateString(localeTag())}: ${active?t("Đã đọc"):t("Chưa đọc")}`}><span>{d.toLocaleDateString(localeTag(), { weekday: 'short' })}</span><i>{active?<Check size={16}/>:d.getDate()}</i><b/></div>;})}</div></div>
    </section>
    <div className="journal-totals"><span><strong>{inProgress}</strong> {t(" đang đọc")}</span><span><strong>{completed}</strong> {t(" hoàn thành")}</span><span><strong>{books.length}</strong> {t(" trong thư viện")}</span></div>
    <section className="journal-books"><div className="journal-section-heading"><h2>{t("Tiến độ đọc")}</h2><span>{results.length} {t(" truyện")}</span></div>
      {books.length>0&&<label className="journal-search"><Search size={16}/><input type="search" aria-label={t("Tìm trong nhật ký")} placeholder={t("Tìm truyện hoặc tác giả")} value={query} onChange={e=>{setQuery(e.target.value);setLimit(12);}}/></label>}
      <div className="journal-book-list">{results.slice(0,limit).map(book=>{const progress=Math.max(0,Math.min(100,Math.round(book.progressPercent||0)));return <button key={book.id} className="journal-book" onClick={()=>navigateTo('book-detail',book.id)}><img src={book.coverUrl||'/default-covers/lily-cover-01.jpg'} alt="" loading="lazy"/><span className="journal-book-info"><strong>{book.title}</strong><small>{book.author}</small><span className="journal-progress"><i style={{width:`${progress}%`}}/></span><small>{progress>=100?t("Đã hoàn thành"):progress>0?t("Chương {0} / {1}", [book.currentChapter, book.totalChapters]):t("Chưa bắt đầu")}</small></span><span className="journal-percent">{progress}%</span><ChevronRight size={15}/></button>;})}</div>
      {!results.length&&<div className="journal-empty"><p>{books.length?t("Không tìm thấy truyện phù hợp."):t("Chưa có truyện trong thư viện.")}</p>{!books.length&&<button onClick={()=>navigateTo('add-book')}>{t("Thêm truyện ")}<ChevronRight size={15}/></button>}</div>}
      {results.length>limit&&<button className="journal-more" onClick={()=>setLimit(n=>n+12)}>{t("Xem thêm ")}{Math.min(12,results.length-limit)} {t(" truyện")}</button>}
    </section>
    <footer className="journal-footnote">{t("Thư viện có ")}{words.toLocaleString(localeTag())} {t(" từ · ")}{chapters.toLocaleString(localeTag())} {t(" chương. Lịch đọc được ghi nhận trên thiết bị này.")}</footer>
  </div>;
};
