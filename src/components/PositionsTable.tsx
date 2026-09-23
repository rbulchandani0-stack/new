import React, { useState, useEffect } from 'react';
import { Layers, X, Download, ShieldAlert, CheckCircle2, RefreshCw, Edit3, Trash2, Sliders, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Position, Transaction, SystemSettings } from '../types';
import { TradeShareModal } from './TradeShareModal';
import { formatIST, sortTradesChronological } from '../utils/dateUtils';
import { getTradeMarginUSD, getTradeLots, formatLots } from '../utils/marginUtils';

interface PositionCardItemProps {
  pos: Position;
  systemSettings: SystemSettings | null;
  closingId: string | null;
  onShare: (pos: Position) => void;
  onOpenTpSl: (pos: Position) => void;
  onClose: (id: string) => void;
}

const PositionCardItem: React.FC<PositionCardItemProps> = ({
  pos,
  systemSettings,
  closingId,
  onShare,
  onOpenTpSl,
  onClose
}) => {
  const isLong = pos.side === 'long' || (pos.side as any) === 'buy';
  const sizeUnits = Number(pos.size) || 0;
  // Authoritative math: (Mark Price - Entry Price) * Size for LONG, (Entry Price - Mark Price) * Size for SHORT
  const pnlCalc = isLong ? (pos.markPrice - pos.entryPrice) * sizeUnits : (pos.entryPrice - pos.markPrice) * sizeUnits;
  const isProfit = pnlCalc >= 0;
  const lev = pos.leverage || 1;
  const marginUsed = getTradeMarginUSD(pos);
  const roiPct = marginUsed > 0 ? (pnlCalc / marginUsed) * 100 : 0;
  const liqPrice = pos.side === 'long' 
    ? pos.entryPrice * (1 - (1 / lev) + 0.005)
    : pos.entryPrice * (1 + (1 / lev) - 0.005);

  const openDate = pos.createdAt || (pos as any).openedAt || (pos as any).timestamp;

  return (
    <div className="bg-[#141414] hover:bg-[#181818] border border-[#242424] rounded-xl p-3 sm:p-3.5 transition-colors duration-200 space-y-2.5 shadow-md">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222222] pb-2">
        <div className="flex items-center space-x-2">
          <span className="font-extrabold text-white text-sm tracking-tight">{pos.symbol}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
            pos.side === 'long' 
              ? 'bg-[#00C853]/15 text-[#00C853] border-[#00C853]/30' 
              : 'bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/30'
          }`}>
            {pos.side.toUpperCase()} {pos.leverage}X
          </span>
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold border border-emerald-500/20">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>LIVE</span>
          </span>
        </div>

        <div className="text-[10px] text-[#8A8A8A] font-mono">
          Opened: <span className="text-[#C0C0C0] font-mono">{formatIST(openDate)}</span>
        </div>
      </div>

      {/* Main Grid: Compact Metrics + PnL */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 font-mono text-xs">
        <div className="bg-[#181818] p-2 rounded-lg border border-[#222]">
          <span className="text-[9px] text-[#8A8A8A] block uppercase font-sans font-medium">Entry Price</span>
          <span className="text-white font-bold text-xs">
            ${pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </span>
        </div>

        <div className="bg-[#181818] p-2 rounded-lg border border-[#222]">
          <span className="text-[9px] text-[#8A8A8A] block uppercase font-sans font-medium">Mark Price</span>
          <span className="text-white font-bold text-xs">
            ${pos.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </span>
        </div>

        <div className="bg-[#181818] p-2 rounded-lg border border-[#222]">
          <span className="text-[9px] text-[#8A8A8A] block uppercase font-sans font-medium">Position Size</span>
          <span className="text-[#E0E0E0] font-bold text-xs">{formatLots(getTradeLots(pos))}</span>
          <span className="text-[#666] text-[9px] block font-mono">{pos.size} units</span>
        </div>

        <div className="bg-[#181818] p-2 rounded-lg border border-[#222]">
          <span className="text-[9px] text-[#8A8A8A] block uppercase font-sans font-medium">Margin</span>
          <span className="text-white font-bold text-xs">${Math.round(marginUsed).toLocaleString('en-US')} USDT</span>
        </div>

        <div className="bg-[#181818] p-2 rounded-lg border border-[#222]">
          <span className="text-[9px] text-[#8A8A8A] block uppercase font-sans font-medium">Liq Price</span>
          <span className="text-[#FF3B30] font-bold text-xs">
            {lev > 1 && liqPrice > 0 
              ? `$${liqPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` 
              : 'N/A'}
          </span>
        </div>

        <div className="bg-[#181818] p-2 rounded-lg border border-[#222]">
          <span className="text-[9px] text-[#8A8A8A] block uppercase font-sans font-medium">SL / TP Target</span>
          <div className="text-[10px] font-bold leading-tight">
            <span className="text-amber-400">SL: {pos.stopLoss ? `$${pos.stopLoss}` : '-'}</span>
            <span className="text-[#8A8A8A] mx-1">/</span>
            <span className="text-[#00C853]">TP: {pos.takeProfit ? `$${pos.takeProfit}` : '-'}</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-2 lg:col-span-1 bg-[#181818] p-2 rounded-lg border border-[#2A2A2A] text-right flex flex-col justify-center">
          <span className="text-[9px] text-[#8A8A8A] uppercase font-sans font-bold">Unrealized PnL</span>
          <div className={`font-mono font-extrabold text-xs sm:text-sm ${isProfit ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
            {isProfit ? '+$' : '-$'}{Math.abs(pnlCalc).toFixed(2)}
          </div>
          <div className={`text-[10px] font-bold ${isProfit ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
            {isProfit ? '▲ +' : '▼ '}{roiPct.toFixed(2)}% ROI
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-end space-x-1.5 border-t border-[#222222] pt-2">
        {systemSettings?.tradeSharingEnabled !== false && (
          <button
            onClick={() => onShare(pos)}
            className="h-8 px-2.5 bg-[#00C853]/10 hover:bg-[#00C853]/20 text-[#00C853] rounded-md text-[11px] font-bold transition-all border border-[#00C853]/25 inline-flex items-center space-x-1 active:scale-95 shadow-sm"
            title="Share Trade Card"
          >
            <Share2 className="w-3 h-3" />
            <span>Share</span>
          </button>
        )}

        <button
          onClick={() => onOpenTpSl(pos)}
          className="h-8 px-2.5 bg-[#1C1C1C] hover:bg-[#262626] text-amber-400 hover:text-white rounded-md text-[11px] font-bold transition-all border border-amber-400/25 inline-flex items-center space-x-1 active:scale-95 shadow-sm"
        >
          <Edit3 className="w-3 h-3" />
          <span>SL/TP</span>
        </button>

        <button
          onClick={() => onClose(pos.id)}
          disabled={closingId === pos.id}
          className="h-8 px-3 bg-[#FF3B30]/15 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white rounded-md text-[11px] font-bold transition-all border border-[#FF3B30]/30 inline-flex items-center active:scale-95 shadow-sm"
        >
          {closingId === pos.id ? 'Closing...' : 'Close Position'}
        </button>
      </div>
    </div>
  );
};

export const PositionsTable: React.FC = () => {
  const { user, wallet, updateWalletState } = useAuth();
  const isKycApproved = user?.kycStatus === 'verified' || user?.kycStatus === 'manually_verified' || (user as any)?.kycStatus === 'approved';

  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');
  const [positions, setPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // Trade Share Modal State
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [selectedSharePosition, setSelectedSharePosition] = useState<Position | null>(null);
  const [selectedShareTransaction, setSelectedShareTransaction] = useState<Transaction | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Edit TP / SL Modal State
  const [editTpSlPos, setEditTpSlPos] = useState<Position | null>(null);
  const [tpInput, setTpInput] = useState<string>('');
  const [slInput, setSlInput] = useState<string>('');
  const [updatingTpSl, setUpdatingTpSl] = useState<boolean>(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const posData = await apiService.getPositions();
      setPositions(posData);

      const ordersData = await apiService.getPendingOrders();
      setPendingOrders(ordersData);

      const histData = await apiService.getTradeHistory();
      setHistory(sortTradesChronological(histData || [], 'desc'));

      const settings = await apiService.getSettings();
      setSystemSettings(settings);
    } catch (err) {
      // ignore
    }
  };

  const handleShareLivePosition = (pos: Position) => {
    setSelectedSharePosition(pos);
    setSelectedShareTransaction(null);
    setIsShareModalOpen(true);
  };

  const handleShareHistoryTrade = (tx: Transaction) => {
    setSelectedShareTransaction(tx);
    setSelectedSharePosition(null);
    setIsShareModalOpen(true);
  };

  const handleClosePosition = async (id: string) => {
    if (!isKycApproved) {
      alert(`KYC Verification Required: Your account status is '${user?.kycStatus || 'unverified'}'. Identity verification is mandatory before managing live positions.`);
      return;
    }
    try {
      setClosingId(id);
      const res = await apiService.closePosition(id);
      updateWalletState(res.wallet);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to close position');
    } finally {
      setClosingId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      setCancellingOrderId(orderId);
      const res = await apiService.cancelOrder(orderId);
      updateWalletState(res.wallet);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleOpenTpSlModal = (pos: Position) => {
    setEditTpSlPos(pos);
    setTpInput(pos.takeProfit ? pos.takeProfit.toString() : '');
    setSlInput(pos.stopLoss ? pos.stopLoss.toString() : '');
  };

  const handleSaveTpSl = async () => {
    if (!editTpSlPos) return;
    try {
      setUpdatingTpSl(true);
      await apiService.updateTpSl(
        editTpSlPos.id,
        tpInput ? parseFloat(tpInput) : undefined,
        slInput ? parseFloat(slInput) : undefined
      );
      setEditTpSlPos(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update TP/SL');
    } finally {
      setUpdatingTpSl(false);
    }
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['ID', 'Type', 'Amount', 'Currency', 'Status', 'PnL', 'Date']
    ];

    history.forEach(t => {
      csvRows.push([
        t.id,
        t.type,
        t.amount.toString(),
        t.currency,
        t.status,
        (t.pnl || 0).toString(),
        formatIST(t.createdAt)
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `etoro_trade_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 flex flex-col text-xs relative">
      {/* Header Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-[#222] mb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'positions'
                ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10'
                : 'text-[#8A8A8A] hover:text-white bg-[#1A1A1A]'
            }`}
          >
            <span>Open Positions</span>
            <span className="px-1.5 py-0.2 rounded bg-black/20 text-[10px] font-mono">
              {positions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'orders'
                ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10'
                : 'text-[#8A8A8A] hover:text-white bg-[#1A1A1A]'
            }`}
          >
            <span>Pending Orders</span>
            <span className="px-1.5 py-0.2 rounded bg-black/20 text-[10px] font-mono">
              {pendingOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'history'
                ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10'
                : 'text-[#8A8A8A] hover:text-white bg-[#1A1A1A]'
            }`}
          >
            <span>Trade Log</span>
          </button>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-2.5 py-1.5 bg-[#1A1A1A] hover:bg-[#262626] border border-[#333] text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[#00C853]" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* Content Body */}
      <div className="overflow-x-auto min-h-[160px]">
        {activeTab === 'positions' && (
          positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[#8A8A8A]">
              <Layers className="w-8 h-8 mb-2 opacity-40 text-[#00C853]" />
              <p className="text-xs">No active open positions. Place an order above to start trading.</p>
            </div>
          ) : (
            <>
              {/* Premium Exchange Position Cards List */}
              <div className="space-y-4">
                {positions.map(pos => (
                  <PositionCardItem
                    key={pos.id}
                    pos={pos}
                    systemSettings={systemSettings}
                    closingId={closingId}
                    onShare={handleShareLivePosition}
                    onOpenTpSl={handleOpenTpSlModal}
                    onClose={handleClosePosition}
                  />
                ))}
              </div>
            </>
          )
        )}

        {activeTab === 'orders' && (
          pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[#8A8A8A]">
              <Sliders className="w-8 h-8 mb-2 opacity-40 text-blue-400" />
              <p className="text-xs">No pending limit or stop orders.</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards View (< md) */}
              <div className="md:hidden space-y-3 font-mono text-xs">
                {pendingOrders.map(ord => (
                  <div key={ord.id} className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[#222] pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-white text-sm">{ord.symbol}</span>
                        <span className="text-blue-400 uppercase font-bold text-[10px]">{ord.type}</span>
                        <span className={`font-bold text-[10px] ${ord.side === 'buy' ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                          {ord.side.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-amber-400 font-bold uppercase text-[10px]">{ord.status}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[#8A8A8A] block">Limit Price</span>
                        <span className="text-white font-bold">${ord.price ? ord.price.toLocaleString() : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[#8A8A8A] block">Quantity</span>
                        <span className="text-[#C0C0C0] font-bold">{ord.amount}</span>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-[#222]">
                      <button
                        onClick={() => handleCancelOrder(ord.id)}
                        disabled={cancellingOrderId === ord.id}
                        className="w-full h-10 bg-[#FF3B30]/20 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white rounded-xl text-xs font-bold transition-all border border-[#FF3B30]/30 flex items-center justify-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{cancellingOrderId === ord.id ? 'Cancelling...' : 'Cancel Order'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <table className="hidden md:table w-full text-left font-mono">
                <thead>
                  <tr className="text-[10px] text-[#8A8A8A] border-b border-[#222]">
                    <th className="pb-2">ORDER ID</th>
                    <th className="pb-2">SYMBOL</th>
                    <th className="pb-2">TYPE</th>
                    <th className="pb-2">SIDE / LEV</th>
                    <th className="pb-2">PRICE</th>
                    <th className="pb-2">QTY</th>
                    <th className="pb-2">ORDER VALUE</th>
                    <th className="pb-2">MARGIN RESERVED</th>
                    <th className="pb-2">TIME</th>
                    <th className="pb-2">STATUS</th>
                    <th className="pb-2 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {pendingOrders.map(ord => {
                    const lev = ord.leverage || 1;
                    const price = ord.price || 0;
                    const orderValue = price * ord.amount;
                    const marginReserved = orderValue / lev;

                    return (
                      <tr key={ord.id} className="hover:bg-[#1A1A1A] text-xs">
                        <td className="py-2.5 text-[#8A8A8A] font-mono">{ord.id}</td>
                        <td className="py-2.5 font-bold text-white">{ord.symbol}</td>
                        <td className="py-2.5 text-blue-400 uppercase font-bold">{ord.type}</td>
                        <td className="py-2.5 font-bold">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${ord.side === 'buy' ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'}`}>
                            {ord.side.toUpperCase()} {lev}x
                          </span>
                        </td>
                        <td className="py-2.5 text-white">${price ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '-'}</td>
                        <td className="py-2.5 text-[#C0C0C0]">{ord.amount}</td>
                        <td className="py-2.5 text-white font-bold">${orderValue.toFixed(2)}</td>
                        <td className="py-2.5 text-amber-400 font-bold">${marginReserved.toFixed(2)}</td>
                        <td className="py-2.5 text-[#8A8A8A] text-[10px] font-sans">{formatIST(ord.createdAt)}</td>
                        <td className="py-2.5 text-amber-400 font-bold uppercase">{ord.status}</td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleCancelOrder(ord.id)}
                            disabled={cancellingOrderId === ord.id}
                            className="px-2.5 py-1 bg-[#FF3B30]/20 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white rounded text-[10px] font-bold transition-all border border-[#FF3B30]/30 inline-flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{cancellingOrderId === ord.id ? 'Cancelling...' : 'Cancel'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )
        )}

        {activeTab === 'history' && (
          history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[#8A8A8A]">
              <Layers className="w-8 h-8 mb-2 opacity-40 text-[#8A8A8A]" />
              <p className="text-xs">No trade history recorded yet.</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards View (< md) */}
              <div className="md:hidden space-y-3 font-mono text-xs">
                {history.map(t => {
                  const symbol = t.symbol || t.currency || 'BTC/USDT';
                  const side = t.side || t.type;
                  const isLong = side === 'long' || side === 'buy';
                  const netPnLVal = t.netPnL !== undefined ? t.netPnL : (t.pnl || 0);

                  return (
                    <div key={t.id} className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-3.5 space-y-2.5 font-mono">
                      <div className="flex items-center justify-between border-b border-[#222] pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-white text-sm">{symbol}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            isLong ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                          }`}>
                            {side.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[#00C853] font-bold uppercase text-[10px] bg-[#00C853]/10 px-2 py-0.5 rounded">
                            {t.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#8A8A8A] block">Entry Price</span>
                          <span className="text-white font-bold">{t.entryPrice ? `$${t.entryPrice.toLocaleString()}` : '-'}</span>
                        </div>
                        <div>
                          <span className="text-[#8A8A8A] block">Exit Price</span>
                          <span className="text-white font-bold">{t.exitPrice ? `$${t.exitPrice.toLocaleString()}` : '-'}</span>
                        </div>
                        <div>
                          <span className="text-[#8A8A8A] block">Lots / Size</span>
                          <span className="text-[#C0C0C0] font-bold">{formatLots(getTradeLots(t))}</span>
                          <span className="text-[#666] text-[10px] block font-mono">({t.quantity || '-'} units)</span>
                        </div>
                        <div>
                          <span className="text-[#8A8A8A] block">Handling Fee</span>
                          <span className="text-amber-400 font-bold">${((t.handlingFee !== undefined ? t.handlingFee : t.fee) || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[#8A8A8A] block">Realized PnL</span>
                          <span className={`font-bold ${(t.pnl || 0) >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                            {(t.pnl || 0) >= 0 ? '+' : ''}${(t.pnl || 0).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8A8A8A] block">Final Net Profit</span>
                          <span className={`font-bold ${netPnLVal >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                            {netPnLVal >= 0 ? '+' : ''}${netPnLVal.toFixed(2)}
                          </span>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-[#222] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <span className="text-[10px] text-[#8A8A8A]">
                            Opened at: {formatIST(t.openedAt || t.createdAt)}
                          </span>
                          {systemSettings?.tradeSharingEnabled !== false && (
                            <button
                              onClick={() => handleShareHistoryTrade(t)}
                              className="w-full sm:w-auto px-3 py-1.5 bg-[#00C853]/15 hover:bg-[#00C853]/25 text-[#00C853] border border-[#00C853]/30 rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-1"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Trade Proof Card</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= md) */}
              <table className="hidden md:table w-full text-left font-mono whitespace-nowrap">
                <thead>
                  <tr className="text-[10px] text-[#8A8A8A] border-b border-[#222]">
                    <th className="pb-2 pr-4">ASSET</th>
                    <th className="pb-2 pr-4">TYPE</th>
                    <th className="pb-2 pr-4">ENTRY PRICE</th>
                    <th className="pb-2 pr-4">EXIT PRICE</th>
                    <th className="pb-2 pr-4">QTY</th>
                    <th className="pb-2 pr-4">FEES</th>
                    <th className="pb-2 pr-4">REALIZED PnL</th>
                    <th className="pb-2 pr-4">NET PROFIT</th>
                    <th className="pb-2 pr-4">STATUS</th>
                    <th className="pb-2 pr-4">OPENING TIME</th>
                    <th className="pb-2 pl-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {history.map(t => {
                    const symbol = t.symbol || t.currency || 'BTC/USDT';
                    const side = t.side || t.type;
                    const isLong = side === 'long' || side === 'buy';
                    const netPnLVal = t.netPnL !== undefined ? t.netPnL : (t.pnl || 0);

                    return (
                      <tr key={t.id} className="hover:bg-[#1A1A1A] text-xs">
                        <td className="py-2.5 pr-4 font-bold text-white truncate max-w-[120px]">{symbol}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isLong ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                          }`}>
                            {side.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-white">{t.entryPrice ? `$${t.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '-'}</td>
                        <td className="py-2.5 pr-4 text-white font-bold">{t.exitPrice ? `$${t.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '-'}</td>
                        <td className="py-2.5 pr-4 text-[#C0C0C0]">
                          <span className="font-bold text-white">{formatLots(getTradeLots(t))}</span>
                          <span className="text-[#666] text-[10px] block font-mono">({t.quantity || '-'})</span>
                        </td>
                        <td className="py-2.5 pr-4 text-amber-400 font-bold">${((t.handlingFee !== undefined ? t.handlingFee : t.fee) || 0).toFixed(2)}</td>
                        <td className="py-2.5 pr-4 font-bold">
                          <span className={(t.pnl || 0) >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}>
                            {(t.pnl || 0) >= 0 ? '+' : ''}${(t.pnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-bold">
                          <span className={netPnLVal >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}>
                            {netPnLVal >= 0 ? '+' : ''}${netPnLVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className="text-[#00C853] font-bold bg-[#00C853]/10 px-1.5 py-0.5 rounded text-[10px]">
                            {t.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-[#8A8A8A] text-[11px]">
                          {formatIST(t.openedAt || t.createdAt)}
                        </td>
                        <td className="py-2.5 pl-4 text-right">
                          {systemSettings?.tradeSharingEnabled !== false ? (
                            <button
                              onClick={() => handleShareHistoryTrade(t)}
                              className="px-2.5 py-1 bg-[#00C853]/15 hover:bg-[#00C853]/25 text-[#00C853] rounded-lg text-[10px] font-bold transition-all border border-[#00C853]/30 inline-flex items-center space-x-1"
                              title="Generate & Download Trade Card Proof"
                            >
                              <Share2 className="w-3 h-3 shrink-0" />
                              <span>Trade Proof</span>
                            </button>
                          ) : (
                            <span className="text-[#555] text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )
        )}
      </div>

      {/* EDIT TP / SL MODAL DIALOG */}
      {editTpSlPos && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#333333] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Edit Stop Loss & Take Profit</h3>
              </div>
              <button
                onClick={() => setEditTpSlPos(null)}
                className="text-[#8A8A8A] hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 font-mono text-xs text-[#8A8A8A] bg-[#121212] p-2.5 rounded-xl border border-[#222]">
              <div className="flex justify-between">
                <span>Position:</span>
                <span className="text-white font-bold">{editTpSlPos.symbol} ({editTpSlPos.side.toUpperCase()})</span>
              </div>
              <div className="flex justify-between">
                <span>Entry Price:</span>
                <span className="text-white">${editTpSlPos.entryPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Mark Price:</span>
                <span className="text-[#00C853]">${editTpSlPos.markPrice.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-[#8A8A8A] font-semibold block mb-1">
                  Take Profit Price ($)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 98000"
                  value={tpInput}
                  onChange={(e) => setTpInput(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2A2A2A] focus:border-[#00C853] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#8A8A8A] font-semibold block mb-1">
                  Stop Loss Price ($)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 91000"
                  value={slInput}
                  onChange={(e) => setSlInput(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2A2A2A] focus:border-[#FF3B30] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setEditTpSlPos(null)}
                className="flex-1 py-2 bg-[#222] hover:bg-[#2A2A2A] text-white rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTpSl}
                disabled={updatingTpSl}
                className="flex-1 py-2 bg-[#00C853] hover:bg-[#00B048] text-black rounded-xl text-xs font-bold transition-all shadow-md shadow-[#00C853]/10"
              >
                {updatingTpSl ? 'Saving...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRADE PROOF SHARE MODAL */}
      <TradeShareModal
        position={selectedSharePosition}
        transaction={selectedShareTransaction}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        systemSettings={systemSettings}
      />
    </div>
  );
};
