import React from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  FileText, 
  TrendingUp, 
  Scale, 
  AlertTriangle, 
  Globe, 
  Cpu, 
  Server, 
  Headphones, 
  BookOpen, 
  Key, 
  Layers, 
  CheckCircle2,
  Building2,
  HelpCircle,
  BarChart2
} from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  topic: string;
  onClose: () => void;
  onStartTrading?: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  topic,
  onClose,
  onStartTrading
}) => {
  if (!isOpen || !topic) return null;

  const renderContent = () => {
    const key = topic.toLowerCase();

    if (key.includes('terms') || key.includes('service')) {
      return (
        <div className="space-y-4 text-xs text-[#C0C0C0] leading-relaxed">
          <div className="flex items-center space-x-2 text-[#00C853] font-bold text-sm">
            <Scale className="w-5 h-5" />
            <span>eToro Global Terms of Service</span>
          </div>
          <p>
            Welcome to eToro Global. By accessing or using our institutional trading platform, mobile applications, APIs, or related services, you agree to be bound by these Terms of Service.
          </p>
          <h4 className="font-bold text-white text-xs mt-3">1. Account Eligibility & Verification</h4>
          <p>
            Users must be at least 18 years of age and reside in a permitted jurisdiction. All accounts require Tier-1 Real Name Authentication prior to executing spot, margin, or perpetual derivative trades.
          </p>
          <h4 className="font-bold text-white text-xs mt-3">2. Trading Execution & Liquidity</h4>
          <p>
            eToro Global utilizes an ultra-low latency C++ matching engine providing sub-millisecond execution. Orders are matched on an aggregated order book with institutional liquidity providers.
          </p>
          <h4 className="font-bold text-white text-xs mt-3">3. Risk & Margin Liquidation</h4>
          <p>
            Trading cryptocurrencies, forex, commodities, and leveraged derivatives carries significant financial risk. Positions falling below maintenance margin requirements are subject to automated partial or total liquidation.
          </p>
          <h4 className="font-bold text-white text-xs mt-3">4. Security & Fund Safeguarding</h4>
          <p>
            User assets are held in 1:1 multi-signature cold vaults backed by our $500M Insurance Protection Vault.
          </p>
        </div>
      );
    }

    if (key.includes('privacy')) {
      return (
        <div className="space-y-4 text-xs text-[#C0C0C0] leading-relaxed">
          <div className="flex items-center space-x-2 text-[#00C853] font-bold text-sm">
            <Lock className="w-5 h-5" />
            <span>eToro Global Privacy Policy</span>
          </div>
          <p>
            eToro Global is committed to protecting user privacy and financial data confidentiality in accordance with global standards (GDPR, SOC2 Type II, ISO/IEC 27001).
          </p>
          <h4 className="font-bold text-white text-xs mt-3">1. Information We Collect</h4>
          <p>
            We collect personal identity data (name, email, phone, government ID documents for Real Name Authentication), device identifiers, IP addresses, and transactional history to fulfill legal compliance.
          </p>
          <h4 className="font-bold text-white text-xs mt-3">2. Data Encryption & Storage</h4>
          <p>
            All sensitive credentials, documents, and API keys are encrypted at rest using AES-256-GCM encryption and transmitted over TLS 1.3 secure channels.
          </p>
          <h4 className="font-bold text-white text-xs mt-3">3. Third-Party Sharing</h4>
          <p>
            We never sell or lease user data to third-party marketing firms. Data is shared exclusively with certified identity verification providers and regulatory authorities when required by law.
          </p>
        </div>
      );
    }

    if (key.includes('risk') || key.includes('disclosure')) {
      return (
        <div className="space-y-4 text-xs text-[#C0C0C0] leading-relaxed">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <span>Risk Management & High-Leverage Disclosure</span>
          </div>
          <p>
            Leveraged trading on digital assets, commodities (Gold/Silver), and Forex currencies involves extreme volatility and high potential for rapid financial losses.
          </p>
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] leading-relaxed font-mono">
            WARNING: High leverage (up to 500x) amplifies both potential profits and potential losses. You should never invest funds that you cannot afford to lose completely.
          </div>
          <h4 className="font-bold text-white text-xs mt-3">Key Risk Factors:</h4>
          <ul className="list-disc pl-5 space-y-1 text-[#AAA]">
            <li>Market Volatility: Cryptocurrency prices can fluctuate drastically within seconds.</li>
            <li>Liquidation Risk: Leveraged positions automatically liquidate if equity falls below margin requirements.</li>
            <li>Operational Risks: Internet transmission disruptions or market gaps during extreme news events.</li>
          </ul>
        </div>
      );
    }

    if (key.includes('aml') || key.includes('anti-money')) {
      return (
        <div className="space-y-4 text-xs text-[#C0C0C0] leading-relaxed">
          <div className="flex items-center space-x-2 text-[#00C853] font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>Anti-Money Laundering (AML) Policy</span>
          </div>
          <p>
            eToro Global strictly adheres to FATF (Financial Action Task Force) guidance and international Anti-Money Laundering standards to prevent illicit financial activity.
          </p>
          <h4 className="font-bold text-white text-xs mt-3">1. Continuous Wallet Screening</h4>
          <p>
            All incoming and outgoing cryptocurrency transactions are scanned using real-time chain analysis to detect sanctions compliance, mixer activity, or suspicious sources.
          </p>
          <h4 className="font-bold text-white text-xs mt-3">2. Transaction Monitoring</h4>
          <p>
            Our compliance desk monitors unusual deposit/withdrawal velocity or structuring patterns, automatically flagging high-risk transfers for human review.
          </p>
        </div>
      );
    }

    if (key.includes('kyc') || key.includes('identity') || key.includes('auth')) {
      return (
        <div className="space-y-4 text-xs text-[#C0C0C0] leading-relaxed">
          <div className="flex items-center space-x-2 text-[#00C853] font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Real Name Authentication Policy</span>
          </div>
          <p>
            To ensure institutional security and regulatory compliance, eToro Global enforces mandatory Real Name Authentication for all active trading accounts.
          </p>
          <h4 className="font-bold text-white text-xs mt-3">Authentication Tier Requirements:</h4>
          <div className="space-y-2 font-mono text-[11px]">
            <div className="p-2.5 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
              <span className="text-[#00C853] font-bold">Tier 1 Authentication:</span> Government Passport/National ID + Liveness Snapshot. Enables unlimited spot & futures trading and $500,000 daily withdrawals.
            </div>
            <div className="p-2.5 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
              <span className="text-[#00C853] font-bold">Tier 2 Institutional:</span> Proof of Address + Corporate Entity Docs. Enables unlimited fiat/bank wire transfers and OTC liquidity access.
            </div>
          </div>
        </div>
      );
    }

    if (key.includes('audit') || key.includes('reserve') || key.includes('proof')) {
      return (
        <div className="space-y-4 text-xs text-[#C0C0C0] leading-relaxed">
          <div className="flex items-center space-x-2 text-[#00C853] font-bold text-sm">
            <FileText className="w-5 h-5" />
            <span>Real-Time Audit & 1:1 Proof of Reserves</span>
          </div>
          <p>
            eToro Global operates with 100% full-reserve backing. We publish cryptographic Merkle-tree Proof of Reserves audited in real time by independent third-party accounting firms.
          </p>
          <div className="p-3 bg-[#161616] border border-[#2A2A2A] rounded-xl space-y-2 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#8A8A8A]">Bitcoin (BTC) Reserve Ratio:</span>
              <span className="text-[#00C853] font-bold">104.2%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A8A8A]">Ethereum (ETH) Reserve Ratio:</span>
              <span className="text-[#00C853] font-bold">102.8%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A8A8A]">USDT Stablecoin Reserve Ratio:</span>
              <span className="text-[#00C853] font-bold">101.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8A8A8A]">Cold Storage Vault Insurance:</span>
              <span className="text-white font-bold">$500,000,000 USD</span>
            </div>
          </div>
        </div>
      );
    }

    if (key.includes('liquidity') || key.includes('pool') || key.includes('products') || key.includes('vault')) {
      return (
        <div className="space-y-4 text-xs text-[#C0C0C0] leading-relaxed">
          <div className="flex items-center space-x-2 text-[#00C853] font-bold text-sm">
            <Layers className="w-5 h-5" />
            <span>Institutional Deep Liquidity & Security Vaults</span>
          </div>
          <p>
            eToro Global aggregates order books across major global liquidity providers, offering institutional-grade execution speed and multi-tier security architecture.
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-3 bg-[#1A1A1A] border border-[#222] rounded-xl">
              <div className="text-white font-bold">Matching Engine</div>
              <div className="text-[#00C853] mt-1">&lt; 0.5ms Latency</div>
            </div>
            <div className="p-3 bg-[#1A1A1A] border border-[#222] rounded-xl">
              <div className="text-white font-bold">Max Leverage</div>
              <div className="text-[#00C853] mt-1">Up to 500x Margin</div>
            </div>
            <div className="p-3 bg-[#1A1A1A] border border-[#222] rounded-xl">
              <div className="text-white font-bold">Cold Vault Tech</div>
              <div className="text-[#00C853] mt-1">MPC Multi-Sig</div>
            </div>
            <div className="p-3 bg-[#1A1A1A] border border-[#222] rounded-xl">
              <div className="text-white font-bold">API Access</div>
              <div className="text-[#00C853] mt-1">FIX 4.4 & WebSocket</div>
            </div>
          </div>
        </div>
      );
    }

    // Default Company / Support / Informational page
    return (
      <div className="space-y-4 text-xs text-[#C0C0C0] leading-relaxed">
        <div className="flex items-center space-x-2 text-[#00C853] font-bold text-sm">
          <Building2 className="w-5 h-5" />
          <span>eToro Global Institutional Information</span>
        </div>
        <p>
          eToro Global is a premier financial technology and digital asset trading ecosystem. Built for both professional retail traders and institutional desks, we offer zero-fee spot markets, high-leverage perpetuals, and instant bank fiat liquidity.
        </p>
        <div className="p-3 bg-[#1A1A1A] border border-[#262626] rounded-xl space-y-2">
          <div className="text-white font-bold text-xs">Need Direct Assistance?</div>
          <p className="text-[11px] text-[#8A8A8A]">
            Our 24/7 Live Support team is online. Click the green floating headset icon at the bottom right corner of any page to chat with a live trading desk specialist immediately.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-white space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8A8A8A] hover:text-white p-1 rounded-lg hover:bg-[#222] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pr-6">
          <h3 className="text-lg font-extrabold text-white tracking-wide uppercase font-mono">
            {topic}
          </h3>
          <span className="text-[10px] text-[#8A8A8A] font-mono">eToro Global Official Platform Documentation</span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {renderContent()}
        </div>

        <div className="pt-3 border-t border-[#222] flex items-center justify-between">
          <span className="text-[10px] text-[#666] font-mono">&copy; {new Date().getFullYear()} eToro Global Technologies Inc.</span>
          {onStartTrading && (
            <button
              onClick={() => {
                onClose();
                onStartTrading();
              }}
              className="px-4 py-2 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold text-xs rounded-xl shadow-md transition-all"
            >
              Start Trading
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
