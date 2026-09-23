import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Clock,
  User,
  Shield,
  DollarSign,
  Layers,
  Calendar,
  AlertTriangle,
  History,
  Edit3,
  Trash2,
  Sliders
} from 'lucide-react';
import { AdminTradeItem } from '../../types';
import { formatIST } from '../../utils/dateUtils';
import { formatLots } from '../../utils/marginUtils';

interface TradeDetailsModalProps {
  trade: AdminTradeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCorrectModal?: (trade: AdminTradeItem) => void;
  onOpenEditModal?: (trade: AdminTradeItem) => void;
  onOpenDeleteModal?: (trade: AdminTradeItem) => void;
  onOpenAuditModal?: (trade: AdminTradeItem) => void;
  onOpenEditPosition?: (positionId: string) => void;
  canCorrectTrade?: boolean;
}

export const TradeDetailsModal: React.FC<TradeDetailsModalProps> = ({
  trade,
  isOpen,
  onClose,
  onOpenCorrectModal,
  onOpenEditModal,
  onOpenDeleteModal,
  onOpenAuditModal,
  onOpenEditPosition,
  canCorrectTrade = false
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !trade) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isLong = trade.side.toLowerCase() === 'long' || trade.side.toLowerCase() === 'buy';
  const isProfit = (trade.netPnL || 0) >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-[#121212] border border-[#262626] rounded-2xl shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#181818]/60">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${isLong ? 'bg-[#00C853]/10 text-[#00C853]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'}`}>
              {isLong ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  {trade.symbol}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${
                  isLong ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                }`}>
                  {isLong ? 'BUY / LONG' : 'SELL / SHORT'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  trade.status === 'open' 
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    : trade.status === 'cancelled'
                    ? 'bg-gray-500/15 text-gray-400 border border-gray-500/30'
                    : 'bg-[#00C853]/10 text-[#00C853] border border-[#00C853]/20'
                }`}>
                  {trade.status}
                </span>
                {trade.isCorrected && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                    <History className="w-3 h-3" />
                    <span>CORRECTED</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8A8A8A] flex items-center space-x-2 mt-0.5">
                <span>Trade ID: <code className="text-[#CCCCCC]">{trade.id}</code></span>
                <button
                  onClick={() => copyToClipboard(trade.id, 'id')}
                  className="hover:text-white transition-colors"
                  title="Copy Trade ID"
                >
                  {copiedField === 'id' ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                </button>
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

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Account & User Context */}
          <div className="bg-[#1A1A1A] border border-[#2B2B2B] rounded-xl p-4">
            <div className="text-[11px] font-bold text-[#8A8A8A] uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-[#00C853]" />
              <span>Customer Account Information</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] text-[#8A8A8A] block">Customer Name</span>
                <span className="text-xs font-semibold text-white">{trade.userName}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#8A8A8A] block">Email Address</span>
                <span className="text-xs font-semibold text-white truncate block">{trade.userEmail}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#8A8A8A] block">User / Account ID</span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-mono text-[#CCCCCC] truncate">{trade.userId}</span>
                  <button
                    onClick={() => copyToClipboard(trade.userId, 'uid')}
                    className="text-[#8A8A8A] hover:text-white transition-colors"
                  >
                    {copiedField === 'uid' ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Key Financial PnL Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-4 rounded-xl border ${
              isProfit 
                ? 'bg-[#00C853]/5 border-[#00C853]/20' 
                : 'bg-[#FF3B30]/5 border-[#FF3B30]/20'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
                {trade.status === 'open' ? 'Current Unrealized Net' : 'Realized Net P&L'}
              </span>
              <span className={`text-xl font-black mt-1 block ${isProfit ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                {trade.netPnL >= 0 ? '+' : ''}${Number(trade.netPnL || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-[#8A8A8A] mt-0.5 block">
                Gross: ${Number(trade.grossPnL || 0).toFixed(2)}
              </span>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2B2B2B] p-4 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
                Total Fees
              </span>
              <span className="text-xl font-black text-white mt-1 block">
                ${Number(trade.fee || 0).toFixed(2)}
              </span>
              <span className="text-[10px] text-[#8A8A8A] mt-0.5 block">
                Handling: ${Number(trade.handlingFee || 0).toFixed(2)}
              </span>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2B2B2B] p-4 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
                Position Margin
              </span>
              <span className="text-xl font-black text-white mt-1 block">
                ${Number(trade.margin || 0).toFixed(2)}
              </span>
              <span className="text-[10px] text-[#8A8A8A] mt-0.5 block">
                {trade.leverage}x Leverage
              </span>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2B2B2B] p-4 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
                Lot Size
              </span>
              <span className="text-xl font-black text-[#00C853] mt-1 block">
                {formatLots(trade.lots, undefined, false)} <span className="text-xs text-[#8A8A8A] font-normal">Lots</span>
              </span>
              <span className="text-[10px] text-[#8A8A8A] mt-0.5 block">
                {trade.size} Base Units
              </span>
            </div>
          </div>

          {/* Pricing & Execution Grid */}
          <div className="bg-[#1A1A1A] border border-[#2B2B2B] rounded-xl p-4">
            <div className="text-[11px] font-bold text-[#8A8A8A] uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#00C853]" />
              <span>Pricing & Order Execution Specifications</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[#8A8A8A] block">Open / Entry Price</span>
                <span className="font-bold text-white">${Number(trade.entryPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
              </div>
              <div>
                <span className="text-[#8A8A8A] block">
                  {trade.status === 'open' ? 'Current Mark Price' : 'Close / Exit Price'}
                </span>
                <span className="font-bold text-white">
                  ${Number(trade.exitPrice || trade.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
              </div>
              <div>
                <span className="text-[#8A8A8A] block">Stop Loss</span>
                <span className="font-bold text-white">
                  {trade.stopLoss ? `$${Number(trade.stopLoss).toFixed(2)}` : 'Not Set'}
                </span>
              </div>
              <div>
                <span className="text-[#8A8A8A] block">Take Profit</span>
                <span className="font-bold text-white">
                  {trade.takeProfit ? `$${Number(trade.takeProfit).toFixed(2)}` : 'Not Set'}
                </span>
              </div>
              <div>
                <span className="text-[#8A8A8A] block">Contract Size</span>
                <span className="font-medium text-white">{trade.contractSize || 1} units/lot</span>
              </div>
              <div>
                <span className="text-[#8A8A8A] block">Order Type</span>
                <span className="font-medium text-white uppercase">{trade.orderType || 'Market'}</span>
              </div>
              <div>
                <span className="text-[#8A8A8A] block">Swap / Overnight Fee</span>
                <span className="font-medium text-white">${Number(trade.swapFee || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#8A8A8A] block">Reference / Tx ID</span>
                <span className="font-mono text-[11px] text-[#CCCCCC] truncate block">{trade.referenceId || trade.id}</span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-[#1A1A1A] border border-[#2B2B2B] rounded-xl p-4">
            <div className="text-[11px] font-bold text-[#8A8A8A] uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-[#00C853]" />
              <span>Timestamps & Execution Records</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[#8A8A8A] block">Opened Timestamp (IST / UTC)</span>
                <span className="font-medium text-white">{formatIST(trade.openedAt)}</span>
              </div>
              <div>
                <span className="text-[#8A8A8A] block">Closed / Settled Timestamp</span>
                <span className="font-medium text-white">
                  {trade.closedAt ? formatIST(trade.closedAt) : (trade.status === 'open' ? 'Active / In Progress' : formatIST(trade.createdAt))}
                </span>
              </div>
              <div>
                <span className="text-[#8A8A8A] block">Last Modified Record</span>
                <span className="font-medium text-white">
                  {trade.lastModifiedAt ? `${formatIST(trade.lastModifiedAt)} (${trade.lastModifiedBy || 'Admin'})` : 'Original Unmodified'}
                </span>
              </div>
            </div>
          </div>

          {/* Corrections Audit History */}
          {trade.corrections && trade.corrections.length > 0 && (
            <div className="bg-[#1A1A1A] border border-amber-500/30 rounded-xl p-4">
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Forensic Corrections & Audit Log ({trade.corrections.length} recorded)</span>
              </div>
              <div className="space-y-3">
                {trade.corrections.map((corr, idx) => (
                  <div key={corr.id || idx} className="bg-[#141414] border border-[#2B2B2B] p-3 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white">
                        Modified by: <span className="text-amber-400">{corr.adminName || corr.adminEmail}</span>
                      </span>
                      <span className="text-[#8A8A8A]">{formatIST(corr.timestamp)}</span>
                    </div>
                    <div className="text-[#CCCCCC]">
                      <span className="text-[#8A8A8A]">Fields adjusted:</span> <span className="font-mono text-[#00C853]">{corr.field}</span>
                    </div>
                    <div className="bg-[#1D1D1D] p-2 rounded text-[#CCCCCC] text-[11px] border border-[#2E2E2E]">
                      <span className="text-amber-400 font-bold block mb-0.5">Mandatory Reason:</span>
                      {corr.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[#262626] bg-[#181818]/60">
          <div className="flex items-center space-x-2">
            {onOpenAuditModal && (
              <button
                type="button"
                id="trade-details-audit-btn"
                onClick={() => {
                  onClose();
                  onOpenAuditModal(trade);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#222222] text-[#CCCCCC] hover:text-white hover:bg-[#2C2C2C] transition-colors flex items-center space-x-1.5"
              >
                <History className="w-3.5 h-3.5 text-[#00C853]" />
                <span>Audit Trail</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canCorrectTrade && onOpenDeleteModal && (
              <button
                type="button"
                id="trade-details-delete-btn"
                onClick={() => {
                  onClose();
                  onOpenDeleteModal(trade);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 transition-all flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Void / Delete</span>
              </button>
            )}

            {canCorrectTrade && onOpenEditModal && (
              <button
                type="button"
                id="trade-details-edit-btn"
                onClick={() => {
                  onClose();
                  onOpenEditModal(trade);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00C853] text-black hover:bg-[#00E676] transition-all flex items-center space-x-1.5 shadow-md shadow-[#00C853]/10"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Edit Trade Parameters</span>
              </button>
            )}

            {trade.status === 'open' && onOpenEditPosition && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditPosition(trade.id);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 text-white hover:bg-blue-400 transition-all flex items-center space-x-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Live Position</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#262626] text-white hover:bg-[#333333] transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
