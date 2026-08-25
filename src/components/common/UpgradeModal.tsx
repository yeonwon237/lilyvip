import React from 'react';
import { X, Sparkles, Headphones, Cloud, Check, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const UpgradeModal: React.FC = () => {
  const { 
    isUpgradeModalOpen, 
    setIsUpgradeModalOpen, 
    upgradeModalFeature, 
    user, 
    setUserTier,
    showToast 
  } = useApp();

  if (!isUpgradeModalOpen) return null;

  const handleSelectTier = (tier: 'free' | 'audio' | 'vip') => {
    setUserTier(tier);
    setIsUpgradeModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-modal border border-ink-100 p-6 md:p-8 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header close */}
        <button
          onClick={() => setIsUpgradeModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-full text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Feature banner notice */}
        {upgradeModalFeature && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-lily-100 text-lily-800 border border-lily-200/80 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-lily-600" />
            <span>Mở khóa: {upgradeModalFeature}</span>
          </div>
        )}

        <div className="text-left mb-6">
          <h2 className="font-serif font-bold text-2xl text-ink-900">
            Chọn trải nghiệm đọc Lily của bạn
          </h2>
          <p className="text-xs text-ink-500 mt-1">
            Chuyển đổi các gói để thử nghiệm giao diện và toàn bộ tính năng tương ứng.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* FREE */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
            user.tier === 'free' 
              ? 'border-ink-800 bg-cream-50/70 shadow-soft' 
              : 'border-ink-200/80 bg-white hover:border-ink-300'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-ink-900">Lily Local</h3>
                {user.tier === 'free' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-ink-900 text-white">Đang dùng</span>
                )}
              </div>
              <div className="text-xl font-bold text-ink-900 mb-2 font-serif">Miễn phí</div>
              <p className="text-[11px] text-ink-500 mb-3">Trải nghiệm Reader cơ bản trên thiết bị cá nhân.</p>
              
              <ul className="space-y-1.5 text-xs text-ink-700">
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-ink-900 shrink-0 mt-0.5" />
                  <span>3 slot truyện trên máy</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-ink-900 shrink-0 mt-0.5" />
                  <span>5 theme tiêu chuẩn</span>
                </li>
                <li className="flex items-start gap-1.5 text-ink-400">
                  <span className="w-3.5 h-3.5 text-center font-mono">✕</span>
                  <span>Không cloud sync</span>
                </li>
                <li className="flex items-start gap-1.5 text-ink-400">
                  <span className="w-3.5 h-3.5 text-center font-mono">✕</span>
                  <span>Không audio mặc định</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectTier('free')}
              className="mt-4 w-full py-2 px-3 rounded-xl border border-ink-300 text-xs font-medium text-ink-700 hover:bg-ink-100 transition-colors"
            >
              Chọn gói Free
            </button>
          </div>

          {/* AUDIO PASS */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
            user.tier === 'audio' 
              ? 'border-lavender-500 bg-lavender-50/50 shadow-soft' 
              : 'border-ink-200/80 bg-white hover:border-lavender-300'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-lavender-900 flex items-center gap-1">
                  <Headphones className="w-3.5 h-3.5 text-lavender-600" />
                  <span>Audio Pass</span>
                </h3>
                {user.tier === 'audio' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-lavender-600 text-white">Đang dùng</span>
                )}
              </div>
              <div className="text-xl font-bold text-lavender-950 mb-2 font-serif">
                19.000đ <span className="text-xs font-normal text-ink-500">/ 30 ngày</span>
              </div>
              <p className="text-[11px] text-ink-500 mb-3">Mở tính năng nghe truyện cho 3 slot trên máy.</p>
              
              <ul className="space-y-1.5 text-xs text-ink-700">
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-lavender-600 shrink-0 mt-0.5" />
                  <span>Mọi quyền lợi của Free</span>
                </li>
                <li className="flex items-start gap-1.5 font-medium text-lavender-900">
                  <Check className="w-3.5 h-3.5 text-lavender-600 shrink-0 mt-0.5" />
                  <span>Mở Audio TTS cho 3 slot</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-lavender-600 shrink-0 mt-0.5" />
                  <span>4 giọng đọc truyền cảm</span>
                </li>
                <li className="flex items-start gap-1.5 text-ink-400">
                  <span className="w-3.5 h-3.5 text-center font-mono">✕</span>
                  <span>Không cloud sync</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectTier('audio')}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-lavender-100 hover:bg-lavender-200 border border-lavender-300 text-xs font-semibold text-lavender-900 transition-colors"
            >
              Thử Audio Pass
            </button>
          </div>

          {/* LILY VIP */}
          <div className={`p-4 rounded-2xl border-2 flex flex-col justify-between relative overflow-hidden transition-all ${
            user.tier === 'vip' 
              ? 'border-lily-500 bg-lily-50/40 shadow-card' 
              : 'border-lily-300 bg-white hover:border-lily-400'
          }`}>
            <div className="absolute top-0 right-0 bg-gradient-to-l from-lily-500 to-lavender-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
              Khuyên dùng
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-lily-950 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-lily-600" />
                  <span>✦ LILY VIP</span>
                </h3>
                {user.tier === 'vip' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-lily-600 text-white">Đang dùng</span>
                )}
              </div>
              <div className="text-xl font-bold text-lily-950 mb-2 font-serif">
                49.000đ <span className="text-xs font-normal text-ink-500">/ tháng</span>
              </div>
              <p className="text-[11px] text-ink-500 mb-3">Máy đọc sách chuyên dụng & Thư viện Cloud đồng bộ.</p>
              
              <ul className="space-y-1.5 text-xs text-ink-700">
                <li className="flex items-start gap-1.5 font-medium text-lily-900">
                  <Check className="w-3.5 h-3.5 text-lily-600 shrink-0 mt-0.5" />
                  <span>Thư viện Cloud không giới hạn</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-lily-600 shrink-0 mt-0.5" />
                  <span>Đồng bộ đa thiết bị tự động</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-lily-600 shrink-0 mt-0.5" />
                  <span>Lily Reader Pro & 8 Theme</span>
                </li>
                <li className="flex items-start gap-1.5 font-medium text-lily-900">
                  <Check className="w-3.5 h-3.5 text-lily-600 shrink-0 mt-0.5" />
                  <span>Audio & Offline trọn gói</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectTier('vip')}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-lily-600 to-lily-700 hover:from-lily-700 hover:to-lily-800 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1"
            >
              <span>Trải nghiệm VIP Pro</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-3 bg-ink-50 rounded-xl text-center text-[11px] text-ink-500 border border-ink-100">
          💡 <strong>Chế độ Mock UI:</strong> Nhấn vào bất kỳ gói nào ở trên để chuyển đổi trạng thái giao diện tức thì mà không cần thanh toán.
        </div>
      </div>
    </div>
  );
};
