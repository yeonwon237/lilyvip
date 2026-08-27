import React from 'react';
import { 
  Home, 
  BookOpen, 
  PlusCircle, 
  FolderHeart, 
  Headphones, 
  Settings, 
  ShieldCheck
} from 'lucide-react';
import { useApp, PageRoute } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { currentPage, navigateTo } = useApp();

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
          <img
            src="/lilyhub-logo.png"
            alt="LilyHub"
            className="w-[178px] h-auto object-contain group-hover:scale-[1.02] transition-transform"
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

      {/* Local-first Beta note */}
      <div className="pt-4 border-t border-ink-100 space-y-3">
        <div 
          onClick={() => navigateTo('settings')}
          className="luxury-profile flex items-start gap-3 p-3 rounded-[20px] transition-all cursor-pointer group"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <div className="min-w-0 text-left">
            <h4 className="text-xs font-semibold text-ink-900">Lưu trên thiết bị</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-500">Open Beta · tối đa 5 truyện. Hãy sao lưu thư viện quan trọng.</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
