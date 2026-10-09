import { t } from '../../i18n';
import React, { useState } from 'react';
import { AlignJustify, AlignLeft, Check, Lock, RotateCcw, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';
import { mockThemes } from '../../mock/mockData';
import { FooterDisplay, ReaderPageWidth, ReadingMode } from '../../types';

// One sheet for text size and colour theme (they used to be two toolbar buttons).
export const AaSettingsSheet: React.FC = () => {
  const { canUseFeature } = useApp();
  const { isAaPanelOpen, setIsAaPanelOpen, settings, updateSetting, applyPreset, resetSettings } = useReader();
  const [moreThemes, setMoreThemes] = useState(false);
  if (!isAaPanelOpen) return null;

  const presets = [['thoai-mai', t("Thoải mái")], ['gon-gang', t("Gọn gàng")], ['sach-giay', t("Sách giấy")], ['doc-dem', t("Đọc đêm")]];
  const widths: { id: ReaderPageWidth; label: string }[] = [{ id: 'narrow', label: t("Hẹp") }, { id: 'normal', label: t("Vừa") }, { id: 'wide', label: t("Rộng") }, { id: 'full', label: t("Toàn màn") }];
  const modes: { id: ReadingMode; label: string }[] = [{ id: 'scroll', label: t("Cuộn") }, { id: 'auto', label: t("Tự cuộn") }, { id: 'focus', label: t("Tập trung") }];
  const footers: { id: FooterDisplay; label: string }[] = [{ id: 'percent', label: t("Phần trăm") }, { id: 'pages', label: t('Trang') }, { id: 'time_chapter', label: t("Chương") }, { id: 'time_book', label: t("Truyện") }, { id: 'hidden', label: t("Ẩn") }];
  const segment = (selected: boolean) => `reader-segment ${selected ? 'is-selected' : ''}`;

  return <div className="reader-settings-overlay fixed inset-0 z-50 flex items-end justify-center bg-ink-950/35" onClick={() => setIsAaPanelOpen(false)}>
    <section role="dialog" aria-modal="true" aria-labelledby="reader-settings-title" className="reader-panel reader-settings-sheet w-full max-w-2xl overflow-y-auto border-t border-ink-200" onClick={(event) => event.stopPropagation()}>
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-ink-100 bg-white px-4">
        <h3 id="reader-settings-title" className="font-serif text-base font-bold text-ink-900">{t("Hiển thị")}</h3>
        <div className="flex items-center"><button onClick={resetSettings} className="flex h-9 items-center gap-1 px-2 text-xs text-ink-500 hover:text-ink-900"><RotateCcw className="h-4 w-4" /> {t(" Mặc định")}</button><button onClick={() => setIsAaPanelOpen(false)} className="flex h-9 w-9 items-center justify-center text-ink-600" aria-label={t("Đóng")}><X className="h-5 w-5" /></button></div>
      </header>
      <div className="reader-settings-body space-y-4 p-4 pb-6">
        <div className="reader-theme-grid" aria-label={t("Màu nền")}>
          {(moreThemes ? mockThemes : mockThemes.filter((theme, index) => index < 6 || theme.id === settings.activeThemeId)).map((theme) => {
            const selected = settings.activeThemeId === theme.id;
            const locked = theme.isVipOnly && !canUseFeature('premiumThemes');
            return <button key={theme.id} onClick={() => !locked && updateSetting('activeThemeId', theme.id)} disabled={locked} aria-pressed={selected} aria-label={t(theme.name)} className="reader-theme-choice text-center disabled:opacity-45">
              <span className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full border ${selected ? 'border-lily-700 ring-2 ring-lily-200' : 'border-ink-200'}`} style={{ backgroundColor: theme.previewBg, color: theme.previewText }}><span className="font-serif text-sm font-bold">Aa</span>{selected && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-lily-700 text-white"><Check className="h-2.5 w-2.5" /></span>}{locked && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink-700 text-white"><Lock className="h-2.5 w-2.5" /></span>}</span>
              <span className="mt-1 block truncate text-[10px] text-ink-700">{t(theme.name)}</span>
            </button>;
          })}
        </div>
        <button type="button" className="reader-more-themes" aria-expanded={moreThemes} onClick={() => setMoreThemes(!moreThemes)}>{moreThemes ? t("Thu gọn") : t("Thêm màu nền")}</button>
        <div className="grid grid-cols-4 overflow-hidden border border-ink-200">{presets.map(([id, label]) => <button key={id} onClick={() => applyPreset(id)} className={segment(settings.selectedPreset === ({"thoai-mai":"Thoải mái","gon-gang":"Gọn gàng","sach-giay":"Sách giấy","doc-dem":"Đọc đêm"} as Record<string,string>)[id])}>{t(String(label))}</button>)}</div>

        <div className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2">
          <span className="text-sm font-medium">{t("Cỡ chữ")}</span><input aria-label={t("Cỡ chữ")} type="range" min="14" max="32" value={settings.fontSize} onChange={(e) => updateSetting('fontSize', Number(e.target.value))} className="h-1.5 w-full accent-lily-700" />
          <div className="flex border border-ink-200"><button onClick={() => updateSetting('fontSize', Math.max(14, settings.fontSize - 1))} className="h-8 w-8 border-r border-ink-200 text-xs font-bold">A-</button><span className="flex h-8 w-9 items-center justify-center text-xs font-semibold">{settings.fontSize}</span><button onClick={() => updateSetting('fontSize', Math.min(32, settings.fontSize + 1))} className="h-8 w-8 border-l border-ink-200 text-xs font-bold">A+</button></div>
        </div>

        <label className="grid grid-cols-[5.5rem_1fr] items-center gap-2"><span className="text-sm font-medium">{t("Phông chữ")}</span><select value={settings.fontFamily} onChange={(e) => updateSetting('fontFamily', e.target.value as typeof settings.fontFamily)} className="h-9 min-w-0 border border-ink-200 bg-white px-2 text-sm">{['Plus Jakarta Sans', 'Literata', 'Merriweather', 'Playfair Display', 'Lora', 'PT Serif', 'Noto Serif', 'Be Vietnam Pro', 'Inter'].map((font) => <option key={font} value={font}>{font === 'Plus Jakarta Sans' ? t("Theo ứng dụng") : font}</option>)}</select></label>

        <div className="grid gap-3 border-y border-ink-100 py-3 sm:grid-cols-2">
          <label className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2 text-sm"><span>{t("Giãn dòng")}</span><input type="range" min="1.4" max="2.4" step="0.05" value={settings.lineHeight} onChange={(e) => updateSetting('lineHeight', Number(e.target.value))} className="h-1.5 accent-lily-700" /><span className="text-right text-xs">{settings.lineHeight}</span></label>
          <label className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2 text-sm"><span>{t("Cách đoạn")}</span><input type="range" min="0.6" max="2.4" step="0.1" value={settings.paragraphSpacing} onChange={(e) => updateSetting('paragraphSpacing', Number(e.target.value))} className="h-1.5 accent-lily-700" /><span className="text-right text-xs">{settings.paragraphSpacing}</span></label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2"><span className="text-sm font-medium">{t("Lề đọc")}</span><div className="grid grid-cols-3 overflow-hidden border border-ink-200">{[[16, t("Hẹp")], [24, t("Vừa")], [36, t("Rộng")]].map(([value, label]) => <button key={value} onClick={() => updateSetting('marginHorizontal', Number(value))} className={segment(settings.marginHorizontal === value)}>{t(String(label))}</button>)}</div></div>
          <div className="hidden grid-cols-[5.5rem_1fr] items-center gap-2 sm:grid"><span className="text-sm font-medium">{t("Khổ trang")}</span><div className="grid grid-cols-4 overflow-hidden border border-ink-200">{widths.map((item) => <button key={item.id} onClick={() => updateSetting('pageWidth', item.id)} className={segment(settings.pageWidth === item.id)}>{item.label}</button>)}</div></div>
          <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2"><span className="text-sm font-medium">{t("Căn chữ")}</span><div className="grid grid-cols-2 overflow-hidden border border-ink-200"><button onClick={() => updateSetting('textAlign', 'left')} className={segment(settings.textAlign === 'left')} aria-label={t("Căn trái")}><AlignLeft className="mx-auto h-4 w-4" /></button><button onClick={() => updateSetting('textAlign', 'justify')} className={segment(settings.textAlign === 'justify')} aria-label={t("Căn đều")}><AlignJustify className="mx-auto h-4 w-4" /></button></div></div>
          <label className="flex min-h-9 items-center justify-between border-b border-ink-100 text-sm"><span className="font-medium">{t("Thụt đầu dòng")}</span><input type="checkbox" checked={settings.firstLineIndent} onChange={(e) => updateSetting('firstLineIndent', e.target.checked)} className="h-4 w-4 accent-lily-700" /></label>
        </div>

        <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2"><span className="text-sm font-medium">{t("Chế độ")}</span><div className="grid grid-cols-3 overflow-hidden border border-ink-200">{modes.map((item) => <button key={item.id} onClick={() => updateSetting('readingMode', item.id)} className={segment(settings.readingMode === item.id)}>{item.label}</button>)}</div></div>
        {settings.readingMode === 'auto' && <label className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2 text-sm"><span>{t("Tốc độ")}</span><input type="range" min="1" max="10" value={settings.autoScrollSpeed} onChange={(e) => updateSetting('autoScrollSpeed', Number(e.target.value))} className="h-1.5 accent-lily-700" /><span>{settings.autoScrollSpeed}x</span></label>}
        <label className="grid grid-cols-[5.5rem_1fr] items-center gap-2"><span className="text-sm font-medium">{t("Chân trang")}</span><select value={settings.footerDisplay} onChange={(e) => updateSetting('footerDisplay', e.target.value as FooterDisplay)} className="h-9 border border-ink-200 bg-white px-2 text-sm">{footers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
    </section>
  </div>;
};
