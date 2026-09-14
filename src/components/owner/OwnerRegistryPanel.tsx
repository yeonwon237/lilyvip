import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Eye, ListChecks, LoaderCircle, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LocalLibraryBackup } from '../../book-engine/storage/LocalLibraryBackup';
import { OwnerLibraryClient } from '../../book-engine/owner-library/OwnerLibraryClient';
import { OwnerRegistryClient, RegistryEntry } from '../../book-engine/owner-library/OwnerRegistryClient';
import { findRegistryMatch, registryId } from '../../book-engine/owner-library/registry-dedupe';
import { WebsiteImporter } from '../../book-engine/website-importer/WebsiteImporter';
import { searchWattpadStories } from '../../book-engine/website-importer/wattpad-search';
import type { CandidateBook } from '../../book-engine/website-importer/types';

const platformFor = (adapterName: string): RegistryEntry['platform'] =>
  adapterName === 'wattpad' ? 'wattpad' : adapterName === 'blogspot' ? 'blogspot' : 'wordpress';

const completionLabel = (completion: RegistryEntry['completion']) =>
  completion === 'completed' ? 'Đã hoàn thành' : completion === 'ongoing' ? 'Đang ra' : 'Chưa rõ trạng thái';
const completionColor = (completion: RegistryEntry['completion']) =>
  completion === 'completed' ? 'text-emerald-700 bg-emerald-50' : completion === 'ongoing' ? 'text-amber-700 bg-amber-50' : 'text-ink-500 bg-ink-100';

