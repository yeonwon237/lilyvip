import React, { useState } from 'react';
import { 
  X, 
  Highlighter, 
  FileText, 
  BookOpen, 
  Sparkles, 
  Trash2, 
  Clock, 
  PenLine,
  BookmarkCheck,
  Check
} from 'lucide-react';
import { useReader } from '../../context/ReaderContext';
import { useApp } from '../../context/AppContext';
import { Annotation } from '../../types';
import { HIGHLIGHT_COLORS } from './NoteEditorModal';
import { formatRelativeTime } from '../../utils/dateUtils';

type FilterTab = 'all' | 'notes' | 'highlights';

export const AnnotationDrawer: React.FC = () => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const { 
    isAnnotationDrawerOpen, 
    setIsAnnotationDrawerOpen, 
    bookAnnotations, 
    deleteAnnotationById, 
    jumpToAnnotation, 
    openQuoteEditor,
    openNoteEditorForAnnotation
  } = useReader();
  const { currentBook } = useApp();

  if (!isAnnotationDrawerOpen) return null;

  const notesCount = bookAnnotations.filter(a => !!a.note && a.note.trim().length > 0).length;
  const highlightsCount = bookAnnotations.filter(a => !a.note || a.note.trim().length === 0).length;

  const filteredList = bookAnnotations.filter(a => {
    const hasNote = !!a.note && a.note.trim().length > 0;
    if (filterTab === 'notes') return hasNote;
    if (filterTab === 'highlights') return !hasNote;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-950/30 backdrop-blur-xs">
      <div 
        className="w-full max-w-md bg-white h-full shadow-modal flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-ink-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lily-100 text-lily-800 flex items-center justify-center">
              <Highlighter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-ink-950">
                Ghi chú & Đánh dấu ({bookAnnotations.length})
              </h3>
              <p className="text-[11px] text-ink-500 truncate max-w-[200px] sm:max-w-[240px]">
                {currentBook?.title || 'Truyện đang đọc'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAnnotationDrawerOpen(false)}
            className="p-1.5 rounded-full text-ink-400 hover:text-ink-900 hover:bg-ink-100 transition-colors"
            aria-label="Đóng danh sách ghi chú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-ink-100/70 bg-cream-50/40 flex items-center gap-1.5">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filterTab === 'all'
                ? 'bg-ink-950 text-white shadow-xs'
                : 'text-ink-600 hover:bg-ink-100/60'
            }`}
          >
            Tất cả ({bookAnnotations.length})
          </button>

          <button
            onClick={() => setFilterTab('notes')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filterTab === 'notes'
                ? 'bg-ink-950 text-white shadow-xs'
                : 'text-ink-600 hover:bg-ink-100/60'
            }`}
          >
            Ghi chú ({notesCount})
          </button>

          <button
            onClick={() => setFilterTab('highlights')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              filterTab === 'highlights'
                ? 'bg-ink-950 text-white shadow-xs'
                : 'text-ink-600 hover:bg-ink-100/60'
            }`}
          >
            Đánh dấu ({highlightsCount})
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-ink-100/60">
          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-cream-100 text-ink-400 flex items-center justify-center shadow-soft">
                <Highlighter className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-sm text-ink-900">
                  {filterTab === 'notes' 
                    ? 'Chưa có ghi chú nào' 
                    : filterTab === 'highlights' 
                    ? 'Chưa có đoạn đánh dấu nào' 
                    : 'Chưa có ghi chú hay đánh dấu'}
                </h4>
                <p className="text-xs text-ink-500 max-w-[240px] leading-relaxed">
                  Khi đọc truyện, hãy bôi chọn đoạn văn yêu thích để tô màu đánh dấu hoặc viết thêm ghi chú cá nhân.
                </p>
              </div>
            </div>
          ) : (
            filteredList.map((ann) => {
              const colorInfo = HIGHLIGHT_COLORS.find(c => c.id === ann.color);
              return (
                <div 
                  key={ann.id}
                  className="pt-3.5 first:pt-0 group bg-white hover:bg-cream-50/50 p-3.5 rounded-2xl border border-ink-100/80 transition-all shadow-xs space-y-3"
                >
                  {/* Meta Header */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: colorInfo?.dotColor || '#F59E0B' }}
                      />
                      <span className="font-semibold text-ink-900 text-[11px]">
                        {ann.chapterTitle || `Chương ${ann.chapterIndex}`}
                      </span>
                    </div>

                    <span className="text-[11px] text-ink-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(ann.updatedAt || ann.createdAt)}</span>
                    </span>
                  </div>

                  {/* Excerpt */}
                  <div 
                    onClick={() => jumpToAnnotation(ann)}
                    className="cursor-pointer text-xs sm:text-[13px] text-ink-800 italic font-serif leading-relaxed line-clamp-4 pl-2.5 border-l-2 hover:opacity-80 transition-opacity"
                    style={{ borderColor: colorInfo?.dotColor || '#F59E0B' }}
                  >
                    “{ann.selectedText}”
                  </div>

                  {/* Attached Note if exists */}
                  {ann.note ? (
                    <div className="p-2.5 rounded-xl bg-lily-50/60 border border-lily-100 text-xs text-ink-800 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-lily-800">
                        <FileText className="w-3 h-3 text-lily-600" />
                        <span>Ghi chú:</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap font-sans">
                        {ann.note}
                      </p>
                    </div>
                  ) : null}

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      onClick={() => jumpToAnnotation(ann)}
                      className="px-2.5 py-1.5 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                    >
                      <BookOpen className="w-3 h-3" />
                      <span>Đọc lại</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openNoteEditorForAnnotation(ann)}
                        className="px-2.5 py-1.5 rounded-xl border border-ink-200 bg-white hover:bg-cream-50 text-ink-800 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95"
                      >
                        <PenLine className="w-3 h-3 text-ink-600" />
                        <span>{ann.note ? 'Sửa' : 'Thêm note'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsAnnotationDrawerOpen(false);
                          openQuoteEditor({
                            text: ann.selectedText,
                            bookTitle: currentBook?.title,
                            chapterTitle: ann.chapterTitle,
                            author: currentBook?.author,
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-lily-200 bg-lily-50/80 hover:bg-lily-100 text-lily-900 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95"
                      >
                        <Sparkles className="w-3 h-3 text-lily-600" />
                        <span>Tạo ảnh</span>
                      </button>

                      <button
                        onClick={() => deleteAnnotationById(ann.id)}
                        className="p-1.5 rounded-xl text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Xóa đánh dấu này"
                        aria-label="Xóa annotation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
