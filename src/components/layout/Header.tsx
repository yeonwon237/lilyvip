import React from 'react';
import { Search, Sparkles, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PlanStatus } from '../common/PlanStatus';

export const Header: React.FC = () => {
  const { 
    user, 
    currentPage, 
    navigateTo, 
    globalSearch, 
    setGlobalSearch,
    openUpgradeModal 
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
      case 'audio': return 'Audio & TTS';
      case 'settings': return 'Cài đặt Reader';
      case 'account': return 'Tài khoản & Gói';
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
            <div className="brand-seal w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs">
              <span className="font-serif italic font-semibold">L</span>
            </div>
            <span className="font-serif font-semibold text-ink-950 text-base tracking-tight">Lily <small className="font-sans text-[8px] tracking-[.16em] align-middle text-lily-700">VIP</small></span>
          </div>

          {/* Desktop Breadcrumb/Page Context */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-ink-500 font-medium select-none">
            <span className="text-ink-400">Lily VIP</span>
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
          {user.tier !== 'vip' ? (
            <button
              onClick={() => openUpgradeModal('Khám phá Lily VIP')}
              className="px-3 py-1 rounded-full bg-gradient-to-r from-lily-600 to-lily-700 hover:from-lily-700 hover:to-lily-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-3 h-3" />
              <span>Nâng cấp</span>
            </button>
          ) : (
            <button
              onClick={() => navigateTo('add-book')}
              className="hidden sm:inline-flex px-3 py-1 rounded-full bg-ink-900 hover:bg-ink-800 text-white text-xs font-medium shadow-xs items-center gap-1 transition-all active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>Thêm truyện</span>
            </button>
          )}

          {/* User Avatar */}
          <button
            onClick={() => navigateTo('account')}
            className="relative p-0.5 rounded-full border border-ink-200 hover:border-lily-400 transition-colors shrink-0"
            title="Xem tài khoản"
          >
            <img
              src={user.avatar}
              alt={user.name}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-white"
            />
            <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-1 ring-white ${
              user.tier === 'vip' ? 'bg-lily-500' : user.tier === 'audio' ? 'bg-lavender-500' : 'bg-emerald-500'
            }`} />
          </button>
        </div>
      </div>
    </header>
  );
};
