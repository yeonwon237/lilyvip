import React from 'react';
import { 
  X, 
  Sparkles, 
  AlignLeft, 
  AlignJustify, 
  RotateCcw, 
  Check,
  BookOpen,
  Layers,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';
import { ReadingMode, FooterDisplay, ReaderPageWidth } from '../../types';

export const AaSettingsSheet: React.FC = () => {
  const { canUseFeature, isOpenBeta } = useApp();
  const { 
    isAaPanelOpen, 
    setIsAaPanelOpen, 
    settings, 
    updateSetting, 
    applyPreset, 
    resetSettings 
  } = useReader();

  if (!isAaPanelOpen) return null;

  const fontGroups = [
    {
      groupName: 'Phông sách (Serif)',
      fonts: [
        { id: 'Literata', name: 'Literata', desc: 'Tao nhã, êm mắt' },
        { id: 'Merriweather', name: 'Merriweather', desc: 'Cổ điển, rõ nét' },
        { id: 'Playfair Display', name: 'Playfair', desc: 'Văn học, cung đình' },
      ]
    },
    {
      groupName: 'Hiện đại (Sans-serif)',
      fonts: [
        { id: 'Be Vietnam Pro', name: 'Be Vietnam Pro', desc: 'Thuần Việt, hiện đại' },
        { id: 'Inter', name: 'Inter', desc: 'Tối giản, trung tính' },
      ]
    }
  ];

  const presets = [
    { id: 'thoai-mai', label: 'Thoải mái', desc: 'Literata · Giãn 1.85 · Lề vừa' },
    { id: 'gon-gang', label: 'Gọn gàng', desc: 'Be Vietnam Pro · Cỡ 17 · Lề hẹp' },
    { id: 'sach-giay', label: 'Sách giấy', desc: 'Merriweather · Căn đều · Giấy in' },
    { id: 'doc-dem', label: 'Đọc đêm', desc: 'Literata · Nền tối dịu · Giảm mỏi mắt' },
  ];

  const marginOptions = [
    { value: 16, label: 'Hẹp (16px)' },
    { value: 24, label: 'Vừa (24px)' },
    { value: 36, label: 'Rộng (36px)' },
  ];

  const pageWidthOptions: { id: ReaderPageWidth; label: string }[] = [
    { id: 'narrow', label: 'Hẹp' },
    { id: 'normal', label: 'Vừa' },
    { id: 'wide', label: 'Rộng' },
    { id: 'full', label: 'Toàn màn' },
  ];

  const readingModes: { id: ReadingMode; label: string }[] = [
    { id: 'scroll', label: 'Cuộn dọc' },
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
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/35 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => setIsAaPanelOpen(false)}
    >
      <div 
        className="w-full max-w-xl bg-white rounded-t-3xl shadow-modal border-t border-ink-100 p-5 md:p-6 max-h-[85vh] max-h-[85dvh] overflow-y-auto space-y-5 animate-in slide-in-from-bottom duration-200 safe-area-pb"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-base text-ink-900">
              Tùy chỉnh đọc sách (Aa)
            </h3>
            {settings.selectedPreset && (
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-cream-100 text-ink-700 border border-ink-200/60">
                {settings.selectedPreset}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetSettings}
              className="p-1 text-ink-400 hover:text-ink-700 text-xs flex items-center gap-1 transition-colors"
              title="Đặt lại cài đặt mặc định"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mặc định</span>
            </button>
            <button
              onClick={() => setIsAaPanelOpen(false)}
              className="p-1 rounded-full text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
              aria-label="Đóng bảng cài đặt"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. Quick Presets */}
        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-2">
            Phong cách thiết lập sẵn (Reading Presets)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => {
              const isSelected = settings.selectedPreset === preset.label;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className={`p-2.5 rounded-2xl border text-left transition-all relative ${
                    isSelected
                      ? 'border-lily-500 bg-lily-50/70 shadow-xs ring-1 ring-lily-500/40'
                      : 'border-ink-200/80 hover:border-ink-300 bg-cream-50/40'
                  }`}
                >
                  <div className="font-semibold text-xs text-ink-900 flex items-center justify-between">
                    <span>{preset.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-lily-600 shrink-0" />}
                  </div>
                  <div className="text-[10px] text-ink-500 mt-0.5 line-clamp-1">
                    {preset.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Font Size & Stepper */}
        <div className="p-3.5 rounded-2xl bg-cream-50/50 border border-ink-100 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-800">
            <span>Cỡ chữ: <span className="font-mono text-lily-800 font-bold">{settings.fontSize}px</span></span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateSetting('fontSize', Math.max(14, settings.fontSize - 1))}
                disabled={settings.fontSize <= 14}
                className="w-8 h-8 rounded-xl border border-ink-200 bg-white font-bold hover:bg-cream-100 active:scale-95 disabled:opacity-35 text-ink-800 transition-all flex items-center justify-center text-xs shadow-xs"
                aria-label="Giảm cỡ chữ"
              >
                A−
              </button>
              <button
                onClick={() => updateSetting('fontSize', Math.min(32, settings.fontSize + 1))}
                disabled={settings.fontSize >= 32}
                className="w-8 h-8 rounded-xl border border-ink-200 bg-white font-bold hover:bg-cream-100 active:scale-95 disabled:opacity-35 text-ink-800 transition-all flex items-center justify-center text-xs shadow-xs"
                aria-label="Tăng cỡ chữ"
              >
                A+
              </button>
            </div>
          </div>
          <input
            type="range"
            min="14"
            max="32"
            step="1"
            value={settings.fontSize}
            onChange={(e) => updateSetting('fontSize', Number(e.target.value))}
            className="w-full accent-lily-600 cursor-pointer h-1.5 bg-ink-200 rounded-lg appearance-none"
          />
        </div>

        {/* 3. Font Family Grouped */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-ink-700">
            Phông chữ
          </label>
          <div className="space-y-2.5">
            {fontGroups.map((group) => (
              <div key={group.groupName} className="space-y-1.5">
                <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider block pl-1">
                  {group.groupName}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {group.fonts.map((font) => {
                    const isSelected = settings.fontFamily === font.id;
                    return (
                      <button
                        key={font.id}
                        onClick={() => updateSetting('fontFamily', font.id as any)}
                        className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                          isSelected
                            ? 'border-lily-500 bg-lily-50/80 text-lily-950 font-bold shadow-xs'
                            : 'border-ink-200 bg-white hover:bg-cream-50 text-ink-800'
                        }`}
                        style={{ fontFamily: font.id }}
                      >
                        <div className="font-semibold text-xs truncate">{font.name}</div>
                        <div className="text-[10px] text-ink-500 font-sans truncate opacity-80">{font.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Line Height, Paragraph Spacing & Letter Spacing */}
        <div className="space-y-3 pt-2 border-t border-ink-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Line Height */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-ink-700 mb-1.5">
                <span>Giãn dòng:</span>
                <span className="font-mono font-bold text-lily-800">{settings.lineHeight}</span>
              </div>
              <input
                type="range"
                min="1.4"
                max="2.4"
                step="0.05"
                value={settings.lineHeight}
                onChange={(e) => updateSetting('lineHeight', Number(e.target.value))}
                className="w-full accent-lily-600 cursor-pointer h-1.5 bg-ink-200 rounded-lg appearance-none"
              />
            </div>

            {/* Paragraph Spacing */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-ink-700 mb-1.5">
                <span>Khoảng cách đoạn:</span>
                <span className="font-mono font-bold text-lily-800">{settings.paragraphSpacing}em</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="2.4"
                step="0.1"
                value={settings.paragraphSpacing}
                onChange={(e) => updateSetting('paragraphSpacing', Number(e.target.value))}
                className="w-full accent-lily-600 cursor-pointer h-1.5 bg-ink-200 rounded-lg appearance-none"
              />
            </div>
          </div>

          {/* Letter Spacing */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-ink-700 mb-1.5">
              <span>Khoảng cách chữ (Letter spacing):</span>
              <span className="font-mono font-bold text-lily-800">
                {settings.letterSpacing !== undefined ? `${settings.letterSpacing}em` : '0em'}
              </span>
            </div>
            <input
              type="range"
              min="-0.02"
              max="0.08"
              step="0.01"
              value={settings.letterSpacing || 0}
              onChange={(e) => updateSetting('letterSpacing', Number(e.target.value))}
              className="w-full accent-lily-600 cursor-pointer h-1.5 bg-ink-200 rounded-lg appearance-none"
            />
          </div>
        </div>

        {/* 5. Page Margins & Text Alignment */}
        <div className="space-y-3 pt-2 border-t border-ink-100 text-xs">
          {/* Margins */}
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">
              Lề đọc (Trái / Phải)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {marginOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateSetting('marginHorizontal', opt.value)}
                  className={`py-1.5 px-2 rounded-xl border text-center transition-all ${
                    settings.marginHorizontal === opt.value
                      ? 'border-lily-500 bg-lily-50 text-lily-950 font-bold shadow-xs'
                      : 'border-ink-200 bg-white text-ink-700 hover:bg-cream-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reading Width (Desktop / Tablet) */}
          <div className="hidden sm:block">
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">
              Độ rộng trang (Màn hình lớn)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {pageWidthOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => updateSetting('pageWidth', opt.id)}
                  className={`py-1.5 px-2 rounded-xl border text-center transition-all ${
                    settings.pageWidth === opt.id
                      ? 'border-lily-500 bg-lily-50 text-lily-950 font-bold shadow-xs'
                      : 'border-ink-200 bg-white text-ink-700 hover:bg-cream-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alignment & Indent */}
          <div className="flex items-center justify-between pt-2 border-t border-ink-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink-700">Căn lề:</span>
              <div className="flex rounded-xl border border-ink-200 overflow-hidden shadow-xs">
                <button
                  onClick={() => updateSetting('textAlign', 'left')}
                  className={`p-1.5 px-2.5 flex items-center gap-1 transition-colors ${
                    settings.textAlign === 'left' ? 'bg-ink-950 text-white font-semibold' : 'bg-white text-ink-700 hover:bg-cream-50'
                  }`}
                  title="Căn lề trái"
                >
                  <AlignLeft className="w-4 h-4" />
                  <span className="text-[11px]">Trái</span>
                </button>
                <button
                  onClick={() => updateSetting('textAlign', 'justify')}
                  className={`p-1.5 px-2.5 flex items-center gap-1 transition-colors ${
                    settings.textAlign === 'justify' ? 'bg-ink-950 text-white font-semibold' : 'bg-white text-ink-700 hover:bg-cream-50'
                  }`}
                  title="Căn đều hai bên"
                >
                  <AlignJustify className="w-4 h-4" />
                  <span className="text-[11px]">Căn đều</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="first-line-indent-toggle" className="font-semibold text-ink-700 cursor-pointer">
                Thụt đầu dòng:
              </label>
              <input
                id="first-line-indent-toggle"
                type="checkbox"
                checked={settings.firstLineIndent}
                onChange={(e) => updateSetting('firstLineIndent', e.target.checked)}
                className="w-4 h-4 accent-lily-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 6. Reading Mode */}
        <div className="space-y-2 pt-2 border-t border-ink-100">
          <label className="block text-xs font-semibold text-ink-700">
            Chế độ đọc
          </label>
          <div className="grid grid-cols-3 gap-2">
            {readingModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => updateSetting('readingMode', mode.id)}
                className={`py-2 px-1 rounded-xl border text-xs text-center transition-all ${
                  settings.readingMode === mode.id
                    ? 'border-lily-500 bg-lily-50 text-lily-950 font-bold shadow-xs'
                    : 'border-ink-200 bg-white text-ink-700 hover:bg-cream-50'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Auto Scroll Speed slider if auto scroll is active */}
          {settings.readingMode === 'auto' && (
            <div className="mt-2.5 p-3 bg-cream-50 rounded-2xl border border-cream-200/80 space-y-1.5">
              <div className="flex justify-between text-xs text-ink-800">
                <span>Tốc độ tự cuộn:</span>
                <span className="font-mono font-bold text-lily-800">{settings.autoScrollSpeed}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={settings.autoScrollSpeed}
                onChange={(e) => updateSetting('autoScrollSpeed', Number(e.target.value))}
                className="w-full accent-lily-600 cursor-pointer h-1.5 bg-ink-200 rounded-lg appearance-none"
              />
            </div>
          )}
        </div>

        {/* 7. Footer Display */}
        <div className="space-y-2 pt-2 border-t border-ink-100">
          <label className="block text-xs font-semibold text-ink-700">
            Thanh chân trang (Footer)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {footerDisplays.map((f) => (
              <button
                key={f.id}
                onClick={() => updateSetting('footerDisplay', f.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs transition-all ${
                  settings.footerDisplay === f.id
                    ? 'border-lily-500 bg-lily-50 text-lily-950 font-bold shadow-xs'
                    : 'border-ink-200 bg-white text-ink-700 hover:bg-cream-50'
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
