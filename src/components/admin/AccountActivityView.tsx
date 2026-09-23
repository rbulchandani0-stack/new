import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Wallet as WalletIcon,
  Clock,
  History,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  FileText,
  DollarSign,
  Layers,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { AccountActivityData, AdminTradeItem } from '../../types';
import { apiService } from '../../services/api';
import { formatIST } from '../../utils/dateUtils';
import { formatLots } from '../../utils/marginUtils';

interface AccountActivityViewProps {
  userId: string;
  onBack: () => void;
  onViewTradeDetails: (trade: AdminTradeItem) => void;
  onOpenCorrectTrade?: (trade: AdminTradeItem) => void;
  canCorrectTrade?: boolean;
}

export const AccountActivityView: React.FC<AccountActivityViewProps> = ({
  userId,
  onBack,
  onViewTradeDetails,
  onOpenCorrectTrade,
  canCorrectTrade = false
}) => {
  const [data, setData] = useState<AccountActivityData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'trades' | 'deposits' | 'withdrawals' | 'balance' | 'security'>('trades');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    loadAccountData();
  }, [userId]);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getUserAccountActivity(userId);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load user account activity');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3 bg-[#121212] border border-[#262626] rounded-2xl">
        <RefreshCw className="w-8 h-8 text-[#00C853] animate-spin" />
        <span className="text-xs text-[#8A8A8A]">Retrieving comprehensive customer account activity...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-[#121212] border border-[#262626] rounded-2xl text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-sm font-bold text-white">Error Loading Account Activity</h3>
        <p className="text-xs text-[#8A8A8A] max-w-md mx-auto">{error || 'User not found'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[#262626] text-white hover:bg-[#333333] text-xs font-bold transition-colors inline-flex items-center space-x-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Trade History</span>
        </button>
      </div>
    );
  }

  const { user, wallet, trades, deposits, withdrawals, balanceLedger, securityEvents, loginHistory } = data;

  const totalDepositsUSD = (deposits || [])
    .filter(d => d.status === 'approved')
    .reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

  const totalWithdrawalsUSD = (withdrawals || [])
    .filter(w => w.status === 'approved')
    .reduce((acc, w) => acc + (Number(w.amount) || 0), 0);

  const totalRealizedPnL = (trades || [])
    .filter(t => t.status === 'closed' || t.status === 'completed')
    .reduce((acc, t) => acc + (Number(t.netPnL) || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-3.5 py-2 rounded-xl bg-[#1A1A1A] border border-[#2E2E2E] hover:border-[#444444] text-xs font-bold text-[#CCCCCC] hover:text-white transition-all flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4 text-[#00C853]" />
          <span>Back to All Trade History</span>
        </button>
        <button
          onClick={loadAccountData}
          className="p-2 rounded-xl bg-[#1A1A1A] border border-[#2E2E2E] hover:border-[#444444] text-xs font-bold text-[#8A8A8A] hover:text-white transition-all"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Customer Account Header Card */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#262626]">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1E3A2B] to-[#00C853]/20 border border-[#00C853]/30 flex items-center justify-center text-[#00C853] text-xl font-black">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-white tracking-wide">{user.name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30">
                  {user.role || 'USER'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  user.kycStatus === 'verified'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}>
                  KYC: {user.kycStatus || 'pending'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#8A8A8A] mt-1.5">
                <span>Email: <strong className="text-[#CCCCCC]">{user.email}</strong></span>
                <span>&bull;</span>
                <span className="flex items-center space-x-1">
                  <span>ID: <code className="text-[#CCCCCC]">{user.id}</code></span>
                  <button onClick={() => copyToClipboard(user.id, 'acc_id')} className="hover:text-white">
                    {copiedField === 'acc_id' ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
                <span>&bull;</span>
                <span>Joined: {formatIST(user.createdAt || new Date().toISOString())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Balances Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6">
          <div className="bg-[#1A1A1A] border border-[#2B2B2B] p-3.5 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
              Trading Balance
            </span>
            <span className="text-base sm:text-lg font-black text-[#00C853] mt-1 block">
              ${(wallet.tradingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2B2B2B] p-3.5 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
              Available Margin
            </span>
            <span className="text-base sm:text-lg font-black text-white mt-1 block">
              ${(wallet.availableMargin || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2B2B2B] p-3.5 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
              Used Margin
            </span>
            <span className="text-base sm:text-lg font-black text-amber-400 mt-1 block">
              ${(wallet.usedMargin || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2B2B2B] p-3.5 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
              Total Deposits
            </span>
            <span className="text-base sm:text-lg font-black text-white mt-1 block">
              ${totalDepositsUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2B2B2B] p-3.5 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
              Total Withdrawals
            </span>
            <span className="text-base sm:text-lg font-black text-white mt-1 block">
              ${totalWithdrawalsUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2B2B2B] p-3.5 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
              Realized Trading PnL
            </span>
            <span className={`text-base sm:text-lg font-black mt-1 block ${
              totalRealizedPnL >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'
            }`}>
              {totalRealizedPnL >= 0 ? '+' : ''}${totalRealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#262626] pb-3">
        <button
          onClick={() => setActiveSubTab('trades')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeSubTab === 'trades'
              ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10 font-extrabold'
              : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Trades History ({trades.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('deposits')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeSubTab === 'deposits'
              ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10 font-extrabold'
              : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>Deposits ({deposits.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('withdrawals')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeSubTab === 'withdrawals'
              ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10 font-extrabold'
              : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Withdrawals ({withdrawals.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('balance')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeSubTab === 'balance'
              ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10 font-extrabold'
              : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Balance History Ledger ({balanceLedger.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('security')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeSubTab === 'security'
              ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10 font-extrabold'
              : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Login & Security Activity</span>
        </button>
      </div>

      {/* Tab 1: Trades History */}
      {activeSubTab === 'trades' && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#1A1A1A] text-[#8A8A8A] text-[11px] uppercase tracking-wider border-b border-[#262626]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Trade ID</th>
                  <th className="py-3.5 px-4 font-bold">Instrument</th>
                  <th className="py-3.5 px-4 font-bold">Direction</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Lots / Size</th>
                  <th className="py-3.5 px-4 font-bold">Open Price</th>
                  <th className="py-3.5 px-4 font-bold">Close Price</th>
                  <th className="py-3.5 px-4 font-bold">Fees</th>
                  <th className="py-3.5 px-4 font-bold">Net P&L</th>
                  <th className="py-3.5 px-4 font-bold">Execution Time</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#212121]">
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-[#8A8A8A]">
                      No trading records found for this account.
                    </td>
                  </tr>
                ) : (
                  trades.map(trade => {
                    const isLong = trade.side.toLowerCase() === 'long' || trade.side.toLowerCase() === 'buy';
                    const isPnlPositive = (trade.netPnL || 0) >= 0;

                    return (
                      <tr key={trade.id} className="hover:bg-[#1A1A1A]/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#CCCCCC]">
                          <div className="flex items-center space-x-1.5">
                            <span>{trade.id}</span>
                            {trade.isCorrected && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                ADJ
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {trade.symbol}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            isLong ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                          }`}>
                            {isLong ? 'LONG' : 'SHORT'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            trade.status === 'open' 
                              ? 'bg-blue-500/15 text-blue-400' 
                              : trade.status === 'cancelled'
                              ? 'bg-gray-500/15 text-gray-400'
                              : 'bg-emerald-500/15 text-emerald-400'
                          }`}>
                            {trade.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-white">{formatLots(trade.lots)}</span>
                          <span className="text-[10px] text-[#8A8A8A] block">{trade.leverage}x Lev</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-white">
                          ${Number(trade.entryPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-white">
                          ${Number(trade.exitPrice || trade.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#CCCCCC]">
                          ${Number(trade.fee || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold">
                          <span className={isPnlPositive ? 'text-[#00C853]' : 'text-[#FF3B30]'}>
                            {trade.netPnL >= 0 ? '+' : ''}${Number(trade.netPnL || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#8A8A8A] text-[11px]">
                          {formatIST(trade.createdAt || trade.openedAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => onViewTradeDetails(trade)}
                              className="px-2.5 py-1 rounded-lg bg-[#262626] hover:bg-[#333333] text-[11px] font-semibold text-white transition-colors"
                            >
                              Details
                            </button>
                            {trade.status !== 'open' && canCorrectTrade && onOpenCorrectTrade && (
                              <button
                                onClick={() => onOpenCorrectTrade(trade)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-[11px] font-semibold transition-colors"
                              >
                                Correct
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Deposits */}
      {activeSubTab === 'deposits' && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#1A1A1A] text-[#8A8A8A] text-[11px] uppercase tracking-wider border-b border-[#262626]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Deposit ID</th>
                  <th className="py-3.5 px-4 font-bold">Amount</th>
                  <th className="py-3.5 px-4 font-bold">Payment Method</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Reference / UTR</th>
                  <th className="py-3.5 px-4 font-bold">Approved By</th>
                  <th className="py-3.5 px-4 font-bold">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#212121]">
                {deposits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8A8A8A]">
                      No deposit records found for this account.
                    </td>
                  </tr>
                ) : (
                  deposits.map((dep: any) => (
                    <tr key={dep.id} className="hover:bg-[#1A1A1A]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#CCCCCC]">
                        {dep.id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#00C853] text-sm">
                        +${Number(dep.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {dep.currency || 'USDT'}
                      </td>
                      <td className="py-3.5 px-4 text-white capitalize">
                        {dep.method || dep.network || 'Bank Transfer'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          dep.status === 'approved' 
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : dep.status === 'rejected'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {dep.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#CCCCCC]">
                        {dep.utrNumber || dep.txHash || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#CCCCCC]">
                        {dep.approvedByAdmin || 'Automated Engine'}
                      </td>
                      <td className="py-3.5 px-4 text-[#8A8A8A] text-[11px]">
                        {formatIST(dep.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Withdrawals */}
      {activeSubTab === 'withdrawals' && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#1A1A1A] text-[#8A8A8A] text-[11px] uppercase tracking-wider border-b border-[#262626]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Withdrawal ID</th>
                  <th className="py-3.5 px-4 font-bold">Amount</th>
                  <th className="py-3.5 px-4 font-bold">Destination</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Processed By</th>
                  <th className="py-3.5 px-4 font-bold">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#212121]">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#8A8A8A]">
                      No withdrawal records found for this account.
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w: any) => (
                    <tr key={w.id} className="hover:bg-[#1A1A1A]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#CCCCCC]">
                        {w.id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#FF3B30] text-sm">
                        -${Number(w.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {w.currency || 'USDT'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#CCCCCC] max-w-[200px] truncate">
                        {w.bankName ? `${w.bankName} - ${w.accountNumber}` : (w.destinationAddress || w.destination || 'External Wallet')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          w.status === 'approved' 
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : w.status === 'rejected'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#CCCCCC]">
                        {w.processedByAdmin || 'Risk Desk'}
                      </td>
                      <td className="py-3.5 px-4 text-[#8A8A8A] text-[11px]">
                        {formatIST(w.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Balance History Ledger */}
      {activeSubTab === 'balance' && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-[#262626] bg-[#1A1A1A]/60 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Chronological Account Balance Ledger</h3>
              <p className="text-xs text-[#8A8A8A]">
                Mathematical proof: Current Balance = Opening + Deposits - Withdrawals + Trading P&L - Fees &plusmn; Adjustments
              </p>
            </div>
            <span className="text-xs font-mono text-[#00C853] font-bold">
              Current Balance: ${(wallet.tradingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#1A1A1A] text-[#8A8A8A] text-[11px] uppercase tracking-wider border-b border-[#262626]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Date & Time</th>
                  <th className="py-3.5 px-4 font-bold">Transaction Type</th>
                  <th className="py-3.5 px-4 font-bold">Balance Before</th>
                  <th className="py-3.5 px-4 font-bold">Delta (Amount)</th>
                  <th className="py-3.5 px-4 font-bold">Balance After</th>
                  <th className="py-3.5 px-4 font-bold">Reference / Description</th>
                  <th className="py-3.5 px-4 font-bold">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#212121]">
                {balanceLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8A8A8A]">
                      No ledger transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  balanceLedger.map((item, idx) => {
                    const isPositive = item.amount >= 0;
                    return (
                      <tr key={item.id || idx} className="hover:bg-[#1A1A1A]/60 transition-colors">
                        <td className="py-3.5 px-4 text-[#8A8A8A] text-[11px]">
                          {formatIST(item.timestamp)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.type === 'deposit'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : item.type === 'withdrawal'
                              ? 'bg-red-500/15 text-red-400'
                              : item.type === 'trade_pnl'
                              ? 'bg-blue-500/15 text-blue-400'
                              : 'bg-purple-500/15 text-purple-400'
                          }`}>
                            {item.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#CCCCCC]">
                          ${Number(item.balanceBefore).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold">
                          <span className={isPositive ? 'text-[#00C853]' : 'text-[#FF3B30]'}>
                            {isPositive ? '+' : ''}${Number(item.amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          ${Number(item.balanceAfter).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#CCCCCC] max-w-[280px]">
                          <span className="truncate block font-medium">{item.description}</span>
                          <span className="text-[10px] text-[#666666] font-mono block">{item.referenceId}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#8A8A8A]">
                          {item.adminActor || 'System Engine'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Security & Login Activity */}
      {activeSubTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Login History */}
          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#00C853]" />
              <span>Login History & Sessions</span>
            </h3>

            <div className="divide-y divide-[#212121]">
              {loginHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8A8A8A]">
                  No login history recorded yet.
                </div>
              ) : (
                loginHistory.slice(0, 10).map((log: any, idx: number) => (
                  <div key={idx} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white block">
                        {log.device || log.browser || 'Web Browser'}
                      </span>
                      <span className="text-[11px] text-[#8A8A8A]">
                        IP: <code className="text-[#CCCCCC]">{log.ipAddress || log.ip || '127.0.0.1'}</code>
                      </span>
                    </div>
                    <span className="text-[11px] text-[#8A8A8A]">
                      {formatIST(log.timestamp || log.loginTime)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Audit & Security Events */}
          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Administrative Audit Trail For This User</span>
            </h3>

            <div className="divide-y divide-[#212121]">
              {securityEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8A8A8A]">
                  No administrative actions logged on this user account yet.
                </div>
              ) : (
                securityEvents.slice(0, 10).map((event: any) => (
                  <div key={event.id} className="py-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">
                        {event.action}
                      </span>
                      <span className="text-[10px] text-[#8A8A8A]">
                        {formatIST(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#CCCCCC]">
                      {event.details}
                    </p>
                    <div className="text-[10px] text-[#8A8A8A]">
                      Actor: <span className="text-[#00C853]">{event.actorName || event.adminEmail}</span> ({event.actorRole || 'ADMIN'})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
