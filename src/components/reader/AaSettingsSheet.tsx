import React from 'react';
import { 
  X, 
  Sparkles, 
  AlignLeft, 
  AlignJustify, 
  RotateCcw, 
  ChevronRight,
  Sliders,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';
import { ReadingMode, FooterDisplay } from '../../types';

export const AaSettingsSheet: React.FC = () => {
  const { user, openUpgradeModal } = useApp();
  const { 
    isAaPanelOpen, 
    setIsAaPanelOpen, 
    settings, 
    updateSetting, 
    applyPreset, 
    resetSettings 
  } = useReader();

  if (!isAaPanelOpen) return null;

  const fontFamilies = [
    { id: 'Literata', label: 'Literata (Serif tao nhã)' },
    { id: 'Merriweather', label: 'Merriweather (Cổ điển)' },
    { id: 'Playfair Display', label: 'Playfair (Cung đình)' },
    { id: 'Be Vietnam Pro', label: 'Be Vietnam Pro (Hiện đại)' },
    { id: 'Inter', label: 'Inter (Không chân sạch sẽ)' },
  ];

  const presets: { id: 'ban-dem' | 'tieu-thuyet' | 'co-trang' | 'doc-lau'; label: string; desc: string }[] = [
    { id: 'tieu-thuyet', label: 'Tiểu thuyết', desc: 'Merriweather · Thụt đầu dòng · Giãn 1.85' },
    { id: 'co-trang', label: 'Cổ trang', desc: 'Playfair · Phong vị cổ phong · Giãn 2.0' },
    { id: 'ban-dem', label: 'Ban đêm', desc: 'OLED Black · Literata · Giảm mỏi mắt' },
    { id: 'doc-lau', label: 'Đọc lâu', desc: 'Warm Amber · Cỡ 20 · Cột hẹp' },
  ];

  const readingModes: { id: ReadingMode; label: string }[] = [
    { id: 'scroll', label: 'Cuộn dọc' },
    { id: 'page', label: 'Lật trang' },
    { id: 'auto', label: 'Cuộn tự động' },
    { id: 'focus', label: 'Tập trung' },
  ];

  const footerDisplays: { id: FooterDisplay; label: string }[] = [
    { id: 'percent', label: '% Sách' },
    { id: 'pages', label: 'Số trang' },
    { id: 'time_chapter', label: 'Thời gian chương' },
    { id: 'time_book', label: 'Thời gian truyện' },
    { id: 'hidden', label: 'Ẩn' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-white rounded-t-3xl shadow-modal border-t border-ink-100 p-5 md:p-6 max-h-[85vh] overflow-y-auto space-y-5 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-base text-ink-900">
              Tùy chỉnh đọc sách (Aa)
            </h3>
            {user.tier === 'vip' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lily-100 text-lily-800">
                ✦ PRO
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">
                Cơ bản
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetSettings}
              className="p-1 text-ink-400 hover:text-ink-700 text-xs flex items-center gap-1"
              title="Đặt lại mặc định"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mặc định</span>
            </button>
            <button
              onClick={() => setIsAaPanelOpen(false)}
              className="p-1 rounded-full text-ink-400 hover:text-ink-700 hover:bg-ink-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* VIP Style Presets */}
        {user.tier === 'vip' ? (
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-2">
              Phong cách thiết lập sẵn (Style Presets)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    settings.selectedPreset === preset.label
                      ? 'border-lily-500 bg-lily-50/60 shadow-xs'
                      : 'border-ink-200/80 hover:border-ink-300 bg-cream-50/40'
                  }`}
                >
                  <div className="font-semibold text-xs text-ink-900 flex items-center justify-between">
                    <span>{preset.label}</span>
                    {settings.selectedPreset === preset.label && <Check className="w-3.5 h-3.5 text-lily-600" />}
                  </div>
                  <div className="text-[10px] text-ink-500 mt-0.5 line-clamp-1">
                    {preset.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div 
            onClick={() => openUpgradeModal('Reading Style Presets')}
            className="p-3 rounded-2xl bg-gradient-to-r from-lily-50 to-lavender-50 border border-lily-200/80 cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="w-4 h-4 text-lily-600" />
              <span className="font-semibold text-lily-950">Mở khóa Style Presets trên Lily VIP</span>
            </div>
            <ChevronRight className="w-4 h-4 text-lily-600" />
          </div>
        )}

        {/* Font Size & Stepper */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-ink-700 mb-2">
            <span>Cỡ chữ: {settings.fontSize}px</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateSetting('fontSize', Math.max(14, settings.fontSize - 1))}
                className="w-7 h-7 rounded-lg border border-ink-200 bg-cream-50 font-bold hover:bg-cream-100 text-ink-800"
              >
                A-
              </button>
              <button
                onClick={() => updateSetting('fontSize', Math.min(32, settings.fontSize + 1))}
                className="w-7 h-7 rounded-lg border border-ink-200 bg-cream-50 font-bold hover:bg-cream-100 text-ink-800"
              >
                A+
              </button>
            </div>
          </div>
          <input
            type="range"
            min="14"
            max="32"
            value={settings.fontSize}
            onChange={(e) => updateSetting('fontSize', Number(e.target.value))}
            className="w-full accent-lily-600 cursor-pointer"
          />
        </div>

        {/* Font Family (VIP Pro vs Basic) */}
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-2">
            Phông chữ (Font Family) {user.tier === 'free' && '🔒 VIP Only'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {fontFamilies.map((font) => {
              const isSelected = settings.fontFamily === font.id;
              return (
                <button
                  key={font.id}
                  onClick={() => {
                    if (user.tier === 'free' && font.id !== 'Literata') {
                      openUpgradeModal('Tùy chọn phông chữ Reader');
                    } else {
                      updateSetting('fontFamily', font.id as any);
                    }
                  }}
                  className={`p-2 rounded-xl border text-xs font-medium transition-all text-left ${
                    isSelected
                      ? 'border-lily-500 bg-lily-50/70 text-lily-950 font-semibold'
                      : 'border-ink-200 bg-white hover:bg-cream-50 text-ink-700'
                  }`}
                  style={{ fontFamily: font.id }}
                >
                  <span className="truncate block">{font.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Line Height & Paragraph Spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">
              Giãn dòng: {settings.lineHeight}
            </label>
            <input
              type="range"
              min="1.4"
              max="2.4"
              step="0.1"
              value={settings.lineHeight}
              onChange={(e) => updateSetting('lineHeight', Number(e.target.value))}
              className="w-full accent-lily-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">
              Khoảng cách đoạn: {settings.paragraphSpacing}
            </label>
            <input
              type="range"
              min="0.6"
              max="2.2"
              step="0.2"
              disabled={user.tier === 'free'}
              value={settings.paragraphSpacing}
              onChange={(e) => updateSetting('paragraphSpacing', Number(e.target.value))}
              className="w-full accent-lily-600 cursor-pointer disabled:opacity-40"
            />
          </div>
        </div>

        {/* Alignment & First-Line Indent */}
        <div className="flex items-center justify-between pt-2 border-t border-ink-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink-700">Căn lề:</span>
            <div className="flex rounded-lg border border-ink-200 overflow-hidden">
              <button
                onClick={() => updateSetting('textAlign', 'left')}
                className={`p-1.5 ${settings.textAlign === 'left' ? 'bg-ink-900 text-white' : 'bg-white text-ink-600'}`}
                title="Căn trái"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateSetting('textAlign', 'justify')}
                className={`p-1.5 ${settings.textAlign === 'justify' ? 'bg-ink-900 text-white' : 'bg-white text-ink-600'}`}
                title="Căn đều hai bên"
              >
                <AlignJustify className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* First line indent */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink-700">Thụt đầu dòng:</span>
            <input
              type="checkbox"
              checked={settings.firstLineIndent}
              onChange={(e) => updateSetting('firstLineIndent', e.target.checked)}
              className="w-4 h-4 accent-lily-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Reading Mode (VIP) */}
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-2">
            Chế độ đọc (Reading Mode) {user.tier === 'free' && '🔒 VIP Only'}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {readingModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  if (user.tier === 'free' && mode.id !== 'scroll') {
                    openUpgradeModal('Chế độ đọc nâng cao');
                  } else {
                    updateSetting('readingMode', mode.id);
                  }
                }}
                className={`py-2 px-1 rounded-xl border text-xs text-center transition-all ${
                  settings.readingMode === mode.id
                    ? 'border-lily-500 bg-lily-50 text-lily-950 font-bold shadow-xs'
                    : 'border-ink-200 bg-white text-ink-600 hover:bg-cream-50'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Auto Scroll Speed slider if auto scroll is active */}
          {settings.readingMode === 'auto' && (
            <div className="mt-3 p-3 bg-cream-50 rounded-xl border border-cream-200">
              <div className="flex justify-between text-xs text-ink-700 mb-1">
                <span>Tốc độ cuộn tự động:</span>
                <span className="font-bold">{settings.autoScrollSpeed}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={settings.autoScrollSpeed}
                onChange={(e) => updateSetting('autoScrollSpeed', Number(e.target.value))}
                className="w-full accent-lily-600 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Reader Footer Display Options (VIP) */}
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-2">
            Hiển thị thanh chân trang (Footer) {user.tier === 'free' && '🔒 VIP Only'}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {footerDisplays.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  if (user.tier === 'free' && f.id !== 'percent') {
                    openUpgradeModal('Tùy biến chân trang Reader');
                  } else {
                    updateSetting('footerDisplay', f.id);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs transition-all ${
                  settings.footerDisplay === f.id
                    ? 'border-lily-500 bg-lily-50 text-lily-950 font-bold'
                    : 'border-ink-200 bg-white text-ink-600 hover:bg-cream-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
