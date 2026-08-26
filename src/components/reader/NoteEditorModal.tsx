import React, { useState, useEffect, useRef } from 'react';
import { X, Check, PenLine, Sparkles } from 'lucide-react';
import { HighlightColor, Annotation } from '../../types';

export interface NoteEditorData {
  annotationId?: string; // If editing existing
  selectedText: string;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  color: HighlightColor;
  initialNote?: string;
}

interface NoteEditorModalProps {
  isOpen: boolean;
  data: NoteEditorData | null;
  onClose: () => void;
  onSave: (noteText: string, color: HighlightColor) => Promise<void>;
}

export const HIGHLIGHT_COLORS: Array<{
  id: HighlightColor;
  name: string;
  bgClass: string;
  dotColor: string;
}> = [
  { id: 'yellow', name: 'Vàng kem', bgClass: 'bg-amber-100 border-amber-300 text-amber-950', dotColor: '#F59E0B' },
  { id: 'pink', name: 'Hồng phấn', bgClass: 'bg-rose-100 border-rose-300 text-rose-950', dotColor: '#FB7185' },
  { id: 'purple', name: 'Tím lavender', bgClass: 'bg-purple-100 border-purple-300 text-purple-950', dotColor: '#8B5CF6' },
  { id: 'green', name: 'Xanh sage', bgClass: 'bg-emerald-100 border-emerald-300 text-emerald-950', dotColor: '#22C55E' },
];

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  isOpen,
  data,
  onClose,
  onSave,
}) => {
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('yellow');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && data) {
      setNoteText(data.initialNote || '');
      setSelectedColor(data.color || 'yellow');
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen, data]);

  if (!isOpen || !data) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    try {
      setIsSaving(true);
      await onSave(noteText.trim(), selectedColor);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-950/40 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-modal border border-ink-100/80 overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[90dvh] overflow-y-auto safe-area-pb"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between bg-cream-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-lily-100 text-lily-800 flex items-center justify-center">
              <PenLine className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-bold text-sm text-ink-950">
              {data.annotationId ? 'Chỉnh sửa ghi chú' : 'Thêm ghi chú cá nhân'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-ink-400 hover:text-ink-900 hover:bg-ink-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Quote Excerpt */}
          <div className="p-3.5 rounded-2xl bg-cream-50 border border-ink-100/70 text-xs sm:text-[13px] text-ink-800 italic font-serif leading-relaxed line-clamp-3">
            “{data.selectedText}”
          </div>

          {/* Color Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
              Màu đánh dấu
            </label>
            <div className="flex items-center gap-2">
              {HIGHLIGHT_COLORS.map((col) => {
                const isSelected = selectedColor === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setSelectedColor(col.id)}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? `${col.bgClass} shadow-xs ring-2 ring-lily-500/30 scale-[1.02]`
                        : 'bg-white border-ink-200/70 text-ink-600 hover:bg-cream-50'
                    }`}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: col.dotColor }}
                    />
                    <span className="truncate">{col.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="note-textarea" className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                Ghi chú của bạn
              </label>
              <span className="text-[10px] text-ink-400">Ctrl + Enter để lưu</span>
            </div>
            <textarea
              id="note-textarea"
              ref={textareaRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập suy nghĩ, cảm nhận hoặc liên tưởng về đoạn này..."
              rows={4}
              maxLength={1500}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-ink-200 bg-white text-ink-900 text-xs sm:text-sm placeholder:text-ink-400 focus:outline-hidden focus:border-lily-500 focus:ring-2 focus:ring-lily-500/20 transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-cream-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-ink-950 text-white text-xs font-semibold shadow-soft hover:bg-ink-900 flex items-center gap-1.5 transition-all disabled:opacity-50 active:scale-95"
            >
              <Check className="w-3.5 h-3.5 text-lily-400" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu ghi chú'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
