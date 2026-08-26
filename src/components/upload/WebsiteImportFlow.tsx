import React, { useState, useRef } from 'react';
import { 
  Globe, 
  Search, 
  Loader2, 
  ArrowLeft, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  Check, 
  HardDrive, 
  Sparkles, 
  FileText, 
  X,
  ExternalLink,
  ChevronRight,
  ListOrdered,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BookCover } from '../common/BookCover';
import { FormatBadge, LocalBadge } from '../common/Badges';
import { WebsiteImporter } from '../../book-engine/website-importer';
import { 
  CandidateBook, 
  CandidateChapter, 
  ChapterFetchProgress, 
  WebsiteAnalysisResult 
} from '../../book-engine/website-importer/types';
import { NormalizedChapter, ParsedBookDraft } from '../../book-engine/types';

type ImportState = 'input' | 'analyzing' | 'candidates' | 'single_choice' | 'preview' | 'fetching' | 'partial_error' | 'success';

interface WebsiteImportFlowProps {
  onBackToPicker: () => void;
}

export const WebsiteImportFlow: React.FC<WebsiteImportFlowProps> = ({ onBackToPicker }) => {
  const { 
    user, 
    books, 
    addParsedBook, 
    navigateTo, 
    showToast, 
    isOpenBeta,
    isSlotFull, 
    maxLocalSlots 
  } = useApp();

  const [urlInput, setUrlInput] = useState('');
  const [state, setState] = useState<ImportState>('input');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Analysis result
  const [analysisResult, setAnalysisResult] = useState<WebsiteAnalysisResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateBook | null>(null);
  const [candidateFilter, setCandidateFilter] = useState('');

  // Single Chapter Prompt State
  const [singleChapterItem, setSingleChapterItem] = useState<CandidateChapter | null>(null);
  const [singleChapterBook, setSingleChapterBook] = useState<CandidateBook | null>(null);

  // Preview / Edit metadata
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [coverColor, setCoverColor] = useState('#D9829B');
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Fetching & Progress State
  const [fetchProgress, setFetchProgress] = useState<ChapterFetchProgress | null>(null);
  const [failedChapters, setFailedChapters] = useState<CandidateChapter[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Final parsed draft & accumulated chapters across retries
  const [finalDraft, setFinalDraft] = useState<ParsedBookDraft | null>(null);
  const [accumulatedChapters, setAccumulatedChapters] = useState<NormalizedChapter[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isDevEnvironment = typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV);

  // Handle URL Analysis (Discovery stage)
  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawUrl = urlInput.trim();
    if (!rawUrl) return;

    if (isSlotFull && (isOpenBeta || user.tier === 'free')) {
      showToast(`Bạn đã dùng hết ${maxLocalSlots}/${maxLocalSlots} slot. Hãy xóa bớt truyện cũ trước.`, 'error');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrorMessage('Bạn đang ngoại tuyến. Vui lòng kết nối mạng để phân tích website.');
      return;
    }

    setErrorMessage(null);
    setState('analyzing');

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      const result = await WebsiteImporter.analyze(rawUrl, abortCtrl.signal);
      setAnalysisResult(result);

      if (result.isSingleChapterLink && result.singleChapterItem && result.singleChapterBookCandidate) {
        // User pasted link to a single chapter
        setSingleChapterItem(result.singleChapterItem);
        setSingleChapterBook(result.singleChapterBookCandidate);
        setState('single_choice');
      } else if (result.candidateBooks.length === 1) {
        // Single book found
        setupPreview(result.candidateBooks[0]);
      } else if (result.candidateBooks.length > 1) {
        // Multiple books found (e.g. from homepage or multi-category site)
        setState('candidates');
      } else {
        throw new Error('Không tìm thấy danh sách chương hoặc truyện hợp lệ từ website này.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || abortCtrl.signal.aborted) {
        setState('input');
        return;
      }
      setErrorMessage(err.message || 'Không thể phân tích website này.');
      setState('input');
      showToast(err.message || 'Lỗi phân tích website', 'error');
    }
  };

  // Setup preview for a candidate book
  const setupPreview = (candidate: CandidateBook) => {
    setSelectedCandidate(candidate);
    setBookTitle(candidate.title);
    setBookAuthor(candidate.author || '');
    setCoverColor(candidate.suggestedCoverColor || '#D9829B');
    setCoverUrl(candidate.coverUrl);
    setState('preview');
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
  const handleStartImport = async (candidateToImport?: CandidateBook) => {
    const candidate = candidateToImport || selectedCandidate;
    if (!candidate) return;

    if (isSlotFull) {
      showToast(`Bộ nhớ đã đạt giới hạn tối đa (${maxLocalSlots} slot). Hãy xóa bớt sách để nhập thêm.`, 'warning');
      return;
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

      // Merge newly completed chapters into accumulated chapters
      const mergedChaptersMap = new Map<number, NormalizedChapter>();
      accumulatedChapters.forEach(c => mergedChaptersMap.set(c.index, c));
      draft.chapters.forEach(c => mergedChaptersMap.set(c.index, c));

      const mergedList = Array.from(mergedChaptersMap.values()).sort((a, b) => a.index - b.index);
      setAccumulatedChapters(mergedList);

      const updatedDraft: ParsedBookDraft = {
        ...draft,
        chapters: mergedList,
        totalChapters: mergedList.length,
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
      setErrorMessage(err.message || 'Lỗi khi tải nội dung chương.');
      setState('preview');
      showToast(err.message || 'Lỗi khi tải truyện', 'error');
    }
  };

  // Save parsed draft into IndexedDB
  const saveDraftToLibrary = async (draftToSave: ParsedBookDraft) => {
    try {
      setIsSaving(true);
      const chaptersToSave = draftToSave.chapters && draftToSave.chapters.length > 0 
        ? draftToSave.chapters 
        : accumulatedChapters;

      const fullDraft: ParsedBookDraft = {
        ...draftToSave,
        chapters: chaptersToSave,
        totalChapters: chaptersToSave.length,
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
      setErrorMessage(err.message || 'Lỗi khi lưu sách vào IndexedDB');
      showToast(err.message || 'Lỗi lưu sách', 'error');
    } finally {
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
    handleStartImport(retryCandidate);
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
        <div className="bg-white border border-ink-100 rounded-3xl p-6 sm:p-8 shadow-soft space-y-5">
          <div className="flex items-center justify-between border-b border-ink-100 pb-3">
            <button
              type="button"
              onClick={onBackToPicker}
              className="text-xs text-ink-500 hover:text-ink-900 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại các tùy chọn khác</span>
            </button>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              🌐 Web Importer
            </span>
          </div>

          <div className="space-y-1.5 text-center sm:text-left">
            <h2 className="font-serif font-bold text-xl sm:text-2xl text-ink-950 flex items-center justify-center sm:justify-start gap-2">
              <Globe className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Nhập truyện từ website</span>
            </h2>
            <p className="text-xs text-ink-500 leading-relaxed max-w-lg">
              Dán liên kết trang chủ, trang truyện, mục lục hoặc một chương bất kỳ. Lily sẽ tự động nhận diện danh sách chương và đưa vào Thư viện của bạn.
            </p>
          </div>

          {/* Supported Platforms Note */}
          <div className="p-4 rounded-2xl bg-cream-50/90 border border-cream-200 text-xs text-ink-700 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 font-semibold text-ink-900">
              <span>Hỗ trợ đa nền tảng:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-[11px] font-bold text-emerald-800">WordPress</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-[11px] font-bold text-blue-800">WikiCV / WikiDich</span>
              <span className="px-2 py-0.5 rounded bg-orange-100 text-[11px] font-bold text-orange-800">Wattpad</span>
              <span className="px-2 py-0.5 rounded bg-purple-100 text-[11px] font-bold text-purple-800">Canva Sites</span>
            </div>
            <p className="text-[11px] text-ink-500 leading-relaxed">
              Tự động phân tích mục lục chương, chuẩn hóa văn bản tiếng Việt và lưu trọn vẹn vào 1 slot bộ nhớ cục bộ để đọc offline.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="space-y-1.5">
              <div className="relative">
                <Globe className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Dán link truyện hoặc chương (WordPress, WikiCV, Wattpad, Canva)..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-ink-50 border border-ink-200 text-xs sm:text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <span className="text-[11px] text-ink-400 block pl-1">
                Chỉ nhập nội dung công khai. Lily không hỗ trợ website yêu cầu đăng nhập hoặc trả phí.
              </span>
            </div>

            {/* Test Presets Quick Bar */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-ink-400 tracking-wider block">Link mẫu thử nghiệm:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setUrlInput('https://kemchanhlemontang.wordpress.com/')}
                  className="px-2.5 py-1 rounded-xl bg-ink-100/80 hover:bg-emerald-100 hover:text-emerald-900 text-[11px] font-medium text-ink-700 transition-colors"
                >
                  WP: Kem Chanh
                </button>
                <button
                  type="button"
                  onClick={() => setUrlInput('https://kieuduong29.wordpress.com/')}
                  className="px-2.5 py-1 rounded-xl bg-ink-100/80 hover:bg-emerald-100 hover:text-emerald-900 text-[11px] font-medium text-ink-700 transition-colors"
                >
                  WP: Kiều Dương (62 truyện)
                </button>
                <button
                  type="button"
                  onClick={() => setUrlInput('https://vongtinhgiang.wordpress.com/')}
                  className="px-2.5 py-1 rounded-xl bg-ink-100/80 hover:bg-emerald-100 hover:text-emerald-900 text-[11px] font-medium text-ink-700 transition-colors"
                >
                  WP: Vọng Tình Giang
                </button>
                <button
                  type="button"
                  onClick={() => setUrlInput('https://wikicv.org/truyen/khi-ta-sau-khi-chet-nu-chu-bat-dau-noi-d-aj_ZmvTaECu4iVlQ')}
                  className="px-2.5 py-1 rounded-xl bg-ink-100/80 hover:bg-blue-100 hover:text-blue-900 text-[11px] font-medium text-ink-700 transition-colors"
                >
                  WikiCV: Khi Ta Sau Khi Chết
                </button>
                <button
                  type="button"
                  onClick={() => setUrlInput('https://www.wattpad.com/story/415176367')}
                  className="px-2.5 py-1 rounded-xl bg-ink-100/80 hover:bg-orange-100 hover:text-orange-900 text-[11px] font-medium text-ink-700 transition-colors"
                >
                  Wattpad: Xuyên Thành Tra A
                </button>
                <button
                  type="button"
                  onClick={() => setUrlInput('https://adachisensei.my.canva.site/')}
                  className="px-2.5 py-1 rounded-xl bg-ink-100/80 hover:bg-purple-100 hover:text-purple-900 text-[11px] font-medium text-ink-700 transition-colors"
                >
                  Canva: Adachi Stories
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={!urlInput.trim()}
                className="px-6 py-2.5 rounded-2xl bg-ink-950 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
              >
                <Search className="w-4 h-4" />
                <span>Phân tích</span>
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

          <div className="space-y-1">
            <h2 className="font-serif font-bold text-xl text-ink-950">
              Đã tìm thấy {analysisResult.candidateBooks.length} truyện
            </h2>
            <p className="text-xs text-ink-500">
              Website này chứa nhiều tác phẩm khác nhau. Hãy chọn truyện bạn muốn đưa vào Lily:
            </p>
          </div>

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
                onClick={() => setupPreview(cand)}
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
                      <span className="font-semibold text-emerald-800">{cand.totalChapters} chương</span>
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
              <FormatBadge format="WEBSITE" />
              <LocalBadge />
            </div>
          </div>

          {/* Book Meta Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
            <div className="flex flex-col items-center gap-3">
              <BookCover
                title={bookTitle || selectedCandidate.title}
                author={bookAuthor || selectedCandidate.author || 'Tác giả'}
                coverColor={coverColor}
                coverUrl={coverUrl}
                size="lg"
                format="WEBSITE"
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
              className="px-6 py-2.5 rounded-2xl bg-ink-950 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
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
              Đã tải thành công {fetchProgress?.completedCount || 0} chương. Bạn có thể thử tải lại các chương bị lỗi hoặc lưu các chương đã hoàn tất.
            </p>
          </div>

          <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-[11px] leading-relaxed flex items-start gap-2">
            <span className="font-bold shrink-0">💡 Mẹo:</span>
            <span>
              Một số website truyện (như WikiCV/Cloudflare) có hệ thống giới hạn tốc độ khi tải nhiều chương liên tục. Bạn chỉ cần bấm <strong>"Thử lại ... chương"</strong> phía dưới để tiếp tục tải nốt các chương còn lại (các chương đã tải trước đó sẽ được tự động giữ nguyên và gộp vào sách).
            </span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl max-h-36 overflow-y-auto text-xs space-y-1">
            {failedChapters.map((fc, i) => (
              <div key={i} className="flex items-center justify-between text-amber-950">
                <span className="truncate">{fc.title}</span>
                <span className="text-[10px] text-rose-600 shrink-0 font-medium">{fc.error || 'Lỗi mạng / Rate limit'}</span>
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
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl bg-ink-950 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center gap-1.5"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Lưu {fetchProgress?.completedCount || 0} chương đã tải</span>
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
