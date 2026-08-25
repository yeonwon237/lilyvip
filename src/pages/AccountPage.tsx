import React from 'react';
import { 
  User, 
  Sparkles, 
  Headphones, 
  Cloud, 
  HardDrive, 
  Smartphone, 
  Download, 
  ShieldCheck, 
  Sliders, 
  WifiOff, 
  LogOut, 
  ArrowRight,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StorageMeter } from '../components/common/StorageMeter';
import { PlanStatus } from '../components/common/PlanStatus';

export const AccountPage: React.FC = () => {
  const { user, openUpgradeModal, showToast } = useApp();

  const handleDownloadData = () => {
    showToast('Đang chuẩn bị gói bản sao dữ liệu (JSON + Books)...', 'info');
  };

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6 animate-in fade-in duration-200">
      {/* User Header Profile Card */}
      <div className="bg-white border border-ink-100 rounded-3xl p-6 md:p-8 shadow-soft flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-lily-100 shadow-soft"
          />
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <h1 className="font-serif font-bold text-2xl md:text-3xl text-ink-950">
                {user.name}
              </h1>
              <PlanStatus tier={user.tier} audioDays={user.audioDaysRemaining} vipDays={user.vipDaysRemaining} size="sm" />
            </div>
            <p className="text-sm text-ink-500 mt-1">
              {user.email} · Thành viên từ tháng 8/2026
            </p>
          </div>
        </div>

        <button
          onClick={() => openUpgradeModal('Quản lý gói đọc')}
          className="px-5 py-2.5 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white text-xs md:text-sm font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105"
        >
          <Sparkles className="w-4 h-4" />
          <span>Nâng cấp / Đổi gói</span>
        </button>
      </div>

      {/* PLAN STATUS CARDS ACCORDING TO USER TIER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* FREE STATE */}
        <div className={`p-6 rounded-3xl border transition-all ${
          user.tier === 'free' ? 'bg-white border-ink-900 shadow-card ring-2 ring-ink-900/10' : 'bg-white/60 border-ink-100 opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-ink-100 text-ink-800 uppercase">
              Gói FREE
            </span>
            {user.tier === 'free' && <span className="text-xs text-emerald-600 font-semibold">● Đang dùng</span>}
          </div>
          <div className="font-serif font-bold text-xl text-ink-900 mb-1">Lily Local</div>
          <p className="text-xs text-ink-500 mb-4">3 slot lưu trữ trên thiết bị</p>
          <div className="text-xs space-y-2 text-ink-600 border-t border-ink-100 pt-3">
            <div className="flex justify-between">
              <span>Slot Local:</span>
              <span className="font-bold text-ink-900">{user.freeSlotsUsed} / 3 slot</span>
            </div>
            <div className="flex justify-between">
              <span>Lily Audio:</span>
              <span className="text-ink-400">Chưa kích hoạt</span>
            </div>
            <div className="flex justify-between">
              <span>Cloud Sync:</span>
              <span className="text-ink-400">Chưa kích hoạt</span>
            </div>
          </div>
        </div>

        {/* FREE + AUDIO PASS STATE */}
        <div className={`p-6 rounded-3xl border transition-all ${
          user.tier === 'audio' ? 'bg-lavender-50/60 border-lavender-400 shadow-card ring-2 ring-lavender-400/20' : 'bg-white/60 border-ink-100 opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-lavender-100 text-lavender-800 flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5" />
              <span>Audio Pass</span>
            </span>
            {user.tier === 'audio' && <span className="text-xs text-lavender-700 font-semibold">● Đang dùng</span>}
          </div>
          <div className="font-serif font-bold text-xl text-lavender-950 mb-1">Local + Audio</div>
          <p className="text-xs text-ink-500 mb-4">Còn {user.audioDaysRemaining} ngày sử dụng</p>
          <div className="text-xs space-y-2 text-ink-600 border-t border-lavender-200/80 pt-3">
            <div className="flex justify-between">
              <span>Slot Local:</span>
              <span className="font-bold text-ink-900">{user.freeSlotsUsed} / 3 slot</span>
            </div>
            <div className="flex justify-between">
              <span>Lily Audio:</span>
              <span className="font-semibold text-lavender-800">✓ Đang mở khóa</span>
            </div>
            <div className="flex justify-between">
              <span>Cloud Sync:</span>
              <span className="text-ink-400">Chưa kích hoạt</span>
            </div>
          </div>
        </div>

        {/* LILY VIP STATE */}
        <div className={`p-6 rounded-3xl border transition-all ${
          user.tier === 'vip' ? 'bg-lily-50/50 border-lily-400 shadow-card ring-2 ring-lily-400/20' : 'bg-white/60 border-ink-100 opacity-60'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-lily-100 text-lily-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-lily-600" />
              <span>✦ LILY VIP</span>
            </span>
            {user.tier === 'vip' && <span className="text-xs text-lily-700 font-semibold">● Đang dùng</span>}
          </div>
          <div className="font-serif font-bold text-xl text-lily-950 mb-1">Cloud & Reader Pro</div>
          <p className="text-xs text-ink-500 mb-4">Còn {user.vipDaysRemaining} ngày sử dụng</p>
          <div className="text-xs space-y-2 text-ink-600 border-t border-lily-200/80 pt-3">
            <div className="flex justify-between">
              <span>Cloud Storage:</span>
              <span className="font-bold text-lily-900">{user.usedStorageMB} MB / {user.totalStorageMB} MB</span>
            </div>
            <div className="flex justify-between">
              <span>Audio Included:</span>
              <span className="font-semibold text-emerald-700">✓ Trọn gói</span>
            </div>
            <div className="flex justify-between">
              <span>Multi-device:</span>
              <span className="font-semibold text-emerald-700">✓ Tự đồng bộ</span>
            </div>
          </div>
        </div>
      </div>

      {/* STORAGE WIDGET */}
      <StorageMeter />

      {/* SETTINGS MENU LIST */}
      <div className="bg-white border border-ink-100 rounded-3xl p-5 shadow-soft divide-y divide-ink-100">
        <div 
          onClick={handleDownloadData}
          className="py-3.5 flex items-center justify-between text-sm text-ink-800 hover:bg-cream-50/50 p-3 rounded-2xl cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <Download className="w-5 h-5 text-ink-500" />
            <div>
              <div className="font-semibold">Tải xuống toàn bộ dữ liệu của tôi (Export Data)</div>
              <div className="text-xs text-ink-400">Xuất file truyện gốc và lịch sử đọc dạng ZIP</div>
            </div>
          </div>
          <span className="text-ink-400 font-bold">→</span>
        </div>

        <div 
          onClick={() => showToast('Đã đăng xuất tài khoản', 'info')}
          className="py-3.5 flex items-center justify-between text-sm text-rose-600 hover:bg-rose-50 p-3 rounded-2xl cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <LogOut className="w-5 h-5 text-rose-500" />
            <span className="font-semibold">Đăng xuất khỏi thiết bị này</span>
          </div>
          <span className="text-rose-400 font-bold">→</span>
        </div>
      </div>
    </div>
  );
};
