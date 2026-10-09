import React, { useState, useEffect } from 'react';
import { AppContent } from '../App';
import { AppContext, AppContextType, PageRoute } from '../context/AppContext';
import { ReaderProvider } from '../context/ReaderContext';
import { LocalBookSource } from '../book-engine/source/LocalBookSource';
import { Book, Shelf } from '../types';
import './preview.css';

const params = new URLSearchParams(location.search);
const count = [12,48,96].includes(Number(params.get('count'))) ? Number(params.get('count')) : 48;
const titles = ['Đặc Công Phong Lưu','Chủ Tịch Đang Viết Chữ','Vân Mộng','Bên Kia Bầu Trời','Ngày Mai Của Những Ngày Đã Cũ','Trường An Có Một Người Đợi Ta Trở Về','Mùa Hạ Không Tên','Dưới Tán Hải Đường','Hành Trình Qua Những Vì Sao','Sau Khi Xuyên Thành Nhân Vật Phụ, Tôi Quyết Định Sống Một Cuộc Đời Bình Yên','Gió Qua Miền Ký Ức','Đêm Cuối Cùng Ở Thành Phố'];
const names = ['Đang đọc','Yêu thích','Đã hoàn thành','Tiên hiệp','Ngôn tình','Đọc cuối tuần','Truyện dài','Để dành'];
const initialBooks: Book[] = Array.from({length:count},(_,i)=>({
 id:`preview-${i}`,title:titles[i%titles.length]+(i>=12?` · Tập ${Math.floor(i/12)+1}`:''),author:['Lâm An','Mộc Miên','Thanh Phong','Tác giả khuyết danh'][i%4],
 coverUrl:`/default-covers/lily-cover-${String(i%10+1).padStart(2,'0')}.jpg`,totalChapters:120+i*7,currentChapter:i<12?12+i*3:0,currentChapterTitle:i<12?`Chương ${12+i*3}: Gặp lại`:'Chưa đọc',progressPercent:i<12?10+i*5:i%5===0?100:0,
 wordCount:240000+i*4000,fileSizeMB:1.2+i/10,fileFormat:i%3===0?'WEBSITE':'EPUB',storageType:'local',lastReadAt:new Date(Date.now()-i*3600000).toISOString(),addedAt:new Date(Date.now()-i*86400000).toISOString(),tags:[['Tiên hiệp','Ngôn tình','Huyền huyễn','Đời thường'][i%4]],shelfIds:[`shelf-${i%8}`],isOffline:true,
 audioDurationSec:i<3?18000:undefined,audioProgressSec:i<3?2400+i*3200:undefined,description:'Truyện mẫu để kiểm tra bố cục thư viện Lily. Không thuộc dữ liệu cá nhân.'
}));
class PreviewSource extends LocalBookSource {
 async getProgress(){return null;}
 async getChapter(bookId:string,index:number){return {id:`${bookId}-${index}`,bookId,index,title:`Chương ${index}: Gặp lại`,wordCount:60,isRead:false,isCurrent:true,paragraphs:['Đây là nội dung minh họa dùng để kiểm tra giao diện Lily khi có nhiều truyện.','Nắng chiều đi qua những hàng cây, phủ lên trang sách một khoảng sáng dịu dàng.']};}
 async getChapterList(bookId:string){return Array.from({length:initialBooks.find(b=>b.id===bookId)?.totalChapters||120},(_,i)=>({index:i+1,title:`Chương ${i+1}: Hành trình`,wordCount:2000,isRead:i<12,isCurrent:i===12}));}
 async getBookmarksForBook(){return [];}
 async getAnnotationsForBook(){return [];}
 async getAnnotationsForChapter(){return [];}
 async saveProgress(){}
}
const source = new PreviewSource();
localStorage.setItem('LILY_RECENT_AUDIO_BOOKS_V1',JSON.stringify(initialBooks.slice(0,3).map(b=>b.id)));

