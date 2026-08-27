import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [showReconnected, setShowReconnected] = useState<boolean>(false);
  const [showOfflineNotice, setShowOfflineNotice] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowOfflineNotice(false);
      setShowReconnected(true);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowOfflineNotice(true);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!showReconnected) return;
    const timer = window.setTimeout(() => setShowReconnected(false), 2500);
    return () => window.clearTimeout(timer);
  }, [showReconnected]);

  useEffect(() => {
    if (!isOffline || !showOfflineNotice) return;
    const timer = window.setTimeout(() => setShowOfflineNotice(false), 6000);
    return () => window.clearTimeout(timer);
  }, [isOffline, showOfflineNotice]);

  if ((!isOffline || !showOfflineNotice) && !showReconnected) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
      {isOffline && showOfflineNotice ? (
        <div className="pl-3.5 pr-1.5 py-1.5 rounded-full bg-ink-950/90 text-white border border-white/10 shadow-modal backdrop-blur-md flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200">
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>Đang ngoại tuyến · Thư viện & Reader sẵn sàng</span>
          <button
            type="button"
            onClick={() => setShowOfflineNotice(false)}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/15 transition-colors"
            aria-label="Đóng thông báo ngoại tuyến"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : showReconnected ? (
        <div className="px-3.5 py-1.5 rounded-full bg-emerald-700/90 text-white border border-emerald-500/20 shadow-modal backdrop-blur-md flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200">
          <Wifi className="w-3.5 h-3.5 text-emerald-200" />
          <span>Đã kết nối Internet trở lại</span>
        </div>
      ) : null}
    </div>
  );
};
