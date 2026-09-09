import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCcw,
  Check,
  Trash2,
  Download,
  Upload,
  MessageSquare,
  X,
  Send
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useReader } from '../context/ReaderContext';
import { mockThemes } from '../mock/mockData';
import { PlanStatus } from '../components/common/PlanStatus';
import { InfoTip } from '../components/common/InfoTip';
import { VoiceStorageManager, AudioAccessManager } from '../audio-engine';
import { BackupPreview, LilyLibraryBackupV1, LocalLibraryBackup } from '../book-engine/storage/LocalLibraryBackup';

export const SettingsPage: React.FC = () => {
  const { user, books, canUseFeature, isOpenBeta, showToast, reloadLocalBooks, maxLocalSlots, navigateTo } = useApp();
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
  const backupBusyRef = useRef(false);
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

  const openTelegramFeedback = () => {
    const message = [
      `Góp ý Lily Open Beta · 1.0.0`,
      `Hạng mục: ${feedbackCategory}`,
      '',
      feedbackContent.trim(),
    ].join('\n');
    const telegramUrl = `https://t.me/noooo4518?text=${encodeURIComponent(message)}`;
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
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
    if (backupBusyRef.current) return;
    backupBusyRef.current = true;
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
      backupBusyRef.current = false;
      setBackupBusy(false);
    }
  };

  const handleRestoreFile = async (file?: File) => {
    if (!file || backupBusyRef.current) return;
    backupBusyRef.current = true;
    try {
      setBackupBusy(true);
      const parsed = await LocalLibraryBackup.parseFile(file);
      setRestoreBackup(parsed);
      setRestorePreview(LocalLibraryBackup.preview(parsed));
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === 'BACKUP_TOO_LARGE';
      showToast(tooLarge ? 'File sao lưu quá lớn để xử lý an toàn.' : 'Không thể đọc bản sao lưu này.', 'error');
    } finally {
      backupBusyRef.current = false;
      setBackupBusy(false);
      if (restoreInputRef.current) restoreInputRef.current.value = '';
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreBackup || backupBusyRef.current) return;
    backupBusyRef.current = true;
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
      if (!result.shelvesRestored) showToast('Truyện và ghi chú đã khôi phục, nhưng chưa lưu được kệ sách. Hãy kiểm tra dung lượng thiết bị.', 'warning');
      if (result.skippedDuplicates || result.skippedForLimit) {
        showToast(`Đã bỏ qua ${result.skippedDuplicates} truyện trùng và ${result.skippedForLimit} truyện vượt giới hạn.`, 'info');
      }
    } catch {
      showToast('Khôi phục chưa hoàn tất; thư viện hiện tại không bị ghi đè.', 'error');
    } finally {
      backupBusyRef.current = false;
      setBackupBusy(false);
    }
  };

  const fontFamilies = [
    { id: 'Literata', label: 'Literata' },
    { id: 'Merriweather', label: 'Merriweather' },
    { id: 'Playfair Display', label: 'Playfair Display' },
    { id: 'Be Vietnam Pro', label: 'Be Vietnam Pro' },
    { id: 'Inter', label: 'Inter' },
  ];

  return (
    <div className="flat-page mx-auto max-w-3xl space-y-8 py-2 pb-16 sm:pb-20">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold text-ink-950 md:text-3xl">
              Cài đặt
            </h1>
            <PlanStatus tier={user.tier} size="sm" />
          </div>
          <p className="mt-1 text-xs text-ink-500">Trình đọc, giọng nói và dữ liệu.</p>
        </div>

        <button
          onClick={resetSettings}
          className="px-4 py-2 rounded-2xl border border-ink-200 hover:bg-cream-50 text-xs font-medium text-ink-700 flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại mặc định</span>
        </button>
      </div>

      <div className="rounded-lg bg-white px-4 py-3.5 ring-1 ring-ink-100 sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-bold text-base text-ink-950">Tài khoản Lilyhub</h2>
              <InfoTip>Đăng nhập bằng Lilyhub để hai ứng dụng nhận cùng tài khoản.</InfoTip>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-ink-500">
              {user.lilyHubConnected ? `${user.name}${user.email ? ` · ${user.email}` : ''}` : 'Chưa kết nối'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => user.lilyHubConnected ? window.location.assign('https://lilyhub.top') : navigateTo('login')}
            className="shrink-0 rounded-xl bg-ink-950 px-4 py-2.5 text-xs font-semibold text-white"
          >
            {user.lilyHubConnected ? 'Mở Lilyhub' : 'Đăng nhập'}
          </button>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase text-ink-500">Trình đọc</h2>
          <InfoTip>Đây là thiết lập mặc định. Bạn vẫn có thể đổi riêng khi đang đọc truyện.</InfoTip>
        </div>

        <div className="rounded-lg bg-white p-4 ring-1 ring-ink-100 sm:p-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-700">Phông chữ</span>
              <select
                value={settings.fontFamily}
                onChange={(event) => {
                  const font = event.target.value;
                  if (canUseFeature('advancedTypography') || font === 'Literata') updateSetting('fontFamily', font as any);
                }}
                className="h-9 w-full rounded-md border border-ink-200 bg-cream-50/50 px-3 text-xs font-medium text-ink-800"
              >
                {fontFamilies.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
              </select>
            </label>

            <div>
              <div className="mb-1.5 flex justify-between text-xs font-semibold text-ink-700">
                <span>Cỡ chữ</span>
                <span className="font-bold text-ink-900">{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min="14"
                max="32"
                value={settings.fontSize}
                onChange={(e) => updateSetting('fontSize', Number(e.target.value))}
                className="w-full cursor-pointer accent-lily-600"
              />
            </div>
          </div>

          <label className="mt-5 grid items-center gap-2 sm:grid-cols-[1fr_220px]">
            <span className="text-xs font-semibold text-ink-700">Độ rộng trang</span>
            <select
              value={settings.pageWidth}
              onChange={(e) => updateSetting('pageWidth', e.target.value as any)}
              className="h-9 w-full rounded-md border border-ink-200 bg-cream-50/50 px-3 text-xs font-medium text-ink-800"
            >
              <option value="narrow">Hẹp</option>
              <option value="normal">Chuẩn</option>
              <option value="wide">Rộng</option>
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase text-ink-500">Màu nền</h2>
          <InfoTip>Giúp giảm chói và phù hợp với từng môi trường đọc.</InfoTip>
        </div>

        <div className="grid grid-cols-6 gap-x-2 gap-y-3 rounded-lg bg-white p-4 ring-1 ring-ink-100 sm:grid-cols-12 sm:px-5">
          {mockThemes.map((t) => {
            const isSelected = settings.activeThemeId === t.id;
            return (
              <button
                key={t.id}
                title={t.name}
                aria-label={`Màu nền ${t.name}`}
                aria-pressed={isSelected}
                onClick={() => {
                  if (!t.isVipOnly || canUseFeature('premiumThemes')) {
                    updateSetting('activeThemeId', t.id);
                  }
                }}
                className="relative flex min-w-0 flex-col items-center gap-1.5 text-center"
              >
                <div 
                  className={`flex h-8 w-8 items-center justify-center rounded-full border font-serif text-[10px] font-bold sm:h-9 sm:w-9 ${isSelected ? 'ring-2 ring-lily-500 ring-offset-2' : ''}`}
                  style={{ color: t.previewText, backgroundColor: t.previewBg, borderColor: `${t.previewText}35` }}
                >
                  {isSelected ? <Check className="h-3.5 w-3.5" /> : 'Aa'}
                </div>
                <span className="block w-full truncate text-[9px] font-medium text-ink-600">
                  {t.name}
                </span>
                {t.isVipOnly && isOpenBeta && (
                  <span className="absolute -right-0.5 -top-1 text-[7px] font-bold text-lily-700">B</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase text-ink-500">Giọng Lily</h2>
            <InfoTip>Giọng đã tải được lưu trên thiết bị để nghe ngoại tuyến. Nội dung truyện không được gửi đi.</InfoTip>
          </div>
          <span className="text-xs font-mono font-medium text-ink-500">
            {voiceStorageMB} MB
          </span>
        </div>

        <div className="rounded-lg bg-white p-4 ring-1 ring-ink-100">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-800">Tiếng Việt</span>
              <span className="text-ink-500">Bộ sưu tập Lily</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-600">Ngoại tuyến</span>
              <span className="font-semibold text-emerald-700">Sẵn sàng</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {voiceStorageMB > 0 ? (
            <button
              onClick={handleClearVoiceStorage}
              className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa dữ liệu giọng đọc ({voiceStorageMB} MB)</span>
            </button>
          ) : (
            <span className="text-xs text-ink-400">Chưa tải thêm giọng.</span>
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
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase text-ink-500">Sao lưu</h2>
          <InfoTip>Bản sao lưu gồm truyện, chương, tiến độ, dấu trang, ghi chú và tủ sách. File có nội dung riêng tư, hãy giữ ở nơi an toàn.</InfoTip>
        </div>

        <input
          ref={restoreInputRef}
          type="file"
          accept=".lilybackup,.json,application/json"
          className="hidden"
          onChange={(event) => handleRestoreFile(event.target.files?.[0])}
        />
        <div className="flex flex-col gap-2.5 rounded-lg bg-white p-4 ring-1 ring-ink-100 sm:flex-row">
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
        <section className="rounded-md bg-lily-50/60 p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-lily-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-lily-800">Open Beta</span>
                <h2 className="font-serif text-base font-bold text-ink-950">Lily Open Beta</h2>
                <InfoTip align="right">Các tính năng nâng cao đang mở miễn phí. Truyện lưu trên thiết bị; nên sao lưu thư viện quan trọng.</InfoTip>
              </div>
              <p className="mt-1 text-xs text-ink-500">Phiên bản 1.0.0</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-stretch">
              <a
                href="https://t.me/noooo4518"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#229ED9] px-4 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-[#1889bd]"
              >
                <Send className="h-4 w-4" /> Liên hệ Telegram
              </a>
              <button
                onClick={() => setFeedbackOpen(true)}
                className="rounded-2xl border border-ink-200 bg-white px-4 py-2.5 text-xs font-semibold text-ink-800 hover:bg-cream-50"
              >
                Góp ý & Báo lỗi
              </button>
            </div>
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
            <p className="mt-3 text-xs leading-relaxed text-ink-500">Khi bạn bấm liên hệ, Telegram sẽ mở cuộc trò chuyện với @noooo4518 và điền sẵn nội dung trên. Lily không tự gửi truyện, ghi chú, đoạn đánh dấu hay lịch sử tìm kiếm.</p>
            <button disabled={!feedbackContent.trim()} onClick={openTelegramFeedback} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">
              <Send className="h-4 w-4" /> Liên hệ qua Telegram
            </button>
            <button disabled={!feedbackContent.trim()} onClick={downloadFeedback} className="mt-2 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-xs font-semibold text-ink-700 disabled:opacity-40">Lưu góp ý thành file</button>
          </section>
        </div>
      )}
    </div>
  );
};