export const OwnerRegistryPanel: React.FC = () => {
  const { addParsedBook, localBookSource, showToast } = useApp();
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState('');
  const [urlDraft, setUrlDraft] = useState('');
  const [keywordDraft, setKeywordDraft] = useState('');

  const refresh = useCallback(async () => {
    setBusy('refresh');
    try { setEntries(await OwnerRegistryClient.list()); setLoaded(true); }
    catch (error) { console.error('[Lily story bot registry]', error); showToast('Chưa thể đọc danh sách theo dõi.', 'error'); }
    finally { setBusy(''); }
  }, [showToast]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Only ever called once a candidate is confirmed completed — mirrors the
  // owner bulk-import pipeline in WebsiteImportFlow.tsx (analyze → save to
  // IndexedDB as short-lived staging → backup → gzip → upload → delete local).
  const uploadCandidateToCloud = async (candidate: CandidateBook): Promise<string> => {
    const { draft, failedChapters, isCancelled } = await WebsiteImporter.fetchAndBuildDraft(candidate, { concurrency: 4 });
    if (isCancelled) throw new Error('Đã hủy khi đang tải chương.');
    if (failedChapters.length > 0) throw new Error(`Còn ${failedChapters.length} chương tải lỗi — không lưu truyện thiếu chương.`);

    const saved = await addParsedBook(draft, {
      title: draft.title || candidate.title,
      author: draft.author || candidate.author,
      coverColor: draft.suggestedCoverColor || '#D9829B',
      coverUrl: draft.coverUrl,
      source: {
        type: 'website', adapter: candidate.adapterName, url: candidate.sourceUrl,
        hostname: candidate.hostname, importedAt: new Date().toISOString(),
      },
    });
    const cloudId = await OwnerLibraryClient.cloudId(saved.id);
    const backup = await LocalLibraryBackup.createForBook(saved.id);
    const compressed = await LocalLibraryBackup.serializeCompressed(backup);
    await OwnerLibraryClient.upload(cloudId, compressed, saved.title, saved.author, draft.coverUrl, draft.suggestedCoverColor);
    await localBookSource.deleteBook(saved.id);
    return cloudId;
  };

  const addSource = async (event: FormEvent) => {
    event.preventDefault();
    const url = urlDraft.trim();
    if (!url) return;
    setBusy('add');
    try {
      const result = await WebsiteImporter.analyze(url);
      const candidate = result.candidateBooks[0];
      if (!candidate) throw new Error('Không tìm thấy truyện nào tại URL này.');

      const existing = findRegistryMatch(entries, { sourceUrl: candidate.sourceUrl, title: candidate.title, author: candidate.author });
      if (existing) {
        const statusLabel = existing.status === 'fetched' ? 'đã tải' : existing.status === 'watching' ? 'đang theo dõi' : 'chờ duyệt';
        showToast(`Đã có trong danh sách (${statusLabel}): "${existing.title}".`, 'info');
        return;
      }

      const id = await registryId(candidate.sourceUrl);
      const platform = platformFor(candidate.adapterName);
      const completion = candidate.completion || 'unknown';
      const base = {
        title: candidate.title, author: candidate.author, sourceUrl: candidate.sourceUrl,
        platform, completion, chapterCount: candidate.totalChapters, addedAt: new Date().toISOString(),
      };

      if (completion === 'completed') {
        const cloudId = await uploadCandidateToCloud(candidate);
        await OwnerRegistryClient.put(id, { ...base, status: 'fetched', bookId: cloudId });
        showToast(`Đã hoàn thành — đã tải "${candidate.title}" vào Cloud.`, 'success');
      } else {
        await OwnerRegistryClient.put(id, { ...base, status: 'watching' });
        showToast(`Đã thêm vào danh sách theo dõi (${completion === 'ongoing' ? 'đang ra' : 'chưa rõ trạng thái'}).`, 'success');
      }
      setUrlDraft('');
      await refresh();
    } catch (error) {
      console.error('[Lily story bot add]', error);
      showToast(error instanceof Error ? error.message : 'Chưa thể thêm nguồn này.', 'error');
    } finally { setBusy(''); }
  };

  const discover = async (event: FormEvent) => {
    event.preventDefault();
    const keyword = keywordDraft.trim();
    if (!keyword) return;
    setBusy('discover');
    try {
      const results = await searchWattpadStories(keyword);
      const nextEntries = [...entries];
      let added = 0;
      for (const result of results) {
        const existing = findRegistryMatch(nextEntries, { sourceUrl: result.sourceUrl, title: result.title, author: result.author });
        if (existing) continue;
        const id = await registryId(result.sourceUrl);
        const nowIso = new Date().toISOString();
        const entry: RegistryEntry = {
          id, title: result.title, author: result.author, sourceUrl: result.sourceUrl,
          platform: 'wattpad', status: 'pending', completion: result.completion, chapterCount: result.totalChapters,
          addedAt: nowIso, lastCheckedAt: nowIso, discoveredVia: 'wattpad-search', searchKeyword: keyword,
        };
        await OwnerRegistryClient.put(id, entry);
        nextEntries.push(entry);
        added += 1;
      }
      showToast(`Tìm thấy ${results.length} truyện trên Wattpad — thêm mới ${added} vào danh sách chờ duyệt.`, 'success');
      setKeywordDraft('');
      await refresh();
    } catch (error) {
      console.error('[Lily story bot discover]', error);
      showToast(error instanceof Error ? error.message : 'Chưa thể tìm truyện trên Wattpad.', 'error');
    } finally { setBusy(''); }
  };

  const approve = async (entry: RegistryEntry) => {
    setBusy(`approve:${entry.id}`);
    try {
      const result = await WebsiteImporter.analyze(entry.sourceUrl);
      const candidate = result.candidateBooks[0];
      if (!candidate) throw new Error('Không phân tích lại được nguồn này.');
      const completion = candidate.completion || entry.completion;

      if (completion === 'completed') {
        const cloudId = await uploadCandidateToCloud(candidate);
        await OwnerRegistryClient.put(entry.id, { ...entry, status: 'fetched', completion, chapterCount: candidate.totalChapters, bookId: cloudId });
        showToast(`Đã duyệt và tải "${entry.title}" vào Cloud.`, 'success');
      } else {
        await OwnerRegistryClient.put(entry.id, { ...entry, status: 'watching', completion, chapterCount: candidate.totalChapters });
        showToast(`Đã duyệt, chuyển "${entry.title}" sang theo dõi.`, 'success');
      }
      await refresh();
    } catch (error) {
      console.error('[Lily story bot approve]', error);
      showToast(error instanceof Error ? error.message : 'Chưa thể duyệt nguồn này.', 'error');
    } finally { setBusy(''); }
  };

  const recheck = async (entry: RegistryEntry) => {
    setBusy(`recheck:${entry.id}`);
    try {
      const result = await WebsiteImporter.analyze(entry.sourceUrl);
      const candidate = result.candidateBooks[0];
      if (!candidate) { showToast('Không phân tích được nguồn này lần này.', 'error'); return; }
      const completion = candidate.completion || 'unknown';

      if (completion === 'completed') {
        const cloudId = await uploadCandidateToCloud(candidate);
        await OwnerRegistryClient.put(entry.id, { ...entry, status: 'fetched', completion, chapterCount: candidate.totalChapters, bookId: cloudId });
        showToast(`"${entry.title}" đã hoàn thành — đã tải vào Cloud.`, 'success');
      } else {
        await OwnerRegistryClient.put(entry.id, { ...entry, completion, chapterCount: candidate.totalChapters });
        showToast(`"${entry.title}" vẫn ${completion === 'ongoing' ? 'đang ra' : 'chưa rõ'} (${candidate.totalChapters} chương).`, 'info');
      }
      await refresh();
    } catch (error) {
      console.error('[Lily story bot recheck]', error);
      showToast(error instanceof Error ? error.message : 'Chưa thể kiểm tra lại nguồn này.', 'error');
    } finally { setBusy(''); }
  };

  const dismiss = async (entry: RegistryEntry) => {
    if (!window.confirm(`Bỏ "${entry.title}" khỏi danh sách?`)) return;
    setBusy(`dismiss:${entry.id}`);
    try { await OwnerRegistryClient.remove(entry.id); await refresh(); showToast('Đã bỏ khỏi danh sách.', 'success'); }
    catch { showToast('Chưa thể bỏ nguồn này.', 'error'); }
    finally { setBusy(''); }
  };

  const pending = entries.filter(entry => entry.status === 'pending');
  const watching = entries.filter(entry => entry.status === 'watching');

  return <div className="rounded-xl border border-ink-100 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-ink-900"><ListChecks className="h-4 w-4 text-lily-700" /><h3 className="text-xs font-bold">Bot theo dõi truyện</h3></div>
      <button type="button" onClick={() => void refresh()} disabled={Boolean(busy)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 text-[11px] font-semibold text-ink-700 disabled:opacity-40"><RefreshCw className={`h-3.5 w-3.5 ${busy === 'refresh' ? 'animate-spin' : ''}`} />Làm mới</button>
    </div>
    <p className="mt-1 text-[11px] leading-5 text-ink-500">Chỉ tải vào Cloud khi truyện đã hoàn thành — truyện đang ra chỉ được theo dõi, không tự tải.</p>

    <form onSubmit={addSource} className="mt-3 flex gap-2">
      <input value={urlDraft} onChange={event => setUrlDraft(event.target.value)} placeholder="Dán link Wattpad / WordPress / Blogspot..." className="h-10 min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 text-xs outline-none focus:border-lily-400" />
      <button disabled={!urlDraft.trim() || Boolean(busy)} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-ink-950 px-3 text-[11px] font-semibold text-white disabled:opacity-40">{busy === 'add' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Thêm nguồn</button>
    </form>

    <form onSubmit={discover} className="mt-2 flex gap-2">
      <label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" /><input value={keywordDraft} onChange={event => setKeywordDraft(event.target.value)} placeholder="Tìm truyện Wattpad theo từ khóa (vd: bách hợp edit)..." className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-lily-400" /></label>
      <button disabled={!keywordDraft.trim() || Boolean(busy)} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-lily-200 bg-lily-50 px-3 text-[11px] font-semibold text-lily-900 disabled:opacity-40">{busy === 'discover' ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}Tìm trên Wattpad</button>
    </form>

    {!loaded ? <div className="mt-4 flex justify-center py-6"><LoaderCircle className="h-5 w-5 animate-spin text-lily-700" /></div> : <>
      <div className="mt-4">
        <h4 className="text-[11px] font-bold uppercase text-ink-500">Chờ duyệt ({pending.length})</h4>
        {pending.length ? <div className="mt-2 space-y-2">{pending.map(entry => <div key={entry.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-100 p-2.5">
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-ink-900">{entry.title}</p><p className="mt-0.5 truncate text-[10px] text-ink-500">{entry.author} · {entry.chapterCount} chương · <a href={entry.sourceUrl} target="_blank" rel="noreferrer" className="underline">xem nguồn</a></p></div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${completionColor(entry.completion)}`}>{completionLabel(entry.completion)}</span>
          <button type="button" onClick={() => void approve(entry)} disabled={Boolean(busy)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-ink-950 px-2.5 text-[10px] font-semibold text-white disabled:opacity-40">{busy === `approve:${entry.id}` ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Duyệt</button>
          <button type="button" onClick={() => void dismiss(entry)} disabled={Boolean(busy)} className="shrink-0 rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40" aria-label="Bỏ khỏi danh sách"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>)}</div> : <p className="mt-2 rounded-lg bg-ink-50 px-3 py-3 text-center text-[11px] text-ink-500">Chưa có kết quả nào chờ duyệt.</p>}
      </div>

      <div className="mt-4">
        <h4 className="text-[11px] font-bold uppercase text-ink-500">Đang theo dõi ({watching.length})</h4>
        {watching.length ? <div className="mt-2 space-y-2">{watching.map(entry => <div key={entry.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-100 p-2.5">
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-ink-900">{entry.title}</p><p className="mt-0.5 truncate text-[10px] text-ink-500">{entry.author} · {entry.chapterCount} chương · kiểm tra lần cuối {new Date(entry.lastCheckedAt).toLocaleString('vi-VN')}</p></div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${completionColor(entry.completion)}`}>{completionLabel(entry.completion)}</span>
          <button type="button" onClick={() => void recheck(entry)} disabled={Boolean(busy)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-ink-200 px-2.5 text-[10px] font-semibold text-ink-700 disabled:opacity-40">{busy === `recheck:${entry.id}` ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}Kiểm tra lại</button>
          <button type="button" onClick={() => void dismiss(entry)} disabled={Boolean(busy)} className="shrink-0 rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40" aria-label="Bỏ khỏi danh sách"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>)}</div> : <p className="mt-2 rounded-lg bg-ink-50 px-3 py-3 text-center text-[11px] text-ink-500">Chưa có nguồn nào đang theo dõi.</p>}
      </div>
    </>}
  </div>;
};
