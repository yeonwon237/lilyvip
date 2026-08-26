import React from 'react';
import { 
  Home, 
  BookOpen, 
  PlusCircle, 
  FolderHeart, 
  BarChart3, 
  Headphones, 
  Settings, 
  User as UserIcon,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useApp, PageRoute } from '../../context/AppContext';
import { PlanStatus } from '../common/PlanStatus';

export const Sidebar: React.FC = () => {
  const { currentPage, navigateTo, user, openUpgradeModal } = useApp();

  const mainNavItems: { id: PageRoute; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Trang chủ', icon: Home },
    { id: 'library', label: 'Thư viện', icon: BookOpen },
    { id: 'add-book', label: 'Thêm truyện', icon: PlusCircle },
    { id: 'shelves', label: 'Tủ sách', icon: FolderHeart },
    { id: 'stats', label: 'Thống kê', icon: BarChart3 },
  ];

  const secondaryNavItems: { id: PageRoute; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'audio', label: 'Audio & Giọng đọc', icon: Headphones, badge: user.tier !== 'free' ? 'AI' : undefined },
    { id: 'settings', label: 'Cài đặt Reader', icon: Settings },
    { id: 'account', label: 'Tài khoản & Gói', icon: UserIcon },
  ];

  return (
    <aside aria-label="Điều hướng chính" className="luxury-sidebar hidden lg:flex flex-col justify-between w-[272px] h-screen sticky top-0 p-5 select-none shrink-0 z-20">
      {/* Brand Header */}
      <div>
        <div 
          onClick={() => navigateTo('landing')}
          className="flex items-center gap-3 px-2 py-2 cursor-pointer group mb-6 transition-transform active:scale-98"
        >
          <div className="brand-seal w-11 h-11 rounded-[18px] flex items-center justify-center text-white group-hover:scale-105 transition-transform">
            <span className="font-serif text-xl font-semibold italic">L</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-semibold text-xl tracking-tight text-ink-950">Lily</span>
              <span className="text-[9px] font-sans font-bold px-2 py-0.5 rounded-full bg-ink-950 text-[#f7dfaa] tracking-[0.18em]">
                VIP
              </span>
            </div>
            <span className="text-[10px] text-ink-400 block mt-0.5 font-medium tracking-[0.08em] uppercase">Private reading club</span>
          </div>
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

      {/* Footer Profile & Plan Box */}
      <div className="pt-4 border-t border-ink-100 space-y-3">
        {/* User profile tile */}
        <div 
          onClick={() => navigateTo('account')}
          className="luxury-profile flex items-center justify-between p-3 rounded-[20px] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-lily-100 shrink-0"
            />
            <div className="min-w-0 text-left">
              <h4 className="text-sm font-semibold text-ink-900 truncate">
                {user.name}
              </h4>
              <div className="mt-0.5">
                <PlanStatus tier={user.tier} audioDays={user.audioDaysRemaining} vipDays={user.vipDaysRemaining} size="sm" />
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-lily-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
      </div>
    </aside>
  );
};
