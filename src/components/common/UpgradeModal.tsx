import React from 'react';
import { X, Sparkles, Headphones, Cloud, Check, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const UpgradeModal: React.FC = () => {
  const { 
    isUpgradeModalOpen, 
    setIsUpgradeModalOpen, 
    upgradeModalFeature, 
    user, 
    showToast 
  } = useApp();

  if (!isUpgradeModalOpen) return null;

  const handleNotifyMe = (planName: string) => {
    showToast(`Đã ghi nhận sự quan tâm của bạn tới ${planName}. Tính năng đang được hoàn thiện!`, 'info');
    setIsUpgradeModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-modal border border-ink-100 p-6 md:p-8 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header close */}
        <button
          onClick={() => setIsUpgradeModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-full text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
          aria-label="Đóng"
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
            Trải nghiệm đọc Lily
          </h2>
          <p className="text-xs text-ink-500 mt-1">
            Lily Reader bản Free Local hiện hỗ trợ đầy đủ tính năng đọc offline, lưu bookmark, tìm kiếm và tạo Quote Card.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* FREE */}
          <div className="p-4 rounded-2xl border border-ink-800 bg-cream-50/70 shadow-soft flex flex-col justify-between transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-ink-900">Lily Local</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-ink-900 text-white">Đang sử dụng</span>
              </div>
              <div className="text-xl font-bold text-ink-900 mb-2 font-serif">Miễn phí</div>
              <p className="text-[11px] text-ink-500 mb-3">Trải nghiệm Reader hoàn chỉnh trên thiết bị cá nhân.</p>
              
              <ul className="space-y-1.5 text-xs text-ink-700">
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-ink-900 shrink-0 mt-0.5" />
                  <span>3 slot truyện trên máy</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-ink-900 shrink-0 mt-0.5" />
                  <span>5 theme tiêu chuẩn</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-ink-900 shrink-0 mt-0.5" />
                  <span>Bookmark & Quote Card</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-ink-900 shrink-0 mt-0.5" />
                  <span>Tìm kiếm toàn văn bản</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setIsUpgradeModalOpen(false)}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-ink-900 text-white text-xs font-semibold hover:bg-ink-800 transition-colors"
            >
              Tiếp tục đọc Free
            </button>
          </div>

          {/* AUDIO PASS */}
          <div className="p-4 rounded-2xl border border-lavender-200 bg-white hover:border-lavender-300 flex flex-col justify-between transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-lavender-950 flex items-center gap-1">
                  <Headphones className="w-3.5 h-3.5 text-lavender-600" />
                  <span>Audio Pass</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-lavender-100 text-lavender-800">Sắp ra mắt</span>
              </div>
              <div className="text-xl font-bold text-lavender-950 mb-2 font-serif">Gói Audio</div>
              <p className="text-[11px] text-ink-500 mb-3">Giọng đọc AI tự nhiên cho mọi tác phẩm cá nhân.</p>
              
              <ul className="space-y-1.5 text-xs text-ink-700">
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-lavender-600 shrink-0 mt-0.5" />
                  <span>Mọi tính năng Free</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-lavender-600 shrink-0 mt-0.5" />
                  <span>Giọng đọc AI cảm xúc</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-lavender-600 shrink-0 mt-0.5" />
                  <span>Hẹn giờ tắt thông minh</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleNotifyMe('Gói Audio Pass')}
              className="mt-4 w-full py-2 px-3 rounded-xl border border-lavender-300 bg-lavender-50 hover:bg-lavender-100 text-xs font-semibold text-lavender-900 transition-colors"
            >
              Quan tâm tính năng
            </button>
          </div>

          {/* LILY VIP */}
          <div className="p-4 rounded-2xl border border-lily-200 bg-white hover:border-lily-300 flex flex-col justify-between transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-lily-950 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-lily-600" />
                  <span>Lily VIP</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-lily-100 text-lily-800">Sắp ra mắt</span>
              </div>
              <div className="text-xl font-bold text-lily-950 mb-2 font-serif">VIP Pro</div>
              <p className="text-[11px] text-ink-500 mb-3">Đồng bộ Cloud đa thiết bị & Reader không giới hạn.</p>
              
              <ul className="space-y-1.5 text-xs text-ink-700">
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-lily-600 shrink-0 mt-0.5" />
                  <span>Không giới hạn số truyện</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-lily-600 shrink-0 mt-0.5" />
                  <span>Cloud Sync đa thiết bị</span>
                </li>
                <li className="flex items-start gap-1.5 font-medium text-lily-900">
                  <Check className="w-3.5 h-3.5 text-lily-600 shrink-0 mt-0.5" />
                  <span>Trọn bộ 8 theme & Audio</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleNotifyMe('Gói Lily VIP')}
              className="mt-4 w-full py-2 px-3 rounded-xl bg-lily-50 hover:bg-lily-100 border border-lily-200 text-xs font-semibold text-lily-900 transition-all flex items-center justify-center gap-1"
            >
              <span>Quan tâm tính năng</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-3 bg-cream-50 rounded-2xl text-center text-xs text-ink-600 border border-cream-200 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Lily Free Local cam kết 100% dữ liệu truyện được lưu trữ cục bộ trên thiết bị của bạn.</span>
        </div>
      </div>
    </div>
  );
};
