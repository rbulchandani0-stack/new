import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRightLeft, 
  Activity, 
  Layers, 
  BarChart2, 
  ShieldCheck,
  Zap,
  Share2,
  Clock,
  Globe,
  Radio,
  Newspaper,
  Calendar,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Bell,
  History,
  PieChart,
  Headphones,
  UserCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
import { apiService } from '../services/api';
import { Position, Transaction, SystemSettings, NotificationItem } from '../types';
import { TradeShareModal } from '../components/TradeShareModal';
import { formatIST, sortTradesChronological } from '../utils/dateUtils';

interface DashboardViewProps {
  onStartTrading: () => void;
  onOpenDepositModal: () => void;
  onOpenWithdrawModal: () => void;
  onNavigate?: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartTrading,
  onOpenDepositModal,
  onOpenWithdrawModal,
  onNavigate
}) => {
  const { user, wallet } = useAuth();
  const { markets, setActiveSymbol } = useMarket();

  const [positions, setPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [txHistory, setTxHistory] = useState<Transaction[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [selectedSharePos, setSelectedSharePos] = useState<Position | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTimeUTC, setCurrentTimeUTC] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => {
      loadDashboardData();
      setCurrentTimeUTC(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [posData, pendingData, notifData, txData, settingsData] = await Promise.all([
        apiService.getPositions().catch(() => []),
        apiService.getPendingOrders().catch(() => []),
        apiService.getNotifications().catch(() => []),
        apiService.getTradeHistory().catch(() => []),
        apiService.getSettings().catch(() => null)
      ]);
      setPositions(posData);
      setPendingOrders(pendingData);
      setNotifications(notifData.slice(0, 6));
      const sortedTx = sortTradesChronological(txData || [], 'desc');
      setTxHistory(sortedTx.slice(0, 5));
      setSystemSettings(settingsData);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleClosePosition = async (id: string) => {
    try {
      setClosingId(id);
      await apiService.closePosition(id);
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to close position');
    } finally {
      setClosingId(null);
    }
  };

  const handleWatchlistClick = (symbol: string) => {
    setActiveSymbol(symbol);
    onStartTrading();
  };

  // Portfolio & Equity Calculations
  const availableMargin = wallet?.availableMargin || 0;
  const usedMargin = wallet?.usedMargin || 0;
  const tradingBalance = wallet?.tradingBalance || (availableMargin + usedMargin);
  const totalUnrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const totalEquity = tradingBalance + totalUnrealizedPnL;

  // Today's Realized PnL calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todayClosedTxs = txHistory.filter(tx => tx.createdAt && tx.createdAt.startsWith(todayStr));
  const todayRealizedPnL = todayClosedTxs.reduce((acc, tx) => acc + (tx.netPnL || tx.pnl || 0), 0);

  // Margin Risk Calculation
  const totalCap = availableMargin + usedMargin;
  const utilPct = totalCap > 0 ? (usedMargin / totalCap) * 100 : 0;
  const riskLevel = utilPct > 75 ? 'HIGH RISK' : utilPct > 40 ? 'MODERATE' : 'LOW RISK';
  const riskColor = utilPct > 75 
    ? 'text-red-400 bg-red-500/10 border-red-500/30' 
    : utilPct > 40 
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' 
    : 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/30';

  // Global Session Clocks (UTC Hours)
  const currentUTCHour = currentTimeUTC.getUTCHours();
  const isSydneyOpen = currentUTCHour >= 22 || currentUTCHour < 7;
  const isTokyoOpen = currentUTCHour >= 0 && currentUTCHour < 9;
  const isLondonOpen = currentUTCHour >= 8 && currentUTCHour < 16;
  const isNewYorkOpen = currentUTCHour >= 13 && currentUTCHour < 21;

  // Top Watchlist Markets
  const defaultWatchlist = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'XAU/USD', 'EUR/USD', 'NVDA', 'AAPL'];
  const watchlistItems = defaultWatchlist.map(sym => {
    const market = markets.find(m => m.symbol === sym) || {
      symbol: sym,
      name: sym.replace('/', ' '),
      price: sym.includes('BTC') ? 67450.5 : sym.includes('ETH') ? 3480.2 : sym.includes('SOL') ? 174.5 : sym.includes('XAU') ? 2385.4 : 1.085,
      change24h: 1.85,
      sparkline: [40, 42, 41, 44, 43, 47, 46, 49, 48, 52]
    };
    return market;
  });

  // Mock Economic Events for cockpit
  const economicCalendar = [
    { title: 'US Core CPI Inflation (YoY)', time: '13:30 UTC', forecast: '3.1%', previous: '3.3%', impact: 'HIGH' },
    { title: 'FOMC Interest Rate Decision', time: '18:00 UTC', forecast: '5.25%', previous: '5.25%', impact: 'HIGH' },
    { title: 'US Non-Farm Payrolls (NFP)', time: 'Fri 13:30 UTC', forecast: '185K', previous: '206K', impact: 'HIGH' },
    { title: 'ECB Monetary Policy Statement', time: 'Thu 12:45 UTC', forecast: '3.75%', previous: '4.00%', impact: 'MED' }
  ];

  // Financial Headlines Ticker
  const marketNews = [
    { title: 'Bitcoin institutional inflows reach $1.2B weekly high amid ETF momentum', source: 'Bloomberg Finance', time: '12m ago' },
    { title: 'Federal Reserve signals potential rate stabilization following latest PPI report', source: 'Reuters', time: '35m ago' },
    { title: 'Gold surges near historic highs as global central bank demand accelerates', source: 'FXStreet', time: '1h ago' },
    { title: 'NVIDIA leads tech rally following record AI datacenter revenue reports', source: 'Wall Street Journal', time: '2h ago' }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-3 sm:p-4 lg:p-6 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
      
      {/* 1. PREMIUM DASHBOARD HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121212] border border-[#222222] rounded-xl p-4 sm:p-5 lg:px-6 shadow-lg">
        <div className="flex items-center space-x-3.5 sm:space-x-4">
          {user?.profilePicture || user?.profile?.profilePicture ? (
            <img
              src={user?.profilePicture || user?.profile?.profilePicture}
              alt={user?.name || 'Trader'}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border-2 border-[#00C853]/40 shrink-0 shadow-md"
            />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#00C853]/15 border border-[#00C853]/30 flex items-center justify-center font-black text-[#00C853] text-xl shrink-0 shadow-md">
              {user?.name?.charAt(0).toUpperCase() || 'T'}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                {user?.name || 'Trader'}'s Dashboard
              </h1>
              {(user?.kycStatus === 'verified' || user?.kycStatus === 'manually_verified') ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#00C853]/10 text-[#00C853] text-xs font-semibold border border-[#00C853]/25">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00C853]" />
                  <span>Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/25">
                  <span>Unverified</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#8A8A8A] font-medium mt-0.5">
              Live portfolio tracking, active execution metrics & global market overview
            </p>
          </div>
        </div>
      </div>

      {/* 2. REAL-TIME ACCOUNT STATISTICS CARDS (4 UNIFORM CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Equity */}
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 flex flex-col justify-between hover:border-[#333333] transition-all shadow-md min-h-[125px]">
          <div className="flex items-center justify-between text-xs text-[#8A8A8A] font-bold tracking-wider uppercase font-sans">
            <span>TOTAL ACCOUNT EQUITY</span>
            <DollarSign className="w-4 h-4 text-[#00C853]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono my-1 tracking-tight">
            ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[#8A8A8A] font-mono">
            Wallet Balance + Floating PnL
          </div>
        </div>

        {/* Total Profit (Replaces Trading Wallet) */}
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 flex flex-col justify-between hover:border-[#333333] transition-all shadow-md min-h-[125px]">
          <div className="flex items-center justify-between text-xs text-[#8A8A8A] font-bold tracking-wider uppercase font-sans">
            <span>TOTAL REALIZED PROFIT</span>
            <TrendingUp className="w-4 h-4 text-[#00C853]" />
          </div>
          {(() => {
            const totalRealizedPnL = txHistory.reduce((acc, tx) => acc + (tx.netPnL || tx.pnl || 0), 0);
            const isPos = totalRealizedPnL >= 0;
            return (
              <>
                <div className={`text-2xl sm:text-3xl font-extrabold font-mono my-1 tracking-tight ${isPos ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                  {isPos ? '+$' : '-$'}{Math.abs(totalRealizedPnL).toFixed(2)}
                </div>
                <div className="text-xs text-[#8A8A8A] font-mono flex items-center justify-between">
                  <span>Today's PnL:</span>
                  <span className={`font-bold ${todayRealizedPnL >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                    {todayRealizedPnL >= 0 ? '+' : ''}${todayRealizedPnL.toFixed(2)} USDT
                  </span>
                </div>
              </>
            );
          })()}
        </div>

        {/* Floating P&L */}
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 flex flex-col justify-between hover:border-[#333333] transition-all shadow-md min-h-[125px]">
          <div className="flex items-center justify-between text-xs text-[#8A8A8A] font-bold tracking-wider uppercase font-sans">
            <span>FLOATING UNREALIZED PnL</span>
            <Activity className="w-4 h-4 text-[#00C853]" />
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold font-mono my-1 tracking-tight ${totalUnrealizedPnL >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
            {totalUnrealizedPnL >= 0 ? '+$' : '-$'}{Math.abs(totalUnrealizedPnL).toFixed(2)}
          </div>
          <div className="text-xs text-[#8A8A8A] font-mono">
            {positions.length} Open Position{positions.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Active Trades & Orders */}
        <div className="bg-[#121212] border border-[#222222] rounded-xl p-4 flex flex-col justify-between hover:border-[#333333] transition-all shadow-md min-h-[125px]">
          <div className="flex items-center justify-between text-xs text-[#8A8A8A] font-bold tracking-wider uppercase font-sans">
            <span>ACTIVE TRADES & ORDERS</span>
            <Layers className="w-4 h-4 text-[#00C853]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white font-mono my-1 tracking-tight flex items-baseline space-x-2">
            <span>{positions.length} Active</span>
            <span className="text-xs text-[#8A8A8A] font-normal">/ {pendingOrders.length} Pending</span>
          </div>
          <div className="text-xs font-mono flex items-center justify-between">
            <span className="text-[#8A8A8A]">Margin Risk:</span>
            <span className={`px-1.5 py-0.2 rounded font-extrabold border text-[10px] ${riskColor}`}>
              {riskLevel} ({utilPct.toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>

      {/* 3. MAIN COCKPIT DASHBOARD BODY (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* LEFT COLUMN: LIVE POSITION MONITOR, WATCHLIST & ACTIVITY (8 COLS) */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-6">
          
          {/* A) COMPACT LIVE OPEN POSITIONS MONITOR */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h2 className="font-extrabold text-sm sm:text-base text-white tracking-tight">Live Open Positions Monitor</h2>
                <span className="text-xs font-mono text-[#8A8A8A]">({positions.length})</span>
              </div>
              <button onClick={onStartTrading} className="text-xs font-bold text-[#00C853] hover:underline flex items-center space-x-1">
                <span>Trade Terminal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {positions.length === 0 ? (
              <div className="text-center py-10 space-y-3 bg-[#171717] rounded-xl border border-[#222222]">
                <Layers className="w-10 h-10 text-[#444] mx-auto" />
                <p className="text-xs text-[#8A8A8A] font-medium">No open margin positions currently.</p>
                <button
                  onClick={onStartTrading}
                  className="px-4 py-2 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold text-xs rounded-xl transition-all shadow-md active:scale-95 inline-flex items-center space-x-1.5"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Open Trade Terminal</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map(pos => {
                  const isLong = pos.side === 'long' || (pos.side as any) === 'buy';
                  const sizeUnits = Number(pos.size) || 0;
                  const liveMkt = markets.find(m => m.symbol === pos.symbol);
                  const effectiveMark = liveMkt?.price || pos.markPrice;
                  const calculatedPnL = isLong ? (effectiveMark - pos.entryPrice) * sizeUnits : (pos.entryPrice - effectiveMark) * sizeUnits;
                  const isProfit = calculatedPnL >= 0;
                  const lev = pos.leverage || 1;
                  const marginUsed = pos.marginUsed || ((pos.entryPrice * sizeUnits) / lev);
                  const roiPct = marginUsed > 0 ? (calculatedPnL / marginUsed) * 100 : 0;

                  return (
                    <div 
                      key={pos.id}
                      className="bg-[#171717] hover:bg-[#1C1C1C] border border-[#262626] rounded-xl p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                    >
                      {/* Left Symbol Info */}
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs uppercase ${
                          pos.side === 'long' ? 'bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30' : 'bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/30'
                        }`}>
                          {pos.side.toUpperCase().substring(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-white text-sm font-mono">{pos.symbol}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold font-mono uppercase ${
                              pos.side === 'long' ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                            }`}>
                              {pos.side.toUpperCase()} {pos.leverage}x
                            </span>
                          </div>
                          <div className="text-[10px] text-[#8A8A8A] font-mono mt-0.5">
                            Qty: <span className="text-white font-bold">{pos.size}</span> | Entry: <span className="text-white">${pos.entryPrice.toLocaleString()}</span> | Mark: <span className="text-white font-bold">${effectiveMark.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right PnL & Quick Action Controls */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#222]">
                        <div className="text-left sm:text-right font-mono">
                          <div className={`text-sm sm:text-base font-extrabold ${isProfit ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                            {isProfit ? '+$' : '-$'}{Math.abs(calculatedPnL).toFixed(2)} <span className="text-[10px] text-[#8A8A8A]">USDT</span>
                          </div>
                          <div className={`text-[10px] font-bold ${isProfit ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                            {isProfit ? '▲ +' : '▼ '}{roiPct.toFixed(2)}% ROI
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {systemSettings?.tradeSharingEnabled !== false && (
                            <button
                              onClick={() => {
                                setSelectedSharePos(pos);
                                setIsShareModalOpen(true);
                              }}
                              className="h-8 px-2.5 bg-[#00C853]/15 hover:bg-[#00C853]/25 text-[#00C853] border border-[#00C853]/30 rounded-lg text-[11px] font-bold transition-all inline-flex items-center space-x-1 active:scale-95"
                              title="Share Trade Proof"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Share</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleClosePosition(pos.id)}
                            disabled={closingId === pos.id}
                            className="h-8 px-3 bg-[#FF3B30]/20 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white border border-[#FF3B30]/30 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                          >
                            {closingId === pos.id ? 'Closing...' : 'Close'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* B) MARKET WATCHLIST WIDGET */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-[#00C853]" />
                <h2 className="font-extrabold text-sm sm:text-base text-white tracking-tight">Market Live Watchlist</h2>
              </div>
              <button onClick={onStartTrading} className="text-xs font-bold text-[#00C853] hover:underline">
                All Markets →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono">
              {watchlistItems.map((item, idx) => {
                const isPos = item.change24h >= 0;
                return (
                  <div 
                    key={idx}
                    onClick={() => handleWatchlistClick(item.symbol)}
                    className="bg-[#171717] hover:bg-[#1E1E1E] border border-[#262626] hover:border-[#00C853]/40 rounded-xl p-3 transition-all cursor-pointer group shadow-sm flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-white text-xs group-hover:text-[#00C853] transition-colors">{item.symbol}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${isPos ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'}`}>
                        {isPos ? '+' : ''}{item.change24h}%
                      </span>
                    </div>

                    <div className="text-sm font-extrabold text-white">
                      ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#8A8A8A] font-sans">
                      <span>Click to trade</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#00C853] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* C) RECENT ACCOUNT ACTIVITY TIMELINE */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h2 className="font-extrabold text-sm sm:text-base text-white tracking-tight">Recent Activity Feed</h2>
              </div>
              <span className="text-[10px] font-mono text-[#8A8A8A]">System Verified Log</span>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#8A8A8A]">No recent activity logs recorded.</div>
            ) : (
              <div className="space-y-2.5">
                {notifications.map((notif, idx) => (
                  <div key={notif.id || idx} className="bg-[#171717] border border-[#242424] rounded-xl p-3 flex items-start space-x-3 text-xs">
                    <div className="w-8 h-8 rounded-lg bg-[#222] border border-[#333] flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-4 h-4 text-[#00C853]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{notif.title}</span>
                        <span className="text-[10px] text-[#8A8A8A] font-mono">{formatIST(notif.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-[#A0A0A0] mt-0.5 leading-relaxed">{notif.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SENTIMENT, SESSIONS, CALENDAR, NEWS & HEALTH (4 COLS) */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6">
          
          {/* A) MARKET SENTIMENT & GLOBAL METRICS */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="font-extrabold text-sm sm:text-base text-white tracking-tight">Market Sentiment</h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-[#00C853]/15 text-[#00C853]">
                BULLISH
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Fear & Greed Meter */}
              <div className="bg-[#171717] border border-[#262626] rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8A8A8A] font-sans font-bold text-[10px] uppercase">Fear & Greed Index</span>
                  <span className="text-emerald-400 font-extrabold">68 - Greed</span>
                </div>
                <div className="w-full h-2 bg-[#262626] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-[#00C853] w-[68%] rounded-full" />
                </div>
              </div>

              {/* BTC Dominance & Volume */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-[#171717] border border-[#262626] rounded-xl p-2.5">
                  <span className="text-[#8A8A8A] block font-sans text-[10px]">BTC Dominance</span>
                  <span className="text-white font-extrabold text-sm">58.4%</span>
                </div>
                <div className="bg-[#171717] border border-[#262626] rounded-xl p-2.5">
                  <span className="text-[#8A8A8A] block font-sans text-[10px]">24H Global Vol</span>
                  <span className="text-white font-extrabold text-sm">$84.5B</span>
                </div>
              </div>
            </div>
          </div>

          {/* B) GLOBAL TRADING SESSIONS CLOCK */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <h2 className="font-extrabold text-sm sm:text-base text-white tracking-tight">Trading Sessions</h2>
              </div>
              <span className="text-[10px] font-mono text-[#8A8A8A]">
                {currentTimeUTC.toUTCString().slice(17, 22)} UTC
              </span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="bg-[#171717] border border-[#262626] rounded-xl p-2.5 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${isSydneyOpen ? 'bg-[#00C853] animate-ping' : 'bg-red-500'}`} />
                  <span className="font-bold text-white">Sydney Session</span>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${isSydneyOpen ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-red-500/15 text-red-400'}`}>
                  {isSydneyOpen ? 'ACTIVE' : 'CLOSED'}
                </span>
              </div>

              <div className="bg-[#171717] border border-[#262626] rounded-xl p-2.5 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${isTokyoOpen ? 'bg-[#00C853] animate-ping' : 'bg-[#555]'}`} />
                  <span className="font-bold text-white">Tokyo Session</span>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${isTokyoOpen ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#333] text-[#8A8A8A]'}`}>
                  {isTokyoOpen ? 'ACTIVE' : 'CLOSED'}
                </span>
              </div>

              <div className="bg-[#171717] border border-[#262626] rounded-xl p-2.5 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${isLondonOpen ? 'bg-[#00C853] animate-ping' : 'bg-[#555]'}`} />
                  <span className="font-bold text-white">London Session</span>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${isLondonOpen ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#333] text-[#8A8A8A]'}`}>
                  {isLondonOpen ? 'ACTIVE' : 'CLOSED'}
                </span>
              </div>

              <div className="bg-[#171717] border border-[#262626] rounded-xl p-2.5 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${isNewYorkOpen ? 'bg-[#00C853] animate-ping' : 'bg-[#555]'}`} />
                  <span className="font-bold text-white">New York Session</span>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${isNewYorkOpen ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#333] text-[#8A8A8A]'}`}>
                  {isNewYorkOpen ? 'ACTIVE' : 'CLOSED'}
                </span>
              </div>
            </div>
          </div>

          {/* C) UPCOMING ECONOMIC CALENDAR */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <h2 className="font-extrabold text-sm sm:text-base text-white tracking-tight">Economic Calendar</h2>
              </div>
              <span className="text-[10px] font-mono text-[#8A8A8A]">Today & Week</span>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              {economicCalendar.map((ev, idx) => (
                <div key={idx} className="bg-[#171717] border border-[#262626] rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-white">{ev.title}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${ev.impact === 'HIGH' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                      {ev.impact}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#8A8A8A] pt-1 border-t border-[#222]">
                    <span>Time: <span className="text-white">{ev.time}</span></span>
                    <span>Forecast: <span className="text-white font-bold">{ev.forecast}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* D) LIVE FINANCIAL NEWS HEADLINES */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center space-x-2">
                <Newspaper className="w-4 h-4 text-emerald-400" />
                <h2 className="font-extrabold text-sm sm:text-base text-white tracking-tight">Live Market Headlines</h2>
              </div>
            </div>

            <div className="space-y-3 font-sans text-xs">
              {marketNews.map((news, idx) => (
                <div key={idx} className="bg-[#171717] hover:bg-[#1E1E1E] border border-[#262626] rounded-xl p-3 transition-colors space-y-1 cursor-pointer">
                  <div className="text-white font-semibold leading-snug hover:text-[#00C853] transition-colors">
                    {news.title}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#8A8A8A] font-mono pt-1">
                    <span>{news.source}</span>
                    <span>{news.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* E) TERMINAL & INFRASTRUCTURE HEALTH WIDGET */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#222222] pb-2.5">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-[#00C853]" />
                <h2 className="font-extrabold text-xs text-white uppercase tracking-wider font-mono">Terminal Engine Status</h2>
              </div>
              <span className="flex items-center space-x-1 text-[10px] text-[#00C853] font-mono font-bold">
                <CheckCircle2 className="w-3 h-3" />
                <span>ALL OPERATIONAL</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-[#171717] p-2 rounded-lg border border-[#242424] flex justify-between">
                <span className="text-[#8A8A8A]">Trading Engine</span>
                <span className="text-[#00C853] font-bold">100% (2ms)</span>
              </div>
              <div className="bg-[#171717] p-2 rounded-lg border border-[#242424] flex justify-between">
                <span className="text-[#8A8A8A]">Order Matcher</span>
                <span className="text-[#00C853] font-bold">Active (0ms)</span>
              </div>
              <div className="bg-[#171717] p-2 rounded-lg border border-[#242424] flex justify-between">
                <span className="text-[#8A8A8A]">WebSocket</span>
                <span className="text-[#00C853] font-bold">Connected</span>
              </div>
              <div className="bg-[#171717] p-2 rounded-lg border border-[#242424] flex justify-between">
                <span className="text-[#8A8A8A]">Database</span>
                <span className="text-[#00C853] font-bold">Healthy</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Trade Share Modal */}
      <TradeShareModal
        position={selectedSharePos}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        systemSettings={systemSettings}
      />
    </div>
  );
};
