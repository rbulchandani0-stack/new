import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  KeyRound, 
  Smartphone, 
  Globe, 
  Clock, 
  CheckCircle2, 
  Trash2, 
  AlertCircle,
  ShieldCheck,
  Monitor
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { LoginHistoryItem, UserSession } from '../types';
import { formatIST } from '../utils/dateUtils';

export const SecurityPage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.is2FAEnabled || false);
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [otpInput, setOtpInput] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);

  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [twoFaMsg, setTwoFaMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (refreshUser) refreshUser();
    loadSecurityData();
  }, []);

  useEffect(() => {
    setIs2FAEnabled(Boolean(user?.is2FAEnabled));
  }, [user?.is2FAEnabled]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      const [hist, sess] = await Promise.all([
        apiService.getLoginHistory(),
        apiService.getUserSessions()
      ]);
      setLoginHistory(hist);
      setSessions(sess);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleOpen2FASetup = async () => {
    try {
      setTwoFaMsg(null);
      const res = await apiService.get2FASetup();
      setQrCodeUrl(res.qrCodeUrl);
      setSecretKey(res.secret);
      setShow2FASetupModal(true);
    } catch (err: any) {
      setTwoFaMsg({ type: 'error', text: err.message || 'Failed to fetch 2FA setup' });
    }
  };

  const handleConfirmEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length !== 6) {
      setTwoFaMsg({ type: 'error', text: 'Please enter a valid 6-digit OTP code from Google Authenticator.' });
      return;
    }

    try {
      setTwoFaMsg(null);
      const res = await apiService.enable2FA(otpInput.trim());
      setIs2FAEnabled(res.is2FAEnabled);
      setTwoFaMsg({ type: 'success', text: res.message });
      setShow2FASetupModal(false);
      setOtpInput('');
      if (refreshUser) refreshUser();
    } catch (err: any) {
      setTwoFaMsg({ type: 'error', text: err.message || 'Failed to enable 2FA. Verify code.' });
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('Enter 6-digit Google Authenticator code to confirm disabling 2FA:');
    if (!code) return;

    try {
      setTwoFaMsg(null);
      const res = await apiService.disable2FA(code.trim());
      setIs2FAEnabled(res.is2FAEnabled);
      setTwoFaMsg({ type: 'success', text: res.message });
      if (refreshUser) refreshUser();
    } catch (err: any) {
      setTwoFaMsg({ type: 'error', text: err.message || 'Failed to disable 2FA' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPwMsg({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }

    try {
      setPwMsg(null);
      const res = await apiService.changePassword(currentPassword, newPassword);
      setPwMsg({ type: 'success', text: res.message || 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.message || 'Failed to update password' });
    }
  };

  const handleRevokeSession = async (id: string) => {
    try {
      await apiService.revokeSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Lock className="w-6 h-6 text-[#00C853]" />
            <h1 className="text-2xl font-extrabold text-white">Security & Authenticator</h1>
          </div>
          <p className="text-xs text-[#8A8A8A] mt-1">Manage passwords, Two-Factor Authentication (2FA), and active device sessions</p>
        </div>
      </div>

      {/* 2FA TOGGLE BOX */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-[#00C853]" />
            <h3 className="text-base font-extrabold text-white">Two-Factor Authentication (2FA)</h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              is2FAEnabled ? 'bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30' : 'bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/30'
            }`}>
              {is2FAEnabled ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
          <p className="text-xs text-[#8A8A8A]">
            Protect your trading account and withdrawal orders using Google Authenticator / TOTP.
          </p>
          {twoFaMsg && (
            <p className={`text-xs font-mono pt-1 ${twoFaMsg.type === 'success' ? 'text-[#00C853]' : 'text-red-400'}`}>
              {twoFaMsg.text}
            </p>
          )}
        </div>

        <button
          onClick={is2FAEnabled ? handleDisable2FA : handleOpen2FASetup}
          className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all shadow-lg flex items-center justify-center space-x-2 ${
            is2FAEnabled
              ? 'bg-[#1E1E1E] hover:bg-[#2A2A2A] text-[#FF3B30] border border-[#FF3B30]/30'
              : 'bg-[#00C853] hover:bg-[#00B048] text-black shadow-[#00C853]/20'
          }`}
        >
          {is2FAEnabled ? 'Disable 2FA' : 'Setup Google Authenticator'}
        </button>
      </div>

      {/* 2FA SETUP MODAL */}
      {show2FASetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-[#222222] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white space-y-4">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-[#00C853]" />
                <h3 className="font-extrabold text-sm text-white">Google Authenticator 2FA Setup</h3>
              </div>
              <button onClick={() => setShow2FASetupModal(false)} className="text-[#8A8A8A] hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs text-[#AAA]">
              <p>1. Scan this QR code with Google Authenticator app on your smartphone:</p>
              
              {qrCodeUrl && (
                <div className="flex justify-center bg-white p-3 rounded-xl w-44 mx-auto shadow-inner">
                  <img src={qrCodeUrl} alt="2FA QR Code" className="w-38 h-38" />
                </div>
              )}

              <div className="bg-[#1A1A1A] p-2.5 rounded-xl border border-[#262626] font-mono text-[11px] text-center">
                <span className="text-[#888] block text-[10px]">SECRET KEY (MANUAL ENTRY):</span>
                <span className="text-[#00C853] font-bold tracking-widest">{secretKey}</span>
              </div>

              <p className="pt-2">2. Enter the 6-digit OTP code generated in your app to activate:</p>
              
              <form onSubmit={handleConfirmEnable2FA} className="space-y-3">
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-[#1A1A1A] border border-[#333] focus:border-[#00C853] rounded-xl px-3 py-2.5 text-center tracking-[6px] font-mono text-base text-white outline-none"
                />

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold text-xs rounded-xl shadow-lg transition-all uppercase tracking-wider"
                >
                  Verify & Enable 2FA
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD */}
      <form onSubmit={handleChangePassword} className="bg-[#121212] border border-[#222222] rounded-2xl p-6 lg:p-8 space-y-6">
        <div className="border-b border-[#222222] pb-4 flex items-center space-x-2">
          <KeyRound className="w-5 h-5 text-[#00C853]" />
          <h2 className="text-base font-extrabold text-white">Change Account Password</h2>
        </div>

        {pwMsg && (
          <div className={`p-3 rounded-xl text-xs font-mono border ${
            pwMsg.type === 'success' ? 'bg-[#00C853]/10 border-[#00C853]/30 text-[#00C853]' : 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]'
          }`}>
            {pwMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1.5">CURRENT PASSWORD</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#00C853] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1.5">NEW PASSWORD</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#00C853] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8A8A8A] mb-1.5">CONFIRM NEW PASSWORD</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#00C853] transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-[#00C853]/20 uppercase tracking-wider"
        >
          Update Password
        </button>
      </form>

      {/* ACTIVE SESSIONS */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-white">Active Device Sessions</h3>
            <p className="text-xs text-[#8A8A8A]">Manage devices currently authenticated into your trading account</p>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-[#00C853]/10 text-[#00C853] font-mono text-xs font-bold border border-[#00C853]/25">
            {sessions.length} ACTIVE
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {sessions.length === 0 ? (
            <p className="text-xs text-[#8A8A8A]">No active sessions found.</p>
          ) : (
            sessions.map(s => {
              const isMobile = /iphone|android|mobile/i.test(s.device || '');
              return (
                <div key={s.id} className="bg-[#1A1A1A] border border-[#262626] hover:border-[#333] transition-colors rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#222] border border-[#333] flex items-center justify-center text-[#00C853] shrink-0">
                      {isMobile ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className="font-bold text-white truncate">{s.device}</span>
                        {s.isCurrent && (
                          <span className="px-2 py-0.5 bg-[#00C853]/20 text-[#00C853] text-[10px] rounded font-bold border border-[#00C853]/30">
                            THIS DEVICE
                          </span>
                        )}
                      </div>
                      <div className="text-[#8A8A8A] text-[11px] flex items-center space-x-2 flex-wrap">
                        <span>IP: <strong className="text-white">{s.ip}</strong></span>
                        <span>•</span>
                        <span>Location: <strong className="text-white">{s.location || 'Global Secure Node'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {!s.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      className="px-3 py-2 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/25 text-[#FF3B30] rounded-xl transition-all flex items-center space-x-1.5 shrink-0 font-sans text-xs font-bold"
                      title="Revoke Session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* LOGIN HISTORY */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-white">Recent Login Activity</h3>
          <p className="text-xs text-[#8A8A8A]">Audit trail of recent authentication timestamps and IP addresses</p>
        </div>

        <div className="overflow-x-auto pt-2">
          {loginHistory.length === 0 ? (
            <p className="text-xs text-[#8A8A8A]">No recent login history recorded.</p>
          ) : (
            <table className="w-full text-left font-mono text-xs whitespace-nowrap">
              <thead>
                <tr className="text-[#8A8A8A] border-b border-[#222] text-[11px]">
                  <th className="pb-3 font-bold uppercase tracking-wider">TIMESTAMP</th>
                  <th className="pb-3 font-bold uppercase tracking-wider">IP ADDRESS</th>
                  <th className="pb-3 font-bold uppercase tracking-wider">DEVICE / BROWSER</th>
                  <th className="pb-3 font-bold uppercase tracking-wider">LOCATION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {loginHistory.map(h => (
                  <tr key={h.id} className="hover:bg-[#151515] transition-colors">
                    <td className="py-3 text-white font-medium">{formatIST(h.timestamp)}</td>
                    <td className="py-3 text-[#00C853] font-bold">{h.ip}</td>
                    <td className="py-3 text-[#C0C0C0] flex items-center space-x-2">
                      <Globe className="w-3.5 h-3.5 text-[#8A8A8A]" />
                      <span>{h.device}</span>
                    </td>
                    <td className="py-3 text-[#8A8A8A]">{h.location || 'Global Secure Node'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
