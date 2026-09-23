import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { User, Wallet, Role, AdminChatConversation } from '../types';
import { 
  CheckCircle2, Search, LayoutDashboard, Zap, CheckSquare, Users, DollarSign,
  Settings, MessageSquare, LineChart, Shield, ShieldCheck, Headphones, User as UserIcon, UserX, AlertTriangle, X, ArrowUpRight, Plus, Minus
, ZoomIn, ExternalLink, Bell, ShieldAlert, Upload, RefreshCw, FileCheck, Paperclip, Download, FileText, ChevronLeft, Check,
  Building2, Copy, Smartphone, Coins, Info, CreditCard, ArrowDownLeft, XCircle, History, Clock, ArrowDownRight, Eye, Filter, Layers, Inbox, AlertCircle
} from 'lucide-react';
import { processFileForUpload } from '../utils/fileUtils';
import { formatIST } from '../utils/dateUtils';
import { realtimeChat } from '../services/realtimeChat';
import { SecurityAuditTrail } from '../components/SecurityAuditTrail';
import { AdminTradeHistorySection } from '../components/admin/AdminTradeHistorySection';
import { AdminSupportDesk } from '../components/admin/AdminSupportDesk';
import { ApprovalDeskSection } from '../components/admin/ApprovalDeskSection';
import { AdminBrandingPayments } from '../components/admin/AdminBrandingPayments';
import { RolePermissionManager } from '../components/RolePermissionManager';
import { ADMIN_MODULES_CATALOG, DEFAULT_ROLE_TEMPLATES } from '../types';
import { getContractSize, lotsToUnits, unitsToLots, formatLots, getTradeLots, calculateNotionalUSD, calculateMarginUSD } from '../utils/marginUtils';
import { 
  normalizeRole, 
  canUserAccessTab, 
  hasUserActionPermission, 
  getDefaultTabForUser, 
  getRoleModulesBreakdown, 
  isMasterAdmin 
} from '../utils/rbac';

export { normalizeRole, canUserAccessTab, hasUserActionPermission, getDefaultTabForUser };

export function getDefaultTabForRole(role: string = 'user'): string {
  return getDefaultTabForUser({ role: role as any });
}

// Helper: Determine if user/role can access tab with dynamic RBAC support
export function canAccessTab(userOrRole: any, tabId: string): boolean {
  return canUserAccessTab(userOrRole, tabId);
}

// Helper: Get Enabled/Disabled Modules dynamically
export function getRoleModules(userOrRole: any) {
  return getRoleModulesBreakdown(userOrRole);
}

