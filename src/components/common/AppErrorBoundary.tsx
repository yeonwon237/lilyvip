import React from 'react';

interface State { hasError: boolean }

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[Lily] Lỗi giao diện:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="min-h-[100dvh] bg-[#FAF8F5] px-5 flex items-center justify-center text-ink-900">
        <section className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-6 text-center shadow-card">
          <img src="/lilyhub-icon.png" alt="" className="mx-auto h-16 w-16 object-contain" />
          <h1 className="mt-4 font-serif text-2xl font-bold">Lily gặp một lỗi nhỏ</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">Bạn có thể thử mở lại trang. Thao tác này không xóa dữ liệu đã lưu trên thiết bị.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button onClick={() => window.location.reload()} className="rounded-xl bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white">Thử lại</button>
            <button onClick={() => { window.location.hash = ''; window.location.reload(); }} className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold">Về thư viện</button>
          </div>
        </section>
      </main>
    );
  }
}