function SampleApp(){
 const [books,setBooks]=useState(initialBooks);
 const [shelves,setShelves]=useState<Shelf[]>(names.map((name,i)=>({id:`shelf-${i}`,name,color:'#dedbd2',bookCount:initialBooks.filter(b=>b.shelfIds.includes(`shelf-${i}`)).length,description:'Bộ sưu tập của bạn'})));
 const [currentPage,setPage]=useState<PageRoute>((params.get('page')||'library') as PageRoute);
 const [selectedBookId,setBook]=useState<string|null>(initialBooks[0].id);
 const [selectedShelfId,setShelf]=useState<string|null>(null);
 const [globalSearch,setGlobalSearch]=useState('');
 const [appTheme,setAppTheme]=useState<'light'|'dark'|'system'>(params.get('theme')==='dark'?'dark':'light');
 const [toasts,setToasts]=useState<AppContextType['toasts']>([]);
 const showToast:AppContextType['showToast']=(message,type='info')=>setToasts(t=>[...t,{id:String(Date.now()),message,type}]);
 const unavailable=()=>showToast('Bản xem thử: thao tác này dùng trong thư viện thật.');
 const updateBook:AppContextType['updateBook']=(id,updates)=>setBooks(bs=>bs.map(b=>b.id===id?{...b,...updates}:b));
 const value:AppContextType={
 user:{id:'preview',name:'Bạn đọc Lily',tier:'vip2',freeSlotsUsed:count,freeSlotsTotal:100,cloudStorageUsedMB:0,cloudStorageTotalMB:1024,streakDays:7,totalReadingMinutes:320},
 books,shelves,currentPage,selectedBookId,selectedShelfId,currentBook:books.find(b=>b.id===selectedBookId)||null,
 navigateTo:(page,bookId,shelfId)=>{setPage(page);if(bookId!==undefined)setBook(bookId);setShelf(shelfId||null);},
 readingStats:{streakDays:7,totalBooks:count,booksFinished:8,weekMinutes:180},toasts,showToast,removeToast:id=>setToasts(t=>t.filter(x=>x.id!==id)),
 localBookSource:source,updateBook,removeBook:async id=>setBooks(bs=>bs.filter(b=>b.id!==id)),addBook:unavailable,
 addParsedBook:async()=>{throw new Error('Chỉ nhập truyện trong thư viện thật.');},syncLocalBook:async()=>{throw new Error('Bản xem thử');},
 toggleBookOffline:unavailable,reloadLocalBooks:async()=>{},libraryError:null,isLibraryLoading:false,
 maxLocalSlots:100,isSlotFull:false,libraryLimits:{total:100,lilyhub:100,external:100},lilyHubSlotsUsed:0,externalSlotsUsed:count,canAddBookFrom:()=>true,getSlotError:()=>null,
 createShelf:s=>setShelves(ss=>[...ss,{...s,id:`shelf-${Date.now()}`,bookCount:0}]),
 addBookToShelf:(id,sid)=>{const b=books.find(b=>b.id===id);if(b)updateBook(id,{shelfIds:b.shelfIds.includes(sid)?b.shelfIds.filter(s=>s!==sid):[...b.shelfIds,sid]});},
 renameShelf:(id,name)=>setShelves(ss=>ss.map(s=>s.id===id?{...s,name}:s)),deleteShelf:id=>setShelves(ss=>ss.filter(s=>s.id!==id)),
 isUpgradeModalOpen:false,setIsUpgradeModalOpen:unavailable,upgradeModalFeature:'',openUpgradeModal:unavailable,canUseFeature:()=>true,
 globalSearch,setGlobalSearch,appTheme,setAppTheme,toggleAppTheme:()=>setAppTheme(t=>t==='dark'?'light':'dark'),refreshLilyHubSession:async()=>false,disconnectLilyHub:async()=>{},setUserTier:unavailable
 };
 return <AppContext.Provider value={value}><ReaderProvider><AppContent/></ReaderProvider></AppContext.Provider>;
}
export default function LibraryPreview(){
 const [page,setPage]=useState(params.get('page')||'library');
 const [size,setSize]=useState('393');
 const [amount,setAmount]=useState(String(count));
 const [theme,setTheme]=useState(params.get('theme')||'light');
 const [frameDark,setFrameDark]=useState(params.get('theme')==='dark');
 useEffect(()=>{const sync=(event:MessageEvent)=>{if(event.origin===location.origin && event.source===document.querySelector('iframe')?.contentWindow && event.data?.type==='lily-appearance')setFrameDark(event.data.dark===true);};window.addEventListener('message',sync);return()=>window.removeEventListener('message',sync);},[]);

 if(params.get('embedded')==='1')return <SampleApp/>;
 const mobile=params.get('preview')==='pwa';
 return <div className="fixture-workspace" data-frame-dark={frameDark}><div className="fixture-toolbar"><strong>{mobile?'PWA · Mô phỏng':'Lily · Dữ liệu mẫu'}</strong><select aria-label="Số truyện" value={amount} onChange={e=>setAmount(e.target.value)}>{[12,48,96].map(n=><option key={n} value={n}>{n} truyện</option>)}</select><select aria-label="Trang" value={page} onChange={e=>setPage(e.target.value)}>{[['dashboard','Trang chủ'],['library','Thư viện'],['add-book','Thêm truyện'],['book-detail','Thông tin truyện'],['reader','Đọc truyện'],['shelves','Tủ sách'],['audio','Sách nói'],['settings','Cài đặt'],['stats','Nhật ký đọc'],['account','Tài khoản'],['landing','Giới thiệu'],['legal','Điều khoản'],['login','Đăng nhập']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select><select aria-label="Giao diện" value={theme} onChange={e=>setTheme(e.target.value)}><option value="light">Sáng</option><option value="dark">Tối</option></select>{mobile&&<select aria-label="Chiều rộng điện thoại" value={size} onChange={e=>setSize(e.target.value)}>{[320,375,393,430].map(n=><option key={n}>{n}</option>)}</select>}<a href={`?preview=${mobile?'library':'pwa'}&count=${amount}&page=${page}&theme=${theme}`}>{mobile?'Desktop':'PWA'}</a><a href="http://127.0.0.1:3000/">Lily thật ↗</a><small>12 đang đọc · 3 nghe dở · 8 tủ</small></div><div className={mobile?'fixture-phone':'fixture-desktop'} style={mobile?{width:Number(size)}:undefined}>{mobile&&<div className="fixture-status">9:41 <span>● ▰</span></div>}<iframe key={`${page}-${amount}-${theme}`} title="Lily với thư viện mẫu" src={`?preview=library&embedded=1&count=${amount}&page=${page}&theme=${theme}${mobile?'&pwa=1':''}`}/>{mobile&&<div className="fixture-home-indicator"><i/></div>}</div></div>;
}
