import React from 'react';
import { Search, Plus, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PlanStatus } from '../common/PlanStatus';

export const Header: React.FC = () => {
  const { 
    user, 
    currentPage, 
    navigateTo, 
    globalSearch, 
    setGlobalSearch,
    isOpenBeta
  } = useApp();

  // Hide header in Reader page to keep reader immersive
  if (currentPage === 'reader') return null;

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard': return 'Tổng quan';
      case 'library': return 'Thư viện truyện';
      case 'add-book': return 'Thêm truyện';
      case 'shelves': return 'Tủ sách';
      case 'stats': return 'Nhật ký đọc';
      case 'audio': return 'Giọng Lily';
      case 'settings': return 'Cài đặt';
      default: return 'Trang chủ';
    }
  };

  return (
    <header className="luxury-header sticky top-0 z-30 px-4 sm:px-6 lg:px-8 h-14 md:h-[62px] flex items-center transition-all">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4">
        {/* LEFT: Context Breadcrumb (Desktop) / Clean Brand (Mobile) */}
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          {/* Mobile Brand */}
          <div 
            onClick={() => navigateTo('dashboard')}
            className="lg:hidden flex items-center gap-2 cursor-pointer shrink-0"
          >
            <img src="/lilyhub-logo.png" alt="LilyHub" className="w-[104px] h-auto object-contain" />
            {isOpenBeta && <small className="font-sans text-[8px] tracking-[.12em] text-lily-700">BETA</small>}
          </div>

          {/* Desktop Breadcrumb/Page Context */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-ink-500 font-medium select-none">
            <span className="text-ink-400">Lily{isOpenBeta ? ' Beta' : ' VIP'}</span>
            <span className="text-ink-300">/</span>
            <span className="text-ink-900 font-semibold">{getPageTitle()}</span>
          </div>
        </div>

        {/* CENTER: DESKTOP SEARCH BAR ONLY (Slim, elegant single line) */}
        <div className="flex-1 max-w-sm mx-auto hidden md:block">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Tìm kiếm tác phẩm, tác giả..."
              className="luxury-search w-full pl-9 pr-10 py-2 rounded-full text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none transition-all"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-medium text-ink-400 bg-ink-100/70 px-1.5 py-0.2 rounded border border-ink-200/50 hidden sm:block pointer-events-none">
              ⌘K
            </div>
          </div>
        </div>

        {/* RIGHT: COMPACT BALANCED ACTION CLUSTER */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Plan Status Chip */}
          <div className="hidden sm:block">
            <PlanStatus tier={user.tier} audioDays={user.audioDaysRemaining} vipDays={user.vipDaysRemaining} size="sm" />
          </div>

          {/* Action Button */}
          <button
              onClick={() => navigateTo('add-book')}
              className="hidden sm:inline-flex px-3 py-1 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-medium shadow-xs items-center gap-1 transition-all active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>Thêm truyện</span>
          </button>

          <button
            onClick={() => navigateTo('settings')}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 text-ink-600 hover:border-lily-400 hover:text-lily-700"
            title="Mở cài đặt"
            aria-label="Mở cài đặt"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
