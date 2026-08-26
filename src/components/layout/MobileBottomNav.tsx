import React from 'react';
import { Home, BookOpen, Plus, FolderHeart, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MobileBottomNav: React.FC = () => {
  const { currentPage, navigateTo } = useApp();

  // Hide on reader page for full reading immersion
  if (currentPage === 'reader') return null;

  return (
    <nav 
      aria-label="Thanh điều hướng di động"
      className="luxury-mobile-nav lg:hidden fixed bottom-2 left-3 right-3 z-40 rounded-[22px] safe-area-pb"
    >
      <div className="grid grid-cols-5 items-center w-full max-w-md mx-auto h-[58px] px-2">
        {/* Slot 1: Trang chủ */}
        <button
          onClick={() => navigateTo('dashboard')}
          aria-label="Trang chủ"
          className={`flex flex-col items-center justify-center h-full w-full py-1 transition-all rounded-xl ${
            currentPage === 'dashboard' 
              ? 'text-lily-900 font-bold' 
              : 'text-ink-500 hover:text-ink-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${currentPage === 'dashboard' ? 'bg-lily-100/70 text-lily-800' : ''}`}>
            <Home className={`w-5 h-5 ${currentPage === 'dashboard' ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Trang chủ</span>
        </button>

        {/* Slot 2: Thư viện */}
        <button
          onClick={() => navigateTo('library')}
          aria-label="Thư viện"
          className={`flex flex-col items-center justify-center h-full w-full py-1 transition-all rounded-xl ${
            currentPage === 'library' 
              ? 'text-lily-900 font-bold' 
              : 'text-ink-500 hover:text-ink-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${currentPage === 'library' ? 'bg-lily-100/70 text-lily-800' : ''}`}>
            <BookOpen className={`w-5 h-5 ${currentPage === 'library' ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Thư viện</span>
        </button>

        {/* Slot 3: Chính giữa: Nút + Thêm truyện */}
        <div className="flex items-center justify-center h-full w-full">
          <button
            onClick={() => navigateTo('add-book')}
            aria-label="Thêm truyện mới"
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-ink-950 to-ink-800 hover:from-ink-900 hover:to-ink-700 text-white flex items-center justify-center shadow-card border-2 border-white transition-transform active:scale-90 -mt-4 ring-2 ring-lily-200/40"
          >
            <Plus className="w-5 h-5 stroke-[2.4]" />
          </button>
        </div>

        {/* Slot 4: Tủ sách */}
        <button
          onClick={() => navigateTo('shelves')}
          aria-label="Tủ sách"
          className={`flex flex-col items-center justify-center h-full w-full py-1 transition-all rounded-xl ${
            currentPage === 'shelves' 
              ? 'text-lily-900 font-bold' 
              : 'text-ink-500 hover:text-ink-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${currentPage === 'shelves' ? 'bg-lily-100/70 text-lily-800' : ''}`}>
            <FolderHeart className={`w-5 h-5 ${currentPage === 'shelves' ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Tủ sách</span>
        </button>

        {/* Slot 5: Tôi */}
        <button
          onClick={() => navigateTo('account')}
          aria-label="Tài khoản cá nhân"
          className={`flex flex-col items-center justify-center h-full w-full py-1 transition-all rounded-xl ${
            currentPage === 'account' 
              ? 'text-lily-900 font-bold' 
              : 'text-ink-500 hover:text-ink-800'
          }`}
        >
          <div className={`p-1 rounded-xl transition-colors ${currentPage === 'account' ? 'bg-lily-100/70 text-lily-800' : ''}`}>
            <User className={`w-5 h-5 ${currentPage === 'account' ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">Tôi</span>
        </button>
      </div>
    </nav>
  );
};
