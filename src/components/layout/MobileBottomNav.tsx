import React from 'react';
import { Home, BookOpen, Plus, FolderHeart, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MobileBottomNav: React.FC = () => {
  const { currentPage, navigateTo } = useApp();

  // Hide on reader page for full reading immersion
  if (currentPage === 'reader') return null;

  return (
    <nav 
      aria-label="Thanh điều hướng di động"
      className="luxury-mobile-nav fixed inset-x-0 bottom-0 z-40 lg:hidden"
    >
      <div className="mx-auto grid h-[60px] w-full max-w-lg grid-cols-5 items-stretch px-2">
        {/* Slot 1: Trang chủ */}
        <button
          onClick={() => navigateTo('dashboard')}
          aria-label="Trang chủ"
          className={`flex h-full w-full flex-col items-center justify-center gap-1 border-t-2 transition-colors ${
            currentPage === 'dashboard' 
              ? 'border-lily-700 text-lily-900 font-bold'
              : 'border-transparent text-ink-500 hover:text-ink-800'
          }`}
        >
          <Home className={`h-5 w-5 ${currentPage === 'dashboard' ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] font-medium">Trang chủ</span>
        </button>

        {/* Slot 2: Thư viện */}
        <button
          onClick={() => navigateTo('library')}
          aria-label="Thư viện"
          className={`flex h-full w-full flex-col items-center justify-center gap-1 border-t-2 transition-colors ${
            currentPage === 'library' 
              ? 'border-lily-700 text-lily-900 font-bold'
              : 'border-transparent text-ink-500 hover:text-ink-800'
          }`}
        >
          <BookOpen className={`h-5 w-5 ${currentPage === 'library' ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] font-medium">Thư viện</span>
        </button>

        {/* Slot 3: Chính giữa: Nút + Thêm truyện */}
        <button
          onClick={() => navigateTo('add-book')}
          aria-label="Thêm truyện mới"
          className={`flex h-full w-full flex-col items-center justify-center gap-0.5 border-t-2 border-transparent transition-colors ${
            currentPage === 'add-book' ? 'text-lily-900 font-bold' : 'text-ink-500'
          }`}
        >
          <span className={`-mt-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#E8CBD9] bg-[#F6E8EF] text-[#7A3158] shadow-md ring-2 ring-[#fffaf5] ${currentPage === 'add-book' ? 'ring-lily-200' : ''}`}>
            <Plus className="h-5 w-5 stroke-[2.2]" />
          </span>
          <span className="text-[10px] font-medium">Thêm</span>
        </button>

        {/* Slot 4: Tủ sách */}
        <button
          onClick={() => navigateTo('shelves')}
          aria-label="Tủ sách"
          className={`flex h-full w-full flex-col items-center justify-center gap-1 border-t-2 transition-colors ${
            currentPage === 'shelves' 
              ? 'border-lily-700 text-lily-900 font-bold'
              : 'border-transparent text-ink-500 hover:text-ink-800'
          }`}
        >
          <FolderHeart className={`h-5 w-5 ${currentPage === 'shelves' ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] font-medium">Tủ sách</span>
        </button>

        {/* Slot 5: Cài đặt */}
        <button
          onClick={() => navigateTo('settings')}
          aria-label="Cài đặt"
          className={`flex h-full w-full flex-col items-center justify-center gap-1 border-t-2 transition-colors ${
            currentPage === 'settings' || currentPage === 'account'
              ? 'border-lily-700 text-lily-900 font-bold'
              : 'border-transparent text-ink-500 hover:text-ink-800'
          }`}
        >
          <Settings className={`h-5 w-5 ${currentPage === 'settings' || currentPage === 'account' ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
          <span className="text-[10px] font-medium">Cài đặt</span>
        </button>
      </div>
    </nav>
  );
};
