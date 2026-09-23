import React, { useEffect, useRef } from 'react';
import { ShieldCheck, CheckCircle2, Clock, X, Check, ArrowRight } from 'lucide-react';
import { feedbackService } from '../services/feedbackService';

interface KYCConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType?: string;
  documentNumber?: string;
}

export const KYCConfirmationModal: React.FC<KYCConfirmationModalProps> = ({
  isOpen,
  onClose,
  documentType,
  documentNumber
}) => {
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store current active element to restore focus on close
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;

      // Lock body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Auto-focus primary button
      const timer = setTimeout(() => {
        primaryButtonRef.current?.focus();
      }, 50);

      // Keyboard listener for Escape key
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
        if (previouslyFocusedElementRef.current) {
          previouslyFocusedElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kyc-modal-title"
      aria-describedby="kyc-modal-description"
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Modal Card */}
      <div className="relative w-full max-w-md bg-[#121212] border border-[#262626] rounded-2xl shadow-2xl p-6 sm:p-8 text-center transform transition-all duration-300 animate-in fade-in zoom-in-95 z-10 space-y-6">
        {/* Top-Right Accessible Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8A8A8A] hover:text-white hover:bg-[#222222] p-2 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Verification Success Icon with Glow */}
        <div className="flex justify-center pt-2">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#00C853]/15 border border-[#00C853]/30 flex items-center justify-center text-[#00C853] shadow-lg shadow-[#00C853]/10">
              <ShieldCheck className="w-9 h-9 sm:w-11 sm:h-11 text-[#00C853]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#00C853] text-black flex items-center justify-center shadow-md">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h2
            id="kyc-modal-title"
            className="text-xl sm:text-2xl font-extrabold text-white tracking-tight"
          >
            KYC Submitted Successfully!
          </h2>
          <p className="text-xs text-[#8A8A8A]">
            Real Name Authentication
          </p>
        </div>

        {/* Status Indicator Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#00C853]/10 border border-[#00C853]/30 text-[#00C853] text-xs font-extrabold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-[#00C853] animate-pulse" />
            <span>KYC Status: Under Review</span>
          </div>
        </div>

        {/* Informational Message Body */}
        <div
          id="kyc-modal-description"
          className="bg-[#181818] border border-[#262626] rounded-xl p-4 text-xs text-[#CCCCCC] leading-relaxed text-left space-y-2.5"
        >
          <p className="font-semibold text-white">
            Your KYC documents have been submitted successfully.
          </p>
          <p className="text-[#AAAAAA]">
            Our Compliance Team is currently reviewing your documents. The review typically takes 15–20 minutes. You will receive a notification once your verification status has been updated.
          </p>
          <p className="text-[#8A8A8A] pt-0.5 border-t border-[#262626] text-[11px]">
            Thank you for your patience.
          </p>

          {(documentType || documentNumber) && (
            <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-[11px] text-[#8A8A8A] font-mono">
              {documentType && (
                <span>Type: <strong className="text-white uppercase">{documentType.replace('_', ' ')}</strong></span>
              )}
              {documentNumber && (
                <span>ID: <strong className="text-white">{documentNumber}</strong></span>
              )}
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="pt-1">
          <button
            ref={primaryButtonRef}
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-4 bg-[#00C853] hover:bg-[#00E676] active:scale-[0.99] text-black font-extrabold rounded-xl text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-[#00C853]/20 flex items-center justify-center space-x-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00C853] focus:ring-offset-2 focus:ring-offset-[#121212]"
          >
            <span>Got It</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
