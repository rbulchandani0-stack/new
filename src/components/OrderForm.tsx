import React, { useState, useEffect } from 'react';
import { ShoppingCart, ShieldAlert, Zap, Sliders, ArrowUpRight, ArrowDownLeft, Info, Wallet as WalletIcon, DollarSign, Percent } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
import { apiService } from '../services/api';
import { 
  calculateMarginUSD, 
  calculateNotionalUSD, 
  calculateTradingFee, 
  calculateDerivedQuantityFromMargin,
  unitsToLots,
  formatLots,
  DEFAULT_MAKER_FEE_RATE,
  DEFAULT_TAKER_FEE_RATE
} from '../utils/marginUtils';

interface OrderFormProps {
  initialPrice?: number;
}

export const OrderForm: React.FC<OrderFormProps> = ({ initialPrice }) => {
  const { user, wallet, updateWalletState, isAuthenticated } = useAuth();
  const { activePair } = useMarket();

  const isKycApproved = user?.kycStatus === 'verified' || user?.kycStatus === 'manually_verified' || (user as any)?.kycStatus === 'approved';

  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');
  
  // USD-Based Margin State
  const [marginInput, setMarginInput] = useState<string>('50');
  const [leverage, setLeverage] = useState<number>(10);
  const [sliderPct, setSliderPct] = useState<number | null>(null);
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [userHasEditedLimitPrice, setUserHasEditedLimitPrice] = useState<boolean>(false);
  const [userHasEditedStopPrice, setUserHasEditedStopPrice] = useState<boolean>(false);

  useEffect(() => {
    if (initialPrice && !userHasEditedLimitPrice) {
      setLimitPrice(initialPrice.toString());
      if (orderType === 'market') setOrderType('limit');
    }
  }, [initialPrice]);

  // Handle Order Type Switching without overwriting user-entered prices
  const handleOrderTypeChange = (newType: 'market' | 'limit' | 'stop') => {
    setOrderType(newType);
    if (newType === 'limit' && (!limitPrice || !userHasEditedLimitPrice)) {
      setLimitPrice(activePair.price.toString());
    }
    if (newType === 'stop' && (!stopPrice || !userHasEditedStopPrice)) {
      setStopPrice(activePair.price.toString());
    }
  };

  const maxLev = activePair.maxLeverage || 50;

  // Determine current effective price based on order type
  const effectivePrice = orderType === 'market' 
    ? activePair.price 
    : orderType === 'limit' 
      ? (parseFloat(limitPrice) || activePair.price)
      : (parseFloat(stopPrice) || activePair.price);

  // Financial Calculations based on USD Margin Input
  const userEnteredMargin = parseFloat(marginInput) || 0;
  const levMultiplier = leverage <= 0 ? 1 : leverage;
  const positionValueUSD = userEnteredMargin * levMultiplier;
  
  // Derived Quantity in Base Units & Lots
  const derivedQuantity = calculateDerivedQuantityFromMargin(
    userEnteredMargin,
    levMultiplier,
    effectivePrice,
    activePair.symbol,
    activePair.category
  );
  const derivedLots = unitsToLots(derivedQuantity, activePair.symbol, activePair.category);

  const availBalance = wallet?.availableMargin || 0;

  // Binance-style maker (0.02%) vs taker (0.05%) fee calculation
  const isMaker = orderType === 'limit';
  const feeRate = isMaker ? DEFAULT_MAKER_FEE_RATE : DEFAULT_TAKER_FEE_RATE;
  const feeRatePercent = (feeRate * 100).toFixed(2);
  const estimatedFee = calculateTradingFee(positionValueUSD, isMaker, feeRate);

  const freeMarginAfterOrder = Math.max(0, availBalance - userEnteredMargin - estimatedFee);

  // Liquidation Calculations
  const calcLiquidationPrice = () => {
    if (leverage <= 1) return 0;
    const maintenanceMargin = 0.005; // 0.5%
    if (side === 'buy') {
      return effectivePrice * (1 - (1 / leverage) + maintenanceMargin);
    } else {
      return effectivePrice * (1 + (1 / leverage) - maintenanceMargin);
    }
  };

  const estLiquidationPrice = calcLiquidationPrice();
  const distToLiq = estLiquidationPrice > 0 ? Math.abs(effectivePrice - estLiquidationPrice) : 0;
  const distToLiqPct = estLiquidationPrice > 0 ? (distToLiq / effectivePrice) * 100 : 0;

  // TP/SL PnL and Risk-Reward Preview
  const tpPrice = parseFloat(takeProfit);
  const slPrice = parseFloat(stopLoss);

  let estProfit = 0;
  let estLoss = 0;

  if (tpPrice && derivedQuantity > 0) {
    estProfit = side === 'buy' ? (tpPrice - effectivePrice) * derivedQuantity : (effectivePrice - tpPrice) * derivedQuantity;
  }
  if (slPrice && derivedQuantity > 0) {
    estLoss = side === 'buy' ? (effectivePrice - slPrice) * derivedQuantity : (slPrice - effectivePrice) * derivedQuantity;
  }

  const profitRoiPct = userEnteredMargin > 0 && estProfit > 0 ? (estProfit / userEnteredMargin) * 100 : 0;
  const lossRoiPct = userEnteredMargin > 0 && estLoss > 0 ? (estLoss / userEnteredMargin) * 100 : 0;
  const riskRewardRatio = estLoss > 0 && estProfit > 0 ? (estProfit / estLoss).toFixed(2) : 'N/A';

  // Percentage shortcut buttons (25%, 50%, 75%, 100%)
  const handlePercentageClick = (pct: number) => {
    setSliderPct(pct);
    const balance = availBalance > 0 ? availBalance : 1000;
    const calculatedMargin = balance * (pct / 100);
    // Allow small buffer for fee if 100%
    const finalMargin = pct === 100 ? Math.max(1, calculatedMargin * 0.99) : calculatedMargin;
    setMarginInput(finalMargin > 0 ? finalMargin.toFixed(2) : '10');
  };

  const handleMarginChange = (val: string) => {
    setMarginInput(val);
    setSliderPct(null);
  };

  // Inline Validation checks
  const validateOrder = (): string | null => {
    if (!isAuthenticated) return 'Please sign in to execute trading orders';
    if (!isKycApproved) return `KYC Verification Required: Your status is '${user?.kycStatus || 'unverified'}'. Please verify identity.`;
    if (userEnteredMargin <= 0) return 'Please enter a valid USD Margin amount';
    if (derivedQuantity <= 0) return 'Order quantity is too small for execution';
    if (effectivePrice <= 0) return 'Invalid order price';
    if (wallet && userEnteredMargin > wallet.availableMargin) {
      return `Insufficient Margin: Entered $${userEnteredMargin.toFixed(2)} USD exceeds Available $${wallet.availableMargin.toFixed(2)} USDT`;
    }
    if (leverage > maxLev) return `Leverage ${leverage}x exceeds maximum allowed limit (${maxLev}x) for ${activePair.symbol}`;
    
    // SL / TP validation rules
    if (tpPrice > 0) {
      if (side === 'buy' && tpPrice <= effectivePrice) {
        return `Take Profit for LONG must be above entry price ($${effectivePrice.toLocaleString()})`;
      }
      if (side === 'sell' && tpPrice >= effectivePrice) {
        return `Take Profit for SHORT must be below entry price ($${effectivePrice.toLocaleString()})`;
      }
    }
    if (slPrice > 0) {
      if (side === 'buy' && slPrice >= effectivePrice) {
        return `Stop Loss for LONG must be below entry price ($${effectivePrice.toLocaleString()})`;
      }
      if (side === 'sell' && slPrice <= effectivePrice) {
        return `Stop Loss for SHORT must be above entry price ($${effectivePrice.toLocaleString()})`;
      }
    }
    return null;
  };

  const handleSubmitOrder = async (e?: React.FormEvent, selectedSide?: 'buy' | 'sell') => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    const targetSide = selectedSide || side;

    const validationError = validateOrder();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await apiService.placeOrder({
        symbol: activePair.symbol,
        side: targetSide,
        type: orderType,
        price: orderType === 'market' ? activePair.price : (orderType === 'limit' ? parseFloat(limitPrice) : parseFloat(stopPrice)),
        amount: derivedQuantity,
        lots: derivedLots,
        margin: userEnteredMargin,
        leverage,
        takeProfit: tpPrice || undefined,
        stopLoss: slPrice || undefined
      });

      updateWalletState(res.wallet);
      setSuccess(`Position opened: ${targetSide === 'buy' ? 'LONG' : 'SHORT'} $${userEnteredMargin.toFixed(2)} Margin ($${positionValueUSD.toFixed(2)} Pos Value @ ${leverage}x)`);
      setTimeout(() => setSuccess(''), 4500);
    } catch (err: any) {
      setError(err.message || 'Order execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#121212] border border-[#222222] rounded-xl p-3 flex flex-col justify-between h-full text-xs space-y-2.5">
      <div>
        {/* Available Balance Header */}
        <div className="bg-[#181818] border border-[#242424] rounded-lg px-2.5 py-1.5 mb-2.5 flex items-center justify-between font-mono">
          <div className="flex items-center space-x-1.5 text-[#8A8A8A]">
            <WalletIcon className="w-3.5 h-3.5 text-[#00C853]" />
            <span className="text-[10px] font-bold uppercase font-sans tracking-wide">Available Balance</span>
          </div>
          <span className="font-mono font-extrabold text-white text-xs">
            ${wallet ? wallet.availableMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} <span className="text-[#00C853] text-[10px]">USDT</span>
          </span>
        </div>

        {/* KYC Verification Required Alert (If not approved) */}
        {!isKycApproved && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 mb-2.5 flex items-start space-x-1.5 text-amber-400">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div className="text-[10px] leading-tight">
              <span className="font-extrabold block uppercase">KYC Verification Required</span>
              <span className="text-amber-200/80 text-[10px]">
                Status: <span className="font-bold uppercase text-amber-400">{user?.kycStatus || 'unverified'}</span>. Verify to trade live.
              </span>
            </div>
          </div>
        )}

        {/* Order Types */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222]">
          <div className="flex bg-[#181818] p-0.5 rounded-lg border border-[#262626] space-x-0.5">
            {(['market', 'limit', 'stop'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleOrderTypeChange(t)}
                className={`px-2 py-1 rounded-md uppercase text-[10px] font-bold tracking-wider transition-colors ${
                  orderType === t
                    ? 'bg-[#262626] text-[#00C853]'
                    : 'text-[#8A8A8A] hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="text-[10px] font-mono font-bold flex items-center space-x-1">
            <span className="text-[#8A8A8A]">{isMaker ? 'Maker:' : 'Taker:'}</span>
            <span className="text-[#00C853]">{feeRatePercent}%</span>
          </div>
        </div>

        {/* Leverage Slider */}
        <div className="mb-2.5 bg-[#181818] border border-[#242424] rounded-lg p-2 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-[#8A8A8A]">
            <span>LEVERAGE</span>
            <span className="text-white font-mono">{leverage <= 1 ? '1x (Spot / 1x)' : `${leverage}x (Max ${maxLev}x)`}</span>
          </div>
          <input
            type="range"
            min="1"
            max={maxLev}
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value))}
            className="w-full accent-[#00C853] h-1 bg-[#262626] rounded cursor-pointer"
          />
          <div className="flex justify-between gap-1">
            {[1, 2, 5, 10, 20, 50, 100].filter(l => l <= maxLev).map(levVal => (
              <button
                key={levVal}
                type="button"
                onClick={() => setLeverage(levVal)}
                className={`flex-1 py-0.5 text-[9px] font-mono font-bold rounded border transition-all ${
                  leverage === levVal
                    ? 'bg-[#00C853] text-black border-[#00C853]'
                    : 'bg-[#121212] text-[#8A8A8A] border-[#262626] hover:text-white'
                }`}
              >
                {levVal === 1 ? '1x' : `${levVal}x`}
              </button>
            ))}
          </div>
        </div>

        {/* Error / Success Messages */}
        {error && (
          <div className="mb-2 p-2 rounded-lg bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[#FF3B30] text-[10px] font-medium leading-tight">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-2 p-2 rounded-lg bg-[#00C853]/10 border border-[#00C853]/30 text-[#00C853] text-[10px] font-semibold leading-tight">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="space-y-2">
          {/* Price Input for Limit / Stop */}
          {orderType === 'limit' && (
            <div>
              <div className="flex justify-between text-[10px] font-bold text-[#8A8A8A] mb-1">
                <span>LIMIT PRICE (USDT)</span>
              </div>
              <input
                type="number"
                step="0.0001"
                required
                value={limitPrice}
                onChange={(e) => {
                  setLimitPrice(e.target.value);
                  setUserHasEditedLimitPrice(true);
                }}
                className="w-full h-9 bg-[#181818] border border-[#2A2A2A] focus:border-[#00C853] rounded-lg px-2.5 font-mono text-white text-xs outline-none transition-colors"
              />
            </div>
          )}

          {orderType === 'stop' && (
            <div>
              <div className="flex justify-between text-[10px] font-bold text-[#8A8A8A] mb-1">
                <span>STOP TRIGGER PRICE (USDT)</span>
              </div>
              <input
                type="number"
                step="0.0001"
                required
                value={stopPrice}
                onChange={(e) => {
                  setStopPrice(e.target.value);
                  setUserHasEditedStopPrice(true);
                }}
                className="w-full h-9 bg-[#181818] border border-[#2A2A2A] focus:border-[#00C853] rounded-lg px-2.5 font-mono text-white text-xs outline-none transition-colors"
              />
            </div>
          )}

          {/* USD-BASED MARGIN INPUT */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-[#8A8A8A] mb-1">
              <span>MARGIN TO USE (USD)</span>
              <span className="font-mono text-white text-[10px]">
                Pos Val: ${positionValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-[#8A8A8A] font-mono text-xs">$</span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="Enter USD Margin..."
                value={marginInput}
                onChange={(e) => handleMarginChange(e.target.value)}
                className="w-full h-9 bg-[#181818] border border-[#2A2A2A] focus:border-[#00C853] rounded-lg pl-6 pr-14 font-mono text-white text-xs outline-none transition-colors"
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-[#00C853] font-mono font-bold">USD</span>
            </div>
          </div>

          {/* PERCENTAGE SHORTCUT BUTTONS (25%, 50%, 75%, 100%) */}
          <div className="grid grid-cols-4 gap-1">
            {[25, 50, 75, 100].map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentageClick(pct)}
                className={`h-7 rounded-md text-[10px] font-mono border transition-colors flex items-center justify-center ${
                  sliderPct === pct
                    ? 'bg-[#00C853]/20 border-[#00C853] text-[#00C853] font-bold'
                    : 'bg-[#181818] border-[#262626] text-[#8A8A8A] hover:text-white'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* TP / SL Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-[#00C853] block mb-1 uppercase">TAKE PROFIT</label>
              <input
                type="number"
                step="0.0001"
                placeholder="Target Price"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="w-full h-8 bg-[#181818] border border-[#2A2A2A] focus:border-[#00C853] rounded-lg px-2 font-mono text-[11px] text-white outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#FF3B30] block mb-1 uppercase">STOP LOSS</label>
              <input
                type="number"
                step="0.0001"
                placeholder="Stop Price"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full h-8 bg-[#181818] border border-[#2A2A2A] focus:border-[#FF3B30] rounded-lg px-2 font-mono text-[11px] text-white outline-none transition-colors"
              />
            </div>
          </div>

          {/* Sizing & Financial Summary Breakdown */}
          <div className="bg-[#181818] border border-[#242424] rounded-lg p-2.5 space-y-1 text-[11px] font-mono">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <div className="flex justify-between text-[#8A8A8A]">
                <span>Req. Margin:</span>
                <span className="text-white font-bold">${userEnteredMargin.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#8A8A8A]">
                <span>Pos. Value:</span>
                <span className="text-white font-bold">${positionValueUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#8A8A8A]">
                <span>Est. Size:</span>
                <span className="text-white font-bold truncate">
                  {derivedQuantity < 0.0001 ? derivedQuantity.toFixed(6) : (derivedQuantity < 1 ? derivedQuantity.toFixed(4) : derivedQuantity.toFixed(2))} {activePair.baseCoin}
                </span>
              </div>
              <div className="flex justify-between text-[#8A8A8A]">
                <span>Lots:</span>
                <span className="text-white font-bold">{derivedLots} Lots</span>
              </div>
              <div className="flex justify-between text-[#8A8A8A]">
                <span>Fee ({isMaker ? 'Maker' : 'Taker'}):</span>
                <span className="text-amber-400 font-bold">${estimatedFee.toFixed(2)} <span className="text-[9px] text-[#8A8A8A]">({feeRatePercent}%)</span></span>
              </div>
              <div className="flex justify-between text-[#8A8A8A]">
                <span>Free Margin:</span>
                <span className="text-white font-bold">${freeMarginAfterOrder.toFixed(2)}</span>
              </div>
            </div>

            {leverage > 1 && estLiquidationPrice > 0 && (
              <div className="border-t border-[#262626] pt-1 mt-1 grid grid-cols-2 gap-x-2">
                <div className="flex justify-between text-[#8A8A8A]">
                  <span>Est. Liq Price:</span>
                  <span className="text-[#FF3B30] font-bold">${estLiquidationPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#8A8A8A]">
                  <span>Dist to Liq:</span>
                  <span className="text-amber-400 font-bold">${distToLiq.toFixed(2)} ({distToLiqPct.toFixed(1)}%)</span>
                </div>
              </div>
            )}

            {(estProfit > 0 || estLoss > 0) && (
              <div className="border-t border-[#262626] pt-1 mt-1 space-y-0.5">
                {estProfit > 0 && (
                  <div className="flex justify-between text-[#00C853]">
                    <span>Est Profit:</span>
                    <span className="font-bold">+${estProfit.toFixed(2)} (+{profitRoiPct.toFixed(1)}%)</span>
                  </div>
                )}
                {estLoss > 0 && (
                  <div className="flex justify-between text-[#FF3B30]">
                    <span>Est Loss:</span>
                    <span className="font-bold">-${estLoss.toFixed(2)} (-{lossRoiPct.toFixed(1)}%)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={(e) => {
                setSide('buy');
                handleSubmitOrder(e, 'buy');
              }}
              className="h-10 px-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider flex items-center justify-center space-x-1 bg-[#00C853] hover:bg-[#00B048] active:scale-95 text-black font-sans cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{loading && side === 'buy' ? 'Submitting...' : `Buy / Long`}</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={(e) => {
                setSide('sell');
                handleSubmitOrder(e, 'sell');
              }}
              className="h-10 px-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider flex items-center justify-center space-x-1 bg-[#FF3B30] hover:bg-[#D32F2F] active:scale-95 text-white font-sans cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{loading && side === 'sell' ? 'Submitting...' : `Sell / Short`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

