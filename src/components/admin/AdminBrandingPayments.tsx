import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Image as ImageIcon,
  QrCode,
  Globe,
  Upload,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Save,
  ShieldAlert,
  Smartphone,
  CreditCard,
  Coins,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  X,
  Lock,
  ZoomIn,
  Share2,
  MessageSquare,
  Send
} from 'lucide-react';
import { SystemSettings, FooterSettings } from '../../types';
import { apiService } from '../../services/api';

interface AdminBrandingPaymentsProps {
  initialSettings?: SystemSettings | null;
  onSettingsUpdated?: (updated: SystemSettings) => void;
  formatIST?: (dateStr: string) => string;
}

type TabType = 'all' | 'branding' | 'bank' | 'crypto' | 'footer' | 'preview';

interface CryptoWalletItem {
  network: string;
  address: string;
  qrCode?: string;
  name?: string;
  symbol?: string;
  badgeColor?: string;
}

export const AdminBrandingPayments: React.FC<AdminBrandingPaymentsProps> = ({
  initialSettings,
  onSettingsUpdated
}) => {
  const [activeSubTab, setActiveSubTab] = useState<TabType>('branding');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  // Original saved state for dirty checking & revert
  const [originalSettings, setOriginalSettings] = useState<SystemSettings | null>(null);

  // FORM STATES
  // Section A: Branding & Metadata
  const [siteName, setSiteName] = useState('eToro Global');
  const [browserTabTitle, setBrowserTabTitle] = useState('eToro - Markets & Analytics');
  const [socialShareTitle, setSocialShareTitle] = useState('eToro Global');
  const [socialShareDescription, setSocialShareDescription] = useState('Trade Forex, Crypto, Commodities, and Indices with confidence on eToro Global. Secure, fast, and professional trading platform featuring sub-millisecond execution and up to 500x leverage.');
  const [socialShareImageUrl, setSocialShareImageUrl] = useState('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=1200&h=630');
  const [socialPreviewPlatform, setSocialPreviewPlatform] = useState<'whatsapp' | 'telegram' | 'facebook'>('whatsapp');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [logoText, setLogoText] = useState('eToro Global');

  // Section B: Bank Details
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscIban, setIfscIban] = useState('');
  const [upiId, setUpiId] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [upiQrCode, setUpiQrCode] = useState('');

  // Section C: Crypto Wallets
  const [trc20Address, setTrc20Address] = useState('');
  const [trc20Qr, setTrc20Qr] = useState('');
  const [erc20Address, setErc20Address] = useState('');
  const [erc20Qr, setErc20Qr] = useState('');
  const [bep20Address, setBep20Address] = useState('');
  const [bep20Qr, setBep20Qr] = useState('');
  const [solanaAddress, setSolanaAddress] = useState('');
  const [solanaQr, setSolanaQr] = useState('');

  // Section D: Footer, Notices & Display
  const [withdrawalNotice, setWithdrawalNotice] = useState('');
  const [tradeSharingEnabled, setTradeSharingEnabled] = useState(true);
  const [customTradeLogoUrl, setCustomTradeLogoUrl] = useState('');

  const [contactAddress, setContactAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactHours, setContactHours] = useState('');

  const [footerBrandName, setFooterBrandName] = useState('');
  const [footerBrandLogoUrl, setFooterBrandLogoUrl] = useState('');
  const [footerLogoSource, setFooterLogoSource] = useState<'upload' | 'url'>('upload');
  const [footerShowEmoji, setFooterShowEmoji] = useState(true);
  const [footerEmojiIcon, setFooterEmojiIcon] = useState('e');
  const [footerDescription, setFooterDescription] = useState('');
  const [footerCopyright, setFooterCopyright] = useState('');
  const [footerDisclaimer, setFooterDisclaimer] = useState('');

  // Load Initial Settings
  const populateSettings = (data: SystemSettings) => {
    setOriginalSettings(data);
    setSiteName(data.siteName || 'eToro Global');
    setBrowserTabTitle(data.browserTabTitle || data.siteName || 'eToro - Markets & Analytics');
    setSocialShareTitle(data.socialShareTitle || data.siteName || 'eToro Global');
    setSocialShareDescription(data.socialShareDescription || 'Trade Forex, Crypto, Commodities, and Indices with confidence on eToro Global. Secure, fast, and professional trading platform featuring sub-millisecond execution and up to 500x leverage.');
    setSocialShareImageUrl(data.socialShareImageUrl || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=1200&h=630');
    setLogoUrl(data.logoUrl || '');
    setFaviconUrl(data.faviconUrl || '');
    setLogoText(data.logoText || data.siteName || 'eToro Global');

    if (data.bankDetails) {
      setBankName(data.bankDetails.bankName || '');
      setAccountName(data.bankDetails.accountName || '');
      setAccountNumber(data.bankDetails.accountNumber || '');
      setIfscIban(data.bankDetails.ifscIban || '');
      setUpiId(data.bankDetails.upiId || '');
      setSwiftCode(data.bankDetails.swiftCode || '');
      setUpiQrCode(data.bankDetails.upiQrCode || '');
    }

    if (Array.isArray(data.cryptoWallets)) {
      const trc = data.cryptoWallets.find(w => w.network?.toUpperCase() === 'TRC-20' || w.network?.toUpperCase() === 'TRC20');
      const erc = data.cryptoWallets.find(w => w.network?.toUpperCase() === 'ERC-20' || w.network?.toUpperCase() === 'ERC20');
      const bep = data.cryptoWallets.find(w => w.network?.toUpperCase() === 'BEP-20' || w.network?.toUpperCase() === 'BEP20' || w.network?.toUpperCase() === 'BSC');
      const sol = data.cryptoWallets.find(w => w.network?.toUpperCase() === 'SOLANA' || w.network?.toUpperCase() === 'SOL');

      setTrc20Address(trc?.address || '');
      setTrc20Qr(trc?.qrCode || '');
      setErc20Address(erc?.address || '');
      setErc20Qr(erc?.qrCode || '');
      setBep20Address(bep?.address || '');
      setBep20Qr(bep?.qrCode || '');
      setSolanaAddress(sol?.address || '');
      setSolanaQr(sol?.qrCode || '');
    }

    setWithdrawalNotice(data.withdrawalNotice || '');
    setTradeSharingEnabled(data.tradeSharingEnabled !== false);
    setCustomTradeLogoUrl(data.customTradeLogoUrl || '');

    if (data.contactInfo) {
      setContactAddress(data.contactInfo.address || '');
      setContactPhone(data.contactInfo.phone || '');
      setContactWhatsapp(data.contactInfo.whatsapp || '');
      setContactEmail(data.contactInfo.email || '');
      setContactHours(data.contactInfo.officeHours || '');
    }

    if (data.footerSettings) {
      setFooterBrandName(data.footerSettings.brandName || '');
      setFooterBrandLogoUrl(data.footerSettings.brandLogoUrl || '');
      setFooterLogoSource(data.footerSettings.logoSource || (data.footerSettings.brandLogoUrl && data.footerSettings.brandLogoUrl.startsWith('http') && !data.footerSettings.brandLogoUrl.includes('/uploads/') ? 'url' : 'upload'));
      setFooterShowEmoji(data.footerSettings.showEmojiLogo !== false);
      setFooterEmojiIcon(data.footerSettings.emojiIcon || 'e');
      setFooterDescription(data.footerSettings.descriptionText || '');
      setFooterCopyright(data.footerSettings.copyrightText || '');
      setFooterDisclaimer(data.footerSettings.customDisclaimer || '');
    }
  };

  useEffect(() => {
    if (initialSettings) {
      populateSettings(initialSettings);
    } else {
      loadSettingsFromServer();
    }
  }, [initialSettings]);

  const loadSettingsFromServer = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getSettings();
      if (data) {
        populateSettings(data);
      }
    } catch (err: any) {
      setErrorToast(err.message || 'Failed to load system settings');
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4500);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 6000);
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Check if any state is dirty
  const isDirty = () => {
    if (!originalSettings) return false;
    if (siteName !== (originalSettings.siteName || 'eToro Global')) return true;
    if (browserTabTitle !== (originalSettings.browserTabTitle || originalSettings.siteName || '')) return true;
    if (socialShareTitle !== (originalSettings.socialShareTitle || originalSettings.siteName || '')) return true;
    if (socialShareDescription !== (originalSettings.socialShareDescription || '')) return true;
    if (socialShareImageUrl !== (originalSettings.socialShareImageUrl || '')) return true;
    if (logoUrl !== (originalSettings.logoUrl || '')) return true;
    if (faviconUrl !== (originalSettings.faviconUrl || '')) return true;
    if (bankName !== (originalSettings.bankDetails?.bankName || '')) return true;
    if (accountName !== (originalSettings.bankDetails?.accountName || '')) return true;
    if (accountNumber !== (originalSettings.bankDetails?.accountNumber || '')) return true;
    if (ifscIban !== (originalSettings.bankDetails?.ifscIban || '')) return true;
    if (upiId !== (originalSettings.bankDetails?.upiId || '')) return true;
    if (swiftCode !== (originalSettings.bankDetails?.swiftCode || '')) return true;
    if (upiQrCode !== (originalSettings.bankDetails?.upiQrCode || '')) return true;

    // Crypto
    const origWallets = originalSettings.cryptoWallets || [];
    const origTrc = origWallets.find(w => w.network?.toUpperCase() === 'TRC-20' || w.network?.toUpperCase() === 'TRC20');
    const origErc = origWallets.find(w => w.network?.toUpperCase() === 'ERC-20' || w.network?.toUpperCase() === 'ERC20');
    const origBep = origWallets.find(w => w.network?.toUpperCase() === 'BEP-20' || w.network?.toUpperCase() === 'BEP20' || w.network?.toUpperCase() === 'BSC');
    const origSol = origWallets.find(w => w.network?.toUpperCase() === 'SOLANA' || w.network?.toUpperCase() === 'SOL');

    if (trc20Address !== (origTrc?.address || '') || trc20Qr !== (origTrc?.qrCode || '')) return true;
    if (erc20Address !== (origErc?.address || '') || erc20Qr !== (origErc?.qrCode || '')) return true;
    if (bep20Address !== (origBep?.address || '') || bep20Qr !== (origBep?.qrCode || '')) return true;
    if (solanaAddress !== (origSol?.address || '') || solanaQr !== (origSol?.qrCode || '')) return true;

    // Footer & Notices
    if (withdrawalNotice !== (originalSettings.withdrawalNotice || '')) return true;
    if (tradeSharingEnabled !== (originalSettings.tradeSharingEnabled !== false)) return true;
    if (customTradeLogoUrl !== (originalSettings.customTradeLogoUrl || '')) return true;
    if (contactAddress !== (originalSettings.contactInfo?.address || '')) return true;
    if (contactPhone !== (originalSettings.contactInfo?.phone || '')) return true;
    if (contactWhatsapp !== (originalSettings.contactInfo?.whatsapp || '')) return true;
    if (contactEmail !== (originalSettings.contactInfo?.email || '')) return true;
    if (contactHours !== (originalSettings.contactInfo?.officeHours || '')) return true;

    if (footerBrandName !== (originalSettings.footerSettings?.brandName || '')) return true;
    if (footerBrandLogoUrl !== (originalSettings.footerSettings?.brandLogoUrl || '')) return true;
    if (footerLogoSource !== (originalSettings.footerSettings?.logoSource || 'upload')) return true;
    if (footerShowEmoji !== (originalSettings.footerSettings?.showEmojiLogo !== false)) return true;
    if (footerEmojiIcon !== (originalSettings.footerSettings?.emojiIcon || 'e')) return true;
    if (footerDescription !== (originalSettings.footerSettings?.descriptionText || '')) return true;
    if (footerCopyright !== (originalSettings.footerSettings?.copyrightText || '')) return true;
    if (footerDisclaimer !== (originalSettings.footerSettings?.customDisclaimer || '')) return true;

    return false;
  };

  const handleRevertAll = () => {
    if (originalSettings) {
      populateSettings(originalSettings);
      showSuccess('All unsaved edits have been reverted to saved configuration.');
    }
  };

  // Build Payload
  const buildPayload = (): Partial<SystemSettings> => {
    return {
      siteName: siteName.trim() || 'eToro Global',
      browserTabTitle: browserTabTitle.trim() || siteName.trim() || 'eToro - Markets & Analytics',
      socialShareTitle: socialShareTitle.trim() || siteName.trim() || 'eToro Global',
      socialShareDescription: socialShareDescription.trim(),
      socialShareImageUrl: socialShareImageUrl.trim(),
      logoUrl: logoUrl.trim(),
      faviconUrl: faviconUrl.trim(),
      logoText: siteName.trim() || 'eToro Global',
      tradeSharingEnabled,
      customTradeLogoUrl: customTradeLogoUrl.trim(),
      withdrawalNotice: withdrawalNotice.trim(),
      bankDetails: {
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        ifscIban: ifscIban.trim(),
        upiId: upiId.trim(),
        swiftCode: swiftCode.trim(),
        upiQrCode: upiQrCode
      },
      cryptoWallets: [
        { network: 'TRC-20', address: trc20Address.trim(), qrCode: trc20Qr },
        { network: 'ERC-20', address: erc20Address.trim(), qrCode: erc20Qr },
        { network: 'BEP-20', address: bep20Address.trim(), qrCode: bep20Qr },
        { network: 'Solana', address: solanaAddress.trim(), qrCode: solanaQr }
      ],
      contactInfo: {
        address: contactAddress.trim(),
        phone: contactPhone.trim(),
        whatsapp: contactWhatsapp.trim(),
        email: contactEmail.trim(),
        officeHours: contactHours.trim()
      },
      footerSettings: {
        brandName: footerBrandName.trim(),
        brandLogoUrl: footerBrandLogoUrl.trim(),
        logoSource: footerLogoSource,
        showEmojiLogo: footerShowEmoji,
        emojiIcon: footerEmojiIcon.trim() || 'e',
        descriptionText: footerDescription.trim(),
        copyrightText: footerCopyright.trim(),
        customDisclaimer: footerDisclaimer.trim()
      }
    };
  };

  // Save Function (Per section or Global)
  const handleSaveAll = async (sectionName?: string) => {
    setIsSaving(true);
    setSavingSection(sectionName || 'all');
    try {
      const payload = buildPayload();
      const res = await apiService.updateSettings(payload);
      if (res && res.settings) {
        populateSettings(res.settings);
        if (onSettingsUpdated) {
          onSettingsUpdated(res.settings);
        }
        // Update DOM elements for immediate visual feedback
        const tabTitle = res.settings.browserTabTitle || res.settings.siteName;
        if (tabTitle) {
          document.title = tabTitle;
        }
        if (res.settings.faviconUrl) {
          let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = res.settings.faviconUrl;
        }
        showSuccess(res.message || `${sectionName ? sectionName : 'System settings'} updated and saved successfully!`);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to save settings. Please check your network and try again.');
    } finally {
      setIsSaving(false);
      setSavingSection(null);
    }
  };

  // Image Upload Handlers with Direct Public Storage Upload & File Validation
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    maxSizeMB: number,
    setter: (val: string) => void,
    fieldLabel: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      showError(`${fieldLabel} exceeds maximum allowed size of ${maxSizeMB}MB.`);
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.ico') && !file.name.endsWith('.svg')) {
      showError(`Unsupported file format for ${fieldLabel}. Please upload PNG, JPG, SVG, WebP, or ICO.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        setter(base64Data);
      }
      try {
        const uploadRes = await apiService.uploadBrandingImage(file);
        if (uploadRes && uploadRes.url) {
          setter(uploadRes.url);
          showSuccess(`${fieldLabel} uploaded to public storage. Click Save to persist.`);
          return;
        }
      } catch (err: any) {
        console.warn(`[Branding Upload Server Fallback]:`, err);
        showSuccess(`${fieldLabel} image loaded. Click Save to persist.`);
      }
    };
    reader.onerror = () => {
      showError(`Failed to read file for ${fieldLabel}.`);
    };
    reader.readAsDataURL(file);
  };

  // Drag & Drop helper
  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    maxSizeMB: number,
    setter: (val: string) => void,
    fieldLabel: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      showError(`${fieldLabel} exceeds maximum allowed size of ${maxSizeMB}MB.`);
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.ico') && !file.name.endsWith('.svg')) {
      showError(`Unsupported file format for ${fieldLabel}. Please upload PNG, JPG, SVG, WebP, or ICO.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        setter(base64Data);
      }
      try {
        const uploadRes = await apiService.uploadBrandingImage(file);
        if (uploadRes && uploadRes.url) {
          setter(uploadRes.url);
          showSuccess(`${fieldLabel} uploaded to public storage. Click Save to persist.`);
          return;
        }
      } catch (err: any) {
        console.warn(`[Branding Upload Server Fallback]:`, err);
        showSuccess(`${fieldLabel} image dropped and loaded. Click Save to persist.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="space-y-6">
      {/* TOAST ALERTS */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-[#00C853] text-black px-5 py-3.5 rounded-xl shadow-2xl font-sans font-bold text-xs animate-slide-up">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="ml-2 text-black/70 hover:text-black">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 bg-[#FF3B30] text-white px-5 py-3.5 rounded-xl shadow-2xl font-sans font-bold text-xs animate-slide-up">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorToast}</span>
          <button onClick={() => setErrorToast(null)} className="ml-2 text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER SECTION WITH QUICK STATS */}
      <div className="bg-[#141414] border border-[#222222] rounded-2xl p-5 md:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00C853]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#00C853]/15 border border-[#00C853]/30 flex items-center justify-center text-[#00C853]">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white font-sans tracking-tight">
                Branding & Payments
              </h2>
            </div>
            <p className="text-xs md:text-sm text-[#8A8A8A] mt-1 max-w-2xl font-sans">
              Manage your website identity, logos, and the payment information displayed to users.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            {isDirty() && (
              <div className="flex items-center space-x-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span className="text-xs text-amber-400 font-mono font-bold">Unsaved edits</span>
                <button
                  onClick={handleRevertAll}
                  disabled={isSaving}
                  className="px-3 py-2 bg-[#222] hover:bg-[#2A2A2A] text-gray-300 hover:text-white rounded-xl text-xs font-semibold font-sans transition-colors cursor-pointer"
                >
                  Discard
                </button>
              </div>
            )}

            <button
              onClick={() => handleSaveAll()}
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#00C853] hover:bg-[#00B048] disabled:opacity-50 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-[#00C853]/20 flex items-center space-x-2 transition-all cursor-pointer font-sans"
            >
              {isSaving && savingSection === 'all' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Saving Changes...' : 'Save All Settings'}</span>
            </button>
          </div>
        </div>

        {/* QUICK STATUS PILLS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-[#222]">
          <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center text-[#00C853] shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-[#8A8A8A] block uppercase font-mono tracking-wider">Brand Name</span>
              <span className="text-xs font-bold text-white truncate block font-sans">{siteName || 'Not Set'}</span>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg ${logoUrl ? 'bg-[#00C853]/10 border-[#00C853]/20 text-[#00C853]' : 'bg-[#333]/30 border-[#444] text-[#888]'} border flex items-center justify-center shrink-0`}>
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-[#8A8A8A] block uppercase font-mono tracking-wider">Site Logo</span>
              <span className="text-xs font-bold text-white truncate block font-sans">{logoUrl ? 'Configured' : 'Default / None'}</span>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg ${bankName ? 'bg-[#00C853]/10 border-[#00C853]/20 text-[#00C853]' : 'bg-[#333]/30 border-[#444] text-[#888]'} border flex items-center justify-center shrink-0`}>
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-[#8A8A8A] block uppercase font-mono tracking-wider">Bank Gateway</span>
              <span className="text-xs font-bold text-white truncate block font-sans">{bankName ? bankName : 'Unconfigured'}</span>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-3 flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-lg ${trc20Address || erc20Address ? 'bg-[#00C853]/10 border-[#00C853]/20 text-[#00C853]' : 'bg-[#333]/30 border-[#444] text-[#888]'} border flex items-center justify-center shrink-0`}>
              <Coins className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-[#8A8A8A] block uppercase font-mono tracking-wider">Crypto Gateways</span>
              <span className="text-xs font-bold text-white truncate block font-sans">
                {[trc20Address, erc20Address, bep20Address, solanaAddress].filter(Boolean).length}/4 Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-1 border-b border-[#222] scrollbar-thin">
        {[
          { id: 'branding', label: 'Website Branding', icon: Globe, count: siteName ? '1' : '0' },
          { id: 'bank', label: 'Bank Details', icon: CreditCard, count: bankName ? 'Active' : '' },
          { id: 'crypto', label: 'Crypto Payments', icon: Coins, count: '4 Chains' },
          { id: 'footer', label: 'Display Settings & Footer', icon: FileText, count: '' },
          { id: 'preview', label: 'Live User Preview', icon: Eye, highlight: true },
          { id: 'all', label: 'All Sections', icon: Layers }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as TabType)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold font-sans transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#00C853] text-black shadow-md shadow-[#00C853]/10 font-black'
                  : tab.highlight
                  ? 'bg-[#181818] text-emerald-400 hover:bg-[#222] border border-emerald-500/20'
                  : 'bg-[#141414] text-[#8A8A8A] hover:text-white hover:bg-[#1C1C1C] border border-[#222]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : ''}`} />
              <span>{tab.label}</span>
              {tab.count && !isActive && (
                <span className="px-1.5 py-0.5 rounded-md bg-[#222] text-[#8A8A8A] text-[10px] font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREAS */}

      {/* ======================================================== */}
      {/* SECTION A: WEBSITE BRANDING & IDENTITY */}
      {/* ======================================================== */}
      {(activeSubTab === 'branding' || activeSubTab === 'all') && (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-5 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#222] gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center text-[#00C853]">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-sans">Section A: Website Branding & Identity</h3>
                <p className="text-xs text-[#8A8A8A]">Configure platform title, header logo, and browser favicon</p>
              </div>
            </div>

            <button
              onClick={() => handleSaveAll('Website Branding')}
              disabled={isSaving}
              className="px-4 py-2 bg-[#1F1F1F] hover:bg-[#282828] border border-[#333] hover:border-[#00C853] text-white hover:text-[#00C853] text-xs font-bold rounded-xl flex items-center space-x-2 transition-all cursor-pointer font-sans self-start sm:self-auto"
            >
              {isSaving && savingSection === 'Website Branding' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Branding</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Brand Name & Logo Upload */}
            <div className="space-y-5">
              {/* Brand Title */}
              <div>
                <label className="text-xs font-bold text-white block mb-1 font-sans">
                  Website Name / Brand Title <span className="text-[#00C853]">*</span>
                </label>
                <p className="text-[11px] text-[#8A8A8A] mb-2 font-sans">
                  The primary name shown on the navigation bar, trade cards, page titles, and deposit slips.
                </p>
                <input
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="e.g. eToro Global"
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-4 py-3 text-white font-sans text-sm font-bold outline-none transition-colors"
                />
              </div>

              {/* Main Website Logo Upload Card */}
              <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block font-sans">Main Website Header Logo</span>
                    <span className="text-[10px] text-[#8A8A8A]">Displays in the navigation bar across the site</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#222] border border-[#333] text-[10px] font-mono text-[#8A8A8A]">
                    PNG, JPG, SVG, WebP (Max 5MB)
                  </span>
                </div>

                {/* Upload Dropzone */}
                <div
                  onDrop={(e) => handleDrop(e, 5, setLogoUrl, 'Logo')}
                  onDragOver={handleDragOver}
                  className="bg-[#0E0E0E] border-2 border-dashed border-[#2E2E2E] hover:border-[#00C853]/60 rounded-xl p-4 text-center transition-colors"
                >
                  {logoUrl ? (
                    <div className="space-y-3">
                      {/* Logo Previews in both Dark and Checkered Light containers */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-[#0A0A0A] border border-[#222] rounded-lg flex flex-col items-center justify-center">
                          <span className="text-[9px] text-[#666] font-mono mb-1.5 uppercase">Dark Background</span>
                          <img
                            src={logoUrl}
                            alt="Logo Dark Preview"
                            className="h-10 max-w-full object-contain cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setPreviewImageModal({ url: logoUrl, title: 'Main Website Logo Preview' })}
                          />
                        </div>
                        <div className="p-3 bg-white/90 border border-gray-300 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-[9px] text-gray-500 font-mono mb-1.5 uppercase">Light Background</span>
                          <img
                            src={logoUrl}
                            alt="Logo Light Preview"
                            className="h-10 max-w-full object-contain cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setPreviewImageModal({ url: logoUrl, title: 'Main Website Logo Preview' })}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-center space-x-2 pt-1">
                        <label className="cursor-pointer px-3 py-1.5 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] rounded-lg text-xs font-bold text-white flex items-center space-x-1.5 transition-colors font-sans">
                          <Upload className="w-3.5 h-3.5 text-[#00C853]" />
                          <span>Replace Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 5, setLogoUrl, 'Logo')}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setPreviewImageModal({ url: logoUrl, title: 'Main Website Logo Preview' })}
                          className="px-2.5 py-1.5 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] rounded-lg text-xs font-bold text-gray-300 hover:text-white flex items-center space-x-1 transition-colors font-sans cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmModal({
                              title: 'Remove Main Website Logo?',
                              description: 'The navigation bar will revert to displaying the brand name text instead of an image logo.',
                              confirmText: 'Remove Logo',
                              onConfirm: () => {
                                setLogoUrl('');
                                setConfirmModal(null);
                                showSuccess('Logo removed. Remember to save changes.');
                              }
                            });
                          }}
                          className="px-2.5 py-1.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 border border-[#FF3B30]/30 rounded-lg text-xs font-bold text-[#FF3B30] flex items-center space-x-1 transition-colors font-sans cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center py-5 space-y-2">
                      <div className="w-11 h-11 rounded-full bg-[#00C853]/10 border border-[#00C853]/30 flex items-center justify-center text-[#00C853]">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block font-sans">Click to browse or drag & drop logo image</span>
                        <span className="text-[11px] text-[#8A8A8A]">Recommended: 200×50px transparent PNG or SVG</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 5, setLogoUrl, 'Logo')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Direct Image URL input */}
                <div className="pt-2">
                  <span className="text-[10px] text-[#8A8A8A] uppercase font-mono block mb-1">Or direct custom Logo URL</span>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/assets/logo.png"
                    className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#00C853] rounded-lg px-3 py-2 text-xs font-mono text-gray-300 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Favicon & Realistic Browser Tab Simulation */}
            <div className="space-y-5">
              {/* Browser Tab Simulation Preview */}
              <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block font-sans">Browser Tab Title & Favicon</span>
                    <span className="text-[10px] text-[#8A8A8A]">Shown in browser bookmarks, search results, and tab bar</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#222] border border-[#333] text-[10px] font-mono text-[#8A8A8A]">
                    PNG, SVG, ICO (Max 2MB)
                  </span>
                </div>

                {/* Browser Tab Title Input */}
                <div>
                  <label className="text-xs font-bold text-white block mb-1 font-sans">
                    Browser Tab Title <span className="text-[#00C853]">*</span>
                  </label>
                  <p className="text-[10px] text-[#8A8A8A] mb-1.5 font-sans">
                    Controls the text displayed in the browser tab and search engine results snippet.
                  </p>
                  <input
                    type="text"
                    value={browserTabTitle}
                    onChange={(e) => setBrowserTabTitle(e.target.value)}
                    placeholder="e.g. eToro - Markets & Analytics"
                    className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-white font-sans text-xs font-bold outline-none transition-colors"
                  />
                </div>

                {/* Realistic Browser Tab Mockup */}
                <div className="bg-[#0A0A0A] border border-[#262626] rounded-xl p-3 space-y-2">
                  <div className="text-[10px] text-[#8A8A8A] font-mono uppercase">Realistic Browser Tab Live Preview</div>
                  <div className="bg-[#202020] rounded-t-lg p-2 flex items-center space-x-2 border-b border-[#2C2C2C] max-w-sm">
                    <div className="w-5 h-5 rounded-md bg-[#111] flex items-center justify-center shrink-0 overflow-hidden border border-[#333]">
                      {faviconUrl ? (
                        <img src={faviconUrl} alt="Tab Favicon" className="w-4 h-4 object-contain" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-[#00C853]" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-white truncate font-sans">
                      {browserTabTitle || siteName || 'Trading Platform'}
                    </span>
                    <span className="text-[#666] text-xs ml-auto">✕</span>
                  </div>
                  <div className="bg-[#141414] rounded-b-lg p-2.5 border border-t-0 border-[#262626] flex items-center space-x-2 text-[11px] text-[#888] font-mono">
                    <Lock className="w-3 h-3 text-[#00C853]" />
                    <span className="truncate">https://trade.{siteName ? siteName.toLowerCase().replace(/\s+/g, '') : 'platform'}.com/terminal</span>
                  </div>
                </div>

                {/* Favicon Upload Dropzone */}
                <div
                  onDrop={(e) => handleDrop(e, 2, setFaviconUrl, 'Favicon')}
                  onDragOver={handleDragOver}
                  className="bg-[#0E0E0E] border-2 border-dashed border-[#2E2E2E] hover:border-[#00C853]/60 rounded-xl p-4 text-center transition-colors"
                >
                  {faviconUrl ? (
                    <div className="flex items-center justify-between p-2.5 bg-[#121212] border border-[#222] rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-[#0A0A0A] border border-[#333] p-1 flex items-center justify-center">
                          <img src={faviconUrl} alt="Favicon Preview" className="w-7 h-7 object-contain" />
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-bold text-[#00C853] block font-sans">Active Favicon Loaded</span>
                          <span className="text-[10px] text-[#8A8A8A]">Appears in user browser tab</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="cursor-pointer px-3 py-1.5 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] rounded-lg text-xs font-bold text-white flex items-center space-x-1 transition-colors font-sans">
                          <Upload className="w-3.5 h-3.5 text-[#00C853]" />
                          <span>Replace</span>
                          <input
                            type="file"
                            accept="image/*,.ico"
                            onChange={(e) => handleFileUpload(e, 2, setFaviconUrl, 'Favicon')}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setFaviconUrl('')}
                          className="px-2.5 py-1.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 border border-[#FF3B30]/30 rounded-lg text-xs font-bold text-[#FF3B30] transition-colors font-sans cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center py-4 space-y-1.5">
                      <div className="w-9 h-9 rounded-full bg-[#00C853]/10 border border-[#00C853]/30 flex items-center justify-center text-[#00C853]">
                        <Upload className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-white block font-sans">Click to Upload Favicon Image</span>
                      <span className="text-[10px] text-[#8A8A8A]">Recommended: 32×32 or 64×64 PNG/ICO</span>
                      <input
                        type="file"
                        accept="image/*,.ico"
                        onChange={(e) => handleFileUpload(e, 2, setFaviconUrl, 'Favicon')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Direct Favicon URL */}
                <div className="pt-1">
                  <span className="text-[10px] text-[#8A8A8A] uppercase font-mono block mb-1">Or direct Favicon URL</span>
                  <input
                    type="text"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="https://example.com/assets/favicon.ico"
                    className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#00C853] rounded-lg px-3 py-2 text-xs font-mono text-gray-300 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social & Link Sharing Metadata & Simulator (Full Width Sub-Section) */}
          <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 md:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#262626] pb-3 gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center text-[#00C853]">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white font-sans">Social & Link Sharing Preview (OpenGraph / SEO)</h4>
                  <p className="text-[11px] text-[#8A8A8A]">Custom image, headline, and description displayed when sharing platform links on WhatsApp, Telegram, iMessage, and social media</p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 self-start sm:self-auto bg-[#0E0E0E] p-1 rounded-lg border border-[#2A2A2A]">
                {(['whatsapp', 'telegram', 'facebook'] as const).map(platform => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setSocialPreviewPlatform(platform)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-sans transition-all cursor-pointer capitalize ${
                      socialPreviewPlatform === platform
                        ? 'bg-[#00C853] text-black'
                        : 'text-[#888] hover:text-white'
                    }`}
                  >
                    {platform === 'whatsapp' ? 'WhatsApp' : platform === 'telegram' ? 'Telegram' : 'Facebook / Social'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Form inputs */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-white block mb-1 font-sans">
                    Social Share Title (og:title)
                  </label>
                  <input
                    type="text"
                    value={socialShareTitle}
                    onChange={(e) => setSocialShareTitle(e.target.value)}
                    placeholder="e.g. eToro Global — Institutional Trading Exchange"
                    className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-white font-sans text-xs font-bold outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1 font-sans">
                    Social Share Description (og:description)
                  </label>
                  <textarea
                    rows={3}
                    value={socialShareDescription}
                    onChange={(e) => setSocialShareDescription(e.target.value)}
                    placeholder="Trade Forex, Crypto, Commodities, and Indices with confidence on eToro Global..."
                    className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl p-3 text-white font-sans text-xs outline-none transition-colors"
                  />
                </div>

                {/* Social Image Dropzone */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white block font-sans">
                      Social Share Preview Image (og:image)
                    </label>
                    <span className="text-[10px] text-[#8A8A8A] font-mono">1200×630px recommended</span>
                  </div>

                  <div
                    onDrop={(e) => handleDrop(e, 8, setSocialShareImageUrl, 'Social Share Image')}
                    onDragOver={handleDragOver}
                    className="bg-[#0E0E0E] border-2 border-dashed border-[#2E2E2E] hover:border-[#00C853]/60 rounded-xl p-3 text-center transition-colors"
                  >
                    {socialShareImageUrl ? (
                      <div className="space-y-2">
                        <div className="relative rounded-lg overflow-hidden bg-[#0A0A0A] border border-[#222] max-h-40 flex items-center justify-center">
                          <img
                            src={socialShareImageUrl}
                            alt="Social Share Preview"
                            className="w-full h-36 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => setPreviewImageModal({ url: socialShareImageUrl, title: 'Social Share Card Image' })}
                          />
                        </div>
                        <div className="flex items-center justify-center space-x-2 pt-1">
                          <label className="cursor-pointer px-3 py-1.5 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] rounded-lg text-xs font-bold text-white flex items-center space-x-1.5 transition-colors font-sans">
                            <Upload className="w-3.5 h-3.5 text-[#00C853]" />
                            <span>Replace Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 8, setSocialShareImageUrl, 'Social Share Image')}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setPreviewImageModal({ url: socialShareImageUrl, title: 'Social Share Card Image' })}
                            className="px-2.5 py-1.5 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] rounded-lg text-xs font-bold text-gray-300 hover:text-white flex items-center space-x-1 transition-colors font-sans cursor-pointer"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSocialShareImageUrl('')}
                            className="px-2.5 py-1.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 border border-[#FF3B30]/30 rounded-lg text-xs font-bold text-[#FF3B30] flex items-center space-x-1 transition-colors font-sans cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center py-4 space-y-1.5">
                        <div className="w-9 h-9 rounded-full bg-[#00C853]/10 border border-[#00C853]/30 flex items-center justify-center text-[#00C853]">
                          <Upload className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-white block font-sans">Click to Upload Social Share Card Image</span>
                        <span className="text-[10px] text-[#8A8A8A]">Recommended: 1200×630px JPG or PNG</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 8, setSocialShareImageUrl, 'Social Share Image')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-[#8A8A8A] uppercase font-mono block mb-1">Or direct Social Image URL</span>
                    <input
                      type="text"
                      value={socialShareImageUrl}
                      onChange={(e) => setSocialShareImageUrl(e.target.value)}
                      placeholder="https://example.com/assets/social-card.jpg"
                      className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#00C853] rounded-lg px-3 py-2 text-xs font-mono text-gray-300 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Realistic Social Share Simulator Card */}
              <div className="lg:col-span-6 flex flex-col justify-center">
                <div className="bg-[#0D0D0D] border border-[#262626] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 font-mono uppercase flex items-center space-x-1.5">
                      <Eye className="w-3.5 h-3.5 text-[#00C853]" />
                      <span>Live {socialPreviewPlatform.toUpperCase()} Share Card Simulator</span>
                    </span>
                    <span className="text-[10px] bg-[#222] text-[#00C853] px-2 py-0.5 rounded-full font-mono">Dynamic Head Meta</span>
                  </div>

                  {/* Platform Chat Mockup Bubble */}
                  <div className={`rounded-xl p-3.5 transition-all ${
                    socialPreviewPlatform === 'whatsapp'
                      ? 'bg-[#005c4b]/30 border border-[#005c4b]/50 text-white'
                      : socialPreviewPlatform === 'telegram'
                      ? 'bg-[#182533] border border-[#2b3b4f] text-white'
                      : 'bg-[#1c1e21] border border-[#3a3b3c] text-white'
                  }`}>
                    {/* Link text above card */}
                    <div className="text-[11px] text-[#25D366] font-mono pb-2 truncate">
                      https://trade.{siteName ? siteName.toLowerCase().replace(/\s+/g, '') : 'etoroglobal'}.com
                    </div>

                    {/* OpenGraph Card Preview */}
                    <div className="bg-[#0b141a]/90 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                      {socialShareImageUrl ? (
                        <div className="h-44 w-full bg-[#000] overflow-hidden relative">
                          <img
                            src={socialShareImageUrl}
                            alt="Social OpenGraph"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-28 w-full bg-linear-to-br from-[#111] to-[#222] flex items-center justify-center text-gray-500 text-xs">
                          No Preview Image Configured
                        </div>
                      )}

                      <div className="p-3 space-y-1">
                        <div className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">
                          trade.{siteName ? siteName.toLowerCase().replace(/\s+/g, '') : 'etoroglobal'}.com
                        </div>
                        <div className="text-sm font-black text-white leading-tight font-sans">
                          {socialShareTitle || siteName || 'eToro Global'}
                        </div>
                        <div className="text-xs text-gray-300 font-sans line-clamp-2 leading-relaxed">
                          {socialShareDescription || 'Trade Forex, Crypto, Commodities, and Indices with confidence on institutional grade platform.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                    💡 This card is injected into the server-rendered HTML response so WhatsApp, Telegram, Facebook, Twitter, and iMessage crawlers can parse and display your custom branding immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION B: BANK DEPOSIT DETAILS */}
      {/* ======================================================== */}
      {(activeSubTab === 'bank' || activeSubTab === 'all') && (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-5 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#222] gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center text-[#00C853]">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-sans">Section B: Bank Wire & UPI Deposit Details</h3>
                <p className="text-xs text-[#8A8A8A]">Displayed to verified users when making domestic INR or international wire deposits</p>
              </div>
            </div>

            <button
              onClick={() => handleSaveAll('Bank Deposit Details')}
              disabled={isSaving}
              className="px-4 py-2 bg-[#1F1F1F] hover:bg-[#282828] border border-[#333] hover:border-[#00C853] text-white hover:text-[#00C853] text-xs font-bold rounded-xl flex items-center space-x-2 transition-all cursor-pointer font-sans self-start sm:self-auto"
            >
              {isSaving && savingSection === 'Bank Deposit Details' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Bank Details</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 2 Cols: Domestic / International Bank Account Fields */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
                  <span className="text-xs font-bold text-white uppercase font-sans tracking-wider flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#00C853]" />
                    <span>Official Bank Account Information</span>
                  </span>
                  <span className="text-[10px] text-[#8A8A8A] font-mono">Domestic & International Wire</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1 font-sans">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. ICICI Bank Ltd / JPMorgan Chase"
                      className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1 font-sans">Account Beneficiary Name</label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="e.g. eToro Global Trading Ltd"
                      className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-300 font-sans">Account Number</label>
                      {accountNumber && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(accountNumber, 'accNo')}
                          className="text-[10px] text-[#00C853] hover:underline flex items-center space-x-1 font-mono cursor-pointer"
                        >
                          {copiedKey === 'accNo' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'accNo' ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. 000405891234"
                      className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-300 font-sans">IFSC / IBAN Code</label>
                      {ifscIban && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(ifscIban, 'ifsc')}
                          className="text-[10px] text-[#00C853] hover:underline flex items-center space-x-1 font-mono cursor-pointer"
                        >
                          {copiedKey === 'ifsc' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'ifsc' ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={ifscIban}
                      onChange={(e) => setIfscIban(e.target.value)}
                      placeholder="e.g. ICIC0000004"
                      className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1 font-sans">SWIFT / BIC Code (Optional)</label>
                    <input
                      type="text"
                      value={swiftCode}
                      onChange={(e) => setSwiftCode(e.target.value)}
                      placeholder="e.g. ETORINBBXXX"
                      className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-300 font-sans">UPI ID / VPA Handle</label>
                      {upiId && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(upiId, 'upiId')}
                          className="text-[10px] text-[#00C853] hover:underline flex items-center space-x-1 font-mono cursor-pointer"
                        >
                          {copiedKey === 'upiId' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'upiId' ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. etoroglobal@icici"
                      className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 1 Col: UPI QR Code Upload & Preview */}
            <div className="space-y-4">
              <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
                  <span className="text-xs font-bold text-white uppercase font-sans tracking-wider flex items-center space-x-1.5">
                    <QrCode className="w-3.5 h-3.5 text-[#00C853]" />
                    <span>UPI Pay QR Code</span>
                  </span>
                  <span className="text-[10px] text-[#8A8A8A] font-mono">Instant Pay</span>
                </div>

                <div
                  onDrop={(e) => handleDrop(e, 5, setUpiQrCode, 'UPI QR Code')}
                  onDragOver={handleDragOver}
                  className="bg-[#0E0E0E] border-2 border-dashed border-[#2E2E2E] hover:border-[#00C853]/60 rounded-xl p-4 text-center transition-colors"
                >
                  {upiQrCode ? (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="p-2 bg-white rounded-xl shadow-lg">
                        <img
                          src={upiQrCode}
                          alt="UPI QR Code"
                          className="w-28 h-28 object-contain cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setPreviewImageModal({ url: upiQrCode, title: 'UPI QR Code Preview' })}
                        />
                      </div>
                      <span className="text-xs text-[#00C853] font-bold font-sans">UPI QR Code Active</span>
                      <div className="flex items-center space-x-2">
                        <label className="cursor-pointer px-3 py-1.5 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] rounded-lg text-xs font-bold text-white flex items-center space-x-1.5 font-sans">
                          <Upload className="w-3.5 h-3.5 text-[#00C853]" />
                          <span>Replace QR</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 5, setUpiQrCode, 'UPI QR Code')}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setUpiQrCode('')}
                          className="px-2.5 py-1.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 border border-[#FF3B30]/30 rounded-lg text-xs font-bold text-[#FF3B30] font-sans cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center py-6 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-[#00C853]/10 border border-[#00C853]/30 flex items-center justify-center text-[#00C853]">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-white font-sans">Upload UPI QR Code Image</span>
                      <span className="text-[10px] text-[#8A8A8A]">GPay, PhonePe, Paytm, BHIM QR</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 5, setUpiQrCode, 'UPI QR Code')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION C: CRYPTOCURRENCY DEPOSIT DETAILS */}
      {/* ======================================================== */}
      {(activeSubTab === 'crypto' || activeSubTab === 'all') && (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-5 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#222] gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center text-[#00C853]">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-sans">Section C: Cryptocurrency Deposit Gateways</h3>
                <p className="text-xs text-[#8A8A8A]">Configure deposit wallet addresses and network QR codes for all 4 supported chains</p>
              </div>
            </div>

            <button
              onClick={() => handleSaveAll('Cryptocurrency Gateways')}
              disabled={isSaving}
              className="px-4 py-2 bg-[#1F1F1F] hover:bg-[#282828] border border-[#333] hover:border-[#00C853] text-white hover:text-[#00C853] text-xs font-bold rounded-xl flex items-center space-x-2 transition-all cursor-pointer font-sans self-start sm:self-auto"
            >
              {isSaving && savingSection === 'Cryptocurrency Gateways' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Crypto Gateways</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* TRC-20 */}
            <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#FF3B30]/15 border border-[#FF3B30]/30 text-[#FF3B30] text-[11px] font-bold font-mono">
                    TRC-20
                  </span>
                  <span className="text-xs font-bold text-white font-sans">USDT (Tron Network)</span>
                </div>
                <span className="text-[10px] text-[#8A8A8A] font-mono">Recommended / Lowest Fee</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-300 font-sans">Deposit Wallet Address</label>
                  {trc20Address && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(trc20Address, 'trc20')}
                      className="text-[10px] text-[#00C853] hover:underline flex items-center space-x-1 font-mono cursor-pointer"
                    >
                      {copiedKey === 'trc20' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'trc20' ? 'Copied' : 'Copy Address'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={trc20Address}
                  onChange={(e) => setTrc20Address(e.target.value)}
                  placeholder="e.g. TYuXk9pLm4Nv8sQ2zW1aE3rF5gH6jK7mN8p"
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3 py-2.5 text-xs text-white font-mono outline-none"
                />
              </div>

              {/* QR Code Upload Dropzone */}
              <div
                onDrop={(e) => handleDrop(e, 5, setTrc20Qr, 'TRC-20 QR')}
                onDragOver={handleDragOver}
                className="bg-[#0E0E0E] border border-dashed border-[#2E2E2E] rounded-xl p-3 flex items-center justify-between"
              >
                {trc20Qr ? (
                  <div className="flex items-center space-x-3">
                    <img
                      src={trc20Qr}
                      alt="TRC20 QR"
                      className="w-12 h-12 object-contain bg-white p-1 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setPreviewImageModal({ url: trc20Qr, title: 'USDT TRC-20 QR Code Preview' })}
                    />
                    <div>
                      <span className="text-xs text-[#00C853] font-bold block font-sans">TRC-20 QR Active</span>
                      <span className="text-[10px] text-[#8A8A8A]">Shown in User Deposit Modal</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-xs text-[#8A8A8A]">
                    <QrCode className="w-4 h-4 text-[#00C853]" />
                    <span>No QR image uploaded (optional)</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer px-2.5 py-1.5 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] rounded-lg text-xs font-bold text-white flex items-center space-x-1 font-sans">
                    <Upload className="w-3.5 h-3.5 text-[#00C853]" />
                    <span>{trc20Qr ? 'Replace' : 'Upload QR'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 5, setTrc20Qr, 'TRC-20 QR')}
                      className="hidden"
                    />
                  </label>
                  {trc20Qr && (
                    <button
                      type="button"
                      onClick={() => setTrc20Qr('')}
                      className="p-1.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ERC-20 */}
            <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#3B82F6] text-[11px] font-bold font-mono">
                    ERC-20
                  </span>
                  <span className="text-xs font-bold text-white font-sans">USDT (Ethereum Network)</span>
                </div>
                <span className="text-[10px] text-[#8A8A8A] font-mono">Ethereum Mainnet</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-300 font-sans">Deposit Wallet Address</label>
                  {erc20Address && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(erc20Address, 'erc20')}
                      className="text-[10px] text-[#00C853] hover:underline flex items-center space-x-1 font-mono cursor-pointer"
                    >
                      {copiedKey === 'erc20' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'erc20' ? 'Copied' : 'Copy Address'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={erc20Address}
                  onChange={(e) => setErc20Address(e.target.value)}
                  placeholder="e.g. 0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3 py-2.5 text-xs text-white font-mono outline-none"
                />
              </div>

              {/* QR Code Upload Dropzone */}
              <div
                onDrop={(e) => handleDrop(e, 5, setErc20Qr, 'ERC-20 QR')}
                onDragOver={handleDragOver}
                className="bg-[#0E0E0E] border border-dashed border-[#2E2E2E] rounded-xl p-3 flex items-center justify-between"
              >
                {erc20Qr ? (
                  <div className="flex items-center space-x-3">
                    <img
                      src={erc20Qr}
                      alt="ERC20 QR"
                      className="w-12 h-12 object-contain bg-white p-1 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setPreviewImageModal({ url: erc20Qr, title: 'USDT ERC-20 QR Code Preview' })}
                    />
                    <div>
                      <span className="text-xs text-[#00C853] font-bold block font-sans">ERC-20 QR Active</span>
                      <span className="text-[10px] text-[#8A8A8A]">Shown in User Deposit Modal</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-xs text-[#8A8A8A]">
                    <QrCode className="w-4 h-4 text-[#00C853]" />
                    <span>No QR image uploaded (optional)</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer px-2.5 py-1.5 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] rounded-lg text-xs font-bold text-white flex items-center space-x-1 font-sans">
                    <Upload className="w-3.5 h-3.5 text-[#00C853]" />
                    <span>{erc20Qr ? 'Replace' : 'Upload QR'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 5, setErc20Qr, 'ERC-20 QR')}
                      className="hidden"
                    />
                  </label>
                  {erc20Qr && (
                    <button
                      type="button"
                      onClick={() => setErc20Qr('')}
                      className="p-1.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* BEP-20 (BSC) */}
            <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] text-[11px] font-bold font-mono">
                    BEP-20
                  </span>
                  <span className="text-xs font-bold text-white font-sans">USDT (BNB Smart Chain)</span>
                </div>
                <span className="text-[10px] text-[#8A8A8A] font-mono">Binance Smart Chain</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-300 font-sans">Deposit Wallet Address</label>
                  {bep20Address && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(bep20Address, 'bep20')}
                      className="text-[10px] text-[#00C853] hover:underline flex items-center space-x-1 font-mono cursor-pointer"
                    >
                      {copiedKey === 'bep20' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'bep20' ? 'Copied' : 'Copy Address'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={bep20Address}
                  onChange={(e) => setBep20Address(e.target.value)}
                  placeholder="e.g. 0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE"
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3 py-2.5 text-xs text-white font-mono outline-none"
                />
              </div>

              {/* QR Code Upload Dropzone */}
              <div
                onDrop={(e) => handleDrop(e, 5, setBep20Qr, 'BEP-20 QR')}
                onDragOver={handleDragOver}
                className="bg-[#0E0E0E] border border-dashed border-[#2E2E2E] rounded-xl p-3 flex items-center justify-between"
              >
                {bep20Qr ? (
                  <div className="flex items-center space-x-3">
                    <img
                      src={bep20Qr}
                      alt="BEP20 QR"
                      className="w-12 h-12 object-contain bg-white p-1 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setPreviewImageModal({ url: bep20Qr, title: 'USDT BEP-20 QR Code Preview' })}
                    />
                    <div>
                      <span className="text-xs text-[#00C853] font-bold block font-sans">BEP-20 QR Active</span>
                      <span className="text-[10px] text-[#8A8A8A]">Shown in User Deposit Modal</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-xs text-[#8A8A8A]">
                    <QrCode className="w-4 h-4 text-[#00C853]" />
                    <span>No QR image uploaded (optional)</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer px-2.5 py-1.5 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] rounded-lg text-xs font-bold text-white flex items-center space-x-1 font-sans">
                    <Upload className="w-3.5 h-3.5 text-[#00C853]" />
                    <span>{bep20Qr ? 'Replace' : 'Upload QR'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 5, setBep20Qr, 'BEP-20 QR')}
                      className="hidden"
                    />
                  </label>
                  {bep20Qr && (
                    <button
                      type="button"
                      onClick={() => setBep20Qr('')}
                      className="p-1.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Solana (SOL) */}
            <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#A78BFA] text-[11px] font-bold font-mono">
                    SOLANA
                  </span>
                  <span className="text-xs font-bold text-white font-sans">Solana (SOL Native / SPL)</span>
                </div>
                <span className="text-[10px] text-[#8A8A8A] font-mono">Solana Mainnet</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-300 font-sans">Deposit Wallet Address</label>
                  {solanaAddress && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(solanaAddress, 'solana')}
                      className="text-[10px] text-[#00C853] hover:underline flex items-center space-x-1 font-mono cursor-pointer"
                    >
                      {copiedKey === 'solana' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'solana' ? 'Copied' : 'Copy Address'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={solanaAddress}
                  onChange={(e) => setSolanaAddress(e.target.value)}
                  placeholder="e.g. 7xKXtg2CW87d97TXJSDp154pq781S88D2s78d"
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3 py-2.5 text-xs text-white font-mono outline-none"
                />
              </div>

              {/* QR Code Upload Dropzone */}
              <div
                onDrop={(e) => handleDrop(e, 5, setSolanaQr, 'Solana QR')}
                onDragOver={handleDragOver}
                className="bg-[#0E0E0E] border border-dashed border-[#2E2E2E] rounded-xl p-3 flex items-center justify-between"
              >
                {solanaQr ? (
                  <div className="flex items-center space-x-3">
                    <img
                      src={solanaQr}
                      alt="Solana QR"
                      className="w-12 h-12 object-contain bg-white p-1 rounded-lg cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setPreviewImageModal({ url: solanaQr, title: 'Solana QR Code Preview' })}
                    />
                    <div>
                      <span className="text-xs text-[#00C853] font-bold block font-sans">Solana QR Active</span>
                      <span className="text-[10px] text-[#8A8A8A]">Shown in User Deposit Modal</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-xs text-[#8A8A8A]">
                    <QrCode className="w-4 h-4 text-[#00C853]" />
                    <span>No QR image uploaded (optional)</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer px-2.5 py-1.5 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] rounded-lg text-xs font-bold text-white flex items-center space-x-1 font-sans">
                    <Upload className="w-3.5 h-3.5 text-[#00C853]" />
                    <span>{solanaQr ? 'Replace' : 'Upload QR'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 5, setSolanaQr, 'Solana QR')}
                      className="hidden"
                    />
                  </label>
                  {solanaQr && (
                    <button
                      type="button"
                      onClick={() => setSolanaQr('')}
                      className="p-1.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION D: FOOTER, NOTICES & DISPLAY SETTINGS */}
      {/* ======================================================== */}
      {(activeSubTab === 'footer' || activeSubTab === 'all') && (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-5 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#222] gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center text-[#00C853]">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-sans">Section D: Footer, Notices & Display Settings</h3>
                <p className="text-xs text-[#8A8A8A]">Configure contact info, legal disclaimers, trade sharing proof, and withdrawal notices</p>
              </div>
            </div>

            <button
              onClick={() => handleSaveAll('Footer & Display Settings')}
              disabled={isSaving}
              className="px-4 py-2 bg-[#1F1F1F] hover:bg-[#282828] border border-[#333] hover:border-[#00C853] text-white hover:text-[#00C853] text-xs font-bold rounded-xl flex items-center space-x-2 transition-all cursor-pointer font-sans self-start sm:self-auto"
            >
              {isSaving && savingSection === 'Footer & Display Settings' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Footer & Notices</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Contact Info & Support Desk */}
            <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
                <span className="text-xs font-bold text-white uppercase font-sans tracking-wider flex items-center space-x-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#00C853]" />
                  <span>Public Contact & Support Desk</span>
                </span>
                <span className="text-[10px] text-[#8A8A8A]">Displayed in website footer</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1 font-sans">Official Office Address</label>
                <input
                  type="text"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  placeholder="e.g. 123 Canary Wharf, London, United Kingdom"
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1 font-sans">Phone Number</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+44 20 7946 0958"
                    className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1 font-sans">WhatsApp Desk</label>
                  <input
                    type="text"
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    placeholder="+44 20 7946 0958"
                    className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1 font-sans">Support Email Address</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="support@etoroglobal.com"
                    className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1 font-sans">Operating / Desk Hours</label>
                  <input
                    type="text"
                    value={contactHours}
                    onChange={(e) => setContactHours(e.target.value)}
                    placeholder="24/7 Global Trading Desk"
                    className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Right: Trade Proof & Card Sharing */}
            <div className="space-y-4">
              <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
                  <span className="text-xs font-bold text-white uppercase font-sans tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#00C853]" />
                    <span>Trade Card & Proof Sharing</span>
                  </span>
                  <span className="text-[10px] text-[#8A8A8A]">Viral Sharing Engine</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#0D0D0D] border border-[#262626] rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-white block font-sans">Enable User Trade Proof Cards</span>
                    <span className="text-[10px] text-[#8A8A8A]">Allows traders to generate and download branded PnL cards</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tradeSharingEnabled}
                      onChange={(e) => setTradeSharingEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00C853]"></div>
                  </label>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1 font-sans">
                    Custom Trade Card Watermark Logo URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={customTradeLogoUrl}
                    onChange={(e) => setCustomTradeLogoUrl(e.target.value)}
                    placeholder="Leave empty to use main website logo"
                    className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                  />
                  <span className="text-[10px] text-[#8A8A8A] mt-1 block">
                    Rendered at the top right header of generated PNG trade cards.
                  </span>
                </div>
              </div>

              {/* User Withdrawal Notice */}
              <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
                  <span className="text-xs font-bold text-white uppercase font-sans tracking-wider flex items-center space-x-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#00C853]" />
                    <span>User Withdrawal Notice Banner</span>
                  </span>
                  <span className="text-[10px] text-[#8A8A8A]">Withdrawal Modal</span>
                </div>

                <textarea
                  rows={2}
                  value={withdrawalNotice}
                  onChange={(e) => setWithdrawalNotice(e.target.value)}
                  placeholder="e.g. Withdrawals are processed within 15-30 minutes during standard desk hours."
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl p-3 text-xs text-white font-sans outline-none"
                />
              </div>
            </div>

            {/* Bottom Full-width: Footer Text, Copyright, Legal Disclaimers */}
            <div className="lg:col-span-2 bg-[#181818] border border-[#262626] rounded-xl p-4 md:p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-[#00C853]" />
                  <span className="text-sm font-extrabold text-white font-sans">
                    Footer Branding, Logo & Legal Disclaimers
                  </span>
                </div>
                <span className="text-[10px] text-[#8A8A8A] font-mono">Platform Bottom Bar</span>
              </div>

              {/* Footer Logo & Brand Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left: Footer Brand Name & Logo Source Selector */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-white block mb-1 font-sans">Footer Brand Name</label>
                    <input
                      type="text"
                      value={footerBrandName}
                      onChange={(e) => setFooterBrandName(e.target.value)}
                      placeholder="e.g. ETORO GLOBAL"
                      className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none font-sans"
                    />
                  </div>

                  {/* Logo Source Toggle */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white block font-sans">Footer Logo Source</label>
                    <div className="grid grid-cols-2 gap-2 bg-[#0D0D0D] p-1 rounded-xl border border-[#2E2E2E]">
                      <button
                        type="button"
                        onClick={() => setFooterLogoSource('upload')}
                        className={`py-2 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                          footerLogoSource === 'upload'
                            ? 'bg-[#00C853] text-black font-black'
                            : 'text-[#8A8A8A] hover:text-white'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Direct File Upload</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFooterLogoSource('url')}
                        className={`py-2 text-xs font-bold font-sans rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                          footerLogoSource === 'url'
                            ? 'bg-[#00C853] text-black font-black'
                            : 'text-[#8A8A8A] hover:text-white'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>External Image URL</span>
                      </button>
                    </div>
                  </div>

                  {/* Footer Emoji Badge Toggle */}
                  <div className="bg-[#121212] border border-[#242424] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-200 block font-sans">Footer Emoji / Monogram Badge</label>
                      <button
                        type="button"
                        onClick={() => setFooterShowEmoji(!footerShowEmoji)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold font-sans transition-colors cursor-pointer ${
                          footerShowEmoji
                            ? 'bg-[#00C853]/15 border-[#00C853] text-[#00C853]'
                            : 'bg-[#0D0D0D] border-[#333] text-[#8A8A8A]'
                        }`}
                      >
                        {footerShowEmoji ? '✓ Badge Active' : '✕ Hidden'}
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={footerEmojiIcon}
                        onChange={(e) => setFooterEmojiIcon(e.target.value)}
                        placeholder="e"
                        maxLength={4}
                        className="w-16 bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-lg p-2 text-center text-white font-bold text-sm outline-none"
                      />
                      <span className="text-[11px] text-[#8A8A8A]">
                        Letter or symbol displayed inside the green badge when no custom image logo is set.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Footer Logo Upload / URL Card with Previews */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white block font-sans">
                      {footerLogoSource === 'upload' ? 'Upload Footer Image Logo' : 'Footer Image Logo URL'}
                    </span>
                    <span className="text-[10px] text-[#8A8A8A] font-mono">PNG, SVG, WebP (Max 5MB)</span>
                  </div>

                  {footerLogoSource === 'upload' ? (
                    <div
                      onDrop={(e) => handleDrop(e, 5, setFooterBrandLogoUrl, 'Footer Logo')}
                      onDragOver={handleDragOver}
                      className="bg-[#0E0E0E] border-2 border-dashed border-[#2E2E2E] hover:border-[#00C853]/60 rounded-xl p-3 text-center transition-colors"
                    >
                      {footerBrandLogoUrl ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 bg-[#0A0A0A] border border-[#222] rounded-lg flex flex-col items-center justify-center">
                              <span className="text-[9px] text-[#666] font-mono mb-1 uppercase">Dark Container</span>
                              <img
                                src={footerBrandLogoUrl}
                                alt="Footer Logo Dark"
                                className="h-8 max-w-full object-contain cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setPreviewImageModal({ url: footerBrandLogoUrl, title: 'Footer Logo Preview' })}
                              />
                            </div>
                            <div className="p-2.5 bg-white/90 border border-gray-300 rounded-lg flex flex-col items-center justify-center">
                              <span className="text-[9px] text-gray-500 font-mono mb-1 uppercase">Light Container</span>
                              <img
                                src={footerBrandLogoUrl}
                                alt="Footer Logo Light"
                                className="h-8 max-w-full object-contain cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setPreviewImageModal({ url: footerBrandLogoUrl, title: 'Footer Logo Preview' })}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-center space-x-2 pt-1">
                            <label className="cursor-pointer px-3 py-1.5 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] rounded-lg text-xs font-bold text-white flex items-center space-x-1.5 transition-colors font-sans">
                              <Upload className="w-3.5 h-3.5 text-[#00C853]" />
                              <span>Replace Footer Logo</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 5, setFooterBrandLogoUrl, 'Footer Logo')}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setPreviewImageModal({ url: footerBrandLogoUrl, title: 'Footer Logo Preview' })}
                              className="px-2.5 py-1.5 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] rounded-lg text-xs font-bold text-gray-300 hover:text-white flex items-center space-x-1 transition-colors font-sans cursor-pointer"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setFooterBrandLogoUrl('')}
                              className="px-2.5 py-1.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 border border-[#FF3B30]/30 rounded-lg text-xs font-bold text-[#FF3B30] flex items-center space-x-1 transition-colors font-sans cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center py-4 space-y-1.5">
                          <div className="w-10 h-10 rounded-full bg-[#00C853]/10 border border-[#00C853]/30 flex items-center justify-center text-[#00C853]">
                            <Upload className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-white block font-sans">Click to Upload Footer Logo Image</span>
                          <span className="text-[10px] text-[#8A8A8A]">Recommended: Transparent PNG or SVG</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 5, setFooterBrandLogoUrl, 'Footer Logo')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={footerBrandLogoUrl}
                        onChange={(e) => setFooterBrandLogoUrl(e.target.value)}
                        placeholder="https://example.com/assets/footer-logo.png"
                        className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                      />
                      {footerBrandLogoUrl && (
                        <div className="p-2.5 bg-[#0A0A0A] border border-[#222] rounded-lg flex items-center justify-between">
                          <img
                            src={footerBrandLogoUrl}
                            alt="Footer Logo"
                            className="h-7 max-w-[140px] object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => setFooterBrandLogoUrl('')}
                            className="text-xs text-[#FF3B30] hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1 font-sans">Footer Platform Summary Text</label>
                <textarea
                  rows={2}
                  value={footerDescription}
                  onChange={(e) => setFooterDescription(e.target.value)}
                  placeholder="Next-generation institutional trading platform with sub-millisecond execution and multi-asset liquidity..."
                  className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl p-3 text-xs text-white font-sans outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1 font-sans">Copyright Notice</label>
                  <input
                    type="text"
                    value={footerCopyright}
                    onChange={(e) => setFooterCopyright(e.target.value)}
                    placeholder="© 2026 eToro Global Technologies. All rights reserved."
                    className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1 font-sans">Risk Warning / Legal Disclaimer</label>
                  <input
                    type="text"
                    value={footerDisclaimer}
                    onChange={(e) => setFooterDisclaimer(e.target.value)}
                    placeholder="Trading financial instruments involves significant risk of capital loss."
                    className="w-full bg-[#0D0D0D] border border-[#2E2E2E] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-sans"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION: LIVE INTERACTIVE USER PREVIEW SIMULATOR */}
      {/* ======================================================== */}
      {activeSubTab === 'preview' && (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-5 md:p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#222]">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-sans">Live User Preview Simulator</h3>
                <p className="text-xs text-[#8A8A8A]">Interactive real-time preview of how users will experience your brand and payment gateways</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* 1. Navigation Header Mockup */}
            <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-2">
              <span className="text-[10px] text-[#8A8A8A] uppercase font-mono tracking-wider block">
                1. User View: Navigation Header
              </span>
              <div className="bg-[#0B0E14] border border-[#1F2937] rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-7 object-contain" />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-[#00C853] flex items-center justify-center text-black font-black text-xs font-mono">
                        {siteName ? siteName.charAt(0).toUpperCase() : 'E'}
                      </div>
                      <span className="font-extrabold text-sm text-white font-sans">{siteName || 'Trading Platform'}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-[#00C853] text-black text-xs font-black rounded-lg">Deposit</span>
                  <span className="px-3 py-1 bg-[#222] text-white text-xs font-bold rounded-lg">Trade</span>
                </div>
              </div>
            </div>

            {/* 2. User Deposit Modal Simulation */}
            <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-3">
              <span className="text-[10px] text-[#8A8A8A] uppercase font-mono tracking-wider block">
                2. User View: Deposit Modal Details
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bank Transfer Tab View */}
                <div className="bg-[#0B0E14] border border-[#1F2937] rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-white border-b border-[#1F2937] pb-2">
                    <CreditCard className="w-4 h-4 text-[#00C853]" />
                    <span>Bank Wire Transfer (INR / Wire)</span>
                  </div>

                  <div className="space-y-2 text-xs font-sans">
                    <div className="flex justify-between py-1 border-b border-[#1A1A1A]">
                      <span className="text-[#8A8A8A]">Bank:</span>
                      <span className="text-white font-bold">{bankName || 'Not Set'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1A1A1A]">
                      <span className="text-[#8A8A8A]">Beneficiary:</span>
                      <span className="text-white font-bold">{accountName || 'Not Set'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1A1A1A]">
                      <span className="text-[#8A8A8A]">Account Number:</span>
                      <span className="text-white font-mono font-bold">{accountNumber || 'Not Set'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1A1A1A]">
                      <span className="text-[#8A8A8A]">IFSC / IBAN:</span>
                      <span className="text-white font-mono font-bold">{ifscIban || 'Not Set'}</span>
                    </div>
                    {upiId && (
                      <div className="flex justify-between py-1 border-b border-[#1A1A1A]">
                        <span className="text-[#8A8A8A]">UPI ID:</span>
                        <span className="text-[#00C853] font-mono font-bold">{upiId}</span>
                      </div>
                    )}
                  </div>

                  {upiQrCode && (
                    <div className="pt-2 flex items-center space-x-3 bg-[#111] p-2 rounded-lg border border-[#222]">
                      <img src={upiQrCode} alt="UPI QR" className="w-12 h-12 object-contain bg-white p-1 rounded" />
                      <span className="text-[11px] text-[#8A8A8A]">UPI Instant QR active on user deposit drawer</span>
                    </div>
                  )}
                </div>

                {/* Crypto Deposit Tab View */}
                <div className="bg-[#0B0E14] border border-[#1F2937] rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-white border-b border-[#1F2937] pb-2">
                    <Coins className="w-4 h-4 text-[#00C853]" />
                    <span>Cryptocurrency Deposit (TRC-20)</span>
                  </div>

                  <div className="space-y-2 text-xs font-sans">
                    <div>
                      <span className="text-[10px] text-[#8A8A8A] block uppercase font-mono">Deposit Address (TRC-20)</span>
                      <span className="text-xs text-white font-mono break-all font-bold block bg-[#111] p-2 rounded border border-[#222]">
                        {trc20Address || 'No TRC-20 address configured'}
                      </span>
                    </div>
                  </div>

                  {trc20Qr && (
                    <div className="flex items-center space-x-3 bg-[#111] p-2 rounded-lg border border-[#222]">
                      <img src={trc20Qr} alt="TRC20 QR" className="w-12 h-12 object-contain bg-white p-1 rounded" />
                      <span className="text-[11px] text-[#8A8A8A]">TRC-20 QR code available for 1-click mobile scanning</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Footer Simulation */}
            <div className="bg-[#181818] border border-[#262626] rounded-xl p-4 space-y-2">
              <span className="text-[10px] text-[#8A8A8A] uppercase font-mono tracking-wider block">
                3. User View: Footer Appearance
              </span>
              <div className="bg-[#0B0E14] border border-[#1F2937] rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  {footerBrandLogoUrl ? (
                    <img src={footerBrandLogoUrl} alt="Footer Logo" className="h-6 object-contain" />
                  ) : footerShowEmoji ? (
                    <span className="w-6 h-6 rounded bg-[#00C853] text-black font-black text-xs flex items-center justify-center font-mono">
                      {footerEmojiIcon || 'e'}
                    </span>
                  ) : null}
                  <span className="text-white font-extrabold text-sm font-sans">{footerBrandName || siteName}</span>
                </div>
                <p className="text-xs text-[#8A8A8A] max-w-xl font-sans">
                  {footerDescription || 'Institutional grade crypto & forex financial trading engine.'}
                </p>
                <div className="text-[10px] text-[#666] pt-2 border-t border-[#1F2937] flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span>{footerCopyright || `© 2026 ${siteName}. All rights reserved.`}</span>
                  <span>{contactHours || '24/7 Global Desk'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center space-x-3 text-[#FF3B30]">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-extrabold font-sans text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-[#8A8A8A] font-sans leading-relaxed">{confirmModal.description}</p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-[#222] hover:bg-[#2A2A2A] text-gray-300 hover:text-white rounded-xl text-xs font-bold font-sans cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-[#FF3B30] hover:bg-[#E02E24] text-white rounded-xl text-xs font-extrabold font-sans shadow-lg cursor-pointer"
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE ZOOM INSPECTION MODAL */}
      {previewImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl max-w-2xl w-full p-5 space-y-4 text-white relative">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-sm font-bold font-sans">{previewImageModal.title}</h3>
              <button
                onClick={() => setPreviewImageModal(null)}
                className="text-[#8A8A8A] hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-center p-6 bg-[#080808] border border-[#222] rounded-xl max-h-[70vh] overflow-auto">
              <img src={previewImageModal.url} alt="Full resolution preview" className="max-w-full max-h-[60vh] object-contain" />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewImageModal(null)}
                className="px-4 py-2 bg-[#222] hover:bg-[#333] text-white text-xs font-bold rounded-xl font-sans cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
