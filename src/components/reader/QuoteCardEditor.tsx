import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Sparkles, 
  Check, 
  AlignLeft, 
  AlignCenter, 
  Smartphone, 
  Square, 
  Image as ImageIcon,
  Bookmark
} from 'lucide-react';
import { useReader } from '../../context/ReaderContext';
import { useApp } from '../../context/AppContext';
import { QuoteTemplateId, QuoteAspectRatio } from '../../types';

interface TemplateOption {
  id: QuoteTemplateId;
  name: string;
  dotColor: string;
  bgStyle: {
    background: string;
    textColor: string;
    accentColor: string;
    subTextColor: string;
    borderColor: string;
  };
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'lily',
    name: 'Lily',
    dotColor: '#E879A8',
    bgStyle: {
      background: 'linear-gradient(135deg, #FFF0F5 0%, #F5EEF8 50%, #EDE7F6 100%)',
      textColor: '#2E1035',
      accentColor: '#9C27B0',
      subTextColor: '#7B5E80',
      borderColor: '#E1BEE7',
    },
  },
  {
    id: 'ancient',
    name: 'Cổ phong',
    dotColor: '#C48A58',
    bgStyle: {
      background: 'linear-gradient(180deg, #FBF6EC 0%, #F4EAD4 100%)',
      textColor: '#2C2214',
      accentColor: '#8C4824',
      subTextColor: '#70593B',
      borderColor: '#D4C3A3',
    },
  },
  {
    id: 'minimal',
    name: 'Tối giản',
    dotColor: '#525252',
    bgStyle: {
      background: 'linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%)',
      textColor: '#1A1A1A',
      accentColor: '#1A1A1A',
      subTextColor: '#666666',
      borderColor: '#E5E5E5',
    },
  },
  {
    id: 'night',
    name: 'Đêm đen',
    dotColor: '#A78BFA',
    bgStyle: {
      background: 'linear-gradient(160deg, #12131A 0%, #1A1C24 60%, #0F1015 100%)',
      textColor: '#F0F2F5',
      accentColor: '#A78BFA',
      subTextColor: '#9CA3AF',
      borderColor: '#2D313E',
    },
  },
  {
    id: 'book_page',
    name: 'Trang sách',
    dotColor: '#A3927B',
    bgStyle: {
      background: 'linear-gradient(180deg, #FAF7EE 0%, #F2ECE0 100%)',
      textColor: '#24211E',
      accentColor: '#594A38',
      subTextColor: '#7D7060',
      borderColor: '#DCD4C4',
    },
  },
  {
    id: 'film',
    name: 'Điện ảnh',
    dotColor: '#E2B857',
    bgStyle: {
      background: 'linear-gradient(180deg, #1E1E24 0%, #141418 100%)',
      textColor: '#EDECE8',
      accentColor: '#D4AF37',
      subTextColor: '#A09F9C',
      borderColor: '#383842',
    },
  },
];

