import React, { useState, useRef, useEffect } from 'react';
import { 
  Globe, 
  Search, 
  Loader2, 
  ArrowLeft, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  Check, 
  Sparkles, 
  ListOrdered,
  RefreshCw,
  ChevronRight,
  Link2,
  CloudUpload
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BookCover } from '../common/BookCover';
import { InfoTip } from '../common/InfoTip';
import { FormatBadge, LocalBadge } from '../common/Badges';
import { WebsiteImporter } from '../../book-engine/website-importer';
import { 
  CandidateBook, 
  CandidateChapter, 
  ChapterFetchProgress, 
  WebsiteAnalysisResult 
} from '../../book-engine/website-importer/types';
import { NormalizedChapter, ParsedBookDraft } from '../../book-engine/types';
import { BookImporter } from '../../book-engine/importers';
import { safeFetch } from '../../book-engine/website-importer/safe-fetch';
import { LocalLibraryBackup } from '../../book-engine/storage/LocalLibraryBackup';
import { OwnerLibraryClient } from '../../book-engine/owner-library/OwnerLibraryClient';
import { findDuplicateBook } from '../../utils/duplicateBooks';

type ImportState = 'input' | 'analyzing' | 'candidates' | 'single_choice' | 'preview' | 'fetching' | 'partial_error' | 'success';

interface WebsiteImportFlowProps {
  onBackToPicker: () => void;
}

type LinkCheck =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'supported'; result: WebsiteAnalysisResult; url: string }
  | { status: 'unsupported'; message: string };

