import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Type, 
  Palette, 
  Sparkles, 
  Smartphone, 
  Sliders, 
  RotateCcw,
  Check,
  Headphones,
  Trash2,
  HardDrive,
  ShieldCheck,
  Volume2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useReader } from '../context/ReaderContext';
import { mockThemes } from '../mock/mockData';
import { PlanStatus } from '../components/common/PlanStatus';
import { VoiceStorageManager, AudioAccessManager } from '../audio-engine';

export const SettingsPage: React.FC = () => {
  const { user, openUpgradeModal, showToast } = useApp();
  const { 
    settings, 
    updateSetting, 
    resetSettings, 
    audioAccess, 
    toggleDevAudioAccess,
    availableVoices 
  } = useReader();

  const [voiceStorageMB, setVoiceStorageMB] = useState<number>(0);
  const isDev = AudioAccessManager.isDevEnvironment();

  const loadStorage = async () => {
    try {
      const size = await VoiceStorageManager.getTotalVoiceStorageMB();
      setVoiceStorageMB(size);
    } catch {}
  };

  useEffect(() => {
    loadStorage();
  }, []);

  const handleClearVoiceStorage = async () => {
    try {
      await VoiceStorageManager.clearAllVoiceModels();
      await loadStorage();
      showToast('Đã xóa dữ liệu giọng đọc đã tải (Thư viện truyện không bị ảnh hưởng).', 'success');
    } catch {
      showToast('Không thể xóa dữ liệu giọng đọc.', 'error');
    }
  };

  const fontFamilies = [
    { id: 'Literata', label: 'Literata (Serif tao nhã)' },
    { id: 'Merriweather', label: 'Merriweather (Tiểu thuyết cổ điển)' },
    { id: 'Playfair Display', label: 'Playfair Display (Cung đình)' },
    { id: 'Be Vietnam Pro', label: 'Be Vietnam Pro (Hiện đại)' },
    { id: 'Inter', label: 'Inter (Không chân sạch sẽ)' },
  ];

  return (
    <div className="max-w-4xl mx-auto py-2 pb-16 sm:pb-20 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-100/70 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif font-bold text-2xl md:text-3xl lg:text-4xl text-ink-950 tracking-tight">
              Cài đặt & Tùy biến Reader
            </h1>
            <PlanStatus tier={user.tier} size="sm" />
          </div>
          <p className="text-sm text-ink-600 mt-1">
            Thiết lập phong cách hiển thị và trải nghiệm đọc mặc định cho mọi bộ truyện.
          </p>
        </div>

        <button
          onClick={resetSettings}
          className="px-4 py-2 rounded-2xl border border-ink-200 hover:bg-cream-50 text-xs font-medium text-ink-700 flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại mặc định</span>
        </button>
      </div>

      {/* TYPOGRAPHY SETTINGS CARD */}
      <div className="bg-white border border-ink-100 rounded-3xl p-6 md:p-8 shadow-soft space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-ink-100">
          <Type className="w-5 h-5 text-lily-600" />
          <h2 className="font-serif font-bold text-lg text-ink-950">Phông chữ & Kiểu chữ mặc định</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-2">
              Phông chữ Reader {user.tier === 'free' && '🔒 VIP'}
            </label>
            <div className="space-y-2">
              {fontFamilies.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    if (user.tier === 'free' && f.id !== 'Literata') {
                      openUpgradeModal('Phông chữ đa dạng');
                    } else {
                      updateSetting('fontFamily', f.id as any);
                    }
                  }}
                  className={`w-full p-3 rounded-2xl border text-left text-sm transition-all flex items-center justify-between ${
                    settings.fontFamily === f.id
                      ? 'border-lily-500 bg-lily-50 text-lily-950 font-semibold shadow-xs'
                      : 'border-ink-200 bg-cream-50/40 hover:bg-cream-50 text-ink-700'
                  }`}
                >
                  <span>{f.label}</span>
                  {settings.fontFamily === f.id && <Check className="w-4 h-4 text-lily-600" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs font-semibold text-ink-700 mb-1.5">
                <span>Cỡ chữ mặc định:</span>
                <span className="font-bold text-ink-900">{settings.fontSize}px</span>
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

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                Độ rộng khung đọc (Page Width)
              </label>
              <select
                value={settings.pageWidth}
                onChange={(e) => updateSetting('pageWidth', e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-ink-200 bg-cream-50 text-sm font-medium text-ink-800"
              >
                <option value="narrow">Hẹp (Vừa tầm mắt - Tập trung)</option>
                <option value="normal">Chuẩn (Khuyên dùng)</option>
                <option value="wide">Rộng (Toàn màn hình)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* THEMES SETTINGS CARD */}
      <div className="bg-white border border-ink-100 rounded-3xl p-6 md:p-8 shadow-soft space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-ink-100">
          <Palette className="w-5 h-5 text-lily-600" />
          <h2 className="font-serif font-bold text-lg text-ink-950">Giao diện (Theme) mặc định khi mở truyện</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {mockThemes.map((t) => {
            const isSelected = settings.activeThemeId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (user.tier === 'free' && t.isVipOnly) {
                    openUpgradeModal('Bộ sưu tập Theme VIP');
                  } else {
                    updateSetting('activeThemeId', t.id);
                  }
                }}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-between gap-2 transition-all relative ${
                  isSelected ? 'ring-2 ring-lily-500 border-lily-500 shadow-card' : 'border-ink-200 hover:border-lily-300'
                }`}
                style={{ backgroundColor: t.previewBg }}
              >
                <div 
                  className="w-full h-10 rounded-xl flex items-center justify-center font-serif text-sm font-bold"
                  style={{ color: t.previewText }}
                >
                  Aa
                </div>
                <span 
                  className="text-xs font-semibold block"
                  style={{ color: t.previewText }}
                >
                  {t.name}
                </span>
                {t.isVipOnly && user.tier === 'free' && (
                  <span className="text-[10px] absolute top-1.5 right-1.5">🔒</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* AUDIO TTS STORAGE & ENGINE MANAGEMENT CARD */}
      <div className="bg-white border border-ink-100 rounded-3xl p-6 md:p-8 shadow-soft space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-ink-100">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-lavender-600" />
            <h2 className="font-serif font-bold text-lg text-ink-950">Giọng Lily đã tải</h2>
          </div>
          <span className="text-xs font-mono font-medium text-ink-500">
            {voiceStorageMB} MB đã lưu
          </span>
        </div>

        <div className="space-y-3 text-xs text-ink-600 leading-relaxed">
          <p>
            Các giọng bạn tải được lưu trên thiết bị để có thể nghe truyện ngay cả khi offline. Nội dung truyện của bạn luôn được giữ riêng tư.
          </p>

          <div className="p-4 bg-lavender-50/60 rounded-2xl border border-lavender-200/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-lavender-950">Giọng đọc tiếng Việt:</span>
              <span className="text-lavender-800">Bộ sưu tập Giọng Lily</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Trạng thái ngoại tuyến (Offline):</span>
              <span className="text-emerald-700 font-semibold">✓ Tự động lưu cache trên máy</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {voiceStorageMB > 0 ? (
            <button
              onClick={handleClearVoiceStorage}
              className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa dữ liệu giọng đọc ({voiceStorageMB} MB)</span>
            </button>
          ) : (
            <span className="text-xs text-ink-400 italic">
              Chưa có dữ liệu giọng đọc phụ nào chiếm dung lượng bộ nhớ tạm.
            </span>
          )}

          {/* Dev Mode toggle button */}
          {isDev && (
            <button
              onClick={() => toggleDevAudioAccess()}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                audioAccess.enabled
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}
            >
              {audioAccess.enabled ? '● Audio Thử nghiệm: BẬT' : '○ Audio Thử nghiệm: TẮT'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
