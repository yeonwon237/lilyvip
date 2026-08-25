import React from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Headphones, 
  Cloud, 
  HardDrive, 
  ArrowRight, 
  Check, 
  ShieldCheck,
  Smartphone,
  Sliders,
  LogIn
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LandingPage: React.FC = () => {
  const { navigateTo, setIsAuthModalOpen, openUpgradeModal } = useApp();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-ink-900 font-sans selection:bg-lily-100 selection:text-lily-900">
      {/* PUBLIC HEADER */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-ink-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div 
            onClick={() => navigateTo('landing')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-lily-500 to-lavender-500 flex items-center justify-center text-white shadow-soft">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-lg tracking-tight text-ink-950">Lily</span>
              <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-lily-100 text-lily-800 tracking-wider">VIP</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-ink-600">
            <a href="#features" className="hover:text-ink-950 transition-colors">Tính năng</a>
            <a href="#tiers" className="hover:text-ink-950 transition-colors">Gói dịch vụ</a>
            <a href="#reader" className="hover:text-ink-950 transition-colors">Reader Pro</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-ink-700 hover:text-ink-950 hover:bg-cream-100 transition-colors"
            >
              Đăng nhập
            </button>
            <button
              onClick={() => navigateTo('dashboard')}
              className="px-4 py-2 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft transition-all hover:scale-105"
            >
              Bắt đầu
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lily-50 border border-lily-200/80 text-xs font-medium text-lily-900 shadow-soft">
          <Sparkles className="w-3.5 h-3.5 text-lily-600" />
          <span>Sản phẩm mở rộng cao cấp của LilyHub</span>
        </div>

        <h1 className="font-serif font-bold text-4xl sm:text-5xl md:text-6xl text-ink-950 tracking-tight leading-[1.15]">
          Thư viện truyện <br className="hidden sm:inline" />
          của riêng bạn.
        </h1>

        <p className="text-sm sm:text-base text-ink-600 max-w-xl mx-auto leading-relaxed">
          Upload truyện của bạn để đọc trên Lily, nghe audio và biến chúng thành một thư viện cá nhân tĩnh lặng, riêng tư và tao nhã.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <button
            onClick={() => navigateTo('dashboard')}
            className="px-6 py-3 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white text-xs sm:text-sm font-semibold shadow-card transition-all hover:scale-105 flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            <span>Bắt đầu miễn phí</span>
          </button>

          <button
            onClick={() => openUpgradeModal('Khám phá Lily VIP')}
            className="px-6 py-3 rounded-2xl bg-white hover:bg-cream-50 border border-ink-200 text-ink-900 text-xs sm:text-sm font-semibold shadow-soft transition-all hover:border-lily-300 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-lily-600" />
            <span>Xem Lily VIP</span>
          </button>
        </div>

        {/* Hero Visual Mockup Preview */}
        <div className="pt-10">
          <div className="relative mx-auto max-w-3xl rounded-3xl bg-white p-4 shadow-float border border-ink-200/80">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3 mb-4 px-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-300"></span>
                <span className="w-3 h-3 rounded-full bg-amber-300"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-300"></span>
              </div>
              <span className="text-[11px] font-mono text-ink-400">Lily VIP — Reader Pro</span>
              <span className="text-xs text-lily-700 font-semibold font-serif">Chương 137</span>
            </div>

            <div className="p-6 md:p-10 rounded-2xl bg-[#F8F5EC] text-left text-ink-900 font-serif space-y-4">
              <h3 className="font-bold text-lg md:text-xl text-ink-950">
                Chương 137: Đêm lạnh bên lầu ngắm sao
              </h3>
              <p className="text-sm leading-relaxed text-ink-800 indent-6">
                Gió đêm lạnh lẽo thổi qua lầu gác cao vút. Đứng từ đỉnh Vọng Tinh Lâu nhìn xuống, cả kinh thành Trường An như chìm trong một biển sương mờ tĩnh lặng...
              </p>
              <p className="text-sm leading-relaxed text-ink-800 indent-6">
                Thẩm Uyển Khanh quay đầu nhìn nàng, khóe môi khẽ cong lên một nét cười hiếm hoi: “Cố lâu chủ đã đến Trường An từ khi nào? Sao không báo trước một tiếng để ta chuẩn bị trà ngon nghênh đón?”
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 TIERS SECTION */}
      <section id="tiers" className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="font-serif font-bold text-3xl text-ink-950">
            Ba tầng trải nghiệm linh hoạt
          </h2>
          <p className="text-xs sm:text-sm text-ink-500 max-w-lg mx-auto">
            Từ đọc thử nghiệm trên trình duyệt tới máy đọc sách cá nhân chuyên sâu trên đám mây.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* TIER 1: LILY LOCAL */}
          <div className="bg-white border border-ink-200/80 rounded-3xl p-6 shadow-soft flex flex-col justify-between hover:border-ink-400 transition-all">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-cream-100 text-ink-700 flex items-center justify-center mb-4">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-xl text-ink-900">Lily Local</h3>
              <div className="text-2xl font-bold text-ink-900 font-serif my-2">Miễn phí</div>
              <p className="text-xs text-ink-500 mb-6">
                3 slot truyện lưu trên thiết bị của bạn. Không cần tải lên cloud.
              </p>

              <ul className="space-y-2.5 text-xs text-ink-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>3 slot truyện lưu trữ cục bộ</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>5 theme đọc tiêu chuẩn</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Đổi và thay thế truyện tự do</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => navigateTo('dashboard')}
              className="mt-8 w-full py-2.5 rounded-xl border border-ink-300 text-xs font-semibold text-ink-800 hover:bg-ink-50 transition-colors"
            >
              Trải nghiệm Free
            </button>
          </div>

          {/* TIER 2: LILY AUDIO */}
          <div className="bg-white border border-lavender-200 rounded-3xl p-6 shadow-soft flex flex-col justify-between hover:border-lavender-400 transition-all">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-lavender-100 text-lavender-700 flex items-center justify-center mb-4">
                <Headphones className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-xl text-lavender-950">Lily Audio</h3>
              <div className="text-2xl font-bold text-lavender-950 font-serif my-2">
                19.000đ <span className="text-xs font-normal text-ink-500">/ 30 ngày</span>
              </div>
              <p className="text-xs text-ink-500 mb-6">
                Mở khóa giọng đọc AI (TTS) cho các truyện trong 3 slot Local.
              </p>

              <ul className="space-y-2.5 text-xs text-ink-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-lavender-600 shrink-0" />
                  <span>Toàn bộ tính năng Lily Local</span>
                </li>
                <li className="flex items-start gap-2 font-medium text-lavender-900">
                  <Check className="w-4 h-4 text-lavender-600 shrink-0" />
                  <span>Mở Audio Pass cho 3 slot truyện</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-lavender-600 shrink-0" />
                  <span>4 giọng đọc AI chuẩn Việt</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => openUpgradeModal('Audio Pass')}
              className="mt-8 w-full py-2.5 rounded-xl bg-lavender-100 hover:bg-lavender-200 text-xs font-semibold text-lavender-900 transition-colors"
            >
              Xem Audio Pass
            </button>
          </div>

          {/* TIER 3: LILY CLOUD VIP */}
          <div className="bg-gradient-to-b from-white to-lily-50/50 border-2 border-lily-400 rounded-3xl p-6 shadow-card flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-lily-600 to-lavender-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
              Khuyên dùng
            </div>

            <div>
              <div className="w-10 h-10 rounded-2xl bg-lily-100 text-lily-700 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-xl text-lily-950">Lily Cloud VIP</h3>
              <div className="text-2xl font-bold text-lily-950 font-serif my-2">
                49.000đ <span className="text-xs font-normal text-ink-500">/ tháng</span>
              </div>
              <p className="text-xs text-ink-500 mb-6">
                Thư viện Cloud không giới hạn + Máy đọc sách Reader Pro + Audio trọn gói.
              </p>

              <ul className="space-y-2.5 text-xs text-ink-700">
                <li className="flex items-start gap-2 font-medium text-lily-900">
                  <Check className="w-4 h-4 text-lily-600 shrink-0" />
                  <span>Thư viện Cloud không giới hạn slot</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-lily-600 shrink-0" />
                  <span>Đồng bộ tiến độ đọc giữa các máy</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-lily-600 shrink-0" />
                  <span>Reader Pro, 8 Theme & Style Presets</span>
                </li>
                <li className="flex items-start gap-2 font-medium text-lily-900">
                  <Check className="w-4 h-4 text-lily-600 shrink-0" />
                  <span>Audio TTS & Offline trọn gói</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => openUpgradeModal('Khám phá Lily VIP')}
              className="mt-8 w-full py-2.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center justify-center gap-1.5 transition-all hover:scale-105"
            >
              <span>Nâng cấp Lily VIP</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-ink-200 py-8 px-6 text-center text-xs text-ink-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-ink-900">vip.lilyhub.top</span>
            <span>· Một sản phẩm của LilyHub</span>
          </div>
          <p>© 2026 LilyHub VIP. Thiết kế cho những người yêu con chữ.</p>
        </div>
      </footer>
    </div>
  );
};
