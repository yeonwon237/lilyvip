import React, { useState } from 'react';
import { Bookmark, Check, Copy, ExternalLink, Monitor, Smartphone, Sparkles, X } from 'lucide-react';
import { JjwxcBookmarklet } from '../../book-engine/jjwxc-source/JjwxcBookmarklet';

interface JjwxcBookmarkletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const JjwxcBookmarkletModal: React.FC<JjwxcBookmarkletModalProps> = ({
  isOpen,
  onClose,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://my.lilyhub.top';
  const callbackUrl = `${currentOrigin}/upload?tab=website`;
  const bookmarkletCode = JjwxcBookmarklet.buildBookmarklet(callbackUrl);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletCode);
      setCopied(true);
      onToast?.('Đã sao chép mã Dấu trang!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onToast?.('Không thể sao chép tự động, vui lòng thử lại.', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-ink-950/60 sm:items-center sm:justify-center sm:p-4 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <section className="surface-solid w-full rounded-t-3xl sm:rounded-3xl border-t sm:border border-ink-200 bg-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-modal sm:max-w-lg sm:p-6 text-ink-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-amber-600" /> Thử nghiệm Admin
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink-950">
              Lấy Cookie Tấn Giang 1-Chạm
            </h2>
            <p className="text-xs text-ink-500 leading-relaxed">
              Tự động nhận diện tài khoản Tấn Giang đã đăng nhập mà không cần mở F12 hay sao chép thủ công.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="mt-4 flex rounded-xl bg-ink-100 p-1 text-xs font-semibold text-ink-600">
          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
              activeTab === 'desktop'
                ? 'bg-white text-ink-950 shadow-xs'
                : 'hover:text-ink-900'
            }`}
          >
            <Monitor className="h-3.5 w-3.5 text-pink-600" />
            <span>Máy tính (Kéo thả)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mobile')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 transition-all ${
              activeTab === 'mobile'
                ? 'bg-white text-ink-950 shadow-xs'
                : 'hover:text-ink-900'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5 text-pink-600" />
            <span>Điện thoại (Mobile)</span>
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'desktop' ? (
          <div className="mt-4 space-y-3.5 text-xs text-ink-700">
            <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-4 text-center space-y-2">
              <p className="text-[11px] text-pink-900 font-medium">
                👇 Giữ chuột và <strong>kéo nút này thả lên thanh Dấu trang (Bookmarks)</strong>:
              </p>
              <div>
                <a
                  href={bookmarkletCode}
                  onClick={(e) => {
                    e.preventDefault();
                    onToast?.('👉 Hãy KÉO nút này thả lên thanh Dấu trang của trình duyệt!', 'info');
                  }}
                  draggable="true"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold shadow-sm transition-all cursor-grab active:cursor-grabbing hover:scale-[1.02]"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>🔖 Lấy Cookie Tấn Giang</span>
                </a>
              </div>
              <p className="text-[10px] text-pink-700/80">
                (Nếu thanh Dấu trang đang ẩn, nhấn <strong>Ctrl+Shift+B</strong> hoặc <strong>Cmd+Shift+B</strong> để hiện)
              </p>
            </div>

            <div className="space-y-2 pt-1 border-t border-ink-100">
              <div className="flex gap-2.5 items-start">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-200 text-[11px] font-bold text-ink-700">1</span>
                <p>Kéo nút màu hồng ở trên thả lên thanh Dấu trang của trình duyệt.</p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-200 text-[11px] font-bold text-ink-700">2</span>
                <p>
                  Mở trang{' '}
                  <a
                    href="https://wap.jjwxc.net"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium text-pink-600 underline hover:text-pink-700"
                  >
                    wap.jjwxc.net <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  nơi bạn đã đăng nhập tài khoản đã mua truyện.
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-200 text-[11px] font-bold text-ink-700">3</span>
                <p>
                  Bấm vào Dấu trang vừa lưu. Trình duyệt sẽ tự động đọc phiên đăng nhập và bay trở về LilyVIP kèm cookie!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3.5 text-xs text-ink-700">
            <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-4 space-y-2.5">
              <p className="text-[11px] text-pink-900 font-medium">
                Nhấn nút bên dưới để sao chép mã Dấu trang:
              </p>
              <button
                type="button"
                onClick={handleCopyCode}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold shadow-sm transition-all"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Đã sao chép mã!' : 'Sao chép mã Dấu trang'}</span>
              </button>
            </div>

            <div className="space-y-2 pt-1 border-t border-ink-100">
              <div className="flex gap-2.5 items-start">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-200 text-[11px] font-bold text-ink-700">1</span>
                <p>Nhấn sao chép mã ở trên.</p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-200 text-[11px] font-bold text-ink-700">2</span>
                <p>
                  Trên trình duyệt điện thoại (Safari / Chrome), lưu một Dấu trang bất kỳ. Sau đó vào phần Sửa Dấu trang, <strong>đổi URL thành mã vừa sao chép</strong> và đặt tên là <em>Lấy Cookie JJWXC</em>.
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-200 text-[11px] font-bold text-ink-700">3</span>
                <p>
                  Mở trang{' '}
                  <a
                    href="https://wap.jjwxc.net"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium text-pink-600 underline hover:text-pink-700"
                  >
                    wap.jjwxc.net <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  (đã đăng nhập), mở Dấu trang và chọn <em>Lấy Cookie JJWXC</em> là xong!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions footer */}
        <div className="mt-5 flex items-center justify-between border-t border-ink-200 pt-4">
          <a
            href="https://wap.jjwxc.net"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-600 hover:text-pink-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Mở Tấn Giang (wap.jjwxc.net)
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-ink-950 px-4 py-2 text-xs font-semibold text-white hover:bg-ink-900 transition-colors"
          >
            Đã hiểu
          </button>
        </div>
      </section>
    </div>
  );
};
