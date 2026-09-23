import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import { useMarket } from '../context/MarketContext';
import { apiService } from '../services/api';
import { OrderBookItem } from '../types';

interface OrderBookProps {
  onSelectPrice?: (price: number) => void;
}

export const OrderBook: React.FC<OrderBookProps> = ({ onSelectPrice }) => {
  const { activePair } = useMarket();

  const [bids, setBids] = useState<OrderBookItem[]>([]);
  const [asks, setAsks] = useState<OrderBookItem[]>([]);
  const [spread, setSpread] = useState<number>(0.01);
  const [precision, setPrecision] = useState<number>(2);

  useEffect(() => {
    loadOrderBook();
    const interval = setInterval(loadOrderBook, 1200); // Live depth refresh
    return () => clearInterval(interval);
  }, [activePair.symbol]);

  const loadOrderBook = async () => {
    try {
      const data = await apiService.getOrderBook(activePair.symbol);
      if (data && data.bids && data.asks) {
        setBids(data.bids);
        setAsks(data.asks);
        setSpread(data.spread);
      }
    } catch (err) {
      // Fallback depth simulation
      const basePrice = activePair.price;
      const simulatedBids = [];
      const simulatedAsks = [];
      let bTot = 0;
      let aTot = 0;

      for (let i = 1; i <= 8; i++) {
        const bp = Number((basePrice * (1 - i * 0.0003)).toFixed(2));
        const bAmt = Number((Math.random() * 2 + 0.1).toFixed(4));
        bTot += bAmt;
        simulatedBids.push({ price: bp, amount: bAmt, total: Number(bTot.toFixed(4)) });

        const ap = Number((basePrice * (1 + i * 0.0003)).toFixed(2));
        const aAmt = Number((Math.random() * 2 + 0.1).toFixed(4));
        aTot += aAmt;
        simulatedAsks.push({ price: ap, amount: aAmt, total: Number(aTot.toFixed(4)) });
      }

      setBids(simulatedBids);
      setAsks(simulatedAsks);
      setSpread(Number((simulatedAsks[0].price - simulatedBids[0].price).toFixed(2)));
    }
  };

  const maxBidTotal = bids.length > 0 ? bids[bids.length - 1].total : 10;
  const maxAskTotal = asks.length > 0 ? asks[asks.length - 1].total : 10;

  return (
    <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 flex flex-col h-[360px] sm:h-[420px] xl:h-[480px] text-xs font-mono">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-2">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#00C853]" />
          <span className="font-bold text-white text-xs">Order Book</span>
        </div>
        <span className="text-[10px] text-[#8A8A8A]">Depth 0.01</span>
      </div>

      {/* Table Column Headers */}
      <div className="grid grid-cols-3 text-[10px] text-[#8A8A8A] font-semibold py-1 border-b border-[#1A1A1A]">
        <span>PRICE (USDT)</span>
        <span className="text-right">SIZE ({activePair.baseCoin})</span>
        <span className="text-right">TOTAL</span>
      </div>

      {/* Asks (Sells in Red) */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end py-1 space-y-0.5">
        {asks.slice(0, 8).reverse().map((ask, idx) => {
          const fillWidth = (ask.total / maxAskTotal) * 100;
          return (
            <div
              key={idx}
              onClick={() => onSelectPrice && onSelectPrice(ask.price)}
              className="relative grid grid-cols-3 py-1 cursor-pointer hover:bg-[#FF3B30]/10 transition-colors group text-[11px]"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-[#FF3B30]/15 pointer-events-none transition-all"
                style={{ width: `${fillWidth}%` }}
              />
              <span className="text-[#FF3B30] font-bold z-10">{ask.price.toFixed(activePair.price < 1 ? 4 : 2)}</span>
              <span className="text-right text-[#C0C0C0] z-10">{ask.amount.toFixed(3)}</span>
              <span className="text-right text-[#666666] z-10">{ask.total.toFixed(3)}</span>
            </div>
          );
        })}
      </div>

      {/* Live Market Spread Bar */}
      <div className="py-2.5 my-1 bg-[#1A1A1A] border-y border-[#262626] flex items-center justify-between px-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-white font-extrabold text-sm">${activePair.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          <span className={`text-[10px] font-bold ${activePair.change24h >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
            {activePair.change24h >= 0 ? '↑' : '↓'} {activePair.change24h.toFixed(2)}%
          </span>
        </div>
        <span className="text-[10px] text-[#8A8A8A]">Spread: {spread}</span>
      </div>

      {/* Bids (Buys in Green) */}
      <div className="flex-1 overflow-hidden flex flex-col justify-start py-1 space-y-0.5">
        {bids.slice(0, 8).map((bid, idx) => {
          const fillWidth = (bid.total / maxBidTotal) * 100;
          return (
            <div
              key={idx}
              onClick={() => onSelectPrice && onSelectPrice(bid.price)}
              className="relative grid grid-cols-3 py-1 cursor-pointer hover:bg-[#00C853]/10 transition-colors group text-[11px]"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-[#00C853]/15 pointer-events-none transition-all"
                style={{ width: `${fillWidth}%` }}
              />
              <span className="text-[#00C853] font-bold z-10">{bid.price.toFixed(activePair.price < 1 ? 4 : 2)}</span>
              <span className="text-right text-[#C0C0C0] z-10">{bid.amount.toFixed(3)}</span>
              <span className="text-right text-[#666666] z-10">{bid.total.toFixed(3)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
