import React, { useRef, useState } from 'react';
import { Share2 as ShareIcon, ShieldCheck as ShieldIcon, Download as DownloadIcon, Check as CheckIcon, X as XIcon, TrendingUp as ArrowUpIcon, TrendingDown as ArrowDownIcon, Sparkles as SparklesIcon } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
import { Position, Transaction, SystemSettings } from '../types';
import { formatIST } from '../utils/dateUtils';
import { getTradeMarginUSD, formatMarginUSD, getTradeLots, formatLots, lotsToUnits } from '../utils/marginUtils';

interface TradeShareModalProps {
  position?: Position | null;
  transaction?: Transaction | null;
  isOpen?: boolean;
  onClose: () => void;
  systemSettings?: SystemSettings | null;
}

export const TradeShareModal: React.FC<TradeShareModalProps> = ({
  position,
  transaction,
  isOpen = true,
  onClose,
  systemSettings
}) => {
  const { user } = useAuth();
  const { markets } = useMarket();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!isOpen || (!position && !transaction)) return null;

  // Account holder dynamic name
  const accountName = user?.profile?.fullName || user?.name || user?.email?.split('@')[0] || 'Trader';

  // Determine if open position or completed transaction
  const isLiveOpen = Boolean(position);

  // Extract trade parameters cleanly
  const symbol = position ? position.symbol : (transaction?.symbol || transaction?.currency || 'BTC/USDT');
  const rawSide = position ? position.side : (transaction?.side || 'long');
  const side = (rawSide || 'long').toLowerCase();
  const isLong = side === 'long' || side === 'buy';
  const rawLeverage = position ? position.leverage : (transaction?.leverage !== undefined ? transaction.leverage : 1);
  const leverageDisplay = (!rawLeverage || rawLeverage <= 1) ? 'No Leverage' : `${rawLeverage}x Leverage`;

  // Entry Price
  const entryPrice = position ? position.entryPrice : (transaction?.entryPrice || 0);
  
  // Find current live market price for open position or use exit price for closed transaction
  const liveMarket = markets?.find(m => m.symbol === symbol);
  const currentOrExitPrice = isLiveOpen 
    ? (liveMarket?.price !== undefined ? liveMarket.price : (position?.markPrice || entryPrice))
    : (transaction?.exitPrice || transaction?.amount || 0);

  // Universal Margin in USD calculation (rounded to 0 decimal places)
  const calculatedMarginUSD = getTradeMarginUSD(position || transaction);
  const formattedMarginDisplay = formatMarginUSD(calculatedMarginUSD, true);
  const tradeLots = getTradeLots(position || transaction);
  const feeValue = (position as any)?.handlingFee ?? (transaction as any)?.handlingFee ?? (transaction as any)?.fee;

  // Position quantity in base units
  const posQuantity = position 
    ? (Number(position.size) || (position.lots ? lotsToUnits(position.lots, symbol) : 0))
    : (transaction ? (Number(transaction.quantity) || 0) : 0);

  // Authoritative, mathematically consistent PnL calculation
  let pnlAmount = 0;
  let pnlPercent = 0;

  if (isLiveOpen && position) {
    // Formula for LONG:  (Current/Mark Price - Opening Price) * Position Quantity
    // Formula for SHORT: (Opening Price - Current/Mark Price) * Position Quantity
    pnlAmount = isLong
      ? (currentOrExitPrice - entryPrice) * posQuantity
      : (entryPrice - currentOrExitPrice) * posQuantity;

    const marginForRoi = calculatedMarginUSD > 0
      ? calculatedMarginUSD
      : ((entryPrice > 0 && posQuantity > 0) ? (entryPrice * posQuantity) / (rawLeverage || 1) : 1);

    pnlPercent = marginForRoi > 0 ? (pnlAmount / marginForRoi) * 100 : 0;
  } else if (transaction) {
    pnlAmount = transaction.netPnL !== undefined ? transaction.netPnL : (transaction.pnl !== undefined ? transaction.pnl : 0);
    const initialMargin = calculatedMarginUSD > 0 
      ? calculatedMarginUSD 
      : ((entryPrice > 0 && transaction.quantity && transaction.quantity > 0)
        ? (entryPrice * transaction.quantity) / (rawLeverage || 1)
        : (transaction.amount || 1));
    pnlPercent = initialMargin > 0 ? (pnlAmount / initialMargin) * 100 : 0;
  }

  const isProfit = pnlAmount >= 0;

  // Opening time formatting
  const rawOpenedAt = position ? (position.createdAt || position.openedAt) : (transaction?.openedAt || transaction?.createdAt || new Date().toISOString());
  const formattedOpenedAt = formatIST(rawOpenedAt);

  // Closing time formatting for closed positions
  const rawClosedAt = !isLiveOpen ? (transaction?.createdAt || transaction?.openedAt) : null;
  const formattedClosedAt = rawClosedAt ? formatIST(rawClosedAt) : null;

  // Unique reference ID
  const rawId = position ? position.id : (transaction ? transaction.id : 'ETORO8923');
  const refCode = `ETORO-TRD-${rawId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase()}`;

  // Brand Logo URL & Brand Name
  const siteBrandName = systemSettings?.siteName || 'eToro Global';
  const logoUrl = systemSettings?.logoUrl || systemSettings?.customTradeLogoUrl;

  // Attached proof image url if present on transaction/position
  const attachedProofImage = (transaction as any)?.proofImage || (position as any)?.proofImage;

  // Blob render generator helper
  const generateBlob = async () => {
    if (!cardRef.current) return null;

    // Ensure all images inside cardRef are loaded before taking snapshot
    const imgs = cardRef.current.querySelectorAll('img');
    await Promise.all(
      Array.from(imgs).map((imgElement) => {
        const img = imgElement as HTMLImageElement;
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    try {
      return await toBlob(cardRef.current, {
        backgroundColor: '#07090E',
        pixelRatio: 2,
        style: {
          transform: 'none',
          boxShadow: 'none',
        },
      });
    } catch (e) {
      console.error('html-to-image error:', e);
      return null;
    }
  };

  // Download Image Handler
  const handleDownloadImage = async () => {
    try {
      setDownloading(true);
      const blob = await generateBlob();
      if (!blob) {
        alert('Failed to process image file.');
        return;
      }
      
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `etoro_trade_${symbol.replace(/[/]/g, '_')}_${Date.now()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Failed to generate trade card image:', err);
      alert('Failed to generate trade card image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Share Trade Image / Proof via Web Share API
  const handleShareCard = async () => {
    try {
      setSharing(true);
      const blob = await generateBlob();
      if (!blob) return;

      const file = new File([blob], `etoro_trade_${symbol.replace(/[/]/g, '_')}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `${siteBrandName} Trade Proof`,
            text: `${siteBrandName} Verified Trade Result for ${symbol}`
          });
        } catch (e) {
          // User cancelled share
        }
      } else {
        // Fallback to downloading image directly
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `etoro_trade_${symbol.replace(/[/]/g, '_')}_${Date.now()}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) {
      console.error('Share trade failed:', err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="bg-[#12161F] border border-[#262D3D] rounded-2xl sm:rounded-3xl p-3 sm:p-6 max-w-md w-full space-y-4 sm:space-y-5 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#222A3A] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00C853]/15 border border-[#00C853]/30 flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-[#00C853]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
                {isLiveOpen ? 'Live Open Trade Card' : 'Trade Proof Card'}
              </h3>
              <p className="text-[10px] text-[#8A98AD]">
                Official {siteBrandName} Verified Trade Result
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1A2130] hover:bg-[#252E42] text-[#8A98AD] hover:text-white flex items-center justify-center transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* TRADE CARD CANVAS TO EXPORT */}
        <div className="p-1 bg-[#080A0E] rounded-xl sm:rounded-2xl border border-[#1E2638] overflow-hidden">
          <div
            ref={cardRef}
            className="bg-gradient-to-b from-[#0F141F] via-[#0B0E16] to-[#07090E] p-4 sm:p-7 rounded-xl border border-[#1F293D] shadow-2xl text-white relative font-sans overflow-hidden select-none"
          >
            {/* Background Ambient Glow */}
            <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${isProfit ? 'bg-[#00C853]' : 'bg-[#FF3B30]'}`} />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00C853] rounded-full blur-3xl opacity-10 pointer-events-none" />

            {/* Top Branding Bar */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10 relative z-10 gap-2">
              <div className="flex items-center space-x-2.5 min-w-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={siteBrandName}
                    className="h-7 sm:h-8 max-w-[120px] object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#00C853] flex items-center justify-center text-black font-black text-sm tracking-tighter shadow-md shrink-0">
                    E
                  </div>
                )}
                <div className="truncate">
                  <span className="font-extrabold text-xs sm:text-base tracking-wider text-white block uppercase font-mono leading-none truncate">
                    {siteBrandName}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-[#00C853] font-bold tracking-widest uppercase flex items-center space-x-1 mt-0.5 truncate">
                    <ShieldIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-0.5 shrink-0" /> VERIFIED TRADE
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider inline-block ${
                  isLiveOpen
                    ? 'bg-[#00C853]/20 text-[#00C853] border border-[#00C853]/40'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                }`}>
                  {isLiveOpen ? '● LIVE POSITION' : '✓ CLOSED POSITION'}
                </span>
              </div>
            </div>

            {/* Account Holder Name */}
            <div className="pt-3 pb-2 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                <div className="min-w-0 pr-2">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-[#8A98AD] block mb-0.5">
                    ACCOUNT HOLDER
                  </span>
                  <span className="text-xs sm:text-base font-black text-white tracking-wide truncate block">
                    {accountName}
                  </span>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[9px] sm:text-[10px] text-[#8A98AD] uppercase font-bold block">
                    {isLiveOpen ? 'Position Status' : 'Closed Result'}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Asset & Direction Box */}
            <div className="my-2 sm:my-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#141A29]/90 border border-white/10 relative z-10 flex items-center justify-between shadow-inner gap-3">
              <div className="flex items-center space-x-2.5 sm:space-x-3 flex-1 min-w-0">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shadow-lg shrink-0 ${
                  side === 'long' || side === 'buy'
                    ? 'bg-[#00C853] text-black shadow-[#00C853]/20'
                    : 'bg-[#FF3B30] text-white shadow-[#FF3B30]/20'
                }`}>
                  {side === 'long' || side === 'buy' ? <ArrowUpIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" /> : <ArrowDownIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm sm:text-xl text-white tracking-tight truncate">
                    {symbol}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold uppercase shrink-0 ${
                      side === 'long' || side === 'buy' ? 'bg-[#00C853]/20 text-[#00C853]' : 'bg-[#FF3B30]/20 text-[#FF3B30]'
                    }`}>
                      {side.toUpperCase()}
                    </span>
                    <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold text-white font-mono uppercase shrink-0">
                      {leverageDisplay}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profit / Loss Hero Badge */}
              <div className="text-right shrink-0 max-w-[50%]">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[#8A98AD] block font-bold">
                  {isLiveOpen ? 'UNREALIZED PnL' : 'REALIZED PnL'}
                </span>
                <div className={`font-black text-base sm:text-2xl font-mono tracking-tight ${
                  isProfit ? 'text-[#00C853] drop-shadow-[0_0_12px_rgba(0,200,83,0.3)]' : 'text-[#FF3B30] drop-shadow-[0_0_12px_rgba(255,59,48,0.3)]'
                }`}>
                  {isProfit ? '+' : ''}${Math.abs(pnlAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`text-[10px] sm:text-xs font-bold font-mono ${isProfit ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                  {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Attached Proof Document Image if available */}
            {attachedProofImage && (
              <div className="my-2 p-2.5 rounded-xl bg-[#0D121D] border border-white/10 relative z-10 text-center">
                <span className="text-[9px] uppercase tracking-wider text-[#8A98AD] block font-bold mb-1.5">
                  ATTACHED PROOF / DOCUMENT
                </span>
                <img
                  src={attachedProofImage}
                  alt="Trade Proof"
                  className="max-h-48 max-w-full rounded-lg object-contain mx-auto border border-white/10 shadow-md"
                  crossOrigin="anonymous"
                />
              </div>
            )}

            {/* Trade Details Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#0D121D] border border-white/5 font-mono text-xs relative z-10 my-2 sm:my-3">
              <div>
                <span className="text-[9px] sm:text-[10px] text-[#8A98AD] block font-semibold uppercase">Opening Price</span>
                <span className="font-extrabold text-white text-xs sm:text-sm">
                  ${entryPrice ? entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                </span>
              </div>

              <div>
                <span className="text-[9px] sm:text-[10px] text-[#8A98AD] block font-semibold uppercase">
                  {isLiveOpen ? 'Current Price' : 'Closing Price'}
                </span>
                <span className="font-extrabold text-white text-xs sm:text-sm">
                  ${currentOrExitPrice ? currentOrExitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                </span>
              </div>

              <div>
                <span className="text-[9px] sm:text-[10px] text-[#8A98AD] block font-semibold uppercase">Position Size</span>
                <span className="font-extrabold text-white text-xs sm:text-sm">
                  {formatLots(tradeLots)}
                </span>
              </div>

              <div>
                <span className="text-[9px] sm:text-[10px] text-[#8A98AD] block font-semibold uppercase">Leverage</span>
                <span className="font-extrabold text-amber-400 text-xs sm:text-sm">
                  {leverageDisplay}
                </span>
              </div>

              <div>
                <span className="text-[9px] sm:text-[10px] text-[#8A98AD] block font-semibold uppercase">MARGIN</span>
                <span className="font-extrabold text-white text-xs sm:text-sm">
                  {formattedMarginDisplay}
                </span>
              </div>

              {feeValue !== undefined && feeValue !== null ? (
                <div>
                  <span className="text-[9px] sm:text-[10px] text-[#8A98AD] block font-semibold uppercase">Handling Fee</span>
                  <span className="font-extrabold text-[#E0E0E0] text-xs sm:text-sm">
                    ${Number(feeValue).toFixed(2)} USDT
                  </span>
                </div>
              ) : (
                <div />
              )}

              <div className="col-span-2 pt-1.5 border-t border-white/5">
                <span className="text-[9px] sm:text-[10px] text-[#8A98AD] block font-semibold uppercase">
                  Opening Time
                </span>
                <span className="font-extrabold text-white text-[10px] sm:text-xs">
                  {formattedOpenedAt}
                </span>
              </div>
            </div>

            {/* Card Footer with Ref Code & Stamp */}
            <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-[#8A98AD] relative z-10">
              <div className="flex items-center space-x-1">
                <ShieldIcon className="w-3 h-3 text-[#00C853]" />
                <span className="font-bold tracking-wider text-white truncate max-w-[150px] sm:max-w-none">
                  #{refCode}
                </span>
              </div>

              <div className="text-right font-semibold text-white/60">
                Official {siteBrandName} Card
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="w-full h-11 bg-gradient-to-r from-[#00C853] via-[#00E676] to-[#007A33] hover:from-[#00E676] hover:to-[#00C853] text-black font-extrabold rounded-2xl text-xs tracking-wider transition-all shadow-lg shadow-[#00C853]/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <DownloadIcon className="w-4 h-4 stroke-[2.5]" />
            <span>{downloading ? 'Generating Image...' : 'Download Trade Image'}</span>
          </button>

          <button
            onClick={handleShareCard}
            disabled={sharing}
            className="w-full h-11 bg-[#1E2638] hover:bg-[#2A354E] text-white font-extrabold rounded-2xl text-xs tracking-wider transition-all border border-[#33405C] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <ShareIcon className="w-4 h-4 text-[#00C853]" />
            <span>{sharing ? 'Preparing Share...' : 'Share Trade Card'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
