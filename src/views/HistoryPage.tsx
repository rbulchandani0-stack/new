import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Transaction } from '../types';
import { History, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await apiService.getTransactions();
        if (res?.transactions) setTransactions(res.transactions);
      } catch (e) {
        // Ignore
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-[#00C853]/15 text-[#00C853] flex items-center justify-center">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Transaction & Trade History</h2>
          <p className="text-xs text-[#8A8A8A]">Comprehensive ledger of deposits, withdrawals, and trade settlements</p>
        </div>
      </div>

      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 space-y-4">
        {transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#666666]">
            No transactions found in this account history.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#222222] text-[#8A8A8A]">
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Reference</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="text-white hover:bg-[#161616]">
                    <td className="py-3 capitalize font-bold">
                      <span className={tx.type === 'deposit' ? 'text-[#00C853]' : 'text-[#FF3B30]'}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 font-semibold">
                      {tx.currency === 'INR' ? `₹${tx.amount.toLocaleString()}` : `$${tx.amount} ${tx.currency}`}
                    </td>
                    <td className="py-3 text-[#8A8A8A] font-mono">{tx.utrNumber || tx.id.substring(0, 10)}</td>
                    <td className="py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#242424] text-[#CCCCCC]">
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 text-right text-[#8A8A8A]">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
