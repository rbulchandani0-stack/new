import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  History,
  Shield,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Calculator,
  Calendar,
  Clock,
  User,
  Layers,
  Search,
  Check,
  Info,
  Sliders,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';
import { AdminTradeItem, MarketPair, User as UserType } from '../../types';
import { apiService } from '../../services/api';
import { formatLots, getContractSize, lotsToUnits, unitsToLots } from '../../utils/marginUtils';
import { formatIST } from '../../utils/dateUtils';

interface EditTradeModalProps {
  trade: AdminTradeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedTrade: any, pnlDiff: number) => void;
  allUsers?: (UserType & { wallet?: any })[];
}

export const EditTradeModal: React.FC<EditTradeModalProps> = ({
  trade,
  isOpen,
  onClose,
  onSuccess,
  allUsers = []
}) => {
  if (!isOpen || !trade) return null;

  // Available markets
  const [markets, setMarkets] = useState<MarketPair[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState<boolean>(false);
  const [symbolSearch, setSymbolSearch] = useState<string>('');
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState<boolean>(false);

  // User search/reassignment
  const [userSearch, setUserSearch] = useState<string>('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(trade.userId || '');
  const [showAccountReassign, setShowAccountReassign] = useState<boolean>(false);

  // Collapsible sections state
  const [openSections, setOpenSections] = useState<{
    timing: boolean;
    fees: boolean;
    pnl: boolean;
    audit: boolean;
  }>({
    timing: false,
    fees: false,
    pnl: true, // P&L visible by default for clear financial awareness
    audit: false
  });

  const toggleSection = (section: 'timing' | 'fees' | 'pnl' | 'audit') => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Form State - Trade & Account Information
  const [referenceId, setReferenceId] = useState<string>(trade.referenceId || trade.id);
  const [symbol, setSymbol] = useState<string>(trade.symbol || 'BTC/USDT');
  const [side, setSide] = useState<'buy' | 'sell' | 'long' | 'short'>(trade.side || 'buy');
  const [orderType, setOrderType] = useState<string>(trade.orderType || 'market');
  const [status, setStatus] = useState<string>(trade.status === 'open' ? 'open' : (trade.status === 'cancelled' ? 'cancelled' : 'completed'));

  // Execution Details
  const [entryPrice, setEntryPrice] = useState<string>(String(trade.entryPrice ?? ''));
  const [exitPrice, setExitPrice] = useState<string>(String(trade.exitPrice || trade.currentPrice || ''));
  const [lots, setLots] = useState<string>(trade.lots !== undefined && trade.lots !== null ? String(trade.lots) : '0.1');
  const [stopLoss, setStopLoss] = useState<string>(trade.stopLoss ? String(trade.stopLoss) : '');
  const [takeProfit, setTakeProfit] = useState<string>(trade.takeProfit ? String(trade.takeProfit) : '');

  // Timing (ISO strings split into date and time for intuitive pickers)
  const initOpenDate = trade.openedAt ? new Date(trade.openedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const initOpenTime = trade.openedAt ? new Date(trade.openedAt).toTimeString().substring(0, 8) : '12:00:00';
  const initCloseDate = (trade.closedAt || trade.createdAt) ? new Date(trade.closedAt || trade.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const initCloseTime = (trade.closedAt || trade.createdAt) ? new Date(trade.closedAt || trade.createdAt).toTimeString().substring(0, 8) : '12:05:00';

  const [openDate, setOpenDate] = useState<string>(initOpenDate);
  const [openTime, setOpenTime] = useState<string>(initOpenTime);
  const [closeDate, setCloseDate] = useState<string>(initCloseDate);
  const [closeTime, setCloseTime] = useState<string>(initCloseTime);

  // Fees & Charges
  const [fee, setFee] = useState<string>(String(trade.fee || '0'));
  const [handlingFee, setHandlingFee] = useState<string>(String(trade.handlingFee || '0'));
  const [swapFee, setSwapFee] = useState<string>(String(trade.swapFee || '0'));

  // Profit & Loss Adjustment
  const [manualPnLOverride, setManualPnLOverride] = useState<boolean>(false);
  const [grossPnL, setGrossPnL] = useState<string>(String(trade.grossPnL || '0'));
  const [netPnL, setNetPnL] = useState<string>(String(trade.netPnL || '0'));

  // Administrative Reason & Controls
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState<boolean>(false);

  // Preset lot sizes for quick one-click selection
  const LOT_PRESETS = [0.01, 0.05, 0.09, 0.10, 0.50, 1.00, 2.00, 5.00];

  // Load live markets list on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingMarkets(true);
    apiService.getMarkets()
      .then(res => {
        if (isMounted && Array.isArray(res)) {
          setMarkets(res);
        }
      })
      .catch(err => console.error('Failed to load market instruments:', err))
      .finally(() => {
        if (isMounted) setLoadingMarkets(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Selected Market Metadata
  const currentMarket = useMemo(() => {
    return markets.find(m => m.symbol.toUpperCase() === symbol.toUpperCase()) ||
      markets.find(m => m.symbol.replace('/', '').toUpperCase() === symbol.replace('/', '').toUpperCase());
  }, [markets, symbol]);

  const contractSize = useMemo(() => {
    return getContractSize(symbol, currentMarket?.category);
  }, [symbol, currentMarket]);

  const totalUnits = useMemo(() => {
    const l = Number(lots);
    if (isNaN(l) || l <= 0) return 0;
    return lotsToUnits(l, symbol, currentMarket?.category);
  }, [lots, symbol, currentMarket]);

  // Selected Target User Info
  const selectedUserObj = useMemo(() => {
    return allUsers.find(u => u.id === selectedUserId) || {
      id: trade.userId,
      name: trade.userName || 'Trader',
      email: trade.userEmail || 'trader@etoroglobal.com',
      wallet: { tradingBalance: 0 }
    };
  }, [allUsers, selectedUserId, trade]);

  // Recalculate auto P&L when execution specs or fees change (if override disabled)
  useEffect(() => {
    if (!manualPnLOverride && status !== 'open') {
      const ePrice = Number(entryPrice);
      const xPrice = Number(exitPrice);
      const l = Number(lots);
      const totalFee = Number(fee) || 0;
      const totalSwap = Number(swapFee) || 0;

      if (!isNaN(ePrice) && !isNaN(xPrice) && !isNaN(l) && ePrice > 0 && xPrice > 0 && l > 0) {
        const units = lotsToUnits(l, symbol, currentMarket?.category);
        const isLong = side.toLowerCase() === 'long' || side.toLowerCase() === 'buy';
        const calcGross = isLong
          ? (xPrice - ePrice) * units
          : (ePrice - xPrice) * units;
        const calcNet = calcGross - totalFee - totalSwap;

        setGrossPnL(calcGross.toFixed(2));
        setNetPnL(calcNet.toFixed(2));
      }
    }
  }, [entryPrice, exitPrice, lots, fee, swapFee, side, symbol, currentMarket, manualPnLOverride, status]);

  // Financial Reconciliation Calculation
  const originalNetPnL = trade.netPnL !== undefined ? trade.netPnL : (trade.grossPnL || 0) - (trade.fee || 0);
  const targetNetPnL = status === 'open' ? 0 : (Number(netPnL) || 0);
  const pnlDiff = Number((targetNetPnL - originalNetPnL).toFixed(2));

  // Filtered Markets for Search Selector
  const filteredMarkets = useMemo(() => {
    if (!symbolSearch.trim()) return markets.slice(0, 30);
    const q = symbolSearch.toLowerCase().trim();
    return markets.filter(m =>
      m.symbol.toLowerCase().includes(q) ||
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.category && m.category.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [markets, symbolSearch]);

  // Filtered Users for Search Selector
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return allUsers.slice(0, 20);
    const q = userSearch.toLowerCase().trim();
    return allUsers.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [allUsers, userSearch]);

  const isLong = side === 'buy' || side === 'long';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmStep) {
      // Validate inputs with human-readable error messages
      if (!reason.trim() || reason.trim().length < 3) {
        setError('Please enter a mandatory administrative reason for this trade edit (at least 3 characters).');
        return;
      }
      if (isNaN(Number(entryPrice)) || Number(entryPrice) <= 0) {
        setError('Opening / Entry Price must be a valid positive number.');
        return;
      }
      if (status !== 'open' && (isNaN(Number(exitPrice)) || Number(exitPrice) <= 0)) {
        setError('Closing / Exit Price is required for completed trades.');
        return;
      }
      if (isNaN(Number(lots)) || Number(lots) <= 0) {
        setError('Lot Size must be a valid positive number greater than 0.');
        return;
      }
      if (Number(fee) < 0 || Number(handlingFee) < 0) {
        setError('Fees cannot be negative values.');
        return;
      }

      // Validate Timing
      const fullOpenedAt = `${openDate}T${openTime}Z`;
      const fullClosedAt = `${closeDate}T${closeTime}Z`;
      if (status !== 'open' && new Date(fullOpenedAt).getTime() > new Date(fullClosedAt).getTime()) {
        setError('Opening timestamp cannot be later than Closing timestamp.');
        return;
      }

      setError(null);
      setConfirmStep(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fullOpenedAt = `${openDate}T${openTime}Z`;
      const fullClosedAt = `${closeDate}T${closeTime}Z`;

      const payload = {
        userId: selectedUserId !== trade.userId ? selectedUserId : undefined,
        symbol: symbol !== trade.symbol ? symbol : undefined,
        side,
        orderType,
        lots: Number(lots),
        quantity: totalUnits,
        entryPrice: Number(entryPrice),
        exitPrice: status !== 'open' ? Number(exitPrice) : undefined,
        stopLoss: stopLoss ? Number(stopLoss) : undefined,
        takeProfit: takeProfit ? Number(takeProfit) : undefined,
        fee: Number(fee),
        handlingFee: Number(handlingFee),
        swapFee: Number(swapFee),
        pnl: Number(grossPnL),
        netPnL: Number(netPnL),
        status: status === 'closed' ? 'completed' : status,
        openedAt: fullOpenedAt,
        closedAt: fullClosedAt,
        referenceId: referenceId.trim(),
        reason: reason.trim()
      };

      const res = await apiService.editTrade(trade.id, payload);
      onSuccess(res.trade || trade, res.pnlDiff !== undefined ? res.pnlDiff : pnlDiff);
      onClose();
    } catch (err: any) {
      console.error('Failed to edit trade record:', err);
      setError(err.message || 'Failed to update trade parameters. Please check inputs and try again.');
      setConfirmStep(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="edit-trade-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div id="edit-trade-modal-container" className="relative w-full max-w-3xl my-6 bg-[#121212] border border-[#262626] rounded-2xl shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Clean Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#262626] bg-[#181818]/90">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl border ${
              isLong
                ? 'bg-[#00C853]/10 text-[#00C853] border-[#00C853]/30'
                : 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/30'
            }`}>
              {isLong ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Edit Trade
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#222222] text-[#A0A0A0] border border-[#333333]">
                  #{trade.id}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  status === 'open'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : status === 'cancelled'
                    ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {status}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  isLong ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                }`}>
                  {isLong ? 'BUY / LONG' : 'SELL / SHORT'}
                </span>
              </div>
              <p className="text-[11px] text-[#8A8A8A]">
                Update execution parameters, position volume, fees, and financial ledger settlement
              </p>
            </div>
          </div>
          <button
            id="close-edit-trade-modal-button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8A8A8A] hover:text-white hover:bg-[#262626] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          
          {/* Validation Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3 text-red-400 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Validation Issue</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* 1. Account & Instrument Summary Banner (Compact & Sober) */}
          <div className="p-3.5 rounded-xl bg-[#161616] border border-[#262626] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <User className="w-3.5 h-3.5 text-[#00C853]" />
                <span className="text-xs font-bold text-white">Customer Account:</span>
                <span className="text-xs font-semibold text-white">{selectedUserObj.name}</span>
                <span className="text-[11px] text-[#8A8A8A] font-mono">({selectedUserObj.email})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountReassign(!showAccountReassign)}
                className="text-[11px] font-semibold text-[#00C853] hover:underline cursor-pointer flex items-center space-x-1"
              >
                <span>{showAccountReassign ? 'Done Reassigning' : 'Reassign Customer'}</span>
              </button>
            </div>

            {/* Optional Customer Account Re-selector */}
            {showAccountReassign && (
              <div className="relative pt-1 border-t border-[#262626] animate-in fade-in">
                <label className="block text-[10px] font-semibold text-[#8A8A8A] mb-1">
                  Search & Select Target Customer Account:
                </label>
                <button
                  type="button"
                  id="user-selector-button"
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-white flex items-center justify-between text-left focus:outline-none focus:border-[#00C853] cursor-pointer"
                >
                  <span className="truncate">
                    {selectedUserObj.name} ({selectedUserObj.email}) — ID: {selectedUserObj.id}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#707070] flex-shrink-0 ml-1" />
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[#181818] border border-[#333333] rounded-xl shadow-2xl p-2 max-h-48 overflow-y-auto">
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#707070]" />
                      <input
                        type="text"
                        placeholder="Search name, email, ID..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full bg-[#0D0D0D] border border-[#262626] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00C853]"
                      />
                    </div>
                    <div className="space-y-1">
                      {filteredUsers.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(u.id);
                            setIsUserDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            selectedUserId === u.id ? 'bg-[#00C853]/20 text-[#00C853] font-bold' : 'text-[#CCCCCC] hover:bg-[#222222]'
                          }`}
                        >
                          <div>
                            <p className="font-semibold">{u.name}</p>
                            <p className="text-[10px] text-[#707070]">{u.email} • ID: {u.id}</p>
                          </div>
                          {selectedUserId === u.id && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. PRIMARY EXECUTION DETAILS (Clean, prominent, immediately visible) */}
          <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-[#00C853]" />
                <span>Core Trade Execution</span>
              </h4>
              <span className="text-[11px] text-[#00C853] font-mono">
                1.00 Lot = {contractSize.toLocaleString()} units
              </span>
            </div>

            {/* Instrument, Direction & Status Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Instrument Selector */}
              <div className="relative">
                <label className="block text-[11px] font-bold text-gray-300 mb-1 font-sans">
                  Instrument / Symbol
                </label>
                <button
                  type="button"
                  id="symbol-selector-button"
                  onClick={() => setIsSymbolDropdownOpen(!isSymbolDropdownOpen)}
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-white flex items-center justify-between text-left focus:outline-none focus:border-[#00C853] cursor-pointer"
                >
                  <span className="font-bold text-[#00C853] flex items-center gap-1.5">
                    {symbol}
                    {currentMarket?.category && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#262626] text-[#A0A0A0] font-normal uppercase">
                        {currentMarket.category}
                      </span>
                    )}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#707070] flex-shrink-0 ml-1" />
                </button>

                {isSymbolDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[#181818] border border-[#333333] rounded-xl shadow-2xl p-2 max-h-56 overflow-y-auto">
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#707070]" />
                      <input
                        type="text"
                        placeholder="Search Forex, Metals, Crypto, Indices..."
                        value={symbolSearch}
                        onChange={(e) => setSymbolSearch(e.target.value)}
                        className="w-full bg-[#0D0D0D] border border-[#262626] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00C853]"
                      />
                    </div>
                    <div className="space-y-1">
                      {filteredMarkets.map(m => (
                        <button
                          key={m.symbol}
                          type="button"
                          onClick={() => {
                            setSymbol(m.symbol);
                            setIsSymbolDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            symbol.toUpperCase() === m.symbol.toUpperCase() ? 'bg-[#00C853]/20 text-[#00C853] font-bold' : 'text-[#CCCCCC] hover:bg-[#222222]'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-bold">{m.symbol}</span>
                            <span className="text-[10px] text-[#707070]">({m.name || m.category})</span>
                          </div>
                          <span className="text-[11px] font-mono text-white">${m.price?.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Direction Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1 font-sans">
                  Trade Direction
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSide('buy')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      isLong
                        ? 'bg-[#00C853]/20 border-[#00C853] text-[#00C853]'
                        : 'bg-[#0D0D0D] border-[#2E2E2E] text-[#707070] hover:text-white'
                    }`}
                  >
                    BUY / LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide('sell')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      !isLong
                        ? 'bg-[#FF3B30]/20 border-[#FF3B30] text-[#FF3B30]'
                        : 'bg-[#0D0D0D] border-[#2E2E2E] text-[#707070] hover:text-white'
                    }`}
                  >
                    SELL / SHORT
                  </button>
                </div>
              </div>

              {/* Trade Status */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1 font-sans">
                  Trade Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#00C853] cursor-pointer"
                >
                  <option value="completed">Completed / Settled</option>
                  <option value="open">Open Active Position</option>
                  <option value="cancelled">Cancelled / Void</option>
                </select>
              </div>
            </div>

            {/* Lot Size, Entry Price, Exit Price Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Lot Size with precision handling and quick presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-300 font-sans">
                    Lot Size (Volume) <span className="text-[#00C853]">*</span>
                  </label>
                  <span className="text-[10px] text-[#8A8A8A] font-mono">
                    {totalUnits.toLocaleString()} units
                  </span>
                </div>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  required
                  value={lots}
                  onChange={(e) => setLots(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#00C853] focus:outline-none"
                  placeholder="0.09"
                />
                {/* Quick Presets */}
                <div className="flex items-center flex-wrap gap-1 pt-0.5">
                  {LOT_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setLots(String(p))}
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                        Number(lots) === p
                          ? 'bg-[#00C853]/20 border-[#00C853] text-[#00C853] font-bold'
                          : 'bg-[#181818] border-[#2A2A2A] text-[#8A8A8A] hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entry Price */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1 font-sans">
                  Open / Entry Price ($) <span className="text-[#00C853]">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  required
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              {/* Exit Price */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1 font-sans">
                  {status === 'open' ? 'Current Mark Price ($)' : 'Close / Exit Price ($)'}
                  {status !== 'open' && <span className="text-[#00C853]">*</span>}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  disabled={status === 'open'}
                  value={status === 'open' ? (exitPrice || 'Active Position') : exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-lg px-3 py-2 text-xs font-mono text-white disabled:opacity-40 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Stop Loss, Take Profit, Reference ID Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Stop Loss ($) <span className="text-[10px] text-[#666] font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00C853]"
                  placeholder="Not Set"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Take Profit ($) <span className="text-[10px] text-[#666] font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00C853]"
                  placeholder="Not Set"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Reference Identifier
                </label>
                <input
                  type="text"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#00C853]"
                  placeholder="e.g. REF-109284"
                />
              </div>
            </div>
          </div>

          {/* 3. PROFIT & LOSS & FINANCIAL RECONCILIATION SECTION (Clean, easy to understand) */}
          <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#262626] pb-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-3.5 h-3.5 text-[#00C853]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Profit & Loss Settlement
                </h4>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  manualPnLOverride
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30'
                }`}>
                  {manualPnLOverride ? 'Manual Override Active' : 'Auto-Calculated'}
                </span>
              </div>

              {/* Manual Override Switch */}
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualPnLOverride}
                  onChange={(e) => setManualPnLOverride(e.target.checked)}
                  className="rounded bg-[#0D0D0D] border-[#2E2E2E] text-[#00C853] focus:ring-[#00C853] cursor-pointer"
                />
                <span className="text-xs text-amber-300 font-semibold select-none">
                  Manual P&L Override
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Gross Realized P&L ($ USDT)
                </label>
                <input
                  type="number"
                  step="any"
                  disabled={!manualPnLOverride && status !== 'open'}
                  value={grossPnL}
                  onChange={(e) => setGrossPnL(e.target.value)}
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs font-mono font-bold text-white disabled:opacity-60 focus:outline-none focus:border-[#00C853]"
                />
                <span className="text-[10px] text-[#707070] mt-0.5 block">
                  P&L before deduction of trading and swap fees
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Net Realized P&L ($ USDT)
                </label>
                <input
                  type="number"
                  step="any"
                  disabled={!manualPnLOverride && status !== 'open'}
                  value={netPnL}
                  onChange={(e) => setNetPnL(e.target.value)}
                  className={`w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs font-mono font-bold disabled:opacity-60 focus:outline-none focus:border-[#00C853] ${
                    Number(netPnL) >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'
                  }`}
                />
                <span className="text-[10px] text-[#707070] mt-0.5 block">
                  Net wallet impact: Gross P&L minus Fees
                </span>
              </div>
            </div>

            {/* Financial Ledger Impact Banner */}
            <div className={`p-3 rounded-lg flex items-center justify-between text-xs border ${
              pnlDiff > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : pnlDiff < 0
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-[#0D0D0D] border-[#262626] text-[#A0A0A0]'
            }`}>
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 flex-shrink-0 text-[#00C853]" />
                <span>
                  {pnlDiff > 0
                    ? `Account '${selectedUserObj.name}' will receive a credit adjustment of +$${pnlDiff.toFixed(2)} USDT.`
                    : pnlDiff < 0
                    ? `Account '${selectedUserObj.name}' will receive a debit adjustment of -$${Math.abs(pnlDiff).toFixed(2)} USDT.`
                    : `No financial balance adjustment required for this modification.`}
                </span>
              </div>
              <span className="font-mono font-black text-xs shrink-0 ml-2">
                {pnlDiff > 0 ? `+$${pnlDiff.toFixed(2)}` : pnlDiff < 0 ? `-$${Math.abs(pnlDiff).toFixed(2)}` : '$0.00'}
              </span>
            </div>
          </div>

          {/* 4. COLLAPSIBLE SECONDARY SECTIONS: FEES & TIMING */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Fees Accordion Card */}
            <div className="bg-[#161616] border border-[#262626] rounded-xl p-3.5 space-y-3">
              <button
                type="button"
                onClick={() => toggleSection('fees')}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-3.5 h-3.5 text-[#00C853]" />
                  <span className="text-xs font-bold text-white">Trading Fees & Charges</span>
                  <span className="text-[10px] text-[#8A8A8A] font-mono">
                    (${Number(fee || 0).toFixed(2)})
                  </span>
                </div>
                {openSections.fees ? (
                  <ChevronUp className="w-4 h-4 text-[#8A8A8A]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#8A8A8A]" />
                )}
              </button>

              {openSections.fees && (
                <div className="space-y-2.5 pt-2 border-t border-[#262626] animate-in fade-in">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#8A8A8A] mb-1">
                      Trading Fee ($ USDT)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#00C853]"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#8A8A8A] mb-1">
                      Commission / Handling Fee ($ USDT)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={handlingFee}
                      onChange={(e) => setHandlingFee(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#00C853]"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#8A8A8A] mb-1">
                      Swap / Overnight Fee ($ USDT)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={swapFee}
                      onChange={(e) => setSwapFee(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#00C853]"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Timing Accordion Card */}
            <div className="bg-[#161616] border border-[#262626] rounded-xl p-3.5 space-y-3">
              <button
                type="button"
                onClick={() => toggleSection('timing')}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-[#00C853]" />
                  <span className="text-xs font-bold text-white">Execution Timing</span>
                  <span className="text-[10px] text-[#8A8A8A]">IST / UTC+5:30</span>
                </div>
                {openSections.timing ? (
                  <ChevronUp className="w-4 h-4 text-[#8A8A8A]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#8A8A8A]" />
                )}
              </button>

              {openSections.timing && (
                <div className="space-y-2.5 pt-2 border-t border-[#262626] animate-in fade-in">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#8A8A8A] mb-1">
                        Open Date
                      </label>
                      <input
                        type="date"
                        value={openDate}
                        onChange={(e) => setOpenDate(e.target.value)}
                        className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00C853]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#8A8A8A] mb-1">
                        Open Time
                      </label>
                      <input
                        type="time"
                        step="1"
                        value={openTime}
                        onChange={(e) => setOpenTime(e.target.value)}
                        className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00C853]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#8A8A8A] mb-1">
                        Close Date
                      </label>
                      <input
                        type="date"
                        disabled={status === 'open'}
                        value={closeDate}
                        onChange={(e) => setCloseDate(e.target.value)}
                        className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-2 py-1 text-xs text-white disabled:opacity-40 focus:outline-none focus:border-[#00C853]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#8A8A8A] mb-1">
                        Close Time
                      </label>
                      <input
                        type="time"
                        step="1"
                        disabled={status === 'open'}
                        value={closeTime}
                        onChange={(e) => setCloseTime(e.target.value)}
                        className="w-full bg-[#0D0D0D] border border-[#2E2E2E] rounded-lg px-2 py-1 text-xs text-white disabled:opacity-40 focus:outline-none focus:border-[#00C853]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. ADMINISTRATIVE REASON (Mandatory for audit trail) */}
          <div className="p-3.5 rounded-xl bg-[#161616] border border-[#262626] space-y-2">
            <label className="block text-xs font-bold text-amber-300 font-sans">
              Administrative Edit Reason <span className="text-[#00C853]">*</span>
            </label>
            <input
              id="edit-trade-reason-input"
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Liquidity bridge latency slippage correction, corporate action, manual ledger reconciliation"
              className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-lg px-3 py-2 text-xs text-white placeholder-[#606060] outline-none"
            />
          </div>

          {/* Confirmation Step Warning */}
          {confirmStep && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-2 animate-in fade-in">
              <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Confirm Trade Record Update</span>
              </div>
              <p className="text-xs text-[#CCCCCC] leading-relaxed">
                You are updating trade <strong>#{trade.id}</strong> ({trade.symbol}, {lots} lots).
                {pnlDiff !== 0 && (
                  <span>
                    {' '}This will apply a financial reconciliation of <strong>{pnlDiff > 0 ? `+$${pnlDiff.toFixed(2)}` : `-$${Math.abs(pnlDiff).toFixed(2)}`} USDT</strong> to user <strong>{selectedUserObj.name}</strong>.
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#202020] text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center space-x-2.5">
              {confirmStep && (
                <button
                  type="button"
                  onClick={() => setConfirmStep(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#262626] text-[#CCCCCC] hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Back to Edit
                </button>
              )}

              <button
                type="submit"
                id="submit-edit-trade-button"
                disabled={loading}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-lg cursor-pointer ${
                  confirmStep
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                    : 'bg-[#00C853] hover:bg-[#00B048] text-black shadow-[#00C853]/20'
                } disabled:opacity-50`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : confirmStep ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Save Changes</span>
                  </>
                ) : (
                  <>
                    <span>Review & Save</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
