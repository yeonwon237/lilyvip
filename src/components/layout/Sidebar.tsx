import React from 'react';
import { 
  Home, 
  BookOpen, 
  PlusCircle, 
  FolderHeart, 
  Headphones, 
  Settings
} from 'lucide-react';
import { useApp, PageRoute } from '../../context/AppContext';
import { Brand } from '../common/Brand';

export const Sidebar: React.FC = () => {
  const { currentPage, navigateTo, maxLocalSlots, books } = useApp();
  const storagePercent = Math.min(100, maxLocalSlots ? books.length / maxLocalSlots * 100 : 0);

  const mainNavItems: { id: PageRoute; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Trang chủ', icon: Home },
    { id: 'library', label: 'Thư viện', icon: BookOpen },
    { id: 'add-book', label: 'Thêm truyện', icon: PlusCircle },
    { id: 'shelves', label: 'Tủ sách', icon: FolderHeart },
  ];

  const secondaryNavItems: { id: PageRoute; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'audio', label: 'Giọng Lily', icon: Headphones },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <aside aria-label="Điều hướng chính" className="luxury-sidebar hidden lg:flex flex-col justify-between w-[272px] h-screen sticky top-0 p-5 select-none shrink-0 z-20">
      {/* Brand Header */}
      <div>
        <div 
          onClick={() => navigateTo('dashboard')}
          className="flex items-center px-1 py-1 cursor-pointer group mb-6 transition-transform active:scale-98"
        >
          <Brand
            iconClassName="h-10 w-10 group-hover:scale-[1.02] transition-transform"
            textClassName="text-2xl"
          />
        </div>

        {/* Main Navigation Group */}
        <nav className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'luxury-nav-active text-ink-950 font-semibold'
                    : 'text-ink-600 hover:text-ink-950 hover:bg-white/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-lily-600' : 'text-ink-400'}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Section Divider */}
        <div className="my-4 border-t border-ink-100/80 px-2">
          <span className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider block pt-3 mb-1">
            Mở rộng
          </span>
        </div>

        {/* Secondary Navigation Group (Audio, Settings, Account) */}
        <nav className="space-y-1">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id || (item.id === 'settings' && currentPage === 'account');

            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'luxury-nav-active text-ink-950 font-semibold'
                    : 'text-ink-600 hover:text-ink-950 hover:bg-white/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-lily-600' : 'text-ink-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-lavender-100 text-lavender-800 font-bold px-1.5 py-0.2 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-ink-200 pt-4">
        <button
          type="button"
          onClick={() => navigateTo('settings')}
          className="w-full px-1 py-1 text-left transition-colors hover:text-lily-800"
        >
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-ink-800">Bộ nhớ thiết bị</span>
            <span className="tabular-nums text-ink-500">{books.length}/{maxLocalSlots}</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden bg-ink-200">
            <div className="h-full bg-lily-700 transition-[width]" style={{ width: `${storagePercent}%` }} />
          </div>
        </button>
      </div>
    </aside>
  );
};
