import React, { Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ReaderProvider } from './context/ReaderContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ToastContainer } from './components/common/ToastContainer';
import { UpgradeModal } from './components/common/UpgradeModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';

import { LandingPage } from './pages/LandingPage';

const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const LibraryPage = lazy(() => import('./pages/LibraryPage').then(module => ({ default: module.LibraryPage })));
const AddBookPage = lazy(() => import('./pages/AddBookPage').then(module => ({ default: module.AddBookPage })));
const BookDetailPage = lazy(() => import('./pages/BookDetailPage').then(module => ({ default: module.BookDetailPage })));
const ReaderPage = lazy(() => import('./pages/ReaderPage').then(module => ({ default: module.ReaderPage })));
const ShelvesPage = lazy(() => import('./pages/ShelvesPage').then(module => ({ default: module.ShelvesPage })));
const StatsPage = lazy(() => import('./pages/StatsPage').then(module => ({ default: module.StatsPage })));
const AudioPage = lazy(() => import('./pages/AudioPage').then(module => ({ default: module.AudioPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then(module => ({ default: module.AccountPage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then(module => ({ default: module.LegalPage })));
const AudioPlayerSheet = lazy(() => import('./components/audio/AudioPlayerSheet').then(module => ({ default: module.AudioPlayerSheet })));
const MiniAudioPlayer = lazy(() => import('./components/audio/MiniAudioPlayer').then(module => ({ default: module.MiniAudioPlayer })));

const PageLoading = () => <div className="flex min-h-48 items-center justify-center text-sm text-ink-500">Đang mở Lily Reader…</div>;

const AppContent: React.FC = () => {
  const { currentPage, libraryError, reloadLocalBooks, appTheme } = useApp();
  const contentRef = React.useRef<HTMLElement>(null);
  const darkClass = appTheme === 'dark' ? 'dark' : '';

  React.useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentPage]);

  const libraryErrorNotice = libraryError ? (
    <div className="fixed inset-x-3 top-3 z-[80] mx-auto max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-3.5 shadow-modal flex items-center justify-between gap-3">
      <p className="text-xs text-amber-950">{libraryError}</p>
      <button onClick={() => reloadLocalBooks()} className="shrink-0 rounded-xl bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white">Thử lại</button>
    </div>
  ) : null;

  // Public pages render without the reader workspace chrome.
  if (currentPage === 'landing' || currentPage === 'login' || currentPage === 'legal') {
    return (
      <div className={`h-screen h-[100dvh] w-full overflow-y-auto bg-[#FAF8F5] ${darkClass}`}>
        <Suspense fallback={<PageLoading />}>{currentPage === 'landing' ? <LandingPage /> : currentPage === 'login' ? <LoginPage /> : <LegalPage />}</Suspense>
        {libraryErrorNotice}
        <OfflineIndicator />
        <UpgradeModal />
        <ToastContainer />
      </div>
    );
  }

  // Reader renders in full immersive screen
  if (currentPage === 'reader') {
    return (
      <div className="h-screen h-[100dvh] w-full overflow-hidden bg-[#FAF8F5]">
        <Suspense fallback={<PageLoading />}><ReaderPage /></Suspense>
        {libraryErrorNotice}
        <OfflineIndicator />
        <UpgradeModal />
        <ToastContainer />
      </div>
    );
  }

  // Standard App Views with Fixed Top Header, Scrollable Middle Content, and Fixed Bottom Nav
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'library':
        return <LibraryPage />;
      case 'add-book':
        return <AddBookPage />;
      case 'book-detail':
        return <BookDetailPage />;
      case 'shelves':
        return <ShelvesPage />;
      case 'stats':
        return <StatsPage />;
      case 'audio':
        return <AudioPage />;
      case 'settings':
        return <SettingsPage />;
      case 'account':
        return <AccountPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className={`luxury-app h-screen h-[100dvh] w-full overflow-hidden flex text-ink-900 select-none antialiased ${darkClass}`}>
      {/* Desktop Left Sidebar (Fixed on Desktop) */}
      <Sidebar />

      {/* Main App Column: Header (Fixed Top) + Content (Scrolls Smoothly) + Nav (Fixed Bottom on Mobile) */}
      <div className="luxury-app-column flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Fixed Top Header (Never stretches or bounces) */}
        <Header />

        {/* Middle Content Area (ONLY this part scrolls smoothly with momentum) */}
        <main ref={contentRef} className="luxury-content flex-1 overflow-y-auto px-3 sm:px-6 md:px-10 lg:px-12 py-4 sm:py-6 md:py-8 w-full pb-28 sm:pb-36 lg:pb-16">
          <Suspense fallback={<PageLoading />}>{renderCurrentPage()}</Suspense>
        </main>

        {/* Fixed Mobile Bottom Navigation (Never stretches or moves when content scrolls) */}
        <MobileBottomNav />
      </div>

      {/* Persistent Global Floating Audio Players */}
      <Suspense fallback={null}><MiniAudioPlayer /><AudioPlayerSheet /></Suspense>

      {/* Global Modals & Notifications */}
      {libraryErrorNotice}
      <OfflineIndicator />
      <UpgradeModal />
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppErrorBoundary>
      <AppProvider>
        <ReaderProvider>
          <AppContent />
        </ReaderProvider>
      </AppProvider>
    </AppErrorBoundary>
  );
};

export default App;
