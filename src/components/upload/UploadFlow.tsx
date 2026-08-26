import React, { useState, useRef } from 'react';
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
  FileQuestion,
  ShieldCheck,
  Info,
  Link as LinkIcon,
  Globe,
  ChevronRight,
  ArrowRight,
  Download,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BookCover } from '../common/BookCover';
import { LocalBadge, CloudBadge, FormatBadge } from '../common/Badges';
import { BookImporter } from '../../book-engine/importers';
import { ParsedBookDraft, SupportedFormat } from '../../book-engine/types';

type UploadStep = 'upload' | 'processing' | 'preview' | 'success';
type InputTab = 'file' | 'url';

export const UploadFlow: React.FC = () => {
  const { 
    user, 
    books, 
    addParsedBook, 
    navigateTo, 
    showToast, 
    openUpgradeModal, 
    isSlotFull, 
    maxLocalSlots 
  } = useApp();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<UploadStep>('upload');
  const [inputTab, setInputTab] = useState<InputTab>('file');
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAppleHelp, setShowAppleHelp] = useState(false);

  // URL Import State
  const [urlInput, setUrlInput] = useState('');
  const [isDownloadingUrl, setIsDownloadingUrl] = useState(false);
  const [urlDownloadProgress, setUrlDownloadProgress] = useState<number | null>(null);
  const [urlDownloadedBytes, setUrlDownloadedBytes] = useState<number>(0);

  // Parsed Draft State
  const [parsedDraft, setParsedDraft] = useState<ParsedBookDraft | null>(null);
  
  // Editable Preview Meta
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [coverColor, setCoverColor] = useState('#D9829B');
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  // Real Processing Checklist State
  const [progress, setProgress] = useState(0);
  const [checklist, setChecklist] = useState({
    readFile: false,
    cleanText: false,
    detectChapters: false,
    prepareReader: false,
  });

  // Handle Real File Selection
  const handleFileSelected = async (file: File) => {
    if (!file) return;

    if (isSlotFull && user.tier === 'free') {
      showToast(`Bạn đã dùng hết ${maxLocalSlots}/${maxLocalSlots} slot. Hãy xóa bớt truyện cũ trước.`, 'error');
      return;
    }

    setErrorMessage(null);
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
      setErrorMessage(err.message || 'Không thể đọc file này. Vui lòng kiểm tra định dạng TXT, EPUB hoặc DOCX.');
      setStep('upload');
      showToast(err.message || 'Lỗi đọc tệp', 'error');
    }
  };

  // Handle Import from URL (100% Browser-Side direct fetch with security validation)
  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawUrl = urlInput.trim();
    if (!rawUrl) return;

    if (isSlotFull && user.tier === 'free') {
      showToast(`Bạn đã dùng hết ${maxLocalSlots}/${maxLocalSlots} slot. Hãy xóa bớt truyện cũ trước.`, 'error');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrorMessage('Bạn đang ngoại tuyến. Vui lòng kết nối mạng để tải file từ liên kết.');
      return;
    }

    // 1. URL Scheme & Security Validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      setErrorMessage('Địa chỉ liên kết không hợp lệ. Hãy nhập URL đầy đủ (ví dụ: https://example.com/truyen.epub).');
      return;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      setErrorMessage('Giao thức liên kết không an toàn. Lily chỉ hỗ trợ liên kết http: và https:.');
      return;
    }

    // 2. Google Drive Detection
    if (parsedUrl.hostname.includes('drive.google.com') || parsedUrl.hostname.includes('docs.google.com')) {
      setErrorMessage('Liên kết Google Drive không cho phép tải trực tiếp qua trình duyệt vì yêu cầu xác thực. Hãy mở Drive, tải file về máy (Tệp / Downloads), rồi dùng tùy chọn "Chọn file từ thiết bị".');
      return;
    }

    // 3. Start Browser-side direct download
    setIsDownloadingUrl(true);
    setErrorMessage(null);
    setUrlDownloadProgress(null);
    setUrlDownloadedBytes(0);

    try {
      const response = await fetch(parsedUrl.toString(), { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Trang nguồn trả về lỗi (HTTP ${response.status}). Vui lòng kiểm tra lại liên kết.`);
      }

      // 4. Validate Response Content-Type (Reject HTML pages / login walls)
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
        throw new Error('Liên kết trả về trang web thay vì file truyện. Hãy tải file truyện về máy trước rồi chọn file trong Lily.');
      }

      // 5. File size limits
      const contentLengthHeader = response.headers.get('content-length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;
      const MAX_SIZE = 50 * 1024 * 1024; // 50MB safe local limit

      if (totalBytes && totalBytes > MAX_SIZE) {
        throw new Error(`File truyện quá lớn (${(totalBytes / (1024 * 1024)).toFixed(1)} MB). Lily Free hỗ trợ file dưới 50MB để đảm bảo hiệu năng thiết bị.`);
      }

      // 6. Stream Body with Real Progress
      if (!response.body) {
        throw new Error('Không nhận được dữ liệu từ liên kết này.');
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          receivedBytes += value.length;
          if (receivedBytes > MAX_SIZE) {
            reader.cancel();
            throw new Error('Dung lượng tải vượt quá 50MB.');
          }
          chunks.push(value);
          setUrlDownloadedBytes(receivedBytes);
          if (totalBytes && totalBytes > 0) {
            setUrlDownloadProgress(Math.round((receivedBytes / totalBytes) * 100));
          }
        }
      }

      // 7. Resolve File Name and Extension
      let fileName = 'truyen_tai_ve';
      const disposition = response.headers.get('content-disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          fileName = match[1].replace(/['"]/g, '').trim();
        }
      } else {
        const pathname = parsedUrl.pathname;
        const lastPart = pathname.substring(pathname.lastIndexOf('/') + 1);
        if (lastPart && (lastPart.endsWith('.epub') || lastPart.endsWith('.docx') || lastPart.endsWith('.txt'))) {
          fileName = decodeURIComponent(lastPart);
        }
      }

      const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
      if (!ext || !['txt', 'epub', 'docx'].includes(ext)) {
        if (contentType.includes('epub')) fileName += '.epub';
        else if (contentType.includes('wordprocessingml') || contentType.includes('docx')) fileName += '.docx';
        else if (contentType.includes('text/plain')) fileName += '.txt';
        else {
          throw new Error('Không xác định được định dạng file truyện từ liên kết này. Lily hỗ trợ file .epub, .docx, .txt.');
        }
      }

      const blob = new Blob(chunks, { type: contentType || 'application/octet-stream' });
      const downloadedFile = new File([blob], fileName, { type: contentType || 'application/octet-stream' });

      setIsDownloadingUrl(false);
      // Pipe downloaded file straight into existing BookImporter
      await handleFileSelected(downloadedFile);
    } catch (err: any) {
      setIsDownloadingUrl(false);
      if (err.name === 'TypeError' && err.message && err.message.toLowerCase().includes('fetch')) {
        setErrorMessage('Trang nguồn không cho phép Lily tải file trực tiếp (chặn CORS). Hãy tải file về thiết bị rồi chọn file trong Lily.');
      } else {
        setErrorMessage(err.message || 'Lỗi khi tải file từ liên kết URL.');
      }
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
    if (!parsedDraft) return;

    try {
      setIsSaving(true);
      setVerifyMessage('Đang ghi và xác thực dữ liệu chương vào IndexedDB…');
      
      await addParsedBook(parsedDraft, {
        title: bookTitle.trim() || parsedDraft.title,
        author: bookAuthor.trim() || parsedDraft.author,
        coverColor,
        coverUrl,
      });

      // Request storage persistence safely after first book is added
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
      }

      setStep('success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu sách', 'error');
      setErrorMessage(err.message || 'Lỗi khi lưu sách vào IndexedDB');
    } finally {
      setIsSaving(false);
      setVerifyMessage(null);
    }
  };

  // Sample Mock Creator (Only enabled in DEV mode)
  const handleCreateMockSample = (sampleType: 'dai_vu_10' | 'van_dai_200' | 'ngan_nam') => {
    let mockContent = '';
    let mockName = '';

    if (sampleType === 'dai_vu_10') {
      mockName = 'Truong_An_Da_Vu_10_Chuong.txt';
      mockContent = `Tựa đề: Trường An Dạ Vũ
Tác giả: Mặc Hương Đồng Khứ

Chương 1: Đêm Trường An mưa bụi
Mưa rả rích rơi trên những mái ngói rêu phong của Trường An. Đêm đã khuya, tiếng chuông chùa xa xa vọng lại từng hồi trầm mặc.

Chương 2: Tiếng tiêu ngoài quan ải
Gió tuyết biên cương thổi rát mặt người lữ khách. Tiếng tiêu vang lên nức nở giữa thảo nguyên hoang vắng.

Chương 3 - Trăm năm bình yên
Mọi bão giông giang hồ cuối cùng cũng dừng lại trước hiên nhà nhỏ nơi ngoại thành.`;
    } else if (sampleType === 'van_dai_200') {
      mockName = 'Bo_Truyen_200_Chuong_Dai.txt';
      let content = 'Tựa đề: Bách Niên Tiên Lộ (200 Chương)\nTác giả: Vong Ngữ\n\n';
      for (let i = 1; i <= 200; i++) {
        content += `Chương ${i}: Diễn biến kỳ ${i} trên tiên lộ\nĐạo hữu bước vào cảnh giới mới, phong vân biến sắc.\n\n`;
      }
      mockContent = content;
    } else {
      mockName = 'Doan_Van_Khong_Chuong.txt';
      mockContent = `Đây là một đoạn văn tự sự ngắn hoàn toàn không chứa bất kỳ tiêu đề chương mẫu nào.
Lily sẽ tự động nhận diện và phân tích theo cơ chế Single Chapter Fallback.`;
    }

    const blob = new Blob([mockContent], { type: 'text/plain;charset=utf-8' });
    const file = new File([blob], mockName, { type: 'text/plain' });
    handleFileSelected(file);
  };

  const isDevEnvironment = typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV);

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
            <h1 className="font-serif font-bold text-2xl md:text-3xl text-ink-950">
              Thêm truyện vào thư viện
            </h1>
            <p className="text-xs md:text-sm text-ink-600 mt-1 max-w-md mx-auto">
              Đưa file truyện cá nhân của bạn vào Lily để lưu trữ và đọc trên thiết bị này.
            </p>
          </div>

          {/* Storage / Slot Alert */}
          {user.tier === 'free' ? (
            <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
              isSlotFull 
                ? 'bg-amber-50 border-amber-300 text-amber-950' 
                : 'bg-cream-100/80 border-cream-200 text-ink-700'
            }`}>
              <div className="flex items-center gap-2.5">
                <HardDrive className={`w-5 h-5 shrink-0 ${isSlotFull ? 'text-amber-600' : 'text-ink-500'}`} />
                <div>
                  <span className="font-semibold text-ink-900">
                    Gói Free Local: {books.length} / {maxLocalSlots} slot
                  </span>
                  <span className="block text-[11px] text-ink-500 mt-0.5">
                    {isSlotFull 
                      ? '⚠️ Bạn đã dùng hết 3 slot. Hãy xóa 1 truyện cũ trong thư viện để nạp truyện mới.'
                      : 'Truyện được lưu trên thiết bị này. Xóa dữ liệu trang web có thể xóa thư viện Local.'}
                  </span>
                </div>
              </div>
              
              {isSlotFull ? (
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
          ) : (
            <div className="p-4 rounded-2xl bg-lily-50/70 border border-lily-200/80 text-xs text-lily-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-lily-600 shrink-0" />
                <div>
                  <span className="font-semibold text-lily-950">Lily VIP:</span> Không giới hạn số lượng truyện.
                  <span className="block text-[11px] text-lily-700/80 mt-0.5">
                    Tự động đồng bộ tiến độ đọc và lưu trữ an toàn.
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-bold text-emerald-700 px-2 py-0.5 rounded bg-emerald-100">
                ☁ Cloud Active
              </span>
            </div>
          )}

          {/* Error Banner if any */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Input Method Switcher Tabs */}
          <div className="flex p-1 bg-ink-100/70 rounded-2xl max-w-sm mx-auto text-xs font-semibold">
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
              <span>Chọn file trên máy</span>
            </button>

            <button
              type="button"
              onClick={() => setInputTab('url')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                inputTab === 'url'
                  ? 'bg-white text-ink-950 shadow-xs'
                  : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Nhập từ liên kết (URL)</span>
            </button>
          </div>

          {/* TAB 1: FILE PICKER & DROPZONE */}
          {inputTab === 'file' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (isSlotFull && user.tier === 'free') {
                  showToast(`Bạn đã dùng hết ${maxLocalSlots}/${maxLocalSlots} slot. Hãy xóa bớt truyện cũ trước.`, 'error');
                  return;
                }
                fileInputRef.current?.click();
              }}
              className={`border-2 border-dashed rounded-3xl p-8 md:p-12 text-center transition-all bg-white flex flex-col items-center justify-center cursor-pointer ${
                dragOver 
                  ? 'border-lily-500 bg-lily-50/60 scale-[1.01]' 
                  : isSlotFull 
                  ? 'border-ink-200 opacity-80' 
                  : 'border-ink-200 hover:border-lily-400 hover:bg-cream-50/40'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-cream-100 text-lily-600 flex items-center justify-center mb-4 shadow-soft">
                <UploadCloud className="w-8 h-8 stroke-[1.5]" />
              </div>

              <h3 className="font-serif font-bold text-lg text-ink-950 mb-1">
                {isSlotFull ? 'Thư viện đã đầy 3 slot' : 'Chọn file từ thiết bị của bạn'}
              </h3>
              <p className="text-xs text-ink-500 mb-5 max-w-xs leading-relaxed">
                {isSlotFull 
                  ? 'Xóa bớt truyện trong thư viện để tiếp tục thêm file mới'
                  : 'Chạm để duyệt tệp hoặc kéo thả file TXT, EPUB, DOCX vào đây'}
              </p>

              <div className="flex items-center gap-2 mb-6">
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-ink-100 text-ink-700">TXT</span>
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-lily-100 text-lily-800">EPUB</span>
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-800">DOCX</span>
              </div>

              <button
                type="button"
                disabled={isSlotFull && user.tier === 'free'}
                className="px-6 py-2.5 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft transition-all disabled:opacity-40"
              >
                + Duyệt tệp trên máy
              </button>
            </div>
          )}

          {/* TAB 2: IMPORT FROM URL */}
          {inputTab === 'url' && (
            <div className="bg-white border border-ink-100 rounded-3xl p-6 sm:p-8 shadow-soft space-y-4">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-base text-ink-950 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-lily-600" />
                  <span>Tải trực tiếp từ liên kết công khai</span>
                </h3>
                <p className="text-xs text-ink-500 leading-relaxed">
                  Nhập địa chỉ tải trực tiếp file truyện (hỗ trợ .epub, .docx, .txt). Lily sẽ tải và lưu trực tiếp vào bộ nhớ thiết bị.
                </p>
              </div>

              <form onSubmit={handleUrlImport} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/truyen.epub"
                      disabled={isDownloadingUrl}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-ink-50 border border-ink-200 text-xs sm:text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-lily-500/20 disabled:opacity-50"
                    />
                  </div>
                  <span className="text-[11px] text-ink-400 block pl-1">
                    Chỉ hỗ trợ liên kết bảo mật (https:// hoặc http://). Không hỗ trợ file cần đăng nhập hoặc link Google Drive.
                  </span>
                </div>

                {isDownloadingUrl ? (
                  <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200 space-y-2 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-lily-900">
                      <Loader2 className="w-4 h-4 animate-spin text-lily-600" />
                      <span>
                        {urlDownloadProgress !== null 
                          ? `Đang tải: ${urlDownloadProgress}% (${(urlDownloadedBytes / (1024 * 1024)).toFixed(1)} MB)`
                          : `Đang tải dữ liệu: ${(urlDownloadedBytes / (1024 * 1024)).toFixed(1)} MB...`}
                      </span>
                    </div>
                    {urlDownloadProgress !== null && (
                      <div className="w-full h-1.5 bg-ink-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-lily-600 rounded-full transition-all duration-200"
                          style={{ width: `${urlDownloadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={!urlInput.trim() || (isSlotFull && user.tier === 'free')}
                    className="w-full py-2.5 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải & Đưa vào Lily</span>
                  </button>
                )}
              </form>
            </div>
          )}

          {/* iPhone / iPad Help Card */}
          <div className="bg-white/80 border border-ink-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-soft space-y-3">
            <button
              type="button"
              onClick={() => setShowAppleHelp(!showAppleHelp)}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">🍎</span>
                <div>
                  <span className="font-serif font-bold text-xs sm:text-sm text-ink-950 group-hover:text-lily-800 transition-colors">
                    Truyện đang ở Apple Books hoặc ứng dụng khác?
                  </span>
                  <p className="text-[11px] text-ink-500">Xem cách chuyển file vào ứng dụng Tệp (Files) trên iPhone / iPad</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-ink-400 transition-transform ${showAppleHelp ? 'rotate-90' : ''}`} />
            </button>

            {showAppleHelp && (
              <div className="pt-2 border-t border-ink-100/70 text-xs text-ink-700 space-y-3 animate-in fade-in duration-200">
                <p className="leading-relaxed text-ink-600 bg-cream-50/80 p-3 rounded-xl border border-cream-200/80">
                  Lily không thể tự truy cập trực tiếp vào thư viện Apple Books. Nếu sách/file của bạn cho phép chia sẻ hoặc xuất, hãy lưu file vào ứng dụng <strong>Tệp (Files)</strong> rồi chọn nó trong Lily.
                </p>
                <div className="space-y-1.5 pl-1">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-lily-100 text-lily-800 font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                    <span>Mở ứng dụng hoặc nguồn chứa file truyện.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-lily-100 text-lily-800 font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                    <span>Bấm nút <strong>Chia sẻ</strong> (Share).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-lily-100 text-lily-800 font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                    <span>Chọn <strong>Lưu vào Tệp</strong> (Save to Files).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-lily-100 text-lily-800 font-bold text-[11px] flex items-center justify-center shrink-0">4</span>
                    <span>Quay lại Lily.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-lily-100 text-lily-800 font-bold text-[11px] flex items-center justify-center shrink-0">5</span>
                    <span>Bấm <strong>Thêm truyện</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-lily-100 text-lily-800 font-bold text-[11px] flex items-center justify-center shrink-0">6</span>
                    <span>Chọn file vừa lưu trong ứng dụng Tệp.</span>
                  </div>
                </div>
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
          </div>

          {/* Quick Mock Sample Presets (DEV ONLY - Never rendered in production build) */}
          {isDevEnvironment && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-3xl p-4 shadow-soft">
              <h4 className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🛠️ Dev Test Samples (Chỉ hiển thị môi trường phát triển):</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateMockSample('dai_vu_10')}
                  className="p-2.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-200 text-left text-xs transition-colors"
                >
                  <div className="font-bold text-ink-900 truncate">Trường An Dạ Vũ</div>
                  <div className="text-[10px] text-ink-500 mt-0.5">TXT · 10 chương</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateMockSample('van_dai_200')}
                  className="p-2.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-200 text-left text-xs transition-colors"
                >
                  <div className="font-bold text-ink-900 truncate">Bách Niên Tiên Lộ</div>
                  <div className="text-[10px] text-ink-500 mt-0.5">TXT · 200 chương</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateMockSample('ngan_nam')}
                  className="p-2.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-200 text-left text-xs transition-colors"
                >
                  <div className="font-bold text-ink-900 truncate">Đoạn văn không chương</div>
                  <div className="text-[10px] text-ink-500 mt-0.5">TXT · 1 chương</div>
                </button>
              </div>
            </div>
          )}
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
                  <span>{verifyMessage || 'Đang lưu vào IndexedDB…'}</span>
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
