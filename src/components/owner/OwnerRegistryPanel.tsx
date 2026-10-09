import { localeTag } from '../../i18n';
import { t } from '../../i18n';
import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { CheckSquare, Eye, ListChecks, LoaderCircle, Search, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LocalLibraryBackup } from '../../book-engine/storage/LocalLibraryBackup';
import { OwnerLibraryClient } from '../../book-engine/owner-library/OwnerLibraryClient';
import { OwnerRegistryClient, RegistryEntry } from '../../book-engine/owner-library/OwnerRegistryClient';
import { findRegistryMatch, normalizeSearch, pickMatchingCandidate, registryId } from '../../book-engine/owner-library/registry-dedupe';
import { WebsiteImporter } from '../../book-engine/website-importer/WebsiteImporter';
import { safeFetch } from '../../book-engine/website-importer/safe-fetch';
import { searchWattpadStories, WattpadSearchResult } from '../../book-engine/website-importer/wattpad-search';
import type { CandidateBook, WebsiteAnalysisResult } from '../../book-engine/website-importer/types';
import { BookImporter } from '../../book-engine/importers';
import type { ParsedBookDraft } from '../../book-engine/types';

const platformFor = (adapterName: string): RegistryEntry['platform'] =>
  adapterName === 'wattpad' ? 'wattpad' : adapterName === 'blogspot' ? 'blogspot' : 'wordpress';

const completionLabel = (completion: string) =>
  completion === 'completed' ? t("Đã hoàn thành") : completion === 'ongoing' ? t("Đang ra") : t("Chưa rõ");
const completionColor = (completion: string) =>
  completion === 'completed' ? 'text-emerald-700 bg-emerald-50' : completion === 'ongoing' ? 'text-amber-700 bg-amber-50' : 'text-ink-500 bg-ink-100';

class DuplicateBookError extends Error {}

async function isAlreadyInCloud(title: string, author: string): Promise<boolean> {
  const page = await OwnerLibraryClient.list(1, title);
  const key = `${normalizeSearch(title)}::${normalizeSearch(author)}`;
  return page.books.some(book => `${normalizeSearch(book.title)}::${normalizeSearch(book.author)}` === key);
}

