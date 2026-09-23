import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
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
  ChevronDown
} from 'lucide-react';
import { MarketPair, User as UserType } from '../../types';
import { apiService } from '../../services/api';
import { getContractSize, lotsToUnits } from '../../utils/marginUtils';

interface CreateTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTrade: any) => void;
  allUsers?: (UserType & { wallet?: any })[];
}

export const CreateTradeModal: React.FC<CreateTradeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  allUsers = []
}) => {
  if (!isOpen) return null;

  // Available markets
  const [markets, setMarkets] = useState<MarketPair[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState<boolean>(false);
  const [symbolSearch, setSymbolSearch] = useState<string>('');
  const [isSymbolDropdownOpen, setIsSymbolDropdownOpen] = useState<boolean>(false);

  // User search/select
  const [userSearch, setUserSearch] = useState<string>('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(allUsers.length > 0 ? allUsers[0].id : '');

  // Form State
  const [symbol, setSymbol] = useState<string>('EUR/USD');
  const [side, setSide] = useState<'buy' | 'sell' | 'long' | 'short'>('buy');
  const [orderType, setOrderType] = useState<string>('market');
  const [status, setStatus] = useState<'closed' | 'open'>('closed');

  const [entryPrice, setEntryPrice] = useState<string>('1.0850');
  const [exitPrice, setExitPrice] = useState<string>('1.0890');
  const [lots, setLots] = useState<string>('1.00');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');

  const [openDate, setOpenDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [openTime, setOpenTime] = useState<string>('10:00:00');
  const [closeDate, setCloseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [closeTime, setCloseTime] = useState<string>('10:45:00');

  const [fee, setFee] = useState<string>('0');
  const [handlingFee, setHandlingFee] = useState<string>('0');
  const [swapFee, setSwapFee] = useState<string>('0');

  const [manualPnLOverride, setManualPnLOverride] = useState<boolean>(false);
  const [grossPnL, setGrossPnL] = useState<string>('400.00');
  const [netPnL, setNetPnL] = useState<string>('400.00');

  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState<boolean>(false);

  // Load live markets list on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingMarkets(true);
    apiService.getMarkets()
      .then(res => {
        if (isMounted && Array.isArray(res) && res.length > 0) {
          setMarkets(res);
          if (!symbol) {
            setSymbol(res[0].symbol);
            setEntryPrice(String(res[0].price || '1.0850'));
            setExitPrice(String(res[0].price ? (res[0].price * 1.005).toFixed(4) : '1.0890'));
          }
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

  // Selected User Object
  const selectedUserObj = useMemo(() => {
    return allUsers.find(u => u.id === selectedUserId) || (allUsers.length > 0 ? allUsers[0] : null);
  }, [allUsers, selectedUserId]);

  // Auto set entry price when market changes
  const handleSelectSymbol = (newSymbol: string) => {
    setSymbol(newSymbol);
    const m = markets.find(pair => pair.symbol.toUpperCase() === newSymbol.toUpperCase());
    if (m && m.price) {
      setEntryPrice(String(m.price));
      const isBuy = side === 'buy' || side === 'long';
      const offset = m.price * 0.005;
      setExitPrice(String(isBuy ? (m.price + offset).toFixed(4) : (m.price - offset).toFixed(4)));
    }
    setIsSymbolDropdownOpen(false);
  };

  // Recalculate auto P&L when execution specs change
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmStep) {
      if (!selectedUserId) {
        setError('Please select a customer account.');
        return;
      }
      if (!reason.trim() || reason.trim().length < 3) {
        setError('A mandatory Justification Reason (minimum 3 characters) is required.');
        return;
      }
      if (isNaN(Number(entryPrice)) || Number(entryPrice) <= 0) {
        setError('Opening / Entry Price must be a positive number.');
        return;
      }
      if (status !== 'open' && (isNaN(Number(exitPrice)) || Number(exitPrice) <= 0)) {
        setError('Closing / Exit Price is required for closed trades.');
        return;
      }
      if (isNaN(Number(lots)) || Number(lots) <= 0) {
        setError('Lot Size must be greater than 0.');
        return;
      }

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
        userId: selectedUserId,
        symbol: symbol.trim(),
        side,
        orderType: orderType as any,
        lots: Number(lots),
        entryPrice: Number(entryPrice),
        exitPrice: status !== 'open' ? Number(exitPrice) : undefined,
        stopLoss: stopLoss ? Number(stopLoss) : undefined,
        takeProfit: takeProfit ? Number(takeProfit) : undefined,
        status,
        openedAt: fullOpenedAt,
        closedAt: fullClosedAt,
        fee: Number(fee),
        handlingFee: Number(handlingFee),
        swapFee: Number(swapFee),
        pnl: Number(grossPnL),
        netPnL: Number(netPnL),
        reason: reason.trim()
      };

      const res = await apiService.createAdminTrade(payload);
      onSuccess(res.trade);
      onClose();
    } catch (err: any) {
      console.error('Failed to create manual trade:', err);
      setError(err.message || 'Failed to create trade record. Please check parameters.');
      setConfirmStep(false);
    } finally {
      setLoading(false);
    }
  };

  const isLong = side === 'buy' || side === 'long';
  const finalWalletDelta = status === 'closed' ? Number(netPnL) : 0;

  return (
    <div id="create-trade-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div id="create-trade-modal-container" className="relative w-full max-w-4xl my-6 bg-[#121212] border border-[#262626] rounded-2xl shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#181818]/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Create New Trade Record
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00C853]/20 text-[#00C853] border border-[#00C853]/30">
                  MANUAL INJECTION
                </span>
              </div>
              <p className="text-xs text-[#8A8A8A]">
                Manually record a trade for a customer account with immediate ledger balance reconciliation
              </p>
            </div>
          </div>
          <button
            id="close-create-trade-modal-button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#8A8A8A] hover:text-white hover:bg-[#262626] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3 text-red-400 text-xs">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Validation Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Customer & Asset Selection */}
          <div className="p-4 rounded-xl bg-[#181818] border border-[#262626] space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0] flex items-center gap-1.5 border-b border-[#262626] pb-2">
              <User className="w-3.5 h-3.5 text-[#00C853]" />
              1. Customer Account & Asset Information
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Account Selector */}
              <div className="relative">
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Target Customer Account *
                </label>
                <button
                  type="button"
                  id="create-trade-user-selector-button"
                  onClick={() => {
                    setIsUserDropdownOpen(!isUserDropdownOpen);
                    setIsSymbolDropdownOpen(false);
                  }}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-white flex items-center justify-between text-left focus:outline-none focus:border-[#00C853]"
                >
                  <span className="truncate">
                    {selectedUserObj ? `${selectedUserObj.name} (${selectedUserObj.email})` : 'Select user...'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#707070] flex-shrink-0 ml-1" />
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[#181818] border border-[#333333] rounded-xl shadow-2xl p-2 max-h-48 overflow-y-auto">
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#707070]" />
                      <input
                        type="text"
                        placeholder="Search customer name, email, ID..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full bg-[#121212] border border-[#262626] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00C853]"
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
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
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

              {/* Symbol Selector */}
              <div className="relative">
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Trading Symbol / Currency Pair *
                </label>
                <button
                  type="button"
                  id="create-trade-symbol-selector-button"
                  onClick={() => {
                    setIsSymbolDropdownOpen(!isSymbolDropdownOpen);
                    setIsUserDropdownOpen(false);
                  }}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-white flex items-center justify-between text-left focus:outline-none focus:border-[#00C853]"
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
                        className="w-full bg-[#121212] border border-[#262626] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00C853]"
                      />
                    </div>
                    <div className="space-y-1">
                      {filteredMarkets.map(m => (
                        <button
                          key={m.symbol}
                          type="button"
                          onClick={() => handleSelectSymbol(m.symbol)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
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
            </div>

            {/* Direction, Status & Order Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSide('buy')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      isLong
                        ? 'bg-[#00C853]/20 border-[#00C853] text-[#00C853]'
                        : 'bg-[#121212] border-[#2E2E2E] text-[#707070] hover:text-white'
                    }`}
                  >
                    BUY / LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide('sell')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      !isLong
                        ? 'bg-[#FF3B30]/20 border-[#FF3B30] text-[#FF3B30]'
                        : 'bg-[#121212] border-[#2E2E2E] text-[#707070] hover:text-white'
                    }`}
                  >
                    SELL / SHORT
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Trade Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C853]"
                >
                  <option value="closed">Closed / Settled (completed trade)</option>
                  <option value="open">Open Position (active position)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Order Execution Type
                </label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C853]"
                >
                  <option value="market">Market Order</option>
                  <option value="limit">Limit Order</option>
                  <option value="stop">Stop Order</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing & Lots */}
          <div className="p-4 rounded-xl bg-[#181818] border border-[#262626] space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0] flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-[#00C853]" />
                2. Execution Prices & Volume Sizing
              </h4>
              <span className="text-[11px] text-[#00C853] font-mono">
                1.00 Lot = {contractSize.toLocaleString()} units
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Lot Size (Volume) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  value={lots}
                  onChange={(e) => setLots(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00C853]"
                  placeholder="1.00"
                />
                <span className="text-[10px] text-[#707070] mt-0.5 block">
                  {totalUnits.toLocaleString()} Base Units
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Opening Price ($) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00C853]"
                  placeholder="0.0000"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Closing Price ($) *
                </label>
                <input
                  type="number"
                  step="any"
                  disabled={status === 'open'}
                  value={status === 'open' ? 'Active' : exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs font-mono text-white disabled:opacity-40 focus:outline-none focus:border-[#00C853]"
                  placeholder="0.0000"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Stop Loss ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00C853]"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Take Profit ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00C853]"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Trade Timing */}
          <div className="p-4 rounded-xl bg-[#181818] border border-[#262626] space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#00C853]" />
                3. Trade Timing & Execution Timestamps
              </h4>
              <span className="text-[11px] text-[#8A8A8A]">Indian Standard Time (IST / UTC+5:30)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Opening Date
                </label>
                <input
                  type="date"
                  value={openDate}
                  onChange={(e) => setOpenDate(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C853]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Opening Time (HH:MM:SS)
                </label>
                <input
                  type="time"
                  step="1"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00C853]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Closing Date
                </label>
                <input
                  type="date"
                  disabled={status === 'open'}
                  value={closeDate}
                  onChange={(e) => setCloseDate(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-white disabled:opacity-40 focus:outline-none focus:border-[#00C853]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Closing Time (HH:MM:SS)
                </label>
                <input
                  type="time"
                  step="1"
                  disabled={status === 'open'}
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs text-white disabled:opacity-40 focus:outline-none focus:border-[#00C853]"
                />
              </div>
            </div>
          </div>

          {/* Fees & PnL */}
          <div className="p-4 rounded-xl bg-[#181818] border border-[#262626] space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-2">
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0] flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#00C853]" />
                  4. Fees, Realized P&L & Balance Impact
                </h4>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  manualPnLOverride
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30'
                }`}>
                  {manualPnLOverride ? 'Manual Override Active' : 'Auto Calculated'}
                </span>
              </div>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualPnLOverride}
                  onChange={(e) => setManualPnLOverride(e.target.checked)}
                  className="rounded bg-[#121212] border-[#2E2E2E] text-[#00C853] focus:ring-[#00C853]"
                />
                <span className="text-xs text-amber-300 font-semibold">
                  Enable Manual P&L Override
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Trading Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00C853]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Handling Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={handlingFee}
                  onChange={(e) => setHandlingFee(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00C853]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Swap Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={swapFee}
                  onChange={(e) => setSwapFee(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00C853]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Gross P&L ($ USDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  disabled={!manualPnLOverride && status !== 'open'}
                  value={grossPnL}
                  onChange={(e) => setGrossPnL(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs font-mono font-bold text-white disabled:opacity-60 focus:outline-none focus:border-[#00C853]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8A8A8A] mb-1">
                  Net P&L ($ USDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  disabled={!manualPnLOverride && status !== 'open'}
                  value={netPnL}
                  onChange={(e) => setNetPnL(e.target.value)}
                  className={`w-full bg-[#121212] border border-[#2E2E2E] rounded-lg px-3 py-2 text-xs font-mono font-bold disabled:opacity-60 focus:outline-none focus:border-[#00C853] ${
                    Number(netPnL) >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'
                  }`}
                />
              </div>
            </div>

            {/* Wallet Balance Impact Notice */}
            <div className={`p-3 rounded-lg flex items-center justify-between text-xs border ${
              finalWalletDelta > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : finalWalletDelta < 0
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-[#202020] border-[#333333] text-[#A0A0A0]'
            }`}>
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>
                  {status === 'closed'
                    ? finalWalletDelta >= 0
                      ? `Customer will be credited +$${finalWalletDelta.toFixed(2)} USDT in trading balance upon creation.`
                      : `Customer will be debited -$${Math.abs(finalWalletDelta).toFixed(2)} USDT in trading balance upon creation.`
                    : `Active open position will hold required margin on customer's account.`}
                </span>
              </div>
              <span className="font-mono font-black text-sm">
                {status === 'closed' ? (finalWalletDelta >= 0 ? `+$${finalWalletDelta.toFixed(2)}` : `-$${Math.abs(finalWalletDelta).toFixed(2)}`) : '0.00 (Open)'}
              </span>
            </div>
          </div>

          {/* Reason & Audit */}
          <div className="p-4 rounded-xl bg-[#181818] border border-[#262626] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0] flex items-center gap-1.5 border-b border-[#262626] pb-2">
              <Shield className="w-3.5 h-3.5 text-[#00C853]" />
              5. Administrative Reason & Audit Justification
            </h4>

            <div>
              <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                Mandatory Reason for Trade Creation *
              </label>
              <textarea
                id="create-trade-reason-input"
                rows={2}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Specify justification for manual trade injection (e.g. VIP offline desk order fulfillment, institutional OTC settlement, missed automated execution recovery)..."
                className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#00C853] placeholder-[#606060]"
              />
            </div>

            {confirmStep && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-2 animate-in fade-in">
                <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Confirm Manual Trade Record Creation</span>
                </div>
                <p className="text-xs text-[#CCCCCC]">
                  You are injecting a <strong>{status.toUpperCase()}</strong> trade of <strong>{lots} lots ({symbol})</strong> for customer <strong>{selectedUserObj?.name}</strong> with a Net P&L of <strong>${netPnL} USDT</strong>.
                  This action will immediately update the customer's wallet balance and record a permanent entry in the platform security audit logs.
                </p>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#202020] text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            <div className="flex items-center space-x-3">
              {confirmStep && (
                <button
                  type="button"
                  onClick={() => setConfirmStep(false)}
                  className="px-4 py-2 rounded-xl bg-[#262626] text-[#CCCCCC] hover:text-white text-xs font-semibold"
                >
                  Back to Edit
                </button>
              )}

              <button
                type="submit"
                id="submit-create-trade-button"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-lg bg-[#00C853] hover:bg-[#00B048] text-black shadow-[#00C853]/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Trade...</span>
                  </>
                ) : confirmStep ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Create Trade</span>
                  </>
                ) : (
                  <>
                    <span>Review & Inject Trade</span>
                    <ArrowRight className="w-4 h-4" />
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
