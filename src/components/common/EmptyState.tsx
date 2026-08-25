import React from 'react';
import { BookOpen, Search, Folder, BarChart2, WifiOff, Plus } from 'lucide-react';

interface EmptyStateProps {
  type?: 'books' | 'search' | 'shelf' | 'stats' | 'offline';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'books',
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  const defaults = {
    books: {
      icon: BookOpen,
      title: 'Thư viện chưa có truyện',
      desc: 'Hãy tải lên file truyện (TXT, EPUB, DOCX) của bạn để bắt đầu đọc.',
      btn: '+ Thêm truyện đầu tiên',
    },
    search: {
      icon: Search,
      title: 'Không tìm thấy kết quả',
      desc: 'Thử tìm kiếm với từ khóa khác hoặc kiểm tra lại chính tả.',
      btn: undefined,
    },
    shelf: {
      icon: Folder,
      title: 'Tủ sách trống',
      desc: 'Bạn chưa gom cuốn truyện nào vào tủ sách này.',
      btn: '+ Thêm truyện vào tủ',
    },
    stats: {
      icon: BarChart2,
      title: 'Chưa có nhật ký đọc',
      desc: 'Hãy đọc vài trang truyện hôm nay để bắt đầu chuỗi thống kê.',
      btn: 'Bắt đầu đọc',
    },
    offline: {
      icon: WifiOff,
      title: 'Chưa lưu truyện offline',
      desc: 'Tải truyện về máy để đọc khi không có kết nối Internet.',
      btn: undefined,
    },
  }[type];

  const IconComponent = defaults.icon;
  const heading = title || defaults.title;
  const desc = description || defaults.desc;
  const buttonText = actionText || defaults.btn;

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-ink-200/80 bg-white/40 my-4 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-cream-100 text-ink-400 flex items-center justify-center mb-3.5">
        <IconComponent className="w-6 h-6 stroke-[1.5]" />
      </div>

      <h3 className="font-serif font-semibold text-ink-800 text-base mb-1">
        {heading}
      </h3>

      <p className="text-xs text-ink-500 max-w-sm mb-4 leading-relaxed">
        {desc}
      </p>

      {buttonText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-xs font-medium transition-all shadow-sm"
        >
          {buttonText}
        </button>
      )}
    </div>
  );
};
