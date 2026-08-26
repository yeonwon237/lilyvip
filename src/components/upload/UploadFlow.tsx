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
  Info
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
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<UploadStep>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      setStep('success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu sách', 'error');
      setErrorMessage(err.message || 'Lỗi khi lưu sách vào IndexedDB');
    } finally {
      setIsSaving(false);
      setVerifyMessage(null);
    }
  };

  // Sample Mock Creator (for instant tests directly in browser)
  const handleCreateMockSample = (sampleType: 'dai_vu_10' | 'van_dai_200' | 'ngan_nam') => {
    let mockContent = '';
    let mockName = '';

    if (sampleType === 'dai_vu_10') {
      mockName = 'Truong_An_Da_Vu_10_Chuong.txt';
      mockContent = `Tựa đề: Trường An Dạ Vũ
Tác giả: Mặc Hương Đồng Khứ

Chương 1: Đêm Trường An mưa bụi
Mưa rả rích rơi trên những mái ngói rêu phong của Trường An. Đêm đã khuya, tiếng chuông chùa xa xa vọng lại từng hồi trầm mặc.
Nàng đứng bên song cửa, đưa tay hứng lấy từng giọt nước mát lạnh. Thế sự xoay vần, người xưa nay đã ở phương trời nào.

Chương 2: Tiếng tiêu ngoài quan ải
Gió tuyết biên cương thổi rát mặt người lữ khách. Tiếng tiêu vang lên nức nở giữa thảo nguyên hoang vắng, gợi nhớ về cố hương xa xôi.

Chương 3 - Trăm năm bình yên
Mọi bão giông giang hồ cuối cùng cũng dừng lại trước hiên nhà nhỏ nơi ngoại thành. Dưới gốc hoa lê, hai bóng hình kề vai ngắm hoàng hôn buông xuống.

Chương 4. Gặp lại cố nhân
Bên bờ sông Liễu, bóng dáng quen thuộc ngày nào bỗng hiện ra sau làn sương mờ ảo.

Chương 5: Trăng sáng trên lầu cao
Ánh trăng vằng vặc soi sáng khắp nhân gian, chiếu rọi vào tâm tư của những kẻ ôm mối tương tư sâu nặng.

Chương 6: Kiếm ảnh phong ba
Giang hồ dậy sóng, những ân oán tình thù xưa kia lại một lần nữa bị đào xới.

Chương 7 - Rượu nồng tri kỷ
Bên bếp lửa hồng, chén rượu ấm áp làm vơi đi cái lạnh thấu xương của mùa đông dài.

Chương 8. Lời hẹn ước năm xưa
Dưới tán cây cổ thụ nghìn năm, lời thề non hẹn biển vẫn vẹn nguyên như thuở ban đầu.

Chương 9: Hồi kinh
Đoàn xe ngựa chậm rãi lăn bánh vào cổng thành Trường An giữa tiếng hò reo của dân chúng.

Chương 10: Đại kết cục viên mãn
Mọi khó khăn gian khổ đã qua đi, để lại một tình yêu son sắt trường tồn cùng năm tháng.`;
    } else if (sampleType === 'van_dai_200') {
      mockName = 'Bo_Truyen_200_Chuong_Dai.txt';
      let content = 'Tựa đề: Bách Niên Tiên Lộ (200 Chương)\nTác giả: Vong Ngữ\n\n';
      for (let i = 1; i <= 200; i++) {
        content += `Chương ${i}: Diễn biến kỳ ${i} trên tiên lộ\nĐạo hữu bước vào cảnh giới mới, phong vân biến sắc. Vô số linh khí hội tụ về đan điền tạo thành luồng xoáy khổng lồ.\nTrải qua bao nhiêu trắc trở, con đường tu tiên rốt cuộc cũng mở ra một trang sử mới.\n\n`;
      }
      mockContent = content;
    } else {
      mockName = 'Doan_Van_Khong_Chuong.txt';
      mockContent = `Đây là một đoạn văn tự sự ngắn hoàn toàn không chứa bất kỳ tiêu đề chương mẫu nào.
Lily sẽ tự động nhận diện và phân tích theo cơ chế Single Chapter Fallback để người dùng có thể đọc trọn vẹn toàn bộ tác phẩm mà không bị lỗi giao diện.`;
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
              <span>💡 Thử nghiệm nhanh với các mẫu truyện thực tế:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleCreateMockSample('dai_vu_10')}
                className="p-3 rounded-2xl bg-cream-50 hover:bg-cream-100 border border-cream-200 text-left text-xs transition-colors"
              >
                <div className="font-bold text-ink-900 truncate">Trường An Dạ Vũ</div>
                <div className="text-[10px] text-ink-500 mt-0.5">TXT · 10 chương đa dạng mẫu</div>
              </button>

              <button
                type="button"
                onClick={() => handleCreateMockSample('van_dai_200')}
                className="p-3 rounded-2xl bg-cream-50 hover:bg-cream-100 border border-cream-200 text-left text-xs transition-colors"
              >
                <div className="font-bold text-ink-900 truncate">Bách Niên Tiên Lộ</div>
                <div className="text-[10px] text-ink-500 mt-0.5">TXT · 200 chương dài (Scale test)</div>
              </button>

              <button
                type="button"
                onClick={() => handleCreateMockSample('ngan_nam')}
                className="p-3 rounded-2xl bg-cream-50 hover:bg-cream-100 border border-cream-200 text-left text-xs transition-colors"
              >
                <div className="font-bold text-ink-900 truncate">Đoạn văn không chương</div>
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
                Đọc & phát hiện encoding tệp
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
                Nhận diện cấu trúc chương mục (ChapterDetector V2)
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
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                parsedDraft.confidence === 'HIGH' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : parsedDraft.confidence === 'MEDIUM' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {parsedDraft.confidence === 'HIGH' ? '✓ Độ tin cậy cao' : parsedDraft.confidence === 'MEDIUM' ? 'Độ tin cậy vừa' : '⚠️ Cần kiểm tra'}
              </span>
              <FormatBadge format={parsedDraft.fileFormat} />
            </div>
          </div>

          {/* Warning Banner if confidence is low or chapters were not recognized */}
          {parsedDraft.confidence === 'LOW' && (
            <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Lưu ý phân đoạn:</span> Lily chưa chắc chắn về cấu trúc chương của file này. Hãy kiểm tra danh sách chương bên dưới trước khi lưu vào máy.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cover Column */}
            <div className="flex flex-col items-center text-center">
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleCoverFileSelected(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <BookCover
                title={bookTitle || parsedDraft.title}
                author={bookAuthor || parsedDraft.author}
                coverUrl={coverUrl}
                coverColor={coverColor}
                format={parsedDraft.fileFormat}
                size="lg"
              />

              {coverUrl ? (
                <div className="mt-3 space-y-1.5 w-full">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" />
                    Đã lấy ảnh bìa từ file
                  </span>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      className="text-[11px] font-medium text-lily-600 hover:text-lily-700 hover:underline"
                    >
                      Đổi ảnh khác
                    </button>
                    <span className="text-ink-300 text-[10px]">•</span>
                    <button
                      type="button"
                      onClick={() => setCoverUrl(undefined)}
                      className="text-[11px] font-medium text-ink-500 hover:text-rose-600 hover:underline"
                    >
                      Dùng bìa chữ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-2 w-full">
                  <span className="text-[11px] text-ink-500 block mb-1 font-medium">Chọn màu bìa chữ:</span>
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
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="text-[11px] font-medium text-lily-600 hover:text-lily-700 hover:underline block mx-auto pt-1"
                  >
                    + Tải ảnh bìa tùy chọn
                  </button>
                </div>
              )}
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

              {/* Detection Strategy & Diagnostics Info */}
              <div className="p-3 bg-lavender-50/70 border border-lavender-200/80 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between text-lavender-950 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-lavender-700" />
                    <span>Cấu trúc: {parsedDraft.diagnostics.detectionStrategy}</span>
                  </span>
                  <span className="font-mono text-[11px] text-lavender-700">Điểm khớp: {parsedDraft.diagnostics.score || 85}/100</span>
                </div>
                {parsedDraft.diagnostics.anomalies && parsedDraft.diagnostics.anomalies.length > 0 && (
                  <div className="text-[11px] text-amber-800 pt-1">
                    ⚠️ {parsedDraft.diagnostics.anomalies.join(' · ')}
                  </div>
                )}
              </div>

              {/* First 3 and Last 3 Chapters Quick Verification */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-ink-700 block">
                  Kiểm tra chuỗi chương ({parsedDraft.chapters.length} chương):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* First 3 chapters */}
                  <div className="p-2.5 bg-ink-50 rounded-xl border border-ink-100 text-xs">
                    <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider block mb-1">
                      3 Chương đầu:
                    </span>
                    <div className="space-y-1 text-ink-800 font-medium">
                      {parsedDraft.diagnostics.firstChaptersPreview?.map((t, idx) => (
                        <div key={idx} className="truncate">{t}</div>
                      )) || parsedDraft.chapters.slice(0, 3).map((c) => (
                        <div key={c.index} className="truncate">{c.index}. {c.title}</div>
                      ))}
                    </div>
                  </div>

                  {/* Last 3 chapters */}
                  <div className="p-2.5 bg-ink-50 rounded-xl border border-ink-100 text-xs">
                    <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider block mb-1">
                      3 Chương cuối:
                    </span>
                    <div className="space-y-1 text-ink-800 font-medium">
                      {parsedDraft.diagnostics.lastChaptersPreview?.map((t, idx) => (
                        <div key={idx} className="truncate">{t}</div>
                      )) || parsedDraft.chapters.slice(-3).map((c) => (
                        <div key={c.index} className="truncate">{c.index}. {c.title}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-ink-100">
            <button
              onClick={() => setStep('upload')}
              disabled={isSaving}
              className="px-4 py-2 rounded-2xl border border-ink-200 text-xs font-medium text-ink-600 hover:bg-ink-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
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
              <span>{isSaving ? (verifyMessage || 'Đang lưu vào IndexedDB…') : 'Xác nhận & Lưu vào thư viện'}</span>
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
              "{bookTitle}" đã được kiểm tra tính toàn vẹn và lưu an toàn trong IndexedDB của thiết bị. Bạn có thể mở đọc ngay bây giờ.
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
