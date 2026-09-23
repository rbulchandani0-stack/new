import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  Shield,
  Clock,
  User,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Sliders,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { AdminTradeItem, TradeCorrection, AuditLog } from '../../types';
import { apiService } from '../../services/api';
import { formatIST } from '../../utils/dateUtils';
import { formatLots } from '../../utils/marginUtils';

interface TradeAuditModalProps {
  trade: AdminTradeItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TradeAuditModal: React.FC<TradeAuditModalProps> = ({
  trade,
  isOpen,
  onClose
}) => {
  if (!isOpen || !trade) return null;

  const [loading, setLoading] = useState<boolean>(true);
  const [corrections, setCorrections] = useState<TradeCorrection[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    apiService.getTradeAudit(trade.id)
      .then(res => {
        if (isMounted) {
          setCorrections(res.corrections || []);
          setAuditLogs(res.auditLogs || []);
        }
      })
      .catch(err => {
        console.error('Failed to load trade audit trail:', err);
        if (isMounted) {
          // Fallback to trade's own embedded corrections
          setCorrections(trade.corrections || []);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [trade]);

  return (
    <div id="trade-audit-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div id="trade-audit-modal-container" className="relative w-full max-w-3xl my-6 bg-[#121212] border border-[#2E2E2E] rounded-2xl shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#181818]/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Trade Audit History & Timeline
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#262626] text-[#A0A0A0] border border-[#333333]">
                  #{trade.id}
                </span>
              </div>
              <p className="text-xs text-[#8A8A8A]">
                Full forensic log of creation, administrative modifications, and financial reconciliations
              </p>
            </div>
          </div>
          <button
            id="close-trade-audit-modal-button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#8A8A8A] hover:text-white hover:bg-[#262626] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          
          {/* Trade Snapshot Card */}
          <div className="p-4 rounded-xl bg-[#181818] border border-[#262626] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[#707070] block">Instrument:</span>
              <span className="font-bold text-white text-sm">{trade.symbol}</span>
            </div>
            <div>
              <span className="text-[#707070] block">Volume:</span>
              <span className="font-mono text-white">{formatLots(trade.lots, trade.symbol)}</span>
            </div>
            <div>
              <span className="text-[#707070] block">Trader:</span>
              <span className="font-semibold text-white truncate block">{trade.userName}</span>
            </div>
            <div>
              <span className="text-[#707070] block">Current Status:</span>
              <span className="font-bold uppercase text-[#00C853]">{trade.status}</span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-[#8A8A8A]">
              <RefreshCw className="w-6 h-6 animate-spin text-[#00C853]" />
              <span className="text-xs">Loading forensic audit trail...</span>
            </div>
          ) : (corrections.length === 0 && auditLogs.length === 0) ? (
            <div className="py-12 text-center rounded-xl bg-[#161616] border border-[#222222] p-6 space-y-2">
              <Shield className="w-8 h-8 text-[#00C853] mx-auto opacity-70" />
              <h4 className="text-sm font-bold text-white">No Administrative Modifications</h4>
              <p className="text-xs text-[#8A8A8A] max-w-sm mx-auto">
                This trade is in its original execution state with no administrative overrides or balance adjustments.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0] flex items-center gap-1.5 border-b border-[#262626] pb-2">
                <Clock className="w-3.5 h-3.5 text-[#00C853]" />
                Chronological Modification History ({corrections.length + auditLogs.length} events)
              </h4>

              {/* Correction Entries */}
              {corrections.map((corr, idx) => (
                <div key={corr.id || idx} className="p-4 rounded-xl bg-[#181818] border border-[#282828] space-y-2.5">
                  <div className="flex items-center justify-between text-xs border-b border-[#242424] pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00C853]/20 text-[#00C853]">
                        {corr.field || 'MODIFICATION'}
                      </span>
                      <span className="font-semibold text-white">
                        by {corr.adminName || corr.adminEmail}
                      </span>
                    </div>
                    <span className="text-[#707070] text-[11px] font-mono">
                      {formatIST(corr.timestamp)}
                    </span>
                  </div>

                  {corr.reason && (
                    <div className="text-xs">
                      <span className="text-[#8A8A8A]">Audit Reason: </span>
                      <span className="text-amber-300 font-semibold">{corr.reason}</span>
                    </div>
                  )}

                  {/* Value Diffs if available */}
                  {corr.originalValue && corr.newValue && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-[#121212] p-2.5 rounded-lg border border-[#222222] font-mono">
                      <div>
                        <span className="text-[#707070] block font-sans text-[10px] font-bold uppercase">Original State</span>
                        <div className="text-[#999999] overflow-x-auto mt-1">
                          {typeof corr.originalValue === 'object' ? (
                            <ul className="space-y-0.5">
                              {Object.entries(corr.originalValue).slice(0, 6).map(([k, v]) => (
                                <li key={k}><span className="text-[#666]">{k}:</span> {String(v)}</li>
                              ))}
                            </ul>
                          ) : (
                            String(corr.originalValue)
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[#00C853] block font-sans text-[10px] font-bold uppercase">Updated Target State</span>
                        <div className="text-white overflow-x-auto mt-1 font-semibold">
                          {typeof corr.newValue === 'object' ? (
                            <ul className="space-y-0.5">
                              {Object.entries(corr.newValue).slice(0, 6).map(([k, v]) => (
                                <li key={k}><span className="text-[#00C853]">{k}:</span> {String(v)}</li>
                              ))}
                            </ul>
                          ) : (
                            String(corr.newValue)
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Security Audit Log Events for Trade */}
              {auditLogs.map((log, idx) => (
                <div key={log.id || `log_${idx}`} className="p-4 rounded-xl bg-[#161616] border border-[#242424] space-y-2">
                  <div className="flex items-center justify-between text-xs border-b border-[#202020] pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                        {log.action}
                      </span>
                      <span className="font-semibold text-white">
                        {log.actorName || log.adminEmail || 'Admin'}
                      </span>
                    </div>
                    <span className="text-[#707070] text-[11px] font-mono">
                      {formatIST(log.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-[#CCCCCC]">
                    {log.details}
                  </p>

                  {log.reason && (
                    <div className="text-xs">
                      <span className="text-[#707070]">Justification: </span>
                      <span className="text-amber-300">{log.reason}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-[#262626] bg-[#181818]/60">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#262626] text-white hover:bg-[#303030] text-xs font-semibold transition-colors"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
