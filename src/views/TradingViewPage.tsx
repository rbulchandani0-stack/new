import React, { useState, useEffect } from 'react';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { feedbackService } from '../services/feedbackService';
import { Position } from '../types';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Sliders, Shield, Zap, X } from 'lucide-react';

export const TradingViewPage: React.FC = () => {
  const { assets, selectedSymbol, setSelectedSymbol, selectedAsset } = useMarket();
  const { user, refreshUser } = useAuth();

  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [leverage, setLeverage] = useState<number>(20);
  const [amount, setAmount] = useState<string>('100');
  const [positions, setPositions] = useState<Position[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchPositions = async () => {
    try {
      const res = await apiService.getPositions();
      if (res?.positions) {
        setPositions(res.positions);
      }
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePlaceOrder = async () => {
    if (!user) {
      feedbackService.showToast({ type: 'warning', message: 'Please log in to trade' });
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const numAmount = parseFloat(amount);
      if (!numAmount || numAmount <= 0) {
        throw new Error('Enter a valid order amount');
      }

      await apiService.createPosition({
        symbol: selectedAsset.symbol,
        side: orderSide,
        amount: numAmount,
        leverage,
        entryPrice: selectedAsset.price
      });

      feedbackService.showToast({
        type: 'success',
        title: 'Order Executed',
        message: `${orderSide.toUpperCase()} ${numAmount} USDT on ${selectedAsset.symbol} (${leverage}x)`
      });

      await fetchPositions();
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Order failed');
      feedbackService.showToast({ type: 'error', message: err.message || 'Order failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClosePosition = async (id: string) => {
    try {
      await apiService.closePosition(id);
      feedbackService.showToast({ type: 'success', message: 'Position closed successfully' });
      await fetchPositions();
      await refreshUser();
    } catch (err: any) {
      feedbackService.showToast({ type: 'error', message: err.message || 'Failed to close' });
    }
  };

  const tradingBalance = user?.wallet?.tradingBalance || 0;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 space-y-4">
      {/* Top Asset Bar */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="bg-[#1E1E1E] text-white font-bold text-base sm:text-lg border border-[#333333] rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            {assets.map((asset) => (
              <option key={asset.symbol} value={asset.symbol}>
                {asset.symbol} - {asset.name}
              </option>
            ))}
          </select>
          <div className="text-xl sm:text-2xl font-black text-white">
            ${selectedAsset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span
            className={`text-xs font-extrabold px-2 py-1 rounded-lg ${
              selectedAsset.change24h >= 0 ? 'bg-[#00C853]/20 text-[#00C853]' : 'bg-[#FF3B30]/20 text-[#FF3B30]'
            }`}
          >
            {selectedAsset.change24h >= 0 ? '+' : ''}{selectedAsset.change24h}%
          </span>
        </div>

        <div className="hidden sm:flex items-center space-x-6 text-xs text-[#8A8A8A]">
          <div>
            <div>24h High</div>
            <div className="text-white font-semibold">${selectedAsset.high24h.toLocaleString()}</div>
          </div>
          <div>
            <div>24h Low</div>
            <div className="text-white font-semibold">${selectedAsset.low24h.toLocaleString()}</div>
          </div>
          <div>
            <div>24h Volume</div>
            <div className="text-white font-semibold">${(selectedAsset.volume24h / 1000000).toFixed(2)}M</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Order Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Interactive Chart Canvas Simulation */}
        <div className="lg:col-span-2 bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-6 flex flex-col justify-between min-h-[380px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E1E1E]">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#8A8A8A]">
              <span className="px-2 py-1 rounded bg-[#1C1C1C] text-white">1m</span>
              <span className="px-2 py-1 rounded bg-[#1C1C1C] text-[#8A8A8A] hover:text-white cursor-pointer">5m</span>
              <span className="px-2 py-1 rounded bg-[#1C1C1C] text-[#8A8A8A] hover:text-white cursor-pointer">15m</span>
              <span className="px-2 py-1 rounded bg-[#1C1C1C] text-[#8A8A8A] hover:text-white cursor-pointer">1h</span>
              <span className="px-2 py-1 rounded bg-[#1C1C1C] text-[#8A8A8A] hover:text-white cursor-pointer">1D</span>
            </div>
            <div className="text-xs text-[#00C853] font-bold flex items-center space-x-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Real-time WebSocket Feed</span>
            </div>
          </div>

          {/* Chart Display Visualizer */}
          <div className="relative flex-1 flex items-center justify-center my-6">
            <div className="absolute inset-0 bg-gradient-to-t from-[#00C853]/5 via-transparent to-transparent pointer-events-none rounded-xl" />
            <div className="text-center space-y-2">
              <TrendingUp className="w-12 h-12 text-[#00C853]/60 mx-auto animate-pulse" />
              <div className="text-sm font-bold text-white tracking-wide">
                Live High-Frequency Orderbook & Institutional Liquidity Feed
              </div>
              <div className="text-xs text-[#8A8A8A]">
                Execution Latency: <span className="text-[#00C853] font-bold">1.2ms</span> • Max Slippage: <span className="text-white">0.01%</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1E1E1E] flex justify-between text-xs text-[#666666]">
            <span>Powered by Apex Global Risk Matching Engine</span>
            <span>Server Time (UTC): {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Order Execution Panel */}
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex rounded-xl bg-[#1A1A1A] p-1 border border-[#262626]">
            <button
              onClick={() => setOrderSide('buy')}
              className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center space-x-1 ${
                orderSide === 'buy' ? 'bg-[#00C853] text-black shadow-md' : 'text-[#8A8A8A] hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Buy / Long</span>
            </button>
            <button
              onClick={() => setOrderSide('sell')}
              className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center space-x-1 ${
                orderSide === 'sell' ? 'bg-[#FF3B30] text-white shadow-md' : 'text-[#8A8A8A] hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Sell / Short</span>
            </button>
          </div>

          {/* Leverage Selector */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#8A8A8A] font-semibold">Leverage Multiplier:</span>
              <span className="text-white font-extrabold">{leverage}x</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[5, 10, 20, 50, 100].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLeverage(l)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    leverage === l
                      ? 'bg-white text-black border-white'
                      : 'bg-[#1C1C1C] text-[#8A8A8A] border-[#292929] hover:text-white'
                  }`}
                >
                  {l}x
                </button>
              ))}
            </div>
          </div>

          {/* Margin / Amount Input */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#8A8A8A] font-semibold">Order Margin (USDT):</span>
              <span className="text-[#8A8A8A]">Avail: <span className="text-white font-bold">${tradingBalance.toFixed(2)}</span></span>
            </div>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#2B2B2B] focus:border-[#00C853] rounded-xl px-4 py-2.5 text-sm text-white font-bold outline-none"
            />
          </div>

          {/* Trade Metrics */}
          <div className="p-3.5 bg-[#181818] rounded-xl border border-[#242424] text-xs space-y-1.5 text-[#8A8A8A]">
            <div className="flex justify-between">
              <span>Position Size:</span>
              <span className="text-white font-bold">${(parseFloat(amount || '0') * leverage).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Entry Price:</span>
              <span className="text-white font-semibold">${selectedAsset.price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Fees:</span>
              <span className="text-[#00C853] font-semibold">0.00 USDT (Zero-Fee)</span>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-[#FF3B30]/15 border border-[#FF3B30]/40 text-[#FF3B30] text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={submitting}
            className={`w-full py-3.5 rounded-xl font-extrabold text-sm transition-all cursor-pointer shadow-lg disabled:opacity-50 ${
              orderSide === 'buy'
                ? 'bg-[#00C853] hover:bg-[#00E676] text-black shadow-[#00C853]/20'
                : 'bg-[#FF3B30] hover:bg-[#FF4D4D] text-white shadow-[#FF3B30]/20'
            }`}
          >
            {submitting ? 'Executing Order...' : `Open ${orderSide === 'buy' ? 'Long' : 'Short'} Position`}
          </button>
        </div>
      </div>

      {/* Open Positions Table */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white">Active Open Positions ({positions.length})</h3>
          <span className="text-xs text-[#8A8A8A]">Live Mark-to-Market PnL</span>
        </div>

        {positions.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#666666]">
            No active positions open. Place a trade above to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#8A8A8A]">
                  <th className="pb-3 font-semibold">Asset / Side</th>
                  <th className="pb-3 font-semibold">Size</th>
                  <th className="pb-3 font-semibold">Entry Price</th>
                  <th className="pb-3 font-semibold">Mark Price</th>
                  <th className="pb-3 font-semibold">Unrealized PnL</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {positions.map((p) => {
                  const isProfit = (p.pnl || 0) >= 0;
                  return (
                    <tr key={p.id} className="text-white hover:bg-[#181818]">
                      <td className="py-3.5">
                        <div className="font-bold flex items-center space-x-1.5">
                          <span>{p.symbol}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-black ${
                              p.side === 'buy' ? 'bg-[#00C853]/20 text-[#00C853]' : 'bg-[#FF3B30]/20 text-[#FF3B30]'
                            }`}
                          >
                            {p.side} {p.leverage}x
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 font-semibold">${p.amount * p.leverage}</td>
                      <td className="py-3.5">${p.entryPrice.toLocaleString()}</td>
                      <td className="py-3.5">${(p.currentPrice || p.entryPrice).toLocaleString()}</td>
                      <td className="py-3.5 font-bold">
                        <span className={isProfit ? 'text-[#00C853]' : 'text-[#FF3B30]'}>
                          {isProfit ? '+' : ''}${(p.pnl || 0).toFixed(2)} ({isProfit ? '+' : ''}{(p.pnlPercentage || 0).toFixed(2)}%)
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => handleClosePosition(p.id)}
                          className="py-1 px-3 rounded-lg bg-[#242424] hover:bg-[#333333] text-xs font-semibold text-white border border-[#3A3A3A] cursor-pointer"
                        >
                          Market Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
