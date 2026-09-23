import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { feedbackService } from '../services/feedbackService';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        await login({ email, password });
        feedbackService.showToast({ type: 'success', message: 'Welcome back!' });
      } else {
        if (!name.trim()) {
          throw new Error('Please enter your full name');
        }
        await register({ name, email, password });
        feedbackService.showToast({ type: 'success', message: 'Account created successfully!' });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-[#141414] border border-[#282828] rounded-2xl p-6 sm:p-8 shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#8A8A8A] hover:text-white bg-[#1F1F1F]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <h3 className="text-xl font-extrabold text-white">
            {mode === 'login' ? 'Sign In to ApexTrader' : 'Create Live Account'}
          </h3>
          <p className="text-xs text-[#8A8A8A] mt-1.5">
            {mode === 'login'
              ? 'Access institutional liquidity and live trading desk'
              : 'Start trading global markets in less than a minute'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#FF3B30]/15 border border-[#FF3B30]/40 text-[#FF3B30] text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-[#666666]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alexander Vance"
                  className="w-full bg-[#1C1C1C] border border-[#2B2B2B] focus:border-[#00C853] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-[#666666]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#1C1C1C] border border-[#2B2B2B] focus:border-[#00C853] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-[#666666]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1C1C1C] border border-[#2B2B2B] focus:border-[#00C853] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#00C853] hover:bg-[#00E676] text-black font-bold text-sm transition-colors flex items-center justify-center space-x-2 mt-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#222222] text-center text-xs text-[#8A8A8A]">
          {mode === 'login' ? (
            <div>
              Don't have an account?{' '}
              <button
                onClick={() => setMode('register')}
                className="text-[#00C853] font-bold hover:underline"
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-[#00C853] font-bold hover:underline"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