export const WebsiteImportFlow: React.FC<WebsiteImportFlowProps> = ({ onBackToPicker }) => {
  const { 
    user,
    books, 
    addParsedBook, 
    navigateTo, 
    showToast, 
    canAddBookFrom,
    getSlotError,
    maxLocalSlots 
    ,localBookSource,
    reloadLocalBooks
  } = useApp();

  const [urlInput, setUrlInput] = useState('');
  const [state, setState] = useState<ImportState>('input');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [linkCheck, setLinkCheck] = useState<LinkCheck>({ status: 'idle' });
  const linkCheckAbortRef = useRef<AbortController | null>(null);

  // Analysis result
  const [analysisResult, setAnalysisResult] = useState<WebsiteAnalysisResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateBook | null>(null);
  const [candidateFilter, setCandidateFilter] = useState('');
  const [bulkConfirmed, setBulkConfirmed] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const bulkAbortRef = useRef(false);

  // Single Chapter Prompt State
  const [singleChapterItem, setSingleChapterItem] = useState<CandidateChapter | null>(null);
  const [singleChapterBook, setSingleChapterBook] = useState<CandidateBook | null>(null);

  // Preview / Edit metadata
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [coverColor, setCoverColor] = useState('#D9829B');
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [sourceUseConfirmed, setSourceUseConfirmed] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Fetching & Progress State
  const [fetchProgress, setFetchProgress] = useState<ChapterFetchProgress | null>(null);
  const [failedChapters, setFailedChapters] = useState<CandidateChapter[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Accumulated chapters map: candidate index -> CandidateChapter
  const accumulatedChaptersMap = useRef<Map<number, CandidateChapter>>(new Map());
  const [finalDraft, setFinalDraft] = useState<ParsedBookDraft | null>(null);
  const [remoteFileDraft, setRemoteFileDraft] = useState<ParsedBookDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const isDevEnvironment = typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV);

  // Abort any in-flight analyze/fetch request if this flow is unmounted (e.g. the
  // user switches to the "LilyHub" or "Từ thiết bị" upload tab mid-request).
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      linkCheckAbortRef.current?.abort();
    };
  }, []);

  // User-friendly error translator
  const translateError = (err: any): string => {
    if (!err) return 'Đã xảy ra lỗi không xác định.';
    const msg = err.message || String(err);
    if (err.name === 'AbortError' || msg.includes('aborted') || msg.includes('Đã hủy')) {
      return 'Đã hủy thao tác.';
    }
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('chặn CORS')) {
      return 'Lily chưa thể kết nối website này. Hãy thử lại sau hoặc mở trang gốc.';
    }
    if (msg.includes('404')) {
      return 'Không tìm thấy nội dung tại liên kết này.';
    }
    if (msg.includes('403')) {
      return 'Website yêu cầu đăng nhập hoặc hạn chế quyền truy cập công khai.';
    }
    if (msg.includes('429')) {
      return 'Website đang giới hạn tần suất yêu cầu. Vui lòng thử lại sau vài giây.';
    }
    return msg;
  };

  useEffect(() => {
    if (state !== 'input') return;

    linkCheckAbortRef.current?.abort();
    const rawUrl = urlInput.trim();
    if (!rawUrl || (!rawUrl.includes('.') && !rawUrl.includes('://'))) {
      setLinkCheck({ status: 'idle' });
      return;
    }

    const abortCtrl = new AbortController();
    linkCheckAbortRef.current = abortCtrl;
    setLinkCheck({ status: 'checking' });

    const timer = window.setTimeout(async () => {
      try {
        const result = await WebsiteImporter.analyze(rawUrl, abortCtrl.signal);
        const hasReadableContent = Boolean(
          (result.isSingleChapterLink && result.singleChapterItem) || result.candidateBooks.length > 0
        );
        if (!hasReadableContent) throw new Error('Không tìm thấy truyện hoặc chương có thể đọc.');
        if (!abortCtrl.signal.aborted) setLinkCheck({ status: 'supported', result, url: rawUrl });
      } catch (error: any) {
        if (abortCtrl.signal.aborted || error?.name === 'AbortError') return;
        setLinkCheck({ status: 'unsupported', message: translateError(error) });
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
      abortCtrl.abort();
    };
  }, [urlInput, state]);

  const openAnalysisResult = (result: WebsiteAnalysisResult) => {
    setAnalysisResult(result);
    if (result.isSingleChapterLink && result.singleChapterItem && result.singleChapterBookCandidate) {
      setSingleChapterItem(result.singleChapterItem);
      setSingleChapterBook(result.singleChapterBookCandidate);
      setState('single_choice');
    } else if (result.candidateBooks.length === 1 && !result.candidateBooks[0].remoteFile) {
      setupPreview(result.candidateBooks[0]);
    } else if (result.candidateBooks.length > 1) {
      setState('candidates');
    } else {
      throw new Error('Không tìm thấy danh sách chương hoặc truyện hợp lệ từ website này.');
    }
  };

  // Handle URL Analysis (Discovery stage)
  const handleAnalyze = async (e?: React.FormEvent, targetUrl?: string) => {
    if (e) e.preventDefault();
    const rawUrl = (targetUrl || urlInput).trim();
    if (targetUrl) setUrlInput(targetUrl);
    if (!rawUrl) return;

    if (!canAddBookFrom('external')) {
      showToast(getSlotError('external') || 'Không còn slot tải truyện.', 'error');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrorMessage('Bạn đang ngoại tuyến. Vui lòng kết nối mạng để phân tích website.');
      return;
    }

    setErrorMessage(null);

    if (linkCheck.status === 'supported' && linkCheck.url === rawUrl) {
      openAnalysisResult(linkCheck.result);
      return;
    }

    setState('analyzing');

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      const result = await WebsiteImporter.analyze(rawUrl, abortCtrl.signal);
      openAnalysisResult(result);
    } catch (err: any) {
      if (err.name === 'AbortError' || abortCtrl.signal.aborted) {
        setState('input');
        return;
      }
      const friendlyMsg = translateError(err);
      setErrorMessage(friendlyMsg);
      setState('input');
      showToast(friendlyMsg, 'error');
    }
  };

  // Setup preview for a candidate book
  const setupPreview = (candidate: CandidateBook, parsedRemoteFile?: ParsedBookDraft) => {
    setSelectedCandidate(candidate);
    setBookTitle(candidate.title);
    setBookAuthor(candidate.author || '');
    setCoverColor(candidate.suggestedCoverColor || '#D9829B');
    setCoverUrl(candidate.coverUrl);
    setSourceUseConfirmed(false);
    accumulatedChaptersMap.current.clear();
    setFinalDraft(null);
    setFailedChapters([]);
    setRemoteFileDraft(parsedRemoteFile || null);
    setState('preview');
  };

  const handleCandidateSelect = async (candidate: CandidateBook) => {
    if (candidate.remoteFile) {
      setState('analyzing');
      setErrorMessage(null);
      const abortCtrl = new AbortController();
      abortControllerRef.current = abortCtrl;
      try {
        const response = await safeFetch(candidate.remoteFile.url, { credentials: 'omit', signal: abortCtrl.signal });
        if (!response.ok) throw new Error('Không tải được tệp từ Google Drive. Hãy kiểm tra lại quyền chia sẻ.');
        const declaredSize = Number(response.headers.get('content-length') || 0);
        if (declaredSize > 100 * 1024 * 1024) throw new Error('Tệp quá lớn; giới hạn nhập là 100 MB.');
        const blob = await response.blob();
        if (blob.size > 100 * 1024 * 1024) throw new Error('Tệp quá lớn; giới hạn nhập là 100 MB.');
        const file = new File([blob], candidate.remoteFile.name, { type: blob.type });
        const draft = await BookImporter.parse(file);
        setupPreview({
          ...candidate,
          title: draft.title || candidate.title,
          author: draft.author || candidate.author,
          coverUrl: draft.coverUrl || candidate.coverUrl,
          suggestedCoverColor: draft.suggestedCoverColor || candidate.suggestedCoverColor,
          totalChapters: draft.totalChapters,
          chapters: draft.chapters.map(chapter => ({
            index: chapter.index,
            title: chapter.title,
            url: candidate.sourceUrl,
            specialType: chapter.specialType,
            volumeTitle: chapter.volumeTitle,
            wordCount: chapter.wordCount,
          })),
        }, draft);
      } catch (error: any) {
        if (abortCtrl.signal.aborted) return;
        setErrorMessage(translateError(error));
        setState('candidates');
      }
      return;
    }
    if (!candidate.requiresExpansion) {
      setupPreview(candidate);
      return;
    }
    setState('analyzing');
    setErrorMessage(null);
    try {
      const expanded = await WebsiteImporter.analyze(candidate.sourceUrl);
      const resolved = expanded.candidateBooks[0];
      if (!resolved) throw new Error('Không tìm thấy nội dung truyện trong bài đã chọn.');
      setupPreview({
        ...resolved,
        title: candidate.title || resolved.title,
        author: resolved.author || candidate.author,
        coverUrl: candidate.coverUrl || resolved.coverUrl,
        description: candidate.description || resolved.description,
        requiresExpansion: false,
      });
    } catch (error) {
      setErrorMessage(translateError(error));
      setState('candidates');
    }
  };

  const parseRemoteCandidate = async (candidate: CandidateBook): Promise<ParsedBookDraft> => {
    if (!candidate.remoteFile) throw new Error('BULK_SOURCE_NOT_FILE');
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 45_000);
      try {
        const response = await safeFetch(candidate.remoteFile.url, { credentials: 'omit', signal: controller.signal });
        if (!response.ok) throw new Error('Không tải được tệp từ Google Drive.');
        const declaredSize = Number(response.headers.get('content-length') || 0);
        if (declaredSize > 100 * 1024 * 1024) throw new Error('Tệp vượt quá 100 MB.');
        const blob = await response.blob();
        if (blob.size > 100 * 1024 * 1024) throw new Error('Tệp vượt quá 100 MB.');
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

  const handleOwnerBulkImport = async () => {
    if (!user.isOwner || !analysisResult || !bulkConfirmed || bulkProgress) return;
    const candidates = analysisResult.candidateBooks.filter(candidate => candidate.remoteFile);
    if (!candidates.length) return;
    bulkAbortRef.current = false;
    let failed = 0;
    let completed = 0;
    let nextIndex = 0;
    const knownBooks = [...books];
    const existingCloudIds = new Set((await OwnerLibraryClient.list()).map(book => book.id));
    const yieldToUi = () => new Promise<void>(resolve => window.setTimeout(resolve, 16));
    const normalizeTitle = (value: string) => value.replace(/\.(epub|txt|docx)$/i, '').trim().toLocaleLowerCase('vi-VN');
    const uploadWithRetry = async (cloudId: string, blob: Blob, title: string, author: string) => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try { await OwnerLibraryClient.upload(cloudId, blob, title, author); return; }
        catch (error) { lastError = error; if (attempt < 2) await new Promise(resolve => window.setTimeout(resolve, 700 * (attempt + 1))); }
      }
      throw lastError;
    };
    setBulkProgress({ done: 0, total: candidates.length, failed: 0 });
    const worker = async () => {
      while (!bulkAbortRef.current) {
        const index = nextIndex++;
        if (index >= candidates.length) return;
        const candidate = candidates[index];
        try {
          const knownByTitle = knownBooks.find(book => normalizeTitle(book.title) === normalizeTitle(candidate.title));
          if (knownByTitle && existingCloudIds.has(await OwnerLibraryClient.cloudId(knownByTitle.id))) {
            completed += 1;
            setBulkProgress({ done: completed, total: candidates.length, failed });
            await yieldToUi();
            continue;
          }
          const draft = await parseRemoteCandidate(candidate);
          const duplicate = findDuplicateBook(knownBooks, {
            title: draft.title || candidate.title,
            author: draft.author || candidate.author,
            wordCount: draft.wordCount,
            totalChapters: draft.totalChapters,
          });
          const saved = duplicate || await addParsedBook(draft, {
              title: draft.title || candidate.title,
              author: draft.author || candidate.author,
              coverColor: draft.suggestedCoverColor || '#D9829B',
              coverUrl: draft.coverUrl,
              source: {
                type: 'website', adapter: candidate.adapterName, url: candidate.sourceUrl,
                hostname: candidate.hostname, importedAt: new Date().toISOString(),
              },
            });
          if (!duplicate) knownBooks.push(saved);
          const cloudId = await OwnerLibraryClient.cloudId(saved.id);
          if (!existingCloudIds.has(cloudId)) {
            const backup = await LocalLibraryBackup.createForBook(saved.id);
            const compressed = await LocalLibraryBackup.serializeCompressed(backup);
            await uploadWithRetry(cloudId, compressed, saved.title, saved.author);
            existingCloudIds.add(cloudId);
          }
          // A bulk owner import uses IndexedDB only as a short-lived staging
          // area. Once R2 confirms the upload, remove the newly-created local
          // payload; the Cloud catalog can restore it lazily when opened.
          if (!duplicate) await localBookSource.deleteBook(saved.id);
        } catch (error) {
          failed += 1;
          console.error('[Lily owner bulk import]', candidate.title, error);
        }
        completed += 1;
        setBulkProgress({ done: completed, total: candidates.length, failed });
        // Parsing EPUB/DOCX is CPU-heavy. Give painting, navigation and input a
        // frame between files so a large owner import never locks the reader UI.
        await yieldToUi();
      }
    };
    // Two workers keep Drive/R2 busy without decoding ten large archives on the
    // browser main thread at the same time.
    await Promise.all(Array.from({ length: 2 }, () => worker()));
    // Convert completed Drive imports to true Cloud-only entries. Never touch a
    // local book unless its exact object is confirmed present in R2.
    for (const book of knownBooks) {
      if (book.source?.adapter !== 'google-drive-folder') continue;
      const cloudId = await OwnerLibraryClient.cloudId(book.id);
      if (existingCloudIds.has(cloudId)) await localBookSource.deleteBook(book.id);
      await yieldToUi();
    }
    await reloadLocalBooks();
    const stopped = bulkAbortRef.current;
    setBulkProgress(null);
    showToast(stopped ? 'Đã dừng nhập hàng loạt.' : `Đã xử lý xong ${candidates.length} truyện${failed ? ` · ${failed} truyện lỗi` : ''}.`, stopped || failed ? 'warning' : 'success');
  };

  // Handle single chapter choice
  const handleChooseSingleChapter = (mode: 'whole_book' | 'only_this_chapter') => {
    if (mode === 'whole_book' && singleChapterBook) {
      setupPreview(singleChapterBook);
    } else if (mode === 'only_this_chapter' && singleChapterItem && singleChapterBook) {
      const singleChapCandidate: CandidateBook = {
        ...singleChapterBook,
        id: `single-chap-${Date.now()}`,
        title: `${singleChapterBook.title} - ${singleChapterItem.title}`,
        totalChapters: 1,
        chapters: [{ ...singleChapterItem, index: 1 }],
      };
      setupPreview(singleChapCandidate);
    }
  };

  // Handle Custom Cover Image Selection
  const handleCoverFileSelected = (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP).', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverUrl(reader.result);
        showToast('Đã áp dụng ảnh bìa tùy chọn', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Start downloading full chapters via concurrency queue
  const handleStartImport = async (candidateToImport?: CandidateBook, isRetry = false) => {
    const candidate = candidateToImport || selectedCandidate;
    if (!candidate) return;

    if (!canAddBookFrom('external')) {
      showToast(getSlotError('external') || `Đã dùng hết ${maxLocalSlots} slot.`, 'warning');
      return;
    }

    if (remoteFileDraft && candidate.remoteFile) {
      setState('fetching');
      await saveDraftToLibrary({
        ...remoteFileDraft,
        title: bookTitle.trim() || remoteFileDraft.title,
        author: bookAuthor.trim() || remoteFileDraft.author,
        coverUrl,
        suggestedCoverColor: coverColor,
      });
      return;
    }

    if (!isRetry) {
      accumulatedChaptersMap.current.clear();
    }

    setState('fetching');
    setErrorMessage(null);
    setFailedChapters([]);

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      const isWiki = candidate.adapterName === 'wikicv';
      const { draft, completedChapters, failedChapters: failed, isCancelled } = await WebsiteImporter.fetchAndBuildDraft(
        {
          ...candidate,
          title: bookTitle.trim() || candidate.title,
          author: bookAuthor.trim() || candidate.author,
          coverUrl,
          suggestedCoverColor: coverColor,
        },
        {
          concurrency: isWiki ? 1 : (candidate.adapterName === 'wordpress' ? 3 : 2),
          maxRetries: 3,
          delayBetweenItemsMs: isWiki ? 280 : 80,
          signal: abortCtrl.signal,
          onProgress: (prog) => {
            setFetchProgress({ ...prog });
          },
        }
      );

      if (isCancelled) {
        setState('preview');
        showToast('Đã hủy tải truyện.', 'info');
        return;
      }

      // Merge newly completed chapters into accumulated map
      for (const ch of completedChapters) {
        accumulatedChaptersMap.current.set(ch.index, ch);
      }

      // Reconstruct strictly ordered NormalizedChapter[]
      const sortedCompleted = Array.from(accumulatedChaptersMap.current.values())
        .sort((a, b) => a.index - b.index);

      let totalWords = 0;
      const normalizedChapters: NormalizedChapter[] = sortedCompleted.map((ch, idx) => {
        const words = ch.wordCount || 0;
        totalWords += words;
        return {
          id: `web_chap_${idx + 1}_${Date.now()}`,
          bookId: candidate.id,
          index: idx + 1,
          title: ch.title,
          paragraphs: ch.paragraphs || (ch.content ? ch.content.split('\n\n') : []),
          wordCount: words,
          volumeTitle: ch.volumeTitle,
          specialType: ch.specialType,
          sourceUrl: ch.url,
        };
      });

      const approximateSizeMB = Number(((totalWords * 6) / (1024 * 1024)).toFixed(2)) || 0.1;

      const updatedDraft: ParsedBookDraft = {
        ...draft,
        chapters: normalizedChapters,
        totalChapters: normalizedChapters.length,
        wordCount: totalWords,
        fileSizeMB: approximateSizeMB,
      };
      setFinalDraft(updatedDraft);

      if (failed.length > 0) {
        setFailedChapters(failed);
        setState('partial_error');
      } else {
        // All chapters succeeded -> Auto save to IndexedDB
        await saveDraftToLibrary(updatedDraft);
      }
    } catch (err: any) {
      if (abortCtrl.signal.aborted) {
        setState('preview');
        return;
      }
      const friendlyMsg = translateError(err);
      setErrorMessage(friendlyMsg);
      setState('preview');
      showToast(friendlyMsg, 'error');
    }
  };

  // Save parsed draft into IndexedDB
  const saveDraftToLibrary = async (draftToSave: ParsedBookDraft) => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      setIsSaving(true);
      const fullDraft: ParsedBookDraft = {
        ...draftToSave,
        totalChapters: draftToSave.chapters.length,
      };

      await addParsedBook(fullDraft, {
        title: bookTitle.trim() || fullDraft.title,
        author: bookAuthor.trim() || fullDraft.author,
        coverColor,
        coverUrl,
        source: selectedCandidate ? {
          type: 'website',
          adapter: selectedCandidate.adapterName,
          url: selectedCandidate.sourceUrl,
          hostname: selectedCandidate.hostname,
          importedAt: new Date().toISOString(),
        } : undefined,
      });

      setState('success');
      showToast('Đã nhập truyện vào Thư viện thành công!', 'success');
    } catch (err: any) {
      const friendlyMsg = translateError(err);
      setErrorMessage(friendlyMsg);
      setState('preview');
      showToast(friendlyMsg, 'error');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  // Cancel ongoing fetch operation
  const handleCancelFetch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Retry only failed chapters
  const handleRetryFailed = async () => {
    if (!selectedCandidate || failedChapters.length === 0) return;
    const retryCandidate: CandidateBook = {
      ...selectedCandidate,
      chapters: failedChapters,
      totalChapters: failedChapters.length,
    };
    handleStartImport(retryCandidate, true);
  };

  // Accept partial import and save what was already downloaded
  const handleSavePartial = async () => {
    if (finalDraft) {
      await saveDraftToLibrary(finalDraft);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Hidden Cover File Input */}
      <input
        ref={coverFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleCoverFileSelected(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* STATE 1: INPUT SCREEN */}
      {state === 'input' && (
        <div className="bg-white border border-ink-100 rounded-3xl p-6 sm:p-8 shadow-soft space-y-4">
          <div className="space-y-2">
            <h2 className="font-serif font-bold text-xl text-ink-950 flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Từ website</span>
              <InfoTip label="Lily hỗ trợ liên kết nào?">
                <div className="space-y-1.5">
                  <p className="font-semibold text-ink-950">Hãy dán liên kết của bạn vào đây</p>
                  <p className="text-ink-600">Lily hỗ trợ Google Docs, Google Drive, Notion, Blogspot và một số website khác.</p>
                  <p className="text-ink-500">Lily chỉ tải nội dung sau khi bạn xác nhận.</p>
                </div>
              </InfoTip>
            </h2>
            <p className="text-xs text-ink-500">Dán liên kết công khai</p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                {errorMessage}
                {/^https:\/\//i.test(urlInput.trim()) && <a href={urlInput.trim()} target="_blank" rel="noopener noreferrer" className="mt-2 block font-semibold underline">Mở trang gốc</a>}
              </div>
            </div>
          )}

          <form onSubmit={handleAnalyze} className="space-y-3">
            <div className="relative">
              <Globe className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setErrorMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Dán link truyện hoặc chương"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-ink-50 border border-ink-200 text-xs sm:text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 transition-colors ${
              linkCheck.status === 'supported'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : linkCheck.status === 'unsupported'
                  ? 'border-rose-200 bg-rose-50 text-rose-900'
                  : 'border-ink-100 bg-cream-50/60 text-ink-700'
            }`}>
              {linkCheck.status === 'checking'
                ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-ink-400" />
                : linkCheck.status === 'supported'
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  : linkCheck.status === 'unsupported'
                    ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    : <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />}
              <div className="min-w-0">
                <p className="text-xs font-semibold">
                  {linkCheck.status === 'checking'
                    ? 'Đang kiểm tra liên kết…'
                    : linkCheck.status === 'supported'
                      ? 'Sẵn sàng'
                      : linkCheck.status === 'unsupported'
                        ? 'Không hỗ trợ liên kết này'
                        : 'Dán liên kết của bạn'}
                </p>
                <p className="mt-0.5 text-[10px] leading-4 opacity-75">
                  {linkCheck.status === 'checking'
                    ? 'Lily đang xác nhận cấu trúc và nội dung có thể đọc.'
                    : linkCheck.status === 'supported'
                      ? 'Lily đã nhận diện được truyện hoặc nội dung trong liên kết.'
                      : linkCheck.status === 'unsupported'
                        ? linkCheck.message
                        : 'Lily sẽ báo khả năng tương thích trước khi tải nội dung.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={linkCheck.status !== 'supported'}
                className="px-6 py-2.5 rounded-2xl bg-ink-950 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
              >
                <Search className="w-4 h-4" />
                <span>{linkCheck.status === 'supported' ? 'Tiếp tục' : 'Phân tích liên kết'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STATE 2: ANALYZING SPINNER */}
      {state === 'analyzing' && (
        <div className="bg-white border border-ink-100 rounded-3xl p-8 shadow-card text-center space-y-5 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-soft">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>

          <div className="space-y-1">
            <h2 className="font-serif font-bold text-xl text-ink-950">
              Đang phân tích website…
            </h2>
            <p className="text-xs text-ink-500 max-w-sm mx-auto">
              Lily đang phát hiện cấu trúc trang, danh mục truyện và trích xuất danh sách chương
            </p>
          </div>

          <button
            type="button"
            onClick={handleCancelFetch}
            className="px-4 py-2 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-cream-50"
          >
            Hủy bỏ
          </button>
        </div>
      )}

      {/* STATE 3: MULTIPLE CANDIDATES SELECTION */}
      {state === 'candidates' && analysisResult && (
        <div className="bg-white border border-ink-100 rounded-3xl p-6 sm:p-8 shadow-card space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-ink-100 pb-3">
            <button
              type="button"
              onClick={() => setState('input')}
              className="text-xs text-ink-500 hover:text-ink-900 font-semibold flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Nhập liên kết khác</span>
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-ink-600">
                Nguồn: <span className="font-mono text-ink-900">{analysisResult.hostname}</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                {analysisResult.adapter}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <div className="space-y-1">
            <h2 className="font-serif font-bold text-xl text-ink-950">
              {`Đã tìm thấy ${analysisResult.candidateBooks.length} truyện`}
            </h2>
            <p className="text-xs text-ink-500">
              Hãy chọn truyện bạn muốn đưa vào Lily:
            </p>
          </div>

          {user.isOwner && analysisResult.candidateBooks.some(candidate => candidate.remoteFile) && (
            <div className="rounded-2xl border border-lily-200 bg-lily-50/50 p-4">
              <div className="flex items-start gap-3">
                <CloudUpload className="mt-0.5 h-5 w-5 shrink-0 text-lily-700" />
                <div className="min-w-0 flex-1">
                  <strong className="text-sm text-ink-950">Nhập toàn bộ vào máy và Kho riêng</strong>
                  <p className="mt-1 text-[11px] leading-5 text-ink-600">Dành riêng cho chủ sở hữu. Lily tải lần lượt {analysisResult.candidateBooks.filter(candidate => candidate.remoteFile).length} truyện, lưu trên thiết bị và sao lưu bản nén lên Cloud.</p>
                  {!bulkProgress ? <>
                    <label className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-ink-600"><input type="checkbox" checked={bulkConfirmed} onChange={event => setBulkConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-[#A93561]" /><span>Tôi xác nhận có quyền truy cập và chỉ dùng nội dung cho thư viện cá nhân.</span></label>
                    <button type="button" onClick={() => void handleOwnerBulkImport()} disabled={!bulkConfirmed} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-lily-800 px-4 text-xs font-semibold text-white disabled:opacity-40"><CloudUpload className="h-4 w-4" />Nhập tất cả</button>
                  </> : <div className="mt-3 space-y-2"><div className="flex justify-between text-xs font-semibold text-ink-700"><span>Đang nhập {bulkProgress.done}/{bulkProgress.total}</span><span>{bulkProgress.failed} lỗi</span></div><div className="h-2 overflow-hidden rounded-full bg-white"><div className="h-full bg-lily-600 transition-[width]" style={{ width: `${bulkProgress.total ? bulkProgress.done / bulkProgress.total * 100 : 0}%` }} /></div><button type="button" onClick={() => { bulkAbortRef.current = true; }} className="text-xs font-semibold text-rose-700">Dừng sau truyện hiện tại</button></div>}
                </div>
              </div>
            </div>
          )}

          {/* Search Filter for candidate books */}
          {analysisResult.candidateBooks.length > 3 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={candidateFilter}
                onChange={(e) => setCandidateFilter(e.target.value)}
                placeholder={`Tìm kiếm trong ${analysisResult.candidateBooks.length} truyện...`}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-ink-50 border border-ink-200 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {analysisResult.candidateBooks
              .filter(cand => {
                if (!candidateFilter.trim()) return true;
                const q = candidateFilter.toLowerCase().trim();
                return cand.title.toLowerCase().includes(q) || (cand.author && cand.author.toLowerCase().includes(q));
              })
              .map((cand) => (
              <div
                key={cand.id}
                onClick={() => void handleCandidateSelect(cand)}
                className="p-4 rounded-2xl border border-ink-100 hover:border-emerald-400 bg-cream-50/40 hover:bg-emerald-50/30 transition-all cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-14 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0 shadow-2xs border border-emerald-200">
                    <BookOpen className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif font-bold text-sm text-ink-950 truncate group-hover:text-emerald-900 transition-colors">
                      {cand.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-ink-500 mt-0.5">
                      {cand.author && <span>Tác giả: {cand.author}</span>}
                      {cand.author && <span>·</span>}
                      <span className="font-semibold text-emerald-800">
                        {cand.remoteFile ? cand.remoteFile.format : cand.requiresExpansion ? 'Chọn để kiểm tra chương' : `${cand.totalChapters} chương`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    cand.confidence === 'HIGH' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {cand.confidence === 'HIGH' ? '✓ Nhận diện tốt' : '⚠ Cần kiểm tra'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-ink-400 group-hover:text-emerald-700 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            ))}
          </div>

          {/* DEV Diagnostics Box */}
          {isDevEnvironment && analysisResult && (
            <div className="p-3.5 bg-ink-900 text-ink-100 rounded-2xl text-[11px] font-mono space-y-1">
              <div className="font-bold text-emerald-400 uppercase tracking-wider">🛠️ DEV Diagnostics:</div>
              <div>Adapter: {analysisResult.adapter} | REST detected: {analysisResult.isWordPress ? 'yes' : 'no'}</div>
              <div>Posts discovered: {analysisResult.diagnostics.totalPostsDiscovered} | Pages: {analysisResult.diagnostics.totalPagesDiscovered} | Candidates: {analysisResult.candidateBooks.length}</div>
            </div>
          )}
        </div>
      )}

      {/* STATE 4: SINGLE CHAPTER PROMPT */}
      {state === 'single_choice' && singleChapterBook && singleChapterItem && (
        <div className="bg-white border border-ink-100 rounded-3xl p-6 sm:p-8 shadow-card space-y-5 animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-soft">
            <BookOpen className="w-6 h-6" />
          </div>

          <div className="text-center space-y-1">
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              Phát hiện liên kết chương
            </span>
            <h2 className="font-serif font-bold text-lg sm:text-xl text-ink-950 mt-2">
              Đây có vẻ là một chương của tác phẩm:
            </h2>
            <p className="font-serif font-bold text-base text-emerald-900 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/70 inline-block max-w-md truncate">
              {singleChapterBook.title}
            </p>
            <p className="text-xs text-ink-500 mt-1">
              Tìm thấy tổng cộng <strong>{singleChapterBook.totalChapters} chương</strong> thuộc bộ truyện này.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleChooseSingleChapter('whole_book')}
              className="p-4 rounded-2xl bg-ink-950 hover:bg-ink-800 text-white text-left transition-all hover:scale-[1.02] shadow-soft space-y-1"
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span>Nhập cả bộ truyện</span>
                <span className="text-[11px] font-normal text-ink-300">({singleChapterBook.totalChapters} chương)</span>
              </div>
              <p className="text-[11px] text-ink-300">
                Tải toàn bộ các chương đã phát hiện vào thư viện.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleChooseSingleChapter('only_this_chapter')}
              className="p-4 rounded-2xl border border-ink-200 hover:border-ink-400 bg-cream-50/50 hover:bg-cream-100/50 text-left transition-all hover:scale-[1.02] space-y-1"
            >
              <div className="font-bold text-xs text-ink-950 flex items-center justify-between">
                <span>Chỉ nhập chương này</span>
                <span className="text-[11px] font-normal text-ink-500">(1 chương)</span>
              </div>
              <p className="text-[11px] text-ink-500">
                Chỉ nhập nội dung của "{singleChapterItem.title}".
              </p>
            </button>
          </div>
        </div>
      )}

      {/* STATE 5: PREVIEW SCREEN (Mandatory Preview) */}
      {state === 'preview' && selectedCandidate && (
        <div className="bg-white border border-ink-100 rounded-3xl p-6 md:p-8 shadow-card space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-ink-100 pb-4">
            <button
              type="button"
              onClick={() => {
                if (analysisResult && analysisResult.candidateBooks.length > 1) {
                  setState('candidates');
                } else {
                  setState('input');
                }
              }}
              className="text-xs text-ink-500 hover:text-ink-900 font-semibold flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>

            <div className="flex items-center gap-2">
              <FormatBadge format={selectedCandidate.remoteFile?.format || 'WEBSITE'} />
              <LocalBadge />
            </div>
          </div>

          {/* Error Message (e.g. import/save failed and returned here) */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Book Meta Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
            <div className="flex flex-col items-center gap-3">
              <BookCover
                title={bookTitle || selectedCandidate.title}
                author={bookAuthor || selectedCandidate.author || 'Tác giả'}
                coverColor={coverColor}
                coverUrl={coverUrl}
                size="lg"
                format={selectedCandidate.remoteFile?.format || 'WEBSITE'}
              />
              <button
                type="button"
                onClick={() => coverFileInputRef.current?.click()}
                className="text-xs text-emerald-800 hover:text-emerald-950 font-medium underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Đổi ảnh bìa tùy chọn</span>
              </button>
            </div>

            <div className="sm:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Tựa đề truyện
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Nhập tên truyện..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-ink-50 border border-ink-200 text-sm font-medium text-ink-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Tác giả
                </label>
                <input
                  type="text"
                  value={bookAuthor}
                  onChange={(e) => setBookAuthor(e.target.value)}
                  placeholder="Tác giả hoặc để trống..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-ink-50 border border-ink-200 text-sm font-medium text-ink-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 bg-cream-50/80 rounded-2xl border border-cream-200/80 text-center">
                <div>
                  <span className="text-[10px] text-ink-400 block">Số chương</span>
                  <span className="font-serif font-bold text-sm text-ink-900">{selectedCandidate.totalChapters}</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Nguồn</span>
                  <span className="font-mono font-bold text-[11px] text-ink-900 truncate block px-1" title={selectedCandidate.hostname}>
                    {selectedCandidate.hostname}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Độ tin cậy</span>
                  <span className="font-semibold text-xs text-emerald-800">
                    {selectedCandidate.confidence === 'HIGH' ? '✓ Cao' : 'Trung bình'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Missing Chapters / Anomalies Alert */}
          {selectedCandidate.missingChapters && selectedCandidate.missingChapters.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Cảnh báo thứ tự chương:</strong> Có thể thiếu các chương{' '}
                <span className="font-mono font-bold">{selectedCandidate.missingChapters.join(', ')}</span> trên website nguồn.
              </div>
            </div>
          )}

          {/* Duplicate Chapters Alert */}
          {selectedCandidate.duplicateChapters && selectedCandidate.duplicateChapters.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Phát hiện chương trùng số:</strong> Chương {selectedCandidate.duplicateChapters.join(', ')} xuất hiện nhiều lần.
              </div>
            </div>
          )}

          {/* Chapter List Preview */}
          <div className="space-y-2 pt-2 border-t border-ink-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-700 flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5 text-emerald-600" />
                <span>Danh sách {selectedCandidate.chapters.length} chương sẽ nhập:</span>
              </span>
              <span className="text-[11px] text-ink-400">
                Sắp xếp tự nhiên (1..{selectedCandidate.chapters.length})
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-2xl border border-ink-100 divide-y divide-ink-50 bg-ink-50/40 p-1 text-xs">
              {selectedCandidate.chapters.map((ch) => (
                <div key={ch.index} className="py-1.5 px-3 flex items-center justify-between hover:bg-white rounded-lg transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-4 text-emerald-600 font-bold shrink-0 text-center">✓</span>
                    <span className="font-medium text-ink-900 truncate">{ch.title}</span>
                  </div>
                  {ch.specialType && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                      {ch.specialType === 'preface' ? 'Văn án' : 'Ngoại truyện'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-ink-100 bg-ink-50/60 p-3 text-[11px] leading-5 text-ink-600">
            <input type="checkbox" checked={sourceUseConfirmed} onChange={event => setSourceUseConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-[#A93561]" />
            <span>Tôi có quyền truy cập và chỉ lưu nội dung này để sử dụng cá nhân. Lily không đăng lại nội dung. <a href={selectedCandidate.sourceUrl} target="_blank" rel="noopener" className="font-semibold text-lily-800 underline">Xem trang gốc</a></span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setState('input')}
              className="px-4 py-2.5 rounded-2xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-cream-50 transition-colors"
            >
              Hủy bỏ
            </button>

            <button
              type="button"
              onClick={() => handleStartImport()}
              disabled={!sourceUseConfirmed}
              className="px-6 py-2.5 rounded-2xl bg-ink-950 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận & Nhập truyện</span>
            </button>
          </div>
        </div>
      )}

      {/* STATE 6: FETCHING PROGRESS SCREEN */}
      {state === 'fetching' && (
        <div className="bg-white border border-ink-100 rounded-3xl p-8 shadow-card text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-soft">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>

          <div className="space-y-1">
            <h2 className="font-serif font-bold text-xl text-ink-950">
              Đang nhập truyện từ website…
            </h2>
            <p className="text-xs text-ink-500">
              Đã tải{' '}
              <strong className="text-emerald-700 font-mono">
                {fetchProgress?.completedCount || 0} / {fetchProgress?.totalCount || selectedCandidate?.totalChapters || 0}
              </strong>{' '}
              chương
            </p>
          </div>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto space-y-1.5">
            <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    fetchProgress && fetchProgress.totalCount > 0
                      ? Math.round((fetchProgress.completedCount / fetchProgress.totalCount) * 100)
                      : 5
                  }%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-ink-400 font-mono">
              <span className="truncate max-w-[240px] text-left">
                {fetchProgress?.currentChapterTitle ? `${fetchProgress.currentChapterTitle} - Đang xử lý...` : 'Đang khởi tạo…'}
              </span>
              <span>
                {fetchProgress && fetchProgress.totalCount > 0
                  ? `${Math.round((fetchProgress.completedCount / fetchProgress.totalCount) * 100)}%`
                  : '0%'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancelFetch}
            className="px-5 py-2 rounded-2xl border border-ink-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
          >
            Hủy tải truyện
          </button>
        </div>
      )}

      {/* STATE 7: PARTIAL FETCH ERROR */}
      {state === 'partial_error' && (
        <div className="bg-white border border-ink-100 rounded-3xl p-6 sm:p-8 shadow-card space-y-5 animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-soft">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="text-center space-y-1">
            <h2 className="font-serif font-bold text-lg text-ink-950">
              Có {failedChapters.length} chương chưa tải được
            </h2>
            <p className="text-xs text-ink-500 max-w-md mx-auto">
              Đã tải thành công {accumulatedChaptersMap.current.size} chương. Bạn có thể thử tải lại các chương bị lỗi hoặc lưu các chương đã hoàn tất.
            </p>
          </div>

          <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-[11px] leading-relaxed flex items-start gap-2">
            <span className="font-bold shrink-0">💡 Mẹo:</span>
            <span>
              Một số website truyện có hệ thống giới hạn tốc độ khi tải nhiều chương liên tục. Bạn chỉ cần bấm <strong>"Thử lại ... chương"</strong> phía dưới để tiếp tục tải nốt các chương còn lại (các chương đã tải trước đó sẽ được tự động giữ nguyên và gộp vào sách).
            </span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl max-h-36 overflow-y-auto text-xs space-y-1">
            {failedChapters.map((fc, i) => (
              <div key={i} className="flex items-center justify-between text-amber-950">
                <span className="truncate">{fc.title}</span>
                <span className="text-[10px] text-rose-600 shrink-0 font-medium">{fc.error || 'Lỗi mạng / Giới hạn tần suất'}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRetryFailed}
              className="px-4 py-2.5 rounded-2xl border border-ink-200 text-xs font-semibold text-ink-800 hover:bg-cream-50 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại {failedChapters.length} chương</span>
            </button>

            <button
              type="button"
              onClick={handleSavePartial}
              disabled={isSaving || !finalDraft || finalDraft.chapters.length === 0}
              className="px-5 py-2.5 rounded-2xl bg-ink-950 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center gap-1.5 disabled:opacity-40"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Lưu {accumulatedChaptersMap.current.size} chương đã tải</span>
            </button>
          </div>
        </div>
      )}

      {/* STATE 8: SUCCESS */}
      {state === 'success' && (
        <div className="bg-white border border-ink-100 rounded-3xl p-8 shadow-card text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-soft">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="font-serif font-bold text-2xl text-ink-950">
              Đã nhập truyện thành công!
            </h2>
            <p className="text-xs text-ink-500 max-w-sm mx-auto">
              "{bookTitle || selectedCandidate?.title}" đã được lưu an toàn vào bộ nhớ thiết bị để bạn đọc offline bất kỳ lúc nào.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigateTo('library')}
              className="px-5 py-2.5 rounded-2xl border border-ink-200 text-xs font-semibold text-ink-800 hover:bg-cream-50"
            >
              Về Thư viện
            </button>
            <button
              onClick={() => {
                if (books.length > 0) {
                  navigateTo('reader', books[0].id);
                } else {
                  navigateTo('library');
                }
              }}
              className="px-6 py-2.5 rounded-2xl bg-ink-950 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105"
            >
              <BookOpen className="w-4 h-4" />
              <span>Đọc ngay</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
