import React, { useState } from 'react';
import { 
  CheckCircle2, Search, ArrowUpRight, ArrowDownLeft, X, ZoomIn, 
  RefreshCw, FileCheck, Building2, Copy, Smartphone, Coins, 
  Clock, XCircle, ShieldCheck, Check, AlertCircle, Eye, Filter,
  ArrowDownRight, Layers, CreditCard
} from 'lucide-react';
import { formatIST } from '../../utils/dateUtils';
import { normalizeRole } from '../../views/AdminPanelPage';

interface ApprovalDeskSectionProps {
  user: any;
  depositFilter: 'all' | 'pending' | 'approved' | 'rejected';
  setDepositFilter: (f: 'all' | 'pending' | 'approved' | 'rejected') => void;
  withdrawalFilter: 'all' | 'pending' | 'approved' | 'rejected';
  setWithdrawalFilter: (f: 'all' | 'pending' | 'approved' | 'rejected') => void;
  kycFilter: 'all' | 'pending' | 'approved' | 'rejected';
  setKycFilter: (f: 'all' | 'pending' | 'approved' | 'rejected') => void;
  approvalDeskSection: 'all' | 'deposits' | 'withdrawals' | 'kyc';
  setApprovalDeskSection: (s: 'all' | 'deposits' | 'withdrawals' | 'kyc') => void;
  depositSearch: string;
  setDepositSearch: (s: string) => void;
  withdrawalSearch: string;
  setWithdrawalSearch: (s: string) => void;
  kycSearch: string;
  setKycSearch: (s: string) => void;
  filteredDeposits: any[];
  filteredWithdrawals: any[];
  filteredKYC: any[];
  depositStats: { total: number; pending: number; approved: number; rejected: number; pendingAmount: number; approvedAmount: number };
  withdrawalStats: { total: number; pending: number; approved: number; rejected: number; pendingAmount: number; approvedAmount: number };
  kycStats: { total: number; pending: number; approved: number; rejected: number };
  totalPendingActionCount: number;
  copiedField: string | null;
  handleCopyText: (text: string, id: string) => void;
  getWithdrawalDetails: (wd: any) => any;
  handleApproveDeposit: (id: string) => Promise<void>;
  handleRejectDeposit: (id: string) => Promise<void>;
  handleApproveWithdrawal: (id: string, notes?: string, txHash?: string) => Promise<void>;
  handleRejectWithdrawal: (id: string, reason?: string) => Promise<void>;
  handleApproveKYC: (userId: string) => Promise<void>;
  handleRejectKYC: (userId: string) => Promise<void>;
  setImageModal: (modal: { url: string; title: string; userEmail?: string } | null) => void;
  setSelectedWithdrawalModal: (wd: any) => void;
  onRefresh: () => Promise<void>;
}

