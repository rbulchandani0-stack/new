import React, { useState } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import { apiService } from '../services/api';
import { feedbackService } from '../services/feedbackService';
import { useAuth } from '../context/AuthContext';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [method, setMethod] = useState<'inr' | 'crypto'>('inr');
  const [amount, setAmount] = useState('2000');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const tradingBalance = user?.wallet?.tradingBalance || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const numAmount = parseFloat(amount);
      if (!numAmount || numAmount <= 0) {
        throw new Error('Please enter a valid withdrawal amount');
      }

      if (numAmount > tradingBalance) {
        throw new Error(`Insufficient wallet balance. Available: $${tradingBalance.toFixed(2)} USDT`);
      }

      const res = await apiService.withdraw({
        amount: numAmount,
        currency: method === 'inr' ? 'INR' : 'USDT',
        method: method === 'inr' ? 'Bank Wire (NEFT/RTGS)' : 'USDT (TRC20)',
        bankName,
        accountNumber,
        ifscCode,
        destinationAddress: cryptoAddress
      });

      const formattedAmount = method === 'inr' ? numAmount.toLocaleString('en-IN') : numAmount.toString();
      const refId = res?.withdrawalRequest?.id || 'WD-SUBMITTED';

      feedbackService.showTransactionSuccess({
        type: 'withdrawal',
        amount: formattedAmount,
        currency: method === 'inr' ? 'INR' : 'USDT',
        status: 'Pending Review',
        referenceId: refId,
        customMessage: `Your withdrawal request of ${method === 'inr' ? `₹${formattedAmount} INR` : `${formattedAmount} USDT`} has been submitted successfully.`
      });

      await refreshUser();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Withdrawal submission failed');
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
          <div className="w-10 h-10 rounded-xl bg-[#FF3B30]/15 text-[#FF3B30] flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white">Withdraw Funds</h3>
            <p className="text-xs text-[#8A8A8A]">
              Available Trading Balance: <span className="text-white font-bold">${tradingBalance.toFixed(2)} USDT</span>
            </p>
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
                ? 'bg-[#FF3B30]/20 border border-[#FF3B30] text-[#FF3B30]'
                : 'bg-[#1C1C1C] border border-[#292929] text-[#8A8A8A]'
            }`}
          >
            Bank Transfer (INR)
          </button>
          <button
            type="button"
            onClick={() => setMethod('crypto')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
              method === 'crypto'
                ? 'bg-[#FF3B30]/20 border border-[#FF3B30] text-[#FF3B30]'
                : 'bg-[#1C1C1C] border border-[#292929] text-[#8A8A8A]'
            }`}
          >
            Crypto Address (USDT)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">
              Withdrawal Amount ({method === 'inr' ? 'INR ₹' : 'USDT $'})
            </label>
            <input
              type="number"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#2B2B2B] focus:border-[#FF3B30] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
            />
          </div>

          {method === 'inr' ? (
            <>
              <div>
                <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-[#2B2B2B] focus:border-[#FF3B30] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    placeholder="Account Number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-[#1C1C1C] border border-[#2B2B2B] focus:border-[#FF3B30] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    className="w-full bg-[#1C1C1C] border border-[#2B2B2B] focus:border-[#FF3B30] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">USDT TRC20 Wallet Address</label>
              <input
                type="text"
                required
                placeholder="T..."
                value={cryptoAddress}
                onChange={(e) => setCryptoAddress(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-[#2B2B2B] focus:border-[#FF3B30] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#FF3B30] hover:bg-[#FF4D4D] text-white font-bold text-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Submitting Request...' : 'Submit Withdrawal Request'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