export const OwnerRegistryPanel: React.FC = () => {
  const { addParsedBook, localBookSource, showToast } = useApp();

  // WordPress / Blogspot: analyze a URL, let the user pick which found
  // stories to add — no auto-guessing of completion status anymore.
  const [siteUrl, setSiteUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<WebsiteAnalysisResult | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [addingToCloud, setAddingToCloud] = useState(false);

  // Wattpad: keyword search with paging, multi-select, background batch download.
  const [keyword, setKeyword] = useState('');
  const [wattpadResults, setWattpadResults] = useState<WattpadSearchResult[]>([]);
  const [wattpadPage, setWattpadPage] = useState(0);
  const [searchingWattpad, setSearchingWattpad] = useState(false);
  const [selectedWattpad, setSelectedWattpad] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number; current: string } | null>(null);

  const [watching, setWatching] = useState<RegistryEntry[]>([]);
  const [watchingLoaded, setWatchingLoaded] = useState(false);
  const [busy, setBusy] = useState('');

  const refreshWatching = useCallback(async () => {
    try { setWatching((await OwnerRegistryClient.list()).filter(entry => entry.status === 'watching')); setWatchingLoaded(true); }
    catch (error) { console.error('[Lily story bot registry]', error); }
  }, []);

  useEffect(() => { void refreshWatching(); }, [refreshWatching]);

  // A Google Drive folder candidate is a single downloadable EPUB/TXT/DOCX
  // file, not a page with chapter links — mirrors parseRemoteCandidate in
  // WebsiteImportFlow.tsx (fetch the file, parse it like a local upload).
  const parseRemoteCandidate = async (candidate: CandidateBook): Promise<ParsedBookDraft> => {
    if (!candidate.remoteFile) throw new Error('BULK_SOURCE_NOT_FILE');
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 45_000);
      try {
        const response = await safeFetch(candidate.remoteFile.url, { credentials: 'omit', signal: controller.signal });
        if (!response.ok) throw new Error(t("Không tải được tệp từ Google Drive."));
        const declaredSize = Number(response.headers.get('content-length') || 0);
        if (declaredSize > 100 * 1024 * 1024) throw new Error(t("Tệp vượt quá 100 MB."));
        const blob = await response.blob();
        if (blob.size > 100 * 1024 * 1024) throw new Error(t("Tệp vượt quá 100 MB."));
        return await BookImporter.parse(new File([blob], candidate.remoteFile.name, { type: blob.type }));
      } catch (error) {
        lastError = error;
        if (attempt < 2) await new Promise(resolve => window.setTimeout(resolve, 900 * (attempt + 1)));
      } finally {
        window.clearTimeout(timeoutId);
      }
    }
    throw lastError;
  };

  // Mirrors the owner bulk-import pipeline in WebsiteImportFlow.tsx: analyze
  // (or download+parse for a remoteFile candidate) → save to IndexedDB as
  // short-lived staging → backup → gzip → upload → delete the local copy.
  // Never left on the device.
  const uploadCandidateToCloud = async (candidate: CandidateBook): Promise<string> => {
    let draft: ParsedBookDraft;
    if (candidate.remoteFile) {
      draft = await parseRemoteCandidate(candidate);
    } else {
      const result = await WebsiteImporter.fetchAndBuildDraft(candidate, { concurrency: 4 });
      if (result.isCancelled) throw new Error(t("Đã hủy khi đang tải chương."));
      if (result.failedChapters.length > 0) throw new Error(t("Còn {0} chương tải lỗi — không lưu truyện thiếu chương.", [result.failedChapters.length]));
      draft = result.draft;
    }

    // Dedupe on the REAL title/author, not the candidate's pre-fetch guess —
    // a Google Drive folder listing's display name can differ from the
    // title actually embedded in the EPUB's own metadata, so checking before
    // this point let a book already in the Cloud slip through unnoticed.
    const finalTitle = draft.title || candidate.title;
    const finalAuthor = draft.author || candidate.author;
    if (await isAlreadyInCloud(finalTitle, finalAuthor)) throw new DuplicateBookError(t("\"{0}\" đã có trong Cloud.", [finalTitle]));

    const saved = await addParsedBook(draft, {
      title: finalTitle,
      author: finalAuthor,
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

  // --- WordPress / Blogspot: analyze → pick → add ---

  const analyzeSite = async (event: FormEvent) => {
    event.preventDefault();
    const url = siteUrl.trim();
    if (!url) return;
    setAnalyzing(true);
    setAnalysis(null);
    setSelectedCandidates(new Set());
    try {
      const result = await WebsiteImporter.analyze(url);
      if (!result.candidateBooks.length) throw new Error(t("Không tìm thấy truyện nào tại URL này."));
      setAnalysis(result);
    } catch (error) {
      console.error('[Lily story bot analyze]', error);
      showToast(error instanceof Error ? error.message : t("Chưa thể phân tích trang này."), 'error');
    } finally { setAnalyzing(false); }
  };

  const toggleCandidate = (id: string) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addSelectedToCloud = async () => {
    if (!analysis || !selectedCandidates.size) return;
    setAddingToCloud(true);
    let added = 0;
    let skipped = 0;
    let failed = 0;
    try {
      for (const candidate of analysis.candidateBooks) {
        if (!selectedCandidates.has(candidate.id)) continue;
        try {
          await uploadCandidateToCloud(candidate);
          added += 1;
        } catch (error) {
          if (error instanceof DuplicateBookError) { skipped += 1; continue; }
          console.error('[Lily story bot add-to-cloud]', candidate.title, error);
          failed += 1;
        }
      }
      showToast(t("Đã thêm {0} truyện vào Cloud{1}{2}.", [added, skipped ? t(", bỏ qua {0} truyện trùng", [skipped]) : '', failed ? t(", {0} lỗi", [failed]) : '']), failed ? 'error' : 'success');
      setAnalysis(null);
      setSiteUrl('');
      setSelectedCandidates(new Set());
    } finally { setAddingToCloud(false); }
  };

  // --- Wattpad: search (paged) → multi-select → background batch download ---

  const searchWattpad = async (event?: FormEvent, loadMore = false) => {
    event?.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setSearchingWattpad(true);
    try {
      const nextPage = loadMore ? wattpadPage + 1 : 1;
      const results = await searchWattpadStories(trimmed, nextPage);
      setWattpadResults(prev => {
        const base = loadMore ? prev : [];
        const seen = new Set(base.map(item => item.id));
        return [...base, ...results.filter(item => !seen.has(item.id))];
      });
      setWattpadPage(nextPage);
      if (!loadMore) setSelectedWattpad(new Set());
    } catch (error) {
      console.error('[Lily story bot wattpad search]', error);
      showToast(error instanceof Error ? error.message : t("Chưa thể tìm trên Wattpad."), 'error');
    } finally { setSearchingWattpad(false); }
  };

  const toggleWattpad = (id: string) => {
    setSelectedWattpad(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const downloadSelectedWattpad = async () => {
    const selected = wattpadResults.filter(result => selectedWattpad.has(result.id));
    if (!selected.length) return;
    let entries = await OwnerRegistryClient.list();
    let done = 0;
    let fetchedCount = 0;
    let watchingCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    setDownloadProgress({ done: 0, total: selected.length, current: selected[0].title });

    for (const result of selected) {
      setDownloadProgress({ done, total: selected.length, current: result.title });
      try {
        const alreadyWatching = findRegistryMatch(entries, { sourceUrl: result.sourceUrl, title: result.title, author: result.author });
        if (alreadyWatching || await isAlreadyInCloud(result.title, result.author)) { skippedCount += 1; done += 1; continue; }

        const analyzed = await WebsiteImporter.analyze(result.sourceUrl);
        const candidate = analyzed.candidateBooks[0];
        if (!candidate) { failedCount += 1; done += 1; continue; }

        const completion = candidate.completion || 'unknown';
        const id = await registryId(candidate.sourceUrl, candidate.title);
        const nowIso = new Date().toISOString();

        if (completion === 'completed') {
          const cloudId = await uploadCandidateToCloud(candidate);
          const entry: RegistryEntry = {
            id, title: candidate.title, author: candidate.author, sourceUrl: candidate.sourceUrl,
            platform: 'wattpad', status: 'fetched', completion, chapterCount: candidate.totalChapters,
            bookId: cloudId, addedAt: nowIso, lastCheckedAt: nowIso, discoveredVia: 'wattpad-search', searchKeyword: keyword.trim(),
          };
          await OwnerRegistryClient.put(id, entry);
          entries = [...entries, entry];
          fetchedCount += 1;
        } else {
          const entry: RegistryEntry = {
            id, title: candidate.title, author: candidate.author, sourceUrl: candidate.sourceUrl,
            platform: 'wattpad', status: 'watching', completion, chapterCount: candidate.totalChapters,
            addedAt: nowIso, lastCheckedAt: nowIso, discoveredVia: 'wattpad-search', searchKeyword: keyword.trim(),
          };
          await OwnerRegistryClient.put(id, entry);
          entries = [...entries, entry];
          watchingCount += 1;
        }
      } catch (error) {
        if (error instanceof DuplicateBookError) { skippedCount += 1; }
        else { console.error('[Lily story bot wattpad download]', result.title, error); failedCount += 1; }
      }
      done += 1;
      setDownloadProgress({ done, total: selected.length, current: result.title });
      // A courtesy gap between Wattpad requests in the same batch.
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    setDownloadProgress(null);
    setSelectedWattpad(new Set());
    setWattpadResults(prev => prev.filter(item => !selected.some(s => s.id === item.id)));
    showToast(
      t("{0} đã hoàn thành (đã vào Cloud), {1} đang theo dõi{2}{3}.", [fetchedCount, watchingCount, skippedCount ? t(", {0} trùng bỏ qua", [skippedCount]) : '', failedCount ? t(", {0} lỗi", [failedCount]) : '']),
      failedCount ? 'error' : 'success',
    );
    await refreshWatching();
  };

  // --- Watching list (Wattpad only from here on): recheck / dismiss ---

  const recheck = async (entry: RegistryEntry) => {
    setBusy(`recheck:${entry.id}`);
    try {
      const result = await WebsiteImporter.analyze(entry.sourceUrl);
      const candidate = pickMatchingCandidate(result.candidateBooks, entry);
      if (!candidate) { showToast(t("Không phân tích được nguồn này lần này."), 'error'); return; }
      const completion = candidate.completion || 'unknown';

      if (completion === 'completed') {
        const cloudId = await uploadCandidateToCloud(candidate);
        await OwnerRegistryClient.put(entry.id, { ...entry, status: 'fetched', completion, chapterCount: candidate.totalChapters, bookId: cloudId });
        showToast(t("\"{0}\" đã hoàn thành — đã tải vào Cloud.", [entry.title]), 'success');
      } else {
        await OwnerRegistryClient.put(entry.id, { ...entry, completion, chapterCount: candidate.totalChapters });
        showToast(t("\"{0}\" vẫn {1} ({2} chương).", [entry.title, completion === 'ongoing' ? t('đang ra') : t('chưa rõ'), candidate.totalChapters]), 'info');
      }
      await refreshWatching();
    } catch (error) {
      console.error('[Lily story bot recheck]', error);
      showToast(error instanceof Error ? error.message : t("Chưa thể kiểm tra lại nguồn này."), 'error');
    } finally { setBusy(''); }
  };

  const dismiss = async (entry: RegistryEntry) => {
    if (!window.confirm(t("Bỏ theo dõi \"{0}\"?", [entry.title]))) return;
    setBusy(`dismiss:${entry.id}`);
    try { await OwnerRegistryClient.remove(entry.id); await refreshWatching(); showToast(t("Đã bỏ khỏi danh sách theo dõi."), 'success'); }
    catch { showToast(t("Chưa thể bỏ theo dõi nguồn này."), 'error'); }
    finally { setBusy(''); }
  };

  return <div className="space-y-4">
    {/* WordPress / Blogspot */}
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <div className="flex items-center gap-2 text-ink-900"><ListChecks className="h-4 w-4 text-lily-700" /><h3 className="text-xs font-bold">{t("Nhập truyện từ WordPress / Blogspot")}</h3></div>
      <p className="mt-1 text-[11px] leading-5 text-ink-500">{t("Dán link blog → xem danh sách truyện tìm được → tự chọn truyện muốn thêm → tự lọc trùng rồi đưa thẳng vào Cloud.")}</p>

      <form onSubmit={analyzeSite} className="mt-3 flex gap-2">
        <input value={siteUrl} onChange={event => setSiteUrl(event.target.value)} placeholder={t("Dán link WordPress / Blogspot...")} className="h-10 min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 text-xs outline-none focus:border-lily-400" />
        <button disabled={!siteUrl.trim() || analyzing} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-ink-950 px-3 text-[11px] font-semibold text-white disabled:opacity-40">{analyzing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}{t("Phân tích")}</button>
      </form>

      {analysis && <div className="mt-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-ink-700">{t("Tìm thấy ")}{analysis.candidateBooks.length} {t(" truyện — đã chọn ")}{selectedCandidates.size}</p>
          <button type="button" onClick={() => setSelectedCandidates(selectedCandidates.size === analysis.candidateBooks.length ? new Set() : new Set(analysis.candidateBooks.map(c => c.id)))} className="text-[11px] font-semibold text-lily-800">
            {selectedCandidates.size === analysis.candidateBooks.length ? t("Bỏ chọn tất cả") : t("Chọn tất cả")}
          </button>
        </div>
        <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-ink-100 p-2">
          {analysis.candidateBooks.map(candidate => <label key={candidate.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs hover:bg-ink-50">
            <input type="checkbox" checked={selectedCandidates.has(candidate.id)} onChange={() => toggleCandidate(candidate.id)} className="h-4 w-4 shrink-0 accent-lily-700" />
            <span className="min-w-0 flex-1 truncate">{candidate.title}</span>
            <span className="shrink-0 text-[10px] text-ink-400">{candidate.remoteFile ? candidate.remoteFile.format : t("{0} chương", [candidate.totalChapters])}</span>
            {!candidate.remoteFile && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${completionColor(candidate.completion || 'unknown')}`}>{completionLabel(candidate.completion || 'unknown')}</span>}
          </label>)}
        </div>
        <button type="button" onClick={() => void addSelectedToCloud()} disabled={!selectedCandidates.size || addingToCloud} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink-950 text-xs font-semibold text-white disabled:opacity-40">
          {addingToCloud ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}{t("Thêm ")}{selectedCandidates.size || ''} {t(" truyện vào Cloud")}</button>
      </div>}
    </div>

    {/* Wattpad */}
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <div className="flex items-center gap-2 text-ink-900"><Search className="h-4 w-4 text-lily-700" /><h3 className="text-xs font-bold">{t("Tìm truyện trên Wattpad")}</h3></div>
      <p className="mt-1 text-[11px] leading-5 text-ink-500">{t("Tìm theo từ khóa, chọn nhiều truyện, bot tự tải dần — truyện đã hoàn thành vào thẳng Cloud, truyện đang ra được theo dõi tự động.")}</p>

      <form onSubmit={event => void searchWattpad(event, false)} className="mt-3 flex gap-2">
        <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder={t("Từ khóa (vd: bách hợp edit)...")} className="h-10 min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 text-xs outline-none focus:border-lily-400" />
        <button disabled={!keyword.trim() || searchingWattpad} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-ink-950 px-3 text-[11px] font-semibold text-white disabled:opacity-40">{searchingWattpad ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}{t("Tìm")}</button>
      </form>

      {wattpadResults.length > 0 && <div className="mt-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-ink-700">{wattpadResults.length} {t(" kết quả — đã chọn ")}{selectedWattpad.size}</p>
          <button type="button" onClick={() => setSelectedWattpad(selectedWattpad.size === wattpadResults.length ? new Set() : new Set(wattpadResults.map(r => r.id)))} className="text-[11px] font-semibold text-lily-800">
            {selectedWattpad.size === wattpadResults.length ? t("Bỏ chọn tất cả") : t("Chọn tất cả")}
          </button>
        </div>
        <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-ink-100 p-2">
          {wattpadResults.map(result => <label key={result.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs hover:bg-ink-50">
            <input type="checkbox" checked={selectedWattpad.has(result.id)} onChange={() => toggleWattpad(result.id)} className="h-4 w-4 shrink-0 accent-lily-700" />
            <span className="min-w-0 flex-1 truncate">{result.title}</span>
            <span className="shrink-0 text-[10px] text-ink-400">{result.totalChapters} {t(" chương")}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${completionColor(result.completion)}`}>{completionLabel(result.completion)}</span>
          </label>)}
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => void searchWattpad(undefined, true)} disabled={searchingWattpad} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-200 text-[11px] font-semibold text-ink-700 disabled:opacity-40">{searchingWattpad ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}{t("Tìm thêm")}</button>
          <button type="button" onClick={() => void downloadSelectedWattpad()} disabled={!selectedWattpad.size || Boolean(downloadProgress)} className="inline-flex h-10 flex-[2] items-center justify-center gap-1.5 rounded-lg bg-ink-950 text-[11px] font-semibold text-white disabled:opacity-40">
            {downloadProgress ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CheckSquare className="h-3.5 w-3.5" />}
            {downloadProgress ? t("Đang tải {0}/{1}: {2}", [downloadProgress.done, downloadProgress.total, downloadProgress.current]) : t("Tải {0} truyện đã chọn", [selectedWattpad.size || ''])}
          </button>
        </div>
      </div>}
    </div>

    {/* Watching (Wattpad, not yet completed) */}
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <h4 className="text-[11px] font-bold uppercase text-ink-500">{t("Đang theo dõi (chưa hoàn thành) (")}{watching.length})</h4>
      {!watchingLoaded ? <div className="mt-3 flex justify-center py-4"><LoaderCircle className="h-4 w-4 animate-spin text-lily-700" /></div> :
        watching.length ? <div className="mt-2 space-y-2">{watching.map(entry => <div key={entry.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-100 p-2.5">
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-ink-900">{entry.title}</p><p className="mt-0.5 truncate text-[10px] text-ink-500">{entry.author} · {entry.chapterCount} {t(" chương · kiểm tra lần cuối ")}{new Date(entry.lastCheckedAt).toLocaleString(localeTag())}</p></div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${completionColor(entry.completion)}`}>{completionLabel(entry.completion)}</span>
          <button type="button" onClick={() => void recheck(entry)} disabled={Boolean(busy)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-ink-200 px-2.5 text-[10px] font-semibold text-ink-700 disabled:opacity-40">{busy === `recheck:${entry.id}` ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}{t("Kiểm tra lại")}</button>
          <button type="button" onClick={() => void dismiss(entry)} disabled={Boolean(busy)} className="shrink-0 rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40" aria-label={t("Bỏ theo dõi")}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>)}</div> : <p className="mt-2 rounded-lg bg-ink-50 px-3 py-3 text-center text-[11px] text-ink-500">{t("Chưa có truyện Wattpad nào đang theo dõi.")}</p>}
    </div>
  </div>;
};
