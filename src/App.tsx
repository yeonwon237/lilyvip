import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ReaderProvider } from './context/ReaderContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { ToastContainer } from './components/common/ToastContainer';
import { UpgradeModal } from './components/common/UpgradeModal';
import { AuthModal } from './components/common/AuthModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';

// Pages
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { LibraryPage } from './pages/LibraryPage';
import { AddBookPage } from './pages/AddBookPage';
import { BookDetailPage } from './pages/BookDetailPage';
import { ReaderPage } from './pages/ReaderPage';
import { ShelvesPage } from './pages/ShelvesPage';
import { StatsPage } from './pages/StatsPage';
import { AudioPage } from './pages/AudioPage';
import { SettingsPage } from './pages/SettingsPage';
import { AccountPage } from './pages/AccountPage';

const AppContent: React.FC = () => {
  const { currentPage } = useApp();

  // Landing page renders in standalone scrollable view
  if (currentPage === 'landing') {
    return (
      <div className="h-screen h-[100dvh] w-full overflow-y-auto bg-[#FAF8F5]">
        <LandingPage />
        <OfflineIndicator />
        <UpgradeModal />
        <AuthModal />
        <ToastContainer />
      </div>
    );
  }

  // Reader renders in full immersive screen
  if (currentPage === 'reader') {
    return (
      <div className="h-screen h-[100dvh] w-full overflow-hidden bg-[#FAF8F5]">
        <ReaderPage />
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
    <div className="h-screen h-[100dvh] w-full overflow-hidden flex bg-[#FAF8F5] text-ink-900 select-none antialiased">
      {/* Desktop Left Sidebar (Fixed on Desktop) */}
      <Sidebar />

      {/* Main App Column: Header (Fixed Top) + Content (Scrolls Smoothly) + Nav (Fixed Bottom on Mobile) */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Fixed Top Header (Never stretches or bounces) */}
        <Header />

        {/* Middle Content Area (ONLY this part scrolls smoothly with momentum) */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-10 lg:px-12 py-3.5 sm:py-5 md:py-6 w-full pb-28 sm:pb-36 lg:pb-16">
          {renderCurrentPage()}
        </main>

        {/* Fixed Mobile Bottom Navigation (Never stretches or moves when content scrolls) */}
        <MobileBottomNav />
      </div>

      {/* Global Modals & Notifications */}
      <OfflineIndicator />
      <UpgradeModal />
      <AuthModal />
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <ReaderProvider>
        <AppContent />
      </ReaderProvider>
    </AppProvider>
  );
};

export default App;
