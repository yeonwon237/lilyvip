import React, { useState } from 'react';
import { X, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, showToast } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('yen.reader@lilyhub.top');
  const [password, setPassword] = useState('••••••••');

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(mode === 'login' ? 'Đã đăng nhập thành công với tài khoản Yen!' : 'Đã tạo tài khoản dùng thử thành công!', 'success');
    setIsAuthModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-modal border border-ink-100 p-6 md:p-8">
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-full text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-lily-100 text-lily-600 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-serif font-bold text-xl text-ink-900">
            {mode === 'login' ? 'Chào mừng bạn trở lại' : 'Tạo tài khoản Lily VIP'}
          </h2>
          <p className="text-xs text-ink-500 mt-1">
            {mode === 'login' ? 'Đăng nhập để tiếp tục đọc và đồng bộ tủ sách' : 'Bắt đầu với 3 slot truyện cá nhân miễn phí'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-lily-500/20 focus:border-lily-500 text-sm"
              placeholder="tenban@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-lily-500/20 focus:border-lily-500 text-sm"
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-ink-900 hover:bg-ink-800 text-white text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</span>
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-center text-xs text-ink-500">
          <span>{mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</span>
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="ml-1.5 font-semibold text-lily-700 hover:underline"
          >
            {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
};