export const ApprovalDeskSection: React.FC<ApprovalDeskSectionProps> = ({
  user,
  depositFilter,
  setDepositFilter,
  withdrawalFilter,
  setWithdrawalFilter,
  kycFilter,
  setKycFilter,
  approvalDeskSection,
  setApprovalDeskSection,
  depositSearch,
  setDepositSearch,
  withdrawalSearch,
  setWithdrawalSearch,
  kycSearch,
  setKycSearch,
  filteredDeposits,
  filteredWithdrawals,
  filteredKYC,
  depositStats,
  withdrawalStats,
  kycStats,
  totalPendingActionCount,
  copiedField,
  handleCopyText,
  getWithdrawalDetails,
  handleApproveDeposit,
  handleRejectDeposit,
  handleRejectWithdrawal,
  handleApproveKYC,
  handleRejectKYC,
  setImageModal,
  setSelectedWithdrawalModal,
  onRefresh,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const userRole = normalizeRole(user?.role);
  const showDeposits = userRole !== 'support' && (approvalDeskSection === 'all' || approvalDeskSection === 'deposits');
  const showWithdrawals = userRole !== 'support' && (approvalDeskSection === 'all' || approvalDeskSection === 'withdrawals');
  const showKYC = userRole !== 'finance_manager' && (approvalDeskSection === 'all' || approvalDeskSection === 'kyc');

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Summary KPI Cards */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222222] pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00C853]/20 via-[#00C853]/10 to-transparent border border-[#00C853]/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#00C853]" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
                  <span>Approval Desk</span>
                  {totalPendingActionCount > 0 ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold animate-pulse">
                      <Clock className="w-3 h-3" />
                      <span>{totalPendingActionCount} Action Required</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#00C853]/20 border border-[#00C853]/40 text-[#00C853] text-xs font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Queue Clear</span>
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#8A8A8A] mt-0.5">
                  Institutional compliance desk for verifying deposits, approving withdrawals, and authenticating user identities.
                </p>
              </div>
            </div>
          </div>

          {/* Action & Real-time Refresh */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333333] hover:border-[#444444] text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Queue Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00C853] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Total Pending */}
          <div 
            onClick={() => setApprovalDeskSection('all')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              approvalDeskSection === 'all' 
                ? 'bg-[#181818] border-white/30 shadow-lg ring-1 ring-white/10' 
                : 'bg-[#151515] border-[#222222] hover:border-[#333333]'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-1.5 font-medium">
              <span>Total Pending Queue</span>
              <span className={`w-2 h-2 rounded-full ${totalPendingActionCount > 0 ? 'bg-amber-400 animate-ping' : 'bg-[#00C853]'}`} />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-white">{totalPendingActionCount}</span>
              <span className="text-[11px] text-[#8A8A8A]">requests</span>
            </div>
            <div className="text-[10px] text-[#666666] mt-2 flex items-center space-x-1">
              <span>All compliance channels</span>
            </div>
          </div>

          {/* Card 2: Pending Deposits */}
          {userRole !== 'support' && (
            <div 
              onClick={() => setApprovalDeskSection(approvalDeskSection === 'deposits' ? 'all' : 'deposits')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                approvalDeskSection === 'deposits'
                  ? 'bg-[#181818] border-[#00C853]/50 shadow-lg ring-1 ring-[#00C853]/20'
                  : 'bg-[#151515] border-[#222222] hover:border-[#00C853]/30'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-1.5 font-medium">
                <span className="flex items-center space-x-1">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-[#00C853]" />
                  <span>Pending Deposits</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#00C853]/10 text-[#00C853]">
                  {depositStats.pending}
                </span>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-black text-[#00C853]">
                  ${depositStats.pendingAmount.toLocaleString()}
                </span>
                <span className="text-[11px] text-[#8A8A8A]">USD</span>
              </div>
              <div className="text-[10px] text-[#8A8A8A] mt-2 flex items-center justify-between">
                <span>{depositStats.approved} approved</span>
                <span className="text-[#00C853] font-bold">Filter →</span>
              </div>
            </div>
          )}

          {/* Card 3: Pending Withdrawals */}
          {userRole !== 'support' && (
            <div 
              onClick={() => setApprovalDeskSection(approvalDeskSection === 'withdrawals' ? 'all' : 'withdrawals')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                approvalDeskSection === 'withdrawals'
                  ? 'bg-[#181818] border-[#FF3B30]/50 shadow-lg ring-1 ring-[#FF3B30]/20'
                  : 'bg-[#151515] border-[#222222] hover:border-[#FF3B30]/30'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-1.5 font-medium">
                <span className="flex items-center space-x-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#FF3B30]" />
                  <span>Pending Withdrawals</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FF3B30]/10 text-[#FF3B30]">
                  {withdrawalStats.pending}
                </span>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-black text-[#FF3B30]">
                  ${withdrawalStats.pendingAmount.toLocaleString()}
                </span>
                <span className="text-[11px] text-[#8A8A8A]">USD</span>
              </div>
              <div className="text-[10px] text-[#8A8A8A] mt-2 flex items-center justify-between">
                <span>{withdrawalStats.approved} processed</span>
                <span className="text-[#FF3B30] font-bold">Filter →</span>
              </div>
            </div>
          )}

          {/* Card 4: Pending KYC */}
          {userRole !== 'finance_manager' && (
            <div 
              onClick={() => setApprovalDeskSection(approvalDeskSection === 'kyc' ? 'all' : 'kyc')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                approvalDeskSection === 'kyc'
                  ? 'bg-[#181818] border-cyan-400/50 shadow-lg ring-1 ring-cyan-400/20'
                  : 'bg-[#151515] border-[#222222] hover:border-cyan-400/30'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-1.5 font-medium">
                <span className="flex items-center space-x-1">
                  <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pending Real Name</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-400/10 text-cyan-400">
                  {kycStats.pending}
                </span>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-black text-cyan-400">
                  {kycStats.pending}
                </span>
                <span className="text-[11px] text-[#8A8A8A]">accounts</span>
              </div>
              <div className="text-[10px] text-[#8A8A8A] mt-2 flex items-center justify-between">
                <span>{kycStats.approved} verified</span>
                <span className="text-cyan-400 font-bold">Filter →</span>
              </div>
            </div>
          )}
        </div>

        {/* Desk View Switcher Pills */}
        <div className="flex items-center space-x-2 pt-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setApprovalDeskSection('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
              approvalDeskSection === 'all'
                ? 'bg-white text-black shadow-md'
                : 'bg-[#181818] text-[#8A8A8A] hover:text-white border border-[#2A2A2A]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Operational Desks</span>
            {totalPendingActionCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-black">
                {totalPendingActionCount}
              </span>
            )}
          </button>

          {userRole !== 'support' && (
            <button
              type="button"
              onClick={() => setApprovalDeskSection('deposits')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                approvalDeskSection === 'deposits'
                  ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/20'
                  : 'bg-[#181818] text-[#8A8A8A] hover:text-white border border-[#2A2A2A]'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Deposit Desk</span>
              {depositStats.pending > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${approvalDeskSection === 'deposits' ? 'bg-black text-[#00C853]' : 'bg-[#00C853] text-black'}`}>
                  {depositStats.pending}
                </span>
              )}
            </button>
          )}

          {userRole !== 'support' && (
            <button
              type="button"
              onClick={() => setApprovalDeskSection('withdrawals')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                approvalDeskSection === 'withdrawals'
                  ? 'bg-[#FF3B30] text-white shadow-md shadow-[#FF3B30]/20'
                  : 'bg-[#181818] text-[#8A8A8A] hover:text-white border border-[#2A2A2A]'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Withdrawal Desk</span>
              {withdrawalStats.pending > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${approvalDeskSection === 'withdrawals' ? 'bg-white text-[#FF3B30]' : 'bg-[#FF3B30] text-white'}`}>
                  {withdrawalStats.pending}
                </span>
              )}
            </button>
          )}

          {userRole !== 'finance_manager' && (
            <button
              type="button"
              onClick={() => setApprovalDeskSection('kyc')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                approvalDeskSection === 'kyc'
                  ? 'bg-cyan-400 text-black shadow-md shadow-cyan-400/20'
                  : 'bg-[#181818] text-[#8A8A8A] hover:text-white border border-[#2A2A2A]'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Identity & KYC Desk</span>
              {kycStats.pending > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${approvalDeskSection === 'kyc' ? 'bg-black text-cyan-400' : 'bg-cyan-400 text-black'}`}>
                  {kycStats.pending}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DEPOSIT APPROVAL DESK */}
      {/* ========================================================================= */}
      {showDeposits && (
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
            <div className="space-y-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#00C853]/10 border border-[#00C853]/30 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4 text-[#00C853]" />
                </div>
                <h3 className="font-extrabold text-base md:text-lg text-white">Deposit Approval Desk</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#1A1A1A] border border-[#333333] text-[#8A8A8A]">
                  {depositStats.total} total
                </span>
              </div>
              <p className="text-xs text-[#8A8A8A]">
                Verify incoming fiat / crypto deposit payment proofs & UTR reference codes before crediting user balances.
              </p>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user, UTR, amount..."
                  value={depositSearch}
                  onChange={(e) => setDepositSearch(e.target.value)}
                  className="w-full bg-[#181818] border border-[#2A2A2A] focus:border-[#00C853] text-white pl-8 pr-7 py-1.5 rounded-xl text-xs font-mono placeholder:font-sans placeholder:text-[#555555] outline-none transition-all"
                />
                {depositSearch && (
                  <button
                    type="button"
                    onClick={() => setDepositSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#777777] hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['all', 'pending', 'approved', 'rejected'] as const).map(f => {
                  const count = f === 'all' ? depositStats.total : f === 'pending' ? depositStats.pending : f === 'approved' ? depositStats.approved : depositStats.rejected;
                  const isActive = depositFilter === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setDepositFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                        isActive
                          ? f === 'pending' ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                          : f === 'approved' ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/20'
                          : f === 'rejected' ? 'bg-[#FF3B30] text-white shadow-md shadow-[#FF3B30]/20'
                          : 'bg-white text-black shadow-md'
                          : 'bg-[#181818] text-[#8A8A8A] hover:text-white border border-[#2A2A2A]'
                      }`}
                    >
                      <span>{f}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive ? 'bg-black/20 text-current' : 'bg-[#222222] text-[#8A8A8A]'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {filteredDeposits.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-[#161616]/50 rounded-2xl border border-dashed border-[#262626]">
              <div className="w-12 h-12 rounded-full bg-[#1F1F1F] border border-[#333333] flex items-center justify-center mx-auto text-[#666666]">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">No deposit requests found</p>
                <p className="text-xs text-[#8A8A8A]">
                  {depositSearch ? `No records match search term "${depositSearch}"` : `No records found with status "${depositFilter}"`}
                </p>
              </div>
              {(depositSearch || depositFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setDepositSearch('');
                    setDepositFilter('all');
                  }}
                  className="px-3 py-1.5 bg-[#222222] hover:bg-[#2A2A2A] text-xs font-bold text-[#00C853] rounded-xl border border-[#333333] transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Mobile View: Stacked Professional Cards */}
              <div className="block md:hidden space-y-3">
                {filteredDeposits.map((dep, idx) => {
                  const isPending = (dep.status || '').toLowerCase() === 'pending';
                  const isApproved = (dep.status || '').toLowerCase() === 'approved';
                  return (
                    <div key={`mob_dep_${dep.id}_${idx}`} className="bg-[#161616] border border-[#262626] rounded-2xl p-4 space-y-3 shadow-lg">
                      <div className="flex items-start justify-between border-b border-[#222222] pb-2.5">
                        <div className="space-y-0.5">
                          <span className="text-[#8A8A8A] text-[10px] font-mono block">SUBMISSION DATE (IST)</span>
                          <span className="text-white text-xs font-mono font-bold flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-[#777777]" />
                            <span>{formatIST(dep.createdAt)}</span>
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex items-center space-x-1 ${
                          isPending ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          isApproved ? 'bg-[#00C853]/20 text-[#00C853] border border-[#00C853]/30' :
                          'bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30'
                        }`}>
                          {isPending && <Clock className="w-2.5 h-2.5" />}
                          {isApproved && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {!isPending && !isApproved && <XCircle className="w-2.5 h-2.5" />}
                          <span>{dep.status}</span>
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs font-mono">
                        <div>
                          <span className="text-[#8A8A8A] text-[10px] block font-sans">CUSTOMER USER</span>
                          <div className="text-white font-sans font-bold break-all">{dep.userEmail}</div>
                          <div className="text-[#8A8A8A] text-[10px] flex items-center space-x-1 mt-0.5">
                            <span>ID: {dep.userId}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(dep.userId, `mob_dep_uid_${dep.id}`)}
                              className="text-[#666666] hover:text-white"
                              title="Copy User ID"
                            >
                              {copiedField === `mob_dep_uid_${dep.id}` ? <Check className="w-2.5 h-2.5 text-[#00C853]" /> : <Copy className="w-2.5 h-2.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#111111] p-2.5 rounded-xl border border-[#222222]">
                            <span className="text-[#8A8A8A] text-[10px] block font-sans">DEPOSIT AMOUNT</span>
                            <span className="text-[#00C853] font-black text-sm block">
                              ${dep.amount.toLocaleString()} {dep.currency}
                            </span>
                          </div>
                          <div className="bg-[#111111] p-2.5 rounded-xl border border-[#222222]">
                            <span className="text-[#8A8A8A] text-[10px] block font-sans">METHOD / GATEWAY</span>
                            <span className="text-white font-bold text-xs block truncate">{dep.method}</span>
                          </div>
                        </div>

                        <div className="bg-[#111111] p-2.5 rounded-xl border border-[#222222] flex items-center justify-between">
                          <div>
                            <span className="text-[#8A8A8A] text-[10px] block font-sans">UTR / TRANSACTION REF</span>
                            <span className="text-white font-bold text-xs break-all">{dep.utrNumber || 'N/A'}</span>
                          </div>
                          {dep.utrNumber && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(dep.utrNumber, `mob_dep_utr_${dep.id}`)}
                              className="p-1.5 bg-[#1C1C1C] hover:bg-[#2A2A2A] rounded-lg text-cyan-400 border border-[#333333]"
                              title="Copy UTR"
                            >
                              {copiedField === `mob_dep_utr_${dep.id}` ? <Check className="w-3.5 h-3.5 text-[#00C853]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-2 border-t border-[#222222]">
                        {dep.proofImage ? (
                          <button
                            type="button"
                            onClick={() => setImageModal({ url: dep.proofImage!, title: `Payment Proof - Deposit $${dep.amount}`, userEmail: dep.userEmail })}
                            className="w-full text-[#00C853] hover:text-white flex items-center justify-center space-x-1.5 text-xs font-bold bg-[#00C853]/10 hover:bg-[#00C853]/20 border border-[#00C853]/30 py-2.5 rounded-xl min-h-[44px] transition-all"
                          >
                            <ZoomIn className="w-4 h-4" />
                            <span>Inspect Payment Proof</span>
                          </button>
                        ) : (
                          <div className="text-[#8A8A8A] text-center text-[10px] py-2 bg-[#111111] rounded-xl border border-[#222222]">
                            No document proof attached
                          </div>
                        )}

                        {isPending && (
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => handleApproveDeposit(dep.id)}
                              className="py-2.5 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold rounded-xl text-xs flex items-center justify-center min-h-[44px] shadow-lg shadow-[#00C853]/20 transition-all cursor-pointer"
                            >
                              Approve Deposit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectDeposit(dep.id)}
                              className="py-2.5 bg-[#FF3B30]/15 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white border border-[#FF3B30]/30 font-bold rounded-xl text-xs flex items-center justify-center min-h-[44px] transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Standard Institutional Table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-[#222222]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#181818] border-b border-[#222222] text-[10px] uppercase font-bold tracking-wider text-[#8A8A8A]">
                      <th className="py-3 px-4">Date (IST)</th>
                      <th className="py-3 px-4">Customer User</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Method / Network</th>
                      <th className="py-3 px-4">UTR / Ref</th>
                      <th className="py-3 px-4">Payment Proof</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F1F] text-xs font-mono bg-[#141414]">
                    {filteredDeposits.map((dep, idx) => {
                      const isPending = (dep.status || '').toLowerCase() === 'pending';
                      const isApproved = (dep.status || '').toLowerCase() === 'approved';
                      return (
                        <tr key={`${dep.id}_${idx}`} className="hover:bg-[#1A1A1A]/70 transition-colors">
                          <td className="py-3.5 px-4 text-[#8A8A8A] text-[11px] whitespace-nowrap">
                            <div className="text-white font-bold">{formatIST(dep.createdAt)}</div>
                            <div className="text-[10px] text-[#666666] font-mono">ID: {dep.id}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white font-sans">{dep.userEmail}</div>
                            <div className="text-[10px] font-mono text-[#8A8A8A] flex items-center space-x-1 mt-0.5">
                              <span>ID: {dep.userId}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(dep.userId, `tbl_dep_uid_${dep.id}`)}
                                className="text-[#666666] hover:text-white"
                                title="Copy User ID"
                              >
                                {copiedField === `tbl_dep_uid_${dep.id}` ? <Check className="w-2.5 h-2.5 text-[#00C853]" /> : <Copy className="w-2.5 h-2.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-[#00C853] font-black text-sm">
                              ${dep.amount.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-[#8A8A8A] ml-1 font-bold">{dep.currency}</span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#1D1D1D] text-white border border-[#2D2D2D] text-[11px] font-sans font-medium">
                              <span>{dep.method}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-white font-bold bg-[#1A1A1A] px-2 py-1 rounded-lg border border-[#2A2A2A] text-[11px] max-w-[150px] truncate">
                                {dep.utrNumber || 'N/A'}
                              </span>
                              {dep.utrNumber && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(dep.utrNumber, `tbl_dep_utr_${dep.id}`)}
                                  className="p-1 hover:bg-[#2A2A2A] rounded text-[#8A8A8A] hover:text-cyan-400"
                                  title="Copy UTR Number"
                                >
                                  {copiedField === `tbl_dep_utr_${dep.id}` ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {dep.proofImage ? (
                              <button
                                type="button"
                                onClick={() => setImageModal({ url: dep.proofImage!, title: `Payment Proof - Deposit $${dep.amount}`, userEmail: dep.userEmail })}
                                className="text-[#00C853] hover:text-white flex items-center space-x-1.5 text-[11px] font-bold bg-[#00C853]/10 hover:bg-[#00C853]/20 border border-[#00C853]/30 px-2.5 py-1.5 rounded-lg transition-all"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                                <span>Inspect Proof</span>
                              </button>
                            ) : (
                              <span className="text-[#666666] text-[11px]">No proof</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              isPending ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                              isApproved ? 'bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30' :
                              'bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/30'
                            }`}>
                              {isPending && <Clock className="w-2.5 h-2.5" />}
                              {isApproved && <CheckCircle2 className="w-2.5 h-2.5" />}
                              {!isPending && !isApproved && <XCircle className="w-2.5 h-2.5" />}
                              <span>{dep.status}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveDeposit(dep.id)}
                                  className="px-3 py-1.5 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold rounded-lg text-xs shadow-md shadow-[#00C853]/20 transition-all cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectDeposit(dep.id)}
                                  className="px-3 py-1.5 bg-[#FF3B30]/15 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white border border-[#FF3B30]/30 font-bold rounded-lg text-xs transition-all cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-[#666666]">Processed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. WITHDRAWAL APPROVAL DESK */}
      {/* ========================================================================= */}
      {showWithdrawals && (
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
            <div className="space-y-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FF3B30]/10 border border-[#FF3B30]/30 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-[#FF3B30]" />
                </div>
                <h3 className="font-extrabold text-base md:text-lg text-white">Withdrawal Approval Desk</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#1A1A1A] border border-[#333333] text-[#8A8A8A]">
                  {withdrawalStats.total} total
                </span>
              </div>
              <p className="text-xs text-[#8A8A8A]">
                Compliance auditing desk for outgoing fiat bank transfers, UPI payouts, and crypto network settlements.
              </p>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user, bank, account, UPI..."
                  value={withdrawalSearch}
                  onChange={(e) => setWithdrawalSearch(e.target.value)}
                  className="w-full bg-[#181818] border border-[#2A2A2A] focus:border-[#FF3B30] text-white pl-8 pr-7 py-1.5 rounded-xl text-xs font-mono placeholder:font-sans placeholder:text-[#555555] outline-none transition-all"
                />
                {withdrawalSearch && (
                  <button
                    type="button"
                    onClick={() => setWithdrawalSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#777777] hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['all', 'pending', 'approved', 'rejected'] as const).map(f => {
                  const count = f === 'all' ? withdrawalStats.total : f === 'pending' ? withdrawalStats.pending : f === 'approved' ? withdrawalStats.approved : withdrawalStats.rejected;
                  const isActive = withdrawalFilter === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setWithdrawalFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                        isActive
                          ? f === 'pending' ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                          : f === 'approved' ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/20'
                          : f === 'rejected' ? 'bg-[#FF3B30] text-white shadow-md shadow-[#FF3B30]/20'
                          : 'bg-white text-black shadow-md'
                          : 'bg-[#181818] text-[#8A8A8A] hover:text-white border border-[#2A2A2A]'
                      }`}
                    >
                      <span>{f === 'rejected' ? 'Rejected' : f}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive ? 'bg-black/20 text-current' : 'bg-[#222222] text-[#8A8A8A]'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {filteredWithdrawals.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-[#161616]/50 rounded-2xl border border-dashed border-[#262626]">
              <div className="w-12 h-12 rounded-full bg-[#1F1F1F] border border-[#333333] flex items-center justify-center mx-auto text-[#666666]">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">No withdrawal requests found</p>
                <p className="text-xs text-[#8A8A8A]">
                  {withdrawalSearch ? `No records match search term "${withdrawalSearch}"` : `No records found with status "${withdrawalFilter}"`}
                </p>
              </div>
              {(withdrawalSearch || withdrawalFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawalSearch('');
                    setWithdrawalFilter('all');
                  }}
                  className="px-3 py-1.5 bg-[#222222] hover:bg-[#2A2A2A] text-xs font-bold text-[#FF3B30] rounded-xl border border-[#333333] transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Mobile View: Stacked Cards */}
              <div className="block md:hidden space-y-3">
                {filteredWithdrawals.map((wd, idx) => {
                  const isPending = (wd.status || '').toLowerCase() === 'pending';
                  const isApproved = (wd.status || '').toLowerCase() === 'approved';
                  const d = getWithdrawalDetails(wd);
                  return (
                    <div key={`mob_wd_${wd.id}_${idx}`} className="bg-[#161616] border border-[#262626] rounded-2xl p-4 space-y-3 shadow-lg">
                      <div className="flex items-start justify-between border-b border-[#222222] pb-2.5">
                        <div className="space-y-0.5">
                          <span className="text-[#8A8A8A] text-[10px] font-mono block">REQUEST DATE & ID</span>
                          <span className="text-white text-xs font-mono font-bold flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-[#777777]" />
                            <span>{formatIST(wd.createdAt)}</span>
                          </span>
                          <span className="text-[10px] text-[#666666] font-mono block">ID: {wd.id}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex items-center space-x-1 ${
                          isPending ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          isApproved ? 'bg-[#00C853]/20 text-[#00C853] border border-[#00C853]/30' :
                          'bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30'
                        }`}>
                          {isPending && <Clock className="w-2.5 h-2.5" />}
                          {isApproved && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {!isPending && !isApproved && <XCircle className="w-2.5 h-2.5" />}
                          <span>{wd.status}</span>
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs font-mono">
                        <div>
                          <span className="text-[#8A8A8A] text-[10px] block font-sans">CUSTOMER ACCOUNT</span>
                          <div className="text-white font-sans font-bold break-all">{wd.userEmail}</div>
                          <div className="text-[#8A8A8A] text-[10px] mt-0.5">User ID: {wd.userId}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#111111] p-2.5 rounded-xl border border-[#222222]">
                            <span className="text-[#8A8A8A] text-[10px] block font-sans">AMOUNT</span>
                            <span className="text-[#FF3B30] font-black text-sm block">
                              ${wd.amount.toLocaleString()} {wd.currency}
                            </span>
                            {d.payoutAmountInr && (
                              <span className="text-[#00C853] text-[10px] font-bold block mt-0.5">≈ ₹{d.payoutAmountInr} INR</span>
                            )}
                          </div>
                          <div className="bg-[#111111] p-2.5 rounded-xl border border-[#222222]">
                            <span className="text-[#8A8A8A] text-[10px] block font-sans">PAYOUT METHOD</span>
                            {d.method === 'bank_transfer' ? (
                              <span className="text-amber-400 font-bold flex items-center space-x-1 text-xs">
                                <Building2 className="w-3.5 h-3.5 inline shrink-0" />
                                <span>Bank (IMPS)</span>
                              </span>
                            ) : d.method === 'upi' ? (
                              <span className="text-cyan-400 font-bold flex items-center space-x-1 text-xs">
                                <Smartphone className="w-3.5 h-3.5 inline shrink-0" />
                                <span>Instant UPI</span>
                              </span>
                            ) : (
                              <span className="text-purple-400 font-bold flex items-center space-x-1 text-xs">
                                <Coins className="w-3.5 h-3.5 inline shrink-0" />
                                <span className="truncate">{d.cryptoNetwork}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Structured Destination Card */}
                        <div className="bg-[#111111] p-3 rounded-xl border border-[#262626] space-y-2">
                          <div className="flex items-center justify-between border-b border-[#222222] pb-1.5">
                            <span className="text-[#8A8A8A] text-[10px] font-bold font-sans uppercase">
                              {d.method === 'bank_transfer' ? 'Bank Destination' : d.method === 'upi' ? 'UPI Destination' : 'Crypto Destination'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedWithdrawalModal(wd)}
                              className="text-cyan-400 hover:underline text-[10px] font-bold"
                            >
                              View Full Snapshot →
                            </button>
                          </div>

                          {d.method === 'bank_transfer' ? (
                            <div className="space-y-1.5 text-[11px]">
                              <div className="flex justify-between gap-2">
                                <span className="text-[#8A8A8A]">Bank:</span>
                                <span className="text-white font-bold truncate">{d.bankName || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-[#8A8A8A]">Beneficiary:</span>
                                <span className="text-white font-bold truncate">{d.accountHolderName || 'N/A'}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 bg-[#1A1A1A] px-2 py-1 rounded">
                                <span className="text-white font-bold">{d.accountNumber || 'N/A'}</span>
                                {d.accountNumber && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(d.accountNumber, `mob_wd_acc_${wd.id}`)}
                                    className="p-1 text-cyan-400"
                                  >
                                    {copiedField === `mob_wd_acc_${wd.id}` ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                              {d.upiId && (
                                <div className="flex items-center justify-between gap-2 bg-[#1A1A1A] px-2 py-1 rounded">
                                  <div className="flex items-center space-x-1 truncate">
                                    <span className="text-[#8A8A8A] text-[10px]">UPI:</span>
                                    <span className="text-cyan-400 font-bold font-mono text-[10px]">{d.upiId}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(d.upiId, `mob_wd_upi_${wd.id}`)}
                                    className="p-1 text-cyan-400"
                                  >
                                    {copiedField === `mob_wd_upi_${wd.id}` ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : d.method === 'upi' ? (
                            <div className="space-y-1.5 text-[11px]">
                              <div className="flex justify-between gap-2">
                                <span className="text-[#8A8A8A]">Beneficiary:</span>
                                <span className="text-white font-bold truncate">{d.accountHolderName || 'N/A'}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 bg-[#1A1A1A] px-2 py-1 rounded">
                                <span className="text-white font-bold break-all">{d.upiId || d.destinationAddress}</span>
                                {(d.upiId || d.destinationAddress) && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(d.upiId || d.destinationAddress, `mob_wd_upi_${wd.id}`)}
                                    className="p-1 text-cyan-400"
                                  >
                                    {copiedField === `mob_wd_upi_${wd.id}` ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5 text-[11px]">
                              <div className="flex justify-between gap-2">
                                <span className="text-[#8A8A8A]">Network:</span>
                                <span className="text-purple-400 font-bold">{d.cryptoNetwork}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 bg-[#1A1A1A] px-2 py-1 rounded">
                                <span className="text-white font-bold break-all text-[10px]">{d.destinationAddress || wd.destination}</span>
                                {(d.destinationAddress || wd.destination) && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(d.destinationAddress || wd.destination, `mob_wd_crypto_${wd.id}`)}
                                    className="p-1 text-cyan-400"
                                  >
                                    {copiedField === `mob_wd_crypto_${wd.id}` ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-2 border-t border-[#222222]">
                        {wd.proofImage && (
                          <button
                            type="button"
                            onClick={() => setImageModal({ url: wd.proofImage!, title: `Withdrawal Proof - $${wd.amount}`, userEmail: wd.userEmail })}
                            className="w-full text-[#00C853] hover:underline flex items-center justify-center space-x-1 text-xs font-bold bg-[#00C853]/10 border border-[#00C853]/30 py-2.5 rounded-xl min-h-[44px]"
                          >
                            <ZoomIn className="w-4 h-4" />
                            <span>Inspect Verification Proof</span>
                          </button>
                        )}

                        {isPending && (
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => setSelectedWithdrawalModal(wd)}
                              className="py-2.5 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold rounded-xl text-xs flex items-center justify-center min-h-[44px] shadow-lg shadow-[#00C853]/20 cursor-pointer"
                            >
                              Review & Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const reason = prompt("Enter rejection reason for customer refund:", "Compliance verification failed / invalid bank details");
                                if (reason !== null) {
                                  handleRejectWithdrawal(wd.id, reason);
                                }
                              }}
                              className="py-2.5 bg-[#FF3B30]/15 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white border border-[#FF3B30]/30 font-bold rounded-xl text-xs flex items-center justify-center min-h-[44px] cursor-pointer"
                            >
                              Reject & Refund
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Standard Institutional Table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-[#222222]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#181818] border-b border-[#222222] text-[10px] uppercase font-bold tracking-wider text-[#8A8A8A]">
                      <th className="py-3 px-4">Date / Ref ID</th>
                      <th className="py-3 px-4">Customer Account</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4 min-w-[280px]">Destination Details</th>
                      <th className="py-3 px-4">Proof</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F1F] text-xs font-mono bg-[#141414]">
                    {filteredWithdrawals.map((wd, idx) => {
                      const isPending = (wd.status || '').toLowerCase() === 'pending';
                      const isApproved = (wd.status || '').toLowerCase() === 'approved';
                      const d = getWithdrawalDetails(wd);
                      return (
                        <tr key={`${wd.id}_${idx}`} className="hover:bg-[#1A1A1A]/70 transition-colors">
                          <td className="py-3.5 px-4 text-[#8A8A8A] text-[11px] whitespace-nowrap">
                            <div className="text-white font-bold">{formatIST(wd.createdAt)}</div>
                            <div className="text-[10px] text-[#666666] font-mono flex items-center space-x-1">
                              <span>ID: {wd.id}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(wd.id, `tbl_wd_id_${wd.id}`)}
                                className="text-[#666666] hover:text-white"
                                title="Copy Request ID"
                              >
                                {copiedField === `tbl_wd_id_${wd.id}` ? <Check className="w-2.5 h-2.5 text-[#00C853]" /> : <Copy className="w-2.5 h-2.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white font-sans">{wd.userEmail}</div>
                            <div className="text-[10px] font-mono text-[#8A8A8A]">User ID: {wd.userId}</div>
                          </td>
                          <td className="py-3.5 px-4 text-[#FF3B30] font-bold whitespace-nowrap">
                            <div className="font-black text-sm">${wd.amount.toLocaleString()} {wd.currency}</div>
                            {d.payoutAmountInr && (
                              <div className="text-[#00C853] text-[10px] font-bold">≈ ₹{d.payoutAmountInr} INR</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {d.method === 'bank_transfer' ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-sans font-bold">
                                <Building2 className="w-3.5 h-3.5" />
                                <span>Bank Transfer</span>
                              </span>
                            ) : d.method === 'upi' ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 text-[11px] font-sans font-bold">
                                <Smartphone className="w-3.5 h-3.5" />
                                <span>Instant UPI</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-400/10 text-purple-400 border border-purple-400/20 text-[11px] font-sans font-bold">
                                <Coins className="w-3.5 h-3.5" />
                                <span>{d.cryptoNetwork}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-white">
                            {d.method === 'bank_transfer' ? (
                              <div className="space-y-1.5 bg-[#181818] p-2.5 rounded-xl border border-[#282828] text-[11px]">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[#8A8A8A]">Bank: <strong className="text-white">{d.bankName || 'N/A'}</strong></span>
                                  <span className="text-[#8A8A8A]">Holder: <strong className="text-white">{d.accountHolderName || 'N/A'}</strong></span>
                                </div>
                                <div className="flex items-center justify-between gap-2 bg-[#101010] px-2 py-1 rounded border border-[#222222]">
                                  <div className="flex items-center space-x-1.5 truncate">
                                    <span className="text-[#8A8A8A] text-[10px]">A/C:</span>
                                    <span className="text-white font-bold">{d.accountNumber || 'N/A'}</span>
                                  </div>
                                  {d.accountNumber && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(d.accountNumber, `tbl_acc_${wd.id}`)}
                                      className="p-1 hover:bg-[#222222] rounded text-cyan-400"
                                      title="Copy Account Number"
                                    >
                                      {copiedField === `tbl_acc_${wd.id}` ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-2 bg-[#101010] px-2 py-1 rounded border border-[#222222]">
                                  <div className="flex items-center space-x-1.5 truncate">
                                    <span className="text-[#8A8A8A] text-[10px]">IFSC/SWIFT:</span>
                                    <span className="text-white font-bold">{d.ifscCode || 'N/A'}</span>
                                  </div>
                                  {d.ifscCode && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(d.ifscCode, `tbl_ifsc_${wd.id}`)}
                                      className="p-1 hover:bg-[#222222] rounded text-cyan-400"
                                      title="Copy IFSC Code"
                                    >
                                      {copiedField === `tbl_ifsc_${wd.id}` ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  )}
                                </div>
                                {d.upiId && (
                                  <div className="flex items-center justify-between gap-2 bg-[#101010] px-2 py-1 rounded border border-[#222222]">
                                    <div className="flex items-center space-x-1.5 truncate">
                                      <span className="text-[#8A8A8A] text-[10px]">UPI:</span>
                                      <span className="text-cyan-400 font-bold font-mono text-[10px]">{d.upiId}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(d.upiId, `tbl_upi_${wd.id}`)}
                                      className="p-1 hover:bg-[#222222] rounded text-cyan-400"
                                      title="Copy UPI ID"
                                    >
                                      {copiedField === `tbl_upi_${wd.id}` ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  </div>
                                )}
                                <div className="text-[10px] text-[#8A8A8A] flex justify-between pt-0.5">
                                  <span>Type: <span className="text-[#CCCCCC] uppercase">{d.accountType || 'Standard'}</span></span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedWithdrawalModal(wd)}
                                    className="text-cyan-400 hover:underline font-bold"
                                  >
                                    Full Details →
                                  </button>
                                </div>
                              </div>
                            ) : d.method === 'upi' ? (
                              <div className="space-y-1.5 bg-[#181818] p-2.5 rounded-xl border border-[#282828] text-[11px]">
                                <div className="flex justify-between">
                                  <span className="text-[#8A8A8A]">Beneficiary:</span>
                                  <span className="text-white font-bold">{d.accountHolderName || 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between bg-[#101010] px-2 py-1 rounded border border-[#222222]">
                                  <span className="text-white font-bold break-all">{d.upiId || d.destinationAddress}</span>
                                  {(d.upiId || d.destinationAddress) && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(d.upiId || d.destinationAddress, `tbl_upi_${wd.id}`)}
                                      className="p-1 hover:bg-[#222222] rounded text-cyan-400"
                                      title="Copy UPI ID"
                                    >
                                      {copiedField === `tbl_upi_${wd.id}` ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5 bg-[#181818] p-2.5 rounded-xl border border-[#282828] text-[11px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-[#8A8A8A] text-[10px]">Network: <strong className="text-purple-400">{d.cryptoNetwork}</strong></span>
                                  {d.destinationAddress && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(d.destinationAddress, `tbl_crypto_${wd.id}`)}
                                      className="text-[10px] text-cyan-400 hover:underline flex items-center space-x-1"
                                    >
                                      {copiedField === `tbl_crypto_${wd.id}` ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                                      <span>Copy</span>
                                    </button>
                                  )}
                                </div>
                                <div className="text-white font-bold break-all text-[11px] bg-[#101010] p-1.5 rounded border border-[#222222]">
                                  {d.destinationAddress || wd.destination}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {wd.proofImage ? (
                              <button
                                type="button"
                                onClick={() => setImageModal({ url: wd.proofImage!, title: `Withdrawal Proof - $${wd.amount}`, userEmail: wd.userEmail })}
                                className="text-[#00C853] hover:text-white flex items-center space-x-1.5 text-[11px] font-bold bg-[#00C853]/10 hover:bg-[#00C853]/20 border border-[#00C853]/30 px-2.5 py-1.5 rounded-lg transition-all"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>
                            ) : (
                              <span className="text-[#666666] text-[10px]">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              isPending ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                              isApproved ? 'bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30' :
                              'bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/30'
                            }`}>
                              {isPending && <Clock className="w-2.5 h-2.5" />}
                              {isApproved && <CheckCircle2 className="w-2.5 h-2.5" />}
                              {!isPending && !isApproved && <XCircle className="w-2.5 h-2.5" />}
                              <span>{wd.status}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedWithdrawalModal(wd)}
                              className="px-2.5 py-1.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-cyan-400 border border-cyan-400/30 rounded-lg text-xs font-bold transition-all"
                            >
                              Snapshot
                            </button>
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setSelectedWithdrawalModal(wd)}
                                  className="px-3 py-1.5 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold rounded-lg text-xs shadow-md shadow-[#00C853]/20 transition-all cursor-pointer"
                                >
                                  Review & Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const reason = prompt("Enter rejection reason for customer refund:", "Compliance verification failed / invalid bank details");
                                    if (reason !== null) {
                                      handleRejectWithdrawal(wd.id, reason);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-[#FF3B30]/15 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white border border-[#FF3B30]/30 font-bold rounded-lg text-xs transition-all cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REAL NAME AUTHENTICATION DESK (KYC) */}
      {/* ========================================================================= */}
      {showKYC && (
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
            <div className="space-y-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
                  <FileCheck className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="font-extrabold text-base md:text-lg text-white">Real Name Authentication Desk</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#1A1A1A] border border-[#333333] text-[#8A8A8A]">
                  {kycStats.total} total
                </span>
              </div>
              <p className="text-xs text-[#8A8A8A]">
                Inspect uploaded national IDs, passports, driver's licenses, and identity documents for institutional KYC clearance.
              </p>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, email, doc no..."
                  value={kycSearch}
                  onChange={(e) => setKycSearch(e.target.value)}
                  className="w-full bg-[#181818] border border-[#2A2A2A] focus:border-cyan-400 text-white pl-8 pr-7 py-1.5 rounded-xl text-xs font-mono placeholder:font-sans placeholder:text-[#555555] outline-none transition-all"
                />
                {kycSearch && (
                  <button
                    type="button"
                    onClick={() => setKycSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#777777] hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['all', 'pending', 'approved', 'rejected'] as const).map(f => {
                  const count = f === 'all' ? kycStats.total : f === 'pending' ? kycStats.pending : f === 'approved' ? kycStats.approved : kycStats.rejected;
                  const isActive = kycFilter === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setKycFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                        isActive
                          ? f === 'pending' ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                          : f === 'approved' ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/20'
                          : f === 'rejected' ? 'bg-[#FF3B30] text-white shadow-md shadow-[#FF3B30]/20'
                          : 'bg-cyan-400 text-black shadow-md shadow-cyan-400/20'
                          : 'bg-[#181818] text-[#8A8A8A] hover:text-white border border-[#2A2A2A]'
                      }`}
                    >
                      <span>{f === 'approved' ? 'Verified' : f}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive ? 'bg-black/20 text-current' : 'bg-[#222222] text-[#8A8A8A]'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {filteredKYC.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-[#161616]/50 rounded-2xl border border-dashed border-[#262626]">
              <div className="w-12 h-12 rounded-full bg-[#1F1F1F] border border-[#333333] flex items-center justify-center mx-auto text-[#666666]">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">No authentication submissions found</p>
                <p className="text-xs text-[#8A8A8A]">
                  {kycSearch ? `No records match search term "${kycSearch}"` : `No records found with filter "${kycFilter}"`}
                </p>
              </div>
              {(kycSearch || kycFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setKycSearch('');
                    setKycFilter('all');
                  }}
                  className="px-3 py-1.5 bg-[#222222] hover:bg-[#2A2A2A] text-xs font-bold text-cyan-400 rounded-xl border border-[#333333] transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Mobile View: Stacked KYC Cards */}
              <div className="block md:hidden space-y-3">
                {filteredKYC.map((kyc, idx) => {
                  const s = (kyc.status || '').toLowerCase();
                  const isPending = s === 'pending' || s === 'submitted';
                  const isApproved = s === 'approved' || s === 'verified';
                  const frontImg = kyc.idFront || kyc.idFrontImage;
                  const backImg = kyc.idBack || kyc.idBackImage;

                  return (
                    <div key={`mob_kyc_${kyc.id || kyc.userId}_${idx}`} className="bg-[#161616] border border-[#262626] rounded-2xl p-4 space-y-3 shadow-lg">
                      <div className="flex items-start justify-between border-b border-[#222222] pb-2.5">
                        <div className="space-y-0.5">
                          <span className="text-[#8A8A8A] text-[10px] font-mono block">SUBMITTED (IST)</span>
                          <span className="text-white text-xs font-mono font-bold flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-[#777777]" />
                            <span>{kyc.submittedAt ? formatIST(kyc.submittedAt) : 'Recent'}</span>
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex items-center space-x-1 ${
                          isPending ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          isApproved ? 'bg-[#00C853]/20 text-[#00C853] border border-[#00C853]/30' :
                          'bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30'
                        }`}>
                          {isPending && <Clock className="w-2.5 h-2.5" />}
                          {isApproved && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {!isPending && !isApproved && <XCircle className="w-2.5 h-2.5" />}
                          <span>{kyc.status}</span>
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs font-mono">
                        <div>
                          <span className="text-[#8A8A8A] text-[10px] block font-sans">LEGAL FULL NAME</span>
                          <div className="text-white font-sans font-bold text-sm">{kyc.fullName}</div>
                          <div className="text-cyan-400 text-[11px] break-all">{kyc.userEmail}</div>
                          {kyc.country && (
                            <div className="text-[#8A8A8A] text-[10px] font-sans mt-0.5">
                              Country of Origin: <strong className="text-white">{kyc.country}</strong>
                            </div>
                          )}
                        </div>

                        <div className="bg-[#111111] p-2.5 rounded-xl border border-[#222222]">
                          <span className="text-[#8A8A8A] text-[10px] block font-sans">DOCUMENT TYPE & IDENTIFIER</span>
                          <span className="text-white font-bold uppercase text-xs">{(kyc.documentType || 'Identity Document').replace('_', ' ')}</span>
                          {kyc.documentNumber && (
                            <div className="text-[#00C853] font-bold text-xs mt-0.5 flex items-center justify-between">
                              <span>No: {kyc.documentNumber}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(kyc.documentNumber, `mob_kyc_num_${kyc.userId}`)}
                                className="text-[#666666] hover:text-white"
                                title="Copy Document Number"
                              >
                                {copiedField === `mob_kyc_num_${kyc.userId}` ? <Check className="w-2.5 h-2.5 text-[#00C853]" /> : <Copy className="w-2.5 h-2.5" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Document Images Side-by-Side */}
                      <div className="pt-2 border-t border-[#222222] space-y-2">
                        <span className="text-[#8A8A8A] text-[10px] block font-sans font-bold uppercase">DOCUMENT ATTACHMENTS</span>
                        <div className="grid grid-cols-2 gap-2">
                          {frontImg ? (
                            <button
                              type="button"
                              onClick={() => setImageModal({ url: frontImg, title: `Front ID Document - ${kyc.fullName}`, userEmail: kyc.userEmail })}
                              className="bg-[#111111] border border-[#222222] hover:border-cyan-400/50 rounded-xl p-2 flex flex-col items-center justify-center gap-1.5 transition-all"
                            >
                              <img src={frontImg} alt="ID Front" className="w-full h-16 object-cover rounded-lg border border-[#2A2A2A]" />
                              <span className="text-[11px] text-cyan-400 font-bold flex items-center space-x-1">
                                <ZoomIn className="w-3 h-3" />
                                <span>Front ID</span>
                              </span>
                            </button>
                          ) : (
                            <div className="bg-[#111111] border border-[#222222] rounded-xl p-3 text-center text-[#666666] text-[10px] flex items-center justify-center min-h-[80px]">
                              No Front ID
                            </div>
                          )}

                          {backImg ? (
                            <button
                              type="button"
                              onClick={() => setImageModal({ url: backImg, title: `Back ID Document - ${kyc.fullName}`, userEmail: kyc.userEmail })}
                              className="bg-[#111111] border border-[#222222] hover:border-cyan-400/50 rounded-xl p-2 flex flex-col items-center justify-center gap-1.5 transition-all"
                            >
                              <img src={backImg} alt="ID Back" className="w-full h-16 object-cover rounded-lg border border-[#2A2A2A]" />
                              <span className="text-[11px] text-cyan-400 font-bold flex items-center space-x-1">
                                <ZoomIn className="w-3 h-3" />
                                <span>Back ID</span>
                              </span>
                            </button>
                          ) : (
                            <div className="bg-[#111111] border border-[#222222] rounded-xl p-3 text-center text-[#666666] text-[10px] flex items-center justify-center min-h-[80px]">
                              No Back ID
                            </div>
                          )}
                        </div>

                        {isPending && (
                          <div className="grid grid-cols-2 gap-2 mt-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleApproveKYC(kyc.userId)}
                              className="py-2.5 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold rounded-xl text-xs flex items-center justify-center min-h-[44px] shadow-lg shadow-[#00C853]/20 cursor-pointer"
                            >
                              Approve KYC
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectKYC(kyc.userId)}
                              className="py-2.5 bg-[#FF3B30]/15 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white border border-[#FF3B30]/30 font-bold rounded-xl text-xs flex items-center justify-center min-h-[44px] cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Standard Institutional Table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-[#222222]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#181818] border-b border-[#222222] text-[10px] uppercase font-bold tracking-wider text-[#8A8A8A]">
                      <th className="py-3 px-4">Submitted (IST)</th>
                      <th className="py-3 px-4">User / Legal Name</th>
                      <th className="py-3 px-4">Doc Type & Identifier</th>
                      <th className="py-3 px-4 min-w-[260px]">Document Proofs</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F1F] text-xs font-mono bg-[#141414]">
                    {filteredKYC.map((kyc, idx) => {
                      const s = (kyc.status || '').toLowerCase();
                      const isPending = s === 'pending' || s === 'submitted';
                      const isApproved = s === 'approved' || s === 'verified';
                      const frontImg = kyc.idFront || kyc.idFrontImage;
                      const backImg = kyc.idBack || kyc.idBackImage;

                      return (
                        <tr key={`${kyc.id || kyc.userId}_${idx}`} className="hover:bg-[#1A1A1A]/70 transition-colors">
                          <td className="py-3.5 px-4 text-[#8A8A8A] text-[11px] whitespace-nowrap">
                            <div className="text-white font-bold">{kyc.submittedAt ? formatIST(kyc.submittedAt) : 'Recent'}</div>
                            <div className="text-[10px] text-[#666666] font-mono">ID: {kyc.userId}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white font-sans text-sm">{kyc.fullName}</div>
                            <div className="text-[11px] text-cyan-400 font-sans">{kyc.userEmail}</div>
                            {kyc.country && (
                              <div className="text-[10px] text-[#8A8A8A] font-sans mt-0.5">
                                Country: <span className="text-[#CCCCCC] font-medium">{kyc.country}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-bold text-white uppercase block text-xs">
                              {(kyc.documentType || 'Identity Document').replace('_', ' ')}
                            </span>
                            {kyc.documentNumber && (
                              <div className="text-[#8A8A8A] text-[11px] flex items-center space-x-1 mt-0.5">
                                <span>No: {kyc.documentNumber}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(kyc.documentNumber, `tbl_kyc_num_${kyc.userId}`)}
                                  className="text-[#666666] hover:text-white"
                                  title="Copy Document Number"
                                >
                                  {copiedField === `tbl_kyc_num_${kyc.userId}` ? <Check className="w-2.5 h-2.5 text-[#00C853]" /> : <Copy className="w-2.5 h-2.5" />}
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              {frontImg ? (
                                <div className="flex items-center space-x-2 bg-[#181818] p-1.5 rounded-xl border border-[#2A2A2A]">
                                  <img
                                    src={frontImg}
                                    alt="Front ID"
                                    onClick={() => setImageModal({ url: frontImg, title: `Front ID Document - ${kyc.fullName}`, userEmail: kyc.userEmail })}
                                    className="w-14 h-10 object-cover rounded-lg border border-[#333333] hover:border-cyan-400 cursor-pointer transition-all shrink-0"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setImageModal({ url: frontImg, title: `Front ID Document - ${kyc.fullName}`, userEmail: kyc.userEmail })}
                                    className="px-2 py-1 bg-[#222222] hover:bg-[#333333] text-cyan-400 rounded-lg text-[10px] font-bold flex items-center space-x-1"
                                  >
                                    <ZoomIn className="w-3 h-3" />
                                    <span>Front</span>
                                  </button>
                                </div>
                              ) : null}

                              {backImg ? (
                                <div className="flex items-center space-x-2 bg-[#181818] p-1.5 rounded-xl border border-[#2A2A2A]">
                                  <img
                                    src={backImg}
                                    alt="Back ID"
                                    onClick={() => setImageModal({ url: backImg, title: `Back ID Document - ${kyc.fullName}`, userEmail: kyc.userEmail })}
                                    className="w-14 h-10 object-cover rounded-lg border border-[#333333] hover:border-cyan-400 cursor-pointer transition-all shrink-0"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setImageModal({ url: backImg, title: `Back ID Document - ${kyc.fullName}`, userEmail: kyc.userEmail })}
                                    className="px-2 py-1 bg-[#222222] hover:bg-[#333333] text-cyan-400 rounded-lg text-[10px] font-bold flex items-center space-x-1"
                                  >
                                    <ZoomIn className="w-3 h-3" />
                                    <span>Back</span>
                                  </button>
                                </div>
                              ) : null}

                              {!frontImg && !backImg && (
                                <span className="text-xs text-amber-400/80 font-mono italic">No ID Images Attached</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              isPending ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                              isApproved ? 'bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30' :
                              'bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/30'
                            }`}>
                              {isPending && <Clock className="w-2.5 h-2.5" />}
                              {isApproved && <CheckCircle2 className="w-2.5 h-2.5" />}
                              {!isPending && !isApproved && <XCircle className="w-2.5 h-2.5" />}
                              <span>{kyc.status}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveKYC(kyc.userId)}
                                  className="px-3 py-1.5 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold rounded-lg text-xs shadow-md shadow-[#00C853]/20 transition-all cursor-pointer"
                                >
                                  Approve KYC
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectKYC(kyc.userId)}
                                  className="px-3 py-1.5 bg-[#FF3B30]/15 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white border border-[#FF3B30]/30 font-bold rounded-lg text-xs transition-all cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-[#666666]">Reviewed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
