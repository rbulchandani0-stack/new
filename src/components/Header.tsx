import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  Wallet, 
  User as UserIcon, 
  ShieldCheck, 
  LogOut, 
  LogIn, 
  Menu, 
  X, 
  Layers, 
  History, 
  Sliders, 
  DollarSign, 
  ArrowDownLeft, 
  ArrowUpRight 
} from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenDepositModal: () => void;
  onOpenWithdrawModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenDepositModal,
  onOpenWithdrawModal
}) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user && ['admin', 'co_admin', 'trade_controller', 'finance_manager', 'manager'].includes(user.role);

  return (
    <header className="sticky top-0 z-40 bg-[#0E0E0E]/90 backdrop-blur-md border-b border-[#222222]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('landing')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00C853] to-[#00E676] flex items-center justify-center text-black shadow-lg shadow-[#00C853]/20">
            <TrendingUp className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg tracking-wider text-white">APEX<span className="text-[#00C853]">TRADER</span></span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          <button
            onClick={() => onNavigate('trading')}
            className={`px-3 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-colors ${
              currentView === 'trading' ? 'bg-[#1F1F1F] text-[#00C853]' : 'text-[#A0A0A0] hover:text-white hover:bg-[#161616]'
            }`}
          >
            Trade
          </button>
          <button
            onClick={() => onNavigate('markets')}
            className={`px-3 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-colors ${
              currentView === 'markets' ? 'bg-[#1F1F1F] text-[#00C853]' : 'text-[#A0A0A0] hover:text-white hover:bg-[#161616]'
            }`}
          >
            Markets
          </button>
          <button
            onClick={() => onNavigate('portfolio')}
            className={`px-3 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-colors ${
              currentView === 'portfolio' ? 'bg-[#1F1F1F] text-[#00C853]' : 'text-[#A0A0A0] hover:text-white hover:bg-[#161616]'
            }`}
          >
            Portfolio
          </button>
          <button
            onClick={() => onNavigate('wallet')}
            className={`px-3 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-colors ${
              currentView === 'wallet' ? 'bg-[#1F1F1F] text-[#00C853]' : 'text-[#A0A0A0] hover:text-white hover:bg-[#161616]'
            }`}
          >
            Wallet
          </button>
          <button
            onClick={() => onNavigate('history')}
            className={`px-3 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-colors ${
              currentView === 'history' ? 'bg-[#1F1F1F] text-[#00C853]' : 'text-[#A0A0A0] hover:text-white hover:bg-[#161616]'
            }`}
          >
            History
          </button>
          {isAdmin && (
            <button
              onClick={() => onNavigate('admin')}
              className={`px-3 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-colors flex items-center space-x-1.5 ${
                currentView === 'admin' ? 'bg-[#FF9800]/20 text-[#FF9800] border border-[#FF9800]/40' : 'text-[#FF9800] hover:bg-[#FF9800]/10'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Admin Desk</span>
            </button>
          )}
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <button
                onClick={onOpenDepositModal}
                className="py-1.5 px-3 rounded-lg bg-[#00C853] hover:bg-[#00E676] text-black font-bold text-xs flex items-center space-x-1 transition-colors"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Deposit</span>
              </button>
              <button
                onClick={onOpenWithdrawModal}
                className="py-1.5 px-3 rounded-lg bg-[#1F1F1F] hover:bg-[#282828] text-white font-semibold text-xs border border-[#333333] flex items-center space-x-1 transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Withdraw</span>
              </button>

              <div className="h-6 w-px bg-[#262626]" />

              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center space-x-2 text-xs font-semibold text-[#CCCCCC] hover:text-white"
              >
                <div className="w-7 h-7 rounded-full bg-[#242424] border border-[#333] flex items-center justify-center text-[#00C853]">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <span>{user.name.split(' ')[0]}</span>
              </button>

              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 rounded-lg text-[#8A8A8A] hover:text-[#FF3B30] hover:bg-[#1A1A1A] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white hover:bg-[#1F1F1F] transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#00C853] hover:bg-[#00E676] text-black transition-colors"
              >
                Register
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center space-x-2">
          {user && (
            <button
              onClick={onOpenDepositModal}
              className="py-1 px-2.5 rounded-lg bg-[#00C853] text-black font-bold text-xs"
            >
              Deposit
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#CCCCCC] hover:text-white bg-[#1A1A1A]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#121212] border-b border-[#222222] px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { onNavigate('trading'); setMobileMenuOpen(false); }}
              className="p-2.5 rounded-xl bg-[#1A1A1A] text-left text-xs font-semibold text-white"
            >
              Trade Desk
            </button>
            <button
              onClick={() => { onNavigate('markets'); setMobileMenuOpen(false); }}
              className="p-2.5 rounded-xl bg-[#1A1A1A] text-left text-xs font-semibold text-white"
            >
              Markets
            </button>
            <button
              onClick={() => { onNavigate('portfolio'); setMobileMenuOpen(false); }}
              className="p-2.5 rounded-xl bg-[#1A1A1A] text-left text-xs font-semibold text-white"
            >
              Portfolio
            </button>
            <button
              onClick={() => { onNavigate('wallet'); setMobileMenuOpen(false); }}
              className="p-2.5 rounded-xl bg-[#1A1A1A] text-left text-xs font-semibold text-white"
            >
              Wallet
            </button>
            <button
              onClick={() => { onNavigate('history'); setMobileMenuOpen(false); }}
              className="p-2.5 rounded-xl bg-[#1A1A1A] text-left text-xs font-semibold text-white"
            >
              History
            </button>
            <button
              onClick={() => { onNavigate('profile'); setMobileMenuOpen(false); }}
              className="p-2.5 rounded-xl bg-[#1A1A1A] text-left text-xs font-semibold text-white"
            >
              Profile & KYC
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => { onNavigate('admin'); setMobileMenuOpen(false); }}
              className="w-full p-2.5 rounded-xl bg-[#FF9800]/15 border border-[#FF9800]/40 text-[#FF9800] text-left text-xs font-bold flex items-center space-x-2"
            >
              <Sliders className="w-4 h-4" />
              <span>Admin Management Desk</span>
            </button>
          )}

          {user ? (
            <div className="pt-2 border-t border-[#222222] flex items-center justify-between">
              <div className="text-xs text-[#8A8A8A]">
                Signed in as <span className="text-white font-semibold">{user.name}</span>
              </div>
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="text-xs text-[#FF3B30] font-bold"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-[#222222] flex space-x-2">
              <button
                onClick={() => { onOpenAuth('login'); setMobileMenuOpen(false); }}
                className="flex-1 py-2 rounded-xl bg-[#1F1F1F] text-white text-xs font-semibold text-center"
              >
                Log In
              </button>
              <button
                onClick={() => { onOpenAuth('register'); setMobileMenuOpen(false); }}
                className="flex-1 py-2 rounded-xl bg-[#00C853] text-black text-xs font-bold text-center"
              >
                Register
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
