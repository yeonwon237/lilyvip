import React, { useEffect, useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft, 
  BookOpen, 
  Edit3, 
  Sparkles,
  HardDrive,
  Cloud,
  Check,
  RotateCcw,
  AlertTriangle,
  Globe,
  ChevronRight,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BookCover } from '../common/BookCover';
import { InfoTip } from '../common/InfoTip';
import { LocalBadge, CloudBadge, FormatBadge } from '../common/Badges';
import { BookImporter } from '../../book-engine/importers';
import { ParsedBookDraft, SupportedFormat } from '../../book-engine/types';
import { BookSourceMeta } from '../../types';
import { WebsiteImportFlow } from './WebsiteImportFlow';
import { LilyHubImportFlow } from './LilyHubImportFlow';

type UploadStep = 'upload' | 'processing' | 'preview' | 'success';
type InputTab = 'lilyhub' | 'file' | 'website';

export const UploadFlow: React.FC = () => {
  const { 
    user,
    books, 
    addParsedBook, 
    navigateTo, 
    showToast, 
    openUpgradeModal,
    libraryLimits,
    lilyHubSlotsUsed,
    externalSlotsUsed,
    canAddBookFrom,
    getSlotError,
    maxLocalSlots 
  } = useApp();
  const isExternalSlotFull = !canAddBookFrom('external');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<UploadStep>('upload');
  const [inputTab, setInputTab] = useState<InputTab>('file');
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAppleHelp, setShowAppleHelp] = useState(false);

  // Parsed Draft State
  const [parsedDraft, setParsedDraft] = useState<ParsedBookDraft | null>(null);
  const [importSource, setImportSource] = useState<BookSourceMeta | undefined>(undefined);
  
  // Editable Preview Meta
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [coverColor, setCoverColor] = useState('#D9829B');
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('novel')) setInputTab('lilyhub');
  }, []);

  // Real Processing Checklist State
  const [progress, setProgress] = useState(0);
  const [checklist, setChecklist] = useState({
    readFile: false,
    cleanText: false,
    detectChapters: false,
    prepareReader: false,
  });

  // Handle Real File Selection
  const handleFileSelected = async (file: File, source?: BookSourceMeta) => {
    if (!file) return;

    if (isExternalSlotFull) {
      showToast(getSlotError('external') || 'Không còn slot tải truyện.', 'error');
      return;
    }

    setErrorMessage(null);
    setImportSource(source);
    setVerifyMessage(null);
    setStep('processing');
    setProgress(15);
    setChecklist({
      readFile: false,
      cleanText: false,
      detectChapters: false,
      prepareReader: false,
    });

    try {
      // Step 1: Read File
      setChecklist(prev => ({ ...prev, readFile: true }));
      setProgress(30);
      await new Promise(r => setTimeout(r, 100));

      // Step 2: Clean text
      setChecklist(prev => ({ ...prev, cleanText: true }));
      setProgress(60);

      // Step 3: Run real importer and chapter detection
      const draft = await BookImporter.parse(file);
      setChecklist(prev => ({ ...prev, detectChapters: true }));
      setProgress(85);
      await new Promise(r => setTimeout(r, 100));

      // Step 4: Prepare Reader preview
      setChecklist(prev => ({ ...prev, prepareReader: true }));
      setProgress(100);
      await new Promise(r => setTimeout(r, 100));

      setParsedDraft(draft);
      setBookTitle(draft.title);
      setBookAuthor(draft.author);
      setCoverColor(draft.suggestedCoverColor);
      setCoverUrl(draft.coverUrl);
      setStep('preview');
    } catch (err: any) {
      console.error('[Lily import] Không thể đọc file:', err);
      setErrorMessage('Lily chưa thể đọc file này. Hãy kiểm tra file TXT, EPUB hoặc DOCX rồi thử lại.');
      setStep('upload');
      showToast('Không thể đọc file truyện.', 'error');
    }
  };

  // Drag & Drop Handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
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

  // Confirm and Save to IndexedDB with Post-Save Verification
  const handleConfirmAdd = async () => {
    if (!parsedDraft || savingRef.current) return;
    savingRef.current = true;

    try {
      setIsSaving(true);
      setVerifyMessage('Đang ghi và xác thực dữ liệu chương vào IndexedDB…');
      
      await addParsedBook(parsedDraft, {
        title: bookTitle.trim() || parsedDraft.title,
        author: bookAuthor.trim() || parsedDraft.author,
        coverColor,
        coverUrl,
        source: importSource,
      });

      // Request storage persistence safely after first book is added
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
      }

      setParsedDraft(null);
      setStep('success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu sách', 'error');
      setErrorMessage(err.message || 'Lỗi khi lưu sách vào IndexedDB');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
      setVerifyMessage(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-2">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.epub,.docx,text/plain,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileSelected(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* STATE 1: UPLOAD & DROPZONE */}
      {step === 'upload' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="font-serif font-bold text-2xl md:text-3xl text-ink-950">
              Thêm truyện vào thư viện
              </h1>
              <InfoTip align="right">Nhập từ Lilyhub, file trên thiết bị hoặc một website công khai. Truyện được lưu trên thiết bị để đọc ngoại tuyến.</InfoTip>
            </div>
            <p className="mt-1 text-xs text-ink-500">Chọn nguồn</p>
          </div>

          {/* Storage / Slot Alert */}
          <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
              isExternalSlotFull
                ? 'bg-amber-50 border-amber-300 text-amber-950' 
                : 'bg-cream-100/80 border-cream-200 text-ink-700'
            }`}>
              <div className="flex items-center gap-2.5">
                <HardDrive className={`w-5 h-5 shrink-0 ${isExternalSlotFull ? 'text-amber-600' : 'text-ink-500'}`} />
                <div>
                  <span className="font-semibold text-ink-900">
                    {books.length}/{maxLocalSlots} truyện trên thiết bị
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-500">LilyHub {lilyHubSlotsUsed}/{libraryLimits.lilyhub} · Thiết bị & website {externalSlotsUsed}/{libraryLimits.external}</span>
                </div>
              </div>
              
              {isExternalSlotFull ? (
                <button
                  onClick={() => navigateTo('library')}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-ink-900 text-white font-semibold text-xs"
                >
                  Xóa bớt
                </button>
              ) : (
                <button
                  onClick={() => openUpgradeModal('Lily VIP Cloud Sync')}
                  className="shrink-0 px-2.5 py-1 text-xs font-semibold text-lily-700 hover:text-lily-900 underline"
                >
                  Lên VIP
                </button>
              )}
          </div>

          {/* Error Banner if any */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Input Method Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-ink-100/70 rounded-2xl max-w-2xl mx-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setInputTab('lilyhub')}
              className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                inputTab === 'lilyhub' ? 'bg-white text-lily-900 shadow-xs' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-lily-600" />
              <span>Lilyhub</span>
            </button>
            <button
              type="button"
              onClick={() => setInputTab('file')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                inputTab === 'file'
                  ? 'bg-white text-ink-950 shadow-xs'
                  : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Từ thiết bị</span>
            </button>

            <button
              type="button"
              onClick={() => setInputTab('website')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                inputTab === 'website'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>Từ website</span>
            </button>

          </div>

          {/* TAB 0: WEBSITE IMPORT FLOW */}
          {inputTab === 'lilyhub' && <LilyHubImportFlow />}

          {inputTab === 'website' && (
            <WebsiteImportFlow onBackToPicker={() => setInputTab('file')} />
          )}

          {/* TAB 1: FILE PICKER & DROPZONE */}
          {inputTab === 'file' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (isExternalSlotFull) {
                  showToast(getSlotError('external') || 'Không còn slot tải truyện.', 'error');
                  return;
                }
                fileInputRef.current?.click();
              }}
              className={`border-2 border-dashed rounded-3xl p-8 md:p-12 text-center transition-all bg-white flex flex-col items-center justify-center cursor-pointer ${
                dragOver 
                  ? 'border-lily-500 bg-lily-50/60 scale-[1.01]' 
                  : isExternalSlotFull
                  ? 'border-ink-200 opacity-80' 
                  : 'border-ink-200 hover:border-lily-400 hover:bg-cream-50/40'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-cream-100 text-lily-600 flex items-center justify-center mb-4 shadow-soft">
                <UploadCloud className="w-8 h-8 stroke-[1.5]" />
              </div>

              <h3 className="font-serif font-bold text-lg text-ink-950 mb-1">
                {isExternalSlotFull ? 'Đã dùng hết slot tải truyện' : 'Chọn file truyện'}
              </h3>
              <p className="text-xs text-ink-500 mb-5 max-w-xs leading-relaxed">
                {isExternalSlotFull
                  ? 'Xóa bớt truyện để tiếp tục'
                  : 'TXT, EPUB hoặc DOCX'}
              </p>

              <button
                type="button"
                disabled={isExternalSlotFull}
                className="px-6 py-2.5 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft transition-all disabled:opacity-40 flex items-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                Chọn file
              </button>
            </div>
          )}

          {/* iPhone / iPad Help Card */}
          {inputTab === 'file' && <div className="bg-white/80 border border-ink-100 rounded-2xl p-4 shadow-soft space-y-3">
            <button
              type="button"
              onClick={() => setShowAppleHelp(!showAppleHelp)}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-ink-500" />
                <div>
                  <span className="font-serif font-bold text-xs sm:text-sm text-ink-950 group-hover:text-lily-800 transition-colors">
                    Nhập từ Apple Books
                  </span>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-ink-400 transition-transform ${showAppleHelp ? 'rotate-90' : ''}`} />
            </button>

            {showAppleHelp && (
              <div className="pt-2 border-t border-ink-100/70 text-xs text-ink-700 space-y-3 animate-in fade-in duration-200">
                <p className="leading-relaxed text-ink-600">Trong Apple Books, chọn <strong>Chia sẻ → Lưu vào Tệp</strong>, rồi chọn file đó trong Lily.</p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-ink-950 hover:bg-ink-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <span>Chọn file ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>}

        </div>
      )}

      {/* STATE 2: PROCESSING CHECKLIST */}
      {step === 'processing' && (
        <div className="bg-white border border-ink-100 rounded-3xl p-8 shadow-card text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-lily-100 text-lily-600 flex items-center justify-center mx-auto shadow-soft">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>

          <div>
            <h2 className="font-serif font-bold text-xl text-ink-950">
              Đang chuẩn bị truyện…
            </h2>
            <p className="text-xs text-ink-500 mt-1">
              Lily đang phân tích cấu trúc chương và tối ưu typography cho máy đọc sách
            </p>
          </div>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full bg-gradient-to-r from-lily-500 to-lavender-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-right text-xs font-mono text-ink-500">{progress}%</div>
          </div>

          {/* Checklist Animation */}
          <div className="max-w-sm mx-auto text-left space-y-3 bg-cream-50/70 p-4 rounded-2xl border border-cream-200">
            <div className="flex items-center gap-2.5 text-xs">
              {checklist.readFile ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-ink-300 animate-pulse shrink-0" />
              )}
              <span className={checklist.readFile ? 'text-ink-900 font-medium' : 'text-ink-400'}>
                Đọc & phát hiện encoding tệp
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              {checklist.cleanText ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-ink-300 animate-pulse shrink-0" />
              )}
              <span className={checklist.cleanText ? 'text-ink-900 font-medium' : 'text-ink-400'}>
                Lọc quảng cáo & dấu ngăn cách thừa
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              {checklist.detectChapters ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-ink-300 animate-pulse shrink-0" />
              )}
              <span className={checklist.detectChapters ? 'text-ink-900 font-medium' : 'text-ink-400'}>
                Phân tích cấu trúc tiêu đề chương
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              {checklist.prepareReader ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-ink-300 animate-pulse shrink-0" />
              )}
              <span className={checklist.prepareReader ? 'text-ink-900 font-medium' : 'text-ink-400'}>
                Sẵn sàng bản xem trước Reader
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: PREVIEW & VERIFICATION */}
      {step === 'preview' && parsedDraft && (
        <div className="bg-white border border-ink-100 rounded-3xl p-6 md:p-8 shadow-card space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-ink-100 pb-4">
            <div className="flex items-center gap-2 text-xs text-ink-500">
              <button
                onClick={() => setStep('upload')}
                className="hover:text-ink-900 flex items-center gap-1 font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Chọn lại file khác</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <FormatBadge format={parsedDraft.fileFormat} />
              <LocalBadge />
            </div>
          </div>

          {/* Book Details Editor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
            {/* Custom Cover Preview & Upload Button */}
            <div className="flex flex-col items-center gap-3">
              <BookCover
                title={bookTitle || parsedDraft.title}
                author={bookAuthor || parsedDraft.author}
                coverColor={coverColor}
                coverUrl={coverUrl}
                size="lg"
                format={parsedDraft.fileFormat}
              />
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
              <button
                type="button"
                onClick={() => coverFileInputRef.current?.click()}
                className="text-xs text-lily-800 hover:text-lily-950 font-medium underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Đổi ảnh bìa tùy chỉnh</span>
              </button>
            </div>

            {/* Meta input fields */}
            <div className="sm:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Tựa đề tác phẩm
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Nhập tên truyện..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-ink-50 border border-ink-200 text-sm font-medium text-ink-900 focus:outline-none focus:ring-2 focus:ring-lily-500/20"
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
                  placeholder="Khuyết danh / Tác giả..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-ink-50 border border-ink-200 text-sm font-medium text-ink-900 focus:outline-none focus:ring-2 focus:ring-lily-500/20"
                />
              </div>

              {/* Parsing stats */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-cream-50/80 rounded-2xl border border-cream-200/80 text-center">
                <div>
                  <span className="text-[10px] text-ink-400 block">Số chương</span>
                  <span className="font-serif font-bold text-sm text-ink-900">{parsedDraft.totalChapters}</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Tổng số từ</span>
                  <span className="font-mono font-bold text-sm text-ink-900">~{parsedDraft.wordCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Dung lượng</span>
                  <span className="font-mono font-bold text-sm text-ink-900">{parsedDraft.fileSizeMB} MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* First Chapter Excerpt Preview */}
          <div className="space-y-2 pt-2 border-t border-ink-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-700 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-lily-600" />
                <span>Trích đoạn chương 1 ({parsedDraft.chapters[0]?.title || 'Chương 1'}):</span>
              </span>
              <span className="text-[11px] text-ink-400">
                {parsedDraft.chapters[0]?.paragraphs?.length || 0} đoạn văn
              </span>
            </div>
            
            <div className="p-4 rounded-2xl bg-cream-50/60 border border-cream-200 max-h-48 overflow-y-auto text-xs text-ink-800 leading-relaxed font-serif space-y-2 italic">
              {parsedDraft.chapters[0]?.paragraphs?.slice(0, 4).map((p, idx) => (
                <p key={idx} className="indent-4">{p}</p>
              ))}
              {(parsedDraft.chapters[0]?.paragraphs?.length || 0) > 4 && (
                <p className="text-ink-400 text-center not-italic pt-1 font-sans">
                  … và còn {parsedDraft.chapters[0].paragraphs.length - 4} đoạn văn tiếp theo
                </p>
              )}
            </div>
          </div>

          {/* Confirm Button */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              onClick={() => setStep('upload')}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-2xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-cream-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleConfirmAdd}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-2xl bg-ink-950 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{verifyMessage || 'Đang đưa truyện vào thư viện…'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Xác nhận & Lưu vào Thư viện</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STATE 4: SUCCESS */}
      {step === 'success' && (
        <div className="bg-white border border-ink-100 rounded-3xl p-8 shadow-card text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-soft">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="font-serif font-bold text-2xl text-ink-950">
              Đã thêm truyện thành công!
            </h2>
            <p className="text-xs text-ink-500 max-w-sm mx-auto">
              "{bookTitle || parsedDraft?.title}" đã được lưu an toàn vào bộ nhớ thiết bị.
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
