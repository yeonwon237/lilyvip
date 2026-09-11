import React from 'react';
import { AlignJustify, AlignLeft, RotateCcw, X } from 'lucide-react';
import { useReader } from '../../context/ReaderContext';
import { FooterDisplay, ReaderPageWidth, ReadingMode } from '../../types';

export const AaSettingsSheet: React.FC = () => {
  const { isAaPanelOpen, setIsAaPanelOpen, settings, updateSetting, applyPreset, resetSettings } = useReader();
  if (!isAaPanelOpen) return null;

  const presets = [['thoai-mai', 'Thoải mái'], ['gon-gang', 'Gọn gàng'], ['sach-giay', 'Sách giấy'], ['doc-dem', 'Đọc đêm']];
  const widths: { id: ReaderPageWidth; label: string }[] = [{ id: 'narrow', label: 'Hẹp' }, { id: 'normal', label: 'Vừa' }, { id: 'wide', label: 'Rộng' }, { id: 'full', label: 'Toàn màn' }];
  const modes: { id: ReadingMode; label: string }[] = [{ id: 'scroll', label: 'Cuộn' }, { id: 'auto', label: 'Tự cuộn' }, { id: 'focus', label: 'Tập trung' }];
  const footers: { id: FooterDisplay; label: string }[] = [{ id: 'percent', label: 'Phần trăm' }, { id: 'pages', label: 'Trang' }, { id: 'time_chapter', label: 'Chương' }, { id: 'time_book', label: 'Truyện' }, { id: 'hidden', label: 'Ẩn' }];
  const segment = (selected: boolean) => `min-h-8 border-r border-ink-200 px-1.5 text-xs last:border-r-0 ${selected ? 'bg-ink-950 font-semibold text-white' : 'bg-white text-ink-700 hover:bg-ink-50'}`;

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/35" onClick={() => setIsAaPanelOpen(false)}>
    <section className="reader-panel reader-settings-sheet w-full max-w-2xl overflow-y-auto border-t border-ink-200" onClick={(event) => event.stopPropagation()}>
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-ink-100 bg-white px-4">
        <h3 className="font-serif text-base font-bold text-ink-900">Cài đặt đọc</h3>
        <div className="flex items-center"><button onClick={resetSettings} className="flex h-9 items-center gap-1 px-2 text-xs text-ink-500 hover:text-ink-900"><RotateCcw className="h-4 w-4" /> Mặc định</button><button onClick={() => setIsAaPanelOpen(false)} className="flex h-9 w-9 items-center justify-center text-ink-600" aria-label="Đóng"><X className="h-5 w-5" /></button></div>
      </header>
      <div className="space-y-4 p-4 pb-6">
        <div className="grid grid-cols-4 overflow-hidden border border-ink-200">{presets.map(([id, label]) => <button key={id} onClick={() => applyPreset(id)} className={segment(settings.selectedPreset === label)}>{label}</button>)}</div>

        <div className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2">
          <span className="text-sm font-medium">Cỡ chữ</span><input type="range" min="14" max="32" value={settings.fontSize} onChange={(e) => updateSetting('fontSize', Number(e.target.value))} className="h-1.5 w-full accent-lily-700" />
          <div className="flex border border-ink-200"><button onClick={() => updateSetting('fontSize', Math.max(14, settings.fontSize - 1))} className="h-8 w-8 border-r border-ink-200 text-xs font-bold">A-</button><span className="flex h-8 w-9 items-center justify-center text-xs font-semibold">{settings.fontSize}</span><button onClick={() => updateSetting('fontSize', Math.min(32, settings.fontSize + 1))} className="h-8 w-8 border-l border-ink-200 text-xs font-bold">A+</button></div>
        </div>

        <label className="grid grid-cols-[5.5rem_1fr] items-center gap-2"><span className="text-sm font-medium">Phông chữ</span><select value={settings.fontFamily} onChange={(e) => updateSetting('fontFamily', e.target.value as typeof settings.fontFamily)} className="h-9 min-w-0 border border-ink-200 bg-white px-2 text-sm">{['Literata', 'Merriweather', 'Playfair Display', 'Be Vietnam Pro', 'Inter'].map((font) => <option key={font}>{font}</option>)}</select></label>

        <div className="grid gap-3 border-y border-ink-100 py-3 sm:grid-cols-2">
          <label className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2 text-sm"><span>Giãn dòng</span><input type="range" min="1.4" max="2.4" step="0.05" value={settings.lineHeight} onChange={(e) => updateSetting('lineHeight', Number(e.target.value))} className="h-1.5 accent-lily-700" /><span className="text-right text-xs">{settings.lineHeight}</span></label>
          <label className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2 text-sm"><span>Cách đoạn</span><input type="range" min="0.6" max="2.4" step="0.1" value={settings.paragraphSpacing} onChange={(e) => updateSetting('paragraphSpacing', Number(e.target.value))} className="h-1.5 accent-lily-700" /><span className="text-right text-xs">{settings.paragraphSpacing}</span></label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2"><span className="text-sm font-medium">Lề đọc</span><div className="grid grid-cols-3 overflow-hidden border border-ink-200">{[[16, 'Hẹp'], [24, 'Vừa'], [36, 'Rộng']].map(([value, label]) => <button key={value} onClick={() => updateSetting('marginHorizontal', Number(value))} className={segment(settings.marginHorizontal === value)}>{label}</button>)}</div></div>
          <div className="hidden grid-cols-[5.5rem_1fr] items-center gap-2 sm:grid"><span className="text-sm font-medium">Khổ trang</span><div className="grid grid-cols-4 overflow-hidden border border-ink-200">{widths.map((item) => <button key={item.id} onClick={() => updateSetting('pageWidth', item.id)} className={segment(settings.pageWidth === item.id)}>{item.label}</button>)}</div></div>
          <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2"><span className="text-sm font-medium">Căn chữ</span><div className="grid grid-cols-2 overflow-hidden border border-ink-200"><button onClick={() => updateSetting('textAlign', 'left')} className={segment(settings.textAlign === 'left')} aria-label="Căn trái"><AlignLeft className="mx-auto h-4 w-4" /></button><button onClick={() => updateSetting('textAlign', 'justify')} className={segment(settings.textAlign === 'justify')} aria-label="Căn đều"><AlignJustify className="mx-auto h-4 w-4" /></button></div></div>
          <label className="flex min-h-9 items-center justify-between border-b border-ink-100 text-sm"><span className="font-medium">Thụt đầu dòng</span><input type="checkbox" checked={settings.firstLineIndent} onChange={(e) => updateSetting('firstLineIndent', e.target.checked)} className="h-4 w-4 accent-lily-700" /></label>
        </div>

        <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2"><span className="text-sm font-medium">Chế độ</span><div className="grid grid-cols-3 overflow-hidden border border-ink-200">{modes.map((item) => <button key={item.id} onClick={() => updateSetting('readingMode', item.id)} className={segment(settings.readingMode === item.id)}>{item.label}</button>)}</div></div>
        {settings.readingMode === 'auto' && <label className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2 text-sm"><span>Tốc độ</span><input type="range" min="1" max="10" value={settings.autoScrollSpeed} onChange={(e) => updateSetting('autoScrollSpeed', Number(e.target.value))} className="h-1.5 accent-lily-700" /><span>{settings.autoScrollSpeed}x</span></label>}
        <label className="grid grid-cols-[5.5rem_1fr] items-center gap-2"><span className="text-sm font-medium">Chân trang</span><select value={settings.footerDisplay} onChange={(e) => updateSetting('footerDisplay', e.target.value as FooterDisplay)} className="h-9 border border-ink-200 bg-white px-2 text-sm">{footers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
    </section>
  </div>;
};
