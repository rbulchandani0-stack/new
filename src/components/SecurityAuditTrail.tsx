import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  User, 
  ArrowRight, 
  Copy, 
  Check, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Lock, 
  AlertCircle,
  Globe,
  Sliders,
  Code
} from 'lucide-react';
import { AuditLog } from '../types';
import { formatIST } from '../utils/dateUtils';

interface SecurityAuditTrailProps {
  logs: AuditLog[];
  onRefresh?: () => void;
}

type CategoryFilter = 'all' | 'role' | 'finance' | 'withdrawal' | 'deposit' | 'trade' | 'kyc' | 'user' | 'security' | 'system';
type TimeFilter = 'all' | 'today' | '24h' | '7d';

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  role: { label: 'Role & RBAC', color: 'text-purple-400', bg: 'bg-purple-950/40', border: 'border-purple-800/40' },
  finance: { label: 'Finance & Ledger', color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-800/40' },
  withdrawal: { label: 'Withdrawal', color: 'text-amber-400', bg: 'bg-amber-950/40', border: 'border-amber-800/40' },
  deposit: { label: 'Deposit', color: 'text-green-400', bg: 'bg-green-950/40', border: 'border-green-800/40' },
  trade: { label: 'Trade Control', color: 'text-cyan-400', bg: 'bg-cyan-950/40', border: 'border-cyan-800/40' },
  kyc: { label: 'KYC & Compliance', color: 'text-blue-400', bg: 'bg-blue-950/40', border: 'border-blue-800/40' },
  user: { label: 'User Account', color: 'text-indigo-400', bg: 'bg-indigo-950/40', border: 'border-indigo-800/40' },
  security: { label: 'Security & Auth', color: 'text-rose-400', bg: 'bg-rose-950/40', border: 'border-rose-800/40' },
  system: { label: 'System & Config', color: 'text-zinc-400', bg: 'bg-zinc-900', border: 'border-zinc-800' },
};