// Component: Role Badge with Clean Colored Text Badges
export const RoleBadge: React.FC<{ role?: string; status?: string; size?: 'sm' | 'md'; showSymbol?: boolean }> = ({ 
  role = 'user', 
  status, 
  size = 'sm'
}) => {
  if (status === 'suspended') {
    return (
      <span className={`inline-flex items-center font-mono font-bold rounded-md border uppercase tracking-wider ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } bg-red-500/10 text-red-400 border-red-500/30`}>
        <span>SUSPENDED</span>
      </span>
    );
  }

  const roleLower = role.toLowerCase();

  switch (roleLower) {
    case 'admin':
      return (
        <span className={`inline-flex items-center font-mono font-bold rounded-md border uppercase tracking-wider ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } bg-[#00C853]/10 text-[#00C853] border-[#00C853]/30`}>
          <span>ADMIN</span>
        </span>
      );
    case 'co_admin':
    case 'co-admin':
      return (
        <span className={`inline-flex items-center font-mono font-bold rounded-md border uppercase tracking-wider ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } bg-blue-500/10 text-blue-400 border-blue-500/30`}>
          <span>CO-ADMIN</span>
        </span>
      );
    case 'trade_controller':
      return (
        <span className={`inline-flex items-center font-mono font-bold rounded-md border uppercase tracking-wider ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } bg-purple-500/10 text-purple-400 border-purple-500/30`}>
          <span>TRADE CONTROLLER</span>
        </span>
      );
    case 'finance_manager':
      return (
        <span className={`inline-flex items-center font-mono font-bold rounded-md border uppercase tracking-wider ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } bg-orange-500/10 text-orange-400 border-orange-500/30`}>
          <span>FINANCE MANAGER</span>
        </span>
      );
    case 'support':
      return (
        <span className={`inline-flex items-center font-mono font-bold rounded-md border uppercase tracking-wider ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } bg-yellow-400/10 text-yellow-400 border-yellow-400/30`}>
          <span>SUPPORT</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center font-mono font-bold rounded-md border uppercase tracking-wider ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } bg-gray-500/10 text-gray-400 border-gray-500/30`}>
          <span>USER</span>
        </span>
      );
  }
};

export function AdminPanelPage() {
  const { user, login, refreshUserData } = useAuth();
  
  // Tabs
  const [activeTab, setActiveTab] = useState(() => getDefaultTabForRole(user?.role));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tradeHistorySelectedUserId, setTradeHistorySelectedUserId] = useState<string | null>(null);

  // Settings States
  const [siteNameInput, setSiteNameInput] = useState('');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [faviconUrlInput, setFaviconUrlInput] = useState('');
  const [tradeSharingEnabledInput, setTradeSharingEnabledInput] = useState(true);
  const [customTradeLogoUrlInput, setCustomTradeLogoUrlInput] = useState('');
  const [bankNameInput, setBankNameInput] = useState('');
  const [accountNameInput, setAccountNameInput] = useState('');
  const [accountNumberInput, setAccountNumberInput] = useState('');
  const [ifscInput, setIfscInput] = useState('');
  const [upiIdInput, setUpiIdInput] = useState('');
  const [upiQrCodeInput, setUpiQrCodeInput] = useState('');

  const [trc20Input, setTrc20Input] = useState('');
  const [trc20QrInput, setTrc20QrInput] = useState('');
  const [erc20Input, setErc20Input] = useState('');
  const [erc20QrInput, setErc20QrInput] = useState('');
  const [bep20Input, setBep20Input] = useState('');
  const [bep20QrInput, setBep20QrInput] = useState('');
  const [solanaInput, setSolanaInput] = useState('');
  const [solanaQrInput, setSolanaQrInput] = useState('');

  const [footerAddressInput, setFooterAddressInput] = useState('');
  const [footerPhoneInput, setFooterPhoneInput] = useState('');
  const [footerWhatsappInput, setFooterWhatsappInput] = useState('');
  const [footerEmailInput, setFooterEmailInput] = useState('');
  const [footerHoursInput, setFooterHoursInput] = useState('');

  const [footerBrandNameInput, setFooterBrandNameInput] = useState('');
  const [footerBrandLogoUrlInput, setFooterBrandLogoUrlInput] = useState('');
  const [footerShowEmojiInput, setFooterShowEmojiInput] = useState(true);
  const [footerEmojiIconInput, setFooterEmojiIconInput] = useState('');
  const [footerDescriptionInput, setFooterDescriptionInput] = useState('');
  const [footerCopyrightInput, setFooterCopyrightInput] = useState('');
  const [footerDisclaimerInput, setFooterDisclaimerInput] = useState('');

  const [settingsMsg, setSettingsMsg] = useState('');

  // Modals
  const [imageModal, setImageModal] = useState<{ url: string; title: string; userEmail?: string } | null>(null);
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);
  const [selectedUserProfileModal, setSelectedUserProfileModal] = useState<any>(null);
  const [suspensionModalUser, setSuspensionModalUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordChangeInput, setPasswordChangeInput] = useState('');
  const [isGlobalRolePolicyModalOpen, setIsGlobalRolePolicyModalOpen] = useState(false);
  const [permissionModalUser, setPermissionModalUser] = useState<any>(null);

  const [suspendDuration, setSuspendDuration] = useState('7d');
  const [suspendCustomUntil, setSuspendCustomUntil] = useState('');
  const [suspendReason, setSuspendReason] = useState('');

  // Trade Control
  const [editModalPos, setEditModalPos] = useState<any>(null);
  const [editEntryPrice, setEditEntryPrice] = useState('');
  const [editLeverage, setEditLeverage] = useState('');
  const [editLots, setEditLots] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editStopLoss, setEditStopLoss] = useState('');
  const [editTakeProfit, setEditTakeProfit] = useState('');
  const [editHandlingFee, setEditHandlingFee] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [overrideModalPos, setOverrideModalPos] = useState<any>(null);
  const [overridePnLValue, setOverridePnLValue] = useState('');
  const [pnlTransitionDuration, setPnlTransitionDuration] = useState('1');
  const [priceOverrideModalPos, setPriceOverrideModalPos] = useState<any>(null);
  const [overridePriceValue, setOverridePriceValue] = useState('');
  const [priceTransitionDuration, setPriceTransitionDuration] = useState('1');
  const [searchTrade, setSearchTrade] = useState('');
  const [openTradeModalOpen, setOpenTradeModalOpen] = useState(false);
  const [openTradeUser, setOpenTradeUser] = useState('');
  const [openTradeSymbol, setOpenTradeSymbol] = useState('BTC/USDT');
  const [openTradeSide, setOpenTradeSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [openTradeAmount, setOpenTradeAmount] = useState('1');
  const [openTradeLots, setOpenTradeLots] = useState('1.00');
  const [openTradeLeverage, setOpenTradeLeverage] = useState('20');
  const [openTradePrice, setOpenTradePrice] = useState('');
  const [openTradeStopLoss, setOpenTradeStopLoss] = useState('');
  const [openTradeTakeProfit, setOpenTradeTakeProfit] = useState('');
  const [openTradeFee, setOpenTradeFee] = useState('');
  const [openTradeError, setOpenTradeError] = useState<string | null>(null);
  const [openTradeLoading, setOpenTradeLoading] = useState(false);

  // Profit Control / Balance
  const [selectedUserId, setSelectedUserId] = useState('');
  const [adjustAction, setAdjustAction] = useState<'increase' | 'decrease' | 'add_bonus' | 'deduct'>('increase');
  const [adjustWalletType, setAdjustWalletType] = useState<'spot' | 'trading' | 'funding'>('trading');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustMsg, setAdjustMsg] = useState('');
  const [adjustConfirmModalOpen, setAdjustConfirmModalOpen] = useState(false);
  const [adjustValidationError, setAdjustValidationError] = useState<string | null>(null);
  const [lastAdjustmentResult, setLastAdjustmentResult] = useState<{
    referenceId: string;
    previousBalance: number;
    adjustmentAmount: number;
    newBalance: number;
    action: string;
    walletType: string;
    currency: string;
    timestamp: string;
    userName: string;
    userEmail: string;
    reason: string;
  } | null>(null);
  const [copiedRefId, setCopiedRefId] = useState(false);

  // Chat
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const selectedChatUserRef = useRef<any>(null);
  useEffect(() => {
    selectedChatUserRef.current = selectedChatUser;
  }, [selectedChatUser]);

  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
    if (activeTab === 'chat' && selectedChatUserRef.current?.userId) {
      loadSelectedUserChat(selectedChatUserRef.current.userId);
      apiService.markAdminChatRead(selectedChatUserRef.current.userId).catch(() => {});
      setChatConversations(prev => prev.map(c => c.userId === selectedChatUserRef.current.userId ? { ...c, unreadCount: 0 } : c));
    }
  }, [activeTab]);
  const [adminChatInput, setAdminChatInput] = useState('');
  const [adminAttachments, setAdminAttachments] = useState<any[]>([]);
  const [adminUploading, setAdminUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const adminFileInputRef = useRef<HTMLInputElement>(null);

  // Search
  const [searchUser, setSearchUser] = useState('');

  // Alerts
  const [adminAlerts, setAdminAlerts] = useState<any[]>([]);
  const [activeToasts, setActiveToasts] = useState<any[]>([]);

  // Data
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [allPositions, setAllPositions] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [pendingKYC, setPendingKYC] = useState<any[]>([]);
  const [depositFilter, setDepositFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [withdrawalFilter, setWithdrawalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [kycFilter, setKycFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [approvalDeskSection, setApprovalDeskSection] = useState<'all' | 'deposits' | 'withdrawals' | 'kyc'>('all');
  const [depositSearch, setDepositSearch] = useState('');
  const [withdrawalSearch, setWithdrawalSearch] = useState('');
  const [kycSearch, setKycSearch] = useState('');
  const [selectedWithdrawalModal, setSelectedWithdrawalModal] = useState<any | null>(null);
  const [withdrawalActionNotes, setWithdrawalActionNotes] = useState('');
  const [withdrawalTxHash, setWithdrawalTxHash] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyText = (text: string, id: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(id);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const getWithdrawalDetails = (wd: any) => {
    const details = wd.destinationDetails || {};
    const rawMethod = (details.method || wd.method || (
      wd.network?.toLowerCase().includes('bank') ? 'bank_transfer' :
      wd.network?.toLowerCase().includes('upi') ? 'upi' :
      'crypto'
    )).toLowerCase();

    const isBank = rawMethod === 'bank_transfer' || rawMethod === 'bank' || !!details.bankName || !!wd.bankName;
    const isUpi = !isBank && (rawMethod === 'upi' || !!details.upiId || !!wd.upiId);
    const isCrypto = !isBank && !isUpi;

    let upiIdVal = details.upiId || wd.upiId || details.upi || wd.upi;
    if (!upiIdVal && typeof wd.destination === 'string' && wd.destination.includes('UPI:')) {
      const match = wd.destination.match(/UPI:\s*([^\s|]+)/i);
      if (match && match[1]) {
        upiIdVal = match[1];
      }
    }

    return {
      method: isBank ? 'bank_transfer' : isUpi ? 'upi' : 'crypto',
      bankName: details.bankName || wd.bankName,
      accountHolderName: details.accountHolderName || wd.accountHolderName || wd.accountName,
      accountNumber: details.accountNumber || wd.accountNumber,
      ifscCode: details.ifscCode || details.ifscSwift || wd.ifscCode,
      accountType: details.accountType || wd.accountType || 'Savings',
      upiId: upiIdVal || undefined,
      cryptoNetwork: details.cryptoNetwork || wd.cryptoNetwork || wd.network || 'TRC-20',
      destinationAddress: details.destinationAddress || wd.destinationAddress || wd.destination,
      cryptoCurrency: details.cryptoCurrency || wd.currency || 'USDT',
      payoutAmountInr: details.payoutAmountInr || wd.payoutAmountInr,
      exchangeRate: details.exchangeRate || wd.exchangeRate
    };
  };
  const [chatConversations, setChatConversations] = useState<any[]>([]);
  const [selectedChatThread, setSelectedChatThread] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // login states
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // refs
  const knownDepositIdsRef = useRef<Set<string>>(new Set());
  const knownWithdrawalIdsRef = useRef<Set<string>>(new Set());
  const knownKycIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  const isSettingsLoadedRef = useRef(false);

  // playAlertSound
  const playAlertSound = () => {
    try {
      const audio = new Audio('/alert.mp3');
      audio.play().catch(() => {});
    } catch(e) {}
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);

      const statsPromise = canAccessTab(user, 'analytics')
        ? apiService.getAdminStats().catch(() => null)
        : Promise.resolve(null);

      const usersPromise = (canAccessTab(user, 'users') || canAccessTab(user, 'profit_control'))
        ? apiService.getAdminUsers().catch(() => [])
        : Promise.resolve([]);

      const positionsPromise = (canAccessTab(user, 'trade_control') || canAccessTab(user, 'trade_history'))
        ? apiService.getAllAdminPositions().catch(() => [])
        : Promise.resolve([]);

      const mktsPromise = canAccessTab(user, 'markets') || canAccessTab(user, 'trade_control')
        ? apiService.getMarkets().catch(() => [])
        : Promise.resolve([]);

      const logsPromise = canAccessTab(user, 'audit')
        ? apiService.getAuditLogs().catch(() => [])
        : Promise.resolve([]);

      const pendingReqsPromise = canAccessTab(user, 'approval_desk')
        ? apiService.getPendingRequests().catch(() => ({ deposits: [], withdrawals: [] }))
        : Promise.resolve({ deposits: [], withdrawals: [] });

      const settingsPromise = canAccessTab(user, 'settings')
        ? apiService.getSettings().catch(() => null)
        : Promise.resolve(null);

      const kycReqsPromise = canAccessTab(user, 'approval_desk')
        ? apiService.getAdminKYCRequests().catch(() => [])
        : Promise.resolve([]);

      const [statsData, usersData, positionsData, mktsData, logsData, pendingReqs, settingsData, kycReqs] = await Promise.all([
        statsPromise,
        usersPromise,
        positionsPromise,
        mktsPromise,
        logsPromise,
        pendingReqsPromise,
        settingsPromise,
        kycReqsPromise
      ]);

      setAnalytics(statsData);
      setUsers(usersData || []);
      setAllPositions(positionsData || []);
      setMarkets(mktsData || []);
      setAuditLogs(logsData || []);
      setPendingDeposits(pendingReqs?.deposits || []);
      setPendingWithdrawals(pendingReqs?.withdrawals || []);
      setPendingKYC(kycReqs || []);

      if (settingsData && !isSettingsLoadedRef.current) {
        isSettingsLoadedRef.current = true;
        setSiteNameInput(settingsData.siteName || 'eToro Global');
        setLogoUrlInput(settingsData.logoUrl || '');
        setFaviconUrlInput(settingsData.faviconUrl || '');
        setTradeSharingEnabledInput(settingsData.tradeSharingEnabled !== false);
        setCustomTradeLogoUrlInput(settingsData.customTradeLogoUrl || '');
        if (settingsData.bankDetails) {
          setBankNameInput(settingsData.bankDetails.bankName || '');
          setAccountNameInput(settingsData.bankDetails.accountName || '');
          setAccountNumberInput(settingsData.bankDetails.accountNumber || '');
          setIfscInput(settingsData.bankDetails.ifscIban || '');
          setUpiIdInput(settingsData.bankDetails.upiId || '');
          if ((settingsData.bankDetails as any).upiQrCode) {
            setUpiQrCodeInput((settingsData.bankDetails as any).upiQrCode);
          }
        }
        if (settingsData.cryptoWallets) {
          const trc = settingsData.cryptoWallets.find((w:any) => w.network === 'TRC-20');
          if (trc) {
            setTrc20Input(trc.address || '');
            setTrc20QrInput(trc.qrCode || '');
          }
          const erc = settingsData.cryptoWallets.find((w:any) => w.network === 'ERC-20');
          if (erc) {
            setErc20Input(erc.address || '');
            setErc20QrInput(erc.qrCode || '');
          }
          const bep = settingsData.cryptoWallets.find((w:any) => w.network === 'BEP-20');
          if (bep) {
            setBep20Input(bep.address || '');
            setBep20QrInput(bep.qrCode || '');
          }
          const sol = settingsData.cryptoWallets.find((w:any) => w.network === 'Solana');
          if (sol) {
            setSolanaInput(sol.address || '');
            setSolanaQrInput(sol.qrCode || '');
          }
        }
        if (settingsData.contactInfo) {
          setFooterAddressInput(settingsData.contactInfo.address || '');
          setFooterPhoneInput(settingsData.contactInfo.phone || '');
          setFooterWhatsappInput(settingsData.contactInfo.whatsapp || '');
          setFooterEmailInput(settingsData.contactInfo.email || '');
          setFooterHoursInput(settingsData.contactInfo.officeHours || '');
        }
        if (settingsData.footerSettings) {
          setFooterBrandNameInput(settingsData.footerSettings.brandName || settingsData.footerSettings.brandText || 'ETORO GLOBAL');
          setFooterBrandLogoUrlInput(settingsData.footerSettings.brandLogoUrl || '');
          setFooterShowEmojiInput(settingsData.footerSettings.showEmojiLogo !== false);
          setFooterEmojiIconInput(settingsData.footerSettings.emojiIcon || 'e');
          setFooterDescriptionInput(settingsData.footerSettings.descriptionText || '');
          setFooterCopyrightInput(settingsData.footerSettings.copyrightText || '');
          setFooterDisclaimerInput(settingsData.footerSettings.customDisclaimer || '');
        }
      }

      if (usersData && usersData.length > 0) {
        setSelectedUserId((prev: any) => {
          if (prev && usersData.some((u: any) => u.id === prev)) {
            return prev;
          }
          return usersData[0].id;
        });
        setOpenTradeUser((prev: any) => {
          if (prev && usersData.some((u: any) => u.id === prev)) {
            return prev;
          }
          return usersData[0].id;
        });
      }

      // Auto load chat data if active role has chat permissions
      if (canAccessTab(user, 'chat')) {
        loadAdminChat();
        if (selectedChatUserRef.current?.userId) {
          loadSelectedUserChat(selectedChatUserRef.current.userId);
        }
      }
    } catch (err) {
      console.warn('Admin load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync fresh session details on mount
  useEffect(() => {
    if (refreshUserData) {
      refreshUserData().catch(() => {});
    }
  }, []);

  // Continuous real-time data polling for all administrative / staff roles
  useEffect(() => {
    const norm = normalizeRole(user?.role);
    const isStaff = norm !== 'user';
    if (isStaff) {
      loadAdminData();
      const interval = setInterval(loadAdminData, 1000);
      return () => clearInterval(interval);
    }
  }, [user?.role]);

  // Instant refresh when changing tabs
  useEffect(() => {
    const norm = normalizeRole(user?.role);
    const isStaff = norm !== 'user';
    if (isStaff) {
      loadAdminData();
    }
  }, [activeTab]);

  // Real-time Chat SSE Synchronization for Admin/Staff
  useEffect(() => {
    const norm = normalizeRole(user?.role);
    const isStaff = norm !== 'user';
    if (!isStaff) return;

    realtimeChat.connect();

    const unsubMsg = realtimeChat.onMessage((msg) => {
      const currentSelected = selectedChatUserRef.current;
      const isChatTabActive = activeTabRef.current === 'chat';
      const isViewingThisUser = isChatTabActive && currentSelected?.userId === msg.userId;

      // 1. If message is for currently selected thread, append it
      if (currentSelected?.userId === msg.userId) {
        setSelectedChatThread(prev => {
          if (prev.some(m => m.id === msg.id || (msg.clientMsgId && m.clientMsgId === msg.clientMsgId))) {
            return prev.map(m => (m.id === msg.id || (msg.clientMsgId && m.clientMsgId === msg.clientMsgId)) ? msg : m);
          }
          return [...prev, msg];
        });

        // Mark as read immediately on server only if actively viewing in chat tab
        if (msg.sender === 'user' && isViewingThisUser) {
          apiService.markAdminChatRead(msg.userId).catch(() => {});
        }
      }

      // 2. Play incoming notification chime for incoming customer message
      if (msg.sender === 'user') {
        realtimeChat.playIncomingChime();
      }

      // 3. Update chat conversations list in real-time
      const msgText = msg.message || (msg as any).text || (msg.attachments?.length ? `[Attached ${msg.attachments.length} file(s)]` : '');
      setChatConversations(prev => {
        const existingIdx = prev.findIndex(c => c.userId === msg.userId);
        if (existingIdx >= 0) {
          const updated = [...prev];
          const curr = updated[existingIdx];
          const unreadInc = (!isViewingThisUser && msg.sender === 'user') ? 1 : 0;
          const nextUnread = isViewingThisUser ? 0 : ((curr.unreadCount || 0) + unreadInc);
          updated[existingIdx] = {
            ...curr,
            userName: msg.userName || curr.userName,
            lastMessage: msgText,
            lastTimestamp: msg.timestamp,
            lastSender: msg.sender,
            unreadCount: nextUnread,
            status: (msg.sender === 'user' && nextUnread > 0) ? 'waiting_admin' : curr.status
          };
          return updated;
        } else {
          // Add newly discovered customer thread
          const newThread: AdminChatConversation = {
            userId: msg.userId,
            userName: msg.userName || 'Customer',
            userEmail: '',
            accountStatus: 'active',
            balance: 0,
            kycStatus: 'unverified',
            lastMessage: msgText,
            lastTimestamp: msg.timestamp,
            unreadCount: isViewingThisUser ? 0 : 1,
            lastSender: msg.sender,
            status: 'waiting_admin'
          };
          loadAdminChat();
          return [newThread, ...prev];
        }
      });

      // 4. Show toast notification if admin is on another tab or viewing another customer
      if (msg.sender === 'user' && !isViewingThisUser) {
        const toastId = 'chat_toast_' + msg.userId;
        const toast = {
          id: toastId,
          type: 'chat',
          userId: msg.userId,
          userName: msg.userName || 'Customer',
          msg: `New message from ${msg.userName || 'Customer'}: ${msgText ? (msgText.length > 60 ? msgText.slice(0, 60) + '...' : msgText) : 'You have received a new support message.'}`
        };
        setActiveToasts(prev => [toast, ...prev.filter(t => t.userId !== msg.userId && t.id !== toastId)].slice(0, 3));
        setTimeout(() => {
          setActiveToasts(prev => prev.filter(t => t.id !== toastId));
        }, 6000);
      }
    });

    const unsubRead = realtimeChat.onRead(({ userId, reader }) => {
      if (reader === 'admin') {
        // Staff marked user's messages as read
        setChatConversations(prev => prev.map(c => c.userId === userId ? { ...c, unreadCount: 0 } : c));
        const currentSelected = selectedChatUserRef.current;
        if (currentSelected?.userId === userId) {
          setSelectedChatThread(prev => prev.map(m => m.sender === 'user' ? { ...m, read: true, status: 'read' } : m));
        }
      } else if (reader === 'user') {
        // User read staff messages
        const currentSelected = selectedChatUserRef.current;
        if (currentSelected?.userId === userId) {
          setSelectedChatThread(prev => prev.map(m => m.sender === 'admin' ? { ...m, read: true, status: 'read' } : m));
        }
      }
    });

    const unsubTyping = realtimeChat.onTyping((event) => {
      if (event.sender === 'user' && event.userId) {
        setTypingUsers(prev => ({ ...prev, [event.userId!]: Boolean(event.isTyping) }));
      }
    });

    return () => {
      unsubMsg();
      unsubRead();
      unsubTyping();
    };
  }, [user?.role]);

  const loadAdminChat = async () => {
    try {
      const convs = await apiService.getAdminChatConversations();
      if (Array.isArray(convs)) {
        setChatConversations(convs);
      }
    } catch (err) {
      // ignore
    }
  };

  const loadSelectedUserChat = async (targetUserId: string) => {
    if (!targetUserId) return;
    try {
      const msgs = await apiService.getChatMessages(targetUserId);
      if (Array.isArray(msgs)) {
        setSelectedChatThread(msgs);
      }
    } catch (err) {
      // ignore
    }
  };

  const handleAdminGatewayLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      await apiService.adminLogin(adminEmail, adminPassword);
      await login(adminEmail, adminPassword);
      await loadAdminData();
    } catch (err: any) {
      setLoginError(err.message || 'Admin login failed. Verify credentials.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleOpenAdjustmentConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustValidationError(null);
    setAdjustMsg('');

    if (!selectedUserId) {
      setAdjustValidationError('Please select a target user account.');
      return;
    }

    const trimmedReason = adjustReason.trim();
    if (!trimmedReason || trimmedReason.length < 3) {
      setAdjustValidationError('Please enter a clear reason / audit note (minimum 3 characters).');
      return;
    }

    const rawStr = adjustAmount.trim();
    const num = Number(rawStr);
    if (!rawStr || isNaN(num) || num <= 0) {
      setAdjustValidationError('Please enter a valid positive adjustment amount greater than 0.');
      return;
    }

    if (rawStr.includes('.')) {
      const decimals = rawStr.split('.')[1];
      if (decimals && decimals.length > 2) {
        setAdjustValidationError('Amount precision cannot exceed 2 decimal places (cents precision, e.g. 1000.50).');
        return;
      }
    }

    if (num > 100000000) {
      setAdjustValidationError('Adjustment amount cannot exceed $100,000,000 USDT.');
      return;
    }

    // Validation passed, open confirmation modal
    setAdjustConfirmModalOpen(true);
  };

  const handleExecuteBalanceAdjustment = async () => {
    if (!selectedUserId || !adjustAmount) return;

    setAdjusting(true);
    setAdjustValidationError(null);
    const targetId = selectedUserId;
    const targetUser = users.find(u => u.id === targetId);
    const idempotencyKey = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await apiService.updateAdminUserBalance({
        userId: targetId,
        action: adjustAction as any,
        walletType: adjustWalletType as any,
        amount: parseFloat(adjustAmount),
        reason: adjustReason.trim(),
        idempotencyKey
      });

      // Update state with confirmed authoritative values from server
      if (res.wallet) {
        setUsers(prev => prev.map(u => u.id === targetId ? { ...u, wallet: res.wallet } : u));
      }

      setLastAdjustmentResult({
        referenceId: res.referenceId || `ADJ-${Date.now()}`,
        previousBalance: res.previousBalance ?? 0,
        adjustmentAmount: res.adjustmentAmount ?? parseFloat(adjustAmount),
        newBalance: res.newBalance ?? 0,
        action: res.action || adjustAction,
        walletType: res.walletType || adjustWalletType,
        currency: res.currency || 'USDT',
        timestamp: res.timestamp || new Date().toISOString(),
        userName: targetUser?.name || 'User',
        userEmail: targetUser?.email || '',
        reason: adjustReason.trim()
      });

      setAdjustMsg(`Balance adjustment executed successfully. Reference ID: ${res.referenceId || ''}`);
      setAdjustConfirmModalOpen(false);
      setAdjustAmount('');
      setAdjustReason('');

      // Refresh full dataset in background
      await loadAdminData();
      setSelectedUserId(targetId);
    } catch (err: any) {
      setAdjustValidationError(err.message || 'Balance adjustment failed. No changes were made to the database.');
    } finally {
      setAdjusting(false);
    }
  };

  const handleToggleUserStatus = async (userObj: any) => {
    if (userObj.status === 'active') {
      setSuspensionModalUser(userObj);
    } else {
      try {
        await apiService.updateAdminUserStatus(userObj.id, 'active');
        await loadAdminData();
      } catch (err: any) {
        alert(err.message || 'Status activation failed');
      }
    }
  };

  const handleConfirmSuspension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspensionModalUser) return;
    try {
      await apiService.updateAdminUserStatus(suspensionModalUser.id, 'suspended', {
        duration: suspendDuration,
        suspendedUntil: suspendDuration === 'custom' ? suspendCustomUntil : undefined,
        reason: suspendReason
      });
      setSuspensionModalUser(null);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Suspension failed');
    }
  };

  const handleToggleKYC = async (userId: string, currentKYC: string) => {
    const newKYC = currentKYC === 'verified' ? 'unverified' : 'verified';
    try {
      await apiService.updateAdminUserKYC(userId, newKYC as any);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'KYC update failed');
    }
  };

  const handleChangePassword = async (userId: string) => {
    if (passwordChangeInput.trim().length < 3) {
      alert('Password must be at least 3 characters long');
      return;
    }
    try {
      const res = await apiService.adminChangeUserPassword(userId, passwordChangeInput.trim());
      alert(res.message);
      await loadAdminData();
      if (selectedUserProfileModal) {
        setSelectedUserProfileModal({ ...selectedUserProfileModal, plainPassword: res.plainPassword });
      }
      setPasswordChangeInput('');
      setShowPasswordChange(false);
    } catch (err: any) {
      alert(err.message || 'Failed to change password');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setUserToDelete(userId);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await apiService.adminDeleteUser(userToDelete);
      setUserToDelete(null);
      if (selectedUserProfileModal && selectedUserProfileModal.id === userToDelete) {
        setSelectedUserProfileModal(null);
      }
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await apiService.updateSettings({
        siteName: siteNameInput,
        logoUrl: logoUrlInput,
        faviconUrl: faviconUrlInput,
        tradeSharingEnabled: tradeSharingEnabledInput,
        customTradeLogoUrl: customTradeLogoUrlInput,
        bankDetails: {
          bankName: bankNameInput,
          accountName: accountNameInput,
          accountNumber: accountNumberInput,
          ifscIban: ifscInput,
          upiId: upiIdInput,
          upiQrCode: upiQrCodeInput
        },
        cryptoWallets: [
          { network: 'TRC-20', address: trc20Input, qrCode: trc20QrInput },
          { network: 'ERC-20', address: erc20Input, qrCode: erc20QrInput },
          { network: 'BEP-20', address: bep20Input, qrCode: bep20QrInput },
          { network: 'SOLANA', address: solanaInput, qrCode: solanaQrInput }
        ],
        contactInfo: {
          address: footerAddressInput,
          phone: footerPhoneInput,
          whatsapp: footerWhatsappInput,
          email: footerEmailInput,
          officeHours: footerHoursInput
        },
        footerSettings: {
          brandName: footerBrandNameInput,
          brandLogoUrl: footerBrandLogoUrlInput,
          showEmojiLogo: footerShowEmojiInput,
          emojiIcon: footerEmojiIconInput,
          descriptionText: footerDescriptionInput,
          copyrightText: footerCopyrightInput,
          customDisclaimer: footerDisclaimerInput
        }
      });
      setSettingsMsg(updated.message || 'System settings & branding updated successfully');
      setTimeout(() => setSettingsMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update system settings');
    }
  };

  const handleAdminFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAdminUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processed = await processFileForUpload(file);
        // Upload to server atomically
        const res = await apiService.uploadChatAttachment({
          name: processed.name,
          type: processed.type,
          dataUrl: processed.url,
          size: processed.size,
          uploadId: 'admin_att_' + Date.now() + '_' + i
        });
        if (res.success && res.attachment) {
          setAdminAttachments(prev => [...prev, {
            ...res.attachment,
            status: 'uploaded'
          }]);
        } else {
          setAdminAttachments(prev => [...prev, processed]);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to process attachment');
    } finally {
      setAdminUploading(false);
      if (adminFileInputRef.current) adminFileInputRef.current.value = '';
    }
  };

  const removeAdminAttachment = (index: number) => {
    setAdminAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendAdminChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatUser || (!adminChatInput.trim() && adminAttachments.length === 0)) return;

    const text = adminChatInput.trim();
    const currAttachments = [...adminAttachments];

    setAdminChatInput('');
    setAdminAttachments([]);

    try {
      await apiService.sendChatMessage(text, selectedChatUser.userId, currAttachments);
      await loadSelectedUserChat(selectedChatUser.userId);
      await loadAdminChat();
    } catch (err: any) {
      alert(err.message || 'Failed to send admin chat message');
    }
  };

  const filteredPositions = allPositions;

  const filteredUsers = useMemo(() => {
    const rawQuery = (searchUser || '').trim();
    if (!rawQuery) return users;

    const q = rawQuery.toLowerCase();
    const qClean = q.replace(/[\s_\-.]+/g, '');
    const qDigits = rawQuery.replace(/\D/g, '');
    const qWords = q.split(/\s+/).filter(Boolean);

    return users.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const fullName = (u.profile?.fullName || '').toLowerCase();
      const username = (u.profile?.username || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const profEmail = (u.profile?.email || '').toLowerCase();
      const id = (u.id || '').toLowerCase();
      const phone = (u.profile?.phone || u.phone || '').toLowerCase();
      const phoneDigits = phone.replace(/\D/g, '');
      const role = (u.role || '').toLowerCase();
      const roleClean = role.replace(/[\s_\-]+/g, '');
      const country = (u.profile?.country || '').toLowerCase();
      const address = (u.profile?.address || '').toLowerCase();
      const kyc = (u.kycStatus || '').toLowerCase();
      const status = (u.status || '').toLowerCase();

      // Role helper labels and aliases
      const roleAliases: string[] = [role, roleClean];
      if (role === 'admin') {
        roleAliases.push('admin', 'administrator', 'master admin', 'super admin', 'boss', 'professor');
      } else if (role === 'co_admin' || role === 'co-admin') {
        roleAliases.push('co admin', 'coadmin', 'co-admin', 'co administrator', 'co_admin');
      } else if (role === 'trade_controller') {
        roleAliases.push('trade controller', 'tradecontroller', 'trade-controller', 'trade_controller', 'controller', 'kia', 'kiki');
      } else if (role === 'finance_manager') {
        roleAliases.push('finance manager', 'financemanager', 'finance-manager', 'finance_manager', 'finance', 'manager');
      } else if (role === 'support') {
        roleAliases.push('support', 'helpdesk', 'customer support', 'agent');
      } else if (role === 'user') {
        roleAliases.push('user', 'trader', 'client', 'customer');
      }

      // 1. Direct single-field matching
      if (
        name.includes(q) ||
        fullName.includes(q) ||
        username.includes(q) ||
        email.includes(q) ||
        profEmail.includes(q) ||
        id.includes(q) ||
        phone.includes(q) ||
        country.includes(q) ||
        address.includes(q) ||
        roleAliases.some(alias => alias.includes(q) || (qClean.length > 1 && alias.replace(/[\s_\-]+/g, '').includes(qClean)))
      ) {
        return true;
      }

      // 2. Normalized phone number matching (stripping formatting non-digits)
      if (qDigits.length >= 2 && phoneDigits.includes(qDigits)) {
        return true;
      }

      // 3. KYC / Authentication status keywords
      if (
        (q === 'authenticated' && (kyc === 'verified' || u.kycStatus === 'verified')) ||
        (q === 'unverified' && (kyc === 'unverified' || !kyc)) ||
        (q === 'verified' && (kyc === 'verified' || u.kycStatus === 'verified')) ||
        (q === 'active' && status === 'active') ||
        (q === 'suspended' && status === 'suspended')
      ) {
        return true;
      }

      // 4. Multi-word search token matching (all space-separated words must match across user data)
      if (qWords.length > 1) {
        const combined = `${name} ${fullName} ${username} ${email} ${profEmail} ${id} ${phone} ${role} ${roleAliases.join(' ')} ${country} ${address}`.toLowerCase();
        const allWordsMatch = qWords.every(word => {
          const wClean = word.replace(/[\s_\-.]+/g, '');
          const wDigits = word.replace(/\D/g, '');
          if (combined.includes(word) || (wClean.length > 1 && combined.includes(wClean))) return true;
          if (wDigits.length >= 2 && phoneDigits.includes(wDigits)) return true;
          return false;
        });
        if (allWordsMatch) return true;
      }

      return false;
    });
  }, [users, searchUser]);
  const adminChatThreads = chatConversations;
  const chatMessages = selectedChatThread;
  
  const handleForceCloseTrade = async (id: string) => {
    try {
      await apiService.adminForceClosePosition(id);
      await loadAdminData();
    } catch(err:any) { alert(err.message); }
  };
  const handleApproveDeposit = async (id: string) => {
    setPendingDeposits(prev => prev.map(d => d.id === id ? { ...d, status: 'approved' } : d));
    try {
      await apiService.approveDeposit(id);
      await loadAdminData();
    } catch(err:any) {
      alert(err.message);
      await loadAdminData();
    }
  };
  const handleRejectDeposit = async (id: string) => {
    setPendingDeposits(prev => prev.map(d => d.id === id ? { ...d, status: 'rejected' } : d));
    try {
      await apiService.rejectDeposit(id);
      await loadAdminData();
    } catch(err:any) {
      alert(err.message);
      await loadAdminData();
    }
  };
  const handleApproveWithdrawal = async (id: string, notes?: string, txHash?: string) => {
    setPendingWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'approved', adminNotes: notes, txHash } : w));
    try {
      await apiService.approveWithdrawal(id, notes, txHash);
      if (selectedWithdrawalModal && selectedWithdrawalModal.id === id) {
        setSelectedWithdrawalModal(null);
      }
      await loadAdminData();
    } catch(err:any) {
      alert(err.message || 'Failed to approve withdrawal');
      await loadAdminData();
    }
  };
  const handleRejectWithdrawal = async (id: string, reason?: string) => {
    setPendingWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'rejected', rejectionReason: reason, adminNotes: reason } : w));
    try {
      await apiService.rejectWithdrawal(id, reason, reason);
      if (selectedWithdrawalModal && selectedWithdrawalModal.id === id) {
        setSelectedWithdrawalModal(null);
      }
      await loadAdminData();
    } catch(err:any) {
      alert(err.message || 'Failed to reject withdrawal');
      await loadAdminData();
    }
  };

  
  
  
  
  const handleLogoFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        setLogoUrlInput(base64Data);
        alert("Logo image uploaded successfully! Click 'Save System Settings' below to apply.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFaviconFileUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Favicon file size exceeds 2MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        setFaviconUrlInput(base64Data);
        alert("Favicon uploaded successfully! Click 'Save System Settings' below to apply.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFooterLogoUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        setFooterBrandLogoUrlInput(base64Data);
        alert("Footer logo uploaded successfully! Click 'Save System Settings' below to apply.");
      }
    };
    reader.readAsDataURL(file);
  };
  const addToast = (msg: string) => {
    const id = Date.now();
    setActiveToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => {
      setActiveToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleApplyOverridePnL = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!overrideModalPos) return;
    try {
      const dur = parseFloat(pnlTransitionDuration) || 0;
      const res = await apiService.adminOverridePnL(overrideModalPos.id, parseFloat(overridePnLValue), false, dur);
      // Update local state directly to prevent page reload interruptions
      setAllPositions(prev => prev.map(p => p.id === overrideModalPos.id ? res.position : p));
      setOverrideModalPos(null);
      addToast(`P&L override applied${dur > 0 ? ` over ${dur}m smooth transition` : ' (Instant)'}`);
    } catch (err: any) {
      alert(err.message || 'Failed to apply P&L override');
    }
  };

  const handleResetOverridePnL = async () => {
    if (!overrideModalPos) return;
    try {
      const res = await apiService.adminOverridePnL(overrideModalPos.id, undefined, true);
      // Update local state directly
      setAllPositions(prev => prev.map(p => p.id === overrideModalPos.id ? res.position : p));
      setOverrideModalPos(null);
      addToast('P&L override reset successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to reset P&L override');
    }
  };

  const handleApplyOverridePrice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!priceOverrideModalPos) return;
    try {
      const res = await apiService.adminOverridePrice(
        priceOverrideModalPos.id,
        parseFloat(overridePriceValue),
        false,
        parseFloat(priceTransitionDuration) || 1
      );
      setAllPositions(prev => prev.map(p => p.id === priceOverrideModalPos.id ? res.position : p));
      setPriceOverrideModalPos(null);
      addToast(`Temporary price override applied with ${priceTransitionDuration}m transition`);
    } catch (err: any) {
      alert(err.message || 'Failed to apply price override');
    }
  };

  const handleResetPriceOverride = async () => {
    if (!priceOverrideModalPos) return;
    try {
      const res = await apiService.adminOverridePrice(priceOverrideModalPos.id, undefined, true);
      setAllPositions(prev => prev.map(p => p.id === priceOverrideModalPos.id ? res.position : p));
      setPriceOverrideModalPos(null);
      addToast('Price override reset successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to reset price override');
    }
  };

  const handleResetAllControls = async (posId: string) => {
    try {
      const res = await apiService.adminResetTradeControls(posId);
      setAllPositions(prev => prev.map(p => p.id === posId ? res.position : p));
      addToast('Trade controls reset to normal market mode');
    } catch (err: any) {
      alert(err.message || 'Failed to reset controls');
    }
  };

  const handleOpenEditModal = (pos: any) => {
    const posLots = pos.lots !== undefined && pos.lots !== null ? pos.lots : unitsToLots(pos.symbol, pos.size);
    setEditModalPos(pos);
    setEditEntryPrice(pos.entryPrice?.toString() || '');
    setEditLots(posLots.toString());
    setEditSize(pos.size?.toString() || '');
    setEditLeverage(pos.leverage?.toString() || '1');
    setEditStopLoss(pos.stopLoss !== undefined && pos.stopLoss !== null ? pos.stopLoss.toString() : '');
    setEditTakeProfit(pos.takeProfit !== undefined && pos.takeProfit !== null ? pos.takeProfit.toString() : '');
    setEditHandlingFee(pos.handlingFee !== undefined && pos.handlingFee !== null ? pos.handlingFee.toString() : '');
    setEditReason('');
    setEditModalError(null);
  };

  const handleApplyEditPosition = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editModalPos) return;

    setEditModalError(null);

    const parsedEntry = parseFloat(editEntryPrice);
    if (isNaN(parsedEntry) || parsedEntry <= 0) {
      setEditModalError('Entry Price must be a valid positive number');
      return;
    }

    const parsedLots = parseFloat(editLots);
    if (isNaN(parsedLots) || parsedLots <= 0) {
      setEditModalError('Position Size (Lots) must be greater than 0');
      return;
    }

    const parsedLeverage = parseFloat(editLeverage);
    if (isNaN(parsedLeverage) || parsedLeverage < 1) {
      setEditModalError('Leverage must be at least 1x');
      return;
    }

    const parsedSL = editStopLoss.trim() ? parseFloat(editStopLoss) : undefined;
    const parsedTP = editTakeProfit.trim() ? parseFloat(editTakeProfit) : undefined;
    const parsedFee = editHandlingFee.trim() ? parseFloat(editHandlingFee) : undefined;

    // Validate SL and TP against entry price according to position side
    if (parsedTP !== undefined && !isNaN(parsedTP)) {
      if (editModalPos.side === 'long' && parsedTP <= parsedEntry) {
        setEditModalError(`For a LONG position, Take Profit ($${parsedTP}) must be greater than Entry Price ($${parsedEntry}).`);
        return;
      }
      if (editModalPos.side === 'short' && parsedTP >= parsedEntry) {
        setEditModalError(`For a SHORT position, Take Profit ($${parsedTP}) must be less than Entry Price ($${parsedEntry}).`);
        return;
      }
    }

    if (parsedSL !== undefined && !isNaN(parsedSL)) {
      if (editModalPos.side === 'long' && parsedSL >= parsedEntry) {
        setEditModalError(`For a LONG position, Stop Loss ($${parsedSL}) must be less than Entry Price ($${parsedEntry}).`);
        return;
      }
      if (editModalPos.side === 'short' && parsedSL <= parsedEntry) {
        setEditModalError(`For a SHORT position, Stop Loss ($${parsedSL}) must be greater than Entry Price ($${parsedEntry}).`);
        return;
      }
    }

    setEditModalLoading(true);
    try {
      const res = await apiService.adminEditPosition(editModalPos.id, {
        entryPrice: parsedEntry,
        lots: parsedLots,
        size: lotsToUnits(parsedLots, editModalPos.symbol),
        leverage: parsedLeverage,
        stopLoss: parsedSL,
        takeProfit: parsedTP,
        handlingFee: parsedFee,
        reason: editReason.trim() || undefined
      });

      // Update local state directly
      setAllPositions(prev => prev.map(p => p.id === editModalPos.id ? res.position : p));
      setEditModalPos(null);
      addToast(`Position parameters for ${editModalPos.symbol} updated successfully`);
    } catch (err: any) {
      setEditModalError(err.message || 'Failed to apply position edit');
    } finally {
      setEditModalLoading(false);
    }
  };

  const handleOpenTradeForUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!openTradeUser) return;
    setOpenTradeError(null);

    const parsedLots = parseFloat(openTradeLots);
    if (isNaN(parsedLots) || parsedLots <= 0) {
      setOpenTradeError('Position Size (Lots) must be greater than 0');
      return;
    }

    const parsedLev = parseFloat(openTradeLeverage);
    if (isNaN(parsedLev) || parsedLev < 1) {
      setOpenTradeError('Leverage must be at least 1x');
      return;
    }

    const parsedCustomPrice = openTradePrice.trim() ? parseFloat(openTradePrice) : undefined;
    const parsedSL = openTradeStopLoss.trim() ? parseFloat(openTradeStopLoss) : undefined;
    const parsedTP = openTradeTakeProfit.trim() ? parseFloat(openTradeTakeProfit) : undefined;
    const parsedFee = openTradeFee.trim() ? parseFloat(openTradeFee) : undefined;

    setOpenTradeLoading(true);
    try {
      await apiService.adminOpenTradeForUser({
        userId: openTradeUser,
        symbol: openTradeSymbol,
        side: openTradeSide.toLowerCase() as 'long' | 'short',
        amount: lotsToUnits(parsedLots, openTradeSymbol),
        lots: parsedLots,
        leverage: parsedLev,
        entryPrice: parsedCustomPrice,
        stopLoss: parsedSL,
        takeProfit: parsedTP,
        handlingFee: parsedFee,
      });
      setOpenTradeModalOpen(false);
      addToast(`Trade executed successfully for user with ${parsedLots} Lots`);
      await loadAdminData();
    } catch (err: any) {
      setOpenTradeError(err.message || 'Failed to open trade');
    } finally {
      setOpenTradeLoading(false);
    }
  };

  const handleApproveKYC = async (userId: string) => {
    setPendingKYC(prev => prev.map(k => k.userId === userId ? { ...k, status: 'approved' } : k));
    try {
      await apiService.approveKYC(userId);
      alert("Real Name Authentication approved successfully!");
      if (selectedUserProfileModal && selectedUserProfileModal.id === userId) {
        setSelectedUserProfileModal({ ...selectedUserProfileModal, kycStatus: 'verified' });
      }
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to approve Real Name Authentication");
      await loadAdminData();
    }
  };

  const handleRejectKYC = async (userId: string) => {
    const reason = prompt("Enter rejection reason for user:", "Incomplete or unclear identity document scan");
    if (reason === null) return;

    setPendingKYC(prev => prev.map(k => k.userId === userId ? { ...k, status: 'rejected', rejectionReason: reason } : k));
    try {
      await apiService.rejectKYC(userId, reason);
      alert("Real Name Authentication rejected.");
      if (selectedUserProfileModal && selectedUserProfileModal.id === userId) {
        setSelectedUserProfileModal({ ...selectedUserProfileModal, kycStatus: 'unverified' });
      }
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to reject KYC");
      await loadAdminData();
    }
  };

  const handleManualKYCUpdate = async (userId: string, kycStatus: string) => {
    const note = prompt("Enter internal admin note/comment (optional):", "Verified by Compliance Desk");
    if (note === null) return;
    try {
      const res = await apiService.adminManageUserKYC(userId, {
        kycStatus,
        adminNote: note,
        isManualVerification: true
      });
      alert(res.message || "KYC updated successfully!");
      if (selectedUserProfileModal && selectedUserProfileModal.id === userId) {
        setSelectedUserProfileModal({
          ...selectedUserProfileModal,
          kycStatus: res.user?.kycStatus || kycStatus
        });
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, kycStatus: (res.user?.kycStatus || kycStatus) as any } : u));
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to update KYC status");
    }
  };

  const handleRemoveDocs = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user's uploaded KYC documents?")) return;
    try {
      await apiService.adminRemoveUserKYCDocs(userId);
      alert("User KYC documents removed successfully.");
      if (selectedUserProfileModal && selectedUserProfileModal.id === userId) {
        setSelectedUserProfileModal({
          ...selectedUserProfileModal,
          kycStatus: 'unverified'
        });
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, kycStatus: 'unverified' } : u));
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to remove documents");
    }
  };

  const handleToggleGoogleAuth = async (userId: string, currentStatus: boolean) => {
    const enable = !currentStatus;
    if (!confirm(`Are you sure you want to ${enable ? 'ENABLE' : 'DISABLE & REMOVE'} Google Security Authentication for this user?`)) return;
    try {
      const res = await apiService.adminToggleUserGoogleAuth(userId, enable);
      alert(res.message);
      if (selectedUserProfileModal && selectedUserProfileModal.id === userId) {
        setSelectedUserProfileModal({
          ...selectedUserProfileModal,
          is2FAEnabled: enable,
          googleAuthEnabled: enable
        });
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is2FAEnabled: enable, googleAuthEnabled: enable } : u));
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to update Google Auth");
    }
  };

  const handleEmergencyResetAccess = async (userId: string) => {
    if (!confirm("Execute Emergency Account Recovery? This will clear 2FA, activate account, and generate a new temporary passcode.")) return;
    try {
      const res = await apiService.adminEmergencyAccessReset(userId);
      alert(`${res.message}\n\nTEMPORARY PASSWORD FOR CUSTOMER:\n${res.tempPassword}`);
      if (selectedUserProfileModal && selectedUserProfileModal.id === userId) {
        setSelectedUserProfileModal({
          ...selectedUserProfileModal,
          is2FAEnabled: false,
          googleAuthEnabled: false,
          status: 'active',
          plainPassword: res.tempPassword
        });
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is2FAEnabled: false, googleAuthEnabled: false, status: 'active', plainPassword: res.tempPassword } : u));
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || "Emergency recovery failed");
    }
  };

  const handleToggleRole = async (userId: string, targetRole?: string) => {
    let newRole = targetRole;
    const validRoles = ['admin', 'co_admin', 'trade_controller', 'finance_manager', 'support', 'manager', 'moderator', 'user'];
    if (!newRole) {
      const currentRole = selectedUserProfileModal?.role || 'user';
      const input = prompt("Enter new role (admin, co_admin, trade_controller, finance_manager, support, user):", currentRole);
      if (!input || !validRoles.includes(input.toLowerCase())) {
        return;
      }
      newRole = input.toLowerCase();
    }
    if (!validRoles.includes(newRole.toLowerCase())) return;

    try {
      await apiService.updateAdminUserRole(userId, newRole);
      if (selectedUserProfileModal && selectedUserProfileModal.id === userId) {
        setSelectedUserProfileModal({ ...selectedUserProfileModal, role: newRole as any });
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || "Failed to update role");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#121212] border border-[#222] p-8 rounded-2xl w-full max-w-md text-center">
          <Shield className="w-12 h-12 text-[#00C853] mx-auto mb-4" />
          <h2 className="text-xl font-extrabold text-white mb-2">Admin Portal Login</h2>
          <p className="text-[#8A8A8A] text-sm mb-6">Secure portal access restricted to authorized administrators.</p>
          {loginError && <p className="text-red-500 text-xs mb-4">{loginError}</p>}
          <form onSubmit={handleAdminGatewayLogin} className="space-y-4">
            <input type="email" placeholder="Email" required value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white" />
            <input type="password" placeholder="Password" required value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white" />
            <button type="submit" disabled={loggingIn} className="w-full bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold py-3 rounded-xl">{loggingIn ? 'Authenticating...' : 'Sign In'}</button>
          </form>
        </div>
      </div>
    );
  }

  const normRole = normalizeRole(user?.role);
  const isStaff = normRole !== 'user' || canUserAccessTab(user, 'trade_control') || canUserAccessTab(user, 'chat') || canUserAccessTab(user, 'approval_desk') || canUserAccessTab(user, 'profit_control') || canUserAccessTab(user, 'users') || canUserAccessTab(user, 'analytics');

  useEffect(() => {
    if (user && !canAccessTab(user, activeTab)) {
      setActiveTab(getDefaultTabForUser(user));
    }
  }, [user, activeTab]);

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#121212] border border-[#222] p-8 rounded-2xl w-full max-w-md text-center space-y-4">
          <Shield className="w-12 h-12 text-amber-400 mx-auto mb-2" />
          <h2 className="text-xl font-extrabold text-white">Restricted Access</h2>
          <p className="text-[#8A8A8A] text-xs">Your account ({user.email}) is a standard trader account. Administrative controls are restricted.</p>
          <button onClick={() => window.location.reload()} className="w-full bg-[#00C853] text-black font-bold py-2.5 rounded-xl text-xs">Return to Trading Terminal</button>
        </div>
      </div>
    );
  }

  const depositStats = useMemo(() => {
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;

    pendingDeposits.forEach((d) => {
      const s = (d.status || '').toLowerCase();
      const amt = Number(d.amount) || 0;
      if (s === 'pending') {
        pendingCount++;
        pendingAmount += amt;
      } else if (s === 'approved') {
        approvedCount++;
        approvedAmount += amt;
      } else if (s === 'rejected') {
        rejectedCount++;
      }
    });

    return {
      total: pendingDeposits.length,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      pendingAmount,
      approvedAmount,
    };
  }, [pendingDeposits]);

  const withdrawalStats = useMemo(() => {
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;

    pendingWithdrawals.forEach((w) => {
      const s = (w.status || '').toLowerCase();
      const amt = Number(w.amount) || 0;
      if (s === 'pending') {
        pendingCount++;
        pendingAmount += amt;
      } else if (s === 'approved') {
        approvedCount++;
        approvedAmount += amt;
      } else if (s === 'rejected') {
        rejectedCount++;
      }
    });

    return {
      total: pendingWithdrawals.length,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      pendingAmount,
      approvedAmount,
    };
  }, [pendingWithdrawals]);

  const kycStats = useMemo(() => {
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    pendingKYC.forEach((k) => {
      const s = (k.status || '').toLowerCase();
      if (s === 'pending' || s === 'submitted') {
        pendingCount++;
      } else if (s === 'verified' || s === 'approved') {
        approvedCount++;
      } else if (s === 'unverified' || s === 'rejected') {
        rejectedCount++;
      }
    });

    return {
      total: pendingKYC.length,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    };
  }, [pendingKYC]);

  const activePendingDeposits = useMemo(() => pendingDeposits.filter(d => (d.status || '').toLowerCase() === 'pending'), [pendingDeposits]);
  const activePendingWithdrawals = useMemo(() => pendingWithdrawals.filter(w => (w.status || '').toLowerCase() === 'pending'), [pendingWithdrawals]);
  const activePendingKYC = useMemo(() => pendingKYC.filter(k => {
    const s = (k.status || '').toLowerCase();
    return s === 'pending' || s === 'submitted';
  }), [pendingKYC]);
  const totalPendingActionCount = activePendingDeposits.length + activePendingWithdrawals.length + activePendingKYC.length;

  const filteredDeposits = useMemo(() => {
    const q = (depositSearch || '').toLowerCase().trim();
    return pendingDeposits.filter(d => {
      const s = (d.status || '').toLowerCase();
      if (depositFilter !== 'all' && s !== depositFilter) return false;
      if (!q) return true;
      const userEmail = (d.userEmail || '').toLowerCase();
      const userId = (d.userId || '').toLowerCase();
      const utr = (d.utrNumber || '').toLowerCase();
      const method = (d.method || '').toLowerCase();
      const currency = (d.currency || '').toLowerCase();
      const amt = String(d.amount || '');
      return (
        userEmail.includes(q) ||
        userId.includes(q) ||
        utr.includes(q) ||
        method.includes(q) ||
        currency.includes(q) ||
        amt.includes(q)
      );
    });
  }, [pendingDeposits, depositFilter, depositSearch]);

  const filteredWithdrawals = useMemo(() => {
    const q = (withdrawalSearch || '').toLowerCase().trim();
    return pendingWithdrawals.filter(w => {
      const s = (w.status || '').toLowerCase();
      if (withdrawalFilter !== 'all' && s !== withdrawalFilter) return false;
      if (!q) return true;
      const userEmail = (w.userEmail || '').toLowerCase();
      const userId = (w.userId || '').toLowerCase();
      const id = (w.id || '').toLowerCase();
      const method = (w.method || '').toLowerCase();
      const amt = String(w.amount || '');
      const details = w.destinationDetails || {};
      const bank = (details.bankName || w.bankName || '').toLowerCase();
      const acc = (details.accountNumber || '').toLowerCase();
      const ifsc = (details.ifscCode || '').toLowerCase();
      const upi = (details.upiId || '').toLowerCase();
      const crypto = (details.destinationAddress || w.destination || '').toLowerCase();
      const holder = (details.accountHolderName || '').toLowerCase();
      return (
        userEmail.includes(q) ||
        userId.includes(q) ||
        id.includes(q) ||
        method.includes(q) ||
        amt.includes(q) ||
        bank.includes(q) ||
        acc.includes(q) ||
        ifsc.includes(q) ||
        upi.includes(q) ||
        crypto.includes(q) ||
        holder.includes(q)
      );
    });
  }, [pendingWithdrawals, withdrawalFilter, withdrawalSearch]);

  const filteredKYC = useMemo(() => {
    const q = (kycSearch || '').toLowerCase().trim();
    return pendingKYC.filter(k => {
      const s = (k.status || '').toLowerCase();
      const normalized = s === 'verified' ? 'approved' : (s === 'unverified' ? 'rejected' : (s === 'submitted' ? 'pending' : s));
      if (kycFilter !== 'all' && normalized !== kycFilter) return false;
      if (!q) return true;
      const userEmail = (k.userEmail || '').toLowerCase();
      const userId = (k.userId || '').toLowerCase();
      const fullName = (k.fullName || '').toLowerCase();
      const docType = (k.documentType || '').toLowerCase();
      const docNum = (k.documentNumber || '').toLowerCase();
      const country = (k.country || '').toLowerCase();
      return (
        userEmail.includes(q) ||
        userId.includes(q) ||
        fullName.includes(q) ||
        docType.includes(q) ||
        docNum.includes(q) ||
        country.includes(q)
      );
    });
  }, [pendingKYC, kycFilter, kycSearch]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#00C853]/30 selection:text-[#00C853]">
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-[#222222]">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-[#1A1A1A] border border-[#333] text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Toggle Admin Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <div className="w-8 h-8 bg-[#00C853] rounded-xl flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-sm sm:text-base leading-tight">Admin Console</h1>
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse"></span>
                <span className="text-[10px] font-mono text-[#00C853] uppercase">
                  {(user.role || 'ADMIN').replace('_', ' ').toUpperCase()} CONNECTED
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {(user.role === 'admin' || user.role === 'co_admin' || user.role === 'finance_manager') && (
              <button className="relative p-2 text-[#8A8A8A] hover:text-white transition-colors" onClick={() => setIsAlertDrawerOpen(true)}>
                {totalPendingActionCount > 0 && (
                  <>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                  </>
                )}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              </button>
            )}
            <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] border border-[#333] flex items-center justify-center font-bold text-xs">
              {user.email.substring(0,2).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <aside className={`w-full lg:w-72 shrink-0 bg-[#121212] border border-[#222222] rounded-2xl p-4 lg:sticky lg:top-20 space-y-4 shadow-xl ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="px-2 pt-1 flex items-center justify-between border-b border-[#222] pb-3">
              <span className="text-[11px] font-mono font-bold text-[#00C853] uppercase tracking-wider flex items-center space-x-1.5">
                <span>Console Navigation</span>
              </span>
              <RoleBadge role={user?.role} size="sm" />
            </div>

            <nav className="space-y-1 font-sans">
              {/* GROUP 1: OVERVIEW & TRADING */}
              {(canAccessTab(user, 'analytics') || canAccessTab(user, 'trade_control') || canAccessTab(user, 'trade_history') || canAccessTab(user, 'markets')) && (
                <>
                  <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider px-2 pt-1 pb-1">
                    Dashboard & Trading
                  </div>
                  
                  {canAccessTab(user, 'analytics') && (
                    <button
                      onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }}
                      className={`w-full px-3 py-2.5 rounded-xl transition-all flex items-center justify-between text-xs font-bold ${
                        activeTab === 'analytics'
                          ? 'bg-[#00C853] text-black font-extrabold shadow-md shadow-[#00C853]/10'
                          : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <LayoutDashboard className="w-4 h-4 shrink-0" />
                        <span>Platform Analytics</span>
                      </div>
                    </button>
                  )}

                  {canAccessTab(user, 'trade_control') && (
                    <button
                      onClick={() => { setActiveTab('trade_control'); setMobileMenuOpen(false); }}
                      className={`w-full px-3 py-2.5 rounded-xl transition-all flex items-center justify-between text-xs font-bold ${
                        activeTab === 'trade_control'
                          ? 'bg-[#00C853] text-black font-extrabold shadow-md shadow-[#00C853]/10'
                          : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Zap className="w-4 h-4 shrink-0" />
                        <span>Live Trade Controller</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'trade_control' ? 'bg-black/20 text-black font-extrabold' : 'bg-[#1A1A1A] text-[#00C853]'}`}>
                        {allPositions.length}
                      </span>
                    </button>
                  )}

                  {canAccessTab(user, 'trade_history') && (
                    <button
                      onClick={() => {
                        setTradeHistorySelectedUserId(null);
                        setActiveTab('trade_history');
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl transition-all flex items-center justify-between text-xs font-bold ${
                        activeTab === 'trade_history'
                          ? 'bg-[#00C853] text-black font-extrabold shadow-md shadow-[#00C853]/10'
                          : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <History className="w-4 h-4 shrink-0" />
                        <span>Trade History</span>
                      </div>
                    </button>
                  )}

                  {canAccessTab(user, 'markets') && (
                    <button
                      onClick={() => { setActiveTab('markets'); setMobileMenuOpen(false); }}
                      className={`w-full px-3 py-2.5 rounded-xl transition-all flex items-center justify-between text-xs font-bold ${
                        activeTab === 'markets'
                          ? 'bg-[#00C853] text-black font-extrabold shadow-md shadow-[#00C853]/10'
                          : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <LineChart className="w-4 h-4 shrink-0" />
                        <span>Markets & Leverage</span>
                      </div>
                    </button>
                  )}
                </>
              )}

              {/* GROUP 2: ACCOUNTS & APPROVALS */}
              {(canAccessTab(user, 'approval_desk') || canAccessTab(user, 'users')) && (
                <>
                  <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider px-2 pt-3 pb-1">
                    Accounts & Desk
                  </div>
                  {canAccessTab(user, 'approval_desk') && (
                    <button
                      onClick={() => { setActiveTab('approval_desk'); setMobileMenuOpen(false); }}
                      className={`w-full px-3 py-2.5 rounded-xl transition-all flex items-center justify-between text-xs font-bold ${
                        activeTab === 'approval_desk'
                          ? 'bg-[#00C853] text-black font-extrabold shadow-md shadow-[#00C853]/10'
                          : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <CheckSquare className="w-4 h-4 shrink-0" />
                        <span>Approval Desk</span>
                      </div>
                      {totalPendingActionCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-500 text-white font-extrabold animate-pulse">
                          {totalPendingActionCount}
                        </span>
                      )}
                    </button>
                  )}
                  {canAccessTab(user, 'users') && (
                    <button
                      onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
                      className={`w-full px-3 py-2.5 rounded-xl transition-all flex items-center justify-between text-xs font-bold ${
                        activeTab === 'users'
                          ? 'bg-[#00C853] text-black font-extrabold shadow-md shadow-[#00C853]/10'
                          : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Users className="w-4 h-4 shrink-0" />
                        <span>User Accounts</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'users' ? 'bg-black/20 text-black' : 'bg-[#1A1A1A] text-white'}`}>
                        {users.length}
                      </span>
                    </button>
                  )}
                </>
              )}

              {/* GROUP 3: FINANCE & BRANDING */}
              {(canAccessTab(user, 'profit_control') || canAccessTab(user, 'settings')) && (
                <>
                  <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider px-2 pt-3 pb-1">
                    Finance & Settings
                  </div>
                  {canAccessTab(user, 'profit_control') && (
                    <button
                      onClick={() => { setActiveTab('profit_control'); setMobileMenuOpen(false); }}
                      className={`w-full px-3 py-2.5 rounded-xl transition-all flex items-center justify-between text-xs font-bold ${
                        activeTab === 'profit_control'
                          ? 'bg-[#00C853] text-black font-extrabold shadow-md shadow-[#00C853]/10'
                          : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <DollarSign className="w-4 h-4 shrink-0" />
                        <span>Balances & PnL Override</span>
                      </div>
                    </button>
                  )}
                  {canAccessTab(user, 'settings') && (
                    <button
                      onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
                      className={`w-full px-3 py-2.5 rounded-xl transition-all flex items-center justify-between text-xs font-bold ${
                        activeTab === 'settings'
                          ? 'bg-[#00C853] text-black font-extrabold shadow-md shadow-[#00C853]/10'
                          : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Settings className="w-4 h-4 shrink-0" />
                        <span>Branding & Payments</span>
                      </div>
                    </button>
                  )}
                </>
              )}

              {/* GROUP 4: SYSTEM & SUPPORT */}
              {(canAccessTab(user, 'chat') || canAccessTab(user, 'audit')) && (
                <>
                  <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider px-2 pt-3 pb-1">
                    System & Support
                  </div>
                  {canAccessTab(user, 'chat') && (
                    <button
                      onClick={() => { setActiveTab('chat'); setMobileMenuOpen(false); }}
                      className={`w-full px-3 py-2.5 rounded-xl transition-all flex items-center justify-between text-xs font-bold ${
                        activeTab === 'chat'
                          ? 'bg-[#00C853] text-black font-extrabold shadow-md shadow-[#00C853]/10'
                          : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <MessageSquare className="w-4 h-4 shrink-0" />
                        <span>Support Chat</span>
                      </div>
                      {adminChatThreads.some(t => t.unreadCount > 0) && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                          activeTab === 'chat' ? 'bg-black text-[#00C853]' : 'bg-[#FF3B30] text-white'
                        }`}>
                          {adminChatThreads.reduce((acc, t) => acc + (t.unreadCount || 0), 0)}
                        </span>
                      )}
                    </button>
                  )}
                  {canAccessTab(user, 'audit') && (
                    <button
                      onClick={() => { setActiveTab('audit'); setMobileMenuOpen(false); }}
                      className={`w-full px-3 py-2.5 rounded-xl transition-all flex items-center justify-between text-xs font-bold ${
                        activeTab === 'audit'
                          ? 'bg-[#00C853] text-black font-extrabold shadow-md shadow-[#00C853]/10'
                          : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Shield className="w-4 h-4 shrink-0" />
                        <span>Security Audit Logs</span>
                      </div>
                    </button>
                  )}
                </>
              )}
            </nav>
          </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 w-full space-y-6">


      {/* TAB 1: LIVE TRADE MASTER CONTROLLER */}
      {activeTab === 'trade_control' && (
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-[#222] gap-4">
            <div>
              <h3 className="font-extrabold text-lg text-white">Active Positions Across All Users</h3>
              <p className="text-xs text-[#8A8A8A]">Directly modify entry price, leverage, unrealized PnL, or force-close any user trade</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by user or symbol (e.g. BTC)..."
                value={searchTrade}
                onChange={(e) => setSearchTrade(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none font-mono"
              />
            </div>
          </div>

          {filteredPositions.length === 0 ? (
            <div className="py-12 text-center text-[#8A8A8A] font-mono text-xs">
              No active trades found matching search filters. Click "Open Trade for User" to create one.
            </div>
          ) : (
            <div>
              {/* MOBILE RESPONSIVE CARD VIEW (Visible on mobile/tablet up to md) */}
              <div className="block md:hidden space-y-3">
                {filteredPositions.map((pos, idx) => {
                  const isProfit = (pos.unrealizedPnL || 0) >= 0;
                  const posLots = getTradeLots(pos);
                  return (
                    <div key={`mob_${pos.id}_${idx}`} className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-4 space-y-3 shadow-lg">
                      {/* User & Symbol Header */}
                      <div className="flex items-start justify-between border-b border-[#222] pb-2.5">
                        <div>
                          <div className="font-extrabold text-sm text-white font-sans">{pos.userName || 'Trader'}</div>
                          <div className="text-[10px] text-[#8A8A8A] font-mono">{pos.userEmail || pos.userId}</div>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-white font-mono">{pos.symbol}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono ${
                            pos.side === 'long' ? 'bg-[#00C853]/20 text-[#00C853]' : 'bg-[#FF3B30]/20 text-[#FF3B30]'
                          }`}>
                            {pos.side}
                          </span>
                        </div>
                      </div>

                      {/* Position Details Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-[#121212] p-2 rounded-xl border border-[#222]">
                          <span className="text-[#8A8A8A] text-[10px] block">Size / Lev</span>
                          <span className="text-white font-bold">{formatLots(posLots)} ({pos.leverage}x)</span>
                          <span className="text-[#666] text-[9px] block font-mono">{pos.size} units</span>
                        </div>
                        <div className="bg-[#121212] p-2 rounded-xl border border-[#222]">
                          <span className="text-[#8A8A8A] text-[10px] block">Margin</span>
                          <span className="text-white font-bold">${pos.margin.toLocaleString()}</span>
                        </div>
                        <div className="bg-[#121212] p-2 rounded-xl border border-[#222]">
                          <span className="text-[#8A8A8A] text-[10px] block">Entry / Mark</span>
                          <span className="text-white">${pos.entryPrice.toLocaleString()}</span>
                          <span className="text-[#8A8A8A] text-[10px] block">/ ${pos.markPrice.toLocaleString()}</span>
                        </div>
                        <div className="bg-[#121212] p-2 rounded-xl border border-[#222]">
                          <span className="text-[#8A8A8A] text-[10px] block">Unrealized PnL</span>
                          <span className={`font-extrabold text-sm ${isProfit ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                            {isProfit ? '+' : ''}${pos.unrealizedPnL?.toFixed(2)}
                          </span>
                        </div>
                        <div className="col-span-2 bg-[#121212] p-2 rounded-xl border border-[#222] flex items-center justify-between">
                          <div>
                            <span className="text-[#8A8A8A] text-[9px] block uppercase font-bold">SL / TP Target</span>
                            <div className="text-[10px] font-bold font-mono">
                              <span className="text-amber-400">SL: {pos.stopLoss ? `$${pos.stopLoss}` : '-'}</span>
                              <span className="text-[#666] mx-1">|</span>
                              <span className="text-[#00C853]">TP: {pos.takeProfit ? `$${pos.takeProfit}` : '-'}</span>
                            </div>
                          </div>
                          {pos.handlingFee !== undefined && pos.handlingFee > 0 && (
                            <div className="text-right">
                              <span className="text-[#8A8A8A] text-[9px] block uppercase font-bold">Handling Fee</span>
                              <span className="text-amber-400 text-[10px] font-bold font-mono">${pos.handlingFee.toFixed(2)} USDT</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Mode Badge */}
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          {pos.manualPnLActive ? (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-[9px] font-bold font-mono">Manual PnL Mode</span>
                          ) : pos.priceOverrideActive ? (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[9px] font-bold font-mono">Price Override Mode</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-[#1A1A1A] text-[#8A8A8A] border border-[#262626] rounded text-[9px] font-bold font-mono">Normal Market</span>
                          )}
                        </div>
                      </div>

                      {/* Touch-Optimized Admin Action Buttons (Min 40-48px height) */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#222]">
                        <button
                          onClick={() => handleForceCloseTrade(pos.id)}
                          className="py-2.5 px-2 bg-[#FF3B30]/20 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white border border-[#FF3B30]/40 rounded-xl font-sans text-xs font-extrabold transition-all min-h-[44px] flex items-center justify-center cursor-pointer"
                        >
                          Close
                        </button>
                        <button
                          onClick={() => {
                            setOverrideModalPos(pos);
                            setOverridePnLValue(pos.unrealizedPnL?.toString() || '500');
                          }}
                          className="py-2.5 px-2 bg-[#00C853]/20 hover:bg-[#00C853] text-[#00C853] hover:text-black border border-[#00C853]/40 rounded-xl font-sans text-xs font-extrabold transition-all min-h-[44px] flex items-center justify-center cursor-pointer"
                        >
                          PnL
                        </button>
                        <button
                          onClick={() => {
                            setPriceOverrideModalPos(pos);
                            setOverridePriceValue(pos.markPrice?.toString() || '');
                          }}
                          className="py-2.5 px-2 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/40 rounded-xl font-sans text-xs font-extrabold transition-all min-h-[44px] flex items-center justify-center cursor-pointer"
                        >
                          Price
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {pos.manualPnLActive || pos.priceOverrideActive ? (
                          <button
                            onClick={() => handleResetAllControls(pos.id)}
                            className="py-2.5 px-2 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-400 hover:text-black border border-yellow-500/40 rounded-xl font-sans text-xs font-extrabold transition-all min-h-[44px] flex items-center justify-center cursor-pointer"
                          >
                            Reset Mode
                          </button>
                        ) : <div />}
                        <button
                          onClick={() => {
                            setEditModalPos(pos);
                            setEditEntryPrice(pos.entryPrice.toString());
                            setEditLots(posLots.toString());
                            setEditSize(pos.size.toString());
                            setEditLeverage(pos.leverage.toString());
                            setEditStopLoss(pos.stopLoss !== undefined && pos.stopLoss !== null ? pos.stopLoss.toString() : '');
                            setEditTakeProfit(pos.takeProfit !== undefined && pos.takeProfit !== null ? pos.takeProfit.toString() : '');
                            setEditHandlingFee(pos.handlingFee !== undefined && pos.handlingFee !== null ? pos.handlingFee.toString() : '');
                            setEditReason('');
                            setEditModalError(null);
                          }}
                          className="py-2.5 px-2 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] text-white rounded-xl font-sans text-xs font-bold transition-all min-h-[44px] flex items-center justify-center cursor-pointer"
                        >
                          Edit Parameters
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE VIEW (Visible on md screens and above) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="text-[#8A8A8A] border-b border-[#1E1E1E]">
                      <th className="pb-3">USER</th>
                      <th className="pb-3">SYMBOL & SIDE</th>
                      <th className="pb-3">SIZE / LEV</th>
                      <th className="pb-3">ENTRY / MARK</th>
                      <th className="pb-3">SL / TP TARGET</th>
                      <th className="pb-3">MARGIN</th>
                      <th className="pb-3">UNREALIZED PNL</th>
                      <th className="pb-3 text-right">ADMIN ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1A]">
                    {filteredPositions.map((pos, idx) => {
                      const isProfit = (pos.unrealizedPnL || 0) >= 0;
                      const posLots = getTradeLots(pos);
                      return (
                        <tr key={`${pos.id}_${idx}`} className="hover:bg-[#1A1A1A]/60 transition-colors">
                          <td className="py-3.5">
                            <div className="font-bold text-white font-sans">{pos.userName || 'Trader'}</div>
                            <div className="text-[10px] text-[#8A8A8A]">{pos.userEmail || pos.userId}</div>
                          </td>

                          <td className="py-3.5">
                            <div className="flex items-center space-x-1.5 font-bold">
                              <span className="text-white">{pos.symbol}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                pos.side === 'long' ? 'bg-[#00C853]/20 text-[#00C853]' : 'bg-[#FF3B30]/20 text-[#FF3B30]'
                              }`}>
                                {pos.side}
                              </span>
                            </div>
                            <div className="mt-1">
                              {pos.manualPnLActive ? (
                                <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-[9px] font-bold">Manual PnL Mode</span>
                              ) : pos.priceOverrideActive ? (
                                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[9px] font-bold">Price Override Mode</span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-[#1A1A1A] text-[#8A8A8A] border border-[#262626] rounded text-[9px] font-bold">Normal Market</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5">
                            <div className="text-white font-bold">{formatLots(posLots)}</div>
                            <div className="text-[#666] text-[10px] font-mono">{pos.size} units</div>
                            <div className="text-[#00C853] text-[11px] font-bold">{pos.leverage}x Leverage</div>
                          </td>

                          <td className="py-3.5">
                            <div className="text-white">${pos.entryPrice.toLocaleString()}</div>
                            <div className="text-[#8A8A8A] text-[10px]">${pos.markPrice.toLocaleString()}</div>
                          </td>

                          <td className="py-3.5">
                            <div className="text-amber-400 font-bold text-[11px]">SL: {pos.stopLoss ? `$${pos.stopLoss}` : '-'}</div>
                            <div className="text-[#00C853] font-bold text-[11px]">TP: {pos.takeProfit ? `$${pos.takeProfit}` : '-'}</div>
                            {pos.handlingFee !== undefined && pos.handlingFee > 0 && (
                              <div className="text-[#8A8A8A] text-[9px] font-mono mt-0.5">Fee: ${pos.handlingFee.toFixed(2)}</div>
                            )}
                          </td>

                          <td className="py-3.5 text-white font-bold">
                            ${pos.margin.toLocaleString()}
                          </td>

                          <td className="py-3.5">
                            <div className={`font-extrabold text-sm ${isProfit ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                              {isProfit ? '+' : ''}${pos.unrealizedPnL?.toFixed(2)} USDT
                            </div>
                          </td>

                          <td className="py-3.5 text-right space-x-1">
                            {/* Force Close Button */}
                            <button
                              onClick={() => handleForceCloseTrade(pos.id)}
                              className="px-2 py-1 bg-[#FF3B30]/20 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white border border-[#FF3B30]/40 rounded-lg font-sans text-[10px] font-extrabold transition-all cursor-pointer"
                              title="Force Close Trade"
                            >
                              Close
                            </button>

                            {/* Override PnL Button */}
                            <button
                              onClick={() => {
                                setOverrideModalPos(pos);
                                setOverridePnLValue(pos.unrealizedPnL?.toString() || '500');
                              }}
                              className="px-2 py-1 bg-[#00C853]/20 hover:bg-[#00C853] text-[#00C853] hover:text-black border border-[#00C853]/40 rounded-lg font-sans text-[10px] font-extrabold transition-all cursor-pointer"
                              title="Manual PnL Control"
                            >
                              PnL
                            </button>

                            {/* Override Price Button */}
                            <button
                              onClick={() => {
                                setPriceOverrideModalPos(pos);
                                setOverridePriceValue(pos.markPrice?.toString() || '');
                              }}
                              className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/40 rounded-lg font-sans text-[10px] font-extrabold transition-all cursor-pointer"
                              title="Market Price Control Mode"
                            >
                              Price
                            </button>

                            {(pos.manualPnLActive || pos.priceOverrideActive) && (
                              <button
                                onClick={() => handleResetAllControls(pos.id)}
                                className="px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-400 hover:text-black border border-yellow-500/40 rounded-lg font-sans text-[10px] font-extrabold transition-all cursor-pointer"
                                title="Reset to Normal Market Mode"
                              >
                                Reset
                              </button>
                            )}

                            {/* Edit Parameters Button */}
                            <button
                              onClick={() => {
                                setEditModalPos(pos);
                                setEditEntryPrice(pos.entryPrice.toString());
                                setEditLots(posLots.toString());
                                setEditSize(pos.size.toString());
                                setEditLeverage(pos.leverage.toString());
                                setEditStopLoss(pos.stopLoss !== undefined && pos.stopLoss !== null ? pos.stopLoss.toString() : '');
                                setEditTakeProfit(pos.takeProfit !== undefined && pos.takeProfit !== null ? pos.takeProfit.toString() : '');
                                setEditHandlingFee(pos.handlingFee !== undefined && pos.handlingFee !== null ? pos.handlingFee.toString() : '');
                                setEditReason('');
                                setEditModalError(null);
                              }}
                              className="px-2 py-1 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] text-white rounded-lg font-sans text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: DEPOSIT, WITHDRAWAL & KYC APPROVAL DESK */}
      {activeTab === 'approval_desk' && (
        <ApprovalDeskSection
          user={user}
          depositFilter={depositFilter}
          setDepositFilter={setDepositFilter}
          withdrawalFilter={withdrawalFilter}
          setWithdrawalFilter={setWithdrawalFilter}
          kycFilter={kycFilter}
          setKycFilter={setKycFilter}
          approvalDeskSection={approvalDeskSection}
          setApprovalDeskSection={setApprovalDeskSection}
          depositSearch={depositSearch}
          setDepositSearch={setDepositSearch}
          withdrawalSearch={withdrawalSearch}
          setWithdrawalSearch={setWithdrawalSearch}
          kycSearch={kycSearch}
          setKycSearch={setKycSearch}
          filteredDeposits={filteredDeposits}
          filteredWithdrawals={filteredWithdrawals}
          filteredKYC={filteredKYC}
          depositStats={depositStats}
          withdrawalStats={withdrawalStats}
          kycStats={kycStats}
          totalPendingActionCount={totalPendingActionCount}
          copiedField={copiedField}
          handleCopyText={handleCopyText}
          getWithdrawalDetails={getWithdrawalDetails}
          handleApproveDeposit={handleApproveDeposit}
          handleRejectDeposit={handleRejectDeposit}
          handleApproveWithdrawal={handleApproveWithdrawal}
          handleRejectWithdrawal={handleRejectWithdrawal}
          handleApproveKYC={handleApproveKYC}
          handleRejectKYC={handleRejectKYC}
          setImageModal={setImageModal}
          setSelectedWithdrawalModal={setSelectedWithdrawalModal}
          onRefresh={loadAdminData}
        />
      )}

      {/* TAB: LIVE CUSTOMER SUPPORT DESK */}
      {activeTab === 'chat' && (
        <AdminSupportDesk
          conversations={adminChatThreads}
          selectedUser={selectedChatUser}
          onSelectUser={(thread) => {
            setSelectedChatUser(thread);
            if (thread?.userId) {
              setChatConversations(prev => prev.map(c => c.userId === thread.userId ? { ...c, unreadCount: 0 } : c));
              setActiveToasts(prev => prev.filter(t => t.userId !== thread.userId));
              loadSelectedUserChat(thread.userId);
              apiService.markAdminChatRead(thread.userId).catch(() => {});
            }
          }}
          messages={chatMessages}
          onRefresh={async () => {
            await loadAdminChat();
            if (selectedChatUser?.userId) {
              await loadSelectedUserChat(selectedChatUser.userId);
            }
          }}
          onSendMessage={async (text: string, attachments: any[]) => {
            if (!selectedChatUser) return;
            await apiService.sendChatMessage(text, selectedChatUser.userId, attachments);
            setAdminAttachments([]);
            await loadSelectedUserChat(selectedChatUser.userId);
            await loadAdminChat();
          }}
          onUploadAttachment={handleAdminFileUpload}
          uploadingAttachment={adminUploading}
          pendingAttachments={adminAttachments}
          onRemoveAttachment={removeAdminAttachment}
          onClearChat={async (userId: string, userName: string) => {
            if (confirm(`Are you sure you want to clear chat history with ${userName}?`)) {
              await apiService.clearAdminChat(userId);
              await loadSelectedUserChat(userId);
              await loadAdminChat();
            }
          }}
          onNavigateToTab={(tab: string, userId?: string) => {
            if (userId) {
              setSelectedUserId(userId);
            }
            setActiveTab(tab);
          }}
          onPreviewImage={(img) => {
            setImageModal(img);
          }}
          usersList={users}
          allPositions={allPositions}
          formatIST={formatIST}
          typingUsers={typingUsers}
        />
      )}

      {/* TAB: SITE BRANDING & PAYMENT DETAILS */}
      {activeTab === 'settings' && (
        <AdminBrandingPayments
          onSettingsUpdated={async () => {
            await loadAdminData();
          }}
          formatIST={formatIST}
        />
      )}

      {/* TAB 2: ACCOUNT BALANCES & PROFIT CONTROL */}
      {activeTab === 'profit_control' && (() => {
        const selectedUserObj = users.find(u => u.id === selectedUserId);
        const currentBalanceNum = selectedUserObj?.wallet 
          ? (adjustWalletType === 'spot' 
              ? Number(selectedUserObj.wallet.spotBalance || 0) 
              : adjustWalletType === 'funding' 
              ? Number(selectedUserObj.wallet.fundingBalance || 0) 
              : Number(selectedUserObj.wallet.tradingBalance || 0))
          : 0;

        const parsedAdjNum = parseFloat(adjustAmount) || 0;
        const isCreditAction = adjustAction === 'increase' || adjustAction === 'add_bonus';

        // Exact decimal integer-cents calculation for client display preview
        const curCents = Math.round(currentBalanceNum * 100);
        const adjCents = Math.round(parsedAdjNum * 100);
        const resCents = isCreditAction ? curCents + adjCents : Math.max(0, curCents - adjCents);
        const resultingBalanceNum = resCents / 100;

        // Filter recent balance adjustments from audit logs
        const recentBalanceLogs = (auditLogs || []).filter(l => 
          l.eventType?.startsWith('BALANCE_ADJUST_') || l.category === 'finance'
        ).slice(0, 10);

        return (
          <div className="space-y-6">
            <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#222]">
                <div>
                  <h3 className="font-extrabold text-lg text-white mb-1 flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-[#00C853]" />
                    <span>Admin Balance & Profit Override Engine</span>
                  </h3>
                  <p className="text-xs text-[#8A8A8A]">Authoritative real-time balance adjustment with atomic persistence, exact decimal precision, and forensic audit logging</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 bg-[#1A1A1A] border border-[#333] text-[#8A8A8A] text-[10px] font-mono rounded-lg flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00C853]" />
                    <span>Atomic Lock Enabled</span>
                  </span>
                </div>
              </div>

              {/* Success Result Banner */}
              {lastAdjustmentResult && (
                <div className="p-4 rounded-xl bg-[#00C853]/10 border border-[#00C853]/40 text-white space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-[#00C853] font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Balance Adjustment Completed & Confirmed</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLastAdjustmentResult(null)}
                      className="text-[#8A8A8A] hover:text-white text-xs"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="bg-[#121212]/80 p-2.5 rounded-lg border border-[#00C853]/20">
                      <span className="text-[10px] text-[#8A8A8A] block">REFERENCE ID</span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="text-[#00C853] font-bold">{lastAdjustmentResult.referenceId}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(lastAdjustmentResult.referenceId);
                            setCopiedRefId(true);
                            setTimeout(() => setCopiedRefId(false), 2000);
                          }}
                          className="text-[#8A8A8A] hover:text-white p-0.5"
                          title="Copy Reference ID"
                        >
                          {copiedRefId ? <Check className="w-3 h-3 text-[#00C853]" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#121212]/80 p-2.5 rounded-lg border border-[#00C853]/20">
                      <span className="text-[10px] text-[#8A8A8A] block">PREVIOUS BALANCE</span>
                      <span className="text-white font-bold">${lastAdjustmentResult.previousBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
                    </div>

                    <div className="bg-[#121212]/80 p-2.5 rounded-lg border border-[#00C853]/20">
                      <span className="text-[10px] text-[#8A8A8A] block">APPLIED ADJUSTMENT</span>
                      <span className={`font-bold ${lastAdjustmentResult.action === 'increase' || lastAdjustmentResult.action === 'add_bonus' ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                        {lastAdjustmentResult.action === 'increase' || lastAdjustmentResult.action === 'add_bonus' ? '+' : '-'}${lastAdjustmentResult.adjustmentAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                      </span>
                    </div>

                    <div className="bg-[#121212]/80 p-2.5 rounded-lg border border-[#00C853]/20">
                      <span className="text-[10px] text-[#8A8A8A] block">CONFIRMED NEW BALANCE</span>
                      <span className="text-[#00C853] font-extrabold text-sm">${lastAdjustmentResult.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Error Message */}
              {adjustValidationError && (
                <div className="p-3.5 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[#FF3B30] text-xs font-bold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{adjustValidationError}</span>
                </div>
              )}

              {/* Adjustment Form */}
              <form onSubmit={handleOpenAdjustmentConfirm} className="space-y-5 max-w-2xl font-mono text-xs">
                {/* Target Account */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#8A8A8A]">Select User Account</label>
                    {selectedUserObj && (
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        selectedUserObj.status === 'active' ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                      }`}>
                        Account Status: {selectedUserObj.status}
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      setAdjustValidationError(null);
                    }}
                    className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl p-3 text-white outline-none"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) - Trading Balance: ${Number(u.wallet?.tradingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Adjustment Action</label>
                    <select
                      value={adjustAction}
                      onChange={(e) => {
                        setAdjustAction(e.target.value as any);
                        setAdjustValidationError(null);
                      }}
                      className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl p-3 text-white outline-none"
                    >
                      <option value="increase">Credit Balance (+)</option>
                      <option value="add_bonus">Add Profit Bonus (+)</option>
                      <option value="decrease">Deduct Balance (-)</option>
                      <option value="deduct">Deduct Trading Loss (-)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Target Wallet</label>
                    <select
                      value={adjustWalletType}
                      onChange={(e) => {
                        setAdjustWalletType(e.target.value as any);
                        setAdjustValidationError(null);
                      }}
                      className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl p-3 text-white outline-none"
                    >
                      <option value="trading">Trading Wallet (Default)</option>
                      <option value="spot">Spot Wallet</option>
                      <option value="funding">Funding Wallet</option>
                    </select>
                  </div>
                </div>

                {/* Amount with Quick Helper Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#8A8A8A]">Adjustment Amount ($ USDT)</label>
                    <span className="text-[10px] text-[#8A8A8A]">Currency: USDT (2 Decimal Places)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-[#8A8A8A] font-bold text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="100000000"
                      required
                      placeholder="0.00"
                      value={adjustAmount}
                      onChange={(e) => {
                        setAdjustAmount(e.target.value);
                        setAdjustValidationError(null);
                      }}
                      className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl py-3 pl-8 pr-3 text-white font-bold text-sm outline-none"
                    />
                  </div>

                  {/* Quick Preset Amount Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[500, 1000, 5000, 10000, 25000, 50000].map((chipVal) => (
                      <button
                        key={chipVal}
                        type="button"
                        onClick={() => {
                          setAdjustAmount(chipVal.toFixed(2));
                          setAdjustValidationError(null);
                        }}
                        className="px-2.5 py-1 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] hover:border-[#00C853]/50 text-[#8A8A8A] hover:text-white text-[10px] font-mono rounded-lg transition-colors"
                      >
                        +${chipVal.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason / Note */}
                <div>
                  <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">
                    Reason / Forensic Audit Note <span className="text-[#FF3B30]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Manual deposit reconciliation / Approved customer bonus correction"
                    value={adjustReason}
                    onChange={(e) => {
                      setAdjustReason(e.target.value);
                      setAdjustValidationError(null);
                    }}
                    className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl p-3 text-white outline-none font-sans text-xs"
                  />
                  <span className="text-[10px] text-[#8A8A8A] mt-1 block">
                    Mandatory field. This note will be recorded permanently in the Security Audit Logs and Transaction History.
                  </span>
                </div>

                {/* Live Calculation Preview Breakdown Cards */}
                <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5 text-[#00C853]" />
                    <span>Live Balance Calculation Preview</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Card 1: Current Balance */}
                    <div className="bg-[#121212] border border-[#222] rounded-xl p-3">
                      <span className="text-[10px] text-[#8A8A8A] block">CURRENT BALANCE</span>
                      <div className="text-sm font-bold text-white mt-1">
                        ${currentBalanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-[9px] text-[#8A8A8A] block mt-0.5 uppercase">{adjustWalletType} Wallet</span>
                    </div>

                    {/* Card 2: Requested Adjustment */}
                    <div className="bg-[#121212] border border-[#222] rounded-xl p-3">
                      <span className="text-[10px] text-[#8A8A8A] block">ADJUSTMENT</span>
                      <div className={`text-sm font-bold mt-1 ${isCreditAction ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                        {isCreditAction ? '+' : '-'}${parsedAdjNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-[9px] text-[#8A8A8A] block mt-0.5 uppercase">{adjustAction.replace('_', ' ')}</span>
                    </div>

                    {/* Card 3: Resulting Balance */}
                    <div className="bg-[#121212] border border-[#00C853]/30 rounded-xl p-3 bg-[#00C853]/5">
                      <span className="text-[10px] text-[#00C853] font-bold block">AFTER ADJUSTMENT</span>
                      <div className="text-sm font-extrabold text-[#00C853] mt-1">
                        ${resultingBalanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-[9px] text-[#00C853]/80 block mt-0.5">Authoritative Result</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#121212] border border-[#222] text-[10px] text-[#8A8A8A] font-mono flex items-center justify-between">
                    <span>Mathematical Proof:</span>
                    <span className="text-white font-bold">
                      ${currentBalanceNum.toFixed(2)} {isCreditAction ? '+' : '-'} ${parsedAdjNum.toFixed(2)} = ${resultingBalanceNum.toFixed(2)} USDT
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={adjusting}
                  className="w-full py-3 bg-[#00C853] hover:bg-[#00B048] disabled:opacity-50 text-black font-extrabold text-xs rounded-xl shadow-lg uppercase tracking-wider font-sans transition-all flex items-center justify-center space-x-2"
                >
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span>{adjusting ? 'Processing Secure Transaction...' : 'Review & Apply Balance Adjustment'}</span>
                </button>
              </form>
            </div>

            {/* Confirmation Modal */}
            {adjustConfirmModalOpen && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl max-w-lg w-full p-6 space-y-5 font-mono text-xs shadow-2xl animate-scaleIn">
                  <div className="flex items-start justify-between border-b border-[#222] pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base text-white font-sans">Confirm Balance Adjustment</h4>
                        <span className="text-[11px] text-[#8A8A8A]">Financial modification authorization</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={adjusting}
                      onClick={() => setAdjustConfirmModalOpen(false)}
                      className="text-[#8A8A8A] hover:text-white p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 bg-[#1A1A1A] border border-[#262626] rounded-xl p-4">
                    <div className="flex justify-between border-b border-[#262626] pb-2">
                      <span className="text-[#8A8A8A]">Target User:</span>
                      <span className="text-white font-bold font-sans">{selectedUserObj?.name} ({selectedUserObj?.email})</span>
                    </div>

                    <div className="flex justify-between border-b border-[#262626] pb-2">
                      <span className="text-[#8A8A8A]">Target Wallet:</span>
                      <span className="text-white font-bold uppercase">{adjustWalletType} Wallet (USDT)</span>
                    </div>

                    <div className="flex justify-between border-b border-[#262626] pb-2">
                      <span className="text-[#8A8A8A]">Current Server Balance:</span>
                      <span className="text-white font-bold">${currentBalanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
                    </div>

                    <div className="flex justify-between border-b border-[#262626] pb-2">
                      <span className="text-[#8A8A8A]">Adjustment:</span>
                      <span className={`font-extrabold ${isCreditAction ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                        {isCreditAction ? '+' : '-'}${parsedAdjNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT ({adjustAction.replace('_', ' ').toUpperCase()})
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-[#262626] pb-2">
                      <span className="text-[#00C853] font-bold">Projected Resulting Balance:</span>
                      <span className="text-[#00C853] font-extrabold text-sm">${resultingBalanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
                    </div>

                    <div className="pt-1">
                      <span className="text-[#8A8A8A] block text-[10px] mb-1">Reason / Note:</span>
                      <div className="text-white bg-[#121212] p-2.5 rounded-lg border border-[#333] font-sans break-words">
                        {adjustReason}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-300 font-sans leading-relaxed">
                    <strong>Security Notice:</strong> This balance adjustment will be executed atomically on the server database. A permanent transaction record and security audit entry will be generated.
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      disabled={adjusting}
                      onClick={() => setAdjustConfirmModalOpen(false)}
                      className="flex-1 py-3 bg-[#222] hover:bg-[#2A2A2A] text-white font-bold text-xs rounded-xl transition-all"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={adjusting}
                      onClick={handleExecuteBalanceAdjustment}
                      className="flex-1 py-3 bg-[#00C853] hover:bg-[#00B048] disabled:opacity-50 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-1.5"
                    >
                      {adjusting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Executing Transaction...</span>
                        </>
                      ) : (
                        <span>Confirm Adjustment</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Adjustments Audit Trail Sub-Table */}
            {recentBalanceLogs.length > 0 && (
              <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#222]">
                  <div className="flex items-center space-x-2">
                    <History className="w-4 h-4 text-[#00C853]" />
                    <h4 className="font-extrabold text-sm text-white">Recent Balance & Profit Overrides</h4>
                  </div>
                  <span className="text-[10px] text-[#8A8A8A] font-mono">Last {recentBalanceLogs.length} events</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-[#222] text-[#8A8A8A] text-[10px]">
                        <th className="pb-2.5 font-semibold">TIMESTAMP</th>
                        <th className="pb-2.5 font-semibold">TARGET USER</th>
                        <th className="pb-2.5 font-semibold">WALLET</th>
                        <th className="pb-2.5 font-semibold">ACTION</th>
                        <th className="pb-2.5 font-semibold">AMOUNT</th>
                        <th className="pb-2.5 font-semibold">BEFORE → AFTER</th>
                        <th className="pb-2.5 font-semibold">ADMIN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]">
                      {recentBalanceLogs.map((log: any, idx: number) => {
                        const isCredit = log.action?.toLowerCase().includes('credit') || log.action?.toLowerCase().includes('increase') || log.action?.toLowerCase().includes('bonus');
                        return (
                          <tr key={`bal_log_${log.id || idx}`} className="hover:bg-[#181818] transition-colors">
                            <td className="py-2.5 text-[#8A8A8A] text-[11px] whitespace-nowrap">
                              {log.timestamp ? formatIST(log.timestamp) : 'Just now'}
                            </td>
                            <td className="py-2.5 text-white font-sans">
                              {log.targetUserName || log.targetUserEmail || log.targetUserId || 'User'}
                            </td>
                            <td className="py-2.5 text-[#8A8A8A] text-[11px]">
                              {log.walletType || 'Trading Wallet'}
                            </td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isCredit ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                              }`}>
                                {log.action || 'Balance Adjust'}
                              </span>
                            </td>
                            <td className="py-2.5 font-bold">
                              <span className={isCredit ? 'text-[#00C853]' : 'text-[#FF3B30]'}>
                                {isCredit ? '+' : '-'}${Number(log.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="py-2.5 text-[#8A8A8A] text-[11px] whitespace-nowrap">
                              {log.previousBalance !== undefined && log.newBalance !== undefined 
                                ? `$${log.previousBalance.toFixed(2)} → $${log.newBalance.toFixed(2)}`
                                : log.previousState && log.newState
                                ? `${log.previousState} → ${log.newState}`
                                : '—'}
                            </td>
                            <td className="py-2.5 text-[#8A8A8A] text-[11px]">
                              {log.actorName || log.adminEmail?.split('@')[0] || 'Admin'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 3: PLATFORM ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            <div className="bg-[#121212] border border-[#222] rounded-2xl p-5">
              <span className="text-xs text-[#8A8A8A] block mb-1">REGISTERED TRADERS</span>
              <div className="text-2xl font-extrabold text-white">{analytics?.totalUsers || users.length}</div>
              <span className="text-[11px] text-[#00C853] font-bold block mt-2">Active Accounts: {analytics?.activeUsers || users.length}</span>
            </div>

            <div className="bg-[#121212] border border-[#222] rounded-2xl p-5">
              <span className="text-xs text-[#8A8A8A] block mb-1">24H MATCHING VOLUME</span>
              <div className="text-2xl font-extrabold text-[#00C853]">
                ${(analytics?.todayVolume || 12480900).toLocaleString()}
              </div>
              <span className="text-[11px] text-[#8A8A8A] block mt-2">Trades Count: {analytics?.todayTradesCount || 342}</span>
            </div>

            <div className="bg-[#121212] border border-[#222] rounded-2xl p-5">
              <span className="text-xs text-[#8A8A8A] block mb-1">ESTIMATED REVENUE</span>
              <div className="text-2xl font-extrabold text-white">
                ${(analytics?.platformRevenue || 18450).toLocaleString()}
              </div>
              <span className="text-[11px] text-[#00C853] font-bold block mt-2">Maker/Taker & Spread</span>
            </div>

            <div className="bg-[#121212] border border-[#222] rounded-2xl p-5">
              <span className="text-xs text-[#8A8A8A] block mb-1">NET DEPOSITS</span>
              <div className="text-2xl font-extrabold text-amber-400">
                +${(analytics?.todayDeposits || 450000).toLocaleString()}
              </div>
              <span className="text-[11px] text-[#8A8A8A] block mt-2">Withdrawals: ${(analytics?.todayWithdrawals || 120000).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-[#222] gap-4">
            <div className="flex items-center flex-wrap gap-3 w-full sm:w-auto">
              <h3 className="font-extrabold text-base text-white">Registered User Accounts</h3>
              {searchUser.trim() && (
                <span className="text-[10px] font-mono text-[#8A8A8A] bg-[#1A1A1A] px-2 py-0.5 rounded-md border border-[#2A2A2A]">
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'matching account' : 'matching accounts'}
                </span>
              )}
              
              {(user?.role === 'admin' || user?.role === 'co_admin' || user?.email?.toLowerCase() === 'professor9049@gmail.com') && (
                <button
                  type="button"
                  onClick={() => setIsGlobalRolePolicyModalOpen(true)}
                  className="px-3 py-1.5 bg-[#00C853]/15 hover:bg-[#00C853]/25 text-[#00C853] border border-[#00C853]/35 rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-sm ml-auto sm:ml-0"
                  title="Configure global role permission templates and operational capabilities"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Configure Role Policies</span>
                </button>
              )}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search user, email, phone, role, ID..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl pl-9 pr-8 py-1.5 text-xs text-white outline-none"
              />
              {searchUser && (
                <button
                  type="button"
                  onClick={() => setSearchUser('')}
                  className="absolute right-2.5 top-2 text-[#8A8A8A] hover:text-white p-0.5 rounded transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            {/* Mobile View: Stacked Cards */}
            <div className="block md:hidden space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-6 text-center space-y-3">
                  <UserX className="w-8 h-8 text-[#8A8A8A] mx-auto opacity-60" />
                  <div className="text-white font-bold text-sm">No matching accounts found</div>
                  <p className="text-xs text-[#8A8A8A] max-w-xs mx-auto">
                    {searchUser.trim() ? (
                      <>No registered accounts matched &quot;<span className="text-white font-mono">{searchUser}</span>&quot;.</>
                    ) : (
                      'No user accounts currently registered.'
                    )}
                  </p>
                  {searchUser.trim() && (
                    <button
                      type="button"
                      onClick={() => setSearchUser('')}
                      className="px-3.5 py-1.5 bg-[#222] hover:bg-[#2A2A2A] border border-[#333] text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center space-x-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Clear Search</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredUsers.map((u, idx) => {
                  const isActive = u.status === 'active';
                  return (
                    <div key={`mob_u_${u.id}_${idx}`} className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-4 space-y-3 shadow-lg">
                      <div className="flex items-start justify-between border-b border-[#222] pb-3">
                        <div>
                          <div className="text-white font-bold font-sans text-sm">{u.name}</div>
                          <span className="text-xs text-[#8A8A8A] font-mono break-all block">{u.email}</span>
                          <div className="mt-1.5">
                            <RoleBadge role={u.role} status={u.status} size="sm" />
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.status === 'active' ? 'bg-[#00C853]/20 text-[#00C853]' : 'bg-[#FF3B30]/20 text-[#FF3B30]'
                        }`}>
                          {u.status}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs font-mono">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#121212] p-2 rounded-xl border border-[#222]">
                            <span className="text-[#8A8A8A] text-[10px] block">TRADING BALANCE</span>
                            <span className="text-white font-extrabold">${u.wallet?.tradingBalance ? u.wallet.tradingBalance.toLocaleString() : '0'}</span>
                          </div>
                          <div className="bg-[#121212] p-2 rounded-xl border border-[#222]">
                            <span className="text-[#8A8A8A] text-[10px] block">AUTHENTICATION</span>
                            <button
                              type="button"
                              onClick={() => handleToggleKYC(u.id, u.kycStatus)}
                              className={`px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold uppercase ${
                                u.kycStatus === 'verified' ? 'bg-[#00C853]/20 text-[#00C853]' : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {u.kycStatus === 'verified' ? 'AUTHENTICATED' : 'UNVERIFIED'}
                            </button>
                          </div>
                        </div>

                        <div className="bg-[#121212] p-2.5 rounded-xl border border-[#222] font-sans">
                          <span className="text-[#8A8A8A] text-[10px] font-mono block">PHONE & LOCATION</span>
                          <div className="text-white font-bold">{u.profile?.phone || 'No phone'}</div>
                          <div className="text-[#8a8a8a] text-[10px] mt-0.5">
                            {u.profile?.country || 'India'}
                            {u.profile?.address ? ` (${u.profile.address})` : ''}
                          </div>
                        </div>

                        <div className="text-[#8A8A8A] text-[10px]">
                          REGISTERED: {u.createdAt ? formatIST(u.createdAt) : 'N/A'}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#222]">
                        <button
                          type="button"
                          onClick={() => {
                            setTradeHistorySelectedUserId(u.id);
                            setActiveTab('trade_history');
                          }}
                          className="py-2.5 bg-[#00C853]/10 hover:bg-[#00C853]/20 border border-[#00C853]/30 text-[#00C853] rounded-xl text-xs font-bold font-sans flex items-center justify-center min-h-[44px]"
                        >
                          History
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedUserProfileModal(u)}
                          className="py-2.5 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] text-cyan-400 rounded-xl text-xs font-bold font-sans flex items-center justify-center min-h-[44px]"
                        >
                          Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(u)}
                          className={`py-2.5 rounded-xl text-xs font-bold font-sans flex items-center justify-center min-h-[44px] ${
                            isActive
                              ? 'bg-[#FF3B30]/20 hover:bg-[#FF3B30]/30 text-[#FF3B30] border border-[#FF3B30]/40'
                              : 'bg-[#00C853]/20 hover:bg-[#00C853]/30 text-[#00C853] border border-[#00C853]/40'
                          }`}
                        >
                          {isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop View: Standard Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="text-[#8A8A8A] border-b border-[#1A1A1A]">
                    <th className="pb-3 px-2">CUSTOMER & EMAIL</th>
                    <th className="pb-3 px-2">ROLE & PERMISSIONS</th>
                    <th className="pb-3 px-2">PHONE & LOCATION</th>
                    <th className="pb-3 px-2">REGISTERED</th>
                    <th className="pb-3 px-2">TRADING BALANCE</th>
                    <th className="pb-3 px-2">AUTHENTICATION</th>
                    <th className="pb-3 px-2">STATUS</th>
                    <th className="pb-3 px-2 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#8A8A8A]">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <UserX className="w-7 h-7 opacity-50 mb-1" />
                          <div className="text-white font-bold text-sm">No matching accounts found</div>
                          <p className="text-xs text-[#8A8A8A]">
                            {searchUser.trim() ? (
                              <>No registered accounts matched &quot;<span className="text-white font-mono">{searchUser}</span>&quot;.</>
                            ) : (
                              'No user accounts currently registered.'
                            )}
                          </p>
                          {searchUser.trim() && (
                            <button
                              type="button"
                              onClick={() => setSearchUser('')}
                              className="mt-2 px-3 py-1.5 bg-[#1E1E1E] hover:bg-[#2A2A2A] border border-[#333] text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center space-x-1.5"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Clear Search</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, idx) => (
                      <tr key={`${u.id}_${idx}`} className="hover:bg-[#1A1A1A]">
                        <td className="py-3 px-2">
                          <div className="font-bold text-white font-sans">{u.name}</div>
                          <div className="text-[10px] text-[#8A8A8A]">{u.email}</div>
                        </td>

                        <td className="py-3 px-2">
                          <RoleBadge role={u.role} status={u.status} size="sm" />
                        </td>

                        <td className="py-3 px-2 text-[11px]">
                          <div className="text-white font-sans">{u.profile?.phone || 'No phone'}</div>
                          <div className="text-[#8A8A8A] text-[10px]">
                            {u.profile?.country || 'India'}
                            {u.profile?.address ? ` (${u.profile.address})` : ''}
                          </div>
                        </td>

                        <td className="py-3 px-2 text-[#8A8A8A] text-[11px]">
                          {u.createdAt ? formatIST(u.createdAt) : 'N/A'}
                        </td>

                        <td className="py-3 px-2 text-white font-bold">${u.wallet?.tradingBalance ? u.wallet.tradingBalance.toLocaleString() : '0'}</td>

                        <td className="py-3 px-2">
                          <button
                            onClick={() => handleToggleKYC(u.id, u.kycStatus)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.kycStatus === 'verified' ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {u.kycStatus === 'verified' ? 'AUTHENTICATED' : 'UNVERIFIED'}
                          </button>
                        </td>

                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.status === 'active' ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                          }`}>
                            {u.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3 px-2 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setTradeHistorySelectedUserId(u.id);
                              setActiveTab('trade_history');
                            }}
                            className="px-2.5 py-1 bg-[#00C853]/10 hover:bg-[#00C853]/20 border border-[#00C853]/30 text-[#00C853] rounded text-[10px] font-bold font-sans transition-all"
                          >
                            Trade History
                          </button>
                          <button
                            onClick={() => setSelectedUserProfileModal(u)}
                            className="px-2.5 py-1 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] text-cyan-400 rounded text-[10px] font-bold font-sans transition-all"
                          >
                            View Profile
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold font-sans transition-all ${
                              u.status === 'active'
                                ? 'bg-[#FF3B30]/20 hover:bg-[#FF3B30]/30 text-[#FF3B30] border border-[#FF3B30]/40'
                                : 'bg-[#00C853]/20 hover:bg-[#00C853]/30 text-[#00C853] border border-[#00C853]/40'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Account Suspension Modal */}
          {suspensionModalUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-[#121212] border border-[#333] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white space-y-4">
                <button
                  onClick={() => setSuspensionModalUser(null)}
                  className="absolute top-4 right-4 text-[#8A8A8A] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/30 flex items-center justify-center text-[#FF3B30]">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Suspend User Account</h3>
                    <p className="text-xs text-[#8A8A8A] font-sans">{suspensionModalUser.name} ({suspensionModalUser.email})</p>
                  </div>
                </div>

                <form onSubmit={handleConfirmSuspension} className="space-y-4 pt-2 font-sans">
                  <div>
                    <label className="text-xs text-[#8A8A8A] block mb-1 font-bold">Suspension Duration</label>
                    <select
                      value={suspendDuration}
                      onChange={(e) => setSuspendDuration(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#333] focus:border-[#FF3B30] rounded-xl p-3 text-xs text-white outline-none"
                    >
                      <option value="3_days">3 Days</option>
                      <option value="7_days">7 Days</option>
                      <option value="30_days">1 Month (30 Days)</option>
                      <option value="90_days">3 Months (90 Days)</option>
                      <option value="permanent">Indefinite / Permanent</option>
                      <option value="custom">Custom End Date & Time</option>
                    </select>
                  </div>

                  {suspendDuration === 'custom' && (
                    <div>
                      <label className="text-xs text-[#8A8A8A] block mb-1 font-bold">Select Reactivation Date & Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={suspendCustomUntil}
                        onChange={(e) => setSuspendCustomUntil(e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#333] focus:border-[#FF3B30] rounded-xl p-3 text-xs text-white outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-[#8A8A8A] block mb-1 font-bold">Suspension Reason / Internal Notes</label>
                    <textarea
                      rows={3}
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      placeholder="e.g. Unusual trading patterns / AML Verification requested"
                      className="w-full bg-[#1A1A1A] border border-[#333] focus:border-[#FF3B30] rounded-xl p-3 text-xs text-white outline-none resize-none"
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSuspensionModalUser(null)}
                      className="flex-1 py-3 bg-[#222] hover:bg-[#333] text-white font-bold text-xs rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-[#FF3B30] hover:bg-[#D32F2F] text-white font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-[#FF3B30]/20 uppercase tracking-wider"
                    >
                      Confirm Suspension
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MARKETS & LEVERAGE */}
      {activeTab === 'markets' && (
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-6">
          <h3 className="font-extrabold text-base text-white mb-4">Market Configuration & Leverage Controls</h3>
          
          {/* Mobile View: Stacked Cards */}
          <div className="block md:hidden space-y-3">
            {markets.map(m => (
              <div key={`mob_m_${m.symbol}`} className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-white">{m.symbol}</div>
                  <div className="text-xs text-[#8A8A8A] mt-1 font-mono">
                    Spread: <span className="text-white">{m.spread}%</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end space-y-2">
                  <span className="text-sm text-[#00C853] font-mono font-extrabold">{m.maxLeverage}x Max Lev</span>
                  <span className="px-2 py-0.5 rounded bg-[#00C853]/15 text-[#00C853] font-bold text-[10px]">
                    ENABLED
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Standard Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="text-[#8A8A8A] border-b border-[#1A1A1A]">
                  <th className="pb-3">PAIR</th>
                  <th className="pb-3">MAX LEVERAGE</th>
                  <th className="pb-3">SPREAD</th>
                  <th className="pb-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {markets.map(m => (
                  <tr key={m.symbol}>
                    <td className="py-3 font-bold text-white">{m.symbol}</td>
                    <td className="py-3 text-[#00C853] font-bold">{m.maxLeverage}x</td>
                    <td className="py-3 text-[#8A8A8A]">{m.spread}%</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-[#00C853]/15 text-[#00C853] font-bold text-[10px]">
                        ENABLED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: TRADE HISTORY & ACCOUNT ACTIVITY */}
      {activeTab === 'trade_history' && (
        <AdminTradeHistorySection
          currentUserRole={user?.role}
          onOpenLiveTradeEditor={(posId) => {
            const pos = allPositions.find(p => p.id === posId);
            if (pos) handleOpenEditModal(pos);
          }}
          initialUserId={tradeHistorySelectedUserId}
        />
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <SecurityAuditTrail logs={auditLogs} onRefresh={loadAdminData} />
      )}
        </main>
      </div>
      </div>

      {/* MODAL: OVERRIDE PNL */}
      {overrideModalPos && (() => {
        const isLong = overrideModalPos.side === 'long' || (overrideModalPos.side as any) === 'buy';
        const targetPnLNum = parseFloat(overridePnLValue);
        const size = Number(overrideModalPos.size) || 0;
        const entryPrice = overrideModalPos.entryPrice || 0;
        const currentMark = overrideModalPos.markPrice || 0;
        const calculatedTargetMarkPrice = !isNaN(targetPnLNum) && size > 0
          ? (isLong ? entryPrice + (targetPnLNum / size) : entryPrice - (targetPnLNum / size))
          : currentMark;
        const priceDelta = calculatedTargetMarkPrice - currentMark;
        const priceDeltaPct = currentMark > 0 ? (priceDelta / currentMark) * 100 : 0;
        const dur = parseFloat(pnlTransitionDuration) || 0;

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-white space-y-4">
            <button
              onClick={() => setOverrideModalPos(null)}
              className="absolute top-4 right-4 text-[#8A8A8A] hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold">Override PnL for Trade #{overrideModalPos.id.slice(-6)}</h3>
              <p className="text-xs text-[#8A8A8A] mt-0.5">
                User: <span className="text-white font-bold">{overrideModalPos.userName || overrideModalPos.userId}</span> • Pair: <span className="text-[#00C853] font-bold font-mono">{overrideModalPos.symbol}</span> • Side: <span className={`font-bold font-mono ${isLong ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>{overrideModalPos.side.toUpperCase()}</span>
              </p>
            </div>

            {/* Position Baseline Parameter Summary */}
            <div className="grid grid-cols-3 gap-2 bg-[#181818] border border-[#262626] rounded-xl p-2.5 text-xs font-mono">
              <div>
                <span className="text-[10px] text-[#8A8A8A] block uppercase">Entry Price</span>
                <span className="text-white font-bold">${entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A8A8A] block uppercase">Current Mark</span>
                <span className="text-white font-bold">${currentMark.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A8A8A] block uppercase">Position Size</span>
                <span className="text-white font-bold">{size} units</span>
              </div>
            </div>

            <form onSubmit={handleApplyOverridePnL} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Target Unrealized PnL ($ USDT)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={overridePnLValue}
                  onChange={(e) => setOverridePnLValue(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl px-3 py-2.5 text-xs text-white font-mono outline-none"
                  placeholder="e.g. 2500 or -500"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setOverridePnLValue('1000')}
                  className="px-2.5 py-1 bg-[#00C853]/20 hover:bg-[#00C853]/30 text-[#00C853] rounded text-xs font-bold font-mono transition-colors cursor-pointer"
                >
                  +$1,000
                </button>
                <button
                  type="button"
                  onClick={() => setOverridePnLValue('2500')}
                  className="px-2.5 py-1 bg-[#00C853]/20 hover:bg-[#00C853]/30 text-[#00C853] rounded text-xs font-bold font-mono transition-colors cursor-pointer"
                >
                  +$2,500
                </button>
                <button
                  type="button"
                  onClick={() => setOverridePnLValue('-500')}
                  className="px-2.5 py-1 bg-[#FF3B30]/20 hover:bg-[#FF3B30]/30 text-[#FF3B30] rounded text-xs font-bold font-mono transition-colors cursor-pointer"
                >
                  -$500
                </button>
                <button
                  type="button"
                  onClick={() => setOverridePnLValue('0')}
                  className="px-2.5 py-1 bg-[#2A2A2A] hover:bg-[#333] text-gray-300 rounded text-xs font-bold font-mono transition-colors cursor-pointer"
                >
                  $0 (Breakeven)
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">PnL Transition Duration</label>
                <select
                  value={pnlTransitionDuration}
                  onChange={(e) => setPnlTransitionDuration(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl px-3 py-2.5 text-xs text-white font-sans outline-none"
                >
                  <option value="0">Instant Override (Immediate Mark Price Update)</option>
                  <option value="1">1 Minute (Smooth Real-time Price Transition)</option>
                  <option value="2">2 Minutes (Smooth Real-time Price Transition)</option>
                  <option value="3">3 Minutes (Smooth Real-time Price Transition)</option>
                  <option value="4">4 Minutes (Smooth Real-time Price Transition)</option>
                  <option value="5">5 Minutes (Smooth Real-time Price Transition)</option>
                </select>
              </div>

              {/* Mathematical Consistency Live Preview Card */}
              {!isNaN(targetPnLNum) && size > 0 && (
                <div className="bg-[#161616] border border-[#2A2A2A] rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-[#222] pb-1.5">
                    <span className="text-[11px] font-bold text-[#8A8A8A] uppercase">Required Target Mark Price</span>
                    <span className="text-white font-bold font-mono text-sm">
                      ${calculatedTargetMarkPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#8A8A8A]">Mark Price Shift:</span>
                    <span className={priceDelta >= 0 ? 'text-[#00C853] font-bold' : 'text-[#FF3B30] font-bold'}>
                      {priceDelta >= 0 ? '+' : ''}${priceDelta.toFixed(4)} ({priceDeltaPct >= 0 ? '+' : ''}{priceDeltaPct.toFixed(2)}%)
                    </span>
                  </div>

                  <div className="text-[10px] text-[#666] font-mono bg-[#101010] p-2 rounded-lg border border-[#202020]">
                    Formula: {isLong ? 'Entry + (PnL ÷ Size)' : 'Entry - (PnL ÷ Size)'} → ${entryPrice.toLocaleString()} {isLong ? '+' : '-'} (${targetPnLNum.toLocaleString()} ÷ {size}) = ${calculatedTargetMarkPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </div>

                  <div className="text-[10px] text-emerald-400 font-sans flex items-center space-x-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    <span>
                      {dur === 0 
                        ? 'Target mark price will be updated instantly.' 
                        : `Mark price will smoothly transition to $${calculatedTargetMarkPrice.toFixed(2)} over ${dur} minute(s).`}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold text-xs rounded-xl shadow-lg uppercase font-sans transition-all cursor-pointer"
                >
                  Apply PnL Override
                </button>
                <button
                  type="button"
                  onClick={handleResetOverridePnL}
                  className="px-3 py-3 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] text-[#8A8A8A] hover:text-white font-bold text-xs rounded-xl transition-all font-sans cursor-pointer"
                >
                  Reset Auto-PnL
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* MODAL: OVERRIDE PRICE (MARKET PRICE CONTROL MODE) */}
      {priceOverrideModalPos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white space-y-4">
            <button
              onClick={() => setPriceOverrideModalPos(null)}
              className="absolute top-4 right-4 text-[#8A8A8A] hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold">Temporary Price Override (Asset: {priceOverrideModalPos.symbol})</h3>
            <p className="text-xs text-[#8A8A8A]">
              User: <span className="text-white font-bold">{priceOverrideModalPos.userName || priceOverrideModalPos.userId}</span> • Entry Price: <span className="text-[#00C853] font-bold">${priceOverrideModalPos.entryPrice}</span>
            </p>

            <form onSubmit={handleApplyOverridePrice} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Temporary Asset Price ($ USDT)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={overridePriceValue}
                    onChange={(e) => setOverridePriceValue(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl px-3 py-2.5 text-xs text-white font-mono outline-none"
                    placeholder={priceOverrideModalPos.markPrice?.toString()}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#8A8A8A] block mb-1">Price Transition Duration</label>
                  <select
                    value={priceTransitionDuration}
                    onChange={(e) => setPriceTransitionDuration(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl px-3 py-2.5 text-xs text-white font-sans outline-none"
                  >
                    <option value="1">1 Minute (Gradual Animation)</option>
                    <option value="2">2 Minutes (Gradual Animation)</option>
                    <option value="3">3 Minutes (Gradual Animation)</option>
                    <option value="4">4 Minutes (Gradual Animation)</option>
                    <option value="5">5 Minutes (Gradual Animation)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold text-xs rounded-xl shadow-lg uppercase font-sans transition-all"
                >
                  Apply Price Override
                </button>
                <button
                  type="button"
                  onClick={handleResetPriceOverride}
                  className="px-3 py-3 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] text-[#8A8A8A] hover:text-white font-bold text-xs rounded-xl transition-all font-sans"
                >
                  Reset Live Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TRADE PARAMETERS */}
      {editModalPos && (() => {
        const contractSize = getContractSize(editModalPos.symbol);
        const parsedLotsNum = parseFloat(editLots) || 0;
        const currentUnits = lotsToUnits(parsedLotsNum, editModalPos.symbol);
        const parsedEntryNum = parseFloat(editEntryPrice) || (editModalPos.entryPrice || 0);
        const parsedLevNum = parseFloat(editLeverage) || (editModalPos.leverage || 1);
        const notionalUSD = calculateNotionalUSD(editModalPos.symbol, currentUnits, parsedEntryNum);
        const marginUSD = calculateMarginUSD({
          symbol: editModalPos.symbol,
          quantity: currentUnits,
          entryPrice: parsedEntryNum,
          leverage: parsedLevNum,
        });
        const estLiqPrice = parsedLevNum > 1 && parsedEntryNum > 0
          ? (editModalPos.side === 'long'
              ? Math.max(0, parsedEntryNum * (1 - 1 / parsedLevNum + 0.005))
              : parsedEntryNum * (1 + 1 / parsedLevNum - 0.005))
          : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-white space-y-4 font-mono my-8">
              <button
                onClick={() => setEditModalPos(null)}
                className="absolute top-4 right-4 text-[#8A8A8A] hover:text-white p-1.5 rounded-lg hover:bg-[#1E1E1E] transition-all font-sans cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold font-sans text-white">Edit Position Parameters</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono ${
                    editModalPos.side === 'long' ? 'bg-[#00C853]/20 text-[#00C853]' : 'bg-[#FF3B30]/20 text-[#FF3B30]'
                  }`}>
                    {editModalPos.side}
                  </span>
                </div>
                <p className="text-xs text-[#8A8A8A] font-sans mt-0.5">
                  Trader: <span className="text-white font-bold">{editModalPos.userName || editModalPos.userId}</span> • Asset: <span className="text-white font-bold">{editModalPos.symbol}</span>
                </p>
              </div>

              {/* LIVE METRICS / CONTRACT SPECS PREVIEW */}
              <div className="bg-[#181818] border border-[#282828] rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-[#222]">
                  <span className="text-[#8A8A8A]">Contract Specifications:</span>
                  <span className="text-white font-bold font-mono">1.00 Lot = {contractSize.toLocaleString()} {editModalPos.symbol.split('/')[0]}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#8A8A8A] block">Effective Units:</span>
                    <span className="text-white font-bold">{currentUnits.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                  </div>
                  <div>
                    <span className="text-[#8A8A8A] block">Est. Notional Value:</span>
                    <span className="text-white font-bold">${notionalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-[#8A8A8A] block">Required Margin:</span>
                    <span className="text-amber-400 font-bold">${marginUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-[#8A8A8A] block">Est. Liquidation Price:</span>
                    <span className="text-[#FF3B30] font-bold">${estLiqPrice > 0 ? estLiqPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : 'None'}</span>
                  </div>
                </div>
              </div>

              {/* ERROR BANNER */}
              {editModalError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-sans">
                  {editModalError}
                </div>
              )}

              <form onSubmit={handleApplyEditPosition} className="space-y-3.5 text-xs">
                {/* ENTRY PRICE */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[#8A8A8A] font-sans">Entry Price ($)</label>
                    <span className="text-[10px] text-[#666]">Live Mark: ${editModalPos.markPrice?.toLocaleString()}</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editEntryPrice}
                    onChange={(e) => setEditEntryPrice(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl px-3 py-2 text-white outline-none font-mono"
                    placeholder="e.g. 50000.00"
                  />
                </div>

                {/* POSITION SIZE IN LOTS */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[#8A8A8A] font-sans">Position Size (Lots)</label>
                    <span className="text-[10px] text-[#00C853] font-mono">
                      = {currentUnits.toLocaleString(undefined, { maximumFractionDigits: 4 })} units
                    </span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editLots}
                    onChange={(e) => {
                      const l = e.target.value;
                      setEditLots(l);
                      const p = parseFloat(l);
                      if (!isNaN(p)) {
                        setEditSize(lotsToUnits(p, editModalPos.symbol).toString());
                      }
                    }}
                    className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl px-3 py-2 text-white outline-none font-mono"
                    placeholder="e.g. 1.00"
                  />
                  {/* Quick Lot Presets */}
                  <div className="flex items-center space-x-1.5 mt-1.5">
                    {[0.01, 0.05, 0.1, 0.5, 1.0, 5.0].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setEditLots(preset.toString());
                          setEditSize(lotsToUnits(preset, editModalPos.symbol).toString());
                        }}
                        className={`px-2 py-1 text-[10px] rounded-lg border transition-all font-mono ${
                          parseFloat(editLots) === preset
                            ? 'bg-[#00C853]/20 border-[#00C853] text-[#00C853]'
                            : 'bg-[#181818] border-[#262626] text-[#8A8A8A] hover:text-white'
                        }`}
                      >
                        {preset.toFixed(2)}L
                      </button>
                    ))}
                  </div>
                </div>

                {/* LEVERAGE MULTIPLIER */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[#8A8A8A] font-sans">Leverage Multiplier</label>
                    <span className="text-[10px] text-[#8A8A8A]">{parsedLevNum}x</span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="125"
                    required
                    value={editLeverage}
                    onChange={(e) => setEditLeverage(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                  {/* Quick Leverage Presets */}
                  <div className="flex items-center space-x-1.5 mt-1.5">
                    {[1, 5, 10, 20, 50, 100].map((lev) => (
                      <button
                        key={lev}
                        type="button"
                        onClick={() => setEditLeverage(lev.toString())}
                        className={`px-2 py-1 text-[10px] rounded-lg border transition-all font-mono ${
                          parseFloat(editLeverage) === lev
                            ? 'bg-[#00C853]/20 border-[#00C853] text-[#00C853]'
                            : 'bg-[#181818] border-[#262626] text-[#8A8A8A] hover:text-white'
                        }`}
                      >
                        {lev}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* STOP LOSS & TAKE PROFIT */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[#8A8A8A] font-sans">Stop Loss ($)</label>
                      <span className="text-[9px] text-amber-400">
                        {editModalPos.side === 'long' ? '< Entry' : '> Entry'}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={editStopLoss}
                      onChange={(e) => setEditStopLoss(e.target.value)}
                      placeholder="Optional SL"
                      className="w-full bg-[#1A1A1A] border border-[#222] focus:border-amber-400 rounded-xl px-3 py-2 text-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[#8A8A8A] font-sans">Take Profit ($)</label>
                      <span className="text-[9px] text-[#00C853]">
                        {editModalPos.side === 'long' ? '> Entry' : '< Entry'}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={editTakeProfit}
                      onChange={(e) => setEditTakeProfit(e.target.value)}
                      placeholder="Optional TP"
                      className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl px-3 py-2 text-white outline-none font-mono"
                    />
                  </div>
                </div>

                {/* HANDLING FEE */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[#8A8A8A] font-sans">Handling Fee ($ USDT)</label>
                    <button
                      type="button"
                      onClick={() => setEditHandlingFee((notionalUSD * 0.0004).toFixed(2))}
                      className="text-[10px] text-[#00C853] hover:underline cursor-pointer"
                    >
                      Auto 0.04% Taker Fee
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={editHandlingFee}
                    onChange={(e) => setEditHandlingFee(e.target.value)}
                    placeholder="e.g. 5.00"
                    className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>

                {/* AUDIT REASON / JUSTIFICATION */}
                <div>
                  <label className="text-[#8A8A8A] block mb-1 font-sans">Audit Reason / Justification</label>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="e.g. Client requested contract size adjustment via Support #841"
                    className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl px-3 py-2 text-white outline-none font-sans"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="submit"
                    disabled={editModalLoading}
                    className="flex-1 py-3 bg-[#00C853] hover:bg-[#00B048] disabled:opacity-50 text-black font-extrabold rounded-xl uppercase font-sans text-xs transition-all cursor-pointer"
                  >
                    {editModalLoading ? 'Saving Parameters...' : 'Save Position Parameters'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditModalPos(null)}
                    className="px-4 py-3 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] text-[#8A8A8A] hover:text-white rounded-xl font-sans text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL: OPEN TRADE FOR USER */}
      {openTradeModalOpen && (() => {
        const contractSize = getContractSize(openTradeSymbol);
        const parsedLots = parseFloat(openTradeLots) || 0;
        const effectiveUnits = lotsToUnits(parsedLots, openTradeSymbol);
        const currentMarket = markets.find(m => m.symbol === openTradeSymbol);
        const effectivePrice = openTradePrice ? parseFloat(openTradePrice) || (currentMarket?.price || 0) : (currentMarket?.price || 0);
        const effectiveLev = parseFloat(openTradeLeverage) || 1;
        const estNotional = calculateNotionalUSD(openTradeSymbol, effectiveUnits, effectivePrice);
        const estMargin = calculateMarginUSD({
          symbol: openTradeSymbol,
          quantity: effectiveUnits,
          entryPrice: effectivePrice,
          leverage: effectiveLev,
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-white space-y-4 my-8 font-sans">
              <button
                onClick={() => setOpenTradeModalOpen(false)}
                className="absolute top-4 right-4 text-[#8A8A8A] hover:text-white p-1.5 rounded-lg hover:bg-[#1E1E1E] transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-lg font-extrabold text-white">Execute Trade for User Account</h3>
                <p className="text-xs text-[#8A8A8A] mt-0.5">Admin trade dispatch directly into live user portfolio</p>
              </div>

              {/* REAL-TIME NOTIONAL & CONTRACT SPECIFICATIONS */}
              <div className="bg-[#181818] border border-[#282828] rounded-xl p-3.5 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-[#222]">
                  <span className="text-[#8A8A8A]">Contract Specifications:</span>
                  <span className="text-white font-bold">1.00 Lot = {contractSize.toLocaleString()} {openTradeSymbol.split('/')[0]}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#8A8A8A] block">Effective Units:</span>
                    <span className="text-white font-bold">{effectiveUnits.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                  </div>
                  <div>
                    <span className="text-[#8A8A8A] block">Est. Notional USD:</span>
                    <span className="text-white font-bold">${estNotional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-[#8A8A8A] block">Required Margin:</span>
                    <span className="text-amber-400 font-bold">${estMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-[#8A8A8A] block">Execution Price:</span>
                    <span className="text-[#00C853] font-bold">${effectivePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                  </div>
                </div>
              </div>

              {/* ERROR BANNER */}
              {openTradeError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                  {openTradeError}
                </div>
              )}

              <form onSubmit={handleOpenTradeForUser} className="space-y-3.5 text-xs font-mono">
                <div>
                  <label className="text-[#8A8A8A] block mb-1 font-sans">Target Account</label>
                  <select
                    value={openTradeUser}
                    onChange={(e) => setOpenTradeUser(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl p-2.5 text-white outline-none font-sans"
                  >
                    <option value="">Select Target Trader...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#8A8A8A] block mb-1 font-sans">Asset Pair</label>
                    <select
                      value={openTradeSymbol}
                      onChange={(e) => {
                        const newSym = e.target.value;
                        setOpenTradeSymbol(newSym);
                        const pl = parseFloat(openTradeLots) || 1;
                        setOpenTradeAmount(lotsToUnits(pl, newSym).toString());
                      }}
                      className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl p-2.5 text-white outline-none"
                    >
                      {markets.map(m => (
                        <option key={m.symbol} value={m.symbol}>{m.symbol}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[#8A8A8A] block mb-1 font-sans">Side</label>
                    <select
                      value={openTradeSide}
                      onChange={(e) => setOpenTradeSide(e.target.value as any)}
                      className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl p-2.5 text-white outline-none"
                    >
                      <option value="LONG">LONG (Buy)</option>
                      <option value="SHORT">SHORT (Sell)</option>
                    </select>
                  </div>
                </div>

                {/* POSITION SIZE IN LOTS */}
                <div>
                  <div className="flex justify-between items-center mb-1 font-sans">
                    <label className="text-[#8A8A8A]">Position Size (Lots)</label>
                    <span className="text-[10px] text-[#00C853] font-mono">
                      = {effectiveUnits.toLocaleString(undefined, { maximumFractionDigits: 4 })} units
                    </span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    value={openTradeLots}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOpenTradeLots(val);
                      const parsed = parseFloat(val);
                      if (!isNaN(parsed)) {
                        setOpenTradeAmount(lotsToUnits(parsed, openTradeSymbol).toString());
                      }
                    }}
                    className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl p-2.5 text-white outline-none font-mono"
                  />
                  {/* Quick Lot Presets */}
                  <div className="flex items-center space-x-1.5 mt-1.5">
                    {[0.01, 0.05, 0.1, 0.5, 1.0, 5.0].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setOpenTradeLots(preset.toString());
                          setOpenTradeAmount(lotsToUnits(preset, openTradeSymbol).toString());
                        }}
                        className={`px-2 py-1 text-[10px] rounded-lg border transition-all font-mono ${
                          parseFloat(openTradeLots) === preset
                            ? 'bg-[#00C853]/20 border-[#00C853] text-[#00C853]'
                            : 'bg-[#181818] border-[#262626] text-[#8A8A8A] hover:text-white'
                        }`}
                      >
                        {preset.toFixed(2)}L
                      </button>
                    ))}
                  </div>
                </div>

                {/* LEVERAGE */}
                <div>
                  <div className="flex justify-between items-center mb-1 font-sans">
                    <label className="text-[#8A8A8A]">Leverage</label>
                    <span className="text-[10px] text-[#8A8A8A]">{openTradeLeverage}x</span>
                  </div>
                  <input
                    type="number"
                    required
                    value={openTradeLeverage}
                    onChange={(e) => setOpenTradeLeverage(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl p-2.5 text-white outline-none font-mono"
                  />
                  <div className="flex items-center space-x-1.5 mt-1.5">
                    {[1, 5, 10, 20, 50, 100].map((lev) => (
                      <button
                        key={lev}
                        type="button"
                        onClick={() => setOpenTradeLeverage(lev.toString())}
                        className={`px-2 py-1 text-[10px] rounded-lg border transition-all font-mono ${
                          parseFloat(openTradeLeverage) === lev
                            ? 'bg-[#00C853]/20 border-[#00C853] text-[#00C853]'
                            : 'bg-[#181818] border-[#262626] text-[#8A8A8A] hover:text-white'
                        }`}
                      >
                        {lev}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* CUSTOM ENTRY PRICE */}
                <div>
                  <div className="flex justify-between items-center mb-1 font-sans">
                    <label className="text-[#8A8A8A]">Custom Entry Price ($)</label>
                    <span className="text-[10px] text-[#666]">Leave blank for live price ({currentMarket?.price})</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={openTradePrice}
                    onChange={(e) => setOpenTradePrice(e.target.value)}
                    placeholder={`Live Market: $${currentMarket?.price || ''}`}
                    className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl p-2.5 text-white outline-none font-mono"
                  />
                </div>

                {/* STOP LOSS & TAKE PROFIT */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#8A8A8A] block mb-1 font-sans">Stop Loss ($)</label>
                    <input
                      type="number"
                      step="any"
                      value={openTradeStopLoss}
                      onChange={(e) => setOpenTradeStopLoss(e.target.value)}
                      placeholder="Optional SL"
                      className="w-full bg-[#1A1A1A] border border-[#222] focus:border-amber-400 rounded-xl p-2.5 text-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[#8A8A8A] block mb-1 font-sans">Take Profit ($)</label>
                    <input
                      type="number"
                      step="any"
                      value={openTradeTakeProfit}
                      onChange={(e) => setOpenTradeTakeProfit(e.target.value)}
                      placeholder="Optional TP"
                      className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl p-2.5 text-white outline-none font-mono"
                    />
                  </div>
                </div>

                {/* HANDLING FEE */}
                <div>
                  <div className="flex justify-between items-center mb-1 font-sans">
                    <label className="text-[#8A8A8A]">Handling Fee ($ USDT)</label>
                    <button
                      type="button"
                      onClick={() => setOpenTradeFee((estNotional * 0.0004).toFixed(2))}
                      className="text-[10px] text-[#00C853] hover:underline cursor-pointer"
                    >
                      Auto 0.04% Taker Fee
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={openTradeFee}
                    onChange={(e) => setOpenTradeFee(e.target.value)}
                    placeholder="Optional Fee"
                    className="w-full bg-[#1A1A1A] border border-[#222] focus:border-[#00C853] rounded-xl p-2.5 text-white outline-none font-mono"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="submit"
                    disabled={openTradeLoading}
                    className="flex-1 py-3 bg-[#00C853] hover:bg-[#00B048] disabled:opacity-50 text-black font-extrabold text-xs rounded-xl shadow-lg uppercase tracking-wider font-sans transition-all cursor-pointer"
                  >
                    {openTradeLoading ? 'Executing Trade...' : 'Execute Position Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenTradeModalOpen(false)}
                    className="px-4 py-3 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] text-[#8A8A8A] hover:text-white rounded-xl font-sans text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL: IMAGE PROOF & DOCUMENT ZOOM VIEWER */}
      {imageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl relative text-white flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#181818] border-b border-[#222] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                  <ZoomIn className="w-4 h-4 text-[#00C853]" />
                  <span>{imageModal.title}</span>
                </h3>
                {imageModal.userEmail && (
                  <p className="text-xs text-cyan-400 font-mono mt-0.5">{imageModal.userEmail}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={imageModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-[#222] hover:bg-[#333] text-xs text-white rounded-lg flex items-center space-x-1 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Original</span>
                </a>
                <button
                  onClick={() => setImageModal(null)}
                  className="p-1.5 bg-[#222] hover:bg-[#333] text-[#AAA] hover:text-white rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-auto flex items-center justify-center bg-black/50 min-h-[300px]">
              <img 
                src={imageModal.url} 
                alt="Document Proof" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-[#333] shadow-xl"
              />
            </div>

            <div className="p-4 bg-[#181818] border-t border-[#222] flex items-center justify-between text-xs text-[#8A8A8A]">
              <span>Verified encrypted compliance asset</span>
              <button
                onClick={() => setImageModal(null)}
                className="px-4 py-2 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold rounded-xl transition-all"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE USER CONFIRMATION */}
      {userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121212] border border-[#222] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative text-white space-y-4 p-6 font-sans">
            <h3 className="text-lg font-extrabold text-[#FF3B30]">Confirm Deletion</h3>
            <p className="text-sm text-[#8A8A8A]">
              Are you sure you want to permanently delete this account? This action cannot be undone. All data associated with this user will be removed.
            </p>
            <div className="pt-4 flex items-center justify-end space-x-2 border-t border-[#222]">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] text-white font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 bg-[#FF3B30] hover:bg-[#D92C23] text-white font-extrabold rounded-xl text-xs"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER FULL PROFILE DETAILS */}
      {selectedUserProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#121212] border border-[#222222] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-white space-y-4 p-4 sm:p-6 font-sans my-auto">
            <button
              onClick={() => setSelectedUserProfileModal(null)}
              className="absolute top-4 right-4 text-[#8A8A8A] hover:text-white p-1 rounded-lg hover:bg-[#1E1E1E]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 pb-3 border-b border-[#222]">
              <div className="w-10 h-10 rounded-xl bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center text-[#00C853]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">{selectedUserProfileModal.name}</h3>
                <p className="text-xs text-cyan-400 font-mono">{selectedUserProfileModal.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#262626]">
                <span className="text-[#8A8A8A] block text-[10px]">FULL LEGAL NAME</span>
                <span className="font-bold text-white text-xs">{selectedUserProfileModal.profile?.fullName || selectedUserProfileModal.name}</span>
              </div>

              <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#262626]">
                <span className="text-[#8A8A8A] block text-[10px]">EMAIL ADDRESS</span>
                <span className="font-bold text-white text-xs truncate block">{selectedUserProfileModal.email}</span>
              </div>

              <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#262626]">
                <span className="text-[#8A8A8A] block text-[10px]">PHONE NUMBER</span>
                <span className="font-bold text-white text-xs">{selectedUserProfileModal.profile?.phone || 'Not provided'}</span>
              </div>

              <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#262626]">
                <span className="text-[#8A8A8A] block text-[10px]">COUNTRY OF RESIDENCE</span>
                <span className="font-bold text-white text-xs">{selectedUserProfileModal.profile?.country || 'India'}</span>
              </div>

              <div className="sm:col-span-2 bg-[#1A1A1A] p-3 rounded-xl border border-[#262626]">
                <span className="text-[#8A8A8A] block text-[10px]">RESIDENTIAL ADDRESS</span>
                <span className="font-bold text-white text-xs">{selectedUserProfileModal.profile?.address || 'Not provided'}</span>
              </div>

              <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#262626]">
                <span className="text-[#8A8A8A] block text-[10px]">REGISTRATION DATE</span>
                <span className="font-bold text-white text-xs">
                  {selectedUserProfileModal.createdAt ? formatIST(selectedUserProfileModal.createdAt) : 'N/A'}
                </span>
              </div>

              <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#262626]">
                <span className="text-[#8A8A8A] block text-[10px]">ACCOUNT STATUS</span>
                <span className={`font-bold text-xs uppercase ${selectedUserProfileModal.status === 'active' ? 'text-[#00C853]' : 'text-[#FF3B30]'}`}>
                  {selectedUserProfileModal.status}
                </span>
              </div>

              <div className="sm:col-span-2 bg-[#1A1A1A] p-3 rounded-xl border border-[#262626] flex items-center justify-between">
                <div>
                  <span className="text-[#8A8A8A] block text-[10px]">REAL NAME AUTHENTICATION STATUS</span>
                  <span className={`font-bold text-xs uppercase ${selectedUserProfileModal.kycStatus === 'verified' ? 'text-[#00C853]' : 'text-amber-400'}`}>
                    {selectedUserProfileModal.kycStatus === 'verified' ? 'AUTHENTICATED' : 'UNAUTHENTICATED / PENDING'}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    const newKYC = selectedUserProfileModal.kycStatus === 'verified' ? 'unverified' : 'verified';
                    try {
                      await apiService.updateAdminUserKYC(selectedUserProfileModal.id, newKYC as any);
                      setSelectedUserProfileModal({
                        ...selectedUserProfileModal,
                        kycStatus: newKYC as any
                      });
                      await loadAdminData();
                    } catch (err: any) {
                      alert(err.message || 'Authentication update failed');
                    }
                  }}
                  className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-all border ${
                    selectedUserProfileModal.kycStatus === 'verified'
                      ? 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border-red-500/30'
                      : 'bg-[#00C853]/15 hover:bg-[#00C853]/25 text-[#00C853] border-[#00C853]/30'
                  }`}
                >
                  {selectedUserProfileModal.kycStatus === 'verified' ? 'Revoke Auth' : 'Approve Auth'}
                </button>
              </div>

              <div className="sm:col-span-2 bg-[#1A1A1A] p-3 rounded-xl border border-[#262626] flex items-center justify-between">
                <div>
                  <span className="text-[#8A8A8A] block text-[10px]">GOOGLE AUTHENTICATOR (2FA)</span>
                  <span className={`font-bold text-xs uppercase ${selectedUserProfileModal.is2FAEnabled ? 'text-[#00C853]' : 'text-[#8A8A8A]'}`}>
                    {selectedUserProfileModal.is2FAEnabled ? 'Google Authentication Enabled' : 'Google Authentication Disabled'}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    const currentStatus = Boolean(selectedUserProfileModal.is2FAEnabled);
                    const enable = !currentStatus;
                    try {
                      const res = await apiService.adminToggleUserGoogleAuth(selectedUserProfileModal.id, enable);
                      setSelectedUserProfileModal({
                        ...selectedUserProfileModal,
                        is2FAEnabled: enable,
                        googleAuthEnabled: enable
                      });
                      alert(res.message);
                      await loadAdminData();
                    } catch (err: any) {
                      alert(err.message || '2FA toggle failed');
                    }
                  }}
                  className={`text-[10px] px-3 py-1.5 rounded-lg font-bold border transition-all ${
                    selectedUserProfileModal.is2FAEnabled
                      ? 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border-red-500/30'
                      : 'bg-[#00C853]/15 hover:bg-[#00C853]/25 text-[#00C853] border-[#00C853]/30'
                  }`}
                >
                  {selectedUserProfileModal.is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </button>
              </div>

              <div className="sm:col-span-2 bg-[#171717] border border-[#2A2A2A] rounded-xl p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#242424] pb-2.5">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[10px] font-mono font-bold text-[#8A8A8A] uppercase tracking-wider block">
                        ASSIGNED ROLE & ACCESS CONTROL
                      </span>
                      {selectedUserProfileModal.customActions && Object.keys(selectedUserProfileModal.customActions).length > 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#00C853]/20 text-[#00C853] border border-[#00C853]/30">
                          CUSTOM OVERRIDES ACTIVE
                        </span>
                      )}
                    </div>
                    <RoleBadge role={selectedUserProfileModal.role} status={selectedUserProfileModal.status} size="md" />
                  </div>
                  
                  {(user?.role === 'admin' || user?.role === 'co_admin' || user?.email?.toLowerCase() === 'professor9049@gmail.com') && (
                    <div className="flex items-center flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-[#8A8A8A] font-bold">Assign Role:</span>
                        <select
                          value={selectedUserProfileModal.role || 'user'}
                          onChange={(e) => handleToggleRole(selectedUserProfileModal.id, e.target.value)}
                          className="bg-[#111] border border-[#333] text-xs text-white rounded-lg px-2.5 py-1.5 focus:border-[#00C853] outline-none font-bold cursor-pointer shadow-sm"
                        >
                          <option value="admin">Admin (Full Master Access)</option>
                          <option value="co_admin">Co-Admin (Operational Access)</option>
                          <option value="trade_controller">Trade Controller (Execution & Markets)</option>
                          <option value="finance_manager">Finance Manager (Ledgers & PnL Override)</option>
                          <option value="support">Support (Customer Care Console)</option>
                          <option value="user">User (Standard Trader)</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPermissionModalUser(selectedUserProfileModal);
                        }}
                        className="px-3 py-1.5 bg-[#00C853]/15 hover:bg-[#00C853]/25 text-[#00C853] border border-[#00C853]/35 rounded-lg text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-sm"
                        title="Configure fine-grained module visibility and granular operational rights"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Manage Permissions</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Enabled vs Restricted Modules */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold text-white flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00C853]" />
                    <span>Enabled Administrative Modules:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {getRoleModules(selectedUserProfileModal).enabled.map((mod, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-md bg-[#00C853]/10 text-[#00C853] border border-[#00C853]/25 text-[10px] font-mono font-bold inline-flex items-center space-x-1">
                        <span>✓</span>
                        <span>{mod}</span>
                      </span>
                    ))}
                  </div>

                  {getRoleModules(selectedUserProfileModal).disabled.length > 0 && (
                    <>
                      <div className="text-[11px] font-bold text-[#8A8A8A] flex items-center space-x-1.5 pt-1">
                        <X className="w-3.5 h-3.5 text-red-400" />
                        <span>Restricted / Disabled Modules:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {getRoleModules(selectedUserProfileModal).disabled.map((mod, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-mono font-medium inline-flex items-center space-x-1">
                            <span>✕</span>
                            <span>{mod}</span>
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2 bg-[#1A1A1A] p-3 rounded-xl border border-[#262626]">
                <span className="text-[#8A8A8A] block text-[10px]">TRADING WALLET BALANCE</span>
                <span className="font-bold text-[#00C853] text-xs">
                  ${selectedUserProfileModal.wallet?.tradingBalance ? selectedUserProfileModal.wallet.tradingBalance.toLocaleString() : '0'}
                </span>
              </div>

              <div className="sm:col-span-2 bg-[#1A1A1A] p-3 rounded-xl border border-[#262626] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[#8A8A8A] block text-[10px]">CURRENT LOGIN PASSWORD</span>
                    <span className="font-bold text-white text-xs font-mono">{selectedUserProfileModal.plainPassword || '••••••••'}</span>
                  </div>
                  <button 
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="px-2 py-1 bg-[#222] hover:bg-[#333] rounded text-[10px] text-white font-bold"
                  >
                    Change
                  </button>
                </div>
                {showPasswordChange && (
                  <div className="flex items-center space-x-2 pt-2 border-t border-[#333]">
                    <input 
                      type="text" 
                      value={passwordChangeInput}
                      onChange={(e) => setPasswordChangeInput(e.target.value)}
                      placeholder="New password..."
                      className="flex-1 bg-black border border-[#333] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00C853]"
                    />
                    <button
                      onClick={() => handleChangePassword(selectedUserProfileModal.id)}
                      className="px-3 py-1 bg-[#00C853] hover:bg-[#00B048] text-black font-bold text-xs rounded"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#222]">
              <button
                onClick={() => handleDeleteUser(selectedUserProfileModal.id)}
                className="px-3 py-2 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] font-bold rounded-xl text-xs border border-[#FF3B30]/30"
              >
                Delete User
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setTradeHistorySelectedUserId(selectedUserProfileModal.id);
                    setSelectedUserProfileModal(null);
                    setActiveTab('trade_history');
                  }}
                  className="px-3 py-2 bg-[#00C853]/15 hover:bg-[#00C853]/25 border border-[#00C853]/40 text-[#00C853] font-bold rounded-xl text-xs flex items-center space-x-1.5"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Trade History & Activity</span>
                </button>
                <button
                  onClick={() => {
                    handleToggleKYC(selectedUserProfileModal.id, selectedUserProfileModal.kycStatus);
                    setSelectedUserProfileModal(null);
                  }}
                  className="px-3 py-2 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] text-amber-400 font-bold rounded-xl text-xs"
                >
                  {selectedUserProfileModal.kycStatus === 'verified' ? 'Revoke Auth' : 'Approve Auth'}
                </button>
                <button
                  onClick={() => setSelectedUserProfileModal(null)}
                  className="px-4 py-2 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold rounded-xl text-xs"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: REAL-TIME ADMIN NOTIFICATION & ACTIVITY CENTER */}
      {isAlertDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-[#121212] border-l border-[#222] h-full shadow-2xl flex flex-col p-6 space-y-4 relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#222]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#00C853]/20 text-[#00C853] rounded-xl">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Live Admin Alert Center</h3>
                  <p className="text-xs text-[#8A8A8A]">Real-time stream of incoming user requests</p>
                </div>
              </div>

              <button
                onClick={() => setIsAlertDrawerOpen(false)}
                className="p-1.5 text-[#8A8A8A] hover:text-white bg-[#1A1A1A] hover:bg-[#252525] rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Badges */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="bg-[#1A1A1A] border border-[#222] p-2.5 rounded-xl">
                <div className="text-[#00C853] font-extrabold text-base">
                  {activePendingDeposits.length}
                </div>
                <div className="text-[10px] text-[#8A8A8A] uppercase">Deposits</div>
              </div>

              <div className="bg-[#1A1A1A] border border-[#222] p-2.5 rounded-xl">
                <div className="text-amber-400 font-extrabold text-base">
                  {activePendingWithdrawals.length}
                </div>
                <div className="text-[10px] text-[#8A8A8A] uppercase">Withdrawals</div>
              </div>

              <div className="bg-[#1A1A1A] border border-[#222] p-2.5 rounded-xl">
                <div className="text-cyan-400 font-extrabold text-base">
                  {activePendingKYC.length}
                </div>
                <div className="text-[10px] text-[#8A8A8A] uppercase">KYC Docs</div>
              </div>
            </div>

            {/* Stream List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {adminAlerts.length === 0 ? (
                <div className="py-16 text-center text-[#8A8A8A] text-xs font-mono space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#00C853] mx-auto opacity-50" />
                  <p>All user requests processed!</p>
                  <p className="text-[10px] text-[#666]">New deposits, withdrawals, and KYC submissions will appear here live with sound alerts.</p>
                </div>
              ) : (
                adminAlerts.map((alt, idx) => (
                  <div
                    key={`${alt.id}_${idx}`}
                    className={`bg-[#181818] border rounded-xl p-3.5 space-y-2 transition-all ${
                      alt.type === 'deposit' ? 'border-[#00C853]/40' :
                      alt.type === 'withdrawal' ? 'border-amber-500/40' :
                      'border-cyan-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono font-extrabold uppercase ${
                        alt.type === 'deposit' ? 'text-[#00C853]' :
                        alt.type === 'withdrawal' ? 'text-amber-400' :
                        'text-cyan-400'
                      }`}>
                        {alt.title}
                      </span>
                      <span className="text-[10px] text-[#666] font-mono">{alt.timestamp}</span>
                    </div>

                    <p className="text-xs font-bold text-white">{alt.userEmail}</p>
                    <p className="text-xs text-[#AAA] leading-relaxed">{alt.message}</p>

                    <div className="pt-1 flex items-center justify-between border-t border-[#222]">
                      <button
                        onClick={() => {
                          setActiveTab('approval_desk');
                          setIsAlertDrawerOpen(false);
                        }}
                        className="text-[11px] font-extrabold text-[#00C853] hover:underline flex items-center space-x-1"
                      >
                        <span>Open Approval Desk</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-[10px] text-amber-400 font-mono font-bold">Action Required</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#222] flex items-center justify-between text-xs">
              <button
                onClick={() => setAdminAlerts([])}
                className="text-[#8A8A8A] hover:text-white font-mono text-[11px]"
              >
                Clear Alert History
              </button>

              <button
                onClick={() => {
                  setActiveTab('approval_desk');
                  setIsAlertDrawerOpen(false);
                }}
                className="px-4 py-2 bg-[#00C853] hover:bg-[#00B048] text-black font-extrabold rounded-xl transition-all"
              >
                Go to Approval Desk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Destination Details Audit Modal */}
      {selectedWithdrawalModal && (() => {
        const wd = selectedWithdrawalModal;
        const d = getWithdrawalDetails(wd);
        const isPending = wd.status === 'pending';

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
              {/* Header */}
              <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#1A1A1A]">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base">Withdrawal Destination Audit</h3>
                    <p className="text-[11px] text-[#8A8A8A] font-mono">Request Ref: {wd.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedWithdrawalModal(null)}
                  className="text-[#8A8A8A] hover:text-white p-2 rounded-xl hover:bg-[#222]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs">
                {/* Meta summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#181818] p-3 rounded-xl border border-[#262626]">
                    <span className="text-[#8A8A8A] text-[10px] block font-sans">CUSTOMER ACCOUNT</span>
                    <div className="text-white font-sans font-bold text-sm truncate">{wd.userEmail}</div>
                    <div className="text-[#8A8A8A] text-[10px]">User ID: {wd.userId}</div>
                  </div>
                  <div className="bg-[#181818] p-3 rounded-xl border border-[#262626]">
                    <span className="text-[#8A8A8A] text-[10px] block font-sans">STATUS / TIMESTAMP</span>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        wd.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                        wd.status === 'approved' ? 'bg-[#00C853]/20 text-[#00C853]' :
                        'bg-[#FF3B30]/20 text-[#FF3B30]'
                      }`}>
                        {wd.status}
                      </span>
                    </div>
                    <div className="text-[#8A8A8A] text-[10px] mt-1">{formatIST(wd.createdAt)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#181818] p-3 rounded-xl border border-[#262626]">
                    <span className="text-[#8A8A8A] text-[10px] block font-sans">WITHDRAWAL AMOUNT</span>
                    <div className="text-[#FF3B30] font-extrabold text-lg">${wd.amount?.toLocaleString()} {wd.currency}</div>
                    {d.payoutAmountInr && (
                      <div className="text-[#00C853] text-xs font-bold mt-0.5">≈ ₹{d.payoutAmountInr} INR</div>
                    )}
                  </div>
                  <div className="bg-[#181818] p-3 rounded-xl border border-[#262626]">
                    <span className="text-[#8A8A8A] text-[10px] block font-sans">DESTINATION TYPE</span>
                    <div className="text-white font-bold text-sm uppercase flex items-center space-x-1.5 mt-1">
                      {d.method === 'bank_transfer' ? (
                        <span className="text-amber-400 flex items-center space-x-1">
                          <Building2 className="w-4 h-4" />
                          <span>Bank Account (IMPS/NEFT)</span>
                        </span>
                      ) : d.method === 'upi' ? (
                        <span className="text-cyan-400 flex items-center space-x-1">
                          <Smartphone className="w-4 h-4" />
                          <span>UPI Virtual Payment Address</span>
                        </span>
                      ) : (
                        <span className="text-purple-400 flex items-center space-x-1">
                          <Coins className="w-4 h-4" />
                          <span>Crypto Transfer ({d.cryptoNetwork})</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Structured Destination Snapshot Card */}
                <div className="bg-[#1C1C1C] p-4 rounded-xl border border-[#2E2E2E] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-2">
                    <span className="text-xs font-bold text-white uppercase font-sans flex items-center space-x-1.5">
                      <CreditCard className="w-4 h-4 text-cyan-400" />
                      <span>Permanent Destination Snapshot</span>
                    </span>
                    <span className="text-[10px] text-[#8A8A8A] font-sans">Recorded at request time</span>
                  </div>

                  {d.method === 'bank_transfer' ? (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626]">
                          <span className="text-[#8A8A8A] text-[10px] block">BANK NAME</span>
                          <span className="text-white font-bold text-sm">{d.bankName || 'Not specified'}</span>
                        </div>
                        <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626]">
                          <span className="text-[#8A8A8A] text-[10px] block">ACCOUNT HOLDER NAME</span>
                          <span className="text-white font-bold text-sm">{d.accountHolderName || 'Not specified'}</span>
                        </div>
                      </div>

                      <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center justify-between">
                        <div>
                          <span className="text-[#8A8A8A] text-[10px] block">ACCOUNT NUMBER</span>
                          <span className="text-white font-bold text-sm tracking-wider">{d.accountNumber || 'Not specified'}</span>
                        </div>
                        {d.accountNumber && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(d.accountNumber, 'modal_acc')}
                            className="px-2.5 py-1.5 bg-[#222] hover:bg-[#333] text-cyan-400 rounded-lg text-xs font-bold flex items-center space-x-1"
                          >
                            {copiedField === 'modal_acc' ? <Check className="w-3.5 h-3.5 text-[#00C853]" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedField === 'modal_acc' ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                      </div>

                      <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center justify-between">
                        <div>
                          <span className="text-[#8A8A8A] text-[10px] block">IFSC / SWIFT CODE</span>
                          <span className="text-white font-bold text-sm uppercase">{d.ifscCode || 'Not specified'}</span>
                        </div>
                        {d.ifscCode && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(d.ifscCode, 'modal_ifsc')}
                            className="px-2.5 py-1.5 bg-[#222] hover:bg-[#333] text-cyan-400 rounded-lg text-xs font-bold flex items-center space-x-1"
                          >
                            {copiedField === 'modal_ifsc' ? <Check className="w-3.5 h-3.5 text-[#00C853]" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedField === 'modal_ifsc' ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                      </div>

                      <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center justify-between">
                        <div>
                          <span className="text-[#8A8A8A] text-[10px] block">UPI ID</span>
                          <span className={`text-sm ${d.upiId ? 'text-white font-bold font-mono break-all' : 'text-[#8A8A8A]'}`}>
                            {d.upiId || 'Not provided'}
                          </span>
                        </div>
                        {d.upiId && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(d.upiId, 'modal_upi')}
                            className="px-2.5 py-1.5 bg-[#222] hover:bg-[#333] text-cyan-400 rounded-lg text-xs font-bold flex items-center space-x-1"
                          >
                            {copiedField === 'modal_upi' ? <Check className="w-3.5 h-3.5 text-[#00C853]" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedField === 'modal_upi' ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                      </div>

                      {d.accountType && (
                        <div className="flex justify-between items-center text-[11px] text-[#8A8A8A] px-1">
                          <span>Account Type:</span>
                          <span className="text-white uppercase font-bold">{d.accountType}</span>
                        </div>
                      )}
                    </div>
                  ) : d.method === 'upi' ? (
                    <div className="space-y-2 text-xs">
                      <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626]">
                        <span className="text-[#8A8A8A] text-[10px] block">BENEFICIARY NAME</span>
                        <span className="text-white font-bold text-sm">{d.accountHolderName || 'Not specified'}</span>
                      </div>
                      <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] flex items-center justify-between">
                        <div>
                          <span className="text-[#8A8A8A] text-[10px] block">UPI ID / VIRTUAL PAYMENT ADDRESS (VPA)</span>
                          <span className="text-white font-bold text-sm break-all">{d.upiId || d.destinationAddress}</span>
                        </div>
                        {(d.upiId || d.destinationAddress) && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(d.upiId || d.destinationAddress, 'modal_upi')}
                            className="px-2.5 py-1.5 bg-[#222] hover:bg-[#333] text-cyan-400 rounded-lg text-xs font-bold flex items-center space-x-1"
                          >
                            {copiedField === 'modal_upi' ? <Check className="w-3.5 h-3.5 text-[#00C853]" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedField === 'modal_upi' ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626]">
                          <span className="text-[#8A8A8A] text-[10px] block">NETWORK</span>
                          <span className="text-purple-400 font-bold text-sm">{d.cryptoNetwork}</span>
                        </div>
                        <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626]">
                          <span className="text-[#8A8A8A] text-[10px] block">ASSET CURRENCY</span>
                          <span className="text-white font-bold text-sm">{d.cryptoCurrency}</span>
                        </div>
                      </div>
                      <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[#8A8A8A] text-[10px]">WALLET DESTINATION ADDRESS</span>
                          {d.destinationAddress && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(d.destinationAddress, 'modal_crypto')}
                              className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1"
                            >
                              {copiedField === 'modal_crypto' ? <Check className="w-3.5 h-3.5 text-[#00C853]" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedField === 'modal_crypto' ? 'Copied' : 'Copy Address'}</span>
                            </button>
                          )}
                        </div>
                        <span className="text-white font-bold text-sm break-all">{d.destinationAddress || wd.destination}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Legacy or raw destination string fallback */}
                {wd.destination && wd.destination !== d.destinationAddress && (
                  <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] text-[11px]">
                    <span className="text-[#8A8A8A] text-[10px] block">LEGACY SUMMARY STRING</span>
                    <span className="text-[#AAA] break-all">{wd.destination}</span>
                  </div>
                )}

                {/* Verification Proof Image */}
                {wd.proofImage && (
                  <div className="bg-[#181818] p-3 rounded-xl border border-[#262626] space-y-2">
                    <span className="text-[#8A8A8A] text-[10px] block font-sans">CUSTOMER UPLOADED VERIFICATION PROOF</span>
                    <div className="flex items-center justify-between">
                      <img
                        src={wd.proofImage}
                        alt="Withdrawal proof"
                        className="h-16 w-24 object-cover rounded-lg border border-[#333] cursor-pointer"
                        onClick={() => setImageModal({ url: wd.proofImage!, title: `Withdrawal Verification Proof - $${wd.amount}`, userEmail: wd.userEmail })}
                      />
                      <button
                        type="button"
                        onClick={() => setImageModal({ url: wd.proofImage!, title: `Withdrawal Verification Proof - $${wd.amount}`, userEmail: wd.userEmail })}
                        className="px-3 py-1.5 bg-[#00C853]/10 hover:bg-[#00C853]/20 text-[#00C853] border border-[#00C853]/30 rounded-lg text-xs font-bold flex items-center space-x-1"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Enlarge Proof</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Admin notes if present */}
                {wd.adminNotes && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-amber-300 space-y-1">
                    <span className="text-[10px] font-bold uppercase block">Recorded Notes / Rejection Reason</span>
                    <p className="text-xs">{wd.adminNotes}</p>
                  </div>
                )}

                {/* Action Inputs for Pending */}
                {isPending && (
                  <div className="space-y-3 pt-2 border-t border-[#222]">
                    <div>
                      <label className="text-[10px] text-[#8A8A8A] block font-sans mb-1 uppercase font-bold">
                        Optional Transaction Hash / Reference Note:
                      </label>
                      <input
                        type="text"
                        value={withdrawalTxHash}
                        onChange={(e) => setWithdrawalTxHash(e.target.value)}
                        placeholder="e.g., IMPS reference no. / blockchain tx id"
                        className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl px-3 py-2 text-white text-xs placeholder-[#555] focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-[#222] bg-[#1A1A1A] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedWithdrawalModal(null)}
                  className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white text-xs font-bold rounded-xl"
                >
                  Close
                </button>

                {isPending && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const reason = prompt("Enter rejection reason for customer refund:", "Compliance verification failed / invalid bank details");
                        if (reason !== null) {
                          handleRejectWithdrawal(wd.id, reason);
                        }
                      }}
                      className="px-4 py-2 bg-[#FF3B30]/20 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white text-xs font-bold rounded-xl transition-all"
                    >
                      Reject & Refund
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleApproveWithdrawal(wd.id, withdrawalTxHash || 'Approved by Finance Desk', withdrawalTxHash);
                      }}
                      className="px-4 py-2 bg-[#00C853] hover:bg-[#00B048] text-black text-xs font-extrabold rounded-xl transition-all flex items-center space-x-1"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve & Complete Payout</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Global RBAC Role Permission Policies Modal */}
      {isGlobalRolePolicyModalOpen && (
        <RolePermissionManager
          onClose={() => setIsGlobalRolePolicyModalOpen(false)}
          onPermissionsUpdated={() => {
            loadAdminData();
            if (refreshUserData) {
              refreshUserData().catch(() => {});
            }
          }}
        />
      )}

      {/* User-Specific Fine-Grained Permission Overrides Modal */}
      {permissionModalUser && (
        <RolePermissionManager
          targetUser={permissionModalUser}
          onClose={() => setPermissionModalUser(null)}
          onPermissionsUpdated={() => {
            loadAdminData();
            if (refreshUserData) {
              refreshUserData().catch(() => {});
            }
            // Update selectedUserProfileModal if it matches targetUser
            if (selectedUserProfileModal && selectedUserProfileModal.id === permissionModalUser.id) {
              apiService.getAdminUsers().then(usersData => {
                const refreshed = usersData.find(u => u.id === permissionModalUser.id);
                if (refreshed) {
                  setSelectedUserProfileModal(refreshed);
                }
              }).catch(() => {});
            }
          }}
        />
      )}

      {/* Toast Notification Container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col space-y-2 pointer-events-none">
        {activeToasts.map(t => (
          <div
            key={t.id}
            onClick={() => {
              if (t.type === 'chat' && t.userId) {
                setActiveTab('chat');
                const targetConv = adminChatThreads.find(c => c.userId === t.userId) || { userId: t.userId, userName: t.userName || 'Customer' };
                setSelectedChatUser(targetConv);
                loadSelectedUserChat(t.userId);
                apiService.markAdminChatRead(t.userId).catch(() => {});
              }
            }}
            className={`font-extrabold px-6 py-3 rounded-2xl shadow-2xl animate-fade-in text-xs tracking-wider flex items-center space-x-2 ${
              t.type === 'chat'
                ? 'bg-[#18181B] border border-[#00C853] text-[#00C853] shadow-[#00C853]/30 pointer-events-auto cursor-pointer hover:bg-[#202024]'
                : 'bg-[#00C853] text-black shadow-[#00C853]/20 uppercase'
            }`}
          >
            {t.type === 'chat' ? <MessageSquare className="w-4 h-4 text-[#00C853]" /> : <CheckSquare className="w-4 h-4" />}
            <span>{t.msg}</span>
            {t.type === 'chat' && <span className="text-[10px] underline ml-2 text-white">Open Chat →</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
