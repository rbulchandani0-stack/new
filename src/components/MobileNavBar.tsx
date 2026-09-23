import React from 'react';
import { TrendingUp, LayoutGrid, Wallet, Layers, Sliders } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MobileNavBarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenDepositModal: () => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  currentView,
  onNavigate,
  onOpenDepositModal
}) => {
  const { user } = useAuth();
  const isAdmin = user && ['admin', 'co_admin', 'trade_controller', 'finance_manager', 'manager'].includes(user.role);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0E0E0E]/95 backdrop-blur-lg border-t border-[#222222] px-2 py-2 flex items-center justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <button
        onClick={() => onNavigate('trading')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
          currentView === 'trading' ? 'text-[#00C853]' : 'text-[#8A8A8A]'
        }`}
      >
        <TrendingUp className="w-5 h-5" />
        <span className="text-[10px] font-medium mt-1">Trade</span>
      </button>

      <button
        onClick={() => onNavigate('markets')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
          currentView === 'markets' ? 'text-[#00C853]' : 'text-[#8A8A8A]'
        }`}
      >
        <LayoutGrid className="w-5 h-5" />
        <span className="text-[10px] font-medium mt-1">Markets</span>
      </button>

      <button
        onClick={() => onNavigate('portfolio')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
          currentView === 'portfolio' ? 'text-[#00C853]' : 'text-[#8A8A8A]'
        }`}
      >
        <Layers className="w-5 h-5" />
        <span className="text-[10px] font-medium mt-1">Portfolio</span>
      </button>

      <button
        onClick={() => onNavigate('wallet')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
          currentView === 'wallet' ? 'text-[#00C853]' : 'text-[#8A8A8A]'
        }`}
      >
        <Wallet className="w-5 h-5" />
        <span className="text-[10px] font-medium mt-1">Wallet</span>
      </button>

      {isAdmin && (
        <button
          onClick={() => onNavigate('admin')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${
            currentView === 'admin' ? 'text-[#FF9800]' : 'text-[#8A8A8A]'
          }`}
        >
          <Sliders className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">Admin</span>
        </button>
      )}
    </div>
  );
};
