import React, { useState, useEffect } from 'react';
import { MapPin, Phone, MessageSquare, Mail, Clock, Globe } from 'lucide-react';
import { apiService } from '../services/api';

export const ContactSection: React.FC = () => {
  const [contactInfo, setContactInfo] = useState<{
    address?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    officeHours?: string;
  }>({
    address: '123 Canary Wharf, London, E14 5AB, United Kingdom',
    phone: '+44 20 7946 0958',
    whatsapp: '+44 20 7946 0958',
    email: 'support@etoroglobal.com',
    officeHours: '24/7 Global Desk'
  });

  useEffect(() => {
    apiService.getSettings().then(s => {
      if (s && s.contactInfo) {
        setContactInfo({
          ...contactInfo,
          ...s.contactInfo
        });
      }
    }).catch(() => {});
  }, []);

  const waNumber = contactInfo.whatsapp ? contactInfo.whatsapp.replace(/[^0-9]/g, '') : '442079460958';

  return (
    <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 lg:p-8 space-y-6">
      <div className="flex flex-col space-y-1">
        <span className="text-[11px] font-extrabold text-[#00C853] uppercase tracking-wider font-mono">GLOBAL ASSISTANCE</span>
        <h3 className="text-xl font-bold text-white">Contact & Support Channels</h3>
        <p className="text-xs text-[#8A8A8A]">Reach our 24/7 institutional trading desk and global client success representatives anytime.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
        {/* Office Address */}
        <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-[#00C853]">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="font-bold uppercase tracking-wide text-white">Headquarters</span>
          </div>
          <p className="text-[#8A8A8A] leading-relaxed pl-6">
            {contactInfo.address || '123 Canary Wharf, London, E14 5AB, United Kingdom'}
          </p>
        </div>

        {/* Phone Support */}
        <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-[#00C853]">
            <Phone className="w-4 h-4 shrink-0" />
            <span className="font-bold uppercase tracking-wide text-white">Phone Support</span>
          </div>
          <div className="pl-6 space-y-1">
            <a href={`tel:${contactInfo.phone}`} className="text-white hover:text-[#00C853] transition-colors block font-bold">
              {contactInfo.phone || '+44 20 7946 0958'}
            </a>
            <span className="text-[11px] text-[#8A8A8A] block">Direct Global Line</span>
          </div>
        </div>

        {/* WhatsApp Chat */}
        <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-[#00C853]">
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="font-bold uppercase tracking-wide text-white">WhatsApp Support</span>
          </div>
          <div className="pl-6 space-y-1">
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noreferrer"
              className="text-white hover:text-[#00C853] transition-colors block font-bold underline"
            >
              {contactInfo.whatsapp || '+44 20 7946 0958'}
            </a>
            <span className="text-[11px] text-[#8A8A8A] block">Instant Direct Chat</span>
          </div>
        </div>

        {/* Email Support */}
        <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-[#00C853]">
            <Mail className="w-4 h-4 shrink-0" />
            <span className="font-bold uppercase tracking-wide text-white">Email Address</span>
          </div>
          <div className="pl-6 space-y-1">
            <a href={`mailto:${contactInfo.email}`} className="text-white hover:text-[#00C853] transition-colors block font-bold">
              {contactInfo.email || 'support@etoroglobal.com'}
            </a>
            <span className="text-[11px] text-[#8A8A8A] block">24-hour response SLA</span>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-[#00C853]">
            <Clock className="w-4 h-4 shrink-0" />
            <span className="font-bold uppercase tracking-wide text-white">Desk Hours</span>
          </div>
          <div className="pl-6 space-y-1">
            <span className="text-white font-bold block">{contactInfo.officeHours || '24/7 Global Desk'}</span>
            <span className="text-[11px] text-[#8A8A8A] block">Always Online & Operational</span>
          </div>
        </div>

        {/* Live Support Launcher */}
        <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-[#00C853]">
              <Globe className="w-4 h-4 shrink-0" />
              <span className="font-bold uppercase tracking-wide text-white">Live Support</span>
            </div>
            <p className="text-[11px] text-[#8A8A8A] pl-6">Instant messaging with our support engineers.</p>
          </div>
          <button
            onClick={() => window.dispatchEvent(new Event('open-support-chat'))}
            className="mt-3 ml-6 py-2 px-4 bg-[#00C853]/10 hover:bg-[#00C853] text-[#00C853] hover:text-black font-extrabold text-xs rounded-xl transition-all border border-[#00C853]/30 uppercase text-center"
          >
            Open Live Chat
          </button>
        </div>
      </div>
    </div>
  );
};
