import { localeTag } from '../i18n';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { t } from '../i18n';
import { ColorThemes } from '../components/common/ColorThemes';
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
  Cloud
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useReader } from '../context/ReaderContext';
import { InfoTip } from '../components/common/InfoTip';
import { VoiceStorageManager } from '../audio-engine';
import { BackupPreview, LilyLibraryBackupV1, LocalLibraryBackup } from '../book-engine/storage/LocalLibraryBackup';
import { DriveBackupState, GoogleDriveBackupClient } from '../book-engine/drive-backup/GoogleDriveBackupClient';
import { UserAvatar } from '../components/common/UserAvatar';

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
  const [backupPickerOpen, setBackupPickerOpen] = useState(false);
  const [backupBookIds, setBackupBookIds] = useState<string[]>([]);
  const [storageUsageMB, setStorageUsageMB] = useState<number | null>(null);
  const [expiryReminder, setExpiryReminder] = useState(() => localStorage.getItem('LILY_NOTIFY_EXPIRY_V1') !== 'false');
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const canUseBackup = canUseFeature('backup');
  const driveConfigured = GoogleDriveBackupClient.isConfigured();
  const [driveState, setDriveState] = useState<DriveBackupState>(() => GoogleDriveBackupClient.getState());
  const [driveBusy, setDriveBusy] = useState(false);
  const refreshDriveState = () => setDriveState(GoogleDriveBackupClient.getState());

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
      showToast(t("Đã xóa dữ liệu giọng đọc đã tải (Thư viện truyện không bị ảnh hưởng)."), 'success');
    } catch {
      showToast(t("Không thể xóa dữ liệu giọng đọc."), 'error');
    }
  };

  const handleCreateBackup = async (shareAfterCreate = false) => {
    if (!canUseBackup) {
      openUpgradeModal(t("Sao lưu và khôi phục thư viện"));
      return;
    }
    if (backupBusyRef.current) return;
    backupBusyRef.current = true;
    try {
      setBackupBusy(true);
      const selected = backupBookIds.length ? backupBookIds : books.map(book => book.id);
      const backup = await LocalLibraryBackup.createForBooks(selected);
      const backupBlob = await LocalLibraryBackup.serializeCompressed(backup);
      const filename = `Lily-Goi-truyen-${backup.books.length}-${new Date().toISOString().slice(0, 10)}.lilybackup`;
      const backupFile = new File([backupBlob], filename, { type: backupBlob.type });
      const downloadBackup = () => {
        const url = URL.createObjectURL(backupFile);
        const link = document.createElement('a');
        link.href = url; link.download = filename;
        document.body.appendChild(link); link.click(); link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
      const canShareFile = shareAfterCreate && typeof navigator.share === 'function'
        && (!navigator.canShare || navigator.canShare({ files: [backupFile] }));
      if (canShareFile) {
        try {
          await navigator.share({ title: t("Gói {0} truyện Lily", [backup.books.length]), text: t("Mở file này bằng Lilyhub để thêm truyện vào thư viện."), files: [backupFile] });
          showToast(t("Đã mở nơi lưu/gửi gói {0} truyện.", [backup.books.length]), 'success');
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            showToast(t("Bạn đã đóng bảng lưu/gửi; bản sao lưu chưa được gửi."), 'info');
          } else {
            downloadBackup();
            showToast(t("Không mở được bảng chia sẻ; đã tải gói {0} truyện về máy.", [backup.books.length]), 'info');
          }
        }
      } else {
        downloadBackup();
        showToast(shareAfterCreate ? t("Thiết bị không hỗ trợ gửi file trực tiếp; đã tải gói {0} truyện về máy.", [backup.books.length]) : t("Đã nén và tải gói {0} truyện.", [backup.books.length]), 'success');
      }
      setBackupPickerOpen(false);
    } catch (error) {
      console.error('[Lily backup package]', error);
      const code = error instanceof Error ? error.message : '';
      showToast(code === 'NO_BOOK_SELECTED' ? t("Hãy chọn ít nhất một truyện để sao lưu.") : t("Chưa thể đóng gói dữ liệu truyện. Hãy kiểm tra dung lượng trống và thử lại."), 'error');
    } finally {
      backupBusyRef.current = false;
      setBackupBusy(false);
    }
  };

  const handleRestoreFile = async (file?: File) => {
    if (!canUseBackup) {
      openUpgradeModal(t("Sao lưu và khôi phục thư viện"));
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
          ? t("File sao lưu quá lớn để xử lý an toàn.")
          : code === 'UNSUPPORTED_BACKUP_COMPRESSION'
            ? t("Trình duyệt này chưa hỗ trợ đọc bản sao lưu nén. Hãy cập nhật trình duyệt.")
            : t("Không thể đọc bản sao lưu này."),
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
      openUpgradeModal(t("Sao lưu và khôi phục thư viện"));
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
        showToast(t("Đã khôi phục {0} truyện vào thư viện.", [result.restoredBooks]), 'success');
      } else {
        showToast(t("Không có truyện mới phù hợp để khôi phục."), 'info');
      }
      if (!result.shelvesRestored) showToast(t("Truyện và ghi chú đã khôi phục, nhưng chưa lưu được kệ sách. Hãy kiểm tra dung lượng thiết bị."), 'warning');
      if (result.skippedDuplicates || result.skippedForLimit) {
        showToast(t("Đã bỏ qua {0} truyện trùng và {1} truyện vượt giới hạn.", [result.skippedDuplicates, result.skippedForLimit]), 'info');
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      showToast(
        code === 'LILYHUB_AUTH_REQUIRED'
          ? t("Hãy đăng nhập LilyHub để khôi phục truyện LilyHub.")
          : code === 'LILYHUB_BOOK_UNAVAILABLE'
            ? t("Một truyện LilyHub không còn khả dụng cho tài khoản này.")
            : t("Khôi phục chưa hoàn tất; thư viện hiện tại không bị ghi đè."),
        'error',
      );
    } finally {
      backupBusyRef.current = false;
      setBackupBusy(false);
    }
  };

  const handleConnectDrive = async () => {
    if (!canUseBackup) { openUpgradeModal(t("Sao lưu và khôi phục thư viện")); return; }
    setDriveBusy(true);
    try {
      const email = await GoogleDriveBackupClient.connect();
      refreshDriveState();
      showToast(email ? t("Đã kết nối Google Drive ({0}).", [email]) : t("Đã kết nối Google Drive."), 'success');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      showToast(code === 'DRIVE_AUTH_CANCELLED' ? t("Bạn đã hủy kết nối Google Drive.") : t("Không thể kết nối Google Drive. Hãy thử lại."), 'error');
    } finally {
      setDriveBusy(false);
    }
  };

  const handleDisconnectDrive = async () => {
    setDriveBusy(true);
    try {
      await GoogleDriveBackupClient.disconnect();
      refreshDriveState();
      showToast(t("Đã ngắt kết nối Google Drive."), 'info');
    } finally {
      setDriveBusy(false);
    }
  };

  const handleToggleAutoBackup = (enabled: boolean) => {
    GoogleDriveBackupClient.setAutoEnabled(enabled);
    refreshDriveState();
  };

  const handleBackupToDriveNow = async () => {
    if (!canUseBackup) { openUpgradeModal(t("Sao lưu và khôi phục thư viện")); return; }
    if (backupBusyRef.current) return;
    backupBusyRef.current = true;
    setBackupBusy(true);
    try {
      const backup = await LocalLibraryBackup.create();
      const blob = await LocalLibraryBackup.serializeCompressed(backup);
      await GoogleDriveBackupClient.backupNow(blob, { interactive: true });
      refreshDriveState();
      showToast(t("Đã sao lưu {0} truyện lên Google Drive.", [backup.books.length]), 'success');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      refreshDriveState();
      showToast(code === 'DRIVE_REAUTH_REQUIRED' ? t("Cần kết nối lại Google Drive.") : t("Chưa thể sao lưu lên Drive. Hãy thử lại."), 'error');
    } finally {
      backupBusyRef.current = false;
      setBackupBusy(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!canUseBackup) { openUpgradeModal(t("Sao lưu và khôi phục thư viện")); return; }
    if (backupBusyRef.current) return;
    backupBusyRef.current = true;
    setBackupBusy(true);
    try {
      const blob = await GoogleDriveBackupClient.restoreLatest();
      const file = new File([blob], 'drive-backup.lilybackup', { type: blob.type });
      const parsed = await LocalLibraryBackup.parseFile(file);
      setRestoreBackup(parsed);
      setRestorePreview(LocalLibraryBackup.preview(parsed));
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      showToast(
        code === 'DRIVE_BACKUP_NOT_FOUND' ? t("Chưa có bản sao lưu nào trên Google Drive.")
          : code === 'DRIVE_REAUTH_REQUIRED' ? t("Cần kết nối lại Google Drive.")
            : t("Không tải được bản sao lưu từ Drive."),
        'error',
      );
    } finally {
      backupBusyRef.current = false;
      setBackupBusy(false);
    }
  };

  return (
    <div className="flat-page lily-settings settings-compact mx-auto max-w-3xl py-2 pb-16 sm:pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold text-ink-950 md:text-3xl">
              {t("Cài đặt")}</h1>
          </div>
          <p className="mt-1 text-xs text-ink-500">{t("Giao diện, âm thanh, dữ liệu và thông báo.")}</p>
        </div>
        <button type="button" onClick={() => navigateTo('account')} className="group flex shrink-0 items-center gap-2.5 rounded-full border border-ink-200 bg-white py-1.5 pl-1.5 pr-3 text-left shadow-soft transition-colors hover:border-lily-300" aria-label={t("Mở tài khoản và gói")}>
          <UserAvatar src={user.avatarUrl || user.avatar} className="h-10 w-10 ring-2 ring-white" />
          <span className="hidden min-w-0 sm:block"><strong className="block max-w-32 truncate text-xs text-ink-900">{user.lilyHubConnected ? user.name : t("Tài khoản")}</strong><span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-lily-700">{user.tier === 'free' ? t("Free · Xem gói") : `${user.tier === 'vip1' ? 'MY50' : 'MY100'}${user.vipDaysRemaining == null ? '' : t(" · {0} ngày", [user.vipDaysRemaining])}`}</span></span>
          <span className="sm:hidden text-xs font-medium text-ink-700">{t("Tài khoản")}</span>
        </button>
      </div>

      <section className="settings-section settings-notification">
        <h2>{t("Thông báo")}</h2>
        <div className="settings-group"><SettingToggle icon={<Bell />} label={t("Nhắc khi gói sắp hết hạn")} description={t("Nhắc trong ứng dụng trước 7 ngày.")} checked={expiryReminder} onChange={value => { setExpiryReminder(value); localStorage.setItem('LILY_NOTIFY_EXPIRY_V1', String(value)); }} /></div>
      </section>

      <section className="settings-section"><div><h2>{t("Ngôn ngữ")}</h2></div><LanguageSwitcher /></section>

      <section className="settings-section settings-theme"><h2>Theme</h2><ColorThemes /></section>

      <section className="settings-section"><h2>{t("Dữ liệu & dung lượng")}</h2><div className="settings-group">
        <div className="settings-menu-row"><span><Database size={17}/>{t("Thư viện")}</span><small>{books.length} / {user.isOwner ? '∞' : maxLocalSlots} {t(" truyện")}</small></div>
        <div className="settings-menu-row"><span><Volume2 size={17}/>{t("Sách nói")}</span><small>{voiceStorageMB} MB</small></div>
        {voiceStorageMB > 0 && <button className="settings-menu-row settings-delete" onClick={handleClearVoiceStorage}><span><Trash2 size={17}/>{t("Xóa giọng đã tải")}</span><ChevronRight size={15}/></button>}
        <div className="settings-menu-row"><span>{t("Dung lượng ứng dụng")}</span><small>{storageUsageMB === null ? t("Đang tính…") : `${storageUsageMB} MB`}</small></div>
      </div></section>

      <section className="settings-section space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase text-ink-500">{t("Sao lưu")}</h2>
          <InfoTip>{t("Truyện cá nhân được sao lưu cùng nội dung. Truyện LilyHub chỉ lưu tham chiếu và dữ liệu đọc; khi khôi phục phải đăng nhập để tải lại nội dung.")}</InfoTip>
        </div>

        <div className="settings-group settings-backup-group">
        <input
          ref={restoreInputRef}
          type="file"
          accept=".lilybackup,.json,application/json,application/gzip,application/x-gzip"
          className="hidden"
          onChange={(event) => handleRestoreFile(event.target.files?.[0])}
        />
        {!canUseBackup ? (
          <button type="button" onClick={() => openUpgradeModal(t("Sao lưu và khôi phục thư viện"))} className="flex w-full items-center justify-between gap-3 rounded-lg bg-white p-4 text-left ring-1 ring-ink-100 hover:bg-lily-50/40">
            <span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F6E8EF] text-[#7A3158]"><Lock className="h-4 w-4" /></span><span><strong className="block text-sm text-ink-900">{t("Sao lưu dành cho VIP")}</strong><span className="mt-0.5 block text-[11px] text-ink-500">{t("Bảo vệ và chuyển thư viện sang thiết bị mới")}</span></span></span>
            <span className="text-xs font-semibold text-lily-700">{t("Nâng cấp")}</span>
          </button>
        ) : <div className="settings-backup-actions">
          <button
            type="button"
            disabled={backupBusy || books.length === 0}
            onClick={() => { setBackupBookIds(books.map(book => book.id)); setBackupPickerOpen(true); }}
            className="settings-menu-row disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> {t(" Chọn truyện để sao lưu")}</button>
          <button
            type="button"
            disabled={backupBusy}
            onClick={() => restoreInputRef.current?.click()}
            className="settings-menu-row disabled:opacity-40"
          >
            <Upload className="w-4 h-4" /> {t(" Chọn file khôi phục")}</button>
        </div>}

        {canUseBackup && driveConfigured && (
          <div className="space-y-3 rounded-lg bg-white p-4 ring-1 ring-ink-100">
            <div className="flex items-center gap-2">
              <span className="google-drive-badge flex h-8 w-8 shrink-0 items-center justify-center rounded-full"><Cloud className="h-4 w-4" /></span>
              <h3 className="text-xs font-bold text-ink-800">{t("Tự động sao lưu Google Drive")}</h3>
              <InfoTip>{t("Lily chỉ tạo và ghi vào đúng 1 file sao lưu trong thư mục riêng trên Drive của bạn, không đọc các file khác.")}</InfoTip>
            </div>
            {!driveState.connected ? (
              <button
                type="button"
                disabled={driveBusy}
                onClick={handleConnectDrive}
                className="google-drive-btn px-4 py-2.5 rounded-xl disabled:opacity-40 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Cloud className="w-4 h-4" /> {t(" Kết nối Google Drive")}</button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs text-ink-600">
                  <span>{driveState.email ? t("Đã kết nối: {0}", [driveState.email]) : t("Đã kết nối Google Drive")}</span>
                  <button type="button" disabled={driveBusy} onClick={handleDisconnectDrive} className="text-[11px] font-semibold text-rose-600 disabled:opacity-40">{t("Ngắt kết nối")}</button>
                </div>
                <p className="text-[11px] text-ink-400">
                  {driveState.lastBackupAt ? t("Sao lưu gần nhất: {0}", [new Date(driveState.lastBackupAt).toLocaleString(localeTag())]) : t("Chưa có bản sao lưu nào trên Drive.")}
                </p>
                {driveState.lastError && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
                    {driveState.lastError === 'DRIVE_REAUTH_REQUIRED'
                      ? t("Tự động sao lưu gần nhất không thành công vì phiên Google đã hết hạn. Hãy bấm \"Sao lưu ngay lên Drive\" để kết nối lại và ghi đè bản cũ.")
                      : t("Tự động sao lưu gần nhất không thành công. Hãy bấm \"Sao lưu ngay lên Drive\" để thử lại — file cũ trên Drive sẽ được ghi đè.")}
                  </p>
                )}
                <SettingToggle
                  label={t("Tự động sao lưu")}
                  description={t("Tự sao lưu khi thư viện thay đổi (tối đa 1 lần/giờ).")}
                  checked={driveState.autoEnabled}
                  onChange={handleToggleAutoBackup}
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={backupBusy || books.length === 0}
                    onClick={handleBackupToDriveNow}
                    className="settings-menu-row disabled:opacity-40"
                  >
                    <Upload className="w-4 h-4" /> {t(" Sao lưu ngay lên Drive")}</button>
                  <button
                    type="button"
                    disabled={backupBusy}
                    onClick={handleRestoreFromDrive}
                    className="settings-menu-row disabled:opacity-40"
                  >
                    <Download className="w-4 h-4" /> {t(" Khôi phục từ Drive")}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {backupPickerOpen && canUseBackup && <div className="rounded-2xl border border-lily-200 bg-lily-50/40 p-4 space-y-3"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-ink-950">{t("Tạo gói truyện để lưu hoặc gửi")}</h3><p className="mt-1 text-xs leading-5 text-ink-500">{t("Người nhận nhập file này sẽ được thêm truyện mới; thư viện hiện tại không bị ghi đè.")}</p></div><button type="button" disabled={backupBusy} onClick={() => setBackupPickerOpen(false)} className="text-xs font-semibold text-ink-500">{t("Đóng")}</button></div><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-ink-700">{t("Đã chọn ")}{backupBookIds.length}/{books.length}</span><button type="button" disabled={backupBusy} onClick={() => setBackupBookIds(backupBookIds.length === books.length ? [] : books.map(book => book.id))} className="text-xs font-semibold text-lily-800">{backupBookIds.length === books.length ? t("Bỏ chọn tất cả") : t("Chọn tất cả")}</button></div><div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-ink-100 bg-white p-2">{books.map(book => <label key={book.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs hover:bg-ink-50"><input type="checkbox" checked={backupBookIds.includes(book.id)} disabled={backupBusy} onChange={event => setBackupBookIds(ids => event.target.checked ? [...ids, book.id] : ids.filter(id => id !== book.id))} className="h-4 w-4 accent-lily-700" /><span className="min-w-0 flex-1 truncate font-medium text-ink-800">{book.title}</span><span className="shrink-0 text-[10px] text-ink-400">{book.totalChapters} {t(" chương")}</span></label>)}</div><div className="grid gap-2 sm:grid-cols-2"><button type="button" disabled={backupBusy || !backupBookIds.length} onClick={() => void handleCreateBackup(false)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 text-xs font-semibold text-white disabled:opacity-40"><Download className="h-4 w-4" />{t("Tải file về máy")}</button><button type="button" disabled={backupBusy || !backupBookIds.length} onClick={() => void handleCreateBackup(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-lily-200 bg-white px-4 text-xs font-semibold text-lily-900 disabled:opacity-40"><Send className="h-4 w-4" />{t("Chia sẻ file")}</button></div></div>}

        {restorePreview && restoreBackup && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-ink-950">{t("Bản sao lưu")}</h3>
              <p className="text-xs text-ink-500">{t("Tạo ngày ")}{new Date(restorePreview.createdAt).toLocaleString(localeTag())}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-ink-700">
              <span><strong>{restorePreview.bookCount}</strong> {t(" truyện")}</span>
              <span><strong>{restorePreview.chapterCount}</strong> {t(" chương")}</span>
              <span><strong>{restorePreview.bookmarkCount}</strong> {t(" dấu trang")}</span>
              <span><strong>{restorePreview.annotationCount}</strong> {t(" đoạn đánh dấu")}</span>
              <span><strong>{restorePreview.noteCount}</strong> {t(" ghi chú")}</span>
            </div>
            {restorePreview.protectedLilyHubCount > 0 && <p className="text-xs text-lily-700"><strong>{restorePreview.protectedLilyHubCount}</strong> {t(" truyện LilyHub được bảo vệ và sẽ tải lại sau khi xác thực.")}</p>}
            <p className="text-xs text-ink-600">{t("Khôi phục theo chế độ thêm an toàn. Lily không ghi đè thư viện hiện tại và chỉ thêm tối đa ")}{Math.max(0, maxLocalSlots - books.length)} {t(" truyện.")}</p>
            <div className="flex gap-2">
              <button disabled={backupBusy} onClick={handleConfirmRestore} className="rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50">{t("Khôi phục thư viện")}</button>
              <button disabled={backupBusy} onClick={() => { setRestoreBackup(null); setRestorePreview(null); }} className="rounded-xl border border-ink-200 px-3.5 py-2 text-xs font-semibold text-ink-700">{t("Hủy")}</button>
            </div>
          </div>
        )}
      </div>
      </section>

      <section className="settings-section"><h2>{t("Thông tin & hỗ trợ")}</h2><div className="settings-group">
        <button className="settings-menu-row" onClick={() => navigateTo('about')}><span>{t("Về chúng tôi")}</span><ChevronRight size={15}/></button>
        <a className="settings-menu-row" href="mailto:yen.n@lilyhub.top"><span>yen.n@lilyhub.top</span><ChevronRight size={15}/></a>
        <button className="settings-menu-row" onClick={() => navigateTo('legal')}><span>{t("Pháp lý & quyền riêng tư")}</span><ChevronRight size={15}/></button>
        <a className="settings-menu-row" href="https://t.me/+Y8M62X2kWBIxODg9" target="_blank" rel="noopener noreferrer"><span>{t("Nhóm trao đổi")}</span><ChevronRight size={15}/></a>
        <a className="settings-menu-row" href="https://t.me/noooo4518" target="_blank" rel="noopener noreferrer"><span>{t("Liên hệ hỗ trợ")}</span><ChevronRight size={15}/></a>
      </div></section>
    </div>
  );
};

const SettingToggle: React.FC<{ icon?: React.ReactElement; label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ icon, label, description, checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="flex min-w-0 items-start gap-2.5">{icon && <span className="mt-0.5 text-lily-700 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}<span><strong className="block text-xs font-semibold text-ink-800">{t(label)}</strong>{description && <span className="mt-0.5 block text-[11px] text-ink-500">{description}</span>}</span></div>
    <button type="button" role="switch" aria-label={t(label)} aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-lily-700' : 'bg-ink-200'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'left-6' : 'left-1'}`} /></button>
  </div>
);

const StorageStat: React.FC<{ icon: React.ReactElement; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lily-50 text-lily-700 [&>svg]:h-4 [&>svg]:w-4">{icon}</span><span><span className="block text-[11px] text-ink-500">{t(label)}</span><strong className="mt-0.5 block text-xs text-ink-900">{value}</strong></span></div>
);
