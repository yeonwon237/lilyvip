import React, { useState, useEffect, useRef } from 'react';
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
  Volume2,
  Download,
  Upload,
  FileArchive,
  AlertTriangle,
  MessageSquare,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useReader } from '../context/ReaderContext';
import { mockThemes } from '../mock/mockData';
import { PlanStatus } from '../components/common/PlanStatus';
import { VoiceStorageManager, AudioAccessManager } from '../audio-engine';
import { BackupPreview, LilyLibraryBackupV1, LocalLibraryBackup } from '../book-engine/storage/LocalLibraryBackup';

export const SettingsPage: React.FC = () => {
  const { user, books, canUseFeature, isOpenBeta, showToast, reloadLocalBooks, maxLocalSlots } = useApp();
  const { 
    settings, 
    updateSetting, 
    resetSettings, 
    audioAccess, 
    toggleDevAudioAccess,
    availableVoices 
  } = useReader();

  const [voiceStorageMB, setVoiceStorageMB] = useState<number>(0);
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreBackup, setRestoreBackup] = useState<LilyLibraryBackupV1 | null>(null);
  const [restorePreview, setRestorePreview] = useState<BackupPreview | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('Báo lỗi');
  const [feedbackContent, setFeedbackContent] = useState('');
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const isDev = AudioAccessManager.isDevEnvironment();

  const downloadFeedback = () => {
    if (!feedbackContent.trim()) return;
    const diagnostics = [
      'Lily Open Beta · 1.0.0',
      `Hạng mục: ${feedbackCategory}`,
      `Thời gian: ${new Date().toISOString()}`,
      `Trạng thái mạng: ${navigator.onLine ? 'online' : 'offline'}`,
      `Chế độ ứng dụng: ${window.matchMedia('(display-mode: standalone)').matches ? 'đã cài đặt' : 'trình duyệt'}`,
      `Thiết bị: ${window.innerWidth < 768 ? 'mobile/tablet' : 'desktop'}`,
      '',
      feedbackContent.trim(),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([diagnostics], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lily-gop-y-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Đã tạo file góp ý để bạn gửi qua kênh liên hệ của Lily.', 'success');
    setFeedbackOpen(false);
    setFeedbackContent('');
  };

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

  const handleCreateBackup = async () => {
    try {
      setBackupBusy(true);
      const backup = await LocalLibraryBackup.create();
      const url = URL.createObjectURL(LocalLibraryBackup.serialize(backup));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Lily-Sao-luu-${new Date().toISOString().slice(0, 10)}.lilybackup`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`Đã tạo bản sao lưu ${backup.books.length} truyện.`, 'success');
    } catch {
      showToast('Chưa thể tạo bản sao lưu. Hãy thử lại.', 'error');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRestoreFile = async (file?: File) => {
    if (!file) return;
    try {
      setBackupBusy(true);
      const parsed = await LocalLibraryBackup.parseFile(file);
      setRestoreBackup(parsed);
      setRestorePreview(LocalLibraryBackup.preview(parsed));
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === 'BACKUP_TOO_LARGE';
      showToast(tooLarge ? 'File sao lưu quá lớn để xử lý an toàn.' : 'Không thể đọc bản sao lưu này.', 'error');
    } finally {
      setBackupBusy(false);
      if (restoreInputRef.current) restoreInputRef.current.value = '';
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreBackup) return;
    try {
      setBackupBusy(true);
      const result = await LocalLibraryBackup.restore(restoreBackup);
      await reloadLocalBooks();
      setRestoreBackup(null);
      setRestorePreview(null);
      if (result.restoredBooks > 0) {
        showToast(`Đã khôi phục ${result.restoredBooks} truyện vào thư viện.`, 'success');
      } else {
        showToast('Không có truyện mới phù hợp để khôi phục.', 'info');
      }
      if (result.skippedDuplicates || result.skippedForLimit) {
        showToast(`Đã bỏ qua ${result.skippedDuplicates} truyện trùng và ${result.skippedForLimit} truyện vượt giới hạn.`, 'info');
      }
    } catch {
      showToast('Khôi phục chưa hoàn tất; thư viện hiện tại không bị ghi đè.', 'error');
    } finally {
      setBackupBusy(false);
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
              Cài đặt
            </h1>
            <PlanStatus tier={user.tier} size="sm" />
          </div>
          <p className="text-sm text-ink-600 mt-1">
            Điều chỉnh cách đọc, Giọng Lily và dữ liệu trên thiết bị.
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
              Phông chữ khi đọc
            </label>
            <div className="space-y-2">
              {fontFamilies.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    if (canUseFeature('advancedTypography') || f.id === 'Literata') {
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
                Độ rộng trang đọc
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
          <h2 className="font-serif font-bold text-lg text-ink-950">Màu nền mặc định khi đọc</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {mockThemes.map((t) => {
            const isSelected = settings.activeThemeId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (!t.isVipOnly || canUseFeature('premiumThemes')) {
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
                {t.isVipOnly && isOpenBeta && (
                  <span className="text-[9px] font-semibold absolute top-1.5 right-1.5 rounded-full bg-white/80 px-1.5 py-0.5 text-lily-700">Beta</span>
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
            Các giọng bạn tải được lưu trên thiết bị để có thể nghe truyện khi ngoại tuyến. Nội dung truyện không được gửi đi để tạo giọng đọc.
          </p>

          <div className="p-4 bg-lavender-50/60 rounded-2xl border border-lavender-200/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-lavender-950">Giọng đọc tiếng Việt:</span>
              <span className="text-lavender-800">Bộ sưu tập Giọng Lily</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Nghe khi ngoại tuyến:</span>
              <span className="text-emerald-700 font-semibold">✓ Giọng đã tải sẵn sàng</span>
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

      {/* LOCAL LIBRARY BACKUP & RECOVERY */}
      <section className="bg-white border border-ink-100 rounded-3xl p-6 md:p-8 shadow-soft space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-ink-100">
          <FileArchive className="w-5 h-5 text-emerald-700" />
          <h2 className="font-serif font-bold text-lg text-ink-950">Sao lưu & khôi phục</h2>
        </div>
        <div className="space-y-2 text-sm text-ink-600 leading-relaxed">
          <p><strong className="text-ink-900">Sao lưu thư viện</strong> lưu truyện, chương, tiến độ đọc, dấu trang, đoạn đánh dấu, ghi chú và tủ sách vào một file trên thiết bị.</p>
          <p className="text-xs text-amber-800 flex items-start gap-1.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            File sao lưu có chứa nội dung truyện và ghi chú của bạn. Hãy lưu ở nơi an toàn. Giọng Lily và âm thanh tạm không được đưa vào file.
          </p>
          {isOpenBeta && <p className="text-xs text-ink-500">Trong Open Beta, Lily cho phép lưu tối đa {maxLocalSlots} truyện trên thiết bị.</p>}
        </div>

        <input
          ref={restoreInputRef}
          type="file"
          accept=".lilybackup,.json,application/json"
          className="hidden"
          onChange={(event) => handleRestoreFile(event.target.files?.[0])}
        />
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            disabled={backupBusy || books.length === 0}
            onClick={handleCreateBackup}
            className="px-4 py-2.5 rounded-xl bg-ink-950 text-white disabled:opacity-40 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Tạo bản sao lưu
          </button>
          <button
            type="button"
            disabled={backupBusy || books.length >= maxLocalSlots}
            onClick={() => restoreInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl border border-ink-200 bg-cream-50 disabled:opacity-40 text-ink-800 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" /> Chọn file khôi phục
          </button>
        </div>

        {restorePreview && restoreBackup && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-ink-950">Bản sao lưu</h3>
              <p className="text-xs text-ink-500">Tạo ngày {new Date(restorePreview.createdAt).toLocaleString('vi-VN')}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-ink-700">
              <span><strong>{restorePreview.bookCount}</strong> truyện</span>
              <span><strong>{restorePreview.chapterCount}</strong> chương</span>
              <span><strong>{restorePreview.bookmarkCount}</strong> dấu trang</span>
              <span><strong>{restorePreview.annotationCount}</strong> đoạn đánh dấu</span>
              <span><strong>{restorePreview.noteCount}</strong> ghi chú</span>
            </div>
            <p className="text-xs text-ink-600">Khôi phục theo chế độ thêm an toàn. Lily không ghi đè thư viện hiện tại và chỉ thêm tối đa {Math.max(0, maxLocalSlots - books.length)} truyện.</p>
            <div className="flex gap-2">
              <button disabled={backupBusy} onClick={handleConfirmRestore} className="rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50">Khôi phục thư viện</button>
              <button disabled={backupBusy} onClick={() => { setRestoreBackup(null); setRestorePreview(null); }} className="rounded-xl border border-ink-200 px-3.5 py-2 text-xs font-semibold text-ink-700">Hủy</button>
            </div>
          </div>
        )}
      </section>

      {isOpenBeta && (
        <section className="rounded-3xl border border-lily-200/70 bg-gradient-to-br from-lily-50/80 to-white p-6 md:p-8 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-lily-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-lily-800">Open Beta</span>
                <h2 className="font-serif text-lg font-bold text-ink-950">Lily đang trong giai đoạn thử nghiệm</h2>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-600">Các tính năng đọc và nghe nâng cao đang được mở miễn phí. Truyện được lưu trên thiết bị; hãy tạo bản sao lưu cho thư viện quan trọng.</p>
              <p className="mt-2 text-xs text-ink-500">Lily Open Beta · 1.0.0</p>
            </div>
            <button
              onClick={() => setFeedbackOpen(true)}
              className="shrink-0 rounded-2xl bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-ink-800"
            >
              Góp ý & Báo lỗi
            </button>
          </div>
        </section>
      )}

      {feedbackOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
          <section className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-modal sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-lily-700" /><h2 id="feedback-title" className="font-serif text-xl font-bold">Góp ý & Báo lỗi</h2></div>
              <button onClick={() => setFeedbackOpen(false)} aria-label="Đóng" className="rounded-full p-2 hover:bg-ink-50"><X className="h-5 w-5" /></button>
            </div>
            <label className="mt-5 block text-xs font-semibold text-ink-700">Bạn muốn gửi gì?</label>
            <select value={feedbackCategory} onChange={e => setFeedbackCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-ink-200 bg-cream-50 p-3 text-sm">
              <option>Báo lỗi</option><option>Khó sử dụng</option><option>Đề xuất</option><option>Khác</option>
            </select>
            <label className="mt-4 block text-xs font-semibold text-ink-700">Nội dung</label>
            <textarea value={feedbackContent} onChange={e => setFeedbackContent(e.target.value)} rows={6} placeholder="Hãy mô tả điều bạn gặp phải hoặc điều bạn muốn Lily cải thiện…" className="mt-2 w-full resize-none rounded-xl border border-ink-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-lily-200" />
            <p className="mt-3 text-xs leading-relaxed text-ink-500">Repo chưa có hệ thống nhận góp ý. Lily sẽ tạo một file để bạn chủ động gửi qua kênh liên hệ. File chỉ kèm phiên bản, loại thiết bị, trạng thái mạng và nội dung bạn nhập; không kèm truyện, ghi chú hay lịch sử tìm kiếm.</p>
            <button disabled={!feedbackContent.trim()} onClick={downloadFeedback} className="mt-5 w-full rounded-xl bg-ink-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">Tạo file góp ý</button>
          </section>
        </div>
      )}
    </div>
  );
};
