import React, { useState } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
  Shield,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  User,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AdminTradeItem } from '../../types';
import { apiService } from '../../services/api';
import { formatLots } from '../../utils/marginUtils';
import { formatIST } from '../../utils/dateUtils';

interface DeleteTradeModalProps {
  trade: AdminTradeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tradeId: string, reversalAmount: number) => void;
}

export const DeleteTradeModal: React.FC<DeleteTradeModalProps> = ({
  trade,
  isOpen,
  onClose,
  onSuccess
}) => {
  if (!isOpen || !trade) return null;

  const [reason, setReason] = useState<string>('');
  const [actionType, setActionType] = useState<'void' | 'hard_delete'>('void');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState<boolean>(false);

  const isLong = trade.side.toLowerCase() === 'long' || trade.side.toLowerCase() === 'buy';
  const settledNetPnL = trade.netPnL !== undefined ? trade.netPnL : (trade.grossPnL || 0) - (trade.fee || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmStep) {
      if (!reason.trim() || reason.trim().length < 3) {
        setError('A mandatory Justification Reason (minimum 3 characters) is required to void or delete a trade record.');
        return;
      }
      setError(null);
      setConfirmStep(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await apiService.deleteAdminTrade(trade.id, {
        reason: reason.trim(),
        actionType
      });
      onSuccess(trade.id, res.reversalAmount || settledNetPnL);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete/void trade:', err);
      setError(err.message || 'Failed to process trade deletion. Please try again.');
      setConfirmStep(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="delete-trade-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div id="delete-trade-modal-container" className="relative w-full max-w-xl my-6 bg-[#121212] border border-[#2E2E2E] rounded-2xl shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#181818]/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Void / Delete Trade Record
              </h3>
              <p className="text-xs text-[#8A8A8A]">
                Institutional trade cancellation & financial balance reversal
              </p>
            </div>
          </div>
          <button
            id="close-delete-trade-modal-button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#8A8A8A] hover:text-white hover:bg-[#262626] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3 text-red-400 text-xs">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Validation Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Trade Details Summary */}
          <div className="p-4 rounded-xl bg-[#181818] border border-[#262626] space-y-3">
            <div className="flex items-center justify-between border-b border-[#262626] pb-2">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-sm">{trade.symbol}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                  isLong ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                }`}>
                  {isLong ? 'BUY / LONG' : 'SELL / SHORT'}
                </span>
                <span className="text-xs text-[#8A8A8A] font-mono">
                  {formatLots(trade.lots, trade.symbol)}
                </span>
              </div>
              <span className="font-mono text-xs text-[#707070]">#{trade.id}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[#707070] block">Trader:</span>
                <span className="font-semibold text-white truncate block">
                  {trade.userName || 'Trader'} ({trade.userEmail})
                </span>
              </div>
              <div>
                <span className="text-[#707070] block">Status:</span>
                <span className="font-semibold text-white uppercase">{trade.status}</span>
              </div>
              <div>
                <span className="text-[#707070] block">Execution Time:</span>
                <span className="text-[#CCCCCC]">{formatIST(trade.openedAt)}</span>
              </div>
              <div>
                <span className="text-[#707070] block">Settled Net P&L:</span>
                <span className={`font-bold font-mono ${settledNetPnL >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                  {settledNetPnL >= 0 ? `+$${settledNetPnL.toFixed(2)}` : `-$${Math.abs(settledNetPnL).toFixed(2)}`} USDT
                </span>
              </div>
            </div>
          </div>

          {/* Action Mode Choice */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#A0A0A0]">
              Deletion Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActionType('void')}
                className={`p-3 rounded-xl text-left border transition-all ${
                  actionType === 'void'
                    ? 'bg-amber-500/15 border-amber-500/40 text-white'
                    : 'bg-[#181818] border-[#262626] text-[#707070] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs">Void Trade (Recommended)</span>
                </div>
                <p className="text-[11px] text-[#8A8A8A] mt-1">
                  Marks the trade record as Void/Cancelled, preserving forensic history while reversing wallet balance impact.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActionType('hard_delete')}
                className={`p-3 rounded-xl text-left border transition-all ${
                  actionType === 'hard_delete'
                    ? 'bg-red-500/15 border-red-500/40 text-white'
                    : 'bg-[#181818] border-[#262626] text-[#707070] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span className="font-bold text-xs">Hard Delete</span>
                </div>
                <p className="text-[11px] text-[#8A8A8A] mt-1">
                  Permanently deletes the trade record from the database and reverses wallet balance impact.
                </p>
              </button>
            </div>
          </div>

          {/* Balance Reversal Notice */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Financial Balance Reversal Notice</p>
              <p className="text-[#CCCCCC] mt-0.5">
                Executing this action will automatically adjust the customer's wallet balance by{' '}
                <strong className="text-white font-mono">
                  {settledNetPnL >= 0 ? `-$${settledNetPnL.toFixed(2)} USDT (Debit Reversal)` : `+$${Math.abs(settledNetPnL).toFixed(2)} USDT (Credit Reversal)`}
                </strong>{' '}
                to ensure the financial ledger remains 100% reconciled.
              </p>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-[11px] font-semibold text-red-300 mb-1">
              Mandatory Reason for Deletion / Voiding *
            </label>
            <textarea
              id="delete-trade-reason-input"
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide detailed compliance reason for deletion (e.g. Test order injection during deployment, duplicate fill error, invalid customer account attribution)..."
              className="w-full bg-[#121212] border border-[#2E2E2E] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-red-500 placeholder-[#606060]"
            />
          </div>

          {confirmStep && (
            <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/50 space-y-2 animate-in fade-in">
              <div className="flex items-center space-x-2 text-red-400 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Final Warning: Irreversible Action</span>
              </div>
              <p className="text-xs text-[#CCCCCC]">
                Are you absolutely sure you want to {actionType === 'hard_delete' ? 'permanently delete' : 'void'} trade <strong>#{trade.id}</strong>?
                This action is audited and cannot be undone.
              </p>
            </div>
          )}

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
                  Back
                </button>
              )}

              <button
                type="submit"
                id="submit-delete-trade-button"
                disabled={loading}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-lg ${
                  confirmStep
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                    : 'bg-red-500/80 hover:bg-red-500 text-white shadow-red-500/20'
                } disabled:opacity-50`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : confirmStep ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Execute {actionType === 'hard_delete' ? 'Delete' : 'Void'}</span>
                  </>
                ) : (
                  <>
                    <span>Review & {actionType === 'hard_delete' ? 'Delete' : 'Void'}</span>
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
