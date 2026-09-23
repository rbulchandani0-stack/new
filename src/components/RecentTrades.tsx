import React, { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { apiService } from '../services/api';
import { TradeItem } from '../types';
import { formatIST } from '../utils/dateUtils';

export const RecentTrades: React.FC = () => {
  const { activePair } = useMarket();
  const [trades, setTrades] = useState<TradeItem[]>([]);

  useEffect(() => {
    loadTrades();
    const interval = setInterval(loadTrades, 1500);
    return () => clearInterval(interval);
  }, [activePair.symbol]);

  const loadTrades = async () => {
    try {
      const data = await apiService.getRecentTrades(activePair.symbol);
      if (Array.isArray(data)) {
        setTrades(data);
      }
    } catch (err) {
      // Fallback
      const base = activePair.price;
      const generated = [];
      const now = Date.now();
      for (let i = 0; i < 12; i++) {
        generated.push({
          id: 't_' + (now - i * 1200),
          symbol: activePair.symbol,
          price: Number((base + (Math.random() - 0.5) * base * 0.002).toFixed(2)),
          amount: Number((Math.random() * 1.5 + 0.05).toFixed(3)),
          side: Math.random() > 0.5 ? 'buy' : 'sell' as const,
          timestamp: now - i * 1200
        });
      }
      setTrades(generated);
    }
  };

  return (
    <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 h-[260px] flex flex-col text-xs font-mono">
      <div className="flex items-center space-x-2 pb-2 border-b border-[#222] mb-2 text-[#8A8A8A]">
        <History className="w-4 h-4 text-[#00C853]" />
        <span className="font-bold text-white">Recent Market Trades</span>
      </div>

      <div className="grid grid-cols-3 text-[10px] text-[#8A8A8A] font-semibold py-1 border-b border-[#1A1A1A]">
        <span>PRICE (USDT)</span>
        <span className="text-right">QTY ({activePair.baseCoin})</span>
        <span className="text-right">TIME</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 py-1 no-scrollbar">
        {trades.map((t) => (
          <div key={t.id} className="grid grid-cols-3 py-0.5 text-[11px] hover:bg-[#1A1A1A] rounded px-1 transition-colors">
            <span className={`font-bold ${t.side === 'buy' ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
              {t.price.toFixed(activePair.price < 1 ? 4 : 2)}
            </span>
            <span className="text-right text-[#C0C0C0]">{t.amount.toFixed(3)}</span>
            <span className="text-right text-[#666666]">
              {formatIST(t.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
