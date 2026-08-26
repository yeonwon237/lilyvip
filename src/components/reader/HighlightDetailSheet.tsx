import React from 'react';
import { 
  X, 
  PenLine, 
  Sparkles, 
  Trash2, 
  Palette, 
  FileText,
  Clock
} from 'lucide-react';
import { Annotation, HighlightColor } from '../../types';
import { HIGHLIGHT_COLORS } from './NoteEditorModal';
import { formatRelativeTime } from '../../utils/dateUtils';

interface HighlightDetailSheetProps {
  annotation: Annotation | null;
  isOpen: boolean;
  onClose: () => void;
  onEditNote: (annotation: Annotation) => void;
  onChangeColor: (annotationId: string, color: HighlightColor) => Promise<void>;
  onDeleteNote: (annotationId: string) => Promise<void>;
  onDeleteAnnotation: (annotationId: string) => Promise<void>;
  onCreateQuote: (annotation: Annotation) => void;
}

export const HighlightDetailSheet: React.FC<HighlightDetailSheetProps> = ({
  annotation,
  isOpen,
  onClose,
  onEditNote,
  onChangeColor,
  onDeleteNote,
  onDeleteAnnotation,
  onCreateQuote,
}) => {
  if (!isOpen || !annotation) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-950/35 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-modal border border-ink-100/80 overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-ink-100 flex items-center justify-between bg-cream-50/50">
          <div className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full shadow-xs"
              style={{
                backgroundColor: HIGHLIGHT_COLORS.find(c => c.id === annotation.color)?.dotColor || '#F59E0B'
              }}
            />
            <span className="font-serif font-bold text-xs text-ink-900">
              Đoạn đánh dấu · {annotation.chapterTitle || `Chương ${annotation.chapterIndex}`}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-ink-400 hover:text-ink-900 hover:bg-ink-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Quote Excerpt */}
          <div className="p-3.5 rounded-2xl bg-cream-50 border border-ink-100/70 text-xs sm:text-[13px] text-ink-800 italic font-serif leading-relaxed line-clamp-4">
            “{annotation.selectedText}”
          </div>

          {/* Attached Note Display if exists */}
          {annotation.note ? (
            <div className="p-3.5 rounded-2xl bg-lily-50/60 border border-lily-200/70 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-lily-900">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-lily-600" />
                  <span>Ghi chú của bạn:</span>
                </span>
                <span className="text-[10px] text-ink-400 font-normal">
                  {formatRelativeTime(annotation.updatedAt || annotation.createdAt)}
                </span>
              </div>
              <p className="text-xs text-ink-800 leading-relaxed whitespace-pre-wrap font-sans">
                {annotation.note}
              </p>
            </div>
          ) : null}

          {/* Quick Color Swatches */}
          <div className="flex items-center justify-between gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-ink-400">Đổi màu:</span>
            <div className="flex items-center gap-2">
              {HIGHLIGHT_COLORS.map((col) => {
                const isActive = annotation.color === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => onChangeColor(annotation.id, col.id)}
                    className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all ${
                      isActive 
                        ? 'ring-2 ring-lily-500 scale-110 shadow-xs border-white' 
                        : 'border-ink-200/60 hover:scale-105'
                    }`}
                    style={{ backgroundColor: col.dotColor }}
                    title={col.name}
                    aria-label={`Chọn màu ${col.name}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Action Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-ink-100">
            {/* Note edit / add */}
            <button
              onClick={() => {
                onClose();
                onEditNote(annotation);
              }}
              className="p-2.5 rounded-xl border border-ink-200 bg-white hover:bg-cream-50 text-ink-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <PenLine className="w-3.5 h-3.5 text-lily-700" />
              <span>{annotation.note ? 'Sửa ghi chú' : 'Thêm ghi chú'}</span>
            </button>

            {/* Create Quote Card */}
            <button
              onClick={() => {
                onClose();
                onCreateQuote(annotation);
              }}
              className="p-2.5 rounded-xl border border-lily-200 bg-lily-50/70 hover:bg-lily-100 text-lily-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-lily-600" />
              <span>Tạo ảnh trích dẫn</span>
            </button>

            {/* Delete note only (if note exists) */}
            {annotation.note && (
              <button
                onClick={() => onDeleteNote(annotation.id)}
                className="col-span-1 p-2 rounded-xl text-ink-500 hover:text-red-700 hover:bg-red-50 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
              >
                <span>Xóa ghi chú này</span>
              </button>
            )}

            {/* Delete highlight */}
            <button
              onClick={() => {
                onDeleteAnnotation(annotation.id);
                onClose();
              }}
              className={`${annotation.note ? 'col-span-1' : 'col-span-2'} p-2 rounded-xl text-red-600 hover:bg-red-50 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa đánh dấu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
