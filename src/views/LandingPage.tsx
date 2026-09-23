import React from 'react';
import { TrendingUp, ShieldCheck, Zap, Globe, ArrowRight, BarChart3, Lock, Users } from 'lucide-react';

interface LandingPageProps {
  onStartTrading: () => void;
  onOpenAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartTrading, onOpenAuth }) => {
  return (
    <div className="space-y-16 py-8 sm:py-16">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#1A1A1A] border border-[#2E2E2E] text-xs font-semibold text-[#00C853]">
          <span className="w-2 h-2 rounded-full bg-[#00C853] animate-ping" />
          <span>Institutional Liquidity & Sub-Millisecond Execution</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-tight">
          Next-Gen Multi-Asset <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00C853] to-[#00E676]">
            High Leverage Trading
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#999999] leading-relaxed">
          Access deep liquidity pools across Crypto, Forex, Indices, and Commodities with up to 100x leverage, ultra-tight spreads, and instant settlement.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={onStartTrading}
            className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-[#00C853] hover:bg-[#00E676] text-black font-extrabold text-sm transition-all cursor-pointer shadow-lg shadow-[#00C853]/25 flex items-center justify-center space-x-2"
          >
            <span>Launch Trading Terminal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenAuth}
            className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-[#1A1A1A] hover:bg-[#242424] text-white font-bold text-sm border border-[#2E2E2E] transition-all cursor-pointer"
          >
            Create Live Account
          </button>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-[#121212] border border-[#222222] rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#00C853]/15 text-[#00C853] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Ultra-Low Latency</h3>
            <p className="text-xs text-[#8A8A8A] leading-relaxed">
              Match orders in under 1.2ms with direct market access and minimal slippage on all instruments.
            </p>
          </div>

          <div className="p-6 bg-[#121212] border border-[#222222] rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#00C853]/15 text-[#00C853] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Bank-Grade Custody</h3>
            <p className="text-xs text-[#8A8A8A] leading-relaxed">
              100% cold storage reserve backing, multi-signature authentication, and automated fraud defense.
            </p>
          </div>

          <div className="p-6 bg-[#121212] border border-[#222222] rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#00C853]/15 text-[#00C853] flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Real-Time Risk Desk</h3>
            <p className="text-xs text-[#8A8A8A] leading-relaxed">
              Advanced margin management, real-time liquidation buffers, and customizable trade controls.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
