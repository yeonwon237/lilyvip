import React, { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ModelCode, ModelCodeAdmin } from '../../translation-engine/ModelLicense';

const STATUS_LABEL: Record<ModelCode['status'], string> = { active: 'Chưa dùng', used: 'Đã kích hoạt', revoked: 'Đã thu hồi' };

/** Owner cloud: one-time codes that unlock a private translation model on one device. */
export const OwnerModelCodesPanel: React.FC = () => {
  const { showToast } = useApp();
  const [codes, setCodes] = useState<ModelCode[]>([]);
  const [models, setModels] = useState<Record<string, string>>({});
  const [model, setModel] = useState('');
  const [note, setNote] = useState('');
  const [created, setCreated] = useState<{ code: string; modelLabel: string } | null>(null);
  const [busy, setBusy] = useState('');

  const refresh = useCallback(async () => {
    setBusy('refresh');
    try {
      const result = await ModelCodeAdmin.list();
      setCodes(result.codes);
      setModels(result.models);
      setModel(current => current || Object.keys(result.models)[0] || '');
    } catch (error: any) {
      showToast(error?.message || 'Chưa tải được danh sách mã model.', 'error');
    } finally { setBusy(''); }
  }, [showToast]);

  useEffect(() => { void refresh(); }, [refresh]);

  const create = async () => {
    if (!model) return;
    setBusy('create');
    try {
      setCreated(await ModelCodeAdmin.create(model, note.trim()));
      setNote('');
      await refresh();
    } catch (error: any) {
      showToast(error?.message || 'Chưa tạo được mã.', 'error');
    } finally { setBusy(''); }
  };

  const revoke = async (item: ModelCode) => {
    setBusy(`revoke:${item.id}`);
    try { await ModelCodeAdmin.revoke(item.id); await refresh(); showToast('Đã thu hồi mã model.', 'success'); }
    catch (error: any) { showToast(error?.message || 'Chưa thu hồi được.', 'error'); }
    finally { setBusy(''); }
  };

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); showToast('Đã sao chép mã model.', 'success'); }
    catch { showToast('Hãy nhấn giữ vào mã để sao chép thủ công.', 'info'); }
  };

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-bold text-ink-900"><KeyRound className="h-4 w-4 text-lily-700" />Mã model dịch</h3>
          <p className="mt-1 text-[11px] text-ink-500">Mỗi mã dùng một lần, gắn vĩnh viễn với một máy và một tài khoản. Máy admin tự có đủ model.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={Boolean(busy)} className="shrink-0 text-[11px] font-semibold text-lily-800 disabled:opacity-40">
          <RefreshCw className={`inline h-3.5 w-3.5 ${busy === 'refresh' ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select value={model} onChange={event => setModel(event.target.value)} className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-xs text-ink-900">
          {Object.entries(models).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <input value={note} onChange={event => setNote(event.target.value)} maxLength={120} placeholder="Ghi chú: cấp cho ai (không bắt buộc)" className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-xs text-ink-900 outline-none focus:border-lily-400" />
        <button type="button" onClick={() => void create()} disabled={!model || Boolean(busy)} className="h-10 rounded-lg bg-ink-950 px-4 text-xs font-semibold text-white disabled:opacity-40">
          {busy === 'create' ? 'Đang tạo…' : 'Tạo mã'}
        </button>
      </div>

      {created && (
        <div className="mt-3 rounded-lg bg-emerald-50 p-3">
          <p className="text-[11px] text-emerald-900">Mã {created.modelLabel} (chỉ hiện một lần, hãy gửi cho người dùng):</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 select-all break-all rounded-lg bg-white px-3 py-2 text-center text-sm font-bold tracking-wider text-emerald-950">{created.code}</code>
            <button type="button" onClick={() => void copy(created.code)} className="flex h-9 shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-[11px] font-semibold text-white"><Copy className="h-3.5 w-3.5" />Sao chép</button>
          </div>
        </div>
      )}

      {codes.length ? (
        <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
          {codes.map(item => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-ink-800">{item.modelLabel}{item.note ? ` · ${item.note}` : ''}</p>
                <p className="mt-0.5 text-[10px] text-ink-400">
                  {STATUS_LABEL[item.status]}
                  {item.status === 'used' && ` · ${item.accountName || 'tài khoản'} · ${item.deviceLabel || 'thiết bị'} · ${item.activatedAt ? new Date(item.activatedAt).toLocaleString('vi-VN') : ''}`}
                  {item.status === 'active' && ` · tạo ${new Date(item.createdAt).toLocaleString('vi-VN')}`}
                </p>
              </div>
              {item.status !== 'revoked' && (
                <button type="button" onClick={() => void revoke(item)} disabled={busy === `revoke:${item.id}`} className="shrink-0 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40">Thu hồi</button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-ink-50 px-3 py-4 text-center text-[11px] text-ink-500">Chưa có mã model.</p>
      )}
    </div>
  );
};
