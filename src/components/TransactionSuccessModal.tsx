import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { feedbackService, TransactionSuccessData } from '../services/feedbackService';

export interface TransactionSuccessModalProps {
  isOpen?: boolean;
  type?: 'deposit' | 'withdrawal';
  amount?: number | string;
  currency?: string;
  status?: string;
  referenceId?: string;
  customMessage?: string;
  autoCloseDuration?: number;
  onClose?: () => void;
}

export const TransactionSuccessModal: React.FC<TransactionSuccessModalProps> = ({
  isOpen: directIsOpen,
  type: directType,
  amount: directAmount,
  currency: directCurrency,
  status: directStatus,
  referenceId: directRefId,
  customMessage: directCustomMessage,
  autoCloseDuration: directDuration,
  onClose: directOnClose
}) => {
  const [globalData, setGlobalData] = useState<TransactionSuccessData | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(100);

  useEffect(() => {
    const unsub = feedbackService.subscribeTransactionSuccess((data) => {
      setGlobalData(data);
    });
    return () => unsub();
  }, []);

  const isDirectActive = typeof directIsOpen === 'boolean';
  const isVisible = isDirectActive ? Boolean(directIsOpen) : Boolean(globalData);

  const activeData = isDirectActive
    ? {
        id: 'direct_' + (directType || 'deposit'),
        type: directType || 'deposit',
        amount: directAmount,
        currency: directCurrency,
        status: directStatus,
        referenceId: directRefId,
        customMessage: directCustomMessage,
        autoCloseDuration: directDuration ?? 4000,
        createdAt: Date.now()
      }
    : globalData;

  const timerRef = useRef<any>(null);
  const animFrameRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const totalDurationRef = useRef<number>(4000);

  const handleClose = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (isDirectActive && directOnClose) {
      directOnClose();
    } else {
      feedbackService.dismissTransactionSuccess();
    }
  }, [isDirectActive, directOnClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
    };
    if (isVisible) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, handleClose]);

  const activeEventId = activeData?.id;
  const autoCloseMs = activeData?.autoCloseDuration ?? 4000;

  useEffect(() => {
    if (!isVisible || !activeData) {
      setProgressPercent(100);
      return;
    }

    totalDurationRef.current = autoCloseMs;
    startTimeRef.current = Date.now();
    setProgressPercent(100);

    timerRef.current = setTimeout(() => {
      handleClose();
    }, autoCloseMs);

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, totalDurationRef.current - elapsed);
      const pct = (remaining / totalDurationRef.current) * 100;
      setProgressPercent(pct);

      if (remaining > 0) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [activeEventId, isVisible, autoCloseMs, handleClose]);

  if (!isVisible || !activeData) return null;

  const isDeposit = activeData.type === 'deposit';

  let displayMessage = activeData.customMessage;
  if (!displayMessage) {
    if (isDeposit) {
      if (activeData.currency === 'INR' || String(activeData.amount || '').startsWith('₹')) {
        const amtStr = String(activeData.amount || '').replace(/^₹/, '');
        displayMessage = `Your deposit request of ₹${amtStr} INR has been submitted successfully.`;
      } else if (activeData.amount && activeData.currency) {
        displayMessage = `Your deposit request of ${activeData.amount} ${activeData.currency} has been submitted successfully.`;
      } else if (activeData.amount) {
        displayMessage = `Your deposit request of ${activeData.amount} has been submitted successfully.`;
      } else {
        displayMessage = 'Your deposit request has been submitted successfully.';
      }
    } else {
      if (activeData.currency === 'INR' || String(activeData.amount || '').startsWith('₹')) {
        const amtStr = String(activeData.amount || '').replace(/^₹/, '');
        displayMessage = `Your withdrawal request of ₹${amtStr} INR has been submitted successfully.`;
      } else if (activeData.amount && activeData.currency) {
        displayMessage = `Your withdrawal request of ${activeData.amount} ${activeData.currency} has been submitted successfully.`;
      } else if (activeData.amount) {
        displayMessage = `Your withdrawal request of ${activeData.amount} has been submitted successfully.`;
      } else {
        displayMessage = 'Your withdrawal request has been submitted successfully.';
      }
    }
  }

  const statusText = activeData.status || (isDeposit ? 'Pending Verification' : 'Pending Review');

  return (
    <div
      id="transaction-success-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-success-modal-title"
      aria-describedby="transaction-success-modal-desc"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none"
      style={{
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        paddingTop: 'max(1rem, env(safe-area-inset-top, 16px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 16px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 16px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 16px))'
      }}
      onClick={handleClose}
    >
      <div
        id="transaction-success-modal-card"
        className="w-full max-w-[340px] sm:max-w-[380px] bg-[#121212] border border-[#282828] rounded-2xl p-6 sm:p-7 shadow-2xl relative text-center text-white transform transition-all duration-200"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px -5px rgba(0, 200, 83, 0.22)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          id="transaction-success-modal-close-button"
          onClick={handleClose}
          aria-label="Close confirmation popup"
          className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-[#1C1C1C] hover:bg-[#282828] active:bg-[#333333] text-[#999999] hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-[#2E2E2E]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex justify-center mb-4 pt-1">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#00C853]/15 border-2 border-[#00C853]/50 flex items-center justify-center text-[#00C853] shadow-lg shadow-[#00C853]/25">
              <Check className="w-8 h-8 sm:w-10 sm:h-10 stroke-[3]" />
            </div>
            <div
              className="absolute inset-0 rounded-full border border-[#00C853]/40 animate-ping opacity-20"
              style={{ animationDuration: '2.5s' }}
            />
          </div>
        </div>

        <h3
          id="transaction-success-modal-title"
          className="text-lg sm:text-xl font-extrabold text-white tracking-wide"
        >
          {isDeposit ? 'Deposit Submitted' : 'Withdrawal Submitted'}
        </h3>

        <p
          id="transaction-success-modal-desc"
          className="text-xs sm:text-sm text-[#CCCCCC] mt-3 leading-relaxed px-1 font-sans"
        >
          {displayMessage}
        </p>

        <div className="mt-4 pt-3.5 border-t border-[#222222] flex items-center justify-center space-x-2">
          <span className="text-xs text-[#8A8A8A] font-medium">Status:</span>
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
            <span>{statusText}</span>
          </span>
        </div>

        <div className="mt-5 pt-1">
          <button
            type="button"
            id="transaction-success-modal-done-button"
            onClick={handleClose}
            className="w-full py-3 px-4 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] active:bg-[#303030] text-white text-xs sm:text-sm font-bold border border-[#2F2F2F] transition-colors cursor-pointer flex items-center justify-center space-x-2 shadow-sm"
          >
            <span>Done</span>
          </button>
        </div>

        <div className="w-full bg-[#202020] h-1 rounded-full mt-4 overflow-hidden">
          <div
            className="bg-[#00C853] h-full rounded-full"
            style={{
              width: `${Math.max(0, Math.min(100, progressPercent))}%`,
              transition: 'width 60ms linear'
            }}
          />
        </div>
      </div>
    </div>
  );
};
