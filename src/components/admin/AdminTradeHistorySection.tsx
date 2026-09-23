import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  User,
  Shield,
  Layers,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ExternalLink,
  Edit3,
  Plus,
  Trash2,
  Sliders,
  Eye
} from 'lucide-react';
import { AdminTradeItem, Transaction, User as UserType } from '../../types';
import { apiService } from '../../services/api';
import { formatIST } from '../../utils/dateUtils';
import { formatLots } from '../../utils/marginUtils';
import { TradeDetailsModal } from './TradeDetailsModal';
import { CorrectTradeModal } from './CorrectTradeModal';
import { EditTradeModal } from './EditTradeModal';
import { CreateTradeModal } from './CreateTradeModal';
import { DeleteTradeModal } from './DeleteTradeModal';
import { TradeAuditModal } from './TradeAuditModal';
import { AccountActivityView } from './AccountActivityView';

interface AdminTradeHistorySectionProps {
  currentUserRole?: string;
  onOpenLiveTradeEditor?: (positionId: string) => void;
  initialUserId?: string | null;
}

export const AdminTradeHistorySection: React.FC<AdminTradeHistorySectionProps> = ({
  currentUserRole = 'admin',
  onOpenLiveTradeEditor,
  initialUserId = null
}) => {
  // Navigation Tabs inside Trade History
  const [activeTab, setActiveTab] = useState<'trade_history' | 'account_activity' | 'open_trades' | 'deposits' | 'withdrawals' | 'balance_history' | 'audit_history'>(
    initialUserId ? 'account_activity' : 'trade_history'
  );

  // Selected User for Account Activity view
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId);

  // Data states
  const [trades, setTrades] = useState<AdminTradeItem[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<(UserType & { wallet?: any })[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modals
  const [detailModalTrade, setDetailModalTrade] = useState<AdminTradeItem | null>(null);
  const [correctModalTrade, setCorrectModalTrade] = useState<AdminTradeItem | null>(null);
  const [editModalTrade, setEditModalTrade] = useState<AdminTradeItem | null>(null);
  const [deleteModalTrade, setDeleteModalTrade] = useState<AdminTradeItem | null>(null);
  const [auditModalTrade, setAuditModalTrade] = useState<AdminTradeItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterSymbol, setFilterSymbol] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<string>('all');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [filterCorrectedOnly, setFilterCorrectedOnly] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  const canCorrectTrade = ['admin', 'co_admin', 'trade_controller'].includes((currentUserRole || '').toLowerCase());

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [tradesData, txsData, auditData, usersData] = await Promise.all([
        apiService.getAdminTrades().catch(() => []),
        apiService.getAdminTransactionsAll().catch(() => []),
        apiService.getAuditLogs().catch(() => []),
        apiService.getAdminUsers().catch(() => [])
      ]);

      setTrades(tradesData || []);
      setAllTransactions(txsData || []);
      setAuditLogs(auditData || []);
      setAllUsers(usersData || []);
    } catch (err) {
      console.error('Failed to load trade history:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Distinct user list for user selector
  const distinctUsers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string }>();
    trades.forEach(t => {
      if (t.userId && !map.has(t.userId)) {
        map.set(t.userId, { id: t.userId, name: t.userName || t.userId, email: t.userEmail || '' });
      }
    });
    return Array.from(map.values());
  }, [trades]);

  // Distinct symbols
  const distinctSymbols = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => {
      if (t.symbol) set.add(t.symbol);
    });
    return Array.from(set).sort();
  }, [trades]);

  // Filtering Logic for Trade History
  const filteredTrades = useMemo(() => {
    let result = [...trades];

    // If sub-tab is 'open_trades', force status to open
    if (activeTab === 'open_trades') {
      result = result.filter(t => t.status === 'open');
    } else if (filterStatus !== 'all') {
      if (filterStatus === 'closed' || filterStatus === 'completed') {
        result = result.filter(t => t.status === 'completed' || t.status === 'closed');
      } else {
        result = result.filter(t => t.status === filterStatus);
      }
    }

    if (filterUser !== 'all') {
      result = result.filter(t => t.userId === filterUser);
    }

    if (filterSymbol !== 'all') {
      result = result.filter(t => t.symbol.toLowerCase() === filterSymbol.toLowerCase());
    }

    if (filterSide !== 'all') {
      result = result.filter(t => t.side.toLowerCase() === filterSide.toLowerCase());
    }

    if (filterOutcome !== 'all') {
      if (filterOutcome === 'profit') {
        result = result.filter(t => (t.netPnL || 0) > 0);
      } else if (filterOutcome === 'loss') {
        result = result.filter(t => (t.netPnL || 0) < 0);
      }
    }

    if (filterCorrectedOnly) {
      result = result.filter(t => Boolean(t.isCorrected));
    }

    // Date range filter
    if (filterDateRange !== 'all') {
      const now = Date.now();
      let threshold = 0;
      if (filterDateRange === 'today') {
        threshold = now - 24 * 60 * 60 * 1000;
      } else if (filterDateRange === '7d') {
        threshold = now - 7 * 24 * 60 * 60 * 1000;
      } else if (filterDateRange === '30d') {
        threshold = now - 30 * 24 * 60 * 60 * 1000;
      }
      if (threshold > 0) {
        result = result.filter(t => new Date(t.createdAt || t.openedAt).getTime() >= threshold);
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(t =>
        t.id.toLowerCase().includes(q) ||
        t.userId.toLowerCase().includes(q) ||
        (t.userName && t.userName.toLowerCase().includes(q)) ||
        (t.userEmail && t.userEmail.toLowerCase().includes(q)) ||
        t.symbol.toLowerCase().includes(q) ||
        (t.referenceId && t.referenceId.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      const timeA = new Date(a.openedAt || a.createdAt).getTime() || 0;
      const timeB = new Date(b.openedAt || b.createdAt).getTime() || 0;
      if (timeA !== timeB) {
        return sortOrder === 'oldest' ? timeA - timeB : timeB - timeA;
      }
      return sortOrder === 'oldest' 
        ? String(a.id || '').localeCompare(String(b.id || ''))
        : String(b.id || '').localeCompare(String(a.id || ''));
    });

    return result;
  }, [trades, activeTab, filterStatus, filterUser, filterSymbol, filterSide, filterOutcome, filterCorrectedOnly, filterDateRange, searchQuery, sortOrder]);

  // Overall Statistics Bar
  const stats = useMemo(() => {
    const totalTrades = trades.length;
    const openTrades = trades.filter(t => t.status === 'open').length;
    const closedTrades = trades.filter(t => t.status === 'closed' || t.status === 'completed').length;
    const totalLots = trades.reduce((acc, t) => acc + (Number(t.lots) || 0), 0);
    const totalGrossPnL = trades.reduce((acc, t) => acc + (Number(t.grossPnL) || 0), 0);
    const totalNetPnL = trades.reduce((acc, t) => acc + (Number(t.netPnL) || 0), 0);
    const correctedCount = trades.filter(t => Boolean(t.isCorrected)).length;

    return {
      totalTrades,
      openTrades,
      closedTrades,
      totalLots,
      totalGrossPnL,
      totalNetPnL,
      correctedCount
    };
  }, [trades]);

  // Paginated Trades
  const totalPages = Math.ceil(filteredTrades.length / pageSize) || 1;
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrades.slice(start, start + pageSize);
  }, [filteredTrades, currentPage]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredTrades.length === 0) return;

    const headers = [
      'Trade ID',
      'Account ID',
      'Customer Name',
      'Customer Email',
      'Instrument',
      'Side',
      'Status',
      'Lots',
      'Quantity (Units)',
      'Leverage',
      'Open Price',
      'Close Price',
      'Trading Fee',
      'Handling Fee',
      'Gross PnL',
      'Net PnL',
      'Stop Loss',
      'Take Profit',
      'Open Date/Time',
      'Close Date/Time',
      'Is Corrected',
      'Reference ID'
    ];

    const rows = filteredTrades.map(t => [
      t.id,
      t.userId,
      `"${t.userName || ''}"`,
      `"${t.userEmail || ''}"`,
      t.symbol,
      t.side.toUpperCase(),
      t.status.toUpperCase(),
      t.lots,
      t.size,
      t.leverage,
      t.entryPrice,
      t.exitPrice || t.currentPrice,
      t.fee,
      t.handlingFee || 0,
      t.grossPnL,
      t.netPnL,
      t.stopLoss || '',
      t.takeProfit || '',
      `"${formatIST(t.openedAt)}"`,
      `"${t.closedAt ? formatIST(t.closedAt) : (t.status === 'open' ? 'OPEN' : formatIST(t.createdAt))}"`,
      t.isCorrected ? 'YES' : 'NO',
      t.referenceId || t.id
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `institutional_trade_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenAccountActivity = (uid: string) => {
    setSelectedUserId(uid);
    setActiveTab('account_activity');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#00C853]/10 text-[#00C853]">
              <History className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-white tracking-wide">
              Trade History & Account Activity Management
            </h1>
          </div>
          <p className="text-xs text-[#8A8A8A] mt-1 ml-9">
            Complete institutional trade logs, account-level activity ledgers, and forensic audit corrections.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canCorrectTrade && (
            <button
              id="admin-create-trade-btn"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#00C853] hover:bg-[#00E676] text-xs font-bold text-black transition-all flex items-center space-x-1.5 shadow-md shadow-[#00C853]/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Trade</span>
            </button>
          )}

          <button
            onClick={() => loadAllData()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-[#1A1A1A] border border-[#2E2E2E] hover:border-[#444444] text-xs font-bold text-white transition-all flex items-center space-x-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00C853]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-[#262626] hover:bg-[#333333] border border-[#3A3A3A] text-xs font-bold text-white transition-all flex items-center space-x-2"
          >
            <Download className="w-3.5 h-3.5 text-[#00C853]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-[#141414] border border-[#262626] p-3.5 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
            Total Trades
          </span>
          <span className="text-lg font-black text-white mt-1 block">
            {stats.totalTrades}
          </span>
        </div>

        <div className="bg-[#141414] border border-[#262626] p-3.5 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
            Open Trades
          </span>
          <span className="text-lg font-black text-blue-400 mt-1 block flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>{stats.openTrades}</span>
          </span>
        </div>

        <div className="bg-[#141414] border border-[#262626] p-3.5 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
            Closed Trades
          </span>
          <span className="text-lg font-black text-white mt-1 block">
            {stats.closedTrades}
          </span>
        </div>

        <div className="bg-[#141414] border border-[#262626] p-3.5 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
            Total Lots Traded
          </span>
          <span className="text-lg font-black text-[#00C853] mt-1 block">
            {formatLots(stats.totalLots, undefined, false)} <span className="text-[10px] text-[#8A8A8A]">Lots</span>
          </span>
        </div>

        <div className="bg-[#141414] border border-[#262626] p-3.5 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
            Platform Gross PnL
          </span>
          <span className={`text-lg font-black mt-1 block ${stats.totalGrossPnL >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
            {stats.totalGrossPnL >= 0 ? '+' : ''}${stats.totalGrossPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-[#141414] border border-[#262626] p-3.5 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
            Platform Net PnL
          </span>
          <span className={`text-lg font-black mt-1 block ${stats.totalNetPnL >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
            {stats.totalNetPnL >= 0 ? '+' : ''}${stats.totalNetPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-[#141414] border border-[#262626] p-3.5 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block">
            Corrected Trades
          </span>
          <span className="text-lg font-black text-amber-400 mt-1 block">
            {stats.correctedCount}
          </span>
        </div>
      </div>

      {/* Institutional Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#262626] pb-3">
        <button
          onClick={() => setActiveTab('trade_history')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'trade_history'
              ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10 font-extrabold'
              : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Trade History</span>
        </button>

        <button
          onClick={() => setActiveTab('account_activity')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'account_activity'
              ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10 font-extrabold'
              : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Account Activity {selectedUserId && `(${selectedUserId})`}</span>
        </button>

        <button
          onClick={() => setActiveTab('open_trades')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'open_trades'
              ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10 font-extrabold'
              : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Open Trades ({stats.openTrades})</span>
        </button>

        <button
          onClick={() => setActiveTab('deposits')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'deposits'
              ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10 font-extrabold'
              : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Deposits</span>
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'withdrawals'
              ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10 font-extrabold'
              : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Withdrawals</span>
        </button>

        <button
          onClick={() => setActiveTab('balance_history')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'balance_history'
              ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10 font-extrabold'
              : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Balance History</span>
        </button>

        <button
          onClick={() => setActiveTab('audit_history')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'audit_history'
              ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10 font-extrabold'
              : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Audit History</span>
        </button>
      </div>

      {/* TAB: ACCOUNT ACTIVITY (Individual User View) */}
      {activeTab === 'account_activity' && (
        <div className="space-y-6">
          {!selectedUserId ? (
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8 text-center space-y-4 shadow-xl">
              <User className="w-12 h-12 text-[#00C853] mx-auto opacity-70" />
              <div>
                <h3 className="text-base font-bold text-white">Select a Customer Account</h3>
                <p className="text-xs text-[#8A8A8A] mt-1 max-w-md mx-auto">
                  Choose an account to inspect their unified trade records, deposit receipts, withdrawal history, running balance ledger, and security session logs.
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <select
                  value=""
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] focus:border-[#00C853] rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none"
                >
                  <option value="" disabled>-- Select Customer Account --</option>
                  {distinctUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email || u.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <AccountActivityView
              userId={selectedUserId}
              onBack={() => {
                setSelectedUserId(null);
                setActiveTab('trade_history');
              }}
              onViewTradeDetails={(trade) => setDetailModalTrade(trade)}
              onOpenCorrectTrade={(trade) => setCorrectModalTrade(trade)}
              canCorrectTrade={canCorrectTrade}
            />
          )}
        </div>
      )}

      {/* TAB: TRADE HISTORY & OPEN TRADES */}
      {(activeTab === 'trade_history' || activeTab === 'open_trades') && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
                <input
                  type="text"
                  placeholder="Search by Trade ID, Account ID, Customer Name, Email, or Pair..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-[#1A1A1A] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#666666] focus:outline-none"
                />
              </div>

              {/* Filters Group */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                
                {/* User Dropdown */}
                <select
                  value={filterUser}
                  onChange={(e) => { setFilterUser(e.target.value); setCurrentPage(1); }}
                  className="bg-[#1A1A1A] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="all">All Accounts ({distinctUsers.length})</option>
                  {distinctUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email ? u.email.split('@')[0] : u.id})</option>
                  ))}
                </select>

                {/* Symbol Dropdown */}
                <select
                  value={filterSymbol}
                  onChange={(e) => { setFilterSymbol(e.target.value); setCurrentPage(1); }}
                  className="bg-[#1A1A1A] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="all">All Pairs</option>
                  {distinctSymbols.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Status Dropdown (hidden in open_trades tab) */}
                {activeTab !== 'open_trades' && (
                  <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    className="bg-[#1A1A1A] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open Positions</option>
                    <option value="completed">Completed / Settled Trades</option>
                    <option value="cancelled">Cancelled Orders</option>
                  </select>
                )}

                {/* Side Dropdown */}
                <select
                  value={filterSide}
                  onChange={(e) => { setFilterSide(e.target.value); setCurrentPage(1); }}
                  className="bg-[#1A1A1A] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="all">All Directions</option>
                  <option value="long">Buy / Long</option>
                  <option value="short">Sell / Short</option>
                </select>

                {/* Outcome Dropdown */}
                <select
                  value={filterOutcome}
                  onChange={(e) => { setFilterOutcome(e.target.value); setCurrentPage(1); }}
                  className="bg-[#1A1A1A] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="all">All Outcomes</option>
                  <option value="profit">In Profit</option>
                  <option value="loss">In Loss</option>
                </select>

                {/* Date Range Dropdown */}
                <select
                  value={filterDateRange}
                  onChange={(e) => { setFilterDateRange(e.target.value); setCurrentPage(1); }}
                  className="bg-[#1A1A1A] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="all">All Time</option>
                  <option value="today">Past 24 Hours</option>
                  <option value="7d">Past 7 Days</option>
                  <option value="30d">Past 30 Days</option>
                </select>

                {/* Corrected Only Toggle */}
                <button
                  type="button"
                  onClick={() => { setFilterCorrectedOnly(!filterCorrectedOnly); setCurrentPage(1); }}
                  className={`px-3 py-2 rounded-xl font-bold transition-all border ${
                    filterCorrectedOnly
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-[#1A1A1A] text-[#8A8A8A] border-[#2E2E2E] hover:text-white'
                  }`}
                >
                  Corrected Only
                </button>
              </div>

            </div>
          </div>

          {/* Master Table */}
          <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white">
                <thead className="bg-[#1A1A1A] text-[#8A8A8A] text-[11px] uppercase tracking-wider border-b border-[#262626]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Trade ID</th>
                    <th className="py-3.5 px-4 font-bold">Customer Account</th>
                    <th className="py-3.5 px-4 font-bold">Instrument</th>
                    <th className="py-3.5 px-4 font-bold">Direction</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold">Lots / Size</th>
                    <th className="py-3.5 px-4 font-bold">Open Price</th>
                    <th className="py-3.5 px-4 font-bold">Close / Mark Price</th>
                    <th className="py-3.5 px-4 font-bold">Fees</th>
                    <th className="py-3.5 px-4 font-bold">Net P&L</th>
                    <th className="py-3.5 px-4 font-bold">Timestamps</th>
                    <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#212121]">
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="py-16 text-center text-[#8A8A8A]">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#00C853] mx-auto mb-2" />
                        <span>Synchronizing trade records...</span>
                      </td>
                    </tr>
                  ) : paginatedTrades.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-16 text-center text-[#8A8A8A]">
                        No matching trades found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedTrades.map(trade => {
                      const isLong = trade.side.toLowerCase() === 'long' || trade.side.toLowerCase() === 'buy';
                      const isPnlPositive = (trade.netPnL || 0) >= 0;

                      return (
                        <tr key={trade.id} className="hover:bg-[#1A1A1A]/60 transition-colors">
                          
                          {/* Trade ID */}
                          <td className="py-3.5 px-4 font-mono text-[11px] text-[#CCCCCC]">
                            <div className="flex items-center space-x-1.5">
                              <span>{trade.id}</span>
                              <button
                                onClick={() => copyToClipboard(trade.id, trade.id)}
                                className="text-[#666666] hover:text-white transition-colors"
                              >
                                {copiedField === trade.id ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                              </button>
                              {trade.isCorrected && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30" title="Adjusted by Administrator">
                                  ADJ
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Customer Account */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <button
                                onClick={() => handleOpenAccountActivity(trade.userId)}
                                className="font-bold text-white hover:text-[#00C853] text-left transition-colors flex items-center space-x-1 group"
                              >
                                <span>{trade.userName}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                              <span className="text-[11px] text-[#8A8A8A] truncate max-w-[140px]">{trade.userEmail}</span>
                              <span className="text-[10px] text-[#666666] font-mono">{trade.userId}</span>
                            </div>
                          </td>

                          {/* Instrument */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-white tracking-wide">{trade.symbol}</span>
                            <span className="text-[10px] text-[#8A8A8A] block uppercase">{trade.orderType || 'Market'}</span>
                          </td>

                          {/* Direction */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              isLong ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                            }`}>
                              {isLong ? 'BUY / LONG' : 'SELL / SHORT'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              trade.status === 'open' 
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center space-x-1 w-max' 
                                : trade.status === 'cancelled'
                                ? 'bg-gray-500/15 text-gray-400'
                                : 'bg-emerald-500/15 text-emerald-400'
                            }`}>
                              {trade.status === 'open' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>}
                              <span>{trade.status}</span>
                            </span>
                          </td>

                          {/* Lots / Size */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-[#00C853]">{formatLots(trade.lots)}</span>
                            <span className="text-[10px] text-[#8A8A8A] block">{trade.size} Units &bull; {trade.leverage}x</span>
                          </td>

                          {/* Open Price */}
                          <td className="py-3.5 px-4 font-mono text-white">
                            ${Number(trade.entryPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Close / Mark Price */}
                          <td className="py-3.5 px-4 font-mono text-white">
                            ${Number(trade.exitPrice || trade.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Fees */}
                          <td className="py-3.5 px-4 font-mono text-[#CCCCCC]">
                            ${Number(trade.fee || 0).toFixed(2)}
                          </td>

                          {/* Net P&L */}
                          <td className="py-3.5 px-4 font-mono">
                            <span className={`font-black text-xs ${isPnlPositive ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                              {trade.netPnL >= 0 ? '+' : ''}${Number(trade.netPnL || 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-[#666666] block">
                              Gross: ${Number(trade.grossPnL || 0).toFixed(2)}
                            </span>
                          </td>

                          {/* Timestamps */}
                          <td className="py-3.5 px-4 text-[#8A8A8A] text-[11px]">
                            <div>Open: {formatIST(trade.openedAt)}</div>
                            {trade.closedAt && <div className="text-[10px] text-[#666666]">Close: {formatIST(trade.closedAt)}</div>}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Details */}
                              <button
                                onClick={() => setDetailModalTrade(trade)}
                                title="View Details"
                                className="px-2.5 py-1 rounded-lg bg-[#262626] hover:bg-[#333333] text-[11px] font-semibold text-white transition-colors flex items-center space-x-1"
                              >
                                <Eye className="w-3 h-3 text-[#A0A0A0]" />
                                <span>View</span>
                              </button>
                              
                              {/* Edit Trade Parameters (Available for Open & Closed) */}
                              {canCorrectTrade && (
                                <button
                                  onClick={() => setEditModalTrade(trade)}
                                  title="Edit Trade Record & Reconcile"
                                  className="px-2.5 py-1 rounded-lg bg-[#00C853]/15 hover:bg-[#00C853]/25 text-[#00C853] text-[11px] font-bold transition-colors flex items-center space-x-1"
                                >
                                  <Sliders className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {/* Audit Trail */}
                              <button
                                onClick={() => setAuditModalTrade(trade)}
                                title="View Audit Trail"
                                className="p-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#2A2A2A] text-[#8A8A8A] hover:text-white transition-colors"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>

                              {/* Void / Delete Trade */}
                              {canCorrectTrade && (
                                <button
                                  onClick={() => setDeleteModalTrade(trade)}
                                  title="Void or Delete Trade"
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#262626] bg-[#181818]/60 text-xs text-[#8A8A8A]">
              <div>
                Showing {paginatedTrades.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
                {Math.min(currentPage * pageSize, filteredTrades.length)} of {filteredTrades.length} trades
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] text-white disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-bold text-white">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] text-white disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB: DEPOSITS */}
      {activeTab === 'deposits' && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-[#262626] bg-[#1A1A1A]/60 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Platform All Customer Deposits</h3>
            <span className="text-xs text-[#8A8A8A]">Verified deposit transactions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#1A1A1A] text-[#8A8A8A] text-[11px] uppercase tracking-wider border-b border-[#262626]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Transaction / Deposit ID</th>
                  <th className="py-3.5 px-4 font-bold">Account</th>
                  <th className="py-3.5 px-4 font-bold">Amount</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Reference / TxHash</th>
                  <th className="py-3.5 px-4 font-bold">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#212121]">
                {allTransactions.filter(t => t.type === 'deposit').length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#8A8A8A]">
                      No deposits recorded.
                    </td>
                  </tr>
                ) : (
                  allTransactions.filter(t => t.type === 'deposit').map(dep => (
                    <tr key={dep.id} className="hover:bg-[#1A1A1A]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#CCCCCC]">
                        {dep.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleOpenAccountActivity(dep.userId)}
                          className="font-bold text-white hover:text-[#00C853] text-left transition-colors"
                        >
                          {dep.userName || dep.userId}
                        </button>
                        <span className="text-[10px] text-[#666666] font-mono block">{dep.userId}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#00C853] text-sm">
                        +${Number(dep.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {dep.currency || 'USDT'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400">
                          {dep.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#CCCCCC]">
                        {dep.txHash || dep.referenceId || 'N/A'}
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

      {/* TAB: WITHDRAWALS */}
      {activeTab === 'withdrawals' && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-[#262626] bg-[#1A1A1A]/60 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Platform All Customer Withdrawals</h3>
            <span className="text-xs text-[#8A8A8A]">Processed withdrawals</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#1A1A1A] text-[#8A8A8A] text-[11px] uppercase tracking-wider border-b border-[#262626]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Withdrawal ID</th>
                  <th className="py-3.5 px-4 font-bold">Account</th>
                  <th className="py-3.5 px-4 font-bold">Amount</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Destination</th>
                  <th className="py-3.5 px-4 font-bold">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#212121]">
                {allTransactions.filter(t => t.type === 'withdrawal').length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#8A8A8A]">
                      No withdrawals recorded.
                    </td>
                  </tr>
                ) : (
                  allTransactions.filter(t => t.type === 'withdrawal').map(w => (
                    <tr key={w.id} className="hover:bg-[#1A1A1A]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#CCCCCC]">
                        {w.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleOpenAccountActivity(w.userId)}
                          className="font-bold text-white hover:text-[#00C853] text-left transition-colors"
                        >
                          {w.userName || w.userId}
                        </button>
                        <span className="text-[10px] text-[#666666] font-mono block">{w.userId}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#FF3B30] text-sm">
                        -${Number(w.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {w.currency || 'USDT'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400">
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#CCCCCC]">
                        {w.txHash || 'Bank / Crypto Destination'}
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

      {/* TAB: BALANCE HISTORY */}
      {activeTab === 'balance_history' && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-[#262626] bg-[#1A1A1A]/60 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Unified Platform Transaction Ledger</h3>
              <p className="text-xs text-[#8A8A8A]">
                Comprehensive record of deposits, withdrawals, trading realizations, and balance adjustments
              </p>
            </div>
            <span className="text-xs font-mono text-[#8A8A8A]">
              Total Records: {allTransactions.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#1A1A1A] text-[#8A8A8A] text-[11px] uppercase tracking-wider border-b border-[#262626]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Transaction ID</th>
                  <th className="py-3.5 px-4 font-bold">Account</th>
                  <th className="py-3.5 px-4 font-bold">Type</th>
                  <th className="py-3.5 px-4 font-bold">Amount / P&L</th>
                  <th className="py-3.5 px-4 font-bold">Symbol / Context</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#212121]">
                {allTransactions.slice(0, 50).map((tx, idx) => (
                  <tr key={tx.id || idx} className="hover:bg-[#1A1A1A]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#CCCCCC]">
                      {tx.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleOpenAccountActivity(tx.userId)}
                        className="font-bold text-white hover:text-[#00C853] text-left transition-colors"
                      >
                        {tx.userName || tx.userId}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        tx.type === 'deposit'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : tx.type === 'withdrawal'
                          ? 'bg-red-500/15 text-red-400'
                          : tx.type === 'trade'
                          ? 'bg-blue-500/15 text-blue-400'
                          : 'bg-purple-500/15 text-purple-400'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {tx.type === 'deposit' ? (
                        <span className="text-[#00C853]">+${Number(tx.amount).toFixed(2)}</span>
                      ) : tx.type === 'withdrawal' ? (
                        <span className="text-[#FF3B30]">-${Number(tx.amount).toFixed(2)}</span>
                      ) : (
                        <span className={(tx.netPnL || 0) >= 0 ? 'text-[#00C853]' : 'text-[#FF3B30]'}>
                          {(tx.netPnL || 0) >= 0 ? '+' : ''}${Number(tx.netPnL || tx.pnl || 0).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#CCCCCC]">
                      {tx.symbol || tx.closeReason || tx.txHash || 'Ledger Entry'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400">
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#8A8A8A] text-[11px]">
                      {formatIST(tx.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: AUDIT HISTORY */}
      {activeTab === 'audit_history' && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-[#262626] bg-[#1A1A1A]/60 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Forensic Trade Corrections & Financial Audit Trail</h3>
              <p className="text-xs text-[#8A8A8A]">
                Immutable record of administrative actions, trade modifications, and PnL reconciliations
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400">
              {auditLogs.filter(a => a.category === 'trade' || a.action.includes('Trade') || a.action.includes('Balance')).length} Trade Events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-[#1A1A1A] text-[#8A8A8A] text-[11px] uppercase tracking-wider border-b border-[#262626]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Action / Event</th>
                  <th className="py-3.5 px-4 font-bold">Target Account</th>
                  <th className="py-3.5 px-4 font-bold">Actor</th>
                  <th className="py-3.5 px-4 font-bold">Details & Impact</th>
                  <th className="py-3.5 px-4 font-bold">Reason</th>
                  <th className="py-3.5 px-4 font-bold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#212121]">
                {auditLogs.filter(a => a.category === 'trade' || a.action.includes('Trade') || a.action.includes('Balance')).slice(0, 50).map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-[#1A1A1A]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{log.action}</span>
                      <span className="text-[10px] text-[#8A8A8A] font-mono">{log.eventType || log.objectId}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {log.targetUserId ? (
                        <button
                          onClick={() => handleOpenAccountActivity(log.targetUserId)}
                          className="font-bold text-white hover:text-[#00C853] text-left transition-colors"
                        >
                          {log.targetUserName || log.targetUserEmail || log.targetUserId}
                        </button>
                      ) : (
                        <span className="text-[#8A8A8A]">{log.targetUser || 'System'}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="font-semibold text-[#00C853]">{log.actorName || log.adminEmail}</span>
                      <span className="text-[10px] text-[#8A8A8A] block uppercase">{log.actorRole || 'ADMIN'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#CCCCCC] max-w-[320px]">
                      {log.details}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-amber-300 max-w-[200px] truncate">
                      {log.reason || 'Institutional compliance record'}
                    </td>
                    <td className="py-3.5 px-4 text-[#8A8A8A] text-[11px]">
                      {formatIST(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trade Details Modal */}
      <TradeDetailsModal
        trade={detailModalTrade}
        isOpen={Boolean(detailModalTrade)}
        onClose={() => setDetailModalTrade(null)}
        onOpenCorrectModal={(t) => setEditModalTrade(t)}
        onOpenEditModal={(t) => setEditModalTrade(t)}
        onOpenDeleteModal={(t) => setDeleteModalTrade(t)}
        onOpenAuditModal={(t) => setAuditModalTrade(t)}
        onOpenEditPosition={onOpenLiveTradeEditor}
        canCorrectTrade={canCorrectTrade}
      />

      {/* Legacy Correct Trade Modal */}
      <CorrectTradeModal
        trade={correctModalTrade}
        isOpen={Boolean(correctModalTrade)}
        onClose={() => setCorrectModalTrade(null)}
        onSuccess={(updatedTrade, pnlDiff) => {
          loadAllData(true);
        }}
      />

      {/* Advanced Full Edit Trade Modal */}
      <EditTradeModal
        trade={editModalTrade}
        isOpen={Boolean(editModalTrade)}
        onClose={() => setEditModalTrade(null)}
        allUsers={allUsers}
        onSuccess={(updatedTrade, pnlDiff) => {
          loadAllData(true);
        }}
      />

      {/* Manual Trade Creation Modal */}
      <CreateTradeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        allUsers={allUsers}
        onSuccess={(newTrade) => {
          loadAllData(true);
        }}
      />

      {/* Void / Delete Trade Modal */}
      <DeleteTradeModal
        trade={deleteModalTrade}
        isOpen={Boolean(deleteModalTrade)}
        onClose={() => setDeleteModalTrade(null)}
        onSuccess={(tradeId, reversalAmount) => {
          loadAllData(true);
        }}
      />

      {/* Forensic Trade Audit Modal */}
      <TradeAuditModal
        trade={auditModalTrade}
        isOpen={Boolean(auditModalTrade)}
        onClose={() => setAuditModalTrade(null)}
      />

    </div>
  );
};
