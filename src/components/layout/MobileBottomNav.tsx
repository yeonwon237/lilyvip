import { t } from '../../i18n';
import React from 'react';
import { House, LibraryBig, SquarePlus, AudioLines, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../../context/AppContext';
const items = [
  { id: 'dashboard', get label() { return t("Trang chủ"); }, icon: House },
  { id: 'library', get label() { return t("Thư viện"); }, icon: LibraryBig },
  { id: 'add-book', get label() { return t("Thêm"); }, icon: SquarePlus },
  { id: 'audio', get label() { return t("Sách nói"); }, icon: AudioLines },
  { id: 'settings', get label() { return t("Cài đặt"); }, icon: SlidersHorizontal },
] as const;
export const MobileBottomNav: React.FC = () => {
  const { currentPage, navigateTo } = useApp();
  if (currentPage === 'reader') return null;
  return <nav className="lily-mobile-nav" aria-label={t("Thanh điều hướng di động")}>
    {items.map(({id,label,icon:Icon}) => {
      const active = currentPage === id || (id === 'library' && ['shelves','book-detail'].includes(currentPage)) || (id === 'settings' && ['account','stats'].includes(currentPage));
      return <button key={id} aria-current={active ? 'page' : undefined} onClick={() => navigateTo(id)}><Icon size={21} strokeWidth={active ? 2.2 : 1.8}/><span>{t(label)}</span></button>;
    })}
  </nav>;
};