export const SecurityAuditTrail: React.FC<SecurityAuditTrailProps> = ({ logs = [], onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilter>('all');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRawJsonModalId, setShowRawJsonModalId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLogIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedLogIds(new Set(filteredLogs.map(l => l.id)));
  };

  const collapseAll = () => {
    setExpandedLogIds(new Set());
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    return logs.filter(log => {
      // Category filter
      if (selectedCategory !== 'all' && log.category !== selectedCategory) {
        return false;
      }

      // Time filter
      if (selectedTimeFilter !== 'all') {
        const logTime = new Date(log.timestamp).getTime();
        if (selectedTimeFilter === 'today') {
          const startOfToday = new Date().setHours(0, 0, 0, 0);
          if (logTime < startOfToday) return false;
        } else if (selectedTimeFilter === '24h') {
          if (now - logTime > 24 * 3600 * 1000) return false;
        } else if (selectedTimeFilter === '7d') {
          if (now - logTime > 7 * 24 * 3600 * 1000) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const searchable = [
          log.id,
          log.action,
          log.eventType,
          log.category,
          log.details,
          log.reason,
          log.adminEmail,
          log.actorName,
          log.actorEmail,
          log.actorUserId,
          log.actorRole,
          log.targetUser,
          log.targetUserName,
          log.targetUserEmail,
          log.targetUserId,
          log.objectType,
          log.objectId,
          log.previousState,
          log.newState,
          log.ipAddress,
          log.symbol
        ].filter(Boolean).join(' ').toLowerCase();

        return searchable.includes(q);
      }

      return true;
    });
  }, [logs, selectedCategory, selectedTimeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const roles = logs.filter(l => l.category === 'role').length;
    const finance = logs.filter(l => l.category === 'finance' || l.category === 'withdrawal' || l.category === 'deposit').length;
    const trades = logs.filter(l => l.category === 'trade').length;
    const security = logs.filter(l => l.category === 'security' || l.category === 'kyc').length;
    return { total, roles, finance, trades, security };
  }, [logs]);

  // Export handlers
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `security_audit_log_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = [
      'Log ID', 'Timestamp (UTC)', 'Category', 'Action', 'Event Type',
      'Actor Name', 'Actor Email', 'Actor Role', 'Actor IP',
      'Target Name', 'Target Email', 'Target ID',
      'Object Type', 'Object ID', 'Previous State', 'New State',
      'Reason', 'Details'
    ];

    const rows = filteredLogs.map(l => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.category || 'Not available'}"`,
      `"${l.action || 'Not available'}"`,
      `"${l.eventType || 'Not available'}"`,
      `"${l.actorName || 'Not available'}"`,
      `"${l.actorEmail || l.adminEmail || 'Not available'}"`,
      `"${l.actorRole || 'Not available'}"`,
      `"${l.ipAddress || 'Not available'}"`,
      `"${l.targetUserName || 'Not available'}"`,
      `"${l.targetUserEmail || l.targetUser || 'Not available'}"`,
      `"${l.targetUserId || 'Not available'}"`,
      `"${l.objectType || 'Not available'}"`,
      `"${l.objectId || 'Not available'}"`,
      `"${(l.previousState || '').replace(/"/g, '""') || 'Not available'}"`,
      `"${(l.newState || '').replace(/"/g, '""') || 'Not available'}"`,
      `"${(l.reason || '').replace(/"/g, '""') || 'Not available'}"`,
      `"${(l.details || '').replace(/"/g, '""') || 'Not available'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `security_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const selectedModalLog = useMemo(() => {
    if (!showRawJsonModalId) return null;
    return logs.find(l => l.id === showRawJsonModalId) || null;
  }, [logs, showRawJsonModalId]);

  return (
    <div id="security-audit-trail-container" className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">System Security Audit Trail</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1F1F1F] text-[#8A8A8A] border border-[#2A2A2A]">
                Immutable Ledger
              </span>
            </div>
            <p className="text-sm text-[#8A8A8A]">
              Comprehensive, forensic-grade tracking for all administrative actions, balance adjustments, trade modifications, and security overrides.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {onRefresh && (
              <button
                id="btn-audit-refresh"
                onClick={onRefresh}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#252525] text-white text-xs font-semibold border border-[#2A2A2A] transition-colors"
                title="Refresh audit trail from server"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#8A8A8A]" />
                Refresh
              </button>
            )}

            <button
              id="btn-audit-export-csv"
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#252525] text-white text-xs font-semibold border border-[#2A2A2A] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Export CSV
            </button>

            <button
              id="btn-audit-export-json"
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#252525] text-white text-xs font-semibold border border-[#2A2A2A] transition-colors"
            >
              <Code className="w-3.5 h-3.5 text-cyan-400" />
              Export JSON
            </button>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-[#1E1E1E]">
          <div className="bg-[#171717] p-3 rounded-xl border border-[#262626]">
            <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider font-semibold block">Total Events</span>
            <span className="text-lg font-bold text-white mt-0.5 block">{stats.total}</span>
          </div>
          <div className="bg-[#171717] p-3 rounded-xl border border-[#262626]">
            <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider font-semibold block">RBAC & Roles</span>
            <span className="text-lg font-bold text-purple-400 mt-0.5 block">{stats.roles}</span>
          </div>
          <div className="bg-[#171717] p-3 rounded-xl border border-[#262626]">
            <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider font-semibold block">Finance & Ledger</span>
            <span className="text-lg font-bold text-emerald-400 mt-0.5 block">{stats.finance}</span>
          </div>
          <div className="bg-[#171717] p-3 rounded-xl border border-[#262626]">
            <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider font-semibold block">Trade Overrides</span>
            <span className="text-lg font-bold text-cyan-400 mt-0.5 block">{stats.trades}</span>
          </div>
          <div className="bg-[#171717] p-3 rounded-xl border border-[#262626]">
            <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider font-semibold block">Security & KYC</span>
            <span className="text-lg font-bold text-rose-400 mt-0.5 block">{stats.security}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
            <input
              id="input-audit-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Actor, Target User, Action, Entity ID, IP, or Reason..."
              className="w-full bg-[#181818] border border-[#2A2A2A] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#666] focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8A8A8A] hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Time Preset Selector */}
          <div className="flex items-center gap-1.5 bg-[#181818] border border-[#2A2A2A] rounded-xl p-1 shrink-0 overflow-x-auto">
            <Calendar className="w-3.5 h-3.5 text-[#8A8A8A] ml-2 shrink-0" />
            {(['all', 'today', '24h', '7d'] as TimeFilter[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeFilter(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedTimeFilter === tf 
                    ? 'bg-emerald-500 text-black font-bold' 
                    : 'text-[#8A8A8A] hover:text-white'
                }`}
              >
                {tf === 'all' ? 'All Time' : tf === 'today' ? 'Today' : tf === '24h' ? 'Last 24h' : 'Last 7 Days'}
              </button>
            ))}
          </div>

          {/* Expand/Collapse All */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={expandAll}
              className="px-3 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#252525] text-[#8A8A8A] hover:text-white text-xs font-semibold border border-[#2A2A2A] transition-colors"
              title="Expand all details"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#252525] text-[#8A8A8A] hover:text-white text-xs font-semibold border border-[#2A2A2A] transition-colors"
              title="Collapse all details"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[#666] font-semibold flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3 h-3" /> Category:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-medium shrink-0 border transition-all ${
              selectedCategory === 'all'
                ? 'bg-white text-black border-white font-bold shadow-sm'
                : 'bg-[#181818] text-[#8A8A8A] border-[#2A2A2A] hover:text-white hover:border-[#383838]'
            }`}
          >
            All Categories ({logs.length})
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([catKey, conf]) => {
            const count = logs.filter(l => l.category === catKey).length;
            const isSelected = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey as CategoryFilter)}
                className={`px-3 py-1.5 rounded-lg font-medium shrink-0 border transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? `${conf.bg} ${conf.color} ${conf.border} font-bold ring-1 ring-white/10`
                    : 'bg-[#181818] text-[#8A8A8A] border-[#2A2A2A] hover:text-white hover:border-[#383838]'
                }`}
              >
                <span>{conf.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/30' : 'bg-[#222]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Audit Log Entries List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-[#121212] border border-[#222] rounded-2xl p-12 text-center">
            <AlertCircle className="w-10 h-10 text-[#444] mx-auto mb-3" />
            <h4 className="text-white font-bold text-base">No Audit Records Found</h4>
            <p className="text-xs text-[#8A8A8A] mt-1 max-w-sm mx-auto">
              No security log entries match your active filter or search query. Try clearing the search term or switching to "All Categories".
            </p>
            {(searchQuery || selectedCategory !== 'all' || selectedTimeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedTimeFilter('all');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-[#222] hover:bg-[#2A2A2A] text-white text-xs font-semibold transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const isExpanded = expandedLogIds.has(log.id);
            const catConf = CATEGORY_CONFIG[log.category || 'system'] || CATEGORY_CONFIG.system;
            const actorDisplay = log.actorName || (log.adminEmail ? log.adminEmail.split('@')[0] : 'System');
            const actorRoleDisplay = (log.actorRole || (log.adminEmail === 'SYSTEM' ? 'SYSTEM' : 'ADMIN')).toUpperCase();
            const targetDisplay = log.targetUserName || log.targetUserEmail || log.targetUser || 'Not available';

            return (
              <div 
                key={`${log.id}_${index}`}
                className="bg-[#121212] border border-[#222222] hover:border-[#2C2C2C] rounded-2xl transition-all overflow-hidden"
              >
                {/* Summary / Compact Row */}
                <div 
                  onClick={() => toggleExpand(log.id)}
                  className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#161616] transition-colors"
                >
                  <div className="flex items-start md:items-center gap-3.5 flex-1 min-w-0">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider shrink-0 border ${catConf.bg} ${catConf.color} ${catConf.border}`}>
                      {catConf.label}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm tracking-tight">{log.action}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1C1C1C] text-[#8A8A8A] border border-[#282828]">
                          {log.eventType || 'EVENT'}
                        </span>
                      </div>
                      <p className="text-xs text-[#999] mt-0.5 line-clamp-1">
                        {log.details}
                      </p>
                    </div>
                  </div>

                  {/* Right side metadata */}
                  <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
                    {/* Actor */}
                    <div className="text-right text-xs">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-[#666] text-[11px]">Actor:</span>
                        <span className="text-white font-semibold">{actorDisplay}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#202020] text-[#00C853] font-bold border border-[#2A2A2A]">
                          {actorRoleDisplay}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#666] mt-0.5">
                        Target: <span className="text-[#BBB]">{targetDisplay}</span>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-right text-[11px] text-[#666] hidden sm:block">
                      <div>{formatIST(log.timestamp)}</div>
                      <div className="text-[10px] font-mono text-[#555]">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC</div>
                    </div>

                    {/* Expand Arrow */}
                    <button 
                      aria-label="Toggle details"
                      className="p-1.5 rounded-lg bg-[#181818] text-[#8A8A8A] hover:text-white transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="border-t border-[#1C1C1C] bg-[#0E0E0E] p-5 space-y-5 animate-fade-in">
                    {/* 4-Column Audit Grid: Actor vs Target vs Object vs State */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Box 1: Actor Information */}
                      <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-400" />
                            Actor (Who performed)
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            AUTHORITATIVE
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div>
                            <span className="text-[#666]">Name: </span>
                            <span className="text-white font-medium">{log.actorName || actorDisplay}</span>
                          </div>
                          <div>
                            <span className="text-[#666]">Email: </span>
                            <span className="text-white font-mono text-[11px]">{log.actorEmail || log.adminEmail || 'Not available'}</span>
                          </div>
                          <div>
                            <span className="text-[#666]">Role: </span>
                            <span className="text-white font-semibold">{actorRoleDisplay}</span>
                          </div>
                          <div>
                            <span className="text-[#666]">Actor User ID: </span>
                            <span className="text-[#888] font-mono text-[10px]">{log.actorUserId || 'Not available'}</span>
                          </div>
                          <div>
                            <span className="text-[#666]">IP Address: </span>
                            <span className="text-cyan-400 font-mono text-[11px]">{log.ipAddress || 'Not available'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Box 2: Affected Target Account */}
                      <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            Affected Target Account
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            SUBJECT
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div>
                            <span className="text-[#666]">Name: </span>
                            <span className="text-white font-medium">{log.targetUserName || 'Not available'}</span>
                          </div>
                          <div>
                            <span className="text-[#666]">Email: </span>
                            <span className="text-white font-mono text-[11px]">{log.targetUserEmail || log.targetUser || 'Not available'}</span>
                          </div>
                          <div>
                            <span className="text-[#666]">Target User ID: </span>
                            <span className="text-[#888] font-mono text-[10px]">{log.targetUserId || 'Not available'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Box 3: Entity / Object Changed */}
                      <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-400" />
                            Entity / Object Affected
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div>
                            <span className="text-[#666]">Object Type: </span>
                            <span className="text-white font-medium">{log.objectType || 'System Resource'}</span>
                          </div>
                          <div>
                            <span className="text-[#666]">Object ID / Ref: </span>
                            <span className="text-cyan-400 font-mono text-[11px]">{log.objectId || 'Not available'}</span>
                          </div>
                          <div>
                            <span className="text-[#666]">Event Type: </span>
                            <span className="text-purple-400 font-mono text-[10px]">{log.eventType}</span>
                          </div>
                        </div>
                      </div>

                      {/* Box 4: State Transition */}
                      <div className="bg-[#141414] border border-[#222] rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-purple-400" />
                            State Transition
                          </span>
                        </div>
                        <div className="text-xs space-y-2">
                          <div>
                            <div className="text-[10px] text-[#777] uppercase font-semibold">Previous State</div>
                            <div className="text-rose-400 font-medium text-[11px] break-all bg-rose-950/20 px-2 py-1 rounded border border-rose-900/30 mt-0.5">
                              {log.previousState || 'Not available'}
                            </div>
                          </div>
                          <div className="flex items-center justify-center">
                            <ArrowRight className="w-3.5 h-3.5 text-[#555]" />
                          </div>
                          <div>
                            <div className="text-[10px] text-[#777] uppercase font-semibold">New State</div>
                            <div className="text-emerald-400 font-medium text-[11px] break-all bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/30 mt-0.5">
                              {log.newState || 'Not available'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Financial Ledger Details (If available) */}
                    {(log.amount !== undefined || log.walletType || log.previousBalance !== undefined || log.newBalance !== undefined) && (
                      <div className="bg-[#141414] border border-[#222] rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold uppercase tracking-wider text-white">Financial Ledger & Balance Audit</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="bg-[#181818] p-2.5 rounded-lg border border-[#262626]">
                            <span className="text-[10px] text-[#888] block">Wallet / Account</span>
                            <span className="font-semibold text-white mt-0.5 block">{log.walletType || 'Trading Wallet'}</span>
                          </div>
                          <div className="bg-[#181818] p-2.5 rounded-lg border border-[#262626]">
                            <span className="text-[10px] text-[#888] block">Amount Delta</span>
                            <span className="font-bold text-emerald-400 mt-0.5 block">
                              {log.amount !== undefined ? `$${log.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${log.currency || 'USDT'}` : 'Not available'}
                            </span>
                          </div>
                          <div className="bg-[#181818] p-2.5 rounded-lg border border-[#262626]">
                            <span className="text-[10px] text-[#888] block">Starting Balance</span>
                            <span className="font-mono text-white mt-0.5 block">
                              {log.previousBalance !== undefined ? `$${log.previousBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Not available'}
                            </span>
                          </div>
                          <div className="bg-[#181818] p-2.5 rounded-lg border border-[#262626]">
                            <span className="text-[10px] text-[#888] block">Ending Balance</span>
                            <span className="font-mono text-white mt-0.5 block">
                              {log.newBalance !== undefined ? `$${log.newBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Not available'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Trade Override Details (If available) */}
                    {(log.symbol || log.entryPrice !== undefined || log.targetPnL !== undefined || log.currentPrice !== undefined) && (
                      <div className="bg-[#141414] border border-[#222] rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-bold uppercase tracking-wider text-white">Trade & Risk Control Parameters</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="bg-[#181818] p-2.5 rounded-lg border border-[#262626]">
                            <span className="text-[10px] text-[#888] block">Market / Asset</span>
                            <span className="font-bold text-white mt-0.5 block">
                              {log.symbol || 'Not available'} <span className="text-[10px] text-[#888]">({(log.side || 'LONG').toUpperCase()})</span>
                            </span>
                          </div>
                          <div className="bg-[#181818] p-2.5 rounded-lg border border-[#262626]">
                            <span className="text-[10px] text-[#888] block">Entry Price / Mark Price</span>
                            <span className="font-mono text-white mt-0.5 block">
                              ${log.entryPrice || 0} / ${log.currentPrice || 0}
                            </span>
                          </div>
                          <div className="bg-[#181818] p-2.5 rounded-lg border border-[#262626]">
                            <span className="text-[10px] text-[#888] block">PnL Before Override</span>
                            <span className="font-mono text-rose-400 mt-0.5 block">
                              {log.previousPnL !== undefined ? `$${log.previousPnL.toFixed(2)}` : 'Not available'}
                            </span>
                          </div>
                          <div className="bg-[#181818] p-2.5 rounded-lg border border-[#262626]">
                            <span className="text-[10px] text-[#888] block">Target PnL / Transition</span>
                            <span className="font-mono text-emerald-400 mt-0.5 block">
                              {log.targetPnL !== undefined ? `$${log.targetPnL.toFixed(2)}` : 'Market Live'} {log.transitionDuration ? `(${log.transitionDuration})` : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reason & Justification Bar */}
                    <div className="bg-[#141414] border border-[#222] rounded-xl p-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8A8A] block mb-1">
                        Operational Reason & Justification:
                      </span>
                      <p className="text-xs text-white font-medium leading-relaxed bg-[#191919] p-3 rounded-lg border border-[#282828]">
                        {log.reason || 'Not available'}
                      </p>
                    </div>

                    {/* Forensic Footer: ID, Exact Timestamp, Raw JSON inspection */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-[11px] text-[#666] border-t border-[#1C1C1C]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>Log ID:</span>
                        <code className="bg-[#181818] px-2 py-0.5 rounded text-white font-mono text-[10px] border border-[#282828]">
                          {log.id}
                        </code>
                        <button
                          onClick={() => copyToClipboard(log.id, `id_${log.id}`)}
                          className="text-[#8A8A8A] hover:text-white p-1 rounded transition-colors"
                          title="Copy Log ID"
                        >
                          {copiedId === `id_${log.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-[#444]">•</span>
                        <span>Timestamp:</span>
                        <span className="text-[#AAA] font-mono text-[10px]">{log.timestamp}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowRawJsonModalId(log.id)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#181818] hover:bg-[#222] text-[#AAA] hover:text-white border border-[#282828] text-xs font-semibold transition-colors"
                        >
                          <Code className="w-3 h-3 text-cyan-400" />
                          View Raw JSON
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* RAW JSON INSPECTION MODAL */}
      {selectedModalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative text-white space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold">Audit Log Raw Payload</h3>
                <span className="text-xs font-mono text-[#888]">#{selectedModalLog.id}</span>
              </div>
              <button
                onClick={() => setShowRawJsonModalId(null)}
                className="text-[#888] hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#0A0A0A] p-4 rounded-xl border border-[#1E1E1E] font-mono text-xs text-emerald-400">
              <pre className="whitespace-pre-wrap">{JSON.stringify(selectedModalLog, null, 2)}</pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => copyToClipboard(JSON.stringify(selectedModalLog, null, 2), 'raw_json')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white text-xs font-semibold transition-colors"
              >
                {copiedId === 'raw_json' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                Copy JSON
              </button>
              <button
                onClick={() => setShowRawJsonModalId(null)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
