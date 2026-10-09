import { t } from '../../i18n';
import React from 'react';
import { Moon, Sun, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
export const Header: React.FC = () => {
  const { user, navigateTo, appTheme, setAppTheme } = useApp();
  const dark = appTheme === 'dark' || (appTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return <header className="lily-mobile-header">
    <button className="lily-wordmark" onClick={() => navigateTo('dashboard')}>LILYHUB</button>
    <div>
      <button aria-label={dark ? t("Chuyển sang giao diện sáng") : t("Chuyển sang giao diện tối")} onClick={() => setAppTheme(dark ? 'light' : 'dark')}>{dark ? <Sun size={19}/> : <Moon size={19}/>}</button>
      <button aria-label={t("Tài khoản")} className="lily-avatar" onClick={() => navigateTo(user.id === 'guest' ? 'login' : 'account')}><UserRound size={18}/></button>
    </div>
  </header>;
};