export const QuoteCardEditor: React.FC = () => {
  const { isQuoteEditorOpen, closeQuoteEditor, quoteData } = useReader();
  const { showToast } = useApp();

  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplateId>('lily');
  const [aspectRatio, setAspectRatio] = useState<QuoteAspectRatio>('4:5');
  const [fontFamily, setFontFamily] = useState<string>('Literata');
  const [fontSize, setFontSize] = useState<number>(24);
  const [textAlign, setTextAlign] = useState<'left' | 'center'>('left');
  
  // Metadata visibility toggles
  const [showTitle, setShowTitle] = useState<boolean>(true);
  const [showChapter, setShowChapter] = useState<boolean>(true);
  const [showAuthor, setShowAuthor] = useState<boolean>(true);

  // Export state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [canNativeShare, setCanNativeShare] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Check if browser supports Web Share API with files
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'canShare' in navigator && typeof navigator.canShare === 'function' && 'share' in navigator) {
      try {
        const testFile = new File(['test'], 'test.png', { type: 'image/png' });
        setCanNativeShare(navigator.canShare({ files: [testFile] }));
      } catch {
        setCanNativeShare(false);
      }
    } else {
      setCanNativeShare(false);
    }
  }, []);

  // Adjust default font size based on text length
  useEffect(() => {
    if (quoteData?.text) {
      const len = quoteData.text.length;
      if (len > 400) {
        setFontSize(17);
      } else if (len > 250) {
        setFontSize(20);
      } else if (len > 120) {
        setFontSize(23);
      } else {
        setFontSize(26);
      }
    }
  }, [quoteData?.text]);

  const activeTpl = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];

  /**
   * High-Resolution Canvas Rendering Engine
   */
  const renderCanvas = useCallback(async (targetWidth: number, targetHeight: number): Promise<HTMLCanvasElement> => {
    if (typeof document !== 'undefined' && document.fonts) {
      await document.fonts.ready;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Cannot get 2d context');

    const scale = targetWidth / 1080;
    const isBookmark = aspectRatio === 'bookmark';
    const padX = (isBookmark ? 70 : 80) * scale;
    const padY = (isBookmark ? 75 : 90) * scale;
    const contentWidth = targetWidth - padX * 2;

    // 1. Draw Background
    const tpl = activeTpl.bgStyle;
    if (selectedTemplate === 'lily') {
      const grad = ctx.createLinearGradient(0, 0, targetWidth, targetHeight);
      grad.addColorStop(0, '#FFF2F7');
      grad.addColorStop(0.5, '#F5EDF8');
      grad.addColorStop(1, '#ECE4F7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Subtle glow
      ctx.fillStyle = 'rgba(236, 178, 222, 0.18)';
      ctx.beginPath();
      ctx.arc(targetWidth * 0.85, targetHeight * 0.15, 260 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(209, 196, 233, 0.22)';
      ctx.beginPath();
      ctx.arc(targetWidth * 0.15, targetHeight * 0.85, 240 * scale, 0, Math.PI * 2);
      ctx.fill();

    } else if (selectedTemplate === 'ancient') {
      const grad = ctx.createLinearGradient(0, 0, 0, targetHeight);
      grad.addColorStop(0, '#FBF7EE');
      grad.addColorStop(0.5, '#F6EEDB');
      grad.addColorStop(1, '#EDE2CA');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Antique ornamental border
      ctx.strokeStyle = 'rgba(140, 72, 36, 0.25)';
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(28 * scale, 28 * scale, targetWidth - 56 * scale, targetHeight - 56 * scale);
      ctx.strokeStyle = 'rgba(140, 72, 36, 0.15)';
      ctx.lineWidth = 1 * scale;
      ctx.strokeRect(36 * scale, 36 * scale, targetWidth - 72 * scale, targetHeight - 72 * scale);

    } else if (selectedTemplate === 'night') {
      const grad = ctx.createLinearGradient(0, 0, targetWidth, targetHeight);
      grad.addColorStop(0, '#13141C');
      grad.addColorStop(0.6, '#181A24');
      grad.addColorStop(1, '#0D0E13');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Soft ambient glow
      ctx.fillStyle = 'rgba(167, 139, 250, 0.08)';
      ctx.beginPath();
      ctx.arc(targetWidth * 0.5, targetHeight * 0.4, 380 * scale, 0, Math.PI * 2);
      ctx.fill();

    } else if (selectedTemplate === 'film') {
      ctx.fillStyle = '#141416';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Letterbox borders
      ctx.fillStyle = '#08080A';
      ctx.fillRect(0, 0, targetWidth, 40 * scale);
      ctx.fillRect(0, targetHeight - 40 * scale, targetWidth, 40 * scale);

    } else if (selectedTemplate === 'book_page') {
      const grad = ctx.createLinearGradient(0, 0, 0, targetHeight);
      grad.addColorStop(0, '#FAF7F0');
      grad.addColorStop(1, '#F0E9DC');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Gutter shadow
      const gutter = ctx.createLinearGradient(0, 0, 50 * scale, 0);
      gutter.addColorStop(0, 'rgba(0, 0, 0, 0.06)');
      gutter.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gutter;
      ctx.fillRect(0, 0, 50 * scale, targetHeight);

    } else {
      // Minimal
      const grad = ctx.createLinearGradient(0, 0, 0, targetHeight);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(1, '#F8F9FA');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      ctx.strokeStyle = '#EAEAEA';
      ctx.lineWidth = 1.5 * scale;
      ctx.strokeRect(32 * scale, 32 * scale, targetWidth - 64 * scale, targetHeight - 64 * scale);
    }

    // 2. Top Ribbon / Bookmark Accent (Special for Bookmark aspect ratio)
    let currentY = padY + 25 * scale;
    ctx.fillStyle = tpl.accentColor;

    if (isBookmark) {
      // Bookmark Ribbon Tag at top center
      ctx.fillStyle = tpl.accentColor;
      ctx.beginPath();
      const ribbonW = 32 * scale;
      const ribbonH = 44 * scale;
      const ribbonX = (targetWidth - ribbonW) / 2;
      ctx.rect(ribbonX, 0, ribbonW, ribbonH);
      ctx.fill();

      currentY += 28 * scale;
    }

    if (selectedTemplate === 'ancient') {
      ctx.font = `${Math.round(26 * scale)}px "Playfair Display", Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText('❦', targetWidth / 2, currentY);
      currentY += 35 * scale;
    } else if (selectedTemplate === 'lily') {
      ctx.font = `${Math.round(24 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🌸', targetWidth / 2, currentY);
      currentY += 35 * scale;
    } else if (selectedTemplate === 'film') {
      ctx.font = `600 ${Math.round(13 * scale)}px "Be Vietnam Pro", sans-serif`;
      ctx.letterSpacing = `${3 * scale}px`;
      ctx.textAlign = 'center';
      ctx.fillStyle = tpl.accentColor;
      ctx.fillText('— SCENE QUOTE —', targetWidth / 2, currentY);
      currentY += 40 * scale;
    } else {
      ctx.font = `italic ${Math.round(48 * scale)}px "Playfair Display", Georgia, serif`;
      ctx.textAlign = textAlign === 'center' ? 'center' : 'left';
      const quoteX = textAlign === 'center' ? targetWidth / 2 : padX;
      ctx.fillText('“', quoteX, currentY);
      currentY += 30 * scale;
    }

    // 3. Render Quote Body Text with Word Wrapping
    const renderFontSize = Math.round(fontSize * scale * (isBookmark ? 1.65 : 1.45));
    const renderLineHeight = renderFontSize * 1.62;
    ctx.font = `${selectedTemplate === 'ancient' || selectedTemplate === 'book_page' ? 'italic ' : ''}${renderFontSize}px "${fontFamily}", Georgia, serif`;
    ctx.fillStyle = tpl.textColor;
    ctx.textAlign = textAlign;

    const rawText = quoteData?.text?.trim() || 'Nàng đứng dưới mái hiên ngắm nhìn tuyết đầu mùa rơi.';
    const paragraphs = rawText.split('\n').filter(p => p.trim().length > 0);
    const textStartX = textAlign === 'center' ? targetWidth / 2 : padX;

    for (const paragraph of paragraphs) {
      const words = paragraph.split(' ');
      let currentLine = '';

      for (let n = 0; n < words.length; n++) {
        const testLine = currentLine ? `${currentLine} ${words[n]}` : words[n];
        const metrics = ctx.measureText(testLine);

        if (metrics.width > contentWidth && n > 0) {
          ctx.fillText(currentLine, textStartX, currentY);
          currentLine = words[n];
          currentY += renderLineHeight;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        ctx.fillText(currentLine, textStartX, currentY);
        currentY += renderLineHeight;
      }
      currentY += 10 * scale;
    }

    // 4. Decorative Divider Line
    currentY += 20 * scale;
    ctx.strokeStyle = tpl.borderColor;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    if (textAlign === 'center') {
      ctx.moveTo((targetWidth - 120 * scale) / 2, currentY);
      ctx.lineTo((targetWidth + 120 * scale) / 2, currentY);
    } else {
      ctx.moveTo(padX, currentY);
      ctx.lineTo(padX + 100 * scale, currentY);
    }
    ctx.stroke();
    currentY += 30 * scale;

    // 5. Metadata: Book Title & Chapter & Author
    const metaX = textAlign === 'center' ? targetWidth / 2 : padX;
    
    if (showTitle && quoteData?.bookTitle) {
      ctx.font = `bold ${Math.round((isBookmark ? 22 : 19) * scale)}px "${fontFamily}", Georgia, serif`;
      ctx.fillStyle = tpl.textColor;
      ctx.textAlign = textAlign;
      ctx.fillText(quoteData.bookTitle, metaX, currentY);
      currentY += 26 * scale;
    }

    if (showChapter && quoteData?.chapterTitle) {
      ctx.font = `${Math.round(14 * scale)}px "Be Vietnam Pro", sans-serif`;
      ctx.fillStyle = tpl.subTextColor;
      ctx.textAlign = textAlign;
      ctx.fillText(quoteData.chapterTitle, metaX, currentY);
      currentY += 22 * scale;
    }

    if (showAuthor && quoteData?.author) {
      ctx.font = `italic ${Math.round(14 * scale)}px "${fontFamily}", serif`;
      ctx.fillStyle = tpl.subTextColor;
      ctx.textAlign = textAlign;
      ctx.fillText(`Tác giả: ${quoteData.author}`, metaX, currentY);
      currentY += 22 * scale;
    }

    // 6. Watermark / Branding
    const watermarkY = targetHeight - padY * 0.45;
    ctx.font = `500 ${Math.round(12 * scale)}px "Be Vietnam Pro", sans-serif`;
    ctx.fillStyle = selectedTemplate === 'night' || selectedTemplate === 'film' 
      ? 'rgba(255, 255, 255, 0.4)' 
      : 'rgba(0, 0, 0, 0.35)';
    ctx.textAlign = 'center';
    ctx.fillText('Lily Reader · vip.lilyhub.top', targetWidth / 2, watermarkY);

    return canvas;
  }, [activeTpl, selectedTemplate, fontSize, fontFamily, textAlign, quoteData, showTitle, showChapter, showAuthor, aspectRatio]);

  /**
   * Update Live Preview Canvas
   */
  useEffect(() => {
    if (!isQuoteEditorOpen) return;

    let targetWidth = 1080;
    let targetHeight = 1350;
    if (aspectRatio === '1:1') {
      targetHeight = 1080;
    } else if (aspectRatio === '9:16') {
      targetHeight = 1920;
    } else if (aspectRatio === 'bookmark') {
      targetWidth = 720;
      targetHeight = 1440;
    }

    let isMounted = true;
    renderCanvas(targetWidth, targetHeight).then((rendered) => {
      if (!isMounted) return;
      offscreenCanvasRef.current = rendered;

      const previewCanvas = previewCanvasRef.current;
      if (previewCanvas) {
        previewCanvas.width = rendered.width;
        previewCanvas.height = rendered.height;
        const pCtx = previewCanvas.getContext('2d');
        if (pCtx) {
          pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
          pCtx.drawImage(rendered, 0, 0);
        }
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isQuoteEditorOpen, aspectRatio, selectedTemplate, fontSize, fontFamily, textAlign, showTitle, showChapter, showAuthor, quoteData, renderCanvas]);

  /**
   * Export to PNG Blob
   */
  const generatePngBlob = async (): Promise<Blob> => {
    let targetWidth = 1080;
    let targetHeight = 1350;
    if (aspectRatio === '1:1') {
      targetHeight = 1080;
    } else if (aspectRatio === '9:16') {
      targetHeight = 1920;
    } else if (aspectRatio === 'bookmark') {
      targetWidth = 720;
      targetHeight = 1440;
    }

    const canvas = await renderCanvas(targetWidth, targetHeight);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    });
  };

  const handleShare = async () => {
    if (!quoteData) return;
    setIsExporting(true);
    try {
      const blob = await generatePngBlob();
      const slug = (quoteData.bookTitle || 'lily-quote')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const fileName = `lily-quote-${slug}-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (typeof navigator !== 'undefined' && 'canShare' in navigator && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }) && 'share' in navigator) {
        await navigator.share({
          files: [file],
          title: quoteData.bookTitle || 'Trích dẫn từ Lily',
          text: `“${quoteData.text.substring(0, 100)}...” — Đọc tại Lily Reader`,
        });
        showToast('Đã mở chia sẻ hình ảnh.', 'success');
      } else {
        handleDownload();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        handleDownload();
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    if (!quoteData) return;
    setIsExporting(true);
    try {
      const blob = await generatePngBlob();
      const url = URL.createObjectURL(blob);
      const slug = (quoteData.bookTitle || 'lily-quote')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const fileName = `lily-quote-${slug}-${Date.now()}.png`;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Đã lưu ảnh Quote Card về máy.', 'success');
    } catch {
      showToast('Lỗi khi xuất ảnh Quote Card.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isQuoteEditorOpen || !quoteData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-ink-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-modal border border-ink-100/80 flex flex-col lg:flex-row overflow-hidden max-h-[92vh] max-h-[92dvh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT / TOP COLUMN: LIVE PREVIEW */}
        <div className="bg-ink-900/5 p-3 sm:p-5 flex flex-col items-center justify-center min-h-[220px] sm:min-h-[300px] lg:min-h-[420px] overflow-hidden border-b lg:border-b-0 lg:border-r border-ink-100/70 flex-1">
          <div className="w-full max-w-[260px] sm:max-w-[320px] lg:max-w-[360px] flex items-center justify-center">
            <canvas
              ref={previewCanvasRef}
              className="w-full h-auto rounded-2xl shadow-card border border-black/10 object-contain max-h-[32vh] sm:max-h-[40vh] lg:max-h-[64vh] transition-all"
            />
          </div>
        </div>

        {/* RIGHT / BOTTOM COLUMN: CONTROLS & STYLING */}
        <div className="w-full lg:w-[420px] flex flex-col justify-between max-h-[60vh] sm:max-h-[55vh] lg:max-h-[85vh] overflow-y-auto safe-area-pb">
          {/* Header */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-ink-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-lily-600" />
              <h3 className="font-serif font-bold text-sm sm:text-base text-ink-950">
                Tạo Quote Card
              </h3>
            </div>

            <button
              onClick={closeQuoteEditor}
              className="p-1 rounded-full text-ink-400 hover:text-ink-900 hover:bg-ink-100 transition-colors"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Settings Body */}
          <div className="p-4 sm:p-5 space-y-4 flex-1">
            {/* 1. Ratio Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-ink-500 uppercase tracking-wider mb-1.5">
                Khung hình
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: '1:1', label: '1:1', icon: Square },
                  { id: '4:5', label: '4:5', icon: ImageIcon },
                  { id: '9:16', label: 'Story', icon: Smartphone },
                  { id: 'bookmark', label: 'Dấu trang', icon: Bookmark },
                ].map((r) => {
                  const Icon = r.icon;
                  const isSelected = aspectRatio === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setAspectRatio(r.id as any)}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                        isSelected 
                          ? 'border-lily-500 bg-lily-50 text-lily-950 ring-1 ring-lily-400/50 shadow-xs' 
                          : 'border-ink-200/80 bg-white hover:bg-cream-50 text-ink-700'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="truncate">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Templates Swatches (Compact & Clean) */}
            <div>
              <label className="block text-[11px] font-semibold text-ink-500 uppercase tracking-wider mb-1.5">
                Mẫu thẻ
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplate === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id)}
                      className={`py-2 px-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-1.5 relative ${
                        isSelected 
                          ? 'border-lily-500 ring-2 ring-lily-400/40 bg-white shadow-xs font-bold text-ink-950' 
                          : 'border-ink-200/80 hover:border-ink-300 bg-cream-50/40 text-ink-700 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: tpl.dotColor }}
                        />
                        <span className="text-xs truncate">{tpl.name}</span>
                      </div>
                      {isSelected && <Check className="w-3 h-3 text-lily-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Typography & Size & Alignment */}
            <div className="space-y-2.5 pt-2 border-t border-ink-100/70">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                  Chữ & Căn lề
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTextAlign('left')}
                    className={`p-1 rounded-lg border transition-colors ${
                      textAlign === 'left' ? 'bg-ink-950 text-white' : 'border-ink-200 text-ink-600 bg-white hover:bg-cream-50'
                    }`}
                    title="Căn trái"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setTextAlign('center')}
                    className={`p-1 rounded-lg border transition-colors ${
                      textAlign === 'center' ? 'bg-ink-950 text-white' : 'border-ink-200 text-ink-600 bg-white hover:bg-cream-50'
                    }`}
                    title="Căn giữa"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Font families */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'Literata', label: 'Literata' },
                  { id: 'Merriweather', label: 'Merri' },
                  { id: 'Playfair Display', label: 'Playfair' },
                  { id: 'Be Vietnam Pro', label: 'Modern' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFontFamily(f.id)}
                    className={`py-1.5 px-1 rounded-xl border text-[11px] font-medium transition-all text-center truncate ${
                      fontFamily === f.id 
                        ? 'border-lily-500 bg-lily-50 text-lily-950 font-bold shadow-xs' 
                        : 'border-ink-200/80 bg-white text-ink-700 hover:bg-cream-50'
                    }`}
                    style={{ fontFamily: f.id }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Font size slider */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-ink-500 font-mono w-10 shrink-0">{fontSize}px</span>
                <input
                  type="range"
                  min="16"
                  max="34"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-lily-600 cursor-pointer h-1.5 bg-ink-200 rounded-lg appearance-none"
                />
              </div>
            </div>

            {/* 4. Minimal Metadata Toggles */}
            <div className="pt-2 border-t border-ink-100/70 text-xs">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-ink-700">
                  <input
                    type="checkbox"
                    checked={showTitle}
                    onChange={(e) => setShowTitle(e.target.checked)}
                    className="rounded text-lily-600 accent-lily-600 w-3.5 h-3.5"
                  />
                  <span>Tên truyện</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-ink-700">
                  <input
                    type="checkbox"
                    checked={showChapter}
                    onChange={(e) => setShowChapter(e.target.checked)}
                    className="rounded text-lily-600 accent-lily-600 w-3.5 h-3.5"
                  />
                  <span>Chương</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-ink-700">
                  <input
                    type="checkbox"
                    checked={showAuthor}
                    onChange={(e) => setShowAuthor(e.target.checked)}
                    className="rounded text-lily-600 accent-lily-600 w-3.5 h-3.5"
                  />
                  <span>Tác giả</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-ink-100 bg-cream-50/50 flex items-center justify-between gap-2.5 sticky bottom-0">
            <button
              onClick={closeQuoteEditor}
              className="px-3.5 py-2 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-white transition-colors"
            >
              Đóng
            </button>

            <div className="flex items-center gap-2">
              {canNativeShare && (
                <button
                  onClick={handleShare}
                  disabled={isExporting}
                  className="px-3.5 py-2 rounded-xl border border-lily-300 bg-lily-50 hover:bg-lily-100 text-lily-950 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Share2 className="w-3.5 h-3.5 text-lily-700" />
                  <span>Chia sẻ</span>
                </button>
              )}

              <button
                onClick={handleDownload}
                disabled={isExporting}
                className="px-4 py-2 rounded-xl bg-ink-950 hover:bg-ink-800 text-white text-xs font-semibold shadow-soft flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Đang lưu...' : 'Lưu ảnh PNG'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
