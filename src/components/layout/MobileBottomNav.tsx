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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/96 backdrop-blur-md border-t border-ink-100/80 shadow-float safe-area-pb"
    >
      <div className="grid grid-cols-5 items-center w-full max-w-sm mx-auto h-13 px-1">
        {/* Slot 1: Trang chủ */}
        <button
          onClick={() => navigateTo('dashboard')}
          aria-label="Trang chủ"
          className={`flex flex-col items-center justify-center h-full w-full py-0.5 transition-colors ${
            currentPage === 'dashboard' ? 'text-lily-900 font-bold' : 'text-ink-400 hover:text-ink-800'
          }`}
        >
          <Home className={`w-4.5 h-4.5 ${currentPage === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[9px] mt-0.5 tracking-tight font-medium">Trang chủ</span>
        </button>

        {/* Slot 2: Thư viện */}
        <button
          onClick={() => navigateTo('library')}
          aria-label="Thư viện"
          className={`flex flex-col items-center justify-center h-full w-full py-0.5 transition-colors ${
            currentPage === 'library' ? 'text-lily-900 font-bold' : 'text-ink-400 hover:text-ink-800'
          }`}
        >
          <BookOpen className={`w-4.5 h-4.5 ${currentPage === 'library' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[9px] mt-0.5 tracking-tight font-medium">Thư viện</span>
        </button>

        {/* Slot 3: Chính giữa: Nút + Thêm truyện */}
        <div className="flex items-center justify-center h-full w-full">
          <button
            onClick={() => navigateTo('add-book')}
            aria-label="Thêm truyện mới"
            className="w-10 h-10 rounded-full bg-ink-900 hover:bg-ink-800 text-white flex items-center justify-center shadow-card border-2 border-white transition-transform active:scale-95 -mt-3.5"
          >
            <Plus className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Slot 4: Tủ sách */}
        <button
          onClick={() => navigateTo('shelves')}
          aria-label="Tủ sách"
          className={`flex flex-col items-center justify-center h-full w-full py-0.5 transition-colors ${
            currentPage === 'shelves' ? 'text-lily-900 font-bold' : 'text-ink-400 hover:text-ink-800'
          }`}
        >
          <FolderHeart className={`w-4.5 h-4.5 ${currentPage === 'shelves' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[9px] mt-0.5 tracking-tight font-medium">Tủ sách</span>
        </button>

        {/* Slot 5: Tôi */}
        <button
          onClick={() => navigateTo('account')}
          aria-label="Tài khoản cá nhân"
          className={`flex flex-col items-center justify-center h-full w-full py-0.5 transition-colors ${
            currentPage === 'account' ? 'text-lily-900 font-bold' : 'text-ink-400 hover:text-ink-800'
          }`}
        >
          <User className={`w-4.5 h-4.5 ${currentPage === 'account' ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
          <span className="text-[9px] mt-0.5 tracking-tight font-medium">Tôi</span>
        </button>
      </div>
    </nav>
  );
};
