import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  History,
  Shield,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Calculator
} from 'lucide-react';
import { AdminTradeItem } from '../../types';
import { apiService } from '../../services/api';
import { formatLots } from '../../utils/marginUtils';

interface CorrectTradeModalProps {
  trade: AdminTradeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedTrade: any, pnlDiff: number) => void;
}

export const CorrectTradeModal: React.FC<CorrectTradeModalProps> = ({
  trade,
  isOpen,
  onClose,
  onSuccess
}) => {
  if (!isOpen || !trade) return null;

  // Form State
  const [entryPrice, setEntryPrice] = useState<string>(String(trade.entryPrice || ''));
  const [exitPrice, setExitPrice] = useState<string>(String(trade.exitPrice || ''));
  const [lots, setLots] = useState<string>(String(trade.lots || '0.1'));
  const [status, setStatus] = useState<string>(trade.status === 'open' ? 'open' : (trade.status === 'cancelled' ? 'cancelled' : 'completed'));
  const [stopLoss, setStopLoss] = useState<string>(trade.stopLoss ? String(trade.stopLoss) : '');
  const [takeProfit, setTakeProfit] = useState<string>(trade.takeProfit ? String(trade.takeProfit) : '');
  const [fee, setFee] = useState<string>(String(trade.fee || '0'));
  const [handlingFee, setHandlingFee] = useState<string>(String(trade.handlingFee || '0'));
  const [swapFee, setSwapFee] = useState<string>(String(trade.swapFee || '0'));
  
  const [manualPnLOverride, setManualPnLOverride] = useState<boolean>(false);
  const [grossPnL, setGrossPnL] = useState<string>(String(trade.grossPnL || '0'));
  const [netPnL, setNetPnL] = useState<string>(String(trade.netPnL || '0'));

  const [openedAt, setOpenedAt] = useState<string>(trade.openedAt || '');
  const [createdAt, setCreatedAt] = useState<string>(trade.closedAt || trade.createdAt || '');
  const [reason, setReason] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState<boolean>(false);

  // Recalculate estimated PnL when prices/lots change (if not in manual override mode)
  useEffect(() => {
    if (!manualPnLOverride) {
      const ePrice = Number(entryPrice);
      const xPrice = Number(exitPrice);
      const l = Number(lots);
      const contractSize = trade.contractSize || 1;
      const totalUnits = l * contractSize;
      const totalFee = Number(fee) || 0;

      if (!isNaN(ePrice) && !isNaN(xPrice) && !isNaN(totalUnits) && ePrice > 0 && xPrice > 0 && totalUnits > 0) {
        const isLong = trade.side.toLowerCase() === 'long' || trade.side.toLowerCase() === 'buy';
        const calcGross = isLong 
          ? (xPrice - ePrice) * totalUnits 
          : (ePrice - xPrice) * totalUnits;
        const calcNet = calcGross - totalFee;

        setGrossPnL(calcGross.toFixed(2));
        setNetPnL(calcNet.toFixed(2));
      }
    }
  }, [entryPrice, exitPrice, lots, fee, manualPnLOverride, trade.side, trade.contractSize]);

  // Financial Impact Calculations
  const originalNetPnL = Number(trade.netPnL || 0);
  const currentNetPnL = Number(netPnL || 0);
  const balanceDelta = Number((currentNetPnL - originalNetPnL).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setError('A comprehensive Reason for Correction is mandatory for institutional compliance.');
      return;
    }

    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        entryPrice: Number(entryPrice),
        exitPrice: Number(exitPrice),
        lots: Number(lots),
        status: status === 'closed' ? 'completed' : status,
        stopLoss: stopLoss ? Number(stopLoss) : undefined,
        takeProfit: takeProfit ? Number(takeProfit) : undefined,
        fee: Number(fee),
        handlingFee: Number(handlingFee),
        swapFee: Number(swapFee),
        pnl: Number(grossPnL),
        netPnL: Number(netPnL),
        openedAt: openedAt || undefined,
        createdAt: createdAt || undefined,
        reason: reason.trim()
      };

      const res = await apiService.correctTrade(trade.id, payload);
      onSuccess(res.trade, res.pnlDiff);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit trade correction');
      setConfirmStep(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 bg-[#141414] border border-[#2B2B2B] rounded-2xl shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#1A1A1A]/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Correct Trade Record
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ADMIN CORRECTION
                </span>
              </div>
              <p className="text-xs text-[#8A8A8A] mt-0.5">
                Trade #{trade.id} &bull; {trade.symbol} &bull; User: {trade.userName} ({trade.userId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8A8A8A] hover:text-white rounded-lg hover:bg-[#262626] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
            
            {/* Warning Callout */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Controlled Administrative Adjustment</span>
                This action modifies the settled historical ledger record. All adjustments generate an immutable forensic audit log with your admin identity. Any Net P&L difference will be automatically credited/debited to the customer's Trading Wallet.
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-medium">
                {error}
              </div>
            )}

            {/* Core Trade Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase text-[#8A8A8A] block mb-1.5">
                  Lot Size (Lots)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  required
                  value={lots}
                  onChange={(e) => setLots(e.target.value)}
                  className="w-full bg-[#1F1F1F] border border-[#333333] focus:border-[#00C853] rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none"
                />
                <span className="text-[10px] text-[#666666] mt-1 block">
                  Contract: {trade.contractSize || 1} units/lot
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-[#8A8A8A] block mb-1.5">
                  Open Price ($)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  required
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full bg-[#1F1F1F] border border-[#333333] focus:border-[#00C853] rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-[#8A8A8A] block mb-1.5">
                  Close Price ($)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  required
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="w-full bg-[#1F1F1F] border border-[#333333] focus:border-[#00C853] rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none"
                />
              </div>
            </div>

            {/* SL / TP & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase text-[#8A8A8A] block mb-1.5">
                  Stop Loss ($)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Optional"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full bg-[#1F1F1F] border border-[#333333] focus:border-[#00C853] rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-[#8A8A8A] block mb-1.5">
                  Take Profit ($)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Optional"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full bg-[#1F1F1F] border border-[#333333] focus:border-[#00C853] rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-[#8A8A8A] block mb-1.5">
                  Trade Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-[#1F1F1F] border border-[#333333] focus:border-[#00C853] rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none capitalize"
                >
                  <option value="completed">Completed / Settled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Fee Specifications */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase text-[#8A8A8A] block mb-1.5">
                  Total Trading Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className="w-full bg-[#1F1F1F] border border-[#333333] focus:border-[#00C853] rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-[#8A8A8A] block mb-1.5">
                  Handling Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={handlingFee}
                  onChange={(e) => setHandlingFee(e.target.value)}
                  className="w-full bg-[#1F1F1F] border border-[#333333] focus:border-[#00C853] rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-[#8A8A8A] block mb-1.5">
                  Swap / Overnight Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={swapFee}
                  onChange={(e) => setSwapFee(e.target.value)}
                  className="w-full bg-[#1F1F1F] border border-[#333333] focus:border-[#00C853] rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none"
                />
              </div>
            </div>

            {/* Realized PnL Calculation & Override */}
            <div className="bg-[#1A1A1A] border border-[#2B2B2B] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Calculator className="w-3.5 h-3.5 text-[#00C853]" />
                  <span>Realized P&L Results</span>
                </span>
                <button
                  type="button"
                  onClick={() => setManualPnLOverride(!manualPnLOverride)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                    manualPnLOverride 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-[#262626] text-[#8A8A8A] hover:text-white'
                  }`}
                >
                  {manualPnLOverride ? 'Manual P&L Override ON' : 'Enable Manual P&L Override'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase text-[#8A8A8A] block mb-1.5">
                    Gross P&L ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!manualPnLOverride}
                    value={grossPnL}
                    onChange={(e) => setGrossPnL(e.target.value)}
                    className="w-full bg-[#1F1F1F] border border-[#333333] disabled:opacity-60 focus:border-[#00C853] rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-[#8A8A8A] block mb-1.5">
                    Net P&L ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!manualPnLOverride}
                    value={netPnL}
                    onChange={(e) => setNetPnL(e.target.value)}
                    className="w-full bg-[#1F1F1F] border border-[#333333] disabled:opacity-60 focus:border-[#00C853] rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Financial Reconciliation Impact Preview */}
            <div className="bg-[#181818] border border-[#2E2E2E] rounded-xl p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A8A8A] block mb-3">
                Financial Balance Reconciliation Preview
              </span>
              <div className="flex items-center justify-between text-xs py-1 border-b border-[#262626]">
                <span className="text-[#8A8A8A]">Original Net P&L:</span>
                <span className="font-semibold text-white">
                  ${originalNetPnL.toFixed(2)} USDT
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b border-[#262626]">
                <span className="text-[#8A8A8A]">Corrected Net P&L:</span>
                <span className={`font-semibold ${currentNetPnL >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                  ${currentNetPnL.toFixed(2)} USDT
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2">
                <span className="font-bold text-white">Wallet Balance Adjustment:</span>
                <span className={`text-sm font-black ${
                  balanceDelta > 0 
                    ? 'text-[#00C853]' 
                    : balanceDelta < 0 
                    ? 'text-[#FF3B30]' 
                    : 'text-[#8A8A8A]'
                }`}>
                  {balanceDelta > 0 ? `+${balanceDelta.toFixed(2)} USDT (Credit)` : balanceDelta < 0 ? `${balanceDelta.toFixed(2)} USDT (Debit)` : '0.00 USDT (No Change)'}
                </span>
              </div>
            </div>

            {/* Mandatory Reason */}
            <div>
              <label className="text-[11px] font-bold uppercase text-amber-400 block mb-1.5 flex items-center space-x-1">
                <span>Reason for Correction (Mandatory Audit Trail)</span>
                <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Specify precise institutional justification (e.g. 'Customer ticket #1029 slippage dispute settlement', 'Broker quotation reconciliation')..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#1F1F1F] border border-[#333333] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#666666] focus:outline-none resize-none"
              />
            </div>

            {/* Confirmation Banner if step active */}
            {confirmStep && (
              <div className="p-4 bg-amber-500/15 border border-amber-500/40 rounded-xl space-y-2">
                <div className="text-xs font-bold text-amber-300 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Final Authorization Confirmation</span>
                </div>
                <p className="text-[11px] text-[#CCCCCC]">
                  You are about to modify trade #{trade.id} and adjust {trade.userName}'s wallet balance by{' '}
                  <strong className={balanceDelta >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}>
                    {balanceDelta >= 0 ? '+' : ''}${balanceDelta.toFixed(2)} USDT
                  </strong>.
                  Are you certain you want to commit this audit correction?
                </p>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#262626] bg-[#1A1A1A]/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#262626] text-white hover:bg-[#333333] transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center space-x-3">
              {confirmStep && (
                <button
                  type="button"
                  onClick={() => setConfirmStep(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#262626] text-[#8A8A8A] hover:text-white transition-colors"
                >
                  Back to Edit
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50 transition-all flex items-center space-x-1.5 shadow-md shadow-amber-500/10"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{confirmStep ? 'Confirm & Apply Correction' : 'Review & Save'}</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
