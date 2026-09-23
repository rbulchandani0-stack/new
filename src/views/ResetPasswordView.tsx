import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiService } from '../services/api';

interface ResetPasswordViewProps {
  token: string;
  onOpenLogin: (emailPrefill?: string) => void;
  onBackToHome: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  token,
  onOpenLogin,
  onBackToHome
}) => {
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [verifyError, setVerifyError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    let mounted = true;
    if (!token || token.trim() === '') {
      setVerifying(false);
      setTokenValid(false);
      setVerifyError('Missing password reset token in URL.');
      return;
    }

    setVerifying(true);
    setVerifyError('');

    apiService.verifyResetToken(token)
      .then(res => {
        if (!mounted) return;
        if (res.valid) {
          setTokenValid(true);
          setAccountEmail(res.email || '');
        } else {
          setTokenValid(false);
          setVerifyError(res.error || 'This reset link is invalid or has expired.');
        }
      })
      .catch(err => {
        if (!mounted) return;
        setTokenValid(false);
        setVerifyError(err.message || 'Unable to verify reset token. Please request a new link.');
      })
      .finally(() => {
        if (mounted) setVerifying(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  // Password validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && hasLetter && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitError('');
    setSubmitting(true);

    try {
      await apiService.resetPassword({
        token,
        newPassword,
        confirmPassword
      });
      setResetSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to update password. Please try again or request a new reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-[#121212] border border-[#222222] rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white font-sans">
        {/* Subtle accent glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-[#00C853] rounded-full shadow-[0_0_20px_#00C853]" />

        {/* 1. Loading Verification State */}
        {verifying && (
          <div className="text-center py-12 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center mx-auto text-[#00C853]">
              <div className="w-6 h-6 border-2 border-[#00C853] border-t-transparent rounded-full animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-white">Verifying Security Token</h3>
            <p className="text-xs text-[#8A8A8A] max-w-xs mx-auto">
              Please wait while we validate your one-time password reset link...
            </p>
          </div>
        )}

        {/* 2. Invalid or Expired Token State */}
        {!verifying && !tokenValid && (
          <div className="space-y-6 text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 flex items-center justify-center mx-auto text-[#FF3B30]">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white">Reset Link Expired or Invalid</h3>
              <p className="text-xs text-[#8A8A8A] mt-2 leading-relaxed">
                {verifyError || 'For security purposes, password reset links expire after 30 minutes and can only be used once.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#262626] text-xs text-[#A0A0A0] text-left space-y-2">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#00C853]" />
                Security Advisory
              </p>
              <p>
                To reset your password, please return to the login screen and submit a fresh "Forgot Password" request.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenLogin()}
                className="w-full py-3 bg-[#00C853] hover:bg-[#00B048] text-black font-bold text-xs rounded-xl shadow-lg shadow-[#00C853]/20 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
              >
                Request New Reset Link
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onBackToHome}
                className="w-full py-2.5 text-xs text-[#8A8A8A] hover:text-white transition-colors"
              >
                Return to Homepage
              </button>
            </div>
          </div>
        )}

        {/* 3. Successful Reset State */}
        {!verifying && tokenValid && resetSuccess && (
          <div className="space-y-6 text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center mx-auto text-[#00C853]">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white">Password Updated Successfully</h3>
              <p className="text-xs text-[#8A8A8A] mt-2 leading-relaxed">
                Your account password has been changed securely. All prior active sessions have been invalidated.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#00C853]/10 border border-[#00C853]/30 text-xs text-[#CCCCCC] text-left space-y-1.5">
              <p className="font-semibold text-white">Institutional Security Verified</p>
              <p className="text-[#8A8A8A]">
                You can now log in to the eToro Global trading terminal with your new credentials.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenLogin()}
              className="w-full py-3.5 bg-[#00C853] hover:bg-[#00B048] text-black font-bold text-xs rounded-xl shadow-lg shadow-[#00C853]/20 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
            >
              Sign In to Account
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4. Active Password Entry Form */}
        {!verifying && tokenValid && !resetSuccess && (
          <div className="space-y-5">
            {/* Header */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center mx-auto mb-3 text-[#00C853]">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Create New Password</h3>
              <p className="text-xs text-[#8A8A8A] mt-1.5">
                Resetting password for <span className="text-[#00C853] font-mono font-medium">{accountEmail || 'your account'}</span>
              </p>
            </div>

            {/* Error banner */}
            {submitError && (
              <div className="p-3 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[#FF3B30] text-xs flex items-center space-x-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="text-left">
                <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8A8A8A] absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 8 characters"
                    className="w-full bg-[#1A1A1A] border border-[#222222] focus:border-[#00C853] rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-[#555] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#8A8A8A] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="text-left">
                <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8A8A8A] absolute left-3 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-[#1A1A1A] border border-[#222222] focus:border-[#00C853] rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-[#555] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-[#8A8A8A] hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Live Password Strength Requirements Checklist */}
              <div className="p-3.5 rounded-xl bg-[#181818] border border-[#242424] space-y-1.5 text-[11px] text-left">
                <p className="font-semibold text-[#8A8A8A] mb-1">Password Requirements:</p>
                <div className={`flex items-center gap-2 ${hasMinLength ? 'text-[#00C853]' : 'text-[#666666]'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-[#00C853]' : 'bg-[#444444]'}`} />
                  <span>Minimum 8 characters</span>
                </div>
                <div className={`flex items-center gap-2 ${hasLetter ? 'text-[#00C853]' : 'text-[#666666]'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasLetter ? 'bg-[#00C853]' : 'bg-[#444444]'}`} />
                  <span>Contains letters</span>
                </div>
                <div className={`flex items-center gap-2 ${hasNumber ? 'text-[#00C853]' : 'text-[#666666]'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasNumber ? 'bg-[#00C853]' : 'bg-[#444444]'}`} />
                  <span>Contains numbers</span>
                </div>
                {confirmPassword.length > 0 && (
                  <div className={`flex items-center gap-2 ${passwordsMatch ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${passwordsMatch ? 'bg-[#00C853]' : 'bg-[#FF3B30]'}`} />
                    <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className="w-full py-3.5 bg-[#00C853] hover:bg-[#00B048] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-xs rounded-xl shadow-lg shadow-[#00C853]/20 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Updating Password...
                  </span>
                ) : (
                  'Reset & Secure Password'
                )}
              </button>
            </form>

            <div className="pt-2 text-center border-t border-[#222]">
              <button
                type="button"
                onClick={onBackToHome}
                className="text-xs text-[#8A8A8A] hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Cancel and return to home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
