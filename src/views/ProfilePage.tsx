import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, ShieldCheck, Mail, Calendar, Key, AlertTriangle } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-xs text-[#8A8A8A]">
        Please sign in to view your profile settings.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-[#00C853]/15 text-[#00C853] flex items-center justify-center">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Account & Verification Profile</h2>
          <p className="text-xs text-[#8A8A8A]">Manage personal information, KYC tier, and security settings</p>
        </div>
      </div>

      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 space-y-6">
        <div className="flex items-center space-x-4 pb-6 border-b border-[#1E1E1E]">
          <div className="w-16 h-16 rounded-2xl bg-[#1C1C1C] border border-[#2A2A2A] flex items-center justify-center text-2xl font-black text-[#00C853]">
            {user.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{user.name}</h3>
            <div className="text-xs text-[#8A8A8A] flex items-center space-x-2 mt-1">
              <Mail className="w-3.5 h-3.5" />
              <span>{user.email}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-[#181818] rounded-xl border border-[#242424] space-y-1">
            <span className="text-[#8A8A8A]">Account Role</span>
            <div className="text-white font-bold capitalize">{user.role.replace('_', ' ')}</div>
          </div>

          <div className="p-4 bg-[#181818] rounded-xl border border-[#242424] space-y-1">
            <span className="text-[#8A8A8A]">Identity KYC Verification</span>
            <div className="text-[#00C853] font-bold capitalize flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>{user.kycStatus || 'Verified Level 2'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
