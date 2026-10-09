import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { t } from '../../i18n';
import React from 'react';
import { House, LibraryBig, SquarePlus, AudioLines, SlidersHorizontal, Moon, Sun } from 'lucide-react';
import { useApp, PageRoute } from '../../context/AppContext';

const navigation = [
  { id: 'dashboard', get label() { return t("Trang chủ"); }, icon: House },
  { id: 'library', get label() { return t("Thư viện"); }, icon: LibraryBig },
  { id: 'add-book', get label() { return t("Thêm truyện"); }, icon: SquarePlus },
  { id: 'audio', get label() { return t("Sách nói"); }, icon: AudioLines },
  { id: 'settings', get label() { return t("Cài đặt"); }, icon: SlidersHorizontal },
] as const;

export const Sidebar: React.FC = () => {
  const { user, currentPage, navigateTo, maxLocalSlots, books, appTheme, setAppTheme } = useApp();
  const dark = appTheme === 'dark' || (appTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return (
    <aside className="lily-sidebar" aria-label={t("Điều hướng chính")}>
      <div>
        <button className="lily-wordmark" onClick={() => navigateTo('dashboard')}>LILYHUB</button>
        <p className="lily-nav-label">MENU</p>
        <nav className="lily-navigation">
          {navigation.map(({ id, label, icon: Icon }) => {
            const active = currentPage === id || (id === 'library' && ['shelves', 'book-detail'].includes(currentPage)) || (id === 'settings' && ['account', 'stats'].includes(currentPage));
            return <button key={id} type="button" aria-current={active ? 'page' : undefined} onClick={() => navigateTo(id as PageRoute)}>
              <span className="lily-nav-icon"><Icon size={17} strokeWidth={1.8} /></span>
              <span>{t(label)}</span>
              {id === 'library' && <small>{books.length}</small>}
            </button>;
          })}
        </nav>
      </div>
      <div className="lily-sidebar-footer">
        <div className="lily-sidebar-controls">
          <button type="button" className="lily-theme-button" onClick={() => setAppTheme(dark ? 'light' : 'dark')} aria-label={dark ? t("Chuyển sang giao diện sáng") : t("Chuyển sang giao diện tối")} title={dark ? t("Chuyển sang giao diện sáng") : t("Chuyển sang giao diện tối")}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <LanguageSwitcher />
        </div>
        <button type="button" className="lily-storage" onClick={() => navigateTo('settings')}>
          <span>{t("Trên thiết bị ")}<b>{books.length}/{user.isOwner ? '∞' : maxLocalSlots}</b></span>
          <i><span style={{ width: `${Math.min(100, books.length / Math.max(1,maxLocalSlots) * 100)}%` }} /></i>
        </button>
      </div>
    </aside>
  );
};
