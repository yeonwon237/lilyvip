import React, { useState, useEffect, useRef } from 'react';
import {
  Trash2,
  Download,
  Upload,
  MessageSquare,
  Send,
  ChevronRight,
  Lock,
  Sun,
  Moon,
  Monitor,
  Volume2,
  Database,
  Bell,
  UserRound
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useReader } from '../context/ReaderContext';
import { PlanStatus } from '../components/common/PlanStatus';
import { InfoTip } from '../components/common/InfoTip';
import { VoiceStorageManager } from '../audio-engine';
import { BackupPreview, LilyLibraryBackupV1, LocalLibraryBackup } from '../book-engine/storage/LocalLibraryBackup';

export const SettingsPage: React.FC = () => {
  const { user, books, canUseFeature, showToast, reloadLocalBooks, maxLocalSlots, libraryLimits, navigateTo, openUpgradeModal, appTheme, setAppTheme } = useApp();
  const {
    availableVoices,
    audioState,
    setAudioVoice,
    setAudioSpeed,
    setAudioAutoNext,
    setAudioReadTitle
  } = useReader();

  const [voiceStorageMB, setVoiceStorageMB] = useState<number>(0);
  const [backupBusy, setBackupBusy] = useState(false);
  const backupBusyRef = useRef(false);
  const [restoreBackup, setRestoreBackup] = useState<LilyLibraryBackupV1 | null>(null);
  const [restorePreview, setRestorePreview] = useState<BackupPreview | null>(null);
  const [storageUsageMB, setStorageUsageMB] = useState<number | null>(null);
  const [expiryReminder, setExpiryReminder] = useState(() => localStorage.getItem('LILY_NOTIFY_EXPIRY_V1') !== 'false');
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const canUseBackup = canUseFeature('backup');

  const loadStorage = async () => {
    try {
      const size = await VoiceStorageManager.getTotalVoiceStorageMB();
      setVoiceStorageMB(size);
      const estimate = await navigator.storage?.estimate?.();
      setStorageUsageMB(estimate?.usage ? Math.round(estimate.usage / 1024 / 1024 * 10) / 10 : null);
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
    if (!canUseBackup) {
      openUpgradeModal('Sao lưu và khôi phục thư viện');
      return;
    }
    if (backupBusyRef.current) return;
    backupBusyRef.current = true;
    try {
      setBackupBusy(true);
      const backup = await LocalLibraryBackup.create();
      const backupFile = await LocalLibraryBackup.serializeCompressed(backup);
      const url = URL.createObjectURL(backupFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Lily-Sao-luu-${new Date().toISOString().slice(0, 10)}.lilybackup`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`Đã nén và sao lưu ${backup.books.length} truyện.`, 'success');
    } catch {
      showToast('Chưa thể tạo bản sao lưu. Hãy thử lại.', 'error');
    } finally {
      backupBusyRef.current = false;
      setBackupBusy(false);
    }
  };

  const handleRestoreFile = async (file?: File) => {
    if (!canUseBackup) {
      openUpgradeModal('Sao lưu và khôi phục thư viện');
      return;
    }
    if (!file || backupBusyRef.current) return;
    backupBusyRef.current = true;
    try {
      setBackupBusy(true);
      const parsed = await LocalLibraryBackup.parseFile(file);
      setRestoreBackup(parsed);
      setRestorePreview(LocalLibraryBackup.preview(parsed));
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      showToast(
        code === 'BACKUP_TOO_LARGE'
          ? 'File sao lưu quá lớn để xử lý an toàn.'
          : code === 'UNSUPPORTED_BACKUP_COMPRESSION'
            ? 'Trình duyệt này chưa hỗ trợ đọc bản sao lưu nén. Hãy cập nhật trình duyệt.'
            : 'Không thể đọc bản sao lưu này.',
        'error',
      );
    } finally {
      backupBusyRef.current = false;
      setBackupBusy(false);
      if (restoreInputRef.current) restoreInputRef.current.value = '';
    }
  };

  const handleConfirmRestore = async () => {
    if (!canUseBackup) {
      openUpgradeModal('Sao lưu và khôi phục thư viện');
      return;
    }
    if (!restoreBackup || backupBusyRef.current) return;
    backupBusyRef.current = true;
    try {
      setBackupBusy(true);
      const result = await LocalLibraryBackup.restore(restoreBackup, libraryLimits);
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
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      showToast(
        code === 'LILYHUB_AUTH_REQUIRED'
          ? 'Hãy đăng nhập LilyHub để khôi phục truyện LilyHub.'
          : code === 'LILYHUB_BOOK_UNAVAILABLE'
            ? 'Một truyện LilyHub không còn khả dụng cho tài khoản này.'
            : 'Khôi phục chưa hoàn tất; thư viện hiện tại không bị ghi đè.',
        'error',
      );
    } finally {
      backupBusyRef.current = false;
      setBackupBusy(false);
    }
  };

  return (
    <div className="flat-page mx-auto max-w-3xl space-y-8 py-2 pb-16 sm:pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold text-ink-950 md:text-3xl">
              Cài đặt
            </h1>
          </div>
          <p className="mt-1 text-xs text-ink-500">Giao diện, âm thanh, dữ liệu và thông báo.</p>
        </div>
        <button type="button" onClick={() => navigateTo('account')} className="group flex shrink-0 items-center gap-2.5 rounded-full border border-ink-200 bg-white py-1.5 pl-1.5 pr-3 text-left shadow-soft transition-colors hover:border-lily-300" aria-label="Mở tài khoản và gói">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lily-700 text-sm font-bold text-white ring-2 ring-white">
            {user.avatarUrl || user.avatar ? <img src={user.avatarUrl || user.avatar} alt="" className="h-full w-full object-cover" /> : user.lilyHubConnected ? user.name.trim().charAt(0).toUpperCase() : <UserRound className="h-5 w-5" />}
          </span>
          <span className="hidden min-w-0 sm:block"><strong className="block max-w-32 truncate text-xs text-ink-900">{user.lilyHubConnected ? user.name : 'Tài khoản'}</strong><span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-lily-700">{user.tier === 'free' ? 'Free · Xem gói' : `${user.tier === 'vip1' ? 'MY30' : 'MY100'}${user.vipDaysRemaining == null ? '' : ` · ${user.vipDaysRemaining} ngày`}`}</span></span>
          <span className="sm:hidden"><PlanStatus tier={user.tier} vipDays={user.vipDaysRemaining} size="sm" /></span>
        </button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase text-ink-500">Giao diện ứng dụng</h2>
          <InfoTip>Áp dụng cho thư viện và các màn hình ứng dụng. Giao diện từng cuốn sách được chỉnh riêng trong trang đọc.</InfoTip>
        </div>
        <div className="rounded-lg bg-white p-1.5 ring-1 ring-ink-100">
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setAppTheme('light')}
              className={`flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold transition-colors ${
                appTheme === 'light' ? 'bg-lily-50 text-lily-900' : 'text-ink-600 hover:bg-cream-50'
              }`}
            >
              <Sun className="h-4 w-4" />
              <span>Sáng</span>
            </button>
            <button
              type="button"
              onClick={() => setAppTheme('dark')}
              className={`flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold transition-colors ${
                appTheme === 'dark' ? 'bg-lily-50 text-lily-900' : 'text-ink-600 hover:bg-cream-50'
              }`}
            >
              <Moon className="h-4 w-4" />
              <span>Tối</span>
            </button>
            <button
              type="button"
              onClick={() => setAppTheme('system')}
              className={`flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold transition-colors ${
                appTheme === 'system' ? 'bg-lily-50 text-lily-900' : 'text-ink-600 hover:bg-cream-50'
              }`}
            >
              <Monitor className="h-4 w-4" />
              <span>Theo máy</span>
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2"><h2 className="text-xs font-bold uppercase text-ink-500">Âm thanh mặc định</h2><InfoTip>Áp dụng khi bạn bắt đầu nghe. Bạn vẫn có thể thay đổi ngay trong trình phát.</InfoTip></div>
        <div className="space-y-4 rounded-lg bg-white p-4 ring-1 ring-ink-100 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-ink-700"><span className="mb-2 flex items-center gap-2"><Volume2 className="h-4 w-4 text-lily-700" />Giọng đọc</span><select value={audioState.voice} onChange={event => void setAudioVoice(event.target.value)} className="w-full rounded-lg border border-ink-200 bg-cream-50 px-3 py-2.5 text-xs text-ink-800">{availableVoices.map(voice => <option key={voice.id} value={voice.id}>{voice.name}</option>)}</select></label>
            <div><p className="text-xs font-semibold text-ink-700">Tốc độ đọc</p><div className="mt-2 grid grid-cols-4 gap-1">{[0.8, 1, 1.2, 1.5].map(rate => <button key={rate} type="button" onClick={() => setAudioSpeed(rate)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${Math.abs(audioState.playbackRate - rate) < 0.01 ? 'border-lily-400 bg-lily-50 text-lily-900' : 'border-ink-200 text-ink-600'}`}>{rate}×</button>)}</div></div>
          </div>
          <div className="divide-y divide-ink-100 border-y border-ink-100">
            <SettingToggle label="Tự chuyển sang chương tiếp theo" checked={audioState.autoNextChapter} onChange={setAudioAutoNext} />
            <SettingToggle label="Đọc tên chương trước nội dung" checked={audioState.readChapterTitle} onChange={setAudioReadTitle} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2"><h2 className="text-xs font-bold uppercase text-ink-500">Dữ liệu & dung lượng</h2><InfoTip>Dữ liệu nằm trên thiết bị này và không tự tải lên Cloud.</InfoTip></div>
        <div className="grid gap-3 rounded-lg bg-white p-4 ring-1 ring-ink-100 sm:grid-cols-3 sm:p-5">
          <StorageStat icon={<Database />} label="Thư viện" value={`${books.length} / ${maxLocalSlots} truyện`} />
          <StorageStat icon={<Volume2 />} label="Giọng Lily" value={`${voiceStorageMB} MB`} />
          <StorageStat icon={<Database />} label="Ứng dụng đã dùng" value={storageUsageMB === null ? 'Đang tính…' : `${storageUsageMB} MB`} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2"><h2 className="text-xs font-bold uppercase text-ink-500">Thông báo</h2><InfoTip>Lily chỉ hiển thị lời nhắc bên trong ứng dụng, không gửi thông báo hệ thống.</InfoTip></div>
        <div className="rounded-lg bg-white px-4 ring-1 ring-ink-100 sm:px-5"><SettingToggle icon={<Bell />} label="Nhắc khi gói sắp hết hạn" description="Hiển thị trước khi gói còn 7 ngày." checked={expiryReminder} onChange={value => { setExpiryReminder(value); localStorage.setItem('LILY_NOTIFY_EXPIRY_V1', String(value)); }} /></div>
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
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase text-ink-500">Sao lưu</h2>
          <InfoTip>Truyện cá nhân được sao lưu cùng nội dung. Truyện LilyHub chỉ lưu tham chiếu và dữ liệu đọc; khi khôi phục phải đăng nhập để tải lại nội dung.</InfoTip>
        </div>

        <input
          ref={restoreInputRef}
          type="file"
          accept=".lilybackup,.json,application/json,application/gzip,application/x-gzip"
          className="hidden"
          onChange={(event) => handleRestoreFile(event.target.files?.[0])}
        />
        {!canUseBackup ? (
          <button type="button" onClick={() => openUpgradeModal('Sao lưu và khôi phục thư viện')} className="flex w-full items-center justify-between gap-3 rounded-lg bg-white p-4 text-left ring-1 ring-ink-100 hover:bg-lily-50/40">
            <span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F6E8EF] text-[#7A3158]"><Lock className="h-4 w-4" /></span><span><strong className="block text-sm text-ink-900">Sao lưu dành cho VIP</strong><span className="mt-0.5 block text-[11px] text-ink-500">Bảo vệ và chuyển thư viện sang thiết bị mới</span></span></span>
            <span className="text-xs font-semibold text-lily-700">Nâng cấp</span>
          </button>
        ) : <div className="flex flex-col gap-2.5 rounded-lg bg-white p-4 ring-1 ring-ink-100 sm:flex-row">
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
        </div>}

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
            {restorePreview.protectedLilyHubCount > 0 && <p className="text-xs text-lily-700"><strong>{restorePreview.protectedLilyHubCount}</strong> truyện LilyHub được bảo vệ và sẽ tải lại sau khi xác thực.</p>}
            <p className="text-xs text-ink-600">Khôi phục theo chế độ thêm an toàn. Lily không ghi đè thư viện hiện tại và chỉ thêm tối đa {Math.max(0, maxLocalSlots - books.length)} truyện.</p>
            <div className="flex gap-2">
              <button disabled={backupBusy} onClick={handleConfirmRestore} className="rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50">Khôi phục thư viện</button>
              <button disabled={backupBusy} onClick={() => { setRestoreBackup(null); setRestorePreview(null); }} className="rounded-xl border border-ink-200 px-3.5 py-2 text-xs font-semibold text-ink-700">Hủy</button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase text-ink-500">Thông tin</h2>
        <div className="divide-y divide-ink-100 overflow-hidden rounded-lg bg-white ring-1 ring-ink-100">
          <button type="button" onClick={() => navigateTo('landing')} className="flex w-full items-center justify-between px-4 py-3.5 text-left sm:px-5"><span><strong className="block font-serif text-sm text-ink-950">Giới thiệu Lily Reader</strong><span className="mt-0.5 block text-[11px] text-ink-500">Tính năng, cách hoạt động và bảng giá</span></span><ChevronRight className="h-4 w-4 text-ink-400" /></button>
          <button type="button" onClick={() => navigateTo('legal')} className="flex w-full items-center justify-between px-4 py-3.5 text-left sm:px-5"><span><strong className="block font-serif text-sm text-ink-950">Pháp lý & quyền riêng tư</strong><span className="mt-0.5 block text-[11px] text-ink-500">Điều khoản, dữ liệu, gói dịch vụ và hỗ trợ</span></span><ChevronRight className="h-4 w-4 text-ink-400" /></button>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 ring-1 ring-ink-100 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-base font-bold text-ink-950">Hỗ trợ</h2>
              <InfoTip align="right">Cần giúp đỡ hoặc muốn góp ý cho Lily? Liên hệ trực tiếp qua Telegram.</InfoTip>
            </div>
            <p className="mt-1 text-xs text-ink-500">Phiên bản 1.0.0</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-stretch">
            <a
              href="https://t.me/+Y8M62X2kWBIxODg9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#229ED9]/30 bg-white px-4 py-2.5 text-xs font-semibold text-[#167DA8] hover:bg-sky-50"
            >
              <MessageSquare className="h-4 w-4" /> Vào nhóm trao đổi
            </a>
            <a
              href="https://t.me/noooo4518"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#229ED9] px-4 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-[#1889bd]"
            >
              <Send className="h-4 w-4" /> Liên hệ Telegram
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

const SettingToggle: React.FC<{ icon?: React.ReactElement; label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ icon, label, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="flex min-w-0 items-start gap-2.5">{icon && <span className="mt-0.5 text-lily-700 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}<span><strong className="block text-xs font-semibold text-ink-800">{label}</strong>{description && <span className="mt-0.5 block text-[11px] text-ink-500">{description}</span>}</span></div>
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-lily-700' : 'bg-ink-200'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'left-6' : 'left-1'}`} /></button>
  </div>
);

const StorageStat: React.FC<{ icon: React.ReactElement; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lily-50 text-lily-700 [&>svg]:h-4 [&>svg]:w-4">{icon}</span><span><span className="block text-[11px] text-ink-500">{label}</span><strong className="mt-0.5 block text-xs text-ink-900">{value}</strong></span></div>
);
