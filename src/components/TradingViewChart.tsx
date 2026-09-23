import React, { useState, useRef } from 'react';
import { Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { useMarket } from '../context/MarketContext';

export const TradingViewChart: React.FC = () => {
  const { activePair } = useMarket();

  const [timeframe, setTimeframe] = useState<string>('1h');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive exact TradingView symbol string
  const getTvSymbol = () => {
    if (activePair.tvSymbol) return activePair.tvSymbol;

    const sym = activePair.symbol.toUpperCase();
    if (sym === 'XAU/USD' || sym.includes('GOLD')) return 'OANDA:XAUUSD';
    if (sym === 'XAG/USD' || sym.includes('SILVER')) return 'OANDA:XAGUSD';
    if (sym === 'EUR/GBP') return 'FX:EURGBP';
    if (sym === 'EUR/USD') return 'FX:EURUSD';
    if (sym === 'GBP/USD') return 'FX:GBPUSD';
    if (sym === 'USD/JPY') return 'FX:USDJPY';
    if (sym === 'USD/INR') return 'FX_IDC:USDINR';

    // Crypto default
    const clean = sym.replace('/', '').replace('-', '');
    return `BINANCE:${clean}`;
  };

  const tvSymbol = getTvSymbol();

  // Convert timeframe format to TradingView interval string
  const getTvInterval = (tf: string) => {
    switch (tf) {
      case '1m': return '1';
      case '5m': return '5';
      case '15m': return '15';
      case '1h': return '60';
      case '4h': return '240';
      case '1D': return 'D';
      default: return '60';
    }
  };

  const tvInterval = getTvInterval(timeframe);

  // Construct iframe URL for TradingView widget
  const tvWidgetUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tv_chart_${activePair.symbol.replace('/', '_')}&symbol=${encodeURIComponent(tvSymbol)}&interval=${tvInterval}&hidesidetoolbar=0&symboledit=0&saveimage=1&toolbarbg=121212&theme=dark&style=1&timezone=Etc%2FUTC&studies=RSI%40tv-basicstudies%2CMASimple%40tv-basicstudies`;

  return (
    <div 
      ref={containerRef} 
      className={`bg-[#0A0A0A] border border-[#222222] rounded-2xl overflow-hidden flex flex-col w-full max-w-full transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-full' : 'h-[380px] sm:h-[460px] md:h-[520px] lg:h-[550px] xl:h-[560px]'
      }`}
    >
      {/* Chart Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 bg-[#121212] border-b border-[#222222] text-xs gap-2 shrink-0">
        {/* Left Pair Title & Timeframes */}
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto no-scrollbar">
          <span className="font-extrabold text-xs sm:text-sm text-white flex items-center space-x-1.5 shrink-0">
            <span>{activePair.symbol}</span>
            <span className="text-[9px] sm:text-[10px] text-[#00C853] bg-[#00C853]/10 border border-[#00C853]/20 px-1.5 py-0.5 rounded font-mono font-semibold flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-ping mr-1 shrink-0" />
              LIVE
            </span>
          </span>

          <div className="h-4 w-px bg-[#222222] shrink-0" />

          {/* Timeframe Selector */}
          <div className="flex items-center space-x-0.5 sm:space-x-1 bg-[#1A1A1A] p-0.5 rounded-lg border border-[#2A2A2A] shrink-0">
            {['1m', '5m', '15m', '1h', '4h', '1D'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-mono text-[10px] sm:text-[11px] transition-colors ${
                  timeframe === tf
                    ? 'bg-[#222] text-[#00C853] font-bold border border-[#00C853]/30'
                    : 'text-[#8A8A8A] hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 ml-auto">
          <div className="text-[11px] font-mono text-[#8A8A8A] hidden md:block">
            Ticker: <span className="text-white font-semibold">{tvSymbol}</span>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#8A8A8A] hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Chart Body (TradingView Pro Widget) */}
      <div className="relative flex-1 w-full h-full bg-[#0A0A0A] overflow-hidden">
        <iframe
          key={`${activePair.symbol}_${tvSymbol}_${tvInterval}`}
          title={`TradingView Chart - ${activePair.symbol}`}
          src={tvWidgetUrl}
          className="absolute inset-0 w-full h-full border-0 block"
          allowFullScreen
        />
      </div>
    </div>
  );
};
