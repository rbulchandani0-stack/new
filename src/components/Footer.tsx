import React from 'react';
import { TrendingUp, Shield, Lock, Headphones } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0B0B0B] border-t border-[#1F1F1F] py-10 px-4 sm:px-6 lg:px-8 text-[#777777] text-xs">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-white">
            <div className="w-7 h-7 rounded-lg bg-[#00C853] flex items-center justify-center text-black">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm tracking-wider">APEXTRADER</span>
          </div>
          <p className="leading-relaxed">
            Institutional-grade multi-asset trading infrastructure with high-leverage execution, real-time risk desk, and swift settlement.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-white mb-3">Trading Products</h4>
          <ul className="space-y-2">
            <li>Cryptocurrency Futures</li>
            <li>Spot Foreign Exchange (Forex)</li>
            <li>Precious Metals & Commodities</li>
            <li>Global Market Indices</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white mb-3">Security & Compliance</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Shield className="w-3.5 h-3.5 text-[#00C853]" />
              <span>Multi-Signature Cold Storage</span>
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-[#00C853]" />
              <span>256-bit TLS Encryption</span>
            </div>
            <div className="flex items-center space-x-2">
              <Headphones className="w-3.5 h-3.5 text-[#00C853]" />
              <span>24/7 Trade Support Desk</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-white mb-3">Risk Warning</h4>
          <p className="leading-relaxed text-[11px] text-[#666666]">
            Trading financial instruments with leverage carries a high level of risk to your capital. You should only trade with funds you can afford to lose.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[#181818] text-center text-[#555555]">
        © {new Date().getFullYear()} ApexTrader Global Financial Inc. All rights reserved.
      </div>
    </footer>
  );
};
