import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MarketProvider, useMarket } from './context/MarketContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MobileNavBar } from './components/MobileNavBar';
import { AuthModal } from './components/AuthModal';
import { DepositModal } from './components/DepositModal';
import { WithdrawModal } from './components/WithdrawModal';
import { GlobalToastContainer } from './components/GlobalToastContainer';
import { TransactionSuccessModal } from './components/TransactionSuccessModal';
import { CustomerSupportChat } from './components/CustomerSupportChat';

import { LandingPage } from './views/LandingPage';
import { TradingViewPage } from './views/TradingViewPage';
import { MarketOverviewPage } from './views/MarketOverviewPage';
import { PortfolioPage } from './views/PortfolioPage';
import { WalletView } from './views/WalletView';
import { HistoryPage } from './views/HistoryPage';
import { ProfilePage } from './views/ProfilePage';
import { AdminPanelPage } from './views/AdminPanelPage';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('trading');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  const { setSelectedSymbol } = useMarket();

  const handleSelectMarket = (symbol: string) => {
    setSelectedSymbol(symbol);
    setCurrentView('trading');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col selection:bg-[#00C853]/30 selection:text-white">
      {/* Header Navigation */}
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        onOpenAuth={(mode = 'login') => {
          setAuthMode(mode);
          setAuthModalOpen(true);
        }}
        onOpenDepositModal={() => setDepositModalOpen(true)}
        onOpenWithdrawModal={() => setWithdrawModalOpen(true)}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 pb-20 md:pb-8">
        {currentView === 'landing' && (
          <LandingPage
            onStartTrading={() => setCurrentView('trading')}
            onOpenAuth={() => {
              setAuthMode('register');
              setAuthModalOpen(true);
            }}
          />
        )}
        {currentView === 'trading' && <TradingViewPage />}
        {currentView === 'markets' && <MarketOverviewPage onSelectMarket={handleSelectMarket} />}
        {currentView === 'portfolio' && <PortfolioPage />}
        {currentView === 'wallet' && <WalletView />}
        {currentView === 'history' && <HistoryPage />}
        {currentView === 'profile' && <ProfilePage />}
        {currentView === 'admin' && <AdminPanelPage />}
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Bar */}
      <MobileNavBar
        currentView={currentView}
        onNavigate={setCurrentView}
        onOpenDepositModal={() => setDepositModalOpen(true)}
      />

      {/* Modals & Portals */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />

      <DepositModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
      />

      <WithdrawModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
      />

      {/* Global Real-Time Feedback Toasts */}
      <GlobalToastContainer />

      {/* Global Transaction Submission Centered Confirmation Popup */}
      <TransactionSuccessModal />

      {/* 24/7 Live Customer Support Chat Widget */}
      <CustomerSupportChat />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MarketProvider>
        <AppContent />
      </MarketProvider>
    </AuthProvider>
  );
};

export default App;
