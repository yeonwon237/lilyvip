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
  Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BookCover } from '../common/BookCover';
import { LocalBadge, CloudBadge, FormatBadge } from '../common/Badges';
import { BookImporter } from '../../book-engine/importers';
import { ParsedBookDraft, SupportedFormat } from '../../book-engine/types';

type UploadStep = 'upload' | 'processing' | 'preview' | 'success';

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
  const [step, setStep] = useState<UploadStep>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parsed Draft State
  const [parsedDraft, setParsedDraft] = useState<ParsedBookDraft | null>(null);
  
  // Editable Preview Meta
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [coverColor, setCoverColor] = useState('#D9829B');
  const [isSaving, setIsSaving] = useState(false);

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
      setProgress(35);
      await new Promise(r => setTimeout(r, 150));

      // Step 2 & 3: Clean & Parse Chapters
      setChecklist(prev => ({ ...prev, cleanText: true }));
      setProgress(60);
      
      const draft = await BookImporter.parse(file);
      setChecklist(prev => ({ ...prev, detectChapters: true }));
      setProgress(90);
      await new Promise(r => setTimeout(r, 150));

      // Step 4: Prepare Reader Preview
      setChecklist(prev => ({ ...prev, prepareReader: true }));
      setProgress(100);
      await new Promise(r => setTimeout(r, 150));

      setParsedDraft(draft);
      setBookTitle(draft.title);
      setBookAuthor(draft.author);
      setCoverColor(draft.suggestedCoverColor);
      setStep('preview');
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể đọc file này. Vui lòng kiểm tra định dạng TXT, EPUB hoặc DOCX.');
      setStep('upload');
      showToast(err.message || 'Lỗi đọc tệp', 'error');
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

  // Confirm and Save to IndexedDB
  const handleConfirmAdd = async () => {
    if (!parsedDraft) return;

    try {
      setIsSaving(true);
      await addParsedBook(parsedDraft, {
        title: bookTitle.trim() || parsedDraft.title,
        author: bookAuthor.trim() || parsedDraft.author,
        coverColor,
      });
      setStep('success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu sách', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Sample Mock Creator (for fast testing directly in browser if no sample files at hand)
  const handleCreateMockSample = (sampleType: 'dai_vu' | 'xuan_phong' | 'ngan_nam') => {
    let mockContent = '';
    let mockName = '';

    if (sampleType === 'dai_vu') {
      mockName = 'Truong_An_Da_Vu.txt';
      mockContent = `Tựa đề: Trường An Dạ Vũ
Tác giả: Mặc Hương Đồng Khứ

Chương 1: Đêm Trường An mưa bụi
Mưa rả rích rơi trên những mái ngói rêu phong của Trường An. Đêm đã khuya, tiếng chuông chùa xa xa vọng lại từng hồi trầm mặc.
Nàng đứng bên song cửa, đưa tay hứng lấy từng giọt nước mát lạnh. Thế sự xoay vần, người xưa nay đã ở phương trời nào.
"Nếu thời gian có thể quay lại, liệu nàng có hối hận không?"
Tiếng bước chân sau lưng khẽ khàng cất lên, mang theo hơi ấm quen thuộc giữa đêm đông buốt giá.

Chương 2: Tiếng tiêu ngoài quan ải
Gió tuyết biên cương thổi rát mặt người lữ khách. Tiếng tiêu vang lên nức nở giữa thảo nguyên hoang vắng, gợi nhớ về cố hương xa xôi.
Những cánh hoa đào năm ấy dường như vẫn còn vương vấn trong từng ký ức, không cách nào xóa nhòa.

Chương 3: Trăm năm bình yên
Mọi bão giông giang hồ cuối cùng cũng dừng lại trước hiên nhà nhỏ nơi ngoại thành. Dưới gốc hoa lê, hai bóng hình kề vai ngắm hoàng hôn buông xuống.`;
    } else if (sampleType === 'xuan_phong') {
      mockName = 'Xuan_Phong_Qua_Thanh.txt';
      mockContent = `Tác phẩm: Xuân Phong Qua Thành
Tác giả: Cố Tây Tước

Chương 1: Gió xuân thổi qua thành phố
Thành phố đón làn gió xuân ấm áp sau những ngày đông lạnh giá. Những hàng cây bên đường bắt đầu đâm chồi nảy lộc.
Cô bước vào quán cà phê quen thuộc, nơi những giai điệu acoustic nhẹ nhàng đang ngân vang.

Chương 2: Cuộc hội ngộ bất ngờ
Ánh mắt hai người bất chợt chạm nhau giữa dòng người tấp nập. Thời gian như ngừng trôi trong khoảnh khắc ấy.`;
    } else {
      mockName = 'Doan_Van_Ngan.txt';
      mockContent = `Đây là một đoạn văn ngắn không có tiêu đề chương cụ thể.
Lily sẽ tự động nhận diện và tạo thành một chương hoàn chỉnh để người dùng có thể đọc thoải mái mà không bị lỗi.`;
    }

    const blob = new Blob([mockContent], { type: 'text/plain;charset=utf-8' });
    const file = new File([blob], mockName, { type: 'text/plain' });
    handleFileSelected(file);
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
            <h1 className="font-serif font-bold text-2xl md:text-3xl text-ink-950">
              Thêm truyện vào thư viện
            </h1>
            <p className="text-xs md:text-sm text-ink-600 mt-1 max-w-md mx-auto">
              Đưa file truyện cá nhân của bạn vào Lily để lưu trữ và đọc trên mọi thiết bị.
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
                      : 'File lưu trữ cục bộ trên IndexedDB của thiết bị này. 100% riêng tư.'}
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
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Main Drag & Drop Zone */}
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
            <p className="text-xs text-ink-500 mb-5 max-w-xs">
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

          {/* Quick Mock Sample Presets for effortless browser testing */}
          <div className="bg-white/80 border border-ink-100 rounded-3xl p-5 shadow-soft">
            <h4 className="text-xs font-semibold text-ink-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>💡 Thử nhanh với file mẫu thử nghiệm:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleCreateMockSample('dai_vu')}
                className="p-3 rounded-2xl bg-cream-50 hover:bg-cream-100 border border-cream-200 text-left text-xs transition-colors"
              >
                <div className="font-bold text-ink-900 truncate">Trường An Dạ Vũ</div>
                <div className="text-[10px] text-ink-500 mt-0.5">TXT · 3 chương · Đa định dạng</div>
              </button>

              <button
                type="button"
                onClick={() => handleCreateMockSample('xuan_phong')}
                className="p-3 rounded-2xl bg-cream-50 hover:bg-cream-100 border border-cream-200 text-left text-xs transition-colors"
              >
                <div className="font-bold text-ink-900 truncate">Xuân Phong Qua Thành</div>
                <div className="text-[10px] text-ink-500 mt-0.5">TXT · 2 chương · Hiện đại</div>
              </button>

              <button
                type="button"
                onClick={() => handleCreateMockSample('ngan_nam')}
                className="p-3 rounded-2xl bg-cream-50 hover:bg-cream-100 border border-cream-200 text-left text-xs transition-colors"
              >
                <div className="font-bold text-ink-900 truncate">Đoạn văn ngắn</div>
                <div className="text-[10px] text-ink-500 mt-0.5">TXT · Test Fallback 1 chương</div>
              </button>
            </div>
          </div>
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
                Đọc dữ liệu tệp
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              {checklist.cleanText ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-ink-300 shrink-0" />
              )}
              <span className={checklist.cleanText ? 'text-ink-900 font-medium' : 'text-ink-400'}>
                Làm sạch & chuẩn hóa định dạng văn bản
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              {checklist.detectChapters ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-ink-300 shrink-0" />
              )}
              <span className={checklist.detectChapters ? 'text-ink-900 font-medium' : 'text-ink-400'}>
                Nhận diện cấu trúc chương mục
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              {checklist.prepareReader ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-ink-300 shrink-0" />
              )}
              <span className={checklist.prepareReader ? 'text-ink-900 font-medium' : 'text-ink-400'}>
                Chuẩn bị giao diện Reader
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: PREVIEW & METADATA EDIT */}
      {step === 'preview' && parsedDraft && (
        <div className="bg-white border border-ink-100 rounded-3xl p-6 md:p-8 shadow-card space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-ink-100 pb-4">
            <div>
              <h2 className="font-serif font-bold text-xl text-ink-950">
                Xem trước & Xác nhận thông tin
              </h2>
              <p className="text-xs text-ink-500 mt-0.5">
                Kiểm tra thông tin được nhận diện từ file trước khi lưu vào IndexedDB
              </p>
            </div>
            <FormatBadge format={parsedDraft.fileFormat} />
          </div>

          {/* Gentle Warning if chapters were not recognized (Fallback) */}
          {!parsedDraft.hasDetectedChapters && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <FileQuestion className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Ghi chú phân đoạn:</span> Lily chưa nhận diện được cấu trúc chương của file này. Toàn bộ nội dung đã được gom thành 1 chương để bạn có thể đọc liền mạch.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cover Column */}
            <div className="flex flex-col items-center text-center">
              <BookCover
                title={bookTitle || parsedDraft.title}
                author={bookAuthor || parsedDraft.author}
                coverColor={coverColor}
                format={parsedDraft.fileFormat}
                size="lg"
              />

              <div className="mt-3">
                <span className="text-[11px] text-ink-500 block mb-1.5 font-medium">Chọn màu bìa:</span>
                <div className="flex items-center justify-center gap-2">
                  {['#D9829B', '#7AA387', '#8C7AB3', '#D19A66', '#5C8E9E', '#9C6B82'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCoverColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${
                        coverColor === c ? 'scale-125 border-ink-900 ring-2 ring-lily-200' : 'border-white'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="md:col-span-2 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Tên tác phẩm
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Nhập tên truyện..."
                  className="w-full px-3.5 py-2 rounded-xl border border-ink-200 text-sm font-medium focus:ring-2 focus:ring-lily-500/20 focus:border-lily-500"
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
                  placeholder="Nhập tác giả..."
                  className="w-full px-3.5 py-2 rounded-xl border border-ink-200 text-sm focus:ring-2 focus:ring-lily-500/20 focus:border-lily-500"
                />
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-cream-50/70 rounded-xl border border-cream-200 text-center">
                <div>
                  <span className="text-[10px] text-ink-500 uppercase">Số chương</span>
                  <div className="font-bold text-sm text-ink-900 font-mono">{parsedDraft.totalChapters}</div>
                </div>
                <div>
                  <span className="text-[10px] text-ink-500 uppercase">Ước tính từ</span>
                  <div className="font-bold text-sm text-ink-900 font-mono">{parsedDraft.wordCount.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-[10px] text-ink-500 uppercase">Dung lượng</span>
                  <div className="font-bold text-sm text-ink-900 font-mono">{parsedDraft.fileSizeMB} MB</div>
                </div>
              </div>

              {/* Real chapters recognized */}
              <div>
                <span className="text-xs font-semibold text-ink-700 block mb-1.5">
                  Mục lục nhận diện thật ({parsedDraft.chapters.length} chương):
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-ink-50 rounded-xl border border-ink-100 text-xs text-ink-700">
                  {parsedDraft.chapters.slice(0, 10).map((c) => (
                    <div key={c.index} className="p-1.5 rounded bg-white font-medium flex items-center justify-between">
                      <span className="truncate">{c.title}</span>
                      <span className="text-[10px] font-mono text-ink-400 shrink-0 ml-2">{c.wordCount} chữ</span>
                    </div>
                  ))}
                  {parsedDraft.chapters.length > 10 && (
                    <div className="p-1 text-ink-400 text-center italic">
                      ... và {parsedDraft.chapters.length - 10} chương khác
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-ink-100">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 rounded-2xl border border-ink-200 text-xs font-medium text-ink-600 hover:bg-ink-50 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Chọn file khác</span>
            </button>

            <button
              onClick={handleConfirmAdd}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              <span>{isSaving ? 'Đang lưu vào IndexedDB…' : 'Lưu vào thư viện'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STATE 4: SUCCESS */}
      {step === 'success' && (
        <div className="bg-white border border-ink-100 rounded-3xl p-8 md:p-12 shadow-card text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-soft">
            <Check className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div>
            <h2 className="font-serif font-bold text-2xl text-ink-950">
              Đã thêm truyện thành công!
            </h2>
            <p className="text-xs md:text-sm text-ink-500 mt-1 max-w-sm mx-auto">
              "{bookTitle}" đã được lưu an toàn trong IndexedDB của trình duyệt. Bạn có thể mở đọc ngay bây giờ.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigateTo('library')}
              className="px-5 py-2.5 rounded-2xl border border-ink-200 text-xs font-medium text-ink-700 hover:bg-ink-50 transition-colors"
            >
              Xem Thư viện
            </button>

            <button
              onClick={() => navigateTo('reader')}
              className="px-6 py-2.5 rounded-2xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center gap-2 transition-all hover:scale-105"
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
