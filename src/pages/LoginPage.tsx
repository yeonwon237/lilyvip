import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Link2, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LilyHubClient } from '../book-engine/lilyhub/LilyHubClient';

export const LoginPage: React.FC = () => {
  const { user, navigateTo, refreshLilyHubSession } = useApp();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    refreshLilyHubSession().finally(() => {
      setChecking(false);
      const url = new URL(window.location.href);
      if (url.searchParams.has('connect')) {
        url.searchParams.delete('connect');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      }
    });
  }, [refreshLilyHubSession]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError('');
    try {
      await LilyHubClient.signIn(email, password);
      setPassword('');
      const connected = await refreshLilyHubSession();
      if (!connected) throw new Error('Đã đăng nhập nhưng chưa đọc được phiên tài khoản.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chưa thể đăng nhập.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10 text-ink-900">
      <button
        type="button"
        onClick={() => navigateTo('dashboard')}
        className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-white hover:text-ink-900 sm:left-8 sm:top-8"
        aria-label="Quay lại"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <section className="w-full max-w-sm text-center">
        <img src="/lilyhub-logo.png" alt="LilyHub" className="mx-auto h-auto w-40" />

        <div className="mx-auto my-8 flex items-center justify-center gap-3 text-lily-700">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-lily-200 bg-white shadow-sm">
            <BookOpen className="h-5 w-5" />
          </span>
          <Link2 className="h-4 w-4 text-ink-300" />
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-950 text-white shadow-sm" aria-hidden="true">
            <BookOpen className="h-5 w-5" strokeWidth={1.8} />
          </span>
        </div>

        {checking ? (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang kiểm tra tài khoản
          </div>
        ) : user.lilyHubConnected ? (
          <div>
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-4 w-4" />
            </span>
            <h1 className="mt-4 font-serif text-2xl font-bold">Đã kết nối</h1>
            <p className="mt-1 text-sm text-ink-500">{user.name}{user.email ? ` · ${user.email}` : ''}</p>
            <button type="button" onClick={() => navigateTo('dashboard')} className="mt-7 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 text-sm font-semibold text-white shadow-soft">
              Vào thư viện <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <h1 className="font-serif text-2xl font-bold">Kết nối LilyHub</h1>
            <p className="mt-2 text-sm text-ink-500">Dùng tài khoản LilyHub trên Lily Reader.</p>
            <div className="mt-7 space-y-3 text-left">
              <label className="block text-xs font-semibold text-ink-700">
                Email
                <input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="ban@example.com" className="mt-1.5 h-11 w-full border border-ink-200 bg-white px-3 text-sm outline-none focus:border-lily-500" required />
              </label>
              <label className="block text-xs font-semibold text-ink-700">
                Mật khẩu
                <input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Nhập mật khẩu" className="mt-1.5 h-11 w-full border border-ink-200 bg-white px-3 text-sm outline-none focus:border-lily-500" required />
              </label>
            </div>
            {error && <p role="alert" className="mt-3 bg-rose-50 px-3 py-2 text-left text-xs text-rose-700">{error}</p>}
            <button type="submit" disabled={submitting} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 bg-ink-950 px-4 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-ink-800 disabled:opacity-60">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang đăng nhập</> : <>Đăng nhập <ArrowRight className="h-4 w-4" /></>}
            </button>
            <a href={LilyHubClient.registerUrl()} target="_blank" rel="noreferrer" className="mt-3 flex min-h-10 w-full items-center justify-center border border-ink-200 px-4 text-xs font-semibold text-ink-700">
              Tạo tài khoản LilyHub
            </a>
            <p className="mt-2 text-[11px] text-ink-500">Một tài khoản dùng cho cả LilyHub và Lily Reader.</p>
            <button type="button" onClick={() => navigateTo('dashboard')} className="mt-3 px-3 py-2 text-xs font-medium text-ink-500 hover:text-ink-900">
              Tiếp tục không đăng nhập
            </button>
          </form>
        )}
      </section>
    </main>
  );
};
