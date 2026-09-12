import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

const OFFLINE_NOTICE_KEY = 'LILY_OFFLINE_NOTICE_SHOWN_V1';
let offlineNoticeShownThisSession = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(OFFLINE_NOTICE_KEY) === 'true';

export const OfflineIndicator: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      if (offlineNoticeShownThisSession) return;
      offlineNoticeShownThisSession = true;
      try { sessionStorage.setItem(OFFLINE_NOTICE_KEY, 'true'); } catch {}
      setVisible(true);
    };

    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) handleOffline();

    return () => {
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 2600);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-950/90 px-3.5 py-2 text-xs font-medium text-white shadow-modal backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
        <WifiOff className="h-3.5 w-3.5 text-amber-400" />
        <span>Đang ngoại tuyến</span>
      </div>
    </div>
  );
};
