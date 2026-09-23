import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { feedbackService } from '../services/feedbackService';
import { Transaction } from '../types';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ShieldCheck, 
  QrCode, 
  Copy, 
  Check 
} from 'lucide-react';

interface WalletViewProps {
  initialTab?: 'deposit' | 'withdraw';
}

export const WalletView: React.FC<WalletViewProps> = ({ initialTab = 'deposit' }) => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>(initialTab);

  // Deposit Form State
  const [depositCurrencyType, setDepositCurrencyType] = useState<'inr' | 'crypto'>('inr');
  const [depositInrAmount, setDepositInrAmount] = useState('5000');
  const [depositCryptoAmount, setDepositCryptoAmount] = useState('100');
  const [depositCryptoCurrency, setDepositCryptoCurrency] = useState('USDT');
  const [depositCryptoNetwork, setDepositCryptoNetwork] = useState('TRC20');
  const [depositUtrNumber, setDepositUtrNumber] = useState('');

  // Withdraw Form State
  const [withdrawCurrencyType, setWithdrawCurrencyType] = useState<'inr' | 'crypto'>('inr');
  const [withdrawInrAmount, setWithdrawInrAmount] = useState('5000');
  const [withdrawCryptoAmount, setWithdrawCryptoAmount] = useState('100');
  const [withdrawCryptoCurrency, setWithdrawCryptoCurrency] = useState('USDT');
  const [withdrawCryptoNetwork, setWithdrawCryptoNetwork] = useState('TRC20');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState(user?.name || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const isSubmittingRef = useRef(false);

  const fetchTransactions = async () => {
    try {
      const res = await apiService.getTransactions();
      if (res?.transactions) {
        setTransactions(res.transactions);
      }
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || submitting) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (depositCurrencyType === 'inr') {
        const numInr = parseFloat(depositInrAmount);
        if (!numInr || numInr <= 0) {
          throw new Error('Please enter a valid INR deposit amount');
        }
        if (!depositUtrNumber.trim() || depositUtrNumber.trim().length < 6) {
          throw new Error('Please enter a valid UTR / Reference number (at least 6 digits)');
        }

        const res = await apiService.deposit({
          amount: numInr,
          currency: 'INR',
          method: 'UPI / Bank Transfer',
          utrNumber: depositUtrNumber.trim()
        });

        const formattedInr = numInr.toLocaleString('en-IN');
        const refId = res?.depositRequest?.id || 'DEP-SUBMITTED';
        setSuccessMsg(`Deposit request of ₹${formattedInr} submitted successfully.`);

        feedbackService.showTransactionSuccess({
          type: 'deposit',
          amount: formattedInr,
          currency: 'INR',
          status: 'Pending Verification',
          referenceId: refId,
          customMessage: `Your deposit request of ₹${formattedInr} INR has been submitted successfully.`
        });
      } else {
        const numCrypto = parseFloat(depositCryptoAmount);
        if (!numCrypto || numCrypto <= 0) {
          throw new Error('Please enter a valid crypto deposit amount');
        }
        if (!depositUtrNumber.trim() || depositUtrNumber.trim().length < 6) {
          throw new Error('Please enter a valid Transaction Hash / Reference');
        }

        const res = await apiService.deposit({
          amount: numCrypto,
          currency: depositCryptoCurrency,
          network: depositCryptoNetwork,
          method: `${depositCryptoCurrency} (${depositCryptoNetwork})`,
          utrNumber: depositUtrNumber.trim()
        });

        const refId = res?.depositRequest?.id || 'DEP-SUBMITTED';
        setSuccessMsg(`Crypto deposit request of ${numCrypto} ${depositCryptoCurrency} submitted successfully.`);

        feedbackService.showTransactionSuccess({
          type: 'deposit',
          amount: numCrypto,
          currency: `${depositCryptoCurrency} (${depositCryptoNetwork})`,
          status: 'Pending Verification',
          referenceId: refId,
          customMessage: `Your deposit request of ${numCrypto} ${depositCryptoCurrency} (${depositCryptoNetwork}) has been submitted successfully.`
        });
      }

      setDepositUtrNumber('');
      await refreshUser();
      await fetchTransactions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Deposit submission failed');
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || submitting) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const tradingBalance = user?.wallet?.tradingBalance || 0;

      if (withdrawCurrencyType === 'inr') {
        const numInr = parseFloat(withdrawInrAmount);
        if (!numInr || numInr <= 0) {
          throw new Error('Please enter a valid INR withdrawal amount');
        }
        if (!bankName.trim()) throw new Error('Please enter your Bank Name');
        if (!accountNumber.trim()) throw new Error('Please enter your Account Number');
        if (accountNumber !== confirmAccountNumber) throw new Error('Account numbers do not match');
        if (!ifscCode.trim()) throw new Error('Please enter IFSC Code');

        const approxUsdt = numInr / 90;
        if (approxUsdt > tradingBalance) {
          throw new Error(`Insufficient wallet balance. Available: $${tradingBalance.toFixed(2)} USDT`);
        }

        const res = await apiService.withdraw({
          amount: numInr,
          currency: 'INR',
          method: 'Bank Transfer (IMPS/NEFT)',
          bankName: bankName.trim(),
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase()
        });

        const formattedInr = numInr.toLocaleString('en-IN');
        const refId = res?.withdrawalRequest?.id || 'WD-SUBMITTED';
        setSuccessMsg(`Withdrawal request of ₹${formattedInr} submitted successfully.`);

        feedbackService.showTransactionSuccess({
          type: 'withdrawal',
          amount: formattedInr,
          currency: 'INR',
          status: 'Pending Review',
          referenceId: refId,
          customMessage: `Your withdrawal request of ₹${formattedInr} INR has been submitted successfully.`
        });
      } else {
        const numCrypto = parseFloat(withdrawCryptoAmount);
        if (!numCrypto || numCrypto <= 0) {
          throw new Error('Please enter a valid crypto withdrawal amount');
        }
        if (!destinationAddress.trim()) {
          throw new Error('Please enter a destination wallet address');
        }
        if (numCrypto > tradingBalance) {
          throw new Error(`Insufficient wallet balance. Available: $${tradingBalance.toFixed(2)} USDT`);
        }

        const res = await apiService.withdraw({
          amount: numCrypto,
          currency: withdrawCryptoCurrency,
          network: withdrawCryptoNetwork,
          method: `${withdrawCryptoCurrency} (${withdrawCryptoNetwork})`,
          destinationAddress: destinationAddress.trim()
        });

        const refId = res?.withdrawalRequest?.id || 'WD-SUBMITTED';
        setSuccessMsg(`Crypto withdrawal of ${numCrypto} ${withdrawCryptoCurrency} submitted.`);

        feedbackService.showTransactionSuccess({
          type: 'withdrawal',
          amount: numCrypto,
          currency: `${withdrawCryptoCurrency} (${withdrawCryptoNetwork})`,
          status: 'Pending Review',
          referenceId: refId,
          customMessage: `Your withdrawal request of ${numCrypto} ${withdrawCryptoCurrency} has been submitted successfully.`
        });
      }

      setAccountNumber('');
      setConfirmAccountNumber('');
      setDestinationAddress('');
      await refreshUser();
      await fetchTransactions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Withdrawal failed');
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUpi(true);
    feedbackService.showToast({ type: 'info', message: 'Copied to clipboard' });
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const tradingBalance = user?.wallet?.tradingBalance || 0;
  const fundingBalance = user?.wallet?.fundingBalance || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Wallet Balance Header */}
      <div className="bg-gradient-to-r from-[#121212] via-[#161616] to-[#121212] border border-[#242424] rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-[#8A8A8A] flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-[#00C853]" />
              <span>Total Available Balance</span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white">
              ${(tradingBalance + fundingBalance).toFixed(2)}{' '}
              <span className="text-sm font-semibold text-[#8A8A8A]">USDT</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('deposit')}
              className={`py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'deposit'
                  ? 'bg-[#00C853] text-black shadow-lg shadow-[#00C853]/25'
                  : 'bg-[#1C1C1C] text-[#A0A0A0] hover:text-white border border-[#282828]'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Deposit Funds</span>
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'withdraw'
                  ? 'bg-[#FF3B30] text-white shadow-lg shadow-[#FF3B30]/25'
                  : 'bg-[#1C1C1C] text-[#A0A0A0] hover:text-white border border-[#282828]'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Withdraw Funds</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="bg-[#121212] border border-[#222222] rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Tab Header */}
        <div className="flex border-b border-[#1F1F1F] pb-4">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`mr-8 pb-2 text-sm font-extrabold transition-all relative ${
              activeTab === 'deposit' ? 'text-white' : 'text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            Deposit Portal
            {activeTab === 'deposit' && (
              <span className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-[#00C853]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`pb-2 text-sm font-extrabold transition-all relative ${
              activeTab === 'withdraw' ? 'text-white' : 'text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            Withdrawal Request
            {activeTab === 'withdraw' && (
              <span className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-[#FF3B30]" />
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-[#FF3B30]/15 border border-[#FF3B30]/40 text-[#FF3B30] text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Deposit Flow */}
        {activeTab === 'deposit' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setDepositCurrencyType('inr')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    depositCurrencyType === 'inr'
                      ? 'bg-[#00C853]/20 border border-[#00C853] text-[#00C853]'
                      : 'bg-[#1A1A1A] border border-[#292929] text-[#8A8A8A]'
                  }`}
                >
                  INR (UPI / QR / Bank)
                </button>
                <button
                  type="button"
                  onClick={() => setDepositCurrencyType('crypto')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    depositCurrencyType === 'crypto'
                      ? 'bg-[#00C853]/20 border border-[#00C853] text-[#00C853]'
                      : 'bg-[#1A1A1A] border border-[#292929] text-[#8A8A8A]'
                  }`}
                >
                  Crypto (USDT TRC20)
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">
                  Deposit Amount ({depositCurrencyType === 'inr' ? 'INR ₹' : 'USDT $'})
                </label>
                <input
                  type="number"
                  min="100"
                  value={depositCurrencyType === 'inr' ? depositInrAmount : depositCryptoAmount}
                  onChange={(e) =>
                    depositCurrencyType === 'inr'
                      ? setDepositInrAmount(e.target.value)
                      : setDepositCryptoAmount(e.target.value)
                  }
                  className="w-full bg-[#1A1A1A] border border-[#2B2B2B] focus:border-[#00C853] rounded-xl px-4 py-3 text-sm text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">
                  {depositCurrencyType === 'inr'
                    ? '12-Digit UPI / Bank Reference (UTR)'
                    : 'Blockchain TXID / Transaction Hash'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={depositCurrencyType === 'inr' ? 'e.g. 429381928374' : 'e.g. 0x48f...'}
                  value={depositUtrNumber}
                  onChange={(e) => setDepositUtrNumber(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#2B2B2B] focus:border-[#00C853] rounded-xl px-4 py-3 text-sm text-white font-mono outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-[#00C853] hover:bg-[#00E676] text-black font-extrabold text-sm transition-all cursor-pointer shadow-lg shadow-[#00C853]/20 disabled:opacity-50"
              >
                {submitting ? 'Submitting Deposit...' : 'Confirm & Submit Deposit'}
              </button>
            </form>

            {/* Deposit Instructions Card */}
            <div className="bg-[#181818] border border-[#262626] rounded-2xl p-6 space-y-4">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Official Payment Channel</h4>
              {depositCurrencyType === 'inr' ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#121212] rounded-xl border border-[#222222] flex items-center justify-between">
                    <div>
                      <div className="text-[#8A8A8A]">Official Merchant UPI ID</div>
                      <div className="text-white font-bold text-sm">apextrader.pay@icici</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard('apextrader.pay@icici')}
                      className="p-2 rounded-lg bg-[#222222] hover:bg-[#333333] text-white"
                    >
                      {copiedUpi ? <Check className="w-4 h-4 text-[#00C853]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-[#8A8A8A] leading-relaxed">
                    1. Open any UPI App (GPay, PhonePe, Paytm, BHIM, CRED).<br />
                    2. Transfer the exact amount to the UPI ID above.<br />
                    3. Copy the 12-digit UTR/Reference ID from the payment receipt.<br />
                    4. Enter the UTR in the form and click Submit.
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#121212] rounded-xl border border-[#222222] flex items-center justify-between">
                    <div>
                      <div className="text-[#8A8A8A]">Official TRC20 Deposit Address</div>
                      <div className="text-white font-mono font-bold text-xs break-all">TYZ8qPmR2vK99xLp194vFq8A</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard('TYZ8qPmR2vK99xLp194vFq8A')}
                      className="p-2 rounded-lg bg-[#222222] hover:bg-[#333333] text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-[#8A8A8A] leading-relaxed">
                    Send only USDT over TRON (TRC20) network to this address. Credits after 1 network confirmation.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Withdraw Flow */}
        {activeTab === 'withdraw' && (
          <form onSubmit={handleWithdrawSubmit} className="max-w-2xl space-y-4">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setWithdrawCurrencyType('inr')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  withdrawCurrencyType === 'inr'
                    ? 'bg-[#FF3B30]/20 border border-[#FF3B30] text-[#FF3B30]'
                    : 'bg-[#1A1A1A] border border-[#292929] text-[#8A8A8A]'
                }`}
              >
                Bank Transfer (INR)
              </button>
              <button
                type="button"
                onClick={() => setWithdrawCurrencyType('crypto')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  withdrawCurrencyType === 'crypto'
                    ? 'bg-[#FF3B30]/20 border border-[#FF3B30] text-[#FF3B30]'
                    : 'bg-[#1A1A1A] border border-[#292929] text-[#8A8A8A]'
                }`}
              >
                Crypto (USDT TRC20)
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">
                Withdrawal Amount ({withdrawCurrencyType === 'inr' ? 'INR ₹' : 'USDT $'})
              </label>
              <input
                type="number"
                min="500"
                value={withdrawCurrencyType === 'inr' ? withdrawInrAmount : withdrawCryptoAmount}
                onChange={(e) =>
                  withdrawCurrencyType === 'inr'
                    ? setWithdrawInrAmount(e.target.value)
                    : setWithdrawCryptoAmount(e.target.value)
                }
                className="w-full bg-[#1A1A1A] border border-[#2B2B2B] focus:border-[#FF3B30] rounded-xl px-4 py-3 text-sm text-white font-bold outline-none"
              />
            </div>

            {withdrawCurrencyType === 'inr' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Bank Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC Bank, ICICI Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#2B2B2B] focus:border-[#FF3B30] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      required
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#2B2B2B] focus:border-[#FF3B30] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      required
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#2B2B2B] focus:border-[#FF3B30] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Confirm Account Number</label>
                    <input
                      type="text"
                      required
                      value={confirmAccountNumber}
                      onChange={(e) => setConfirmAccountNumber(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#2B2B2B] focus:border-[#FF3B30] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Bank IFSC Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#2B2B2B] focus:border-[#FF3B30] rounded-xl px-4 py-2.5 text-sm text-white uppercase outline-none"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">USDT TRC20 Destination Address</label>
                <input
                  type="text"
                  required
                  placeholder="T..."
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#2B2B2B] focus:border-[#FF3B30] rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-[#FF3B30] hover:bg-[#FF4D4D] text-white font-extrabold text-sm transition-all cursor-pointer shadow-lg shadow-[#FF3B30]/20 disabled:opacity-50"
            >
              {submitting ? 'Submitting Request...' : 'Submit Withdrawal Request'}
            </button>
          </form>
        )}
      </div>

      {/* Transaction History Ledger */}
      <div className="bg-[#121212] border border-[#222222] rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-extrabold text-white">Recent Transactions ({transactions.length})</h3>
        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#666666]">
            No transaction records yet.
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
                  <th className="pb-3 font-semibold text-right">Date</th>
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
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#242424] text-[#CCCCCC]">
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 text-right text-[#8A8A8A]">
                      {new Date(tx.createdAt).toLocaleDateString()}
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
