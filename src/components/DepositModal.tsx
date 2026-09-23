import React, { useState } from 'react';
import { X, ArrowDownLeft, Upload, Check } from 'lucide-react';
import { apiService } from '../services/api';
import { feedbackService } from '../services/feedbackService';
import { useAuth } from '../context/AuthContext';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const { refreshUser } = useAuth();
  const [method, setMethod] = useState<'inr' | 'crypto'>('inr');
  const [amount, setAmount] = useState('5000');
  const [utrNumber, setUtrNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const numAmount = parseFloat(amount);
      if (!numAmount || numAmount <= 0) {
        throw new Error('Please enter a valid deposit amount');
      }

      const res = await apiService.deposit({
        amount: numAmount,
        currency: method === 'inr' ? 'INR' : 'USDT',
        method: method === 'inr' ? 'UPI / Bank Transfer' : 'USDT (TRC20)',
        utrNumber: utrNumber.trim()
      });

      const formattedAmount = method === 'inr' ? numAmount.toLocaleString('en-IN') : numAmount.toString();
      const refId = res?.depositRequest?.id || 'DEP-SUBMITTED';

      feedbackService.showTransactionSuccess({
        type: 'deposit',
        amount: formattedAmount,
        currency: method === 'inr' ? 'INR' : 'USDT',
        status: 'Pending Verification',
        referenceId: refId,
        customMessage: `Your deposit request of ${method === 'inr' ? `₹${formattedAmount} INR` : `${formattedAmount} USDT`} has been submitted successfully.`
      });

      await refreshUser();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Deposit submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#141414] border border-[#282828] rounded-2xl p-6 sm:p-7 shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#8A8A8A] hover:text-white bg-[#1F1F1F]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#00C853]/15 text-[#00C853] flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white">Deposit Funds</h3>
            <p className="text-xs text-[#8A8A8A]">Instant funding with zero platform deposit fees</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#FF3B30]/15 border border-[#FF3B30]/40 text-[#FF3B30] text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMethod('inr')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
              method === 'inr'
                ? 'bg-[#00C853]/20 border border-[#00C853] text-[#00C853]'
                : 'bg-[#1C1C1C] border border-[#292929] text-[#8A8A8A]'
            }`}
          >
            INR (UPI / IMPS)
          </button>
          <button
            type="button"
            onClick={() => setMethod('crypto')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
              method === 'crypto'
                ? 'bg-[#00C853]/20 border border-[#00C853] text-[#00C853]'
                : 'bg-[#1C1C1C] border border-[#292929] text-[#8A8A8A]'
            }`}
          >
            Crypto (USDT TRC20)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">
              Deposit Amount ({method === 'inr' ? 'INR ₹' : 'USDT $'})
            </label>
            <input
              type="number"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#2B2B2B] focus:border-[#00C853] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">
              {method === 'inr' ? 'UTR / Transaction Reference (12 digits)' : 'TXID / Blockchain Hash'}
            </label>
            <input
              type="text"
              required
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              placeholder={method === 'inr' ? 'e.g. 429381928374' : 'e.g. 0x38fa...'}
              className="w-full bg-[#1C1C1C] border border-[#2B2B2B] focus:border-[#00C853] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
            />
          </div>

          <div className="p-3 bg-[#181818] rounded-xl border border-[#242424] text-xs text-[#8A8A8A] space-y-1">
            <div className="flex justify-between">
              <span>Payment Gateway:</span>
              <span className="text-white font-medium">{method === 'inr' ? 'Instant UPI Desk' : 'TRON Network'}</span>
            </div>
            <div className="flex justify-between">
              <span>Verification Speed:</span>
              <span className="text-[#00C853] font-medium">1 - 5 Minutes</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#00C853] hover:bg-[#00E676] text-black font-bold text-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Submitting Request...' : 'Submit Deposit Request'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
